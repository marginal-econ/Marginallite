import type { SupabaseClient } from "@supabase/supabase-js";

import { MAX_ANCHORS_PER_BAND } from "./config";
import { IGCSE_0455_GOLD_CALIBRATION_SET } from "./calibration/gold-set";

export type Anchor = {
  question: string;
  essay_text: string;
  mark: number;
  max_mark: number;
  band_label: string;
  notes: string | null;
};

let cachedAnchors: { data: Anchor[]; timestamp: number } | null = null;
const ANCHOR_CACHE_TTL_MS = 10 * 60 * 1000; // 10 minutes

/**
 * Loads calibration anchors for few-shot prompt injection.
 * Tries the database `calibration_anchors` table first; also combines with
 * the official Cambridge IGCSE 0455 Gold Calibration Set across all 6 Units.
 */
export async function fetchCalibrationAnchors(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase?: SupabaseClient<any>,
): Promise<Anchor[]> {
  const now = Date.now();
  if (cachedAnchors && now - cachedAnchors.timestamp < ANCHOR_CACHE_TTL_MS && cachedAnchors.data.length > 0) {
    return cachedAnchors.data;
  }

  const goldAnchors: Anchor[] = IGCSE_0455_GOLD_CALIBRATION_SET.map((item) => ({
    question: `[${item.topic} | ${item.paper} Q${item.questionNumber}] ${item.question}`,
    essay_text: item.candidateAnswer,
    mark: item.expectedMark,
    max_mark: item.maxMark,
    band_label: item.band,
    notes: `Tariff: ${item.maxMark}m | Standard: ${item.markingGuide} | Examiner Rationale: ${item.reason}`,
  }));

  try {
    let client = supabase;
    try {
      const { supabaseAdmin } = await import("@/integrations/backend/client.server");
      if (supabaseAdmin) {
        client = supabaseAdmin;
      }
    } catch {
      // Fall back to provided client
    }

    if (!client) {
      cachedAnchors = { data: goldAnchors, timestamp: now };
      return goldAnchors;
    }

    const { data, error } = await client
      .from("calibration_anchors")
      .select("question, essay_text, mark, max_mark, band_label, notes")
      .eq("active", true)
      .order("created_at", { ascending: true });

    if (!error && data && data.length > 0) {
      const combined = [...(data as Anchor[]), ...goldAnchors];
      cachedAnchors = { data: combined, timestamp: now };
      return combined;
    }
  } catch (err) {
    console.warn("calibration_anchors query failed, using Gold Calibration Set:", err);
  }

  cachedAnchors = { data: goldAnchors, timestamp: now };
  return goldAnchors;
}

/**
 * Selects the top 1 or 2 most relevant Cambridge IGCSE 0455 calibration anchors
 * based on question topic keywords and exact mark tariff (2m, 4m, 6m, 8m).
 * Keeps prompt token-efficient while providing authoritative scoring scale anchors.
 */
