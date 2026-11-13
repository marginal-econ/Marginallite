import { createFileRoute, redirect } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ClipboardCheck, FileText, Loader2, Trash2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { PageHeader } from "@/components/app/app-shell";
import { AdminNavTabs } from "@/components/app/admin-nav";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { supabase } from "@/integrations/backend/client";
import { getMe } from "@/lib/account.functions";
import { extractPdfText, parseAnswerKeyFromText, type Letter } from "@/lib/mcq-parse";
import { addMcqPapers, deleteMcqPaper, listMcqPapers } from "@/lib/mcq-papers.functions";
import { isMarginalAdmin } from "@/lib/auth-admin";

const EXAM_SERIES_OPTIONS = ["Feb/March", "May/June", "Oct/Nov"] as const;
type ExamSeries = (typeof EXAM_SERIES_OPTIONS)[number];

const CURRENT_YEAR = new Date().getFullYear();
const EXAM_YEARS = Array.from({ length: 16 }, (_, i) => CURRENT_YEAR - i);

export const Route = createFileRoute("/_authenticated/mcq-papers-admin")({
  beforeLoad: async () => {
    const { data, error } = await supabase.auth.getUser();
    if (error || !data?.user) throw redirect({ to: "/auth" });
    let adminOk = isMarginalAdmin({ userId: data.user.id, email: data.user.email, claims: data.user });
    if (!adminOk) {
      try {
        const { data: roleRow } = await supabase
          .from("user_roles")
          .select("role")
          .eq("user_id", data.user.id)
          .eq("role", "admin")
          .maybeSingle();
        if (roleRow) adminOk = true;
      } catch {
        /* ignore */
      }
    }
    if (!adminOk) {
      throw redirect({ to: "/dashboard" });
    }
  },
  component: McqPapersAdminPage,
});

type Era = "legacy" | "2027";

type DraftRow = {
  key: string;
  title: string;
  paperCode: string;
  level: Era;
  examYear: number;
  examSeries: ExamSeries;
  qpFile: File;
  msFile: File | null;
  answerKey: Record<number, Letter>;
  questionCount: number;
  parsing: boolean;
};

function stem(filename: string) {
  return filename
    .replace(/\.pdf$/i, "")
    .replace(/\b(qp|ms|question.?paper|mark.?scheme)\b/gi, "")
    .trim();
}

function inferPaperCode(filename: string, _era: Era): string {
  return (
    filename.match(/\b0455[\s/_-]*(?:s|w|m)?\d{2}[\s/_-]*(\d{2})\b/i)?.[1] ??
    filename.match(/\b(?:s|w|m)\d{2}[\s/_-]*(\d{2})\b/i)?.[1] ??
    filename.match(/\bpaper[\s/_-]*(\d{2})\b/i)?.[1] ??
    "11"
  );
}

function paperCodeOptions(_era: Era) {
  return ["11", "12", "13"];
}

function completeAnswerCount(draft: DraftRow) {
  return Array.from(
    { length: draft.questionCount },
    (_, index) => draft.answerKey[index + 1],
  ).filter(Boolean).length;
}

function libraryTitle(draft: DraftRow) {
  return `0455 ${draft.examSeries} ${draft.examYear} Paper ${draft.paperCode}`;
}

