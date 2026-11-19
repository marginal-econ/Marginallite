import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import {
  BookOpen,
  CheckCircle,
  Copy,
  Check,
  FileText,
  Filter,
  GraduationCap,
  MessageSquare,
  Search,
  Sparkles,
  Trophy,
  ShieldCheck,
} from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";

import { PageHeader } from "@/components/app/app-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { listShowcaseEssays, type ShowcaseEssayItem } from "@/lib/showcase.functions";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/showcase")({
  head: () => ({
    meta: [
      { title: "Exemplar Showcase — Marginalite" },
      {
        name: "description",
        content:
          "Automatic repository of Level 3 high-scoring Cambridge IGCSE 0455 Economics responses.",
      },
    ],
  }),
  component: ShowcasePage,
});

function ShowcaseCard({ essay }: { essay: ShowcaseEssayItem }) {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  const grading = essay.grading;
  const examinerSummary = grading?.examiner_summary || grading?.band || null;
  const scorePct = Math.round((essay.total_mark / essay.max_mark) * 100);
  const wordCount = essay.essay_text
    ? essay.essay_text.trim().split(/\s+/).filter(Boolean).length
    : 0;

  const copyEssay = () => {
    if (!essay.essay_text) return;
    navigator.clipboard.writeText(essay.essay_text);
    setCopied(true);
    toast.success("Exemplar essay copied to clipboard.");
    setTimeout(() => setCopied(false), 2000);
  };

  const aoBreakdown = grading?.ao_breakdown;

  return (
    <Collapsible
      open={open}
      onOpenChange={setOpen}
      className="group relative flex flex-col justify-between rounded-xl border border-border/70 bg-card p-5 shadow-xs transition-all duration-200 hover:border-primary/40 hover:shadow-sm"
    >
      <div>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-[240px] flex-1 space-y-1.5">
            <div className="flex flex-wrap items-center gap-2">
              <Badge className="border-amber-500/30 bg-amber-500/15 text-xs font-bold text-amber-700 hover:bg-amber-500/15 dark:text-amber-300">
                <Trophy className="mr-1 size-3 text-amber-500" />
                {essay.total_mark} / {essay.max_mark} marks ({scorePct}%)
              </Badge>

              {essay.source === "cambridge_model" ? (
                <Badge
                  variant="outline"
                  className="border-blue-500/30 bg-blue-500/10 text-xs text-blue-700 dark:text-blue-300"
                >
                  <Sparkles className="mr-1 size-3" /> Cambridge Model
                </Badge>
              ) : essay.source === "teacher_model" ? (
                <Badge
                  variant="outline"
                  className="border-violet-500/30 bg-violet-500/10 text-xs text-violet-700 dark:text-violet-300"
                >
                  <GraduationCap className="mr-1 size-3" /> Teacher Exemplar
                </Badge>
              ) : essay.source === "admin_added" ? (
                <Badge
                  variant="outline"
                  className="border-rose-500/30 bg-rose-500/10 text-xs text-rose-700 dark:text-rose-300"
                >
                  <CheckCircle className="mr-1 size-3" /> Verified Exemplar
                </Badge>
              ) : (
                <Badge
                  variant="outline"
                  className="border-emerald-500/30 bg-emerald-500/10 text-xs text-emerald-700 dark:text-emerald-300"
                >
                  <BookOpen className="mr-1 size-3" /> Student Exemplar
                </Badge>
              )}
            </div>

            <p className="pt-1 text-sm font-semibold leading-snug text-foreground">
              {essay.question}
            </p>

            <div className="flex flex-wrap items-center gap-2 pt-1 text-xs text-muted-foreground">
              {essay.topic_name ? (
                <Badge variant="secondary" className="text-[11px] font-normal">
                  {essay.topic_name}
                </Badge>
              ) : null}
              <span className="text-[11px]">
                Author:{" "}
                <strong className="font-medium text-foreground">
                  {essay.author_initials ?? "Anonymous"}
                </strong>
              </span>
              <span>•</span>
              <span className="text-[11px]">{wordCount} words</span>
            </div>
          </div>
        </div>

        {/* AO Summary Badges */}
        <div className="mt-3.5 flex flex-wrap items-center gap-2 border-t border-border/50 pt-2.5 text-xs">
          {essay.ao1_awarded !== null ? (
            <span className="inline-flex items-center rounded-md border border-[var(--ao1)]/20 bg-[var(--ao1)]/10 px-2 py-0.5 font-medium text-[var(--ao1)]">
              AO1 (Knowledge): {essay.ao1_awarded}m
            </span>
          ) : null}
          {essay.ao2_awarded !== null ? (
            <span className="inline-flex items-center rounded-md border border-[var(--ao2)]/20 bg-[var(--ao2)]/10 px-2 py-0.5 font-medium text-[var(--ao2)]">
              AO2 (Analysis): {essay.ao2_awarded}m
            </span>
          ) : null}
          {essay.ao3_awarded !== null ? (
            <span className="inline-flex items-center rounded-md border border-[var(--ao3)]/20 bg-[var(--ao3)]/10 px-2 py-0.5 font-medium text-[var(--ao3)]">
              AO3 (Evaluation): {essay.ao3_awarded}m
            </span>
          ) : null}
        </div>

        {examinerSummary ? (
          <p className="mt-2.5 rounded-lg border border-border/40 bg-muted/30 p-2.5 text-xs italic leading-relaxed text-muted-foreground">
            "{examinerSummary}"
          </p>
        ) : null}
      </div>

      <div className="mt-4 border-t border-border/50 pt-3">
        <CollapsibleTrigger asChild>
          <Button variant="outline" size="sm" className="h-8 w-full text-xs font-medium">
            {open ? "Hide full exemplar & feedback" : "Read full essay & examiner feedback →"}
          </Button>
        </CollapsibleTrigger>

        <CollapsibleContent className="mt-3.5 space-y-4">
          <Tabs defaultValue="essay" className="w-full">
            <div className="flex items-center justify-between gap-2 border-b border-border/60 pb-1">
              <TabsList className="h-7 bg-muted/50 p-0.5">
                <TabsTrigger value="essay" className="h-6 text-xs px-2.5 gap-1.5">
                  <FileText className="size-3" /> Full Essay
                </TabsTrigger>
                <TabsTrigger value="feedback" className="h-6 text-xs px-2.5 gap-1.5">
                  <MessageSquare className="size-3" /> Examiner Feedback
                </TabsTrigger>
              </TabsList>

              <Button
                variant="ghost"
                size="sm"
                className="h-6 px-2 text-[11px] text-muted-foreground hover:text-foreground"
                onClick={copyEssay}
              >
                {copied ? (
                  <Check className="mr-1 size-3 text-emerald-500" />
                ) : (
                  <Copy className="mr-1 size-3" />
                )}
                {copied ? "Copied" : "Copy text"}
              </Button>
            </div>

            {/* Tab 1: Full Essay */}
            <TabsContent value="essay" className="mt-3">
              <div className="max-h-96 overflow-y-auto whitespace-pre-wrap rounded-xl border border-border/60 bg-muted/30 p-4 font-serif text-xs leading-relaxed text-foreground sm:text-sm">
                {essay.essay_text}
              </div>
            </TabsContent>

            {/* Tab 2: Examiner Feedback & AO Breakdown */}
            <TabsContent value="feedback" className="mt-3 space-y-3">
              {/* AO Breakdown Cards */}
              <div className="grid gap-2 sm:grid-cols-3">
                {aoBreakdown?.knowledge ? (
                  <div className="rounded-lg border border-[var(--ao1)]/20 bg-[var(--ao1)]/[0.04] p-3 text-xs">
                    <div className="flex items-center justify-between font-semibold text-[var(--ao1)]">
                      <span>AO1 Knowledge</span>
                      <span>
                        {aoBreakdown.knowledge.awarded}/{aoBreakdown.knowledge.out_of}
                      </span>
                    </div>
                    {aoBreakdown.knowledge.comment ? (
                      <p className="mt-1.5 text-[11px] leading-relaxed text-muted-foreground">
                        {aoBreakdown.knowledge.comment}
                      </p>
                    ) : null}
                  </div>
                ) : null}

                {aoBreakdown?.analysis ? (
                  <div className="rounded-lg border border-[var(--ao2)]/20 bg-[var(--ao2)]/[0.04] p-3 text-xs">
                    <div className="flex items-center justify-between font-semibold text-[var(--ao2)]">
                      <span>AO2 Analysis</span>
                      <span>
                        {aoBreakdown.analysis.awarded}/{aoBreakdown.analysis.out_of}
                      </span>
                    </div>
                    {aoBreakdown.analysis.comment ? (
                      <p className="mt-1.5 text-[11px] leading-relaxed text-muted-foreground">
                        {aoBreakdown.analysis.comment}
                      </p>
                    ) : null}
                  </div>
                ) : null}

                {aoBreakdown?.evaluation ? (
                  <div className="rounded-lg border border-[var(--ao3)]/20 bg-[var(--ao3)]/[0.04] p-3 text-xs">
                    <div className="flex items-center justify-between font-semibold text-[var(--ao3)]">
                      <span>AO3 Evaluation</span>
                      <span>
                        {aoBreakdown.evaluation.awarded}/{aoBreakdown.evaluation.out_of}
                      </span>
                    </div>
                    {aoBreakdown.evaluation.comment ? (
                      <p className="mt-1.5 text-[11px] leading-relaxed text-muted-foreground">
                        {aoBreakdown.evaluation.comment}
                      </p>
                    ) : null}
                  </div>
                ) : null}
              </div>

              {/* Strengths */}
              {grading?.strengths && grading.strengths.length > 0 ? (
                <div className="rounded-lg border border-border/50 bg-card p-3 text-xs">
                  <h4 className="flex items-center gap-1.5 font-semibold text-emerald-600 dark:text-emerald-400">
                    <CheckCircle className="size-3.5" /> Key Strengths
                  </h4>
                  <ul className="mt-1.5 space-y-1 text-muted-foreground">
                    {grading.strengths.map((s, idx) => (
                      <li key={idx} className="flex items-start gap-1.5">
                        <span className="text-emerald-500">•</span>
                        <span>{s}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}

              {/* Actionable Feedback */}
              {grading?.actionable_feedback && grading.actionable_feedback.length > 0 ? (
                <div className="rounded-lg border border-border/50 bg-card p-3 text-xs">
                  <h4 className="flex items-center gap-1.5 font-semibold text-primary">
                    <Sparkles className="size-3.5" /> Examiner Advice for Students
                  </h4>
                  <ul className="mt-1.5 space-y-1 text-muted-foreground">
                    {grading.actionable_feedback.map((f, idx) => (
                      <li key={idx} className="flex items-start gap-1.5">
                        <span className="text-primary">•</span>
                        <span>{f}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}
            </TabsContent>
          </Tabs>
        </CollapsibleContent>
      </div>
    </Collapsible>
  );
}

function ShowcasePage() {
  const fetchShowcase = useServerFn(listShowcaseEssays);
  const [selectedTariff, setSelectedTariff] = useState<number | "all">("all");
  const [searchQuery, setSearchQuery] = useState("");

  const query = useQuery({
    queryKey: ["showcase-essays", selectedTariff],
    queryFn: () =>
      fetchShowcase({
        data: {
          tariff: selectedTariff === "all" ? undefined : selectedTariff,
        },
      }),
  });

  const rawEssays: ShowcaseEssayItem[] = (query.data as ShowcaseEssayItem[]) ?? [];

  const filteredEssays = useMemo(() => {
    if (!searchQuery.trim()) return rawEssays;
    const q = searchQuery.toLowerCase().trim();
    return rawEssays.filter(
      (e) =>
        (e.question && e.question.toLowerCase().includes(q)) ||
        (e.topic_name && e.topic_name.toLowerCase().includes(q)) ||
        (e.essay_text && e.essay_text.toLowerCase().includes(q)) ||
        (e.author_initials && e.author_initials.toLowerCase().includes(q)),
    );
  }, [rawEssays, searchQuery]);

  return (
    <div className="flex flex-1 flex-col">
      <PageHeader
        title="Exemplar Showcase"
        description="Top-scoring Cambridge IGCSE 0455 responses automatically showcased for model-level study and revision."
      />

      <div className="flex flex-1 flex-col gap-6 p-4 sm:p-5 md:p-8">
        {/* Banner */}
        <section className="relative overflow-hidden rounded-2xl border border-amber-300/40 bg-gradient-to-br from-amber-500/10 via-card to-card p-5 shadow-sm sm:p-6">
          <div className="paper-grid pointer-events-none absolute inset-0 opacity-20" />
          <div className="relative flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="max-w-2xl">
              <Badge className="mb-2.5 bg-amber-500 text-white hover:bg-amber-500">
                <Trophy className="mr-1 size-3.5" /> High-Band Exemplar Repository
              </Badge>
              <h2 className="text-xl font-bold tracking-tight sm:text-2xl">
                Real student, teacher, and Cambridge Level 3 exemplars.
              </h2>
              <p className="mt-1.5 text-xs leading-5 text-muted-foreground sm:text-sm">
                Responses automatically appear here when scoring top marks across 2m, 4m, 6m, and 8m
                tariffs (e.g. 7–8/8 on 8-mark questions), alongside teacher models and examiner
                answers. Click any exemplar to read the full response and complete examiner feedback
                report.
              </p>
            </div>
            <div className="flex shrink-0 items-center gap-3">
              <div className="rounded-xl border bg-background/80 px-4 py-3 text-center shadow-xs">
                <p className="text-2xl font-bold tabular-nums text-foreground">
                  {rawEssays.length}
                </p>
                <p className="text-[10px] font-semibold tracking-wider text-muted-foreground uppercase">
                  Exemplars
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Filter Controls & Search */}
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border/70 bg-card p-3 shadow-xs">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="flex items-center gap-1 pl-1 text-xs font-medium text-muted-foreground">
              <Filter className="size-3.5" /> Tariff:
            </span>
            {(
              [
                { label: "All Tariffs", value: "all" },
                { label: "8-mark (8/8)", value: 8 },
                { label: "12-mark (>10)", value: 12 },
                { label: "20-mark (>15)", value: 20 },
              ] as const
            ).map((tab) => (
              <Button
                key={tab.value}
                variant={selectedTariff === tab.value ? "default" : "outline"}
                size="sm"
                className="h-7 text-xs"
                onClick={() => setSelectedTariff(tab.value)}
              >
                {tab.label}
              </Button>
            ))}
          </div>

          <div className="relative min-w-[220px] flex-1 sm:max-w-xs">
            <Search className="absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search question, topic or keywords…"
              className="h-8 pl-8 text-xs"
            />
          </div>
        </div>

        {/* Essay List */}
        {query.isLoading ? (
          <div className="grid gap-4 sm:grid-cols-2">
            {Array.from({ length: 4 }).map((_, index) => (
              <Skeleton key={index} className="h-48 rounded-2xl" />
            ))}
          </div>
        ) : filteredEssays.length === 0 ? (
          <div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed border-border py-16 text-center">
            <div className="flex size-12 items-center justify-center rounded-2xl bg-muted text-muted-foreground">
              <FileText className="size-6" />
            </div>
            <h3 className="font-semibold text-foreground">No matching exemplar essays found</h3>
            <p className="max-w-md text-xs leading-relaxed text-muted-foreground">
              {searchQuery
                ? "Try clearing your search query or switching tariff filter."
                : "Essays scoring 8/8 (8-mark), >10 (12-mark), or >15 (20-mark) written by students, teachers, or admins will automatically populate here."}
            </p>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2">
            {filteredEssays.map((essay) => (
              <ShowcaseCard key={essay.version_id} essay={essay} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
