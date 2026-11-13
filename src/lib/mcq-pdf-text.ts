/**
 * MCQ Live — plain PDF helpers.
 *
 * Answer buttons are a fixed side panel (one row per question, A/B/C/D),
 * not anything placed on top of the page — so all this file does is (a)
 * load pdf.js and (b) pull a rough block of text per question number
 * straight from the PDF's text layer, purely so topic classification and
 * on-demand answer explanations have something to read. No coordinates,
 * no badges, no pills, nothing manually draggable.
 */

export async function loadPdfjs() {
  const pdfjs = await import("pdfjs-dist");
  const workerUrl = (await import("pdfjs-dist/build/pdf.worker.min.mjs?url")).default;
  pdfjs.GlobalWorkerOptions.workerSrc = workerUrl;
  return pdfjs;
}

export type StemBlob = { number: number; text: string };

/**
 * Groups a page's text items into lines, finds left-margin tokens that
 * look like a question number, and grabs the next few lines after each
 * one as that question's rough stem/option text. Good enough for topic
 * tagging and explanations — not meant to be pixel-exact.
 */
export type PdfTextItem = { str?: string; transform?: number[] };

export function extractQuestionStems(items: PdfTextItem[]): StemBlob[] {
  const wordsByLine = new Map<number, { x: number; s: string }[]>();
  const numTok: { s: string; x: number; y: number }[] = [];

  for (const item of items) {
    const s = (item.str ?? "").trim();
    if (!s) continue;
    const x = item.transform?.[4] ?? 0;
    const y = item.transform?.[5] ?? 0;
    const lineKey = Math.round(y);
    const arr = wordsByLine.get(lineKey) ?? [];
    arr.push({ x, s });
    wordsByLine.set(lineKey, arr);
    if (/^\d{1,2}$/.test(s)) numTok.push({ s, x, y });
  }

  const numberColumnX = pickLeftCluster(numTok.map((t) => t.x));
  const COLUMN_TOLERANCE = 6;
  const numberAnchors = numTok
    .filter((t) => numberColumnX !== null && Math.abs(t.x - numberColumnX) < COLUMN_TOLERANCE)
    .map((t) => ({ num: parseInt(t.s, 10), y: t.y }))
    .sort((a, b) => b.y - a.y);

  const sortedLines = [...wordsByLine.entries()].sort((a, b) => b[0] - a[0]);

  return numberAnchors.map((na) => {
    const startIdx = sortedLines.findIndex(([y]) => Math.abs(y - Math.round(na.y)) < 3);
    const slice = startIdx >= 0 ? sortedLines.slice(startIdx, startIdx + 6) : [];
    const text = slice
      .map(([, words]) => words.map((w) => w.s).join(" "))
      .join(" ")
      .slice(0, 700);
    return { number: na.num, text };
  });
}

/** Finds the leftmost tight cluster in a set of x-positions (tolerant of a few pt jitter). */
function pickLeftCluster(xs: number[]): number | null {
  if (xs.length === 0) return null;
  const sorted = [...xs].sort((a, b) => a - b);
  const buckets = new Map<number, number>();
  for (const x of sorted) {
    const key = Math.round(x / 6) * 6;
    buckets.set(key, (buckets.get(key) ?? 0) + 1);
  }
  const supported = [...buckets.entries()]
    .filter(([, count]) => count >= Math.max(2, xs.length * 0.15))
    .sort((a, b) => a[0] - b[0]);
  return supported.length > 0 ? supported[0][0] : sorted[0];
}
