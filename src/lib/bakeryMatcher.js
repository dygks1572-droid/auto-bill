import { DEFAULT_PRODUCT_SEEDS, OPTION_NAMES } from './seedData.js'

const MATCH_THRESHOLD = 72
const SUGGESTION_THRESHOLD = 48
const MAX_SUGGESTIONS = 3
const LEARNED_ALIAS_STORAGE_KEY = 'bill.learned-bakery-aliases.v1'

function canUseStorage() {
  return typeof window !== 'undefined' && typeof window.localStorage !== 'undefined'
}

function parseNumber(value, fallback = 0) {
  if (typeof value === 'number' && Number.isFinite(value)) return value
  const digits = String(value ?? '')
    .replace(/[,원\s]/g, '')
    .replace(/[^\d-]/g, '')
  const parsed = Number(digits)
  return Number.isFinite(parsed) ? parsed : fallback
}

function normalizeBakeryVariants(value) {
  return String(value ?? '')
    .replace(/잠봉s*뵈르|잠봉뵈르|잠봉보에르|잠봉브외르|잠봉베르|잠봉뵈어/gi, '잠봉뵈르')
    .replace(/샌드윗치|샌드위치|샌드위티|샌드위/gi, '샌드위치')
    .replace(/깜파뉴|캄파뉴|캄빠뉴|깜빠뉴/gi, '깜빠뉴')
    .replace(/크랜배리|크렌베리|크렌배리/gi, '크랜베리')
}

