import { describe, expect, it } from "vitest";
import {
  AMBIGUOUS_BELOW,
  classifySentence,
  computeRunningMark,
  endsWithCompleteSentence,
  pendingSentences,
  sentenceKey,
  type Ledger,
} from "./sentence-engine";

const LABELLED: [string, "AO1" | "AO2" | "AO3"][] = [
  ["PED is the degree of responsiveness of quantity demanded to a change in price.", "AO1"],
  ["A firm is an organisation that produces goods or services.", "AO1"],
  ["Demerit goods are goods that are overconsumed because consumers lack full information.", "AO1"],
  ["Opportunity cost is the next best alternative forgone.", "AO1"],
  ["Inflation is a sustained rise in the general price level.", "AO1"],
  ["A minimum price is a legally enforced price floor set above equilibrium.", "AO1"],
  ["A higher price causes a contraction in quantity demanded, leading to excess supply.", "AO2"],
  ["This means firms are incentivised to produce more, so output rises.", "AO2"],
  ["Consequently, the supply curve shifts inward, which raises the market price.", "AO2"],
  ["Higher interest rates raise borrowing costs, which reduces consumption and investment.", "AO2"],
  ["For example, Toyota would face higher costs of production if a tax on steel is imposed.", "AO2"],
  ["As a result, deadweight loss arises because mutually beneficial trades are prevented.", "AO2"],
  ["However, the policy is only effective if demand is price elastic.", "AO3"],
  ["On balance, the tax is likely to be ineffective in the short run.", "AO3"],
  ["The extent of the fall in consumption depends on the price elasticity of demand.", "AO3"],
  ["Although subsidies raise output, they impose a significant opportunity cost on government.", "AO3"],
  ["In conclusion, the most important factor is the time lag before supply responds.", "AO3"],
  ["Price ceilings protect consumers, but they create persistent shortages.", "AO3"],
];

describe("sentence engine", () => {
  it("classifies hand-labelled Cambridge sentences", () => {
    let right = 0;
    const wrong: string[] = [];
    for (const [s, ao] of LABELLED) {
      const r = classifySentence(s);
      if (r.ao === ao) right++;
      else wrong.push(`${ao}->${r.ao}: ${s}`);
    }
    // eslint-disable-next-line no-console
    console.log(`classifier accuracy ${right}/${LABELLED.length}`, wrong);
    expect(right / LABELLED.length).toBeGreaterThanOrEqual(0.94);
  });

  it("never lets a low-confidence guess be treated as settled", () => {
    const r = classifySentence("Output may change in this market.");
    expect(r.confidence).toBeLessThan(0.9);
  });

  it("only treats finished sentences as complete", () => {
    expect(endsWithCompleteSentence("Demand falls.")).toBe(true);
    expect(endsWithCompleteSentence("Demand falls and the")).toBe(false);
    const ledger: Ledger = new Map();
    expect(pendingSentences("Demand falls. Supply is rising quickly and the", ledger)).toEqual([]);
    expect(pendingSentences("Demand falls because prices rise. Supply is", ledger)).toEqual([
      "Demand falls because prices rise.",
    ]);
  });

  it("running mark rises as creditworthy writing is added and respects tariffs", () => {
    const parts = [
      "A minimum price is a legally enforced price floor set above the equilibrium price.",
      "This causes quantity supplied to expand while quantity demanded contracts, leading to excess supply.",
      "As a result, firms are left with unsold stock, which reduces their revenue and profit.",
      "Consequently, some firms may exit the market because the higher price raises costs of production.",
      "However, the policy is only effective if demand is price inelastic.",
      "On balance, the outcome depends on the size of the price floor and on time lags in the long run.",
    ];
    let text = "";
    let prev = -1;
    for (const p of parts) {
      text += (text ? " " : "") + p;
      const m = computeRunningMark({ text, maxMark: 12 });
      expect(m.total_mark).toBeGreaterThanOrEqual(prev);
      expect(m.total_mark).toBe(
        m.ao_breakdown.knowledge.awarded + m.ao_breakdown.analysis.awarded + m.ao_breakdown.evaluation.awarded,
      );
      expect(m.total_mark).toBeLessThanOrEqual(12);
      prev = m.total_mark;
    }
    expect(prev).toBeGreaterThanOrEqual(4);
    expect(computeRunningMark({ text: "", maxMark: 12 }).total_mark).toBe(0);
  });

  it("repeated points and wrong economics earn nothing extra", () => {
    const s = "Higher prices cause a contraction in quantity demanded, leading to excess supply.";
    const one = computeRunningMark({ text: s, maxMark: 12 }).total_mark;
    const dup = computeRunningMark({ text: `${s} ${s}`, maxMark: 12 }).total_mark;
    expect(dup).toBe(one);
    const wrong = computeRunningMark({ text: s, maxMark: 12, wrongContexts: new Set([s]) }).total_mark;
    expect(wrong).toBe(0);
  });

  it("keys ignore case, spacing and trailing punctuation", () => {
    expect(sentenceKey("Demand  falls. ")).toBe(sentenceKey("demand falls"));
    expect(AMBIGUOUS_BELOW).toBeGreaterThan(0.5);
  });
});