export function selectBestAnchors(
  anchors: Anchor[],
  question?: string,
  maxMark?: number,
  limit = 2,
): Anchor[] {
  if (anchors.length === 0) return [];

  // Filter pool strictly by Cambridge IGCSE 0455 mark tariff
  let pool = anchors;
  if (typeof maxMark === "number") {
    const exactTariff = anchors.filter((a) => a.max_mark === maxMark);
    if (exactTariff.length > 0) {
      pool = exactTariff;
    } else if (maxMark >= 6) {
      pool = anchors.filter((a) => a.max_mark >= 6);
    } else {
      pool = anchors.filter((a) => a.max_mark <= 4);
    }
  }
  if (pool.length === 0) return [];
  if (!question) return pool.slice(0, Math.min(limit, 2));

  const qLower = question.toLowerCase();
  const stopwords = new Set([
    "what", "when", "where", "which", "with", "would", "could", "should",
    "discuss", "assess", "explain", "consider", "extent", "always", "between",
    "either", "about", "their", "there", "these", "those", "using", "question",
    "evaluate", "analyse", "analyze", "essay", "marks", "curve", "diagram",
    "does", "have", "more", "most", "than", "that", "this", "some", "such",
    "give", "identify", "define", "state", "whether",
  ]);
  const qWords = qLower.match(/[a-z]{3,}/g)?.filter((w) => !stopwords.has(w)) || [];

  const scored = pool.map((anchor) => {
    let score = 0;
    const aText = `${anchor.question} ${anchor.notes || ""}`.toLowerCase();

    // Topic keyword relevance matching
    for (const word of qWords) {
      if (aText.includes(word)) {
        score += 3;
      }
    }

    // Exact tariff alignment bonus
    if (typeof maxMark === "number" && anchor.max_mark === maxMark) {
      score += 4;
    }

    // Prefer high-quality top-band anchor on ties
    if (anchor.band_label?.toLowerCase() === "top") {
      score += 0.5;
    }

    return { anchor, score };
  });

  scored.sort((a, b) => b.score - a.score);
  const maxAnchors = Math.max(1, Math.min(2, limit));
  if (maxAnchors === 1 || scored.length <= 1) {
    return scored.slice(0, maxAnchors).map((s) => s.anchor);
  }

  // Diverse multi-band calibration pairing: when selecting 2 anchors, pair the best
  // Top/High anchor with the best Middle/Low anchor of the same tariff whenever available.
  // This gives the examiner both the Level 3 ceiling AND the boundary floor directly in context.
  const isHighBand = (a: Anchor) => {
    const lbl = (a.band_label || "").toLowerCase();
    if (lbl === "top" || lbl === "high") return true;
    if (lbl === "middle" || lbl === "low" || lbl === "mid" || lbl === "bottom") return false;
    return a.max_mark > 0 && a.mark / a.max_mark >= 0.75;
  };

  const first = scored[0].anchor;
  const firstIsHigh = isHighBand(first);
  const contrasting = scored.slice(1).find((s) => isHighBand(s.anchor) !== firstIsHigh);
  if (contrasting) {
    return [first, contrasting.anchor];
  }
  return scored.slice(0, maxAnchors).map((s) => s.anchor);
}

/**
 * Selects the single most relevant calibration anchor.
 */
export function selectBestAnchor(
  anchors: Anchor[],
  question?: string,
  maxMark?: number,
): Anchor | null {
  const chosen = selectBestAnchors(anchors, question, maxMark, 1);
  return chosen[0] ?? null;
}

/**
 * Builds a focused, topic-aware calibration section using at most 1 or 2 relevant
 * Cambridge IGCSE 0455 exemplar essays matching the question's syllabus topic and mark tariff.
 */
export function buildAnchorBlock(
  anchors: Anchor[],
  question?: string,
  maxMark?: number,
): string {
  if (anchors.length === 0) return "";

  const chosenAnchors = selectBestAnchors(anchors, question, maxMark, 2);
  if (chosenAnchors.length === 0) return "";

  const sections: string[] = [
    `REAL CAMBRIDGE IGCSE 0455 CALIBRATION ${chosenAnchors.length === 1 ? "EXAMPLE" : "EXAMPLES"} — provided by Cambridge senior examiners with confirmed marks.\n` +
      "Treat these as ground truth for your scoring scale:",
  ];

  for (const anchor of chosenAnchors) {
    const label = anchor.band_label ? anchor.band_label.toUpperCase() : "EXEMPLAR";
    const trimmedScript =
      anchor.essay_text.length > 2400
        ? `${anchor.essay_text.slice(0, 2400)}... [truncated]`
        : anchor.essay_text;
    sections.push(
      `\n--- ${label} CALIBRATION BENCHMARK ---\n` +
        `Question: ${anchor.question}\n` +
        `Confirmed mark: ${anchor.mark}/${anchor.max_mark}\n` +
        `Senior Examiner Rationale: ${anchor.notes ?? "(Standard Cambridge level benchmark)"}\n` +
        `Exemplar Script:\n${trimmedScript}\n` +
        `--- END EXAMPLE ---`,
    );
  }

  return sections.join("\n");
}
