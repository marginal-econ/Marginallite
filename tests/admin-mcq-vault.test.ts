import { describe, it, expect } from "vitest";

describe("Admin MCQ Vault Diagnostics & Normalization", () => {
  it("normalizes Cambridge past paper attempts with stem_text, user_answer, and correct_answer", () => {
    const rawAnswers = [
      {
        number: 1,
        stem_text: "1 What could cause a reduction in the factors of production in a country?",
        user_answer: "D",
        correct_answer: "A",
        correct: false,
        topic: "1.2 Factors of Production",
        unit: "Unit 1: The Basic Economic Problem",
      },
      {
        number: 2,
        stem_text: "2 A government reduces social security spending by $10bn in order to increase defence spending by $10bn.",
        user_answer: "D",
        correct_answer: "D",
        correct: true,
        topic: "4.1–4.3 Macroeconomic Aims & Fiscal Policy",
        unit: "Unit 4: Government & the Macroeconomy",
      },
      {
        number: 3,
        stem_text: "3 The diagram shows an economy located at point X on an initial PPC.",
        user_answer: null,
        correct_answer: "B",
        correct: null,
        topic: "1.4 Production Possibility Curves (PPC)",
        unit: "Unit 1: The Basic Economic Problem",
      },
    ];

    const questions = rawAnswers.map((q, idx) => {
      const qNum = q.number ?? idx + 1;
      const questionText = (q as any).question || q.stem_text || `Question ${qNum}`;
      const userAns = q.user_answer ?? null;
      const correctAns = q.correct_answer || "";
      const isCorrect =
        q.correct !== undefined && q.correct !== null
          ? Boolean(q.correct)
          : userAns && correctAns
            ? String(userAns).trim().toUpperCase() === String(correctAns).trim().toUpperCase()
            : null;

      return {
        number: qNum,
        question: questionText,
        user_answer: userAns,
        correct_answer: correctAns,
        correct: isCorrect,
        topic: q.topic || q.unit,
      };
    });

    expect(questions).toHaveLength(3);

    // Q1: attempted, wrong
    expect(questions[0].number).toBe(1);
    expect(questions[0].user_answer).toBe("D");
    expect(questions[0].correct_answer).toBe("A");
    expect(questions[0].correct).toBe(false);
    expect(questions[0].topic).toBe("1.2 Factors of Production");

    // Q2: attempted, correct
    expect(questions[1].number).toBe(2);
    expect(questions[1].user_answer).toBe("D");
    expect(questions[1].correct_answer).toBe("D");
    expect(questions[1].correct).toBe(true);

    // Q3: unattempted / skipped
    expect(questions[2].number).toBe(3);
    expect(questions[2].user_answer).toBeNull();
    expect(questions[2].correct_answer).toBe("B");
    expect(questions[2].correct).toBeNull();
  });

  it("accurately computes platform accuracy and completed papers", () => {
    const mcqs = [
      {
        id: "1",
        score: 28,
        total: 30,
        status: "marked",
        completedAt: "2026-11-21T04:51:50.234Z",
      },
      {
        id: "2",
        score: 1,
        total: 2,
        status: "marked",
        completedAt: "2026-11-21T03:31:51.066Z",
      },
      {
        id: "3",
        score: null,
        total: 30,
        status: "in_progress",
        completedAt: null,
      },
    ];

    const scored = mcqs.filter((m) => m.score !== null && m.total > 0);
    const totalQ = scored.reduce((acc, m) => acc + m.total, 0);
    const totalC = scored.reduce((acc, m) => acc + (m.score ?? 0), 0);
    const avgAccuracy = totalQ > 0 ? Math.round((totalC / totalQ) * 100) : 0;

    // total questions: 30 + 2 = 32, total correct: 28 + 1 = 29 => 29/32 = 90.6% -> 91%
    expect(totalQ).toBe(32);
    expect(totalC).toBe(29);
    expect(avgAccuracy).toBe(91);

    const completed = mcqs.filter((m) => m.status === "marked" || m.completedAt).length;
    expect(completed).toBe(2);
  });
});
