import {
  baseCompanies,
  detailTabs,
  mapLayout,
  relationPalette,
  sectorFilters,
  sectorPresets,
} from "./data/companies.js";
import {
  fetchBatchQuotes,
  fetchDailyEodChart,
  fetchTranscript,
  fetchTranscriptDates,
} from "./services/fmp.js";
import { buildTranscriptInsights } from "./lib/transcriptInsights.js";

const STORAGE_KEYS = {
  customCompanies: "investor-intel-custom-companies",
  pinnedCompanies: "investor-intel-pinned-companies",
  compareCompanies: "investor-intel-compare-companies",
  fmpApiKey: "investor-intel-fmp-api-key",
};

const DEMO_REFRESH_MS = 2600;
const LIVE_REFRESH_MS = 45000;
const CHART_CACHE_MS = 1000 * 60 * 10;
const TRANSCRIPT_CACHE_MS = 1000 * 60 * 60 * 6;

const state = {
  companies: [],
  activeCompanyId: null,
  activeSector: "All",
  activeView: "grid",
  activeChartRange: "1M",
  search: "",
  activeTab: "overview",
  activeSegmentId: null,
  pinnedIds: [],
  compareIds: [],
  showCompareTray: true,
  live: createDefaultLiveState(),
};

const runtime = {
  loopId: null,
};

const elements = {
  sidebar: document.querySelector("#sidebar"),
  header: document.querySelector("#workspace-header"),
  content: document.querySelector("#workspace-content"),
  detail: document.querySelector("#workspace-detail"),
};

function createLiveChannel(status, message, syncedAt = null) {
  return { status, message, syncedAt };
}

function createDefaultLiveState(apiKey = "") {
  const enabled = Boolean(apiKey.trim());

  return {
    apiKey,
    market: createLiveChannel(
      enabled ? "idle" : "demo",
      enabled
        ? "실시간 quote 연결을 시작할 준비가 되어 있습니다."
        : "API key를 넣으면 실시간 시세와 일봉 OHLC 차트로 전환됩니다."
    ),
    chart: createLiveChannel(
      enabled ? "idle" : "demo",
      enabled
        ? "활성 기업의 일봉 OHLC 차트를 불러올 준비가 되어 있습니다."
        : "활성 기업 차트는 데모 일봉 시계열을 사용 중입니다."
    ),
    transcript: createLiveChannel(
      enabled ? "idle" : "demo",
      enabled
        ? "Earnings 탭에서 최신 컨퍼런스 콜 transcript를 분석합니다."
        : "실적 콜 transcript 분석은 API key를 넣으면 활성화됩니다."
    ),
    capital: createLiveChannel(
      "static",
      "투자자/13F/기관 보유 실시간 연결은 다음 단계로 열어 둘 수 있습니다."
    ),
  };
}

function bootstrap() {
  const storedCustomCompanies = readStorage(STORAGE_KEYS.customCompanies, []);
  state.pinnedIds = readStorage(STORAGE_KEYS.pinnedCompanies, ["nvda", "msft"]);
  state.compareIds = readStorage(STORAGE_KEYS.compareCompanies, ["nvda", "msft"]);
  state.live = createDefaultLiveState(readStorage(STORAGE_KEYS.fmpApiKey, ""));
  state.companies = hydrateCompanies(storedCustomCompanies);
  state.activeCompanyId = state.companies[0]?.id ?? null;
  state.activeSegmentId = getActiveCompany()?.segments?.[0]?.id ?? null;

  bindEvents();
  renderApp();
  startDataLoop();
}

function hydrateCompanies(customCompanies) {
  const clonedBase = structuredClone(baseCompanies).map((company) =>
    prepareCompany({
      ...company,
      isCustom: false,
    })
  );

  const clonedCustom = customCompanies.map((company) =>
    prepareCompany({
      ...company,
      isCustom: true,
    })
  );

  return [...clonedBase, ...clonedCustom];
}

function prepareCompany(company) {
  if (!company.price) return company;

  if (!company.price.candles?.length) {
    company.price.candles = buildCandlesFromSeries(
      company.price.series ?? [],
      `${company.id}-${company.ticker}`,
      company.price.volatility ?? 0.8
    );
  }

  return company;
}

function rehydrateCompanyState() {
  const activeId = state.activeCompanyId;
  const activeSegmentId = state.activeSegmentId;

  state.companies = hydrateCompanies(getStoredCustomCompanies());

  if (!state.companies.some((company) => company.id === activeId)) {
    state.activeCompanyId = state.companies[0]?.id ?? null;
  }

  const activeCompany = getActiveCompany();
  state.activeSegmentId =
    activeCompany?.segments.some((segment) => segment.id === activeSegmentId)
      ? activeSegmentId
      : activeCompany?.segments[0]?.id ?? null;
}

function readStorage(key, fallback) {
  try {
    const parsed = JSON.parse(localStorage.getItem(key));
    return parsed ?? fallback;
  } catch {
    return fallback;
  }
}

function writeStorage(key, value) {
  localStorage.setItem(key, JSON.stringify(value));
}

function bindEvents() {
  document.addEventListener("click", handleClick);
  document.addEventListener("input", handleInput);
  document.addEventListener("submit", handleSubmit);
}

function handleClick(event) {
  const target = event.target.closest("[data-action]");
  if (!target) return;

  const { action, id, tab, segment, view, sector } = target.dataset;

  if (action === "select-company" && id) {
    state.activeCompanyId = id;
    state.activeTab = "overview";
    state.activeSegmentId = getCompanyById(id)?.segments?.[0]?.id ?? null;
    renderApp();
    maybeFetchActiveCompanyLiveData({ force: false, includeTranscript: false });
  }

  if (action === "toggle-pin" && id) {
    state.pinnedIds = toggleOrderedId(state.pinnedIds, id, 8);
    writeStorage(STORAGE_KEYS.pinnedCompanies, state.pinnedIds);
    renderApp();
  }

  if (action === "toggle-compare" && id) {
    state.compareIds = toggleOrderedId(state.compareIds, id, 3);
    writeStorage(STORAGE_KEYS.compareCompanies, state.compareIds);
    renderApp();
  }

  if (action === "set-tab" && tab) {
    state.activeTab = tab;
    renderDetail();
    if (tab === "earnings") {
      maybeFetchActiveCompanyLiveData({ force: false, includeTranscript: true });
    }
  }

  if (action === "set-segment" && segment) {
    state.activeSegmentId = segment;
    renderDetail();
  }

  if (action === "set-view" && view) {
    state.activeView = view;
    renderHeader();
    renderContent();
  }

  if (action === "set-chart-range" && view) {
    state.activeChartRange = view;
    renderDetail();
  }

  if (action === "set-sector" && sector) {
    state.activeSector = sector;
    renderHeader();
    renderContent();
  }

  if (action === "toggle-compare-tray") {
    state.showCompareTray = !state.showCompareTray;
    renderHeader();
    renderContent();
  }

  if (action === "remove-company" && id) {
    removeCustomCompany(id);
  }

  if (action === "sync-live") {
    syncLiveData({ force: true, includeTranscript: state.activeTab === "earnings" });
  }

  if (action === "clear-live-key") {
    clearLiveConfiguration();
  }
}

function handleInput(event) {
  if (event.target.matches("[data-role='search-input']")) {
    state.search = event.target.value.trim();
    renderContent();
  }
}

function handleSubmit(event) {
  if (event.target.matches("[data-role='api-form']")) {
    event.preventDefault();
    const formData = new FormData(event.target);
    const apiKey = String(formData.get("apiKey") ?? "").trim();
    state.live = createDefaultLiveState(apiKey);
    writeStorage(STORAGE_KEYS.fmpApiKey, apiKey);
    rehydrateCompanyState();
    renderApp();
    startDataLoop();
    return;
  }

  if (!event.target.matches("[data-role='company-form']")) return;
  event.preventDefault();

  const formData = new FormData(event.target);
  const name = sanitizeUserText(formData.get("name"));
  const ticker = sanitizeTicker(formData.get("ticker"));
  const sector = sanitizeUserText(formData.get("sector")) || "AI Infra";
  const thesis = sanitizeUserText(formData.get("thesis"));

  if (!name || !ticker || !thesis) return;

  const newCompany = createCustomCompany({
    name,
    ticker,
    sector,
    thesis,
  });

  const storedCustomCompanies = getStoredCustomCompanies();
  storedCustomCompanies.unshift(newCompany);
  writeStorage(STORAGE_KEYS.customCompanies, storedCustomCompanies);

  state.companies = hydrateCompanies(storedCustomCompanies);
  state.activeCompanyId = newCompany.id;
  state.activeSegmentId = newCompany.segments[0].id;
  state.pinnedIds = toggleOrderedId(state.pinnedIds, newCompany.id, 8);
  writeStorage(STORAGE_KEYS.pinnedCompanies, state.pinnedIds);
  event.target.reset();
  renderApp();

  if (hasLiveApiKey()) {
    syncMarketData({ force: true, silent: false });
    syncActiveCompanyChart({ force: true, silent: false });
  }
}

function sanitizeUserText(value) {
  return String(value ?? "").trim().replace(/[<>]/g, "");
}

function sanitizeTicker(value) {
  return String(value ?? "")
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9.\-]/g, "")
    .slice(0, 10);
}

function clearLiveConfiguration() {
  localStorage.removeItem(STORAGE_KEYS.fmpApiKey);
  state.live = createDefaultLiveState("");
  rehydrateCompanyState();
  renderApp();
  startDataLoop();
}

