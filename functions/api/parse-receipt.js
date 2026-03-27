const OPENAI_API_URL = 'https://api.openai.com/v1/responses'

const PRIMARY_MODEL = 'gpt-4o-mini'
const SECONDARY_MODEL = 'gpt-4o-mini'
const FALLBACK_MODEL = 'gpt-4o'

const baseDeveloperPrompt = [
  'Extract Korean bakery/cafe receipt data. Return JSON only.',
  'Detect source: 쿠팡이츠, 배민, 픽업, 매장 POS, or null.',
  'Prefer total from labels: 주문금액, 총 결제금액, 합계(카드), 결제금액, 합계.',
  'rawItems: array of product name strings exactly as printed. Do NOT merge name+qty+price into one string. Each element is the product name only.',
  'bakeryBreakdown: only solid bakery/pastry/bread items. Exclude all drinks (라떼, 아메리카노, 드립커피, 이지드립 etc), drink options (ICE, HOT, 샷추가), and delivery fees.',
  'Bakery examples: 에그타르트, 마늘빵, 양버터, 베이커리 츄러스, 휘낭시에, 잠봉뵈르 샌드위치, 호두 크랜베리 깜빠뉴, 아보카도 샌드위치, 오늘의 샐러드.',
  'Read Korean text exactly as printed. Do NOT hallucinate or abbreviate names. 잠봉뵈르 샌드위치 must not become 장별로 or 스딩워치. 이지드립 must not become 이즈치즈.',
  'bakeryTotal = sum of all bakeryBreakdown amounts.',
  'amount in bakeryBreakdown = unit price × qty for that item.',
].join(' ')

const rescueDeveloperPrompt = [
  baseDeveloperPrompt,
  'Re-read the receipt from scratch. Focus on item rows, totals, and bakery classification.',
  'Be extra careful with: 잠봉뵈르 샌드위치, 호두 크랜베리 깜빠뉴, 이지드립, 휘낭시에.',
  'Ensure rawItems contains clean product names only, never merged with qty or price.',
].join(' ')


