export function findTotal(text) {
  const match = text.match(/주문금액\s*([0-9,]+)/)

  if (match) {
    return parseInt(match[1].replace(',', ''))
  }

  return null
}
