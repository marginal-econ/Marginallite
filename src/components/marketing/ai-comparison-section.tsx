import { useState } from "react";
import { Link } from "@tanstack/react-router";
import {
  AlertTriangle,
  ArrowRight,
  Check,
  CheckCircle2,
  FileSpreadsheet,
  FileText,
  LineChart,
  Lock,
  MessageSquare,
  PenLine,
  RefreshCw,
  Scan,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  Users,
  X,
  Zap,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { CosmicAtmosphere } from "./cosmic-atmosphere";

export function AiComparisonSection({ className }: { className?: string }) {
  const [activeTab, setActiveTab] = useState<"head_to_head" | "matrix">("head_to_head");
  const [activeInspector, setActiveInspector] = useState<"raw_ai" | "marginal">("marginal");

  return (
    <section
      id="why-marginal"
      className={cn(
        "relative scroll-mt-20 border-b-[1.5px] border-ink bg-surface-raised px-4 py-16 sm:px-6 md:px-8 lg:py-24 overflow-hidden",
        className
      )}
    >
      <CosmicAtmosphere variant="cyan" sparkles={true} density="high" />

      <div className="relative z-10 mx-auto max-w-7xl">
        {/* ── Section Header ── */}
        <div className="mx-auto max-w-3xl text-center">
          <div className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-3.5 py-1 text-xs font-bold text-primary mb-3">
            <Sparkles className="size-3.5 text-primary" />
            <span>Real Stress-Test Data · Cambridge IGCSE 0455</span>
          </div>

          <h2 className="text-3xl font-black tracking-tight text-foreground sm:text-4xl lg:text-5xl">
            Why raw Gemini &amp; ChatGPT fail Cambridge Economics
          </h2>

          <p className="mx-auto mt-3 max-w-2xl text-sm leading-relaxed text-muted-foreground sm:text-base">
            Generalist AI hallucinates mark schemes and ignores diagrams. Marginalite delivers deterministic, syllabus-calibrated Cambridge examiner grading.
          </p>

          {/* View Switcher Toggle */}
          <div className="mt-8 inline-flex items-center justify-center rounded-xl border border-border bg-muted/60 p-1 text-xs font-semibold shadow-xs">
            <button
              type="button"
              onClick={() => setActiveTab("head_to_head")}
              className={cn(
                "rounded-lg px-4 py-2 transition-all cursor-pointer flex items-center gap-2",
                activeTab === "head_to_head"
                  ? "bg-background text-foreground shadow-xs font-bold"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <FileText className="size-3.5 text-primary" />
              <span>Real 8-Mark Discuss Test</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("matrix")}
              className={cn(
                "rounded-lg px-4 py-2 transition-all cursor-pointer flex items-center gap-2",
                activeTab === "matrix"
                  ? "bg-background text-foreground shadow-xs font-bold"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <ShieldCheck className="size-3.5 text-emerald-500" />
              <span>Feature Comparison Matrix</span>
            </button>
          </div>
        </div>

        {/* ── Interactive View: Head-to-Head Case Study ── */}
        {activeTab === "head_to_head" ? (
          <div className="mt-12 space-y-6">
            {/* The Question Banner */}
            <div className="rounded-2xl border border-border bg-card/90 p-4 sm:p-5 backdrop-blur-md shadow-sm">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border/70 pb-3">
                <div className="flex items-center gap-2">
                  <Badge className="bg-primary/10 text-primary border-primary/20 text-[10.5px] font-mono uppercase">
                    Cambridge IGCSE 0455/22
                  </Badge>
                  <span className="text-xs font-semibold text-muted-foreground">
                    Paper 2 Section B (Part d)
                  </span>
                </div>
                <Badge variant="outline" className="text-xs font-bold text-foreground">
                  8 Marks Available
                </Badge>
              </div>
              <p className="mt-3 text-sm sm:text-base font-bold text-foreground leading-snug">
                “Discuss whether or not governments should always subsidise merit goods such as education and healthcare.”
              </p>
            </div>

            {/* Model Comparison Cards */}
            <div className="grid gap-6 lg:grid-cols-2">
              {/* Left Column: Raw Gemini & ChatGPT */}
              <div className="relative rounded-2xl border border-destructive/40 bg-gradient-to-b from-destructive/[0.04] to-background p-5 sm:p-6 shadow-sm flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between border-b border-destructive/20 pb-4">
                    <div className="flex items-center gap-2.5">
                      <div className="size-8 rounded-lg bg-destructive/15 text-destructive flex items-center justify-center font-bold text-sm">
                        ✕
                      </div>
                      <div>
                        <h3 className="text-base font-bold text-foreground">Raw Gemini &amp; ChatGPT</h3>
                        <p className="text-[11px] text-destructive font-medium">
                          Uncalibrated Generalist LLM Chat
                        </p>
                      </div>
                    </div>
                    <Badge variant="outline" className="border-destructive/40 text-destructive text-[10px] font-mono">
                      Failed Real Standard
                    </Badge>
                  </div>

                  <div className="mt-5 space-y-3 text-xs">
                    <div className="rounded-xl border border-destructive/30 bg-destructive/10 p-3.5 space-y-1">
                      <div className="flex items-center gap-1.5 font-bold text-destructive">
                        <AlertTriangle className="size-4 shrink-0" />
                        <span>Invented Mark Allocation</span>
                      </div>
                      <p className="text-muted-foreground leading-relaxed">
                        Invented an arbitrary <code className="font-mono text-foreground font-bold">AO3: 5/5</code> split that does not exist in CAIE 0455 Table A specifications (strictly <strong className="text-foreground">AO1: 2, AO2: 3, AO3: 3</strong>).
                      </p>
                    </div>

                    <div className="rounded-xl border border-border/80 bg-card/60 p-3.5 space-y-1">
                      <div className="flex items-center gap-1.5 font-bold text-foreground">
                        <X className="size-4 text-destructive shrink-0" />
                        <span>Blind to Diagrams</span>
                      </div>
                      <p className="text-muted-foreground leading-relaxed">
                        Ignored the candidate's subsidy shift diagram (<code className="font-mono text-[11px]">S → S1</code>), treating essential Level 3 graphical reasoning as plain text.
                      </p>
                    </div>

                    <div className="rounded-xl border border-border/80 bg-card/60 p-3.5 space-y-1">
                      <div className="flex items-center gap-1.5 font-bold text-foreground">
                        <ShieldAlert className="size-4 text-amber-500 shrink-0" />
                        <span>Ungrounded Score</span>
                      </div>
                      <p className="text-muted-foreground leading-relaxed">
                        Admitted in disclaimer that the score was an unverified estimate without Cambridge mark-scheme band alignment.
                      </p>
                    </div>

                    <div className="rounded-xl border border-border/80 bg-card/60 p-3.5 space-y-1">
                      <p className="font-bold text-foreground">Key Student Drawbacks:</p>
                      <ul className="space-y-0.5 text-muted-foreground list-disc list-inside">
                        <li>No syllabus chapter cross-referencing</li>
                        <li>No school or teacher cohort visibility</li>
                      </ul>
                    </div>
                  </div>
                </div>

                <div className="mt-6 pt-4 border-t border-border/60 text-center">
                  <span className="text-xs font-mono font-bold text-destructive">
                    Score: 7/8 (Unverified Hallucination)
                  </span>
                </div>
              </div>

              {/* Right Column: Marginalite Cambridge Examiner Desk */}
              <div className="relative rounded-2xl border-2 border-primary/50 bg-gradient-to-b from-primary/[0.06] via-card to-background p-5 sm:p-6 shadow-xl flex flex-col justify-between ring-1 ring-primary/20">
                <div className="absolute -top-3 right-6">
                  <Badge className="bg-primary text-primary-foreground text-[10px] font-bold uppercase tracking-wider shadow-sm">
                    Cambridge IGCSE 0455 Calibrated
                  </Badge>
                </div>

                <div>
                  <div className="flex items-center justify-between border-b border-primary/20 pb-4">
                    <div className="flex items-center gap-2.5">
                      <div className="size-8 rounded-lg bg-primary text-primary-foreground flex items-center justify-center font-bold text-sm shadow-xs">
                        ✓
                      </div>
                      <div>
                        <h3 className="text-base font-bold text-foreground flex items-center gap-1.5">
                          Marginalite Examiner Desk
                        </h3>
                        <p className="text-[11px] text-primary font-semibold">
                          Grounding: Verified against 5 Cambridge Syllabus Sources
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <span className="text-xl font-black text-primary">7 / 8</span>
                      <span className="text-[10px] text-muted-foreground block font-bold">Top Band Level 3</span>
                    </div>
                  </div>

                  <div className="mt-5 space-y-4 text-xs">
                    {/* Exact Cambridge AO Meter */}
                    <div className="grid grid-cols-3 gap-2">
                      <div className="p-2.5 rounded-xl border border-ao1/30 bg-ao1/10 text-center">
                        <span className="text-[10px] font-bold text-muted-foreground uppercase block">AO1 Knowledge</span>
                        <span className="text-sm font-black text-ao1">2 / 2</span>
                        <span className="text-[9.5px] text-muted-foreground block mt-0.5">Full Credit</span>
                      </div>
                      <div className="p-2.5 rounded-xl border border-ao2/30 bg-ao2/10 text-center">
                        <span className="text-[10px] font-bold text-muted-foreground uppercase block">AO2 Analysis</span>
                        <span className="text-sm font-black text-ao2">3 / 3</span>
                        <span className="text-[9.5px] text-muted-foreground block mt-0.5">Level 3 Band</span>
                      </div>
                      <div className="p-2.5 rounded-xl border border-ao3/30 bg-ao3/10 text-center">
                        <span className="text-[10px] font-bold text-muted-foreground uppercase block">AO3 Evaluation</span>
                        <span className="text-sm font-black text-ao3">2 / 3</span>
                        <span className="text-[9.5px] text-muted-foreground block mt-0.5">Two-Sided</span>
                      </div>
                    </div>

                    <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-3.5 space-y-1">
                      <div className="flex items-center gap-1.5 font-bold text-emerald-700 dark:text-emerald-300">
                        <CheckCircle2 className="size-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
                        <span>Diagram Validated &amp; Credited</span>
                      </div>
                      <p className="text-muted-foreground leading-relaxed">
                        Parsed subsidy shift (<code className="font-mono text-foreground font-semibold">S → S1, P → P1</code>) against CAIE 0455 standards and credited into Level 3 analysis.
                      </p>
                    </div>

                    {/* 2 Diagnostic Boxes */}
                    <div className="grid grid-cols-2 gap-2">
                      <div className="p-2.5 rounded-xl border border-emerald-500/30 bg-card/60">
                        <p className="font-bold text-emerald-600 dark:text-emerald-400 text-[11px] mb-0.5">What Worked</p>
                        <p className="text-[10.5px] text-muted-foreground leading-tight">
                          Clear two-sided discussion weighing positive external benefits against fiscal opportunity cost.
                        </p>
                      </div>
                      <div className="p-2.5 rounded-xl border border-destructive/30 bg-card/60">
                        <p className="font-bold text-destructive text-[11px] mb-0.5">What Cost Marks</p>
                        <p className="text-[10.5px] text-muted-foreground leading-tight">
                          Mentioned opportunity cost of subsidies without explaining how inelastic demand limits consumption gains.
                        </p>
                      </div>
                    </div>

                    <div className="rounded-xl border border-border/80 bg-card/60 p-3 space-y-1">
                      <div className="flex items-center gap-1.5 font-semibold text-foreground text-[11px]">
                        <PenLine className="size-3.5 text-primary" />
                        <span>Actionable Next Step:</span>
                      </div>
                      <p className="text-[11px] text-muted-foreground leading-relaxed">
                        Develop the opportunity cost chain (forgone infrastructure or higher taxes) and evaluate effectiveness using price elasticity of demand.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="mt-6 pt-4 border-t border-border/60 flex items-center justify-between">
                  <span className="text-[11px] font-semibold text-muted-foreground">
                    Syllabus: IGCSE 0455 Units 2.9 &amp; 2.11
                  </span>
                  <Button asChild size="sm" className="h-8 text-xs font-bold gap-1 bg-primary text-primary-foreground">
                    <Link to="/grade">
                      Test Your Essay Free <ArrowRight className="size-3.5" />
                    </Link>
                  </Button>
                </div>
              </div>
            </div>
          </div>
        ) : (
          /* ── Feature Comparison Matrix Table ── */
          <div className="mt-12 overflow-x-auto rounded-2xl border border-border bg-card shadow-lg">
            <table className="w-full text-left text-xs sm:text-sm border-collapse">
              <thead>
                <tr className="border-b border-border/80 bg-muted/60">
                  <th className="py-4 px-4 sm:px-6 font-bold text-foreground">Examination Capability</th>
                  <th className="py-4 px-3 sm:px-6 font-bold text-muted-foreground text-center">
                    Raw Gemini / ChatGPT
                  </th>
                  <th className="py-4 px-3 sm:px-6 font-extrabold text-primary text-center bg-primary/[0.08]">
                    Marginalite Cambridge Suite
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                <tr>
                  <td className="py-3.5 px-4 sm:px-6 font-semibold text-foreground">
                    <div>Cambridge IGCSE 0455 AO1/AO2/AO3 Band Calibration</div>
                    <div className="text-[11px] text-muted-foreground font-normal">
                      Deterministic marks grounded in official CAIE band descriptors
                    </div>
                  </td>
                  <td className="py-3.5 px-3 sm:px-6 text-center text-muted-foreground">
                    <span className="inline-flex items-center gap-1 text-destructive font-medium">
                      <X className="size-4" /> Hallucinates fake bands
                    </span>
                  </td>
                  <td className="py-3.5 px-3 sm:px-6 text-center bg-primary/[0.04]">
                    <span className="inline-flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-bold">
                      <Check className="size-4" /> 100% Calibrated AO Bands
                    </span>
                  </td>
                </tr>

                <tr>
                  <td className="py-3.5 px-4 sm:px-6 font-semibold text-foreground">
                    <div>Economics Diagram Evaluation</div>
                    <div className="text-[11px] text-muted-foreground font-normal">
                      Parses curves, shifts (S→S1, AD→AD1), and deadweight welfare triangles
                    </div>
                  </td>
                  <td className="py-3.5 px-3 sm:px-6 text-center text-muted-foreground">
                    <span className="inline-flex items-center gap-1 text-destructive font-medium">
                      <X className="size-4" /> Ignored entirely
                    </span>
                  </td>
                  <td className="py-3.5 px-3 sm:px-6 text-center bg-primary/[0.04]">
                    <span className="inline-flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-bold">
                      <Check className="size-4" /> Integrated into Level 3
                    </span>
                  </td>
                </tr>

                <tr>
                  <td className="py-3.5 px-4 sm:px-6 font-semibold text-foreground">
                    <div>Syllabus RAG Grounding</div>
                    <div className="text-[11px] text-muted-foreground font-normal">
                      Direct citations to Cambridge IGCSE 0455 coursebook chapters &amp; 2020–2026 mark schemes
                    </div>
                  </td>
                  <td className="py-3.5 px-3 sm:px-6 text-center text-muted-foreground">
                    <span className="inline-flex items-center gap-1 text-muted-foreground font-medium">
                      <X className="size-4 text-destructive" /> Generic web summaries
                    </span>
                  </td>
                  <td className="py-3.5 px-3 sm:px-6 text-center bg-primary/[0.04]">
                    <span className="inline-flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-bold">
                      <Check className="size-4" /> 2,056 Vector KB Chunks
                    </span>
                  </td>
                </tr>

                <tr>
                  <td className="py-3.5 px-4 sm:px-6 font-semibold text-foreground">
                    <div>Paper 2 Section A Data Response</div>
                    <div className="text-[11px] text-muted-foreground font-normal">
                      11 authentic 2022–2026 Cambridge 0455/22 case studies with Table 1.1 &amp; 30-mark rubrics
                    </div>
                  </td>
                  <td className="py-3.5 px-3 sm:px-6 text-center text-muted-foreground">
                    <span className="inline-flex items-center gap-1 text-muted-foreground font-medium">
                      <X className="size-4 text-destructive" /> Passive text chat
                    </span>
                  </td>
                  <td className="py-3.5 px-3 sm:px-6 text-center bg-primary/[0.04]">
                    <span className="inline-flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-bold">
                      <Check className="size-4" /> Full 0455/22 Past Papers
                    </span>
                  </td>
                </tr>

                <tr>
                  <td className="py-3.5 px-4 sm:px-6 font-semibold text-foreground">
                    <div>Handwritten Notebook Paper OCR</div>
                    <div className="text-[11px] text-muted-foreground font-normal">
                      Snap a photo of actual lined exam paper and mark it instantly
                    </div>
                  </td>
                  <td className="py-3.5 px-3 sm:px-6 text-center text-muted-foreground">
                    <span className="inline-flex items-center gap-1 text-muted-foreground font-medium">
                      <X className="size-4 text-destructive" /> Clunky, error-prone
                    </span>
                  </td>
                  <td className="py-3.5 px-3 sm:px-6 text-center bg-primary/[0.04]">
                    <span className="inline-flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-bold">
                      <Check className="size-4" /> 1-Click Cambridge OCR
                    </span>
                  </td>
                </tr>

                <tr>
                  <td className="py-3.5 px-4 sm:px-6 font-semibold text-foreground">
                    <div>Teacher &amp; School Department Portal</div>
                    <div className="text-[11px] text-muted-foreground font-normal">
                      Cohort heatmaps, CSV gradebook exports, custom school mark scheme RAG
                    </div>
                  </td>
                  <td className="py-3.5 px-3 sm:px-6 text-center text-muted-foreground">
                    <span className="inline-flex items-center gap-1 text-destructive font-medium">
                      <X className="size-4" /> Impossible (No tools)
                    </span>
                  </td>
                  <td className="py-3.5 px-3 sm:px-6 text-center bg-primary/[0.04]">
                    <span className="inline-flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-bold">
                      <Check className="size-4" /> Complete B2B Workspace
                    </span>
                  </td>
                </tr>

                <tr>
                  <td className="py-3.5 px-4 sm:px-6 font-semibold text-foreground">
                    <div>Syllabus Weakness Analytics</div>
                    <div className="text-[11px] text-muted-foreground font-normal">
                      Tracks AO1/AO2/AO3 score trajectory across 6 macro &amp; micro units
                    </div>
                  </td>
                  <td className="py-3.5 px-3 sm:px-6 text-center text-muted-foreground">
                    <span className="inline-flex items-center gap-1 text-destructive font-medium">
                      <X className="size-4" /> Zero memory across chats
                    </span>
                  </td>
                  <td className="py-3.5 px-3 sm:px-6 text-center bg-primary/[0.04]">
                    <span className="inline-flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-bold">
                      <Check className="size-4" /> Target A* Trajectory
                    </span>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        )}

        {/* Bottom Proof Reassurance Banner */}
        <div className="mt-12 rounded-2xl border border-primary/30 bg-primary/[0.04] p-5 sm:p-6 text-center flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="text-center sm:text-left">
            <h4 className="text-sm sm:text-base font-bold text-foreground">
              Don't leave your Cambridge grade to hallucinated chat tokens.
            </h4>
            <p className="text-xs text-muted-foreground mt-0.5">
              Practice against official Cambridge IGCSE 0455 mark schemes with unlimited essay evaluations.
            </p>
          </div>
          <Button asChild size="default" className="text-xs font-bold shrink-0 bg-primary hover:bg-primary/90 text-primary-foreground shadow-md">
            <Link to="/grade">
              Score My Essay Now <ArrowRight className="size-3.5 ml-1.5" />
            </Link>
          </Button>
        </div>
      </div>
    </section>
  );
}
