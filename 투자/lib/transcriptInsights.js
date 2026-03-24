const THEME_LIBRARY = [
  {
    id: "demand",
    label: "Demand",
    terms: [
      "demand",
      "customer",
      "customers",
      "orders",
      "backlog",
      "adoption",
      "pipeline",
      "usage",
      "consumption",
      "growth",
    ],
    highlight: "수요, 고객 도입, backlog 관련 언급 비중이 높았습니다.",
    watch: "실수요가 지속되는지와 backlog가 실제 매출로 전환되는지 확인이 필요합니다.",
  },
  {
    id: "product",
    label: "Product",
    terms: [
      "product",
      "roadmap",
      "platform",
      "software",
      "launch",
      "deployment",
      "feature",
      "model",
      "inference",
      "training",
    ],
    highlight: "제품 로드맵과 플랫폼 경쟁력 설명에 많은 시간이 배정됐습니다.",
    watch: "로드맵이 실제 고객 배치와 수익화 속도로 이어지는지 추적해야 합니다.",
  },
  {
    id: "margin",
    label: "Margin",
    terms: [
      "margin",
      "profitability",
      "gross margin",
      "operating margin",
      "opex",
      "efficiency",
      "cost",
      "costs",
      "expense",
      "expenses",
    ],
    highlight: "수익성, 운영 효율, 비용 구조 언급이 두드러졌습니다.",
    watch: "매출 성장과 함께 마진이 개선되는지, 아니면 투자 부담이 더 커지는지 확인해야 합니다.",
  },
  {
    id: "guidance",
    label: "Guidance",
    terms: [
      "guidance",
      "outlook",
      "forecast",
      "expect",
      "expecting",
      "next quarter",
      "full year",
      "fiscal year",
      "we see",
      "we expect",
    ],
    highlight: "가이던스와 다음 분기 전망이 핵심 해석 포인트였습니다.",
    watch: "발언 강도와 컨센서스 차이를 숫자로 다시 대조해볼 필요가 있습니다.",
  },
  {
    id: "capacity",
    label: "Capacity",
    terms: [
      "capacity",
      "supply",
      "constraint",
      "inventory",
      "availability",
      "utilization",
      "packaging",
      "lead time",
      "manufacturing",
      "throughput",
    ],
    highlight: "공급 제약, 생산능력, 인프라 병목이 중요한 변수로 보입니다.",
    watch: "수급 병목이 실적 timing을 좌우할 수 있어 capex와 공급 상황을 함께 봐야 합니다.",
  },
  {
    id: "capital",
    label: "Capital",
    terms: [
      "capex",
      "capital expenditure",
      "cash flow",
      "free cash flow",
      "buyback",
      "repurchase",
      "balance sheet",
      "liquidity",
      "shareholder",
      "dividend",
    ],
    highlight: "CAPEX, 현금흐름, 주주환원 등 자본 배분 주제가 반복되었습니다.",
    watch: "성장을 위한 투자와 주주환원 사이의 균형이 valuation에 영향을 줄 수 있습니다.",
  },
  {
    id: "risk",
    label: "Risk",
    terms: [
      "risk",
      "uncertain",
      "uncertainty",
      "headwind",
      "pressure",
      "competition",
      "regulation",
      "macro",
      "cautious",
      "challenging",
    ],
    highlight: "경쟁, 규제, 매크로 불확실성 같은 리스크 표현이 반복됐습니다.",
    watch: "리스크 표현 빈도가 높다면 기대치가 이미 앞서간 것은 아닌지 확인할 필요가 있습니다.",
  },
];

function countTermMatches(content, terms) {
  return terms.reduce((total, term) => {
    const pattern = new RegExp(term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "gi");
    const matches = content.match(pattern);
    return total + (matches?.length ?? 0);
  }, 0);
}

function buildThemeScores(content) {
  return THEME_LIBRARY.map((theme) => ({
    ...theme,
    count: countTermMatches(content, theme.terms),
  })).sort((left, right) => right.count - left.count);
}

function resolveTone(themeScores) {
  const bullishScore =
    getThemeCount(themeScores, "demand") +
    getThemeCount(themeScores, "product") +
    getThemeCount(themeScores, "margin");
  const cautionScore =
    getThemeCount(themeScores, "risk") +
    getThemeCount(themeScores, "capacity") +
    getThemeCount(themeScores, "capital");
  const guidanceScore = getThemeCount(themeScores, "guidance");

  if (cautionScore >= bullishScore * 0.95 && cautionScore > 0) return "Measured";
  if (guidanceScore > 0 && cautionScore > bullishScore * 0.65) return "Constructive";
  if (bullishScore > cautionScore * 1.7) return "Bullish";
  return "Constructive";
}

