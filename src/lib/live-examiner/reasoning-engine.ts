import type { IssueV2 } from "./types";
import { stripStars } from "./clean-suggestion";

export type CausalChainStep = {
  text: string;
  stage: "cause" | "intermediate_adjustment" | "final_equilibrium";
};

export type CausalAnalysisResult = {
  isComplete: boolean;
  steps: CausalChainStep[];
  missingLinks: string[];
  feedback?: string;
};

// Patterns representing Cambridge economic transmission steps
const CAUSAL_CONNECTORS = /\b(because|therefore|leads to|results in|causes?|causing|resulting in|as a consequence|which means that|consequently|thus|hence|in turn|spurs?|generates?|diminishes?|compels?|forces?|when|if|as)\b/i;
const COST_PRICE_SHIFTS = /\b(costs? of production|average costs?|marginal costs?|prices? rise|prices? fall|higher prices?|lower prices?|equilibrium price|market price|profit margin|profitability|subsid|tax burden)\b/i;
const OUTPUT_EMPLOYMENT_SHIFTS = /\b(output contracts?|output expands?|production increases?|production decreases?|employment falls?|jobs? lost|unemployment rises?|hiring increases?|(?:shifting|shifts?)\s+(?:domestic\s+|market\s+)?(?:supply|demand)|supply shifts?|demand shifts?|consumer prices?|market equilibrium)\b/i;
const MACRO_SHIFTS = /\b(aggregate demand|real gdp|economic growth|current account balance|inflation rate|purchasing power|exchange rate|national debt)\b/i;

/**
 * Analyzes whether an economic argument contains an unbroken causal transmission chain.
 */
export function analyzeCausalChain(sentence: string): CausalAnalysisResult {
  const steps: CausalChainStep[] = [];
  const missingLinks: string[] = [];

  const hasConnector = CAUSAL_CONNECTORS.test(sentence);
  const hasMicroShift = COST_PRICE_SHIFTS.test(sentence);
  const hasOutputShift = OUTPUT_EMPLOYMENT_SHIFTS.test(sentence);
  const hasMacroShift = MACRO_SHIFTS.test(sentence);

  if (hasConnector && (hasMicroShift || hasOutputShift || hasMacroShift)) {
    steps.push({ text: "Cause / policy trigger", stage: "cause" });
  }

  if (hasMicroShift) {
    steps.push({ text: "Intermediate market adjustment (prices/costs/supply)", stage: "intermediate_adjustment" });
  }

  if (hasOutputShift || hasMacroShift) {
    steps.push({ text: "Final equilibrium impact (output/welfare/macro)", stage: "final_equilibrium" });
  }

  // Check for leap-in-logic: trigger mentioned with final outcome, but zero intermediate price/cost mechanism
  if (hasConnector && (hasOutputShift || hasMacroShift) && !hasMicroShift && sentence.split(/\s+/).length < 25) {
    missingLinks.push("Intermediate transmission mechanism: explain how costs, prices, or incentives adjust before the final outcome occurs.");
  }

  const isComplete = steps.length >= 2 && missingLinks.length === 0;

  return {
    isComplete,
    steps,
    missingLinks,
    feedback: missingLinks.length > 0 ? missingLinks[0] : undefined,
  };
}

/**
 * Checks for genuine Cambridge AO3 evaluative depth.
 */
export function evaluateEvaluativeDepth(text: string): {
  depth: "none" | "superficial" | "sustained" | "justified_judgement";
  criteriaDetected: string[];
} {
  const criteriaDetected: string[] = [];
  const norm = text.toLowerCase();

  if (/\b(in the short[- ]run|in the long[- ]run|time lag|short vs long run)\b/i.test(norm)) {
    criteriaDetected.push("Time Horizon / Elasticity Dynamics");
  }
  if (/\b(ped|pes|yed|elastic|inelastic|degree of elasticity)\b/i.test(norm)) {
    criteriaDetected.push("Price Elasticity Dependency");
  }
  if (/\b(magnitude|scale of|size of the (?:tax|subsidy|cut|deficit)|significance of)\b/i.test(norm)) {
    criteriaDetected.push("Magnitude & Scale");
  }
  if (/\b(depends (?:on|upon)|contingent on|crucially relies)\b/i.test(norm)) {
    criteriaDetected.push("Contextual Dependency ('Depends On' Factor)");
  }
  if (/\b(opportunity cost|trade-?off|conflicting (?:macroeconomic|policy) objective)\b/i.test(norm)) {
    criteriaDetected.push("Opportunity Cost / Policy Trade-off");
  }
  if (/\b(on balance|overall|in conclusion|ultimately|most decisive factor|weighing both)\b/i.test(norm)) {
    criteriaDetected.push("Decisive Supported Judgement");
  }

  let depth: "none" | "superficial" | "sustained" | "justified_judgement" = "none";
  if (criteriaDetected.length >= 3 || (criteriaDetected.includes("Decisive Supported Judgement") && criteriaDetected.length >= 2)) {
    depth = "justified_judgement";
  } else if (criteriaDetected.length >= 2) {
    depth = "sustained";
  } else if (criteriaDetected.length === 1) {
    depth = "superficial";
  } else if (
    /\b(however|on the other hand|nevertheless|conversely)\b/i.test(norm) &&
    /\b(price|cost|demand|supply|market|tax|subsidy|firm|consumer|inflation|gdp|elastic|ped|goods?|revenue|output|welfare)\b/i.test(norm)
  ) {
    depth = "superficial";
  }

  return { depth, criteriaDetected };
}

