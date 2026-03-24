const FMP_BASE_URL = "https://financialmodelingprep.com/stable";

function buildUrl(path, params, apiKey) {
  const url = new URL(`${FMP_BASE_URL}/${path}`);

  Object.entries(params).forEach(([key, value]) => {
    if (value === undefined || value === null || value === "") return;
    url.searchParams.set(key, value);
  });

  url.searchParams.set("apikey", apiKey);
  return url;
}

async function getJson(url) {
  const response = await fetch(url, {
    headers: {
      Accept: "application/json",
    },
  });

  if (!response.ok) {
    throw new Error(`FMP request failed (${response.status})`);
  }

  const data = await response.json();

  if (data && typeof data === "object" && !Array.isArray(data)) {
    const errorMessage = data["Error Message"] ?? data.error ?? data.message;
    if (errorMessage) {
      throw new Error(String(errorMessage));
    }
  }

  return data;
}

function normalizePercent(value) {
  if (typeof value === "number") return value;
  if (typeof value === "string") {
    return Number(value.replace("%", "").replace(",", "").trim());
  }
  return 0;
}

function normalizeQuote(record) {
  if (!record?.symbol) return null;

  return {
    symbol: String(record.symbol).toUpperCase(),
    name: record.name ?? "",
    price: Number(record.price ?? record.lastSalePrice ?? 0),
    change: Number(record.change ?? 0),
    changesPercentage: normalizePercent(
      record.changesPercentage ?? record.changePercentage ?? 0
    ),
    volume: Number(record.volume ?? 0),
    open: Number(record.open ?? 0),
    previousClose: Number(record.previousClose ?? 0),
    dayHigh: Number(record.dayHigh ?? record.high ?? 0),
    dayLow: Number(record.dayLow ?? record.low ?? 0),
    marketCap: Number(record.marketCap ?? 0),
    timestamp: record.timestamp ?? null,
  };
}

function normalizeChartBar(bar) {
  const open = Number(bar.open ?? bar.previousClose ?? bar.close ?? bar.price ?? 0);
  const close = Number(bar.close ?? bar.price ?? open);
  const high = Number(bar.high ?? Math.max(open, close));
  const low = Number(bar.low ?? Math.min(open, close));
  return {
    date: bar.date ?? bar.datetime ?? "",
    label: formatBarLabel(bar.date ?? bar.datetime ?? ""),
    open,
    high,
    low,
    close,
    value: close,
    volume: Number(bar.volume ?? 0),
  };
}

function formatBarLabel(value) {
  const parsed = new Date(value);

  if (Number.isNaN(parsed.getTime())) {
    return String(value).slice(11, 16) || String(value);
  }

  return parsed.toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    timeZone: "America/New_York",
  });
}

function formatDailyLabel(value) {
  const parsed = new Date(value);

  if (Number.isNaN(parsed.getTime())) {
    return String(value);
  }

  return parsed.toLocaleDateString("ko-KR", {
    month: "numeric",
    day: "numeric",
    timeZone: "America/New_York",
  });
}

export async function fetchBatchQuotes(symbols, apiKey) {
  const uniqueSymbols = [...new Set(symbols.map((symbol) => symbol.toUpperCase()))].filter(
    Boolean
  );

  if (!uniqueSymbols.length) {
    return {
      quotes: [],
      source: "none",
    };
  }

  try {
    const batchUrl = buildUrl(
      "batch-quote",
      { symbols: uniqueSymbols.join(",") },
      apiKey
    );
    const batchData = await getJson(batchUrl);
    const normalized = (Array.isArray(batchData) ? batchData : [])
      .map(normalizeQuote)
      .filter(Boolean);

    if (normalized.length) {
      return {
        quotes: normalized,
        source: "batch-quote",
      };
    }
  } catch {
    // Fall back to per-symbol requests if batch access is unavailable on the user's plan.
  }

  const settled = await Promise.allSettled(
    uniqueSymbols.map(async (symbol) => {
      const quoteUrl = buildUrl("quote", { symbol }, apiKey);
      const quoteData = await getJson(quoteUrl);
      const record = Array.isArray(quoteData) ? quoteData[0] : quoteData;
      return normalizeQuote(record);
    })
  );

  const quotes = settled
    .filter((entry) => entry.status === "fulfilled" && entry.value)
    .map((entry) => entry.value);

  return {
    quotes,
    source: "quote fallback",
  };
}

export async function fetchIntradayChart(symbol, apiKey, limit = 60) {
  const url = buildUrl("historical-chart/1min", { symbol }, apiKey);
  const data = await getJson(url);

  return (Array.isArray(data) ? data : [])
    .map(normalizeChartBar)
    .filter(
      (bar) =>
        bar.date &&
        Number.isFinite(bar.open) &&
        Number.isFinite(bar.high) &&
        Number.isFinite(bar.low) &&
        Number.isFinite(bar.close)
    )
    .sort((left, right) => new Date(left.date) - new Date(right.date))
    .slice(-limit);
}

export async function fetchDailyEodChart(symbol, apiKey, limit = 180) {
  const url = buildUrl("historical-price-eod/full", { symbol }, apiKey);
  const data = await getJson(url);
  const rows = Array.isArray(data)
    ? data
    : Array.isArray(data?.historical)
      ? data.historical
      : [];

  return rows
    .map((bar) => ({
      date: bar.date ?? "",
      label: formatDailyLabel(bar.date ?? ""),
      open: Number(bar.open ?? 0),
      high: Number(bar.high ?? 0),
      low: Number(bar.low ?? 0),
      close: Number(bar.close ?? 0),
      value: Number(bar.close ?? 0),
      volume: Number(bar.volume ?? 0),
    }))
    .filter(
      (bar) =>
        bar.date &&
        Number.isFinite(bar.open) &&
        Number.isFinite(bar.high) &&
        Number.isFinite(bar.low) &&
        Number.isFinite(bar.close)
    )
    .sort((left, right) => new Date(left.date) - new Date(right.date))
    .slice(-limit);
}

export async function fetchTranscriptDates(symbol, apiKey) {
  const url = buildUrl("earning-call-transcript-dates", { symbol }, apiKey);
  const data = await getJson(url);

  return (Array.isArray(data) ? data : [])
    .map((item) => ({
      date: item.date ?? item.fillingDate ?? "",
      year: Number(item.year ?? 0),
      quarter: Number(item.quarter ?? 0),
    }))
    .filter((item) => item.year && item.quarter);
}

export async function fetchTranscript(symbol, year, quarter, apiKey) {
  const url = buildUrl(
    "earning-call-transcript",
    { symbol, year, quarter },
    apiKey
  );
  const data = await getJson(url);
  const record = Array.isArray(data) ? data[0] : data;

  if (!record) return null;

  return {
    symbol: symbol.toUpperCase(),
    year,
    quarter,
    date: record.date ?? "",
    content: record.content ?? record.transcript ?? record.text ?? "",
  };
}
