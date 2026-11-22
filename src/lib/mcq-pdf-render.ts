import {
  cropQuestionSliceCanvas,
  extractQuestionSpans,
  loadPdfjs,
  type PdfTextItem,
  type QuestionPageSpan,
  type StemBlob,
} from "@/lib/mcq-pdf-text";
import { getTopicalPaperById, renderTopicalPaperPages } from "@/lib/topical-mcq-papers";

export type RenderedQuizPaper = {
  pages: { pageNumber: number; canvas: HTMLCanvasElement }[];
  questionPages: Record<number, number>;
  questionSlices: Record<number, HTMLCanvasElement>;
  stems: StemBlob[];
};

function base64ToArrayBuffer(b64: string): ArrayBuffer {
  const binary = atob(b64);
  const len = binary.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes.buffer;
}

function fillMissingQuestionPages(
  rawMap: Record<number, number>,
  totalQuestions: number,
  numPages: number,
): Record<number, number> {
  const result: Record<number, number> = { ...rawMap };
  let runningMax = 1;
  for (let q = 1; q <= totalQuestions; q++) {
    if (result[q] !== undefined) {
      if (result[q] < runningMax) {
        delete result[q];
      } else {
        runningMax = result[q];
      }
    }
  }

  for (let q = 1; q <= totalQuestions; q++) {
    if (result[q]) continue;
    let prevQ = -1;
    for (let k = q - 1; k >= 1; k--) {
      if (result[k]) {
        prevQ = k;
        break;
      }
    }
    let nextQ = -1;
    for (let k = q + 1; k <= totalQuestions; k++) {
      if (result[k]) {
        nextQ = k;
        break;
      }
    }

    if (prevQ !== -1 && nextQ !== -1) {
      const fraction = (q - prevQ) / (nextQ - prevQ);
      const estPage = Math.round(result[prevQ] + fraction * (result[nextQ] - result[prevQ]));
      result[q] = Math.max(result[prevQ], Math.min(result[nextQ], estPage));
    } else if (prevQ !== -1) {
      const estPage = Math.min(numPages, result[prevQ] + Math.floor((q - prevQ) / 2));
      result[q] = Math.max(result[prevQ], estPage);
    } else if (nextQ !== -1) {
      const estPage = Math.max(1, result[nextQ] - Math.ceil((nextQ - q) / 2));
      result[q] = Math.min(result[nextQ], estPage);
    } else {
      result[q] = Math.min(numPages, Math.max(1, Math.ceil(q / 2) + 1));
    }
  }

  for (let q = 2; q <= totalQuestions; q++) {
    if (result[q] < result[q - 1]) {
      result[q] = result[q - 1];
    }
  }

  return result;
}

/**
 * Renders an official Cambridge PDF or Topical Past Paper into single-question
 * canvas crops for crisp Live Quiz gameplay.
 */
