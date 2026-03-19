import { buildBakeryComputation } from './bakeryMatcher'

const RECEIPT_API_URL = import.meta.env.VITE_RECEIPT_API_URL || '/api/parse-receipt'
const MAX_RECEIPT_EDGE = 1850
const RECEIPT_JPEG_QUALITY = 0.84
const ANALYSIS_MAX_EDGE = 1800
const BACKGROUND_THRESHOLD = 28
const MIN_CROP_AREA_RATIO = 0.18
const MAX_CROP_AREA_RATIO = 0.9
const CROP_PADDING = 28
const HASH_SIZE = 16

function loadImageElement(file) {
  return new Promise((resolve, reject) => {
    const objectUrl = URL.createObjectURL(file)
    const image = new Image()

    image.onload = () => {
      URL.revokeObjectURL(objectUrl)
      resolve(image)
    }

    image.onerror = () => {
      URL.revokeObjectURL(objectUrl)
      reject(new Error('이미지 로드 실패'))
    }

    image.src = objectUrl
  })
}

function createCanvas(width, height) {
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  return canvas
}

function getPixelOffset(x, y, width) {
  return (y * width + x) * 4
}

function sampleBackgroundColor(data, width, height) {
  const corners = [
    [0, 0],
    [width - 1, 0],
    [0, height - 1],
    [width - 1, height - 1],
  ]

  let red = 0
  let green = 0
  let blue = 0

  for (const [x, y] of corners) {
    const offset = getPixelOffset(x, y, width)
    red += data[offset]
    green += data[offset + 1]
    blue += data[offset + 2]
  }

  return {
    red: red / corners.length,
    green: green / corners.length,
    blue: blue / corners.length,
  }
}

function getColorDistance(red, green, blue, target) {
  const dr = red - target.red
  const dg = green - target.green
  const db = blue - target.blue
  return Math.sqrt(dr * dr + dg * dg + db * db)
}

function detectReceiptBounds(canvas) {
  const context = canvas.getContext('2d', { willReadFrequently: true })
  if (!context) return null

  const { width, height } = canvas
  const { data } = context.getImageData(0, 0, width, height)
  const background = sampleBackgroundColor(data, width, height)
  const step = Math.max(1, Math.floor(Math.max(width, height) / 420))

  let minX = width
  let minY = height
  let maxX = -1
  let maxY = -1
  let activePixels = 0

  for (let y = 0; y < height; y += step) {
    for (let x = 0; x < width; x += step) {
      const offset = getPixelOffset(x, y, width)
      const red = data[offset]
      const green = data[offset + 1]
      const blue = data[offset + 2]
      const alpha = data[offset + 3]

      if (alpha < 10) continue

      const distance = getColorDistance(red, green, blue, background)
      if (distance < BACKGROUND_THRESHOLD) continue

      activePixels += 1
      minX = Math.min(minX, x)
      minY = Math.min(minY, y)
      maxX = Math.max(maxX, x)
      maxY = Math.max(maxY, y)
    }
  }

  if (maxX < 0 || maxY < 0 || activePixels < 120) return null

  const left = Math.max(0, minX - CROP_PADDING)
  const top = Math.max(0, minY - CROP_PADDING)
  const right = Math.min(width, maxX + CROP_PADDING)
  const bottom = Math.min(height, maxY + CROP_PADDING)
  const cropWidth = Math.max(1, right - left)
  const cropHeight = Math.max(1, bottom - top)
  const cropAreaRatio = (cropWidth * cropHeight) / (width * height)
  const aspectRatio = cropHeight / cropWidth

  if (cropAreaRatio < MIN_CROP_AREA_RATIO || cropAreaRatio > MAX_CROP_AREA_RATIO) {
    return null
  }

  if (aspectRatio < 0.85) return null

  return { left, top, width: cropWidth, height: cropHeight, cropAreaRatio }
}

