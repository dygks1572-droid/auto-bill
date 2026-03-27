import { buildBakeryComputation } from './bakeryMatcher'

const RECEIPT_API_URL = import.meta.env.VITE_RECEIPT_API_URL || '/api/parse-receipt'
const MAX_RECEIPT_EDGE = 1600
const RECEIPT_JPEG_QUALITY = 0.8
const ANALYSIS_MAX_EDGE = 2200
const ANDROID_MAX_RECEIPT_EDGE = 2600
const ANDROID_RECEIPT_JPEG_QUALITY = 0.96
const BACKGROUND_THRESHOLD = 30
const MIN_CROP_AREA_RATIO = 0.2
const MAX_CROP_AREA_RATIO = 0.98
const CROP_PADDING = 32

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

function isAndroidDevice() {
  if (typeof navigator === 'undefined') return false
  return /Android/i.test(navigator.userAgent || '')
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
  const step = Math.max(1, Math.floor(Math.max(width, height) / 400))

  let minX = width
  let minY = height
  let maxX = -1
  let maxY = -1

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

      minX = Math.min(minX, x)
      minY = Math.min(minY, y)
      maxX = Math.max(maxX, x)
      maxY = Math.max(maxY, y)
    }
  }

  if (maxX < 0 || maxY < 0) return null

  const left = Math.max(0, minX - CROP_PADDING)
  const top = Math.max(0, minY - CROP_PADDING)
  const right = Math.min(width, maxX + CROP_PADDING)
  const bottom = Math.min(height, maxY + CROP_PADDING)
  const cropWidth = Math.max(1, right - left)
  const cropHeight = Math.max(1, bottom - top)
  const cropAreaRatio = (cropWidth * cropHeight) / (width * height)

  if (cropAreaRatio < MIN_CROP_AREA_RATIO || cropAreaRatio > MAX_CROP_AREA_RATIO) {
    return null
  }

  return { left, top, width: cropWidth, height: cropHeight }
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

  for (let i = 0; i < data.length; i += 4) {
    const red = data[i]
    const green = data[i + 1]
    const blue = data[i + 2]
    const luma = red * 0.299 + green * 0.587 + blue * 0.114
    let normalized = ((luma - minLuma) / range) * 255

    if (normalized > 214) normalized = 255
    if (normalized < 126) normalized *= 0.7

    const mix = luma < 190 ? 0.95 : 0.8
    data[i] = Math.round(red * (1 - mix) + normalized * mix)
    data[i + 1] = Math.round(green * (1 - mix) + normalized * mix)
    data[i + 2] = Math.round(blue * (1 - mix) + normalized * mix)
  }

  context.putImageData(imageData, 0, 0)
}

function drawAndroidReceipt(image) {
  const width = image.naturalWidth || image.width
  const height = image.naturalHeight || image.height
  const maxEdge = Math.max(width, height)

  if (!maxEdge) return null

  const outputScale = Math.min(1, ANDROID_MAX_RECEIPT_EDGE / maxEdge)
  const outputWidth = Math.max(1, Math.round(width * outputScale))
  const outputHeight = Math.max(1, Math.round(height * outputScale))

  const outputCanvas = createCanvas(outputWidth, outputHeight)
  const outputContext = outputCanvas.getContext('2d', { alpha: false })
  if (!outputContext) return null

  outputContext.fillStyle = '#ffffff'
  outputContext.fillRect(0, 0, outputWidth, outputHeight)
  outputContext.drawImage(image, 0, 0, outputWidth, outputHeight)

  return outputCanvas
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
  const sourceBounds = detectedBounds || { left: 0, top: 0, width: analysisWidth, height: analysisHeight }
  const cropScaleX = width / analysisWidth
  const cropScaleY = height / analysisHeight

  const sourceLeft = Math.max(0, Math.round(sourceBounds.left * cropScaleX))
  const sourceTop = Math.max(0, Math.round(sourceBounds.top * cropScaleY))
  const sourceWidth = Math.min(width - sourceLeft, Math.round(sourceBounds.width * cropScaleX))
  const sourceHeight = Math.min(height - sourceTop, Math.round(sourceBounds.height * cropScaleY))

  const croppedMaxEdge = Math.max(sourceWidth, sourceHeight)
  const outputScale = Math.min(1, MAX_RECEIPT_EDGE / croppedMaxEdge)
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

  return outputCanvas
}

