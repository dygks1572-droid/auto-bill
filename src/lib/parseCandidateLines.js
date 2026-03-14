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
