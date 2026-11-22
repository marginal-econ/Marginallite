import { cleanSuggestion } from "./clean-suggestion";

export function levenshteinDistance(a: string, b: string): number {
  const s1 = a.toLowerCase();
  const s2 = b.toLowerCase();
  if (s1 === s2) return 0;
  if (!s1.length) return s2.length;
  if (!s2.length) return s1.length;

  const v0 = new Array(s2.length + 1);
  const v1 = new Array(s2.length + 1);
  for (let i = 0; i <= s2.length; i++) v0[i] = i;

  for (let i = 0; i < s1.length; i++) {
    v1[0] = i + 1;
    for (let j = 0; j < s2.length; j++) {
      const cost = s1[i] === s2[j] ? 0 : 1;
      v1[j + 1] = Math.min(v1[j] + 1, v0[j + 1] + 1, v0[j] + cost);
    }
    for (let j = 0; j <= s2.length; j++) v0[j] = v1[j];
  }
  return v0[s2.length];
}

export type NormalizeIssueParams = {
  sentence: string;
  original: string;
  suggestion: string;
  category: string;
};

export type NormalizedIssueSpan = {
  original: string;
  suggestion: string;
};

/**
 * Normalizes an issue's `original` and `suggestion` spans:
 * 1. Prevents the AI from flagging an entire sentence when only 1-3 words change.
 * 2. Extracts minimal diff spans (e.g. "general price level" -> "the general price level" instead of whole sentence).
 * 3. Aligns single-word corrections (e.g. "persistant" -> "persistent") even if the AI quoted the whole sentence in `original`.
 * 4. Discards bogus no-op or hallucinatory suggestions (e.g. replacing a word with itself).
 * 5. Strictly protects against cutting or mutilating student sentences.
 */
