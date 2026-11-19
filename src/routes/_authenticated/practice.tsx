import { createFileRoute } from "@tanstack/react-router";
import { useMutation } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { ArrowRight, Check, Circle, Loader2, ShieldCheck, Sparkles, X } from "lucide-react";
import { useState, useEffect } from "react";
import { toast } from "sonner";

import { PageHeader } from "@/components/app/app-shell";
import { HandwritingUpload } from "@/components/app/handwriting-upload";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { coachAoPoint } from "@/lib/coach.functions";
import { aoMaxMarks } from "@/lib/examiner/config";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/practice")({
  head: () => ({
    meta: [
      { title: "AO skills coach — Marginalite" },
      {
        name: "description",
        content:
          "Practise AO1 knowledge, AO2 analysis and AO3 evaluation points one at a time and get exact, examiner-level rewrites for Cambridge IGCSE Economics 0455.",
      },
      { property: "og:title", content: "AO skills coach — Marginalite" },
      {
        property: "og:description",
        content: "Write one point, get told exactly what to change to make it credit-worthy.",
      },
    ],
  }),
  component: PracticePage,
});

type Ao = "ao1" | "ao2" | "ao3";

/**
 * Cambridge 0455 question tariffs the coach supports: 2, 4, 6, and 8 marks
 * corresponding to subparts (a), (b), (c), and (d) of Paper 2.
 */
const TARIFFS = [2, 4, 6, 8] as const;
type Tariff = (typeof TARIFFS)[number];

const TABS: {
  key: Ao;
  short: string;
  label: string;
  blurb: string;
  placeholder: string;
  dot: string;
  text: string;
}[] = [
  {
    key: "ao1",
    short: "AO1",
    label: "Knowledge point",
    blurb:
      "Define the term precisely, state the mechanism accurately and apply it to the context. One point only.",
    placeholder:
      "e.g. A subsidy is a payment made by the government to producers to lower their costs of production…",
    dot: "bg-ao1",
    text: "text-ao1",
  },
  {
    key: "ao2",
    short: "AO2",
    label: "Analysis point",
    blurb:
      "Build one causal chain: cause → step → step → outcome in context, with the diagram movement.",
    placeholder:
      "e.g. A subsidy lowers marginal cost, so the supply curve shifts right, therefore…",
    dot: "bg-ao2",
    text: "text-ao2",
  },
  {
    key: "ao3",
    short: "AO3",
    label: "Evaluation point",
    blurb:
      "Make a judgement and justify it with a criterion — magnitude, elasticity, time period, counterfactual.",
    placeholder: "e.g. The size of this effect depends on the price elasticity of demand, because…",
    dot: "bg-ao3",
    text: "text-ao3",
  },
];

