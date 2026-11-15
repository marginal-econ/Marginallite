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

/**
 * Loads calibration anchors for few-shot prompt injection.
 * Tries the database `calibration_anchors` table first; if the table is empty or
 * not yet migrated, smoothly falls back to the official Cambridge IGCSE 0455 Gold
 * Calibration Set across all 6 Units.
 */
export async function fetchCalibrationAnchors(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: SupabaseClient<any>,
): Promise<Anchor[]> {
  try {
    const { data, error } = await supabase
      .from("calibration_anchors")
      .select("question, essay_text, mark, max_mark, band_label, notes")
      .eq("active", true)
      .order("created_at", { ascending: true });

    if (!error && data && data.length > 0) {
      return data as Anchor[];
    }
  } catch (err) {
    console.warn("calibration_anchors query failed, falling back to Gold Calibration Set:", err);
  }

  // Fallback to comprehensive 0455 Gold Calibration Set covering all 6 units & tariffs (2m, 4m, 6m, 8m)
  return IGCSE_0455_GOLD_CALIBRATION_SET.map((item) => ({
    question: `[${item.topic} | ${item.paper} Q${item.questionNumber}] ${item.question}`,
    essay_text: item.candidateAnswer,
    mark: item.expectedMark,
    max_mark: item.maxMark,
    band_label: item.band,
    notes: `Tariff: ${item.maxMark}m | Standard: ${item.markingGuide} | Examiner Rationale: ${item.reason}`,
  }));
}

/**
 * Build a few-shot calibration section from human-provided anchor essays,
 * grouped by band and capped so the prompt does not grow unbounded.
 * Returns "" for an empty list (nothing to inject) rather than a
 * near-empty header — callers check for that before appending.
 */
export function buildAnchorBlock(anchors: Anchor[]): string {
  if (anchors.length === 0) return "";

  const byBand = new Map<string, Anchor[]>();
  for (const anchor of anchors) {
    const band = anchor.band_label || "top";
    byBand.set(band, [...(byBand.get(band) ?? []), anchor]);
  }

  const sections: string[] = [
    "REAL CALIBRATION EXAMPLES — provided by a human expert, with a mark they " +
      "have confirmed is correct. Treat these as ground truth for your scoring " +
      "scale: if a new essay is of similar quality to one of these, it should " +
      "receive a similar mark, even at the top or bottom of the range.",
  ];

  for (const [band, bandAnchors] of byBand) {
    const label =
      band === "top" ? "TOP-BAND" : band === "bottom" ? "BOTTOM-BAND" : band.toUpperCase();
    for (const anchor of bandAnchors.slice(0, MAX_ANCHORS_PER_BAND)) {
      sections.push(
        `\n--- ${label} EXAMPLE ---\n` +
          `Question: ${anchor.question}\n` +
          `Confirmed mark: ${anchor.mark}/${anchor.max_mark}\n` +
          `Why it deserves this mark: ${anchor.notes ?? "(no additional notes provided)"}\n` +
          `Essay:\n${anchor.essay_text}\n` +
          `--- END EXAMPLE ---`,
      );
    }
  }

  return sections.join("\n");
}
