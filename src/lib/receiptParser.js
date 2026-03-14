import {
  detectReceiptPattern,
  findTotal,
  lineContainsAny,
  normalizeLine,
  normalizeKey,
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
