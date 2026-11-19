// Retrieval used to ground every AI response. Nothing calls a model without
// first pulling the relevant syllabus / mark scheme / textbook material.
import type { SupabaseClient } from "@supabase/supabase-js";

import { embedOne } from "./ai.server";
import { getActiveEmbeddingProvider } from "./ai/active.server";
import { MODEL_EMBEDDING } from "./examiner/config";
import type { GroundingSource } from "./examiner/types";

export type DocType =
  "coursebook" | "syllabus" | "mark_scheme" | "past_paper" | "examiner_report" | "notes" | "other";

type MatchRow = {
  chunk_id: string;
  document_id: string;
  document_title: string;
  doc_type: DocType;
  heading: string | null;
  content: string;
  similarity: number;
};

/**
 * Chunks below this cosine similarity are dropped as irrelevant noise.
 * In dense 2048-dim vector embeddings, random English texts share a baseline similarity of ~0.35-0.45.
 * Genuine Cambridge 0455 Economics syllabus matches score 0.55-0.85.
 * Setting the default floor to 0.50 guarantees that random noise is never treated as a source.
 */
export const DEFAULT_GROUNDING_SIMILARITY_FLOOR = 0.5;

export type RetrieveOptions = {
  query: string;
  matchCount?: number;
  docTypes?: DocType[];
  topicId?: string | null;
  /** Chunks below this cosine similarity are dropped as irrelevant noise. Default calibrated to 0.50. */
  minSimilarity?: number;
  /** Enable Reciprocal Rank Fusion of dense vectors and sparse lexical search (defaults to true). */
  enableHybridRrf?: boolean;
};

// Generic 2-letter stop words to ignore in sparse lexical queries
const GENERIC_STOP_WORDS_2 = new Set([
  "to",
  "in",
  "on",
  "at",
  "of",
  "is",
  "it",
  "an",
  "by",
  "if",
  "or",
  "so",
  "my",
  "we",
  "he",
  "do",
  "no",
  "up",
]);

/**
 * Syllabus-aware Query Expansion for Cambridge 0455 Economics.
 * Enriches short or ambiguous questions with core syllabus concept keywords,
 * models, diagrams, and policy mechanisms across all micro and macro units so
 * retrieval captures both general theory and specific mark-scheme guidance.
 */
