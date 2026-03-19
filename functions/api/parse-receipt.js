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
    return null
  }

  return {
    source: OCR_SOURCE_MAP[parsed.source] || '알 수 없음',
    documentType: OCR_DOCUMENT_MAP[parsed.patternId] || '알 수 없음',
    orderedDate: parsed.orderedDate || null,
    totalLabel: parsed.orderTotalLabel || null,
    orderTotal: parsed.orderTotal,
    items,
    notes: [`rule-parser:${parsed.patternId}`],
    confidence: 0.62,
  }
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
                'Transcribe this Korean receipt into plain text lines only. Preserve line breaks, prices, plus-option rows, and labels. No explanation.',
            },
          ],
        },
        {
          role: 'user',
          content: [
            { type: 'input_text', text: `OCR receipt image ${fileName}.` },
            {
              type: 'input_image',
              detail: 'low',
              image_url: `data:${mimeType};base64,${imageBase64}`,
            },
          ],
        },
      ],
      max_output_tokens: 1200,
    }),
  })

  if (!response.ok) {
    throw new Error(`OCR request failed: ${await response.text()}`)
  }

  return response.json()
}

async function requestStructuredParse(env, { imageBase64, mimeType, fileName }) {
  const developerPrompt = [
    'Extract only visible data from a Korean cafe or bakery receipt.',
    'Detect source, documentType, orderedDate, totalLabel, orderTotal, item rows, notes, confidence.',
    'Common layouts: Coupang Eats short slip, Baemin long receipt, pickup slip, store POS.',
    'Prefer total labels in this order: 주문금액, 총 결제금액, 합계(카드), 결제금액, 합계.',
    'Do not add unreadable or missing text.',
    'Include product rows and option rows.',
    'Rows starting with + or ㄴ are options with isOption=true.',
    'For financier options, lines like 플레인 +0, 무화과 +400원, 약과 +400원, 발로나초코 +800원, 고르곤졸라크림치즈 +600원 are option rows and must have isOption=true.',
    'Use qty=1 when quantity is unclear.',
    'Do not include delivery fee unless the chosen total label includes it.',
    'orderedDate must be YYYY-MM-DD or null.',
  ].join(' ')

  const userPrompt = `Analyze receipt image ${fileName} and return the schema only.`

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
          content: [
            { type: 'input_text', text: userPrompt },
            {
              type: 'input_image',
              detail: env.OPENAI_IMAGE_DETAIL || 'auto',
              image_url: `data:${mimeType};base64,${imageBase64}`,
            },
          ],
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

    try {
      const ocrPayload = await requestOcrText(env, { imageBase64, mimeType, fileName })
      const ocrText = extractPlainText(ocrPayload)
      const ruleBased = buildRuleBasedResult(ocrText)

      if (ruleBased) {
        return json({ ok: true, parsed: ruleBased, stage: 'rule-parser' })
      }
    } catch (error) {
      console.warn('Rule-first OCR parse failed. Falling back to structured vision parse.', error)
    }

    const payload = await requestStructuredParse(env, { imageBase64, mimeType, fileName })
    const text = extractStructuredText(payload)

    let parsed
    try {
      parsed = JSON.parse(text)
    } catch {
      return json({ error: 'Failed to parse structured output', raw: payload }, 500)
    }

    return json({ ok: true, parsed, stage: 'vision-schema' })
  } catch (error) {
    return json({ error: error?.message || 'Unknown server error' }, 500)
  }
}
