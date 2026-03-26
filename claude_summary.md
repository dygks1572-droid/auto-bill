# Project Code Summary

이 프로젝트의 주요 파일 목록과 소스 코드입니다.

## File: `index.html`

```html
<!doctype html>
<html lang="ko">
  <head>
    <meta charset="UTF-8" />
    <link rel="icon" type="image/svg+xml" href="/vite.svg" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>myapp</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.jsx"></script>
  </body>
</html>
```

## File: `package.json`

```json
{
  "name": "myapp",
  "private": true,
  "version": "0.0.0",
  "type": "module",
  "scripts": {
    "dev": "vite --host 127.0.0.1 --port 5173 --strictPort",
    "dev:pages": "wrangler pages dev public --compatibility-date=2026-03-12 --port 8788 --proxy 5173",
    "build": "vite build",
    "lint": "eslint .",
    "preview": "vite preview"
  },
  "dependencies": {
    "firebase": "^12.10.0",
    "react": "^19.2.0",
    "react-dom": "^19.2.0"
  },
  "devDependencies": {
    "@eslint/js": "^9.39.1",
    "@types/react": "^19.2.7",
    "@types/react-dom": "^19.2.3",
    "@vitejs/plugin-react": "^5.1.1",
    "eslint": "^9.39.1",
    "eslint-plugin-react-hooks": "^7.0.1",
    "eslint-plugin-react-refresh": "^0.4.24",
    "globals": "^16.5.0",
    "vite": "^7.3.1",
    "wrangler": "^4.73.0"
  }
}

```

## File: `vite.config.js`

```js
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    host: '127.0.0.1',
    port: 5173,
    strictPort: true,
    proxy: {
      '/api': {
        target: 'http://127.0.0.1:8788',
        changeOrigin: true,
      },
    },
  },
})

```

## File: `wrangler.toml`

```toml
name = "bill"
compatibility_date = "2026-03-12"
pages_build_output_dir = "dist"

```

## File: `README.md`

```md
# 배달 주문 정리

영수증 이미지를 업로드하면 OpenAI Responses API로 품목과 주문 금액을 읽어와서 입력을 보조하는 React + Vite + Cloudflare Pages Functions 프로젝트입니다.

## 환경 설정

프론트엔드 환경 변수:

```bash
cp .env.example .env
```

서버 함수 환경 변수:

```bash
cp .dev.vars.example .dev.vars
```

`.dev.vars`에는 실제 OpenAI 키를 넣어야 합니다.

```dotenv
OPENAI_API_KEY=sk-...
OPENAI_MODEL=gpt-4.1
OPENAI_RESCUE_MODEL=gpt-4.1
OPENAI_IMAGE_DETAIL=high
```

`VITE_RECEIPT_API_URL`은 비워두면 기본값으로 `/api/parse-receipt`를 사용합니다. 프론트엔드가 별도 백엔드를 호출해야 할 때만 절대 URL을 넣으면 됩니다.

## 로컬 실행

터미널 1:

```bash
npm run dev
```

터미널 2:

```bash
npm run dev:pages
```

구성 방식:

- Vite는 앱을 `5173` 포트에서 띄웁니다.
- `wrangler pages dev`는 Functions를 `8788` 포트에서 띄웁니다.
- `vite.config.js`가 `/api` 요청을 `8788`로 프록시하므로 브라우저에서는 그대로 `/api/parse-receipt`를 호출하면 됩니다.
- `npm run dev`는 `--strictPort`를 사용하므로 `5173`이 이미 사용 중이면 자동으로 다른 포트로 바뀌지 않고 바로 실패합니다. 이게 더 안전합니다. Pages 프록시는 `5173`을 전제로 동작합니다.

접속 주소:

- 앱: `http://127.0.0.1:5173`
- Functions 프록시 포함 주소: `http://127.0.0.1:8788`

문제가 생기면 먼저 확인할 것:

- `5173` 또는 `8788` 포트를 이미 다른 프로세스가 쓰고 있지 않은지 확인
- Node 버전이 최소 `20.19.0` 이상인지 확인
- `.dev.vars`에 `OPENAI_API_KEY`가 들어 있는지 확인

## 배포

Cloudflare Pages에 배포할 때는 다음 시크릿을 설정해야 합니다.

- `OPENAI_API_KEY`
- `OPENAI_MODEL` (선택, 추천 `gpt-4.1`, 현재 기본값 `gpt-4.1`)
- `OPENAI_RESCUE_MODEL` (선택, 추천 `gpt-4.1`)
- `OPENAI_IMAGE_DETAIL` (선택, 기본값 `high`)

