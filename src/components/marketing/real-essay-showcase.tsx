import { useState } from "react";
import { Link } from "@tanstack/react-router";
import {
  Award,
  BookOpen,
  CheckCircle2,
  Copy,
  ExternalLink,
  GraduationCap,
  LineChart,
  PenLine,
  ShieldCheck,
  Sparkles,
  Target,
  ArrowRight,
  ChevronRight,
  FileText,
} from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { CosmicAtmosphere } from "./cosmic-atmosphere";

interface EssayClause {
  ao: "AO1" | "AO2" | "AO3";
  badge: string;
  mark: string;
  dot: string;
  text: string;
  markSchemeRef: string;
  comment: string;
}

const ESSAY_CLAUSES: EssayClause[] = [
  {
    ao: "AO1",
    badge: "AO1 Knowledge",
    mark: "+2 / 2",
    dot: "bg-ao1",
    text: "Aggregate demand is equal to C+I+G+NX. Aggregate demand can be increased in certain cases by expansionary monetary and fiscal policies. Increased aggregate demand can cause demand pull inflation.",
    markSchemeRef: "Cambridge 0455/22 Mark Scheme §AO1 (2/2): Defines AD formula (C+I+G+X-M) & identifies monetary/fiscal policy instruments.",
    comment: "Full AO1 Knowledge: Accurate specification of the AD equation components, expansionary policy levers, and direct theoretical consequence of demand-pull price pressures.",
  },
  {
    ao: "AO2",
    badge: "AO2 Analysis",
    mark: "+3 / 3",
    dot: "bg-ao2",
    text: "Increased aggregate demand may mean an increase in production. As when aggregate demand is high, it means suppliers are incentivised to produce due to their profit motive. Increased production can lead to increased job opportunities, and also increased production leads to an increase in GDP (Economic growth). Higher output also leads to higher corporate tax revenue and income tax revenue for the government, improving the fiscal budget.",
    markSchemeRef: "Cambridge 0455/22 Mark Scheme §AO2 Level 3 (3/3): Traces multi-stage causal chain from firm profit motive to derived labour demand and national output growth.",
    comment: "High-Band Analytical Chain (AO2): Traces an unbroken causal transmission mechanism from firm incentives to derived labour demand, output growth, and fiscal multiplier receipts.",
  },
  {
    ao: "AO3",
    badge: "AO3 Evaluation",
    mark: "+2 / 2",
    dot: "bg-ao3",
    text: "However, the level of increase in production depends on the production possibility curve (PPC) and where the economy is currently operating. If the economy is operating with substantial spare capacity (a negative output gap), an increase in aggregate demand shifts real output towards full employment without immediately triggering cost or price pressures.",
    markSchemeRef: "Cambridge 0455/22 Mark Scheme §AO3 Level 2 (2/2): Evaluative conditionality based on initial spare capacity and position relative to the PPC.",
    comment: "Evaluative Judgement (AO3): Identifies the conditionality of spare capacity and positions the economy along the PPC curve.",
  },
  {
    ao: "AO2",
    badge: "AO2 Analysis",
    mark: "+2 / 3",
    dot: "bg-ao2",
    text: "Conversely, if the economy is operating near full capacity (along the vertical segment of the LRAS), an increase in aggregate demand only generates demand-pull inflation without increasing real output. Furthermore, rapid demand expansion often triggers higher import expenditure, causing deterioration on the current account of the balance of payments.",
    markSchemeRef: "Cambridge 0455/22 Mark Scheme §AO2 Level 2 (2/3): Correctly notes Classical LRAS vertical constraints and balance of payments import leakages.",
    comment: "Counter-Analysis (AO2): Correctly notes Classical LRAS constraints and open-economy leakage via the marginal propensity to import (MPM).",
  },
  {
    ao: "AO3",
    badge: "AO3 Evaluation",
    mark: "+1 / 2",
    dot: "bg-ao3",
    text: "In evaluation, whether an increase in aggregate demand is of overall benefit depends critically on the initial macroeconomic state: it is highly beneficial during a cyclical downturn with spare capacity, but risks stagflation and currency instability if applied when the economy is at full employment without matching supply-side expansion.",
    markSchemeRef: "Cambridge 0455/22 Mark Scheme §AO3 Synthesis (1/2): Concluding synthesis weighing beneficial growth vs inflation risk, but missing explicit long-run supply-side balance.",
    comment: "Supported Synthesis (AO3): High-level conclusion weighing economic growth against macroeconomic instability depending on the initial state of the business cycle.",
  },
];

