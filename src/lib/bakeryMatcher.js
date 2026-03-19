import { DEFAULT_PRODUCT_SEEDS, OPTION_NAMES } from './seedData.js'

function parseNumber(value, fallback = 0) {
  if (typeof value === 'number' && Number.isFinite(value)) return value
  const digits = String(value ?? '')
    .replace(/[,원\s]/g, '')
    .replace(/[^\d-]/g, '')
  const parsed = Number(digits)
  return Number.isFinite(parsed) ? parsed : fallback
}

export function normalizeText(value) {
  return String(value ?? '')
    .replace(/\s+/g, '')
    .replace(/[()[\]{}.,:+\-_/]/g, '')
    .toLowerCase()
}

function resolveProducts(products) {
  const source = Array.isArray(products) && products.length ? products : []
  if (!source.length) return DEFAULT_PRODUCT_SEEDS

  const merged = new Map()

  for (const item of DEFAULT_PRODUCT_SEEDS) {
    merged.set(normalizeText(item.name), item)
  }

  for (const item of source) {
    const key = normalizeText(item?.name)
    if (!key) continue
    merged.set(key, item)
  }

  return Array.from(merged.values())
}

function normalizeKeepWords(value) {
  return String(value ?? '')
    .replace(/[^0-9a-zA-Z가-힣\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase()
}

function tokenize(value) {
  return normalizeKeepWords(value).split(' ').filter(Boolean)
}

function overlapScore(a, b) {
  const ta = tokenize(a)
  const tb = tokenize(b)
  if (!ta.length || !tb.length) return 0
  const setB = new Set(tb)
  const hit = ta.filter((token) => setB.has(token)).length
  return hit / Math.max(ta.length, tb.length)
}

function baseOptionName(rawName) {
  return String(rawName ?? '')
    .trim()
    .replace(/^[+ㄴ]\s*/, '')
    .replace(/\s+/g, ' ')
}

export function isOptionLineName(rawName) {
  const trimmed = String(rawName ?? '').trim()
  if (!trimmed) return false
  if (/^[+ㄴ]\s*/.test(trimmed)) return true

  const normalized = normalizeText(trimmed)
  return OPTION_NAMES.some((name) => normalizeText(name) === normalized)
}

export function buildCatalogIndex(products = DEFAULT_PRODUCT_SEEDS) {
  return resolveProducts(products).map((product) => {
    const names = [product.name, ...(product.aliases || [])].filter(Boolean)
    return {
      ...product,
      normalizedNames: names.map((name) => normalizeText(name)),
      rawNames: names,
    }
  })
}

export function matchCatalogItem(rawName, products = DEFAULT_PRODUCT_SEEDS) {
  const targetRaw = baseOptionName(rawName)
  const target = normalizeText(targetRaw)
  if (!target) return null

  const catalog = buildCatalogIndex(products)
  let best = null
  let bestScore = -1

  for (const item of catalog) {
    for (let i = 0; i < item.normalizedNames.length; i += 1) {
      const normalizedName = item.normalizedNames[i]
      const rawCandidate = item.rawNames[i]
      if (!normalizedName) continue

      let score = 0
      if (target === normalizedName) {
        score = 100
      } else if (target.includes(normalizedName) || normalizedName.includes(target)) {
        score = 90
      } else {
        score = overlapScore(targetRaw, rawCandidate) * 70
      }

      if (score > bestScore || (score === bestScore && best?.optionLike && !item.optionLike)) {
        best = item
        bestScore = score
      }
    }
  }

  if (!best || bestScore < 70) return null
  return {
    id: best.id || best.name,
    name: best.name,
    category: best.category,
    group: best.group,
    aliases: best.aliases || [],
    countInBakeryTotal: best.countInBakeryTotal !== false,
    reviewNeeded: !!best.reviewNeeded,
    optionLike: !!best.optionLike,
    score: bestScore,
  }
}

export function buildBakeryComputation(rawItems, products = DEFAULT_PRODUCT_SEEDS, config = {}) {
  const countReviewNeeded = Boolean(config.countReviewNeeded)
  const resultItems = []
  let lastBaseItem = null

  for (const raw of rawItems || []) {
    const name = String(raw?.name ?? '').trim()
    const qty = parseNumber(raw?.qty, 1) || 1
    const amount = parseNumber(raw?.amount, 0)

    if (!name) continue

    const optionLine = isOptionLineName(name)
    const matched = matchCatalogItem(name, products)
    const isOption = optionLine || matched?.optionLike

    if (isOption) {
      const optionRow = {
        name,
        qty,
        amount,
        isOption: true,
        baseOptionName: baseOptionName(name),
        matchedCatalogName: matched?.name || null,
        matchedBakeryName: matched?.name || null,
        category: matched?.category || 'option',
        countInBakeryTotal: false,
      }

      if (lastBaseItem) {
        lastBaseItem.options.push(optionRow)
        if (amount > 0) {
          lastBaseItem.optionCharge += amount
          lastBaseItem.finalAmount += amount
          lastBaseItem.amount = lastBaseItem.finalAmount
        }
      } else {
        resultItems.push({
          ...optionRow,
          orphanOption: true,
        })
      }
      continue
    }

    const category = matched?.category || 'unknown'
    const reviewNeeded = matched?.reviewNeeded || false
    const countInBakeryTotal = matched
      ? matched.countInBakeryTotal !== false || (countReviewNeeded && reviewNeeded)
      : false

    const row = {
      name,
      qty,
      amount,
      baseAmount: amount,
      optionCharge: 0,
      finalAmount: amount,
      isOption: false,
      isMatched: Boolean(matched),
      matchedCatalogName: matched?.name || null,
      matchedBakeryName: matched?.name || null,
      isBakery: countInBakeryTotal,
      category,
      group: matched?.group || null,
      reviewNeeded,
      countInBakeryTotal,
      options: [],
    }

    resultItems.push(row)
    lastBaseItem = row
  }

  const bakeryBreakdownMap = new Map()
  let bakeryTotal = 0

  for (const item of resultItems) {
    if (item.isOption) continue
    if (!item.countInBakeryTotal) continue

    bakeryTotal += item.finalAmount
    const key = item.matchedCatalogName || item.name

    if (!bakeryBreakdownMap.has(key)) {
      bakeryBreakdownMap.set(key, {
        name: key,
        qty: 0,
        amount: 0,
      })
    }

    const bucket = bakeryBreakdownMap.get(key)
    bucket.qty += item.qty
    bucket.amount += item.finalAmount
  }

  const bakeryBreakdown = Array.from(bakeryBreakdownMap.values()).sort((a, b) => {
    if (b.amount !== a.amount) return b.amount - a.amount
    return a.name.localeCompare(b.name, 'ko')
  })

  const matchedItems = resultItems.filter((item) => !item.isOption && item.isMatched)
  const unmatchedItems = resultItems.filter((item) => !item.isOption && !item.isMatched)
  const reviewItems = resultItems.filter((item) => !item.isOption && item.reviewNeeded)

  return {
    items: resultItems,
    bakeryTotal,
    bakeryBreakdown,
    matchedItems,
    unmatchedItems,
    reviewItems,
  }
}
