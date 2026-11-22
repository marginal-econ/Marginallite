import type { Grading } from "@/lib/examiner/types";
import { stripScoreFractionsFromText } from "@/lib/examiner/types";
import { stripStars } from "@/lib/utils";

export interface Pass4Comment {
  id: string;
  category: "diagram" | "analysis" | "evaluation" | "knowledge";
  title: string;
  badge: string;
  color: "emerald" | "amber" | "rose" | "sky" | "indigo";
  paragraphIndex: number;
  paragraphLabel?: string;
  highlightText: string;
  critique: string;
  suggestion: string;
}

/**
 * Diagnostic guidance tailored specifically to Cambridge IGCSE 0455 syllabus diagrams.
 * Prevents generic supply/demand "price and quantity coordinates" from being applied to macro models or time-path models like the J-Curve.
 */
function getDiagramSyllabusGuidance(
  title: string,
  isFullMarks: boolean,
  hasExplanation: boolean,
): { critique: string; suggestion: string } {
  const lowerTitle = title.toLowerCase();

  // 1. The J-Curve Effect / Marshall-Lerner
  if (/j[\s-_]*curve/i.test(lowerTitle)) {
    if (isFullMarks) {
      return {
        critique: `Diagram (${title}) is accurately positioned in analytical flow, illustrating the time-path trajectory of the current account balance ($X - M$) following currency depreciation.`,
        suggestion: `Full marks secured. For academic distinction: consider acknowledging how non-tariff contracts, exchange rate pass-through elasticity, or domestic spare capacity influence the length of the short-run contractual lag before Marshall-Lerner holds.`,
      };
    }
    return {
      critique: hasExplanation
        ? `Diagram (${title}) is positioned in analytical flow. Ensure the time path (short-run deficit worsening where PEDx + PEDm < 1 due to contractual lags vs long-run surplus recovery where PEDx + PEDm > 1) is explicitly integrated with the current account balance on the vertical axis.`
        : `Diagram (${title}) is placed here, but subsequent analysis lacks explicit reference to the time-path mechanism: why trade balance (X - M) initially worsens before volume adjustments turn it into a surplus under the Marshall-Lerner condition.`,
      suggestion: `Explicitly reference the axes: plot Current Account Balance on the vertical y-axis against Time on the horizontal x-axis, and state the Marshall-Lerner condition (PEDx + PEDm > 1) to explain the recovery leg.`,
    };
  }

  // 2. Macroeconomic AD/AS, LRAS, SRAS, Keynesian AS, Monetary Policy, Supply-Side
  if (
    /ad[\s/-]*as|aggregate\s+demand|aggregate\s+supply|\blras\b|\bsras\b|keynesian|monetarist|classical\s+lras|capacity\s+ceiling|output\s+gap|deflationary\s+gap|inflationary\s+gap|national\s+income|demand-pull|cost-push/i.test(
      lowerTitle,
    )
  ) {
    if (isFullMarks) {
      return {
        critique: `Diagram (${title}) is accurately integrated into macroeconomic flow, illustrating shifts in aggregate demand/supply and capacity constraints.`,
        suggestion: `Full marks secured. For academic distinction: distinguish between short-run Keynesian spare capacity versus long-run classical vertical LRAS constraints.`,
      };
    }
    return {
      critique: hasExplanation
        ? `Diagram (${title}) is positioned in analytical flow. Ensure shifts in AD/AS are traced directly to changes in the general price level ($PL_1 \\to PL_2$) and real output ($Y_1 \\to Y_2$), explicitly identifying any resulting output gap or capacity constraint.`
        : `Diagram (${title}) is placed here, but subsequent analysis lacks explicit reference to general price level ($PL_1 \\to PL_2$) and real output ($Y_1 \\to Y_2$) coordinates.`,
      suggestion: `Integrate general price level coordinates ($PL_1 \\to PL_2$) and real GDP coordinates ($Y_1 \\to Y_2$) directly into your written analysis to demonstrate transmission to macroeconomic stability, noting spare capacity or full employment bottlenecks.`,
    };
  }

  // 3. Phillips Curve (Short-Run & Long-Run)
  if (/phillips/i.test(lowerTitle)) {
    if (isFullMarks) {
      return {
        critique: `Diagram (${title}) accurately illustrates the inflation-unemployment trade-off and expectations adjustments.`,
        suggestion: `Full marks secured. For academic distinction: discuss how anchored inflation expectations prevent permanent trade-offs along the SRPC.`,
      };
    }
    return {
      critique: `Diagram (${title}) is positioned here. Ensure movement along SRPC and shifts in LRPC at the Natural Rate of Unemployment (NRU) are connected directly to inflation and unemployment data.`,
      suggestion: `Explicitly reference inflation (%) on the y-axis and unemployment (%) on the x-axis, explaining how expectations shift the SRPC vertically.`,
    };
  }

  // 4. Foreign Exchange Market (Floating Exchange Rate / Currency Market)
  if (/exchange\s*rate|forex|currency\s*market/i.test(lowerTitle)) {
    if (isFullMarks) {
      return {
        critique: `Diagram (${title}) accurately models foreign exchange market equilibrium and currency flows.`,
        suggestion: `Full marks secured. For academic distinction: contrast floating market adjustments with central bank foreign exchange reserve interventions.`,
      };
    }
    return {
      critique: `Diagram (${title}) illustrates forex movements. Ensure the exchange rate price coordinates (e.g. ER1 to ER2) and shifts in currency demand/supply are explicitly connected to hot money or trade flows.`,
      suggestion: `Label the axes accurately (Price of currency on vertical, Quantity on horizontal) and link the shift in currency demand/supply to balance of payments movements.`,
    };
  }

  // 5. Monopoly, Oligopoly, Collusion, Game Theory & Market Structures
  if (/monopoly|oligopoly|kinked|cartel|pay[\s-_]*off|game\s+theory|monopolistic/i.test(lowerTitle)) {
    if (isFullMarks) {
      return {
        critique: `Diagram (${title}) accurately illustrates market structure equilibrium where profit maximisation occurs at $MC = MR$.`,
        suggestion: `Full marks secured. For academic distinction: consider contrasting short-run supernormal profit with long-run contestability or dynamic efficiency R&D reinvestment.`,
      };
    }
    return {
      critique: hasExplanation
        ? `Diagram (${title}) is positioned in analytical flow. Ensure the profit-maximising output coordinate ($MC = MR$) and corresponding price coordinate on the AR curve are explicitly integrated with supernormal profit areas or deadweight welfare loss.`
        : `Diagram (${title}) is placed here, but subsequent analysis lacks explicit reference to profit-maximising coordinates ($MC = MR$) and the price markup on the AR curve.`,
      suggestion: `Explicitly trace the coordinates: identify quantity where $MC = MR$, price on the average revenue (AR) curve, and the supernormal profit rectangle ($[P - AC] \\times Q$).`,
    };
  }

  // 6. Lorenz Curve & Gini Coefficient
  if (/lorenz|gini/i.test(lowerTitle)) {
    if (isFullMarks) {
      return {
        critique: `Diagram (${title}) accurately illustrates income inequality distribution against the line of perfect equality.`,
        suggestion: `Full marks secured. For academic distinction: evaluate the difference between pre-tax Gini coefficients and post-tax/transfer Gini coefficients.`,
      };
    }
    return {
      critique: `Ensure the Lorenz curve's deviation from the 45-degree line of perfect equality is tied directly to the Gini coefficient calculation.`,
      suggestion: `Plot Cumulative % of Population on the x-axis against Cumulative % of Income on the y-axis, explaining how fiscal policy alters the area between the curve and the 45° line.`,
    };
  }

  // 7. Production Possibility Frontier (PPF / PPC)
  if (/ppf|ppc|production\s*possibility/i.test(lowerTitle)) {
    if (isFullMarks) {
      return {
        critique: `Diagram (${title}) accurately demonstrates opportunity cost and productive capacity.`,
        suggestion: `Full marks secured. For academic distinction: evaluate how investment in capital goods shifts the PPF outward faster in future periods.`,
      };
    }
    return {
      critique: `Ensure trade-offs between capital goods and consumer goods illustrate opportunity cost and economic growth via outward PPF shifts.`,
      suggestion: `Explicitly reference the two output bundles on the axes and explain how shifting production involves increasing opportunity cost.`,
    };
  }

  // 8. General Microeconomic Supply & Demand / Tax / Subsidy / Externality
  if (isFullMarks) {
    return {
      critique: `Diagram (${title}) is accurately integrated with market equilibrium coordinates and welfare areas.`,
      suggestion: `Full marks secured. For academic distinction: consider evaluating price elasticity bounds or incidence distribution between consumers and producers.`,
    };
  }
  return {
    critique: hasExplanation
      ? `Diagram (${title}) is positioned in analytical flow, but ensure equilibrium shifts (price and quantity coordinates: P1 to P2, Q1 to Q2) and welfare areas (deadweight loss or surplus) are explicitly integrated into subsequent analysis.`
      : `Diagram (${title}) is placed here, but the immediate following paragraph lacks explicit discussion of the diagram's curves, shifts, and market equilibrium changes.`,
    suggestion: `Explicitly connect the curves shown on the diagram to the market transmission mechanism in the accompanying text to secure full Level 3 AO2 marks.`,
  };
}

