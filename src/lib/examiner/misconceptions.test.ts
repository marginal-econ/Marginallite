import { describe, expect, it } from "vitest";

import {
  detectExplicitMisconceptions,
  applyMisconceptionGuardrail,
} from "./misconceptions";
import type { Grading } from "./types";

describe("Cambridge IGCSE 0455 Misconception Radar", () => {
  const CANDIDATE_ESSAY_WITH_MISCONCEPTION = `
A maximum price on housing is a government regulation that usually occurs in a mixed economy. A maximum price can be above or below market equilibrium.

A maximum price below the market equilibrium can help make housing more affordable and improve living standards. A maximum price below a market equilibrium decreases the cost of housing, leading to more consumers able to afford and buy houses. As shelter is a basic necessity, absolute poverty may decrease as more poor people can afford housing.

Low housing prices mean more immigration, increased supply of skilled labour and increased economic growth. Low housing prices may attract immigrants and workers from other areas as living costs are reduced.

A maximum price above the market equilibrium can help incentivise workers to produce more housing and increase GDP. If maximum prices are above the market equilibrium, suppliers may produce more housing as revenue is increased, as housing has an inelastic PED (necessity). This increases revenue for suppliers, leading to increased profits, while increased production leads to more GDP and economic growth, and more housing.

On the other hand, the maximum price on housing can disincentivise suppliers and lead to housing shortages. When a maximum price is introduced below the market equilibrium, workers may be disincentivised to produce as it lowers profit margins and revenue.

Also if the maximum price is set above market equilibrium, the housing prices are high and may lead to inflation. If the maximum price is set above the market equilibrium, housing becomes more expensive and may lead to increased poverty, as people don't have basic necessities like shelter.

In conclusion there are negatives and positives. But it depends on how much the maximum price is above or below the market equilibrium, and whether it is used to support suppliers or consumers.
`;

  const SOUND_ESSAY = `
A maximum price (price ceiling) is a legal maximum set by the government, which must be set below market equilibrium to be effective.

On the one hand, a maximum price below equilibrium makes housing affordable for low-income tenants, reducing poverty.
On the other hand, a maximum price below equilibrium reduces supplier profits, causing a contraction in supply and a severe housing shortage.
A maximum price set above the market equilibrium is completely ineffective and has no effect on the market price or quantity.

In conclusion, a price ceiling alone causes shortages and black markets unless combined with government construction of social housing.
`;

  it("detects the fatal maximum price above equilibrium misconception in candidate essay", () => {
    const errors = detectExplicitMisconceptions(CANDIDATE_ESSAY_WITH_MISCONCEPTION);
    expect(errors.length).toBeGreaterThan(0);
    expect(errors[0].topic).toContain("Maximum Price");
    expect(errors.some((e) => e.verbatimQuote.includes("above the market equilibrium"))).toBe(true);
  });

  it("does not falsely flag sound economics acknowledging that price ceiling above equilibrium has no effect", () => {
    const errors = detectExplicitMisconceptions(SOUND_ESSAY);
    expect(errors.length).toBe(0);
  });

  it("caps an erroneously inflated 7/8 grade down to Level 2 (max 4/8) and revokes tainted points", () => {
    const inflatedGrading: Grading = {
      total_mark: 7,
      max_mark: 8,
      band: "Band 4",
      examiner_summary: "Strong response with clear economics.",
      audited: false,
      sources: [],
      mechanism_validation: {
        core_mechanisms_sound: true,
        fatal_misconceptions_found: false,
        error_evidence_quotes: [],
      },
      ao_breakdown: {
        knowledge: { awarded: 2, out_of: 2, comment: "Accurate definitions." },
        analysis: { awarded: 3, out_of: 3, comment: "Strong causal chains." },
        evaluation: { awarded: 2, out_of: 3, comment: "Sound evaluation." },
      },
      points: [
        {
          quote: "A maximum price below the market equilibrium can help make housing more affordable",
          matched_ms_point: "Affordability / poverty reduction",
          identify_awarded: 1,
          development_awarded: 1,
          reason: "Accurate point",
        },
        {
          quote: "A maximum price above the market equilibrium can help incentivise workers to produce more housing and increase GDP",
          matched_ms_point: "Suppliers produce more",
          identify_awarded: 1,
          development_awarded: 1,
          reason: "Accurate use of PED",
        },
      ],
      strengths: ["Clear analysis of price controls"],
      weaknesses: ["Conclusion could be deeper"],
      missing_elements: {
        definitions: [],
        analysis: [],
        evaluation: [],
        examples: [],
        diagrams: [],
      },
      actionable_feedback: ["Deepen evaluation"],
      suggested_resources: ["Cambridge IGCSE 0455 Unit 4.3"],
      suggested_practice: ["Practice 8-mark Discuss questions"],
      confidence: 0.98,
      anchorsUsed: 2,
    };

    const guarded = applyMisconceptionGuardrail(
      inflatedGrading,
      8,
      { ao1_marks: 2, ao2_marks: 3, ao3_marks: 3 },
      CANDIDATE_ESSAY_WITH_MISCONCEPTION,
    );

    // Must be capped at Level 2 (max 4 marks)
    expect(guarded.total_mark).toBeLessThanOrEqual(4);
    expect(guarded.ao_breakdown.knowledge.awarded).toBeLessThanOrEqual(1);
    expect(guarded.ao_breakdown.analysis.awarded).toBeLessThanOrEqual(2);
    expect(guarded.ao_breakdown.evaluation.awarded).toBeLessThanOrEqual(1);

    // Fatal misconception flag must be true
    expect(guarded.mechanism_validation?.fatal_misconceptions_found).toBe(true);
    expect((guarded.mechanism_validation?.error_evidence_quotes?.length ?? 0)).toBeGreaterThan(0);

    // Tainted point crediting the misconception must be revoked (0 marks)
    const taintedPoint = guarded.points?.find((p) => p.quote.includes("above the market equilibrium"));
    expect(taintedPoint).toBeDefined();
    expect(taintedPoint!.identify_awarded).toBe(0);
    expect(taintedPoint!.development_awarded).toBe(0);

    // Weaknesses must explicitly explain the non-binding price control principle
    expect(guarded.weaknesses?.some((w) => w.includes("maximum price") || w.includes("non-binding"))).toBe(true);
  });
});
