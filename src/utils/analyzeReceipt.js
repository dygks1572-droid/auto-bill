import { findBakeryItems } from './findBakery'
import { calcBakeryTotal } from './calcBakery'
import { findTotal } from './findTotal'

export function analyzeReceipt(ocrText) {
  const lines = ocrText.split('\n')

  const bakeryItems = findBakeryItems(ocrText)

  const bakeryTotal = calcBakeryTotal(lines, bakeryItems)

  const orderTotal = findTotal(ocrText)

  return {
    bakeryItems,
    bakeryTotal,
    orderTotal,
  }
}
