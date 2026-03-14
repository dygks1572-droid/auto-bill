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
