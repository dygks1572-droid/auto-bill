function normalizeText(value) {
  return String(value || '')
    .replace(/\s+/g, '')
    .replace(/[^0-9a-zA-Z가-힣]/g, '')
    .toLowerCase()
}

export function matchBakeryProduct(itemName, products) {
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
  let bakeryTotal = 0
  const breakdownMap = new Map()

  const normalizedItems = (items || [])
    .map((item) => {
      const name = String(item.name || '').trim()
      const qty = Number(item.qty || 1)
      const amount = Number(item.amount || 0)

      const matched = matchBakeryProduct(name, products)

      if (matched && amount > 0) {
        bakeryTotal += amount

        const key = matched.id || matched.name
        if (!breakdownMap.has(key)) {
          breakdownMap.set(key, {
            name: matched.name,
            qty: 0,
            amount: 0,
          })
        }

        const row = breakdownMap.get(key)
        row.qty += qty
        row.amount += amount
      }

      return {
        name,
        qty,
        amount,
        isBakery: !!matched,
        matchedBakeryName: matched?.name || null,
      }
    })
    .filter((item) => item.name || item.amount)

  return {
    items: normalizedItems,
    bakeryTotal,
    bakeryBreakdown: Array.from(breakdownMap.values()),
  }
}