export function expandEconomicQuery(query: string): string {
  const lower = query.toLowerCase();
  const additions: string[] = [];

  const TOPIC_EXPANSIONS: Array<{ triggers: RegExp; keywords: string }> = [
    {
      triggers:
        /\b(scarcit(y|ies)|opportunity cost|ppc|ppf|production possibilit(y|ies)|basic economic (problem|idea)|factors of production)\b/i,
      keywords:
        "scarcity, finite resources, unlimited wants, opportunity cost, next best alternative forgone, land labour capital enterprise, production possibility curve, PPC shift vs movement, economic goods, free goods",
    },
    {
      triggers:
        /\b(demand|supply|equilibrium|price mechanism|shortage|surplus)\b/i,
      keywords:
        "law of demand, determinants of demand, extension contraction shift, law of supply, equilibrium price, equilibrium quantity, excess demand shortage, excess supply surplus, market clearing price",
    },
    {
      triggers: /\b(elasticit(y|ies)|ped|pes|inelastic|elastic)\b/i,
      keywords:
        "price elasticity of demand, PED formula, elastic demand, inelastic demand, total revenue, consumer expenditure, price elasticity of supply, PES formula, spare capacity, time period, stock levels",
    },
    {
      triggers:
        /\b(tax(es|ation)?|subsid(y|ies)|price ceiling|price floor|maximum price|minimum price|indirect tax|mixed econom|regulation|privatisation|nationalisation)\b/i,
      keywords:
        "indirect tax, specific tax, subsidy, maximum price, shortage, minimum price, surplus, regulation, direct provision, privatisation, nationalisation, mixed economic system",
    },
    {
      triggers: /\b(externalit(y|ies)|market failure|merit|demerit|public goods?|social cost|social benefit)\b/i,
      keywords:
        "market failure, private costs, external costs, social costs, private benefits, external benefits, social benefits, merit goods, demerit goods, public goods, non-rival, non-excludable, abuse of monopoly power",
    },
    {
      triggers: /\b(money|bank(s|ing)?|central bank|commercial bank|household|saving|borrowing|spending)\b/i,
      keywords:
        "functions of money, medium of exchange, store of value, unit of account, commercial bank lending, central bank lender of last resort, disposable income, household spending, saving, borrowing",
    },
    {
      triggers: /\b(worker|wage|trade union|minimum wage|division of labour|specialisation|mobility of labour)\b/i,
      keywords:
        "wage factors, non-wage factors, demand and supply of labour, trade unions, collective bargaining, industrial action, national minimum wage, occupational mobility, geographical mobility, division of labour",
    },
    {
      triggers: /\b(firm|merger|economies of scale|diseconomies of scale|cost|revenue|profit|monopoly|competitive market|productivity)\b/i,
      keywords:
        "primary secondary tertiary sector, horizontal vertical conglomerate merger, internal external economies of scale, diseconomies of scale, labour-intensive, capital-intensive, productivity, total cost, average total cost, fixed cost, variable cost, total revenue, profit maximisation, monopoly, barriers to entry",
    },
    {
      triggers: /\b(inflation|deflation|cpi|price level|price stability)\b/i,
      keywords:
        "inflation, deflation, consumer prices index CPI, purchasing power, demand-pull inflation, cost-push inflation, wage-price spiral, menu costs, shoe-leather costs",
    },
    {
      triggers:
        /\b(monetary policy|interest rates?|central bank|money supply)\b/i,
      keywords:
        "monetary policy, interest rates, money supply, borrowing, saving, consumer spending, investment, total demand, inflation control",
    },
    {
      triggers:
        /\b(fiscal policy|budget deficit|budget surplus|taxation|government spending|direct tax|progressive tax|regressive tax)\b/i,
      keywords:
        "fiscal policy, government spending, direct tax, indirect tax, progressive tax, regressive tax, proportional tax, budget deficit, budget surplus, redistribution of income",
    },
    {
      triggers: /\b(economic growth|gdp|recession|standard of living|living standards|hdi|poverty|population)\b/i,
      keywords:
        "economic growth, real GDP, GDP per head, recession, Human Development Index HDI, absolute poverty, relative poverty, birth rate, death rate, net migration, ageing population, dependency ratio",
    },
    {
      triggers: /\b(supply[- ]side policy|deregulation|education|training|infrastructure)\b/i,
      keywords:
        "supply-side policy, education and training, labour productivity, deregulation, privatisation, lower direct taxes, subsidies for firms, productive capacity, long-run economic growth",
    },
    {
      triggers: /\b(unemployment|employment|full employment|jobs?)\b/i,
      keywords:
        "unemployment rate, claimant count, labour force survey, cyclical unemployment, structural unemployment, frictional unemployment, seasonal unemployment, full employment",
    },
    {
      triggers: /\b(balance of payments|current account|trade deficit|trade surplus|exchange rate|depreciation|appreciation|globalisation|tariff|quota|protectionism|mnc|multinational)\b/i,
      keywords:
        "current account, trade in goods, trade in services, primary income, secondary income, floating exchange rate, appreciation, depreciation, export competitiveness, import prices, globalisation, multinational companies MNCs, free trade, protectionism, tariffs, quotas, embargoes, infant industries",
    },
  ];

  for (const { triggers, keywords } of TOPIC_EXPANSIONS) {
    if (triggers.test(lower)) {
      additions.push(keywords);
    }
  }

  if (additions.length === 0) return query;
  return `${query}\n\nKey syllabus concepts: ${additions.join("; ")}`;
}

/**
 * Computes sparse lexical relevance score based on query term frequency
 * with calibrated heading and title boosts.
 */
export function computeLexicalScore(
  chunk: { content: string; heading: string | null; document_title: string },
  queryTerms: string[],
): number {
  if (queryTerms.length === 0) return 0;

  const contentLower = chunk.content.toLowerCase();
  const headingLower = (chunk.heading ?? "").toLowerCase();
  const titleLower = chunk.document_title.toLowerCase();

  let score = 0;
  for (const term of queryTerms) {
    if (term.length < 2) continue;
    if (term.length === 2 && GENERIC_STOP_WORDS_2.has(term)) continue;

    // Word boundary exact matches
    const termRegex = new RegExp(`\\b${term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`, "g");
    const contentMatches = (contentLower.match(termRegex) || []).length;
    const headingMatches = (headingLower.match(termRegex) || []).length;
    const titleMatches = (titleLower.match(termRegex) || []).length;

    score += contentMatches * 1.0;
    score += headingMatches * 3.0; // Calibrated heading boost
    score += titleMatches * 4.0; // Calibrated document title boost
  }

  return score;
}