export interface ParagraphBlock {
  index: number;
  text: string;
  isDiagram: boolean;
  textParagraphNumber: number | null;
  label: string;
  diagramTitle?: string;
}

/**
 * Robust detection of inline diagram blocks (e.g. [DIAGRAM: ...], (Diagram: ...)).
 */
export function isDiagramBlock(
  text: string,
  diagramMatches: { matchText: string }[] = [],
): boolean {
  const t = text.trim();
  if (/^\[\s*(?:DIAGRAM|FIGURE|FIG|GRAPH)\s*:/i.test(t)) return true;
  if (/^\(\s*(?:Diagram|Figure|Fig|Graph)\s*:/i.test(t)) return true;
  if (/^\([^)]{3,80}\)$/.test(t) && /\b(?:diagram|curve|equilibrium|shortage|surplus|ppc|ppf)\b/i.test(t)) return true;
  if (diagramMatches.some((m) => t.includes(m.matchText) || m.matchText.includes(t))) return true;
  return false;
}

/**
 * Splits essay text into discrete paragraph blocks with unified indexing and syllabus labels.
 * Guarantees that diagram labels (e.g. "Diagram (after ¶2)") reflect actual preceding text paragraphs,
 * eliminating phantom numbering.
 */
export function parseParagraphBlocks(
  essayText: string,
  diagramMatches: { matchText: string; title: string }[] = [],
): ParagraphBlock[] {
  if (!essayText.trim()) return [];

  const rawChunks = essayText
    .split(/\n\s*\n/)
    .map((chunk) => chunk.trim())
    .filter((chunk) => chunk.length > 0);

  let textCounter = 0;
  return rawChunks.map((text, index) => {
    const isDiag = isDiagramBlock(text, diagramMatches);
    if (!isDiag) {
      textCounter++;
      return {
        index,
        text,
        isDiagram: false,
        textParagraphNumber: textCounter,
        label: `¶ Paragraph ${textCounter}`,
      };
    } else {
      const matchingDiag = diagramMatches.find(
        (m) => text.includes(m.matchText) || m.matchText.includes(text),
      );
      return {
        index,
        text,
        isDiagram: true,
        textParagraphNumber: null,
        label: textCounter > 0 ? `Diagram (after ¶${textCounter})` : "Diagram (at start)",
        diagramTitle: matchingDiag?.title,
      };
    }
  });
}

/**
 * Pass 4: In-situ diagnostic alignment pass that compares the dual-examiner
 * candidate report against the candidate script, decoding diagram integration
 * and mapping specific weaknesses directly to paragraphs/sentences.
 */
export function generatePass4Comments(
  essayText: string,
  question: string,
  grading: Grading,
  diagramMatches: { title: string; matchText: string }[] = [],
): Pass4Comment[] {
  if (!essayText.trim() || !grading) return [];

  const comments: Pass4Comment[] = [];
  const blocks = parseParagraphBlocks(essayText, diagramMatches);
  if (blocks.length === 0) return [];

  // Track weakness texts already mapped to prevent duplicate diagnostics across categories
  const usedWeaknessTexts = new Set<string>();

  // Full marks check (12/12, 20/20, 8/8)
  const isFullMarks = (grading.total_mark ?? 0) >= (grading.max_mark ?? 12);

  // Helper to sanitize suggestion tone when full marks are achieved
  const formatSuggestion = (rawSuggestion: string, fallback: string) => {
    if (!isFullMarks) return rawSuggestion || fallback;
    let s = rawSuggestion || fallback;
    // Strip deficit-oriented phrases
    s = s.replace(/to push toward full marks[.,]?\s*/gi, "");
    s = s.replace(/to secure full level \d+ (?:ao\d+ )?marks[.,]?\s*/gi, "");
    s = s.replace(/to gain level \d+ (?:ao\d+ )?credit[.,]?\s*/gi, "");
    s = s.replace(/to push into the top band[.,]?\s*/gi, "");
    if (!/full marks secured|exemplar/i.test(s)) {
      s = `Full marks secured. For academic distinction: ${s.charAt(0).toLowerCase() + s.slice(1)}`;
    }
    return s;
  };

  // 1. Pass 4: Decode Diagram Placement & Integration
  if (diagramMatches.length > 0) {
    diagramMatches.forEach((m, idx) => {
      // Find the specific block where this diagram sits
      let targetBlock = blocks.find(
        (b) => b.isDiagram && (b.text.includes(m.matchText) || m.matchText.includes(b.text)),
      );
      if (!targetBlock) {
        targetBlock = blocks.find((b) => b.text.includes(m.matchText));
      }
      if (!targetBlock) {
        targetBlock = blocks.find((b) => b.isDiagram) || blocks[Math.min(1, blocks.length - 1)];
      }

      const targetIndex = targetBlock ? targetBlock.index : 0;
      const targetLabel = targetBlock ? targetBlock.label : "Diagram";
      const nextBlock = blocks[targetIndex + 1];

      // Check whether subsequent analysis explains this diagram
      const hasDetailedExplanation =
        nextBlock &&
        !nextBlock.isDiagram &&
        (nextBlock.text.toLowerCase().includes("shift") ||
          nextBlock.text.toLowerCase().includes("equilibrium") ||
          nextBlock.text.toLowerCase().includes("shortage") ||
          nextBlock.text.toLowerCase().includes("surplus") ||
          nextBlock.text.toLowerCase().includes("deadweight") ||
          nextBlock.text.toLowerCase().includes("price") ||
          nextBlock.text.toLowerCase().includes("quantity") ||
          nextBlock.text.toLowerCase().includes("marshall") ||
          nextBlock.text.toLowerCase().includes("deficit") ||
          nextBlock.text.toLowerCase().includes("current account") ||
          nextBlock.text.toLowerCase().includes("time") ||
          nextBlock.text.toLowerCase().includes("as1") ||
          nextBlock.text.toLowerCase().includes("lras") ||
          nextBlock.text.toLowerCase().includes("sras") ||
          nextBlock.text.toLowerCase().includes("gdp") ||
          nextBlock.text.toLowerCase().includes("inflation"));

      const guidance = getDiagramSyllabusGuidance(m.title, isFullMarks, Boolean(hasDetailedExplanation));

      const missingDiagramNotes = grading.missing_elements?.diagrams || [];
      const critique =
        missingDiagramNotes[0] && !isFullMarks
          ? missingDiagramNotes[0]
          : guidance.critique;

      const rawSuggestion =
        grading.actionable_feedback?.find((f) => /diagram|figure|curve|shift|j[\s-_]*curve/i.test(f)) ||
        guidance.suggestion;

      comments.push({
        id: `pass4-diagram-${idx}`,
        category: "diagram",
        title: isFullMarks ? `Diagram Integration: ${m.title}` : `Diagram Decoding: ${m.title}`,
        badge: isFullMarks ? "Diagram Mastery" : "Diagram Integration",
        color: "emerald",
        paragraphIndex: targetIndex,
        paragraphLabel: targetLabel,
        highlightText: m.matchText,
        critique: stripScoreFractionsFromText(stripStars(critique)),
        suggestion: stripScoreFractionsFromText(stripStars(formatSuggestion(rawSuggestion, guidance.suggestion))),
      });
    });
  } else {
    // If no diagram was included at all, highlight where a diagram should be integrated
    const targetBlock =
      blocks.find((b) => !b.isDiagram && b.textParagraphNumber === 2) ||
      blocks.find((b) => !b.isDiagram) ||
      blocks[0];

    const targetIndex = targetBlock ? targetBlock.index : 0;
    const targetLabel = targetBlock ? targetBlock.label : "¶ Paragraph 1";
    const paraText = targetBlock?.text || "";
    const firstSentence = paraText.split(/[.!?]\s+/)[0] || paraText.slice(0, 80);

    comments.push({
      id: "pass4-diagram-missing",
      category: "diagram",
      title: isFullMarks ? "Diagram Integration: Extension Model" : "Diagram Decoding: Visual Model Omission",
      badge: isFullMarks ? "Diagram Extension" : "Diagram Gap",
      color: isFullMarks ? "emerald" : "amber",
      paragraphIndex: targetIndex,
      paragraphLabel: targetLabel,
      highlightText: firstSentence,
      critique: isFullMarks
        ? "No diagram was included in the script. While full marks were achieved through exhaustive textual reasoning, anchoring the response to an economics diagram represents examiner best practice."
        : "No economics diagram was detected in the candidate script. Cambridge IGCSE 0455 examiners reward diagrammatic analysis under AO2 for market mechanisms.",
      suggestion: isFullMarks
        ? "Full marks secured. For academic distinction: position an economics diagram directly after this paragraph to visually anchor the transmission mechanism."
        : "Position an economics diagram directly after this paragraph to visually illustrate shifts in market equilibrium and gain Level 3 AO2 credit.",
    });
  }

  // 2. Pass 4: Map AO2 Causal Analysis Weaknesses
  const analysisWeakness =
    grading.weaknesses?.find(
      (w) =>
        !usedWeaknessTexts.has(w) &&
        /\b(analysis|causal|mechanism|mechanisms|chain|transmission|transmission\s+link|link|links|multiplier|transmission\s+mechanism)\b/i.test(w),
    ) ||
    grading.missing_elements?.analysis?.find((w) => !usedWeaknessTexts.has(w));

  if (analysisWeakness) {
    usedWeaknessTexts.add(analysisWeakness);

    // Identify best matching analytical non-diagram paragraph
    let bestBlock = blocks.find(
      (b) =>
        !b.isDiagram &&
        b.textParagraphNumber !== 1 &&
        b.index !== blocks.length - 1 &&
        (b.text.toLowerCase().includes("because") ||
          b.text.toLowerCase().includes("leads to") ||
          b.text.toLowerCase().includes("consequently") ||
          b.text.toLowerCase().includes("shifts") ||
          b.text.toLowerCase().includes("demand") ||
          b.text.toLowerCase().includes("supply") ||
          b.text.toLowerCase().includes("interest rate") ||
          b.text.toLowerCase().includes("spending") ||
          b.text.toLowerCase().includes("tax") ||
          b.text.toLowerCase().includes("depreciation") ||
          b.text.toLowerCase().includes("inflation")),
    );

    if (!bestBlock) {
      bestBlock =
        blocks.find((b) => !b.isDiagram && (b.textParagraphNumber ?? 0) >= 2) ||
        blocks.find((b) => !b.isDiagram) ||
        blocks[0];
    }

    const targetIndex = bestBlock.index;
    const targetLabel = bestBlock.label;
    const paraText = bestBlock.text;
    const firstSentence = paraText.split(/[.!?]\s+/)[0] || paraText.slice(0, 90);

    const rawSuggestion =
      grading.actionable_feedback?.find((f) => /chain|reasoning|transmission|mechanism/i.test(f)) ||
      "State every intermediate link in your economic chain: explain the shock, transmission through prices, and final market outcome.";

    comments.push({
      id: "pass4-analysis-gap",
      category: "analysis",
      title: isFullMarks ? "AO2 Synoptic Analysis: Extension & Edge Cases" : "AO2 Causal Analysis: Mechanism Transmission",
      badge: isFullMarks ? "Extension Tip" : "Analysis Gap",
      color: isFullMarks ? "sky" : "amber",
      paragraphIndex: targetIndex,
      paragraphLabel: targetLabel,
      highlightText: firstSentence,
      critique: stripScoreFractionsFromText(stripStars(analysisWeakness)),
      suggestion: stripScoreFractionsFromText(stripStars(formatSuggestion(rawSuggestion, "Consider detailing secondary economic feedbacks (e.g. wage pressures or capacity limits)."))),
    });
  }

  // 3. Pass 4: Map AO3 Critical Evaluation Weaknesses
  const evalWeakness =
    grading.weaknesses?.find(
      (w) =>
        !usedWeaknessTexts.has(w) &&
        /\b(evaluat|evaluation|conclusion|judgement|balance|depend|depends|criterion|criteria|short run|elasticity)\b/i.test(w),
    ) ||
    grading.missing_elements?.evaluation?.find((w) => !usedWeaknessTexts.has(w)) ||
    (grading.ao_breakdown?.evaluation?.out_of &&
    grading.ao_breakdown.evaluation.out_of > 0 &&
    (grading.ao_breakdown.evaluation.awarded ?? 0) < grading.ao_breakdown.evaluation.out_of &&
    grading.ao_breakdown.evaluation.comment &&
    !usedWeaknessTexts.has(grading.ao_breakdown.evaluation.comment)
      ? grading.ao_breakdown.evaluation.comment
      : null);

  if (evalWeakness && blocks.filter((b) => !b.isDiagram).length >= 2) {
    usedWeaknessTexts.add(evalWeakness);

    // Identify evaluative non-diagram paragraph
    let evalBlock = blocks
      .slice()
      .reverse()
      .find(
        (b) =>
          !b.isDiagram &&
          (b.text.toLowerCase().startsWith("however") ||
            b.text.toLowerCase().startsWith("on the other hand") ||
            b.text.toLowerCase().startsWith("in conclusion") ||
            b.text.toLowerCase().startsWith("overall") ||
            b.text.toLowerCase().includes("depends on")),
      );

    if (!evalBlock) {
      evalBlock = blocks.slice().reverse().find((b) => !b.isDiagram) || blocks[blocks.length - 1];
    }

    const targetIndex = evalBlock.index;
    const targetLabel = evalBlock.label;
    const paraText = evalBlock.text;
    const firstSentence = paraText.split(/[.!?]\s+/)[0] || paraText.slice(0, 90);

    const rawSuggestion =
      grading.actionable_feedback?.find((f) => /evaluat|weigh|criterion|conclusion/i.test(f)) ||
      "Explicitly weigh competing viewpoints against a defined economic criterion (e.g. time frame, PED elasticity, magnitude) before writing your final verdict.";

    comments.push({
      id: "pass4-eval-gap",
      category: "evaluation",
      title: isFullMarks ? "AO3 Evaluative Sophistication: Distinction Depth" : "AO3 Critical Evaluation: Depth & Weighing",
      badge: isFullMarks ? "Examiner Note" : "Evaluation Gap",
      color: isFullMarks ? "emerald" : "sky",
      paragraphIndex: targetIndex,
      paragraphLabel: targetLabel,
      highlightText: firstSentence,
      critique: stripScoreFractionsFromText(stripStars(evalWeakness)),
      suggestion: stripScoreFractionsFromText(stripStars(formatSuggestion(rawSuggestion, "Explicitly weigh competing viewpoints against a defined economic criterion (e.g. time frame or elasticity bounds)."))),
    });
  }

  // 4. Pass 4: Map AO1 Knowledge / Terminology Gaps (if any)
  // Suppress "Terminology Gap" if student secured full AO1 knowledge marks and there are no explicit missing definitions
  const hasKnowledgeGap =
    (grading.ao_breakdown?.knowledge?.awarded ?? 0) < (grading.ao_breakdown?.knowledge?.out_of ?? 2) ||
    (grading.missing_elements?.definitions && grading.missing_elements.definitions.length > 0);

  // Strict regex: must NOT match "acknowledge" as "knowledge"
  const knowledgeWeakness =
    (hasKnowledgeGap || !isFullMarks)
      ? grading.weaknesses?.find((w) => {
          if (usedWeaknessTexts.has(w)) return false;
          // Exclude instances where "acknowledge" is used without actual terminology keywords
          if (/\backnowledg/i.test(w) && !/\b(definition|terminology|formula)\b/i.test(w)) return false;
          return (
            /\b(definition|definitions|terminology|terms|formula|concept|concepts)\b/i.test(w) ||
            /\b(theoretical\s+definition|conceptual\s+precision)\b/i.test(w)
          );
        }) || grading.missing_elements?.definitions?.find((w) => !usedWeaknessTexts.has(w))
      : null;

  if (knowledgeWeakness) {
    usedWeaknessTexts.add(knowledgeWeakness);

    // Locate matching non-diagram paragraph that actually mentions the concept or default to paragraph 1
    let knowledgeBlock = blocks.find((b) => !b.isDiagram && b.textParagraphNumber === 1);
    const lowerWeakness = knowledgeWeakness.toLowerCase();
    for (const b of blocks) {
      if (b.isDiagram) continue;
      const pText = b.text.toLowerCase();
      if (
        (lowerWeakness.includes("exchange rate") && pText.includes("exchange rate")) ||
        (lowerWeakness.includes("inflation") && pText.includes("inflation")) ||
        (lowerWeakness.includes("elasticity") && pText.includes("elasticity")) ||
        (lowerWeakness.includes("balance of payments") && pText.includes("balance of payments"))
      ) {
        knowledgeBlock = b;
        break;
      }
    }

    if (!knowledgeBlock) {
      knowledgeBlock = blocks.find((b) => !b.isDiagram) || blocks[0];
    }

    const targetIndex = knowledgeBlock.index;
    const targetLabel = knowledgeBlock.label;
    const paraText = knowledgeBlock.text;
    const firstSentence = paraText.split(/[.!?]\s+/)[0] || paraText.slice(0, 90);

    comments.push({
      id: "pass4-knowledge-gap",
      category: "knowledge",
      title: isFullMarks ? "AO1 Knowledge Extension: Advanced Theoretical Framing" : "AO1 Knowledge: Conceptual Precision",
      badge: isFullMarks ? "Extension Tip" : "Terminology Gap",
      color: "indigo",
      paragraphIndex: targetIndex,
      paragraphLabel: targetLabel,
      highlightText: firstSentence,
      critique: stripScoreFractionsFromText(stripStars(knowledgeWeakness)),
      suggestion: isFullMarks
        ? "Full marks secured. For academic distinction: provide formal mathematical or textbook bounds for all economic variables."
        : "Provide formal textbook definitions for all key economic variables in your opening framing to establish full AO1 credit.",
    });
  }

  return comments;
}