function removeCustomCompany(id) {
  const storedCustomCompanies = getStoredCustomCompanies().filter(
    (company) => company.id !== id
  );
  writeStorage(STORAGE_KEYS.customCompanies, storedCustomCompanies);

  state.pinnedIds = state.pinnedIds.filter((entry) => entry !== id);
  state.compareIds = state.compareIds.filter((entry) => entry !== id);
  writeStorage(STORAGE_KEYS.pinnedCompanies, state.pinnedIds);
  writeStorage(STORAGE_KEYS.compareCompanies, state.compareIds);

  state.companies = hydrateCompanies(storedCustomCompanies);
  const fallbackId = state.companies[0]?.id ?? null;
  if (state.activeCompanyId === id) {
    state.activeCompanyId = fallbackId;
    state.activeSegmentId = getActiveCompany()?.segments?.[0]?.id ?? null;
  }

  renderApp();
  maybeFetchActiveCompanyLiveData({ force: false, includeTranscript: false });
}

function getStoredCustomCompanies() {
  return readStorage(STORAGE_KEYS.customCompanies, []);
}

function createCustomCompany({ name, ticker, sector, thesis }) {
  const preset = sectorPresets[sector] ?? sectorPresets["AI Infra"];
  const id = `${ticker.toLowerCase()}-${Date.now().toString(36)}`;
  const seed = hashString(`${name}${ticker}${sector}`);
  const current = Number((48 + (seed % 140) + ((seed % 17) / 10)).toFixed(1));
  const baseStart = current - 6.3;
  const priceSeries = Array.from({ length: 14 }, (_, index) => {
    const wave = Math.sin((index + (seed % 7)) / 2.4) * 1.1;
    const value = Number((baseStart + index * 0.45 + wave).toFixed(1));
    return {
      label: [
        "09:30",
        "10:00",
        "10:30",
        "11:00",
        "11:30",
        "12:00",
        "12:30",
        "13:00",
        "13:30",
        "14:00",
        "14:30",
        "15:00",
        "15:30",
        "16:00",
      ][index],
      value,
    };
  });

  const peers = state.companies.filter((company) => company.sector === sector).slice(0, 3);

  return prepareCompany({
    id,
    name,
    ticker,
    country: "Custom",
    sector,
    maturity: "User watchlist",
    marketCapLabel: "Custom profile",
    thesis,
    price: {
      current,
      drift: 0.12 + (seed % 8) / 100,
      volatility: 0.6 + (seed % 6) / 10,
      series: priceSeries,
    },
    summaryMetrics: [
      { label: "Setup", value: "User-defined" },
      { label: "Theme", value: preset.headline },
      { label: "Status", value: "Needs live feed" },
    ],
    segments: preset.segments.map((segmentName, index) => ({
      id: `${id}-segment-${index + 1}`,
      name: segmentName,
      metricLabel: "Focus",
      metricValue:
        index === 0 ? "Primary" : index === 1 ? "Secondary" : "Optionality",
      note:
        index === 0
          ? `${name}에서 가장 먼저 추적할 축입니다.`
          : index === 1
            ? `${name}의 실행력과 수익화 속도를 확인하기 좋은 축입니다.`
            : `${name}의 장기 선택지를 정리하는 축입니다.`,
      series: Array.from({ length: 8 }, (_, pointIndex) => ({
        label: ["Q1", "Q2", "Q3", "Q4", "Q1", "Q2", "Q3", "Q4"][pointIndex],
        value: Number(
          (
            12 +
            index * 6 +
            pointIndex * (1.5 + index) +
            Math.sin((seed + pointIndex) / 3) * 1.4
          ).toFixed(1)
        ),
      })),
    })),
    earnings: {
      period: "Custom template",
      tone: "Needs review",
      summary:
        `${name}의 최근 실적 콜 핵심 메시지를 넣으면 여기에서 요약, 리스크, 가이던스 해석을 한 번에 볼 수 있게 설계되어 있습니다.`,
      highlights: [
        `${name}의 최근 매출/수요 포인트를 정리하세요.`,
        "가이던스 상향 또는 보수적 스탠스를 기록하세요.",
        "시장 기대와 실제 발언의 차이를 메모하세요.",
      ],
      watchItems: [
        "실적 콜 원문 연결 필요",
        "세그먼트별 KPI 연결 필요",
        "가이던스 대비 시장 컨센서스 비교 필요",
      ],
      keywordHeat: [
        { label: "Demand", value: 52 },
        { label: "Margin", value: 41 },
        { label: "Capacity", value: 38 },
        { label: "Guidance", value: 47 },
      ],
      panelNotes: [
        {
          title: "What mattered",
          body: `${name}에서 가장 중요한 발언을 2~3줄로 요약하도록 비워 둔 자리입니다.`,
        },
        {
          title: "Model impact",
          body: "EPS, 매출, 멀티플 중 어디에 가장 큰 영향을 주는지 적어두면 좋습니다.",
        },
        {
          title: "Open question",
          body: "다음 분기까지 꼭 확인할 질문을 남겨두세요.",
        },
      ],
    },
    relationships: peers.map((peer, index) => ({
      targetId: peer.id,
      type: index === 0 ? "Peer" : index === 1 ? "Partner" : "Competitor",
      strength: 44 + index * 11,
      note:
        index === 0
          ? `${peer.name}와 같은 섹터 비교 대상으로 자동 연결되었습니다.`
          : `${peer.name}와의 공급망/고객/경쟁 관계를 여기에 구체화하면 됩니다.`,
    })),
    investors: [
      {
        name: "Track top holders",
        role: "Capital watch",
        note: "13F, 기관 보유, ETF 비중을 연결하면 됩니다.",
      },
      {
        name: "Strategic partners",
        role: "Signal source",
        note: "투자자가 아니라도 수요/고객/파트너가 더 중요한 경우가 많습니다.",
      },
      {
        name: "User notes",
        role: "Manual intelligence",
        note: "중요 투자자나 펀드, 창업자 매도/매수 흐름을 여기에 적을 수 있습니다.",
      },
    ],
    initiatives: [
      {
        title: "Core execution track",
        stage: "To define",
        part: preset.segments[0],
        detail: "가장 중요한 신제품/고객사/공장/플랫폼 로드맵을 여기에 기록하세요.",
      },
      {
        title: "Revenue unlock",
        stage: "To define",
        part: preset.segments[1],
        detail: "실적에 영향을 줄 신규 계약, 가격 정책, 파트너십을 추적하세요.",
      },
      {
        title: "Longer-term option",
        stage: "To define",
        part: preset.segments[2],
        detail: "장기적으로 valuation re-rate를 만들 수 있는 선택지를 정리하세요.",
      },
    ],
  });
}

function hashString(value) {
  return value.split("").reduce((acc, character) => acc + character.charCodeAt(0), 0);
}

function toggleOrderedId(entries, id, limit) {
  if (entries.includes(id)) {
    return entries.filter((entry) => entry !== id);
  }

  const next = [...entries, id];
  return next.slice(-limit);
}

function hasLiveApiKey() {
  return Boolean(state.live.apiKey.trim());
}

function startDataLoop() {
  stopDataLoop();

  if (hasLiveApiKey()) {
    runtime.loopId = window.setInterval(() => {
      syncMarketData({ force: false, silent: true });
      syncActiveCompanyChart({ force: false, silent: true });
    }, LIVE_REFRESH_MS);

    syncLiveData({ force: true, includeTranscript: state.activeTab === "earnings" });
    return;
  }

  state.live = createDefaultLiveState("");
  runtime.loopId = window.setInterval(() => {
    state.companies.forEach((company) => {
      tickCompanyPrice(company);
    });
    renderContent();
    renderDetail();
  }, DEMO_REFRESH_MS);
}

function stopDataLoop() {
  if (runtime.loopId) {
    window.clearInterval(runtime.loopId);
    runtime.loopId = null;
  }
}

function tickCompanyPrice(company) {
  const series = company.price.series;
  const last = series.at(-1)?.value ?? company.price.current;
  const drift = company.price.drift ?? 0.1;
  const volatility = company.price.volatility ?? 0.8;
  const wobble =
    Math.sin(Date.now() / 6000 + hashString(company.id)) * (volatility / 2.8);
  const direction = drift * (0.8 + Math.random() * 0.5);
  const nextValue = Number(
    Math.max(1, last + wobble * 0.2 + direction * 0.3 - volatility * 0.04).toFixed(1)
  );
  const nextLabel = nextIntradayLabel(series.at(-1)?.label ?? "16:00");
  series.push({ label: nextLabel, value: nextValue });
  if (series.length > 14) series.shift();
  company.price.current = nextValue;
  company.price.candles = buildCandlesFromSeries(
    series,
    `${company.id}-${company.ticker}`,
    company.price.volatility ?? 0.8
  );
}

function nextIntradayLabel(label) {
  const hour = Number(label.split(":")[0]);
  const minute = Number(label.split(":")[1]);
  const nextMinute = minute + 30;
  const computedHour = hour + Math.floor(nextMinute / 60);
  const computedMinute = nextMinute % 60;

  return `${String(
    computedHour > 16 ? 9 + ((computedHour - 17) % 8) : computedHour
  ).padStart(2, "0")}:${String(computedMinute).padStart(2, "0")}`;
}

function updateLiveChannel(channel, status, message, syncedAt = null) {
  state.live[channel] = createLiveChannel(status, message, syncedAt);
}

function safeRenderHeader() {
  if (document.activeElement?.matches?.("[data-role='search-input']")) return;
  renderHeader();
}

function maybeFetchActiveCompanyLiveData({
  force = false,
  includeTranscript = false,
} = {}) {
  if (!hasLiveApiKey()) return;

  syncActiveCompanyChart({ force, silent: false });

  if (includeTranscript) {
    syncActiveCompanyTranscript({ force, silent: false });
  }
}

