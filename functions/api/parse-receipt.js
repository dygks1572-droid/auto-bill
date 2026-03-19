import { parseReceiptText } from '../../src/lib/receiptParser.js'
import { isOptionLineName } from '../../src/lib/bakeryMatcher.js'

const receiptSchema = {
  name: 'receipt_extraction',
  schema: {
    type: 'object',
    additionalProperties: false,
    properties: {
      source: {
        type: 'string',
        enum: ['쿠팡이츠', '배민', '픽업', '매장 POS', '알 수 없음'],
      },
      documentType: {
        type: 'string',
        enum: ['쿠팡-숏', '배민-롱', '픽업-슬립', '스토어-포스', '알 수 없음'],
      },
      orderedDate: {
        type: ['string', 'null'],
        description: 'YYYY-MM-DD if visible, otherwise null.',
      },
      totalLabel: {
        type: ['string', 'null'],
      },
      orderTotal: {
        type: ['integer', 'null'],
      },
      items: {
        type: 'array',
        items: {
          type: 'object',
          additionalProperties: false,
          properties: {
            name: { type: 'string' },
            qty: { type: 'integer' },
            amount: { type: 'integer' },
            isOption: { type: 'boolean' },
            optionCharge: { type: 'integer' },
          },
          required: ['name', 'qty', 'amount', 'isOption', 'optionCharge'],
        },
      },
      notes: {
        type: 'array',
        items: { type: 'string' },
      },
      confidence: {
        type: 'number',
      },
    },
    required: [
      'source',
      'documentType',
      'orderedDate',
      'totalLabel',
      'orderTotal',
      'items',
      'notes',
      'confidence',
    ],
  },
  strict: true,
}

const OCR_SOURCE_MAP = {
  'coupang-eats': '쿠팡이츠',
  baemin: '배민',
  픽업: '픽업',
  'store-pos': '매장 POS',
}

const OCR_DOCUMENT_MAP = {
  쿠팡숏: '쿠팡-숏',
  'baemin-long': '배민-롱',
  '픽업 전표': '픽업-슬립',
  'store-pos': '스토어-포스',
}

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'content-type': 'application/json; charset=utf-8',
      'access-control-allow-origin': '*',
    },
  })
}

function corsHeaders() {
  return {
    'access-control-allow-origin': '*',
    'access-control-allow-methods': 'POST,OPTIONS',
    'access-control-allow-headers': 'content-type',
  }
}

function extractStructuredText(payload) {
  if (typeof payload?.output_text === 'string' && payload.output_text.trim()) {
    return payload.output_text
  }

  const content = payload?.output?.flatMap((message) => message?.content || []) || []
  const textNode = content.find((node) => typeof node?.text === 'string')
  return textNode?.text || ''
}

function extractPlainText(payload) {
  if (typeof payload?.output_text === 'string' && payload.output_text.trim()) {
    return payload.output_text.trim()
  }

  const content = payload?.output?.flatMap((message) => message?.content || []) || []
  return content
    .filter((node) => typeof node?.text === 'string')
    .map((node) => node.text)
    .join('\n')
    .trim()
}

function normalizeOcrText(text) {
  return String(text || '')
    .replace(/\u00a0/g, ' ')
    .replace(/[|｜]/g, '1')
    .replace(/[•·]/g, ' ')
    .replace(/\s{2,}/g, ' ')
    .replace(/ ?\/ ?/g, ' / ')
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .join('\n')
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value))
}

function scoreParsedReceipt(parsed, stage = 'vision') {
  const items = Array.isArray(parsed?.items) ? parsed.items : []
  const baseItems = items.filter((item) => !item?.isOption)
  const optionItems = items.filter((item) => item?.isOption)

  let score = stage === 'vision' ? 0.72 : 0.7

  if (typeof parsed?.orderTotal === 'number' && parsed.orderTotal > 0) score += 0.08
  if (baseItems.length >= 1) score += 0.06
  if (baseItems.length >= 2) score += 0.05
  if (items.some((item) => Number(item?.amount || 0) > 0)) score += 0.04
  if (optionItems.length >= 1) score += 0.04
  if (parsed?.orderedDate) score += 0.03
  if (parsed?.source && parsed.source !== '알 수 없음') score += 0.03
  if (parsed?.documentType && parsed.documentType !== '알 수 없음') score += 0.02
  if (parsed?.totalLabel) score += 0.02

  return clamp(Number(score.toFixed(2)), 0.58, 0.94)
}

