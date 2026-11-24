import { useState } from "react";
import { Link } from "@tanstack/react-router";
import {
  ArrowRight,
  BookOpen,
  CheckCircle2,
  Clock,
  Gamepad2,
  HelpCircle,
  Layers,
  Sparkles,
  Trophy,
  Users,
  XCircle,
  Zap,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { CosmicAtmosphere } from "@/components/marketing/cosmic-atmosphere";
import { Reveal } from "@/components/marketing/reveal";
import { cn } from "@/lib/utils";

const SAMPLE_QUESTION = {
  paper: "Cambridge IGCSE 0455 / Paper 1 · Economics",
  topic: "Unit 2: Price Elasticity & Indirect Tax Incidence",
  question:
    "A government introduces a specific indirect tax on a good where demand is price-inelastic and supply is price-elastic. What is the incidence of the tax?",
  options: [
    {
      label: "A",
      text: "The consumer and producer bear the tax incidence equally.",
      isCorrect: false,
      flaw: "Incorrect: Equal tax burden only occurs when the price elasticities of demand and supply are identical (|PED| = |PES|).",
    },
    {
      label: "B",
      text: "The consumer bears the greater share of the tax incidence.",
      isCorrect: true,
      flaw: "Correct: Inelastic demand means consumers are relatively insensitive to price changes, enabling producers to pass on most of the tax burden through higher prices.",
    },
    {
      label: "C",
      text: "The producer bears the entire tax burden because they remit the payment.",
      isCorrect: false,
      flaw: "Incorrect: Confuses statutory incidence (who physically pays the tax authority) with economic incidence (who bears the real financial burden).",
    },
    {
      label: "D",
      text: "The government absorbs the tax burden through deadweight welfare loss.",
      isCorrect: false,
      flaw: "Incorrect: Deadweight loss represents lost consumer and producer surplus, not government tax absorption.",
    },
  ],
};

export function McqShowcaseSection() {
  const [selectedOption, setSelectedOption] = useState<string>("B");
  const [showExplanation, setShowExplanation] = useState<boolean>(true);

  return (
    <section
      id="mcqs"
      className="relative scroll-mt-20 border-b-[1.5px] border-ink bg-card/40 px-4 py-16 sm:px-6 md:px-10 lg:px-12 xl:px-16 lg:py-24 overflow-hidden"
    >
      <CosmicAtmosphere variant="purple" sparkles={true} density="medium" />

      <div className="relative z-10 mx-auto max-w-7xl 2xl:max-w-[1440px]">
        {/* Section Header */}
        <div className="mx-auto max-w-3xl text-center">
          <Reveal>
            <div className="inline-flex items-center gap-2 rounded-full border border-amber-500/30 bg-amber-500/10 px-3.5 py-1 text-xs font-bold text-amber-700 dark:text-amber-300 mb-3 shadow-2xs">
              <Gamepad2 className="size-3.5 text-amber-500" />
              <span>Cambridge IGCSE 0455 MCQ Past Paper &amp; Live Arena Suite</span>
            </div>
            <h2 className="text-3xl font-black tracking-tight text-foreground sm:text-4xl lg:text-5xl">
              Master Cambridge IGCSE 0455 Paper 1 MCQs
            </h2>
            <p className="mx-auto mt-3 max-w-2xl text-sm leading-relaxed text-muted-foreground sm:text-base">
              Over 800 official past paper questions categorized by syllabus units (1–6). Instant 3-line Cambridge distractor logic, auto-save resume, and live multiplayer class races with 6-digit PINs.
            </p>
          </Reveal>
        </div>

        {/* Quick Highlights Row */}
        <Reveal delay={60}>
          <div className="mt-8 grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 max-w-4xl mx-auto">
            <div className="rounded-xl border border-border/80 bg-card/80 p-3 sm:p-4 text-center backdrop-blur-sm shadow-xs">
              <span className="text-xl sm:text-2xl font-black text-foreground block">800+</span>
              <span className="text-[11px] sm:text-xs text-muted-foreground font-semibold mt-0.5 block">Past Paper Questions</span>
            </div>
            <div className="rounded-xl border border-border/80 bg-card/80 p-3 sm:p-4 text-center backdrop-blur-sm shadow-xs">
              <span className="text-xl sm:text-2xl font-black text-foreground block">Paper 1</span>
              <span className="text-[11px] sm:text-xs text-muted-foreground font-semibold mt-0.5 block">30 Questions · 45 Mins</span>
            </div>
            <div className="rounded-xl border border-border/80 bg-card/80 p-3 sm:p-4 text-center backdrop-blur-sm shadow-xs">
              <span className="text-xl sm:text-2xl font-black text-amber-500 block">6-Digit PIN</span>
              <span className="text-[11px] sm:text-xs text-muted-foreground font-semibold mt-0.5 block">Multiplayer Class Race</span>
            </div>
            <div className="rounded-xl border border-border/80 bg-card/80 p-3 sm:p-4 text-center backdrop-blur-sm shadow-xs">
              <span className="text-xl sm:text-2xl font-black text-emerald-500 block">3-Line Proof</span>
              <span className="text-[11px] sm:text-xs text-muted-foreground font-semibold mt-0.5 block">Instant 0ms Diagnostic</span>
            </div>
          </div>
        </Reveal>

        {/* Interactive Feature Showcase: 2-Column Split */}
        <div className="mt-12 lg:mt-16 grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center">
          {/* Left Column: 3 Core Pillars */}
          <div className="lg:col-span-5 space-y-6">
            <Reveal>
              <div className="space-y-4">
                <div className="flex items-start gap-3.5 p-4 rounded-2xl border border-border/80 bg-card/60 backdrop-blur-sm hover:border-primary/40 transition-colors shadow-2xs">
                  <div className="size-10 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary shrink-0">
                    <BookOpen className="size-5" />
                  </div>
                  <div>
                    <h3 className="text-sm sm:text-base font-bold text-foreground">Topical Slices &amp; 30-Question Timed Papers</h3>
                    <p className="mt-1 text-xs sm:text-sm text-muted-foreground leading-relaxed">
                      Practice whole Cambridge 0455 Paper 1 exam papers with an official 45-minute countdown, or drill specific syllabus units (Units 1–6) topic by topic.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3.5 p-4 rounded-2xl border border-border/80 bg-card/60 backdrop-blur-sm hover:border-emerald-500/40 transition-colors shadow-2xs">
                  <div className="size-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-600 dark:text-emerald-400 shrink-0">
                    <Sparkles className="size-5" />
                  </div>
                  <div>
                    <h3 className="text-sm sm:text-base font-bold text-foreground">Instant 3-Line Examiner Feedback</h3>
                    <p className="mt-1 text-xs sm:text-sm text-muted-foreground leading-relaxed">
                      Get immediate 3-line diagnostic feedback on click: Option proof (~16 words), Distractor Trap (~14 words), and Cambridge Golden Rule (~10 words). Zero lag.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3.5 p-4 rounded-2xl border border-border/80 bg-card/60 backdrop-blur-sm hover:border-amber-500/40 transition-colors shadow-2xs">
                  <div className="size-10 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-600 dark:text-amber-400 shrink-0">
                    <Trophy className="size-5" />
                  </div>
                  <div>
                    <h3 className="text-sm sm:text-base font-bold text-foreground">Live Multiplayer Class Arena (Blooket/Quizizz Style)</h3>
                    <p className="mt-1 text-xs sm:text-sm text-muted-foreground leading-relaxed">
                      Teachers generate a 6-digit room PIN in one click. Students race in real time on any smartphone, iPad, or laptop with live speed streaks and leaderboards.
                    </p>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="pt-2 flex flex-wrap items-center gap-3">
                <Button asChild size="lg" className="font-bold bg-primary hover:bg-primary/90 text-primary-foreground shadow-xs">
                  <Link to="/mcq-live">
                    <Gamepad2 className="size-4 mr-2" />
                    <span>Open MCQ Practice Arena</span>
                  </Link>
                </Button>
                <Button asChild variant="outline" size="lg" className="font-semibold border-border/80 hover:bg-muted text-foreground">
                  <Link to="/quiz">
                    <Users className="size-4 mr-2" />
                    <span>Join with 6-Digit PIN</span>
                  </Link>
                </Button>
              </div>
            </Reveal>
          </div>

          {/* Right Column: Interactive Real Question Simulation */}
          <div className="lg:col-span-7">
            <Reveal variant="pop" delay={120}>
              <div className="rounded-2xl border-[1.5px] border-border/90 bg-card/95 p-5 sm:p-7 shadow-xl backdrop-blur-md">
                {/* Simulated Paper Top Bar */}
                <div className="flex flex-wrap items-center justify-between gap-2 pb-4 mb-4 border-b border-border/70 text-xs">
                  <div>
                    <span className="font-mono text-primary font-bold text-[11px] block">{SAMPLE_QUESTION.paper}</span>
                    <span className="text-muted-foreground font-medium text-xs">{SAMPLE_QUESTION.topic}</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-[11px] font-mono text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-full">
                    <Clock className="size-3" />
                    <span>Auto-Saved · Question 14 / 30</span>
                  </div>
                </div>

                {/* Question Stem */}
                <h4 className="text-sm sm:text-base font-bold text-foreground leading-relaxed mb-4">
                  {SAMPLE_QUESTION.question}
                </h4>

                {/* Option List */}
                <div className="space-y-2.5">
                  {SAMPLE_QUESTION.options.map((opt) => {
                    const isSelected = selectedOption === opt.label;
                    return (
                      <button
                        key={opt.label}
                        type="button"
                        onClick={() => {
                          setSelectedOption(opt.label);
                          setShowExplanation(true);
                        }}
                        className={cn(
                          "w-full text-left p-3 rounded-xl border text-xs sm:text-sm transition-all flex items-start gap-3 cursor-pointer",
                          opt.isCorrect && isSelected
                            ? "border-emerald-500/60 bg-emerald-500/10 text-foreground font-medium shadow-2xs"
                            : isSelected && !opt.isCorrect
                              ? "border-destructive/60 bg-destructive/10 text-foreground"
                              : "border-border/70 bg-card/60 hover:bg-muted/50 text-foreground",
                        )}
                      >
                        <span
                          className={cn(
                            "flex size-6 shrink-0 items-center justify-center rounded-lg font-mono text-xs font-bold",
                            opt.isCorrect && isSelected
                              ? "bg-emerald-500 text-white"
                              : isSelected && !opt.isCorrect
                                ? "bg-destructive text-destructive-foreground"
                                : "bg-muted text-muted-foreground",
                          )}
                        >
                          {opt.label}
                        </span>
                        <div className="flex-1 min-w-0 pt-0.5">
                          <p>{opt.text}</p>
                        </div>
                        {opt.isCorrect && isSelected && (
                          <CheckCircle2 className="size-4 text-emerald-500 shrink-0 mt-0.5" />
                        )}
                      </button>
                    );
                  })}
                </div>

                {/* Explanation Box */}
                {showExplanation && (
                  <div className="mt-4 rounded-xl border border-emerald-500/30 bg-emerald-500/[0.08] p-4 text-xs sm:text-sm animate-in fade-in duration-200">
                    <div className="flex items-center gap-1.5 font-bold text-emerald-700 dark:text-emerald-400 mb-1.5">
                      <Sparkles className="size-3.5" />
                      <span>Cambridge Examiner Reasoning</span>
                    </div>
                    <p className="text-foreground leading-relaxed text-xs sm:text-[13px]">
                      {SAMPLE_QUESTION.options.find((o) => o.label === selectedOption)?.flaw}
                    </p>
                  </div>
                )}

                {/* Live Arena Callout Pill inside card */}
                <div className="mt-5 pt-4 border-t border-border/60 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs">
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <span className="relative flex size-2">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full size-2 bg-amber-500"></span>
                    </span>
                    <span className="font-semibold text-foreground">Live Room PIN: 482 915</span>
                    <span>·</span>
                    <span>18 Students Racing</span>
                  </div>
                  <Button asChild size="sm" className="h-8 px-3 text-xs font-bold bg-primary hover:bg-primary/90 text-primary-foreground">
                    <Link to="/mcq-live">
                      <span>Practice Full Paper</span>
                      <ArrowRight className="size-3.5 ml-1.5" />
                    </Link>
                  </Button>
                </div>
              </div>
            </Reveal>
          </div>
        </div>
      </div>
    </section>
  );
}
