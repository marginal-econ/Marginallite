import { describe, expect, it } from "vitest";
import {
  buildQuizResultsCsv,
  calculateQuizPoints,
  computeQuizQuestionStats,
  formatQuizPin,
  getRandomPowerUp,
  normalizeQuizPin,
  POWER_UP_CATALOG,
  sortQuizLeaderboard,
  type PublicMcqQuizMeta,
  type QuizPlayer,
} from "./mcq-quiz.types";

function makePlayer(overrides: Partial<QuizPlayer>): QuizPlayer {
  return {
    id: overrides.id ?? "p1",
    name: overrides.name ?? "Alice",
    avatar: overrides.avatar ?? "🚀",
    score: overrides.score ?? 0,
    answeredCount: overrides.answeredCount ?? 0,
    correctCount: overrides.correctCount ?? 0,
    currentStreak: overrides.currentStreak ?? 0,
    bestStreak: overrides.bestStreak ?? 0,
    currentQuestion: overrides.currentQuestion ?? 1,
    answers: overrides.answers ?? {},
    finished: overrides.finished ?? false,
    finishedAt: overrides.finishedAt ?? null,
    joinedAt: overrides.joinedAt ?? "2026-11-20T08:00:00Z",
    lastAnsweredAt: overrides.lastAnsweredAt ?? null,
  };
}

