export function calcBakeryTotal(lines, bakeryList) {
  let total = 0

  lines.forEach((line) => {
    bakeryList.forEach((menu) => {
      if (line.includes(menu)) {
        const priceMatch = line.match(/[0-9,]+/g)

        if (priceMatch) {
          const price = parseInt(priceMatch[priceMatch.length - 1].replace(/,/g, ''))
          total += price
        }
      }
    })
  })

  return total
}