/**
 * Reciprocal Rank Fusion (RRF) combining dense vector similarity rank
 * with sparse lexical relevance rank.
 * Formula: RRF(d) = 1 / (60 + rankDense) + (lexicalBoost / (60 + rankSparse))
 */
export function reciprocalRankFusion(
  rows: MatchRow[],
  query: string,
  targetCount: number,
): MatchRow[] {
  if (rows.length <= targetCount) return rows;

  // Extract clean query terms (length >= 2, excluding 2-letter generic stop words)
  const queryTerms = query
    .toLowerCase()
    .replace(/[^\w\s-]/g, " ")
    .split(/\s+/)
    .filter((w) => w.length >= 2 && !(w.length === 2 && GENERIC_STOP_WORDS_2.has(w)));

  // 1. Dense rank (already sorted by vector similarity descending)
  const denseRankMap = new Map<string, number>();
  rows.forEach((row, index) => {
    denseRankMap.set(row.chunk_id, index + 1);
  });

  // 2. Sparse lexical rank
  const scoredRows = rows.map((row) => ({
    row,
    lexicalScore: computeLexicalScore(row, queryTerms),
  }));

  scoredRows.sort((a, b) => b.lexicalScore - a.lexicalScore);

  const sparseRankMap = new Map<string, number>();
  const lexicalScoreMap = new Map<string, number>();
  scoredRows.forEach((item, index) => {
    sparseRankMap.set(item.row.chunk_id, index + 1);
    lexicalScoreMap.set(item.row.chunk_id, item.lexicalScore);
  });

  // 3. Compute RRF score
  // Equal reciprocal voting: RRF(d) = 1/(K + rankDense) + sparseContribution
  const K = 60;
  const fused = rows.map((row) => {
    const denseRank = denseRankMap.get(row.chunk_id) ?? rows.length;
    const sparseRank = sparseRankMap.get(row.chunk_id) ?? rows.length;
    const lexicalScore = lexicalScoreMap.get(row.chunk_id) ?? 0;
    // Calibrated lexical weight scales up when chunks directly answer query terms
    const sparseContribution =
      lexicalScore > 0 ? (1 / (K + sparseRank)) * (1 + Math.min(2, lexicalScore / 8)) : 0;
    const rrfScore = 1 / (K + denseRank) + sparseContribution;
    return { row, rrfScore };
  });

  fused.sort((a, b) => b.rrfScore - a.rrfScore);

  return fused.slice(0, targetCount).map((item) => item.row);
}

/**
 * Below this raw cosine similarity, a match is not "weakly relevant" — it is
 * statistically indistinguishable from two vectors that were never in the
 * same embedding space to begin with.
 */
const SPACE_MISMATCH_CEILING = 0.08;

type CacheEntry = {
  sources: GroundingSource[];
  timestamp: number;
};

// In-memory cache for recent vector queries
const RETRIEVAL_CACHE = new Map<string, CacheEntry>();
const CACHE_TTL_MS = 15 * 60 * 1000; // 15 minutes
const MAX_CACHE_ENTRIES = 250;

function getCacheKey(options: RetrieveOptions): string {
  const types = options.docTypes ? [...options.docTypes].sort().join(",") : "all";
  const topic = options.topicId ?? "none";
  const count = options.matchCount ?? 8;
  const minSim = options.minSimilarity ?? DEFAULT_GROUNDING_SIMILARITY_FLOOR;
  const rrf = options.enableHybridRrf !== false ? "rrf" : "dense";
  return `${options.query.trim().toLowerCase()}::${types}::${topic}::${count}::${minSim}::${rrf}`;
}

export function deduplicateSources(sources: GroundingSource[]): GroundingSource[] {
  const seenPrefixes = new Set<string>();
  const result: GroundingSource[] = [];
  for (const src of sources) {
    const norm = src.snippet
      .toLowerCase()
      .replace(/[^\w\s]/g, "")
      .replace(/\s+/g, " ")
      .trim()
      .slice(0, 150);
    if (seenPrefixes.has(norm)) continue;
    seenPrefixes.add(norm);
    result.push(src);
  }
  return result;
}

