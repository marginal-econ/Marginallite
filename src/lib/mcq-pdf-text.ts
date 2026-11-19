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

export type QuestionPageSpan = {
  number: number;
  text: string;
  /** Top Y coordinate in PDF points (origin at bottom-left, larger = higher on page) */
  yTop: number;
  /** Bottom Y coordinate in PDF points (origin at bottom-left, smaller = lower on page) */
  yBottom: number;
};

/**
 * Groups a page's text items into lines, finds left-margin tokens that
 * look like a question number, and computes both the rough text block AND
 * the exact PDF vertical bounds (yTop..yBottom in PDF points) for each
 * question on the page so Question-by-Question Mode can crop clean real
 * PDF slices with zero hallucinated text.
 */
export type PdfTextItem = { str?: string; transform?: number[] };

export function extractQuestionSpans(
  items: PdfTextItem[],
  pageHeightPt = 842,
): QuestionPageSpan[] {
  // Check if this page is a cover/instructions sheet — cover pages NEVER contain exam questions.
  const fullPageText = items
    .map((item) => (item.str ?? "").trim())
    .filter(Boolean)
    .join(" ")
    .toUpperCase();

  const isCover =
    fullPageText.includes("READ THESE INSTRUCTIONS FIRST") ||
    fullPageText.includes("INSTRUCTIONS TO CANDIDATES") ||
    fullPageText.includes("MULTIPLE CHOICE ANSWER SHEET") ||
    fullPageText.includes("WRITE IN SOFT PENCIL") ||
    fullPageText.includes("DO NOT USE STAPLES") ||
    (fullPageText.includes("THERE ARE THIRTY QUESTIONS") && !fullPageText.includes(" 1 A "));

  if (isCover) {
    return [];
  }

  const wordsByLine = new Map<number, { x: number; s: string }[]>();
  const numTok: { s: string; x: number; y: number }[] = [];
  let highestFooterY = 0;

  for (const item of items) {
    const s = (item.str ?? "").trim();
    if (!s) continue;
    const x = item.transform?.[4] ?? 0;
    const y = item.transform?.[5] ?? 0;
    const lineKey = Math.round(y);
    const arr = wordsByLine.get(lineKey) ?? [];
    arr.push({ x, s });
    wordsByLine.set(lineKey, arr);
  }

  // Sort tokens on each line from left to right by x position
  for (const line of wordsByLine.values()) {
    line.sort((a, b) => a.x - b.x);
  }

  for (const [lineKey, line] of wordsByLine.entries()) {
    const lineStr = line
      .map((w) => w.s)
      .join(" ")
      .toUpperCase();

    // Skip running headers, footers, syllabus/variant codes, barcodes, copyright
    const isFooterOrHeader =
      lineStr.includes("UCLES") ||
      lineStr.includes("TURN OVER") ||
      lineStr.includes("BLANK PAGE") ||
      lineStr.includes("0455/") ||
      lineStr.includes("CAMBRIDGE") ||
      lineStr.includes("PAGE ");

    if (isFooterOrHeader) {
      if (lineKey < 100 && lineKey > highestFooterY) {
        highestFooterY = lineKey;
      }
      continue;
    }

    // A valid question number anchor MUST be at the left margin start of the line (e.g. "12 Which...")
    // Exclude "0" (graph origin labels) and tokens inside diagrams/tables (x > 95).
    const firstWord = line[0];
    if (firstWord && firstWord.x <= 95) {
      const match =
        /^\d{1,2}$/.exec(firstWord.s) ?? /^(\d{1,2})\s+[A-Z]/.exec(firstWord.s);
      if (match) {
        const rawNum = match[1] ?? match[0];
        const parsed = parseInt(rawNum, 10);
        if (parsed >= 1 && parsed <= 40) {
          numTok.push({ s: String(parsed), x: firstWord.x, y: lineKey });
        }
      }
    }
  }

  const numberColumnX = pickLeftCluster(numTok.map((t) => t.x));
  const COLUMN_TOLERANCE = 12;
  const rawAnchors = numTok
    .filter((t) => numberColumnX !== null && Math.abs(t.x - numberColumnX) <= COLUMN_TOLERANCE)
    .map((t) => ({ num: parseInt(t.s, 10), y: t.y }))
    .sort((a, b) => b.y - a.y);

  const seenNums = new Set<number>();
  const numberAnchors = rawAnchors.filter((na) => {
    if (seenNums.has(na.num)) return false;
    seenNums.add(na.num);
    return true;
  });

  const sortedLines = [...wordsByLine.entries()].sort((a, b) => b[0] - a[0]);
  const safeTopCeiling = Math.max(100, pageHeightPt - 46);
  const safeBottomFloor = Math.min(92, Math.max(52, highestFooterY > 0 ? highestFooterY + 14 : 56));

  return numberAnchors.map((na, idx) => {
    const startIdx = sortedLines.findIndex(([y]) => Math.abs(y - Math.round(na.y)) < 4);
    const nextAnchor = numberAnchors[idx + 1];
    const nextStartIdx = nextAnchor
      ? sortedLines.findIndex(([y]) => Math.abs(y - Math.round(nextAnchor.y)) < 4)
      : -1;
    const endIdx = nextStartIdx > startIdx ? nextStartIdx : sortedLines.length;
    const slice = startIdx >= 0 ? sortedLines.slice(startIdx, endIdx) : [];
    const text = slice
      .map(([, words]) => words.map((w) => w.s).join(" "))
      .filter((lineText) => {
        const upper = lineText.toUpperCase();
        return (
          !upper.includes("UCLES") &&
          !upper.includes("TURN OVER") &&
          !upper.includes("BLANK PAGE") &&
          !upper.includes("0455/")
        );
      })
      .join(" ")
      .slice(0, 1400);

    const yTop = Math.min(safeTopCeiling, na.y + 22);
    const yBottom = nextAnchor
      ? Math.max(safeBottomFloor, nextAnchor.y + 18)
      : safeBottomFloor;

    return {
      number: na.num,
      text,
      yTop,
      yBottom: Math.min(yTop - 36, yBottom),
    };
  });
}

