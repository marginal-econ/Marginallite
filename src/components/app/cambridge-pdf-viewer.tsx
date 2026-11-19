import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  FileText,
  Download,
  ExternalLink,
  ZoomIn,
  ZoomOut,
  ChevronLeft,
  ChevronRight,
  ArrowUp,
  ArrowDown,
  ChevronsUp,
  ChevronsDown,
  RefreshCw,
  AlertCircle,
  Maximize2,
  Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { getPaperPdfBase64 } from "@/lib/data-response/data-response.functions";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface CambridgePdfViewerProps {
  paperId: string;
  pdfUrl?: string;
  paperTitle: string;
  examCode?: string;
  height?: string;
  className?: string;
  onFullScreenToggle?: () => void;
}

// In-memory cache for downloaded paper base64 data to avoid redundant network requests
const pdfBase64Cache = new Map<string, { base64: string; filename: string }>();

/**
 * High-DPI, Distortion-Free PDF Page Canvas Renderer
 * Locks strict aspect ratio so no horizontal/vertical stretching ever occurs.
 */
function PdfPageCanvas({
  pdfDoc,
  pageNumber,
  zoomScale,
  containerWidth,
}: {
  pdfDoc: any;
  pageNumber: number;
  zoomScale: number;
  containerWidth: number;
}) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const renderTaskRef = useRef<any>(null);
  const [aspectRatio, setAspectRatio] = useState<number>(1.414);
  const [rendered, setRendered] = useState<boolean>(false);

  useEffect(() => {
    let cancelled = false;

    const render = async () => {
      try {
        if (renderTaskRef.current) {
          try {
            renderTaskRef.current.cancel();
          } catch {}
        }

        const page = await pdfDoc.getPage(pageNumber);
        if (cancelled || !canvasRef.current) return;

        const baseViewport = page.getViewport({ scale: 1 });
        const ratio = baseViewport.height / baseViewport.width;
        setAspectRatio(ratio);

        // Calculate fit-to-width scale relative to available container space
        const availableWidth = Math.max(280, (containerWidth || 540) - 32);
        const fitScale = (availableWidth / baseViewport.width) * zoomScale;
        const pixelRatio = Math.min(window.devicePixelRatio || 1, 2.5);

        const viewport = page.getViewport({ scale: fitScale * pixelRatio });
        const canvas = canvasRef.current;

        canvas.width = Math.round(viewport.width);
        canvas.height = Math.round(viewport.height);

        const displayWidth = Math.round(viewport.width / pixelRatio);

        // Strict aspect ratio locking to completely eliminate distortion
        canvas.style.width = "100%";
        canvas.style.maxWidth = `${displayWidth}px`;
        canvas.style.height = "auto";
        canvas.style.aspectRatio = `${baseViewport.width} / ${baseViewport.height}`;
        canvas.style.display = "block";

        const ctx = canvas.getContext("2d");
        if (!ctx) return;

        ctx.fillStyle = "#ffffff";
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        const renderTask = page.render({
          canvasContext: ctx,
          viewport: viewport,
        });
        renderTaskRef.current = renderTask;
        await renderTask.promise;

        if (!cancelled) {
          setRendered(true);
        }
      } catch (err: any) {
        if (err?.name !== "RenderingCancelledException") {
          console.error(`Page ${pageNumber} render error:`, err);
        }
      }
    };

    render();

    return () => {
      cancelled = true;
      if (renderTaskRef.current) {
        try {
          renderTaskRef.current.cancel();
        } catch {}
      }
    };
  }, [pdfDoc, pageNumber, zoomScale, containerWidth]);

  return (
    <div
      className="relative bg-white text-zinc-900 rounded shadow-md border border-zinc-200 dark:border-zinc-800 transition-all overflow-hidden mx-auto"
      style={{
        width: "100%",
        maxWidth: containerWidth ? `${containerWidth - 32}px` : "640px",
        aspectRatio: `${1} / ${aspectRatio}`,
      }}
    >
      <canvas ref={canvasRef} className="block mx-auto" />
      <div className="absolute bottom-1 right-2 bg-black/70 text-white text-[10px] font-mono px-2 py-0.5 rounded opacity-80 pointer-events-none select-none">
        Page {pageNumber}
      </div>
    </div>
  );
}