async function optimizeReceiptImage(file) {
  if (typeof document === 'undefined') return file

  const image = await loadImageElement(file)
  const canvas = isAndroidDevice() ? drawAndroidReceipt(image) : drawOptimizedReceipt(image)
  if (!canvas) return file

  const blob = await new Promise((resolve) => {
    canvas.toBlob(resolve, 'image/jpeg', isAndroidDevice() ? ANDROID_RECEIPT_JPEG_QUALITY : RECEIPT_JPEG_QUALITY)
  })

  if (!blob) return file
  if (isAndroidDevice() && file.type.startsWith('image/')) return file
  if (blob.size >= file.size * 0.95 && file.type === 'image/jpeg') return file

  return new File([blob], file.name.replace(/\.[^.]+$/, '.jpg') || 'receipt.jpg', {
    type: 'image/jpeg',
    lastModified: file.lastModified,
  })
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
  const optimizedFile = await optimizeReceiptImage(file)
  const imageBase64 = await fileToBase64(optimizedFile)

  const response = await fetch(RECEIPT_API_URL, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      imageBase64,
      mimeType: optimizedFile.type || file.type || 'image/jpeg',
      fileName: file.name || 'receipt.jpg',
    }),
  })

  const data = await response.json()
  if (!response.ok || !data.ok) {
    throw new Error(data?.detail || data?.error || '영수증 자동 읽기 실패')
  }

  return data.parsed
}

function flattenComputedItems(rows) {
  const flattened = []

  for (const row of rows || []) {
    const isOption = !!row.isOption

    flattened.push({
      name: row.name,
      qty: row.qty,
      amount: Number(
        isOption ? (row.amount || 0) : (row.baseAmount ?? row.amount ?? 0),
      ),
      isOption,
      optionCharge: Number(isOption ? row.optionCharge || 0 : 0),
    })

    if (isOption) continue

    for (const option of row.options || []) {
      flattened.push({
        name: option.name,
        qty: option.qty,
        amount: option.amount,
        isOption: true,
        optionCharge: Number(option.optionCharge || 0),
      })
    }
  }

  return flattened
}

export function buildAutofillStateFromParsed(parsed, products) {
  const rawItems = parsed?.rawItems || []
  const bakeryBreakdown = parsed?.bakeryBreakdown || []
  const bakeryTotal = Number(parsed?.bakeryTotal || 0)

  const items = rawItems.map((rawName) => {
    const bakeryMatch = bakeryBreakdown.find(
      (b) => b.name === rawName || rawName.includes(b.name) || b.name.includes(rawName),
    )

    return {
      name: rawName,
      qty: bakeryMatch?.qty || 1,
      amount: bakeryMatch?.amount || 0,
      isOption: false,
      optionCharge: 0,
    }
  })

  for (const b of bakeryBreakdown) {
    const alreadyInItems = items.some(
      (item) => item.name === b.name || item.name.includes(b.name) || b.name.includes(item.name),
    )
    if (!alreadyInItems) {
      items.push({
        name: b.name,
        qty: b.qty || 1,
        amount: b.amount || 0,
        isOption: false,
        optionCharge: 0,
      })
    }
  }

  return {
    source: parsed?.source || 'manual',
    orderedDate: '',
    orderTotal: parsed?.orderTotal || 0,
    items: items.length ? items : [{ name: '', qty: 1, amount: '', isOption: false, optionCharge: 0 }],
    bakeryTotal,
    bakeryBreakdown,
    note: '',
    confidence: items.length ? 1 : 0,
  }
}