function isRuleBasedResultStrong(parsed, sourceParse) {
  if (!parsed) return false

  const items = Array.isArray(parsed.items) ? parsed.items : []
  const baseItems = items.filter((item) => !item.isOption)
  const candidateLines = Array.isArray(sourceParse?.candidateLines) ? sourceParse.candidateLines : []
  const coverage = candidateLines.length ? items.length / candidateLines.length : 0
  const confidence = scoreParsedReceipt(parsed, 'rule')

  if (typeof parsed.orderTotal !== 'number' || parsed.orderTotal <= 0) return false
  if (baseItems.length === 0) return false
  if (confidence < 0.8) return false
  if (candidateLines.length >= 3 && coverage < 0.34) return false

  return true
}

function buildRuleBasedResult(ocrText) {
  const parsed = parseReceiptText(ocrText)
  const hasTotal = typeof parsed.orderTotal === 'number' && parsed.orderTotal > 0
  const items = (parsed.rawItems || []).map((item) => {
    const option = isOptionLineName(item.name)
    return {
      name: item.name,
      qty: Number(item.qty || 1),
      amount: Number(item.amount || 0),
      isOption: option,
      optionCharge: option ? Number(item.amount || 0) : 0,
    }
  })
  const baseItems = items.filter((item) => !item.isOption)

  if (!hasTotal || baseItems.length === 0) {
    return { parsed: null, sourceParse: parsed }
  }

  const result = {
    source: OCR_SOURCE_MAP[parsed.source] || '알 수 없음',
    documentType: OCR_DOCUMENT_MAP[parsed.patternId] || '알 수 없음',
    orderedDate: parsed.orderedDate || null,
    totalLabel: parsed.orderTotalLabel || null,
    orderTotal: parsed.orderTotal,
    items,
    notes: [`rule-parser:${parsed.patternId}`],
    confidence: 0,
  }

  result.confidence = scoreParsedReceipt(result, 'rule')
  return { parsed: result, sourceParse: parsed }
}

async function requestOcrText(env, { imageBase64, mimeType, fileName }) {
  const response = await fetch('https://api.openai.com/v1/responses', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      authorization: `Bearer ${env.OPENAI_API_KEY}`,
    },
    body: JSON.stringify({
      model: env.OPENAI_OCR_MODEL || env.OPENAI_MODEL || 'gpt-4o-mini',
      input: [
        {
          role: 'developer',
          content: [
            {
              type: 'input_text',
              text:
                'Transcribe this Korean receipt into plain text lines only. Preserve line breaks, product rows, option rows, prices, dates, totals, and labels. Keep item names readable, preserve each visible receipt row on its own line when possible, and read faint or low-contrast text carefully. No explanation.',
            },
          ],
        },
        {
          role: 'user',
          content: [
            { type: 'input_text', text: `OCR receipt image ${fileName}.` },
            {
              type: 'input_image',
              detail: 'high',
              image_url: `data:${mimeType};base64,${imageBase64}`,
            },
          ],
        },
      ],
      max_output_tokens: 1600,
    }),
  })

  if (!response.ok) {
    throw new Error(`OCR request failed: ${await response.text()}`)
  }

  return response.json()
}