async function syncLiveData({ force = false, includeTranscript = false } = {}) {
  await syncMarketData({ force, silent: false });
  await syncActiveCompanyChart({ force, silent: false });

  if (includeTranscript) {
    await syncActiveCompanyTranscript({ force, silent: false });
  }
}

async function syncMarketData({ force = false, silent = false } = {}) {
  if (!hasLiveApiKey()) return;

  const symbols = state.companies.map((company) => company.ticker).filter(Boolean);
  if (!symbols.length) return;

  if (!silent || force) {
    updateLiveChannel("market", "loading", "FMP quote 데이터를 동기화하고 있습니다.");
    renderSidebar();
  }

  try {
    const { quotes, source } = await fetchBatchQuotes(symbols, state.live.apiKey);

    if (!quotes.length) {
      throw new Error("quote 응답이 비어 있습니다.");
    }

    const now = new Date().toISOString();
    const quoteMap = new Map(quotes.map((quote) => [quote.symbol, quote]));

    state.companies.forEach((company) => {
      const quote = quoteMap.get(company.ticker.toUpperCase());
      if (!quote) return;
      applyLiveQuote(company, quote, now, source);
    });

    updateLiveChannel(
      "market",
      "live",
      `${quotes.length}/${symbols.length}개 종목을 실시간 quote로 동기화했습니다. source: ${source}.`,
      now
    );

    renderSidebar();
    safeRenderHeader();
    renderContent();
    renderDetail();
  } catch (error) {
    updateLiveChannel(
      "market",
      "error",
      `시세 연결 실패: ${resolveErrorMessage(error)}`
    );
    renderSidebar();
  }
}

function applyLiveQuote(company, quote, syncedAt, source = "unknown") {
  company.liveQuote = {
    ...quote,
    source,
    syncedAt,
  };

  if (Number.isFinite(quote.price) && quote.price > 0) {
    company.price.current = quote.price;

    if (!company.liveChart?.series?.length) {
      company.price.series = injectLivePricePoint(company.price.series, quote.price);
      company.price.candles = buildCandlesFromSeries(
        company.price.series,
        `${company.id}-${company.ticker}`,
        company.price.volatility ?? 0.8
      );
    }
  }
}

function injectLivePricePoint(series, price) {
  const trimmed = series.slice(-13).map((point) => ({ ...point }));
  trimmed.push({
    label: new Date().toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
      timeZone: "America/New_York",
    }),
    value: Number(price.toFixed(2)),
  });
  return trimmed;
}

async function syncActiveCompanyChart({ force = false, silent = false } = {}) {
  if (!hasLiveApiKey()) return;

  const company = getActiveCompany();
  if (!company) return;

  const previousSync = company.liveChart?.syncedAt
    ? new Date(company.liveChart.syncedAt).getTime()
    : 0;
  const isFresh = previousSync && Date.now() - previousSync < CHART_CACHE_MS;

  if (!force && isFresh) return;

  if (!silent || force) {
    updateLiveChannel(
      "chart",
      "loading",
      `${company.ticker} 일봉 OHLC 차트를 불러오는 중입니다.`
    );
    renderSidebar();
    renderDetail();
  }

  try {
    const chartSeries = await fetchDailyEodChart(company.ticker, state.live.apiKey, 220);

    if (!chartSeries.length) {
      throw new Error("일봉 차트 응답이 비어 있습니다.");
    }

    const now = new Date().toISOString();
    const normalizedCandles = chartSeries.map((point) => ({ ...point }));
    const quote = company.liveQuote;

    if (quote && normalizedCandles.length) {
      const lastIndex = normalizedCandles.length - 1;
      const lastBar = normalizedCandles[lastIndex];
      const latestLabel = formatLatestDailyLabel();
      normalizedCandles[lastIndex] = {
        ...lastBar,
        date: getTodayNyDate(),
        label: latestLabel,
        open: quote.open > 0 ? Number(quote.open.toFixed(2)) : lastBar.open,
        high: quote.dayHigh > 0 ? Number(quote.dayHigh.toFixed(2)) : lastBar.high,
        low: quote.dayLow > 0 ? Number(quote.dayLow.toFixed(2)) : lastBar.low,
        close: quote.price > 0 ? Number(quote.price.toFixed(2)) : lastBar.close,
        value: quote.price > 0 ? Number(quote.price.toFixed(2)) : lastBar.value,
        volume: quote.volume > 0 ? quote.volume : lastBar.volume,
      };
    }

    company.liveChart = {
      series: normalizedCandles,
      syncedAt: now,
      source: "FMP Daily OHLC",
    };
    company.price.series = normalizedCandles.map((point) => ({
      label: point.label,
      value: point.close,
    }));
    company.price.candles = normalizedCandles.map((point) => ({
      label: point.label,
      open: point.open,
      high: point.high,
      low: point.low,
      close: point.close,
      volume: point.volume,
      date: point.date,
    }));
    company.price.current =
      company.liveQuote?.price ??
      normalizedCandles.at(-1)?.value ??
      company.price.current;

    updateLiveChannel(
      "chart",
      "live",
      `${company.ticker} 일봉 OHLC 차트를 동기화했습니다.`,
      now
    );

    renderSidebar();
    renderContent();
    renderDetail();
  } catch (error) {
    updateLiveChannel(
      "chart",
      "error",
      `차트 연결 실패: ${resolveErrorMessage(error)}`
    );
    renderSidebar();
    renderDetail();
  }
}

async function syncActiveCompanyTranscript({ force = false, silent = false } = {}) {
  if (!hasLiveApiKey()) return;

  const company = getActiveCompany();
  if (!company) return;

  const previousAnalysis = company.liveEarnings?.transcriptMeta?.analyzedAt
    ? new Date(company.liveEarnings.transcriptMeta.analyzedAt).getTime()
    : 0;
  const isFresh = previousAnalysis && Date.now() - previousAnalysis < TRANSCRIPT_CACHE_MS;

  if (!force && isFresh) return;

  if (!silent || force) {
    updateLiveChannel(
      "transcript",
      "loading",
      `${company.ticker} 실적 콜 transcript를 분석하고 있습니다.`
    );
    renderSidebar();
    renderDetail();
  }

  try {
    const transcriptDates = await fetchTranscriptDates(company.ticker, state.live.apiKey);
    const latest = pickLatestTranscriptDate(transcriptDates);

    if (!latest) {
      throw new Error("사용 가능한 earnings transcript가 없습니다.");
    }

    const transcript = await fetchTranscript(
      company.ticker,
      latest.year,
      latest.quarter,
      state.live.apiKey
    );

    if (!transcript?.content) {
      throw new Error("transcript 원문이 비어 있습니다.");
    }

    const analyzed = buildTranscriptInsights(transcript, company);
    company.liveEarnings = analyzed;

    updateLiveChannel(
      "transcript",
      "live",
      `${company.ticker} ${latest.year} Q${latest.quarter} transcript 분석을 완료했습니다.`,
      analyzed.transcriptMeta.analyzedAt
    );

    renderSidebar();
    renderDetail();
  } catch (error) {
    updateLiveChannel(
      "transcript",
      "error",
      `실적 콜 연결 실패: ${resolveErrorMessage(error)}`
    );
    renderSidebar();
    renderDetail();
  }
}

function pickLatestTranscriptDate(entries) {
  return [...entries].sort((left, right) => {
    const leftScore = new Date(left.date || 0).getTime() || left.year * 10 + left.quarter;
    const rightScore =
      new Date(right.date || 0).getTime() || right.year * 10 + right.quarter;
    return rightScore - leftScore;
  })[0];
}

function resolveErrorMessage(error) {
  return error instanceof Error ? error.message : "알 수 없는 오류";
}

function getActiveCompany() {
  return getCompanyById(state.activeCompanyId);
}

function getCompanyById(id) {
  return state.companies.find((company) => company.id === id);
}

function getVisibleCompanies() {
  const search = state.search.toLowerCase();
  return state.companies.filter((company) => {
    const matchesSector =
      state.activeSector === "All" || company.sector === state.activeSector;
    const matchesSearch =
      !search ||
      `${company.name} ${company.ticker} ${company.sector} ${company.thesis}`
        .toLowerCase()
        .includes(search);
    return matchesSector && matchesSearch;
  });
}

function getDisplayEarnings(company) {
  return company.liveEarnings ?? company.earnings;
}

function renderApp() {
  const activeCompany = getActiveCompany();

  if (!activeCompany && state.companies.length) {
    state.activeCompanyId = state.companies[0].id;
    state.activeSegmentId = state.companies[0].segments[0].id;
  }

  if (
    activeCompany &&
    !activeCompany.segments.some((segment) => segment.id === state.activeSegmentId)
  ) {
    state.activeSegmentId = activeCompany.segments[0].id;
  }

  renderSidebar();
  renderHeader();
  renderContent();
  renderDetail();
}

