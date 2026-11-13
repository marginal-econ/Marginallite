import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import {
  ArrowLeft,
  CheckCircle2,
  Columns2,
  FileText,
  GraduationCap,
  History,
  Loader2,
  PenLine,
  RefreshCw,
  ShieldCheck,
  Sparkles,
  TrendingUp,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

import { PageHeader } from "@/components/app/app-shell";
import { MarkBreakdown } from "@/components/app/mark-breakdown";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { getEssayThread, gradeEssaySubmission } from "@/lib/grading.functions";
import type { Grading } from "@/lib/examiner/types";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/essay/$essayId")({
  head: () => ({
    meta: [
      { title: "Response Report — Cambridge 0455 Economics" },
      {
        name: "description",
        content:
          "Full examiner report for your Cambridge 0455 Economics response, with rewrite progression tracked against earlier attempts.",
      },
      { property: "og:title", content: "Response Report — Cambridge 0455 Economics" },
      {
        property: "og:description",
        content: "Mark, AO breakdown, and rewrite history for a single essay.",
      },
    ],
  }),
  component: EssayPage,
});

function EssayPage() {
  const { essayId } = Route.useParams();
  const queryClient = useQueryClient();
  const fetchThread = useServerFn(getEssayThread);
  const grade = useServerFn(gradeEssaySubmission);

  const thread = useQuery({
    queryKey: ["essay", essayId],
    queryFn: () => fetchThread({ data: { essayId } }),
  });

  const versions = useMemo(() => thread.data?.versions ?? [], [thread.data?.versions]);
  const [selected, setSelected] = useState<number | null>(null);
  const [rewrite, setRewrite] = useState("");
  const [rewriting, setRewriting] = useState(false);
  const [viewMode, setViewMode] = useState<"split" | "report" | "script">("split");

  const activeIndex = selected ?? Math.max(versions.length - 1, 0);
  const active = versions[activeIndex];
  const maxMark = thread.data?.essay.max_mark ?? 12;

  useEffect(() => {
    if (active && !rewrite) setRewrite(active.essay_text);
  }, [active, rewrite]);

  const mutation = useMutation({
    mutationFn: () =>
      grade({
        data: {
          question: thread.data!.essay.question,
          essayText: rewrite,
          maxMark,
          essayId,
          auditPass: true,
        },
      }),
    onSuccess: (data) => {
      const previous = active?.total_mark ?? 0;
      const gained = data.grading.total_mark - previous;
      toast.success(
        gained > 0
          ? `${data.grading.total_mark}/${data.grading.max_mark} — up ${gained} mark${gained === 1 ? "" : "s"}!`
          : `${data.grading.total_mark}/${data.grading.max_mark}`,
      );
      setSelected(null);
      setRewriting(false);
      queryClient.invalidateQueries({ queryKey: ["essay", essayId] });
      queryClient.invalidateQueries({ queryKey: ["progress"] });
      queryClient.invalidateQueries({ queryKey: ["essays"] });
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const wordCount = active?.essay_text
    ? active.essay_text.trim().split(/\s+/).filter(Boolean).length
    : 0;
  const rewriteWordCount = rewrite.trim() ? rewrite.trim().split(/\s+/).filter(Boolean).length : 0;

  // Previous attempt delta
  const previousAttempt = activeIndex > 0 ? versions[activeIndex - 1] : null;
  const markDelta =
    previousAttempt && active?.total_mark != null && previousAttempt.total_mark != null
      ? active.total_mark - previousAttempt.total_mark
      : null;

  if (thread.isLoading) {
    return (
      <div className="space-y-4 p-8">
        <Skeleton className="h-8 w-72" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (thread.isError || !thread.data) {
    return (
      <div className="p-8">
        <p className="text-sm text-muted-foreground">That essay could not be loaded.</p>
        <Button asChild variant="outline" className="mt-4">
          <Link to="/dashboard">Back to dashboard</Link>
        </Button>
      </div>
    );
  }

  return (
    <>
      <PageHeader
        title={thread.data.essay.question}
        description={`${versions.length} attempt${versions.length === 1 ? "" : "s"} · ${maxMark} marks available`}
        action={
          <div className="flex flex-wrap items-center gap-2">
            <Button asChild variant="ghost" size="sm">
              <Link to="/dashboard">
                <ArrowLeft className="size-4" /> Back to Dashboard
              </Link>
            </Button>
            <Button
              size="sm"
              variant={rewriting ? "outline" : "default"}
              onClick={() => setRewriting((value) => !value)}
              className="gap-1.5"
            >
              <RefreshCw
                className={cn("size-3.5", rewriting && "rotate-180 transition-transform")}
              />
              {rewriting ? "Close Rewrite" : "Rewrite & Improve"}
            </Button>
          </div>
        }
      />

      <div className="space-y-4 sm:space-y-6 px-3.5 py-4 sm:px-6 sm:py-6 md:px-8">
        {/* Transparent Cambridge Syllabus Disclaimer */}
        <div className="flex items-center gap-2 rounded-xl border border-primary/20 bg-primary/[0.04] px-3 py-2 sm:px-4 sm:py-2.5 text-[11px] sm:text-xs text-muted-foreground">
          <ShieldCheck className="size-3.5 sm:size-4 shrink-0 text-primary" />
          <p className="leading-snug sm:leading-relaxed">
            <strong className="text-foreground font-semibold">Cambridge 0455 Standard:</strong>{" "}
            Calibrated against published Cambridge guidelines. Independent study platform.
          </p>
        </div>

        {/* Attempt Selector & History Timeline */}
        <div className="rounded-xl border border-border/80 bg-card p-3.5 sm:p-4 shadow-sm">
          <div className="flex flex-col gap-2.5 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-2">
              <History className="size-4 text-primary" />
              <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Attempt Progression ({versions.length})
              </span>
            </div>

            {/* View Mode Toggle */}
            <div className="flex items-center gap-1 rounded-lg border border-border bg-muted/40 p-0.5 text-xs">
              <button
                type="button"
                onClick={() => setViewMode("split")}
                className={cn(
                  "flex items-center gap-1 sm:gap-1.5 rounded-md px-2 sm:px-2.5 py-1 font-medium transition-colors",
                  viewMode === "split"
                    ? "bg-background text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                <Columns2 className="size-3.5" />
                <span className="hidden sm:inline">Side-by-Side</span>
                <span className="sm:hidden">Split</span>
              </button>
              <button
                type="button"
                onClick={() => setViewMode("report")}
                className={cn(
                  "flex items-center gap-1 sm:gap-1.5 rounded-md px-2 sm:px-2.5 py-1 font-medium transition-colors",
                  viewMode === "report"
                    ? "bg-background text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                <Sparkles className="size-3.5" />
                <span className="hidden sm:inline">Report Only</span>
                <span className="sm:hidden">Report</span>
              </button>
              <button
                type="button"
                onClick={() => setViewMode("script")}
                className={cn(
                  "flex items-center gap-1 sm:gap-1.5 rounded-md px-2 sm:px-2.5 py-1 font-medium transition-colors",
                  viewMode === "script"
                    ? "bg-background text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                <FileText className="size-3.5" />
                <span className="hidden sm:inline">Script Only</span>
                <span className="sm:hidden">Script</span>
              </button>
            </div>
          </div>

          <div className="mt-3 flex flex-wrap items-center gap-2 pt-2 border-t border-border/60">
            {versions.map((version, index) => {
              const isSelected = index === activeIndex;
              const mark = version.total_mark ?? 0;
              const pct = maxMark > 0 ? Math.round((mark / maxMark) * 100) : 0;
              const isTop = pct >= 75;
              const isMid = pct >= 50 && pct < 75;

              return (
                <button
                  key={version.id}
                  type="button"
                  onClick={() => setSelected(index)}
                  className={cn(
                    "flex items-center gap-2 rounded-lg border px-3 py-1.5 text-xs transition-all duration-150",
                    isSelected
                      ? "border-primary bg-primary/10 text-primary font-semibold shadow-sm"
                      : "border-border text-muted-foreground hover:bg-accent/50 hover:text-foreground",
                  )}
                >
                  <span>Attempt {version.version}</span>
                  <Badge
                    variant="outline"
                    className={cn(
                      "text-[10px] px-1.5 py-0 font-bold",
                      isTop
                        ? "border-emerald-500/40 text-emerald-600 dark:text-emerald-400"
                        : isMid
                          ? "border-blue-500/40 text-blue-600 dark:text-blue-400"
                          : "border-amber-500/40 text-amber-600 dark:text-amber-400",
                    )}
                  >
                    {mark}/{maxMark}
                  </Badge>
                </button>
              );
            })}

            {markDelta !== null && markDelta !== 0 ? (
              <span
                className={cn(
                  "ml-auto text-xs font-semibold flex items-center gap-1",
                  markDelta > 0
                    ? "text-emerald-600 dark:text-emerald-400"
                    : "text-amber-600 dark:text-amber-400",
                )}
              >
                <TrendingUp className="size-3.5" />
                {markDelta > 0 ? `+${markDelta}` : markDelta} marks vs Attempt{" "}
                {previousAttempt?.version}
              </span>
            ) : null}
          </div>
        </div>

        {/* Rewrite Section */}
        {rewriting ? (
          <section className="panel space-y-4 p-6 border-primary/30 shadow-md">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between border-b border-border/80 pb-3">
              <div>
                <h2 className="text-base font-semibold flex items-center gap-2">
                  <RefreshCw className="size-4 text-primary" /> Rewrite and Re-Mark Attempt #
                  {versions.length + 1}
                </h2>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Apply the examiner feedback, strengthen your analytical chains, and resubmit.
                  Saved as a new attempt.
                </p>
              </div>
              <Badge variant="outline" className="text-xs font-mono self-start sm:self-auto">
                {rewriteWordCount} words
              </Badge>
            </div>

            <Textarea
              rows={16}
              className="font-sans text-[15px] leading-[1.8] p-4 rounded-xl resize-y"
              value={rewrite}
              onChange={(event) => setRewrite(event.target.value)}
              placeholder="Refine your response here..."
            />

            <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
              <p className="text-xs text-muted-foreground">
                Your rewrite will undergo the two-pass Cambridge examiner audit.
              </p>
              <div className="flex items-center gap-2">
                <Button variant="ghost" size="sm" onClick={() => setRewriting(false)}>
                  Cancel
                </Button>
                <Button
                  disabled={mutation.isPending || rewrite.trim().length < 20}
                  onClick={() => mutation.mutate()}
                  className="gap-1.5"
                >
                  {mutation.isPending ? (
                    <>
                      <Loader2 className="size-4 animate-spin" /> Evaluating new draft…
                    </>
                  ) : (
                    <>
                      <Sparkles className="size-4" /> Grade Attempt #{versions.length + 1}
                    </>
                  )}
                </Button>
              </div>
            </div>
          </section>
        ) : null}

        {/* Content Layout: Split vs Single Column */}
        {active ? (
          viewMode === "split" ? (
            <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
              {/* Left Column: Examiner Report */}
              <div className="space-y-6">
                <div className="flex items-center gap-2">
                  <Sparkles className="size-4 text-primary" />
                  <h3 className="text-sm font-semibold">Cambridge Examiner Report</h3>
                </div>
                <MarkBreakdown grading={active.grading as unknown as Grading} />
              </div>

              {/* Right Column: Student Script */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <FileText className="size-4 text-muted-foreground" />
                    <h3 className="text-sm font-semibold">
                      Student Script (Attempt {active.version})
                    </h3>
                  </div>
                  <Badge variant="outline" className="text-xs">
                    {wordCount} words
                  </Badge>
                </div>

                <div className="rounded-xl border border-border/80 bg-card p-5 shadow-sm">
                  <div className="prose prose-sm dark:prose-invert max-w-none">
                    <p className="text-[15px] leading-[1.8] whitespace-pre-wrap font-sans text-foreground/90">
                      {active.essay_text}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          ) : viewMode === "report" ? (
            <div className="space-y-6">
              <MarkBreakdown grading={active.grading as unknown as Grading} />
            </div>
          ) : (
            <div className="space-y-4 max-w-3xl mx-auto">
              <div className="flex items-center justify-between">
                <h3 className="text-base font-semibold">
                  Student Script (Attempt {active.version})
                </h3>
                <Badge variant="outline" className="text-xs">
                  {wordCount} words
                </Badge>
              </div>
              <div className="rounded-xl border border-border/80 bg-card p-6 shadow-sm">
                <p className="text-[15px] leading-[1.8] whitespace-pre-wrap font-sans text-foreground/90">
                  {active.essay_text}
                </p>
              </div>
            </div>
          )
        ) : null}
      </div>
    </>
  );
}
