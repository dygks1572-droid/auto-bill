import { parseReceiptText } from './receiptParser'
import { buildBakeryComputation } from './bakeryMatcher'
import { DEFAULT_PRODUCT_SEEDS } from './seedData'

export function analyzeReceiptText(ocrText, products = DEFAULT_PRODUCT_SEEDS) {
  const parsed = parseReceiptText(ocrText)

  const bakery = buildBakeryComputation(parsed.rawItems || [], products)

  return {
    source: parsed.source || null,
    documentType: parsed.documentType || null,
    orderedDate: parsed.orderedDate || null,
    orderTotal: parsed.orderTotal || 0,
    candidateLines: parsed.candidateLines || [],
    rawItems: parsed.rawItems || [],
    items: bakery.items || [],
    bakeryTotal: bakery.bakeryTotal || 0,
    bakeryBreakdown: bakery.bakeryBreakdown || [],
    debug: {
      totalLabel: parsed.totalLabel || null,
      ignoredLines: parsed.ignoredLines || [],
      unmatchedLines: parsed.unmatchedLines || [],
    },
  }
}
