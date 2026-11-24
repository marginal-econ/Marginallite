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
 * Robust detection of standalone inline diagram blocks (e.g. [DIAGRAM: ...], (Diagram: ...)).
 * A text block is ONLY a diagram block if it is primarily a diagram tag, not a normal
 * paragraph that happens to reference a diagram in passing.
 */
export function isDiagramBlock(
  text: string,
  diagramMatches: { matchText: string }[] = [],
): boolean {
  const t = text.trim();
  if (t.length === 0) return false;

  // Standalone square bracket diagram tag: e.g. [DIAGRAM: Maximum Price], [FIGURE 1: LRAS]
  if (/^\[\s*(?:DIAGRAM|FIGURE|FIG|GRAPH)\s*:[^\]]+\]$/i.test(t)) return true;
  // Standalone parenthesis diagram tag: e.g. (Diagram: Maximum Price), (Figure: J-Curve)
  if (/^\(\s*(?:Diagram|Figure|Fig|Graph)\s*:[^)]+\)$/i.test(t)) return true;
  // Short standalone bracket with explicit diagram words: e.g. (Maximum Price Diagram)
  if (/^\([^)]{3,80}\)$/.test(t) && /\b(?:diagram|curve|equilibrium|shortage|surplus|ppc|ppf)\b/i.test(t)) return true;

  // Exact match against detected diagram tags
  if (
    diagramMatches.some((m) => {
      const mt = m.matchText.trim();
      return (
        t === mt ||
        t.toLowerCase() === mt.toLowerCase() ||
        t === mt.replace(/^[(\[]|[)\]]$/g, "").trim()
      );
    })
  ) {
    return true;
  }

  // If the text has multiple sentences or is long (>120 chars), it is a text paragraph, NOT a diagram block
  if (t.length > 120 || /[.!?]\s+[A-Z]/.test(t)) {
    return false;
  }

  return false;
}

/**
 * Splits essay text into discrete paragraph blocks with unified indexing and syllabus labels.
 * Handles both double-newline (\n\n) and single-newline paragraph breaks cleanly,
 * and ensures standalone diagram lines are isolated into discrete blocks without corrupting
 * surrounding text paragraph counts.
 */
export function parseParagraphBlocks(
  essayText: string,
  diagramMatches: { matchText: string; title: string }[] = [],
): ParagraphBlock[] {
  if (!essayText.trim()) return [];

  const normalized = essayText.replace(/\r\n/g, "\n").replace(/\r/g, "\n").trim();

  // Ensure diagram tags on their own line are isolated by double-newlines
  const diagramDelimited = normalized.replace(
    /(^|\n)\s*(\[(?:DIAGRAM|FIGURE|FIG|GRAPH)\s*:[^\]]+\]|\((?:Diagram|Figure|Fig|Graph)\s*:[^)]+\))\s*($|\n)/gi,
    "\n\n$2\n\n",
  );

  let rawChunks = diagramDelimited
    .split(/\n\s*\n+/)
    .map((chunk) => chunk.trim())
    .filter((chunk) => chunk.length > 0);

  // If user used single newlines without blank lines, split by single newline if chunks <= 1
  if (rawChunks.length <= 1 && normalized.split(/\n+/).filter((l) => l.trim().length > 0).length > 1) {
    rawChunks = normalized
      .split(/\n+/)
      .map((chunk) => chunk.trim())
      .filter((chunk) => chunk.length > 0);
  }

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
        (m) =>
          text.includes(m.matchText) ||
          m.matchText.includes(text) ||
          text.toLowerCase().includes(m.title.toLowerCase()),
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
 * Common English and general evaluation stopwords that should not count
 * toward specific economic topic keyword matching.
 */
