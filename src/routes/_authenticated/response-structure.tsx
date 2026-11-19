import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import {
  GraduationCap,
  PenLine,
  Wand2,
  Sparkles,
  CheckCircle2,
  ArrowRight,
  BookOpen,
  Award,
  Lightbulb,
  Layers,
  Compass,
} from "lucide-react";

import { PageHeader } from "@/components/app/app-shell";
import { STRUCTURE_GUIDANCE, type StructureGuidance } from "@/lib/examiner/config";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/response-structure")({
  head: () => ({
    meta: [
      { title: "How to Write an Essay — Cambridge IGCSE 0455 Response Structures" },
      {
        name: "description",
        content:
          "Master the class-taught Cambridge IGCSE 0455 response structures for 2-mark, 4-mark, 6-mark, and 8-mark questions with knowledge setup, analysis chains, and justified evaluation.",
      },
      {
        property: "og:title",
        content: "How to Write a Cambridge IGCSE 0455 Economics Essay — Marginalite",
      },
      {
        property: "og:description",
        content:
          "Step-by-step layouts and examiner guidance for 2m, 4m, 6m, and 8m Cambridge IGCSE 0455 Economics structured questions.",
      },
    ],
  }),
  component: ResponseStructurePage,
});

function ResponseStructurePage() {
  const [selectedTariff, setSelectedTariff] = useState<"all" | "2" | "4" | "6" | "8">("all");
  const guides = Object.values(STRUCTURE_GUIDANCE).sort((a, b) => a.tariff - b.tariff);

  const displayedGuides = selectedTariff === "all"
    ? guides
    : guides.filter((g) => g.tariff.toString() === selectedTariff);

  return (
    <div className="p-4 sm:p-6 max-w-7xl mx-auto space-y-6">
      {/* Top Header */}
      <PageHeader
        title="How to Write an Essay"
        subtitle="Official Cambridge IGCSE 0455 Response Structures & Writing Guide. Master the exact layouts, analysis chains, and evaluative weigh-ups rewarded by examiners."
      />

      {/* Hero Banner with Quick Links */}
      <div className="relative overflow-hidden rounded-2xl border border-border/80 bg-gradient-to-br from-card via-card/95 to-muted/40 p-6 shadow-sm backdrop-blur-sm">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="space-y-2 max-w-2xl">
            <div className="flex flex-wrap items-center gap-2">
              <Badge className="bg-primary/10 text-primary border-primary/30 text-xs font-bold uppercase tracking-wider">
                Cambridge IGCSE 0455 Standard
              </Badge>
              <Badge variant="outline" className="text-xs font-semibold text-muted-foreground">
                2m · 4m · 6m · 8m Tariffs
              </Badge>
            </div>
            <h2 className="text-xl sm:text-2xl font-extrabold tracking-tight text-foreground">
              Master the Structure That Cambridge Examiners Reward
            </h2>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Examiners award top-band marks to candidates who build clear chains of analytical reasoning and justified evaluation. Use these class-taught templates to structure your responses for any 0455 tariff.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3 shrink-0">
            <Button asChild className="gap-1.5 text-xs font-bold h-9 bg-purple-600 hover:bg-purple-700 text-white shadow-xs">
              <Link to="/essay-generator">
                <Wand2 className="h-4 w-4" />
                Sample Essay Generator
              </Link>
            </Button>
            <Button asChild variant="outline" className="gap-1.5 text-xs font-semibold h-9">
              <Link to="/grade">
                <PenLine className="h-4 w-4" />
                Open Essay Grader
              </Link>
            </Button>
          </div>
        </div>
      </div>

      {/* Tariff Filter Pills */}
      <div className="flex items-center justify-between gap-4 border-b border-border/60 pb-3">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground mr-1">
            Tariff Filter:
          </span>
          <Button
            variant={selectedTariff === "all" ? "default" : "outline"}
            size="sm"
            onClick={() => setSelectedTariff("all")}
            className="text-xs font-semibold h-8"
          >
            All Tariffs ({guides.length})
          </Button>
          <Button
            variant={selectedTariff === "2" ? "default" : "outline"}
            size="sm"
            onClick={() => setSelectedTariff("2")}
            className={cn(
              "text-xs font-semibold h-8",
              selectedTariff === "2" ? "bg-primary text-primary-foreground" : ""
            )}
          >
            2 Marks · State / Define
          </Button>
          <Button
            variant={selectedTariff === "4" ? "default" : "outline"}
            size="sm"
            onClick={() => setSelectedTariff("4")}
            className={cn(
              "text-xs font-semibold h-8",
              selectedTariff === "4" ? "bg-primary text-primary-foreground" : ""
            )}
          >
            4 Marks · Explain
          </Button>
          <Button
            variant={selectedTariff === "6" ? "default" : "outline"}
            size="sm"
            onClick={() => setSelectedTariff("6")}
            className={cn(
              "text-xs font-semibold h-8",
              selectedTariff === "6" ? "bg-primary text-primary-foreground" : ""
            )}
          >
            6 Marks · Analyse
          </Button>
          <Button
            variant={selectedTariff === "8" ? "default" : "outline"}
            size="sm"
            onClick={() => setSelectedTariff("8")}
            className={cn(
              "text-xs font-semibold h-8",
              selectedTariff === "8" ? "bg-primary text-primary-foreground" : ""
            )}
          >
            8 Marks · Discuss
          </Button>
        </div>
      </div>

      {/* Structure Cards Grid */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {displayedGuides.map((guide) => (
          <StructureCard key={guide.tariff} guide={guide} />
        ))}
      </div>

      {/* Cambridge General Principles & Key Advice */}
      <Card className="border border-border/80 shadow-sm bg-card/60">
        <CardHeader className="p-5 pb-3 border-b border-border/60">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-primary/10 text-primary">
              <Lightbulb className="h-4 w-4" />
            </div>
            <CardTitle className="text-base font-bold">
              4 Golden Principles That Apply to Any Cambridge Essay
            </CardTitle>
          </div>
          <CardDescription className="text-xs text-muted-foreground">
            Fundamental marking principles enforced by Principal Examiners across all papers.
          </CardDescription>
        </CardHeader>

        <CardContent className="p-5">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-4 rounded-xl border border-border/70 bg-muted/20 space-y-2">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                <h4 className="font-bold text-xs text-foreground">Complete Analytical Chains</h4>
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Every analytical point must follow a chain: <em>define</em> the term, <em>explain</em> the mechanism, <em>analyse</em> the economic transmission, and <em>apply</em> explicitly to the question's context — not just generic textbook theory.
              </p>
            </div>

            <div className="p-4 rounded-xl border border-border/70 bg-muted/20 space-y-2">
              <div className="flex items-center gap-2">
                <Award className="h-4 w-4 text-amber-500" />
                <h4 className="font-bold text-xs text-foreground">Justified Evaluation</h4>
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Evaluation earns marks when it is <em>justified</em> — a solid economic reason is given for why a point is significant, conditional, or contestable (e.g., elasticity of supply, time lag, market structure) — not an unsubstantiated "it depends".
              </p>
            </div>

            <div className="p-4 rounded-xl border border-border/70 bg-muted/20 space-y-2">
              <div className="flex items-center gap-2">
                <Layers className="h-4 w-4 text-blue-500" />
                <h4 className="font-bold text-xs text-foreground">Diagram Integration</h4>
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed">
                A diagram is not compulsory unless explicitly requested, but when drawn, you must reference it directly in your text (e.g., shifts from S1 to S2, price moving from P1 to P2) to claim full credit.
              </p>
            </div>

            <div className="p-4 rounded-xl border border-border/70 bg-muted/20 space-y-2">
              <div className="flex items-center gap-2">
                <Compass className="h-4 w-4 text-purple-500" />
                <h4 className="font-bold text-xs text-foreground">Reasoned & Conditional Conclusions</h4>
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed">
                A top-band conclusion must follow logically from your evaluation. Conditional judgements (<em>"this policy will succeed if X holds, but fails if Y dominates..."</em>) are precisely what Cambridge rewards at Level 3.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function StructureCard({ guide }: { guide: StructureGuidance }) {
  const getTariffBadge = (tariff: number) => {
    switch (tariff) {
      case 2:
        return { color: "bg-sky-600 text-white", label: "0455 Part (a) · State / Define" };
      case 4:
        return { color: "bg-teal-600 text-white", label: "0455 Part (b) · Explain" };
      case 6:
        return { color: "bg-indigo-600 text-white", label: "0455 Part (c) · Analyse (Pure AO2)" };
      case 8:
      default:
        return { color: "bg-emerald-600 text-white", label: "0455 Part (d) · Discuss (AO1/AO2/AO3)" };
    }
  };

  const badgeInfo = getTariffBadge(guide.tariff);

  return (
    <Card className="border border-border/80 shadow-sm flex flex-col justify-between hover:shadow-md transition-shadow">
      <CardHeader className="p-5 pb-3 border-b bg-muted/20 space-y-2">
        <div className="flex items-center justify-between gap-2">
          <Badge
            className={cn(
              "font-bold text-xs font-mono",
              badgeInfo.color
            )}
          >
            {guide.tariff} Marks
          </Badge>
          <span className="text-[11px] font-mono font-semibold text-muted-foreground uppercase">
            {badgeInfo.label}
          </span>
        </div>

        <CardTitle className="text-base font-bold text-foreground">
          {guide.label}
        </CardTitle>

        <CardDescription className="text-xs text-muted-foreground line-clamp-2">
          {guide.questionType}
        </CardDescription>

        <div className="pt-1">
          <Badge variant="outline" className="text-[11px] font-mono border-primary/30 text-primary bg-primary/5">
            {guide.aoSummary}
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="p-5 space-y-4 flex-1">
        <ol className="space-y-3">
          {guide.steps.map((step, index) => (
            <li key={step.title} className="flex gap-3 text-xs">
              <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-primary/10 text-[11px] font-bold text-primary mt-0.5">
                {index + 1}
              </span>
              <div className="space-y-0.5">
                <p className="font-semibold text-foreground text-xs">{step.title}</p>
                <p className="text-muted-foreground text-[11px] leading-relaxed">{step.detail}</p>
              </div>
            </li>
          ))}
        </ol>

        <div className="rounded-lg bg-muted/40 p-3 text-[11px] text-muted-foreground border border-border/50 italic leading-relaxed">
          {guide.note}
        </div>
      </CardContent>

      <CardFooter className="p-4 border-t bg-muted/10 flex items-center justify-between gap-2">
        <Button asChild size="sm" variant="outline" className="text-xs font-semibold h-8 flex-1 gap-1">
          <Link to="/essay-generator">
            <Wand2 className="h-3 w-3 text-purple-500" />
            Model Answer
          </Link>
        </Button>
        <Button asChild size="sm" className="text-xs font-semibold h-8 flex-1 gap-1 bg-primary text-primary-foreground">
          <Link to="/grade">
            <PenLine className="h-3 w-3" />
            Practice Essay
          </Link>
        </Button>
      </CardFooter>
    </Card>
  );
}
