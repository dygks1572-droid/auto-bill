const OPENAI_API_URL = 'https://api.openai.com/v1/responses'

const PRIMARY_MODEL = 'gpt-4o-mini'
const SECONDARY_MODEL = 'gpt-4o-mini'
const FALLBACK_MODEL = 'gpt-4o'

const baseDeveloperPrompt = [
  'Extract Korean bakery/cafe receipt data. Return JSON only.',
  'Detect source: 쿠팡이츠, 배민, 픽업, 매장 POS, or null. If receipt header says a store name with POS-style layout, use "매장 POS".',
  'Prefer total from labels: 주문금액, 총 결제금액, 합계(카드), 결제금액, 합계.',
  'rawItems: array of ALL product/option name strings exactly as printed. Each element is the product name only (no qty/price). Include option rows.',
  'bakeryBreakdown: ONLY solid baked goods / pastry / bread / sandwich / salad items.',
  'Bakery YES examples: 에그타르트, 마늘빵, 양버터, 베이커리 츄러스, 휘낭시에, 잠봉뵈르 샌드위치, 호두 크랜베리 깜빠뉴, 아보카도 샌드위치, 오늘의 샐러드.',
  'Bakery NO / EXCLUDE: 이지드립, 드립커피, 아메리카노, 라떼, 카페라떼, 카푸치노, 에스프레소, 아이스티, 아이스 아메리카노, 호두 그레너베리 깜빵뉴 (drip coffee/latte/espresso). These are drinks, NOT bakery.',
  'Read Korean text exactly as printed. Do NOT hallucinate or abbreviate names.',
  'OPTIONS: Rows starting with +, ㄴ, or indented under a main item are options. For financier (휘낭시에) items, 플레인/무화과/약과/발로나초코/고르곤졸라크림치즈 are ALWAYS options of 휘낭시에, never standalone bakery items.',
  'Each bakeryBreakdown item must include an "options" array. Each option has {name, optionCharge}.',
  'CRITICAL: 무화과, 플레인, 약과 etc. must NEVER appear as standalone bakeryBreakdown items. They must be inside a 휘낭시에 item\'s options array.',
  'amount in bakeryBreakdown = (base unit price + sum of option charges) × qty.',
  'bakeryTotal = sum of all bakeryBreakdown amounts.',
].join(' ')

const rescueDeveloperPrompt = [
  baseDeveloperPrompt,
  'Re-read carefully. Ensure 이지드립 is NOT in bakeryBreakdown (it is coffee). Ensure 무화과/플레인 are inside 휘낭시에 options, not standalone.',
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

  let bakeryBreakdown = Array.isArray(result.bakeryBreakdown)
    ? result.bakeryBreakdown
        .filter(Boolean)
        .map((item) => {
          const options = Array.isArray(item.options)
            ? item.options
                .filter(Boolean)
                .map((opt) => ({
                  name: typeof opt.name === 'string' ? opt.name.trim() : '',
                  optionCharge: Number(opt.optionCharge) || 0,
                }))
                .filter((opt) => opt.name)
            : []

          return {
            name: typeof item.name === 'string' ? item.name.trim() : '',
            qty: Number(item.qty) || 0,
            amount: Number(item.amount) || 0,
            options,
          }
        })
        .filter((item) => item.name && item.qty >= 0 && item.amount >= 0)
    : []

  bakeryBreakdown = postProcessBakeryBreakdown(bakeryBreakdown)
  const bakeryTotal = bakeryBreakdown.reduce((sum, item) => sum + item.amount, 0)

  return {
    source: typeof result.source === 'string' ? result.source.trim() : null,
    orderTotal: Number(result.orderTotal) || 0,
    rawItems: Array.isArray(result.rawItems)
      ? result.rawItems.filter((v) => typeof v === 'string' && v.trim()).map((v) => v.trim())
      : [],
    bakeryTotal,
    bakeryBreakdown,
  }
}

const DRINK_KEYWORDS = [
  '이지드립', '드립커피', '드립', '아메리카노', '라떼', '카페라떼',
  '카푸치노', '에스프레소', '아이스티', '마체', '스무디',
  '이즈드립', '이즈치즈', '이지드랍', '이지듥립',
]

