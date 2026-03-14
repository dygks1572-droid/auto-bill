function normalizeText(value) {
  return String(value || '')
    .replace(/\s+/g, '')
    .replace(/[^0-9a-zA-Z가-힣]/g, '')
    .toLowerCase()
}

export function isOptionLine(name) {
  const text = String(name || '').trim()
  return text.startsWith('+') || text.startsWith('ㄴ')
}

export function isZeroOption(item) {
  return isOptionLine(item.name) && Number(item.amount || 0) === 0
}

export function matchCatalogItem(itemName, products) {
  const target = normalizeText(itemName)
  if (!target) return null

  let best = null
  let bestScore = 0

  for (const product of products || []) {
    const candidates = [product.name, ...(product.aliases || [])].filter(Boolean)

    for (const candidate of candidates) {
      const normalizedCandidate = normalizeText(candidate)
      if (!normalizedCandidate) continue

      let score = 0
      if (target === normalizedCandidate) {
        score = 1
      } else if (
        target.includes(normalizedCandidate) ||
        normalizedCandidate.includes(target)
      ) {
        score = 0.9
      }

      if (score > bestScore) {
        best = product
        bestScore = score
      }
    }
  }

  return bestScore >= 0.9 ? best : null
}

export function buildBakeryComputation(items, products) {
  const normalized = []
  let bakeryTotal = 0
  const bakeryBreakdownMap = new Map()
  let previousItem = null

  for (const raw of items || []) {
    const item = {
      name: String(raw.name || '').trim(),
      qty: Number(raw.qty || 1),
      amount: Number(raw.amount || 0),
    }

    if (!item.name) continue

    if (isOptionLine(item.name)) {
      if (previousItem && item.amount > 0) {
        previousItem.amount += item.amount

        if (previousItem.isBakery) {
          bakeryTotal += item.amount

          const key = previousItem.matchedBakeryName
          if (!bakeryBreakdownMap.has(key)) {
            bakeryBreakdownMap.set(key, {
              name: previousItem.matchedBakeryName,
              qty: 0,
              amount: 0,
            })
          }
          bakeryBreakdownMap.get(key).amount += item.amount
        }
      }
      continue
    }

    const matched = matchCatalogItem(item.name, products)
    const isBakery = !!matched && matched.countInBakeryTotal !== false

    const row = {
      ...item,
      isBakery,
      matchedBakeryName: matched?.name || null,
      category: matched?.category || null,
      group: matched?.group || null,
    }

    normalized.push(row)
    previousItem = row

    if (isBakery) {
      bakeryTotal += row.amount

      const key = row.matchedBakeryName
      if (!bakeryBreakdownMap.has(key)) {
        bakeryBreakdownMap.set(key, {
          name: row.matchedBakeryName,
          qty: 0,
          amount: 0,
        })
      }

      const target = bakeryBreakdownMap.get(key)
      target.qty += row.qty
      target.amount += row.amount
    }
  }

  return {
    items: normalized,
    bakeryTotal,
    bakeryBreakdown: Array.from(bakeryBreakdownMap.values()),
  }
}
