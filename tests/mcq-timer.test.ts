import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  calculateClockOffset,
  calculateRemainingSeconds,
  shouldAutoSubmit,
  checkSubmissionGracePeriod,
  getTimerAnnouncement,
  formatTimer,
  ANNOUNCEMENT_THRESHOLDS,
} from "@/lib/mcq-timer";
import { MCQ_PAPER_CONFIG } from "@/lib/igcse/paper-config";

describe("Server-Authoritative MCQ Timer", () => {
  const SERVER_START_MS = 1770000000000;
  const DURATION_SECONDS_LEGACY = MCQ_PAPER_CONFIG.legacy.durationSeconds; // 2700s = 45m
  const DURATION_SECONDS_2027 = MCQ_PAPER_CONFIG["2027"].durationSeconds; // 3600s = 60m
  const EXAM_ENDS_AT_MS = SERVER_START_MS + DURATION_SECONDS_LEGACY * 1000;

  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe("Clock offset and sync", () => {
    it("correctly computes zero clock offset when client and server clocks match", () => {
      const clientNow = SERVER_START_MS;
      const offset = calculateClockOffset(SERVER_START_MS, clientNow);
      expect(offset).toBe(0);
    });

    it("correctly computes positive offset when client clock is behind server (e.g. 5 seconds slow)", () => {
      const clientNow = SERVER_START_MS - 5000;
      const offset = calculateClockOffset(SERVER_START_MS, clientNow);
      expect(offset).toBe(5000);

      // Remaining seconds must match true server remaining regardless of slow client clock
      const remaining = calculateRemainingSeconds(EXAM_ENDS_AT_MS, clientNow, offset);
      expect(remaining).toBe(DURATION_SECONDS_LEGACY);
    });

    it("correctly computes negative offset when client clock is ahead of server (e.g. 10 seconds fast)", () => {
      const clientNow = SERVER_START_MS + 10000;
      const offset = calculateClockOffset(SERVER_START_MS, clientNow);
      expect(offset).toBe(-10000);

      const remaining = calculateRemainingSeconds(EXAM_ENDS_AT_MS, clientNow, offset);
      expect(remaining).toBe(DURATION_SECONDS_LEGACY);
    });
  });

  describe("Remaining time calculation and tab freeze simulation", () => {
    it("computes exact remaining seconds at mid-exam", () => {
      const elapsedMs = 15 * 60 * 1000; // 15 mins elapsed
      const clientNow = SERVER_START_MS + elapsedMs;
      const remaining = calculateRemainingSeconds(EXAM_ENDS_AT_MS, clientNow, 0);
      expect(remaining).toBe(30 * 60); // 30 mins remaining
    });

    it("handles tab backgrounding / frozen intervals when time jumps forward", () => {
      // Simulate client tab suspended for 40 minutes
      const jumpForwardMs = 40 * 60 * 1000;
      const clientNow = SERVER_START_MS + jumpForwardMs;
      const remaining = calculateRemainingSeconds(EXAM_ENDS_AT_MS, clientNow, 0);

      // 45m - 40m = 5m remaining (300s)
      expect(remaining).toBe(5 * 60);
      expect(shouldAutoSubmit(remaining)).toBe(false);
    });

    it("reaches zero and triggers auto-submit when time expires during tab freeze", () => {
      // Simulate tab waking up 46 minutes after start (1 minute past deadline)
      const jumpPastDeadlineMs = 46 * 60 * 1000;
      const clientNow = SERVER_START_MS + jumpPastDeadlineMs;
      const remaining = calculateRemainingSeconds(EXAM_ENDS_AT_MS, clientNow, 0);

      expect(remaining).toBe(0);
      expect(shouldAutoSubmit(remaining)).toBe(true);
    });

    it("works accurately for 2027 era 60-minute papers", () => {
      const endsAt2027 = SERVER_START_MS + DURATION_SECONDS_2027 * 1000;
      const clientNow = SERVER_START_MS + 20 * 60 * 1000; // 20m elapsed
      const remaining = calculateRemainingSeconds(endsAt2027, clientNow, 0);

      expect(remaining).toBe(40 * 60); // 40m remaining
    });
  });

  describe("Server-side grace window verification", () => {
    it("accepts submissions received within 3-second grace window after expiry", () => {
      const serverNow = EXAM_ENDS_AT_MS + 2000; // 2 seconds past deadline
      const check = checkSubmissionGracePeriod(EXAM_ENDS_AT_MS, serverNow, 3);
      expect(check.isGraceExceeded).toBe(false);
      expect(check.deltaMs).toBe(2000);
    });

    it("rejects or flags submissions exceeding 3-second grace window", () => {
      const serverNow = EXAM_ENDS_AT_MS + 4500; // 4.5 seconds past deadline
      const check = checkSubmissionGracePeriod(EXAM_ENDS_AT_MS, serverNow, 3);
      expect(check.isGraceExceeded).toBe(true);
      expect(check.deltaMs).toBe(4500);
    });
  });

  describe("Accessible screen reader warnings", () => {
    it("triggers 10-minute, 5-minute, and 1-minute announcements in sequence without repeating", () => {
      const announced = new Set<number>();

      // At 12 minutes remaining (720s) -> no announcement
      let announcement = getTimerAnnouncement(720, announced);
      expect(announcement).toBeNull();

      // At 10 minutes remaining (600s) -> announce 10m
      announcement = getTimerAnnouncement(600, announced);
      expect(announcement).not.toBeNull();
      expect(announcement?.threshold).toBe(600);
      expect(announcement?.message).toContain("10 minutes");
      announced.add(announcement!.threshold);

      // Next tick at 599s -> should not repeat 10m announcement
      announcement = getTimerAnnouncement(599, announced);
      expect(announcement).toBeNull();

      // At 5 minutes remaining (300s) -> announce 5m
      announcement = getTimerAnnouncement(300, announced);
      expect(announcement?.threshold).toBe(300);
      expect(announcement?.message).toContain("5 minutes");
      announced.add(announcement!.threshold);

      // At 1 minute remaining (60s) -> announce 1m auto-submit warning
      announcement = getTimerAnnouncement(60, announced);
      expect(announcement?.threshold).toBe(60);
      expect(announcement?.message).toContain("1 minute");
      expect(announcement?.message).toContain("submitted automatically");
      announced.add(announcement!.threshold);
    });
  });

  describe("Timer formatting", () => {
    it("formats minutes and seconds with leading zero", () => {
      expect(formatTimer(2700)).toBe("45:00");
      expect(formatTimer(65)).toBe("1:05");
      expect(formatTimer(9)).toBe("0:09");
      expect(formatTimer(0)).toBe("0:00");
      expect(formatTimer(null)).toBe("--:--");
    });
  });
});