const STOP_WORDS = new Set([
  "the", "and", "for", "that", "this", "with", "from", "have", "been",
  "would", "could", "should", "also", "some", "more", "most", "than",
  "their", "they", "then", "them", "into", "over", "such", "only", "very",
  "much", "each", "which", "what", "when", "where", "candidate", "lacks",
  "lacking", "weakness", "requires", "needed", "needs", "mark", "marks",
  "level", "credit", "comment", "response", "answer", "essay", "point",
  "points", "discussion", "explanation", "explain", "analyse", "analyze",
  "analysis", "evaluate", "evaluation", "knowledge", "well", "good", "poor",
  "does", "not", "show", "shows", "about", "there", "these", "those",
  "give", "gives", "given", "using", "uses", "used", "make", "makes",
  "made", "state", "states", "stated", "detail", "details", "briefly",
  "clear", "clearly", "further", "order", "push", "toward", "full",
]);

/**
 * Extracts high-information economic keywords and bigrams from diagnostic feedback text.
 */
function extractDiagnosticKeywords(text: string): { words: string[]; phrases: string[] } {
  const clean = text.toLowerCase().replace(/[^a-z0-9\s-]/g, " ");
  const rawWords = clean.split(/\s+/).filter((w) => w.length >= 3 && !STOP_WORDS.has(w));

  // Extract key 2-word collocations (e.g. "price ceiling", "black market", "deadweight loss")
  const tokens = clean.split(/\s+/).filter(Boolean);
  const phrases: string[] = [];
  for (let i = 0; i < tokens.length - 1; i++) {
    const w1 = tokens[i];
    const w2 = tokens[i + 1];
    if (w1.length >= 3 && w2.length >= 3 && !STOP_WORDS.has(w1) && !STOP_WORDS.has(w2)) {
      phrases.push(`${w1} ${w2}`);
    }
  }

  return { words: Array.from(new Set(rawWords)), phrases: Array.from(new Set(phrases)) };
}

/**
 * Checks for explicit examiner paragraph references (e.g. "in paragraph 3", "the second paragraph", "conclusion").
 */
function findExplicitParagraphIndex(
  diagnosticText: string,
  textBlocks: ParagraphBlock[],
): ParagraphBlock | null {
  if (textBlocks.length === 0) return null;
  const lower = diagnosticText.toLowerCase();

  // Explicit number: paragraph 1, paragraph 2, paragraph 3, etc.
  const numMatch = lower.match(/\b(?:paragraph|para|¶)\s*([1-9]\d?)\b/i);
  if (numMatch) {
    const num = parseInt(numMatch[1], 10);
    const target = textBlocks.find((b) => b.textParagraphNumber === num);
    if (target) return target;
  }

  // Ordinal word references
  if (/\b(?:the\s+)?(?:first|1st|opening|introductory)\s+paragraph\b/i.test(lower)) {
    return textBlocks[0];
  }
  if (/\b(?:the\s+)?(?:second|2nd)\s+paragraph\b/i.test(lower)) {
    return textBlocks[1] || textBlocks[0];
  }
  if (/\b(?:the\s+)?(?:third|3rd)\s+paragraph\b/i.test(lower)) {
    return textBlocks[2] || textBlocks[textBlocks.length - 1];
  }
  if (/\b(?:the\s+)?(?:fourth|4th)\s+paragraph\b/i.test(lower)) {
    return textBlocks[3] || textBlocks[textBlocks.length - 1];
  }
  if (/\b(?:the\s+)?(?:fifth|5th)\s+paragraph\b/i.test(lower)) {
    return textBlocks[4] || textBlocks[textBlocks.length - 1];
  }
  if (/\b(?:concluding\s+paragraph|final\s+paragraph|last\s+paragraph|in\s+conclusion)\b/i.test(lower)) {
    return textBlocks[textBlocks.length - 1];
  }

  return null;
}

/**
 * Robustly matches an examiner diagnostic / weakness comment to the most accurate
 * paragraph block in the candidate manuscript, calibrated against Cambridge syllabus categories.
 */
