/**
 * Staff-only UI: extract real past-paper MCQ/essay questions from pasted
 * or uploaded QP(+MS) text, then review/edit/approve/reject each candidate
 * before it becomes visible to students. Lives on its own page
 * (/content-admin), separate from the Knowledge base's course-material
 * library.
 */
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { CheckCircle2, Loader2, Sparkles, Trash2, Upload, XCircle } from "lucide-react";
import { useRef, useState } from "react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { EconomicsDiagram } from "@/components/diagrams/economics-diagram";
import { DiagramCropDialog } from "@/components/app/diagram-crop-dialog";
import {
  deleteBankQuestion,
  extractBankQuestions,
  listBankQuestionsForReview,
  setBankQuestionStatus,
  updateBankEssayQuestion,
  updateBankMcqQuestion,
} from "@/lib/bank.functions";
import { DIAGRAMS, getDiagram } from "@/lib/diagrams/catalog";
import { extractTextFromFile } from "@/lib/extract-text";
import { isPdfFile, ocrImage, ocrPdf } from "@/lib/pdf-ocr";
import { supabase } from "@/integrations/backend/client";
import { cn } from "@/lib/utils";

type Kind = "mcq" | "essay";
type Status = "pending_review" | "approved" | "rejected";

type BankMcqRow = {
  id: string;
  stem: string;
  options: Record<"A" | "B" | "C" | "D", string>;
  answer: "A" | "B" | "C" | "D";
  explanation: string;
  topic: string;
  status: Status;
  exam_series: string | null;
  diagram_id: string | null;
  diagram_image_url: string | null;
};

type BankEssayRow = {
  id: string;
  question_text: string;
  topic: string;
  max_mark: number;
  status: Status;
  exam_series: string | null;
};

