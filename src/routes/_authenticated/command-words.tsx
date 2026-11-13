import { useQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import {
  ArrowRight,
  Check,
  CircleHelp,
  RefreshCw,
  Sparkles,
  Target,
  Trophy,
  X,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import { PageHeader } from "@/components/app/app-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { CAMBRIDGE_CORE_DEFINITIONS } from "@/lib/cambridge-definitions";
import { listDefinitions, type DefinitionListRow } from "@/lib/definitions.functions";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/command-words")({
  head: () => ({
    meta: [
      { title: "Command words test — Marginalite" },
      {
        name: "description",
        content: "A private, unrecorded Cambridge 0455 command-word practice test.",
      },
    ],
  }),
  component: CommandWordsPage,
});

type QuizQuestion = {
  id: string;
  prompt: string;
  promptLabel: string;
  options: { id: string; label: string }[];
  correctId: string;
  term: string;
  explanation: string;
};

const QUESTION_COUNT = 10;

function shuffle<T>(items: readonly T[]) {
  const copy = [...items];
  for (let index = copy.length - 1; index > 0; index -= 1) {
    const next = Math.floor(Math.random() * (index + 1));
    [copy[index], copy[next]] = [copy[next], copy[index]];
  }
  return copy;
}

function buildQuiz(entries: DefinitionListRow[]): QuizQuestion[] {
  return shuffle(entries)
    .slice(0, Math.min(QUESTION_COUNT, entries.length))
    .map((entry, index) => {
      const definitionFirst = index % 2 === 1;
      const distractors = shuffle(entries.filter((candidate) => candidate.id !== entry.id)).slice(
        0,
        3,
      );

      if (definitionFirst) {
        return {
          id: `${entry.id}-term`,
          promptLabel: "Which command word matches this instruction?",
          prompt: entry.definition_text,
          options: shuffle([entry, ...distractors]).map((option) => ({
            id: option.id,
            label: option.term,
          })),
          correctId: entry.id,
          term: entry.term,
          explanation: entry.definition_text,
        };
      }

      return {
        id: `${entry.id}-meaning`,
        promptLabel: `What does “${entry.term}” require you to do?`,
        prompt: entry.term,
        options: shuffle([entry, ...distractors]).map((option) => ({
          id: option.id,
          label: option.definition_text,
        })),
        correctId: entry.id,
        term: entry.term,
        explanation: entry.definition_text,
      };
    });
}