export function extractQuestionStems(items: PdfTextItem[]): StemBlob[] {
  return extractQuestionSpans(items).map(({ number, text }) => ({ number, text }));
}

/**
 * Crops a single question slice out of a rendered PDF page canvas using PDF
 * point coordinates (origin bottom-left), then trims excess blank vertical
 * whitespace while preserving clean padding around text, tables, and graphs.
 */
export function cropQuestionSliceCanvas(options: {
  pageCanvas: HTMLCanvasElement;
  pageHeightPt: number;
  yTop: number;
  yBottom: number;
  scale: number;
  padPx?: number;
}): HTMLCanvasElement {
  const { pageCanvas, pageHeightPt, yTop, yBottom, scale, padPx = 22 } = options;
  const srcTop = Math.max(0, Math.floor((pageHeightPt - yTop) * scale));
  const srcBottom = Math.min(
    pageCanvas.height,
    Math.ceil((pageHeightPt - yBottom) * scale),
  );
  const rawHeight = Math.max(40, srcBottom - srcTop);

  const rawCanvas = document.createElement("canvas");
  rawCanvas.width = pageCanvas.width;
  rawCanvas.height = rawHeight;
  const rawCtx = rawCanvas.getContext("2d");
  if (!rawCtx) return rawCanvas;

  rawCtx.fillStyle = "#ffffff";
  rawCtx.fillRect(0, 0, rawCanvas.width, rawCanvas.height);
  rawCtx.drawImage(
    pageCanvas,
    0,
    srcTop,
    pageCanvas.width,
    rawHeight,
    0,
    0,
    pageCanvas.width,
    rawHeight,
  );

  // Trim excess trailing/leading blank white rows so short questions look crisp
  // while NEVER clipping any vector graph, line, table border, or text ink.
  try {
    const imgData = rawCtx.getImageData(0, 0, rawCanvas.width, rawCanvas.height);
    const { data, width, height } = imgData;
    const isRowInk = (row: number): boolean => {
      const rowStart = row * width * 4;
      // Sample every 2nd pixel across the row for speed
      for (let x = 0; x < width; x += 2) {
        const i = rowStart + x * 4;
        if (data[i] < 245 || data[i + 1] < 245 || data[i + 2] < 245) {
          return true;
        }
      }
      return false;
    };

    let firstInkRow = 0;
    while (firstInkRow < height && !isRowInk(firstInkRow)) {
      firstInkRow += 1;
    }

    let lastInkRow = height - 1;
    while (lastInkRow > firstInkRow && !isRowInk(lastInkRow)) {
      lastInkRow -= 1;
    }

    if (firstInkRow < lastInkRow) {
      const trimTop = Math.max(0, firstInkRow - padPx);
      const trimBottom = Math.min(height, lastInkRow + padPx);
      const trimmedH = Math.max(80, trimBottom - trimTop);

      const trimmed = document.createElement("canvas");
      trimmed.width = rawCanvas.width;
      trimmed.height = trimmedH;
      const tCtx = trimmed.getContext("2d");
      if (tCtx) {
        tCtx.fillStyle = "#ffffff";
        tCtx.fillRect(0, 0, trimmed.width, trimmed.height);
        tCtx.drawImage(
          rawCanvas,
          0,
          trimTop,
          rawCanvas.width,
          trimmedH,
          0,
          0,
          rawCanvas.width,
          trimmedH,
        );
        return trimmed;
      }
    }
  } catch {
    // Fallback to raw untrimmed slice if canvas pixel read is unavailable
  }

  return rawCanvas;
}

/** Finds the leftmost tight cluster in a set of x-positions (tolerant of a few pt jitter). */
function pickLeftCluster(xs: number[]): number | null {
  if (xs.length === 0) return null;
  const sorted = [...xs].sort((a, b) => a - b);
  if (sorted.length === 1) return sorted[0];
  const buckets = new Map<number, number>();
  for (const x of sorted) {
    const key = Math.round(x / 6) * 6;
    buckets.set(key, (buckets.get(key) ?? 0) + 1);
  }
  const supported = [...buckets.entries()]
    .filter(([, count]) => count >= Math.max(1, Math.floor(xs.length * 0.15)))
    .sort((a, b) => a[0] - b[0]);
  return supported.length > 0 ? supported[0][0] : sorted[0];
}