function McqPapersAdminPage() {
  const fetchMe = useServerFn(getMe);
  const meQuery = useQuery({ queryKey: ["me"], queryFn: () => fetchMe() });

  const listPapersFn = useServerFn(listMcqPapers);
  const papersQuery = useQuery({ queryKey: ["mcq-papers"], queryFn: () => listPapersFn() });

  const addPapersFn = useServerFn(addMcqPapers);
  const deletePaperFn = useServerFn(deleteMcqPaper);
  const queryClient = useQueryClient();

  const [drafts, setDrafts] = useState<DraftRow[]>([]);
  const [saving, setSaving] = useState(false);
  const [removingPaperId, setRemovingPaperId] = useState<string | null>(null);

  // Gate render, not route access — beforeLoad only confirms "signed in";
  // this confirms "signed in AND staff", same two-step admin.tsx uses.
  if (meQuery.isLoading) return null;
  if (!meQuery.data?.isAdmin) {
    return (
      <div className="mx-auto max-w-md px-5 py-16 text-center">
        <p className="text-sm text-muted-foreground">
          This console is reserved exclusively for the platform administrator.
        </p>
      </div>
    );
  }

  async function handleQpFiles(files: FileList) {
    const newDrafts: DraftRow[] = [];
    for (const file of Array.from(files)) {
      newDrafts.push({
        key: crypto.randomUUID(),
        title: stem(file.name) || file.name,
        paperCode: inferPaperCode(file.name, "legacy"),
        level: "legacy",
        examYear: CURRENT_YEAR,
        examSeries: "May/June",
        qpFile: file,
        msFile: null,
        answerKey: {},
        questionCount: 30,
        parsing: true,
      });
    }
    setDrafts((prev) => [...prev, ...newDrafts]);

    for (const draft of newDrafts) {
      try {
        const text = await extractPdfText(draft.qpFile);
        // Cheap question-count guess straight off the paper itself (not the
        // scheme, which might not be attached yet): highest "N" that looks
        // like a left-margin question number. Good enough as a starting
        // value — the row stays editable either way.
        const numbers = [...text.matchAll(/\b(\d{1,2})\b/g)].map((m) => parseInt(m[1], 10));
        const guess = numbers.filter((n) => n > 0 && n <= 60).sort((a, b) => b - a)[0];
        setDrafts((prev) =>
          prev.map((d) =>
            d.key === draft.key ? { ...d, questionCount: guess || 30, parsing: false } : d,
          ),
        );
      } catch {
        setDrafts((prev) => prev.map((d) => (d.key === draft.key ? { ...d, parsing: false } : d)));
      }
    }
  }

  async function handleMsFiles(files: FileList) {
    const msFiles = Array.from(files);
    // Auto-pair each mark scheme with the question paper whose filename
    // stem is the closest match, so dropping both folders in at once
    // "just works" for the common qp_12 / ms_12 naming convention — but
    // every pairing is shown and editable below, never applied silently.
    setDrafts((prev) => {
      const next = [...prev];
      for (const ms of msFiles) {
        const msStem = stem(ms.name);
        let bestIdx = -1;
        let bestScore = -1;
        next.forEach((d, i) => {
          if (d.msFile) return;
          const qpStem = stem(d.qpFile.name);
          const score = commonPrefixLength(qpStem, msStem);
          if (score > bestScore) {
            bestScore = score;
            bestIdx = i;
          }
        });
        if (bestIdx >= 0) next[bestIdx] = { ...next[bestIdx], msFile: ms, parsing: true };
      }
      return next;
    });

    for (const ms of msFiles) {
      try {
        const text = await extractPdfText(ms);
        const key = parseAnswerKeyFromText(text);
        setDrafts((prev) =>
          prev.map((d) =>
            d.msFile === ms
              ? {
                  ...d,
                  answerKey: key,
                  questionCount:
                    Object.keys(key).length > 0
                      ? Math.max(...Object.keys(key).map(Number))
                      : d.questionCount,
                  parsing: false,
                }
              : d,
          ),
        );
      } catch {
        setDrafts((prev) => prev.map((d) => (d.msFile === ms ? { ...d, parsing: false } : d)));
      }
    }
  }

  function updateDraft(key: string, patch: Partial<DraftRow>) {
    setDrafts((prev) => prev.map((d) => (d.key === key ? { ...d, ...patch } : d)));
  }

  function removeDraft(key: string) {
    setDrafts((prev) => prev.filter((d) => d.key !== key));
  }

  /** Uploads every draft straight to storage + the library — one paper per
   *  file, no in-between review step. Every draft must have a year and
   *  series set first, so every paper that reaches the library can be
   *  browsed by year/series on the student side — nothing goes in
   *  "unlabelled". */
  async function saveDrafts() {
    if (drafts.length === 0) return;
    const missing = drafts.filter((d) => !d.examYear || !d.examSeries);
    if (missing.length > 0) {
      toast.error(
        `Set the exam year and series for ${missing.length} paper${missing.length === 1 ? "" : "s"} before continuing.`,
      );
      return;
    }
    const incomplete = drafts.filter(
      (draft) => !draft.msFile || completeAnswerCount(draft) !== draft.questionCount,
    );
    if (incomplete.length > 0) {
      toast.error(
        `Attach a complete mark scheme for ${incomplete.length} paper${incomplete.length === 1 ? "" : "s"} before publishing.`,
      );
      return;
    }

    setSaving(true);
    try {
      for (const draft of drafts) {
        const qpPath = `${crypto.randomUUID()}-${draft.qpFile.name}`;
        const { error: qpErr } = await supabase.storage
          .from("mcq-papers")
          .upload(qpPath, draft.qpFile, { contentType: "application/pdf", upsert: true });
        if (qpErr) throw new Error(`${draft.title}: ${qpErr.message}`);
        const qpUrl = supabase.storage.from("mcq-papers").getPublicUrl(qpPath).data.publicUrl;

        let msPath: string | undefined;
        let msUrl: string | undefined;
        if (draft.msFile) {
          msPath = `${crypto.randomUUID()}-${draft.msFile.name}`;
          const { error: msErr } = await supabase.storage
            .from("mcq-papers")
            .upload(msPath, draft.msFile, { contentType: "application/pdf", upsert: true });
          if (msErr) throw new Error(`${draft.title} (mark scheme): ${msErr.message}`);
          msUrl = supabase.storage.from("mcq-papers").getPublicUrl(msPath).data.publicUrl;
        }

        await addPapersFn({
          data: {
            papers: [
              {
                title: libraryTitle(draft),
                level: draft.level,
                examYear: draft.examYear,
                examSeries: draft.examSeries,
                questionCount: draft.questionCount,
                qpPath,
                qpUrl,
                msPath,
                msUrl,
                answerKey: draft.answerKey,
              },
            ],
          },
        });
      }

      toast.success(
        `Added ${drafts.length} paper${drafts.length === 1 ? "" : "s"} to the library.`,
      );
      setDrafts([]);
      queryClient.invalidateQueries({ queryKey: ["mcq-papers"] });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Couldn't save one of those papers.");
    } finally {
      setSaving(false);
    }
  }

  async function removePaper(id: string) {
    setRemovingPaperId(id);
    try {
      await deletePaperFn({ data: { id } });
      queryClient.invalidateQueries({ queryKey: ["mcq-papers"] });
      toast.success("Paper removed.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Couldn't remove that paper.");
    } finally {
      setRemovingPaperId(null);
    }
  }

  return (
    <div>
      <PageHeader
        title="MCQ paper library"
        description="Add past papers here — students can only pick from what you've added, never upload their own."
      />
      <AdminNavTabs role="admin" />

      <div className="mx-auto max-w-3xl space-y-6 px-5 py-8 md:px-8">
        <Card>
          <CardContent className="space-y-4 pt-6">
            <div>
              <p className="text-sm font-bold">Step 1 — Select the PDF files</p>
              <p className="mt-1 text-xs text-muted-foreground">
                Select question papers first. Their matching paper-detail forms appear immediately
                below; then select the mark schemes to pair them automatically.
              </p>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label className="text-xs">Question papers (select multiple)</Label>
                <Input
                  type="file"
                  accept="application/pdf"
                  multiple
                  onChange={(e) => e.target.files && handleQpFiles(e.target.files)}
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Mark schemes (select multiple, required)</Label>
                <Input
                  type="file"
                  accept="application/pdf"
                  multiple
                  onChange={(e) => e.target.files && handleMsFiles(e.target.files)}
                />
              </div>
            </div>
            <p className="text-xs text-muted-foreground">
              Mark schemes are auto-matched to the question paper with the closest filename — check
              the pairing below before continuing.
            </p>
          </CardContent>
        </Card>

        {drafts.length > 0 ? (
          <div className="space-y-5">
            <div>
              <p className="text-sm font-bold">Step 2 — Check the paper details</p>
              <p className="mt-1 text-xs text-muted-foreground">
                These are the same details students use to find a paper.
              </p>
            </div>
            {drafts.map((d, index) => {
              const answersRead = completeAnswerCount(d);
              const markSchemeComplete = !!d.msFile && answersRead === d.questionCount;
              return (
                <Card
                  key={d.key}
                  className="overflow-hidden border-2 border-foreground/80 shadow-[5px_5px_0_hsl(var(--foreground))]"
                >
                  <CardContent className="space-y-5 p-5 sm:p-6">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex min-w-0 items-start gap-3">
                        <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                          <FileText className="size-5" />
                        </span>
                        <div className="min-w-0">
                          <p className="text-xs font-bold tracking-[0.16em] text-muted-foreground uppercase">
                            Paper {index + 1}
                          </p>
                          <p className="truncate font-semibold">{d.qpFile.name}</p>
                          <p className="mt-1 text-xs text-muted-foreground">
                            Will appear as: {libraryTitle(d)}
                          </p>
                        </div>
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        aria-label={`Remove ${d.qpFile.name}`}
                        onClick={() => removeDraft(d.key)}
                      >
                        <Trash2 className="size-4" />
                      </Button>
                    </div>

                    <div className="rounded-xl border bg-muted/25 px-4 py-3">
                      <p className="text-xs font-medium text-muted-foreground">Board and subject</p>
                      <p className="mt-1 text-sm font-semibold">
                        Cambridge IGCSE · Economics (0455)
                      </p>
                    </div>

                    <div className="grid gap-4 sm:grid-cols-2">
                      <AdminPaperSelect
                        label="Year"
                        value={String(d.examYear)}
                        options={EXAM_YEARS.map(String)}
                        onChange={(value) => updateDraft(d.key, { examYear: Number(value) })}
                      />
                      <AdminPaperSelect
                        label="Exam session"
                        value={d.examSeries}
                        options={[...EXAM_SERIES_OPTIONS]}
                        onChange={(value) =>
                          updateDraft(d.key, { examSeries: value as ExamSeries })
                        }
                      />
                      <AdminPaperSelect
                        label="Assessment Era"
                        value={d.level}
                        options={["legacy", "2027"]}
                        format={(value) => (value === "legacy" ? "Legacy Era (30Q / 45m)" : "New Era (40Q / 1h)")}
                        onChange={(value) => {
                          const nextEra = value as Era;
                          updateDraft(d.key, {
                            level: nextEra,
                            questionCount: nextEra === "legacy" ? 30 : 40,
                            paperCode: paperCodeOptions(nextEra)[0],
                          });
                        }}
                      />
                      <AdminPaperSelect
                        label="Paper code"
                        value={d.paperCode}
                        options={paperCodeOptions(d.level)}
                        format={(value) => `Paper ${value}`}
                        onChange={(value) => updateDraft(d.key, { paperCode: value })}
                      />
                    </div>

                    <div className="grid gap-4 sm:grid-cols-[10rem_1fr]">
                      <div className="space-y-1.5">
                        <Label htmlFor={`question-count-${d.key}`}>Questions</Label>
                        <Input
                          id={`question-count-${d.key}`}
                          type="number"
                          min={1}
                          max={80}
                          value={d.questionCount}
                          onChange={(event) =>
                            updateDraft(d.key, {
                              questionCount: Math.min(
                                80,
                                Math.max(1, parseInt(event.target.value, 10) || 1),
                              ),
                            })
                          }
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label>Matched mark scheme</Label>
                        <div className="flex min-h-10 items-center justify-between gap-3 rounded-md border px-3 py-2 text-xs">
                          {d.parsing ? (
                            <span className="flex items-center gap-2 text-muted-foreground">
                              <Loader2 className="size-3.5 animate-spin" /> Reading mark scheme…
                            </span>
                          ) : d.msFile ? (
                            <span className="min-w-0 truncate">{d.msFile.name}</span>
                          ) : (
                            <span className="text-destructive">No mark scheme matched</span>
                          )}
                          {!d.parsing ? (
                            <Badge variant={markSchemeComplete ? "secondary" : "destructive"}>
                              {answersRead}/{d.questionCount} answers
                            </Badge>
                          ) : null}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}

            <Card>
              <CardContent className="space-y-3 pt-6">
                <Button onClick={saveDrafts} disabled={saving} className="w-full">
                  {saving ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <ClipboardCheck className="mr-2 h-4 w-4" />
                  )}
                  Publish {drafts.length} paper{drafts.length === 1 ? "" : "s"}
                </Button>
                <p className="text-xs text-muted-foreground">
                  Every paper needs a complete mark scheme. Students will see these same year,
                  session, era, and paper-code fields in their selector.
                </p>
              </CardContent>
            </Card>
          </div>
        ) : (
          <Card className="border-dashed">
            <CardContent className="py-8 text-center">
              <FileText className="mx-auto size-8 text-primary" />
              <p className="mt-3 text-sm font-bold">Step 2 — Paper details will appear here</p>
              <p className="mx-auto mt-1 max-w-md text-xs text-muted-foreground">
                Choose at least one question-paper PDF above. You will then set its year, exam
                session, era, paper code, and question count before publishing.
              </p>
              <div className="mx-auto mt-5 grid max-w-lg grid-cols-2 gap-2 text-left sm:grid-cols-5">
                {["Year", "Session", "Era", "Paper code", "Questions"].map((field) => (
                  <div key={field} className="rounded-lg border bg-muted/30 px-3 py-2">
                    <p className="text-[10px] font-semibold tracking-wide text-muted-foreground uppercase">
                      {field}
                    </p>
                    <p className="mt-1 text-xs font-medium">Select after upload</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        <div>
          <h2 className="mb-3 text-sm font-semibold">
            In the library ({papersQuery.data?.papers.length ?? 0})
          </h2>
          <div className="space-y-2">
            {(papersQuery.data?.papers ?? []).map((p) => (
              <Card key={p.id}>
                <CardContent className="flex items-center justify-between gap-3 py-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">{p.title}</p>
                    <p className="text-xs text-muted-foreground">
                      {p.level === "2027" ? "NEW ERA (2027+)" : "LEGACY"}
                      {p.examSeries && p.examYear ? ` · ${p.examSeries} ${p.examYear}` : ""} ·{" "}
                      {p.questionCount} questions ·{" "}
                      {Object.keys(p.answerKey).length > 0 ? "markable" : "no mark scheme yet"}
                    </p>
                  </div>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 shrink-0"
                        aria-label={`Remove ${p.title}`}
                        disabled={removingPaperId === p.id}
                      >
                        {removingPaperId === p.id ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                          <Trash2 className="h-3.5 w-3.5" />
                        )}
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Remove "{p.title}"?</AlertDialogTitle>
                        <AlertDialogDescription>
                          This takes it out of the shared library — students will no longer see it
                          as a paper to practice, and any past attempts against it keep their scores
                          but lose the link back to it. This can't be undone.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                          onClick={(e) => {
                            e.preventDefault();
                            removePaper(p.id);
                          }}
                        >
                          Remove
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function AdminPaperSelect({
  label,
  value,
  options,
  format = (option) => option,
  onChange,
}: {
  label: string;
  value: string;
  options: string[];
  format?: (option: string) => string;
  onChange: (value: string) => void;
}) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
        {label}
      </Label>
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger className="h-11 w-full rounded-xl border-2 border-foreground/80 bg-background font-semibold">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {options.map((option) => (
            <SelectItem key={option} value={option}>
              {format(option)}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

function commonPrefixLength(a: string, b: string) {
  const al = a.toLowerCase();
  const bl = b.toLowerCase();
  let i = 0;
  while (i < al.length && i < bl.length && al[i] === bl[i]) i++;
  return i;
}