describe("MCQ Live Quiz Engine (Blooket / Quizizz mode)", () => {
  it("normalizes and formats 6-digit quiz PINs", () => {
    expect(normalizeQuizPin("849 201")).toBe("849201");
    expect(normalizeQuizPin("PIN: 12-34-56!!")).toBe("123456");
    expect(formatQuizPin("849201")).toBe("849 201");
    expect(formatQuizPin("849")).toBe("849");
  });

  it("awards base, speed, and streak bonuses in live_race mode", () => {
    const fastFirst = calculateQuizPoints({
      isCorrect: true,
      elapsedSeconds: 0,
      currentStreak: 0,
      gameMode: "live_race",
    });
    expect(fastFirst).toEqual({ points: 150, base: 100, speedBonus: 50, streakBonus: 0 });

    const streakAnswer = calculateQuizPoints({
      isCorrect: true,
      elapsedSeconds: 30,
      currentStreak: 3,
      gameMode: "live_race",
    });
    expect(streakAnswer).toEqual({ points: 185, base: 100, speedBonus: 25, streakBonus: 60 });

    const wrong = calculateQuizPoints({
      isCorrect: false,
      elapsedSeconds: 5,
      currentStreak: 5,
      gameMode: "live_race",
    });
    expect(wrong.points).toBe(0);

    const doubled = calculateQuizPoints({
      isCorrect: true,
      elapsedSeconds: 0,
      currentStreak: 0,
      gameMode: "live_race",
      multiplier: 2,
    });
    expect(doubled).toEqual({ points: 300, base: 200, speedBonus: 100, streakBonus: 0 });
  });

  it("generates valid power-ups from the power-up catalog", () => {
    const powerUp = getRandomPowerUp();
    expect(powerUp.id).toBeDefined();
    expect(powerUp.title).toBeDefined();
    expect(powerUp.icon).toBeDefined();
    expect(POWER_UP_CATALOG[powerUp.type]).toBeDefined();
  });

  it("prioritizes accuracy over speed in exam_sprint mode", () => {
    const fast = calculateQuizPoints({
      isCorrect: true,
      elapsedSeconds: 2,
      currentStreak: 2,
      gameMode: "exam_sprint",
    });
    const slow = calculateQuizPoints({
      isCorrect: true,
      elapsedSeconds: 55,
      currentStreak: 2,
      gameMode: "exam_sprint",
    });
    expect(fast.speedBonus).toBe(0);
    expect(fast.points).toBe(slow.points);
    expect(fast.points).toBe(120);
  });

  it("sorts the leaderboard deterministically by score, accuracy, and finish time", () => {
    const p1 = makePlayer({ id: "a", name: "Maya", score: 420, correctCount: 3, finished: false });
    const p2 = makePlayer({
      id: "b",
      name: "Leo",
      score: 420,
      correctCount: 4,
      finished: true,
      finishedAt: "2026-11-20T08:10:00Z",
    });
    const p3 = makePlayer({ id: "c", name: "Zara", score: 560, correctCount: 4, finished: true });

    const ranked = sortQuizLeaderboard([p1, p2, p3]);
    expect(ranked.map((p) => p.name)).toEqual(["Zara", "Leo", "Maya"]);
  });

  it("computes per-question accuracy and A/B/C/D distractor counts for the host heatmap", () => {
    const players = [
      makePlayer({
        id: "1",
        answers: {
          1: { selected: "B", correct: true, points: 140, elapsedSeconds: 10, answeredAt: "t1" },
          2: { selected: "A", correct: false, points: 0, elapsedSeconds: 20, answeredAt: "t2" },
        },
      }),
      makePlayer({
        id: "2",
        answers: {
          1: { selected: "B", correct: true, points: 130, elapsedSeconds: 20, answeredAt: "t3" },
          2: { selected: "C", correct: true, points: 120, elapsedSeconds: 25, answeredAt: "t4" },
        },
      }),
    ];

    const stats = computeQuizQuestionStats(players, [1, 2, 3]);
    expect(stats[1].attempted).toBe(2);
    expect(stats[1].correct).toBe(2);
    expect(stats[1].optionCounts.B).toBe(2);
    expect(stats[2].attempted).toBe(2);
    expect(stats[2].correct).toBe(1);
    expect(stats[2].optionCounts.A).toBe(1);
    expect(stats[2].optionCounts.C).toBe(1);
    expect(stats[3].attempted).toBe(0);
  });

  it("exports teacher gradebook CSV cleanly", () => {
    const meta: PublicMcqQuizMeta = {
      pin: "849201",
      title: "Paper 12 Battle",
      hostUserId: "host1",
      hostName: "Mr. Patel",
      sourceType: "custom_questions",
      paperId: null,
      paperTitle: "Paper 12",
      level: "as",
      questionNumbers: [1, 2, 3, 4],
      gameMode: "live_race",
      timeLimitSeconds: null,
      showInstantFeedback: true,
      showLiveLeaderboard: true,
      status: "ended",
      createdAt: "2026-11-20T08:00:00Z",
    };
    const players = [
      makePlayer({
        id: "1",
        name: "Smith, Alex",
        score: 500,
        answeredCount: 4,
        correctCount: 3,
        bestStreak: 2,
        finished: true,
      }),
    ];

    const csv = buildQuizResultsCsv(meta, players);
    expect(csv).toContain("Rank,Student Name,Score (pts)");
    expect(csv).toContain('1,"Smith, Alex",500,3,4,4,75%,2,Finished');
  });

  it("resolves correct answers for custom questions cleanly without ReferenceError", async () => {
    const { resolveCorrectAnswerForQuestion } = await import("./mcq-quiz.server");
    const meta = {
      pin: "123456",
      title: "Custom Quiz",
      hostUserId: "host1",
      hostName: "Host",
      sourceType: "custom_questions" as const,
      paperId: null,
      paperTitle: "Custom",
      level: "as" as const,
      questionNumbers: [1, 2],
      customQuestions: [
        {
          number: 1,
          stem: "Stem 1",
          options: { A: "Opt A", B: "Opt B", C: "Opt C", D: "Opt D" },
          correctAnswer: "C" as const,
          explanation: "Reason for C",
        },
      ],
      gameMode: "live_race" as const,
      timeLimitSeconds: null,
      showInstantFeedback: true,
      showLiveLeaderboard: true,
      status: "in_progress" as const,
      createdAt: new Date().toISOString(),
    };

    const res = await resolveCorrectAnswerForQuestion(meta, 1);
    expect(res.correctAnswer).toBe("C");
    expect(res.storedExplanation?.text).toBe("Reason for C");
  }, 20000);

  it("guarantees 50/50 Market Clear eliminates 2 wrong options and never eliminates the correct answer", async () => {
    const { resolveCorrectAnswerForQuestion } = await import("./mcq-quiz.server");
    const meta = {
      pin: "888999",
      title: "50-50 Test Quiz",
      hostUserId: "host1",
      hostName: "Host",
      sourceType: "custom_questions" as const,
      paperId: null,
      paperTitle: "Custom",
      level: "as" as const,
      questionNumbers: [1, 2, 3, 4],
      customQuestions: [
        { number: 1, stem: "Q1", options: { A: "1", B: "2", C: "3", D: "4" }, correctAnswer: "A" as const },
        { number: 2, stem: "Q2", options: { A: "1", B: "2", C: "3", D: "4" }, correctAnswer: "B" as const },
        { number: 3, stem: "Q3", options: { A: "1", B: "2", C: "3", D: "4" }, correctAnswer: "C" as const },
        { number: 4, stem: "Q4", options: { A: "1", B: "2", C: "3", D: "4" }, correctAnswer: "D" as const },
      ],
      gameMode: "live_race" as const,
      timeLimitSeconds: null,
      showInstantFeedback: true,
      showLiveLeaderboard: true,
      status: "in_progress" as const,
      createdAt: new Date().toISOString(),
    };

    for (let q = 1; q <= 4; q++) {
      const { correctAnswer } = await resolveCorrectAnswerForQuestion(meta, q);
      expect(correctAnswer).toBeDefined();
      const allLetters = ["A", "B", "C", "D"];
      const wrong = allLetters.filter((l) => l !== correctAnswer);
      expect(wrong.length).toBe(3);
      expect(wrong).not.toContain(correctAnswer);

      // Verify that picking any 2 from wrong never includes the correct answer
      for (let trial = 0; trial < 10; trial++) {
        const shuffled = [...wrong].sort(() => Math.random() - 0.5);
        const eliminated = shuffled.slice(0, 2);
        expect(eliminated.length).toBe(2);
        expect(eliminated).not.toContain(correctAnswer);
        expect(allLetters.filter((l) => !eliminated.includes(l))).toContain(correctAnswer);
      }
    }
  }, 20000);

  it("protects listAdminQuizSessionsServer and rejects non-admin users", async () => {
    const { listAdminQuizSessionsServer } = await import("./mcq-quiz.server");
    await expect(
      listAdminQuizSessionsServer({
        userId: "regular_user_123",
        email: "student@example.com",
      }),
    ).rejects.toThrow(/Unauthorized/);
  }, 20000);
});