export function QuestionBankAdmin() {
  const queryClient = useQueryClient();
  const extract = useServerFn(extractBankQuestions);
  const fetchForReview = useServerFn(listBankQuestionsForReview);
  const setStatus = useServerFn(setBankQuestionStatus);
  const removeQuestion = useServerFn(deleteBankQuestion);
  const updateMcq = useServerFn(updateBankMcqQuestion);
  const updateEssay = useServerFn(updateBankEssayQuestion);

  const [kind, setKind] = useState<Kind>("mcq");
  const [era, setEra] = useState<"legacy" | "2027">("legacy");
  const [examSeries, setExamSeries] = useState("");
  const [qpText, setQpText] = useState("");
  const [msText, setMsText] = useState("");
  const [statusFilter, setStatusFilter] = useState<Status>("pending_review");
  const [reading, setReading] = useState<"qp" | "ms" | null>(null);

  // Kept around (not discarded after OCR) so "attach the exact diagram"
  // during review can rasterize the real page a question came from —
  // extraction only needs the text, this is purely for the crop tool.
  const [qpFile, setQpFile] = useState<File | null>(null);
  const [qpPages, setQpPages] = useState<string[] | null>(null);
  const [rasterizing, setRasterizing] = useState(false);
  const [cropTargetId, setCropTargetId] = useState<string | null>(null);

  const qpFileRef = useRef<HTMLInputElement>(null);
  const msFileRef = useRef<HTMLInputElement>(null);

  const review = useQuery({
    queryKey: ["bank-review", kind, statusFilter],
    queryFn: () => fetchForReview({ data: { kind, status: statusFilter } }),
  });

  const readOne = async (file: File, onProgress: (label: string) => void): Promise<string> => {
    if (isPdfFile(file)) return (await ocrPdf(file, onProgress)).text;
    if (file.type.startsWith("image/")) {
      onProgress("OCR'ing photo…");
      const text = await ocrImage(file);
      if (!text || text.length < 50) {
        throw new Error(
          "Could not read enough printed text from that photo. Try a brighter, straight-on photo, or upload the paper as a PDF instead.",
        );
      }
      return text;
    }
    return extractTextFromFile(file, () => onProgress("Reading file…"));
  };

  const handleFile = async (which: "qp" | "ms", file: File | undefined) => {
    if (!file) return;
    setReading(which);
    try {
      const text = await readOne(file, () => {});
      if (which === "qp") {
        setQpText(text);
        setQpFile(file);
        setQpPages(null); // stale pages from a previous paper — rasterize again below
        // Eagerly rasterize the QP into page images (when it's a PDF or photo) so
        // extraction can go through the vision path and read the paper's real
        // diagrams/data tables instead of trusting OCR'd text alone. Best-effort:
        // if rasterization fails for any reason, extraction still runs on the
        // text above, just without the vision accuracy boost.
        if (isPdfFile(file) || file.type.startsWith("image/")) {
          try {
            const { filesToPageImages } = await import("@/lib/handwriting-images");
            const pages = await filesToPageImages([file]);
            setQpPages(pages);
          } catch (rasterError) {
            console.warn("Could not rasterize question paper for vision extraction:", rasterError);
          }
        }
      } else setMsText(text);
      toast.success(`Loaded ${file.name}.`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not read that file.");
    } finally {
      setReading(null);
    }
  };

  /** Rasterizes the retained QP file into page images, once, on first use. */
  const ensurePages = async (): Promise<string[]> => {
    if (qpPages) return qpPages;
    if (!qpFile)
      throw new Error("Re-upload the original question paper file to attach a diagram from it.");
    setRasterizing(true);
    try {
      const { filesToPageImages } = await import("@/lib/handwriting-images");
      const pages = await filesToPageImages([qpFile]);
      setQpPages(pages);
      return pages;
    } finally {
      setRasterizing(false);
    }
  };

  const openCropFor = async (questionId: string) => {
    try {
      await ensurePages();
      setCropTargetId(questionId);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not open the original paper.");
    }
  };

  /** Uploads a crop to the bank-diagrams bucket and returns its public URL. */
  const uploadDiagramCrop = async (questionId: string, blob: Blob): Promise<string> => {
    const path = `${questionId}-${Date.now()}.jpg`;
    const { error } = await supabase.storage
      .from("bank-diagrams")
      .upload(path, blob, { contentType: "image/jpeg", upsert: true });
    if (error) throw new Error(error.message);
    const { data } = supabase.storage.from("bank-diagrams").getPublicUrl(path);
    return data.publicUrl;
  };

  const extractMutation = useMutation({
    mutationFn: () =>
      extract({
        data: {
          kind,
          era,
          qpText: qpText.trim(),
          msText: msText.trim() || undefined,
          examSeries: examSeries.trim() || undefined,
          qpImages: qpPages?.slice(0, 14) ?? undefined,
        },
      }),
    onSuccess: (result) => {
      toast.success(
        `Extracted ${result.inserted.length} question${result.inserted.length === 1 ? "" : "s"} — review them below.`,
      );
      setQpText("");
      setMsText("");
      setStatusFilter("pending_review");
      queryClient.invalidateQueries({ queryKey: ["bank-review", kind] });
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const act = async (id: string, status: Status) => {
    try {
      await setStatus({ data: { kind, id, status } });
      queryClient.invalidateQueries({ queryKey: ["bank-review", kind] });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not update that question.");
    }
  };

  const remove = async (id: string) => {
    try {
      await removeQuestion({ data: { kind, id } });
      queryClient.invalidateQueries({ queryKey: ["bank-review", kind] });
      toast.success("Removed.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not remove that question.");
    }
  };

  const rows = (review.data ?? []) as (BankMcqRow | BankEssayRow)[];

  return (
    <div className="grid gap-6 px-5 py-6 md:px-8 lg:grid-cols-[minmax(0,420px)_minmax(0,1fr)]">
      <div className="panel space-y-4 p-5">
        <div>
          <h2 className="text-sm font-semibold">Extract from a real past paper</h2>
          <p className="mt-1 text-xs text-muted-foreground">
            Paste or upload a real question paper (and mark scheme, for MCQ) — the AI transcribes
            discrete questions into a review queue. Nothing reaches students until you approve it
            below.
          </p>
        </div>

        <div className="space-y-1.5">
          <Label>Question type</Label>
          <Tabs value={kind} onValueChange={(value) => setKind(value as Kind)}>
            <TabsList className="w-full">
              <TabsTrigger value="mcq" className="flex-1">
                Multiple choice
              </TabsTrigger>
              <TabsTrigger value="essay" className="flex-1">
                Essay questions
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label>Assessment Era</Label>
            <Select value={era} onValueChange={(value) => setEra(value as "legacy" | "2027")}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="legacy">Legacy Era (≤ June 2026)</SelectItem>
                <SelectItem value="2027">New Era (2027–2029)</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="bank-series">Series (optional)</Label>
            <Input
              id="bank-series"
              value={examSeries}
              placeholder="Nov 2024"
              onChange={(event) => setExamSeries(event.target.value)}
            />
          </div>
        </div>

        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <Label htmlFor="qp-text">Question paper text</Label>
            <input
              ref={qpFileRef}
              type="file"
              accept=".pdf,.txt,.md,.jpg,.jpeg,.png,.webp,application/pdf,text/plain,image/*"
              className="hidden"
              onChange={(event) => void handleFile("qp", event.target.files?.[0])}
            />
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-6 px-2 text-xs"
              disabled={reading !== null}
              onClick={() => qpFileRef.current?.click()}
            >
              {reading === "qp" ? (
                <Loader2 className="size-3 animate-spin" />
              ) : (
                <Upload className="size-3" />
              )}
              Upload PDF or photo
            </Button>
          </div>
          <Textarea
            id="qp-text"
            rows={7}
            value={qpText}
            onChange={(event) => setQpText(event.target.value)}
            placeholder="Paste the real question paper text here, or upload a PDF/photo above…"
          />
          {qpPages && qpPages.length > 0 ? (
            <p className="flex items-center gap-1 text-[11px] text-muted-foreground">
              <Sparkles className="size-3 text-primary" />
              Vision extraction active — reading {qpPages.length} real page image
              {qpPages.length === 1 ? "" : "s"} for diagrams and data tables, not just the text
              above.
            </p>
          ) : null}
        </div>

        {kind === "mcq" ? (
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <Label htmlFor="ms-text">Mark scheme text (recommended)</Label>
              <input
                ref={msFileRef}
                type="file"
                accept=".pdf,.txt,.md,application/pdf,text/plain"
                className="hidden"
                onChange={(event) => void handleFile("ms", event.target.files?.[0])}
              />
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-6 px-2 text-xs"
                disabled={reading !== null}
                onClick={() => msFileRef.current?.click()}
              >
                {reading === "ms" ? (
                  <Loader2 className="size-3 animate-spin" />
                ) : (
                  <Upload className="size-3" />
                )}
                Upload PDF
              </Button>
            </div>
            <Textarea
              id="ms-text"
              rows={5}
              value={msText}
              onChange={(event) => setMsText(event.target.value)}
              placeholder="Paste the mark scheme's answer key — used to pin down the correct letter accurately."
            />
          </div>
        ) : null}

        <Button
          className="w-full"
          disabled={extractMutation.isPending || qpText.trim().length < 200}
          onClick={() => extractMutation.mutate()}
        >
          {extractMutation.isPending ? (
            <>
              <Loader2 className="size-4 animate-spin" /> Extracting questions…
            </>
          ) : (
            <>
              <Sparkles className="size-4" /> Extract questions
            </>
          )}
        </Button>
      </div>

      <div className="panel">
        <div className="flex items-center justify-between border-b border-border px-5 py-3.5">
          <h2 className="text-sm font-semibold">Review queue</h2>
          <Tabs value={statusFilter} onValueChange={(value) => setStatusFilter(value as Status)}>
            <TabsList>
              <TabsTrigger value="pending_review">Pending</TabsTrigger>
              <TabsTrigger value="approved">Approved</TabsTrigger>
              <TabsTrigger value="rejected">Rejected</TabsTrigger>
            </TabsList>
          </Tabs>
        </div>

        {review.isLoading ? (
          <p className="px-5 py-12 text-center text-sm text-muted-foreground">Loading…</p>
        ) : rows.length === 0 ? (
          <p className="px-5 py-12 text-center text-sm text-muted-foreground">Nothing here yet.</p>
        ) : (
          <ul className="divide-y divide-border">
            {rows.map((row) =>
              kind === "mcq" ? (
                <McqReviewRow
                  key={row.id}
                  row={row as BankMcqRow}
                  onApprove={() => act(row.id, "approved")}
                  onReject={() => act(row.id, "rejected")}
                  onDelete={() => remove(row.id)}
                  onSave={async (patch) => {
                    await updateMcq({ data: { id: row.id, ...patch } });
                    queryClient.invalidateQueries({ queryKey: ["bank-review", kind] });
                  }}
                  onAttachDiagram={qpFile ? () => openCropFor(row.id) : undefined}
                  attachingDiagram={rasterizing}
                  onUploadDiagram={async (file: File) => {
                    const url = await uploadDiagramCrop(row.id, file);
                    await updateMcq({ data: { id: row.id, diagramImageUrl: url } });
                    queryClient.invalidateQueries({ queryKey: ["bank-review", kind] });
                    toast.success("Diagram image uploaded and attached.");
                  }}
                />
              ) : (
                <EssayReviewRow
                  key={row.id}
                  row={row as BankEssayRow}
                  onApprove={() => act(row.id, "approved")}
                  onReject={() => act(row.id, "rejected")}
                  onDelete={() => remove(row.id)}
                  onSave={async (patch) => {
                    await updateEssay({ data: { id: row.id, ...patch } });
                    queryClient.invalidateQueries({ queryKey: ["bank-review", kind] });
                  }}
                />
              ),
            )}
          </ul>
        )}
      </div>

      <DiagramCropDialog
        open={cropTargetId !== null}
        onOpenChange={(open) => {
          if (!open) setCropTargetId(null);
        }}
        pageImages={qpPages ?? []}
        onConfirm={async (blob) => {
          if (!cropTargetId) return;
          const url = await uploadDiagramCrop(cropTargetId, blob);
          await updateMcq({ data: { id: cropTargetId, diagramImageUrl: url } });
          queryClient.invalidateQueries({ queryKey: ["bank-review", kind] });
          toast.success("Diagram attached.");
        }}
      />
    </div>
  );
}

function McqReviewRow({
  row,
  onApprove,
  onReject,
  onDelete,
  onSave,
  onAttachDiagram,
  attachingDiagram,
  onUploadDiagram,
}: {
  row: BankMcqRow;
  onApprove: () => void;
  onReject: () => void;
  onDelete: () => void;
  onSave: (patch: {
    stem?: string;
    options?: Record<"A" | "B" | "C" | "D", string>;
    answer?: "A" | "B" | "C" | "D";
    topic?: string;
    diagramId?: string | null;
    diagramImageUrl?: string | null;
  }) => Promise<void>;
  /** Undefined when no original paper file is available this session (e.g. after a page reload). */
  onAttachDiagram?: () => void;
  attachingDiagram?: boolean;
  onUploadDiagram?: (file: File) => Promise<void>;
}) {
  const [editing, setEditing] = useState(false);
  const [stem, setStem] = useState(row.stem);
  const [options, setOptions] = useState(row.options);
  const [answer, setAnswer] = useState(row.answer);
  const [topic, setTopic] = useState(row.topic);
  const [diagramId, setDiagramId] = useState<string | null>(row.diagram_id);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const uploadInputRef = useRef<HTMLInputElement>(null);

  const diagram = getDiagram(diagramId);

  return (
    <li className="space-y-2.5 px-5 py-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1 space-y-1">
          <div className="flex flex-wrap items-center gap-1.5">
            <Badge variant="outline">{topic || "General"}</Badge>
            {row.exam_series ? <Badge variant="secondary">{row.exam_series}</Badge> : null}
            {row.diagram_image_url ? (
              <Badge>Exact diagram attached</Badge>
            ) : diagramId ? (
              <Badge variant="secondary">Diagram matched</Badge>
            ) : null}
          </div>
          {!editing ? (
            <p className="text-sm">{stem}</p>
          ) : (
            <Textarea rows={2} value={stem} onChange={(event) => setStem(event.target.value)} />
          )}
        </div>
        <div className="flex shrink-0 gap-1">
          {onAttachDiagram ? (
            <Button
              variant="ghost"
              size="sm"
              onClick={onAttachDiagram}
              disabled={attachingDiagram || uploading}
            >
              {attachingDiagram ? (
                <Loader2 className="size-3.5 animate-spin" />
              ) : row.diagram_image_url ? (
                "Re-crop"
              ) : (
                "Crop from paper"
              )}
            </Button>
          ) : null}
          {onUploadDiagram ? (
            <>
              <input
                ref={uploadInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={async (e) => {
                  const file = e.target.files?.[0];
                  if (!file) return;
                  setUploading(true);
                  try {
                    await onUploadDiagram(file);
                  } catch (err) {
                    toast.error(err instanceof Error ? err.message : "Failed to upload diagram.");
                  } finally {
                    setUploading(false);
                    e.target.value = "";
                  }
                }}
              />
              <Button
                variant="ghost"
                size="sm"
                onClick={() => uploadInputRef.current?.click()}
                disabled={uploading}
                title="Upload diagram image file directly"
              >
                {uploading ? (
                  <Loader2 className="size-3.5 animate-spin" />
                ) : (
                  <>
                    <Upload className="mr-1 size-3.5" />
                    {row.diagram_image_url ? "Replace image" : "Upload image"}
                  </>
                )}
              </Button>
            </>
          ) : null}
          <Button variant="ghost" size="sm" onClick={() => setEditing((v) => !v)}>
            {editing ? "Done" : "Edit"}
          </Button>
          <Button variant="ghost" size="icon" onClick={onDelete}>
            <Trash2 className="size-4" />
          </Button>
        </div>
      </div>

      {row.diagram_image_url ? (
        <div className="rounded-md border border-border bg-muted/30 p-3">
          <div className="mb-2 flex items-center justify-between gap-2">
            <p className="text-xs font-medium text-muted-foreground">
              Exact diagram, cropped from the original paper
            </p>
            <Button
              variant="ghost"
              size="sm"
              className="h-6 px-2 text-xs text-destructive hover:text-destructive"
              onClick={async () => {
                await onSave({ diagramImageUrl: null });
                toast.success("Diagram removed.");
              }}
            >
              Remove
            </Button>
          </div>
          <img
            src={row.diagram_image_url}
            alt="Diagram cropped from the original paper"
            className="mx-auto max-h-64 rounded-sm"
          />
        </div>
      ) : diagram ? (
        <div className="rounded-md border border-border bg-muted/30 p-3">
          <div className="mb-2 flex items-center justify-between gap-2">
            <p className="text-xs font-medium text-muted-foreground">
              Matched diagram — check this is actually what the real paper shows
            </p>
            <Button
              variant="ghost"
              size="sm"
              className="h-6 px-2 text-xs text-destructive hover:text-destructive"
              onClick={async () => {
                setDiagramId(null);
                await onSave({ diagramId: null });
                toast.success("Diagram removed.");
              }}
            >
              Wrong match, remove
            </Button>
          </div>
          <EconomicsDiagram
            spec={diagram.spec}
            title={diagram.title}
            className="mx-auto max-w-xs"
          />
        </div>
      ) : null}

      {editing ? (
        <div className="space-y-1">
          <Label className="text-xs text-muted-foreground">
            Diagram (if this question refers to one)
          </Label>
          <Select
            value={diagramId ?? "__none__"}
            onValueChange={(value) => setDiagramId(value === "__none__" ? null : value)}
          >
            <SelectTrigger className="h-8 text-xs">
              <SelectValue placeholder="No diagram" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__none__">No diagram</SelectItem>
              {DIAGRAMS.map((entry) => (
                <SelectItem key={entry.id} value={entry.id}>
                  {entry.title} ({entry.topic})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      ) : null}

      <ul className="space-y-1 text-xs">
        {(["A", "B", "C", "D"] as const).map((letter) => (
          <li key={letter} className="flex items-center gap-2">
            <button
              type="button"
              disabled={!editing}
              onClick={() => setAnswer(letter)}
              className={cn(
                "flex size-5 shrink-0 items-center justify-center rounded-full border text-[10px] font-semibold",
                answer === letter
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-border text-muted-foreground",
              )}
            >
              {letter}
            </button>
            {!editing ? (
              <span className={cn(answer === letter && "font-medium")}>{options[letter]}</span>
            ) : (
              <Input
                className="h-7 text-xs"
                value={options[letter]}
                onChange={(event) =>
                  setOptions((current) => ({ ...current, [letter]: event.target.value }))
                }
              />
            )}
          </li>
        ))}
      </ul>

      {editing ? (
        <div className="flex items-center gap-2">
          <Input
            className="h-7 flex-1 text-xs"
            value={topic}
            onChange={(event) => setTopic(event.target.value)}
            placeholder="Topic"
          />
          <Button
            size="sm"
            disabled={saving}
            onClick={async () => {
              setSaving(true);
              try {
                await onSave({ stem, options, answer, topic, diagramId });
                setEditing(false);
                toast.success("Saved.");
              } finally {
                setSaving(false);
              }
            }}
          >
            {saving ? <Loader2 className="size-3.5 animate-spin" /> : "Save"}
          </Button>
        </div>
      ) : null}

      {row.status === "pending_review" ? (
        <div className="flex gap-2 pt-1">
          <Button size="sm" onClick={onApprove}>
            <CheckCircle2 className="size-3.5" /> Approve
          </Button>
          <Button size="sm" variant="outline" onClick={onReject}>
            <XCircle className="size-3.5" /> Reject
          </Button>
        </div>
      ) : (
        <Badge variant={row.status === "approved" ? "default" : "destructive"}>
          {row.status === "approved" ? "Approved" : "Rejected"}
        </Badge>
      )}
    </li>
  );
}

function EssayReviewRow({
  row,
  onApprove,
  onReject,
  onDelete,
  onSave,
}: {
  row: BankEssayRow;
  onApprove: () => void;
  onReject: () => void;
  onDelete: () => void;
  onSave: (patch: { questionText?: string; topic?: string; maxMark?: number }) => Promise<void>;
}) {
  const [editing, setEditing] = useState(false);
  const [questionText, setQuestionText] = useState(row.question_text);
  const [topic, setTopic] = useState(row.topic);
  const [maxMark, setMaxMark] = useState(row.max_mark);
  const [saving, setSaving] = useState(false);

  return (
    <li className="space-y-2.5 px-5 py-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1 space-y-1">
          <div className="flex flex-wrap items-center gap-1.5">
            <Badge variant="outline">{topic || "General"}</Badge>
            <Badge variant="secondary">{maxMark} marks</Badge>
            {row.exam_series ? <Badge variant="secondary">{row.exam_series}</Badge> : null}
          </div>
          {!editing ? (
            <p className="text-sm">{questionText}</p>
          ) : (
            <Textarea
              rows={3}
              value={questionText}
              onChange={(event) => setQuestionText(event.target.value)}
            />
          )}
        </div>
        <div className="flex shrink-0 gap-1">
          <Button variant="ghost" size="sm" onClick={() => setEditing((v) => !v)}>
            {editing ? "Done" : "Edit"}
          </Button>
          <Button variant="ghost" size="icon" onClick={onDelete}>
            <Trash2 className="size-4" />
          </Button>
        </div>
      </div>

      {editing ? (
        <div className="flex items-center gap-2">
          <Input
            className="h-7 flex-1 text-xs"
            value={topic}
            onChange={(event) => setTopic(event.target.value)}
            placeholder="Topic"
          />
          <Select value={String(maxMark)} onValueChange={(value) => setMaxMark(Number(value))}>
            <SelectTrigger className="h-7 w-24 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="8">8 marks</SelectItem>
              <SelectItem value="12">12 marks</SelectItem>
              <SelectItem value="20">20 marks</SelectItem>
            </SelectContent>
          </Select>
          <Button
            size="sm"
            disabled={saving}
            onClick={async () => {
              setSaving(true);
              try {
                await onSave({ questionText, topic, maxMark });
                setEditing(false);
                toast.success("Saved.");
              } finally {
                setSaving(false);
              }
            }}
          >
            {saving ? <Loader2 className="size-3.5 animate-spin" /> : "Save"}
          </Button>
        </div>
      ) : null}

      {row.status === "pending_review" ? (
        <div className="flex gap-2 pt-1">
          <Button size="sm" onClick={onApprove}>
            <CheckCircle2 className="size-3.5" /> Approve
          </Button>
          <Button size="sm" variant="outline" onClick={onReject}>
            <XCircle className="size-3.5" /> Reject
          </Button>
        </div>
      ) : (
        <Badge variant={row.status === "approved" ? "default" : "destructive"}>
          {row.status === "approved" ? "Approved" : "Rejected"}
        </Badge>
      )}
    </li>
  );
}
