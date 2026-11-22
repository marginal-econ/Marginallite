import { DIAGRAMS, type DiagramEntry } from "./diagrams/catalog";

export const GENERIC_ECONOMICS_VOCAB = new Set([
  "market equilibrium",
  "free market equilibrium",
  "supply curve",
  "demand curve",
  "supply",
  "demand",
  "equilibrium",
  "price mechanism",
  "elasticity",
  "price elasticity",
  "income elasticity",
  "cross elasticity",
  "consumer surplus",
  "producer surplus",
  "aggregate demand",
  "aggregate supply",
  "inflation",
  "unemployment",
  "economic growth",
  "balance of payments",
  "exchange rate",
  "fiscal policy",
  "monetary policy",
  "supply-side policy",
  "market failure",
  "deadweight loss",
]);

export type DiagramRefMatch = {
  title: string;
  entry: DiagramEntry;
  matchText: string;
  isCustom?: boolean;
};

export type DiagramRefResult = {
  matches: DiagramRefMatch[];
  detectedTags: string[];
  inlineReplacements: { matchText: string; tag: string }[];
};

export function extractDiagramReferences(text: string): DiagramRefResult {
  if (!text) return { matches: [], detectedTags: [], inlineReplacements: [] };

  const matches: DiagramRefMatch[] = [];
  const detectedTags: string[] = [];
  const inlineReplacements: { matchText: string; tag: string }[] = [];
  const seenIds = new Set<string>();

  // 1. Explicit square bracket tags: e.g. [DIAGRAM: ...], [Figure: ...], [Graph: ...]
  const squareRegex = /\[\s*(?:DIAGRAM|FIGURE|FIG|GRAPH)\s*:\s*([^\]]+)\]/gi;
  let sm: RegExpExecArray | null;
  while ((sm = squareRegex.exec(text)) !== null) {
    const fullTag = sm[0];
    const rawInner = sm[1].trim();

    // Extract diagram name: before pipe '|', or before 'showing', or before 'representing', or before '('
    let cleanName = rawInner;
    if (cleanName.includes("|")) {
      cleanName = cleanName.split("|")[0].trim();
    }
    cleanName = cleanName.replace(/\s+(?:showing|representing|illustrating)\b[\s\S]*/i, "").trim();
    if (cleanName.includes("(") && !cleanName.startsWith("(")) {
      cleanName = cleanName.replace(/\s*\([^)]*\)\s*/g, " ").trim();
    }
    cleanName = cleanName.replace(/\s+(?:diagram|figure|graph)$/i, "").trim();

    const lowerClean = cleanName.toLowerCase();
    const idKey = `diag-${lowerClean.replace(/[^a-z0-9]+/g, "-")}`;

    if (!seenIds.has(idKey) && cleanName.length >= 2) {
      seenIds.add(idKey);
      const titleDisplay = cleanName.charAt(0).toUpperCase() + cleanName.slice(1);

      // Match against official catalog
      const found = DIAGRAMS.find((d) => {
        const titleLower = d.title.toLowerCase();
        const strippedTitle = titleLower.replace(/^the\s+/i, "");
        if (lowerClean === titleLower || lowerClean === strippedTitle) return true;
        if (d.id === "ad-as-growth" && (lowerClean.includes("ad/as") || lowerClean.includes("ad-as") || lowerClean.includes("ad/sras"))) return true;
        if (d.id === "j-curve" && lowerClean.includes("j-curve")) return true;
        if (titleLower.includes(lowerClean) || lowerClean.includes(titleLower)) return true;
        return false;
      });

      const entry: DiagramEntry = found || {
        id: idKey,
        title: titleDisplay,
        section: /lras|sras|ad[\s/-]*as|macro|inflation|gdp|monetary/i.test(cleanName) ? "Macroeconomics" : "Microeconomics",
        topic: "Candidate Integrated Diagram",
        represents: `${titleDisplay} economics diagram`,
        whyUsed: `Visual model integrated directly into candidate script.`,
        spec: {
          type: "custom",
          xLabel: "Real GDP (Y)",
          yLabel: "Price Level (PL)",
          curves: [],
        } as any,
        rules: ["Accurate axis labels and curve shifts required for credit"],
      } as any;

      matches.push({
        title: entry.title,
        entry,
        matchText: fullTag,
        isCustom: !found,
      });
      detectedTags.push(fullTag);
      inlineReplacements.push({ matchText: fullTag, tag: fullTag });
    }
  }

  // 2. Parenthesis tags: e.g. (Diagram: ...), (Maximum price), (The J-Curve Effect)
  const parenRegex = /\(([^)]+)\)/g;
  let pm: RegExpExecArray | null;
  while ((pm = parenRegex.exec(text)) !== null) {
    const rawContent = pm[1].trim();

    // Check if bracket explicitly indicates a diagram/figure
    const hasExplicitPrefix = /^(?:diagram|figure|fig\b|graph|see\s+diagram|see\s+figure|refer\s+to\s+diagram|refer\s+to\s+figure)[\s:\-–—]+/i.test(rawContent);
    const hasDiagramWord = /\b(?:diagram|graph|figure)\b/i.test(rawContent);

    // Clean core name
    const cleanContent = rawContent
      .replace(/^(?:diagram|figure|fig\.?|graph|see\s+diagram|see\s+figure|refer\s+to\s+diagram|refer\s+to\s+figure)[\s:\-–—]*/i, "")
      .replace(/\s+(?:diagram|graph|figure)$/i, "")
      .trim()
      .toLowerCase();

    // Skip short tokens, variables, acronyms: e.g. "px", "pm", "ad", "as", "ped", "12", "x - m"
    if (cleanContent.length < 3) continue;
    // Skip math/inequality expressions: e.g. "ped < 1", "pedx + pedm > 1", "qm > qopt", "x - m"
    if (/[=<>+*]/.test(cleanContent) || /\s-\s/.test(cleanContent)) continue;
    // Skip common non-diagram economic acronyms in brackets
    if (/^(?:sras|lras|mpc|msc|msb|mpb|mec|meb|ped|pes|yed|xed|gdp|cpi|rpi|hdi)\b/i.test(cleanContent)) continue;

    // RULE 1: Core economic vocabulary ("market equilibrium", "supply curve", "demand curve", etc.)
    // MUST have an explicit prefix like "(Diagram: Market Equilibrium)" or explicit word "diagram"/"figure".
    // Bare occurrences like "(market equilibrium)" or "(supply curve)" are regular economic sentences and MUST NOT match!
    if (GENERIC_ECONOMICS_VOCAB.has(cleanContent) && !hasExplicitPrefix && !hasDiagramWord) {
      continue;
    }

    // Attempt to find in the official 30+ Cambridge diagram library
    const found = DIAGRAMS.find((d) => {
      const titleLower = d.title.toLowerCase();
      const strippedTitle = titleLower.replace(/^the\s+/i, "");

      // If generic vocabulary term, only match if explicit prefix was given
      if (GENERIC_ECONOMICS_VOCAB.has(titleLower) || GENERIC_ECONOMICS_VOCAB.has(strippedTitle)) {
        if (!hasExplicitPrefix && !hasDiagramWord) return false;
      }

      // Exact title match: e.g. "the j-curve effect", "maximum price", "minimum price"
      if (cleanContent === titleLower || cleanContent === strippedTitle) return true;

      // Exact known aliases (MUST be full phrase, NEVER loose substring matching!)
      if (d.id === "minimum-price" && (cleanContent === "minimum price" || cleanContent === "price floor")) return true;
      if (d.id === "maximum-price" && (cleanContent === "maximum price" || cleanContent === "price ceiling")) return true;
      if (d.id === "tariff" && (cleanContent === "tariff on imported goods" || (hasExplicitPrefix && cleanContent === "tariff"))) return true;
      if (d.id === "quota" && (cleanContent === "import quota" || (hasExplicitPrefix && cleanContent === "quota"))) return true;
      if (d.id === "j-curve" && (cleanContent === "j-curve" || cleanContent === "j-curve effect" || cleanContent === "j curve")) return true;
      if (d.id === "phillips-curve" && (cleanContent === "phillips curve" || cleanContent === "short-run phillips curve")) return true;
      if (d.id === "ad-as-growth" && (cleanContent === "ad/as" || cleanContent === "ad-as" || cleanContent === "aggregate demand and supply")) return true;
      if (d.id === "ppc-growth" && (cleanContent === "production possibility curve" || cleanContent === "production possibility frontier" || (hasExplicitPrefix && cleanContent === "ppc"))) return true;
      if (d.id === "negative-externality-production" && (cleanContent === "negative externality of production" || (hasExplicitPrefix && cleanContent === "negative externality"))) return true;
      if (d.id === "positive-externality-consumption" && (cleanContent === "positive externality of consumption" || (hasExplicitPrefix && cleanContent === "positive externality"))) return true;

      // When the user explicitly typed "Diagram: ..." or "... diagram", allow targeted matching
      if (hasExplicitPrefix || hasDiagramWord) {
        if (cleanContent === titleLower || cleanContent === strippedTitle) return true;
        if (cleanContent.startsWith(strippedTitle) || strippedTitle.startsWith(cleanContent)) return true;
        if (d.id === "j-curve" && cleanContent.includes("j-curve")) return true;
        if (d.id === "tariff" && cleanContent.includes("tariff")) return true;
        if (d.id === "ad-as-growth" && (cleanContent.includes("ad/as") || cleanContent.includes("ad-as"))) return true;
        if (titleLower.includes(cleanContent) || cleanContent.includes(titleLower)) return true;
      }

      return false;
    });

    if (found && !seenIds.has(found.id)) {
      seenIds.add(found.id);
      matches.push({ title: found.title, entry: found, matchText: pm[0], isCustom: false });
      const curves = found.spec.curves.map((c) => c.label).filter(Boolean).join(", ") || "standard curves";
      const tag = `[DIAGRAM: ${found.title} (${found.section}, ${found.topic}) | represents: ${found.represents} | axes: ${found.spec.yLabel} (y) / ${found.spec.xLabel} (x) | curves: ${curves} | referenced in candidate script: candidate has directly drawn and referenced ${found.title} at this position in their written response]`;
      detectedTags.push(tag);
      inlineReplacements.push({ matchText: pm[0], tag });
    } else if (!found && (hasExplicitPrefix || hasDiagramWord)) {
      // CUSTOM / NON-CATALOG DIAGRAM SUPPORT:
      // If candidate explicitly writes (Diagram: Lorenz Curve) or (Figure: Monopsony Labour Market),
      // support it with full Cambridge examiner credit.
      const formattedTitle = rawContent
        .replace(/^(?:diagram|figure|fig\.?|graph|see\s+diagram|see\s+figure|refer\s+to\s+diagram|refer\s+to\s+figure)[\s:\-–—]*/i, "")
        .replace(/\s+(?:diagram|graph|figure)$/i, "")
        .trim();

      if (formattedTitle.length >= 3) {
        const customId = `custom-${formattedTitle.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`;
        if (!seenIds.has(customId)) {
          seenIds.add(customId);
          const displayTitle = formattedTitle.charAt(0).toUpperCase() + formattedTitle.slice(1);
          const customEntry: DiagramEntry = {
            id: customId,
            title: displayTitle,
            section: "Microeconomics",
            topic: "Candidate Custom Diagram",
            represents: `Custom candidate diagram: ${displayTitle}`,
            whyUsed: `Student-drawn diagram referenced at this position in candidate script.`,
            spec: {
              type: "custom",
              xLabel: "Quantity (Q)",
              yLabel: "Price / Value",
              curves: [],
            } as any,
            rules: ["Accurate axis labels and curve shifts required for credit"],
          } as any;
          matches.push({
            title: displayTitle,
            entry: customEntry,
            matchText: pm[0],
            isCustom: true,
          });
          const tag = `[DIAGRAM: ${displayTitle} (Custom Student Diagram) | candidate has drawn and referenced ${displayTitle} at this exact position in their script — evaluate candidate's diagrammatic analysis, axes, shifts, and explanations directly based on this referenced diagram]`;
          detectedTags.push(tag);
          inlineReplacements.push({ matchText: pm[0], tag });
        }
      }
    }
  }

  return { matches, detectedTags, inlineReplacements };
}
