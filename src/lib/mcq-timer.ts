/**
 * Server-authoritative timer calculations and warning announcements
 * for Cambridge IGCSE 0455 MCQ examinations.
 */

export const ANNOUNCEMENT_THRESHOLDS = [
  { seconds: 600, message: "10 minutes remaining in the examination." },
  { seconds: 300, message: "5 minutes remaining in the examination." },
  { seconds: 60, message: "1 minute remaining in the examination. Answers will be submitted automatically when time expires." },
] as const;

/**
 * Calculate client-to-server clock offset in milliseconds.
 * Positive offset means the client clock is behind server clock.
 */
export function calculateClockOffset(serverNow: number, clientNow: number): number {
  return serverNow - clientNow;
}

/**
 * Compute true server-authoritative remaining time in seconds.
 * Always recomputed from absolute timestamps, never by decrementing a local counter.
 */
export function calculateRemainingSeconds(
  examEndsAtMs: number,
  clientNow: number,
  clockOffset: number = 0,
): number {
  const estimatedServerNow = clientNow + clockOffset;
  const remainingMs = examEndsAtMs - estimatedServerNow;
  return Math.max(0, Math.floor(remainingMs / 1000));
}

/**
 * Returns true if the time has expired and the exam should automatically submit.
 */
export function shouldAutoSubmit(remainingSeconds: number): boolean {
  return remainingSeconds <= 0;
}

/**
 * Server-side grace period check.
 * Submissions with exam_ends_at + 3s < NOW() are rejected or flagged as expired.
 */
export function checkSubmissionGracePeriod(
  examEndsAtMs: number,
  serverNow: number,
  graceSeconds: number = 3,
): { isGraceExceeded: boolean; deltaMs: number } {
  const deltaMs = serverNow - examEndsAtMs;
  return {
    isGraceExceeded: deltaMs > graceSeconds * 1000,
    deltaMs,
  };
}

/**
 * Determines if an accessible screen reader announcement should be triggered.
 * Announces at 10 minutes, 5 minutes, and 1 minute remaining.
 */
export function getTimerAnnouncement(
  remainingSeconds: number,
  announcedThresholds: Set<number>,
): { message: string; threshold: number } | null {
  for (const { seconds, message } of ANNOUNCEMENT_THRESHOLDS) {
    if (remainingSeconds <= seconds && !announcedThresholds.has(seconds)) {
      return { message, threshold: seconds };
    }
  }
  return null;
}

/**
 * Format remaining seconds into a crisp mm:ss string.
 */
export function formatTimer(remainingSeconds: number | null): string {
  if (remainingSeconds === null || remainingSeconds === undefined) return "--:--";
  const m = Math.floor(remainingSeconds / 60);
  const s = remainingSeconds % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}