function CommandWordsPage() {
  const fetchDefinitions = useServerFn(listDefinitions);
  const definitionsQuery = useQuery({
    queryKey: ["definitions", "command-word-test"],
    queryFn: () => fetchDefinitions({ data: { search: undefined } }),
  });
  const commandWords = useMemo(() => {
    const fromDb = (definitionsQuery.data ?? []).filter(
      (entry) => entry.category === "Command words",
    );
    if (fromDb.length >= 4) return fromDb;
    return CAMBRIDGE_CORE_DEFINITIONS.filter(
      (entry) => entry.category === "Command words",
    ) as unknown as DefinitionListRow[];
  }, [definitionsQuery.data]);
  const [quiz, setQuiz] = useState<QuizQuestion[]>([]);
  const [current, setCurrent] = useState(0);
  const [selected, setSelected] = useState<string | null>(null);
  const [checked, setChecked] = useState(false);
  const [score, setScore] = useState(0);
  const [started, setStarted] = useState(false);
  const [finished, setFinished] = useState(false);

  useEffect(() => {
    if (commandWords.length > 0 && quiz.length === 0) setQuiz(buildQuiz(commandWords));
  }, [commandWords, quiz.length]);

  const question = quiz[current];
  const total = quiz.length;

  function startFreshQuiz() {
    setQuiz(buildQuiz(commandWords));
    setCurrent(0);
    setSelected(null);
    setChecked(false);
    setScore(0);
    setFinished(false);
    setStarted(true);
  }

  function checkAnswer() {
    if (!selected || !question || checked) return;
    setChecked(true);
    if (selected === question.correctId) setScore((value) => value + 1);
  }

  function nextQuestion() {
    if (current + 1 >= total) {
      setFinished(true);
      return;
    }
    setCurrent((value) => value + 1);
    setSelected(null);
    setChecked(false);
  }

  return (
    <div className="flex flex-1 flex-col">
      <PageHeader
        title="Command words test"
        description="Understand what the examiner is asking before you start writing."
      />
      <div className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-6 p-4 sm:p-5 md:p-8">
        <section className="relative overflow-hidden rounded-2xl border border-amber-300/50 bg-linear-to-br from-amber-50 via-card to-card p-5 dark:from-amber-950/30 sm:p-7">
          <div className="paper-grid pointer-events-none absolute inset-0 opacity-20" />
          <div className="relative grid gap-5 lg:grid-cols-[1fr_auto] lg:items-center">
            <div>
              <Badge className="mb-3 bg-amber-500 text-white hover:bg-amber-500">
                <Sparkles className="mr-1 size-3.5" /> Quick test
              </Badge>
              <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">
                Ten questions. One mark each.
              </h2>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
                Every attempt mixes command words and question styles. Your score exists only on
                this screen—it is never added to your progress, class report, or account history.
              </p>
            </div>
            <div className="grid grid-cols-2 gap-2 lg:w-64">
              <MiniStat value="10" label="questions" />
              <MiniStat value="0" label="saved" />
            </div>
          </div>
        </section>

        {definitionsQuery.isLoading ? (
          <div className="space-y-3">
            <Skeleton className="h-8 w-48" />
            <Skeleton className="h-72 rounded-2xl" />
          </div>
        ) : commandWords.length < 4 ? (
          <div className="rounded-2xl border border-dashed p-10 text-center">
            <CircleHelp className="mx-auto size-8 text-muted-foreground" />
            <p className="mt-3 font-semibold">Not enough command words are available yet.</p>
            <p className="mt-1 text-sm text-muted-foreground">
              At least four reviewed command words are needed to build a fair test.
            </p>
          </div>
        ) : !started ? (
          <section className="rounded-2xl border bg-card p-6 text-center shadow-sm sm:p-10">
            <span className="mx-auto flex size-14 items-center justify-center rounded-2xl bg-primary/10 text-primary">
              <Target className="size-7" />
            </span>
            <h2 className="mt-4 text-xl font-bold">Ready for a fresh set?</h2>
            <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-muted-foreground">
              You will match command words with their exact examiner instructions. Results vanish
              when you leave or start again.
            </p>
            <Button size="lg" className="mt-6" onClick={startFreshQuiz}>
              Start random test <ArrowRight className="size-4" />
            </Button>
          </section>
        ) : finished ? (
          <Results score={score} total={total} onRestart={startFreshQuiz} />
        ) : question ? (
          <section className="overflow-hidden rounded-2xl border bg-card shadow-sm">
            <div className="border-b bg-muted/30 p-4 sm:p-5">
              <div className="flex items-center justify-between gap-3 text-sm">
                <span className="font-semibold">
                  Question {current + 1} of {total}
                </span>
                <span className="font-medium text-muted-foreground">Current score: {score}</span>
              </div>
              <Progress
                value={((current + (checked ? 1 : 0)) / total) * 100}
                className="mt-3 h-2"
              />
            </div>

            <div className="p-4 sm:p-6">
              <p className="text-xs font-bold tracking-[0.14em] text-primary uppercase">
                {question.promptLabel}
              </p>
              <h2
                className={cn(
                  "mt-3 font-bold leading-snug",
                  question.prompt === question.term ? "text-3xl" : "max-w-3xl text-xl sm:text-2xl",
                )}
              >
                {question.prompt}
              </h2>

              <div className="mt-6 grid gap-3">
                {question.options.map((option, index) => {
                  const isSelected = selected === option.id;
                  const isCorrect = option.id === question.correctId;
                  return (
                    <button
                      key={option.id}
                      type="button"
                      disabled={checked}
                      onClick={() => setSelected(option.id)}
                      className={cn(
                        "flex w-full items-start gap-3 rounded-xl border p-4 text-left text-sm leading-6 transition sm:text-base",
                        !checked &&
                          (isSelected
                            ? "border-primary bg-primary/10 ring-2 ring-primary/15"
                            : "bg-background hover:border-primary/40 hover:bg-primary/[0.04]"),
                        checked && isCorrect && "border-emerald-500 bg-emerald-500/10",
                        checked &&
                          isSelected &&
                          !isCorrect &&
                          "border-destructive bg-destructive/10",
                        checked && !isCorrect && !isSelected && "opacity-60",
                      )}
                    >
                      <span
                        className={cn(
                          "flex size-7 shrink-0 items-center justify-center rounded-full border text-xs font-bold",
                          isSelected &&
                            !checked &&
                            "border-primary bg-primary text-primary-foreground",
                          checked && isCorrect && "border-emerald-500 bg-emerald-500 text-white",
                          checked &&
                            isSelected &&
                            !isCorrect &&
                            "border-destructive bg-destructive text-white",
                        )}
                      >
                        {checked && isCorrect ? (
                          <Check className="size-4" />
                        ) : checked && isSelected ? (
                          <X className="size-4" />
                        ) : (
                          String.fromCharCode(65 + index)
                        )}
                      </span>
                      <span>{option.label}</span>
                    </button>
                  );
                })}
              </div>

              {checked ? (
                <div
                  role="status"
                  className={cn(
                    "mt-5 rounded-xl border p-4",
                    selected === question.correctId
                      ? "border-emerald-500/40 bg-emerald-500/10"
                      : "border-amber-500/40 bg-amber-500/10",
                  )}
                >
                  <p className="font-semibold">
                    {selected === question.correctId ? "Correct — 1 mark" : "Not quite — 0 marks"}
                  </p>
                  <p className="mt-1 text-sm leading-6 text-muted-foreground">
                    <strong className="text-foreground">{question.term}:</strong>{" "}
                    {question.explanation}
                  </p>
                </div>
              ) : null}

              <div className="mt-6 flex justify-end">
                {checked ? (
                  <Button onClick={nextQuestion}>
                    {current + 1 === total ? "See result" : "Next question"}
                    <ArrowRight className="size-4" />
                  </Button>
                ) : (
                  <Button onClick={checkAnswer} disabled={!selected}>
                    Check answer
                  </Button>
                )}
              </div>
            </div>
          </section>
        ) : null}
      </div>
    </div>
  );
}