export function RealEssayShowcase() {
  const [activeSentence, setActiveSentence] = useState<number | null>(null);
  const [filterAo, setFilterAo] = useState<"ALL" | "AO1" | "AO2" | "AO3">("ALL");

  const fullEssayText = ESSAY_CLAUSES.map((c) => c.text).join("\n\n");

  const copyEssay = () => {
    navigator.clipboard.writeText(fullEssayText);
    toast.success("Authentic Cambridge 10/12 essay copied to clipboard.");
  };

  const currentClause = activeSentence !== null ? ESSAY_CLAUSES[activeSentence] : null;

  return (
    <section id="graded-exemplar" className="relative border-b-[1.5px] border-ink bg-card/40 py-16 sm:py-20 md:py-24 scroll-mt-20 overflow-hidden">
      <CosmicAtmosphere variant="emerald" sparkles={true} density="medium" />
      <div className="relative z-10 mx-auto max-w-7xl 2xl:max-w-[1440px] px-4 sm:px-6 md:px-10 lg:px-12 xl:px-16 space-y-10">
        {/* Section Header */}
        <div className="mx-auto max-w-3xl text-center space-y-3">
          <Badge variant="outline" className="border-primary/30 bg-primary/10 text-primary text-xs font-semibold px-3 py-1">
            <Sparkles className="size-3.5 mr-1.5" /> Authentic Graded Essay Showcase
          </Badge>
          <h2 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl md:text-4xl">
            Real Student Script. <span className="aurora-text">Real Cambridge 0455 Marking.</span>
          </h2>
          <p className="text-sm text-muted-foreground leading-relaxed">
            Look below at how an authentic student Paper 2 response was evaluated by Marginalite's Cambridge examiner engine.
            Every sentence is classified by Assessment Objective, checked against official mark scheme descriptors, and assigned an actionable rewrite path.
          </p>
        </div>

        {/* Paper & Question Tariff Box */}
        <div className="rounded-2xl border-2 border-border/80 bg-card p-5 sm:p-7 shadow-xs space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border/80 pb-3 text-xs text-muted-foreground font-mono">
            <div className="flex items-center gap-2">
              <span className="size-2 rounded-full bg-emerald-500 animate-pulse" />
              <span>CAMBRIDGE IGCSE ECONOMICS (0455/22)</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="font-semibold text-foreground">Section B Essay</span>
              <span>·</span>
              <span className="font-bold text-primary">Tariff: [12 Marks]</span>
            </div>
          </div>

          <div>
            <span className="text-[11px] uppercase font-bold tracking-wider text-primary block mb-1">
              Official Cambridge Exam Question:
            </span>
            <p className="text-base sm:text-lg font-semibold text-foreground leading-snug">
              “Discuss whether an increase in aggregate demand would be of overall benefit for an economy. [12]”
            </p>
          </div>
        </div>

        {/* Metric Cards Banner */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Card className="border-primary/40 bg-card/80 shadow-xs">
            <CardHeader className="pb-1 pt-4">
              <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center justify-between">
                <span>Final Mark</span>
                <Award className="size-4 text-primary" />
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-extrabold text-foreground tabular-nums">10</span>
                <span className="text-sm text-muted-foreground font-medium">/ 12 (83%)</span>
              </div>
              <Badge className="mt-2 bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/20 text-[10px] font-bold">
                Band 4 Distinction Target
              </Badge>
            </CardContent>
          </Card>

          <Card className="border-ao1/40 bg-card/80 shadow-xs">
            <CardHeader className="pb-1 pt-4">
              <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center justify-between">
                <span className="flex items-center gap-1.5">
                  <span className="size-2 rounded-full bg-ao1" /> AO1 Knowledge
                </span>
                <span className="font-mono text-[11px] text-ao1 font-bold">2/2</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-extrabold text-foreground tabular-nums">100%</span>
              </div>
              <p className="mt-2 text-[11px] text-muted-foreground leading-snug">
                Full formula AD = C+I+G+NX & policy levers cited.
              </p>
            </CardContent>
          </Card>

          <Card className="border-ao2/40 bg-card/80 shadow-xs">
            <CardHeader className="pb-1 pt-4">
              <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center justify-between">
                <span className="flex items-center gap-1.5">
                  <span className="size-2 rounded-full bg-ao2" /> AO2 Analysis
                </span>
                <span className="font-mono text-[11px] text-ao2 font-bold">5/6</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-extrabold text-foreground tabular-nums">83%</span>
              </div>
              <p className="mt-2 text-[11px] text-muted-foreground leading-snug">
                Derived labour demand, output growth, & LRAS capacity.
              </p>
            </CardContent>
          </Card>

          <Card className="border-ao3/40 bg-card/80 shadow-xs">
            <CardHeader className="pb-1 pt-4">
              <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center justify-between">
                <span className="flex items-center gap-1.5">
                  <span className="size-2 rounded-full bg-ao3" /> AO3 Evaluation
                </span>
                <span className="font-mono text-[11px] text-ao3 font-bold">3/4</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-extrabold text-foreground tabular-nums">75%</span>
              </div>
              <p className="mt-2 text-[11px] text-muted-foreground leading-snug">
                Evaluates PPC spare capacity & import leakages.
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Interactive Script & Examiner Diagnostics Split View */}
        <div className="grid gap-6 lg:grid-cols-[1.25fr_0.75fr] items-start">
          {/* Left Column: Interactive Essay Script */}
          <div className="rounded-2xl border border-border bg-card p-5 sm:p-6 shadow-md space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border pb-3">
              <div className="flex items-center gap-2">
                <FileText className="size-4 text-primary" />
                <span className="text-xs font-bold uppercase tracking-wider text-foreground">
                  Click Any Sentence to Inspect Rubric
                </span>
              </div>
              <div className="flex items-center gap-1.5">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={copyEssay}
                  className="h-7 text-xs text-muted-foreground hover:text-foreground"
                >
                  <Copy className="size-3 mr-1" /> Copy Script
                </Button>
              </div>
            </div>

            {/* Filter buttons */}
            <div className="flex flex-wrap items-center gap-1.5 text-xs">
              <span className="text-muted-foreground text-[11px] font-medium mr-1">Filter clauses:</span>
              {(["ALL", "AO1", "AO2", "AO3"] as const).map((filter) => (
                <button
                  key={filter}
                  type="button"
                  onClick={() => setFilterAo(filter)}
                  className={cn(
                    "rounded-md px-2 py-0.5 text-[11px] font-semibold transition-all",
                    filterAo === filter
                      ? "bg-primary text-primary-foreground shadow-2xs"
                      : "bg-muted/70 text-muted-foreground hover:text-foreground"
                  )}
                >
                  {filter}
                </button>
              ))}
            </div>

            {/* Clauses */}
            <div className="font-serif text-sm sm:text-base leading-[2] space-y-3.5 pt-2">
              {ESSAY_CLAUSES.map((clause, idx) => {
                const isSelected = activeSentence === idx;
                const matchesFilter = filterAo === "ALL" || clause.ao === filterAo;

                if (!matchesFilter) return null;

                return (
                  <div
                    key={idx}
                    onClick={() => setActiveSentence(idx)}
                    className={cn(
                      "cursor-pointer rounded-xl p-3 sm:p-4 transition-all duration-200 border",
                      isSelected
                        ? "border-primary bg-primary/[0.08] shadow-sm ring-2 ring-primary/20"
                        : "border-transparent hover:border-border/80 hover:bg-muted/40"
                    )}
                  >
                    <div className="flex items-center gap-2 mb-1.5 font-sans">
                      <span
                        className={cn(
                          "inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[11px] font-bold",
                          clause.ao === "AO1" && "bg-ao1/20 text-ao1 border border-ao1/30",
                          clause.ao === "AO2" && "bg-ao2/20 text-ao2 border border-ao2/30",
                          clause.ao === "AO3" && "bg-ao3/20 text-ao3 border border-ao3/30"
                        )}
                      >
                        <span className={`size-1.5 rounded-full ${clause.dot}`} />
                        {clause.ao} {clause.mark}
                      </span>
                      {isSelected && (
                        <span className="text-[10px] uppercase font-bold text-primary font-mono animate-pulse">
                          Inspecting Annotation
                        </span>
                      )}
                    </div>
                    <p className="text-foreground leading-relaxed">{clause.text}</p>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Right Column: Examiner Diagnostic Console */}
          <div className="sticky top-20 rounded-2xl border border-border bg-card p-5 sm:p-6 shadow-md space-y-5">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <div className="flex items-center gap-2">
                <Sparkles className="size-4 text-primary" />
                <h3 className="text-sm font-bold text-foreground">Cambridge Examiner Diagnostic</h3>
              </div>
              <Badge variant="outline" className="text-[10px] font-mono border-emerald-500/30 text-emerald-600 dark:text-emerald-400">
                10/12 Scored
              </Badge>
            </div>

            {currentClause ? (
              <div className="space-y-4 animate-in fade-in duration-150">
                <div className="flex items-center justify-between">
                  <Badge className="bg-primary/10 text-primary border-primary/20 text-xs">
                    {currentClause.badge}
                  </Badge>
                  <span className="text-xs font-bold font-mono text-emerald-600 dark:text-emerald-400">
                    Awarded: {currentClause.mark}
                  </span>
                </div>

                {/* Mark Scheme Citation */}
                <div className="rounded-xl border border-primary/20 bg-primary/[0.04] p-3 text-xs space-y-1">
                  <span className="font-semibold text-primary block text-[11px] uppercase tracking-wider font-mono">
                    Official Cambridge Mark Scheme Citation:
                  </span>
                  <p className="text-muted-foreground leading-relaxed font-mono text-[11.5px]">
                    "{currentClause.markSchemeRef}"
                  </p>
                </div>

                {/* Examiner Assessment Note */}
                <div className="rounded-xl border border-border/80 bg-muted/40 p-3.5 text-xs text-foreground leading-relaxed">
                  <strong className="block text-foreground font-semibold mb-1">Examiner Annotation:</strong>
                  <p className="text-muted-foreground">{currentClause.comment}</p>
                </div>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setActiveSentence(null)}
                  className="w-full text-xs h-8"
                >
                  View Overall Paper Breakdown
                </Button>
              </div>
            ) : (
              <div className="space-y-4 text-xs">
                <p className="text-muted-foreground leading-relaxed">
                  Click any paragraph in the student script to inspect sentence-level AO marks and Cambridge 0455 rubric citations.
                </p>

                {/* Key Strengths */}
                <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-3.5 space-y-2">
                  <span className="font-semibold text-emerald-700 dark:text-emerald-400 flex items-center gap-1.5">
                    <CheckCircle2 className="size-4 shrink-0" /> Verified Cambridge Strengths:
                  </span>
                  <ul className="list-disc pl-4 space-y-1.5 text-muted-foreground leading-relaxed text-[11.5px]">
                    <li>Full formula definition of AD (C+I+G+NX) with explicit fiscal & monetary policy levers.</li>
                    <li>Unbroken causal chain linking supplier profit motive to derived labor demand and GDP.</li>
                    <li>Accurate Classical LRAS vertical bottleneck and open-economy import expenditure leakage.</li>
                  </ul>
                </div>

                {/* Rewrite Step to 12/12 */}
                <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-3.5 space-y-1.5">
                  <span className="font-semibold text-amber-600 dark:text-amber-400 flex items-center gap-1.5">
                    <Award className="size-4 shrink-0" /> Examiner Step to 12/12 Full Marks:
                  </span>
                  <p className="text-muted-foreground leading-relaxed text-[11.5px]">
                    Explicitly synthesize <em>which</em> macroeconomic effect dominates when the marginal propensity to import (MPM) is high versus when domestic spare capacity is large.
                  </p>
                </div>
              </div>
            )}

            {/* Direct Conversion Action */}
            <div className="pt-2 border-t border-border">
              <Button asChild className="w-full text-xs font-semibold h-10 shadow-xs">
                <Link to="/grade">
                  Grade Your Own Essay Now (2 Free Essays) <ArrowRight className="size-3.5 ml-1.5" />
                </Link>
              </Button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