function renderSidebar() {
  const pinnedCompanies = state.pinnedIds
    .map((id) => getCompanyById(id))
    .filter(Boolean);
  const compareCompanies = state.compareIds
    .map((id) => getCompanyById(id))
    .filter(Boolean);

  elements.sidebar.innerHTML = `
    <div class="panel intro-panel">
      <div class="eyebrow">Investor Intelligence Map</div>
      <h1>실시간 시세와 실적 콜이 붙는 주식 맵</h1>
      <p class="muted">
        지금은 ${
          hasLiveApiKey() ? "FMP live mode" : "demo mode"
        } 입니다. 시세는 공식 quote, 차트는 daily OHLC endpoint, 실적 분석은 earnings transcript endpoint를 사용하도록 연결했습니다.
      </p>
      <div class="status-grid">
        ${renderStatus(
          "Market feed",
          getStatusLabel(state.live.market.status),
          buildStatusDescription(state.live.market),
          state.live.market.status
        )}
        ${renderStatus(
          "Intraday chart",
          getStatusLabel(state.live.chart.status),
          buildStatusDescription(state.live.chart),
          state.live.chart.status
        )}
        ${renderStatus(
          "Earnings NLP",
          getStatusLabel(state.live.transcript.status),
          buildStatusDescription(state.live.transcript),
          state.live.transcript.status
        )}
        ${renderStatus(
          "Capital lens",
          getStatusLabel(state.live.capital.status),
          buildStatusDescription(state.live.capital),
          state.live.capital.status
        )}
      </div>
    </div>

    <div class="panel api-panel">
      <div class="section-heading">
        <h2>Live Data Setup</h2>
        <span class="pill ${hasLiveApiKey() ? "" : "subtle"}">${
          hasLiveApiKey() ? "FMP Connected" : "Demo Mode"
        }</span>
      </div>
      <p class="muted">
        브라우저에서 바로 동작하도록 Financial Modeling Prep 공식 API를 연결했습니다. 키는 이 브라우저의 localStorage에만 저장됩니다.
      </p>
      <form data-role="api-form" class="company-form api-form">
        <label>
          <span>FMP API Key</span>
          <input
            name="apiKey"
            type="password"
            placeholder="apikey를 입력하세요"
            value="${escapeAttribute(state.live.apiKey)}"
            autocomplete="off"
          />
        </label>
        <div class="api-actions">
          <button type="submit" class="primary-button">저장하고 연결</button>
          <button type="button" class="ghost-button" data-action="sync-live">지금 동기화</button>
          <button type="button" class="ghost-button danger" data-action="clear-live-key">키 제거</button>
        </div>
      </form>
      <div class="api-helper">
        사용 endpoint:
        <code>batch-quote</code>,
        <code>historical-price-eod/full</code>,
        <code>earning-call-transcript-dates</code>,
        <code>earning-call-transcript</code>
      </div>
    </div>

    <div class="panel form-panel">
      <div class="section-heading">
        <h2>기업 추가</h2>
        <span class="pill subtle">Custom</span>
      </div>
      <p class="muted">회사명, 티커, 섹터, 핵심 투자 포인트만 넣으면 맵에 바로 올라갑니다.</p>
      <form data-role="company-form" class="company-form">
        <label>
          <span>Company</span>
          <input name="name" type="text" placeholder="예: Broadcom" required />
        </label>
        <label>
          <span>Ticker</span>
          <input name="ticker" type="text" placeholder="AVGO" maxlength="10" required />
        </label>
        <label>
          <span>Sector</span>
          <select name="sector">
            ${sectorFilters
              .filter((sector) => sector !== "All")
              .map((sector) => `<option value="${sector}">${sector}</option>`)
              .join("")}
          </select>
        </label>
        <label>
          <span>Thesis</span>
          <textarea
            name="thesis"
            rows="4"
            placeholder="왜 이 회사를 추적하는지, 무엇을 확인하고 싶은지 적어주세요."
            required
          ></textarea>
        </label>
        <button type="submit" class="primary-button">맵에 추가</button>
      </form>
    </div>

    <div class="panel watchlist-panel">
      <div class="section-heading">
        <h2>핀한 기업</h2>
        <span class="pill">${pinnedCompanies.length}</span>
      </div>
      <div class="chip-cloud">
        ${
          pinnedCompanies.length
            ? pinnedCompanies
                .map(
                  (company) => `
                    <button class="ticker-chip" data-action="select-company" data-id="${company.id}">
                      <strong>${company.ticker}</strong>
                      <span>${company.name}</span>
                    </button>
                  `
                )
                .join("")
            : `<div class="empty-state">카드의 Pin 버튼으로 기업을 고정해 둘 수 있어요.</div>`
        }
      </div>
    </div>

    <div class="panel compare-panel">
      <div class="section-heading">
        <h2>비교 바구니</h2>
        <span class="pill">${compareCompanies.length}/3</span>
      </div>
      ${
        compareCompanies.length
          ? compareCompanies
              .map(
                (company) => `
                  <div class="compare-row">
                    <button data-action="select-company" data-id="${company.id}">
                      <strong>${company.name}</strong>
                      <span>${company.summaryMetrics[1].value}</span>
                    </button>
                    <button class="ghost-button" data-action="toggle-compare" data-id="${company.id}">
                      제거
                    </button>
                  </div>
                `
              )
              .join("")
          : `<div class="empty-state">카드의 Compare 버튼으로 최대 3개 기업을 올릴 수 있습니다.</div>`
      }
    </div>
  `;
}

function renderHeader() {
  const visibleCompanies = getVisibleCompanies();
  const marketSummary = hasLiveApiKey()
    ? state.live.market.syncedAt
      ? `${visibleCompanies.length}개 기업 표시 중. 마지막 시세 동기화 ${formatSyncTime(
          state.live.market.syncedAt
        )}.`
      : `${visibleCompanies.length}개 기업 표시 중. 실시간 시세 연결을 준비 중입니다.`
    : `${visibleCompanies.length}개 기업 표시 중. 현재는 데모 가격 스트림이 자동 업데이트됩니다.`;

  elements.header.innerHTML = `
    <div class="panel header-panel">
      <div class="header-top">
        <div>
          <div class="eyebrow">Dashboard</div>
          <h2>Stock Map Workspace</h2>
          <p class="muted">${marketSummary}</p>
        </div>
        <div class="header-actions">
          <div class="view-toggle">
            <button class="${state.activeView === "grid" ? "active" : ""}" data-action="set-view" data-view="grid">Cards</button>
            <button class="${state.activeView === "map" ? "active" : ""}" data-action="set-view" data-view="map">Map</button>
          </div>
          <button class="secondary-button" data-action="toggle-compare-tray">
            ${state.showCompareTray ? "Hide Compare" : "Show Compare"}
          </button>
        </div>
      </div>
      <div class="toolbar">
        <label class="search-field">
          <span>Search</span>
          <input
            data-role="search-input"
            type="search"
            placeholder="기업명, 티커, 섹터 검색"
            value="${escapeAttribute(state.search)}"
          />
        </label>
        <div class="filter-row">
          ${sectorFilters
            .map(
              (sector) => `
                <button
                  class="filter-pill ${state.activeSector === sector ? "active" : ""}"
                  data-action="set-sector"
                  data-sector="${sector}"
                >
                  ${sector}
                </button>
              `
            )
            .join("")}
        </div>
      </div>
    </div>
  `;
}

function renderContent() {
  const visibleCompanies = getVisibleCompanies();

  elements.content.innerHTML = `
    ${state.showCompareTray ? renderCompareTray() : ""}
    ${
      state.activeView === "grid"
        ? renderCardGrid(visibleCompanies)
        : renderNetworkWorkspace(visibleCompanies)
    }
  `;
}

function renderCompareTray() {
  const compareCompanies = state.compareIds
    .map((id) => getCompanyById(id))
    .filter(Boolean);

  if (!compareCompanies.length) {
    return `
      <div class="panel compare-tray">
        <div class="tray-empty">아직 비교 대상이 없습니다. 카드의 Compare 버튼을 눌러 최대 3개까지 담아보세요.</div>
      </div>
    `;
  }

  return `
    <div class="panel compare-tray">
      <div class="section-heading">
        <h3>Quick Compare</h3>
        <span class="pill">${compareCompanies.length}</span>
      </div>
      <div class="compare-grid">
        ${compareCompanies
          .map((company) => {
            const priceDelta = getPriceDelta(company);
            return `
              <article class="compare-card">
                <header>
                  <button data-action="select-company" data-id="${company.id}">
                    <strong>${company.name}</strong>
                    <span>${company.ticker}</span>
                  </button>
                  <button class="ghost-button small" data-action="toggle-compare" data-id="${company.id}">Remove</button>
                </header>
                <div class="compare-price-row">
                  <div class="price-tag">${formatDisplayPrice(company.price.current, { live: Boolean(company.liveQuote) })}</div>
                  <div class="delta-tag ${priceDelta >= 0 ? "positive" : "negative"}">
                    ${formatPercentValue(priceDelta)}
                  </div>
                </div>
                <div class="compare-metric-list">
                  ${company.summaryMetrics
                    .map(
                      (metric) => `
                        <div class="mini-metric">
                          <span>${metric.label}</span>
                          <strong>${metric.value}</strong>
                        </div>
                      `
                    )
                    .join("")}
                </div>
              </article>
            `;
          })
          .join("")}
      </div>
    </div>
  `;
}