function findBestMatchingParagraphBlock(
  diagnosticText: string,
  category: "diagram" | "analysis" | "evaluation" | "knowledge",
  allBlocks: ParagraphBlock[],
  usedBlockIndices: Set<number>,
): ParagraphBlock {
  const textBlocks = allBlocks.filter((b) => !b.isDiagram);
  if (textBlocks.length === 0) {
    return allBlocks[0] || {
      index: 0,
      text: "",
      isDiagram: false,
      textParagraphNumber: 1,
      label: "¶ Paragraph 1",
    };
  }

  // 1. Direct explicit reference check
  const explicit = findExplicitParagraphIndex(diagnosticText, textBlocks);
  if (explicit) return explicit;

  // 2. Extract keywords and bigram phrases
  const { words, phrases } = extractDiagnosticKeywords(diagnosticText);

  // 3. Score each candidate text paragraph
  let bestBlock = textBlocks[0];
  let highestScore = -Infinity;

  textBlocks.forEach((block, idx) => {
    let score = 0;
    const lowerPara = block.text.toLowerCase();

    // Phrase matches: +12 points each
    for (const phrase of phrases) {
      if (lowerPara.includes(phrase)) {
        score += 12;
      }
    }

    // Keyword matches: +3 points each
    for (const word of words) {
      if (lowerPara.includes(word)) {
        score += 3;
      }
    }

    // Category-specific calibration
    if (category === "evaluation") {
      // Evaluative markers: "however", "depends on", "in conclusion", "short run vs long run", etc.
      const hasEvalMarker =
        /\b(?:however|on the other hand|in contrast|nevertheless|alternatively|depends?\s+(?:on|upon)|short[\s-]run|long[\s-]run|in conclusion|overall|weighing|on balance|to what extent)\b/i.test(
          lowerPara,
        );
      if (hasEvalMarker) score += 10;
      // Evaluation is naturally in latter half of essay
      if (idx >= Math.floor(textBlocks.length / 2)) score += 4;
      // If starts with "however" or "in conclusion", extra confidence
      if (/^(?:however|on the other hand|in conclusion|overall)/i.test(block.text.trim())) score += 8;
    } else if (category === "analysis") {
      // Causal transmission markers: "leads to", "consequently", "causes", "therefore", "shifts"
      const hasCausalMarker =
        /\b(?:leads?\s+to|causes?|consequently|therefore|as a result|shifts?|creates?|results?\s+in|transmission|contracts?|extends?|multiplier)\b/i.test(
          lowerPara,
        );
      if (hasCausalMarker) score += 6;
      // Analytical body paragraphs are typically ¶2 and later, but not the final conclusion paragraph
      if (idx >= 1 && idx < textBlocks.length - 1) score += 5;
      // Slight deduction for introductory definition paragraph
      if (idx === 0) score -= 6;
    } else if (category === "knowledge") {
      // General definitions are usually in opening paragraph unless a specific term matched later
      if (idx === 0 && score === 0) score += 6;
    } else if (category === "diagram") {
      // For diagram omission: paragraph discussing equilibrium, shifts, curves, or market mechanisms
      if (
        /\b(?:equilibrium|supply|demand|curve|shift|shortage|surplus|price|quantity|deadweight|cost|revenue|output|gdp)\b/i.test(
          lowerPara,
        )
      ) {
        score += 8;
      }
      if (idx >= 1) score += 4;
    }

    // Collision avoidance: if another comment already targeted this paragraph,
    // apply a minor penalty to encourage diverse annotations across the essay,
    // but allow it if keyword score is substantially higher
    if (usedBlockIndices.has(block.index)) {
      score -= 8;
    }

    if (score > highestScore) {
      highestScore = score;
      bestBlock = block;
    }
  });

  return bestBlock;
}

/**
 * Extracts the single most relevant sentence inside the targeted paragraph
 * to quote on the Pass 4 card and highlight in the manuscript.
 */