function buildImageFingerprint(canvas) {
  const context = canvas.getContext('2d', { willReadFrequently: true })
  if (!context) return ''

  const sampleCanvas = createCanvas(HASH_SIZE + 1, HASH_SIZE)
  const sampleContext = sampleCanvas.getContext('2d', { alpha: false })
  if (!sampleContext) return ''

  sampleContext.drawImage(canvas, 0, 0, HASH_SIZE + 1, HASH_SIZE)
  const { data } = sampleContext.getImageData(0, 0, HASH_SIZE + 1, HASH_SIZE)
  let hash = ''

  for (let y = 0; y < HASH_SIZE; y += 1) {
    for (let x = 0; x < HASH_SIZE; x += 1) {
      const leftOffset = getPixelOffset(x, y, HASH_SIZE + 1)
      const rightOffset = getPixelOffset(x + 1, y, HASH_SIZE + 1)
      const leftGray = data[leftOffset] + data[leftOffset + 1] + data[leftOffset + 2]
      const rightGray = data[rightOffset] + data[rightOffset + 1] + data[rightOffset + 2]
      hash += leftGray > rightGray ? '1' : '0'
    }
  }

  return hash
}

function getHashDistance(a, b) {
  if (!a || !b || a.length !== b.length) return Number.MAX_SAFE_INTEGER
  let distance = 0
  for (let i = 0; i < a.length; i += 1) {
    if (a[i] !== b[i]) distance += 1
  }
  return distance
}

function enhanceReceiptCanvas(canvas) {
  const context = canvas.getContext('2d', { willReadFrequently: true })
  if (!context) return

  const { width, height } = canvas
  const imageData = context.getImageData(0, 0, width, height)
  const { data } = imageData

  let minLuma = 255
  let maxLuma = 0

  for (let i = 0; i < data.length; i += 4) {
    const luma = data[i] * 0.299 + data[i + 1] * 0.587 + data[i + 2] * 0.114
    if (luma < minLuma) minLuma = luma
    if (luma > maxLuma) maxLuma = luma
  }

  const range = Math.max(1, maxLuma - minLuma)
  const contrastBoost = range < 110 ? 1.16 : 1.08
  const brightnessBoost = range < 110 ? 10 : 4

  for (let i = 0; i < data.length; i += 4) {
    const red = data[i]
    const green = data[i + 1]
    const blue = data[i + 2]
    const luma = red * 0.299 + green * 0.587 + blue * 0.114
    const normalized = ((luma - minLuma) / range) * 255
    const boosted = Math.max(0, Math.min(255, normalized * contrastBoost + brightnessBoost))
    const mix = luma < 210 ? 0.9 : 0.72

    data[i] = Math.round(red * (1 - mix) + boosted * mix)
    data[i + 1] = Math.round(green * (1 - mix) + boosted * mix)
    data[i + 2] = Math.round(blue * (1 - mix) + boosted * mix)
  }

  context.putImageData(imageData, 0, 0)
}