function getThemeCount(themeScores, id) {
  return themeScores.find((theme) => theme.id === id)?.count ?? 0;
}

function buildKeywordHeat(themeScores) {
  const topThemes = themeScores.filter((theme) => theme.count > 0).slice(0, 4);
  const max = topThemes[0]?.count ?? 1;

  if (!topThemes.length) {
    return [
      { label: "Demand", value: 48 },
      { label: "Guidance", value: 44 },
      { label: "Margin", value: 39 },
      { label: "Risk", value: 31 },
    ];
  }

  return topThemes.map((theme) => ({
    label: theme.label,
    value: Math.max(24, Math.round((theme.count / max) * 100)),
  }));
}

export function buildTranscriptInsights(transcript, company) {
  const content = String(transcript?.content ?? "").toLowerCase();
  const themeScores = buildThemeScores(content);
  const topThemes = themeScores.filter((theme) => theme.count > 0).slice(0, 3);
  const topThemeLabels = topThemes.map((theme) => theme.label);
  const lead = topThemes[0];
  const secondary = topThemes[1];
  const watchThemes = themeScores
    .filter((theme) => ["risk", "guidance", "capacity", "capital"].includes(theme.id))
    .filter((theme) => theme.count > 0)
    .slice(0, 2);
  const tone = resolveTone(themeScores);
  const quarterLabel = `${transcript.year} Q${transcript.quarter}`;
  const sourceDate = transcript.date ? ` · ${transcript.date}` : "";
  const summary = topThemes.length
    ? `${company.name}의 최근 실적 콜에서는 ${topThemeLabels.join(", ")} 축의 언급이 가장 많았습니다. 특히 ${
        lead?.label ?? "핵심 사업"
      } 중심의 메시지가 강했고, ${
        secondary?.label ?? "가이던스"
      } 관련 해석이 다음 체크포인트로 보입니다.`
    : `${company.name}의 최근 실적 콜 원문은 불러왔지만, 키워드 밀도가 뚜렷하지 않아 추가 해석이 필요합니다.`;

  const highlights = topThemes.length
    ? topThemes.map((theme) => theme.highlight)
    : [
        "원문은 로드되었지만, 핵심 키워드 분포가 뚜렷하지 않아 사람이 한 번 더 읽어보는 편이 좋습니다.",
        "가이던스와 리스크 표현의 강도를 함께 확인해야 합니다.",
        "숫자 지표와 컨퍼런스 콜 톤 사이의 괴리를 체크해야 합니다.",
      ];

  const watchItems = watchThemes.length
    ? watchThemes.map((theme) => theme.watch)
    : [
        "가이던스 방향성과 컨센서스 차이를 별도로 비교해보세요.",
        "수요 설명이 실제 매출/마진으로 이어지는지 다음 분기 수치로 확인해야 합니다.",
        "CAPEX나 공급 제약 같은 병목 요소를 함께 추적하세요.",
      ];

  const mainQuestion = watchThemes[0]?.label ?? secondary?.label ?? "Guidance";

  return {
    period: `${quarterLabel}${sourceDate}`,
    tone,
    summary,
    highlights,
    watchItems,
    keywordHeat: buildKeywordHeat(themeScores),
    panelNotes: [
      {
        title: "What mattered",
        body: topThemes.length
          ? `가장 강하게 감지된 축은 ${topThemeLabels.join(", ")} 입니다. 숫자 자체보다 이 축들이 얼마나 반복해서 강조됐는지를 빠르게 보여줍니다.`
          : "원문 기반으로 분석은 했지만, 특정 테마가 압도적으로 반복되지는 않았습니다.",
      },
      {
        title: "Model impact",
        body: lead
          ? `${lead.label} 관련 발언 비중이 높다면, 다음 모델 업데이트에서는 해당 세그먼트의 매출/마진/가이던스 가정을 먼저 점검하는 편이 좋습니다.`
          : "다음 모델 업데이트에서는 가이던스와 비용 구조부터 다시 확인하는 것이 좋습니다.",
      },
      {
        title: "Open question",
        body: `${mainQuestion} 축이 실제 숫자로 얼마나 검증되는지가 다음 실적 전까지의 핵심 질문입니다.`,
      },
    ],
    transcriptMeta: {
      source: "Financial Modeling Prep",
      year: transcript.year,
      quarter: transcript.quarter,
      date: transcript.date ?? "",
      analyzedAt: new Date().toISOString(),
    },
  };
}