function Results({
  score,
  total,
  onRestart,
}: {
  score: number;
  total: number;
  onRestart: () => void;
}) {
  const percent = total > 0 ? Math.round((score / total) * 100) : 0;
  const message =
    percent >= 90
      ? "Excellent — you are reading the examiner's instructions precisely."
      : percent >= 70
        ? "Strong result — review the explanations you missed and try a new mix."
        : "Good practice — command words are learnable, so take another mixed set.";

  return (
    <section className="rounded-2xl border bg-card p-6 text-center shadow-sm sm:p-10">
      <span className="mx-auto flex size-16 items-center justify-center rounded-2xl bg-amber-500/15 text-amber-600 dark:text-amber-300">
        <Trophy className="size-8" />
      </span>
      <p className="mt-5 text-xs font-bold tracking-[0.14em] text-muted-foreground uppercase">
        Test complete
      </p>
      <p className="mt-2 text-5xl font-bold tabular-nums">
        {score}
        <span className="text-2xl text-muted-foreground">/{total}</span>
      </p>
      <p className="mx-auto mt-3 max-w-lg text-sm leading-6 text-muted-foreground">{message}</p>
      <p className="mt-2 text-xs text-muted-foreground">This result has not been saved.</p>
      <Button size="lg" className="mt-6" onClick={onRestart}>
        <RefreshCw className="size-4" /> Try another random 10
      </Button>
    </section>
  );
}

function MiniStat({ value, label }: { value: string; label: string }) {
  return (
    <div className="rounded-xl border bg-background/80 p-3 text-center shadow-sm">
      <p className="text-2xl font-bold tabular-nums">{value}</p>
      <p className="text-[10px] font-semibold tracking-wide text-muted-foreground uppercase">
        {label}
      </p>
    </div>
  );
}
