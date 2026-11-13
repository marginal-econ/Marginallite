import { ChevronLeft, ChevronRight, Loader2 } from "lucide-react";
import { useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

type Box = { x: number; y: number; w: number; h: number };

/**
 * Draw-to-crop over a rasterized page of the actual uploaded paper. This is
 * the "exact diagram" path — the AI never touches the image, a teacher
 * draws the box, so what a student sees is pixel-for-pixel what's on the
 * real paper.
 */
export function DiagramCropDialog({
  open,
  onOpenChange,
  pageImages,
  onConfirm,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Data URLs, one per page of the paper this question came from. */
  pageImages: string[];
  onConfirm: (blob: Blob) => Promise<void>;
}) {
  const [pageIndex, setPageIndex] = useState(0);
  const [box, setBox] = useState<Box | null>(null);
  const [dragStart, setDragStart] = useState<{ x: number; y: number } | null>(null);
  const [saving, setSaving] = useState(false);
  const imgRef = useRef<HTMLImageElement>(null);

  const page = pageImages[pageIndex];

  const relativePoint = (event: React.MouseEvent) => {
    const rect = imgRef.current!.getBoundingClientRect();
    const x = Math.min(Math.max(event.clientX - rect.left, 0), rect.width);
    const y = Math.min(Math.max(event.clientY - rect.top, 0), rect.height);
    return { x, y, rect };
  };

  const startDrag = (event: React.MouseEvent) => {
    const { x, y } = relativePoint(event);
    setDragStart({ x, y });
    setBox({ x, y, w: 0, h: 0 });
  };

  const moveDrag = (event: React.MouseEvent) => {
    if (!dragStart) return;
    const { x, y } = relativePoint(event);
    setBox({
      x: Math.min(dragStart.x, x),
      y: Math.min(dragStart.y, y),
      w: Math.abs(x - dragStart.x),
      h: Math.abs(y - dragStart.y),
    });
  };

  const endDrag = () => setDragStart(null);

  const reset = () => {
    setBox(null);
    setDragStart(null);
  };

  const changePage = (next: number) => {
    setPageIndex(next);
    reset();
  };

  const confirm = async () => {
    if (!box || box.w < 8 || box.h < 8 || !imgRef.current) return;
    setSaving(true);
    try {
      const img = imgRef.current;
      const scaleX = img.naturalWidth / img.clientWidth;
      const scaleY = img.naturalHeight / img.clientHeight;

      const canvas = document.createElement("canvas");
      canvas.width = Math.round(box.w * scaleX);
      canvas.height = Math.round(box.h * scaleY);
      const ctx = canvas.getContext("2d");
      if (!ctx) throw new Error("Could not create a canvas to crop with.");
      ctx.drawImage(
        img,
        box.x * scaleX,
        box.y * scaleY,
        box.w * scaleX,
        box.h * scaleY,
        0,
        0,
        canvas.width,
        canvas.height,
      );

      const blob: Blob = await new Promise((resolve, reject) =>
        canvas.toBlob(
          (result) => (result ? resolve(result) : reject(new Error("Could not export the crop."))),
          "image/jpeg",
          0.92,
        ),
      );

      await onConfirm(blob);
      reset();
      onOpenChange(false);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Attach the exact diagram</DialogTitle>
          <DialogDescription>
            Click and drag on the page below to draw a box around the real figure as printed on the
            paper. That exact crop is what students will see — not a redrawn approximation.
          </DialogDescription>
        </DialogHeader>

        {pageImages.length > 1 ? (
          <div className="flex items-center justify-center gap-3">
            <Button
              type="button"
              variant="outline"
              size="icon"
              className="size-7"
              disabled={pageIndex === 0}
              onClick={() => changePage(pageIndex - 1)}
            >
              <ChevronLeft className="size-4" />
            </Button>
            <span className="text-xs text-muted-foreground">
              Page {pageIndex + 1} of {pageImages.length}
            </span>
            <Button
              type="button"
              variant="outline"
              size="icon"
              className="size-7"
              disabled={pageIndex === pageImages.length - 1}
              onClick={() => changePage(pageIndex + 1)}
            >
              <ChevronRight className="size-4" />
            </Button>
          </div>
        ) : null}

        <div
          className="relative mx-auto max-h-[60vh] w-full cursor-crosshair select-none overflow-auto rounded-md border border-border bg-muted/30"
          onMouseDown={startDrag}
          onMouseMove={moveDrag}
          onMouseUp={endDrag}
          onMouseLeave={endDrag}
        >
          {page ? (
            <img
              ref={imgRef}
              src={page}
              alt={`Page ${pageIndex + 1}`}
              className="pointer-events-none block w-full select-none"
              draggable={false}
            />
          ) : null}
          {box ? (
            <div
              className="pointer-events-none absolute border-2 border-primary bg-primary/15"
              style={{ left: box.x, top: box.y, width: box.w, height: box.h }}
            />
          ) : null}
        </div>

        <DialogFooter className="flex items-center justify-between sm:justify-between">
          <Button type="button" variant="ghost" size="sm" onClick={reset} disabled={!box}>
            Clear box
          </Button>
          <Button
            type="button"
            size="sm"
            disabled={!box || box.w < 8 || box.h < 8 || saving}
            onClick={confirm}
          >
            {saving ? (
              <>
                <Loader2 className="size-3.5 animate-spin" /> Saving…
              </>
            ) : (
              "Use this crop"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
