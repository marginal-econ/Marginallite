import { useMutation } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import {
  AlertCircle,
  Camera,
  ChevronLeft,
  ChevronRight,
  FileType,
  Images,
  Loader2,
  PenLine,
  RotateCw,
  Sparkles,
  Trash2,
  X,
} from "lucide-react";
import { useRef, useState } from "react";
import { toast } from "sonner";

import { CompactProgressBar, type ProgressStage } from "@/components/app/grading-progress";
import { Button } from "@/components/ui/button";
import { filesToPageImages, rotateImageDataUrl } from "@/lib/handwriting-images";
import { transcribeHandwriting } from "@/lib/ocr.functions";
import { ocrPdf } from "@/lib/pdf-ocr";

type OutstandingPage = { page: number; image: string; error: string | null };

export type StagedHandwritingPage = {
  id: string;
  dataUrl: string;
  name: string;
};

/**
 * Two separate, explicit upload slots rather than one input that guesses
 * from the file type — a PDF is ambiguous (a typed export vs. a scanned
 * photo of handwriting look identical to a file picker), so the user says
 * which one it is instead of the app trying to detect it:
 *
 *  - "Typed answer": PDF or .txt/.md. Routed through the OCR pipeline
 *    (extract-text.ts / pdf-ocr.ts) — a real text layer (e.g. a PDF
 *    exported from Google Docs) is read directly, and a PDF with no text
 *    layer is OCR'd with Tesseract. This never calls Gemini.
 *
 *  - "Handwritten answer": photos, OR a PDF that is itself a scan of
 *    handwriting. Every page — however it arrived — is rasterised and sent
 *    through Gemini vision (ocr/gemini.server.ts), which is what's actually
 *    needed to read handwriting reliably; Tesseract cannot.
 *
 * Students can stage multiple pages, review thumbnails, see and adjust page
 * numbering (Page 1, Page 2, Page 3), move earlier/later, rotate orientation,
 * and transcribe.
 */
