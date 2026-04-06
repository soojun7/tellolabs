import type { MotionStyleId } from "./types";

function isJapanese(text: string): boolean {
  const matches = text.match(/[\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FFF]/g);
  return (matches?.length ?? 0) > text.length * 0.15;
}

/**
 * 대본(line)에서 화면 표시용 핵심 문구를 자동 추출.
 * AI API 없이 로컬에서 동작하는 폴백용.
 *
 * 목표: 긴 대본 → 25~50자 내외의 핵심 팩트 1~2줄
 */
export function refineForDisplay(
  line: string,
  keywords: string[],
  _style: MotionStyleId,
): { displayText: string; subText: string } {
  if (isJapanese(line)) {
    return { displayText: refineJapanese(line), subText: "" };
  }

  const quoted = extractQuotedText(line);
  if (quoted) {
    const after = line.slice(line.lastIndexOf(quoted) + quoted.length).trim();
    const attribution = after.match(/^["'""']?\s*(고\s*.{1,8}다|라고\s*.{1,8}다)/u)?.[1] ?? "";
    const text = attribution
      ? `"${quoted}"${attribution}`
      : `"${quoted}"`;
    return { displayText: breakLines(text), subText: "" };
  }

  const numbers = extractNumbers(line);
  if (numbers.length > 0) {
    const core = extractCoreFact(line);
    return { displayText: breakLines(core), subText: "" };
  }

  const core = extractCoreFact(line);
  return { displayText: breakLines(core), subText: "" };
}

function refineJapanese(line: string): string {
  let cleaned = line.trim();

  cleaned = cleaned
    .replace(/^また、?\s*/u, "")
    .replace(/^一方で、?\s*/u, "")
    .replace(/^そして、?\s*/u, "")
    .replace(/^しかし、?\s*/u, "")
    .replace(/ということです。?$/u, "")
    .replace(/と言われています。?$/u, "")
    .replace(/と報じられています。?$/u, "")
    .replace(/とのことです。?$/u, "")
    .trim();

  const quotedJa = cleaned.match(/「([^」]{4,60})」/);
  if (quotedJa) {
    return `「${quotedJa[1]}」`;
  }

  const sentences = cleaned.split(/(?<=[。！？])\s*/).filter((s) => s.length > 2);
  if (sentences.length > 1) {
    const withNums = sentences.filter((s) => /\d/.test(s));
    if (withNums.length > 0) {
      cleaned = withNums.sort((a, b) => (b.match(/\d/g)?.length ?? 0) - (a.match(/\d/g)?.length ?? 0))[0];
    } else {
      cleaned = sentences[sentences.length - 1];
    }
  }

  cleaned = cleaned.replace(/。$/, "").trim();

  if (cleaned.length > 40) {
    const commaSegs = cleaned.split(/、/);
    const withNums = commaSegs.filter((s) => /\d/.test(s));
    if (withNums.length > 0 && withNums.join("、").length <= 40) {
      cleaned = withNums.join("、");
    } else {
      cleaned = cleaned.slice(0, 38) + "…";
    }
  }

  return cleaned;
}

/** 따옴표 안 텍스트 추출 */
function extractQuotedText(line: string): string | null {
  const m = line.match(/["'""]([^"""'']{4,80})["'""]/);
  return m?.[1] ?? null;
}

/** 숫자+단위 패턴 추출 */
function extractNumbers(text: string): string[] {
  const patterns = text.match(
    /\d[\d,.]*\s*(?:조|억|만|천)?\s*(?:달러|원|명|%|퍼센트|배|개|건|위|조원|억원)/g,
  );
  return patterns?.map((p) => p.trim()) ?? [];
}

/** 핵심 팩트 추출 — 보도 어투/수식어 제거, 숫자 포함 문장 우선 */
function extractCoreFact(line: string): string {
  let cleaned = line
    .replace(/^.{0,25}에\s*따르면\s*/u, "")
    .replace(/정확한\s*통계는?\s*없지만\s*/u, "")
    .replace(/것으로\s*(알려졌|나타났|집계됐|추산됐|조사됐|확인됐|밝혀졌)다\.?$/u, "")
    .replace(/라고\s*(밝혔|전했|말했|보도했|발표했)다\.?$/u, "")
    .replace(/고\s*한다\.?$/u, "")
    .replace(/다고\s*한다\.?$/u, "")
    .replace(/인\s*것으로\s*전해졌다\.?$/u, "")
    .replace(/^또한\s*|^한편\s*|^그리고\s*|^이에\s*|^근데\s*|^그런데\s*/u, "")
    .replace(/이에요\.?$|입니다\.?$|했습니다\.?$|있었어요\.?$|낮았습니다\.?$|됩니다\.?$|해요\.?$|거든요\.?$/u, "")
    .trim();

  const sentences = cleaned.split(/[.!?]\s*/).filter((s) => s.length > 3);

  if (sentences.length > 1) {
    const withNumbers = sentences.filter((s) => /\d/.test(s));
    if (withNumbers.length > 0) {
      const best = withNumbers.sort((a, b) => {
        const aCount = (a.match(/\d/g) || []).length;
        const bCount = (b.match(/\d/g) || []).length;
        return bCount - aCount;
      })[0];
      cleaned = best;
    } else {
      cleaned = sentences[sentences.length - 1];
    }
  }

  cleaned = cleaned
    .replace(/^근데\s*|^그런데\s*/u, "")
    .replace(/\s*공식\s*통계\s*기준으로는?\s*/u, " ")
    .replace(/\s*기준으로는?\s*/u, " 기준 ")
    .replace(/\s+수준$/u, "")
    .replace(/\s+/g, " ")
    .trim();

  cleaned = cleaned.replace(/^[,.\s·:]+|[,.\s·:]+$/g, "").trim();

  if (cleaned.length > 55) {
    const commaSegments = cleaned.split(/[,，]\s*/);
    const withNums = commaSegments.filter((s) => /\d/.test(s));
    if (withNums.length > 0 && withNums.join(", ").length <= 55) {
      cleaned = withNums.join(", ");
    } else {
      cleaned = cleaned.slice(0, 53) + "…";
    }
  }

  return cleaned;
}

/** 25자 이상이면 적절한 위치에서 줄바꿈 삽입 */
function breakLines(text: string): string {
  if (text.includes("\n") || text.length <= 25) return text;

  const midpoint = Math.floor(text.length / 2);
  const breakChars = [" ", ",", "，", "은 ", "는 ", "이 ", "가 ", "을 ", "를 ", "의 ", "에 ", "로 ", "도 "];

  let bestPos = -1;
  let bestDist = Infinity;

  for (const ch of breakChars) {
    let idx = text.indexOf(ch, midpoint - 12);
    while (idx !== -1 && idx < midpoint + 12) {
      const dist = Math.abs(idx - midpoint);
      if (dist < bestDist) {
        bestDist = dist;
        bestPos = idx + ch.length - 1;
      }
      idx = text.indexOf(ch, idx + 1);
    }
  }

  if (bestPos > 0 && bestPos < text.length - 3) {
    return text.slice(0, bestPos).trimEnd() + "\n" + text.slice(bestPos).trimStart();
  }

  return text;
}

/** 하이라이트할 키워드 추출 (숫자 패턴 포함) */
export function pickHighlightWords(
  line: string,
  keywords: string[],
): string[] {
  const highlights = [...keywords];
  const numberPatterns = line.match(/\d[\d,.]*\s*[가-힣a-zA-Z%\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FFF]+/g);
  if (numberPatterns) {
    for (const np of numberPatterns) {
      if (!highlights.includes(np.trim())) {
        highlights.push(np.trim());
      }
    }
  }
  return highlights;
}
