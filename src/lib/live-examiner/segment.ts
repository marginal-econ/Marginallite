/**
 * Economics-aware Sentence and Paragraph Segmentation.
 * Robust to abbreviations (e.g., i.e., etc., PED, YED, PES, XED),
 * numbers/currencies ($1.5m, £2.4bn, 0.4%, Fig. 1.2), and Cambridge formatting.
 */

export type RawSegment = {
  id: string;
  from: number;
  to: number;
  text: string;
  hash: string;
  paragraphIndex: number;
  sentenceIndex: number;
  isComplete: boolean;
};

/** Normalizes sentence text for hashing (stripping volatile trailing whitespace/punct) */
export function normalizeSentenceForHash(text: string): string {
  return text
    .toLowerCase()
    .replace(/\s+/g, " ")
    .replace(/[.!?\s]+$/, "")
    .trim();
}

/** Simple fast 32-bit FNV-1a hash formatted as hex string */
export function hashString(str: string): string {
  let h = 0x811c9dc5;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return (h >>> 0).toString(16).padStart(8, "0");
}

// Abbreviations and titles that must NOT cause sentence splits when followed by a dot
const KNOWN_ABBREVIATIONS = new Set([
  "e.g",
  "i.e",
  "etc",
  "fig",
  "figs",
  "vs",
  "prof",
  "dr",
  "mr",
  "mrs",
  "ms",
  "st",
  "vol",
  "no",
  "app",
  "ped",
  "yed",
  "pes",
  "xed",
  "gdp",
  "cpi",
  "rpi",
  "uk",
  "us",
  "usa",
  "eu",
  "imf",
  "wto",
  "opec",
]);

/**
 * Checks if a dot at position `dotIndex` in `text` is an abbreviation or decimal dot rather than sentence boundary.
 */
function isNonBoundaryDot(text: string, dotIndex: number): boolean {
  // 1. Decimal numbers: digit before and digit after (e.g. 1.5, 0.4)
  if (
    dotIndex > 0 &&
    dotIndex < text.length - 1 &&
    /\d/.test(text[dotIndex - 1]!) &&
    /\d/.test(text[dotIndex + 1]!)
  ) {
    return true;
  }

  // 2. Trailing currency/number like $1.5m or 1.5bn or 1.5%
  if (
    dotIndex > 0 &&
    /\d/.test(text[dotIndex - 1]!) &&
    dotIndex + 1 < text.length &&
    /[a-zA-Z%]/.test(text[dotIndex + 1]!)
  ) {
    return true;
  }

  // 3. Scan backward for preceding token/abbreviation
  let start = dotIndex - 1;
  while (start >= 0 && /[a-zA-Z.]/.test(text[start]!)) {
    start--;
  }
  const token = text.slice(start + 1, dotIndex).toLowerCase();
  if (KNOWN_ABBREVIATIONS.has(token)) {
    return true;
  }

  // 4. Multiple dots in abbreviation like "e.g."
  if (dotIndex + 1 < text.length && text[dotIndex + 1] === ".") {
    return true;
  }

  // 5. "e.g." where second dot is followed by comma or space
  if (token === "g" && dotIndex >= 3 && text.slice(dotIndex - 3, dotIndex).toLowerCase() === "e.g") {
    return true;
  }

  return false;
}

/**
 * Segments an essay into paragraphs and sentences with exact UTF-16 character offsets.
 */
export function segmentEssay(doc: string): RawSegment[] {
  if (!doc) return [];

  const segments: RawSegment[] = [];
  const hashOccurrence = new Map<string, number>();

  // Split into paragraphs by newline sequences (\r?\n)+
  const paragraphRegex = /[^\r\n]+(?:\r?\n|$)/g;
  let pMatch: RegExpExecArray | null;
  let paragraphIndex = 0;

  // Track overall sentence counter
  let sentenceCount = 0;

  while ((pMatch = paragraphRegex.exec(doc)) !== null) {
    const pStart = pMatch.index;
    const pFullText = pMatch[0];
    // Trailing newline check
    const pText = pFullText.replace(/[\r\n]+$/, "");

    if (pText.trim().length === 0) {
      paragraphIndex++;
      continue;
    }

    // Split paragraph into sentences
    let sStart = 0;
    const pLen = pText.length;

    while (sStart < pLen) {
      // Skip leading whitespace inside paragraph
      while (sStart < pLen && /\s/.test(pText[sStart]!)) {
        sStart++;
      }
      if (sStart >= pLen) break;

      let sEnd = sStart;
      let foundBoundary = false;

      while (sEnd < pLen) {
        const char = pText[sEnd]!;

        // Terminal punctuation
        if (char === "." || char === "!" || char === "?") {
          // Check if this dot is non-boundary
          if (char === "." && isNonBoundaryDot(pText, sEnd)) {
            sEnd++;
            continue;
          }

          // Consume terminal punctuation and closing quotes/brackets: .")
          sEnd++;
          while (sEnd < pLen && /['"’”\)\]]/.test(pText[sEnd]!)) {
            sEnd++;
          }

          // Next char must be whitespace or end of paragraph to be a boundary
          if (sEnd >= pLen || /\s/.test(pText[sEnd]!)) {
            foundBoundary = true;
            break;
          }
        } else {
          sEnd++;
        }
      }

      const sentenceText = pText.slice(sStart, sEnd);
      const absFrom = pStart + sStart;
      const absTo = pStart + sEnd;

      if (sentenceText.trim().length > 0) {
        const norm = normalizeSentenceForHash(sentenceText);
        const hash = hashString(norm);
        const occ = (hashOccurrence.get(hash) ?? 0) + 1;
        hashOccurrence.set(hash, occ);

        // Unique stable id per occurrence
        const id = `s_${hash}_${occ}`;

        // Complete if ends with . ! ? or ended at paragraph boundary with trailing newline in doc
        const isLastInDoc = absTo >= doc.trimEnd().length;
        const endsWithPunct = /[.!?]['"’”\)\]]*$/.test(sentenceText.trim());
        const followedByNewline = pFullText.endsWith("\n") && sEnd >= pLen;
        const isComplete = endsWithPunct || (followedByNewline && !isLastInDoc);

        segments.push({
          id,
          from: absFrom,
          to: absTo,
          text: sentenceText,
          hash,
          paragraphIndex,
          sentenceIndex: sentenceCount++,
          isComplete,
        });
      }

      sStart = sEnd;
    }

    paragraphIndex++;
  }

  return segments;
}