export function HandwritingUpload({
  hint,
  onText,
}: {
  hint?: string;
  onText: (text: string) => void;
}) {
  const typedInput = useRef<HTMLInputElement>(null);
  const galleryInput = useRef<HTMLInputElement>(null);
  const cameraInput = useRef<HTMLInputElement>(null);
  const transcribe = useServerFn(transcribeHandwriting);

  const [typedStage, setTypedStage] = useState<string | null>(null);
  const [handwrittenStage, setHandwrittenStage] = useState<string | null>(null);
  const [stagedPages, setStagedPages] = useState<StagedHandwritingPage[]>([]);
  const [rotatingId, setRotatingId] = useState<string | null>(null);
  const [isProcessingUpload, setIsProcessingUpload] = useState(false);
  const [totalPages, setTotalPages] = useState(0);
  const [readPages, setReadPages] = useState(0);
  const [outstanding, setOutstanding] = useState<OutstandingPage[]>([]);

  async function handleRotatePage(id: string) {
    const page = stagedPages.find((p) => p.id === id);
    if (!page) return;
    setRotatingId(id);
    try {
      const rotated = await rotateImageDataUrl(page.dataUrl, 90);
      setStagedPages((current) =>
        current.map((p) => (p.id === id ? { ...p, dataUrl: rotated } : p)),
      );
      toast.success("Page rotated 90° clockwise.");
    } catch {
      toast.error("Could not rotate page image.");
    } finally {
      setRotatingId(null);
    }
  }

  const typedMutation = useMutation({
    mutationFn: async (files: File[]) => {
      let text = "";
      let pages = 0;
      let failedPages = 0;

      for (let index = 0; index < files.length; index++) {
        const file = files[index]!;
        if (file.type === "text/plain" || file.name.toLowerCase().match(/\.(txt|md)$/)) {
          setTypedStage(
            files.length > 1 ? `Reading file ${index + 1} of ${files.length}…` : "Reading file…",
          );
          text += (text ? "\n\n" : "") + (await file.text());
          pages += 1;
          continue;
        }
        const outcome = await ocrPdf(file, (label) =>
          setTypedStage(
            files.length > 1 ? `${label} (file ${index + 1} of ${files.length})` : label,
          ),
        );
        text += (text ? "\n\n" : "") + outcome.text;
        pages += outcome.pages;
        failedPages += outcome.failedPages.length;
      }

      return { text, pages, failedPages };
    },
    onSuccess: ({ text, pages, failedPages }) => {
      onText(text);
      if (failedPages > 0) {
        toast.warning(
          `${failedPages} page${failedPages === 1 ? "" : "s"} couldn't be OCR'd — check the text before grading.`,
        );
      } else {
        toast.success(`Read ${pages} page${pages === 1 ? "" : "s"}.`);
      }
    },
    onError: (error: Error) => toast.error(error.message),
    onSettled: () => setTypedStage(null),
  });

  async function handleFilesSelected(files: File[]) {
    if (!files || files.length === 0) return;
    setIsProcessingUpload(true);
    setHandwrittenStage("Processing document pages…");
    try {
      const pageImages = await filesToPageImages(files);
      const newItems: StagedHandwritingPage[] = pageImages.map((dataUrl, idx) => ({
        id: crypto.randomUUID(),
        dataUrl,
        name: files[idx]?.name || `Page ${stagedPages.length + idx + 1}`,
      }));
      setStagedPages((current) => [...current, ...newItems].slice(0, 12));
      toast.success(
        `Added ${newItems.length} page${newItems.length === 1 ? "" : "s"}. Review or reorder page numbering below before transcribing.`,
      );
    } catch (err: any) {
      toast.error(err?.message || "Could not read image files.");
    } finally {
      setIsProcessingUpload(false);
      setHandwrittenStage(null);
    }
  }

  function movePage(index: number, direction: "prev" | "next") {
    setStagedPages((current) => {
      const target = direction === "prev" ? index - 1 : index + 1;
      if (target < 0 || target >= current.length) return current;
      const next = [...current];
      const item = next[index]!;
      next[index] = next[target]!;
      next[target] = item;
      return next;
    });
  }

  function removePage(id: string) {
    setStagedPages((current) => current.filter((p) => p.id !== id));
  }

  function clearAllStaged() {
    setStagedPages([]);
  }

  function handleTranscribeStaged() {
    if (stagedPages.length === 0) return;
    handwrittenMutation.mutate(stagedPages.map((p) => p.dataUrl));
  }

  const handwrittenMutation = useMutation({
    mutationFn: async (images: string[]) => {
      setHandwrittenStage(
        `Reading ${images.length} page${images.length === 1 ? "" : "s"} of handwriting…`,
      );
      const result = await transcribe({ data: { images, hint: hint?.trim() || undefined } });
      return { images, result };
    },
    onSuccess: ({ images, result }) => {
      onText(result.text);
      setTotalPages(result.pages);
      setReadPages(result.pages - result.failedPages.length);

      const failed: OutstandingPage[] = result.failedPages.map((page) => ({
        page,
        image: images[page - 1]!,
        error: result.pageErrors?.[page] ?? null,
      }));
      setOutstanding(failed);

      if (failed.length === 0) {
        toast.success(
          `All ${result.pages} page${result.pages === 1 ? "" : "s"} of handwriting read successfully.`,
        );
        setStagedPages([]);
      } else {
        toast.error(
          `${failed.length} of ${result.pages} page${result.pages === 1 ? "" : "s"} couldn't be read — retry them below.`,
        );
      }
    },
    onError: (error: Error) => toast.error(error.message),
    onSettled: () => setHandwrittenStage(null),
  });

  const retryMutation = useMutation({
    mutationFn: async (pages: OutstandingPage[]) => {
      setHandwrittenStage(`Retrying ${pages.length} page${pages.length === 1 ? "" : "s"}…`);
      const result = await transcribe({
        data: { images: pages.map((page) => page.image), hint: hint?.trim() || undefined },
      });
      return { pages, result };
    },
    onSuccess: ({ pages, result }) => {
      const recovered: string[] = [];
      const stillFailed: OutstandingPage[] = [];

      pages.forEach((original, index) => {
        const text = result.pageTexts[index];
        if (text) {
          recovered.push(`[Page ${original.page}]\n${text.trim()}`);
        } else {
          stillFailed.push({
            page: original.page,
            image: original.image,
            error: result.pageErrors?.[index + 1] ?? original.error,
          });
        }
      });

      if (recovered.length > 0) {
        onText(recovered.join("\n\n"));
        setReadPages((current) => current + recovered.length);
        toast.success(
          `Recovered ${recovered.length} page${recovered.length === 1 ? "" : "s"} — added to the end of your answer. Move the text into place if needed.`,
        );
      }
      setOutstanding(stillFailed);
      if (stillFailed.length > 0) {
        toast.error(
          `${stillFailed.length} page${stillFailed.length === 1 ? "" : "s"} still couldn't be read.`,
        );
      }
    },
    onError: (error: Error) => toast.error(error.message),
    onSettled: () => setHandwrittenStage(null),
  });

  return (
    <div className="space-y-3">
      {/* Primary Upload Options */}
      <div className="grid gap-2 sm:grid-cols-2">
        <div className="space-y-1.5 rounded-lg border border-dashed border-border p-3 bg-muted/10">
          <div className="flex items-center gap-1.5 text-xs font-semibold">
            <FileType className="size-3.5 text-primary" />
            Typed answer
          </div>
          <p className="text-[11px] text-muted-foreground">
            PDF or text file — read directly / OCR'd.
          </p>
          <Button
            type="button"
            size="sm"
            variant="outline"
            className="w-full text-xs"
            disabled={typedMutation.isPending}
            onClick={() => typedInput.current?.click()}
          >
            {typedMutation.isPending ? (
              <Loader2 className="size-3.5 animate-spin mr-1.5" />
            ) : (
              <FileType className="size-3.5 mr-1.5" />
            )}
            Upload PDF / text
          </Button>
          {typedStage ? <p className="text-[11px] text-muted-foreground">{typedStage}</p> : null}
          <CompactProgressBar
            active={typedMutation.isPending}
            stages={[
              { label: "Inspecting uploaded file text layer", weight: 2 },
              { label: "Extracting clean essay paragraphs", weight: 4 },
            ] satisfies ProgressStage[]}
            totalMs={14_000}
            title={typedStage || "Extracting uploaded answer…"}
          />
          <input
            ref={typedInput}
            type="file"
            accept=".pdf,.txt,.md,application/pdf,text/plain"
            multiple
            className="hidden"
            onChange={(event) => {
              const files = Array.from(event.target.files ?? []);
              event.target.value = "";
              if (files.length > 0) typedMutation.mutate(files);
            }}
          />
        </div>

        <div className="space-y-1.5 rounded-lg border border-dashed border-border p-3 bg-muted/10">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5 text-xs font-semibold">
              <PenLine className="size-3.5 text-primary" />
              Handwritten answer
            </div>
            <span className="text-[10px] text-muted-foreground font-medium">Multi-Page Photos</span>
          </div>
          <p className="text-[11px] text-muted-foreground">
            Upload multiple photos from your gallery or snap camera pages (up to 12 pages).
          </p>
          <div className="grid grid-cols-2 gap-1.5 pt-0.5">
            <Button
              type="button"
              size="sm"
              variant="outline"
              className="w-full text-xs font-medium"
              disabled={isProcessingUpload || handwrittenMutation.isPending}
              onClick={() => galleryInput.current?.click()}
            >
              {isProcessingUpload ? (
                <Loader2 className="size-3.5 animate-spin mr-1.5" />
              ) : (
                <Images className="size-3.5 mr-1.5 text-primary" />
              )}
              Gallery / Photos
            </Button>
            <Button
              type="button"
              size="sm"
              variant="outline"
              className="w-full text-xs font-medium"
              disabled={isProcessingUpload || handwrittenMutation.isPending}
              onClick={() => cameraInput.current?.click()}
            >
              <Camera className="size-3.5 mr-1.5 text-emerald-500" />
              Take Photo
            </Button>
          </div>
          {handwrittenStage ? (
            <p className="text-[11px] text-muted-foreground">{handwrittenStage}</p>
          ) : handwrittenMutation.isSuccess && totalPages > 0 ? (
            <p className="text-[11px] text-muted-foreground">
              {readPages} of {totalPages} page{totalPages === 1 ? "" : "s"} read.
            </p>
          ) : null}
          <CompactProgressBar
            active={isProcessingUpload || handwrittenMutation.isPending}
            stages={[
              { label: "Preparing & optimizing page images", weight: 2 },
              { label: "Reading handwriting & economics diagrams", weight: 5 },
              { label: "Ordering & formatting transcript", weight: 2 },
            ] satisfies ProgressStage[]}
            totalMs={22_000}
            title={handwrittenStage || (isProcessingUpload ? "Preparing page images…" : "Transcribing handwritten pages…")}
            estimatedTimeLabel="Est: ~10–25s"
          />
          {/* Gallery / Photos input: uncaptured, supports multiple image selection */}
          <input
            ref={galleryInput}
            type="file"
            accept="image/*,.heic,.heif,application/pdf"
            multiple
            className="hidden"
            onChange={(event) => {
              const files = Array.from(event.target.files ?? []);
              event.target.value = "";
              if (files.length > 0) void handleFilesSelected(files);
            }}
          />
          {/* Camera input: capture="environment" for live camera snaps */}
          <input
            ref={cameraInput}
            type="file"
            accept="image/*"
            capture="environment"
            multiple
            className="hidden"
            onChange={(event) => {
              const files = Array.from(event.target.files ?? []);
              event.target.value = "";
              if (files.length > 0) void handleFilesSelected(files);
            }}
          />
        </div>
      </div>

      {/* Visual Staged Document Page Manager & Sequence Viewer */}
      {stagedPages.length > 0 && (
        <div className="space-y-3 rounded-xl border border-primary/25 bg-primary/[0.02] p-3 sm:p-4 shadow-xs">
          <div className="flex items-center justify-between flex-wrap gap-2 pb-1 border-b border-border/60">
            <div className="flex items-center gap-2">
              <span className="flex size-5 sm:size-6 items-center justify-center rounded-full bg-primary text-[11px] font-bold text-primary-foreground shadow-2xs">
                {stagedPages.length}
              </span>
              <div>
                <h4 className="text-xs font-bold text-foreground">
                  Document Pages ({stagedPages.length} of 12 max)
                </h4>
                <p className="text-[11px] text-muted-foreground">
                  Confirm page numbers (1, 2, 3…) and ordering before AI handwriting evaluation.
                </p>
              </div>
            </div>

            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={clearAllStaged}
              className="h-7 px-2 text-[11px] text-muted-foreground hover:text-destructive cursor-pointer"
            >
              <X className="size-3 mr-1" />
              Clear all
            </Button>
          </div>

          {/* Staged Pages Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2.5">
            {stagedPages.map((page, idx) => (
              <div
                key={page.id}
                className="group relative flex flex-col rounded-lg border border-border/80 bg-card overflow-hidden shadow-2xs hover:border-primary/50 transition-all"
              >
                {/* Header with Page Number Badge and Controls */}
                <div className="flex items-center justify-between px-2.5 py-1.5 bg-muted/70 border-b border-border/60">
                  <span className="inline-flex items-center gap-1.5 text-[11px] font-bold text-primary">
                    <span className="size-1.5 rounded-full bg-primary animate-pulse" />
                    Page {idx + 1}
                  </span>
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      disabled={rotatingId === page.id}
                      onClick={() => void handleRotatePage(page.id)}
                      aria-label={`Rotate page ${idx + 1} 90° clockwise`}
                      className="text-muted-foreground hover:text-primary transition-colors p-1 rounded cursor-pointer disabled:opacity-40"
                      title="Rotate 90° clockwise"
                    >
                      <RotateCw className={`size-3.5 ${rotatingId === page.id ? "animate-spin text-primary" : ""}`} />
                    </button>
                    <button
                      type="button"
                      onClick={() => removePage(page.id)}
                      aria-label={`Remove page ${idx + 1}`}
                      className="text-muted-foreground hover:text-destructive transition-colors p-1 rounded cursor-pointer"
                      title="Remove page"
                    >
                      <Trash2 className="size-3.5" />
                    </button>
                  </div>
                </div>

                {/* Page Thumbnail */}
                <div className="relative aspect-[3/4] w-full bg-muted/20 overflow-hidden flex items-center justify-center">
                  <img
                    src={page.dataUrl}
                    alt={`Document Page ${idx + 1}`}
                    className="h-full w-full object-cover"
                  />
                  <div className="absolute bottom-1 left-1.5 rounded bg-background/80 px-1 py-0.5 text-[9px] font-mono text-muted-foreground backdrop-blur-xs">
                    #{idx + 1}
                  </div>
                </div>

                {/* Reordering and Rotate Controls */}
                <div className="flex items-center justify-between p-1 bg-background border-t border-border/60">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    disabled={idx === 0}
                    onClick={() => movePage(idx, "prev")}
                    className="h-6 px-1.5 text-[10px] gap-0.5 font-medium disabled:opacity-20 cursor-pointer"
                    title="Move earlier in sequence (Page - 1)"
                  >
                    <ChevronLeft className="size-3" />
                    Earlier
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    disabled={rotatingId === page.id}
                    onClick={() => void handleRotatePage(page.id)}
                    className="h-6 px-1.5 text-[10px] gap-1 font-medium cursor-pointer text-muted-foreground hover:text-primary"
                    title="Rotate 90° clockwise"
                  >
                    <RotateCw className={`size-3 ${rotatingId === page.id ? "animate-spin" : ""}`} />
                    Rotate
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    disabled={idx === stagedPages.length - 1}
                    onClick={() => movePage(idx, "next")}
                    className="h-6 px-1.5 text-[10px] gap-0.5 font-medium disabled:opacity-20 cursor-pointer"
                    title="Move later in sequence (Page + 1)"
                  >
                    Later
                    <ChevronRight className="size-3" />
                  </Button>
                </div>
              </div>
            ))}
          </div>

          {/* Action Bar */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2 pt-2 border-t border-border/60">
            <div className="flex items-center gap-1.5">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => galleryInput.current?.click()}
                disabled={stagedPages.length >= 12 || isProcessingUpload}
                className="h-8 flex-1 sm:flex-initial text-xs gap-1.5 font-medium"
              >
                <Images className="size-3.5 text-primary" />
                Add Photos
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => cameraInput.current?.click()}
                disabled={stagedPages.length >= 12 || isProcessingUpload}
                className="h-8 flex-1 sm:flex-initial text-xs gap-1.5 font-medium"
              >
                <Camera className="size-3.5 text-emerald-500" />
                Add Camera Snap
              </Button>
            </div>

            <Button
              type="button"
              size="sm"
              disabled={handwrittenMutation.isPending || isProcessingUpload}
              onClick={handleTranscribeStaged}
              className="h-8 px-4 text-xs font-semibold gap-1.5 bg-primary text-primary-foreground shadow-xs hover:bg-primary/90"
            >
              {handwrittenMutation.isPending ? (
                <>
                  <Loader2 className="size-3.5 animate-spin" />
                  Transcribing {stagedPages.length} Pages…
                </>
              ) : (
                <>
                  <Sparkles className="size-3.5" />
                  Transcribe {stagedPages.length} Page{stagedPages.length === 1 ? "" : "s"} into Essay
                </>
              )}
            </Button>
          </div>
        </div>
      )}

      {outstanding.length > 0 ? (
        <div className="space-y-1.5 rounded-md border border-amber-500/30 bg-amber-500/5 p-2.5">
          <div className="flex items-center gap-1.5 text-xs font-medium text-amber-700 dark:text-amber-400">
            <AlertCircle className="size-3.5 shrink-0" />
            {outstanding.length} page{outstanding.length === 1 ? "" : "s"} couldn't be read
            {outstanding.length === 1 ? ` (page ${outstanding[0]!.page})` : ""}
          </div>
          <p className="text-[11px] text-muted-foreground">
            Usually a blurry, dark, or cropped photo — retry, or reshoot that page and upload it on
            its own.
          </p>
          <Button
            type="button"
            size="sm"
            variant="outline"
            disabled={retryMutation.isPending}
            onClick={() => retryMutation.mutate(outstanding)}
          >
            {retryMutation.isPending ? (
              <Loader2 className="size-3.5 animate-spin mr-1.5" />
            ) : (
              <RotateCw className="size-3.5 mr-1.5" />
            )}
            Retry {outstanding.length} page{outstanding.length === 1 ? "" : "s"}
          </Button>
          <CompactProgressBar
            active={retryMutation.isPending}
            stages={[
              { label: "Re-scanning unreadable page images", weight: 3 },
              { label: "Recovering handwritten text & diagrams", weight: 4 },
            ] satisfies ProgressStage[]}
            totalMs={15_000}
            title={`Retrying ${outstanding.length} unreadable page${outstanding.length === 1 ? "" : "s"}…`}
          />
        </div>
      ) : null}
    </div>
  );
}
