import { DEFAULT_PRODUCT_SEEDS, OPTION_NAMES } from './seedData.js'

const MATCH_THRESHOLD = 72
const SUGGESTION_THRESHOLD = 48
const BAKERY_FALLBACK_THRESHOLD = 60
const MAX_SUGGESTIONS = 3
const LEARNED_ALIAS_STORAGE_KEY = 'bill.learned-bakery-aliases.v1'
const BAKERY_NAME_HINT_PATTERN =
  /(빵|식빵|타르트|케이크|쿠키|토스트|샌드위치|샌드|스콘|치아바타|바게트|크로와상|크루아상|깜빠뉴|깜파뉴|캄파뉴|휘낭시에|앙버터|잠봉|추러스|브레드)/
const OCR_NAME_CORRECTIONS = [
  {
    target: '잠봉뵈르 샌드위치',
    patterns: [
      /^장별.*세드위치$/,
      /^잠별.*세드위치$/,
      /^장봉.*세드위치$/,
      /^잠봉.*세드위치$/,
      /^장별블랙.*$/,
      /^볼블렌드.*샌드위치$/,
      /^볼블랜드.*샌드위치$/,
      /^볼블렌드샌드위치$/,
      /^볼블랜드샌드위치$/,
      /^볼빈.*스딩워치$/,
      /^볼빈스딩워치$/,
      /^볼빈.*샌드위치$/,
      /^잠봉뵈르샌드위치$/,
      /^잠봉뵈르샌드$/,
      /^잠봉보에르샌드위치$/,
      /^잠봉베르샌드위치$/,
      /^잠봉보엘샌드위치$/,
      /^잠봉브엘샌드위치$/,
      /^잠봉샌드위치$/,
      /^잠봉샌드$/,
      /잠봉.*샌드위치$/,
      /잠봉.*세드위치$/,
      /샌드위치$/,
    ],
  },
  {
    target: '호두 크랜베리 깜빠뉴',
    patterns: [
      /^홍두깨비빔밥$/,
      /^호두깨비빔밥$/,
      /^홍두.*빔밥$/,
      /^호두.*빔밥$/,
      /^호두그래백리깜빠뉴$/,
      /^호두그래백리깜파뉴$/,
      /^호두그래배리깜빠뉴$/,
      /^호두그래배리깜파뉴$/,
      /^홍두그래백리깜빠뉴$/,
      /^홍두그래백리깜파뉴$/,
      /^호두그래백리캄파뉴$/,
      /^호두그래백리깜빠뉘$/,
      /^호두그래백리.*$/,
      /^홍두그래백리.*$/,
      /^홍두그랙배리깜빠뉴$/,
      /^홍두그랙배리깜파뉴$/,
      /^홍두그랙배리.*$/,
      /^호두그랙배리깜빠뉴$/,
      /^호두그랙배리깜파뉴$/,
      /^호두그랙배리.*$/,
      /^호두그랜베리깜빠뉴$/,
      /^호두그랜베리깜파뉴$/,
      /^호두크랜베리깜빠뉴$/,
      /^홍두크랜베리깜빠뉴$/,
      /^호두크렌베리깜빠뉴$/,
      /^호두크렌배리깜빠뉴$/,
      /^호두크랜배리깜빠뉴$/,
      /^호두크래베리깜빠뉴$/,
      /^호두크랜베리캄파뉴$/,
      /^호두크랜베리깜파뉴$/,
      /^호두크랜베리깜빠뉘$/,
      /^호두크랜베리깜빠뉴.*$/,
      /(?:홍두|호도|호두).*(?:그래백리|그래배리|그랜베리|크랜베리|크렌베리|크렌배리|크랜배리|크래베리).*(?:깜빠뉴|깜파뉴|캄파뉴|깜빠뉘)$/,
      /호두.*크랜.*깜빠뉴$/,
      /호두.*크랜.*캄파뉴$/,
      /크랜베리.*깜빠뉴$/,
    ],
  },
  {
    target: '이즈드립',
    patterns: [/^이즈드랍$/, /^이지드립$/, /^이즈드립$/],
  },
]


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
    .replace(/잠봉\s*뵈르|잠봉뵈르|잠봉보에르|잠봉브외르|잠봉베르|잠봉뵈어/gi, '잠봉뵈르')
    .replace(/볼블렌드|볼블랜드/gi, '잠봉뵈르')
    .replace(/샌드윗치|샌드위치|샌드위티|샌드위/gi, '샌드위치')
    .replace(/홍두|호도/gi, '호두')
    .replace(/깜파뉴|캄파뉴|캄빠뉴|깜빠뉘|깜빠뉴/gi, '깜빠뉴')
    .replace(/그래백리|그래배리|그랙배리|그랜베리|크랜배리|크렌베리|크렌배리|크래베리/gi, '크랜베리')
    .replace(/이즈드랍|이지드립|이즈 드립/gi, '이즈드립')
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