export type MisconceptionRule = {
  id: string;
  pattern: RegExp;
  flagWord: string;
  suggestion: string;
  explanation: string;
  category: "economics_accuracy" | "terminology";
};

/**
 * Deterministic Cambridge Economics Misconception Rules.
 */
export const EXTENDED_MISCONCEPTIONS: MisconceptionRule[] = [
  {
    id: "tax_shifts_demand",
    pattern: /\b(?:an?|the)?\s*indirect tax\s+(?:will\s+)?shifts?\s+(?:the\s+)?demand\s+curve\s+(?:to the\s+)?left\b/i,
    flagWord: "shifts the demand curve left",
    suggestion: "shifts the supply curve vertically upwards by the amount of the tax",
    explanation: "An indirect tax is levied on producers, increasing marginal costs and shifting the SUPPLY curve upward/left, NEVER the demand curve.",
    category: "economics_accuracy",
  },
  {
    id: "subsidy_shifts_demand",
    pattern: /\b(?:a|the)?\s*subsidy\s+(?:will\s+)?shifts?\s+(?:the\s+)?demand\s+curve\s+(?:to the\s+)?right\b/i,
    flagWord: "shifts the demand curve right",
    suggestion: "shifts the supply curve vertically downwards/right by the unit subsidy amount",
    explanation: "A producer subsidy reduces per-unit production costs, shifting SUPPLY rightwards, causing an extension along the demand curve.",
    category: "economics_accuracy",
  },
  {
    id: "demand_vs_quantity_demanded",
    pattern: /\b(?:a\s+)?rise in price\s+(?:will\s+)?decreases?\s+demand\b/i,
    flagWord: "decreases demand",
    suggestion: "causes a contraction in quantity demanded along the existing demand curve",
    explanation: "A change in price causes a movement ALONG the demand curve (change in quantity demanded), NOT a shift of the demand curve itself.",
    category: "economics_accuracy",
  },
  {
    id: "supply_vs_quantity_supplied",
    pattern: /\b(?:a\s+)?fall in price\s+(?:will\s+)?decreases?\s+supply\b/i,
    flagWord: "decreases supply",
    suggestion: "causes a contraction in quantity supplied along the supply curve",
    explanation: "A change in own-price causes a movement ALONG the supply curve, not a change in underlying supply conditions.",
    category: "economics_accuracy",
  },
  {
    id: "inelastic_tax_consumption_trap",
    pattern: /\bbecause demand is inelastic,?\s+(?:the\s+)?tax is (?:very|highly|most)\s+effective at reducing consumption\b/i,
    flagWord: "tax is very effective at reducing consumption",
    suggestion: "tax is relatively ineffective at reducing consumption because consumers are unresponsive to price changes",
    explanation: "When demand is price-inelastic (|PED| < 1), a price increase leads to a smaller percentage fall in quantity demanded (%ΔQd < %ΔP). Thus consumption falls very little, although tax revenue is maximized.",
    category: "economics_accuracy",
  },
  {
    id: "hyperinflation_misconception",
    pattern: /\bhyperinflation is when inflation (?:rises|increases|is high|goes up)\b/i,
    flagWord: "hyperinflation is when inflation rises",
    suggestion: "hyperinflation is an extreme, unmanageable rise in price levels (typically exceeding 50% per month) where money loses its medium-of-exchange function",
    explanation: "Hyperinflation is not merely rising or high inflation; it is catastrophic price growth exceeding 50% monthly where the domestic currency collapses.",
    category: "economics_accuracy",
  },
  {
    id: "growth_vs_development",
    pattern: /\beconomic growth (?:guarantees|ensures|automatically means)\s+(?:an?\s+)?increase in economic development\b/i,
    flagWord: "automatically means an increase in economic development",
    suggestion: "does not automatically guarantee economic development if gains are concentrated among elites, generate severe pollution, or neglect health and education",
    explanation: "Economic growth measures quantitative increases in real GDP, whereas economic development reflects qualitative improvements in living standards, life expectancy, and education (HDI).",
    category: "economics_accuracy",
  },
  {
    id: "fiscal_vs_monetary_mixup",
    pattern: /\bfiscal policy (?:involves|uses|adjusts)\s+(?:changing\s+)?interest rates\b/i,
    flagWord: "fiscal policy involves changing interest rates",
    suggestion: "monetary policy involves changing interest rates, whereas fiscal policy uses government taxation and public expenditure",
    explanation: "Interest rate manipulation and quantitative easing are tools of MONETARY policy managed by the central bank. Fiscal policy is controlled by the government via taxation and state spending.",
    category: "economics_accuracy",
  },
  {
    id: "current_account_vs_fdi",
    pattern: /\bforeign direct investment\s+(?:is recorded in|enters)\s+the current account\b/i,
    flagWord: "enters the current account",
    suggestion: "is recorded in the financial account of the balance of payments (though subsequent profit repatriation enters the primary income balance)",
    explanation: "FDI (e.g. building a manufacturing plant abroad) is recorded in the FINANCIAL account. Only the investment income flows (profits, dividends) return to the current account.",
    category: "economics_accuracy",
  },
  {
    id: "real_vs_nominal",
    pattern: /\bnominal gdp (?:measures|shows|adjusts for)\s+(?:inflation|real output|price changes)\b/i,
    flagWord: "nominal gdp measures inflation",
    suggestion: "real GDP is adjusted for inflation using the GDP deflator, whereas nominal GDP is measured at current market prices without inflation adjustment",
    explanation: "Nominal values reflect current market prices and can rise purely from inflation; Real values are adjusted for price changes to measure physical output volume.",
    category: "economics_accuracy",
  },
];

