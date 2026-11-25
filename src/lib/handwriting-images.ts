// Browser-side page-image preparation for handwriting transcription. Photos are
// downscaled and PDF scans are rasterised in the tab, so only compact JPEGs
// travel to the server.

// Cambridge handwriting is small and dense. 2048px on the long edge is
// Gemini's optimal native tile resolution, providing pin-sharp clarity for
// thin pen strokes and pencil while keeping JPEG payloads compact and fast.
const MAX_EDGE = 2048;
const JPEG_QUALITY = 0.88;

export type PageProgress = (done: number, total: number) => void;

export async function filesToPageImages(
  files: File[],
  onProgress?: PageProgress,
): Promise<string[]> {
  const pages: string[] = [];

  for (const file of files) {
    const name = file.name.toLowerCase();
    const isImage =
      file.type.startsWith("image/") ||
      /\.(jpe?g|png|webp|heic|heif|bmp|gif|avif|tiff?)$/i.test(name);

    if (name.endsWith(".pdf") || file.type === "application/pdf") {
      pages.push(...(await pdfToImages(file)));
    } else if (isImage) {
      pages.push(await imageToDataUrl(file));
    } else {
      throw new Error(`${file.name} is not a photo or PDF scan.`);
    }
    onProgress?.(pages.length, pages.length);
  }

  if (pages.length === 0) throw new Error("Add a photo or PDF scan of the handwritten answer.");
  if (pages.length > 12) throw new Error("Up to 12 pages at a time — split longer answers.");
  return pages;
}

function canvasToDataUrl(canvas: HTMLCanvasElement): string {
  return canvas.toDataURL("image/jpeg", JPEG_QUALITY);
}

function fitted(width: number, height: number): { width: number; height: number } {
  const scale = Math.min(1, MAX_EDGE / Math.max(width, height));
  return { width: Math.round(width * scale), height: Math.round(height * scale) };
}

/**
 * Rotate an existing page image data URL by a given number of degrees (default 90° CW).
 * Useful when mobile phone cameras capture handwriting sideways or upside-down.
 */
export async function rotateImageDataUrl(dataUrl: string, degrees = 90): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const rads = (degrees * Math.PI) / 180;
      const swap = Math.abs(degrees % 180) === 90;
      const canvas = document.createElement("canvas");
      canvas.width = swap ? img.height : img.width;
      canvas.height = swap ? img.width : img.height;

      const context = canvas.getContext("2d");
      if (!context) return resolve(dataUrl);

      // Solid white background prevents transparent pixels turning black in JPEG
      context.fillStyle = "#ffffff";
      context.fillRect(0, 0, canvas.width, canvas.height);
      context.imageSmoothingEnabled = true;
      context.imageSmoothingQuality = "high";

      context.translate(canvas.width / 2, canvas.height / 2);
      context.rotate(rads);
      context.drawImage(img, -img.width / 2, -img.height / 2);

      resolve(canvasToDataUrl(canvas));
    };
    img.onerror = () => reject(new Error("Could not process image rotation."));
    img.src = dataUrl;
  });
}

async function normalizeImageFile(file: File): Promise<File | Blob> {
  const isHeic =
    /\.(heic|heif)$/i.test(file.name) ||
    file.type === "image/heic" ||
    file.type === "image/heif";

  if (!isHeic) return file;

  // 1. Check if the browser natively decodes HEIC (e.g. Safari on macOS/iOS)
  if (typeof createImageBitmap === "function") {
    try {
      const test = await createImageBitmap(file);
      test.close();
      return file;
    } catch {
      // Native decoding failed (Chromium, Firefox, Edge on Windows/Android/Linux)
    }
  }

  // 2. Decode client-side via heic2any WebAssembly decoder
  try {
    const heic2any = (await import("heic2any")).default;
    const converted = await heic2any({
      blob: file,
      toType: "image/jpeg",
      quality: 0.9,
    });
    const blob = Array.isArray(converted) ? converted[0] : converted;
    return new File([blob], file.name.replace(/\.(heic|heif)$/i, ".jpg"), {
      type: "image/jpeg",
    });
  } catch (error) {
    console.warn("Client-side HEIC conversion failed, falling back to original file:", error);
    return file;
  }
}

async function imageToDataUrl(rawFile: File): Promise<string> {
  const file = await normalizeImageFile(rawFile);
  try {
    let bitmap: ImageBitmap;
    try {
      // imageOrientation: "from-image" respects EXIF orientation metadata from mobile phone cameras
      bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
    } catch {
      bitmap = await createImageBitmap(file);
    }

    const size = fitted(bitmap.width, bitmap.height);
    const canvas = document.createElement("canvas");
    canvas.width = size.width;
    canvas.height = size.height;
    const context = canvas.getContext("2d");
    if (!context) throw new Error("This browser could not process the image.");

    // Fill with solid white before drawing so PNG/transparent pixels or margins don't turn black
    context.fillStyle = "#ffffff";
    context.fillRect(0, 0, size.width, size.height);
    context.imageSmoothingEnabled = true;
    context.imageSmoothingQuality = "high";
    context.drawImage(bitmap, 0, 0, size.width, size.height);
    bitmap.close();
    return canvasToDataUrl(canvas);
  } catch {
    // Mobile fallback for WebViews or formats where createImageBitmap fails
    return new Promise((resolve, reject) => {
      const img = new Image();
      const url = URL.createObjectURL(file);
      img.onload = () => {
        URL.revokeObjectURL(url);
        const w = img.naturalWidth || img.width;
        const h = img.naturalHeight || img.height;
        const size = fitted(w, h);
        const canvas = document.createElement("canvas");
        canvas.width = size.width;
        canvas.height = size.height;
        const context = canvas.getContext("2d");
        if (!context) return reject(new Error("This browser could not process the image."));

        context.fillStyle = "#ffffff";
        context.fillRect(0, 0, size.width, size.height);
        context.imageSmoothingEnabled = true;
        context.imageSmoothingQuality = "high";
        context.drawImage(img, 0, 0, size.width, size.height);
        resolve(canvasToDataUrl(canvas));
      };
      img.onerror = () => {
        URL.revokeObjectURL(url);
        reject(new Error(`Could not load ${rawFile.name || "photo"}. Please ensure it is a valid photo.`));
      };
      img.src = url;
    });
  }
}

async function pdfToImages(file: File): Promise<string[]> {
  const pdfjs = await import("pdfjs-dist");
  const workerUrl = (await import("pdfjs-dist/build/pdf.worker.min.mjs?url")).default;
  pdfjs.GlobalWorkerOptions.workerSrc = workerUrl;

  const pdf = await pdfjs.getDocument({ data: await file.arrayBuffer() }).promise;
  const images: string[] = [];

  for (let pageNumber = 1; pageNumber <= Math.min(pdf.numPages, 12); pageNumber++) {
    const page = await pdf.getPage(pageNumber);
    const base = page.getViewport({ scale: 1 });
    // Render at a resolution that keeps thin pen strokes legible to the model.
    const scale = Math.min(3.5, MAX_EDGE / Math.max(base.width, base.height));
    const viewport = page.getViewport({ scale });
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(viewport.width);
    canvas.height = Math.round(viewport.height);
    const context = canvas.getContext("2d");
    if (!context) throw new Error("This browser could not render the PDF scan.");
    context.fillStyle = "#ffffff";
    context.fillRect(0, 0, canvas.width, canvas.height);
    await page.render({ canvas, canvasContext: context, viewport }).promise;
    images.push(canvasToDataUrl(canvas));
  }

  return images;
}