export function normalizeIssueSpan(params: NormalizeIssueParams): NormalizedIssueSpan | null {
  const { sentence, category } = params;
  if (!sentence || !params.original || !params.suggestion) return null;

  const cleanOrig = params.original
    .replace(/\*+/g, "")
    .replace(/^["'“‘`]+|["'”’`]+$/g, "")
    .trim();
  const cleanSugg = cleanSuggestion(params.suggestion);

  if (!cleanOrig || !cleanSugg) return null;
  if (cleanOrig.toLowerCase() === cleanSugg.toLowerCase()) return null;

  // Locate cleanOrig inside sentence
  const sentLower = sentence.toLowerCase();
  const origLower = cleanOrig.toLowerCase();
  const matchIdx = sentLower.indexOf(origLower);

  let verbatimOrig = cleanOrig;
  if (matchIdx !== -1) {
    verbatimOrig = sentence.slice(matchIdx, matchIdx + cleanOrig.length);
  } else {
    // Try punctuation trimmed
    const trimmedPunct = origLower.replace(/[.,;:!?]+$/, "");
    const punctIdx = sentLower.indexOf(trimmedPunct);
    if (punctIdx !== -1 && trimmedPunct.length >= 2) {
      verbatimOrig = sentence.slice(punctIdx, punctIdx + trimmedPunct.length);
    } else {
      return null;
    }
  }

  const origWords = verbatimOrig.split(/\s+/).filter(Boolean);
  const suggWords = cleanSugg.split(/\s+/).filter(Boolean);

  // ---------------------------------------------------------------------------
  // Case 1: Both original and suggestion are multi-word phrases or sentences.
  // Extract minimal differing span so the student's whole sentence isn't underlined.
  // ---------------------------------------------------------------------------
  if (origWords.length >= 2 && suggWords.length >= 2) {
    const minLen = Math.min(verbatimOrig.length, cleanSugg.length);
    let prefixLen = 0;
    while (
      prefixLen < minLen &&
      verbatimOrig[prefixLen].toLowerCase() === cleanSugg[prefixLen].toLowerCase()
    ) {
      prefixLen++;
    }

    // Snap prefix back to last whitespace boundary
    if (prefixLen > 0 && prefixLen < minLen) {
      while (prefixLen > 0 && !/\s/.test(verbatimOrig[prefixLen - 1])) {
        prefixLen--;
      }
    }

    let suffixLen = 0;
    const maxSuffix = Math.min(
      verbatimOrig.length - prefixLen,
      cleanSugg.length - prefixLen,
    );
    while (
      suffixLen < maxSuffix &&
      verbatimOrig[verbatimOrig.length - 1 - suffixLen].toLowerCase() ===
        cleanSugg[cleanSugg.length - 1 - suffixLen].toLowerCase()
    ) {
      suffixLen++;
    }

    // Snap suffix back to next whitespace or punctuation boundary
    if (suffixLen > 0 && suffixLen < maxSuffix) {
      while (
        suffixLen > 0 &&
        !/\s|[.,;:!?]/.test(verbatimOrig[verbatimOrig.length - suffixLen])
      ) {
        suffixLen--;
      }
    }

    // Only apply prefix/suffix trimming if there is a substantive shared prefix or suffix
    // (ignore cases where they only share a trailing period but are completely different sentences)
    const hasMeaningfulOverlap =
      prefixLen >= 3 || (suffixLen >= 4 && /[a-zA-Z]/.test(verbatimOrig.slice(-suffixLen)));

    if (hasMeaningfulOverlap) {
      let trimmedOrig = verbatimOrig
        .slice(prefixLen, verbatimOrig.length - suffixLen)
        .trim();
      let trimmedSugg = cleanSugg
        .slice(prefixLen, cleanSugg.length - suffixLen)
        .trim();

      // If trimmedOrig is empty (an insertion, e.g. missing article like 'the general price level'):
      // expand trimmedOrig to include the next word in the suffix so there's an actual word to underline
      if (!trimmedOrig && suffixLen > 0) {
        const remainingSuffix = verbatimOrig.slice(verbatimOrig.length - suffixLen).trim();
        const firstWordMatch = remainingSuffix.match(/^[^\s.,;:!?]+/);
        if (firstWordMatch) {
          const anchorWord = firstWordMatch[0];
          trimmedOrig = anchorWord;
          trimmedSugg = `${trimmedSugg} ${anchorWord}`.trim();
        }
      }

      if (
        trimmedOrig.length >= 2 &&
        trimmedSugg.length >= 1 &&
        trimmedOrig.toLowerCase() !== trimmedSugg.toLowerCase() &&
        sentence.includes(trimmedOrig)
      ) {
        return {
          original: trimmedOrig,
          suggestion: trimmedSugg,
        };
      }
    }
  }

  // ---------------------------------------------------------------------------
  // Case 2: AI quoted a multi-word phrase or sentence in `original`, but `suggestion`
  // is a single word or short 2-word phrase (e.g. "persistant" -> "persistent").
  // Find the exact word inside `original` to avoid replacing the entire sentence!
  // ---------------------------------------------------------------------------
  if (origWords.length >= 4 && suggWords.length <= 2) {
    let bestWord = "";
    let bestDist = Infinity;

    for (const rawWord of origWords) {
      const cleanWord = rawWord.replace(/^[.,;:!?"'“‘`()]+|[.,;:!?"'”’`()]+$/g, "");
      if (cleanWord.length < 2) continue;
      const dist = levenshteinDistance(cleanWord, cleanSugg);
      // Relative distance threshold: max 2 edits for words >= 5 chars, 1 edit for shorter
      const maxAllowed = cleanWord.length >= 5 ? 2 : 1;
      if (dist <= maxAllowed && dist < bestDist) {
        bestDist = dist;
        bestWord = cleanWord;
      }
    }

    if (bestWord) {
      // If the suggestion is identical to what's already in the text, it's a bogus hallucination!
      if (bestWord.toLowerCase() === cleanSugg.toLowerCase()) {
        return null;
      }
      // Locate the exact matching word inside sentence
      const wordRegex = new RegExp(`\\b${bestWord.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`, "i");
      const match = wordRegex.exec(sentence);
      if (match) {
        return {
          original: match[0],
          suggestion: cleanSugg,
        };
      }
    }

    // Safety guard: For mechanics/grammar/clarity, NEVER replace a long sentence with a tiny fragment!
    if (["grammar", "clarity", "terminology"].includes(category.toLowerCase())) {
      return null;
    }
  }

  // ---------------------------------------------------------------------------
  // Case 3: Complete sentence replacement for analysis/evaluation.
  // Allowed ONLY if the suggestion is a developed, substantive sentence.
  // ---------------------------------------------------------------------------
  if (origWords.length >= 4 && suggWords.length >= 5) {
    return {
      original: verbatimOrig,
      suggestion: cleanSugg,
    };
  }

  // Default: original and suggestion are concise phrases or words
  if (verbatimOrig.toLowerCase() === cleanSugg.toLowerCase()) return null;

  return {
    original: verbatimOrig,
    suggestion: cleanSugg,
  };
}