빌드 출력 디렉터리는 [`wrangler.toml`](/home/user/bill/wrangler.toml#L1)에 맞춰 `dist`입니다.

## 모델 비교 테스트

영수증 인식 모델을 비교하려면 `.dev.vars`에서 아래처럼 바꿔가며 테스트하면 됩니다.

```dotenv
OPENAI_MODEL=gpt-4.1
OPENAI_RESCUE_MODEL=gpt-4.1
OPENAI_IMAGE_DETAIL=high
```

비교 추천:

- `gpt-4o-mini`: 비용 기준 비교용
- `gpt-4.1`: 품질/이미지 토큰 효율 비교용


```

## File: `src/App.jsx`

```jsx
import { useState } from 'react'
import UploadPage from './pages/UploadPage'
import SummaryPage from './pages/SummaryPage'
import ProductsPage from './pages/ProductsPage'
import './styles.css'

const TAB_META = {
  upload: {
    label: '업로드',
    eyebrow: 'Receipt Capture',
    title: '사진을 올리고 바로 저장',
    description: '영수증 업로드부터 자동 분석, 저장까지 한 화면에서 끝낼 수 있게 정리했습니다.',
  },
  summary: {
    label: '요약',
    eyebrow: 'Daily Overview',
    title: '날짜별 주문 기록을 빠르게 확인',
    description: '오늘 저장한 주문과 베이커리 합계를 모바일 화면에 맞게 깔끔하게 보여줍니다.',
  },
  products: {
    label: '품목 사전',
    eyebrow: 'Product Library',
    title: '자주 쓰는 베이커리 품목 관리',
    description: '품목명과 별칭을 손쉽게 등록해서 자동 분류 정확도를 높일 수 있습니다.',
  },
}

export default function App() {
  const [tab, setTab] = useState('upload')
  const activeTab = TAB_META[tab]

  return (
    <div className="appShell">
      <div className="ambientGlow ambientGlowLeft" />
      <div className="ambientGlow ambientGlowRight" />

      <div className="appFrame">
        <header className="topbar">
          <div className="topbarMeta">
            <img
              className="brandLogo"
              src="https://oraund.com/web/awesome_img/logo.png"
              alt="ORAUND"
            />
            <span className="eyebrow">Bakery Receipt</span>
            <h1>배달 주문 정리</h1>
            <p>모바일에서 빠르게 업로드하고, 저장한 주문을 다시 확인할 수 있게 구성했습니다.</p>
          </div>

          <nav className="tabs" aria-label="주요 메뉴">
            {Object.entries(TAB_META).map(([key, item]) => (
              <button
                key={key}
                type="button"
                className={tab === key ? 'active' : ''}
                onClick={() => setTab(key)}
              >
                {item.label}
              </button>
            ))}
          </nav>
        </header>

        <main className="appMain">
          <section className="heroPanel card">
            <span className="sectionEyebrow">{activeTab.eyebrow}</span>
            <h2>{activeTab.title}</h2>
            <p>{activeTab.description}</p>
          </section>

          {tab === 'upload' && <UploadPage />}
          {tab === 'summary' && <SummaryPage />}
          {tab === 'products' && <ProductsPage />}
        </main>
      </div>
    </div>
  )
}

```

## File: `src/data/bakeryMenu.js`

```js
export const BAKERY_MENU = [
  '에그타르트',
  '레몬 케이크',
  '베커라이 츄러스',
  '초코 츄러스',
  '휘낭시에',
  '휘낭시에 플레인',
  '휘낭시에 무화과',
  '휘낭시에 발로나초코',
  '휘낭시에 약과',
  '휘낭시에 고르곤졸라크림치즈',
  '동물 쿠키',
  '하트 초코 쿠키',
  '버터링 쿠키',
  '초코동글이 쿠키',
  '미니 초코동글이 쿠키',
  '초코링 쿠키',
  '쿠키 세트',
  '구리볼',
  '생크림',
  '블루베리 식빵',
  '치즈 식빵',
  '밤 식빵',
  '뜯어먹는 우유 식빵',
  '마늘빵',
  '소금빵',
  '단짠 소금빵',
  '먹물 소금빵',
  '모카 소금빵',
  '카야버터 소금빵',
  '크로와상',
  '딸기 크림치즈 토스트',
  '전남친 블루베리 토스트',
  '아보카도 샌드위치',
  '잠봉뵈르 샌드위치',
  '당근라페 샌드위치',
  '건강빵 닭가슴살 샌드위치',
  '미니바게트',
  '호두 크랜베리 깜빠뉴',
  '오늘의 샐러드',
]

export const PRODUCT_CATALOG = [
  {
    name: '구리볼',
    aliases: ['구리볼'],
    category: 'bakery',
    countInBakeryTotal: true,
  },
  {
    name: '단짠 소금빵',
    aliases: ['단짠 소금빵', '단짠소금빵'],
    category: 'bakery',
    countInBakeryTotal: true,
  },
  {
    name: '동물 쿠키',
    aliases: ['동물 쿠키', '동물쿠키'],
    category: 'bakery',
    countInBakeryTotal: true,
  },
  {
    name: '딸기 크림치즈 토스트',
    aliases: ['딸기 크림치즈 토스트', '딸기크림치즈토스트'],
    category: 'bakery',
    countInBakeryTotal: true,
  },
  {
    name: '뜯어먹는 우유 식빵',
    aliases: ['뜯어먹는 우유 식빵', '뜯어먹는우유식빵'],
    category: 'bakery',
    countInBakeryTotal: true,
  },
  {
    name: '레몬 케이크',
    aliases: ['레몬 케이크', '레몬케이크', '레몬 케익'],
    category: 'bakery',
    countInBakeryTotal: true,
  },
  {
    name: '마늘빵',
    aliases: ['마늘빵'],
    category: 'bakery',
    countInBakeryTotal: true,
  },
  {
    name: '먹물 소금빵',
    aliases: ['먹물 소금빵', '먹물소금빵'],
    category: 'bakery',
    countInBakeryTotal: true,
  },
  {
    name: '모카 소금빵',
    aliases: ['모카 소금빵', '모카소금빵'],
    category: 'bakery',
    countInBakeryTotal: true,
  },
  {
    name: '미니바게트',
    aliases: ['미니바게트'],
    category: 'bakery',
    countInBakeryTotal: true,
  },
  {
    name: '미니 초코동글이 쿠키',
    aliases: ['미니 초코동글이 쿠키', '미니초코동글이쿠키'],
    category: 'bakery',
    countInBakeryTotal: true,
  },
  {
    name: '밤 식빵',
    aliases: ['밤 식빵', '밤식빵'],
    category: 'bakery',
    countInBakeryTotal: true,
  },
  {
    name: '버터링 쿠키',
    aliases: ['버터링 쿠키', '버터링쿠키'],
    category: 'bakery',
    countInBakeryTotal: true,
  },
  {
    name: '베이커리 츄러스',
    aliases: ['베이커리 츄러스', '베이커리츄러스', '츄러스'],
    category: 'bakery',
    countInBakeryTotal: true,
  },
  {
    name: '블루베리 식빵',
    aliases: ['블루베리 식빵', '블루베리식빵'],
    category: 'bakery',
    countInBakeryTotal: true,
  },
  {
    name: '소금빵',
    aliases: ['소금빵'],
    category: 'bakery',
    countInBakeryTotal: true,
  },
  {
    name: '앙버터',
    aliases: ['앙버터'],
    category: 'bakery',
    countInBakeryTotal: true,
  },
  {
    name: '에그타르트',
    aliases: ['에그타르트', '에그 타르트', 'egg tart'],
    category: 'bakery',
    countInBakeryTotal: true,
  },
  {
    name: '전남친 블루베리 토스트',
    aliases: ['전남친 블루베리 토스트', '전남친블루베리토스트'],
    category: 'bakery',
    countInBakeryTotal: true,
  },
  {
    name: '초코동글이 쿠키',
    aliases: ['초코동글이 쿠키', '초코동글이쿠키'],
    category: 'bakery',
    countInBakeryTotal: true,
  },
  {
    name: '초코링 쿠키',
    aliases: ['초코링 쿠키', '초코링쿠키'],
    category: 'bakery',
    countInBakeryTotal: true,
  },
  {
    name: '초코 츄러스',
    aliases: ['초코 츄러스', '초코츄러스'],
    category: 'bakery',
    countInBakeryTotal: true,
  },
  {
    name: '치즈 식빵',
    aliases: ['치즈 식빵', '치즈식빵'],
    category: 'bakery',
    countInBakeryTotal: true,
  },
  {
    name: '카스테라',
    aliases: ['카스테라'],
    category: 'bakery',
    countInBakeryTotal: true,
  },
  {
    name: '카야버터 소금빵',
    aliases: ['카야버터 소금빵', '카야버터소금빵'],
    category: 'bakery',
    countInBakeryTotal: true,
  },
  {
    name: '크로와상',
    aliases: ['크로와상', '크루아상'],
    category: 'bakery',
    countInBakeryTotal: true,
  },
  {
    name: '쿠키 세트',
    aliases: ['쿠키 세트', '쿠키세트'],
    category: 'bakery',
    countInBakeryTotal: true,
  },
  {
    name: '플레인 스콘',
    aliases: ['플레인 스콘', '플레인스콘'],
    category: 'bakery',
    countInBakeryTotal: true,
  },
  {
    name: '플레인 치아바타',
    aliases: ['플레인 치아바타', '플레인치아바타'],
    category: 'bakery',
    countInBakeryTotal: true,
  },
  {
    name: '하트 초코 쿠키',
    aliases: ['하트 초코 쿠키', '하트초코쿠키'],
    category: 'bakery',
    countInBakeryTotal: true,
  },
  {
    name: '호두 크랜베리 깜빠뉴',
    aliases: ['호두 크랜베리 깜빠뉴', '호두크랜베리깜빠뉴', '홍두 그랙배리 깜빠뉴', '홍두그랙배리깜빠뉴', '호두 그랙배리 깜빠뉴', '호두그랙배리깜빠뉴'],
    category: 'bakery',
    countInBakeryTotal: true,
  },
  {
    name: '휘낭시에',
    aliases: ['휘낭시에', '휘낭시예', '휘낭시에 플레인', '휘낭시에 무화과'],
    category: 'bakery',
    countInBakeryTotal: true,
  },
  {
    name: '휘낭시에 5종 세트(구성변경불가)',
    aliases: ['휘낭시에 5종 세트', '휘낭시에5종세트'],
    category: 'bakery',
    countInBakeryTotal: true,
  },
  {
    name: '아메리카노',
    aliases: ['아메리카노', '아이스아메리카노', 'ice americano'],
    category: 'drink',
    countInBakeryTotal: false,
  },
  {
    name: '이즈드립',
    aliases: ['이즈드립'],
    category: 'drink',
    countInBakeryTotal: false,
  },
  {
    name: '커피원두',
    aliases: ['커피원두', '커피 원두'],
    category: 'goods',
    countInBakeryTotal: false,
  },
  {
    name: '커피원두 (오랑 400g)',
    aliases: ['커피원두 오랑 400g', '오랑 400g', '커피원두 (오랑 400g)'],
    category: 'goods',
    countInBakeryTotal: false,
  },
  {
    name: '콜드브루 원액',
    aliases: ['콜드브루 원액', '콜드브루원액'],
    category: 'drink',
    countInBakeryTotal: false,
  },
  {
    name: '콜드브루 원액 1L',
    aliases: ['콜드브루 원액 1L', '콜드브루원액1L'],
    category: 'drink',
    countInBakeryTotal: false,
  },
  {
    name: '라떼',
    aliases: ['라떼', '카페라떼'],
    category: 'drink',
    countInBakeryTotal: false,
  },
  {
    name: '마다가스카르 바닐라빈 라떼',
    aliases: ['마다가스카르 바닐라빈 라떼', '마다가스카르바닐라빈라떼', '바닐라빈 라떼'],
    category: 'drink',
    countInBakeryTotal: false,
  },
  {
    name: '비건라떼',
    aliases: ['비건라떼', '비건 라떼', '귀리로 만든 라떼'],
    category: 'drink',
    countInBakeryTotal: false,
  },
  {
    name: '건강빵 닭가슴살 샌드위치',
    aliases: ['건강빵 닭가슴살 샌드위치', '건강빵닭가슴살샌드위치'],
    category: 'review',
    countInBakeryTotal: false,
  },
  {
    name: '당근라페 샌드위치 (에그)',
    aliases: ['당근라페 샌드위치 (에그)', '당근라페 샌드위치 에그'],
    category: 'review',
    countInBakeryTotal: false,
  },
  {
    name: '당근라페 샌드위치 (잠봉)',
    aliases: ['당근라페 샌드위치 (잠봉)', '당근라페 샌드위치 잠봉'],
    category: 'review',
    countInBakeryTotal: false,
  },
  {
    name: '생크림',
    aliases: ['생크림'],
    category: 'review',
    countInBakeryTotal: false,
  },
  {
    name: '아보카도 샌드위치',
    aliases: ['아보카도 샌드위치', '아보카도샌드위치'],
    category: 'review',
    countInBakeryTotal: false,
  },
  {
    name: '오늘의 샐러드',
    aliases: ['오늘의 샐러드', '오늘의샐러드'],
    category: 'review',
    countInBakeryTotal: false,
  },
  {
    name: '잠봉뵈르 샌드위치',
    aliases: ['잠봉뵈르 샌드위치', '잠봉뵈르', '잠봉뵈르샌드위치', '볼블렌드 샌드위치', '볼블렌드샌드위치', '볼블랜드 샌드위치', '볼블랜드샌드위치'],
    category: 'review',
    countInBakeryTotal: false,
  },
]

export const OPTION_NAMES = [
  'ICE',
  'HOT',
  '고소한 맛',
  '디카페인',
  '원두블렌드',
  '이웃 블렌드(달콤)',
  '플레인',
  '무화과',
  '발로나초코',
  '약과',
  '고르곤졸라크림치즈',
]

```

## File: `src/lib/bakeryLists.js`

```js
export const BAKERY_INCLUDED = [
  '구리볼',
  '단짠 소금빵',
  '동물 쿠키',
  '딸기 크림치즈 토스트',
  '뜯어먹는 우유 식빵',
  '레몬 케이크',
  '마늘빵',
  '먹물 소금빵',
  '모카 소금빵',
  '미니바게트',
  '미니 초코동글이 쿠키',
  '밤 식빵',
  '버터링 쿠키',
  '베이커리 츄러스',
  '블루베리 식빵',
  '소금빵',
  '앙버터',
  '에그타르트',
  '전남친 블루베리 토스트',
  '초코동글이 쿠키',
  '초코링 쿠키',
  '초코 츄러스',
  '치즈 식빵',
  '카스테라',
  '카야버터 소금빵',
  '크로와상',
  '쿠키 세트',
  '플레인 스콘',
  '플레인 치아바타',
  '하트 초코 쿠키',
  '호두 크랜베리 깜빠뉴',
  '휘낭시에',
  '휘낭시에 5종 세트(구성변경불가)',
]

export const BAKERY_EXCLUDED = [
  '아메리카노',
  '아이스아메리카노',
  '이즈드립',
  '커피원두',
  '커피원두 (오랑 400g)',
  '콜드브루 원액',
  '콜드브루 원액 1L',
  '라떼',
  '마다가스카르 바닐라빈 라떼',
  '비건라떼',
]

export const REVIEW_NEEDED = [
  '건강빵 닭가슴살 샌드위치',
  '당근라페 샌드위치 (에그)',
  '당근라페 샌드위치 (잠봉)',
  '생크림',
  '아보카도 샌드위치',
  '오늘의 샐러드',
  '잠봉뵈르 샌드위치',
]

export const OPTION_NAMES = [
  'ICE',
  'HOT',
  '고소한 맛',
  '디카페인',
  '원두블렌드',
  '이웃 블렌드(달콤)',
  '플레인',
  '무화과',
  '발로나초코',
  '약과',
  '고르곤졸라크림치즈',
]

```

## File: `src/lib/bakeryMatcher.js`

```js
import { DEFAULT_PRODUCT_SEEDS, OPTION_NAMES } from './seedData.js'

const MATCH_THRESHOLD = 72
const SUGGESTION_THRESHOLD = 48
const BAKERY_FALLBACK_THRESHOLD = 60
const MAX_SUGGESTIONS = 3
const LEARNED_ALIAS_STORAGE_KEY = 'bill.learned-bakery-aliases.v1'
const BAKERY_NAME_HINT_PATTERN =
  /(빵|식빵|타르트|케이크|쿠키|토스트|샌드위치|샌드|스콘|치아바타|바게트|크로와상|크루아상|깜빠뉴|깜파뉴|캄파뉴|휘낭시에|앙버터|잠봉|추러스|브레드)/
const OCR_NAME_CORRECTIONS = [
  {
    target: '잠봉뵈르 샌드위치',
    patterns: [
      /장볼빠른.*샌드위치$/,
      /^장별.*세드위치$/,
      /^잠별.*세드위치$/,
      /^장봉.*세드위치$/,
      /^잠봉.*세드위치$/,
      /^장별블랙.*$/,
      /^볼블렌드.*샌드위치$/,
      /^볼블랜드.*샌드위치$/,
      /^볼블렌드샌드위치$/,
      /^볼블랜드샌드위치$/,
      /^볼빈.*스딩워치$/,
      /^볼빈스딩워치$/,
      /^볼빈.*샌드위치$/,
      /^잠봉뵈르샌드위치$/,
      /^잠봉뵈르샌드$/,
      /^잠봉보에르샌드위치$/,
      /^잠봉베르샌드위치$/,
      /^잠봉보엘샌드위치$/,
      /^잠봉브엘샌드위치$/,
      /^잠봉샌드위치$/,
      /^잠봉샌드$/,
      /잠봉.*샌드위치$/,
      /잠봉.*세드위치$/,
      /샌드위치$/,
    ],
  },
  {
    target: '호두 크랜베리 깜빠뉴',
    patterns: [
      /^홍두깨비빔밥$/,
      /^호두깨비빔밥$/,
      /^홍두.*빔밥$/,
      /^호두.*빔밥$/,
      /^호두그래백리깜빠뉴$/,
      /^호두그래백리깜파뉴$/,
      /^호두그래배리깜빠뉴$/,
      /^호두그래배리깜파뉴$/,
      /^홍두그래백리깜빠뉴$/,
      /^홍두그래백리깜파뉴$/,
      /^호두그래백리캄파뉴$/,
      /^호두그래백리깜빠뉘$/,
      /^호두그래백리.*$/,
      /^홍두그래백리.*$/,
      /^홍두그랙배리깜빠뉴$/,
      /^홍두그랙배리깜파뉴$/,
      /^홍두그랙배리.*$/,
      /^호두그랙배리깜빠뉴$/,
      /^호두그랙배리깜파뉴$/,
      /^호두그랙배리.*$/,
      /^호두그랜베리깜빠뉴$/,
      /^호두그랜베리깜파뉴$/,
      /^호두크랜베리깜빠뉴$/,
      /^홍두크랜베리깜빠뉴$/,
      /^호두크렌베리깜빠뉴$/,
      /^호두크렌배리깜빠뉴$/,
      /^호두크랜배리깜빠뉴$/,
      /^호두크래베리깜빠뉴$/,
      /^호두크랜베리캄파뉴$/,
      /^호두크랜베리깜파뉴$/,
      /^호두크랜베리깜빠뉘$/,
      /^호두크랜베리깜빠뉴.*$/,
      /(?:홍두|호도|호두).*(?:그래백리|그래배리|그랜베리|크랜베리|크렌베리|크렌배리|크랜배리|크래베리).*(?:깜빠뉴|깜파뉴|캄파뉴|깜빠뉘)$/,
      /호두.*크랜.*깜빠뉴$/,
      /호두.*크랜.*캄파뉴$/,
      /크랜베리.*깜빠뉴$/,
    ],
  },
  {
    target: '이즈드립',
    patterns: [/^이즈드랍$/, /^이지드립$/, /^이즈드립$/],
  },
]


function canUseStorage() {
  return typeof window !== 'undefined' && typeof window.localStorage !== 'undefined'
}

function parseNumber(value, fallback = 0) {
  if (typeof value === 'number' && Number.isFinite(value)) return value
  const digits = String(value ?? '')
    .replace(/[,원\s]/g, '')
    .replace(/[^\d-]/g, '')
  const parsed = Number(digits)
  return Number.isFinite(parsed) ? parsed : fallback
}

function normalizeBakeryVariants(value) {
  return String(value ?? '')
    .replace(/잠봉\s*뵈르|잠봉뵈르|잠봉보에르|잠봉브외르|잠봉베르|잠봉뵈어/gi, '잠봉뵈르')
    .replace(/볼블렌드|볼블랜드/gi, '잠봉뵈르')
    .replace(/샌드윗치|샌드위치|샌드위티|샌드위/gi, '샌드위치')
    .replace(/홍두|호도/gi, '호두')
    .replace(/깜파뉴|캄파뉴|캄빠뉴|깜빠뉘|깜빠뉴/gi, '깜빠뉴')
    .replace(/그래백리|그래배리|그랙배리|그랜베리|크랜배리|크렌베리|크렌배리|크래베리/gi, '크랜베리')
    .replace(/이즈드랍|이지드립|이즈 드립/gi, '이즈드립')
}

function stripDecorators(value) {
  return normalizeBakeryVariants(value)
    .replace(/\([^)]*\)/g, ' ')
    .replace(/\[[^\]]*\]/g, ' ')
    .replace(/[{}]/g, ' ')
    .replace(/\b(?:hot|ice|iced|warm|large|regular|set|single|double|decaf)\b/gi, ' ')
    .replace(/(?:추가|변경|옵션|세트|단품|라지|미디움|톨|벤티|따뜻한|차가운)/g, ' ')
    .replace(/\d+\s*(?:ea|개입|개|pcs?|잔|병|팩|box|g|kg|ml|l)\b/gi, ' ')
    .replace(/[0-9]+/g, ' ')
    .replace(/[()[\]{}.,:+\-_/]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

export function normalizeText(value) {
  return stripDecorators(value).replace(/\s+/g, '').toLowerCase()
}

function correctKnownOcrName(rawName) {
  const normalized = normalizeText(rawName)
  if (!normalized) return { correctedName: String(rawName ?? '').trim(), correctionTarget: null }

  for (const rule of OCR_NAME_CORRECTIONS) {
    if (rule.patterns.some((pattern) => pattern.test(normalized))) {
      return { correctedName: rule.target, correctionTarget: rule.target }
    }
  }

  return { correctedName: String(rawName ?? '').trim(), correctionTarget: null }
}

function readLearnedAliases() {
  if (!canUseStorage()) return {}

  try {
    const raw = window.localStorage.getItem(LEARNED_ALIAS_STORAGE_KEY)
    if (!raw) return {}

    const parsed = JSON.parse(raw)
    return parsed && typeof parsed === 'object' ? parsed : {}
  } catch (error) {
    console.warn('Failed to read learned bakery aliases', error)
    return {}
  }
}

function writeLearnedAliases(value) {
  if (!canUseStorage()) return

  try {
    window.localStorage.setItem(LEARNED_ALIAS_STORAGE_KEY, JSON.stringify(value))
  } catch (error) {
    console.warn('Failed to write learned bakery aliases', error)
  }
}

export function learnCatalogAlias(rawName, matchedName) {
  const normalizedAlias = normalizeText(rawName)
  const normalizedTarget = normalizeText(matchedName)

  if (!normalizedAlias || !normalizedTarget) return false
  if (normalizedAlias === normalizedTarget) return false

  const learned = readLearnedAliases()
  const next = { ...learned }
  const aliases = Array.isArray(next[matchedName]) ? next[matchedName] : []
  const alreadyExists = aliases.some((alias) => normalizeText(alias) === normalizedAlias)

  if (alreadyExists) return false

  next[matchedName] = [...aliases, String(rawName).trim()]
  writeLearnedAliases(next)
  return true
}

function mergeAliases(baseAliases, learnedAliases) {
  const merged = [...(baseAliases || [])]

  for (const alias of learnedAliases || []) {
    if (!alias) continue
    if (merged.some((item) => normalizeText(item) === normalizeText(alias))) continue
    merged.push(alias)
  }

  return merged
}

function resolveProducts(products) {
  const source = Array.isArray(products) && products.length ? products : []
  const learned = readLearnedAliases()
  const merged = new Map()

  for (const item of DEFAULT_PRODUCT_SEEDS) {
    merged.set(normalizeText(item.name), item)
  }

  for (const item of source) {
    const key = normalizeText(item?.name)
    if (!key) continue

    const existing = merged.get(key)
    if (!existing) {
      merged.set(key, item)
      continue
    }

    const keepDefaultCategory = existing.category === 'bakery' && item.category !== 'bakery'
    merged.set(
      key,
      keepDefaultCategory
        ? {
            ...existing,
            aliases: mergeAliases(existing.aliases, item.aliases),
          }
        : {
            ...existing,
            ...item,
            aliases: mergeAliases(existing.aliases, item.aliases),
          },
    )
  }

  return Array.from(merged.values()).map((item) => ({
    ...item,
    aliases: mergeAliases(item.aliases, learned[item.name]),
  }))
}

function normalizeKeepWords(value) {
  return stripDecorators(value)
    .replace(/[^0-9a-zA-Z가-힣\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase()
}

function tokenize(value) {
  return normalizeKeepWords(value).split(' ').filter(Boolean)
}

function overlapScore(a, b) {
  const ta = tokenize(a)
  const tb = tokenize(b)
  if (!ta.length || !tb.length) return 0
  const setB = new Set(tb)
  const hit = ta.filter((token) => setB.has(token)).length
  return hit / Math.max(ta.length, tb.length)
}

function bigrams(value) {
  const normalized = normalizeText(value)
  if (!normalized) return []
  if (normalized.length === 1) return [normalized]

  const grams = []
  for (let i = 0; i < normalized.length - 1; i += 1) {
    grams.push(normalized.slice(i, i + 2))
  }
  return grams
}

function bigramScore(a, b) {
  const gramsA = bigrams(a)
  const gramsB = bigrams(b)
  if (!gramsA.length || !gramsB.length) return 0

  const counts = new Map()
  for (const gram of gramsB) {
    counts.set(gram, (counts.get(gram) || 0) + 1)
  }

  let hit = 0
  for (const gram of gramsA) {
    const count = counts.get(gram) || 0
    if (count > 0) {
      hit += 1
      counts.set(gram, count - 1)
    }
  }

  return (2 * hit) / (gramsA.length + gramsB.length)
}

function baseOptionName(rawName) {
  return String(rawName ?? '')
    .trim()
    .replace(/^[+ㄴ]\s*/, '')
    .replace(/\s+/g, ' ')
}

function extractOptionCharge(rawName, fallbackAmount = 0) {
  const trimmed = String(rawName ?? '').trim()
  const inlineMatch = trimmed.match(/(?:^|\s)\+?\s*(\d{1,4})(?:원)?(?:\s|$)/)
  if (inlineMatch) {
    const parsed = parseNumber(inlineMatch[1], fallbackAmount)
    return parsed >= 0 ? parsed : fallbackAmount
  }

  return fallbackAmount
}

function isFinancierOptionLine(rawName) {
  const trimmed = String(rawName ?? '').trim()
  if (!trimmed) return false

  const normalized = normalizeText(trimmed)
  const optionNames = OPTION_NAMES.map((name) => normalizeText(name)).filter(Boolean)
  const hasOptionKeyword = optionNames.some(
    (name) => normalized === name || normalized.endsWith(name) || normalized.includes(name),
  )
  const hasOptionPrice = /(?:^|\s)\+?\d{1,4}(?:원)?(?:\s|$)/.test(trimmed)
  const mentionsFinancier = /휘낭시에/.test(trimmed)
  const looksLikeFinancierFlavor = /(?:플레인|무화과|약과|발로나초코|고르곤졸라\s*크림치즈)/.test(trimmed)

  return hasOptionKeyword && (hasOptionPrice || mentionsFinancier || looksLikeFinancierFlavor)
}

function isFinancierBaseItem(rawName, matchedName) {
  const source = String(rawName || '') + ' ' + String(matchedName || '')
  return /휘낭시에/.test(source)
}

export function isOptionLineName(rawName) {
  const trimmed = String(rawName ?? '').trim()
  if (!trimmed) return false
  if (/^[+ㄴ]\s*/.test(trimmed)) return true
  if (isFinancierOptionLine(trimmed)) return true

  const normalized = normalizeText(trimmed)
  return OPTION_NAMES.some((name) => {
    const normalizedOption = normalizeText(name)
    return normalizedOption === normalized || normalized.endsWith(normalizedOption)
  })
}

export function buildCatalogIndex(products = DEFAULT_PRODUCT_SEEDS) {
  return resolveProducts(products)
    .filter((product) => product?.active !== false)
    .map((product) => {
      const names = [product.name, ...(product.aliases || [])].filter(Boolean)
      return {
        ...product,
        normalizedNames: names.map((name) => normalizeText(name)),
        rawNames: names,
      }
    })
}

function hasBakeryNameHint(value) {
  return BAKERY_NAME_HINT_PATTERN.test(String(value ?? ''))
}

function canPromoteMatchToBakery(candidate, rawName) {
  if (!candidate) return false
  if (candidate.category === 'bakery' && candidate.countInBakeryTotal !== false) return true

  if (candidate.category === 'review') {
    return hasBakeryNameHint(`${rawName} ${candidate.name}`)
  }

  return false
}

function resolveBakeryCandidate(rawName, matched, suggestions) {
  if (canPromoteMatchToBakery(matched, rawName)) {
    return {
      candidate: matched,
      promoted: matched.category !== 'bakery' || matched.countInBakeryTotal === false,
    }
  }

  const fallback = (suggestions || []).find(
    (item) => item.score >= BAKERY_FALLBACK_THRESHOLD && canPromoteMatchToBakery(item, rawName),
  )

  if (!fallback) {
    return {
      candidate: matched,
      promoted: false,
    }
  }

  return {
    candidate: fallback,
    promoted: true,
  }
}

function scoreCandidate(targetRaw, target, rawCandidate, normalizedName) {
  if (!target || !normalizedName) return 0
  if (target === normalizedName) return 100
  if (target.includes(normalizedName) || normalizedName.includes(target)) return 92

  const overlap = overlapScore(targetRaw, rawCandidate)
  const bigram = bigramScore(targetRaw, rawCandidate)
  const normalizedBigram = bigramScore(target, normalizedName)

  return Math.round(overlap * 35 + bigram * 35 + normalizedBigram * 30)
}

function toMatchResult(item, score, rawCandidate) {
  return {
    id: item.id || item.name,
    name: item.name,
    category: item.category,
    group: item.group,
    aliases: item.aliases || [],
    countInBakeryTotal: item.countInBakeryTotal !== false,
    reviewNeeded: !!item.reviewNeeded,
    optionLike: !!item.optionLike,
    score,
    rawCandidate,
  }
}

function rankCatalogCandidates(rawName, products = DEFAULT_PRODUCT_SEEDS) {
  const targetRaw = baseOptionName(rawName)
  const target = normalizeText(targetRaw)
  if (!target) return []

  const catalog = buildCatalogIndex(products)
  const ranked = []

  for (const item of catalog) {
    let itemBest = null

    for (let i = 0; i < item.normalizedNames.length; i += 1) {
      const normalizedName = item.normalizedNames[i]
      const rawCandidate = item.rawNames[i]
      const score = scoreCandidate(targetRaw, target, rawCandidate, normalizedName)

      if (!itemBest || score > itemBest.score) {
        itemBest = toMatchResult(item, score, rawCandidate)
      }
    }

    if (itemBest && itemBest.score > 0) {
      ranked.push(itemBest)
    }
  }

  ranked.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score
    return a.name.localeCompare(b.name, 'ko')
  })

  return ranked
}

export function matchCatalogItem(rawName, products = DEFAULT_PRODUCT_SEEDS) {
  const ranked = rankCatalogCandidates(rawName, products)
  const best = ranked[0] || null

  if (!best || best.score < MATCH_THRESHOLD) {
    return null
  }

  return {
    ...best,
    suggestions: ranked
      .filter((item) => item.score >= SUGGESTION_THRESHOLD)
      .slice(0, MAX_SUGGESTIONS),
  }
}

export function buildBakeryComputation(rawItems, products = DEFAULT_PRODUCT_SEEDS, config = {}) {
  const countReviewNeeded = Boolean(config.countReviewNeeded)
  const resultItems = []
  let lastBaseItem = null
  let lastFinancierItem = null

  for (const raw of rawItems || []) {
    const name = String(raw?.name ?? '').trim()
    const qty = parseNumber(raw?.qty, 1) || 1
    const amount = parseNumber(raw?.amount, 0)

    if (!name) continue

    const { correctedName, correctionTarget } = correctKnownOcrName(name)
    const lookupName = correctedName || name
    const optionLine = isOptionLineName(lookupName)
    const matched = matchCatalogItem(lookupName, products)
    const suggestions = (matched?.suggestions || rankCatalogCandidates(lookupName, products))
      .filter((item) => item.score >= SUGGESTION_THRESHOLD)
      .slice(0, MAX_SUGGESTIONS)
    const { candidate: bakeryMatch, promoted: promotedToBakery } = resolveBakeryCandidate(
      lookupName,
      matched,
      suggestions,
    )
    const financierOption = isFinancierOptionLine(lookupName)
    const explicitOption = Boolean(raw?.isOption)
    const forceBakeryItem =
      explicitOption && !optionLine && !financierOption && !matched?.optionLike && (Boolean(bakeryMatch) || Boolean(matched))
    const isOption = forceBakeryItem
      ? false
      : explicitOption || optionLine || financierOption || matched?.optionLike
    const optionCharge = parseNumber(raw?.optionCharge, extractOptionCharge(lookupName, amount))

    if (isOption) {
      const optionRow = {
        name,
        qty,
        amount: optionCharge || amount,
        isOption: true,
        baseOptionName: baseOptionName(lookupName),
        matchedCatalogName: matched?.name || null,
        matchedBakeryName: matched?.name || null,
        category: matched?.category || 'option',
        countInBakeryTotal: false,
        correctedName: correctionTarget,
        optionCharge,
        suggestions,
      }

      const optionOwner = financierOption && lastFinancierItem ? lastFinancierItem : lastBaseItem

      if (optionOwner) {
        optionOwner.options.push(optionRow)
        if (optionCharge > 0) {
          optionOwner.optionCharge += optionCharge
          optionOwner.finalAmount += optionCharge
          optionOwner.amount = optionOwner.finalAmount
        }
      } else {
        resultItems.push({
          ...optionRow,
          orphanOption: true,
        })
      }
      continue
    }

    const category = bakeryMatch
      ? promotedToBakery
        ? 'bakery'
        : bakeryMatch.category
      : 'unknown'
    const reviewNeeded = promotedToBakery ? false : bakeryMatch?.reviewNeeded || false
    const countInBakeryTotal = bakeryMatch
      ? promotedToBakery
        ? true
        : bakeryMatch.countInBakeryTotal !== false || (countReviewNeeded && reviewNeeded)
      : false

    const row = {
      name,
      qty,
      amount,
      correctedName: correctionTarget,
      baseAmount: amount,
      optionCharge: 0,
      finalAmount: amount,
      isOption: false,
      isMatched: Boolean(bakeryMatch),
      matchedCatalogName: bakeryMatch?.name || null,
      matchedBakeryName: bakeryMatch?.name || null,
      isBakery: countInBakeryTotal,
      category,
      group: bakeryMatch?.group || null,
      reviewNeeded,
      countInBakeryTotal,
      promotedToBakery,
      options: [],
      suggestions,
    }

    resultItems.push(row)
    lastBaseItem = row
    lastFinancierItem = isFinancierBaseItem(name, matched?.name) ? row : lastFinancierItem
  }

  const bakeryBreakdownMap = new Map()
  let bakeryTotal = 0

  for (const item of resultItems) {
    if (item.isOption) continue
    if (!item.countInBakeryTotal) continue

    bakeryTotal += item.finalAmount
    const key = item.matchedCatalogName || item.name

    if (!bakeryBreakdownMap.has(key)) {
      bakeryBreakdownMap.set(key, {
        name: key,
        qty: 0,
        amount: 0,
      })
    }

    const bucket = bakeryBreakdownMap.get(key)
    bucket.qty += item.qty
    bucket.amount += item.finalAmount
  }

  const bakeryBreakdown = Array.from(bakeryBreakdownMap.values()).sort((a, b) => {
    if (b.amount !== a.amount) return b.amount - a.amount
    return a.name.localeCompare(b.name, 'ko')
  })

  const matchedItems = resultItems.filter((item) => !item.isOption && item.isMatched)
  const unmatchedItems = resultItems.filter((item) => !item.isOption && !item.isMatched)
  const reviewItems = resultItems.filter((item) => !item.isOption && item.reviewNeeded)

  return {
    items: resultItems,
    bakeryTotal,
    bakeryBreakdown,
    matchedItems,
    unmatchedItems,
    reviewItems,
  }
}

```

## File: `src/lib/bakerySeedData.js`

```js
import { BAKERY_MENU, PRODUCT_CATALOG } from '../data/bakeryMenu'

const product = (
  name,
  {
    aliases = [],
    category = 'bakery',
    group = 'default',
    countInBakeryTotal = category === 'bakery',
    reviewNeeded = false,
    optionLike = false,
  } = {},
) => ({
  name,
  aliases,
  category,
  group,
  countInBakeryTotal,
  reviewNeeded,
  optionLike,
  active: true,
})

export const BAKERY_INCLUDED = [
  '구리볼',
  '단짠 소금빵',
  '동물 쿠키',
  '딸기 크림치즈 토스트',
  '뜯어먹는 우유 식빵',
  '레몬케이크',
  '마늘빵',
  '먹물 소금빵',
  '모카 소금빵',
  '미니바게트',
  '미니 초코동글이 쿠키',
  '밤식빵',
  '버터링 쿠키',
  '베이커리 츄러스',
  '블루베리 식빵',
  '소금빵',
  '앙버터',
  '에그타르트',
  '전남친 블루베리 토스트',
  '초코동글이 쿠키',
  '초코링 쿠키',
  '초코 츄러스',
  '치즈 식빵',
  '카스테라',
  '카야버터 소금빵',
  '크로와상',
  '쿠키 세트',
  '플레인 스콘',
  '플레인 치아바타',
  '하트 초코 쿠키',
  '호두 크랜베리 깜빠뉴',
  '휘낭시에',
  '휘낭시에 5종 set(구성변경불가)',
]

export const BAKERY_EXCLUDED = [
  '아메리카노',
  '아이스아메리카노',
  '이즈드립',
  '커피원두',
  '커피원두 (오랑 400g)',
  '콜드브루 원액',
  '콜드브루 원액 1L',
  '라떼',
  '마다가스카르빈 라떼',
  '비건라떼',
]

export const REVIEW_NEEDED = [
  '건강빵 닭가슴살 샌드위치',
  '당근라페 샌드위치 (에그)',
  '당근라페 샌드위치 (잠봉)',
  '생크림',
  '아보카도 샌드위치',
  '오늘의 추억',
  '잠봉뵈르 샌드위치',
]

export const OPTION_NAMES = [
  'ICE',
  'HOT',
  '고소한 맛',
  '디카페인',
  '원두블렌드',
  '원두 블렌드',
  '이웃 블렌드(달콤)',
  '이웃블렌드',
  '플레인',
  '무화과',
  '발로나초코',
  '약과',
  '고르곤졸라크림치즈',
  '고르곤졸라 크림치즈',
]

const BASE_PRODUCT_SEEDS = [
  product('에그타르트', {
    aliases: ['에그 타르트', 'egg tart'],
    group: 'tart',
  }),
  product('레몬케이크', {
    aliases: ['레몬 케이크', '레몬 케익'],
    group: 'cake',
  }),
  product('베이커리 츄러스', {
    aliases: ['베이커리츄러스', '츄러스'],
    group: 'dessert',
  }),
  product('초코 츄러스', {
    aliases: ['초코츄러스'],
    group: 'dessert',
  }),
  product('휘낭시에', {
    aliases: [
      '휘낭시에 플레인',
      '휘낭시에 무화과',
      '휘낭시에 발로나초코',
      '휘낭시에 약과',
      '휘낭시에 고르곤졸라크림치즈',
      '휘낭시에 고르곤졸라 크림치즈',
    ],
    group: 'pastry',
  }),
  product('휘낭시에 5종 set(구성변경불가)', {
    aliases: ['휘낭시에 5종 set', '휘낭시에 세트'],
    group: 'pastry-set',
  }),
  product('동물 쿠키', { group: 'cookie' }),
  product('하트초코쿠키', {
    aliases: ['하트 초코 쿠키'],
    group: 'cookie',
  }),
  product('버터링 쿠키', {
    aliases: ['버터링쿠키'],
    group: 'cookie',
  }),
  product('초코동글이 쿠키', {
    aliases: ['초코동글이쿠키'],
    group: 'cookie',
  }),
  product('미니초코동글이 쿠키', {
    aliases: ['미니 초코동글이 쿠키', '미니초코동글이쿠키'],
    group: 'cookie',
  }),
  product('초코링 쿠키', {
    aliases: ['초코링쿠키'],
    group: 'cookie',
  }),
  product('쿠키 세트', {
    aliases: ['쿠키세트'],
    group: 'cookie-set',
  }),
  product('구리볼', { group: 'bread' }),
  product('블루베리 식빵', {
    aliases: ['블루베리식빵'],
    group: 'bread',
  }),
  product('치즈 식빵', {
    aliases: ['치즈식빵'],
    group: 'bread',
  }),
  product('밤식빵', {
    aliases: ['밤 식빵'],
    group: 'bread',
  }),
  product('뜯어먹는 우유 식빵', {
    aliases: ['뜯어먹는우유식빵'],
    group: 'bread',
  }),
  product('마늘빵', { group: 'bread' }),
  product('소금빵', { group: 'bread' }),
  product('단짠소금빵', {
    aliases: ['단짠 소금빵'],
    group: 'bread',
  }),
  product('먹물 소금빵', {
    aliases: ['먹물소금빵'],
    group: 'bread',
  }),
  product('모카소금빵', {
    aliases: ['모카 소금빵'],
    group: 'bread',
  }),
  product('카야버터 소금빵', {
    aliases: ['카야버터소금빵'],
    group: 'bread',
  }),
  product('크로와상', {
    aliases: ['크루아상', 'croissant'],
    group: 'bread',
  }),
  product('플레인 스콘', {
    aliases: ['플레인스콘', '스콘'],
    group: 'scone',
  }),
  product('플레인 치아바타', {
    aliases: ['플레인치아바타', '치아바타'],
    group: 'bread',
  }),
  product('미니바게트', { group: 'bread' }),
  product('딸기 크림치즈 토스트', {
    aliases: ['딸기크림치즈토스트'],
    group: 'toast',
  }),
  product('전남친 블루베리 토스트', {
    aliases: ['전남친블루베리토스트'],
    group: 'toast',
  }),
  product('카스테라', { group: 'cake' }),
  product('앙버터', { group: 'bread' }),
  product('호두 크랜베리 깜빠뉴', {
    aliases: [
      '호두크랜베리깜빠뉴',
      '호두 그래백리 깜빠뉴',
      '호두그래백리깜빠뉴',
      '호두 그래백리 깜파뉴',
      '호두그래백리깜파뉴',
      '홍두 그랙배리 깜빠뉴',
      '홍두그랙배리깜빠뉴',
      '호두 그랙배리 깜빠뉴',
      '호두그랙배리깜빠뉴',
      '호두 그래배리 깜빠뉴',
      '호두그래배리깜빠뉴',
      '홍두 그래백리 깜빠뉴',
      '홍두그래백리깜빠뉴',
      '호두 그랜베리 깜빠뉴',
      '호두그랜베리깜빠뉴',
      '호두 크랜베리 캄파뉴',
      '호두크랜베리캄파뉴',
      '호두 크렌베리 깜빠뉴',
      '호두크렌베리깜빠뉴',
      '호두 크렌배리 깜빠뉴',
      '호두크렌배리깜빠뉴',
      '호두 크랜배리 깜빠뉴',
      '호두크랜배리깜빠뉴',
      '호두 크래베리 깜빠뉴',
      '호두크래베리깜빠뉴',
      '호두 크랜베리 깜파뉴',
      '호두크랜베리깜파뉴',
      '호두 크랜베리 깜빠뉘',
      '호두크랜베리깜빠뉘',
    ],
    group: 'bread',
  }),
  product('아메리카노', {
    aliases: ['아이스아메리카노', '아이스 아메리카노'],
    category: 'drink',
    group: 'coffee',
    countInBakeryTotal: false,
  }),
  product('라떼', {
    aliases: ['카페라떼', 'latte'],
    category: 'drink',
    group: 'coffee',
    countInBakeryTotal: false,
  }),
  product('비건라떼', {
    aliases: ['비건 라떼', '귀리로 만든 라떼'],
    category: 'drink',
    group: 'coffee',
    countInBakeryTotal: false,
  }),
  product('마다가스카르 바로빈 라떼', {
    aliases: ['마다가스카르바닐라빈라떼', '바닐라빈 라떼'],
    category: 'drink',
    group: 'coffee',
    countInBakeryTotal: false,
  }),
  product('콜드브루 원액 1L', {
    aliases: ['콜드브루 원액', '콜드브루원액1L'],
    category: 'goods',
    group: 'bean',
    countInBakeryTotal: false,
  }),
  product('커피원두 (오랑 400g)', {
    aliases: ['커피원두', '커피원두 오랑 400g', '오랑 400g'],
    category: 'goods',
    group: 'bean',
    countInBakeryTotal: false,
  }),
  product('이즈드립', {
    aliases: ['이즈드랍', '이지드립', '이즈 드립'],
    category: 'drink',
    group: 'coffee',
    countInBakeryTotal: false,
  }),
  product('건강빵 닭가슴살 샌드위치', {
    aliases: ['건강빵닭가슴살샌드위치'],
    category: 'review',
    group: 'sandwich',
    countInBakeryTotal: false,
    reviewNeeded: true,
  }),
  product('당근라페 샌드위치 (에그)', {
    aliases: ['당근라페 샌드위치', '당근라페샌드위치에그'],
    category: 'review',
    group: 'sandwich',
    countInBakeryTotal: false,
    reviewNeeded: true,
  }),
  product('당근라페 샌드위치 (잠봉)', {
    aliases: ['당근라페샌드위치잠봉'],
    category: 'review',
    group: 'sandwich',
    countInBakeryTotal: false,
    reviewNeeded: true,
  }),
  product('생크림', {
    category: 'review',
    group: 'dessert',
    countInBakeryTotal: false,
    reviewNeeded: true,
  }),
  product('아보카도 샌드위치', {
    aliases: ['아보카도샌드위치'],
    category: 'review',
    group: 'sandwich',
    countInBakeryTotal: false,
    reviewNeeded: true,
  }),
  product('오늘의 추억', {
    aliases: ['오늘의샐러드'],
    category: 'review',
    group: 'salad',
    countInBakeryTotal: false,
    reviewNeeded: true,
  }),
  product('잠봉뵈르 샌드위치', {
    aliases: [
      '볼빈 스딩워치',
      '볼빈스딩워치',
      '볼빈 샌드위치',
      '볼블렌드 샌드위치',
      '볼블렌드샌드위치',
      '볼블랜드 샌드위치',
      '볼블랜드샌드위치',
      '잠봉뵈르',
      '잠봉뵈르샌드위치',
      '잠봉뵈르샌드',
      '잠봉 보에르 샌드위치',
      '잠봉보에르샌드위치',
      '잠봉 베르 샌드위치',
      '잠봉베르샌드위치',
      '잠봉 보엘 샌드위치',
      '잠봉보엘샌드위치',
      '잠봉 브엘 샌드위치',
      '잠봉브엘샌드위치',
      '잠봉 샌드위치',
      '잠봉샌드위치',
      '잠봉 샌드',
      '잠봉샌드',
    ],
    category: 'review',
    group: 'sandwich',
    countInBakeryTotal: false,
    reviewNeeded: true,
  }),
  product('ICE', {
    aliases: ['+ ICE', 'ㄴ ICE'],
    category: 'option',
    group: 'temperature',
    countInBakeryTotal: false,
    optionLike: true,
  }),
  product('HOT', {
    aliases: ['+ HOT', 'ㄴ HOT'],
    category: 'option',
    group: 'temperature',
    countInBakeryTotal: false,
    optionLike: true,
  }),
  product('고소한 맛', {
    aliases: ['+ 고소한 맛', 'ㄴ 고소한 맛'],
    category: 'option',
    group: 'flavor',
    countInBakeryTotal: false,
    optionLike: true,
  }),
  product('디카페인', {
    aliases: ['+ 디카페인', 'ㄴ 디카페인'],
    category: 'option',
    group: 'coffee-option',
    countInBakeryTotal: false,
    optionLike: true,
  }),
  product('원두블렌드', {
    aliases: ['원두 블렌드', '+ 원두블렌드', 'ㄴ원두블렌드'],
    category: 'option',
    group: 'bean-option',
    countInBakeryTotal: false,
    optionLike: true,
  }),
  product('이웃 블렌드(달콤)', {
    aliases: ['이웃블렌드', '이웃블렌드 승'],
    category: 'option',
    group: 'bean-option',
    countInBakeryTotal: false,
    optionLike: true,
  }),
  product('플레인', {
    aliases: ['+ 플레인', 'ㄴ 플레인', '플레인 +0', '+0 플레인', '0 플레인', '휘낭시에 플레인', '휘낭시에옵션 플레인'],
    category: 'option',
    group: 'bakery-option',
    countInBakeryTotal: false,
    optionLike: true,
  }),
  product('무화과', {
    aliases: ['+ 무화과', 'ㄴ 무화과', '무화과 +400', '무화과 +400원', '+400 무화과', '400 무화과', '휘낭시에 무화과', '휘낭시에옵션 무화과'],
    category: 'option',
    group: 'bakery-option',
    countInBakeryTotal: false,
    optionLike: true,
  }),
  product('발로나초코', {
    aliases: ['+ 발로나초코', 'ㄴ 발로나초코', '발로나초코 +800', '발로나초코 +800원', '+800 발로나초코', '800 발로나초코', '휘낭시에 발로나초코', '휘낭시에옵션 발로나초코'],
    category: 'option',
    group: 'bakery-option',
    countInBakeryTotal: false,
    optionLike: true,
  }),
  product('약과', {
    aliases: ['+ 약과', 'ㄴ 약과', '약과 +400', '약과 +400원', '+400 약과', '400 약과', '휘낭시에 약과', '휘낭시에옵션 약과'],
    category: 'option',
    group: 'bakery-option',
    countInBakeryTotal: false,
    optionLike: true,
  }),
  product('고르곤졸라크림치즈', {
    aliases: ['고르곤졸라 크림치즈', '+ 고르곤졸라크림치즈', 'ㄴ 고르곤졸라크림치즈', '고르곤졸라크림치즈 +600', '고르곤졸라크림치즈 +600원', '고르곤졸라 크림치즈 +600원', '+600 고르곤졸라크림치즈', '600 고르곤졸라크림치즈', '휘낭시에 고르곤졸라크림치즈', '휘낭시에 고르곤졸라 크림치즈', '휘낭시에옵션 고르곤졸라크림치즈'],
    category: 'option',
    group: 'bakery-option',
    countInBakeryTotal: false,
    optionLike: true,
  }),
]

const catalogDerivedSeeds = PRODUCT_CATALOG.map((item) =>
  product(item.name, {
    aliases: item.aliases || [],
    category: item.category || 'bakery',
    group: item.category || 'default',
    countInBakeryTotal: item.countInBakeryTotal !== false,
  }),
)

const bakeryMenuDerivedSeeds = BAKERY_MENU.map((name) =>
  product(name, {
    aliases: [name.replace(/\s+/g, '')].filter((alias) => alias !== name),
    category: 'bakery',
    group: 'legacy-menu',
    countInBakeryTotal: true,
  }),
)

export const DEFAULT_PRODUCT_SEEDS = Array.from(
  [...BASE_PRODUCT_SEEDS, ...catalogDerivedSeeds, ...bakeryMenuDerivedSeeds].reduce(
    (map, item) => {
      const key = item.name.replace(/\s+/g, '').toLowerCase()
      const existing = map.get(key)

      if (!existing) {
        map.set(key, {
          ...item,
          aliases: [...new Set((item.aliases || []).filter(Boolean))],
        })
        return map
      }

      map.set(key, {
        ...existing,
        ...item,
        aliases: [...new Set([...(existing.aliases || []), ...(item.aliases || [])].filter(Boolean))],
        countInBakeryTotal:
          item.countInBakeryTotal !== false || existing.countInBakeryTotal !== false,
        reviewNeeded: existing.reviewNeeded || item.reviewNeeded || false,
        optionLike: existing.optionLike || item.optionLike || false,
      })
      return map
    },
    new Map(),
  ).values(),
)

export function getDefaultProductSeeds() {
  return [...DEFAULT_PRODUCT_SEEDS]
}

```

## File: `src/lib/findTotal.js`

```js
import { RECEIPT_PATTERNS } from './receiptPatternConfig.js';

const FALLBACK_TOTAL_LABELS = [
  '주문금액',
  '총 결제금액',
  '총결제금액',
  '매출합계(카드)',
  '매출합계',
  '[결제금액]',
  '결제금액',
  '합계',
];

const NON_TOTAL_LABELS = [
  '배달팁',
  '할인',
  '부가세',
  '순매출',
  '승인번호',
  '카드번호',
  '수량',
  '금액',
  '메뉴',
  '품명',
];

function safeString(value) {
  return String(value || '').trim();
}

export function normalizeKey(value) {
  return safeString(value)
    .replace(/\s+/g, '')
    .replace(/[()[\]{}.,/\\\-_:]/g, '')
    .toLowerCase();
}

export function normalizeLine(value) {
  return safeString(value)
    .replace(/\u00a0/g, ' ')
    .replace(/[‐‑–—]/g, '-')
    .replace(/\s+/g, ' ');
}

export function lineContainsAny(line, keywords = []) {
  const key = normalizeKey(line);
  return keywords.some((keyword) => key.includes(normalizeKey(keyword)));
}

export function parseMoney(value) {
  const moneyMatches = String(value || '').match(/-?\d[\d,]{0,}/g);
  if (!moneyMatches || !moneyMatches.length) return null;

  const candidate = moneyMatches[moneyMatches.length - 1].replace(/[^\d-]/g, '');
  const num = Number(candidate);
  return Number.isFinite(num) ? num : null;
}

export function detectReceiptPattern(text) {
  const normalizedText = normalizeKey(text);

  let best = null;
  let bestScore = 0;

  for (const pattern of RECEIPT_PATTERNS) {
    const score = (pattern.detectKeywords || []).reduce((acc, keyword) => {
      return normalizedText.includes(normalizeKey(keyword)) ? acc + 1 : acc;
    }, 0);

    if (score > bestScore) {
      best = pattern;
      bestScore = score;
    }
  }

  return best || RECEIPT_PATTERNS[0];
}

export function splitLines(text) {
  return String(text || '')
    .split(/\r?\n/)
    .map(normalizeLine)
    .filter(Boolean);
}

export function findTotal(text) {
  const pattern = detectReceiptPattern(text);
  const lines = splitLines(text);
  const totalLabels = [...(pattern.totalPriorityLabels || []), ...FALLBACK_TOTAL_LABELS];

  // 1) 가장 먼저 라벨 우선 탐색
  for (let i = 0; i < lines.length; i += 1) {
    const line = lines[i];

    if (lineContainsAny(line, NON_TOTAL_LABELS) && !lineContainsAny(line, totalLabels)) {
      continue;
    }

    for (const label of totalLabels) {
      if (!lineContainsAny(line, [label])) continue;

      // 같은 줄 마지막 금액
      const inlineAmount = parseMoney(line);
      if (inlineAmount !== null) {
        return {
          label,
          amount: inlineAmount,
          line,
          lineIndex: i,
          source: 'inline',
        };
      }

      // 다음 줄 금액
      const nextLine = lines[i + 1] || '';
      const nextAmount = parseMoney(nextLine);
      if (nextAmount !== null) {
        return {
          label,
          amount: nextAmount,
          line: nextLine,
          lineIndex: i + 1,
          source: 'next-line',
        };
      }
    }
  }

  // 2) 라벨을 못 찾으면 하단 40% 구간에서 가장 큰 금액을 fallback
  const start = Math.max(0, Math.floor(lines.length * 0.6));
  const tail = lines.slice(start);
  const candidates = tail
    .filter((line) => !lineContainsAny(line, NON_TOTAL_LABELS))
    .map((line, idx) => ({
      amount: parseMoney(line),
      line,
      lineIndex: start + idx,
    }))
    .filter((row) => row.amount !== null);

  if (!candidates.length) {
    return {
      label: null,
      amount: null,
      line: null,
      lineIndex: -1,
      source: 'not-found',
    };
  }

  candidates.sort((a, b) => b.amount - a.amount);
  const best = candidates[0];

  return {
    label: null,
    amount: best.amount,
    line: best.line,
    lineIndex: best.lineIndex,
    source: 'fallback-largest-tail-money',
  };
}

```

## File: `src/lib/firebase.js`

```js
import { initializeApp } from 'firebase/app'
import { getFirestore } from 'firebase/firestore'

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
}

