export type Letter = "A" | "B" | "C" | "D";

/** Reads a Cambridge-style "Question / Answer / Marks" table straight out of extracted PDF text. */
export function parseAnswerKeyFromText(text: string): Record<number, Letter> {
  const re = /(\d{1,3})\s+([ABCD])\s+\d+/g;
  let m: RegExpExecArray | null;
  let expected = 1;
  const out: Record<number, Letter> = {};
  while ((m = re.exec(text)) !== null) {
    const n = parseInt(m[1], 10);
    if (n === expected) {
      out[n] = m[2] as Letter;
      expected++;
    }
  }
  return out;
}

async function loadPdfjs() {
  const pdfjs = await import("pdfjs-dist");
  const workerUrl = (await import("pdfjs-dist/build/pdf.worker.min.mjs?url")).default;
  pdfjs.GlobalWorkerOptions.workerSrc = workerUrl;
  return pdfjs;
}

/** Extracts every text run from a PDF File/Blob, concatenated — used to feed parseAnswerKeyFromText. */
export async function extractPdfText(file: File | Blob): Promise<string> {
  const pdfjs = await loadPdfjs();
  const buf = await file.arrayBuffer();
  const doc = await pdfjs.getDocument({ data: buf }).promise;
  let text = "";
  for (let p = 1; p <= doc.numPages; p++) {
    const page = await doc.getPage(p);
    const content = await page.getTextContent();
    text +=
      " " +
      content.items
        .map((item) => ("str" in item && typeof item.str === "string" ? item.str : ""))
        .join(" ");
  }
  return text;
}
