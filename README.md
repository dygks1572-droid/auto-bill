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

