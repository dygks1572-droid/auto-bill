import { createProduct } from './products'
import { DEFAULT_PRODUCT_SEEDS } from './bakerySeedData'

export async function seedDefaultProducts(existingRows = []) {
  const existingNames = new Set(existingRows.map((row) => row.name))

  const targets = DEFAULT_PRODUCT_SEEDS.filter((item) => !existingNames.has(item.name))

  for (const item of targets) {
    await createProduct(item)
  }

  return targets.length
}
