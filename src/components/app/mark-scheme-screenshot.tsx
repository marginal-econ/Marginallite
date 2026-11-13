import { Camera, Images, Upload, X } from "lucide-react";
import { useRef, useState, type ClipboardEvent, type DragEvent } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";

/**
 * Lets a student upload, drag-and-drop, or paste (Ctrl+V) a screenshot or
 * image file of the mark scheme straight into the examiner grader,
 * so the examiner AI can read the actual page — not just the retrieved text
 * chunks — while marking.
 */

export type MarkSchemeImage = { id: string; dataUrl: string };

const MAX_IMAGES = 4;
// Generous for a cropped screenshot of a mark scheme page; keeps the
// eventual base64 payload (and the vision call's token cost) bounded.
const MAX_BYTES = 6 * 1024 * 1024;

function firstImageFile(items: DataTransferItemList | FileList | null): File | null {
  if (!items) return null;
  for (let index = 0; index < items.length; index += 1) {
    const item = items[index];
    if (!item) continue;
    if ("getAsFile" in item) {
      if (item.type.startsWith("image/")) {
        const file = item.getAsFile();
        if (file) return file;
      }
    } else if (item.type.startsWith("image/")) {
      return item;
    }
  }
  return null;
}

export function MarkSchemeScreenshots({
  images,
  onAdd,
  onRemove,
}: {
  images: MarkSchemeImage[];
  onAdd: (image: MarkSchemeImage) => void;
  onRemove: (id: string) => void;
}) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const atLimit = images.length >= MAX_IMAGES;

  function handleFile(file: File) {
    if (atLimit) {
      toast.error(`You can attach up to ${MAX_IMAGES} mark scheme screenshots.`);
      return;
    }
    const isImage =
      file.type.startsWith("image/") ||
      /\.(jpe?g|png|webp|heic|heif|bmp|gif|avif|tiff?)$/i.test(file.name);
    if (!isImage) {
      toast.error("That item isn't an image — upload a screenshot or photo.");
      return;
    }
    if (file.size > MAX_BYTES) {
      toast.error("That screenshot is too large — try a tighter crop.");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      onAdd({ id: crypto.randomUUID(), dataUrl: reader.result as string });
      toast.success("Mark scheme screenshot attached — the examiner will read it directly.");
    };
    reader.onerror = () => toast.error("Couldn't read that image.");
    reader.readAsDataURL(file);
  }

  function handleFileInput(event: React.ChangeEvent<HTMLInputElement>) {
    const files = event.target.files;
    if (!files) return;
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      if (file) handleFile(file);
    }
    event.target.value = "";
  }

  function handlePaste(event: ClipboardEvent<HTMLDivElement>) {
    const file = firstImageFile(event.clipboardData?.items ?? null);
    if (!file) {
      toast.error("No image found on the clipboard — copy a mark scheme screenshot first.");
      return;
    }
    event.preventDefault();
    handleFile(file);
  }

  function handleDrop(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    setIsDragging(false);
    const files = event.dataTransfer?.files;
    if (files && files.length > 0) {
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        if (file && (file.type.startsWith("image/") || /\.(jpe?g|png|webp|heic|heif|bmp|gif)$/i.test(file.name))) {
          handleFile(file);
        }
      }
      return;
    }
    const file = firstImageFile(event.dataTransfer?.items ?? null);
    if (file) handleFile(file);
  }

  return (
    <div className="space-y-2">
      {/* Photo Library / Gallery Input - uncaptured to open photo gallery */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*,.heic,.heif"
        multiple
        className="hidden"
        onChange={handleFileInput}
      />
      {/* Camera Input - explicit environment capture */}
      <input
        ref={cameraInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={handleFileInput}
      />
      <div
        role="button"
        tabIndex={0}
        onClick={() => {
          if (!atLimit) fileInputRef.current?.click();
        }}
        onKeyDown={(event) => {
          if ((event.key === "Enter" || event.key === " ") && !atLimit) {
            event.preventDefault();
            fileInputRef.current?.click();
          }
        }}
        onPaste={handlePaste}
        onDragOver={(event) => {
          event.preventDefault();
          setIsDragging(true);
        }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={handleDrop}
        aria-disabled={atLimit}
        className={`flex flex-col items-center justify-center gap-1.5 rounded-lg border-2 border-dashed p-4 text-center cursor-pointer transition-colors focus:outline-none focus:ring-2 focus:ring-ring ${
          isDragging ? "border-primary bg-primary/5" : "border-border bg-background hover:bg-muted/30"
        } ${atLimit ? "opacity-60 cursor-not-allowed" : ""}`}
      >
        <Upload className="size-4 text-primary" />
        <p className="text-xs font-medium text-foreground">
          {atLimit ? (
            `Up to ${MAX_IMAGES} screenshots attached.`
          ) : (
            "Click to upload image file, drag & drop, or paste (Ctrl+V)"
          )}
        </p>
        {!atLimit ? (
          <p className="text-[11px] text-muted-foreground">
            Supports PNG, JPEG, WebP, HEIC photos, or clipboard screenshots
          </p>
        ) : null}
      </div>

      {!atLimit ? (
        <div className="flex items-center justify-center gap-2 pt-0.5">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => fileInputRef.current?.click()}
            className="h-8 gap-1.5 text-xs font-medium"
          >
            <Images className="size-3.5 text-primary" />
            Photos / Gallery
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => cameraInputRef.current?.click()}
            className="h-8 gap-1.5 text-xs font-medium"
          >
            <Camera className="size-3.5 text-primary" />
            Take Photo
          </Button>
        </div>
      ) : null}

      {images.length > 0 ? (
        <ul className="grid grid-cols-4 gap-2">
          {images.map((img) => (
            <li
              key={img.id}
              className="group relative overflow-hidden rounded-md border border-border"
            >
              <img
                src={img.dataUrl}
                alt="Mark scheme screenshot"
                className="h-16 w-full object-cover"
              />
              <button
                type="button"
                onClick={() => onRemove(img.id)}
                aria-label="Remove mark scheme screenshot"
                className="absolute right-1 top-1 rounded-full bg-background/90 p-0.5 text-muted-foreground opacity-0 shadow transition-opacity group-hover:opacity-100 focus:opacity-100"
              >
                <X className="size-3" />
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
