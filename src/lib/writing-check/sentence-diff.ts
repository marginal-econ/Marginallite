/**
 * Sentence-level split + diff so the live grammar checker only ever sends
 * NEW or EDITED sentences to the model, not the whole essay on every pass.
 * This is the main credit-saving lever: a 400-word essay with one fixed
 * typo costs one-sentence tokens, not four-hundred-word tokens, on the
 * next check.
 */

// Placeholder markers used to protect [DIAGRAM: ...] tags from sentence
// splitting. Not a control character — a plain, unlikely-to-collide token.
const TAG_OPEN = "\u2063DIAGRAMTAG";
const TAG_CLOSE = "\u2063";

/** Split text into sentences, keeping [DIAGRAM: ...] tags atomic. */
export function splitSentences(text: string): string[] {
  const tags: string[] = [];
  let protectedText = text.replace(/\[DIAGRAM:[^\]]*\]/g, (match) => {
    tags.push(match);
    return `${TAG_OPEN}${tags.length - 1}${TAG_CLOSE}`;
  });

  // Protect common abbreviations and list markers (e.g. "I.", "II.", "1.", "A.", "i.") from splitting on period
  protectedText = protectedText.replace(/\b(e\.g|i\.e|etc|approx|vs)\.\s+/gi, (match) => {
    return match.replace(/\./g, "\u2062");
  });
  protectedText = protectedText.replace(/(?:^|(?<=\n|\s))([0-9]+|[IVXLCDMivxlcdm]+|[A-Za-z])\.\s+/g, (match) => {
    return match.replace(/\./g, "\u2062");
  });

  const rough = protectedText
    .split(/(?<=[.!?])\s+|\n+/g)
    .map((sentence) => sentence.replace(/\u2062/g, ".").trim())
    .filter(Boolean);

  const restore = new RegExp(`${TAG_OPEN}(\\d+)${TAG_CLOSE}`, "g");
  return rough.map((sentence) =>
    sentence.replace(restore, (_match, index: string) => tags[Number(index)] ?? ""),
  );
}

export type DiffedSentence = { sentence: string; changed: boolean };

/**
 * LCS-based diff between the previously-checked sentence list and the
 * current one. Unchanged sentences (same text, regardless of position
 * drift from edits elsewhere) are marked `changed: false` so their cached
 * issues can be carried over instead of re-sent to the model.
 */
export function diffSentences(previous: string[], current: string[]): DiffedSentence[] {
  const m = previous.length;
  const n = current.length;

  // Cap the DP table so a pathological essay can't blow up server time —
  // falls back to "everything changed" beyond that, which just costs one
  // full re-check rather than a slow diff.
  if (m > 800 || n > 800) {
    return current.map((sentence) => ({ sentence, changed: true }));
  }

  const dp: number[][] = Array.from({ length: m + 1 }, () => new Array(n + 1).fill(0));
  for (let i = m - 1; i >= 0; i--) {
    for (let j = n - 1; j >= 0; j--) {
      dp[i][j] =
        previous[i] === current[j] ? dp[i + 1][j + 1] + 1 : Math.max(dp[i + 1][j], dp[i][j + 1]);
    }
  }

  const result: DiffedSentence[] = [];
  let i = 0;
  let j = 0;
  while (i < m && j < n) {
    if (previous[i] === current[j]) {
      result.push({ sentence: current[j], changed: false });
      i++;
      j++;
    } else if (dp[i + 1][j] >= dp[i][j + 1]) {
      i++;
    } else {
      result.push({ sentence: current[j], changed: true });
      j++;
    }
  }
  while (j < n) {
    result.push({ sentence: current[j], changed: true });
    j++;
  }
  return result;
}