function renderCardGrid(companies) {
  if (!companies.length) {
    return `
      <div class="panel empty-board">
        <h3>검색 결과가 없습니다.</h3>
        <p class="muted">검색어를 바꾸거나 왼쪽 폼으로 직접 기업을 추가해보세요.</p>
      </div>
    `;
  }

  return `
    <div class="card-grid">
      ${companies
        .map((company, index) => {
          const priceDelta = getPriceDelta(company);
          const isPinned = state.pinnedIds.includes(company.id);
          const isCompared = state.compareIds.includes(company.id);
          const isActive = state.activeCompanyId === company.id;
          const sourceLabel = company.liveQuote ? "Live" : "Demo";

          return `
            <article class="panel company-card ${isActive ? "active" : ""}">
              <div class="card-top">
                <div class="card-rank">#${index + 1}</div>
                <div class="card-pill-row">
                  <div class="pill subtle">${company.sector}</div>
                  <div class="pill ${company.liveQuote ? "" : "subtle"}">${sourceLabel}</div>
                </div>
              </div>
              <button class="card-company" data-action="select-company" data-id="${company.id}">
                <div class="card-heading">
                  <div>
                    <h3>${company.name}</h3>
                    <div class="ticker-line">${company.ticker} · ${company.marketCapLabel}</div>
                  </div>
                  <div class="price-cluster">
                    <strong>${formatDisplayPrice(company.price.current, { live: Boolean(company.liveQuote) })}</strong>
                    <span class="${priceDelta >= 0 ? "positive" : "negative"}">
                      ${formatPercentValue(priceDelta)}
                    </span>
                  </div>
                </div>
                <p class="card-thesis">${company.thesis}</p>
                <div class="sparkline">
                  ${renderLineChart(company.price.series, { compact: true, stroke: "#3dd9a5" })}
                </div>
              </button>
              <div class="metric-stack">
                ${company.summaryMetrics
                  .map(
                    (metric) => `
                      <div class="metric-row">
                        <span>${metric.label}</span>
                        <strong>${metric.value}</strong>
                      </div>
                    `
                  )
                  .join("")}
              </div>
              <div class="card-actions">
                <button class="ghost-button" data-action="toggle-pin" data-id="${company.id}">
                  ${isPinned ? "Unpin" : "Pin"}
                </button>
                <button class="ghost-button" data-action="toggle-compare" data-id="${company.id}">
                  ${isCompared ? "Compared" : "Compare"}
                </button>
              </div>
            </article>
          `;
        })
        .join("")}
    </div>
  `;
}

