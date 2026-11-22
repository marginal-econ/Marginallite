import { describe, expect, it } from "vitest";
import { buildQuestionRubric, extractCommandWord } from "./rubric-retrieval";
import { checkEconomicMisconceptions, analyzeCausalChain, evaluateEvaluativeDepth } from "./reasoning-engine";
import { evaluateSentenceSemantics } from "./semantic-engine";
import { buildMarkLedger } from "./mark-ledger";
import { generateFeedbackAndOpportunities } from "./score-maximizer";

describe("Live Examiner 2.0 Engines", () => {
  describe("Rubric Retrieval Engine", () => {
    it("extracts command word and sets evaluation expectations accordingly", () => {
      const qDiscuss = "Discuss the extent to which an indirect tax reduces consumption of demerit goods.";
      expect(extractCommandWord(qDiscuss)).toBe("discuss");
      const rubricDiscuss = buildQuestionRubric({ question: qDiscuss, level: "as", maxMark: 12 });
      expect(rubricDiscuss.maximumMarks).toBe(12);
      expect(rubricDiscuss.assessmentObjectives.find((ao) => ao.ao === "AO3")?.applicable).toBe(true);

      const qExplain = "Explain how economies of scale reduce average total costs.";
      expect(extractCommandWord(qExplain)).toBe("explain");
      const rubricExplain = buildQuestionRubric({ question: qExplain, level: "as", maxMark: 8 });
      expect(rubricExplain.assessmentObjectives.find((ao) => ao.ao === "AO3")?.applicable).toBe(false);
    });

    it("builds level descriptors for 20m questions", () => {
      const rubric20 = buildQuestionRubric({
        question: "Evaluate whether monetary policy is the most effective policy to control inflation.",
        level: "a2",
        maxMark: 20,
      });
      expect(rubric20.levelDescriptors.length).toBe(4);
      expect(rubric20.levelDescriptors[0]!.markRange).toEqual([16, 20]);
    });
  });

  describe("Economic Reasoning Engine", () => {
    it("catches deterministic misconceptions", () => {
      const sentence = "An indirect tax will shift the demand curve to the left.";
      const issues = checkEconomicMisconceptions(sentence, "s1");
      expect(issues.length).toBe(1);
      expect(issues[0]!.category).toBe("economics_accuracy");
      expect(issues[0]!.suggestion).toContain("supply curve");
    });

    it("catches demand vs quantity demanded confusion", () => {
      const sentence = "A rise in price decreases demand for normal goods.";
      const issues = checkEconomicMisconceptions(sentence, "s2");
      expect(issues.length).toBe(1);
      expect(issues[0]!.suggestion).toContain("contraction in quantity demanded");
    });

    it("detects complete vs incomplete causal transmission chains", () => {
      const incomplete = "Because taxes are imposed, output contracts and jobs are lost.";
      const incompleteResult = analyzeCausalChain(incomplete);
      expect(incompleteResult.isComplete).toBe(false);
      expect(incompleteResult.missingLinks.length).toBeGreaterThan(0);

      const complete =
        "Because an indirect tax raises average costs of production, supply shifts vertically upwards, causing market price to rise and equilibrium quantity to contract.";
      const completeResult = analyzeCausalChain(complete);
      expect(completeResult.isComplete).toBe(true);
      expect(completeResult.missingLinks.length).toBe(0);
    });

    it("evaluates genuine evaluative depth", () => {
      const deepEval =
        "However, in the short run demand is price inelastic; therefore, on balance the policy's success depends upon whether long run substitutes emerge.";
      const evalResult = evaluateEvaluativeDepth(deepEval);
      expect(evalResult.depth).toBe("justified_judgement");
      expect(evalResult.criteriaDetected).toContain("Time Horizon / Elasticity Dynamics");
      expect(evalResult.criteriaDetected).toContain("Price Elasticity Dependency");
      expect(evalResult.criteriaDetected).toContain("Decisive Supported Judgement");
    });
  });

  describe("Semantic Intelligence Engine", () => {
    it("classifies definition accurately as AO1 knowledge and does not misclassify as AO2", () => {
      const rubric = buildQuestionRubric({
        question: "Discuss the view that free trade is always beneficial.",
        level: "as",
        maxMark: 12,
      });
      const result = evaluateSentenceSemantics({
        sentence: {
          id: "s_def",
          text: "Free trade is defined as the unrestricted purchase and sale of goods and services between countries without tariffs or quotas.",
          paragraphText: "Free trade is defined as...",
          paragraphIndex: 0,
          sentenceIndex: 0,
        },
        docVersion: 1,
        rubric,
      });
      expect(result.primaryAO).toBe("AO1");
      expect(result.confidence).toBeGreaterThan(0.8);
    });

    it("classifies multi-step causal mechanism as AO2 analysis", () => {
      const rubric = buildQuestionRubric({
        question: "Discuss the view that free trade is always beneficial.",
        level: "as",
        maxMark: 12,
      });
      const result = evaluateSentenceSemantics({
        sentence: {
          id: "s_chain",
          text: "When tariffs are removed, cheaper imported raw materials lower average costs of production, shifting domestic supply rightward and reducing equilibrium consumer prices.",
          paragraphText: "When tariffs are removed...",
          paragraphIndex: 1,
          sentenceIndex: 0,
        },
        docVersion: 1,
        rubric,
      });
      expect(result.primaryAO).toBe("AO2");
      expect(result.economicFunction).toContain("causal transmission");
    });
  });

  describe("Mark Ledger Engine & Anti-Duplication Protection", () => {
    it("awards marks for distinct arguments and prevents duplicate credit for repeated definitions", () => {
      const rubric = buildQuestionRubric({
        question: "Discuss whether indirect taxes are effective in reducing consumption of demerit goods.",
        level: "as",
        maxMark: 12,
      });

      const sentences = [
        {
          id: "s1",
          text: "Demerit goods are goods that are more harmful to consumers than they realize due to information failure.",
          paragraphIndex: 0,
          isComplete: true,
        },
        {
          id: "s2",
          text: "A demerit good is defined as a product whose consumption causes negative externalities and information failure.",
          paragraphIndex: 0,
          isComplete: true,
        },
        {
          id: "s3",
          text: "An indirect tax raises production costs, which shifts the supply curve upwards from S1 to S2, increasing market price and reducing quantity traded.",
          paragraphIndex: 1,
          isComplete: true,
        },
        {
          id: "s4",
          text: "However, in the short run demand is highly inelastic; on balance, the effectiveness depends crucially upon the availability of close substitutes.",
          paragraphIndex: 2,
          isComplete: true,
        },
      ];

      const classifications = sentences.map((s, idx) =>
        evaluateSentenceSemantics({
          sentence: {
            id: s.id,
            text: s.text,
            paragraphText: s.text,
            paragraphIndex: s.paragraphIndex,
            sentenceIndex: idx,
          },
          docVersion: 1,
          rubric,
        }),
      );

      const ledgerResult = buildMarkLedger({
        sentences,
        classifications,
        rubric,
        isAiVerified: true,
      });

      // s1 and s2 both define demerit goods. Only 1 mark should be credited, not 2!
      const ao1Entries = ledgerResult.ledger.filter((e) => e.assessmentObjective === "AO1");
      expect(ao1Entries.length).toBe(1); // Grouped / filtered
      expect(ledgerResult.aoBreakdown.ao1.awarded).toBe(1);
      expect(ledgerResult.aoBreakdown.ao2.awarded).toBeGreaterThanOrEqual(1);
      expect(ledgerResult.aoBreakdown.ao3.awarded).toBeGreaterThanOrEqual(1);
      expect(ledgerResult.totalMark).toBeLessThanOrEqual(12);
    });

    it("does NOT award marks for incomplete in-progress sentences, preventing score fluctuations", () => {
      const rubric = buildQuestionRubric({
        question: "Discuss whether indirect taxes are effective in reducing consumption of demerit goods.",
        level: "as",
        maxMark: 12,
      });

      // s1 is complete (awarded 1 AO1 mark)
      // s2 is in-progress (half-typed, isComplete: false)
      const sentences = [
        {
          id: "s1",
          text: "Demerit goods are goods that are more harmful to consumers than they realize due to information failure.",
          paragraphIndex: 0,
          isComplete: true,
        },
        {
          id: "s2",
          text: "An indirect tax raises production costs which shifts the supply",
          paragraphIndex: 1,
          isComplete: false,
        },
      ];

      const classifications = sentences.map((s, idx) =>
        evaluateSentenceSemantics({
          sentence: {
            id: s.id,
            text: s.text,
            paragraphText: s.text,
            paragraphIndex: s.paragraphIndex,
            sentenceIndex: idx,
          },
          docVersion: 1,
          rubric,
        }),
      );

      const ledgerResult = buildMarkLedger({
        sentences,
        classifications,
        rubric,
      });

      // Only the completed sentence s1 should be counted; incomplete s2 should not fluctuate marks
      expect(ledgerResult.aoBreakdown.ao1.awarded).toBe(1);
      expect(ledgerResult.aoBreakdown.ao2.awarded).toBe(0); // Incomplete causal chain not credited yet
      expect(ledgerResult.totalMark).toBe(1);
    });

    it("returns uncertain state and 0 marks for young answers under 10 words", () => {
      const rubric = buildQuestionRubric({
        question: "Discuss whether free trade is desirable.",
        level: "as",
        maxMark: 12,
      });
      const sentences = [{ id: "s0", text: "Free trade is good.", paragraphIndex: 0, isComplete: true }];
      const classifications = [
        evaluateSentenceSemantics({
          sentence: { id: "s0", text: "Free trade is good.", paragraphText: "Free trade is good.", paragraphIndex: 0, sentenceIndex: 0 },
          docVersion: 1,
          rubric,
        }),
      ];
      const ledgerResult = buildMarkLedger({ sentences, classifications, rubric });
      expect(ledgerResult.status).toBe("uncertain");
      expect(ledgerResult.totalMark).toBe(0);
    });
    it("classifies demerit goods response accurately", () => {
      const q = "Assess whether the over-consumption of a demerit good should be reduced through the use of a tax or reduced through the use of a public information campaign.";
      const rubric = buildQuestionRubric({ question: q, level: "as", maxMark: 12 });
      const s1 = "Demerit goods are goods with significant negative externalities and are overvalued and overconsumed due to information failure.";
      const s2 = "Over consumption of demerit goods is a market failure (When a market fails to allocate resources efficiently).";
      const c1 = evaluateSentenceSemantics({
        sentence: { id: "s0", text: s1, paragraphText: s1 + " " + s2, paragraphIndex: 0, sentenceIndex: 0 },
        docVersion: 1,
        rubric,
      });
      const c2 = evaluateSentenceSemantics({
        sentence: { id: "s1", text: s2, paragraphText: s1 + " " + s2, paragraphIndex: 0, sentenceIndex: 1 },
        docVersion: 1,
        rubric,
      });
      expect(c1.primaryAO).toBe("AO1");
    });

    it("strictly awards 0 marks and NO_CREDIT for off-topic or non-economic motivational gibberish", () => {
      const q =
        "Assess whether the over-consumption of a demerit good should be reduced through the use of a tax or reduced through the use of a public information campaign.";
      const rubric = buildQuestionRubric({ question: q, level: "as", maxMark: 12 });

      const sentences = [
        {
          id: "s0",
          text: "Public goods are non-rival and non-excludable in nature.",
          paragraphIndex: 0,
          isComplete: true,
        },
        {
          id: "s1",
          text: "Merit goods are goods with significant positive externality, but are undervalued and underconsumed due to information failure.",
          paragraphIndex: 0,
          isComplete: true,
        },
        {
          id: "s2",
          text: "People often believe that significant changes require extraordinary actions.",
          paragraphIndex: 1,
          isComplete: true,
        },
        {
          id: "s3",
          text: "However, history and everyday experience suggest something different.",
          paragraphIndex: 1,
          isComplete: true,
        },
        {
          id: "s4",
          text: "Studying for an additional twenty minutes might seem unimportant when compared with the hundreds of hours required to complete an entire syllabus.",
          paragraphIndex: 2,
          isComplete: true,
        },
      ];

      // Off-topic economics sentences (defining public or merit goods on a demerit good prompt) must be NO_CREDIT with actionable issues
      const c0 = evaluateSentenceSemantics({
        sentence: {
          id: "s0",
          text: sentences[0].text,
          paragraphText: sentences[0].text,
          paragraphIndex: 0,
          sentenceIndex: 0,
        },
        docVersion: 1,
        rubric,
      });
      expect(c0.primaryAO).toBe("NO_CREDIT");
      expect(c0.issues.some((i) => i.category === "application" && i.original.toLowerCase().includes("public goods"))).toBe(true);

      const c1 = evaluateSentenceSemantics({
        sentence: {
          id: "s1",
          text: sentences[1].text,
          paragraphText: sentences[1].text,
          paragraphIndex: 0,
          sentenceIndex: 1,
        },
        docVersion: 1,
        rubric,
      });
      expect(c1.primaryAO).toBe("NO_CREDIT");
      expect(c1.issues.some((i) => i.category === "application" && i.original.toLowerCase().includes("merit goods"))).toBe(true);

      // Non-economic sentences must be classified as NO_CREDIT
      const c2 = evaluateSentenceSemantics({
        sentence: {
          id: "s2",
          text: sentences[2].text,
          paragraphText: sentences[2].text,
          paragraphIndex: 1,
          sentenceIndex: 0,
        },
        docVersion: 1,
        rubric,
      });
      expect(c2.primaryAO).toBe("NO_CREDIT");

      const c3 = evaluateSentenceSemantics({
        sentence: {
          id: "s3",
          text: sentences[3].text,
          paragraphText: sentences[3].text,
          paragraphIndex: 1,
          sentenceIndex: 1,
        },
        docVersion: 1,
        rubric,
      });
      expect(c3.primaryAO).toBe("NO_CREDIT");

      const c4 = evaluateSentenceSemantics({
        sentence: {
          id: "s4",
          text: sentences[4].text,
          paragraphText: sentences[4].text,
          paragraphIndex: 2,
          sentenceIndex: 0,
        },
        docVersion: 1,
        rubric,
      });
      expect(c4.primaryAO).toBe("NO_CREDIT");

      const classifications = sentences.map((s, idx) =>
        evaluateSentenceSemantics({
          sentence: {
            id: s.id,
            text: s.text,
            paragraphText: s.text,
            paragraphIndex: s.paragraphIndex,
            sentenceIndex: idx,
          },
          docVersion: 1,
          rubric,
        }),
      );

      // Ledger must award 0 marks
      const ledgerResult = buildMarkLedger({
        sentences,
        classifications,
        rubric,
      });
      expect(ledgerResult.totalMark).toBe(0);
      expect(ledgerResult.aoBreakdown.ao1.awarded).toBe(0);
      expect(ledgerResult.aoBreakdown.ao2.awarded).toBe(0);
      expect(ledgerResult.aoBreakdown.ao3.awarded).toBe(0);
    });

    it("accurately marks AO breakdown: 1 definition sentence earns 1 AO1 mark", () => {
      const q = "Assess whether the over-consumption of a demerit good should be reduced through the use of a tax or reduced through the use of a public information campaign.";
      const rubric = buildQuestionRubric({ question: q, level: "as", maxMark: 12 });

      const singleDef = [
        {
          id: "s1",
          text: "A demerit good is defined as a product that causes negative externalities in consumption and is overconsumed due to information failure.",
          paragraphIndex: 0,
          isComplete: true,
        },
      ];

      const c = singleDef.map((s, idx) =>
        evaluateSentenceSemantics({
          sentence: {
            id: s.id,
            text: s.text,
            paragraphText: s.text,
            paragraphIndex: s.paragraphIndex,
            sentenceIndex: idx,
          },
          docVersion: 1,
          rubric,
        }),
      );

      const ledgerResult = buildMarkLedger({
        sentences: singleDef,
        classifications: c,
        rubric,
      });

      expect(c[0].primaryAO).toBe("AO1");
      expect(ledgerResult.aoBreakdown.ao1.awarded).toBe(1);
      expect(ledgerResult.aoBreakdown.ao2.awarded).toBe(0);
      expect(ledgerResult.aoBreakdown.ao3.awarded).toBe(0);
      expect(ledgerResult.totalMark).toBe(1);
    });
  });

  describe("Score Maximizer Engine", () => {
    it("generates prioritized, educational feedback opportunities", () => {
      const rubric = buildQuestionRubric({
        question: "Discuss whether free trade is desirable.",
        level: "as",
        maxMark: 12,
      });

      const feedback = generateFeedbackAndOpportunities({
        ledger: [
          {
            argumentId: "arg1",
            sentenceIds: ["s1"],
            assessmentObjective: "AO1",
            rubricCriterion: "Definitions",
            evidence: "Free trade is defined as...",
            awardedCredit: 1,
            missingDevelopment: [],
            status: "verified",
            reasoning: "Accurate definition",
          },
        ],
        rubric,
        aoBreakdown: {
          ao1: { awarded: 1, max: 3 },
          ao2: { awarded: 0, max: 6 },
          ao3: { awarded: 0, max: 3 },
        },
        totalWords: 35,
      });

      expect(feedback.opportunities.length).toBeGreaterThan(0);
      // Top opportunity should address missing AO1 definition or AO2 causal chain
      const targets = feedback.opportunities.map((o) => o.aoTarget);
      expect(targets).toContain("ao1");
      expect(targets).toContain("ao2");
    });

    it("recommends developing additional mechanisms rather than insisting on empirical real-world examples", () => {
      const rubric = buildQuestionRubric({
        question: "Assess whether the over-consumption of a demerit good should be reduced through the use of a tax or reduced through the use of a public information campaign.",
        level: "as",
        maxMark: 12,
      });

      const feedback = generateFeedbackAndOpportunities({
        ledger: [
          {
            argumentId: "arg1",
            sentenceIds: ["s1"],
            assessmentObjective: "AO1",
            rubricCriterion: "Definitions",
            evidence: "Demerit goods are goods that...",
            awardedCredit: 2,
            missingDevelopment: [],
            status: "verified",
            reasoning: "Accurate definition",
          },
          {
            argumentId: "arg2",
            sentenceIds: ["s2"],
            assessmentObjective: "AO2",
            rubricCriterion: "Analysis",
            evidence: "An indirect tax raises production costs, which shifts the supply curve upwards...",
            awardedCredit: 2,
            missingDevelopment: [],
            status: "verified",
            reasoning: "Complete theoretical transmission chain",
          },
        ],
        rubric,
        aoBreakdown: {
          ao1: { awarded: 2, max: 2 },
          ao2: { awarded: 2, max: 6 },
          ao3: { awarded: 0, max: 4 },
        },
        totalWords: 80,
      });

      const ao2Opportunity = feedback.opportunities.find((o) => o.aoTarget === "ao2");
      expect(ao2Opportunity).toBeDefined();
      expect(ao2Opportunity?.title).toBe("Develop Additional Analytical Mechanism");
      expect(ao2Opportunity?.whyItMatters).toContain("Written economics alone can score full marks without empirical case studies");
    });

    it("awards full AO2 marks for sound theoretical causal analysis without requiring real-world country examples", () => {
      const rubric = buildQuestionRubric({
        question: "Assess whether the over-consumption of a demerit good should be reduced through the use of a tax or reduced through the use of a public information campaign.",
        level: "as",
        maxMark: 12,
      });

      const sentences = [
        {
          id: "s1",
          text: "Demerit goods are goods that generate negative externalities in consumption and are overconsumed due to information failure.",
          paragraphIndex: 0,
          isComplete: true,
        },
        {
          id: "s2",
          text: "An indirect tax raises production costs for firms, which shifts the supply curve upwards by the tax amount, causing equilibrium price to rise and quantity demanded to contract.",
          paragraphIndex: 1,
          isComplete: true,
        },
      ];

      const classifications = sentences.map((s, idx) =>
        evaluateSentenceSemantics({
          sentence: {
            id: s.id,
            text: s.text,
            paragraphText: s.text,
            paragraphIndex: s.paragraphIndex,
            sentenceIndex: idx,
          },
          docVersion: 1,
          rubric,
        }),
      );

      const ledgerResult = buildMarkLedger({
        sentences,
        classifications,
        rubric,
      });

      // s2 is a pure theoretical causal transmission chain. Under Cambridge IGCSE 0455, it earns full 2 marks.
      expect(ledgerResult.aoBreakdown.ao2.awarded).toBe(2);
      const ao2Ledger = ledgerResult.ledger.find((l) => l.assessmentObjective === "AO2");
      expect(ao2Ledger?.awardedCredit).toBe(2);
      expect(ao2Ledger?.missingDevelopment).toEqual([]);
    });
  });
});
