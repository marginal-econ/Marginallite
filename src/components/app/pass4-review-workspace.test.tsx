import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { Pass4ReviewWorkspace } from "./pass4-review-workspace";
import { parseParagraphBlocks, type Pass4Comment } from "@/lib/pass4-comments";

describe("Pass4ReviewWorkspace", () => {
  const essay = [
    "A maximum price is a legally set ceiling below market equilibrium.",
    "(Diagram: Maximum Price)",
    "When the price ceiling is imposed, demand exceeds supply creating a shortage.",
    "However, black markets may emerge over time if enforcement is weak.",
  ].join("\n\n");

  const blocks = parseParagraphBlocks(essay, [
    { title: "Maximum Price", matchText: "(Diagram: Maximum Price)" },
  ]);

  const comments: Pass4Comment[] = [
    {
      id: "pass4-analysis-gap",
      category: "analysis",
      title: "AO2 Causal Analysis: Mechanism Transmission",
      badge: "Analysis Gap",
      color: "amber",
      paragraphIndex: 2,
      paragraphLabel: "¶ Paragraph 2",
      highlightText: "When the price ceiling is imposed, demand exceeds supply creating a shortage.",
      critique: "Explain how producer surplus contracts as supply falls.",
      suggestion: "Trace the movement from Pe to Pmax and Qs to Qd explicitly.",
    },
    {
      id: "pass4-eval-gap",
      category: "evaluation",
      title: "AO3 Critical Evaluation: Depth & Weighing",
      badge: "Evaluation Gap",
      color: "sky",
      paragraphIndex: 3,
      paragraphLabel: "¶ Paragraph 3",
      highlightText: "However, black markets may emerge over time if enforcement is weak.",
      critique: "Weigh short-run affordability against long-run supply exit.",
      suggestion: "Compare elasticity of supply in the short run vs long run.",
    },
  ];

  it("renders a continuous manuscript with accurate gutter markers and compact accordion feedback rail", () => {
    const html = renderToStaticMarkup(
      <Pass4ReviewWorkspace
        paragraphBlocks={blocks}
        comments={comments}
        activeCommentId="pass4-analysis-gap"
        onSelectComment={() => {}}
        essayFont="serif"
      />,
    );

    // Accurate gutter numbering (no duplicate "¶ 1 ¶ Paragraph 1")
    expect(html).toContain("¶1");
    expect(html).toContain("¶2");
    expect(html).toContain("¶3");
    expect(html).not.toContain("¶ Paragraph 1");

    // Inline figure block rendered cleanly
    expect(html).toContain("Figure: Maximum Price");

    // Active card expanded with How to Improve; inactive card collapsed (suggestion hidden until active)
    expect(html).toContain("How to Improve");
    expect(html).toContain("Trace the movement from Pe to Pmax and Qs to Qd explicitly.");
    expect(html).not.toContain("Compare elasticity of supply in the short run vs long run.");
  });

  it("renders Distinction Tip for full-mark essays and Exemplar Integration when 0 comments", () => {
    const fullMarkHtml = renderToStaticMarkup(
      <Pass4ReviewWorkspace
        paragraphBlocks={blocks}
        comments={[comments[0]]}
        activeCommentId="pass4-analysis-gap"
        onSelectComment={() => {}}
        essayFont="sans"
        isFullMarks={true}
      />,
    );
    expect(fullMarkHtml).toContain("Distinction Tip");

    const zeroCommentsHtml = renderToStaticMarkup(
      <Pass4ReviewWorkspace
        paragraphBlocks={blocks}
        comments={[]}
        activeCommentId={null}
        onSelectComment={() => {}}
        essayFont="serif"
      />,
    );
    expect(zeroCommentsHtml).toContain("Exemplar Integration");
  });
});
