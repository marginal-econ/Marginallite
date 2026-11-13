/**
 * Micro vs macro split for MCQ topic labels — section feedback
 * for Cambridge IGCSE 0455 Economics (Units 1-3 Micro, Units 4-6 Macro).
 *
 * Deliberately keyword-based, not AI-classified: topics come out
 * of classifyPdfMcqTopics as short unit-aligned phrases, matching on
 * the vocabulary those topics actually use. Robust, needs no extra model
 * call, and works retroactively on every attempt already on record.
 *
 * This is a plain (non-`.server.ts`) module on purpose so it can be
 * imported directly from client routes (mcq-live.tsx, review.tsx) as well
 * as server function files (review.functions.ts) without the
 * server-only-import restriction the rest of the MCQ code follows.
 */

export type McqDomain = "micro" | "macro" | "unclassified";

export const MCQ_DOMAIN_LABEL: Record<McqDomain, string> = {
  micro: "Micro",
  macro: "Macro",
  unclassified: "Other",
};

/** Cambridge 0455 micro topics (Units 1-3) — basic economic problem, allocation of resources, microeconomic decision makers. */
const MICRO_KEYWORDS = [
  "demand",
  "supply",
  "elastic",
  "price control",
  "price ceiling",
  "price floor",
  "subsidy",
  "subsidies",
  "externalit",
  "market failure",
  "public good",
  "merit good",
  "demerit good",
  "consumer surplus",
  "producer surplus",
  "utility",
  "indifference",
  "budget line",
  "behavioural econom",
  "behavioral econom",
  "cost curve",
  "cost of production",
  "revenue",
  "monopoly",
  "oligopoly",
  "perfect competition",
  "monopolistic competition",
  "contestab",
  "market structure",
  "labour market",
  "labor market",
  "wage",
  "trade union",
  "privatisation",
  "privatization",
  "nationalisation",
  "nationalization",
  "regulation",
  "cost-benefit",
  "resource allocation",
  "scarcity",
  "production possibility",
  " ppc",
  "factors of production",
  "specialisation",
  "specialization",
  "opportunity cost",
  "firm",
  "profit maximis",
  "price discrimination",
  "minimum wage",
];

/** Cambridge 0455 macro topics (Units 4-6) — government and the macroeconomy, economic development, international trade. */
const MACRO_KEYWORDS = [
  "aggregate demand",
  "aggregate supply",
  "ad/as",
  "national income",
  " gdp",
  "gross domestic",
  " gnp",
  "gross national",
  "inflation",
  "unemployment",
  "balance of payments",
  "exchange rate",
  "fiscal polic",
  "monetary polic",
  "supply-side polic",
  "economic growth",
  "development",
  "gini",
  "human development",
  " hdi",
  "kuznets",
  "lorenz",
  "phillips curve",
  "quantity theory",
  "money supply",
  "comparative advantage",
  "protectionism",
  "tariff",
  "terms of trade",
  "trade bloc",
  "free trade",
  "circular flow",
  "multiplier",
  "government spending",
  "budget deficit",
  "national debt",
  "interest rate",
  "policy conflict",
];

/** Classifies one topic label into micro / macro / unclassified. */
export function classifyTopicDomain(topic: string): McqDomain {
  const t = ` ${topic.toLowerCase()} `;
  const isMicro = MICRO_KEYWORDS.some((k) => t.includes(k));
  const isMacro = MACRO_KEYWORDS.some((k) => t.includes(k));
  if (isMicro && !isMacro) return "micro";
  if (isMacro && !isMicro) return "macro";
  return "unclassified";
}

export type DomainStat = {
  domain: McqDomain;
  attempted: number;
  correct: number;
  accuracyPct: number;
};

function finalizeDomainBuckets(
  buckets: Map<McqDomain, { attempted: number; correct: number }>,
): DomainStat[] {
  const order: McqDomain[] = ["micro", "macro", "unclassified"];
  return order
    .filter((d) => buckets.has(d))
    .map((domain) => {
      const entry = buckets.get(domain)!;
      return {
        domain,
        attempted: entry.attempted,
        correct: entry.correct,
        accuracyPct: Math.round((entry.correct / Math.max(entry.attempted, 1)) * 100),
      };
    });
}

/** Groups a flat list of graded questions into micro/macro/unclassified buckets. */
export function aggregateMcqDomains(items: { topic: string; correct: boolean }[]): DomainStat[] {
  const buckets = new Map<McqDomain, { attempted: number; correct: number }>();
  for (const item of items) {
    const domain = classifyTopicDomain(item.topic);
    const entry = buckets.get(domain) ?? { attempted: 0, correct: 0 };
    entry.attempted += 1;
    if (item.correct) entry.correct += 1;
    buckets.set(domain, entry);
  }
  return finalizeDomainBuckets(buckets);
}

/**
 * Same grouping, but starting from already-aggregated per-topic stats
 * (attempted/correct counts) rather than one row per question — for
 * surfaces like the standing "How you're doing" view, which is backed by
 * a SQL view (mcq_topic_performance) that only ever returns per-topic
 * totals, never individual questions.
 */
export function aggregateMcqDomainsFromTopicStats(
  items: { topic: string; attempted: number; correct: number }[],
): DomainStat[] {
  const buckets = new Map<McqDomain, { attempted: number; correct: number }>();
  for (const item of items) {
    const domain = classifyTopicDomain(item.topic);
    const entry = buckets.get(domain) ?? { attempted: 0, correct: 0 };
    entry.attempted += item.attempted;
    entry.correct += item.correct;
    buckets.set(domain, entry);
  }
  return finalizeDomainBuckets(buckets);
}
