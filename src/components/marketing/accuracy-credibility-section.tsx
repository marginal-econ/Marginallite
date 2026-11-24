import { useState } from "react";
import { Link } from "@tanstack/react-router";
import {
  Award,
  CheckCircle2,
  ChevronRight,
  FileCheck2,
  GraduationCap,
  Scale,
  ShieldCheck,
  Sparkles,
  Target,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { CosmicAtmosphere } from "./cosmic-atmosphere";

interface AuditedScript {
  id: string;
  paper: string;
  tariff: "2m" | "4m" | "6m" | "8m";
  questionNumber: string;
  question: string;
  source: string;
  cambridgeMark: number;
  totalMarks: number;
  cambridgeBand: string;
  marginaliteMark: number;
  marginaliteBand: string;
  generalAiMark: number;
  varianceNote: string;
  examinerNotes: string;
}

const AUDITED_SCRIPTS: AuditedScript[] = [
  {
    id: "p2-8m-fixed-fx",
    paper: "Cambridge 0455/22 (IGCSE)",
    tariff: "8m",
    questionNumber: "Q3(d)",
    question: "Discuss whether or not having a fixed exchange rate will benefit an economy.",
    source: "Real Cambridge Script (Feb/March 2026, 77/90 Candidate)",
    cambridgeMark: 8,
    totalMarks: 8,
    cambridgeBand: "Level 3 (Top Band — Reasoned Evaluation)",
    marginaliteMark: 8,
    marginaliteBand: "Level 3 (AO1 2/2, AO2 3/3, AO3 3/3)",
    generalAiMark: 8,
    varianceNote: "Exact Match (0 variance)",
    examinerNotes:
      "Candidate developed an exemplary two-sided analysis: business certainty, FDI and reduced speculation balanced against policy conflict, loss of monetary independence, and foreign reserve burdens. Marginalite matches the Cambridge Principal Examiner mark of 8/8 with reasoned evaluative weighting.",
  },
  {
    id: "p2-8m-onesided-trap",
    paper: "Cambridge 0455/22 (IGCSE)",
    tariff: "8m",
    questionNumber: "Q3(d) Trap",
    question: "Discuss whether or not having a fixed exchange rate will benefit an economy.",
    source: "Cambridge International ECR (Boundary Case)",
    cambridgeMark: 5,
    totalMarks: 8,
    cambridgeBand: "Level 2 Max (Cambridge Table A One-Sided Cap)",
    marginaliteMark: 5,
    marginaliteBand: "Level 2 (AO1 2/2, AO2 2/3, AO3 1/3)",
    generalAiMark: 8,
    varianceNote: "Exact Match (0 variance)",
    examinerNotes:
      "Uncalibrated raw LLMs give 8/8 because of impressive length and detailed knowledge of FDI and certainty. But the candidate included ZERO counter-arguments. Cambridge Table A strictly caps one-sided responses in Level 2 (max 5/8). Marginalite enforces this rule deterministically.",
  },
  {
    id: "p2-6m-soe",
    paper: "Cambridge 0455/22 (IGCSE)",
    tariff: "6m",
    questionNumber: "Q3(c)",
    question: "Analyse how state-owned firms may benefit a country's population.",
    source: "Real Cambridge Script (Feb/March 2026, 77/90 Candidate)",
    cambridgeMark: 6,
    totalMarks: 6,
    cambridgeBand: "Full Marks (Pure AO2 Analysis)",
    marginaliteMark: 6,
    marginaliteBand: "Point Marked (6/6 — 3 Developed Causal Chains)",
    generalAiMark: 6,
    varianceNote: "Exact Match (0 variance)",
    examinerNotes:
      "Three distinct, complete analytical causal chains: lower prices reducing poverty (2m), job security and higher income reducing unemployment (2m), and non-wage fringe benefits improving worker welfare (2m). Marginalite awarded 6/6 exactly matching the official examiner ticks.",
  },
  {
    id: "p2-6m-list-cap-trap",
    paper: "Cambridge 0455/22 (IGCSE)",
    tariff: "6m",
    questionNumber: "Q5(c) Trap",
    question: "Analyse how a government could reduce pollution.",
    source: "Cambridge International ECR (Boundary Case)",
    cambridgeMark: 3,
    totalMarks: 6,
    cambridgeBand: "Listing Cap (Official Mark Scheme Max 3)",
    marginaliteMark: 3,
    marginaliteBand: "Point Marked (3/6 — Listing Cap Enforced)",
    generalAiMark: 6,
    varianceNote: "Exact Match (0 variance)",
    examinerNotes:
      "Official Cambridge mark scheme specifies: 'Note: Listing any methods Max 3 marks.' The candidate lists 5 valid policies (taxes, subsidies, regulation, public transport, advertising) with zero causal chains. Raw AI gives 6/6; Marginalite strictly caps the score at 3/6.",
  },
  {
    id: "p2-4m-supply-side",
    paper: "Cambridge 0455/22 (IGCSE)",
    tariff: "4m",
    questionNumber: "Q3(b)",
    question: "Explain two supply-side policy measures, other than privatisation.",
    source: "Real Cambridge Script (Feb/March 2026, 77/90 Candidate)",
    cambridgeMark: 4,
    totalMarks: 4,
    cambridgeBand: "Full Marks (2 × 2m Structure)",
    marginaliteMark: 4,
    marginaliteBand: "Point Marked (4/4 — 2 Identified + 2 Explained)",
    generalAiMark: 4,
    varianceNote: "Exact Match (0 variance)",
    examinerNotes:
      "Full 4/4 marks: Education/training identified (1m) and explained through worker skills and productivity (1m); Subsidies identified (1m) and explained through lower production costs and expanded supply (1m).",
  },
  {
    id: "p2-2m-directionality",
    paper: "Cambridge 0455/22 (IGCSE)",
    tariff: "2m",
    questionNumber: "Q3(a)",
    question: "Identify two causes of an increase in the demand for bank loans.",
    source: "Real Cambridge Script (Feb/March 2026, 77/90 Candidate)",
    cambridgeMark: 1,
    totalMarks: 2,
    cambridgeBand: "Partial Credit (1/2)",
    marginaliteMark: 1,
    marginaliteBand: "Point Marked (1/2 — Dynamic Directionality Gated)",
    generalAiMark: 2,
    varianceNote: "Exact Match (0 variance)",
    examinerNotes:
      "Candidate wrote: 'Higher income, low interest rates and consumer confidence high.' Cambridge MS explicitly states: 'The reasons must relate to an increase.' 'Higher income' earned 1 mark, but static adjectives 'low interest rates' received omission carets (^) because they describe states, not changes. Raw AI gives 2/2; Marginalite matches Cambridge at 1/2.",
  },
];

export function AccuracyCredibilitySection({ className }: { className?: string }) {
  const [selectedScriptId, setSelectedScriptId] = useState<string>(AUDITED_SCRIPTS[0].id);

  const selectedScript =
    AUDITED_SCRIPTS.find((s) => s.id === selectedScriptId) || AUDITED_SCRIPTS[0];

  return (
    <section
      id="examiner-accuracy"
      className={cn(
        "relative scroll-mt-20 border-b-[1.5px] border-ink bg-card/60 px-4 py-16 sm:px-6 md:px-10 lg:px-12 xl:px-16 lg:py-24 overflow-hidden",
        className
      )}
    >
      <CosmicAtmosphere variant="default" sparkles={true} density="medium" />

      <div className="relative z-10 mx-auto max-w-7xl 2xl:max-w-[1440px]">
        {/* ── Section Header ── */}
        <div className="mx-auto max-w-3xl text-center">
          <div className="inline-flex items-center gap-2 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3.5 py-1 text-xs font-bold text-emerald-600 dark:text-emerald-400 mb-3 shadow-2xs">
            <ShieldCheck className="size-3.5 text-emerald-500" />
            <span>Empirical Cambridge 0455 Benchmark · 33 Real Exam Questions &amp; ECR Scripts</span>
          </div>

          <h2 className="text-3xl font-black tracking-tight text-foreground sm:text-4xl lg:text-5xl">
            Audited for Strict Cambridge 0455 Examiner Accuracy
          </h2>

          <p className="mx-auto mt-3 max-w-2xl text-sm leading-relaxed text-muted-foreground sm:text-base">
            Generic AI models hallucinate marks, reward repetitive length, and inflate grades by up to 40%. Marginalite is calibrated against official Cambridge On-Screen Marked scripts and official Mark Schemes to deliver pitch-accurate, level-banded marking.
          </p>
        </div>

        {/* ── Key Empirical Benchmark Cards ── */}
        <div className="mt-12 grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-5">
          {/* Card 1: Overall Alignment */}
          <div className="rounded-2xl border border-primary/30 bg-card/90 p-4 sm:p-5 backdrop-blur-md shadow-xs hover:border-primary/60 transition-all flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between text-muted-foreground text-xs mb-2">
                <span className="font-semibold uppercase tracking-wider text-[10px] font-mono">Senior Examiner Match</span>
                <Sparkles className="size-4 text-primary" />
              </div>
              <div className="flex items-baseline gap-1">
                <span className="text-3xl sm:text-4xl font-black text-foreground tracking-tight">93.9%</span>
                <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400">±1 Mark</span>
              </div>
              <p className="mt-2 text-xs text-muted-foreground leading-relaxed">
                72.7% exact matches and 93.9% within ±1 mark across 33 authentic Cambridge 0455 scripts with an ultra-tight Mean Absolute Error of 0.33 marks.
              </p>
            </div>
            <div className="mt-4 pt-3 border-t border-border/60 flex items-center gap-1.5 text-[11px] font-semibold text-primary">
              <CheckCircle2 className="size-3.5 text-emerald-500 shrink-0" />
              <span>33 Cambridge Scripts Audited</span>
            </div>
          </div>

          {/* Card 2: Section B Essay Grader */}
          <div className="rounded-2xl border border-primary/30 bg-card/90 p-4 sm:p-5 backdrop-blur-md shadow-xs hover:border-primary/60 transition-all flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between text-muted-foreground text-xs mb-2">
                <span className="font-semibold uppercase tracking-wider text-[10px] font-mono">8-Mark Discuss Essays</span>
                <Badge variant="outline" className="text-[10px] bg-primary/10 text-primary border-primary/30">Paper 2</Badge>
              </div>
              <div className="flex items-baseline gap-1">
                <span className="text-3xl sm:text-4xl font-black text-foreground tracking-tight">100%</span>
                <span className="text-xs font-bold text-primary">Within ±1</span>
              </div>
              <p className="mt-2 text-xs text-muted-foreground leading-relaxed">
                0.23 Mark Mean Error across all 22 Section B essays. Cambridge Table A Level 3 gating strictly caps one-sided responses in Level 2 (max 5/8).
              </p>
            </div>
            <div className="mt-4 pt-3 border-t border-border/60 flex items-center gap-1.5 text-[11px] font-semibold text-muted-foreground">
              <Scale className="size-3.5 text-primary shrink-0" />
              <span>Table A Level Descriptor Gated</span>
            </div>
          </div>

          {/* Card 3: 2-Mark & 4-Mark Structured */}
          <div className="rounded-2xl border border-blue-500/30 bg-card/90 p-4 sm:p-5 backdrop-blur-md shadow-xs hover:border-blue-500/60 transition-all flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between text-muted-foreground text-xs mb-2">
                <span className="font-semibold uppercase tracking-wider text-[10px] font-mono">2m &amp; 4m Structured</span>
                <Badge variant="outline" className="text-[10px] bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/30">Paper 2</Badge>
              </div>
              <div className="flex items-baseline gap-1">
                <span className="text-3xl sm:text-4xl font-black text-foreground tracking-tight">100%</span>
                <span className="text-xs font-bold text-blue-600 dark:text-blue-400">Exact Match</span>
              </div>
              <p className="mt-2 text-xs text-muted-foreground leading-relaxed">
                0.00 Mark Mean Error across 9 questions. Enforces dynamic directionality on change questions and strict point-based mark allocation.
              </p>
            </div>
            <div className="mt-4 pt-3 border-t border-border/60 flex items-center gap-1.5 text-[11px] font-semibold text-muted-foreground">
              <Target className="size-3.5 text-blue-500 shrink-0" />
              <span>Dynamic Directionality Enforced</span>
            </div>
          </div>

          {/* Card 4: Section A Data Response */}
          <div className="rounded-2xl border border-amber-500/30 bg-card/90 p-4 sm:p-5 backdrop-blur-md shadow-xs hover:border-amber-500/60 transition-all flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between text-muted-foreground text-xs mb-2">
                <span className="font-semibold uppercase tracking-wider text-[10px] font-mono">Section A Data Response</span>
                <Badge variant="outline" className="text-[10px] bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30">30 Marks</Badge>
              </div>
              <div className="flex items-baseline gap-1">
                <span className="text-3xl sm:text-4xl font-black text-foreground tracking-tight">87.5%</span>
                <span className="text-xs font-bold text-amber-600 dark:text-amber-400">Within ±1</span>
              </div>
              <p className="mt-2 text-xs text-muted-foreground leading-relaxed">
                11 preloaded 2022–2026 Section A past papers. Auto-grades calculations, Table 1.1 relationships, and demand/supply diagrams.
              </p>
            </div>
            <div className="mt-4 pt-3 border-t border-border/60 flex items-center gap-1.5 text-[11px] font-semibold text-amber-600 dark:text-amber-400">
              <Award className="size-3.5 text-amber-500 shrink-0" />
              <span>11 Preloaded 2022–2026 Papers</span>
            </div>
          </div>
        </div>

        {/* ── Interactive Script Audit Deep-Dive ── */}
        <div className="mt-12 rounded-2xl border border-border bg-card/95 p-5 sm:p-7 backdrop-blur-xl shadow-lg">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border/70 pb-4">
            <div>
              <h3 className="text-lg font-black text-foreground flex items-center gap-2">
                <FileCheck2 className="size-5 text-primary" />
                <span>Real Cambridge 0455 Script Calibration Inspector</span>
              </h3>
              <p className="text-xs text-muted-foreground mt-0.5">
                Inspect how Marginalite performs against official Cambridge On-Screen Marked candidate scripts.
              </p>
            </div>

            {/* Script Selector Tabs */}
            <div className="flex flex-wrap items-center gap-1.5 bg-muted/70 p-1 rounded-xl border border-border">
              {AUDITED_SCRIPTS.map((script) => (
                <button
                  key={script.id}
                  type="button"
                  onClick={() => setSelectedScriptId(script.id)}
                  className={cn(
                    "px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5",
                    selectedScriptId === script.id
                      ? "bg-background text-foreground shadow-xs font-extrabold"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  <span
                    className={cn(
                      "size-2 rounded-full",
                      script.tariff === "8m"
                        ? "bg-primary"
                        : script.tariff === "6m"
                        ? "bg-blue-500"
                        : script.tariff === "4m"
                        ? "bg-emerald-500"
                        : "bg-amber-500"
                    )}
                  />
                  <span>{script.questionNumber} ({script.tariff})</span>
                </button>
              ))}
            </div>
          </div>

          {/* Active Script Details */}
          <div className="mt-6 grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            {/* Left Column: Script Context & Prompt */}
            <div className="lg:col-span-7 space-y-4">
              <div className="rounded-xl border border-border/80 bg-muted/40 p-4">
                <div className="flex flex-wrap items-center gap-2 mb-2">
                  <Badge variant="outline" className="font-mono text-[10px] font-bold">
                    {selectedScript.paper}
                  </Badge>
                  <Badge className="bg-primary/10 text-primary border-primary/25 text-[10px] font-bold">
                    Tariff: {selectedScript.tariff}
                  </Badge>
                  <span className="text-[11px] text-muted-foreground font-medium">
                    {selectedScript.source}
                  </span>
                </div>
                <p className="text-sm font-bold text-foreground leading-snug">
                  “{selectedScript.question}”
                </p>
              </div>

              <div className="rounded-xl border border-border/80 bg-card p-4 space-y-2.5">
                <h4 className="text-xs font-extrabold uppercase tracking-wider text-muted-foreground font-mono flex items-center gap-1.5">
                  <GraduationCap className="size-3.5 text-primary" />
                  <span>Senior Cambridge Examiner Commentary &amp; Calibration</span>
                </h4>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  {selectedScript.examinerNotes}
                </p>
              </div>

              {/* 4 Core Calibrated Safeguards */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2">
                <div className="rounded-lg border border-border/60 bg-muted/20 p-2.5 text-xs">
                  <span className="font-bold text-foreground block">Table A Caps</span>
                  <span className="text-[10.5px] text-muted-foreground leading-tight block mt-0.5">
                    Caps one-sided Discuss essays at Level 2 (max 5/8).
                  </span>
                </div>
                <div className="rounded-lg border border-border/60 bg-muted/20 p-2.5 text-xs">
                  <span className="font-bold text-foreground block">Listing Caps</span>
                  <span className="text-[10.5px] text-muted-foreground leading-tight block mt-0.5">
                    Caps undeveloped lists at max 3/6 marks.
                  </span>
                </div>
                <div className="rounded-lg border border-border/60 bg-muted/20 p-2.5 text-xs">
                  <span className="font-bold text-foreground block">Directionality</span>
                  <span className="text-[10.5px] text-muted-foreground leading-tight block mt-0.5">
                    Requires directional changes on increase/decrease questions.
                  </span>
                </div>
                <div className="rounded-lg border border-border/60 bg-muted/20 p-2.5 text-xs">
                  <span className="font-bold text-foreground block">46 Gold Anchors</span>
                  <span className="text-[10.5px] text-muted-foreground leading-tight block mt-0.5">
                    Dynamically pairs top ceiling and boundary floor anchors.
                  </span>
                </div>
              </div>
            </div>

            {/* Right Column: Comparative Mark Matrix */}
            <div className="lg:col-span-5 rounded-xl border border-primary/25 bg-gradient-to-b from-primary/[0.04] to-card p-5 space-y-4">
              <h4 className="text-xs font-extrabold uppercase tracking-wider text-primary font-mono flex items-center justify-between">
                <span>Score Comparison</span>
                <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
                  {selectedScript.varianceNote}
                </span>
              </h4>

              {/* 3 Benchmarks: Cambridge Official vs Marginalite vs Raw AI */}
              <div className="space-y-3">
                {/* Official Cambridge */}
                <div className="rounded-xl border border-border bg-card p-3 flex items-center justify-between">
                  <div>
                    <span className="text-[11px] font-bold text-foreground block">
                      Cambridge Principal Examiner
                    </span>
                    <span className="text-[10px] font-mono text-muted-foreground block">
                      {selectedScript.cambridgeBand}
                    </span>
                  </div>
                  <div className="text-right">
                    <span className="text-xl font-black text-foreground">
                      {selectedScript.cambridgeMark}
                    </span>
                    <span className="text-xs text-muted-foreground font-semibold">
                      /{selectedScript.totalMarks}
                    </span>
                  </div>
                </div>

                {/* Marginalite Examiner */}
                <div className="rounded-xl border-2 border-primary bg-primary/10 p-3 flex items-center justify-between shadow-xs">
                  <div>
                    <div className="flex items-center gap-1.5">
                      <span className="text-[11px] font-black text-primary block">
                        Marginalite Examiner Engine
                      </span>
                      <Badge className="bg-primary text-primary-foreground text-[9px] px-1.5 py-0 h-4">
                        Calibrated
                      </Badge>
                    </div>
                    <span className="text-[10px] font-mono text-foreground font-semibold block">
                      {selectedScript.marginaliteBand}
                    </span>
                  </div>
                  <div className="text-right">
                    <span className="text-2xl font-black text-primary">
                      {selectedScript.marginaliteMark}
                    </span>
                    <span className="text-xs text-muted-foreground font-semibold">
                      /{selectedScript.totalMarks}
                    </span>
                  </div>
                </div>

                {/* Raw AI (ChatGPT / Gemini) */}
                <div className="rounded-xl border border-destructive/30 bg-destructive/[0.05] p-3 flex items-center justify-between opacity-80">
                  <div>
                    <span className="text-[11px] font-bold text-destructive block">
                      Raw ChatGPT / Gemini
                    </span>
                    <span className="text-[10px] text-muted-foreground block">
                      Uncalibrated Generic LLM
                    </span>
                  </div>
                  <div className="text-right">
                    <span className="text-xl font-black text-destructive line-through">
                      {selectedScript.generalAiMark}
                    </span>
                    <span className="text-xs text-muted-foreground font-semibold">
                      /{selectedScript.totalMarks}
                    </span>
                  </div>
                </div>
              </div>

              <div className="pt-2">
                <Button
                  asChild
                  className="w-full h-10 font-bold bg-primary hover:bg-primary/90 text-primary-foreground shadow-xs text-xs"
                >
                  <Link to="/auth">
                    <span>Test Your Own Cambridge 0455 Essay Now</span>
                    <ChevronRight className="size-4 ml-1" />
                  </Link>
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
