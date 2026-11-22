/**
 * Cambridge IGCSE 0455 Live Examiner Suggestion Pacing & Spreading Engine
 *
 * Ensures that the session-wide cap of 10 suggestions is smoothly spread
 * across the entire essay (intro, theoretical analysis, diagrammatic shifts,
 * evaluative weighing, and justified conclusion) rather than burning out
 * in the opening 2-3 lines.
 */

export const MAX_SESSION_SUGGESTIONS = 10;

/**
 * Returns the cumulative lifetime suggestion budget based on current essay progress.
 *
 * Progression schedule (strictly capped at 10 across the entire essay):
 * - < 2 completed sentences or < 25 words: 0 suggestions (gives the student room to start).
 * - 2-3 completed sentences or < 75 words (first 3 lines / opening): max 2 suggestions.
 * - 4-6 completed sentences or < 150 words (early body mechanism): max 4 suggestions.
 * - 7-9 completed sentences or < 250 words (second analytical strand): max 6 suggestions.
 * - 10-13 completed sentences or < 380 words (evaluative weighing): max 8 suggestions.
 * - 14+ completed sentences or 380+ words (conclusion & full essay): full 10 suggestions.
 */
export function getCumulativeSuggestionBudget(
  wordCount: number,
  completedSentenceCount: number,
): number {
  if (completedSentenceCount < 2 || wordCount < 25) {
    return 0;
  }
  if (completedSentenceCount <= 3 || wordCount < 75) {
    return 2;
  }
  if (completedSentenceCount <= 6 || wordCount < 150) {
    return 4;
  }
  if (completedSentenceCount <= 9 || wordCount < 250) {
    return 6;
  }
  if (completedSentenceCount <= 13 || wordCount < 380) {
    return 8;
  }
  return MAX_SESSION_SUGGESTIONS;
}

/**
 * Returns the maximum active suggestions permitted on-screen simultaneously.
 * Prevents overwhelming the writer with too many underlines at once.
 */
export function getMaxActiveIssues(
  wordCount: number,
  completedSentenceCount: number,
): number {
  if (completedSentenceCount < 2 || wordCount < 25) {
    return 0;
  }
  if (completedSentenceCount <= 3 || wordCount < 75) {
    return 2; // First 3 lines: max 2 active flags on screen
  }
  if (completedSentenceCount <= 6 || wordCount < 180) {
    return 2; // Early body: max 2 active flags
  }
  return 3; // Developed essay: clean max 3 active flags
}