async function requestStructuredParse(env, { imageBase64, mimeType, fileName, ocrText = '' }) {
  const developerPrompt = [
    'Extract only visible data from a Korean cafe or bakery receipt.',
    'Detect source, documentType, orderedDate, totalLabel, orderTotal, item rows, notes, confidence.',
    'Common layouts: Coupang Eats short slip, Baemin long receipt, pickup slip, store POS.',
    'Prefer total labels in this order: 주문금액, 총 결제금액, 합계(카드), 결제금액, 합계.',
    'Use the OCR lines as hints, but verify against the image before deciding.',
    'Do not add unreadable or missing text.',
    'Include product rows and option rows.',
    'Rows starting with + or ㄴ are options with isOption=true.',
    'For financier options, lines like 플레인 +0, 무화과 +400원, 약과 +400원, 발로나초코 +800원, 고르곤졸라크림치즈 +600원 are option rows and must have isOption=true.',
    'Use qty=1 when quantity is unclear.',
    'Do not include delivery fee unless the chosen total label includes it.',
    'orderedDate must be YYYY-MM-DD or null.',
  ].join(' ')

  const userContent = [{ type: 'input_text', text: `Analyze receipt image ${fileName} and return the schema only.` }]

  if (ocrText.trim()) {
    userContent.push({
      type: 'input_text',
      text: `OCR lines for cross-check:\n${ocrText.trim().slice(0, 4000)}`,
    })
  }

  userContent.push({
    type: 'input_image',
    detail: env.OPENAI_IMAGE_DETAIL || 'high',
    image_url: `data:${mimeType};base64,${imageBase64}`,
  })

  const openaiResponse = await fetch('https://api.openai.com/v1/responses', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      authorization: `Bearer ${env.OPENAI_API_KEY}`,
    },
    body: JSON.stringify({
      model: env.OPENAI_MODEL || 'gpt-4o-mini',
      input: [
        {
          role: 'developer',
          content: [{ type: 'input_text', text: developerPrompt }],
        },
        {
          role: 'user',
          content: userContent,
        },
      ],
      text: {
        format: {
          type: 'json_schema',
          ...receiptSchema,
        },
      },
    }),
  })

  if (!openaiResponse.ok) {
    const detail = await openaiResponse.text()
    throw new Error(`OpenAI request failed: ${detail}`)
  }

  return openaiResponse.json()
}

function normalizeParsedResult(parsed, stage) {
  const normalized = {
    source: parsed?.source || '알 수 없음',
    documentType: parsed?.documentType || '알 수 없음',
    orderedDate: parsed?.orderedDate || null,
    totalLabel: parsed?.totalLabel || null,
    orderTotal: typeof parsed?.orderTotal === 'number' ? parsed.orderTotal : null,
    items: Array.isArray(parsed?.items) ? parsed.items : [],
    notes: Array.isArray(parsed?.notes) ? parsed.notes.filter(Boolean) : [],
    confidence: typeof parsed?.confidence === 'number' ? parsed.confidence : 0,
  }

  normalized.confidence = Math.max(normalized.confidence, scoreParsedReceipt(normalized, stage))
  return normalized
}

export async function onRequestOptions() {
  return new Response(null, {
    status: 204,
    headers: corsHeaders(),
  })
}

export async function onRequestPost(context) {
  try {
    const { request, env } = context
    const body = await request.json()
    const { imageBase64, mimeType = 'image/jpeg', fileName = 'receipt.jpg' } = body || {}

    if (!env.OPENAI_API_KEY) {
      return json({ error: 'OPENAI_API_KEY is missing' }, 500)
    }

    if (!imageBase64) {
      return json({ error: 'imageBase64 is required' }, 400)
    }

    let ocrText = ''

    try {
      const ocrPayload = await requestOcrText(env, { imageBase64, mimeType, fileName })
      ocrText = normalizeOcrText(extractPlainText(ocrPayload))
      const { parsed: ruleBased, sourceParse } = buildRuleBasedResult(ocrText)

      if (isRuleBasedResultStrong(ruleBased, sourceParse)) {
        return json({ ok: true, parsed: normalizeParsedResult(ruleBased, 'rule'), stage: 'rule-parser' })
      }
    } catch (error) {
      console.warn('Rule-first OCR parse failed. Falling back to structured vision parse.', error)
    }

    const payload = await requestStructuredParse(env, { imageBase64, mimeType, fileName, ocrText })
    const text = extractStructuredText(payload)

    let parsed
    try {
      parsed = JSON.parse(text)
    } catch {
      return json({ error: 'Failed to parse structured output', raw: payload }, 500)
    }

    return json({ ok: true, parsed: normalizeParsedResult(parsed, 'vision'), stage: 'vision-schema' })
  } catch (error) {
    return json({ error: error?.message || 'Unknown server error' }, 500)
  }
}
