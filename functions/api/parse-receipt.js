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

    const developerPrompt = [
      'Extract only visible data from a Korean cafe or bakery receipt.',
      'Detect source, documentType, orderedDate, totalLabel, orderTotal, item rows, notes, confidence.',
      'Common layouts: Coupang Eats short slip, Baemin long receipt, pickup slip, store POS.',
      'Prefer total labels in this order: 주문금액, 총 결제금액, 합계(카드), 결제금액, 합계.',
      'Do not add unreadable or missing text.',
      'Include product rows and option rows.',
      'Rows starting with + or ㄴ are options with isOption=true.',
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
      return json({ error: 'OpenAI request failed', detail }, 500)
    }

    const payload = await openaiResponse.json()
    const text = extractStructuredText(payload)

    let parsed
    try {
      parsed = JSON.parse(text)
    } catch {
      return json({ error: 'Failed to parse structured output', raw: payload }, 500)
    }

    return json({ ok: true, parsed })
  } catch (error) {
    return json({ error: error?.message || 'Unknown server error' }, 500)
  }
}