function renderNetworkWorkspace(companies) {
  if (!companies.length) {
    return `
      <div class="panel empty-board">
        <h3>맵에 표시할 기업이 없습니다.</h3>
        <p class="muted">필터를 바꾸거나 검색어를 초기화해보세요.</p>
      </div>
    `;
  }

  const positions = buildVisibleMapPositions(companies);
  const links = buildVisibleLinks(companies);

  return `
    <div class="panel map-panel">
      <div class="section-heading">
        <h3>Relationship Map</h3>
        <span class="pill">${companies.length} nodes</span>
      </div>
      <p class="muted">
        관계 맵은 아직 정적 데이터 중심이지만, 실시간 시세는 카드와 상세 패널에 바로 반영됩니다.
      </p>
      <div class="map-canvas">
        <svg viewBox="0 0 1000 620" role="img" aria-label="Company relationship map">
          <defs>
            <linearGradient id="mapEdge" x1="0%" x2="100%">
              <stop offset="0%" stop-color="#2dd49c" stop-opacity="0.65"></stop>
              <stop offset="100%" stop-color="#0fb0ff" stop-opacity="0.25"></stop>
            </linearGradient>
          </defs>
          ${links
            .map((link) => {
              const source = positions[link.sourceId];
              const target = positions[link.targetId];
              return `
                <line
                  x1="${source.x}"
                  y1="${source.y}"
                  x2="${target.x}"
                  y2="${target.y}"
                  stroke="${relationPalette[link.type] ?? "url(#mapEdge)"}"
                  stroke-width="${1 + link.strength / 32}"
                  stroke-opacity="0.42"
                />
              `;
            })
            .join("")}
          ${companies
            .map((company) => {
              const node = positions[company.id];
              const isActive = company.id === state.activeCompanyId;
              return `
                <g class="map-node-group ${isActive ? "is-active" : ""}">
                  <circle
                    cx="${node.x}"
                    cy="${node.y}"
                    r="${isActive ? 48 : 38}"
                    fill="${isActive ? "rgba(54, 223, 163, 0.24)" : "rgba(14, 21, 23, 0.82)"}"
                    stroke="${isActive ? "#44e6af" : "rgba(255,255,255,0.1)"}"
                    stroke-width="${isActive ? 2 : 1.2}"
                  ></circle>
                  <text x="${node.x}" y="${node.y - 6}" text-anchor="middle" class="map-node-title">${company.ticker}</text>
                  <text x="${node.x}" y="${node.y + 16}" text-anchor="middle" class="map-node-subtitle">${company.sector}</text>
                  <foreignObject x="${node.x - 55}" y="${node.y - 55}" width="110" height="110">
                    <button class="map-node-button" data-action="select-company" data-id="${company.id}" aria-label="${company.name} 선택"></button>
                  </foreignObject>
                </g>
              `;
            })
            .join("")}
        </svg>
      </div>
      <div class="legend-row">
        ${Object.entries(relationPalette)
          .map(
            ([label, color]) => `
              <div class="legend-item">
                <span class="legend-dot" style="background:${color}"></span>
                <span>${label}</span>
              </div>
            `
          )
          .join("")}
      </div>
    </div>
  `;
}

function renderDetail() {
  const company = getActiveCompany();
  if (!company) {
    elements.detail.innerHTML = "";
    return;
  }

  const activeSegment =
    company.segments.find((segment) => segment.id === state.activeSegmentId) ??
    company.segments[0];
  const priceDelta = getPriceDelta(company);
  const displayCandles = getDisplayCandles(company, state.activeChartRange);
  const chartSource = company.liveChart
    ? "FMP daily OHLC chart"
    : company.liveQuote
      ? "Live quote fallback"
      : "Demo live feed";

  elements.detail.innerHTML = `
    <div class="panel detail-shell">
      <div class="detail-top">
        <div>
          <div class="eyebrow">Company Detail</div>
          <h2>${company.name}</h2>
          <p class="muted">${company.ticker} · ${company.sector} · ${company.maturity}</p>
        </div>
        <div class="detail-actions">
          <button class="ghost-button" data-action="toggle-pin" data-id="${company.id}">
            ${state.pinnedIds.includes(company.id) ? "Unpin" : "Pin"}
          </button>
          <button class="ghost-button" data-action="toggle-compare" data-id="${company.id}">
            ${state.compareIds.includes(company.id) ? "Compared" : "Compare"}
          </button>
          <button class="ghost-button" data-action="sync-live">
            Sync now
          </button>
          ${
            company.isCustom
              ? `<button class="ghost-button danger" data-action="remove-company" data-id="${company.id}">Remove</button>`
              : ""
          }
        </div>
      </div>

      <div class="detail-hero">
        <article class="hero-chart-card">
          <div class="hero-price-line">
            <div>
              <div class="eyebrow">${chartSource}</div>
              <div class="hero-price">${formatDisplayPrice(company.price.current, { live: Boolean(company.liveQuote) })}</div>
            </div>
            <div class="delta-tag ${priceDelta >= 0 ? "positive" : "negative"}">
              ${formatPercentValue(priceDelta)}
            </div>
          </div>
          <div class="candle-toolbar">
            <div class="candle-toolbar-left">
              <div class="candle-symbol-pill">${company.ticker}</div>
              <div class="moving-average-legend">
                <span>이동평균</span>
                <strong class="ma ma-5">5</strong>
                <strong class="ma ma-20">20</strong>
                <strong class="ma ma-60">60</strong>
                <strong class="ma ma-120">120</strong>
              </div>
            </div>
            <div class="candle-range-tabs">
              ${[
                { id: "1D", label: "1D" },
                { id: "1W", label: "1W" },
                { id: "1M", label: "1M" },
                { id: "3M", label: "3M" },
                { id: "ALL", label: "ALL" },
              ]
                .map(
                  (range) => `
                    <button
                      class="candle-range-button ${state.activeChartRange === range.id ? "active" : ""}"
                      data-action="set-chart-range"
                      data-view="${range.id}"
                    >
                      ${range.label}
                    </button>
                  `
                )
                .join("")}
            </div>
          </div>
          <div class="chart-frame">
            ${renderCandlestickChart(displayCandles, company)}
          </div>
          <p class="muted">
            ${
              company.liveChart
                ? `${company.ticker} 캔들 차트가 동기화되었습니다. ${
                    company.liveChart.syncedAt
                      ? `마지막 업데이트 ${formatSyncTime(company.liveChart.syncedAt)}.`
                      : ""
                  }`
                : hasLiveApiKey()
                  ? "실시간 quote와 OHLC 데이터를 이용해 캔들, 이동평균, 거래량 패널을 함께 표시합니다."
                  : "API key를 넣으면 현재 데모 캔들 차트 자리에 실시간 OHLC / 거래량 데이터가 들어옵니다."
            }
          </p>
        </article>

        <aside class="hero-side">
          <article class="info-card">
            <div class="eyebrow">Investment thesis</div>
            <p>${company.thesis}</p>
          </article>
          <article class="info-card">
            <div class="eyebrow">Live snapshot</div>
            ${renderLiveSnapshot(company)}
          </article>
          <article class="info-card">
            <div class="eyebrow">Fast read</div>
            ${company.summaryMetrics
              .map(
                (metric) => `
                  <div class="metric-row">
                    <span>${metric.label}</span>
                    <strong>${metric.value}</strong>
                  </div>
                `
              )
              .join("")}
          </article>
        </aside>
      </div>

      <div class="tab-row">
        ${detailTabs
          .map(
            (tab) => `
              <button
                class="tab-button ${state.activeTab === tab.id ? "active" : ""}"
                data-action="set-tab"
                data-tab="${tab.id}"
              >
                ${tab.label}
              </button>
            `
          )
          .join("")}
      </div>

      <div class="tab-content">
        ${renderTabContent(company, activeSegment)}
      </div>
    </div>
  `;
}

function renderLiveSnapshot(company) {
  if (!company.liveQuote) {
    return `<p class="muted">실시간 quote가 아직 연결되지 않았습니다. API key를 저장하고 Sync now를 누르면 이 영역이 채워집니다.</p>`;
  }

  return `
    <div class="metric-row">
      <span>Quote Source</span>
      <strong>${company.liveQuote.source ?? "unknown"}</strong>
    </div>
    <div class="metric-row">
      <span>Day Range</span>
      <strong>${formatMoneyValue(company.liveQuote.dayLow, { live: true })} - ${formatMoneyValue(company.liveQuote.dayHigh, { live: true })}</strong>
    </div>
    <div class="metric-row">
      <span>Open</span>
      <strong>${formatMoneyValue(company.liveQuote.open, { live: true })}</strong>
    </div>
    <div class="metric-row">
      <span>Volume</span>
      <strong>${formatCompactNumber(company.liveQuote.volume)}</strong>
    </div>
    <div class="metric-row">
      <span>Market Cap</span>
      <strong>${company.liveQuote.marketCap ? `$${formatCompactNumber(company.liveQuote.marketCap)}` : "N/A"}</strong>
    </div>
    <div class="metric-row">
      <span>Synced</span>
      <strong>${formatSyncTime(company.liveQuote.syncedAt)}</strong>
    </div>
  `;
}

function renderTabContent(company, activeSegment) {
  const earnings = getDisplayEarnings(company);

  if (state.activeTab === "overview") {
    return `
      <div class="section-heading">
        <h3>Part-based Breakdown</h3>
        <span class="pill">${company.segments.length} parts</span>
      </div>
      <div class="segment-chip-row">
        ${company.segments
          .map(
            (segment) => `
              <button
                class="segment-chip ${segment.id === activeSegment.id ? "active" : ""}"
                data-action="set-segment"
                data-segment="${segment.id}"
              >
                ${segment.name}
              </button>
            `
          )
          .join("")}
      </div>
      <div class="overview-grid">
        <article class="panel-inner segment-focus-card">
          <div class="section-heading">
            <h4>${activeSegment.name}</h4>
            <span class="pill subtle">${activeSegment.metricValue}</span>
          </div>
          <p class="muted">${activeSegment.note}</p>
          <div class="chart-frame slim">
            ${renderLineChart(activeSegment.series, { compact: false, stroke: "#f0b45f" })}
          </div>
        </article>
        <article class="panel-inner">
          <div class="section-heading">
            <h4>Current Read</h4>
            <span class="pill subtle">${earnings.tone}</span>
          </div>
          <div class="bullet-stack">
            ${earnings.highlights
              .slice(0, 3)
              .map((item) => `<div class="bullet-item">${item}</div>`)
              .join("")}
          </div>
        </article>
      </div>
      <div class="segment-grid">
        ${company.segments
          .map(
            (segment) => `
              <article class="panel-inner segment-card ${segment.id === activeSegment.id ? "active" : ""}">
                <div class="section-heading">
                  <h4>${segment.name}</h4>
                  <span class="pill subtle">${segment.metricLabel}</span>
                </div>
                <p class="muted">${segment.note}</p>
                <div class="mini-chart">${renderLineChart(segment.series, {
                  compact: true,
                  stroke: segment.id === activeSegment.id ? "#f0b45f" : "#63c2ff",
                })}</div>
              </article>
            `
          )
          .join("")}
      </div>
    `;
  }

  if (state.activeTab === "earnings") {
    return `
      ${renderTranscriptBanner(company)}
      <div class="call-summary">
        <article class="panel-inner">
          <div class="section-heading">
            <h3>${earnings.period}</h3>
            <span class="pill">${earnings.tone}</span>
          </div>
          <p>${earnings.summary}</p>
        </article>
        <article class="panel-inner">
          <div class="section-heading">
            <h3>Keyword heat</h3>
            <span class="pill subtle">Call analysis</span>
          </div>
          <div class="heat-list">
            ${earnings.keywordHeat
              .map(
                (keyword) => `
                  <div class="heat-row">
                    <span>${keyword.label}</span>
                    <div class="heat-track">
                      <div class="heat-fill" style="width:${keyword.value}%"></div>
                    </div>
                    <strong>${keyword.value}</strong>
                  </div>
                `
              )
              .join("")}
          </div>
        </article>
      </div>
      <div class="note-grid">
        ${earnings.panelNotes
          .map(
            (note) => `
              <article class="panel-inner">
                <div class="section-heading">
                  <h4>${note.title}</h4>
                </div>
                <p class="muted">${note.body}</p>
              </article>
            `
          )
          .join("")}
      </div>
      <div class="two-column">
        <article class="panel-inner">
          <div class="section-heading">
            <h4>Key takeaways</h4>
          </div>
          <div class="bullet-stack">
            ${earnings.highlights
              .map((item) => `<div class="bullet-item">${item}</div>`)
              .join("")}
          </div>
        </article>
        <article class="panel-inner">
          <div class="section-heading">
            <h4>Watch items</h4>
          </div>
          <div class="bullet-stack danger-stack">
            ${earnings.watchItems
              .map((item) => `<div class="bullet-item">${item}</div>`)
              .join("")}
          </div>
        </article>
      </div>
    `;
  }

  if (state.activeTab === "relationships") {
    const relationCompanies = company.relationships
      .map((relation) => ({
        relation,
        peer: getCompanyById(relation.targetId),
      }))
      .filter(({ peer }) => Boolean(peer));

    return `
      <div class="two-column relationship-layout">
        <article class="panel-inner">
          <div class="section-heading">
            <h3>Network</h3>
            <span class="pill">${relationCompanies.length} links</span>
          </div>
          <div class="relationship-map">
            ${renderRelationshipMap(company, relationCompanies)}
          </div>
        </article>
        <article class="panel-inner">
          <div class="section-heading">
            <h3>Connection notes</h3>
            <span class="pill subtle">Structured</span>
          </div>
          <div class="relation-list">
            ${relationCompanies
              .map(
                ({ relation, peer }) => `
                  <div class="relation-card">
                    <div class="relation-header">
                      <div>
                        <strong>${peer.name}</strong>
                        <span>${relation.type}</span>
                      </div>
                      <span class="pill subtle">${relation.strength}</span>
                    </div>
                    <p class="muted">${relation.note}</p>
                  </div>
                `
              )
              .join("")}
          </div>
        </article>
      </div>
    `;
  }

  if (state.activeTab === "capital") {
    return `
      <div class="live-banner static">
        <strong>Capital Lens</strong>
        <span>현재는 정적 메모 데이터입니다. 다음 단계에서 13F / 기관 보유 API를 붙일 수 있습니다.</span>
      </div>
      <div class="section-heading">
        <h3>Who is investing / what capital matters?</h3>
        <span class="pill">${company.investors.length} signals</span>
      </div>
      <div class="capital-grid">
        ${company.investors
          .map(
            (investor) => `
              <article class="panel-inner capital-card">
                <div class="section-heading">
                  <h4>${investor.name}</h4>
                  <span class="pill subtle">${investor.role}</span>
                </div>
                <p class="muted">${investor.note}</p>
              </article>
            `
          )
          .join("")}
      </div>
    `;
  }

  return `
    <div class="section-heading">
      <h3>What is the company doing now?</h3>
      <span class="pill">${company.initiatives.length} tracks</span>
    </div>
    <div class="project-grid">
      ${company.initiatives
        .map(
          (initiative) => `
            <article class="panel-inner project-card">
              <div class="section-heading">
                <h4>${initiative.title}</h4>
                <span class="pill subtle">${initiative.stage}</span>
              </div>
              <div class="project-meta">${initiative.part}</div>
              <p class="muted">${initiative.detail}</p>
            </article>
          `
        )
        .join("")}
    </div>
  `;
}

function renderTranscriptBanner(company) {
  if (company.liveEarnings?.transcriptMeta) {
    return `
      <div class="live-banner live">
        <strong>Live transcript analysis</strong>
        <span>
          ${
            company.liveEarnings.transcriptMeta.source
          }에서 ${company.liveEarnings.transcriptMeta.year} Q${
            company.liveEarnings.transcriptMeta.quarter
          } 원문을 불러와 키워드 기반으로 요약했습니다.
          ${
            company.liveEarnings.transcriptMeta.analyzedAt
              ? `분석 시각 ${formatSyncTime(company.liveEarnings.transcriptMeta.analyzedAt)}.`
              : ""
          }
        </span>
      </div>
    `;
  }

  if (!hasLiveApiKey()) {
    return `
      <div class="live-banner demo">
        <strong>Demo earnings analysis</strong>
        <span>API key를 넣으면 최신 earnings transcript를 불러와 이 영역을 자동 요약으로 채웁니다.</span>
      </div>
    `;
  }

  if (state.live.transcript.status === "loading") {
    return `
      <div class="live-banner loading">
        <strong>Transcript syncing</strong>
        <span>${state.live.transcript.message}</span>
      </div>
    `;
  }

  if (state.live.transcript.status === "error") {
    return `
      <div class="live-banner error">
        <strong>Transcript sync error</strong>
        <span>${state.live.transcript.message}</span>
      </div>
    `;
  }

  return `
    <div class="live-banner static">
      <strong>Transcript ready</strong>
      <span>Sync now를 누르거나 Earnings 탭을 다시 열면 최신 transcript 분석을 시도합니다.</span>
    </div>
  `;
}

function renderRelationshipMap(company, relationCompanies) {
  const centerX = 270;
  const centerY = 210;
  const radius = 145;

  return `
    <svg viewBox="0 0 540 420" role="img" aria-label="${company.name} relationship map">
      <circle cx="${centerX}" cy="${centerY}" r="72" fill="rgba(61, 217, 165, 0.16)" stroke="#3dd9a5" stroke-width="2"></circle>
      <text x="${centerX}" y="${centerY - 4}" text-anchor="middle" class="map-node-title">${company.ticker}</text>
      <text x="${centerX}" y="${centerY + 18}" text-anchor="middle" class="map-node-subtitle">${company.name}</text>
      ${relationCompanies
        .map(({ relation, peer }, index) => {
          const angle =
            -Math.PI / 2 + (index * (Math.PI * 2)) / Math.max(relationCompanies.length, 1);
          const x = centerX + Math.cos(angle) * radius;
          const y = centerY + Math.sin(angle) * radius;
          const color = relationPalette[relation.type] ?? "#79d7cf";
          return `
            <line x1="${centerX}" y1="${centerY}" x2="${x}" y2="${y}" stroke="${color}" stroke-width="${1.5 + relation.strength / 34}" stroke-opacity="0.72"></line>
            <circle cx="${x}" cy="${y}" r="52" fill="rgba(10, 17, 19, 0.92)" stroke="${color}" stroke-width="1.4"></circle>
            <text x="${x}" y="${y - 4}" text-anchor="middle" class="map-node-title">${peer.ticker}</text>
            <text x="${x}" y="${y + 16}" text-anchor="middle" class="map-node-subtitle">${relation.type}</text>
          `;
        })
        .join("")}
    </svg>
  `;
}

function buildVisibleMapPositions(companies) {
  const sectorBuckets = {};

  return Object.fromEntries(
    companies.map((company, index) => {
      if (mapLayout[company.id]) {
        const layout = mapLayout[company.id];
        return [company.id, { x: layout.x * 10, y: layout.y * 6.1 }];
      }

      const bucket = sectorBuckets[company.sector] ?? 0;
      sectorBuckets[company.sector] = bucket + 1;
      const sectorIndex =
        ["AI Infra", "Foundry", "Cloud", "Consumer", "Software"].indexOf(
          company.sector
        ) + 1;
      return [
        company.id,
        {
          x: 120 + sectorIndex * 150,
          y: 130 + bucket * 110 + (index % 2) * 25,
        },
      ];
    })
  );
}

function buildVisibleLinks(companies) {
  const visibleIds = new Set(companies.map((company) => company.id));
  const unique = new Map();

  companies.forEach((company) => {
    company.relationships.forEach((relation) => {
      if (!visibleIds.has(relation.targetId)) return;
      const key = [company.id, relation.targetId].sort().join(":");
      const existing = unique.get(key);
      if (!existing || existing.strength < relation.strength) {
        unique.set(key, {
          sourceId: company.id,
          targetId: relation.targetId,
          type: relation.type,
          strength: relation.strength,
        });
      }
    });
  });

  return [...unique.values()];
}

function buildCandlesFromSeries(series, seedKey, volatility = 0.8) {
  if (!series?.length) return [];

  const seed = hashString(seedKey);
  const candles = [];

  series.forEach((point, index) => {
    const previousClose = candles[index - 1]?.close ?? point.value * (0.985 + (seed % 9) / 1000);
    const rawDrift = Math.sin((index + seed) / 2.7) * 0.012;
    const open = Number((previousClose * (1 + rawDrift * 0.7)).toFixed(2));
    const close = Number(point.value.toFixed(2));
    const spanBase =
      Math.max(Math.abs(close - open), close * 0.008) +
      (volatility * (0.28 + ((seed + index) % 7) * 0.05));
    const high = Number((Math.max(open, close) + spanBase * 0.72).toFixed(2));
    const low = Number((Math.max(0.1, Math.min(open, close) - spanBase * 0.68)).toFixed(2));
    const volume = Math.round(
      8_500_000 +
        index * 1_200_000 +
        Math.abs(close - open) * 2_400_000 +
        (((seed * (index + 3)) % 17) * 420_000)
    );

    candles.push({
      label: point.label,
      open,
      high,
      low,
      close,
      volume,
      date: point.label,
    });
  });

  return candles;
}

function getDisplayCandles(company, range) {
  const isLiveMode = hasLiveApiKey();
  const sourceCandles = isLiveMode
    ? company.liveChart?.series?.length
      ? company.liveChart.series
      : []
    : company.price.candles?.length
      ? company.price.candles
      : buildCandlesFromSeries(
          company.price.series ?? [],
          `${company.id}-${company.ticker}`,
          company.price.volatility ?? 0.8
        );

  const rangeMap = {
    "1D": 1,
    "1W": 5,
    "1M": 22,
    "3M": 66,
    ALL: 999,
  };

  const limit = rangeMap[range] ?? 28;
  const sliced = sourceCandles.slice(-limit).map((candle) => ({ ...candle }));

  if (!isLiveMode) return sliced;
  return sliced;
}

function renderCandlestickChart(candles, company) {
  if (!candles?.length) {
    return `<div class="chart-empty">표시할 캔들 차트 데이터가 없습니다.</div>`;
  }

  const width = 900;
  const height = 560;
  const padding = { top: 22, right: 72, bottom: 42, left: 18 };
  const volumeHeight = 118;
  const gapHeight = 18;
  const priceHeight = height - padding.top - padding.bottom - volumeHeight - gapHeight;
  const priceBottom = padding.top + priceHeight;
  const volumeTop = priceBottom + gapHeight;
  const priceValues = candles.flatMap((candle) => [candle.high, candle.low]);
  const maxPrice = Math.max(...priceValues);
  const minPrice = Math.min(...priceValues);
  const priceSpan = maxPrice - minPrice || 1;
  const paddedMax = maxPrice + priceSpan * 0.08;
  const paddedMin = Math.max(0, minPrice - priceSpan * 0.08);
  const maxVolume = Math.max(...candles.map((candle) => candle.volume || 0), 1);
  const innerWidth = width - padding.left - padding.right;
  const slot = innerWidth / Math.max(candles.length, 1);
  const candleWidth = Math.max(8, Math.min(30, slot * 0.58));
  const lastClose = candles.at(-1)?.close ?? company.price.current;
  const highest = candles.reduce(
    (best, candle, index) => (candle.high > best.high ? { ...candle, index } : best),
    { ...candles[0], index: 0 }
  );
  const lowest = candles.reduce(
    (best, candle, index) => (candle.low < best.low ? { ...candle, index } : best),
    { ...candles[0], index: 0 }
  );

  const xAt = (index) => padding.left + slot * index + slot / 2;
  const priceY = (value) =>
    padding.top + ((paddedMax - value) / (paddedMax - paddedMin || 1)) * priceHeight;
  const volumeY = (value) => volumeTop + volumeHeight - (value / maxVolume) * volumeHeight;
  const priceTicks = Array.from({ length: 6 }, (_, index) => {
    const ratio = index / 5;
    const value = paddedMax - (paddedMax - paddedMin) * ratio;
    return {
      y: padding.top + priceHeight * ratio,
      value,
    };
  });
  const volumeTicks = [0.25, 0.5, 0.75, 1].map((ratio) => ({
    y: volumeTop + volumeHeight - volumeHeight * ratio,
    value: maxVolume * ratio,
  }));
  const movingAverageConfigs = [
    { period: 5, className: "ma-5", color: "#50c85b" },
    { period: 20, className: "ma-20", color: "#ff5a5a" },
    { period: 60, className: "ma-60", color: "#ff9d2e" },
    { period: 120, className: "ma-120", color: "#ab6cff" },
  ];
  const movingAverages = movingAverageConfigs.map((config) => ({
    ...config,
    points: buildMovingAveragePoints(candles, config.period, xAt, priceY),
  }));
  const rightTagY = priceY(lastClose);
  const rightTagColor =
    lastClose >= (candles.at(-1)?.open ?? lastClose) ? "#e94444" : "#2a7df6";
  const highDelta = ((lastClose - highest.high) / highest.high) * 100;
  const lowDelta = ((lastClose - lowest.low) / lowest.low) * 100;

  return `
    <div class="candle-chart-shell">
      <svg viewBox="0 0 ${width} ${height}" role="img" aria-label="${company.name} candlestick chart">
        <rect x="0" y="0" width="${width}" height="${height}" fill="#ffffff" rx="18"></rect>
        ${priceTicks
          .map(
            (tick) => `
              <line x1="${padding.left}" y1="${tick.y}" x2="${width - padding.right}" y2="${tick.y}" class="candle-grid-line"></line>
              <text x="${width - padding.right + 12}" y="${tick.y + 4}" class="candle-axis-label">${formatChartPrice(
                tick.value
              )}</text>
            `
          )
          .join("")}
        ${volumeTicks
          .map(
            (tick) => `
              <line x1="${padding.left}" y1="${tick.y}" x2="${width - padding.right}" y2="${tick.y}" class="candle-volume-grid-line"></line>
              <text x="${width - padding.right + 12}" y="${tick.y + 4}" class="candle-axis-label volume">${formatCompactNumber(
                tick.value
              )}</text>
            `
          )
          .join("")}
        ${candles
          .map((candle, index) => {
            const x = xAt(index);
            const openY = priceY(candle.open);
            const closeY = priceY(candle.close);
            const highY = priceY(candle.high);
            const lowY = priceY(candle.low);
            const bodyTop = Math.min(openY, closeY);
            const bodyHeight = Math.max(2.4, Math.abs(openY - closeY));
            const isUp = candle.close >= candle.open;
            const color = isUp ? "#f43434" : "#2179e3";
            const volumeHeightValue = volumeTop + volumeHeight - volumeY(candle.volume || 0);
            return `
              <line x1="${x}" y1="${highY}" x2="${x}" y2="${lowY}" stroke="${color}" stroke-width="1.8"></line>
              <rect x="${x - candleWidth / 2}" y="${bodyTop}" width="${candleWidth}" height="${bodyHeight}" fill="${color}" rx="1.8"></rect>
              <rect
                x="${x - candleWidth / 2}"
                y="${volumeY(candle.volume || 0)}"
                width="${candleWidth}"
                height="${Math.max(4, volumeHeightValue)}"
                fill="${isUp ? "rgba(244,52,52,0.46)" : "rgba(33,121,227,0.46)"}"
              ></rect>
            `;
          })
          .join("")}
        ${movingAverages
          .map((average) =>
            average.points.length
              ? `
                  <path d="${average.points
                    .map((point, index) => `${index === 0 ? "M" : "L"} ${point.x} ${point.y}`)
                    .join(" ")}" class="candle-moving-average ${average.className}" stroke="${average.color}"></path>
                `
              : ""
          )
          .join("")}
        <line
          x1="${width - padding.right - 18}"
          y1="${rightTagY}"
          x2="${width - padding.right + 6}"
          y2="${rightTagY}"
          stroke="${rightTagColor}"
          stroke-width="2"
        ></line>
        <path
          d="M ${width - padding.right + 10} ${rightTagY} L ${width - padding.right + 28} ${rightTagY - 10} L ${
            width - padding.right + 72
          } ${rightTagY - 10} L ${width - padding.right + 72} ${rightTagY + 10} L ${
            width - padding.right + 28
          } ${rightTagY + 10} Z"
          fill="${rightTagColor}"
        ></path>
        <text x="${width - padding.right + 48}" y="${rightTagY + 4}" text-anchor="middle" class="candle-last-price">${
          formatChartPrice(lastClose)
        }</text>
        <circle cx="${xAt(highest.index)}" cy="${priceY(highest.high)}" r="3.4" fill="#111111"></circle>
        <text x="${xAt(highest.index)}" y="${priceY(highest.high) - 14}" text-anchor="middle" class="candle-annotation">
          최고 ${formatChartPrice(highest.high)} (${formatPercent(highDelta)})
        </text>
        <circle cx="${xAt(lowest.index)}" cy="${priceY(lowest.low)}" r="3.4" fill="#111111"></circle>
        <text x="${xAt(lowest.index)}" y="${priceY(lowest.low) + 22}" text-anchor="middle" class="candle-annotation">
          최저 ${formatChartPrice(lowest.low)} (${formatPercent(lowDelta)})
        </text>
        ${candles
          .map((candle, index) =>
            index % Math.max(1, Math.ceil(candles.length / 6)) === 0 || index === candles.length - 1
              ? `
                  <text x="${xAt(index)}" y="${height - 10}" text-anchor="middle" class="candle-x-label">
                    ${escapeHtml(String(candle.label))}
                  </text>
                `
              : ""
          )
          .join("")}
        <text x="${padding.left}" y="${padding.top - 2}" class="candle-panel-label">Price</text>
        <text x="${padding.left}" y="${volumeTop - 6}" class="candle-panel-label">Volume ${formatCompactNumber(
          candles.reduce((sum, candle) => sum + (candle.volume || 0), 0)
        )}</text>
        <text x="${width - 18}" y="${padding.top + 12}" text-anchor="end" class="candle-mode-label">Linear</text>
      </svg>
    </div>
  `;
}

