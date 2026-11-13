// Browser-side text extraction. PDFs are parsed in the tab rather than on the
// server: the worker runtime has no PDF stack, and this keeps large uploads off
// the request path entirely — only the extracted text is sent up.

export type ExtractProgress = (page: number, total: number) => void;

export async function extractTextFromFile(
  file: File,
  onProgress?: ExtractProgress,
): Promise<string> {
  const name = file.name.toLowerCase();

  if (name.endsWith(".pdf") || file.type === "application/pdf") {
    return extractPdf(file, onProgress);
  }

  if (name.endsWith(".txt") || name.endsWith(".md") || file.type.startsWith("text/")) {
    return file.text();
  }

  throw new Error(
    "Unsupported file type. Upload a PDF, or paste the text directly if it is a Word document.",
  );
}

async function extractPdf(file: File, onProgress?: ExtractProgress): Promise<string> {
  const pdfjs = await import("pdfjs-dist");
  // Bundled worker URL — avoids relying on a CDN at runtime.
  const workerUrl = (await import("pdfjs-dist/build/pdf.worker.min.mjs?url")).default;
  pdfjs.GlobalWorkerOptions.workerSrc = workerUrl;

  const buffer = await file.arrayBuffer();
  const loadingTask = pdfjs.getDocument({
    data: new Uint8Array(buffer),
    disableFontFace: true, // drastically reduces memory and CPU overhead for pure text extraction
    useSystemFonts: true,
  });
  const pdf = await loadingTask.promise;

  try {
    const pages: string[] = [];
    for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber++) {
      const page = await pdf.getPage(pageNumber);
      try {
        const content = await page.getTextContent();

        // Rebuild line structure from item positions: PDF text items arrive as
        // fragments, and naive joining destroys the headings retrieval relies on.
        let lastY: number | null = null;
        let line = "";
        const lines: string[] = [];

        for (const item of content.items) {
          if (!("str" in item)) continue;
          const y = Math.round((item.transform?.[5] ?? 0) * 10) / 10;
          if (lastY !== null && Math.abs(y - lastY) > 2) {
            if (line.trim()) lines.push(line.trim());
            line = "";
          }
          line += item.str;
          if (item.hasEOL) {
            if (line.trim()) lines.push(line.trim());
            line = "";
          }
          lastY = y;
        }
        if (line.trim()) lines.push(line.trim());

        pages.push(lines.join("\n"));
      } finally {
        // Critical for large textbooks (100-800 pages): releases page cache in pdf.js
        page.cleanup();
      }

      onProgress?.(pageNumber, pdf.numPages);

      // Periodically yield to browser event loop every 25 pages on large books to keep UI smooth
      if (pageNumber % 25 === 0 && pageNumber < pdf.numPages) {
        await new Promise((resolve) => setTimeout(resolve, 0));
      }
    }

    return pages
      .join("\n\n")
      .replace(/-\n(?=[a-z])/g, "") // rejoin words hyphenated across line breaks
      .replace(/\n{3,}/g, "\n\n")
      .trim();
  } finally {
    // Release the entire PDF document and worker transport
    await loadingTask.destroy().catch(() => {});
  }
}
