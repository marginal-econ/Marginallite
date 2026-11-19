/**
 * Canonical Cambridge IGCSE Economics (0455) MCQ Topic & Domain Classifier.
 *
 * Maps every IGCSE 0455 Paper 1 MCQ question to its authoritative syllabus unit (Units 1–6)
 * and domain (Microeconomics: Units 1–3; Macroeconomics: Units 4–6), plus cognitive skill
 * and targeted IGCSE 0455 revision tips for instant post-paper diagnostics.
 */

export type McqDomain = "micro" | "macro" | "unclassified";
export type McqSkill = "knowledge" | "application" | "analysis";

export const MCQ_DOMAIN_LABEL: Record<McqDomain, string> = {
  micro: "Microeconomics (Units 1–3)",
  macro: "Macroeconomics (Units 4–6)",
  unclassified: "General IGCSE 0455",
};

export type SyllabusTopicRule = {
  id: string;
  canonicalTopic: string;
  shortLabel: string;
  unitNumber: number;
  unitLabel: string;
  domain: Exclude<McqDomain, "unclassified">;
  revisionTip: string;
  keywords: RegExp[];
};

export const CAMBRIDGE_0455_TOPICS: SyllabusTopicRule[] = [
  {
    id: "1.1",
    canonicalTopic: "1.1 Basic Economic Problem & Scarcity",
    shortLabel: "Scarcity & Choice",
    unitNumber: 1,
    unitLabel: "Unit 1: The Basic Economic Problem",
    domain: "micro",
    revisionTip: "Distinguish economic goods (scarce, have opportunity cost) from free goods.",
    keywords: [/\bscarcit/i, /\bunlimited\s+wants/i, /\bfinite\s+resources/i, /\beconomic\s+good/i, /\bfree\s+good/i, /\bbasic\s+economic\s+problem/i],
  },
  {
    id: "1.2",
    canonicalTopic: "1.2 Factors of Production",
    shortLabel: "Factors of Production",
    unitNumber: 1,
    unitLabel: "Unit 1: The Basic Economic Problem",
    domain: "micro",
    revisionTip: "Review rewards to factors (rent, wages, interest, profit) and occupational vs geographical mobility.",
    keywords: [/\bfactors?\s+of\s+production/i, /\benterprise\b/i, /\bentrepreneur/i, /\bcapital\s+goods?/i, /\bmobility\s+of\s+(?:land|labour|capital)/i, /\brewards?\s+to\s+factors/i],
  },
  {
    id: "1.3",
    canonicalTopic: "1.3 Opportunity Cost",
    shortLabel: "Opportunity Cost",
    unitNumber: 1,
    unitLabel: "Unit 1: The Basic Economic Problem",
    domain: "micro",
    revisionTip: "Opportunity cost is strictly the next best alternative forgone, not all alternatives combined.",
    keywords: [/\bopportunity\s+cost/i, /\bnext\s+best\s+alternative/i, /\bforgone\b/i],
  },
  {
    id: "1.4",
    canonicalTopic: "1.4 Production Possibility Curves (PPC)",
    shortLabel: "PPC Diagrams",
    unitNumber: 1,
    unitLabel: "Unit 1: The Basic Economic Problem",
    domain: "micro",
    revisionTip: "Points inside the PPC show unemployed resources; outward shifts show higher productive capacity.",
    keywords: [/\bproduction\s+possibility/i, /\bppc\b/i, /\bppf\b/i],
  },
  {
    id: "2.1-2.5",
    canonicalTopic: "2.1–2.5 Demand, Supply & Price Determination",
    shortLabel: "Demand & Supply",
    unitNumber: 2,
    unitLabel: "Unit 2: The Allocation of Resources",
    domain: "micro",
    revisionTip: "Separate movements along a curve (caused by price) from shifts of the curve (non-price determinants).",
    keywords: [/\bdemand\s+curve/i, /\bsupply\s+curve/i, /\bequilibrium\s+(?:price|quantity)/i, /\bexcess\s+(?:demand|supply)/i, /\bshortage\b/i, /\bsurplus\b/i, /\bprice\s+mechanism/i, /\bsubstitutes?\b/i, /\bcomplements?\b/i],
  },
  {
    id: "2.6",
    canonicalTopic: "2.6 Price Elasticity of Demand (PED)",
    shortLabel: "PED",
    unitNumber: 2,
    unitLabel: "Unit 2: The Allocation of Resources",
    domain: "micro",
    revisionTip: "Check the revenue rule: raising price increases total revenue only when demand is price-inelastic (|PED| < 1).",
    keywords: [/\bprice\s+elasticity\s+of\s+demand/i, /\bped\b/i, /\bprice\s+inelastic\s+demand/i, /\bprice\s+elastic\s+demand/i, /\bunitary\s+elastic/i],
  },
  {
    id: "2.7",
    canonicalTopic: "2.7 Price Elasticity of Supply (PES)",
    shortLabel: "PES",
    unitNumber: 2,
    unitLabel: "Unit 2: The Allocation of Resources",
    domain: "micro",
    revisionTip: "PES depends on spare capacity, stock storability, production time, and factor mobility.",
    keywords: [/\bprice\s+elasticity\s+of\s+supply/i, /\bpes\b/i, /\binelastic\s+supply/i, /\belastic\s+supply/i],
  },
  {
    id: "2.8-2.9",
    canonicalTopic: "2.8–2.9 Market Economic System & Market Failure",
    shortLabel: "Market Failure",
    unitNumber: 2,
    unitLabel: "Unit 2: The Allocation of Resources",
    domain: "micro",
    revisionTip: "Remember: Social Cost = Private Cost + External Cost; public goods are non-rival and non-excludable.",
    keywords: [/\bmarket\s+failure/i, /\bexternal\s+(?:cost|benefit)/i, /\bsocial\s+(?:cost|benefit)/i, /\bprivate\s+(?:cost|benefit)/i, /\bpublic\s+good/i, /\bmerit\s+good/i, /\bdemerit\s+good/i, /\bnon-rival/i, /\bnon-excludable/i, /\bmarket\s+economic\s+system/i],
  },
  {
    id: "2.10",
    canonicalTopic: "2.10 Mixed Economic System & Intervention",
    shortLabel: "Mixed Economy",
    unitNumber: 2,
    unitLabel: "Unit 2: The Allocation of Resources",
    domain: "micro",
    revisionTip: "A maximum price set below equilibrium causes a shortage; a minimum price set above equilibrium causes a surplus.",
    keywords: [/\bmixed\s+econom/i, /\bmaximum\s+price/i, /\bminimum\s+price/i, /\bprice\s+(?:ceiling|floor)/i, /\bsubsid(?:y|ies)/i, /\bindirect\s+tax/i, /\bprivatisation/i, /\bnationalisation/i],
  },
  {
    id: "3.1-3.2",
    canonicalTopic: "3.1–3.2 Money, Banking & Households",
    shortLabel: "Money & Households",
    unitNumber: 3,
    unitLabel: "Unit 3: Microeconomic Decision-Makers",
    domain: "micro",
    revisionTip: "Contrast central bank roles (monetary policy, lender of last resort) with commercial banks (deposits, loans).",
    keywords: [/\bcentral\s+bank/i, /\bcommercial\s+bank/i, /\bfunctions?\s+of\s+money/i, /\bmedium\s+of\s+exchange/i, /\bstore\s+of\s+value/i, /\bhousehold\s+(?:spending|saving|borrowing)/i, /\bdisposable\s+income/i],
  },
  {
    id: "3.3",
    canonicalTopic: "3.3 Workers, Wages & Trade Unions",
    shortLabel: "Workers & Wages",
    unitNumber: 3,
    unitLabel: "Unit 3: Microeconomic Decision-Makers",
    domain: "micro",
    revisionTip: "Separate wage factors (pay, bonuses) from non-wage factors (hours, job security, fringe benefits).",
    keywords: [/\btrade\s+union/i, /\bcollective\s+bargaining/i, /\bminimum\s+wage/i, /\bwage\s+(?:rate|factor|differential)/i, /\bdivision\s+of\s+labour/i, /\bspecialisation\s+of\s+workers/i, /\boccupation/i],
  },
  {
    id: "3.4-3.5",
    canonicalTopic: "3.4–3.5 Firms, Mergers & Production",
    shortLabel: "Firms & Scale",
    unitNumber: 3,
    unitLabel: "Unit 3: Microeconomic Decision-Makers",
    domain: "micro",
    revisionTip: "Distinguish horizontal, vertical (forward/backward), and conglomerate mergers plus internal vs external economies of scale.",
    keywords: [/\bhorizontal\s+merger/i, /\bvertical\s+merger/i, /\bconglomerate/i, /\beconomies\s+of\s+scale/i, /\bdiseconomies\s+of\s+scale/i, /\blabour-intensive/i, /\bcapital-intensive/i, /\bproductivity\b/i, /\bprimary\s+sector/i, /\bsecondary\s+sector/i, /\btertiary\s+sector/i],
  },
  {
    id: "3.6-3.7",
    canonicalTopic: "3.6–3.7 Costs, Revenue & Market Structures",
    shortLabel: "Costs & Markets",
    unitNumber: 3,
    unitLabel: "Unit 3: Microeconomic Decision-Makers",
    domain: "micro",
    revisionTip: "Fixed costs do not change with output; ATC = (FC + VC) / Output; Profit = TR − TC.",
    keywords: [/\bfixed\s+cost/i, /\bvariable\s+cost/i, /\baverage\s+(?:total\s+)?cost/i, /\btotal\s+(?:cost|revenue)/i, /\bprofit\s+maxim/i, /\bmonopol/i, /\bbarriers?\s+to\s+entry/i, /\bcompetitive\s+market/i],
  },
  {
    id: "4.1-4.3",
    canonicalTopic: "4.1–4.3 Macroeconomic Aims & Fiscal Policy",
    shortLabel: "Fiscal Policy",
    unitNumber: 4,
    unitLabel: "Unit 4: Government & the Macroeconomy",
    domain: "macro",
    revisionTip: "Fiscal policy uses government spending and taxation; progressive taxes take a higher percentage as income rises.",
    keywords: [/\bfiscal\s+policy/i, /\bbudget\s+(?:deficit|surplus)/i, /\bprogressive\s+tax/i, /\bregressive\s+tax/i, /\bdirect\s+tax/i, /\bgovernment\s+spending/i, /\bmacroeconomic\s+aim/i],
  },
  {
    id: "4.4-4.5",
    canonicalTopic: "4.4–4.5 Monetary & Supply-Side Policies",
    shortLabel: "Monetary & Supply-Side",
    unitNumber: 4,
    unitLabel: "Unit 4: Government & the Macroeconomy",
    domain: "macro",
    revisionTip: "Monetary policy changes interest rates & money supply; supply-side policies expand long-run productive capacity.",
    keywords: [/\bmonetary\s+policy/i, /\binterest\s+rate/i, /\bmoney\s+supply/i, /\bsupply-side\s+polic/i, /\bderegulation/i],
  },
  {
    id: "4.6",
    canonicalTopic: "4.6 Economic Growth",
    shortLabel: "Economic Growth",
    unitNumber: 4,
    unitLabel: "Unit 4: Government & the Macroeconomy",
    domain: "macro",
    revisionTip: "Economic growth is an increase in real GDP; distinguish actual growth from potential growth (outward PPC shift).",
    keywords: [/\beconomic\s+growth/i, /\breal\s+gdp/i, /\bgdp\b/i, /\brecession\b/i],
  },
  {
    id: "4.7",
    canonicalTopic: "4.7 Employment & Unemployment",
    shortLabel: "Unemployment",
    unitNumber: 4,
    unitLabel: "Unit 4: Government & the Macroeconomy",
    domain: "macro",
    revisionTip: "Match each unemployment type (cyclical, structural, frictional, seasonal) to its appropriate policy remedy.",
    keywords: [/\bunemploy/i, /\bfull\s+employment/i, /\bcyclical\b/i, /\bstructural\s+unemp/i, /\bfrictional\b/i, /\bclaimant\s+count/i],
  },
  {
    id: "4.8",
    canonicalTopic: "4.8 Inflation & Deflation",
    shortLabel: "Inflation & CPI",
    unitNumber: 4,
    unitLabel: "Unit 4: Government & the Macroeconomy",
    domain: "macro",
    revisionTip: "Distinguish demand-pull inflation (excess total demand) from cost-push inflation (rising production costs) and CPI weighting.",
    keywords: [/\binflation/i, /\bdeflation/i, /\bcpi\b/i, /\bconsumer\s+prices?\s+index/i, /\bcost-push/i, /\bdemand-pull/i],
  },
  {
    id: "5.1-5.4",
    canonicalTopic: "5.1–5.4 Living Standards, Poverty & Population",
    shortLabel: "Development & Poverty",
    unitNumber: 5,
    unitLabel: "Unit 5: Economic Development",
    domain: "macro",
    revisionTip: "HDI combines GNI per head, life expectancy, and mean/expected years of schooling. Distinguish absolute vs relative poverty.",
    keywords: [/\bhuman\s+development\s+index/i, /\bhdi\b/i, /\bliving\s+standard/i, /\babsolute\s+poverty/i, /\brelative\s+poverty/i, /\bpoverty\b/i, /\bbirth\s+rate/i, /\bdeath\s+rate/i, /\bnet\s+migration/i, /\bpopulation\b/i, /\bdependency\s+ratio/i, /\bdeveloping\s+(?:countr|econom)/i],
  },
  {
    id: "6.1-6.2",
    canonicalTopic: "6.1–6.2 Specialisation, Globalisation & Trade",
    shortLabel: "Trade & Globalisation",
    unitNumber: 6,
    unitLabel: "Unit 6: International Trade & Globalisation",
    domain: "macro",
    revisionTip: "Compare free trade benefits against protectionist tools (tariffs, quotas, subsidies, embargoes) for infant industries.",
    keywords: [/\bglobalisation/i, /\bglobalization/i, /\bmultinational/i, /\bmnc\b/i, /\bfree\s+trade/i, /\bprotectionism/i, /\btariff/i, /\bquota/i, /\bembargo/i, /\binfant\s+industr/i],
  },
  {
    id: "6.3-6.4",
    canonicalTopic: "6.3–6.4 Exchange Rates & Current Account",
    shortLabel: "Exchange Rates & BoP",
    unitNumber: 6,
    unitLabel: "Unit 6: International Trade & Globalisation",
    domain: "macro",
    revisionTip: "Currency depreciation makes exports cheaper and imports dearer; Current Account = trade in goods + services + primary + secondary income.",
    keywords: [/\bexchange\s+rate/i, /\bappreciat/i, /\bdepreciat/i, /\bfloating\s+exchange/i, /\bfixed\s+exchange/i, /\bcurrent\s+account/i, /\bbalance\s+of\s+payments/i, /\btrade\s+(?:deficit|surplus)/i, /\bprimary\s+income/i, /\bsecondary\s+income/i, /\bexports?\b/i, /\bimports?\b/i],
  },
];