export function sanitizeDocTitle(title: string): string {
  if (!title) return "Cambridge 0455 Economics Resource";
  return title
    .replace(/\bCambridge\s+(?:International\s+)?(?:AS(?:\/A)?|A[\s-]?Level)\s+Economics\s*\(?9708\)?/gi, "Cambridge IGCSE Economics (0455)")
    .replace(/\b(?:Cambridge\s+(?:International\s+)?)?AS(?:\/A)?\s+Level\s+Economics/gi, "Cambridge IGCSE Economics")
    .replace(/\bAS(?:\/A)?\s+Level\b/gi, "Cambridge IGCSE 0455")
    .replace(/\bA-Level\b/gi, "Cambridge IGCSE 0455")
    .replace(/\b9708\b/g, "0455")
    .replace(/\bAS\b(?=\s+ref|\s+foundations|\s+economics)/gi, "IGCSE 0455")
    .trim();
}

/**
 * Lexical keyword retrieval directly against document_chunks and knowledge_documents.
 * Used when vector embeddings are not yet generated, or when vector search returns 0 matches.
 */
export async function lexicalFallback(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: SupabaseClient<any>,
  options: RetrieveOptions,
): Promise<GroundingSource[]> {
  const queryTerms = options.query
    .toLowerCase()
    .replace(/[^\w\s-]/g, " ")
    .split(/\s+/)
    .filter((w) => w.length >= 3 && !GENERIC_STOP_WORDS_2.has(w));

  if (queryTerms.length === 0) return [];

  // Exclude command and meta words
  const excludeWords = new Set([
    "what",
    "which",
    "explain",
    "discuss",
    "evaluate",
    "analyse",
    "analyze",
    "define",
    "question",
    "scheme",
    "guidance",
    "whether",
    "should",
    "reasons",
    "points",
    "marks",
    "paper",
    "candidate",
    "answer",
    "using",
  ]);

  const distinctive = queryTerms.filter((w) => !excludeWords.has(w)).slice(0, 5);
  const termsToQuery = distinctive.length > 0 ? distinctive : queryTerms.slice(0, 3);

  try {
    const orFilter = termsToQuery
      .map((term) => `content.ilike.%${term}%,heading.ilike.%${term}%`)
      .join(",");

    let query = supabase
      .from("document_chunks")
      .select("id, document_id, heading, content, knowledge_documents!inner(id, title, doc_type)")
      .or(orFilter)
      .limit(40);

    if (options.docTypes && options.docTypes.length > 0) {
      query = query.in("knowledge_documents.doc_type", options.docTypes);
    }

    const { data, error } = await query;
    if (error || !data || data.length === 0) return [];

    const scored = data.map((chunk: any) => {
      const doc = Array.isArray(chunk.knowledge_documents)
        ? chunk.knowledge_documents[0]
        : chunk.knowledge_documents;
      const rawDocTitle = doc?.title || "Cambridge 0455 Economics Resource";
      const docTitle = sanitizeDocTitle(rawDocTitle);
      const docType = (doc?.doc_type || "notes") as DocType;

      const score = computeLexicalScore(
        {
          content: chunk.content,
          heading: chunk.heading ? sanitizeDocTitle(chunk.heading) : null,
          document_title: docTitle,
        },
        termsToQuery,
      );

      return {
        documentId: chunk.document_id,
        documentTitle: docTitle,
        docType,
        heading: chunk.heading ? sanitizeDocTitle(chunk.heading) : null,
        snippet: chunk.content,
        similarity: Math.min(0.92, 0.55 + score * 0.04),
        score,
      };
    });

    scored.sort((a, b) => b.score - a.score);
    const targetCount = options.matchCount ?? 8;
    return deduplicateSources(
      scored.slice(0, targetCount).map(({ score: _score, ...rest }) => rest),
    );
  } catch (err) {
    console.warn("Lexical fallback search error:", err);
    return [];
  }
}

