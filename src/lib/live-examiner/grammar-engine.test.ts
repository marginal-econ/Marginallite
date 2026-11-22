import { describe, expect, it } from "vitest";
import { analyzeGrammarAndMechanics, CAMBRIDGE_ECONOMICS_WHITELIST } from "./grammar-engine";

describe("Grammar and Mechanics Engine", () => {
  describe("Layer 1: Mechanics and Subject-Verb Agreement", () => {
    it("detects and corrects repeated words", () => {
      const sentence = "The inflation rate in in the economy increased.";
      const results = analyzeGrammarAndMechanics([sentence]);
      const repeated = results.find((r) => r.ruleId === "repeated_words");
      expect(repeated).toBeDefined();
      expect(repeated?.original).toBe("in in");
      expect(repeated?.suggestion).toBe("in");
      expect(repeated?.category).toBe("grammar");
    });

    it("detects singular collective subject 'the government are'", () => {
      const sentence = "The government are implementing expansionary fiscal policy.";
      const results = analyzeGrammarAndMechanics([sentence]);
      const govIssue = results.find((r) => r.ruleId === "sv_government_plural");
      expect(govIssue).toBeDefined();
      expect(govIssue?.suggestion).toBe("the government is");
    });

    it("detects plural subject disagreement 'consumers has'", () => {
      const sentence = "When real wages rise, consumers has more disposable income.";
      const results = analyzeGrammarAndMechanics([sentence]);
      const svIssue = results.find((r) => r.ruleId === "sv_consumers_has");
      expect(svIssue).toBeDefined();
      expect(svIssue?.suggestion).toBe("consumers have");
    });

    it("corrects modal verb inflection 'will causes'", () => {
      const sentence = "A tariff will causes import prices to rise.";
      const results = analyzeGrammarAndMechanics([sentence]);
      const modalIssue = results.find((r) => r.ruleId === "modal_verb_inflection");
      expect(modalIssue).toBeDefined();
      expect(modalIssue?.suggestion).toBe("will cause");
    });

    it("corrects article before vowel sound 'a economy'", () => {
      const sentence = "This policy affects a economy negatively.";
      const results = analyzeGrammarAndMechanics([sentence]);
      const articleIssue = results.find((r) => r.ruleId === "article_vowel_sound");
      expect(articleIssue).toBeDefined();
      expect(articleIssue?.suggestion).toBe("an economy");
    });

    it("corrects 'will effect demand' to 'will affect demand'", () => {
      const sentence = "A higher interest rate will effect demand for mortgages.";
      const results = analyzeGrammarAndMechanics([sentence]);
      const effectIssue = results.find((r) => r.ruleId === "affect_vs_effect");
      expect(effectIssue).toBeDefined();
      expect(effectIssue?.suggestion).toContain("affect demand");
    });

    it("corrects 'loose profit' to 'lose profit'", () => {
      const sentence = "Without protection, domestic firms will loose profit.";
      const results = analyzeGrammarAndMechanics([sentence]);
      const looseIssue = results.find((r) => r.ruleId === "loose_vs_lose");
      expect(looseIssue).toBeDefined();
      expect(looseIssue?.suggestion).toContain("lose profit");
    });
  });

  describe("Layer 2: Sentence Construction, Redundancy and Clarity", () => {
    it("streamlines 'due to the fact that' to 'because'", () => {
      const sentence = "Aggregate demand fell due to the fact that consumer confidence collapsed.";
      const results = analyzeGrammarAndMechanics([sentence]);
      const redundancyIssue = results.find((r) => r.ruleId === "redundancy_due_to_the_fact");
      expect(redundancyIssue).toBeDefined();
      expect(redundancyIssue?.suggestion).toBe("because");
      expect(redundancyIssue?.category).toBe("clarity");
    });

    it("streamlines 'in order to' to 'to'", () => {
      const sentence = "The central bank raised rates in order to curb inflation.";
      const results = analyzeGrammarAndMechanics([sentence]);
      const inOrderTo = results.find((r) => r.ruleId === "redundancy_in_order_to");
      expect(inOrderTo).toBeDefined();
      expect(inOrderTo?.suggestion).toBe("to");
    });

    it("streamlines 'take into consideration' to 'consider'", () => {
      const sentence = "Policymakers must take into consideration the opportunity cost.";
      const results = analyzeGrammarAndMechanics([sentence]);
      const considerIssue = results.find((r) => r.ruleId === "redundancy_take_into_consideration");
      expect(considerIssue).toBeDefined();
      expect(considerIssue?.suggestion).toBe("consider");
    });
  });

  describe("Layer 3: Academic Tone and Precision", () => {
    it("flags informal 'a lot of' and offers academic alternative", () => {
      const sentence = "The subsidy created a lot of employment in the region.";
      const results = analyzeGrammarAndMechanics([sentence]);
      const toneIssue = results.find((r) => r.ruleId === "academic_tone_a_lot_of");
      expect(toneIssue).toBeDefined();
      expect(toneIssue?.category).toBe("clarity");
    });

    it("replaces colloquial 'money printing' with 'quantitative easing'", () => {
      const sentence = "The central bank engaged in money printing during the crisis.";
      const results = analyzeGrammarAndMechanics([sentence]);
      const termIssue = results.find((r) => r.ruleId === "academic_tone_money_printing");
      expect(termIssue).toBeDefined();
      expect(termIssue?.suggestion).toBe("quantitative easing");
      expect(termIssue?.category).toBe("terminology");
    });

    it("corrects 'an economical policy' to 'an economic policy'", () => {
      const sentence = "This is an economical policy designed to reduce poverty.";
      const results = analyzeGrammarAndMechanics([sentence]);
      const termIssue = results.find((r) => r.ruleId === "economic_vs_economical");
      expect(termIssue).toBeDefined();
      expect(termIssue?.suggestion).toContain("economic policy");
    });

    it("corrects 'complimentary goods' to 'complementary goods'", () => {
      const sentence = "Cars and petrol are complimentary goods in joint demand.";
      const results = analyzeGrammarAndMechanics([sentence]);
      const termIssue = results.find((r) => r.ruleId === "compliment_vs_complement");
      expect(termIssue).toBeDefined();
      expect(termIssue?.suggestion).toContain("complementary goods");
    });
  });

  describe("Layer 4: Economic Misconceptions", () => {
    it("flags shift vs movement on demand curve", () => {
      const sentence = "Demand increased because the price fell in the market.";
      const results = analyzeGrammarAndMechanics([sentence]);
      const shiftIssue = results.find((r) => r.ruleId === "misconception_shift_vs_movement_demand");
      expect(shiftIssue).toBeDefined();
      expect(shiftIssue?.category).toBe("misconception");
      expect(shiftIssue?.severity).toBe("high");
      expect(shiftIssue?.evidence).toBeDefined();
    });

    it("flags 'monopoly buyer' and suggests 'monopsony'", () => {
      const sentence = "The National Health Service acts as a monopoly buyer of pharmaceuticals.";
      const results = analyzeGrammarAndMechanics([sentence]);
      const monopsonyIssue = results.find((r) => r.ruleId === "misconception_monopoly_vs_monopsony");
      expect(monopsonyIssue).toBeDefined();
      expect(monopsonyIssue?.suggestion).toContain("monopsony");
    });

    it("flags fiscal policy adjusting interest rates", () => {
      const sentence = "To control inflation, fiscal policy raised interest rates.";
      const results = analyzeGrammarAndMechanics([sentence]);
      const fiscalIssue = results.find((r) => r.ruleId === "misconception_fiscal_interest_rates");
      expect(fiscalIssue).toBeDefined();
      expect(fiscalIssue?.category).toBe("misconception");
      expect(fiscalIssue?.suggestion).toContain("monetary policy");
    });

    it("flags classifying health and education as public goods", () => {
      const sentence = "The government provides public goods such as healthcare and schools.";
      const results = analyzeGrammarAndMechanics([sentence]);
      const publicGoodIssue = results.find(
        (r) => r.ruleId === "misconception_public_vs_merit_health",
      );
      expect(publicGoodIssue).toBeDefined();
      expect(publicGoodIssue?.category).toBe("misconception");
      expect(publicGoodIssue?.suggestion).toContain("merit goods");
    });

    it("flags confusing deflation with disinflation", () => {
      const sentence = "Deflation means prices are rising slower than last month.";
      const results = analyzeGrammarAndMechanics([sentence]);
      const deflationIssue = results.find(
        (r) => r.ruleId === "misconception_deflation_vs_disinflation",
      );
      expect(deflationIssue).toBeDefined();
      expect(deflationIssue?.category).toBe("misconception");
      expect(deflationIssue?.suggestion).toContain("disinflation");
    });
  });

  describe("False-Positive Protection & Whitelist", () => {
    it("verifies Latin economic terms are present in the whitelist", () => {
      expect(CAMBRIDGE_ECONOMICS_WHITELIST.has("ceteris paribus")).toBe(true);
      expect(CAMBRIDGE_ECONOMICS_WHITELIST.has("per capita")).toBe(true);
      expect(CAMBRIDGE_ECONOMICS_WHITELIST.has("ex ante")).toBe(true);
    });

    it("verifies specialized Cambridge terms are present in whitelist", () => {
      expect(CAMBRIDGE_ECONOMICS_WHITELIST.has("diseconomies of scale")).toBe(true);
      expect(CAMBRIDGE_ECONOMICS_WHITELIST.has("merit goods")).toBe(true);
      expect(CAMBRIDGE_ECONOMICS_WHITELIST.has("marshall-lerner")).toBe(true);
      expect(CAMBRIDGE_ECONOMICS_WHITELIST.has("phillips curve")).toBe(true);
    });
  });

  describe("Real-time Typo Detection & AO Evaluation", () => {
    it("catches multiple spelling errors and evaluate AO1 on demerit goods response", async () => {
      const { deterministicTerminologyIssues } = await import("./economics-glossary");
      const { evaluateCambridgeAnswer } = await import("./client-evaluation");

      const sentence1 = "A minimum price intervention is a government intervention set above market equilibrium.";
      const sentence2 = "Demerit goods are goods that are overconsumed in an economy becuase cosumered are not aware of it's negative externailties due to information faliure.";

      const mechanics = analyzeGrammarAndMechanics([sentence2]);
      const terms = [...deterministicTerminologyIssues([sentence2]), ...mechanics];
      const originals = terms.map((t) => t.original.toLowerCase());
      expect(originals).toContain("becuase");
      expect(originals).toContain("cosumered");
      expect(originals).toContain("externailties");
      expect(originals).toContain("faliure");

      const itsIssue = mechanics.find((m) => m.ruleId === "its_vs_its_contraction");
      expect(itsIssue).toBeDefined();

      const evaluation = evaluateCambridgeAnswer(`${sentence1}\n${sentence2}`, "Assess whether minimum price reduces demerit goods", 12);
      expect(evaluation.classifications.length).toBeGreaterThanOrEqual(1);
      expect(evaluation.predictedMark.ao_breakdown.knowledge.awarded).toBeGreaterThanOrEqual(1);
      expect(evaluation.predictedMark.total_mark).toBe(
        evaluation.predictedMark.ao_breakdown.knowledge.awarded +
        evaluation.predictedMark.ao_breakdown.analysis.awarded +
        evaluation.predictedMark.ao_breakdown.evaluation.awarded
      );
    }, 15000);

    it("reliably detects student typos (fimrm, maxmise, revnuue, resposive, chnages, frims, differntiate, liek, consumer are, revenue.,) and classifies PED definition as AO1", async () => {
      const { classifySentenceDeterministically } = await import("./client-evaluation");

      const typosSentence = "A fimrm aims to maxmise revnuue., but demand is not resposive to chnages in price because consumer are liek that. Other frims differntiate products.";
      const results = analyzeGrammarAndMechanics([typosSentence]);
      const flaggedWords = results.map((r) => r.original.toLowerCase());

      expect(flaggedWords).toContain("fimrm");
      expect(flaggedWords).toContain("maxmise");
      expect(flaggedWords).toContain("revnuue");
      expect(flaggedWords).toContain("resposive");
      expect(flaggedWords).toContain("chnages");
      expect(flaggedWords).toContain("consumer are");
      expect(flaggedWords).toContain("liek");
      expect(flaggedWords).toContain("frims");
      expect(flaggedWords).toContain("differntiate");

      // Verify double punctuation typo
      const punctIssue = results.find((r) => r.ruleId === "double_punctuation_typo");
      expect(punctIssue).toBeDefined();

      // Verify PED definition is classified as AO1 Knowledge, not AO3 Evaluation
      const pedDefinition = "PED is the degree of responsiveness of quantity demanded to a change in price.";
      const classification = classifySentenceDeterministically(pedDefinition);
      expect(classification.ao).toBe("AO1");
      expect(classification.explanation).toContain("definition");
    });
  });
});