function drawOptimizedReceipt(image) {
  const width = image.naturalWidth || image.width
  const height = image.naturalHeight || image.height
  const maxEdge = Math.max(width, height)

  if (!maxEdge) return null

  const analysisScale = Math.min(1, ANALYSIS_MAX_EDGE / maxEdge)
  const analysisWidth = Math.max(1, Math.round(width * analysisScale))
  const analysisHeight = Math.max(1, Math.round(height * analysisScale))

  const analysisCanvas = createCanvas(analysisWidth, analysisHeight)
  const analysisContext = analysisCanvas.getContext('2d', { alpha: false })
  if (!analysisContext) return null

  analysisContext.fillStyle = '#ffffff'
  analysisContext.fillRect(0, 0, analysisWidth, analysisHeight)
  analysisContext.drawImage(image, 0, 0, analysisWidth, analysisHeight)

  const detectedBounds = detectReceiptBounds(analysisCanvas)
  const safeBounds =
    detectedBounds && detectedBounds.cropAreaRatio >= 0.28 && detectedBounds.cropAreaRatio <= 0.82
      ? detectedBounds
      : null
  const sourceBounds = safeBounds || { left: 0, top: 0, width: analysisWidth, height: analysisHeight }
  const cropScaleX = width / analysisWidth
  const cropScaleY = height / analysisHeight

  const sourceLeft = Math.max(0, Math.round(sourceBounds.left * cropScaleX))
  const sourceTop = Math.max(0, Math.round(sourceBounds.top * cropScaleY))
  const sourceWidth = Math.min(width - sourceLeft, Math.round(sourceBounds.width * cropScaleX))
  const sourceHeight = Math.min(height - sourceTop, Math.round(sourceBounds.height * cropScaleY))

  const croppedMaxEdge = Math.max(sourceWidth, sourceHeight)
  const targetEdge = safeBounds ? MAX_RECEIPT_EDGE : Math.max(MAX_RECEIPT_EDGE, 2000)
  const outputScale = Math.min(1, targetEdge / croppedMaxEdge)
  const outputWidth = Math.max(1, Math.round(sourceWidth * outputScale))
  const outputHeight = Math.max(1, Math.round(sourceHeight * outputScale))

  const outputCanvas = createCanvas(outputWidth, outputHeight)
  const outputContext = outputCanvas.getContext('2d', { alpha: false })
  if (!outputContext) return null

  outputContext.fillStyle = '#ffffff'
  outputContext.fillRect(0, 0, outputWidth, outputHeight)
  outputContext.drawImage(
    image,
    sourceLeft,
    sourceTop,
    sourceWidth,
    sourceHeight,
    0,
    0,
    outputWidth,
    outputHeight,
  )
  enhanceReceiptCanvas(outputCanvas)

  return {
    canvas: outputCanvas,
    fingerprint: buildImageFingerprint(outputCanvas),
    cropAreaRatio: sourceBounds.cropAreaRatio || 1,
    likelyReceipt: Boolean(safeBounds || detectedBounds),
  }
}

async function optimizeReceiptImage(file) {
  if (typeof document === 'undefined') {
    return { file, fingerprint: '', likelyReceipt: true, cropAreaRatio: 1 }
  }

  const image = await loadImageElement(file)
  const optimized = drawOptimizedReceipt(image)
  if (!optimized) {
    return { file, fingerprint: '', likelyReceipt: false, cropAreaRatio: 1 }
  }

  const blob = await new Promise((resolve) => {
    optimized.canvas.toBlob(resolve, 'image/jpeg', RECEIPT_JPEG_QUALITY)
  })

  if (!blob) {
    return { file, fingerprint: optimized.fingerprint, likelyReceipt: optimized.likelyReceipt, cropAreaRatio: optimized.cropAreaRatio }
  }

  const nextFile =
    blob.size >= file.size * 0.95 && file.type === 'image/jpeg'
      ? file
      : new File([blob], file.name.replace(/\.[^.]+$/, '.jpg') || 'receipt.jpg', {
          type: 'image/jpeg',
          lastModified: file.lastModified,
        })

  return {
    file: nextFile,
    fingerprint: optimized.fingerprint,
    likelyReceipt: optimized.likelyReceipt,
    cropAreaRatio: optimized.cropAreaRatio,
  }
}

export async function prepareReceiptUploads(files) {
  const prepared = []
  const skipped = []
  const seenFingerprints = []

  for (const file of files || []) {
    let optimized

    try {
      optimized = await optimizeReceiptImage(file)
    } catch {
      optimized = { file, fingerprint: '', likelyReceipt: false, cropAreaRatio: 1 }
    }

    const fingerprint = optimized.fingerprint || `${file.name}-${file.size}-${file.lastModified}`
    const duplicate = seenFingerprints.some(
      (item) => getHashDistance(item.fingerprint, fingerprint) <= 12,
    )

    if (duplicate) {
      skipped.push({ file, reason: '중복 사진으로 판단되어 제외됨' })
      continue
    }

    seenFingerprints.push({ fingerprint })
    prepared.push({
      originalFile: file,
      optimizedFile: optimized.file || file,
      fingerprint,
      cropAreaRatio: optimized.cropAreaRatio || 1,
      needsVisionFallback: !optimized.likelyReceipt,
    })
  }

  return { prepared, skipped }
}
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
