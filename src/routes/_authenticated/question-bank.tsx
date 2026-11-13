import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { ListChecks, Loader2, PenLine, Sparkles, Wand2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { PageHeader } from "@/components/app/app-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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

export const Route = createFileRoute("/_authenticated/question-bank")({
  head: () => ({
    meta: [
      { title: "Question bank — Marginalite" },
      {
        name: "description",
        content:
          "Practice real past-paper Cambridge IGCSE 0455 Economics MCQ papers plus structured essay questions by topic and difficulty.",
      },
    ],
  }),
  component: QuestionBankPage,
});

function QuestionBankPage() {
  const [era, setEra] = useState<"legacy" | "2027">("legacy");
  const [topic, setTopic] = useState<string>("__any__");

  const fetchTopics = useServerFn(listBankTopics);
  const fetchEssays = useServerFn(listApprovedEssayQuestions);

  const topicsQuery = useQuery({
    queryKey: ["bank-topics", "essay", era],
    queryFn: () => fetchTopics({ data: { kind: "essay", era } }),
  });

  const essaysQuery = useQuery({
    queryKey: ["bank-essays", era, topic],
    queryFn: () => fetchEssays({ data: { era, topic: topic === "__any__" ? undefined : topic } }),
  });

  const essays = essaysQuery.data ?? [];

  return (
    <div>
      <PageHeader
        title="Question bank"
        description="Real past-paper MCQ practice, plus a wide bank of essay questions — structured to official Cambridge 0455 tariffs (2m, 4m, 6m, 8m). Pick one and practice."
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
                Real past-paper Cambridge 0455 papers — no AI-generated questions, ever.
              </p>
            </div>
          </div>
          <Button asChild size="sm" className="ml-auto">
            <Link to="/mcq-live">Practice MCQ</Link>
          </Button>
        </div>

        <QuestionCreatorBox defaultEra={era} />

        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-sm font-semibold">Essay questions</h2>
          <div className="flex items-center gap-3">
            <Tabs value={era} onValueChange={(value) => setEra(value as "legacy" | "2027")}>
              <TabsList>
                <TabsTrigger value="legacy">Legacy Era</TabsTrigger>
                <TabsTrigger value="2027">New Era (2027+)</TabsTrigger>
              </TabsList>
            </Tabs>
            <Select value={topic} onValueChange={setTopic}>
              <SelectTrigger className="w-56">
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

        {essaysQuery.isLoading ? (
          <div className="space-y-2">
            <Skeleton className="h-20 w-full" />
            <Skeleton className="h-20 w-full" />
            <Skeleton className="h-20 w-full" />
          </div>
        ) : essays.length === 0 ? (
          <p className="panel px-5 py-12 text-center text-sm text-muted-foreground">
            No approved essay questions yet for this level/topic — an administrator needs to add
            some under Content admin.
          </p>
        ) : (
          <ul className="space-y-2.5">
            {essays.map((essay) => (
              <li key={essay.id} className="panel flex items-start justify-between gap-4 p-4">
                <div className="min-w-0">
                  <p className="text-sm leading-snug">{essay.question_text}</p>
                  <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                    <Badge variant="secondary">{essay.topic}</Badge>
                    <Badge variant="outline">{essay.max_mark} marks</Badge>
                    {essay.exam_series ? (
                      <Badge variant="outline">{essay.exam_series}</Badge>
                    ) : null}
                  </div>
                </div>
                <Button asChild size="sm" variant="outline" className="shrink-0">
                  <Link
                    to="/grade"
                    search={{
                      q: essay.question_text,
                      marks: essay.max_mark as 2 | 4 | 6 | 8,
                    }}
                  >
                    <PenLine className="size-3.5" />
                    Answer &amp; get graded
                  </Link>
                </Button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

/**
 * The AI question creator — writes a brand-new, exam-style essay question
 * at Cambridge 0455 difficulty on demand, grounded (via the same RAG
 * pipeline used elsewhere) in the real syllabus, past papers and mark
 * schemes, so it reads like an actual paper question rather than a
 * generic prompt.
 */
function QuestionCreatorBox({ defaultEra }: { defaultEra?: "legacy" | "2027" }) {
  const [era, setEra] = useState<"legacy" | "2027">(defaultEra ?? "legacy");
  const [topic, setTopic] = useState("Market failure and government intervention");
  const [seenQuestions, setSeenQuestions] = useState<string[]>([]);

  const topics = [...topicsFor("Microeconomics"), ...topicsFor("Macroeconomics")];

  const generate = useServerFn(generateEssayQuestionAI);
  const mutation = useMutation({
    mutationFn: () =>
      generate({ data: { era, topic, excludeQuestions: seenQuestions.slice(-15) } }),
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
            AI-written essay questions at real Cambridge 0455 exam difficulty — grounded in your
            syllabus, past papers and mark schemes.
          </p>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap items-end gap-3">
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-muted-foreground">Assessment Era</label>
          <Tabs value={era} onValueChange={(value) => setEra(value as "legacy" | "2027")}>
            <TabsList>
              <TabsTrigger value="legacy">Legacy Era</TabsTrigger>
              <TabsTrigger value="2027">New Era (2027+)</TabsTrigger>
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
            <Badge variant="outline">{era === "2027" ? "2027–2029" : "Legacy"}</Badge>
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