const app = initializeApp(firebaseConfig)

export const db = getFirestore(app)

```

## File: `src/lib/parseCandidateLines.js`

```js
function normalizeLine(line) {
  return String(line ?? "")
    .replace(/[|]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function parseMoneyToken(token) {
  const digits = String(token ?? "").replace(/[^\d]/g, "");
  if (!digits) return null;
  const value = Number(digits);
  return Number.isFinite(value) ? value : null;
}

function isNumericToken(token) {
  return /^[\d,]+$/.test(String(token ?? ""));
}

function pickQtyAndAmount(numericTail) {
  const values = numericTail.map(parseMoneyToken).filter((v) => Number.isFinite(v));
  if (!values.length) return { qty: 1, amount: null };

  if (values.length === 1) {
    const single = values[0];
    if (single >= 1000) return { qty: 1, amount: single };
    return { qty: single > 0 ? single : 1, amount: null };
  }

  const last = values[values.length - 1];
  const prev = values[values.length - 2];

  const amount = last >= 1000 ? last : prev >= 1000 ? prev : last;
  let qty = prev;

  if (!(qty >= 1 && qty <= 99)) qty = 1;
  return { qty, amount };
}

function parseTail(line) {
  const tokens = normalizeLine(line).split(" ").filter(Boolean);
  const numericTail = [];

  for (let i = tokens.length - 1; i >= 0; i -= 1) {
    if (isNumericToken(tokens[i])) numericTail.unshift(tokens[i]);
    else break;
  }

  const nameTokens = tokens.slice(0, tokens.length - numericTail.length);
  return {
    name: nameTokens.join(" ").trim(),
    numericTail,
  };
}

function isSeparator(line) {
  return /^[-=_.~\s]+$/.test(line);
}

function isHeaderLine(line) {
  return /(메뉴|품명)/.test(line) && /(금액)/.test(line);
}

function isStopLine(line) {
  return /(주문금액|총 ?결제금액|매출합계\(카드\)|매출합계|결제금액|합계|배달팁|순매출|부가세)/.test(
    line
  );
}

function isNoiseLine(line) {
  return (
    !line ||
    isSeparator(line) ||
    /(거래일시|주문번호|요청사항|친환경|수저포크|배달주소|주문접수시간|유형|픽업번호|계산일자|승인번호|카드번호|테이블번호|계산담당자|상호:|주소:|TEL|전화)/.test(
      line
    )
  );
}

function looksLikeOptionName(line) {
  const trimmed = normalizeLine(line);
  return /^[+ㄴ]/.test(trimmed);
}

function looksLikeNameOnly(line) {
  const trimmed = normalizeLine(line);
  if (!trimmed) return false;
  if (isNoiseLine(trimmed) || isHeaderLine(trimmed) || isStopLine(trimmed)) return false;
  if (isSeparator(trimmed)) return false;
  if (/^[\d,]+$/.test(trimmed)) return false;
  return true;
}

function parseLineCandidate(line) {
  const normalized = normalizeLine(line);
  if (!normalized || isNoiseLine(normalized) || isHeaderLine(normalized) || isStopLine(normalized)) {
    return null;
  }

  const { name, numericTail } = parseTail(normalized);

  if (!name && numericTail.length) {
    return {
      kind: "numeric-only",
      raw: normalized,
      qty: pickQtyAndAmount(numericTail).qty,
      amount: pickQtyAndAmount(numericTail).amount,
    };
  }

  if (!numericTail.length) {
    return {
      kind: "name-only",
      raw: normalized,
      name: normalized,
      isOption: looksLikeOptionName(normalized),
    };
  }

  const { qty, amount } = pickQtyAndAmount(numericTail);

  return {
    kind: "complete",
    raw: normalized,
    name: name || normalized,
    qty,
    amount,
    isOption: looksLikeOptionName(name || normalized),
  };
}

export function parseCandidateLines(textOrLines) {
  const lines = Array.isArray(textOrLines)
    ? textOrLines.map(normalizeLine)
    : String(textOrLines ?? "")
        .split(/\r?\n/)
        .map(normalizeLine);

  const candidateLines = [];
  const ignoredLines = [];

  let started = false;
  let pendingName = null;

  for (let i = 0; i < lines.length; i += 1) {
    const line = lines[i];
    if (!line) continue;

    if (isHeaderLine(line)) {
      started = true;
      continue;
    }

    if (!started) continue;
    if (isStopLine(line)) break;

    const parsed = parseLineCandidate(line);
    if (!parsed) {
      ignoredLines.push(line);
      continue;
    }

    if (parsed.kind === "name-only") {
      if (pendingName) {
        pendingName.name = `${pendingName.name} ${parsed.name}`.replace(/\s+/g, " ").trim();
      } else {
        pendingName = {
          name: parsed.name,
          isOption: parsed.isOption,
        };
      }
      continue;
    }

    if (parsed.kind === "numeric-only") {
      if (pendingName) {
        candidateLines.push({
          raw: `${pendingName.name} ${line}`.trim(),
          name: pendingName.name,
          qty: parsed.qty || 1,
          amount: parsed.amount || 0,
          isOption: pendingName.isOption,
        });
        pendingName = null;
      } else {
        ignoredLines.push(line);
      }
      continue;
    }

    // complete
    if (pendingName) {
      const mergedName = `${pendingName.name} ${parsed.name}`.replace(/\s+/g, " ").trim();
      candidateLines.push({
        raw: `${mergedName} ${parsed.qty ?? 1} ${parsed.amount ?? 0}`.trim(),
        name: mergedName,
        qty: parsed.qty || 1,
        amount: parsed.amount || 0,
        isOption: pendingName.isOption || parsed.isOption,
      });
      pendingName = null;
      continue;
    }

    candidateLines.push({
      raw: parsed.raw,
      name: parsed.name,
      qty: parsed.qty || 1,
      amount: parsed.amount || 0,
      isOption: parsed.isOption,
    });
  }

  if (pendingName && looksLikeNameOnly(pendingName.name)) {
    candidateLines.push({
      raw: pendingName.name,
      name: pendingName.name,
      qty: 1,
      amount: 0,
      isOption: pendingName.isOption,
    });
  }

  return {
    candidateLines,
    ignoredLines,
    lines,
  };
}

```

## File: `src/lib/productCatalog.js`

```js
export { PRODUCT_CATALOG, OPTION_NAMES } from '../data/bakeryMenu'

```

## File: `src/lib/products.js`

```js
import {
  addDoc,
  collection,
  onSnapshot,
  serverTimestamp,
} from 'firebase/firestore'
import { db } from './firebase'

const PRODUCTS = 'products'

export async function createProduct(payload) {
  return addDoc(collection(db, PRODUCTS), {
    name: payload.name,
    aliases: payload.aliases || [],
    category: payload.category || 'bakery',
    group: payload.group || 'default',
    countInBakeryTotal: payload.countInBakeryTotal !== false,
    active: true,
    createdAt: serverTimestamp(),
  })
}

export function listenProducts(callback) {
  return onSnapshot(collection(db, PRODUCTS), (snapshot) => {
    const rows = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }))
    callback(rows)
  })
}

