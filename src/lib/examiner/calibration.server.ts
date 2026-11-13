import type { SupabaseClient } from "@supabase/supabase-js";

import { MAX_ANCHORS_PER_BAND } from "./config";

export type Anchor = {
  question: string;
  essay_text: string;
  mark: number;
  max_mark: number;
  band_label: string;
  notes: string | null;
};

/**
 * Loads every active calibration anchor. Unlike the retrieval call this
 * shares a table with, an anchor query failing IS a real problem — the
 * mark scale has nothing else grounding it — so this throws on a genuine
 * DB error instead of quietly returning an empty list.  Zero *rows*
 * (nobody has added an anchor yet) is a normal, non-error state and
 * returns `[]` — see fetchCalibrationAnchors's callers for how that's
 * surfaced instead of hidden.
 */
export async function fetchCalibrationAnchors(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: SupabaseClient<any>,
): Promise<Anchor[]> {
  const { data, error } = await supabase
    .from("calibration_anchors")
    .select("question, essay_text, mark, max_mark, band_label, notes")
    .eq("active", true)
    .order("created_at", { ascending: true });

  if (error) throw new Error(`Calibration anchors could not be loaded: ${error.message}`);
  return (data ?? []) as Anchor[];
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