function buildMovingAveragePoints(candles, period, xAt, yAt) {
  return candles
    .map((_, index) => {
      const start = Math.max(0, index - period + 1);
      const window = candles.slice(start, index + 1);
      if (!window.length) return null;
      const value = window.reduce((sum, candle) => sum + candle.close, 0) / window.length;
      return {
        x: xAt(index),
        y: yAt(value),
      };
    })
    .filter(Boolean);
}

function formatChartPrice(value) {
  return Number(value).toFixed(2);
}

function formatPercent(value) {
  if (!Number.isFinite(value)) return "0.00%";
  return `${value >= 0 ? "+" : ""}${value.toFixed(2)}%`;
}

function formatLatestDailyLabel() {
  return new Date().toLocaleDateString("ko-KR", {
    month: "numeric",
    day: "numeric",
    timeZone: "America/New_York",
  });
}

function getTodayNyDate() {
  const parts = new Intl.DateTimeFormat("en-CA", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    timeZone: "America/New_York",
  })
    .formatToParts(new Date())
    .reduce((acc, part) => {
      acc[part.type] = part.value;
      return acc;
    }, {});

  return `${parts.year}-${parts.month}-${parts.day}`;
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function getPriceDelta(company) {
  const liveChange = company.liveQuote?.changesPercentage;
  if (Number.isFinite(liveChange)) {
    return liveChange;
  }

  const first = company.price.series[0]?.value ?? company.price.current;
  const last = company.price.series.at(-1)?.value ?? company.price.current;
  return ((last - first) / first) * 100;
}

