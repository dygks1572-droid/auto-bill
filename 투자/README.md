# Investor Intelligence Map

기업 카드, 비교 바구니, 관계 맵, 실적 콜 요약, 파트별 추적을 한 화면에 모아둔 주식 맵 앱입니다. 현재는 데모 데이터로도 동작하고, FMP API 키를 넣으면 실시간 quote / 1분 차트 / earnings transcript 분석이 활성화됩니다.

## 실행

1. 이 폴더에서 `python3 -m http.server 4173`
2. 브라우저에서 `http://localhost:4173`
3. 왼쪽 `Live Data Setup` 패널에 Financial Modeling Prep API 키 입력
4. `저장하고 연결` 또는 `Sync now` 클릭

## 현재 구현된 것

- 카드형 기업 맵
- 검색 / 섹터 필터
- 비교 바구니
- 관계 맵 뷰
- 기업 상세 패널
- 파트별 세그먼트 뷰
- 실적 콜 요약 / 키워드 히트맵
- 투자자 / 자본 흐름 정리 영역
- 현재 진행 프로젝트 정리 영역
- 사용자 정의 기업 추가와 로컬 저장
- FMP 실시간 quote 연결
- 활성 기업 1분 차트 연결
- 최신 earnings transcript 기반 자동 요약

## 데이터 구조

기본 샘플 데이터는 [data/companies.js](/Users/byeon-yohan/Desktop/배달%20영수증/투자/data/companies.js)에 있습니다.

각 기업은 아래 구조를 따릅니다.

```js
{
  id,
  name,
  ticker,
  sector,
  thesis,
  price: { current, drift, volatility, series },
  summaryMetrics: [{ label, value }],
  segments: [{ id, name, metricLabel, metricValue, note, series }],
  earnings: {
    period,
    tone,
    summary,
    highlights,
    watchItems,
    keywordHeat,
    panelNotes
  },
  relationships: [{ targetId, type, strength, note }],
  investors: [{ name, role, note }],
  initiatives: [{ title, stage, part, detail }]
}
```

## 실제 데이터로 확장하려면

- 현재 구현은 Financial Modeling Prep 공식 endpoint를 사용합니다.
- 시세: `batch-quote`
- 1분 차트: `historical-chart/1min`
- transcript 날짜: `earning-call-transcript-dates`
- transcript 원문: `earning-call-transcript`
- `price.series`는 활성 기업 기준으로 실시간 1분 차트로 갱신됩니다.
- `earnings`는 최신 transcript를 불러와 키워드 기반으로 자동 재구성됩니다.
- `relationships`를 공급망 / 투자 / 고객 관계 데이터로 교체
- `investors`를 13F, 기관 보유, ETF 비중 등으로 교체
- `initiatives`를 IR 자료, 10-Q, 8-K, 보도자료 추적 결과로 교체

브라우저에서 직접 호출하는 구조라서 SEC EDGAR처럼 CORS 제약이 있는 소스는 바로 붙이지 않았습니다. 그런 데이터는 나중에 간단한 서버 프록시나 Cloudflare Worker를 두면 연결하기 쉽습니다.