export const CAMBRIDGE_9708_TOPICS = CAMBRIDGE_0455_TOPICS;

export type McqQuestionClassification = {
  topic: string;
  subtopic: string;
  shortLabel: string;
  unit: string;
  unitNumber: number;
  unitLabel: string;
  domain: Exclude<McqDomain, "unclassified">;
  skill: McqSkill;
  revisionTip: string;
};

export function inferQuestionSkill(text: string, questionNumber = 1): McqSkill {
  const lower = (text || "").toLowerCase();
  if (/\b(calculate|table|diagram|graph|chart|shows|if\s+the\s+price|percentage\s+change|elasticity\s+is)\b/.test(lower)) {
    return "application";
  }
  if (/\b(most\s+likely|consequence|effect\s+of|result\s+in|shift|why\s+would|leads?\s+to)\b/.test(lower)) {
    return "analysis";
  }
  if (questionNumber >= 20) return "analysis";
  return "knowledge";
}

export function classifyMcqQuestion(params: {
  questionText?: string;
  stem?: string;
  text?: string;
  questionNumber?: number;
  number?: number;
  level?: string;
  existingTopic?: string | null;
  existingSubtopic?: string | null;
  existingSkill?: string | null;
  topic?: string | null;
}): McqQuestionClassification {
  const rawText = params.questionText || params.stem || params.text || "";
  const existing = params.existingTopic || params.topic || "";
  const text = `${existing} ${rawText}`.trim();
  const qNum = params.questionNumber ?? params.number ?? 1;
  const skill = inferQuestionSkill(text, qNum);

  let bestRule: SyllabusTopicRule | null = null;
  let bestHits = 0;

  for (const rule of CAMBRIDGE_0455_TOPICS) {
    let hits = 0;
    for (const rx of rule.keywords) {
      if (rx.test(text)) hits++;
    }
    if (hits > bestHits) {
      bestHits = hits;
      bestRule = rule;
    }
  }

  if (bestRule) {
    return {
      topic: bestRule.canonicalTopic,
      subtopic: bestRule.shortLabel,
      shortLabel: bestRule.shortLabel,
      unit: bestRule.unitLabel,
      unitNumber: bestRule.unitNumber,
      unitLabel: bestRule.unitLabel,
      domain: bestRule.domain,
      skill,
      revisionTip: bestRule.revisionTip,
    };
  }

  if (qNum <= 15) {
    const uNum = qNum <= 4 ? 1 : qNum <= 10 ? 2 : 3;
    const uLabel =
      uNum === 1
        ? "Unit 1: The Basic Economic Problem"
        : uNum === 2
          ? "Unit 2: The Allocation of Resources"
          : "Unit 3: Microeconomic Decision-Makers";
    return {
      topic: uLabel,
      subtopic: "Microeconomics",
      shortLabel: "Microeconomics",
      unit: uLabel,
      unitNumber: uNum,
      unitLabel: uLabel,
      domain: "micro",
      skill,
      revisionTip: "Review Cambridge IGCSE 0455 Units 1–3 definitions, diagrams, and market mechanisms.",
    };
  }

  const uNum = qNum <= 22 ? 4 : qNum <= 26 ? 5 : 6;
  const uLabel =
    uNum === 4
      ? "Unit 4: Government & the Macroeconomy"
      : uNum === 5
        ? "Unit 5: Economic Development"
        : "Unit 6: International Trade & Globalisation";
  return {
    topic: uLabel,
    subtopic: "Macroeconomics",
    shortLabel: "Macroeconomics",
    unit: uLabel,
    unitNumber: uNum,
    unitLabel: uLabel,
    domain: "macro",
    skill,
    revisionTip: "Review Cambridge IGCSE 0455 Units 4–6 macroeconomic policies, development, and trade.",
  };
}