function PracticePage() {
  const COACH_DRAFT_KEY = "marginalite_coach_draft";
  const [ao, setAo] = useState<Ao>("ao2");
  const [tariff, setTariff] = useState<Tariff>(8);
  const [question, setQuestion] = useState(() => {
    if (typeof window !== "undefined") {
      try {
        const saved = localStorage.getItem("marginalite_coach_draft");
        if (saved) {
          const parsed = JSON.parse(saved);
          if (parsed.question) return parsed.question;
        }
      } catch {}
    }
    return "";
  });
  const [pointText, setPointText] = useState(() => {
    if (typeof window !== "undefined") {
      try {
        const saved = localStorage.getItem("marginalite_coach_draft");
        if (saved) {
          const parsed = JSON.parse(saved);
          if (parsed.pointText) return parsed.pointText;
        }
      } catch {}
    }
    return "";
  });

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      if (question.trim() || pointText.trim()) {
        localStorage.setItem(COACH_DRAFT_KEY, JSON.stringify({ question, pointText }));
      }
    } catch {}
  }, [question, pointText]);

  const coach = useServerFn(coachAoPoint);
  const active = TABS.find((tab) => tab.key === ao)!;
  const AO_MARKS = aoMaxMarks(tariff);

  const mutation = useMutation({
    mutationFn: () => coach({ data: { ao, question, pointText, maxMark: tariff } }),
    onError: (error: Error) => toast.error(error.message),
  });

  const feedback = mutation.data;

  return (
    <>
      <PageHeader
        title="AO skills coach"
        description="Write one point at a time. The examiner tells you exactly what to change — then shows you the same point written at exam standard."
      />

      <div className="px-5 pt-6 pb-0 md:px-8">
        <div className="flex items-center gap-2.5 rounded-xl border border-primary/20 bg-primary/[0.04] px-4 py-2.5 text-xs text-muted-foreground">
          <ShieldCheck className="size-4 shrink-0 text-primary" />
          <p className="leading-relaxed">
            <strong className="text-foreground font-semibold">
              Cambridge IGCSE 0455 Assessment Objectives:
            </strong>{" "}
            Drills are mapped directly to Cambridge criteria — Knowledge (AO1), Causal Chain
            Analysis (AO2), and Justified Evaluation (AO3).
          </p>
        </div>
      </div>

      <div className="grid gap-6 px-5 py-6 md:px-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <div className="space-y-4">
          <div className="flex gap-2">
            {TABS.map((tab) => (
              <button
                key={tab.key}
                type="button"
                onClick={() => {
                  setAo(tab.key);
                  mutation.reset();
                }}
                className={cn(
                  "flex flex-1 items-center gap-2 rounded-lg border border-border px-3 py-2 text-left text-xs transition-colors",
                  tab.key === ao ? "bg-accent text-accent-foreground" : "hover:bg-accent/50",
                )}
              >
                <span className={cn("size-2 rounded-full", tab.dot)} />
                <span>
                  <span className="block font-semibold">{tab.short}</span>
                  <span className="block text-muted-foreground">{tab.label}</span>
                </span>
              </button>
            ))}
          </div>

          <div className="panel space-y-3 p-5">
            <p className="text-xs leading-relaxed text-muted-foreground">{active.blurb}</p>

            <div className="space-y-1.5">
              <span className="text-xs font-medium">Question tariff</span>
              <div className="flex gap-2">
                {TARIFFS.map((t) => {
                  const marks = aoMaxMarks(t);
                  return (
                    <button
                      key={t}
                      type="button"
                      onClick={() => setTariff(t)}
                      className={cn(
                        "flex-1 rounded-lg border border-border px-3 py-1.5 text-xs transition-colors",
                        t === tariff
                          ? "bg-accent text-accent-foreground"
                          : "hover:bg-accent/50 text-muted-foreground",
                      )}
                    >
                      <span className="block font-semibold">{t}-mark</span>
                      <span className="block text-[10px]">
                        AO1 {marks.ao1} · AO2 {marks.ao2} · AO3 {marks.ao3}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-medium" htmlFor="coach-question">
                Question or topic
              </label>
              <Input
                id="coach-question"
                value={question}
                onChange={(event) => setQuestion(event.target.value)}
                placeholder="Discuss whether a subsidy is the best way to reduce urban congestion."
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-medium" htmlFor="coach-point">
                Your {active.label.toLowerCase()}
              </label>
              <Textarea
                id="coach-point"
                rows={10}
                value={pointText}
                onChange={(event) => setPointText(event.target.value)}
                placeholder={active.placeholder}
                className="text-[13px] leading-relaxed"
              />
              <p className="text-[11px] text-muted-foreground">
                {pointText.trim().split(/\s+/).filter(Boolean).length} words
              </p>
            </div>

            <HandwritingUpload
              hint={question}
              onText={(text) =>
                setPointText((current: string) => (current.trim() ? `${current.trim()}\n\n${text}` : text))
              }
            />

            <Button
              disabled={
                mutation.isPending || question.trim().length < 5 || pointText.trim().length < 20
              }
              onClick={() => mutation.mutate()}
            >
              {mutation.isPending ? (
                <>
                  <Loader2 className="size-4 animate-spin" /> Coaching your {active.short} point…
                </>
              ) : (
                <>
                  <Sparkles className="size-4" /> Get {active.short} feedback
                </>
              )}
            </Button>
          </div>
        </div>

        <div className="space-y-4">
          {!feedback && !mutation.isPending ? (
            <div className="panel p-5 text-sm text-muted-foreground">
              Feedback appears here: what already earns credit, the exact requirement you are
              missing, the changes to make in order, and a rewrite of your own point at exam
              standard.
            </div>
          ) : null}

          {mutation.isPending ? (
            <div className="panel flex items-center gap-2 p-5 text-sm text-muted-foreground">
              <Loader2 className="size-4 animate-spin" /> Marking this point against the{" "}
              {active.short} criteria…
            </div>
          ) : null}

          {feedback ? (
            <>
              <div className="panel space-y-3 p-5">
                <div className="flex flex-wrap items-center gap-3">
                  <span className={cn("text-3xl font-semibold tabular-nums", active.text)}>
                    {feedback.score}
                    <span className="text-base text-muted-foreground">
                      /{feedback.maxScore ?? AO_MARKS[ao]}
                    </span>
                  </span>
                  {feedback.scoreLabel ? (
                    <Badge variant="secondary">{feedback.scoreLabel}</Badge>
                  ) : null}
                  <Badge variant="outline">{active.short} only</Badge>
                </div>
                <p className="text-sm leading-relaxed">{feedback.verdict}</p>
              </div>

              {(feedback.chain?.length ?? 0) > 0 ? (
                <div className="panel space-y-3 p-5">
                  <div className="flex items-center justify-between">
                    <h2 className="text-sm font-semibold flex items-center gap-2">
                      <Sparkles className="size-4 text-primary" />
                      {ao === "ao2" ? "Economic Causal Chain (AO2)" : "Key Assessment Requirements"}
                    </h2>
                    <Badge variant="outline" className="text-[10px]">
                      {(feedback.chain ?? []).filter((s) => s.present).length}/{(feedback.chain?.length ?? 0)} Links
                      Formed
                    </Badge>
                  </div>
                  <div className="space-y-2">
                    {(feedback.chain ?? []).map((step, index) => (
                      <div
                        key={index}
                        className={cn(
                          "flex items-start gap-3 rounded-lg border p-3 text-xs transition-colors",
                          step.present
                            ? "border-emerald-500/30 bg-emerald-500/5 text-foreground"
                            : "border-border/80 bg-muted/20 text-muted-foreground",
                        )}
                      >
                        <span
                          className={cn(
                            "flex size-5 shrink-0 items-center justify-center rounded-full text-[10px] font-bold",
                            step.present
                              ? "bg-emerald-500/20 text-emerald-600 dark:text-emerald-400"
                              : "bg-muted text-muted-foreground",
                          )}
                        >
                          {index + 1}
                        </span>
                        <div className="min-w-0 flex-1 space-y-0.5">
                          <div className="flex items-center justify-between">
                            <span className="font-semibold text-foreground">
                              {step.present ? "Step Established" : "Missing Reasoning Link"}
                            </span>
                            <Badge
                              variant="outline"
                              className={cn(
                                "text-[9px] px-1.5 py-0 font-semibold",
                                step.present
                                  ? "border-emerald-500/40 text-emerald-600 dark:text-emerald-400"
                                  : "border-muted-foreground/30 text-muted-foreground",
                              )}
                            >
                              {step.present ? "✓ Credit Earned" : "Needs Addition"}
                            </Badge>
                          </div>
                          <p className="leading-relaxed">{step.step}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : null}

              {(feedback.whatWorks?.length ?? 0) > 0 || (feedback.whatIsMissing?.length ?? 0) > 0 ? (
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="panel space-y-2 p-4">
                    <h3 className="text-xs font-semibold text-muted-foreground">
                      Already credit-worthy
                    </h3>
                    <ul className="space-y-1.5">
                      {(feedback.whatWorks ?? []).map((item, index) => (
                        <li key={index} className="flex gap-2 text-xs leading-relaxed">
                          <Check className="mt-0.5 size-3.5 shrink-0 text-primary" />
                          {item}
                        </li>
                      ))}
                    </ul>
                  </div>
                  <div className="panel space-y-2 p-4">
                    <h3 className="text-xs font-semibold text-muted-foreground">Missing</h3>
                    <ul className="space-y-1.5">
                      {(feedback.whatIsMissing ?? []).map((item, index) => (
                        <li key={index} className="flex gap-2 text-xs leading-relaxed">
                          <X className="mt-0.5 size-3.5 shrink-0 text-destructive" />
                          {item}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              ) : null}

              {(feedback.fixList?.length ?? 0) > 0 ? (
                <div className="panel space-y-3 p-5">
                  <h2 className="text-sm font-semibold">Change exactly this</h2>
                  {(feedback.fixList ?? []).map((fix, index) => (
                    <div key={index} className="rounded-lg border border-border p-3">
                      <p className="text-sm font-medium">
                        {index + 1}. {fix.change}
                      </p>
                      {fix.why ? (
                        <p className="mt-1 text-xs text-muted-foreground">{fix.why}</p>
                      ) : null}
                      {fix.example ? (
                        <p className="mt-2 rounded-md bg-muted/50 p-2 text-xs leading-relaxed italic">
                          “{fix.example}”
                        </p>
                      ) : null}
                    </div>
                  ))}
                </div>
              ) : null}

              {feedback.modelAnswer ? (
                <div className="panel space-y-3 p-5">
                  <h2 className="text-sm font-semibold">Your point, rewritten at exam standard</h2>
                  <p className="text-sm leading-relaxed whitespace-pre-wrap">
                    {feedback.modelAnswer}
                  </p>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setPointText(feedback.modelAnswer);
                      toast.success("Loaded into the editor — now make it your own.");
                    }}
                  >
                    <ArrowRight className="size-4" /> Edit from this version
                  </Button>
                </div>
              ) : null}

              {feedback.nextDrill ? (
                <div className="panel space-y-2 p-5">
                  <h2 className="text-sm font-semibold">Next drill</h2>
                  <p className="text-sm leading-relaxed text-muted-foreground">
                    {feedback.nextDrill}
                  </p>
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => {
                      setPointText("");
                      mutation.reset();
                    }}
                  >
                    Start the drill
                  </Button>
                </div>
              ) : null}

              {(feedback.sources?.length ?? 0) > 0 ? (
                <details className="panel p-4">
                  <summary className="cursor-pointer text-xs font-semibold text-muted-foreground">
                    Grounded in {feedback.sources?.length ?? 0} source
                    {(feedback.sources?.length ?? 0) === 1 ? "" : "s"} from your knowledge base
                  </summary>
                  <ul className="mt-2 space-y-1.5">
                    {(feedback.sources ?? []).map((source, index) => (
                      <li key={index} className="text-[11px] text-muted-foreground">
                        [S{index + 1}] {source.documentTitle}
                        {source.heading ? ` — ${source.heading}` : ""}
                      </li>
                    ))}
                  </ul>
                </details>
              ) : null}
            </>
          ) : null}
        </div>
      </div>
    </>
  );
}