function renderStatus(label, stateLabel, description, tone = "static") {
  return `
    <div class="status-card ${tone}">
      <div class="status-top">
        <strong>${label}</strong>
        <span class="pill subtle">${stateLabel}</span>
      </div>
      <p>${description}</p>
    </div>
  `;
}

function getStatusLabel(status) {
  if (status === "live") return "Live";
  if (status === "loading") return "Syncing";
  if (status === "error") return "Error";
  if (status === "idle") return "Ready";
  if (status === "demo") return "Demo";
  return "Static";
}

function buildStatusDescription(channel) {
  const timePart = channel.syncedAt ? ` 마지막 업데이트 ${formatSyncTime(channel.syncedAt)}.` : "";
  return `${channel.message}${timePart}`;
}

function renderLineChart(series, options = {}) {
  if (!series?.length) {
    return `<div class="chart-empty">표시할 차트 데이터가 없습니다.</div>`;
  }

  const width = options.compact ? 280 : 700;
  const height = options.compact ? 120 : 280;
  const paddingX = options.compact ? 10 : 24;
  const paddingY = options.compact ? 12 : 24;
  const values = series.map((point) => point.value);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = max - min || 1;

  const points = series.map((point, index) => {
    const x =
      paddingX +
      (index / Math.max(series.length - 1, 1)) * (width - paddingX * 2);
    const y =
      height -
      paddingY -
      ((point.value - min) / span) * (height - paddingY * 2);
    return { x, y, label: point.label, value: point.value };
  });

  const linePath = points
    .map((point, index) => `${index === 0 ? "M" : "L"} ${point.x} ${point.y}`)
    .join(" ");

  const areaPath = `${linePath} L ${points.at(-1)?.x ?? 0} ${height - paddingY} L ${
    points[0]?.x ?? 0
  } ${height - paddingY} Z`;

  return `
    <svg viewBox="0 0 ${width} ${height}" role="img" aria-label="chart">
      <defs>
        <linearGradient id="fill-${width}-${height}" x1="0%" x2="0%" y1="0%" y2="100%">
          <stop offset="0%" stop-color="${options.stroke ?? "#3dd9a5"}" stop-opacity="0.32"></stop>
          <stop offset="100%" stop-color="${options.stroke ?? "#3dd9a5"}" stop-opacity="0"></stop>
        </linearGradient>
      </defs>
      ${
        !options.compact
          ? [0, 0.25, 0.5, 0.75, 1]
              .map((ratio) => {
                const y = paddingY + ratio * (height - paddingY * 2);
                return `<line x1="${paddingX}" y1="${y}" x2="${width - paddingX}" y2="${y}" class="chart-grid-line"></line>`;
              })
              .join("")
          : ""
      }
      <path d="${areaPath}" fill="url(#fill-${width}-${height})"></path>
      <path d="${linePath}" fill="none" stroke="${options.stroke ?? "#3dd9a5"}" stroke-width="${options.compact ? 3 : 4}" stroke-linecap="round" stroke-linejoin="round"></path>
      ${points
        .map(
          (point, index) => `
            <circle
              cx="${point.x}"
              cy="${point.y}"
              r="${index === points.length - 1 ? (options.compact ? 4 : 5) : options.compact ? 2.6 : 3.2}"
              fill="${options.stroke ?? "#3dd9a5"}"
            ></circle>
          `
        )
        .join("")}
      ${
        !options.compact
          ? points
              .filter((_, index) => index % 2 === 0 || index === points.length - 1)
              .map(
                (point) => `
                  <text x="${point.x}" y="${height - 6}" text-anchor="middle" class="chart-label">${point.label}</text>
                `
              )
              .join("")
          : ""
      }
    </svg>
  `;
}

function formatDecimal(value, decimals = 1) {
  if (!Number.isFinite(value) || value <= 0) return "N/A";
  return Number(value).toFixed(decimals);
}

function formatMoneyValue(value, { live = false } = {}) {
  const decimal = formatDecimal(value, live ? 4 : 1);
  return decimal === "N/A" ? decimal : `$${decimal}`;
}

function formatDisplayPrice(value, { live = false } = {}) {
  return formatMoneyValue(value, { live });
}

function formatPercentValue(value) {
  if (!Number.isFinite(value)) return "N/A";
  return `${value >= 0 ? "+" : ""}${value.toFixed(2)}%`;
}

function formatCompactNumber(value) {
  if (!Number.isFinite(value) || value <= 0) return "N/A";
  return new Intl.NumberFormat("en-US", {
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(value);
}

function formatSyncTime(value) {
  if (!value) return "N/A";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return "N/A";

  return parsed.toLocaleTimeString("ko-KR", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

function escapeAttribute(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll('"', "&quot;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}

bootstrap();