/**
 * Scans a sentence for deterministic economic misconceptions.
 */
export function checkEconomicMisconceptions(sentence: string, sentenceId: string): IssueV2[] {
  const issues: IssueV2[] = [];
  const norm = sentence.trim();

  for (const rule of EXTENDED_MISCONCEPTIONS) {
    if (rule.pattern.test(norm)) {
      const match = norm.match(rule.pattern);
      const original = match ? match[0] : rule.flagWord;
      const from = norm.indexOf(original);
      const to = from >= 0 ? from + original.length : norm.length;

      issues.push({
        id: `${rule.id}::${sentenceId}`,
        sentenceId,
        from: Math.max(0, from),
        to: Math.max(0, to),
        category: rule.category,
        severity: "high",
        original: stripStars(original),
        suggestion: stripStars(rule.suggestion),
        explanation: stripStars(rule.explanation),
        evidence: "Cambridge IGCSE 0455 Syllabus Core Specification",
        aoImpact: "Major AO1/AO2 mark penalty if left uncorrected.",
        status: "active",
      });
    }
  }

  return issues;
}

/**
 * Assesses the quality of real-world application in a sentence.
 */
export function assessApplicationQuality(sentence: string): {
  hasApplication: boolean;
  isSuperficial: boolean;
  contextFound?: string;
  feedback?: string;
} {
  const COUNTRY_MARKET_RE = /\b(uk|united kingdom|us|usa|united states|singapore|china|india|germany|japan|eu|european union|zimbabwe|venezuela|nhs|railway|steel industry|electric vehicles?|minimum wage in the uk|sugar tax|congestion charge)\b/i;
  const match = sentence.match(COUNTRY_MARKET_RE);

  if (!match) {
    return { hasApplication: false, isSuperficial: false };
  }

  const contextFound = match[0];
  const words = sentence.trim().split(/\s+/).length;

  // If a country is mentioned in a sentence with under 12 words (e.g. "for example in the UK."), it is superficial
  if (words < 12) {
    return {
      hasApplication: true,
      isSuperficial: true,
      contextFound,
      feedback: `Superficial reference to "${contextFound}". Integrate how the economic mechanism applies to this example to demonstrate application.`,
    };
  }

  return {
    hasApplication: true,
    isSuperficial: false,
    contextFound,
  };
}