function extractBestHighlightSentence(
  paraText: string,
  diagnosticText: string,
  category: "diagram" | "analysis" | "evaluation" | "knowledge",
): string {
  if (!paraText.trim()) return "";

  // Split into sentences using punctuation delimiters without lookbehinds (compatible with Safari/WebKit)
  const rawSentences = paraText
    .replace(/([.!?])\s+/g, "$1\0")
    .split("\0")
    .map((s) => s.trim())
    .filter((s) => s.length >= 6);

  if (rawSentences.length <= 1) {
    return (rawSentences[0] || paraText).trim();
  }

  const { words, phrases } = extractDiagnosticKeywords(diagnosticText);
  let bestSentence = rawSentences[0];
  let highestScore = -Infinity;

  rawSentences.forEach((sentence) => {
    let score = 0;
    const lower = sentence.toLowerCase();

    // Phrase matches
    for (const phrase of phrases) {
      if (lower.includes(phrase)) score += 10;
    }

    // Word matches
    for (const word of words) {
      if (lower.includes(word)) score += 3;
    }

    // Category clues
    if (category === "evaluation") {
      if (/^(?:however|on the other hand|in conclusion|overall|nevertheless|in contrast)/i.test(sentence)) {
        score += 8;
      }
      if (/\b(?:depends?\s+(?:on|upon)|short[\s-]run|long[\s-]run|weigh|trade-off)\b/i.test(lower)) {
        score += 6;
      }
    } else if (category === "analysis") {
      if (/\b(?:leads?\s+to|causes?|consequently|therefore|as a result|shifts?|transmission)\b/i.test(lower)) {
        score += 6;
      }
    }

    if (score > highestScore) {
      highestScore = score;
      bestSentence = sentence;
    }
  });

  return bestSentence.trim();
}

/**
 * Robust in-situ highlight locator that guarantees finding the exact or best
 * matching sentence/phrase in the manuscript paragraph, even with whitespace,
 * quotation, ellipsis, or punctuation variations.
 */
