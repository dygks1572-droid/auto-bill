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
      orderedDate: {
        type: ['string', 'null'],
        description: 'YYYY-MM-DD if visible, otherwise null.',
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
    },
    required: ['source', 'orderedDate', 'orderTotal', 'items'],
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

function normalizeName(value) {
  return String(value || '')
    .replace(/\s+/g, '')
    .replace(/[0-9,원()+-]/g, '')
    .trim()
}

function hasSuspiciousItems(items) {
  const suspiciousPatterns = [/스딩워치/, /그래백리/, /깨비빔밥/, /이즈드랍/, /세드위치/]

  return (items || []).some((item) => {
    const name = normalizeName(item?.name)
    return suspiciousPatterns.some((pattern) => pattern.test(name))
  })
}

function getParseScore(parsed) {
  const items = Array.isArray(parsed?.items) ? parsed.items : []
  const nonOptionItems = items.filter((item) => !item?.isOption && String(item?.name || '').trim())
  const hasOptions = items.some((item) => item?.isOption)

  let score = 0
  if (parsed?.orderTotal && parsed.orderTotal > 0) score += 3
  if (nonOptionItems.length) score += 3
  score += Math.min(nonOptionItems.length, 4)
  if (hasOptions) score += 1
  if (!hasSuspiciousItems(items)) score += 2
  return score
}

function shouldRetryParsedResult(parsed) {
  const items = Array.isArray(parsed?.items) ? parsed.items : []
  const nonOptionItems = items.filter((item) => !item?.isOption && String(item?.name || '').trim())
  const hasOptions = items.some((item) => item?.isOption)

  if (!items.length) return true
  if (!parsed?.orderTotal || parsed.orderTotal <= 0) return true
  if (!nonOptionItems.length) return true
  if (hasSuspiciousItems(items)) return true
  if (nonOptionItems.length === 1 && hasOptions) return true

  return false
}

async function requestReceiptParse({ env, imageBase64, mimeType, developerPrompt, userPrompt, maxOutputTokens, model }) {
  const openaiResponse = await fetch('https://api.openai.com/v1/responses', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      authorization: `Bearer ${env.OPENAI_API_KEY}`,
    },
    body: JSON.stringify({
      model,
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
              detail: env.OPENAI_IMAGE_DETAIL || 'high',
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
      max_output_tokens: maxOutputTokens,
    }),
  })

  if (!openaiResponse.ok) {
    const detail = await openaiResponse.text()
    throw new Error(detail || 'OpenAI request failed')
  }

  const payload = await openaiResponse.json()
  const text = extractStructuredText(payload)
  return JSON.parse(text)
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

    const baseDeveloperPrompt = [
      'Extract only visible data from a Korean cafe or bakery receipt.',
      'Detect source, orderedDate, orderTotal, and item rows.',
      'Common layouts: Coupang Eats short slip, Baemin long receipt, pickup slip, store POS.',
      'Prefer total labels in this order: 주문금액, 총 결제금액, 합계(카드), 결제금액, 합계.',
      'Do not add unreadable or missing text.',
      'Include product rows and option rows.',
      'Rows starting with + or ㄴ are options with isOption=true.',
      'For financier options, treat rows like 플레인 +0, 무화과 +400원, 약과 +400원, 발로나초코 +800원, 고르곤졸라크림치즈 +600원 as option rows with isOption=true and optionCharge set to the surcharge.',
      'Also treat rows like +0 플레인, +400 무화과, +400 약과, +800 발로나초코, +600 고르곤졸라크림치즈 and 휘낭시에 플레인/무화과/약과/발로나초코/고르곤졸라크림치즈 as financier option rows when they appear under a financier item.',
      'If a receipt shows 휘낭시에 as the base item and the flavor appears on the next line, return the base item row and a separate option row instead of merging them.',
      'If an option surcharge is visible, copy it to optionCharge even when the option row amount is 0.',
      'Use qty=1 when quantity is unclear.',
      'Do not include delivery fee unless the chosen total includes it.',
      'orderedDate must be YYYY-MM-DD or null.',
      'Preserve line-by-line row structure when visible.',
      'Prefer reading the exact printed Korean text over guessing similar words.',
      'When product names are hard to read, prefer the visible letters and spacing rather than replacing them with generic words.',
    ].join(' ')

    const primaryUserPrompt = `Analyze receipt image ${fileName} carefully and return the schema only. Read small, faint, low-contrast, and tightly packed text carefully.`
    const model = env.OPENAI_MODEL || 'gpt-4.1'

    let parsed
    try {
      parsed = await requestReceiptParse({
        env,
        imageBase64,
        mimeType,
        developerPrompt: baseDeveloperPrompt,
        userPrompt: primaryUserPrompt,
        maxOutputTokens: 1500,
        model,
      })
    } catch (error) {
      return json({ error: 'OpenAI request failed', detail: error?.message || 'Unknown parse error' }, 500)
    }

    if (shouldRetryParsedResult(parsed)) {
      const rescueDeveloperPrompt = [
        baseDeveloperPrompt,
        'Re-read the receipt from scratch when the first extraction looks weak.',
        'Focus on item rows, option rows, and total row.',
        'Do not collapse multiple lines into one item if separate rows are visible.',
        'If a product name is partially unclear, keep the closest visible spelling from the receipt rather than inventing a new word.',
        'Be extra careful with bakery names, sandwich names, drip coffee names, and financier option rows.',
      ].join(' ')
      const rescueUserPrompt = `Re-analyze ${fileName} from scratch. Double-check every visible item row, option row, and total row before returning the schema only.`

      try {
        const retried = await requestReceiptParse({
          env,
          imageBase64,
          mimeType,
          developerPrompt: rescueDeveloperPrompt,
          userPrompt: rescueUserPrompt,
          maxOutputTokens: 1900,
          model: env.OPENAI_RESCUE_MODEL || model,
        })

        if (getParseScore(retried) >= getParseScore(parsed)) {
          parsed = retried
        }
      } catch (error) {
        console.warn('Receipt rescue parse failed', error)
      }
    }

    return json({ ok: true, parsed })
  } catch (error) {
    return json({ error: error?.message || 'Unknown server error' }, 500)
  }
}
