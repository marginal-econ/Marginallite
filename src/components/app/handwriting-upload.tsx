import { useMutation } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import {
  AlertCircle,
  Camera,
  Check,
  ChevronLeft,
  ChevronRight,
  Eye,
  FileText,
  FileType,
  Images,
  Loader2,
  Maximize2,
  PenLine,
  Plus,
  RotateCw,
  Sparkles,
  Trash2,
  UploadCloud,
  X,
} from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
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
 * Modern Handwriting & Document Upload Panel
 *
 * Supports:
 * - Direct camera snaps (mobile rear-facing camera capture)
 * - Multi-page photo and scanned PDF batch uploads (up to 12 pages)
 * - Drag-and-drop dropzone with active hover feedback
 * - Direct clipboard paste (Ctrl+V / Cmd+V) for screenshots and copied images
 * - Staged page manager with 90° rotation, re-ordering, and full-screen lightbox inspection
 * - Dedicated mode for digital typed answers (PDF text layer / Tesseract OCR)
 */
export function HandwritingUpload({
  hint,
  onText,
}: {
  hint?: string;
  onText: (text: string) => void;
}) {
  const [activeTab, setActiveTab] = useState<"handwritten" | "typed">("handwritten");
  const [isDragging, setIsDragging] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);

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

  // Rotate a page 90 degrees clockwise
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

  // Handle newly selected/dropped files
  const handleFilesSelected = useCallback(
    async (files: File[]) => {
      if (!files || files.length === 0) return;

      // If user uploaded a typed file while on typed tab, route to typedMutation
      if (activeTab === "typed") {
        typedMutation.mutate(files);
        return;
      }

      setIsProcessingUpload(true);
      setHandwrittenStage("Processing document pages…");
      try {
        const pageImages = await filesToPageImages(files);
        const newItems: StagedHandwritingPage[] = pageImages.map((dataUrl, idx) => ({
          id: crypto.randomUUID(),
          dataUrl,
          name: files[idx]?.name || `Page ${stagedPages.length + idx + 1}`,
        }));

        setStagedPages((current) => {
          const combined = [...current, ...newItems];
          if (combined.length > 12) {
            toast.warning("Up to 12 pages maximum. Extra pages were trimmed.");
            return combined.slice(0, 12);
          }
          return combined;
        });

        toast.success(
          `Added ${newItems.length} page${newItems.length === 1 ? "" : "s"}. Inspect or reorder pages below before transcribing.`,
        );
      } catch (err: any) {
        toast.error(err?.message || "Could not read image files.");
      } finally {
        setIsProcessingUpload(false);
        setHandwrittenStage(null);
      }
    },
    [activeTab, stagedPages.length],
  );

  // Global paste handler to support Ctrl+V / Cmd+V
  useEffect(() => {
    function handlePaste(e: ClipboardEvent) {
      const items = e.clipboardData?.items;
      if (!items || items.length === 0) return;

      const pastedFiles: File[] = [];
      for (let i = 0; i < items.length; i++) {
        const item = items[i];
        if (item && item.type.startsWith("image/")) {
          const file = item.getAsFile();
          if (file) pastedFiles.push(file);
        }
      }

      if (pastedFiles.length > 0) {
        e.preventDefault();
        toast.info(`Pasting ${pastedFiles.length} image${pastedFiles.length === 1 ? "" : "s"} from clipboard…`);
        void handleFilesSelected(pastedFiles);
      }
    }

    window.addEventListener("paste", handlePaste);
    return () => window.removeEventListener("paste", handlePaste);
  }, [handleFilesSelected]);

  // Keyboard navigation for Lightbox
  useEffect(() => {
    if (lightboxIndex === null) return;

    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        setLightboxIndex(null);
      } else if (e.key === "ArrowLeft") {
        setLightboxIndex((curr) => (curr !== null && curr > 0 ? curr - 1 : curr));
      } else if (e.key === "ArrowRight") {
        setLightboxIndex((curr) =>
          curr !== null && curr < stagedPages.length - 1 ? curr + 1 : curr,
        );
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [lightboxIndex, stagedPages.length]);

  // Drag and drop handlers
  function handleDragOver(e: React.DragEvent) {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  }

  function handleDragLeave(e: React.DragEvent) {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    const files = Array.from(e.dataTransfer.files ?? []);
    if (files.length > 0) {
      void handleFilesSelected(files);
    }
  }

  // Typed OCR mutation
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
        toast.success(`Extracted text from ${pages} page${pages === 1 ? "" : "s"}.`);
      }
    },
    onError: (error: Error) => toast.error(error.message),
    onSettled: () => setTypedStage(null),
  });

  // Staged pages reordering and removal
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

  // Vision AI transcription mutation
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
          `All ${result.pages} page${result.pages === 1 ? "" : "s"} of handwriting transcribed successfully.`,
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

  // Retry mutation for unreadable pages
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
          `Recovered ${recovered.length} page${recovered.length === 1 ? "" : "s"} — appended to your answer text.`,
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
    <div className="space-y-4">
      {/* Tab Switcher: Handwritten vs Digital */}
      <div className="flex items-center gap-1.5 p-1 bg-muted/40 rounded-xl border border-border/60">
        <button
          type="button"
          onClick={() => setActiveTab("handwritten")}
          className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
            activeTab === "handwritten"
              ? "bg-card text-foreground shadow-xs border border-border/80"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          <PenLine className="size-3.5 text-primary" />
          <span>Handwritten Photos</span>
          <span className="hidden sm:inline-flex px-1.5 py-0.2 rounded-full bg-primary/10 text-primary text-[10px] font-medium">
            Vision AI
          </span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("typed")}
          className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
            activeTab === "typed"
              ? "bg-card text-foreground shadow-xs border border-border/80"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          <FileType className="size-3.5 text-primary" />
          <span>Typed PDF / Text</span>
          <span className="hidden sm:inline-flex px-1.5 py-0.2 rounded-full bg-muted text-muted-foreground text-[10px] font-medium">
            Digital
          </span>
        </button>
      </div>

      {/* Main Interactive Dropzone */}
      {activeTab === "handwritten" ? (
        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          className={`relative group rounded-2xl border-2 border-dashed p-6 transition-all duration-200 text-center ${
            isDragging
              ? "border-primary bg-primary/10 scale-[1.01] shadow-lg shadow-primary/10"
              : "border-border/80 hover:border-primary/50 bg-gradient-to-b from-card to-muted/20 hover:bg-muted/30"
          }`}
        >
          <div className="flex flex-col items-center justify-center space-y-3">
            {/* Animated Icon Circle */}
            <div
              className={`flex size-14 items-center justify-center rounded-2xl transition-transform duration-300 ${
                isDragging
                  ? "bg-primary text-primary-foreground scale-110 rotate-3"
                  : "bg-primary/10 text-primary group-hover:scale-105"
              }`}
            >
              {isProcessingUpload ? (
                <Loader2 className="size-7 animate-spin text-primary" />
              ) : isDragging ? (
                <UploadCloud className="size-7 animate-bounce" />
              ) : (
                <Images className="size-7" />
              )}
            </div>

            <div className="space-y-1 max-w-md">
              <h4 className="text-sm font-bold text-foreground tracking-tight">
                {isDragging ? "Drop your handwritten pages here" : "Upload Handwritten Exam Pages"}
              </h4>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Take live photos or upload from gallery. Multi-page scanning automatically stitches
                your full essay into sequence.
              </p>
            </div>

            {/* Quick Action Buttons */}
            <div className="flex flex-wrap items-center justify-center gap-2.5 pt-1.5">
              <Button
                type="button"
                size="sm"
                variant="outline"
                disabled={isProcessingUpload || handwrittenMutation.isPending}
                onClick={() => galleryInput.current?.click()}
                className="h-9 px-4 rounded-xl text-xs font-semibold gap-2 border-border/80 shadow-2xs hover:border-primary/60 hover:bg-card cursor-pointer"
              >
                <Images className="size-4 text-primary" />
                Browse Photos / PDFs
              </Button>

              <Button
                type="button"
                size="sm"
                variant="outline"
                disabled={isProcessingUpload || handwrittenMutation.isPending}
                onClick={() => cameraInput.current?.click()}
                className="h-9 px-4 rounded-xl text-xs font-semibold gap-2 border-emerald-500/30 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/10 hover:border-emerald-500/50 cursor-pointer"
              >
                <Camera className="size-4" />
                Snap Photo (Camera)
              </Button>
            </div>

            {/* Format & Feature Pill Badges */}
            <div className="flex flex-wrap items-center justify-center gap-1.5 pt-1 text-[11px] text-muted-foreground">
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-muted/60 border border-border/50">
                HEIC / JPG / PNG / PDF
              </span>
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-muted/60 border border-border/50">
                Up to 12 pages
              </span>
              <span className="hidden sm:inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-muted/60 border border-border/50">
                Paste with <kbd className="font-mono text-[10px] bg-background px-1 py-0.2 rounded border border-border/60">Ctrl+V</kbd>
              </span>
            </div>
          </div>

          {/* Hidden File Inputs */}
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
          <input
            ref={cameraInput}
            type="file"
            accept="image/*,.heic,.heif"
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
      ) : (
        /* Typed PDF / Document Upload */
        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          className={`relative group rounded-2xl border-2 border-dashed p-6 transition-all duration-200 text-center ${
            isDragging
              ? "border-primary bg-primary/10 scale-[1.01]"
              : "border-border/80 hover:border-primary/50 bg-gradient-to-b from-card to-muted/20 hover:bg-muted/30"
          }`}
        >
          <div className="flex flex-col items-center justify-center space-y-3">
            <div className="flex size-14 items-center justify-center rounded-2xl bg-primary/10 text-primary">
              {typedMutation.isPending ? (
                <Loader2 className="size-7 animate-spin text-primary" />
              ) : (
                <FileText className="size-7" />
              )}
            </div>

            <div className="space-y-1 max-w-md">
              <h4 className="text-sm font-bold text-foreground tracking-tight">
                Upload Digital Essay or Typed PDF
              </h4>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Directly extracts typed text layers from Word, Google Docs exports, and text files.
              </p>
            </div>

            <Button
              type="button"
              size="sm"
              variant="outline"
              disabled={typedMutation.isPending}
              onClick={() => typedInput.current?.click()}
              className="h-9 px-5 rounded-xl text-xs font-semibold gap-2 border-border/80 shadow-2xs hover:border-primary/60 hover:bg-card cursor-pointer"
            >
              {typedMutation.isPending ? (
                <Loader2 className="size-4 animate-spin text-primary" />
              ) : (
                <FileType className="size-4 text-primary" />
              )}
              Select PDF or Text File
            </Button>

            <div className="text-[11px] text-muted-foreground">
              Accepts .pdf, .txt, or .md files
            </div>
          </div>

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

          {typedMutation.isPending && (
            <div className="mt-4 pt-3 border-t border-border/60">
              <CompactProgressBar
                active={typedMutation.isPending}
                stages={[
                  { label: "Inspecting document text layer", weight: 2 },
                  { label: "Extracting essay paragraphs & diagrams", weight: 4 },
                ] satisfies ProgressStage[]}
                totalMs={12_000}
                title={typedStage || "Extracting digital answer…"}
              />
            </div>
          )}
        </div>
      )}

      {/* Visual Staged Document Page Manager */}
      {stagedPages.length > 0 && (
        <div className="space-y-3.5 rounded-2xl border border-primary/30 bg-card/60 p-3.5 sm:p-5 shadow-xs">
          {/* Header Bar */}
          <div className="flex items-center justify-between flex-wrap gap-2 pb-2.5 border-b border-border/60">
            <div className="flex items-center gap-2.5">
              <span className="flex size-6 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground shadow-2xs">
                {stagedPages.length}
              </span>
              <div>
                <h4 className="text-xs sm:text-sm font-bold text-foreground flex items-center gap-1.5">
                  Staged Exam Pages
                  <span className="text-[11px] font-normal text-muted-foreground">
                    ({stagedPages.length} of 12 max)
                  </span>
                </h4>
                <p className="text-[11px] text-muted-foreground">
                  Check page sequence (1, 2, 3…), rotate if needed, or click to zoom before transcribing.
                </p>
              </div>
            </div>

            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={clearAllStaged}
              className="h-7 px-2.5 text-[11px] text-muted-foreground hover:text-destructive cursor-pointer rounded-lg"
            >
              <Trash2 className="size-3 mr-1.5" />
              Clear all
            </Button>
          </div>

          {/* Staged Pages Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
            {stagedPages.map((page, idx) => (
              <div
                key={page.id}
                className="group relative flex flex-col rounded-xl border border-border/80 bg-card overflow-hidden shadow-2xs hover:border-primary/60 hover:shadow-md transition-all duration-150"
              >
                {/* Header Badge & Quick Actions */}
                <div className="flex items-center justify-between px-2.5 py-1.5 bg-muted/60 border-b border-border/60">
                  <span className="inline-flex items-center gap-1 text-[11px] font-bold text-primary">
                    <span className="size-1.5 rounded-full bg-primary" />
                    Page {idx + 1}
                  </span>

                  <div className="flex items-center gap-0.5">
                    <button
                      type="button"
                      disabled={rotatingId === page.id}
                      onClick={() => void handleRotatePage(page.id)}
                      aria-label={`Rotate page ${idx + 1} 90° clockwise`}
                      className="p-1 rounded-md text-muted-foreground hover:text-primary hover:bg-background/80 transition-colors cursor-pointer disabled:opacity-40"
                      title="Rotate 90° clockwise"
                    >
                      <RotateCw
                        className={`size-3.5 ${rotatingId === page.id ? "animate-spin text-primary" : ""}`}
                      />
                    </button>
                    <button
                      type="button"
                      onClick={() => removePage(page.id)}
                      aria-label={`Remove page ${idx + 1}`}
                      className="p-1 rounded-md text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors cursor-pointer"
                      title="Remove page"
                    >
                      <X className="size-3.5" />
                    </button>
                  </div>
                </div>

                {/* Page Thumbnail with Zoom Lightbox Trigger */}
                <div
                  onClick={() => setLightboxIndex(idx)}
                  className="relative aspect-[3/4] w-full bg-muted/20 overflow-hidden flex items-center justify-center cursor-pointer group/thumb"
                  title="Click to zoom and inspect handwriting"
                >
                  <img
                    src={page.dataUrl}
                    alt={`Page ${idx + 1}`}
                    className="h-full w-full object-contain p-1.5 transition-transform duration-200 group-hover/thumb:scale-[1.02]"
                  />

                  {/* Hover Inspect Overlay */}
                  <div className="absolute inset-0 bg-background/60 backdrop-blur-2xs opacity-0 group-hover/thumb:opacity-100 transition-opacity flex items-center justify-center gap-1.5 text-xs font-semibold text-foreground">
                    <Maximize2 className="size-4 text-primary" />
                    <span>Zoom</span>
                  </div>

                  <div className="absolute bottom-1.5 left-2 rounded-md bg-background/90 px-1.5 py-0.5 text-[9px] font-mono text-muted-foreground backdrop-blur-xs border border-border/40">
                    #{idx + 1}
                  </div>
                </div>

                {/* Bottom Reordering Controls */}
                <div className="flex items-center justify-between p-1 bg-muted/30 border-t border-border/60">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    disabled={idx === 0}
                    onClick={() => movePage(idx, "prev")}
                    className="h-6 px-1.5 text-[10px] gap-0.5 font-medium disabled:opacity-20 cursor-pointer rounded"
                    title="Move earlier (Page - 1)"
                  >
                    <ChevronLeft className="size-3" />
                    Left
                  </Button>

                  <span className="text-[10px] font-mono text-muted-foreground">
                    {idx + 1}/{stagedPages.length}
                  </span>

                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    disabled={idx === stagedPages.length - 1}
                    onClick={() => movePage(idx, "next")}
                    className="h-6 px-1.5 text-[10px] gap-0.5 font-medium disabled:opacity-20 cursor-pointer rounded"
                    title="Move later (Page + 1)"
                  >
                    Right
                    <ChevronRight className="size-3" />
                  </Button>
                </div>
              </div>
            ))}

            {/* Quick "+ Add Another Page" Slot */}
            {stagedPages.length < 12 && (
              <button
                type="button"
                onClick={() => galleryInput.current?.click()}
                disabled={isProcessingUpload || stagedPages.length >= 12}
                className="flex flex-col items-center justify-center aspect-[3/4] rounded-xl border-2 border-dashed border-border/70 hover:border-primary/60 bg-muted/10 hover:bg-muted/30 transition-all p-3 text-center cursor-pointer group"
              >
                <div className="size-8 rounded-full bg-muted flex items-center justify-center text-muted-foreground group-hover:bg-primary group-hover:text-primary-foreground transition-colors mb-2">
                  <Plus className="size-4" />
                </div>
                <span className="text-xs font-semibold text-foreground group-hover:text-primary">
                  Add Page
                </span>
                <span className="text-[10px] text-muted-foreground">
                  Photo or scan
                </span>
              </button>
            )}
          </div>

          {/* Action Call To Action Bar */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-3 border-t border-border/60">
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => galleryInput.current?.click()}
                disabled={stagedPages.length >= 12 || isProcessingUpload}
                className="h-8.5 px-3 rounded-lg text-xs gap-1.5 font-medium cursor-pointer"
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
                className="h-8.5 px-3 rounded-lg text-xs gap-1.5 font-medium text-emerald-600 dark:text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/10 cursor-pointer"
              >
                <Camera className="size-3.5" />
                Add Snap
              </Button>
            </div>

            <Button
              type="button"
              size="sm"
              disabled={handwrittenMutation.isPending || isProcessingUpload}
              onClick={handleTranscribeStaged}
              className="h-9 px-5 rounded-xl text-xs font-bold gap-2 bg-gradient-to-r from-primary to-primary/90 text-primary-foreground shadow-md hover:shadow-lg hover:brightness-105 transition-all cursor-pointer"
            >
              {handwrittenMutation.isPending ? (
                <>
                  <Loader2 className="size-4 animate-spin" />
                  Transcribing {stagedPages.length} Pages…
                </>
              ) : (
                <>
                  <Sparkles className="size-4" />
                  Transcribe {stagedPages.length} Page{stagedPages.length === 1 ? "" : "s"} with Vision AI
                </>
              )}
            </Button>
          </div>

          {/* Progress Bar during Transcription */}
          {(isProcessingUpload || handwrittenMutation.isPending) && (
            <div className="pt-2">
              <CompactProgressBar
                active={isProcessingUpload || handwrittenMutation.isPending}
                stages={[
                  { label: "Preparing & enhancing page images", weight: 2 },
                  { label: "Transcribing handwriting & economics diagrams", weight: 5 },
                  { label: "Formatting paragraphs & candidate script", weight: 2 },
                ] satisfies ProgressStage[]}
                totalMs={22_000}
                title={
                  handwrittenStage ||
                  (isProcessingUpload
                    ? "Preparing page images…"
                    : `Transcribing ${stagedPages.length} handwritten pages…`)
                }
                estimatedTimeLabel="Est: ~10–25s"
              />
            </div>
          )}
        </div>
      )}

      {/* Unreadable Pages Recovery Card */}
      {outstanding.length > 0 && (
        <div className="space-y-2 rounded-xl border border-amber-500/40 bg-amber-500/5 p-3.5 shadow-2xs">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-xs font-bold text-amber-700 dark:text-amber-400">
              <AlertCircle className="size-4 shrink-0" />
              <span>
                {outstanding.length} page{outstanding.length === 1 ? "" : "s"} need retry
                {outstanding.length === 1 ? ` (page ${outstanding[0]!.page})` : ""}
              </span>
            </div>
            <Button
              type="button"
              size="sm"
              variant="outline"
              disabled={retryMutation.isPending}
              onClick={() => retryMutation.mutate(outstanding)}
              className="h-7 px-3 rounded-lg text-xs font-semibold border-amber-500/40 text-amber-700 dark:text-amber-400 hover:bg-amber-500/10 cursor-pointer"
            >
              {retryMutation.isPending ? (
                <Loader2 className="size-3.5 animate-spin mr-1.5" />
              ) : (
                <RotateCw className="size-3.5 mr-1.5" />
              )}
              Retry Now
            </Button>
          </div>
          <p className="text-[11px] text-muted-foreground">
            This typically happens if a photo is blurry, dark, or cropped. Click retry or snap a clearer photo.
          </p>
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
      )}

      {/* Lightbox / Zoom Preview Modal */}
      {lightboxIndex !== null && stagedPages[lightboxIndex] && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex flex-col bg-black/90 backdrop-blur-md animate-in fade-in duration-200"
          onClick={(e) => {
            if (e.target === e.currentTarget) setLightboxIndex(null);
          }}
        >
          {/* Lightbox Topbar */}
          <div className="flex items-center justify-between px-4 py-3 bg-black/40 border-b border-white/10 text-white">
            <div className="flex items-center gap-3">
              <span className="font-bold text-sm">
                Page {lightboxIndex + 1} of {stagedPages.length}
              </span>
              <span className="text-xs text-white/60 font-mono hidden sm:inline">
                {stagedPages[lightboxIndex]?.name}
              </span>
            </div>

            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => void handleRotatePage(stagedPages[lightboxIndex]!.id)}
                className="h-8 px-2.5 rounded-lg text-xs text-white hover:bg-white/10 cursor-pointer gap-1.5"
              >
                <RotateCw className="size-3.5" />
                Rotate 90°
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={() => setLightboxIndex(null)}
                className="size-8 rounded-lg text-white hover:bg-white/10 cursor-pointer"
              >
                <X className="size-4" />
              </Button>
            </div>
          </div>

          {/* Lightbox Image Preview Area */}
          <div className="relative flex-1 flex items-center justify-center p-4 overflow-hidden">
            <img
              src={stagedPages[lightboxIndex]?.dataUrl}
              alt={`Page ${lightboxIndex + 1}`}
              className="max-h-[82vh] max-w-[92vw] object-contain rounded-lg shadow-2xl transition-transform"
            />

            {/* Left Nav Arrow */}
            {lightboxIndex > 0 && (
              <button
                type="button"
                onClick={() => setLightboxIndex((curr) => (curr !== null ? curr - 1 : 0))}
                className="absolute left-4 top-1/2 -translate-y-1/2 p-2.5 rounded-full bg-black/60 text-white hover:bg-black/90 border border-white/20 transition-all cursor-pointer"
                title="Previous page (Left Arrow)"
              >
                <ChevronLeft className="size-5" />
              </button>
            )}

            {/* Right Nav Arrow */}
            {lightboxIndex < stagedPages.length - 1 && (
              <button
                type="button"
                onClick={() => setLightboxIndex((curr) => (curr !== null ? curr + 1 : 0))}
                className="absolute right-4 top-1/2 -translate-y-1/2 p-2.5 rounded-full bg-black/60 text-white hover:bg-black/90 border border-white/20 transition-all cursor-pointer"
                title="Next page (Right Arrow)"
              >
                <ChevronRight className="size-5" />
              </button>
            )}
          </div>

          {/* Lightbox Footer Note */}
          <div className="py-2 text-center text-xs text-white/50 bg-black/40 border-t border-white/10">
            Use <kbd className="bg-white/10 px-1.5 py-0.5 rounded text-[10px]">←</kbd> and{" "}
            <kbd className="bg-white/10 px-1.5 py-0.5 rounded text-[10px]">→</kbd> keys to flip pages •{" "}
            <kbd className="bg-white/10 px-1.5 py-0.5 rounded text-[10px]">Esc</kbd> to close
          </div>
        </div>
      )}
    </div>
  );
}
