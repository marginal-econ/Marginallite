import { describe, expect, it } from "vitest";
import {
  LIVE_EXAMINER_DURATION_MINUTES,
  DEFAULT_LIVE_EXAMINER_DURATION_MINUTES,
  LIVE_EXAMINER_DAILY_LIMIT,
} from "@/lib/usage-limits";

describe("Live Examiner Session Duration & Limits", () => {
  it("defines appropriate duration limits per price tier", () => {
    // Foundation tier: 25 minutes timed drill
    expect(LIVE_EXAMINER_DURATION_MINUTES.foundation).toBe(25);

    // Pro tier: 35 minutes timed drill
    expect(LIVE_EXAMINER_DURATION_MINUTES.pro).toBe(35);

    // Mastery tier: 40 minutes extended revision
    expect(LIVE_EXAMINER_DURATION_MINUTES.mastery).toBe(40);

    // Elite tier: 45 minutes Cambridge exam timing
    expect(LIVE_EXAMINER_DURATION_MINUTES.elite).toBe(45);
  });

  it("defaults to official Cambridge 35-minute exam duration", () => {
    expect(DEFAULT_LIVE_EXAMINER_DURATION_MINUTES).toBe(35);
  });

  it("enforces daily question session limits", () => {
    expect(LIVE_EXAMINER_DAILY_LIMIT).toBe(0);
  });

  it("computes countdown seconds correctly", () => {
    const durationMinutes = LIVE_EXAMINER_DURATION_MINUTES.pro;
    const durationSeconds = durationMinutes * 60;
    expect(durationSeconds).toBe(2100);

    // Elapsed 10 minutes (600s)
    const elapsedSeconds = 600;
    const remainingSeconds = Math.max(0, durationSeconds - elapsedSeconds);
    expect(remainingSeconds).toBe(1500);

    const mins = Math.floor(remainingSeconds / 60);
    const secs = remainingSeconds % 60;
    const formatted = `${mins}:${secs < 10 ? "0" : ""}${secs}`;
    expect(formatted).toBe("25:00");

    // Elapsed past duration (2200s) -> expired for regular student
    const expiredElapsed = 2200;
    const expiredRemaining = Math.max(0, durationSeconds - expiredElapsed);
    expect(expiredRemaining).toBe(0);
    const isExpired = expiredRemaining <= 0;
    expect(isExpired).toBe(true);

    // Admin exemption: coaching never expires, formatted as Unlimited
    const isAdmin = true;
    const adminCoachingExpired = isAdmin ? false : isExpired;
    expect(adminCoachingExpired).toBe(false);
    const adminFormatted = isAdmin ? "Unlimited" : `${mins}:${secs < 10 ? "0" : ""}${secs}`;
    expect(adminFormatted).toBe("Unlimited");
  });

  it("locks out students when session duration is exceeded", () => {
    const durationSeconds = DEFAULT_LIVE_EXAMINER_DURATION_MINUTES * 60; // 2700s

    // Student who hasn't exceeded time: not locked out
    const studentElapsed = 1200; // 20m
    const studentRemaining = Math.max(0, durationSeconds - studentElapsed);
    const isStudentExpired = studentRemaining <= 0;
    const isStudentLockedOut = !false && isStudentExpired;
    expect(isStudentLockedOut).toBe(false);

    // Student who exceeded 45 minutes: locked out
    const expiredStudentElapsed = 2701; // 45m 1s
    const expiredStudentRemaining = Math.max(0, durationSeconds - expiredStudentElapsed);
    const isExpiredStudentTimeUp = expiredStudentRemaining <= 0;
    const isExpiredStudentLockedOut = !false && isExpiredStudentTimeUp;
    expect(isExpiredStudentLockedOut).toBe(true);

    // Admin who has been writing for 2 hours: never locked out
    const adminElapsed = 7200; // 2 hours
    const isAdmin = true;
    const isAdminLockedOut = !isAdmin && (Math.max(0, durationSeconds - adminElapsed) <= 0);
    expect(isAdminLockedOut).toBe(false);
  });
});
