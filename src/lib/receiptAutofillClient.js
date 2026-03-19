import { buildBakeryComputation } from './bakeryMatcher'

const RECEIPT_API_URL = import.meta.env.VITE_RECEIPT_API_URL || '/api/parse-receipt'

export async function fileToBase64(file) {
  const arrayBuffer = await file.arrayBuffer()
  let binary = ''
  const bytes = new Uint8Array(arrayBuffer)
  const chunk = 0x8000

  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunk))
  }

  return btoa(binary)
}

export function normalizeAutoFilledItems(parsedItems) {
  return (parsedItems || [])
    .map((item) => ({
      name: String(item.name || '').trim(),
      qty: Number(item.qty || 1),
      amount: Number(item.amount || 0),
      isOption: !!item.isOption,
      optionCharge: Number(item.optionCharge || 0),
    }))
    .filter((item) => item.name)
}

export async function parseReceiptImage(file) {
  const imageBase64 = await fileToBase64(file)

  const response = await fetch(RECEIPT_API_URL, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      imageBase64,
      mimeType: file.type || 'image/jpeg',
      fileName: file.name || 'receipt.jpg',
    }),
  })

  const data = await response.json()
  if (!response.ok || !data.ok) {
    throw new Error(data?.detail || data?.error || '영수증 자동 읽기 실패')
  }

  return data.parsed
}

export function buildAutofillStateFromParsed(parsed, products) {
  const items = normalizeAutoFilledItems(parsed?.items)
  const bakery = buildBakeryComputation(items, products)

  return {
    source: parsed?.source || 'manual',
    orderedDate: parsed?.orderedDate || '',
    orderTotal: parsed?.orderTotal || 0,
    items: bakery.items.map((row) => ({
      name: row.name,
      qty: row.qty,
      amount: row.amount,
    })),
    bakeryTotal: bakery.bakeryTotal,
    bakeryBreakdown: bakery.bakeryBreakdown,
    note: [
      parsed?.documentType ? `문서유형: ${parsed.documentType}` : '',
      parsed?.totalLabel ? `총액라벨: ${parsed.totalLabel}` : '',
      ...(parsed?.notes || []),
    ]
      .filter(Boolean)
      .join(' / '),
    confidence: parsed?.confidence || 0,
  }
}