export function CambridgePdfViewer({
  paperId,
  pdfUrl,
  paperTitle,
  examCode,
  height = "720px",
  className,
  onFullScreenToggle,
}: CambridgePdfViewerProps) {
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [pdfDoc, setPdfDoc] = useState<any>(null);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [numPages, setNumPages] = useState<number>(1);
  const [zoomScale, setZoomScale] = useState<number>(1.0); // 1.0 = Fit to width
  const [viewMode, setViewMode] = useState<"canvas" | "native">("canvas");
  const [blobUrl, setBlobUrl] = useState<string | null>(null);
  const [pdfFilename, setPdfFilename] = useState<string>(`${examCode || paperId}.pdf`);

  const containerRef = useRef<HTMLDivElement | null>(null);
  const scrollContainerRef = useRef<HTMLDivElement | null>(null);
  const [containerWidth, setContainerWidth] = useState<number>(560);
  const lastWheelTime = useRef<number>(0);

  // Measure container width for responsive fit-to-width rendering
  useEffect(() => {
    if (!containerRef.current) return;

    const updateWidth = () => {
      if (containerRef.current) {
        setContainerWidth(containerRef.current.clientWidth);
      }
    };

    updateWidth();
    const observer = new ResizeObserver(updateWidth);
    observer.observe(containerRef.current);

    return () => observer.disconnect();
  }, []);

  // Convert Base64 to Uint8Array and Blob URL
  const processBase64Data = useCallback(
    async (base64Data: string, filename: string) => {
      try {
        const binaryString = window.atob(base64Data);
        const bytes = new Uint8Array(binaryString.length);
        for (let i = 0; i < binaryString.length; i++) {
          bytes[i] = binaryString.charCodeAt(i);
        }

        const blob = new Blob([bytes], { type: "application/pdf" });
        const createdBlobUrl = URL.createObjectURL(blob);
        setBlobUrl(createdBlobUrl);
        setPdfFilename(filename);

        // Load into PDF.js
        const pdfjs = await import("pdfjs-dist");
        const workerUrl = (await import("pdfjs-dist/build/pdf.worker.min.mjs?url")).default;
        pdfjs.GlobalWorkerOptions.workerSrc = workerUrl;

        const loadingTask = pdfjs.getDocument({
          data: bytes,
          useSystemFonts: true,
        });

        const doc = await loadingTask.promise;
        setPdfDoc(doc);
        setNumPages(doc.numPages);
        setCurrentPage(1);
        setLoading(false);
        setError(null);
      } catch (err: any) {
        console.error("PDF processing error:", err);
        setError(err.message || "Failed to parse PDF document.");
        setLoading(false);
      }
    },
    []
  );

  // Fetch PDF base64 from server or cache
  const fetchPdf = useCallback(async () => {
    setLoading(true);
    setError(null);

    // Check memory cache first
    const cached = pdfBase64Cache.get(paperId);
    if (cached) {
      await processBase64Data(cached.base64, cached.filename);
      return;
    }

    try {
      const res = await getPaperPdfBase64({ data: { paperId } });
      if (!res || !res.base64) {
        throw new Error("Server returned empty PDF data.");
      }

      pdfBase64Cache.set(paperId, {
        base64: res.base64,
        filename: res.filename || `${paperId}.pdf`,
      });

      await processBase64Data(res.base64, res.filename || `${paperId}.pdf`);
    } catch (err: any) {
      console.warn("Server PDF fetch failed, fallback to direct link:", err);
      setError(
        "Could not load PDF directly into viewer. You can open the authentic past paper in a new tab."
      );
      setLoading(false);
    }
  }, [paperId, processBase64Data]);

  // Trigger fetch when paperId changes
  useEffect(() => {
    fetchPdf();

    return () => {
      if (blobUrl) {
        URL.revokeObjectURL(blobUrl);
      }
    };
  }, [paperId]);

  const handleDownload = () => {
    if (blobUrl) {
      const a = document.createElement("a");
      a.href = blobUrl;
      a.download = pdfFilename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      toast.success(`Downloaded ${pdfFilename}`);
    } else if (pdfUrl) {
      window.open(pdfUrl, "_blank");
    }
  };

  const handleOpenNewTab = () => {
    if (blobUrl) {
      window.open(blobUrl, "_blank");
    } else if (pdfUrl) {
      window.open(pdfUrl, "_blank");
    }
  };

  // Direct Page Switchers: Only the requested page is shown
  const goToNextPage = () => {
    setCurrentPage((prev) => {
      const next = Math.min(numPages, prev + 1);
      if (next !== prev && scrollContainerRef.current) {
        scrollContainerRef.current.scrollTo({ top: 0, behavior: "smooth" });
      }
      return next;
    });
  };

  const goToPrevPage = () => {
    setCurrentPage((prev) => {
      const next = Math.max(1, prev - 1);
      if (next !== prev && scrollContainerRef.current) {
        scrollContainerRef.current.scrollTo({ top: 0, behavior: "smooth" });
      }
      return next;
    });
  };

  const goToPage = (pageNumber: number) => {
    const target = Math.max(1, Math.min(numPages, pageNumber));
    setCurrentPage(target);
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  // Keyboard navigation support: Arrow keys / PageUp / PageDown
  const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (e.key === "ArrowRight" || e.key === "ArrowDown" || e.key === "PageDown") {
      e.preventDefault();
      goToNextPage();
    } else if (e.key === "ArrowLeft" || e.key === "ArrowUp" || e.key === "PageUp") {
      e.preventDefault();
      goToPrevPage();
    } else if (e.key === "Home") {
      e.preventDefault();
      goToPage(1);
    } else if (e.key === "End") {
      e.preventDefault();
      goToPage(numPages);
    }
  };

  // Scroll wheel advances pages: wheel down -> next page; wheel up -> prev page
  const handleWheel = (e: React.WheelEvent<HTMLDivElement>) => {
    // Prevent outer webpage from scrolling while hovering the PDF
    e.stopPropagation();

    const now = Date.now();
    // 320ms debounce prevents one fast wheel flick from skipping multiple pages
    if (now - lastWheelTime.current < 320) return;

    if (e.deltaY > 25) {
      lastWheelTime.current = now;
      goToNextPage();
    } else if (e.deltaY < -25) {
      lastWheelTime.current = now;
      goToPrevPage();
    }
  };

  return (
    <div
      ref={containerRef}
      className={cn(
        "flex flex-col rounded-xl border border-border/80 bg-card overflow-hidden shadow-sm",
        className
      )}
    >
      {/* TOOLBAR */}
      <div className="flex flex-wrap items-center justify-between gap-2 p-2 bg-muted/40 border-b border-border/60">
        {/* Left: Paper Tag & Next / Prev Page Buttons */}
        <div className="flex items-center gap-1.5 flex-wrap">
          {examCode && (
            <Badge
              variant="outline"
              className="text-[11px] font-mono font-bold border-rose-500/40 text-rose-600 dark:text-rose-400 bg-rose-500/5"
            >
              {examCode}
            </Badge>
          )}

          {pdfDoc && viewMode === "canvas" && (
            <div className="flex items-center gap-1 bg-background/90 p-0.5 rounded-lg border border-border/70 shadow-xs">
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={currentPage <= 1}
                onClick={goToPrevPage}
                className="h-7 px-2.5 text-xs font-semibold gap-1 hover:bg-muted"
                title="Go to Previous Page (Arrow Left or Up)"
              >
                <ChevronLeft className="h-3.5 w-3.5" />
                <span>Prev</span>
              </Button>

              <span className="font-mono text-xs font-bold px-2 py-0.5 bg-muted rounded text-foreground">
                Page {currentPage} of {numPages}
              </span>

              <Button
                type="button"
                variant="default"
                size="sm"
                disabled={currentPage >= numPages}
                onClick={goToNextPage}
                className={cn(
                  "h-7 px-2.5 text-xs font-bold gap-1 transition-all",
                  currentPage < numPages
                    ? "bg-rose-600 hover:bg-rose-700 text-white shadow-xs"
                    : "opacity-50"
                )}
                title="Go to Next Page (Arrow Right or Down)"
              >
                <span>Next Page</span>
                <ChevronRight className="h-3.5 w-3.5" />
              </Button>
            </div>
          )}

          {/* Direct Page Jump Buttons (P1, P2 Extract, P3...) */}
          {pdfDoc && viewMode === "canvas" && (
            <div className="hidden sm:flex items-center gap-1 text-[11px]">
              {Array.from({ length: Math.min(numPages, 5) }).map((_, idx) => {
                const p = idx + 1;
                const isSectionA = p === 2; // In Cambridge IGCSE 0455, Page 2 is typically Section A Data Response Extract
                const isActive = currentPage === p;
                return (
                  <Button
                    key={p}
                    type="button"
                    variant={isActive ? "default" : "outline"}
                    size="sm"
                    onClick={() => goToPage(p)}
                    className={cn(
                      "h-6 px-2 text-[11px] font-mono transition-all",
                      isActive
                        ? "bg-foreground text-background font-bold shadow-xs"
                        : isSectionA
                        ? "border-emerald-500/50 text-emerald-600 dark:text-emerald-400 font-bold bg-emerald-500/5 hover:bg-emerald-500/10"
                        : "hover:bg-muted"
                    )}
                    title={isSectionA ? "Page 2: Section A Data Response Case Study & Table 1.1" : `Page ${p}`}
                  >
                    P{p}{isSectionA ? " (Extract)" : ""}
                  </Button>
                );
              })}
            </div>
          )}
        </div>

        {/* Center: Zoom Controls */}
        {pdfDoc && viewMode === "canvas" && (
          <div className="flex items-center gap-1 bg-background/80 px-1 py-0.5 rounded-lg border border-border/60">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              disabled={zoomScale <= 0.6}
              onClick={() => setZoomScale((z) => Math.max(0.6, +(z - 0.15).toFixed(2)))}
              className="h-6 w-6 p-0"
              title="Zoom Out"
            >
              <ZoomOut className="h-3.5 w-3.5" />
            </Button>
            <span className="font-mono text-[10px] px-1 text-muted-foreground w-11 text-center font-semibold">
              {Math.round(zoomScale * 100)}%
            </span>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              disabled={zoomScale >= 2.0}
              onClick={() => setZoomScale((z) => Math.min(2.0, +(z + 0.15).toFixed(2)))}
              className="h-6 w-6 p-0"
              title="Zoom In"
            >
              <ZoomIn className="h-3.5 w-3.5" />
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setZoomScale(1.0)}
              className="h-6 px-1.5 text-[10px] text-muted-foreground hover:text-foreground font-medium"
              title="Fit to Width"
            >
              Fit
            </Button>
          </div>
        )}

        {/* Right: Actions */}
        <div className="flex items-center gap-1 ml-auto">
          {blobUrl && (
            <div className="hidden lg:flex items-center gap-0.5 bg-background/90 p-0.5 rounded-lg border border-border/60">
              <Button
                type="button"
                variant={viewMode === "canvas" ? "secondary" : "ghost"}
                size="sm"
                onClick={() => setViewMode("canvas")}
                className={cn(
                  "h-6 text-[10px] px-2 font-semibold transition-all",
                  viewMode === "canvas"
                    ? "bg-muted text-primary font-bold shadow-xs"
                    : "text-muted-foreground"
                )}
                title="Single Page Canvas Reader"
              >
                Canvas
              </Button>
              <Button
                type="button"
                variant={viewMode === "native" ? "secondary" : "ghost"}
                size="sm"
                onClick={() => setViewMode("native")}
                className={cn(
                  "h-6 text-[10px] px-2 font-semibold transition-all",
                  viewMode === "native"
                    ? "bg-muted text-primary font-bold shadow-xs"
                    : "text-muted-foreground"
                )}
                title="Native Browser Frame"
              >
                Browser Frame
              </Button>
            </div>
          )}

          {onFullScreenToggle && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onFullScreenToggle}
              className="h-7 text-xs gap-1 border-border/80 hover:bg-muted font-medium"
              title="Full Screen Viewer"
            >
              <Maximize2 className="h-3 w-3" />
            </Button>
          )}

          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleOpenNewTab}
            className="h-7 text-xs gap-1 border-border/80 hover:bg-muted font-medium"
            title="Open authentic Cambridge PDF in a separate browser tab"
          >
            <ExternalLink className="h-3 w-3" />
            <span className="hidden sm:inline">New Tab</span>
          </Button>

          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleDownload}
            className="h-7 px-2 text-xs border-border/80 hover:bg-muted font-medium"
            title="Download authentic Cambridge past paper PDF"
          >
            <Download className="h-3 w-3" />
          </Button>
        </div>
      </div>

      {/* VIEWER BODY: RENDERS ONLY THE CURRENT PAGE */}
      <div
        className="relative flex-1 bg-zinc-100 dark:bg-zinc-950/80 overflow-hidden flex flex-col justify-between"
        style={{ height }}
      >
        {loading && (
          <div className="flex flex-col items-center justify-center p-8 space-y-3 text-center h-full">
            <RefreshCw className="h-8 w-8 text-primary animate-spin" />
            <div className="space-y-1">
              <p className="text-sm font-semibold text-foreground">
                Loading authentic Cambridge examination paper…
              </p>
              <p className="text-xs text-muted-foreground">
                Preparing page-by-page vector display
              </p>
            </div>
          </div>
        )}

        {error && !loading && (
          <div className="flex flex-col items-center justify-center p-8 space-y-4 text-center max-w-md mx-auto h-full">
            <div className="p-3 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400">
              <AlertCircle className="h-8 w-8" />
            </div>
            <div className="space-y-1">
              <h4 className="text-sm font-bold text-foreground">
                Past Paper PDF Direct Access
              </h4>
              <p className="text-xs text-muted-foreground leading-relaxed">
                {error}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={fetchPdf}
                className="text-xs gap-1.5"
              >
                <RefreshCw className="h-3.5 w-3.5" />
                Retry
              </Button>
              {pdfUrl && (
                <Button
                  size="sm"
                  onClick={() => window.open(pdfUrl, "_blank")}
                  className="bg-primary text-primary-foreground text-xs gap-1.5 font-bold"
                >
                  <ExternalLink className="h-3.5 w-3.5" />
                  Open Authentic Cambridge PDF
                </Button>
              )}
            </div>
          </div>
        )}

        {/* SINGLE PAGE CANVAS VIEW CONTAINER */}
        {!loading && !error && viewMode === "canvas" && pdfDoc && (
          <div
            ref={scrollContainerRef}
            tabIndex={0}
            onWheel={handleWheel}
            onKeyDown={handleKeyDown}
            className="relative flex-1 w-full overflow-y-auto overflow-x-hidden p-3 sm:p-4 focus:outline-none scrollbar-thin scrollbar-thumb-muted-foreground/30 hover:scrollbar-thumb-muted-foreground/50 transition-colors flex items-center justify-center"
            style={{
              overscrollBehavior: "contain", // Crucial: Mouse wheel turns pages, never scrolling outer page
            }}
          >
            {/* FLOATING PREV PAGE BUTTON (LEFT SIDE) */}
            {currentPage > 1 && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={goToPrevPage}
                className="absolute left-3 top-1/2 -translate-y-1/2 z-10 h-10 w-10 rounded-full p-0 bg-background/80 hover:bg-background shadow-md border-border/80 backdrop-blur-sm hidden sm:flex items-center justify-center text-foreground hover:scale-105 transition-all"
                title={`Previous Page (Page ${currentPage - 1})`}
              >
                <ChevronLeft className="h-5 w-5" />
              </Button>
            )}

            {/* ONLY THE ACTIVE PAGE IS RENDERED */}
            <PdfPageCanvas
              key={`page-${paperId}-${currentPage}`}
              pdfDoc={pdfDoc}
              pageNumber={currentPage}
              zoomScale={zoomScale}
              containerWidth={containerWidth}
            />

            {/* FLOATING NEXT PAGE BUTTON (RIGHT SIDE) */}
            {currentPage < numPages && (
              <Button
                type="button"
                variant="default"
                size="sm"
                onClick={goToNextPage}
                className="absolute right-3 top-1/2 -translate-y-1/2 z-10 h-10 w-10 rounded-full p-0 bg-rose-600 hover:bg-rose-700 text-white shadow-md border-rose-500 backdrop-blur-sm hidden sm:flex items-center justify-center hover:scale-105 transition-all"
                title={`Next Page (Page ${currentPage + 1})`}
              >
                <ChevronRight className="h-5 w-5" />
              </Button>
            )}
          </div>
        )}

        {/* BOTTOM NAVIGATION BAR: PROMINENT PAGE CONTROLS */}
        {!loading && !error && viewMode === "canvas" && pdfDoc && (
          <div className="bg-background/95 backdrop-blur-sm border-t border-border/70 p-2 flex items-center justify-between gap-2 shrink-0">
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={currentPage <= 1}
              onClick={goToPrevPage}
              className="h-8 px-3 text-xs font-semibold gap-1.5"
            >
              <ChevronLeft className="h-4 w-4" />
              <span>Previous Page</span>
            </Button>

            <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
              <span className="font-mono font-bold text-foreground">
                Page {currentPage} of {numPages}
              </span>
              <span className="hidden md:inline">•</span>
              <span className="hidden md:inline text-[11px]">
                {currentPage === 1 && "Cover & Instructions"}
                {currentPage === 2 && "Section A: Data Response Extract & Table 1.1"}
                {currentPage === 3 && "Section A Questions & Figures"}
                {currentPage > 3 && "Examination Questions"}
              </span>
            </div>

            <Button
              type="button"
              variant="default"
              size="sm"
              disabled={currentPage >= numPages}
              onClick={goToNextPage}
              className={cn(
                "h-8 px-3 text-xs font-bold gap-1.5 transition-all",
                currentPage < numPages
                  ? "bg-rose-600 hover:bg-rose-700 text-white shadow-xs"
                  : "opacity-50"
              )}
            >
              <span>Next Page</span>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        )}

        {/* NATIVE BROWSER PDF FRAME */}
        {!loading && !error && viewMode === "native" && blobUrl && (
          <iframe
            src={blobUrl}
            className="w-full h-full border-0 bg-white dark:bg-zinc-950"
            title={`${paperTitle} - Native PDF Viewer`}
          />
        )}
      </div>
    </div>
  );
}