```

## File: `src/lib/receiptAnalysisExample.js`

```js
import { parseReceiptText } from './receiptParser'
import { buildBakeryComputation } from './bakeryMatcher'
import { DEFAULT_PRODUCT_SEEDS } from './seedData'

export function analyzeReceiptText(ocrText, products = DEFAULT_PRODUCT_SEEDS) {
  const parsed = parseReceiptText(ocrText)

  const bakery = buildBakeryComputation(parsed.rawItems || [], products)

  return {
    source: parsed.source || null,
    documentType: parsed.documentType || null,
    orderedDate: parsed.orderedDate || null,
    orderTotal: parsed.orderTotal || 0,
    candidateLines: parsed.candidateLines || [],
    rawItems: parsed.rawItems || [],
    items: bakery.items || [],
    bakeryTotal: bakery.bakeryTotal || 0,
    bakeryBreakdown: bakery.bakeryBreakdown || [],
    debug: {
      totalLabel: parsed.totalLabel || null,
      ignoredLines: parsed.ignoredLines || [],
      unmatchedLines: parsed.unmatchedLines || [],
    },
  }
}

```

## File: `src/lib/receiptAutofillClient.js`

```js
import { buildBakeryComputation } from './bakeryMatcher'

const RECEIPT_API_URL = import.meta.env.VITE_RECEIPT_API_URL || '/api/parse-receipt'
const MAX_RECEIPT_EDGE = 2100
const RECEIPT_JPEG_QUALITY = 0.9
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
    flattened.push({
      name: row.name,
      qty: row.qty,
      amount: row.amount,
      isOption: !!row.isOption,
      optionCharge: Number(row.optionCharge || 0),
    })

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
  const items = normalizeAutoFilledItems(parsed?.items)
  const bakery = buildBakeryComputation(items, products)

  return {
    source: parsed?.source || 'manual',
    orderedDate: parsed?.orderedDate || '',
    orderTotal: parsed?.orderTotal || 0,
    items: flattenComputedItems(bakery.items),
    bakeryTotal: bakery.bakeryTotal,
    bakeryBreakdown: bakery.bakeryBreakdown,
    note: '',
    confidence: items.length ? 1 : 0,
  }
}