function corsHeaders() {
  return {
    'access-control-allow-origin': '*',
    'access-control-allow-methods': 'POST,OPTIONS',
    'access-control-allow-headers': 'content-type',
  }
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

function safeJsonParse(text) {
  if (!text) return null

  try {
    return JSON.parse(text)
  } catch {
    const match = text.match(/\{[\s\S]*\}/)
    if (!match) return null

    try {
      return JSON.parse(match[0])
    } catch {
      return null
    }
  }
}

function normalizeParsedResult(result) {
  if (!result || typeof result !== 'object') return null

  const bakeryBreakdown = Array.isArray(result.bakeryBreakdown)
    ? result.bakeryBreakdown
        .filter(Boolean)
        .map((item) => ({
          name: typeof item.name === 'string' ? item.name.trim() : '',
          qty: Number(item.qty) || 0,
          amount: Number(item.amount) || 0,
        }))
        .filter((item) => item.name && item.qty >= 0 && item.amount >= 0)
    : []

  return {
    source: typeof result.source === 'string' ? result.source.trim() : null,
    orderTotal: Number(result.orderTotal) || 0,
    rawItems: Array.isArray(result.rawItems)
      ? result.rawItems.filter((v) => typeof v === 'string' && v.trim()).map((v) => v.trim())
      : [],
    bakeryTotal: Number(result.bakeryTotal) || 0,
    bakeryBreakdown,
  }
}

function shouldRetryParsedResult(result) {
  if (!result) return true

  if (!Number.isFinite(result.orderTotal) || result.orderTotal <= 0) return true
  if (!Array.isArray(result.rawItems) || result.rawItems.length === 0) return true
  if (!Number.isFinite(result.bakeryTotal) || result.bakeryTotal < 0) return true

  const breakdownSum = Array.isArray(result.bakeryBreakdown)
    ? result.bakeryBreakdown.reduce((sum, item) => sum + (Number(item.amount) || 0), 0)
    : 0

  if (result.bakeryTotal > 0 && (!result.bakeryBreakdown || result.bakeryBreakdown.length === 0)) {
    return true
  }

  if (result.bakeryBreakdown?.length > 0 && breakdownSum === 0) {
    return true
  }

  if (result.bakeryTotal > 0 && Math.abs(breakdownSum - result.bakeryTotal) > 100) {
    return true
  }

  return false
}

async function callOpenAI({
  apiKey,
  model,
  developerPrompt,
  imageBase64,
  mimeType,
  detail = 'low',
}) {
  const response = await fetch(OPENAI_API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
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
            {
              type: 'input_image',
              image_url: `data:${mimeType};base64,${imageBase64}`,
              detail,
            },
            {
              type: 'input_text',
              text: 'Extract the receipt data and return JSON only.',
            },
          ],
        },
      ],
      text: {
        format: {
          type: 'json_schema',
          name: 'receipt_parse',
          schema: {
            type: 'object',
            additionalProperties: false,
            properties: {
              source: { type: ['string', 'null'] },
              orderTotal: { type: 'number' },
              rawItems: {
                type: 'array',
                items: { type: 'string' },
              },
              bakeryTotal: { type: 'number' },
              bakeryBreakdown: {
                type: 'array',
                items: {
                  type: 'object',
                  additionalProperties: false,
                  properties: {
                    name: { type: 'string' },
                    qty: { type: 'number' },
                    amount: { type: 'number' },
                  },
                  required: ['name', 'qty', 'amount'],
                },
              },
            },
            required: ['source', 'orderTotal', 'rawItems', 'bakeryTotal', 'bakeryBreakdown'],
          },
        },
      },
    }),
  })

  if (!response.ok) {
    const errorText = await response.text()
    throw new Error(`OpenAI API error ${response.status}: ${errorText}`)
  }

  const data = await response.json()

  const outputText =
    data.output_text ||
    data.output?.flatMap((item) => item.content || []).find((c) => c.type === 'output_text')?.text ||
    ''

  return safeJsonParse(outputText)
}

async function parseWithTiering({ apiKey, imageBase64, mimeType }) {
  const attempts = [
    {
      model: PRIMARY_MODEL,
      prompt: baseDeveloperPrompt,
      detail: 'high',
    },
    {
      model: SECONDARY_MODEL,
      prompt: rescueDeveloperPrompt,
      detail: 'high',
    },
    {
      model: FALLBACK_MODEL,
      prompt: rescueDeveloperPrompt,
      detail: 'high',
    },
  ]

  let lastResult = null
  let lastError = null

  for (const attempt of attempts) {
    try {
      const raw = await callOpenAI({
        apiKey,
        model: attempt.model,
        developerPrompt: attempt.prompt,
        imageBase64,
        mimeType,
        detail: attempt.detail,
      })

      const normalized = normalizeParsedResult(raw)
      lastResult = normalized

      if (!shouldRetryParsedResult(normalized)) {
        return normalized
      }
    } catch (error) {
      lastError = error
    }
  }

  if (lastResult) return lastResult
  throw lastError || new Error('Failed to parse receipt')
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
    const apiKey = env.OPENAI_API_KEY

    if (!apiKey) {
      return json({ error: 'Missing OPENAI_API_KEY' }, 500)
    }

    const body = await request.json()
    const imageBase64 = body?.imageBase64
    const mimeType = body?.mimeType || 'image/jpeg'

    if (!imageBase64) {
      return json({ error: 'Missing imageBase64' }, 400)
    }

    const parsed = await parseWithTiering({
      apiKey,
      imageBase64,
      mimeType,
    })

    return json({ ok: true, parsed })
  } catch (error) {
    return json({ error: error?.message || 'Unknown error' }, 500)
  }
}
