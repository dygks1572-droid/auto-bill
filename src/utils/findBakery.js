import { BAKERY_MENU } from '../data/bakeryMenu'

export function findBakeryItems(text) {
  const items = []

  BAKERY_MENU.forEach((menu) => {
    if (text.includes(menu)) {
      items.push(menu)
    }
  })

  return items
}