export function findHighlightSpanInText(
  paragraphText: string,
  targetQuery?: string | null,
): { before: string; match: string; after: string } {
  const rawPara = paragraphText || "";
  const cleanTarget = (targetQuery || "").trim();
  if (!rawPara || !cleanTarget) {
    return { before: "", match: rawPara, after: "" };
  }

  // 1. Exact substring match
  const exactIdx = rawPara.indexOf(cleanTarget);
  if (exactIdx !== -1) {
    return {
      before: rawPara.slice(0, exactIdx),
      match: rawPara.slice(exactIdx, exactIdx + cleanTarget.length),
      after: rawPara.slice(exactIdx + cleanTarget.length),
    };
  }

  // 2. Strip surrounding quotes, ellipses (… or ...), and trailing punctuation
  const stripped = cleanTarget
    .replace(/^[“"'\s]+|[”"'\s]+$/g, "")
    .replace(/(?:\.{2,}|…)$/, "")
    .trim();

  if (stripped.length >= 6) {
    const strippedIdx = rawPara.indexOf(stripped);
    if (strippedIdx !== -1) {
      return {
        before: rawPara.slice(0, strippedIdx),
        match: rawPara.slice(strippedIdx, strippedIdx + stripped.length),
        after: rawPara.slice(strippedIdx + stripped.length),
      };
    }
  }

  // 3. Case-insensitive match
  const lowerPara = rawPara.toLowerCase();
  const lowerTarget = (stripped || cleanTarget).toLowerCase();
  const lowerIdx = lowerPara.indexOf(lowerTarget);
  if (lowerIdx !== -1) {
    const matchLen = (stripped || cleanTarget).length;
    return {
      before: rawPara.slice(0, lowerIdx),
      match: rawPara.slice(lowerIdx, lowerIdx + matchLen),
      after: rawPara.slice(lowerIdx + matchLen),
    };
  }

  // 4. Word sequence regex match (handles variable whitespace and newlines)
  const words = (stripped || cleanTarget)
    .split(/\s+/)
    .map((w) => w.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"))
    .filter(Boolean);

  if (words.length >= 3) {
    const prefixWords = words.slice(0, Math.min(words.length, 8));
    const regex = new RegExp(prefixWords.join("\\s+"), "i");
    const m = regex.exec(rawPara);
    if (m && m.index !== undefined) {
      const start = m.index;
      const rest = rawPara.slice(start);
      const punctMatch = rest.match(/[.!?](?:\s+|$)/);
      const sentenceEnd = punctMatch && punctMatch.index !== undefined ? punctMatch.index + 1 : rest.length;
      const end =
        sentenceEnd !== -1 && sentenceEnd >= m[0].length
          ? start + sentenceEnd
          : start + m[0].length;
      return {
        before: rawPara.slice(0, start),
        match: rawPara.slice(start, end),
        after: rawPara.slice(end),
      };
    }
  }

  // 5. Best sentence overlap: split paragraph into sentences and find highest token overlap (no lookbehinds)
  const sentences = rawPara
    .replace(/([.!?])\s+/g, "$1\0")
    .split("\0")
    .map((s) => s.trim())
    .filter((s) => s.length > 0);

  if (sentences.length > 0) {
    const queryTokens = new Set(
      cleanTarget
        .toLowerCase()
        .replace(/[^a-z0-9\s]/g, " ")
        .split(/\s+/)
        .filter((t) => t.length >= 3),
    );

    let bestSentence = sentences[0];
    let maxOverlap = -1;

    for (const sent of sentences) {
      const sentTokens = sent
        .toLowerCase()
        .replace(/[^a-z0-9\s]/g, " ")
        .split(/\s+/)
        .filter((t) => t.length >= 3);
      let overlap = 0;
      for (const t of sentTokens) {
        if (queryTokens.has(t)) overlap++;
      }
      if (overlap > maxOverlap) {
        maxOverlap = overlap;
        bestSentence = sent;
      }
    }

    const sentIdx = rawPara.indexOf(bestSentence);
    if (sentIdx !== -1) {
      return {
        before: rawPara.slice(0, sentIdx),
        match: rawPara.slice(sentIdx, sentIdx + bestSentence.length),
        after: rawPara.slice(sentIdx + bestSentence.length),
      };
    }
  }

  // 6. Sentence fallback: match the first sentence
  const firstSentence = sentences[0] || rawPara;
  const fallbackIdx = rawPara.indexOf(firstSentence);
  if (fallbackIdx !== -1) {
    return {
      before: rawPara.slice(0, fallbackIdx),
      match: rawPara.slice(fallbackIdx, fallbackIdx + firstSentence.length),
      after: rawPara.slice(fallbackIdx + firstSentence.length),
    };
  }

  return {
    before: "",
    match: rawPara,
    after: "",
  };
}

/**
 * Checks whether the manuscript surrounding a diagram thoroughly explains
 * its economic transmission mechanism, axes, and curve movements.
 */
export function isDiagramThoroughlyExplained(
  diagramTitle: string,
  targetIndex: number,
  blocks: ParagraphBlock[],
  essayText: string,
): boolean {
  const lowerTitle = diagramTitle.toLowerCase();

  // Surrounding text: the paragraph immediately before and the paragraph immediately after the diagram
  const prevBlock = targetIndex > 0 ? blocks[targetIndex - 1] : null;
  const nextBlock = targetIndex + 1 < blocks.length ? blocks[targetIndex + 1] : null;

  const immediateContext = [
    prevBlock && !prevBlock.isDiagram ? prevBlock.text : "",
    nextBlock && !nextBlock.isDiagram ? nextBlock.text : "",
  ]
    .join(" ")
    .toLowerCase();

  // 1. Foreign exchange / currency / depreciation / appreciation
  if (/exchange\s*rate|forex|currency|depreciation|appreciation|devaluation|revaluation/i.test(lowerTitle)) {
    const hasCurrencyTerm =
      /depreciat|appreciat|exchange\s*rate|foreign\s*currency|domestic\s*currency|inflow|outflow|currency\s*value|current\s*account|trade\s*balance|exports?|imports?|devalu/i.test(
        immediateContext,
      );
    const hasMechanismTerm =
      /demand|supply|greater\s+than|less\s+than|increase|decrease|shift|fall|rise|higher|lower|deficit|surplus|equilibrium|flow/i.test(
        immediateContext,
      );
    return Boolean(hasCurrencyTerm && hasMechanismTerm);
  }

  // 2. J-Curve effect
  if (/j[\s-_]*curve/i.test(lowerTitle)) {
    return Boolean(
      /marshall[\s-_]*lerner|contractual\s+lag|pedx|pedm|elasticity\s+of\s+demand\s+for\s+exports/i.test(
        immediateContext,
      ),
    );
  }

  // 3. Macroeconomic AD/AS, LRAS, SRAS, Keynesian
  if (
    /ad[\s/-]*as|aggregate\s+demand|aggregate\s+supply|\blras\b|\bsras\b|keynesian|monetarist|capacity|output\s+gap|deflationary|inflationary/i.test(
      lowerTitle,
    )
  ) {
    const hasMacroTerm =
      /price\s+level|real\s+gdp|national\s+output|aggregate\s+demand|aggregate\s+supply|spare\s+capacity|full\s+employment|bottleneck|inflation/i.test(
        immediateContext,
      );
    const hasShiftTerm = /shift|increase|decrease|rise|fall|equilibrium|gap/i.test(immediateContext);
    return Boolean(hasMacroTerm && hasShiftTerm);
  }

  // 4. Phillips curve
  if (/phillips/i.test(lowerTitle)) {
    return Boolean(
      /inflation.*unemployment|unemployment.*inflation|trade[\s-_]*off|srpc|lrpc|nru/i.test(immediateContext),
    );
  }

  // 5. Monopoly / Oligopoly / Market structures
  if (/monopoly|oligopoly|kinked|cartel|pay[\s-_]*off|game\s+theory|monopolistic/i.test(lowerTitle)) {
    return Boolean(
      /mc\s*=\s*mr|marginal\s+cost|marginal\s+revenue|supernormal\s+profit|deadweight|abnormal\s+profit|price\s+maker|ar\s+curve/i.test(
        immediateContext,
      ),
    );
  }

  // 6. PPF / PPC
  if (/ppf|ppc|production\s*possibility/i.test(lowerTitle)) {
    return Boolean(
      /opportunity\s+cost|capital\s+goods|consumer\s+goods|trade[\s-_]*off|productive\s+capacity|outward\s+shift/i.test(
        immediateContext,
      ),
    );
  }

  // 7. General market models (Supply & Demand, Price Controls, Taxes, Subsidies, Externalities, Minimum Wage)
  const hasGenericMechanics =
    /shift|equilibrium|shortage|surplus|price|quantity|tax|subsidy|externality|ceiling|floor|demand|supply|cost|revenue|welfare|minimum\s+wage/i.test(
      immediateContext,
    );
  const hasDirectionalCausal =
    /increase|decrease|contract|extend|fall|rise|higher|lower|lead\s+to|causes?|results?\s+in/i.test(
      immediateContext,
    );

  return hasGenericMechanics && hasDirectionalCausal;
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
  // Track block indices already targeted by a comment to disperse annotations
  const usedBlockIndices = new Set<number>();

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
        (b) =>
          b.isDiagram &&
          (b.text.includes(m.matchText) ||
            m.matchText.includes(b.text) ||
            b.text.toLowerCase().includes(m.title.toLowerCase())),
      );
      if (!targetBlock) {
        targetBlock = blocks.find((b) => b.text.includes(m.matchText));
      }
      if (!targetBlock) {
        targetBlock = blocks.find((b) => b.isDiagram) || blocks[Math.min(1, blocks.length - 1)];
      }

      const targetIndex = targetBlock ? targetBlock.index : 0;
      const targetLabel = targetBlock ? targetBlock.label : "Diagram";
      // Check whether preceding, subsequent, or surrounding analysis thoroughly explains this diagram
      const hasDetailedExplanation = isDiagramThoroughlyExplained(
        m.title,
        targetIndex,
        blocks,
        essayText,
      );

      // Check whether the Cambridge AI examiner flagged an explicit diagram deficiency
      const missingDiagramNotes = grading.missing_elements?.diagrams || [];
      const hasExaminerDiagramDefect =
        missingDiagramNotes.length > 0 ||
        Boolean(
          grading.weaknesses?.some((w) =>
            /\b(?:diagram|figure|curve|axes|axis|unlabelled|unintegrated)\b/i.test(w),
          ),
        );

      // If the student placed the diagram AND thoroughly explained it in the accompanying text,
      // and the examiner has not flagged any diagram defect, DO NOT generate an unsolicited critique comment!
      if (hasDetailedExplanation && !hasExaminerDiagramDefect) {
        return;
      }

      usedBlockIndices.add(targetIndex);

      const guidance = getDiagramSyllabusGuidance(m.title, isFullMarks, Boolean(hasDetailedExplanation));

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
    const targetBlock = findBestMatchingParagraphBlock(
      "diagram curves shifts market equilibrium transmission mechanism",
      "diagram",
      blocks,
      usedBlockIndices,
    );

    const targetIndex = targetBlock ? targetBlock.index : 0;
    const targetLabel = targetBlock ? targetBlock.label : "¶ Paragraph 1";
    usedBlockIndices.add(targetIndex);
    const firstSentence = extractBestHighlightSentence(
      targetBlock?.text || "",
      "diagram equilibrium curves shift",
      "diagram",
    );

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

    const bestBlock = findBestMatchingParagraphBlock(
      analysisWeakness,
      "analysis",
      blocks,
      usedBlockIndices,
    );

    const targetIndex = bestBlock.index;
    const targetLabel = bestBlock.label;
    usedBlockIndices.add(targetIndex);
    const highlightSentence = extractBestHighlightSentence(bestBlock.text, analysisWeakness, "analysis");

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
      highlightText: highlightSentence,
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

    const evalBlock = findBestMatchingParagraphBlock(
      evalWeakness,
      "evaluation",
      blocks,
      usedBlockIndices,
    );

    const targetIndex = evalBlock.index;
    const targetLabel = evalBlock.label;
    usedBlockIndices.add(targetIndex);
    const highlightSentence = extractBestHighlightSentence(evalBlock.text, evalWeakness, "evaluation");

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
      highlightText: highlightSentence,
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

    const knowledgeBlock = findBestMatchingParagraphBlock(
      knowledgeWeakness,
      "knowledge",
      blocks,
      usedBlockIndices,
    );

    const targetIndex = knowledgeBlock.index;
    const targetLabel = knowledgeBlock.label;
    usedBlockIndices.add(targetIndex);
    const highlightSentence = extractBestHighlightSentence(knowledgeBlock.text, knowledgeWeakness, "knowledge");

    comments.push({
      id: "pass4-knowledge-gap",
      category: "knowledge",
      title: isFullMarks ? "AO1 Knowledge Extension: Advanced Theoretical Framing" : "AO1 Knowledge: Conceptual Precision",
      badge: isFullMarks ? "Extension Tip" : "Terminology Gap",
      color: "indigo",
      paragraphIndex: targetIndex,
      paragraphLabel: targetLabel,
      highlightText: highlightSentence,
      critique: stripScoreFractionsFromText(stripStars(knowledgeWeakness)),
      suggestion: isFullMarks
        ? "Full marks secured. For academic distinction: provide formal mathematical or textbook bounds for all economic variables."
        : "Provide formal textbook definitions for all key economic variables in your opening framing to establish full AO1 credit.",
    });
  }

  return comments;
}
