import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import {
  ChevronLeft,
  ChevronRight,
  Filter,
  ListChecks,
  Loader2,
  PenLine,
  Search,
  Sparkles,
  Wand2,
  X,
} from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";

import { PageHeader } from "@/components/app/app-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { listApprovedEssayQuestions, listBankTopics } from "@/lib/bank.functions";
import { generateEssayQuestionAI } from "@/lib/essay.functions";
import { topicsFor } from "@/lib/diagrams/catalog";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/question-bank")({
  head: () => ({
    meta: [
      { title: "Question bank — Marginalite Economics" },
      {
        name: "description",
        content:
          "Practice real past-paper Cambridge IGCSE 0455 Economics MCQ papers plus AI-generated and real past-paper essay questions, by topic and difficulty.",
      },
    ],
  }),
  component: QuestionBankPage,
});

function QuestionBankPage() {
  const [level, setLevel] = useState<"as" | "a2">("as");
  const [topic, setTopic] = useState<string>("__any__");
  const [search, setSearch] = useState("");
  const [tariffFilter, setTariffFilter] = useState<"all" | 8 | 12 | 20>("all");
  const [page, setPage] = useState(1);
  const pageSize = 10;

  const fetchTopics = useServerFn(listBankTopics);
  const fetchEssays = useServerFn(listApprovedEssayQuestions);

  const topicsQuery = useQuery({
    queryKey: ["bank-topics", "essay", level],
    queryFn: () => fetchTopics({ data: { kind: "essay", level } }),
  });

  const essaysQuery = useQuery({
    queryKey: ["bank-essays", level, topic],
    queryFn: () => fetchEssays({ data: { level, topic: topic === "__any__" ? undefined : topic } }),
  });

  const essays = essaysQuery.data ?? [];

  const handleLevelChange = (val: "as" | "a2") => {
    setLevel(val);
    setTopic("__any__");
    setPage(1);
  };

  const handleTopicChange = (val: string) => {
    setTopic(val);
    setPage(1);
  };

  const handleTariffChange = (val: "all" | 8 | 12 | 20) => {
    setTariffFilter(val);
    setPage(1);
  };

  const handleSearchChange = (val: string) => {
    setSearch(val);
    setPage(1);
  };

  const filteredEssays = useMemo(() => {
    return essays.filter((essay) => {
      if (tariffFilter !== "all" && essay.max_mark !== tariffFilter) return false;
      if (search.trim()) {
        const q = search.toLowerCase();
        const matchesText = essay.question_text.toLowerCase().includes(q);
        const matchesTopic = (essay.topic || "").toLowerCase().includes(q);
        const matchesSeries = (essay.exam_series || "").toLowerCase().includes(q);
        if (!matchesText && !matchesTopic && !matchesSeries) return false;
      }
      return true;
    });
  }, [essays, tariffFilter, search]);

  const totalPages = Math.max(1, Math.ceil(filteredEssays.length / pageSize));
  const currentPage = Math.min(page, totalPages);
  const paginatedEssays = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredEssays.slice(start, start + pageSize);
  }, [filteredEssays, currentPage, pageSize]);

  return (
    <div>
      <PageHeader
        title="Question bank"
        description="Real past-paper MCQ practice, plus a wide bank of essay questions — AI-generated to real exam style, and real past-paper questions administrators have approved. Pick one and practice."
      />

      <div className="space-y-6 px-5 py-6 md:px-8">
        <div className="panel flex flex-wrap items-center gap-4 p-5">
          <div className="flex items-center gap-2.5">
            <span className="flex size-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <ListChecks className="size-4.5" />
            </span>
            <div>
              <p className="text-sm font-semibold">MCQ papers</p>
              <p className="text-xs text-muted-foreground">
                Real past-paper Cambridge IGCSE 0455 papers — no AI-generated questions, ever.
              </p>
            </div>
          </div>
          <Button asChild size="sm" className="ml-auto">
            <Link to="/mcq-live">Practice MCQ</Link>
          </Button>
        </div>

        <QuestionCreatorBox defaultLevel={level} />

        {/* Section Header & Filters */}
        <div className="space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-semibold">Essay questions</h2>
              <Badge variant="outline" className="text-[11px] font-semibold bg-muted">
                {filteredEssays.length} {filteredEssays.length === 1 ? "question" : "questions"}
              </Badge>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Tabs value={level} onValueChange={(value) => handleLevelChange(value as "as" | "a2")}>
                <TabsList className="h-8 text-xs">
                  <TabsTrigger value="as" className="text-xs px-2.5">IGCSE 0455</TabsTrigger>
                  <TabsTrigger value="a2" className="text-xs px-2.5">IGCSE 0455</TabsTrigger>
                </TabsList>
              </Tabs>
              <Select value={topic} onValueChange={handleTopicChange}>
                <SelectTrigger className="w-full sm:w-56 h-8 text-xs">
                  <SelectValue placeholder="All topics" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__any__">All topics</SelectItem>
                  {(topicsQuery.data ?? []).map((row) => (
                    <SelectItem key={row.topic} value={row.topic}>
                      {row.topic} ({row.count})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Quick Search Box & Tariff Filter Bar */}
          <div className="panel p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-card/60">
            <div className="relative flex-1">
              <Search className="absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search question text, syllabus topics, or exam series..."
                value={search}
                onChange={(e) => handleSearchChange(e.target.value)}
                className="h-8 pl-8 pr-7 text-xs bg-background"
              />
              {search && (
                <button
                  type="button"
                  onClick={() => handleSearchChange("")}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  <X className="size-3.5" />
                </button>
              )}
            </div>

            <div className="flex items-center gap-1 rounded-md border border-border bg-muted/40 p-0.5 text-xs shrink-0 max-w-full overflow-x-auto">
              <button
                type="button"
                onClick={() => handleTariffChange("all")}
                className={cn(
                  "rounded px-2.5 py-1 text-xs transition-colors",
                  tariffFilter === "all"
                    ? "bg-background font-semibold text-foreground shadow-xs"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                All tariffs
              </button>
              <button
                type="button"
                onClick={() => handleTariffChange(8)}
                className={cn(
                  "rounded px-2.5 py-1 text-xs transition-colors",
                  tariffFilter === 8
                    ? "bg-background font-semibold text-foreground shadow-xs"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                8-mark
              </button>
              <button
                type="button"
                onClick={() => handleTariffChange(12)}
                className={cn(
                  "rounded px-2.5 py-1 text-xs transition-colors",
                  tariffFilter === 12
                    ? "bg-background font-semibold text-foreground shadow-xs"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                8-mark
              </button>
              <button
                type="button"
                onClick={() => handleTariffChange(20)}
                className={cn(
                  "rounded px-2.5 py-1 text-xs transition-colors",
                  tariffFilter === 20
                    ? "bg-background font-semibold text-foreground shadow-xs"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                8-mark A2
              </button>
            </div>
          </div>
        </div>

        {essaysQuery.isLoading ? (
          <div className="space-y-2">
            <Skeleton className="h-20 w-full" />
            <Skeleton className="h-20 w-full" />
            <Skeleton className="h-20 w-full" />
          </div>
        ) : filteredEssays.length === 0 ? (
          <div className="panel px-5 py-12 text-center text-sm text-muted-foreground">
            <p>No questions match your search or selected filters.</p>
            {(search || topic !== "__any__" || tariffFilter !== "all") && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setSearch("");
                  setTopic("__any__");
                  setTariffFilter("all");
                  setPage(1);
                }}
                className="mt-3 text-xs"
              >
                Clear all filters
              </Button>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            <ul className="space-y-2.5">
              {paginatedEssays.map((essay) => (
                <li key={essay.id} className="panel flex items-start justify-between gap-4 p-4 hover:border-primary/40 transition-colors">
                  <div className="min-w-0">
                    <p className="text-sm leading-snug">{essay.question_text}</p>
                    <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                      <Badge variant="secondary" className="text-[10px]">{essay.topic}</Badge>
                      <Badge variant="outline" className="text-[10px]">{essay.max_mark} marks</Badge>
                      {essay.exam_series ? (
                        <Badge variant="outline" className="text-[10px]">{essay.exam_series}</Badge>
                      ) : null}
                    </div>
                  </div>
                  <Button asChild size="sm" variant="outline" className="shrink-0">
                    <Link
                      to="/grade"
                      search={{
                        q: essay.question_text,
                        marks: (essay.max_mark === 2 || essay.max_mark === 4 || essay.max_mark === 6 || essay.max_mark === 8
                          ? essay.max_mark
                          : 8) as 2 | 4 | 6 | 8,
                      }}
                    >
                      <PenLine className="size-3.5" />
                      Answer &amp; get graded
                    </Link>
                  </Button>
                </li>
              ))}
            </ul>

            {/* Pagination Controls */}
            {totalPages > 1 && (
              <div className="panel p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                <p className="text-muted-foreground">
                  Showing <strong className="text-foreground">{(currentPage - 1) * pageSize + 1}</strong> to{" "}
                  <strong className="text-foreground">
                    {Math.min(currentPage * pageSize, filteredEssays.length)}
                  </strong>{" "}
                  of <strong className="text-foreground">{filteredEssays.length}</strong> questions
                </p>

                <div className="flex items-center gap-1 self-center sm:self-auto">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={currentPage <= 1}
                    className="h-7 text-xs px-2"
                  >
                    <ChevronLeft className="size-3.5 mr-0.5" /> Prev
                  </Button>

                  <div className="flex items-center gap-1 px-1">
                    {Array.from({ length: Math.min(5, totalPages) }, (_, idx) => {
                      let pageNum = idx + 1;
                      if (totalPages > 5 && currentPage > 3) {
                        pageNum = Math.min(currentPage - 2 + idx, totalPages);
                      }
                      return (
                        <button
                          key={pageNum}
                          type="button"
                          onClick={() => setPage(pageNum)}
                          className={cn(
                            "size-7 rounded text-xs font-semibold transition-colors",
                            currentPage === pageNum
                              ? "bg-primary text-primary-foreground shadow-xs"
                              : "text-muted-foreground hover:bg-muted hover:text-foreground",
                          )}
                        >
                          {pageNum}
                        </button>
                      );
                    })}
                  </div>

                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                    disabled={currentPage >= totalPages}
                    className="h-7 text-xs px-2"
                  >
                    Next <ChevronRight className="size-3.5 ml-0.5" />
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

/**
 * The AI question creator — writes a brand-new, exam-style essay question
 * at Cambridge IGCSE 0455 difficulty on demand, grounded (via the same RAG
 * pipeline used elsewhere) in the real syllabus, past papers and mark
 * schemes, so it reads like an actual paper question rather than a
 * generic prompt. Distinct from the approved bank list below: this is
 * for a fresh, never-seen-before question, generated live.
 */
function QuestionCreatorBox({ defaultLevel }: { defaultLevel: "as" | "a2" }) {
  const [level, setLevel] = useState<"as" | "a2">(defaultLevel);
  const [topic, setTopic] = useState("Market failure and government intervention");
  const [seenQuestions, setSeenQuestions] = useState<string[]>([]);

  const topics = [...topicsFor("Microeconomics"), ...topicsFor("Macroeconomics")];

  const generate = useServerFn(generateEssayQuestionAI);
  const mutation = useMutation({
    mutationFn: () =>
      generate({ data: { level, topic, excludeQuestions: seenQuestions.slice(-15) } }),
    onSuccess: (result) => {
      setSeenQuestions((prev) => [...prev, result.question]);
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const generated = mutation.data;

  return (
    <div className="panel p-5">
      <div className="flex items-center gap-2.5">
        <span className="flex size-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
          <Wand2 className="size-4.5" />
        </span>
        <div>
          <p className="text-sm font-semibold">Question creator</p>
          <p className="text-xs text-muted-foreground">
            AI-written essay questions at real Cambridge exam difficulty — grounded in your
            syllabus, past papers and mark schemes so they read like the real thing.
          </p>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap items-end gap-3">
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-muted-foreground">Level</label>
          <Tabs value={level} onValueChange={(value) => setLevel(value as "as" | "a2")}>
            <TabsList>
              <TabsTrigger value="as">IGCSE 0455</TabsTrigger>
              <TabsTrigger value="a2">IGCSE 0455</TabsTrigger>
            </TabsList>
          </Tabs>
        </div>

        <div className="min-w-56 flex-1 space-y-1.5">
          <label htmlFor="creator-topic" className="text-xs font-medium text-muted-foreground">
            Topic
          </label>
          <input
            id="creator-topic"
            list="creator-topics"
            value={topic}
            onChange={(event) => setTopic(event.target.value)}
            placeholder="e.g. Price elasticity of demand"
            className="border-input flex h-9 w-full rounded-md border bg-transparent px-3 py-1 text-sm shadow-xs outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
          />
          <datalist id="creator-topics">
            {topics.map((item) => (
              <option key={item} value={item} />
            ))}
          </datalist>
        </div>

        <Button
          type="button"
          disabled={mutation.isPending || topic.trim().length < 3}
          onClick={() => mutation.mutate()}
        >
          {mutation.isPending ? (
            <>
              <Loader2 className="size-4 animate-spin" /> Writing a question…
            </>
          ) : generated ? (
            <>
              <Sparkles className="size-4" /> Generate another
            </>
          ) : (
            <>
              <Sparkles className="size-4" /> Generate a question
            </>
          )}
        </Button>
      </div>

      {generated ? (
        <div className="mt-4 rounded-lg border border-border bg-card p-4">
          <p className="text-sm leading-snug">{generated.question}</p>
          <div className="mt-2 flex flex-wrap items-center gap-1.5">
            <Badge variant="secondary">{generated.topic}</Badge>
            <Badge variant="outline">{generated.maxMark} marks</Badge>
            <Badge variant="outline">{level === "a2" ? "IGCSE 0455" : "IGCSE 0455"}</Badge>
          </div>
          <Button asChild size="sm" className="mt-3">
            <Link to="/grade" search={{ q: generated.question, marks: generated.maxMark }}>
              <PenLine className="size-3.5" />
              Answer &amp; get graded
            </Link>
          </Button>
        </div>
      ) : null}
    </div>
  );
}