export function normalizeMcqTopic(topic: string | null | undefined, _level?: string): string {
  if (!topic || !topic.trim()) return "Unit 1: The Basic Economic Problem";
  const matched = classifyMcqQuestion({ existingTopic: topic });
  return matched.topic;
}

export function getSyllabusTopicMeta(topic: string, _level?: string) {
  const matched = classifyMcqQuestion({ existingTopic: topic });
  return {
    topic: matched.topic,
    unit: matched.unit,
    domain: matched.domain,
    revisionTip: matched.revisionTip,
    canonicalTopic: matched.topic,
    shortLabel: matched.shortLabel,
    unitNumber: matched.unitNumber,
    unitLabel: matched.unitLabel,
  };
}

export function classifyTopicDomain(topic: string): McqDomain {
  const lower = (topic || "").toLowerCase();
  if (!lower.trim()) return "unclassified";
  if (/\b(macro|fiscal|monetary|inflation|deflation|gdp|unemploy|growth|poverty|hdi|population|exchange\s+rate|current\s+account|balance\s+of\s+payments|tariff|quota|globalisation|trade|unit\s*[456])\b/i.test(lower)) {
    return "macro";
  }
  if (/\b(micro|scarcit|opportunity|ppc|demand|supply|elasticit|ped|pes|market\s+failure|externalit|public\s+good|merit|demerit|mixed|subsid|price\s+(?:ceiling|floor)|money|bank|household|worker|wage|trade\s+union|firm|merger|economies\s+of\s+scale|monopol|cost|revenue|unit\s*[123])\b/i.test(lower)) {
    return "micro";
  }
  return "unclassified";
}

