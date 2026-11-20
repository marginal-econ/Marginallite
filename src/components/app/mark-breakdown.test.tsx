import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { MarkBreakdown } from "./mark-breakdown";
import type { Grading } from "@/lib/examiner/types";
import { formatEconomicsMathText, stripStars } from "@/lib/utils";

describe("formatEconomicsMathText and stripStars formatting", () => {
  it("converts raw LaTeX economics variables and subscripts to clean Unicode typography", () => {
    const raw = "trade in goods and services orts ($P_x$) and raises the price of imports ($P_m$) from $10 to $20.";
    const cleaned = formatEconomicsMathText(raw);
    expect(cleaned).toContain("(Pₓ)");
    expect(cleaned).toContain("(Pₘ)");
    expect(cleaned).toContain("$10 to $20");
    expect(cleaned).not.toContain("($P_x$)");
    expect(cleaned).not.toContain("($P_m$)");
  });

  it("converts equations and subscripts for curves and variables", () => {
    const raw = "When $AD_1$ shifts to $AD_2$, equilibrium output rises from $Y_1$ to $Y_2$ and price from $P_1$ to $P_2$. Also $MSB = MSC$ and $PED < 1$.";
    const cleaned = stripStars(raw);
    expect(cleaned).toContain("AD₁");
    expect(cleaned).toContain("AD₂");
    expect(cleaned).toContain("Y₁");
    expect(cleaned).toContain("Y₂");
    expect(cleaned).toContain("P₁");
    expect(cleaned).toContain("P₂");
    expect(cleaned).toContain("MSB = MSC");
    expect(cleaned).toContain("PED < 1");
    expect(cleaned).not.toContain("$");
  });
});

describe("MarkBreakdown dynamic full-mark headers", () => {
  const baseGrading: Grading = {
    total_mark: 8,
    max_mark: 8,
    band: "Level 3",
    ao_breakdown: {
      knowledge: { awarded: 2, out_of: 2, comment: "Accurate definitions." },
      analysis: { awarded: 3, out_of: 3, comment: "Detailed causal chains." },
      evaluation: { awarded: 3, out_of: 3, comment: "Sound reasoned conclusion." },
    },
    examiner_summary: "Exceptional response fully addressing all aspects.",
    strengths: ["Clear definitions", "Step-by-step causal links"],
    weaknesses: ["Minor polish: could expand on long-run elasticity"],
    missing_elements: {
      definitions: [],
      analysis: [],
      evaluation: [],
      examples: ["Extended empirical examples"],
      diagrams: [],
    },
    actionable_feedback: ["Elaborate further on trade-offs"],
    suggested_resources: ["Cambridge IGCSE 0455 Unit 2.7: PED"],
    suggested_practice: ["Practice evaluating elasticity coefficients"],
    confidence: 0.98,
    anchorsUsed: 2,
    grounding_status: "grounded",
    sources: [],
    audited: true,
  };

  it("dynamically displays 'Optional Refinements' when score === max_mark (8/8)", () => {
    const markup = renderToStaticMarkup(<MarkBreakdown grading={baseGrading} />);

    // Must NOT contain "What cost you marks"
    expect(markup).not.toContain("What cost you marks");
    // Must NOT contain "How to elevate this answer to the next band"
    expect(markup).not.toContain("How to elevate this answer to the next band");

    // MUST contain "Optional Refinements"
    expect(markup).toContain("Optional Refinements");
  });

  it("displays 'What cost you marks' and 'How to elevate this answer to the next band' when score < max_mark", () => {
    const partialGrading: Grading = {
      ...baseGrading,
      total_mark: 5,
      max_mark: 8,
      ao_breakdown: {
        knowledge: { awarded: 2, out_of: 2, comment: "Accurate definitions." },
        analysis: { awarded: 2, out_of: 3, comment: "Basic causal links." },
        evaluation: { awarded: 1, out_of: 3, comment: "Generic conclusion." },
      },
    };

    const markup = renderToStaticMarkup(<MarkBreakdown grading={partialGrading} />);

    expect(markup).toContain("What cost you marks");
    expect(markup).toContain("How to elevate this answer to the next band");
  });

  it("renders clean (Pₓ) without raw ($P_x$) in MarkBreakdown feedback elements", () => {
    const mathGrading: Grading = {
      ...baseGrading,
      examiner_summary: "Depreciation lowers the foreign price of exports ($P_x$) and raises the domestic price of imports ($P_m$).",
      ao_breakdown: {
        ...baseGrading.ao_breakdown,
        analysis: {
          awarded: 3,
          out_of: 3,
          comment: "Analysis shows $AD_1$ shifting to $AD_2$ with price rising from $P_1$ to $P_2$.",
        },
      },
    };

    const markup = renderToStaticMarkup(<MarkBreakdown grading={mathGrading} />);

    expect(markup).toContain("(Pₓ)");
    expect(markup).toContain("(Pₘ)");
    expect(markup).toContain("AD₁");
    expect(markup).toContain("AD₂");
    expect(markup).toContain("P₁");
    expect(markup).toContain("P₂");
    expect(markup).not.toContain("($P_x$)");
    expect(markup).not.toContain("($P_m$)");
    expect(markup).not.toContain("$AD_1$");
  });
});
