import { describe, it, expect } from "vitest";
import { parsePaperQuestionsFromTexts } from "./paper-parser";

describe("parsePaperQuestionsFromTexts", () => {
  it("extracts structured questions, tariffs, and mark scheme guides from Cambridge 0455 QP and MS texts", () => {
    const qpText = `
Cambridge IGCSE
ECONOMICS 0455/22
Paper 2 Structured Questions May/June 2024
Section A
1 (a) Calculate the percentage change in the price of food. [2]
1 (b) With reference to the extract, explain two reasons why government spending increased. [4]
1 (c) Analyse, using a demand and supply diagram, how a subsidy affects the market for solar panels. [6]
1 (d) Discuss whether or not an increase in the rate of income tax will benefit an economy. [8]

Section B
2 (a) Identify two factors of production. [2]
2 (b) Explain the difference between private goods and public goods. [4]
2 (c) Analyse the advantages of a market economic system. [6]
2 (d) Discuss whether or not the benefits of free trade exceed its costs. [8]
`;

    const msText = `
Cambridge IGCSE Economics 0455/22 Mark Scheme May/June 2024
Question 1(a):
Award 1 mark for correct formula or working. Award 1 mark for correct calculation (+12.5%).

Question 1(b):
Award 2 marks for each developed reason (1 mark for identifying from extract, 1 mark for explanation).

Question 1(c):
Award up to 4 marks for demand and supply diagram (axes 1, supply curve shift right 1, equilibria 1).
Award up to 2 marks for written analysis of price fall and quantity increase.

Question 1(d):
Award up to 4 marks for discussion of benefits (higher revenue, reduced inequality).
Award up to 4 marks for discussion of drawbacks (disincentive to work, tax avoidance).
Level 3 (6-8 marks): Two-sided reasoned discussion with supported evaluation.
`;

    const questions = parsePaperQuestionsFromTexts(qpText, msText, "legacy", "22");

    expect(questions.length).toBeGreaterThanOrEqual(4);

    // Q1(a)
    const q1a = questions.find((q) => q.number === "1(a)");
    expect(q1a).toBeDefined();
    expect(q1a?.maxMark).toBe(2);
    expect(q1a?.tariff.ao1).toBe(2);
    expect(q1a?.hasDiagramRequirement).toBe(false);

    // Q1(c)
    const q1c = questions.find((q) => q.number === "1(c)");
    expect(q1c).toBeDefined();
    expect(q1c?.maxMark).toBe(6);
    expect(q1c?.hasDiagramRequirement).toBe(true);

    // Q1(d)
    const q1d = questions.find((q) => q.number === "1(d)");
    expect(q1d).toBeDefined();
    expect(q1d?.maxMark).toBe(8);
    expect(q1d?.tariff.ao3).toBeGreaterThan(0);
    expect(q1d?.markingGuide).toContain("Question 1(d)");
  });

  it("falls back gracefully to standard Cambridge 0455 paper slots when PDF text has no regex matches", () => {
    const qpEmpty = "Scanned image only or non-standard text without explicit question numbering";
    const msEmpty = "General mark scheme overview without standard headers";

    const questions = parsePaperQuestionsFromTexts(qpEmpty, msEmpty, "legacy", "22");
    expect(questions.length).toBeGreaterThanOrEqual(4);
    expect(questions.some((q) => q.number === "1(a)")).toBe(true);
    expect(questions.some((q) => q.number === "1(b)")).toBe(true);
    expect(questions.some((q) => q.number === "1(d)")).toBe(true);
  });
});
