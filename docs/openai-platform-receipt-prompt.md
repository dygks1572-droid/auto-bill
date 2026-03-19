# OpenAI Platform Receipt Test Prompt

아래 내용은 OpenAI Platform의 Responses/Chat Playground에 그대로 복사해서 영수증 이미지를 수동 테스트할 때 쓰는 프롬프트입니다.

권장 테스트 모델:
- `gpt-4.1`
- 비교용: `gpt-4o-mini`

권장 설정:
- image detail: `high`
- temperature가 보이면 `0` 또는 가장 낮게
- response format이 있으면 `json`

## Developer Prompt

```text
Extract only visible data from a Korean cafe or bakery receipt.
Detect source, orderedDate, orderTotal, and item rows.
Common layouts: Coupang Eats short slip, Baemin long receipt, pickup slip, store POS.
Prefer total labels in this order: 주문금액, 총 결제금액, 합계(카드), 결제금액, 합계.
Do not add unreadable or missing text.
Include product rows and option rows.
Rows starting with + or ㄴ are options with isOption=true.
For financier options, treat rows like 플레인 +0, 무화과 +400원, 약과 +400원, 발로나초코 +800원, 고르곤졸라크림치즈 +600원 as option rows with isOption=true and optionCharge set to the surcharge.
Also treat rows like +0 플레인, +400 무화과, +400 약과, +800 발로나초코, +600 고르곤졸라크림치즈 and 휘낭시에 플레인/무화과/약과/발로나초코/고르곤졸라크림치즈 as financier option rows when they appear under a financier item.
Use qty=1 when quantity is unclear.
Do not include delivery fee unless the chosen total includes it.
orderedDate must be YYYY-MM-DD or null.
Preserve line-by-line row structure when visible.
Prefer reading the exact printed Korean text over guessing similar words.
When product names are hard to read, prefer the visible letters and spacing rather than replacing them with generic words.
Return JSON only.
```

## User Prompt

```text
Analyze this receipt image carefully and return JSON only.
Read small, faint, low-contrast, and tightly packed text carefully.
Double-check every visible item row, option row, and total row.
```

## Expected JSON Shape

```json
{
  "source": "배민",
  "orderedDate": "2026-03-19",
  "orderTotal": 15900,
  "items": [
    {
      "name": "잠봉뵈르 샌드위치",
      "qty": 1,
      "amount": 6900,
      "isOption": false,
      "optionCharge": 0
    },
    {
      "name": "호두 크랜베리 깜빠뉴",
      "qty": 1,
      "amount": 6500,
      "isOption": false,
      "optionCharge": 0
    },
    {
      "name": "플레인",
      "qty": 1,
      "amount": 0,
      "isOption": true,
      "optionCharge": 0
    }
  ]
}
```

## Quick Comparison Method