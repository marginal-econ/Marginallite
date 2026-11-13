import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import {
  Check,
  Copy,
  ExternalLink,
  GraduationCap,
  Loader2,
  Quote,
  ShieldCheck,
  Sparkles,
  Wand2,
} from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { PageHeader } from "@/components/app/app-shell";
import { getMe } from "@/lib/account.functions";
import { EconomicsDiagram } from "@/components/diagrams/economics-diagram";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { listApprovedEssayQuestions, listBankTopics } from "@/lib/bank.functions";
import { getDiagram, topicsFor } from "@/lib/diagrams/catalog";
import { generateEssayQuestionAI, generateModelEssay } from "@/lib/essay.functions";
import type { GeneratedEssay } from "@/lib/essay/generator.server";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/essay-generator")({
  head: () => ({
    meta: [
      { title: "Perfect response generator — Cambridge 0455 Economics" },
      {
        name: "description",
        content:
          "Generate a full-mark Cambridge IGCSE Economics (0455) response, structured exactly as taught in class — knowledge, analysis with application, evaluation and a reasoned conclusion — with correct diagrams and an AO mark breakdown.",
      },
      { property: "og:title", content: "Perfect response generator — Cambridge 0455 Economics" },
      {
        property: "og:description",
        content:
          "Examiner-standard model answers with the right diagrams inserted and an AO1/AO2/AO3 breakdown.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: EssayGeneratorPage,
});

// Cambridge IGCSE 0455 Paper 2 structured question tariffs: 2m, 4m, 6m, 8m.
const MARKS = [2, 4, 6, 8];
const ESSAY_DRAFT_VERSION = 1;

type EssayGeneratorDraft = {
  version: number;
  era: "legacy" | "2027";
  topic: string;
  question: string;
  maxMark: number;
  questionSource: "type" | "ai" | "bank";
  bankTopicFilter: string;
  essay: GeneratedEssay | null;
  savedAt: number;
};

function essayDraftKey(userId: string) {
  return `marginalite.essay-generator.v${ESSAY_DRAFT_VERSION}.${userId}`;
}

function EssayGeneratorPage() {
  const fetchMe = useServerFn(getMe);
  const me = useQuery({ queryKey: ["me"], queryFn: () => fetchMe() });
  const [era, setEra] = useState<"legacy" | "2027">("legacy");
  const [topic, setTopic] = useState("Government and the macroeconomy");
  const [question, setQuestion] = useState("");
  const [maxMark, setMaxMark] = useState(8);
  const [savedEssay, setSavedEssay] = useState<GeneratedEssay | null>(null);
  const [draftReady, setDraftReady] = useState(false);
  const [copied, setCopied] = useState(false);

  function handleCopyEssay() {
    if (!essay) return;
    const fullText = [
      `# ${essay.question}`,
      `Tariff: ${essay.maxMark} marks | Estimated Mark: ${essay.estimatedMark}/${essay.maxMark}`,
      "",
      ...essay.sections.map((s) => `## ${s.heading}\n\n${s.paragraphs.join("\n\n")}`),
    ].join("\n\n");
    navigator.clipboard.writeText(fullText);
    setCopied(true);
    toast.success("Model essay copied to clipboard.");
    setTimeout(() => setCopied(false), 2000);
  }

  const generate = useServerFn(generateModelEssay);
  const topics = [...topicsFor("Microeconomics"), ...topicsFor("Macroeconomics")];

  // Where the question text comes from: typed by the person (default,
  // today's exact behaviour, unchanged); a fresh AI-written unique
  // question on the chosen topic; or a real past-paper question a teacher
  // has extracted and approved. All three just fill the same `question`
  // (and `topic`/`maxMark`) state the generator below already used.
  const [questionSource, setQuestionSource] = useState<"type" | "ai" | "bank">("type");

  const generateQuestion = useServerFn(generateEssayQuestionAI);
  const aiQuestionMutation = useMutation({
    mutationFn: () => generateQuestion({ data: { era, topic } }),
    onSuccess: (result) => {
      setQuestion(result.question);
      setTopic(result.topic);
      setMaxMark(result.maxMark);
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const fetchBankTopics = useServerFn(listBankTopics);
  const bankTopics = useQuery({
    queryKey: ["essay-bank-topics", era],
    queryFn: () => fetchBankTopics({ data: { kind: "essay", era } }),
    enabled: questionSource === "bank",
  });

  const [bankTopicFilter, setBankTopicFilter] = useState<string>("__any__");
  const fetchBankQuestions = useServerFn(listApprovedEssayQuestions);
  const bankQuestions = useQuery({
    queryKey: ["essay-bank-questions", era, bankTopicFilter],
    queryFn: () =>
      fetchBankQuestions({
        data: { era, topic: bankTopicFilter === "__any__" ? undefined : bankTopicFilter },
      }),
    enabled: questionSource === "bank",
  });

  const mutation = useMutation({
    mutationFn: () => generate({ data: { era, topic, question, maxMark } }),
    onSuccess: (result) => setSavedEssay(result.essay),
    onError: (error: Error) => toast.error(error.message),
  });

  const essay = mutation.data?.essay ?? savedEssay;

  useEffect(() => {
    if (!me.data?.userId || draftReady) return;
    try {
      const raw = window.localStorage.getItem(essayDraftKey(me.data.userId));
      if (raw) {
        const draft = JSON.parse(raw) as EssayGeneratorDraft;
        if (draft.version === ESSAY_DRAFT_VERSION) {
          setEra(draft.era || "legacy");
          setTopic(draft.topic);
          setQuestion(draft.question);
          setMaxMark(MARKS.includes(draft.maxMark) ? draft.maxMark : 8);
          setQuestionSource(draft.questionSource);
          setBankTopicFilter(draft.bankTopicFilter);
          setSavedEssay(draft.essay);
          toast.success("Restored your Perfect Essay Generator draft.");
        }
      }
    } catch {
      // A corrupt browser draft should never stop the generator opening.
    } finally {
      setDraftReady(true);
    }
  }, [draftReady, me.data?.userId]);

  useEffect(() => {
    if (!draftReady || !me.data?.userId) return;
    const timer = window.setTimeout(() => {
      const draft: EssayGeneratorDraft = {
        version: ESSAY_DRAFT_VERSION,
        era,
        topic,
        question,
        maxMark,
        questionSource,
        bankTopicFilter,
        essay,
        savedAt: Date.now(),
      };
      window.localStorage.setItem(essayDraftKey(me.data.userId), JSON.stringify(draft));
    }, 400);
    return () => window.clearTimeout(timer);
  }, [
    bankTopicFilter,
    draftReady,
    era,
    essay,
    maxMark,
    me.data?.userId,
    question,
    questionSource,
    topic,
  ]);

  return (
    <>
      <PageHeader
        title="Perfect essay generator"
        description="An examiner-standard model answer, structured exactly as the mark scheme rewards, capped at 650 words to match real exam-script length, with the correct diagrams inserted and an AO breakdown."
      />

      <div className="grid gap-0 lg:grid-cols-[380px_1fr]">
        <section className="space-y-4 border-border p-5 lg:border-r md:p-6">
          <div className="space-y-2">
            <Label>Syllabus era</Label>
            <Tabs value={era} onValueChange={(value) => setEra(value as "legacy" | "2027")}>
              <TabsList className="w-full">
                <TabsTrigger value="legacy" className="flex-1">
                  Legacy (≤ 2026)
                </TabsTrigger>
                <TabsTrigger value="2027" className="flex-1">
                  2027–2029 Syllabus
                </TabsTrigger>
              </TabsList>
            </Tabs>
          </div>

          <div className="space-y-2">
            <Label htmlFor="topic">Topic</Label>
            <Input
              id="topic"
              list="essay-topics"
              value={topic}
              onChange={(event) => setTopic(event.target.value)}
              placeholder="e.g. Market failure and externalities"
            />
            <datalist id="essay-topics">
              {topics.map((item) => (
                <option key={item} value={item} />
              ))}
            </datalist>
          </div>

          <div className="space-y-2">
            <Label>Question source</Label>
            <Tabs
              value={questionSource}
              onValueChange={(value) => setQuestionSource(value as "type" | "ai" | "bank")}
            >
              <TabsList className="w-full">
                <TabsTrigger value="type" className="flex-1">
                  Type my own
                </TabsTrigger>
                <TabsTrigger value="ai" className="flex-1">
                  AI-generated
                </TabsTrigger>
                <TabsTrigger value="bank" className="flex-1">
                  Question bank
                </TabsTrigger>
              </TabsList>
            </Tabs>
          </div>

          {questionSource === "ai" ? (
            <Button
              type="button"
              variant="outline"
              className="w-full"
              disabled={aiQuestionMutation.isPending}
              onClick={() => aiQuestionMutation.mutate()}
            >
              {aiQuestionMutation.isPending ? (
                <>
                  <Loader2 className="size-4 animate-spin" /> Writing a unique question…
                </>
              ) : (
                <>
                  <Sparkles className="size-4" /> Generate a unique question on this topic
                </>
              )}
            </Button>
          ) : null}

          {questionSource === "bank" ? (
            <div className="space-y-2">
              <Select value={bankTopicFilter} onValueChange={setBankTopicFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Any topic" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__any__">Any topic</SelectItem>
                  {(bankTopics.data ?? []).map((entry) => (
                    <SelectItem key={entry.topic} value={entry.topic}>
                      {entry.topic} ({entry.count})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {bankQuestions.isSuccess && (bankQuestions.data ?? []).length === 0 ? (
                <p className="text-xs text-muted-foreground">
                  No approved real past-paper essay questions yet — an administrator can add some
                  under Knowledge base → Question bank.
                </p>
              ) : (
                <ul className="max-h-56 space-y-1.5 overflow-y-auto pr-1">
                  {(bankQuestions.data ?? []).map((item) => (
                    <li key={item.id}>
                      <button
                        type="button"
                        onClick={() => {
                          setQuestion(item.question_text);
                          setTopic(item.topic);
                          setMaxMark(item.max_mark);
                        }}
                        className={cn(
                          "w-full rounded-md border border-border p-2 text-left text-xs leading-snug transition-colors hover:bg-accent/50",
                          question === item.question_text && "border-primary bg-accent/40",
                        )}
                      >
                        <span className="mb-1 flex flex-wrap gap-1">
                          <Badge variant="outline" className="text-[10px]">
                            {item.topic}
                          </Badge>
                          <Badge variant="secondary" className="text-[10px]">
                            {item.max_mark} marks
                          </Badge>
                        </span>
                        {item.question_text}
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          ) : null}

          <div className="space-y-2">
            <Label htmlFor="question">Question</Label>
            <Textarea
              id="question"
              value={question}
              onChange={(event) => setQuestion(event.target.value)}
              rows={6}
              placeholder="Paste the exact question, e.g. 'Assess whether an indirect tax is the best way to reduce consumption of a demerit good. [12]'"
            />
          </div>

          <div className="space-y-2">
            <Label>Marks</Label>
            <div className="flex gap-1 rounded-lg bg-muted p-1">
              {MARKS.map((mark) => (
                <button
                  key={mark}
                  type="button"
                  onClick={() => setMaxMark(mark)}
                  className={cn(
                    "flex-1 rounded-md px-2 py-1.5 text-sm font-medium text-muted-foreground transition-colors",
                    maxMark === mark && "bg-background text-foreground shadow-sm",
                  )}
                >
                  {mark}
                </button>
              ))}
            </div>
          </div>

          <Button
            className="w-full"
            disabled={mutation.isPending || question.trim().length < 10}
            onClick={() => mutation.mutate()}
          >
            {mutation.isPending ? (
              <>
                <Loader2 className="size-4 animate-spin" /> Writing the model answer…
              </>
            ) : (
              <>
                <Wand2 className="size-4" /> Generate model essay
              </>
            )}
          </Button>
          <p className="text-xs text-muted-foreground">
            Grounded in your coursebook and syllabus knowledge base. Diagrams are taken from the
            diagram library so every figure follows Cambridge convention.
          </p>
        </section>

        <section className="min-w-0 p-5 md:p-8">
          {!essay ? (
            <div className="flex h-full min-h-64 flex-col items-center justify-center gap-3 text-center">
              <span className="flex size-11 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <GraduationCap className="size-5" />
              </span>
              <p className="max-w-sm text-sm text-muted-foreground">
                Choose the level, topic and marks, paste the question, and a principal-examiner
                model answer appears here with diagrams and an AO breakdown.
              </p>
            </div>
          ) : (
            <article className="space-y-6">
              <header className="space-y-3">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant="secondary">{essay.era === "2027" ? "2027–2029" : "Legacy"}</Badge>
                  <Badge variant="outline">{essay.topic}</Badge>
                  <Badge variant="outline">{essay.maxMark} marks</Badge>
                  <Badge variant={essay.wordCount > essay.wordLimit ? "destructive" : "outline"}>
                    {essay.wordCount} / {essay.wordLimit} words
                  </Badge>
                </div>
                <p className="text-base font-semibold text-foreground leading-snug">
                  {essay.question}
                </p>
                {essay.trimmedToFit ? (
                  <p className="text-xs text-muted-foreground">
                    Trimmed to fit the {essay.wordLimit}-word exam-standard limit.
                  </p>
                ) : null}

                {/* Quick Action Toolbar */}
                <div className="flex flex-wrap items-center justify-between gap-3 border-y border-border/70 py-2.5">
                  <div className="flex items-center gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={handleCopyEssay}
                      className="gap-1.5 text-xs"
                    >
                      {copied ? (
                        <Check className="size-3.5 text-emerald-600" />
                      ) : (
                        <Copy className="size-3.5" />
                      )}
                      {copied ? "Copied!" : "Copy Model Essay"}
                    </Button>
                    <Button asChild size="sm" variant="outline" className="gap-1.5 text-xs">
                      <Link to="/grade">
                        <Sparkles className="size-3.5 text-primary" /> Mark an Answer
                      </Link>
                    </Button>
                  </div>
                  <span className="text-[11px] text-muted-foreground flex items-center gap-1 font-medium">
                    <ShieldCheck className="size-3.5 text-primary" /> Cambridge IGCSE 0455 Standard
                  </span>
                </div>
              </header>

              <div className="grid gap-3 sm:grid-cols-4">
                <div className="rounded-lg border border-border bg-card p-4">
                  <p className="text-[11px] font-semibold tracking-wide text-muted-foreground uppercase">
                    Estimated mark
                  </p>
                  <p className="text-2xl font-semibold">
                    {essay.estimatedMark}
                    <span className="text-base text-muted-foreground">/{essay.maxMark}</span>
                  </p>
                </div>
                <AoCard
                  label="AO1 Knowledge"
                  score={essay.ao.ao1}
                  max={essay.aoMax.ao1}
                  bar="bg-ao1"
                />
                <AoCard
                  label="AO2 Analysis"
                  score={essay.ao.ao2}
                  max={essay.aoMax.ao2}
                  bar="bg-ao2"
                />
                <AoCard
                  label="AO3 Evaluation"
                  score={essay.ao.ao3}
                  max={essay.aoMax.ao3}
                  bar="bg-ao3"
                />
              </div>

              {essay.keyTerms.length > 0 ? (
                <div className="rounded-xl border border-border bg-card p-4 md:p-5">
                  <h3 className="mb-3 text-sm font-semibold">Key terms defined</h3>
                  <dl className="divide-y divide-border">
                    {essay.keyTerms.map((term) => (
                      <div
                        key={term.term}
                        className="grid gap-1 py-2 sm:grid-cols-[160px_1fr] sm:gap-4"
                      >
                        <dt className="text-sm font-medium">{term.term}</dt>
                        <dd className="text-sm text-muted-foreground">{term.definition}</dd>
                      </div>
                    ))}
                  </dl>
                </div>
              ) : null}

              <div className="space-y-6">
                {essay.sections.map((section, sectionIndex) => {
                  const headingLower = section.heading.toLowerCase();
                  const isAo1 =
                    headingLower.includes("intro") ||
                    headingLower.includes("definition") ||
                    headingLower.includes("knowledge");
                  const isAo3 =
                    headingLower.includes("evaluat") ||
                    headingLower.includes("judgement") ||
                    headingLower.includes("conclusion") ||
                    headingLower.includes("assess");
                  const aoBadge = isAo1
                    ? { code: "AO1", label: "Knowledge", color: "border-ao1/40 bg-ao1/10 text-ao1" }
                    : isAo3
                      ? {
                          code: "AO3",
                          label: "Evaluation",
                          color: "border-ao3/40 bg-ao3/10 text-ao3",
                        }
                      : {
                          code: "AO2",
                          label: "Analysis",
                          color: "border-ao2/40 bg-ao2/10 text-ao2",
                        };

                  return (
                    <section key={sectionIndex} className="space-y-3">
                      <div className="flex items-center justify-between border-b border-border pb-1.5">
                        <h3 className="text-sm font-semibold">{section.heading}</h3>
                        <Badge
                          variant="outline"
                          className={cn("text-[10px] font-semibold", aoBadge.color)}
                        >
                          {aoBadge.code} {aoBadge.label}
                        </Badge>
                      </div>
                      {section.paragraphs.map((paragraph, index) => (
                        <p
                          key={index}
                          className="text-[15px] leading-[1.8] font-sans text-foreground/90"
                        >
                          {paragraph}
                        </p>
                      ))}
                      {section.diagramIds.map((id) => {
                        const entry = getDiagram(id);
                        if (!entry) return null;
                        return (
                          <figure
                            key={id}
                            className="rounded-lg border border-border bg-card p-3 md:p-4"
                          >
                            <EconomicsDiagram
                              spec={entry.spec}
                              title={entry.title}
                              className="mx-auto max-w-lg"
                            />
                            <figcaption className="mt-1 text-center text-xs text-muted-foreground">
                              {entry.title}
                            </figcaption>
                          </figure>
                        );
                      })}
                    </section>
                  );
                })}
              </div>

              {essay.examinerComments.length > 0 ? (
                <div className="rounded-xl border border-border bg-card p-4 md:p-5">
                  <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold">
                    <Quote className="size-4 text-primary" /> Examiner comments
                  </h3>
                  <ul className="space-y-2">
                    {essay.examinerComments.map((comment, index) => (
                      <li key={index} className="flex gap-2.5 text-sm text-muted-foreground">
                        <span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-primary/70" />
                        <span>{comment}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}

              {essay.markSchemeNotes.length > 0 ? (
                <div className="rounded-xl border border-border bg-card p-4 md:p-5">
                  <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold">
                    <Sparkles className="size-4 text-primary" /> What a mark scheme credits here
                  </h3>
                  <ul className="space-y-2">
                    {essay.markSchemeNotes.map((note, index) => (
                      <li key={index} className="flex gap-2.5 text-sm text-muted-foreground">
                        <span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-muted-foreground/60" />
                        <span>{note}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}
            </article>
          )}
        </section>
      </div>
    </>
  );
}

function AoCard({
  label,
  score,
  max,
  bar,
}: {
  label: string;
  score: number;
  max: number;
  bar: string;
}) {
  return (
    <div className="rounded-lg border border-border bg-card p-4">
      <p className="text-[11px] font-semibold tracking-wide text-muted-foreground uppercase">
        {label}
      </p>
      <p className="text-2xl font-semibold">
        {score}
        <span className="text-base text-muted-foreground">/{max}</span>
      </p>
      <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-muted">
        <div
          className={cn("h-full rounded-full", bar)}
          style={{ width: `${max > 0 ? (score / max) * 100 : 0}%` }}
        />
      </div>
    </div>
  );
}