export async function renderQuizPdfPaper(options: {
  sourceType: "library_paper" | "topical_paper";
  paperId: string | null;
  qpUrl?: string | null;
  maxQuestionNumber: number;
  proxyFetchBase64: (url: string) => Promise<string>;
  onProgress?: (label: string) => void;
}): Promise<RenderedQuizPaper> {
  const RENDER_SCALE = 1.6;

  const downloadPdfBuffer = async (targetUrl: string): Promise<ArrayBuffer> => {
    try {
      const res = await fetch(targetUrl);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return await res.arrayBuffer();
    } catch {
      const b64 = await options.proxyFetchBase64(targetUrl);
      return base64ToArrayBuffer(b64);
    }
  };

  if (options.sourceType === "topical_paper" && options.paperId) {
    const topical = getTopicalPaperById(options.paperId);
    if (!topical) throw new Error("Topical paper definition not found.");
    const built = await renderTopicalPaperPages({
      topicalPaper: topical,
      scale: RENDER_SCALE,
      fetchPdfBuffer: downloadPdfBuffer,
      onProgress: options.onProgress,
    });
    return {
      pages: built.pages,
      questionPages: built.questionPages,
      questionSlices: built.questionSlices,
      stems: built.stems,
    };
  }

  if (!options.qpUrl) {
    throw new Error("Question paper PDF URL is missing.");
  }

  options.onProgress?.("Downloading official Cambridge paper…");
  const pdfjs = await loadPdfjs();
  const buf = await downloadPdfBuffer(options.qpUrl);
  const doc = await pdfjs.getDocument({ data: new Uint8Array(buf) }).promise;

  const pages: { pageNumber: number; canvas: HTMLCanvasElement }[] = [];
  const stems: StemBlob[] = [];
  const candidatePageMap: Record<number, number[]> = {};
  const pageMetaByNum = new Map<
    number,
    { canvas: HTMLCanvasElement; heightPt: number; spans: QuestionPageSpan[] }
  >();

  for (let p = 1; p <= doc.numPages; p++) {
    options.onProgress?.(`Rendering exam page ${p} of ${doc.numPages}…`);
    const page = await doc.getPage(p);
    const unscaledViewport = page.getViewport({ scale: 1 });
    const viewport = page.getViewport({ scale: RENDER_SCALE });

    const canvas = document.createElement("canvas");
    canvas.width = viewport.width;
    canvas.height = viewport.height;
    const ctx = canvas.getContext("2d");
    if (!ctx) continue;
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    await (page.render({ canvasContext: ctx, viewport } as any) as any).promise;
    pages.push({ pageNumber: p, canvas });

    let pageSpans: QuestionPageSpan[] = [];
    try {
      const content = await page.getTextContent();
      pageSpans = extractQuestionSpans(content.items as PdfTextItem[], unscaledViewport.height);
      stems.push(...pageSpans.map(({ number, text }) => ({ number, text })));
      for (const s of pageSpans) {
        if (s.number >= 1 && s.number <= options.maxQuestionNumber) {
          if (!candidatePageMap[s.number]) candidatePageMap[s.number] = [];
          candidatePageMap[s.number].push(p);
        }
      }
    } catch {
      // text layer optional
    }

    pageMetaByNum.set(p, {
      canvas,
      heightPt: unscaledViewport.height,
      spans: pageSpans,
    });
  }

  const rawPageMap: Record<number, number> = {};
  let lastPage = 1;
  for (let q = 1; q <= options.maxQuestionNumber; q++) {
    const sightings = candidatePageMap[q];
    if (!sightings || sightings.length === 0) continue;
    const validSightings = sightings.filter((p) => doc.numPages <= 1 || q === 1 || p > 1);
    if (validSightings.length === 0) continue;
    const monotonicMatch = validSightings.find((p) => p >= lastPage);
    if (monotonicMatch !== undefined) {
      rawPageMap[q] = monotonicMatch;
      lastPage = monotonicMatch;
    } else {
      const highest = validSightings[validSightings.length - 1];
      if (highest >= lastPage) {
        rawPageMap[q] = highest;
        lastPage = highest;
      }
    }
  }

  const questionSlices: Record<number, HTMLCanvasElement> = {};
  for (let q = 1; q <= options.maxQuestionNumber; q++) {
    const resolvedPage = rawPageMap[q];
    if (!resolvedPage) continue;
    const pageMeta = pageMetaByNum.get(resolvedPage);
    const span = pageMeta?.spans.find((s) => s.number === q);
    if (pageMeta && span) {
      questionSlices[q] = cropQuestionSliceCanvas({
        pageCanvas: pageMeta.canvas,
        pageHeightPt: pageMeta.heightPt,
        yTop: span.yTop,
        yBottom: span.yBottom,
        scale: RENDER_SCALE,
      });
    }
  }

  const questionPages = fillMissingQuestionPages(rawPageMap, options.maxQuestionNumber, doc.numPages);
  const bestStemByNum = new Map<number, string>();
  for (const s of stems) {
    if (s.number >= 1 && s.number <= options.maxQuestionNumber) {
      const prev = bestStemByNum.get(s.number) ?? "";
      if (s.text.length >= prev.length) bestStemByNum.set(s.number, s.text);
    }
  }
  const dedupedStems: StemBlob[] = [...bestStemByNum.entries()]
    .sort((a, b) => a[0] - b[0])
    .map(([number, text]) => ({ number, text }));

  return {
    pages,
    questionPages,
    questionSlices,
    stems: dedupedStems,
  };
}
