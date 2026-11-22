import type { Anchor, IssueV2, RawSegment } from "./types";
import { hashString, normalizeSentenceForHash } from "./segment";

/**
 * Creates a unique deterministic deduplication key for an issue.
 */
export function issueDedupeKey(
  sentenceHash: string,
  category: string,
  original: string,
): string {
  const normOriginal = original.trim().toLowerCase();
  return `${sentenceHash}::${category}::${normOriginal}`;
}

/**
 * Resolves an issue's character offsets within a given sentence segment.
 * 1. Checks exact substring match at known sentence offsets.
 * 2. Falls back to bounded fuzzy search within the sentence segment.
 * 3. Returns null if ambiguous or not found.
 */
export function resolveOffsetsInSentence(
  sentenceText: string,
  sentenceFrom: number,
  original: string,
): { from: number; to: number } | null {
  if (!original || !sentenceText) return null;

  // 1. Exact case-sensitive match
  const exactIndex = sentenceText.indexOf(original);
  if (exactIndex !== -1) {
    // Check if duplicate in the same sentence
    const secondIndex = sentenceText.indexOf(original, exactIndex + 1);
    if (secondIndex === -1) {
      return {
        from: sentenceFrom + exactIndex,
        to: sentenceFrom + exactIndex + original.length,
      };
    }
  }

  // 2. Case-insensitive match
  const lowerSentence = sentenceText.toLowerCase();
  const lowerOriginal = original.toLowerCase();
  const lowerIndex = lowerSentence.indexOf(lowerOriginal);
  if (lowerIndex !== -1) {
    const secondLowerIndex = lowerSentence.indexOf(lowerOriginal, lowerIndex + 1);
    if (secondLowerIndex === -1) {
      return {
        from: sentenceFrom + lowerIndex,
        to: sentenceFrom + lowerIndex + original.length,
      };
    }
  }

  // 3. Normalized whitespace match
  const trimmed = original.trim();
  const trimmedIndex = lowerSentence.indexOf(trimmed.toLowerCase());
  if (trimmedIndex !== -1) {
    return {
      from: sentenceFrom + trimmedIndex,
      to: sentenceFrom + trimmedIndex + trimmed.length,
    };
  }

  return null;
}

/**
 * Rebase history entry: tracks changes between document versions.
 */
export type DocChange = {
  from: number;
  to: number;
  insertedLength: number;
  version: number;
};

/**
 * Maps a position through a list of document changes.
 */
export function mapPositionThroughChanges(
  pos: number,
  changes: DocChange[],
  assoc: -1 | 1 = 1,
): number {
  let mapped = pos;
  for (const ch of changes) {
    if (ch.from <= mapped) {
      const deletedLength = ch.to - ch.from;
      if (mapped < ch.to) {
        // Position was inside the deleted range
        mapped = assoc < 0 ? ch.from : ch.from + ch.insertedLength;
      } else {
        mapped += ch.insertedLength - deletedLength;
      }
    }
  }
  return Math.max(0, mapped);
}

/**
 * Rebases an anchor from an older docVersion through subsequent document changes,
 * verifying that the document text at the rebased range still matches expected original.
 */
export function rebaseAndVerifyAnchor(
  anchor: Anchor,
  original: string,
  docText: string,
  changesSinceVersion: DocChange[],
): { from: number; to: number } | null {
  const newFrom = mapPositionThroughChanges(anchor.from, changesSinceVersion, -1);
  const newTo = mapPositionThroughChanges(anchor.to, changesSinceVersion, 1);

  if (newFrom >= newTo || newTo > docText.length) {
    return null;
  }

  const currentSpan = docText.slice(newFrom, newTo);
  if (currentSpan.toLowerCase() !== original.toLowerCase()) {
    return null; // Mismatch - drop silently
  }

  return { from: newFrom, to: newTo };
}

/**
 * Checks if a change at [changeFrom, changeTo] intersects with an issue's [from, to] span.
 */
export function isEditInsideSpan(
  changeFrom: number,
  changeTo: number,
  spanFrom: number,
  spanTo: number,
): boolean {
  return changeFrom < spanTo && changeTo > spanFrom;
}
