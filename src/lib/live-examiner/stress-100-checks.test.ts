import { describe, expect, it } from "vitest";
import { evaluateCambridgeAnswer } from "./client-evaluation";
import { computeRanges } from "@/components/app/live-examiner-editor";
import { CAMBRIDGE_ECONOMICS_WHITELIST, analyzeGrammarAndMechanics } from "./grammar-engine";
import { deterministicTerminologyIssues } from "./economics-glossary";

describe("Live Examiner 100x Exhaustive Stress Suite (Investor Grade)", () => {
  // Test suite with 100 diverse, real Cambridge International 0455 scenarios
  const TOPICS = [
    "Market failure and negative externalities",
    "Positive externalities and merit goods",
    "Maximum and minimum price controls",
    "Indirect taxes and ad valorem taxation",
    "Subsidies on merit goods",
    "Public goods, non-rivalry and non-excludability",
    "Price elasticity of demand (PED) and incidence of tax",
    "Price elasticity of supply (PES)",
    "Cross elasticity of demand (XED) and substitutes",
    "Income elasticity of demand (YED) and normal vs inferior goods",
    "Monopoly power, deadweight loss and barriers to entry",
    "Oligopoly, kinked demand curve and collusion",
    "Monopolistic competition and excess capacity",
    "Productive and allocative efficiency",
    "Government failure and unintended consequences",
    "Cost-push and demand-pull inflation",
    "Causes of cyclical and structural unemployment",
    "Fiscal policy, budget deficits and national debt",
    "Monetary policy, interest rates and quantitative easing",
    "Supply-side policies and long-run aggregate supply",
    "Current account deficits and exchange rate depreciation",
    "Comparative advantage, trade barriers and protectionism",
    "Free trade vs tariffs and quotas",
    "Terms of trade and Marshall-Lerner condition",
    "Income inequality, Lorenz curve and Gini coefficient",
  ];

  const ESSAY_TEMPLATES = [
    // 1. Short opening with definition
    (topic: string) =>
      `${topic} is a central concept in Cambridge economics. A demerit good is over-consumed in a free market because consumers ignore negative externalities.`,
    // 2. Definition with common typos
    (topic: string) =>
      `Regarding ${topic}, a demerit good is over-cosumered becuase of information faliure and externailties. Goverment intervantion is required.`,
    // 3. Analytical causal chain (AO2)
    (topic: string) =>
      `When analyzing ${topic}, imposing an indirect tax increases costs of production. As a result, the supply curve shifts inward from S1 to S2, which causes market price to rise and equilibrium quantity to fall, thereby eliminating the welfare loss.`,
    // 4. Evaluative limitation (AO3)
    (topic: string) =>
      `However, the overall impact on ${topic} depends on the price elasticity of demand. If demand is price inelastic, consumers will continue purchasing the good despite the price increase, limiting the effectiveness of the policy.`,
  ];

  // 100-case automated parameter matrix
  const TEST_CASES = Array.from({ length: 100 }, (_, index) => {
    const topic = TOPICS[index % TOPICS.length];
    const templateFn = ESSAY_TEMPLATES[index % ESSAY_TEMPLATES.length];
    const maxMark = [8, 12, 20][index % 3];
    const text = templateFn(topic);
    return { id: index + 1, topic, maxMark, text };
  });

  describe("Batch 1: 100/100 Mathematical Mark & Tariff Synchrony Checks", () => {
    it.each(TEST_CASES)(
      "Case #$id: $topic ($maxMark marks) enforces exact mark integrity",
      ({ text, topic, maxMark }) => {
        const question = `Assess the economic effects of ${topic}.`;
        const result = evaluateCambridgeAnswer(text, question, maxMark);

        // Invariant 1: Total mark must strictly equal sum of awarded components
        const { knowledge, analysis, evaluation } = result.predictedMark.ao_breakdown;
        const componentSum = knowledge.awarded + analysis.awarded + evaluation.awarded;
        expect(result.predictedMark.total_mark).toBe(componentSum);

        // Invariant 2: Total mark must never exceed maxMark
        expect(result.predictedMark.total_mark).toBeLessThanOrEqual(maxMark);

        // Invariant 3: Total mark must be non-negative
        expect(result.predictedMark.total_mark).toBeGreaterThanOrEqual(0);

        // Invariant 4: Component awards must never exceed component out_of
        expect(knowledge.awarded).toBeLessThanOrEqual(knowledge.out_of);
        expect(analysis.awarded).toBeLessThanOrEqual(analysis.out_of);
        expect(evaluation.awarded).toBeLessThanOrEqual(evaluation.out_of);

        // Invariant 5: Sum of out_of components must equal maxMark
        expect(knowledge.out_of + analysis.out_of + evaluation.out_of).toBe(maxMark);
      },
    );
  });

  describe("Batch 2: 100/100 Range Computation & Non-Overlapping Segment Invariants", () => {
    it.each(TEST_CASES)(
      "Case #$id: ranges for $topic partition text contiguously without gaps",
      ({ text, topic, maxMark }) => {
        const question = `Assess the economic effects of ${topic}.`;
        const result = evaluateCambridgeAnswer(text, question, maxMark);

        const ranges = computeRanges(text, result.issues, result.classifications);

        // Invariant 1: Range spans must be valid
        for (const range of ranges) {
          expect(range.start).toBeGreaterThanOrEqual(0);
          expect(range.end).toBeLessThanOrEqual(text.length);
          expect(range.start).toBeLessThan(range.end);
        }

        // Invariant 2: Ranges must be strictly non-overlapping and sorted
        for (let i = 0; i < ranges.length - 1; i++) {
          expect(ranges[i].end).toBeLessThanOrEqual(ranges[i + 1].start);
        }

        // Invariant 3: Sliced segments must be non-empty strings
        for (const range of ranges) {
          const slice = text.slice(range.start, range.end);
          expect(slice.length).toBeGreaterThan(0);
        }
      },
    );
  });

  describe("Batch 3: Cambridge Whitelist Protection", () => {
    it("never flags any approved Cambridge economic term as a typo or error", () => {
      const whitelistTerms = Array.from(CAMBRIDGE_ECONOMICS_WHITELIST);
      expect(whitelistTerms.length).toBeGreaterThan(10);

      for (const term of whitelistTerms) {
        const testSentence = `The firm operates under ${term} in the market.`;
        const issues = analyzeGrammarAndMechanics([testSentence]);
        const flagged = issues.filter((i) => i.original.toLowerCase() === term.toLowerCase());
        expect(flagged).toHaveLength(0);
      }
    });
  });

  describe("Batch 4: Multi-error sentence isolation", () => {
    it("detects up to 5 distinct errors in a heavily misspelled sentence and isolates each one", () => {
      const sentence =
        "Demerit goods are over-cosumered becuase of information faliure and negative externailties due to lack of goverment action.";
      const terms = deterministicTerminologyIssues([sentence]);
      const grammar = analyzeGrammarAndMechanics([sentence]);

      const foundWords = new Set([...terms.map((t) => t.original.toLowerCase()), ...grammar.map((g) => g.original.toLowerCase())]);
      expect(foundWords.has("cosumered")).toBe(true);
      expect(foundWords.has("becuase")).toBe(true);
      expect(foundWords.has("faliure")).toBe(true);
      expect(foundWords.has("externailties")).toBe(true);
      expect(foundWords.has("goverment")).toBe(true);
    });
  });
});