function correctKnownOcrName(rawName) {
  const normalized = normalizeText(rawName)
  if (!normalized) return { correctedName: String(rawName ?? '').trim(), correctionTarget: null }

  for (const rule of OCR_NAME_CORRECTIONS) {
    if (rule.patterns.some((pattern) => pattern.test(normalized))) {
      return { correctedName: rule.target, correctionTarget: rule.target }
    }
  }

  return { correctedName: String(rawName ?? '').trim(), correctionTarget: null }
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

    const existing = merged.get(key)
    if (!existing) {
      merged.set(key, item)
      continue
    }

    const keepDefaultCategory = existing.category === 'bakery' && item.category !== 'bakery'
    merged.set(
      key,
      keepDefaultCategory
        ? {
            ...existing,
            aliases: mergeAliases(existing.aliases, item.aliases),
          }
        : {
            ...existing,
            ...item,
            aliases: mergeAliases(existing.aliases, item.aliases),
          },
    )
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

function extractOptionCharge(rawName, fallbackAmount = 0) {
  const trimmed = String(rawName ?? '').trim()
  const inlineMatch = trimmed.match(/(?:^|\s)\+?\s*(\d{1,4})(?:원)?(?:\s|$)/)
  if (inlineMatch) {
    const parsed = parseNumber(inlineMatch[1], fallbackAmount)
    return parsed >= 0 ? parsed : fallbackAmount
  }

  return fallbackAmount
}

function isFinancierOptionLine(rawName) {
  const trimmed = String(rawName ?? '').trim()
  if (!trimmed) return false

  const normalized = normalizeText(trimmed)
  const optionNames = OPTION_NAMES.map((name) => normalizeText(name)).filter(Boolean)
  const hasOptionKeyword = optionNames.some(
    (name) => normalized === name || normalized.endsWith(name) || normalized.includes(name),
  )
  const hasOptionPrice = /(?:^|\s)\+?\d{1,4}(?:원)?(?:\s|$)/.test(trimmed)
  const mentionsFinancier = /휘낭시에/.test(trimmed)
  const looksLikeFinancierFlavor = /(?:플레인|무화과|약과|발로나초코|고르곤졸라\s*크림치즈)/.test(trimmed)

  return hasOptionKeyword && (hasOptionPrice || mentionsFinancier || looksLikeFinancierFlavor)
}

function isFinancierBaseItem(rawName, matchedName) {
  const source = String(rawName || '') + ' ' + String(matchedName || '')
  return /휘낭시에/.test(source)
}

export function isOptionLineName(rawName) {
  const trimmed = String(rawName ?? '').trim()
  if (!trimmed) return false
  if (/^[+ㄴ]\s*/.test(trimmed)) return true
  if (isFinancierOptionLine(trimmed)) return true

  const normalized = normalizeText(trimmed)
  return OPTION_NAMES.some((name) => {
    const normalizedOption = normalizeText(name)
    return normalizedOption === normalized || normalized.endsWith(normalizedOption)
  })
}

export function buildCatalogIndex(products = DEFAULT_PRODUCT_SEEDS) {
  return resolveProducts(products)
    .filter((product) => product?.active !== false)
    .map((product) => {
      const names = [product.name, ...(product.aliases || [])].filter(Boolean)
      return {
        ...product,
        normalizedNames: names.map((name) => normalizeText(name)),
        rawNames: names,
      }
    })
}

function hasBakeryNameHint(value) {
  return BAKERY_NAME_HINT_PATTERN.test(String(value ?? ''))
}

function canPromoteMatchToBakery(candidate, rawName) {
  if (!candidate) return false
  if (candidate.category === 'bakery' && candidate.countInBakeryTotal !== false) return true

  if (candidate.category === 'review') {
    return hasBakeryNameHint(`${rawName} ${candidate.name}`)
  }

  return false
}

function resolveBakeryCandidate(rawName, matched, suggestions) {
  if (canPromoteMatchToBakery(matched, rawName)) {
    return {
      candidate: matched,
      promoted: matched.category !== 'bakery' || matched.countInBakeryTotal === false,
    }
  }

  const fallback = (suggestions || []).find(
    (item) => item.score >= BAKERY_FALLBACK_THRESHOLD && canPromoteMatchToBakery(item, rawName),
  )

  if (!fallback) {
    return {
      candidate: matched,
      promoted: false,
    }
  }

  return {
    candidate: fallback,
    promoted: true,
  }
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
  let lastFinancierItem = null

  for (const raw of rawItems || []) {
    const name = String(raw?.name ?? '').trim()
    const qty = parseNumber(raw?.qty, 1) || 1
    const amount = parseNumber(raw?.amount, 0)

    if (!name) continue

    const { correctedName, correctionTarget } = correctKnownOcrName(name)
    const lookupName = correctedName || name
    const optionLine = isOptionLineName(lookupName)
    const matched = matchCatalogItem(lookupName, products)
    const suggestions = (matched?.suggestions || rankCatalogCandidates(lookupName, products))
      .filter((item) => item.score >= SUGGESTION_THRESHOLD)
      .slice(0, MAX_SUGGESTIONS)
    const { candidate: bakeryMatch, promoted: promotedToBakery } = resolveBakeryCandidate(
      lookupName,
      matched,
      suggestions,
    )
    const financierOption = isFinancierOptionLine(lookupName)
    const explicitOption = Boolean(raw?.isOption)
    const isOption = explicitOption || optionLine || financierOption || matched?.optionLike
    const optionCharge = parseNumber(raw?.optionCharge, extractOptionCharge(lookupName, amount))

    if (isOption) {
      const optionRow = {
        name,
        qty,
        amount: optionCharge || amount,
        isOption: true,
        baseOptionName: baseOptionName(lookupName),
        matchedCatalogName: matched?.name || null,
        matchedBakeryName: matched?.name || null,
        category: matched?.category || 'option',
        countInBakeryTotal: false,
        correctedName: correctionTarget,
        optionCharge,
        suggestions,
      }

      const optionOwner = financierOption && lastFinancierItem ? lastFinancierItem : lastBaseItem

      if (optionOwner) {
        optionOwner.options.push(optionRow)
        if (optionCharge > 0) {
          optionOwner.optionCharge += optionCharge
          optionOwner.finalAmount += optionCharge
          optionOwner.amount = optionOwner.finalAmount
        }
      } else {
        resultItems.push({
          ...optionRow,
          orphanOption: true,
        })
      }
      continue
    }

    const category = bakeryMatch
      ? promotedToBakery
        ? 'bakery'
        : bakeryMatch.category
      : 'unknown'
    const reviewNeeded = promotedToBakery ? false : bakeryMatch?.reviewNeeded || false
    const countInBakeryTotal = bakeryMatch
      ? promotedToBakery
        ? true
        : bakeryMatch.countInBakeryTotal !== false || (countReviewNeeded && reviewNeeded)
      : false

    const row = {
      name,
      qty,
      amount,
      correctedName: correctionTarget,
      baseAmount: amount,
      optionCharge: 0,
      finalAmount: amount,
      isOption: false,
      isMatched: Boolean(bakeryMatch),
      matchedCatalogName: bakeryMatch?.name || null,
      matchedBakeryName: bakeryMatch?.name || null,
      isBakery: countInBakeryTotal,
      category,
      group: bakeryMatch?.group || null,
      reviewNeeded,
      countInBakeryTotal,
      promotedToBakery,
      options: [],
      suggestions,
    }

    resultItems.push(row)
    lastBaseItem = row
    lastFinancierItem = isFinancierBaseItem(name, matched?.name) ? row : lastFinancierItem
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