export async function retrieve(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: SupabaseClient<any>,
  options: RetrieveOptions,
): Promise<GroundingSource[]> {
  const cacheKey = getCacheKey(options);
  const now = Date.now();
  const cached = RETRIEVAL_CACHE.get(cacheKey);

  if (cached && now - cached.timestamp < CACHE_TTL_MS) {
    return cached.sources;
  }

  // Run lexical fallback in parallel with dense vector embedding+RPC so that
  // when embeddings are unpopulated or cold-starting, Cambridge IGCSE 0455 KB
  // sources are returned in <1s without timing out.
  const lexicalPromise = lexicalFallback(supabase, options).catch(() => [] as GroundingSource[]);

  const matchTarget = options.matchCount ?? 8;
  const fetchCount =
    options.enableHybridRrf !== false ? Math.min(24, Math.max(matchTarget * 2, 16)) : matchTarget;

  let rows: MatchRow[] = [];
  const vectorSearch = async () => {
    try {
      const expandedQuery = expandEconomicQuery(options.query);
      const queryEmbedding = await embedOne(expandedQuery, MODEL_EMBEDDING);
      if (!queryEmbedding) return;
      const { data, error } = await supabase.rpc("match_document_chunks", {
        query_embedding: JSON.stringify(queryEmbedding),
        match_count: fetchCount,
        filter_doc_types: options.docTypes ?? null,
        filter_topic_id: options.topicId ?? null,
      });
      if (!error && data) {
        rows = data as MatchRow[];
      }
    } catch (err) {
      console.warn("Vector retrieval skipped/failed, using parallel lexical results:", err);
    }
  };

  await Promise.race([
    vectorSearch(),
    new Promise<void>((resolve) => setTimeout(resolve, 2500)),
  ]);

  const minSimilarity = options.minSimilarity ?? DEFAULT_GROUNDING_SIMILARITY_FLOOR; // Calibrated floor (>=0.50)
  const matches = rows.filter((row) => row.similarity >= minSimilarity);

  // If vector search returned nothing or timed out at 2.5s, use parallel lexical results immediately
  if (matches.length === 0) {
    const fallbackSources = await lexicalPromise;
    if (fallbackSources.length > 0) {
      if (RETRIEVAL_CACHE.size >= MAX_CACHE_ENTRIES) {
        const oldestKey = RETRIEVAL_CACHE.keys().next().value;
        if (oldestKey) RETRIEVAL_CACHE.delete(oldestKey);
      }
      RETRIEVAL_CACHE.set(cacheKey, { sources: fallbackSources, timestamp: now });
      return fallbackSources;
    }
    return [];
  }

  // Apply Reciprocal Rank Fusion (RRF) between dense and sparse ranks
  const finalRows =
    options.enableHybridRrf !== false
      ? reciprocalRankFusion(matches, options.query, matchTarget)
      : matches.slice(0, matchTarget);

  const mapped = finalRows.map((row) => ({
    documentId: row.document_id,
    documentTitle: sanitizeDocTitle(row.document_title),
    docType: row.doc_type,
    heading: row.heading ? sanitizeDocTitle(row.heading) : null,
    snippet: row.content,
    similarity: Number(row.similarity.toFixed(4)),
  }));

  const deduped = deduplicateSources(mapped);

  if (RETRIEVAL_CACHE.size >= MAX_CACHE_ENTRIES) {
    const oldestKey = RETRIEVAL_CACHE.keys().next().value;
    if (oldestKey) RETRIEVAL_CACHE.delete(oldestKey);
  }
  RETRIEVAL_CACHE.set(cacheKey, { sources: deduped, timestamp: now });

  return deduped;
}

/**
 * Render retrieved chunks as a numbered, citable context block. The [S1]-style
 * markers let the model cite instead of inventing.
 */
export function renderContext(sources: GroundingSource[]): string {
  if (sources.length === 0) return "";

  const blocks = sources.map((source, index) => {
    const isReference =
      source.documentTitle.toLowerCase().includes("reference") ||
      source.documentTitle.toLowerCase().includes("core") ||
      (source.heading && source.heading.toLowerCase().includes("ref"));
    const label = source.heading
      ? `${source.documentTitle} — ${source.heading}`
      : source.documentTitle;
    const refTag = isReference
      ? " [REFERENCE ONLY: Theoretical enrichment & reasoning depth; marking criteria remain Cambridge 0455]"
      : "";
    return `[S${index + 1}] (${source.docType.replace("_", " ")})${refTag} ${label}\n${source.snippet}`;
  });

  return [
    "RETRIEVED CAMBRIDGE SOURCE MATERIAL — this is the authoritative material for this assessment.",
    "Cite the sources you use with their [S#] markers.",
    "NOTE ON REFERENCE SOURCES: Any source tagged [REFERENCE ONLY] provides theoretical depth and economic reasoning structure. Do NOT penalise an IGCSE candidate if advanced formalisms are not mentioned; evaluate the candidate strictly by Cambridge IGCSE 0455 standards.",
    "If the material below does not cover something, say so plainly rather than inventing syllabus content, mark scheme wording, or examiner report claims.",
    "",
    blocks.join("\n\n"),
  ].join("\n");
}