export type DomainStat = {
  domain: McqDomain;
  label: string;
  correct: number;
  attempted: number;
  total: number;
  accuracyPct: number;
  percentage: number;
};

export function aggregateMcqDomains(
  items: Array<{ topic?: string | null; isCorrect?: boolean; correct?: boolean }>,
): DomainStat[] {
  const buckets: Record<McqDomain, { correct: number; total: number }> = {
    micro: { correct: 0, total: 0 },
    macro: { correct: 0, total: 0 },
    unclassified: { correct: 0, total: 0 },
  };
  for (const item of items) {
    const dom = classifyTopicDomain(item.topic || "");
    buckets[dom].total += 1;
    if (item.isCorrect ?? item.correct) buckets[dom].correct += 1;
  }
  return (["micro", "macro", "unclassified"] as McqDomain[])
    .filter((d) => buckets[d].total > 0)
    .map((d) => {
      const pct = Math.round((buckets[d].correct / buckets[d].total) * 100);
      return {
        domain: d,
        label: MCQ_DOMAIN_LABEL[d],
        correct: buckets[d].correct,
        attempted: buckets[d].total,
        total: buckets[d].total,
        accuracyPct: pct,
        percentage: pct,
      };
    });
}

export function aggregateMcqDomainsFromTopicStats(
  stats: Array<{ topic: string; correct: number; total?: number; attempted?: number }>,
): DomainStat[] {
  const buckets: Record<McqDomain, { correct: number; total: number }> = {
    micro: { correct: 0, total: 0 },
    macro: { correct: 0, total: 0 },
    unclassified: { correct: 0, total: 0 },
  };
  for (const s of stats) {
    const dom = classifyTopicDomain(s.topic);
    buckets[dom].correct += s.correct;
    buckets[dom].total += s.attempted ?? s.total ?? 0;
  }
  return (["micro", "macro", "unclassified"] as McqDomain[])
    .filter((d) => buckets[d].total > 0)
    .map((d) => {
      const pct = Math.round((buckets[d].correct / buckets[d].total) * 100);
      return {
        domain: d,
        label: MCQ_DOMAIN_LABEL[d],
        correct: buckets[d].correct,
        attempted: buckets[d].total,
        total: buckets[d].total,
        accuracyPct: pct,
        percentage: pct,
      };
    });
}