```

## File: `src/lib/receiptParser.js`

```js
import {
  detectReceiptPattern,
  findTotal,
  lineContainsAny,
  normalizeLine,
  parseMoney,
  splitLines,
} from './findTotal.js';

const SECTION_END_LABELS = [
  '주문금액',
  '총 결제금액',
  '총결제금액',
  '매출합계(카드)',
  '매출합계',
  '[결제금액]',
  '결제금액',
  '합계',
  '배달팁',
  '순매출',
  '부가세',
  '카드번호',
  '승인번호',
  '주문번호',
  '거래일시',
  '주문접수시간',
  '유형',
  '일회용수저필요',
  '계산담당자',
  '요청사항',
  '친환경',
  '수저포크',
  'qr',
];

function safeString(value) {
  return String(value || '').trim();
}

function normalizeDateString(raw) {
  if (!raw) return null;

  const match =
    raw.match(/(\d{4})[.\-/]\s*(\d{1,2})[.\-/]\s*(\d{1,2})/) ||
    raw.match(/(\d{4})\s+(\d{1,2})\s+(\d{1,2})/);

  if (!match) return null;

  const [, y, m, d] = match;
  return `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
}

export function extractOrderedDate(text) {
  const lines = splitLines(text);
  for (const line of lines) {
    const normalized = normalizeDateString(line);
    if (normalized) return normalized;
  }
  return null;
}

function isDashLikeLine(line) {
  return /^[-=_.·•┄┈\s]+$/.test(line);
}

function isPureNumberLine(line) {
  return /^-?\d[\d,]*$/.test(safeString(line));
}

function startsLikeOption(line) {
  return /^[+ㄴ•·]\s*/.test(safeString(line));
}

function hasMoney(line) {
  return /-?\d[\d,]{2,}/.test(line);
}

function shouldSkipLine(line, pattern) {
  const raw = safeString(line);
  if (!raw) return true;
  if (isDashLikeLine(raw)) return true;
  if (lineContainsAny(raw, pattern.ignoreLabels || [])) return true;
  if (/^(고객용|매장용)$/.test(raw)) return true;
  return false;
}

function findSectionStart(lines, pattern) {
  // 헤더가 1개만 보여도 시작하도록 완화
  const headerLabels = pattern.itemHeaderLabels || ['메뉴', '품명'];

  for (let i = 0; i < lines.length; i += 1) {
    const line = lines[i];
    const score = headerLabels.reduce(
      (acc, label) => acc + (lineContainsAny(line, [label]) ? 1 : 0),
      0,
    );
    if (score >= 1) return i + 1;
  }

  return 0;
}

function findSectionEnd(lines, startIndex) {
  for (let i = startIndex; i < lines.length; i += 1) {
    if (lineContainsAny(lines[i], SECTION_END_LABELS)) {
      return i;
    }
  }
  return lines.length;
}

function parseLineTail(line) {
  const tokens = safeString(line).split(/\s+/).filter(Boolean);
  const numeric = [];

  for (let i = tokens.length - 1; i >= 0; i -= 1) {
    const raw = tokens[i];
    const money = parseMoney(raw);
    if (money !== null) {
      numeric.unshift({ index: i, raw, value: money });
    } else {
      break;
    }
  }

  return { tokens, numeric };
}

function parseQtyFromRaw(raw) {
  const digits = String(raw || '').replace(/[^\d]/g, '');
  if (!digits) return null;
  const qty = Number(digits);
  if (!Number.isFinite(qty)) return null;
  if (qty <= 0 || qty > 99) return null;
  return qty;
}

function parseLineAsItem(line) {
  const raw = safeString(line);
  if (!raw) return null;

  // 옵션 줄 이름만 있는 경우
  if (startsLikeOption(raw) && !hasMoney(raw)) {
    return {
      name: raw,
      qty: 1,
      amount: 0,
      sourceLine: raw,
      parserPattern: 'option-name-only',
    };
  }

  const { tokens, numeric } = parseLineTail(raw);
  if (!tokens.length) return null;

  // 옵션 줄 + 금액
  if (startsLikeOption(raw) && numeric.length) {
    const amount = numeric[numeric.length - 1].value;
    const qty = numeric.length >= 2 ? parseQtyFromRaw(numeric[numeric.length - 2].raw) || 1 : 1;
    const nameTokens = tokens.slice(0, numeric[0].index);

    return {
      name: nameTokens.join(' ').trim() || raw,
      qty,
      amount,
      sourceLine: raw,
      parserPattern: 'option-with-money',
    };
  }

  // 이름 + 수량 + 금액 (가장 흔한 패턴)
  if (numeric.length >= 2) {
    const amount = numeric[numeric.length - 1].value;
    const qty = parseQtyFromRaw(numeric[numeric.length - 2].raw) || 1;
    const nameTokens = tokens.slice(0, numeric[numeric.length - 2].index);

    if (nameTokens.length) {
      return {
        name: nameTokens.join(' ').trim(),
        qty,
        amount,
        sourceLine: raw,
        parserPattern: 'name-qty-amount',
      };
    }
  }

  // 이름 + 금액
  if (numeric.length >= 1) {
    const amount = numeric[numeric.length - 1].value;
    const nameTokens = tokens.slice(0, numeric[numeric.length - 1].index);

    if (nameTokens.length) {
      return {
        name: nameTokens.join(' ').trim(),
        qty: 1,
        amount,
        sourceLine: raw,
        parserPattern: 'name-amount',
      };
    }
  }

  // 옵션 줄 이름만 있고 끝에 0 하나만 있는 경우
  if (startsLikeOption(raw)) {
    return {
      name: raw,
      qty: 1,
      amount: 0,
      sourceLine: raw,
      parserPattern: 'option-fallback',
    };
  }

  return null;
}

function joinWrappedLines(lines, pattern) {
  const merged = [];
  const structuralLabels = [
    ...(pattern.totalPriorityLabels || []),
    ...(pattern.ignoreLabels || []),
    ...(pattern.itemHeaderLabels || []),
    ...SECTION_END_LABELS,
  ];

  let i = 0;
  while (i < lines.length) {
    let current = safeString(lines[i]);

    if (!current || shouldSkipLine(current, pattern)) {
      i += 1;
      continue;
    }

    if (lineContainsAny(current, structuralLabels)) {
      i += 1;
      continue;
    }

    // 옵션 줄은 그대로 둔다.
    if (startsLikeOption(current)) {
      merged.push(current);
      i += 1;
      continue;
    }

    // 현재 줄에 금액이 없고 다음 줄이 구조 라인이 아니면 이어 붙임
    while (i + 1 < lines.length) {
      const next = safeString(lines[i + 1]);
      if (!next) break;
      if (lineContainsAny(next, structuralLabels)) break;
      if (startsLikeOption(next)) break;

      // 현재줄이 이미 금액을 가지면 종료
      if (hasMoney(current)) break;

      // 다음 줄이 숫자만 줄이면 붙여서 해석 시도
      current = `${current} ${next}`.replace(/\s+/g, ' ').trim();
      i += 1;

      // 붙인 뒤 금액이 생기면 더 안 붙임
      if (hasMoney(current)) break;
    }

    merged.push(current);
    i += 1;
  }

  return merged;
}

export function parseCandidateLines(text) {
  const pattern = detectReceiptPattern(text);
  const lines = splitLines(text).map(normalizeLine);
  const start = findSectionStart(lines, pattern);
  const end = findSectionEnd(lines, start);
  const sectionLines = lines.slice(start, end);
  return joinWrappedLines(sectionLines, pattern);
}

export function extractRawItems(text) {
  const candidates = parseCandidateLines(text);
  const items = [];

  for (const line of candidates) {
    if (isPureNumberLine(line)) continue;
    const parsed = parseLineAsItem(line);
    if (!parsed) continue;
    items.push(parsed);
  }

  return items;
}

export function parseReceiptText(text) {
  const pattern = detectReceiptPattern(text);
  const total = findTotal(text);
  const orderedDate = extractOrderedDate(text);
  const candidateLines = parseCandidateLines(text);
  const rawItems = extractRawItems(text);

  return {
    patternId: pattern.id,
    source: pattern.source,
    orderedDate,
    orderTotal: total.amount,
    orderTotalLabel: total.label,
    orderTotalSource: total.source,
    candidateLines,
    rawItems,
  };
}

```

## File: `src/lib/receiptPatternConfig.js`

```js
export const RECEIPT_PATTERNS = [
  {
    id: '쿠팡숏',
    source: 'coupang-eats',
    detectKeywords: ['쿠팡이먹는다', '[매장용]'],
    totalPriorityLabels: ['주문 금액'],
    itemHeaderLabels: ['메뉴', '수량', '금액'],
    optionPrefixes: ['+', 'ㄴ'],
    ignoreLabels: ['거래일시', '수저포크', '주문번호', '요청사항', '친환경'],
  },
  {
    id: 'baemin-long',
    source: 'baemin',
    detectKeywords: ['알뜰 한집배달', '주문금액'],
    totalPriorityLabels: ['총결제금액', '주문금액', '합계'],
    itemHeaderLabels: ['메뉴', '수량', '금액'],
    optionPrefixes: ['+', 'ㄴ'],
    ignoreLabels: ['배달팁', '주문번호', '요청사항', '친환경'],
  },
  {
    id: '픽업 전표',
    source: '픽업',
    detectKeywords: ['픽업번호', '포장주문', '합계'],
    totalPriorityLabels: ['합계'],
    itemHeaderLabels: ['메뉴', '수량', '금액'],
    optionPrefixes: ['+', 'ㄴ'],
    ignoreLabels: ['일회용수저필요', '주문접수시간', '유형'],
  },
  {
    id: 'store-pos',
    source: 'store-pos',
    detectKeywords: ['영수증', '상호:오라운드 본점'],
    totalPriorityLabels: ['매출합계(카드)', '결제금액', '매출합계', '합계'],
    itemHeaderLabels: ['품명', '수량', '할인', '금액'],
    optionPrefixes: ['+', 'ㄴ'],
    ignoreLabels: ['순매출', '부가세', '카드번호', '카드사명', '인증번호', '계산담당자'],
  },
]

```

## File: `src/lib/receipts.js`

```js
import {
  collection,
  doc,
  onSnapshot,
  serverTimestamp,
  writeBatch,
} from 'firebase/firestore'
import { db } from './firebase'

const RECEIPTS = 'receipts'
const RECEIPTS_STORAGE_KEY = 'bill.receipts.v1'
const FIRESTORE_COMMIT_TIMEOUT_MS = 8000

function todayString() {
  const now = new Date()
  const y = now.getFullYear()
  const m = String(now.getMonth() + 1).padStart(2, '0')
  const d = String(now.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

function toNumber(value) {
  const parsed = Number(value || 0)
  return Number.isFinite(parsed) ? parsed : 0
}

function resolveReceiptDay(row) {
  return row.uploadedDate || row.orderedDate || ''
}

function canUseStorage() {
  return typeof window !== 'undefined' && typeof window.localStorage !== 'undefined'
}

function cloneForStorage(value) {
  return JSON.parse(JSON.stringify(value))
}

function readCachedReceipts() {
  if (!canUseStorage()) return []

  try {
    const raw = window.localStorage.getItem(RECEIPTS_STORAGE_KEY)
    if (!raw) return []

    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed : []
  } catch (error) {
    console.warn('Failed to read cached receipts', error)
    return []
  }
}

function writeCachedReceipts(rows) {
  if (!canUseStorage()) return

  try {
    window.localStorage.setItem(RECEIPTS_STORAGE_KEY, JSON.stringify(rows))
  } catch (error) {
    console.warn('Failed to write cached receipts', error)
  }
}

function mergeReceipts(baseRows, incomingRows) {
  const map = new Map()

  for (const row of [...baseRows, ...incomingRows]) {
    if (!row?.id) continue
    map.set(row.id, row)
  }

  return Array.from(map.values())
}

function getCreatedAtMs(row) {
  if (typeof row?.createdAtMs === 'number') return row.createdAtMs
  if (typeof row?.createdAt === 'string') {
    const parsed = Date.parse(row.createdAt)
    return Number.isFinite(parsed) ? parsed : 0
  }
  if (typeof row?.createdAt?.seconds === 'number') {
    return row.createdAt.seconds * 1000
  }
  return 0
}

function sortReceipts(rows) {
  return [...rows].sort((a, b) => getCreatedAtMs(b) - getCreatedAtMs(a))
}

function filterReceiptsByDate(rows, targetDate) {
  return sortReceipts(rows.filter((row) => resolveReceiptDay(row) === targetDate))
}

export async function createReceipt(payload) {
  const result = await createReceiptsBatch([payload])
  return result.ids[0]
}

function normalizeReceiptPayload(payload, { uploadedDate, orderedDate }) {
  return {
    source: payload.source || 'manual',
    imageName: payload.imageName || '',
    orderedDate,
    uploadedDate,
    orderTotal: toNumber(payload.orderTotal),
    bakeryTotal: toNumber(payload.bakeryTotal),
    bakeryBreakdown: payload.bakeryBreakdown || [],
    items: payload.items || [],
    analysis: payload.analysis || null,
    note: payload.note || '',
    createdAt: serverTimestamp(),
  }
}

export async function createReceiptsBatch(payloads) {
  if (!Array.isArray(payloads) || !payloads.length) {
    return { ids: [], synced: false, fallback: false }
  }

  const uploadedDate = todayString()
  const createdAtMs = Date.now()
  const batch = writeBatch(db)
  const refs = []
  const cachedRows = []

  for (const payload of payloads) {
    const orderedDate = payload.orderedDate || uploadedDate
    const ref = doc(collection(db, RECEIPTS))
    const normalized = normalizeReceiptPayload(payload, { uploadedDate, orderedDate })

    batch.set(ref, normalized)
    refs.push(ref.id)
    cachedRows.push(
      cloneForStorage({
        id: ref.id,
        ...normalized,
        createdAtMs,
      }),
    )
  }

  const nextCachedRows = sortReceipts(mergeReceipts(readCachedReceipts(), cachedRows))
  writeCachedReceipts(nextCachedRows)

  let synced = false
  let fallback = false

  try {
    await Promise.race([
      batch.commit().then(() => {
        synced = true
      }),
      new Promise((_, reject) => {
        setTimeout(() => reject(new Error('commit-timeout')), FIRESTORE_COMMIT_TIMEOUT_MS)
      }),
    ])
  } catch (error) {
    fallback = true
    console.warn('Failed to sync receipts to Firestore in time. Using local cache instead.', error)
  }

  return { ids: refs, synced, fallback }
}

export function listenReceiptsByDate(targetDate, callback) {
  callback(filterReceiptsByDate(readCachedReceipts(), targetDate))

  return onSnapshot(
    collection(db, RECEIPTS),
    (snapshot) => {
      const rows = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }))
      const mergedRows = sortReceipts(mergeReceipts(readCachedReceipts(), rows))

      writeCachedReceipts(mergedRows)
      callback(filterReceiptsByDate(mergedRows, targetDate))
    },
    (error) => {
      console.warn('Failed to listen receipts from Firestore. Falling back to local cache.', error)
      callback(filterReceiptsByDate(readCachedReceipts(), targetDate))
    },
  )
}

```

## File: `src/lib/seedData.js`

```js
export { DEFAULT_PRODUCT_SEEDS, OPTION_NAMES } from './bakerySeedData.js'

```

## File: `src/lib/seedProducts.js`

```js
import { createProduct } from './products'
import { DEFAULT_PRODUCT_SEEDS } from './bakerySeedData'

export async function seedDefaultProducts(existingRows = []) {
  const existingNames = new Set(existingRows.map((row) => row.name))

  const targets = DEFAULT_PRODUCT_SEEDS.filter(
    (item) => item.category === 'bakery' && !existingNames.has(item.name),
  )

  for (const item of targets) {
    await createProduct(item)
  }

  return targets.length
}

```

## File: `src/lib/smokeTestWrite.js`

```js
import { addDoc, collection, serverTimestamp } from 'firebase/firestore'
import { db } from './firebase'

export async function smokeTestWrite() {
  return addDoc(collection(db, 'ping'), {
    ok: true,
    createdAt: serverTimestamp(),
  })
}

```

## File: `src/main.jsx`

```jsx
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)

```

## File: `src/pages/ProductsPage.jsx`

```jsx
import { useEffect, useState } from 'react'
import { createProduct, listenProducts } from '../lib/products'
import { buildCatalogIndex, learnCatalogAlias } from '../lib/bakeryMatcher'
import { seedDefaultProducts } from '../lib/seedProducts'

export default function ProductsPage() {
  const [name, setName] = useState('')
  const [aliases, setAliases] = useState('')
  const [rows, setRows] = useState([])
  const [saving, setSaving] = useState(false)
  const [seeding, setSeeding] = useState(false)
  const [message, setMessage] = useState('')
  const [selectedProductName, setSelectedProductName] = useState('')
  const [newAlias, setNewAlias] = useState('')

  useEffect(() => {
    const unsub = listenProducts(setRows)
    return () => unsub?.()
  }, [])

  const catalogRows = buildCatalogIndex(rows)
    .filter(
      (row) => row.active !== false && row.category === 'bakery' && row.countInBakeryTotal !== false,
    )
    .map((row) => ({
      ...row,
      aliases: row.rawNames.filter((alias) => alias !== row.name),
    }))
    .sort((a, b) => a.name.localeCompare(b.name, 'ko'))

  useEffect(() => {
    if (!catalogRows.length) return
    if (catalogRows.some((row) => row.name === selectedProductName)) return
    setSelectedProductName(catalogRows[0].name)
  }, [catalogRows, selectedProductName])

  async function handleSubmit(e) {
    e.preventDefault()
    if (!name.trim()) return

    setSaving(true)
    setMessage('')
    try {
      await createProduct({
        name: name.trim(),
        aliases: aliases
          .split(',')
          .map((v) => v.trim())
          .filter(Boolean),
        category: 'bakery',
        group: 'manual',
        countInBakeryTotal: true,
      })

      setName('')
      setAliases('')
      setMessage('품목 추가 완료')
    } finally {
      setSaving(false)
    }
  }

  async function handleSeed() {
    setSeeding(true)
    setMessage('')
    try {
      const count = await seedDefaultProducts(rows)
      setMessage(`기본 품목 ${count}개 추가 완료`)
    } finally {
      setSeeding(false)
    }
  }

  function handleAddAlias(event) {
    event.preventDefault()
    if (!selectedProductName || !newAlias.trim()) return

    learnCatalogAlias(newAlias.trim(), selectedProductName)
    setNewAlias('')
    setMessage(`별칭 추가 완료: ${selectedProductName}`)
  }

  return (
    <div className="page">
      <h2>베이커리 사전</h2>

      <div className="card productActionCard">
        <button type="button" onClick={handleSeed} disabled={seeding}>
          {seeding ? '불러오는 중...' : '기본 품목 불러오기'}
        </button>
        {message && <p className="message">{message}</p>}
      </div>

      <form className="card form" onSubmit={handleSubmit}>
        <h3>새 품목 추가</h3>
        <label>
          품목명
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="예: 에그타르트"
          />
        </label>

        <label>
          별칭(쉼표 구분)
          <input
            value={aliases}
            onChange={(e) => setAliases(e.target.value)}
            placeholder="예: 타르트, egg tart"
          />
        </label>

        <button type="submit" disabled={saving}>
          {saving ? '저장 중...' : '품목 추가'}
        </button>
      </form>

      <form className="card form" onSubmit={handleAddAlias}>
        <h3>기존 품목에 별칭 추가</h3>
        <label>
          대상 품목
          <select
            value={selectedProductName}
            onChange={(e) => setSelectedProductName(e.target.value)}
          >
            <option value="">품목 선택</option>
            {catalogRows.map((row) => (
              <option key={row.name} value={row.name}>
                {row.name}
              </option>
            ))}
          </select>
        </label>

        <label>
          새 별칭
          <input
            value={newAlias}
            onChange={(e) => setNewAlias(e.target.value)}
            placeholder="예: 에타, eggtart, 소금빵1개"
          />
        </label>

        <button type="submit" disabled={!selectedProductName || !newAlias.trim()}>
          별칭 추가
        </button>
      </form>

      <div className="card">
        <div className="productSectionHeader">
          <h3>등록된 품목</h3>
          <p className="subtleText">기본 품목과 현재까지 학습된 별칭까지 함께 표시합니다.</p>
        </div>

        {catalogRows.length === 0 ? (
          <p>등록된 품목이 없습니다.</p>
        ) : (
          <ul className="productList enhancedProductList">
            {catalogRows.map((row) => (
              <li key={row.name}>
                <div className="productRowHeader">
                  <strong>{row.name}</strong>
                  <span>
                    {row.category} / {row.countInBakeryTotal ? '합산 포함' : '합산 제외'}
                  </span>
                </div>

                <div className="productAliasBlock">
                  <p className="suggestionLabel">등록된 별칭</p>
                  {row.aliases.length ? (
                    <div className="suggestionChips">
                      {row.aliases.map((alias) => (
                        <span key={`${row.name}-${alias}`} className="productAliasChip">
                          {alias}
                        </span>
                      ))}
                    </div>
                  ) : (
                    <p className="subtleText">등록된 별칭이 없습니다.</p>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}

```

## File: `src/pages/SummaryPage.jsx`

```jsx
import { useEffect, useMemo, useState } from 'react'
import { listenReceiptsByDate } from '../lib/receipts'

function todayString() {
  const now = new Date()
  const y = now.getFullYear()
  const m = String(now.getMonth() + 1).padStart(2, '0')
  const d = String(now.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

function formatWon(value) {
  return new Intl.NumberFormat('ko-KR').format(Number(value || 0))
}

function getReceiptAnalysis(row) {
  if (row.analysis) return row.analysis

  return {
    source: row.source || null,
    documentType: null,
    orderedDate: row.orderedDate || null,
    totalLabel: null,
    orderTotal: row.orderTotal ?? null,
    confidence: null,
    notes: row.note ? [row.note] : [],
    items: row.items || [],
  }
}

export default function SummaryPage() {
  const [orderedDate, setOrderedDate] = useState(todayString())
  const [rows, setRows] = useState([])

  useEffect(() => {
    const unsub = listenReceiptsByDate(orderedDate, setRows)
    return () => unsub?.()
  }, [orderedDate])

  const summary = useMemo(() => {
    const bakeryMap = new Map()

    const base = rows.reduce(
      (acc, row) => {
        acc.orderTotal += Number(row.orderTotal || 0)
        acc.bakeryTotal += Number(row.bakeryTotal || 0)

        for (const item of row.bakeryBreakdown || []) {
          if (!bakeryMap.has(item.name)) {
            bakeryMap.set(item.name, {
              name: item.name,
              qty: 0,
              amount: 0,
            })
          }
          const target = bakeryMap.get(item.name)
          target.qty += Number(item.qty || 0)
          target.amount += Number(item.amount || 0)
        }

        return acc
      },
      { orderTotal: 0, bakeryTotal: 0 },
    )

    return {
      ...base,
      bakeryItems: Array.from(bakeryMap.values()).sort((a, b) => b.amount - a.amount),
    }
  }, [rows])

  return (
    <div className="page">
      <h2>요약</h2>

      <div className="card">
        <label>
          업로드 조회일
          <input type="date" value={orderedDate} onChange={(e) => setOrderedDate(e.target.value)} />
        </label>
      </div>

      <div className="summaryGrid">
        <div className="card bigNumber">
          <h3>총 주문금액</h3>
          <strong>{formatWon(summary.orderTotal)}원</strong>
        </div>

        <div className="card bigNumber">
          <h3>베이커리 합계</h3>
          <strong>{formatWon(summary.bakeryTotal)}원</strong>
        </div>
      </div>

      <div className="card">
        <h3>베이커리 품목별 합계</h3>
        {summary.bakeryItems.length === 0 ? (
          <p>매칭된 베이커리 품목이 없습니다.</p>
        ) : (
          <ul className="receiptList">
            {summary.bakeryItems.map((item) => (
              <li key={item.name}>
                <div>
                  <strong>{item.name}</strong>
                </div>
                <div>
                  수량 {item.qty} / 금액 {formatWon(item.amount)}원
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="card">
        <h3>주문 목록</h3>
        {rows.length === 0 ? (
          <p>저장된 주문이 없습니다.</p>
        ) : (
          <ul className="receiptList">
            {rows.map((row) => (
              <li key={row.id}>
                <div>
                  <strong>{row.imageName || '사진 없음'}</strong>
                  <span>{row.source}</span>
                </div>
                <div>
                  주문금액 {formatWon(row.orderTotal)}원 / 베이커리 {formatWon(row.bakeryTotal)}원
                </div>
                <div>업로드일 {row.uploadedDate || '-'}</div>
                <details className="analysisDetails">
                  <summary>분석 내용 보기</summary>
                  {(() => {
                    const analysis = getReceiptAnalysis(row)
                    return (
                      <div className="analysisPanel">
                        <div className="analysisMeta">
                          <div>
                            <strong>분석 출처</strong>
                            <p>{analysis.source || row.source || '-'}</p>
                          </div>
                        </div>

                        <div>
                          <strong>분석 품목</strong>
                          {analysis.items?.length ? (
                            <ul className="miniList compactList">
                              {analysis.items.map((item, index) => (
                                <li key={`${row.id}-analysis-${item.name}-${index}`}>
                                  {item.name} / {Number(item.qty || 0)}개 /{' '}
                                  {formatWon(item.amount || 0)}원
                                  {item.isOption ? ' / 옵션' : ''}
                                </li>
                              ))}
                            </ul>
                          ) : (
                            <p>저장된 분석 품목이 없습니다.</p>
                          )}
                        </div>

                        <div>
                          <strong>분석 메모</strong>
                          {analysis.notes?.length ? (
                            <ul className="miniList compactList">
                              {analysis.notes.map((note, index) => (
                                <li key={`${row.id}-note-${index}`}>{note}</li>
                              ))}
                            </ul>
                          ) : (
                            <p>저장된 메모가 없습니다.</p>
                          )}
                        </div>
                      </div>
                    )
                  })()}
                </details>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}

```

## File: `src/pages/UploadPage.jsx`

```jsx
import { useEffect, useMemo, useRef, useState } from 'react'
import { createReceiptsBatch, listenReceiptsByDate } from '../lib/receipts'
import { listenProducts } from '../lib/products'
import { buildBakeryComputation, learnCatalogAlias } from '../lib/bakeryMatcher'
import { buildAutofillStateFromParsed, normalizeAutoFilledItems, parseReceiptImage } from '../lib/receiptAutofillClient'

function todayString() {
  const now = new Date()
  const y = now.getFullYear()
  const m = String(now.getMonth() + 1).padStart(2, '0')
  const d = String(now.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

function emptyItem() {
  return { name: '', qty: 1, amount: '', isOption: false, optionCharge: 0 }
}

function createUploadEntry(file, index) {
  return {
    id: `${file.name}-${file.lastModified}-${index}`,
    file,
    previewUrl: URL.createObjectURL(file),
    orderTotal: '',
    note: '',
    items: [emptyItem()],
    parsedReceipt: null,
    autoFilled: {
      source: 'manual',
      orderedDate: todayString(),
      confidence: 0,
    },
    status: 'idle',
    error: '',
  }
}

export default function UploadPage() {
  const [uploads, setUploads] = useState([])
  const [products, setProducts] = useState([])
  const [saving, setSaving] = useState(false)
  const [autoReading, setAutoReading] = useState(false)
  const [message, setMessage] = useState('')
  const [savedRows, setSavedRows] = useState([])
  const uploadsRef = useRef([])

  useEffect(() => {
    const unsub = listenProducts(setProducts)
    return () => unsub?.()
  }, [])

  useEffect(() => {
    const unsub = listenReceiptsByDate(todayString(), setSavedRows)
    return () => unsub?.()
  }, [])

  useEffect(() => {
    uploadsRef.current = uploads
  }, [uploads])

  useEffect(() => {
    return () => {
      for (const entry of uploadsRef.current) {
        URL.revokeObjectURL(entry.previewUrl)
      }
    }
  }, [])

  const totalSelected = uploads.length
  const totalParsed = uploads.filter((entry) => entry.parsedReceipt).length
  const totalErrors = uploads.filter((entry) => entry.status === 'error').length
  const needsAnalysis = uploads.some((entry) => entry.status === 'idle')
  const analysisAttempted =
    uploads.length > 0 && uploads.every((entry) => entry.status !== 'idle' && entry.status !== 'reading')

  const summary = useMemo(() => {
    return uploads.reduce(
      (acc, entry) => {
        const computed = buildBakeryComputation(entry.items, products)
        acc.orderTotal += Number(entry.orderTotal || 0)
        acc.bakeryTotal += computed.bakeryTotal
        return acc
      },
      { orderTotal: 0, bakeryTotal: 0 },
    )
  }, [products, uploads])

  function patchUpload(id, updater) {
    setUploads((prev) => prev.map((entry) => (entry.id === id ? updater(entry) : entry)))
  }

  async function processUploads(targetUploads) {
    if (!targetUploads.length) return

    setAutoReading(true)
    setMessage(`사진 ${targetUploads.length}장 분석 중...`)

    let successCount = 0

    for (const current of targetUploads) {
      patchUpload(current.id, (entry) => ({ ...entry, status: 'reading', error: '' }))

      try {
        const parsed = await parseReceiptImage(current.file)
        const filled = buildAutofillStateFromParsed(parsed, products)

        patchUpload(current.id, (entry) => ({
          ...entry,
          parsedReceipt: parsed,
          orderTotal: filled.orderTotal ? String(filled.orderTotal) : entry.orderTotal,
          note: filled.note || entry.note,
          items: filled.items?.length ? filled.items : entry.items,
          autoFilled: {
            source: filled.source || 'manual',
            orderedDate: filled.orderedDate || todayString(),
            confidence: filled.confidence || 0,
          },
          status: 'done',
          error: '',
        }))
        successCount += 1
      } catch (error) {
        patchUpload(current.id, (entry) => ({
          ...entry,
          parsedReceipt: null,
          status: 'error',
          error: error?.message || '자동 읽기 실패',
        }))
      }
    }

    setMessage(`자동 읽기 완료 ${successCount}/${targetUploads.length}`)
    setAutoReading(false)
  }

  function handleFileChange(event) {
    const nextFiles = Array.from(event.target.files || [])

    setUploads((prev) => {
      for (const entry of prev) {
        URL.revokeObjectURL(entry.previewUrl)
      }
      return nextFiles.map((file, index) => createUploadEntry(file, index))
    })

    if (!nextFiles.length) {
      setMessage('')
      return
    }

    setMessage(`${nextFiles.length}장 선택됨. 분석 버튼을 눌러 진행하세요.`)
  }

  function updateItem(uploadId, itemIndex, field, value) {
    patchUpload(uploadId, (entry) => ({
      ...entry,
      items: entry.items.map((item, index) =>
        index === itemIndex ? { ...item, [field]: value } : item,
      ),
    }))
  }

  function applySuggestedItemName(uploadId, itemIndex, rawName, suggestionName) {
    learnCatalogAlias(rawName, suggestionName)
    updateItem(uploadId, itemIndex, 'name', suggestionName)
    setMessage(`학습 별칭 저장: ${rawName} -> ${suggestionName}`)
  }

  function addItemRow(uploadId) {
    patchUpload(uploadId, (entry) => ({
      ...entry,
      items: [...entry.items, emptyItem()],
    }))
  }

  function removeItemRow(uploadId, itemIndex) {
    patchUpload(uploadId, (entry) => ({
      ...entry,
      items:
        entry.items.length === 1
          ? [emptyItem()]
          : entry.items.filter((_, index) => index !== itemIndex),
    }))
  }

  function removeUpload(uploadId) {
    setUploads((prev) =>
      prev.filter((entry) => {
        if (entry.id === uploadId) {
          URL.revokeObjectURL(entry.previewUrl)
          return false
        }
        return true
      }),
    )
  }

  async function retryUploadAnalysis(uploadId) {
    const target = uploadsRef.current.find((entry) => entry.id === uploadId)
    if (!target || autoReading) return

    setMessage('재분석 중: ' + target.file.name)
    await processUploads([target])
  }

  async function handleSubmit(event) {
    event.preventDefault()
    if (!uploads.length) return

    setSaving(true)
    setMessage('저장 요청 전송 중...')

    try {
      const payloads = uploads.map((entry) => {
        const computed = buildBakeryComputation(entry.items, products)

        return {
          source: entry.autoFilled.source || 'manual',
          imageName: entry.file?.name || '',
          orderedDate: entry.autoFilled.orderedDate || todayString(),
          orderTotal: entry.orderTotal,
          bakeryTotal: computed.bakeryTotal,
          bakeryBreakdown: computed.bakeryBreakdown,
          items: computed.items,
          analysis: entry.parsedReceipt
            ? {
                source: entry.parsedReceipt.source || null,
                orderedDate: entry.parsedReceipt.orderedDate || null,
                orderTotal: entry.parsedReceipt.orderTotal ?? null,
                items: entry.parsedReceipt.items || [],
              }
            : null,
          note: entry.note,
        }
      })

      const saveResult = await createReceiptsBatch(payloads)

      for (const entry of uploads) {
        URL.revokeObjectURL(entry.previewUrl)
      }
      setUploads([])
      const completedMessage = saveResult.synced
        ? `${uploads.length}건 저장 완료`
        : `${uploads.length}건 저장 완료 (로컬 저장)`
      setMessage(completedMessage)
      if (typeof window !== 'undefined' && typeof window.alert === 'function') {
        window.alert(completedMessage)
      }
    } catch (error) {
      console.error(error)
      setMessage(error?.message || '저장 실패')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="page">
      <h2>업로드</h2>

      <form className="card form" onSubmit={handleSubmit}>
        <div className="uploadControlShell">
          <label className="uploadDropzone">
            <span className="uploadDropzoneTitle">영수증 사진 업로드</span>
            <span className="uploadDropzoneText">
              여러 장을 한 번에 선택하고, 분석 후 바로 저장할 수 있습니다.
            </span>
            <input type="file" accept="image/*" multiple onChange={handleFileChange} />
          </label>

          <div className="uploadOverviewGrid">
            <div className="uploadMetricCard">
              <span>선택 사진</span>
              <strong>{totalSelected}장</strong>
            </div>
            <div className="uploadMetricCard">
              <span>분석 완료</span>
              <strong>{totalParsed}장</strong>
            </div>
            <div className="uploadMetricCard">
              <span>분석 실패</span>
              <strong>{totalErrors}장</strong>
            </div>
            <div className="uploadMetricCard">
              <span>총 주문금액</span>
              <strong>{summary.orderTotal.toLocaleString()}원</strong>
            </div>
            <div className="uploadMetricCard">
              <span>베이커리 합계</span>
              <strong>{summary.bakeryTotal.toLocaleString()}원</strong>
            </div>
          </div>
        </div>

        <div className="batchActions">
          {!analysisAttempted ? (
            <button type="button" onClick={() => processUploads(uploads)} disabled={!uploads.length || autoReading}>
              {autoReading ? '분석 중...' : `${totalSelected || 0}건 분석`}
            </button>
          ) : (
            <button type="submit" disabled={!uploads.length || saving || autoReading}>
              {saving ? '저장 중...' : `${totalSelected || 0}건 저장`}
            </button>
          )}
        </div>

        {uploads.length > 0 ? (
          <div className="uploadList">
            {uploads.map((entry, uploadIndex) => {
              const computed = buildBakeryComputation(entry.items, products)
              const itemCount = entry.items.filter((item) => item.name).length
              const parsedItems = entry.parsedReceipt?.items || []
              const computedParsedItems = buildBakeryComputation(
                normalizeAutoFilledItems(parsedItems),
                products,
              ).items
              const recognizedItemCount = computedParsedItems.filter((item) => item.name && !item.isOption).length
              const recognizedOptionCount = computedParsedItems.filter((item) => item.isOption).length
              const matchedBakeryCount = computed.bakeryBreakdown.length
              const amountGap = Number(entry.orderTotal || 0) - computed.bakeryTotal

              return (
                <div key={entry.id} className="card nestedCard uploadCard">
                  <div className="uploadCardHeader">
                    <div>
                      <h3>
                        {uploadIndex + 1}. {entry.file.name}
                      </h3>
                      <p className="subtleText">추정 채널 {entry.autoFilled.source || 'manual'}</p>
                    </div>
                    <div className="uploadCardActions">
                      <span className={`statusBadge status-${entry.status}`}>
                        {entry.status === 'done'
                          ? '분석 완료'
                          : entry.status === 'reading'
                            ? '분석 중'
                            : entry.status === 'error'
                              ? '분석 실패'
                              : '분석 대기'}
                      </span>
                      {entry.status !== 'idle' && entry.status !== 'reading' ? (
                        <button
                          type="button"
                          className="ghostButton"
                          onClick={() => retryUploadAnalysis(entry.id)}
                          disabled={autoReading}
                        >
                          다시 분석
                        </button>
                      ) : null}
                      <button type="button" className="ghostButton" onClick={() => removeUpload(entry.id)}>
                        제거
                      </button>
                    </div>
                  </div>

                  <div className="uploadCardLayout">
                    <div className="uploadCardVisual">
                      <div className="previewWrap multiPreviewWrap">
                        <img src={entry.previewUrl} alt={entry.file.name} className="preview" />
                      </div>

                      <div className="uploadQuickFacts">
                        <div className="uploadFact emphasis">
                          <span>주문금액</span>
                          <strong>{Number(entry.orderTotal || 0).toLocaleString()}원</strong>
                        </div>
                        <div className="uploadFact emphasis">
                          <span>베이커리 합계</span>
                          <strong>{computed.bakeryTotal.toLocaleString()}원</strong>
                        </div>
                        <div className="uploadFact">
                          <span>인식 품목</span>
                          <strong>{recognizedItemCount || itemCount}개</strong>
                        </div>
                        <div className="uploadFact">
                          <span>옵션 행</span>
                          <strong>{recognizedOptionCount}개</strong>
                        </div>
                      </div>
                    </div>

                    <div className="uploadCardContent">
                      <div className="analysisSpotlight card nestedCard">
                        <div className="analysisSpotlightHeader">
                          <div>
                            <p className="sectionEyebrow">Analysis</p>
                            <h3>한눈에 보는 분석 결과</h3>
                          </div>
                          <span className={`statusBadge status-${entry.status}`}>
                            {entry.status === 'done'
                              ? '확인 완료'
                              : entry.status === 'reading'
                                ? '읽는 중'
                                : entry.status === 'error'
                                  ? '확인 필요'
                                  : '대기'}
                          </span>
                        </div>

                        <div className="analysisSummaryGrid">
                          <div className="analysisSummaryCard">
                            <span>채널</span>
                            <strong>{entry.autoFilled.source || 'manual'}</strong>
                          </div>
                          <div className="analysisSummaryCard">
                            <span>매칭 베이커리</span>
                            <strong>{matchedBakeryCount}개</strong>
                          </div>
                          <div className="analysisSummaryCard">
                            <span>편집 품목</span>
                            <strong>{itemCount}개</strong>
                          </div>
                          <div className="analysisSummaryCard">
                            <span>차액</span>
                            <strong>{amountGap.toLocaleString()}원</strong>
                          </div>
                        </div>

                        {entry.parsedReceipt ? (
                          <div className="parseResult compactParseCard">
                            <div className="analysisListHeader">
                              <strong>자동 추출 품목</strong>
                              <span>{parsedItems.length}줄</span>
                            </div>
                            {computedParsedItems.length ? (
                              <ul className="analysisLineList">
                                {computedParsedItems.map((item, index) => (
                                  <li key={`${item.name}-${index}`} className={item.isOption ? 'isOptionRow' : ''}>
                                    <div>
                                      <strong>{item.name}</strong>
                                      <span>
                                        {item.isOption
                                          ? item.matchedBakeryName
                                            ? `옵션 행 / ${item.matchedBakeryName}`
                                            : '옵션 행'
                                          : item.isBakery
                                            ? `매칭 베이커리 / ${item.matchedBakeryName || item.name}`
                                            : item.suggestions?.length
                                              ? '자동 매칭 후보 있음'
                                              : '일반 품목'}
                                      </span>
                                    </div>
                                    <div>
                                      <span>{item.qty}개</span>
                                      <strong>{item.amount.toLocaleString()}원</strong>
                                    </div>
                                  </li>
                                ))}
                              </ul>
                            ) : (
                              <p>추출된 품목이 없습니다.</p>
                            )}
                          </div>
                        ) : (
                          <p className="subtleText">분석 후 자동 추출 품목이 여기에 요약됩니다.</p>
                        )}
                      </div>

                      {entry.error && <p className="message errorMessage">{entry.error}</p>}

                      {needsAnalysis && (
                        <p className="subtleText">분석 전입니다. 상단 분석 버튼을 눌러주세요.</p>
                      )}

                      <label>
                        주문금액
                        <input
                          type="number"
                          inputMode="numeric"
                          value={entry.orderTotal}
                          onChange={(e) =>
                            patchUpload(entry.id, (current) => ({
                              ...current,
                              orderTotal: e.target.value,
                            }))
                          }
                          placeholder="예: 15300"
                        />
                      </label>

                      <div className="itemSection">
                        <div className="itemHeader">
                          <h3>품목 입력</h3>
                          <button type="button" onClick={() => addItemRow(entry.id)}>
                            + 품목 추가
                          </button>
                        </div>

                        {entry.items.map((item, index) => {
                          const matched = buildBakeryComputation([item], products).items[0]

                          return (
                            <div key={`${entry.id}-${index}`} className="itemRowCard">
                              <label>
                                품목명
                                <input
                                  value={item.name}
                                  onChange={(e) => updateItem(entry.id, index, 'name', e.target.value)}
                                  placeholder="예: 에그타르트"
                                />
                              </label>

                              <div className="itemRowGrid">
                                <label>
                                  수량
                                  <input
                                    type="number"
                                    min="1"
                                    value={item.qty}
                                    onChange={(e) => updateItem(entry.id, index, 'qty', e.target.value)}
                                  />
                                </label>

                                <label>
                                  금액
                                  <input
                                    type="number"
                                    inputMode="numeric"
                                    value={item.amount}
                                    onChange={(e) => updateItem(entry.id, index, 'amount', e.target.value)}
                                    placeholder="예: 3500"
                                  />
                                </label>
                              </div>

                              <div className="itemMatch">
                                {matched?.isOption || item.isOption ? (
                                  <span className="tag normal">옵션 행 인식</span>
                                ) : matched?.isBakery ? (
                                  <span className="tag bakery">베이커리 매칭: {matched.matchedBakeryName}</span>
                                ) : matched?.suggestions?.length ? (
                                  <span className="tag normal">자동 매칭 실패</span>
                                ) : (
                                  <span className="tag normal">베이커리 아님</span>
                                )}
                              </div>

                              {matched?.suggestions?.length && !matched?.isBakery && !matched?.isOption && !item.isOption ? (
                                <div className="suggestionGroup">
                                  <p className="suggestionLabel">추천 후보</p>
                                  <div className="suggestionChips">
                                    {matched.suggestions.map((suggestion) => (
                                      <button
                                        key={`${entry.id}-${index}-${suggestion.name}`}
                                        type="button"
                                        className="suggestionChip"
                                        onClick={() => applySuggestedItemName(entry.id, index, item.name, suggestion.name)}
                                      >
                                        {suggestion.name}
                                      </button>
                                    ))}
                                  </div>
                                </div>
                              ) : null}

                              <button type="button" onClick={() => removeItemRow(entry.id, index)}>
                                삭제
                              </button>
                            </div>
                          )
                        })}
                      </div>

                      <div className="card nestedCard">
                        <h3>자동 계산</h3>
                        <p>
                          베이커리 합계: <strong>{computed.bakeryTotal.toLocaleString()}원</strong>
                        </p>
                        {computed.bakeryBreakdown.length > 0 ? (
                          <ul className="miniList">
                            {computed.bakeryBreakdown.map((item) => (
                              <li key={`${entry.id}-${item.name}`}>
                                {item.name} / {item.qty}개 / {item.amount.toLocaleString()}원
                              </li>
                            ))}
                          </ul>
                        ) : (
                          <p>매칭된 베이커리 품목이 없습니다.</p>
                        )}
                      </div>

                      <label>
                        메모
                        <textarea
                          value={entry.note}
                          onChange={(e) =>
                            patchUpload(entry.id, (current) => ({
                              ...current,
                              note: e.target.value,
                            }))
                          }
                          placeholder="예: 디카페인 옵션은 베이커리 제외"
                        />
                      </label>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        ) : null}

        {message && <p className="message">{message}</p>}

        <div className="card nestedCard">
          <h3>오늘 저장된 기록</h3>
          {savedRows.length === 0 ? (
            <p>아직 저장된 영수증이 없습니다.</p>
          ) : (
            <ul className="receiptList receiptOverviewList">
              {savedRows.map((row) => (
                <li key={row.id}>
                  <div className="receiptRowHeader">
                    <div>
                      <strong>{row.imageName || '사진 없음'}</strong>
                      <span>{row.source}</span>
                    </div>
                    <span className="tag bakery">저장 완료</span>
                  </div>
                  <div className="receiptRowMetrics">
                    <div>
                      <span>주문금액</span>
                      <strong>{Number(row.orderTotal || 0).toLocaleString()}원</strong>
                    </div>
                    <div>
                      <span>베이커리</span>
                      <strong>{Number(row.bakeryTotal || 0).toLocaleString()}원</strong>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </form>
    </div>
  )
}

```

## File: `src/styles.css`

```css
:root {
  font-family: 'SF Pro Display', 'SF Pro KR', 'Apple SD Gothic Neo', 'Noto Sans KR',
    'Malgun Gothic', sans-serif;
  color: #111111;
  background:
    radial-gradient(circle at top left, rgba(247, 255, 252, 0.98), rgba(237, 248, 244, 0.94) 42%, rgba(230, 242, 238, 0.9) 100%),
    #eef5f2;
  font-synthesis: none;
  text-rendering: optimizeLegibility;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}

* {
  box-sizing: border-box;
}

html {
  background: #e8f1ee;
}

body {
  margin: 0;
  min-width: 320px;
  background:
    radial-gradient(circle at 0% 0%, rgba(245, 255, 251, 0.96), transparent 28%),
    linear-gradient(180deg, #f6fbf9 0%, #eaf2ef 100%);
  color: #111111;
}

body,
button,
input,
select,
textarea {
  font: inherit;
}

button,
input,
select,
textarea {
  -webkit-tap-highlight-color: transparent;
}

button,
input,
select,
textarea {
  appearance: none;
}

button,
input,
select,
textarea,
details,
summary {
  outline: none;
}

input,
select,
textarea {
  width: 100%;
  border: 1px solid rgba(17, 17, 17, 0.08);
  border-radius: 18px;
  padding: 14px 16px;
  background: rgba(255, 255, 255, 0.88);
  color: #111111;
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.82);
  transition:
    border-color 160ms ease,
    box-shadow 160ms ease,
    background 160ms ease;
}

input:focus,
select:focus,
textarea:focus {
  border-color: rgba(44, 181, 152, 0.5);
  background: #ffffff;
  box-shadow:
    0 0 0 4px rgba(44, 181, 152, 0.14),
    inset 0 1px 0 rgba(255, 255, 255, 0.95);
}

textarea {
  min-height: 120px;
  resize: vertical;
}

button {
  border: none;
  border-radius: 999px;
  padding: 13px 18px;
  background: linear-gradient(180deg, #39c7a7 0%, #159a7f 100%);
  color: #ffffff;
  font-weight: 600;
  letter-spacing: -0.01em;
  box-shadow:
    0 10px 24px rgba(21, 154, 127, 0.22),
    inset 0 1px 0 rgba(255, 255, 255, 0.18);
  transition:
    transform 160ms ease,
    box-shadow 160ms ease,
    opacity 160ms ease,
    background 160ms ease;
}

button:active {
  transform: scale(0.985);
}

button:disabled {
  opacity: 0.55;
  box-shadow: none;
}

p,
ul,
h1,
h2,
h3 {
  margin-top: 0;
}

#root {
  min-height: 100vh;
}

.appShell {
  position: relative;
  min-height: 100vh;
  overflow-x: hidden;
  padding: 22px 14px 32px;
}

.ambientGlow {
  position: fixed;
  width: 240px;
  height: 240px;
  border-radius: 50%;
  filter: blur(40px);
  opacity: 0.55;
  pointer-events: none;
  z-index: 0;
}

.ambientGlowLeft {
  top: -40px;
  left: -60px;
  background: rgba(213, 251, 240, 0.95);
}

.ambientGlowRight {
  top: 160px;
  right: -80px;
  background: rgba(133, 233, 210, 0.45);
}

.appFrame {
  position: relative;
  z-index: 1;
  width: min(100%, 820px);
  margin: 0 auto;
}

.topbar {
  position: sticky;
  top: 10px;
  z-index: 20;
  display: grid;
  gap: 16px;
  padding: 18px;
  border: 1px solid rgba(255, 255, 255, 0.62);
  border-radius: 30px;
  background: rgba(248, 252, 251, 0.78);
  backdrop-filter: blur(24px);
  box-shadow:
    0 18px 50px rgba(20, 20, 20, 0.08),
    inset 0 1px 0 rgba(255, 255, 255, 0.9);
}

.topbarMeta {
  display: grid;
  gap: 8px;
}

.eyebrow,
.sectionEyebrow {
  display: inline-flex;
  align-items: center;
  width: fit-content;
  min-height: 30px;
  padding: 0 12px;
  border-radius: 999px;
  background: rgba(226, 249, 242, 0.9);
  color: #207a67;
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 0.06em;
  text-transform: uppercase;
}

.topbar h1 {
  margin: 0;
  font-size: clamp(2rem, 9vw, 3.3rem);
  line-height: 0.96;
  letter-spacing: -0.05em;
}

.topbarMeta p,
.heroPanel p,
.card p,
.receiptList li div,
.productList li span,
.subtleText,
.uploadDropzoneText,
.message {
  color: #5f6d68;
}

.topbarMeta p {
  margin: 0;
  font-size: 14px;
  line-height: 1.55;
}

.tabs {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 8px;
  padding: 6px;
  border-radius: 22px;
  background: rgba(255, 255, 255, 0.9);
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.88);
}

.tabs button {
  min-height: 46px;
  padding: 12px 10px;
  background: transparent;
  color: #5f6d68;
  box-shadow: none;
}

.tabs button.active {
  background: linear-gradient(180deg, #edfffa 0%, #d8f5ee 100%);
  color: #145c4f;
  box-shadow:
    0 10px 22px rgba(44, 181, 152, 0.14),
    inset 0 1px 0 rgba(255, 255, 255, 0.92);
}

.appMain {
  display: grid;
  gap: 16px;
  margin-top: 16px;
}

.heroPanel {
  display: grid;
  gap: 10px;
  min-height: 148px;
  align-content: end;
  background:
    linear-gradient(180deg, rgba(255, 255, 255, 0.94), rgba(246, 253, 250, 0.88)),
    linear-gradient(135deg, rgba(232, 255, 248, 0.9), rgba(198, 243, 230, 0.5));
}

.heroPanel h2,
.page > h2 {
  margin: 0;
  font-size: clamp(1.55rem, 6vw, 2.4rem);
  line-height: 1.08;
  letter-spacing: -0.04em;
}

.heroPanel p {
  margin: 0;
  font-size: 14px;
  line-height: 1.6;
}

.page {
  display: grid;
  gap: 16px;
}

.page > h2 {
  display: none;
}

.card {
  position: relative;
  overflow: hidden;
  background: rgba(255, 255, 255, 0.76);
  border-radius: 28px;
  padding: 18px;
  border: 1px solid rgba(255, 255, 255, 0.72);
  backdrop-filter: blur(18px);
  box-shadow:
    0 20px 44px rgba(17, 17, 17, 0.06),
    inset 0 1px 0 rgba(255, 255, 255, 0.86);
}

.nestedCard {
  background: rgba(244, 251, 248, 0.92);
  border-color: rgba(17, 17, 17, 0.04);
  box-shadow:
    inset 0 1px 0 rgba(255, 255, 255, 0.88),
    0 10px 22px rgba(17, 17, 17, 0.04);
}

.form,
.uploadControlShell,
.uploadList,
.itemSection,
.uploadCard,
.uploadCardContent,
.parseResult,
.analysisPanel {
  display: grid;
  gap: 14px;
}

.form label,
.card label {
  display: grid;
  gap: 8px;
  color: #1d1d1f;
  font-size: 14px;
  font-weight: 600;
}

.uploadDropzone {
  display: grid;
  gap: 8px;
  padding: 20px;
  border: 1px solid rgba(32, 122, 103, 0.12);
  border-radius: 26px;
  background:
    linear-gradient(180deg, rgba(255, 255, 255, 0.96), rgba(245, 253, 250, 0.94)),
    linear-gradient(135deg, rgba(234, 255, 249, 0.92), rgba(204, 243, 232, 0.45));
}

.uploadDropzone input[type='file'] {
  padding: 18px 16px;
  border-style: dashed;
  border-width: 1.5px;
  background: rgba(246, 252, 250, 0.94);
}

.uploadDropzoneTitle {
  font-size: 20px;
  font-weight: 700;
  letter-spacing: -0.03em;
}

.uploadDropzoneText,
.subtleText,
.message,
.receiptList li span,
.productList li span {
  margin: 0;
  font-size: 13px;
  line-height: 1.55;
}

.uploadOverviewGrid,
.summaryGrid,
.analysisMeta,
.parseGrid,
.itemRowGrid,
.uploadQuickFacts {
  display: grid;
  gap: 10px;
}

.uploadOverviewGrid {
  grid-template-columns: repeat(2, minmax(0, 1fr));
}

.uploadMetricCard,
.uploadFact,
.receiptList li,
.productList li,
.itemRowCard {
  border-radius: 24px;
  border: 1px solid rgba(32, 122, 103, 0.08);
  background: rgba(255, 255, 255, 0.9);
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.88);
}

.uploadMetricCard,
.uploadFact {
  display: grid;
  gap: 6px;
  padding: 15px;
}

.uploadMetricCard span,
.uploadFact span {
  color: #5f6d68;
  font-size: 12px;
}

.uploadMetricCard strong {
  font-size: 22px;
  letter-spacing: -0.04em;
}

.uploadFact strong,
.bigNumber strong {
  font-size: 24px;
  letter-spacing: -0.04em;
}

.batchActions {
  display: grid;
  grid-template-columns: 1fr;
  gap: 10px;
}

.uploadCardHeader,
.itemHeader,
.uploadCardActions {
  display: flex;
  gap: 10px;
}

.uploadCardHeader,
.itemHeader {
  justify-content: space-between;
  align-items: flex-start;
}

.uploadCardHeader h3,
.itemHeader h3,
.card h3 {
  margin: 0;
  letter-spacing: -0.03em;
}

.uploadCardActions {
  align-items: center;
  flex-wrap: wrap;
}

.uploadCardLayout {
  display: grid;
  grid-template-columns: 1fr;
  gap: 14px;
}

.uploadCardVisual {
  display: grid;
  gap: 12px;
}

.uploadQuickFacts {
  grid-template-columns: repeat(2, minmax(0, 1fr));
}

.statusBadge,
.tag {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: fit-content;
  min-height: 34px;
  padding: 0 12px;
  border-radius: 999px;
  font-size: 12px;
  font-weight: 700;
}

.status-idle,
.tag.normal {
  background: rgba(120, 120, 128, 0.12);
  color: #515154;
}

.status-reading {
  background: rgba(44, 181, 152, 0.16);
  color: #177a67;
}

.status-done,
.tag.bakery {
  background: rgba(44, 181, 152, 0.14);
  color: #177a67;
}

.status-error,
.errorMessage {
  background: rgba(255, 59, 48, 0.12);
  color: #c9342c;
}

.ghostButton {
  background: rgba(120, 120, 128, 0.12);
  color: #1d1d1f;
  box-shadow: none;
}

.previewWrap {
  display: flex;
  justify-content: center;
}

.multiPreviewWrap {
  justify-content: stretch;
}

.preview {
  width: 100%;
  max-width: 100%;
  aspect-ratio: 4 / 5;
  object-fit: cover;
  border-radius: 24px;
  border: 1px solid rgba(17, 17, 17, 0.05);
}

.miniList {
  margin: 8px 0 0;
  padding-left: 18px;
}

.compactList {
  margin-top: 10px;
}

.parseGrid,
.analysisMeta,
.itemRowGrid,
.summaryGrid {
  grid-template-columns: 1fr;
}

.parseGrid p,
.analysisMeta p {
  margin: 4px 0 0;
}

.analysisDetails {
  margin-top: 8px;
  padding-top: 8px;
  border-top: 1px solid rgba(17, 17, 17, 0.06);
}

.analysisDetails summary {
  cursor: pointer;
  list-style: none;
  color: #159a7f;
  font-weight: 700;
}

.analysisDetails summary::-webkit-details-marker {
  display: none;
}

.bigNumber {
  display: grid;
  gap: 8px;
}

.receiptList,
.productList {
  list-style: none;
  margin: 0;
  padding: 0;
  display: grid;
  gap: 12px;
}

.receiptList li,
.productList li {
  padding: 16px;
  display: grid;
  gap: 6px;
}

.message {
  color: #159a7f;
}

.errorMessage {
  width: fit-content;
  margin: 0;
  padding: 10px 12px;
  border-radius: 16px;
}

@media (min-width: 720px) {
  .appShell {
    padding: 26px 20px 40px;
  }

  .topbar {
    padding: 22px;
  }

  .appMain {
    gap: 18px;
  }

  .heroPanel,
  .card {
    padding: 22px;
  }

  .summaryGrid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .uploadOverviewGrid {
    grid-template-columns: repeat(5, minmax(0, 1fr));
  }

  .uploadCardLayout {
    grid-template-columns: 296px minmax(0, 1fr);
    align-items: start;
  }

  .parseGrid,
  .analysisMeta,
  .itemRowGrid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .batchActions {
    grid-template-columns: 1fr 1fr;
  }
}

@media (max-width: 480px) {
  .appShell {
    padding: 14px 10px 24px;
  }

  .topbar {
    top: 8px;
    border-radius: 26px;
    padding: 16px;
  }

  .tabs {
    gap: 6px;
    padding: 5px;
  }

  .tabs button {
    min-height: 42px;
    font-size: 13px;
  }

  .heroPanel,
  .card {
    border-radius: 24px;
    padding: 16px;
  }

  .uploadOverviewGrid,
  .uploadQuickFacts {
    grid-template-columns: 1fr 1fr;
  }

  .itemHeader,
  .uploadCardHeader {
    flex-direction: column;
    align-items: stretch;
  }

  .uploadCardActions {
    justify-content: space-between;
  }
}

.itemMatch {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.suggestionGroup {
  display: grid;
  gap: 8px;
}

.suggestionLabel {
  margin: 0;
  color: #5f6d68;
  font-size: 12px;
  font-weight: 600;
}

.suggestionChips {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.suggestionChip {
  padding: 9px 14px;
  background: rgba(44, 181, 152, 0.12);
  color: #177a67;
  box-shadow: none;
}

.productActionCard,
.productSectionHeader,
.productRowHeader,
.productAliasBlock {
  display: grid;
  gap: 8px;
}

.productSectionHeader {
  margin-bottom: 12px;
}

.productRowHeader {
  gap: 4px;
}

.productAliasChip {
  display: inline-flex;
  align-items: center;
  min-height: 34px;
  padding: 0 12px;
  border-radius: 999px;
  background: rgba(44, 181, 152, 0.12);
  color: #177a67;
  font-size: 13px;
  font-weight: 600;
}

.brandLogo {
  display: block;
  width: min(180px, 52vw);
  height: auto;
  object-fit: contain;
}

.uploadFact.emphasis {
  background: linear-gradient(180deg, rgba(234, 255, 249, 0.96), rgba(214, 246, 235, 0.9));
  border-color: rgba(44, 181, 152, 0.18);
}

.analysisSpotlight,
.analysisSpotlightHeader,
.analysisSummaryGrid,
.analysisListHeader,
.receiptRowHeader,
.receiptRowMetrics {
  display: grid;
  gap: 12px;
}

.analysisSpotlight {
  padding: 18px;
  background: linear-gradient(180deg, rgba(251, 255, 254, 0.98), rgba(239, 250, 246, 0.94));
}

.analysisSpotlightHeader {
  grid-template-columns: minmax(0, 1fr) auto;
  align-items: start;
}

.analysisSummaryGrid,
.receiptRowMetrics {
  grid-template-columns: repeat(2, minmax(0, 1fr));
}

.analysisSummaryCard,
.receiptRowMetrics > div {
  display: grid;
  gap: 6px;
  padding: 14px;
  border-radius: 20px;
  background: rgba(255, 255, 255, 0.9);
  border: 1px solid rgba(32, 122, 103, 0.08);
}

.analysisSummaryCard span,
.analysisListHeader span,
.analysisLineList li span,
.receiptRowMetrics span {
  color: #5f6d68;
  font-size: 12px;
}

.analysisSummaryCard strong,
.receiptRowMetrics strong {
  font-size: 19px;
  letter-spacing: -0.03em;
}

.analysisListHeader {
  grid-template-columns: minmax(0, 1fr) auto;
  align-items: center;
}

.analysisLineList {
  list-style: none;
  margin: 0;
  padding: 0;
  display: grid;
  gap: 10px;
}

.analysisLineList li {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  gap: 12px;
  align-items: center;
  padding: 14px;
  border-radius: 20px;
  background: rgba(255, 255, 255, 0.92);
  border: 1px solid rgba(17, 17, 17, 0.05);
}

.analysisLineList li > div {
  display: grid;
  gap: 4px;
}

.analysisLineList li > div:last-child {
  justify-items: end;
}

.analysisLineList li.isOptionRow {
  background: rgba(240, 248, 245, 0.96);
  border-style: dashed;
}

.receiptOverviewList li {
  gap: 14px;
}

.receiptRowHeader {
  grid-template-columns: minmax(0, 1fr) auto;
  align-items: start;
}

.receiptRowHeader > div {
  display: grid;
  gap: 4px;
}

@media (max-width: 480px) {
  .analysisSpotlightHeader,
  .receiptRowHeader {
    grid-template-columns: 1fr;
  }

  .analysisLineList li {
    grid-template-columns: 1fr;
  }

  .analysisLineList li > div:last-child {
    justify-items: start;
  }
}

```

## File: `src/utils/analyzeReceipt.js`

```js
import { findBakeryItems } from './findBakery'
import { calcBakeryTotal } from './calcBakery'
import { findTotal } from './findTotal'

export function analyzeReceipt(ocrText) {
  const lines = ocrText.split('\n')

  const bakeryItems = findBakeryItems(ocrText)

  const bakeryTotal = calcBakeryTotal(lines, bakeryItems)

  const orderTotal = findTotal(ocrText)

  return {
    bakeryItems,
    bakeryTotal,
    orderTotal,
  }
}

```

## File: `src/utils/calcBakery.js`

```js
export function calcBakeryTotal(lines, bakeryList) {
  let total = 0

  lines.forEach((line) => {
    bakeryList.forEach((menu) => {
      if (line.includes(menu)) {
        const priceMatch = line.match(/[0-9,]+/g)

        if (priceMatch) {
          const price = parseInt(priceMatch[priceMatch.length - 1].replace(',', ''))
          total += price
        }
      }
    })
  })

  return total
}

```

## File: `src/utils/findBakery.js`

```js
import { BAKERY_MENU } from '../data/bakeryMenu'

export function findBakeryItems(text) {
  const items = []

  BAKERY_MENU.forEach((menu) => {
    if (text.includes(menu)) {
      items.push(menu)
    }
  })

  return items
}

```

## File: `src/utils/findTotal.js`

```js
export function findTotal(text) {
  const match = text.match(/주문금액\s*([0-9,]+)/)

  if (match) {
    return parseInt(match[1].replace(',', ''))
  }

  return null
}

```

## File: `functions/api/parse-receipt.js`

```js
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
  const suspiciousPatterns = [/스딩워치/, /장볼빠른/, /그래백리/, /깨비빔밥/, /이즈드랍/, /세드위치/]

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
      'For long names (e.g., "잠봉뵈르 샌드위치", "호두 크랜베리 깜빠뉴", "이지드립"), do NOT abbreviate, cut, or hallucinate words (like 스딩워치, 장볼빠른, 세드위치, 깨비빔밥, 이즈드랍). Extract them exactly as printed including spaces.',
      'Regular main products MUST have isOption=false. ONLY set isOption=true for sub-options starting with "+" or "ㄴ" (e.g., "ㄴ 이웃 블렌드(달콤)"). even if amount is 0, they are options. If no quantity is visible for the option, use qty=1.',
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
        'Ensure "잠봉뵈르 샌드위치", "호두 크랜베리 깜빠뉴", "이지드립" are read correctly and not misread. Options with "ㄴ" or "+" need qty=1 if missing.',
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

```