const FINANCIER_OPTION_NAMES = [
  '플레인', '무화과', '약과', '발로나초코', '고르곤졸라크림치즈',
  '고르곤졸라', '초코', '크림치즈',
]

const OCR_CORRECTIONS = {
  '잠봉뵈르 스콘위치': '잠봉뵈르 샌드위치',
  '잠본뵈르 샌드위치': '잠봉뵈르 샌드위치',
  '장별로 샌드위치': '잠봉뵈르 샌드위치',
  '장별로 스콘위치': '잠봉뵈르 샌드위치',
  '호두 그래프베리 깜빼뉴': '호두 크랜베리 깜빠뉴',
  '호두 그래프베리 깜빼뉴': '호두 크랜베리 깜빠뉴',
  '호두 그레너베리 깜빵뉴': '호두 크랜베리 깜빠뉴',
  '이즈치즈': '이지드립',
  '이즈드립': '이지드립',
  '이지듥립': '이지드립',
  '이지드랍': '이지드립',
}

function postProcessBakeryBreakdown(breakdown) {
  let items = breakdown.map((item) => {
    let name = item.name
    for (const [wrong, correct] of Object.entries(OCR_CORRECTIONS)) {
      if (name === wrong) {
        name = correct
        break
      }
    }
    return { ...item, name }
  })

  items = items.filter((item) => {
    const lower = item.name.toLowerCase()
    return !DRINK_KEYWORDS.some((kw) => lower.includes(kw))
  })

  const standaloneOptions = []
  const nonOptions = []

  for (const item of items) {
    const isFinancierOption = FINANCIER_OPTION_NAMES.some(
      (opt) => item.name === opt || item.name.startsWith('+ ' + opt) || item.name.startsWith('ㄴ ' + opt),
    )
    if (isFinancierOption) {
      standaloneOptions.push(item)
    } else {
      nonOptions.push(item)
    }
  }

  if (standaloneOptions.length > 0) {
    const financierItem = nonOptions.find((item) => item.name.includes('휘낭시에'))
    if (financierItem) {
      for (const opt of standaloneOptions) {
        financierItem.options.push({
          name: opt.name.replace(/^[+\u3134]\s*/, ''),
          optionCharge: opt.amount || 0,
        })
      }
    }
  }

  return nonOptions
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

async function uploadImageFile(apiKey, imageBase64, mimeType) {
  const binaryString = atob(imageBase64)
  const bytes = new Uint8Array(binaryString.length)
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i)
  }

  const blob = new Blob([bytes], { type: mimeType })
  const ext = mimeType === 'image/png' ? 'png' : 'jpg'

  const formData = new FormData()
  formData.append('purpose', 'vision')
  formData.append('file', blob, `receipt.${ext}`)

  const response = await fetch('https://api.openai.com/v1/files', {
    method: 'POST',
    headers: { Authorization: `Bearer ${apiKey}` },
    body: formData,
  })

  if (!response.ok) {
    const errorText = await response.text()
    throw new Error(`File upload failed ${response.status}: ${errorText}`)
  }

  const data = await response.json()
  return data.id
}

async function deleteImageFile(apiKey, fileId) {
  try {
    await fetch(`https://api.openai.com/v1/files/${fileId}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${apiKey}` },
    })
  } catch {
    // silently ignore
  }
}

async function callOpenAI({
  apiKey,
  model,
  developerPrompt,
  fileId,
  detail = 'high',
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
              file_id: fileId,
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
                    options: {
                      type: 'array',
                      items: {
                        type: 'object',
                        additionalProperties: false,
                        properties: {
                          name: { type: 'string' },
                          optionCharge: { type: 'number' },
                        },
                        required: ['name', 'optionCharge'],
                      },
                    },
                  },
                  required: ['name', 'qty', 'amount', 'options'],
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
  const fileId = await uploadImageFile(apiKey, imageBase64, mimeType)

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

  try {
    for (const attempt of attempts) {
      try {
        const raw = await callOpenAI({
          apiKey,
          model: attempt.model,
          developerPrompt: attempt.prompt,
          fileId,
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
  } finally {
    deleteImageFile(apiKey, fileId)
  }
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