function stripDecorators(value) {
  return normalizeBakeryVariants(value)
    .replace(/\([^)]*\)/g, ' ')
    .replace(/\[[^\]]*\]/g, ' ')
    .replace(/[{}]/g, ' ')
    .replace(/\b(?:hot|ice|iced|warm|large|regular|set|single|double|decaf)\b/gi, ' ')
    .replace(/(?:추가|변경|옵션|세트|단품|라지|미디움|톨|벤티|따뜻한|차가운)/g, ' ')
    .replace(/\d+\s*(?:ea|개입|개|pcs?|잔|병|팩|box|g|kg|ml|l)\b/gi, ' ')
    .replace(/[0-9]+/g, ' ')
    .replace(/[()[\]{}.,:+\-_/]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

export function normalizeText(value) {
  return stripDecorators(value).replace(/\s+/g, '').toLowerCase()
}

function readLearnedAliases() {
  if (!canUseStorage()) return {}

  try {
    const raw = window.localStorage.getItem(LEARNED_ALIAS_STORAGE_KEY)
    if (!raw) return {}

    const parsed = JSON.parse(raw)
    return parsed && typeof parsed === 'object' ? parsed : {}
  } catch (error) {
    console.warn('Failed to read learned bakery aliases', error)
    return {}
  }
}

function writeLearnedAliases(value) {
  if (!canUseStorage()) return

  try {
    window.localStorage.setItem(LEARNED_ALIAS_STORAGE_KEY, JSON.stringify(value))
  } catch (error) {
    console.warn('Failed to write learned bakery aliases', error)
  }
}

export function learnCatalogAlias(rawName, matchedName) {
  const normalizedAlias = normalizeText(rawName)
  const normalizedTarget = normalizeText(matchedName)

  if (!normalizedAlias || !normalizedTarget) return false
  if (normalizedAlias === normalizedTarget) return false

  const learned = readLearnedAliases()
  const next = { ...learned }
  const aliases = Array.isArray(next[matchedName]) ? next[matchedName] : []
  const alreadyExists = aliases.some((alias) => normalizeText(alias) === normalizedAlias)

  if (alreadyExists) return false

  next[matchedName] = [...aliases, String(rawName).trim()]
  writeLearnedAliases(next)
  return true
}

function mergeAliases(baseAliases, learnedAliases) {
  const merged = [...(baseAliases || [])]

  for (const alias of learnedAliases || []) {
    if (!alias) continue
    if (merged.some((item) => normalizeText(item) === normalizeText(alias))) continue
    merged.push(alias)
  }

  return merged
}

function resolveProducts(products) {
  const source = Array.isArray(products) && products.length ? products : []
  const learned = readLearnedAliases()
  const merged = new Map()

  for (const item of DEFAULT_PRODUCT_SEEDS) {
    merged.set(normalizeText(item.name), item)
  }

  for (const item of source) {
    const key = normalizeText(item?.name)
    if (!key) continue
    merged.set(key, item)
  }

  return Array.from(merged.values()).map((item) => ({
    ...item,
    aliases: mergeAliases(item.aliases, learned[item.name]),
  }))
}

function normalizeKeepWords(value) {
  return stripDecorators(value)
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

function bigrams(value) {
  const normalized = normalizeText(value)
  if (!normalized) return []
  if (normalized.length === 1) return [normalized]

  const grams = []
  for (let i = 0; i < normalized.length - 1; i += 1) {
    grams.push(normalized.slice(i, i + 2))
  }
  return grams
}

function bigramScore(a, b) {
  const gramsA = bigrams(a)
  const gramsB = bigrams(b)
  if (!gramsA.length || !gramsB.length) return 0

  const counts = new Map()
  for (const gram of gramsB) {
    counts.set(gram, (counts.get(gram) || 0) + 1)
  }

  let hit = 0
  for (const gram of gramsA) {
    const count = counts.get(gram) || 0
    if (count > 0) {
      hit += 1
      counts.set(gram, count - 1)
    }
  }

  return (2 * hit) / (gramsA.length + gramsB.length)
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

function scoreCandidate(targetRaw, target, rawCandidate, normalizedName) {
  if (!target || !normalizedName) return 0
  if (target === normalizedName) return 100
  if (target.includes(normalizedName) || normalizedName.includes(target)) return 92

  const overlap = overlapScore(targetRaw, rawCandidate)
  const bigram = bigramScore(targetRaw, rawCandidate)
  const normalizedBigram = bigramScore(target, normalizedName)

  return Math.round(overlap * 35 + bigram * 35 + normalizedBigram * 30)
}

function toMatchResult(item, score, rawCandidate) {
  return {
    id: item.id || item.name,
    name: item.name,
    category: item.category,
    group: item.group,
    aliases: item.aliases || [],
    countInBakeryTotal: item.countInBakeryTotal !== false,
    reviewNeeded: !!item.reviewNeeded,
    optionLike: !!item.optionLike,
    score,
    rawCandidate,
  }
}

function rankCatalogCandidates(rawName, products = DEFAULT_PRODUCT_SEEDS) {
  const targetRaw = baseOptionName(rawName)
  const target = normalizeText(targetRaw)
  if (!target) return []

  const catalog = buildCatalogIndex(products)
  const ranked = []

  for (const item of catalog) {
    let itemBest = null

    for (let i = 0; i < item.normalizedNames.length; i += 1) {
      const normalizedName = item.normalizedNames[i]
      const rawCandidate = item.rawNames[i]
      const score = scoreCandidate(targetRaw, target, rawCandidate, normalizedName)

      if (!itemBest || score > itemBest.score) {
        itemBest = toMatchResult(item, score, rawCandidate)
      }
    }

    if (itemBest && itemBest.score > 0) {
      ranked.push(itemBest)
    }
  }

  ranked.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score
    return a.name.localeCompare(b.name, 'ko')
  })

  return ranked
}

export function matchCatalogItem(rawName, products = DEFAULT_PRODUCT_SEEDS) {
  const ranked = rankCatalogCandidates(rawName, products)
  const best = ranked[0] || null

  if (!best || best.score < MATCH_THRESHOLD) {
    return null
  }

  return {
    ...best,
    suggestions: ranked
      .filter((item) => item.score >= SUGGESTION_THRESHOLD)
      .slice(0, MAX_SUGGESTIONS),
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
    const suggestions = (matched?.suggestions || rankCatalogCandidates(name, products))
      .filter((item) => item.score >= SUGGESTION_THRESHOLD)
      .slice(0, MAX_SUGGESTIONS)
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
        suggestions,
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
      suggestions,
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
