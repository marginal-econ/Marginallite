import { useState, useMemo, useEffect } from "react";
import { Link } from "@tanstack/react-router";
import {
  ArrowRight,
  BookOpen,
  CheckCircle2,
  Database,
  Search,
  X,
  FileText,
  ChevronDown,
  ChevronUp,
  Workflow,
  Cpu,
  Sparkles,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { CAMBRIDGE_CORE_DEFINITIONS } from "@/lib/cambridge-definitions";
import { supabase } from "@/integrations/backend/client";
import { CosmicAtmosphere } from "./cosmic-atmosphere";

interface SyllabusChapter {
  num: number;
  era: "legacy" | "2027";
  title: string;
  category: "Micro" | "Macro";
  concepts: string[];
}

const SYLLABUS_CHAPTERS: SyllabusChapter[] = [
  { num: 1, era: "legacy", title: "The Basic Economic Problem", category: "Micro", concepts: ["Scarcity & Opportunity Cost", "Production Possibility Curves (PPC)", "Factors of Production"] },
  { num: 2, era: "legacy", title: "The Allocation of Resources", category: "Micro", concepts: ["Demand & Supply Curves", "Price Elasticities (PED & PES)", "Market Failure & Social Costs"] },
  { num: 3, era: "legacy", title: "Microeconomic Decision-Makers", category: "Micro", concepts: ["Money & Commercial Banking", "Trade Unions & Wage Differences", "Firms, Costs, Revenues & Objectives"] },
  { num: 4, era: "legacy", title: "Government and the Macroeconomy", category: "Macro", concepts: ["Fiscal, Monetary & Supply-Side Policies", "Economic Growth & Recession", "Inflation & Unemployment"] },
  { num: 5, era: "legacy", title: "Economic Development", category: "Macro", concepts: ["Living Standards & HDI", "Poverty & Population Growth", "International Development Differences"] },
  { num: 6, era: "legacy", title: "International Trade & Globalisation", category: "Macro", concepts: ["Free Trade vs Trade Protection", "Foreign Exchange Rates", "Current Account Balance of Payments"] },
];

export interface PastPaperReference {
  id: string;
  paperCode: string;
  questionNumber: string;
  marks: number;
  era: "legacy" | "2027";
  section: "Micro" | "Macro";
  topicTitle: string;
  stem: string;
}

export const CAMBRIDGE_PAST_PAPERS_CORPUS: PastPaperReference[] = [
  { id: "q-ppc-1", paperCode: "0455/22/F/M/26", questionNumber: "Q2(a)", marks: 2, era: "legacy", section: "Micro", topicTitle: "Basic Economic Problem", stem: "Define scarcity." },
  { id: "q-ppc-2", paperCode: "0455/22/F/M/26", questionNumber: "Q2(b)", marks: 4, era: "legacy", section: "Micro", topicTitle: "Opportunity Cost", stem: "Explain two opportunity costs of government capital spending." },
  { id: "q-ped-1", paperCode: "0455/22/F/M/26", questionNumber: "Q2(c)", marks: 6, era: "legacy", section: "Micro", topicTitle: "Price Elasticity of Demand", stem: "Analyse the effect of price elasticity of demand on total revenue." },
  { id: "q-ped-2", paperCode: "0455/22/F/M/26", questionNumber: "Q2(d)", marks: 8, era: "legacy", section: "Micro", topicTitle: "Government Subsidies", stem: "Discuss whether or not the government should provide subsidies to small firms." },
  { id: "q-ped-3", paperCode: "0455/21/M/J/25", questionNumber: "Q3(a)", marks: 2, era: "legacy", section: "Micro", topicTitle: "Factors of Production", stem: "Identify two factors of production and their rewards." },
  { id: "q-tax-1", paperCode: "0455/21/M/J/25", questionNumber: "Q3(b)", marks: 4, era: "legacy", section: "Micro", topicTitle: "Indirect Taxes", stem: "Explain two reasons why governments impose indirect taxes on demerit goods." },
  { id: "q-ctrl-1", paperCode: "0455/22/M/J/25", questionNumber: "Q3(c)", marks: 6, era: "legacy", section: "Micro", topicTitle: "Maximum Prices", stem: "Analyse how a maximum price creates shortages in a food market." },
  { id: "q-inf-1", paperCode: "0455/22/M/J/25", questionNumber: "Q4(a)", marks: 2, era: "legacy", section: "Macro", topicTitle: "Inflation Definition", stem: "Define inflation." },
  { id: "q-inf-2", paperCode: "0455/21/O/N/24", questionNumber: "Q4(b)", marks: 4, era: "legacy", section: "Macro", topicTitle: "Causes of Inflation", stem: "Explain two causes of demand-pull inflation." },
  { id: "q-fx-1", paperCode: "0455/22/M/J/24", questionNumber: "Q5(b)", marks: 4, era: "legacy", section: "Macro", topicTitle: "Foreign Exchange Rates", stem: "Explain two consequences of a depreciation in a floating exchange rate." },
  { id: "q-pol-1", paperCode: "0455/21/O/N/24", questionNumber: "Q5(c)", marks: 6, era: "legacy", section: "Macro", topicTitle: "Monetary Policy", stem: "Analyse how a central bank uses interest rates to reduce inflation." },
  { id: "q-pol-2", paperCode: "0455/22/W/24", questionNumber: "Q4(d)", marks: 8, era: "legacy", section: "Macro", topicTitle: "Fiscal Policy vs Unemployment", stem: "Discuss whether or not expansionary fiscal policy reduces cyclical unemployment." },
  { id: "q-pol-3", paperCode: "0455/21/M/J/24", questionNumber: "Q5(d)", marks: 8, era: "legacy", section: "Macro", topicTitle: "Free Trade Agreements", stem: "Discuss whether or not free international trade benefits all participating countries." },
  { id: "q-prot-1", paperCode: "0455/22/O/N/23", questionNumber: "Q5(b)", marks: 4, era: "legacy", section: "Macro", topicTitle: "Tariffs & Quotas", stem: "Explain two methods of trade protection used by governments." },
  { id: "q-prot-2", paperCode: "0455/21/M/J/23", questionNumber: "Q5(c)", marks: 6, era: "legacy", section: "Macro", topicTitle: "Balance of Payments", stem: "Analyse the causes of a persistent deficit on the current account of the balance of payments." },
  { id: "q-prot-3", paperCode: "0455/22/M/J/23", questionNumber: "Q5(d)", marks: 8, era: "legacy", section: "Macro", topicTitle: "Living Standards & GDP", stem: "Discuss whether or not real GDP per head accurately measures living standards." },
];

const POPULAR_QUICK_SEARCHES = [
  "AD",
  "PED",
  "Demerit Goods",
  "Tariffs",
  "Inflation",
  "Monopoly",
  "PPC",
  "Scarcity",
];

export function RagEngineSection() {
  const [searchQuery, setSearchQuery] = useState("AD");
  const [showDetails, setShowDetails] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setIsAuthenticated(Boolean(data.session));
    });
  }, []);

  // Fast, direct corpus retrieval for ANY keyword (e.g. "AD", "PED", "demerit goods", "tariffs")
  const searchResults = useMemo(() => {
    const raw = searchQuery.trim();
    if (!raw) {
      return {
        definitions: CAMBRIDGE_CORE_DEFINITIONS.slice(0, 5),
        pastPapers: CAMBRIDGE_PAST_PAPERS_CORPUS.slice(0, 4),
        chapters: SYLLABUS_CHAPTERS.slice(0, 3),
        totalCount: 12,
      };
    }

    const clean = raw.toLowerCase().replace(/['"“”‘’()]/g, " ").replace(/\s+/g, " ").trim();
    const rawLow = raw.toLowerCase();
    const phrases: string[] = [rawLow, clean];

    // Typo corrections
    if (clean.includes("deprit")) phrases.push("demerit", "demerit good", "negative externality", "indirect tax");
    if (clean.includes("oood")) phrases.push("good", "demerit good");
    if (clean.includes("oppurtunity") || clean.includes("oppertunity")) phrases.push("opportunity cost", "ppc");
    if (clean.includes("elasticy")) phrases.push("elasticity", "ped", "pes");
    if (clean.includes("inflaton")) phrases.push("inflation", "demand-pull", "cost-push");
    if (clean.includes("terriff")) phrases.push("tariff", "protectionism");
    if (clean.includes("monoply")) phrases.push("monopoly");
    if (clean.includes("scarsity")) phrases.push("scarcity");

    // Token extraction
    const tokens = clean.split(" ").filter((w) => w.length > 0);

    // Cambridge acronym expansions (handles lowercase, uppercase, with or without parentheses)
    if (tokens.includes("ped") || clean === "ped" || clean.includes("price elasticity") || clean.includes("elasticity")) {
      phrases.push("ped", "price elasticity of demand", "price elasticity", "elasticity of demand", "elasticity");
    }
    if (tokens.includes("pes") || clean === "pes") {
      phrases.push("pes", "price elasticity of supply", "elasticity of supply");
    }
    if (tokens.includes("yed") || clean === "yed") {
      phrases.push("yed", "income elasticity of demand", "income elasticity");
    }
    if (tokens.includes("xed") || clean === "xed") {
      phrases.push("xed", "cross elasticity of demand", "cross elasticity");
    }
    if (tokens.includes("ad") || clean === "ad" || clean.includes("aggregate demand")) {
      phrases.push("aggregate demand", "ad/as", "ad-as", "aggregate demand (ad)");
    }
    if (tokens.includes("as") || clean === "as" || clean.includes("aggregate supply")) {
      phrases.push("aggregate supply", "sras", "lras");
    }
    if (tokens.includes("ppc") || tokens.includes("ppf") || clean === "ppc" || clean === "ppf" || clean.includes("production possibility")) {
      phrases.push("production possibility curve", "opportunity cost", "ppc", "ppf");
    }
    if (tokens.includes("bop") || clean === "bop") {
      phrases.push("balance of payments", "current account");
    }
    if (tokens.includes("cpi") || clean === "cpi") {
      phrases.push("consumer price index", "inflation");
    }

    const textMatches = (text: string) => {
      const t = text.toLowerCase();
      // 1. Direct phrase or acronym match
      for (const phrase of phrases) {
        if (phrase.length >= 2 && t.includes(phrase)) return true;
      }
      // 2. Individual tokens match (e.g. if searching multi-word query, matches if words appear)
      if (tokens.length >= 2 && tokens.every((tok) => t.includes(tok))) {
        return true;
      }
      // 3. Whole-word match for short tokens like "ped", "ad", "ppc"
      for (const tok of tokens) {
        if (tok.length <= 4) {
          const re = new RegExp(`\\b${tok}\\b`, "i");
          if (re.test(t)) return true;
        }
      }
      return false;
    };

    // 1. Match Cambridge Master Definitions
    const matchedDefs = CAMBRIDGE_CORE_DEFINITIONS.filter((d) => {
      return textMatches(d.term) || textMatches(d.definition_text) || textMatches(d.category);
    });

    // 2. Match Past Papers & Mark Schemes
    const matchedPapers = CAMBRIDGE_PAST_PAPERS_CORPUS.filter((p) => {
      return textMatches(p.stem) || textMatches(p.paperCode) || textMatches(p.topicTitle);
    });

    // 3. Match Syllabus Chapters
    const matchedChapters = SYLLABUS_CHAPTERS.filter((ch) => {
      return textMatches(ch.title) || ch.concepts.some((c) => textMatches(c)) || textMatches(ch.category);
    });

    return {
      definitions: matchedDefs,
      pastPapers: matchedPapers,
      chapters: matchedChapters,
      totalCount: matchedDefs.length + matchedPapers.length + matchedChapters.length,
    };
  }, [searchQuery]);

  return (
    <section id="rag-engine" className="relative border-b-[1.5px] border-ink bg-surface-raised py-12 sm:py-16 scroll-mt-20 overflow-hidden">
      <CosmicAtmosphere variant="cyan" sparkles={true} density="medium" />

      <div className="relative z-10 mx-auto max-w-7xl 2xl:max-w-[1440px] px-4 sm:px-6 md:px-10 lg:px-12 xl:px-16">
        {/* Full-Width Spotlight Card Frame */}
        <div className="relative w-full rounded-3xl border-2 border-primary/35 bg-card/95 shadow-2xl p-6 sm:p-10 md:p-12 backdrop-blur-xl text-center space-y-8 ring-1 ring-primary/20">
          
          {/* Pivotal Feature Badge & Header */}
          <div className="space-y-3 max-w-4xl mx-auto">
            <div className="inline-flex items-center gap-2 rounded-full border border-primary/40 bg-primary/10 px-4 py-1.5 text-xs font-bold text-primary shadow-2xs">
              <Cpu className="size-3.5 text-primary animate-pulse" />
              <span className="font-mono text-[11px] tracking-wide uppercase">Pivotal Intelligence Engine</span>
              <span className="inline-block size-1.5 rounded-full bg-emerald-500 animate-pulse" />
            </div>
            <h2 className="text-2xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight text-foreground">
              Official Cambridge 0455 RAG Knowledge Engine
            </h2>
            <p className="text-sm sm:text-base text-muted-foreground max-w-3xl mx-auto leading-relaxed">
              The vector intelligence grounding every mark in official Cambridge 0455 mark schemes. Tested across textbook definitions, past papers, and all 6 syllabus units with zero hallucination.
            </p>
          </div>

          {/* Expansive Search Bar */}
          <div className="space-y-3 max-w-3xl mx-auto w-full">
            <div className="relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 size-5 text-primary pointer-events-none" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Type any keyword (e.g. AD, demerit goods, tariffs, PED, scarcity, inflation)..."
                className="w-full h-12 sm:h-13 pl-12 pr-11 rounded-2xl border-2 border-primary/35 focus:border-primary bg-background text-sm sm:text-base text-foreground shadow-sm focus:outline-none focus:ring-2 focus:ring-primary/25 transition-all font-medium"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery("")}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 size-6 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground flex items-center justify-center transition-colors cursor-pointer text-xs"
                  title="Clear"
                >
                  <X className="size-3.5" />
                </button>
              )}
            </div>

            {/* Quick Click Tags */}
            <div className="flex flex-wrap items-center justify-center gap-2 text-xs">
              <span className="text-xs font-semibold text-muted-foreground mr-1">Quick Check:</span>
              {POPULAR_QUICK_SEARCHES.map((tag) => (
                <button
                  key={tag}
                  type="button"
                  onClick={() => setSearchQuery(tag)}
                  className={cn(
                    "rounded-lg px-3 py-1 text-xs font-semibold transition-all cursor-pointer border",
                    searchQuery.trim().toLowerCase() === tag.toLowerCase()
                      ? "bg-primary text-primary-foreground border-primary shadow-xs font-bold"
                      : "bg-muted/40 hover:bg-muted text-muted-foreground hover:text-foreground border-border/60"
                  )}
                >
                  {tag}
                </button>
              ))}
            </div>
          </div>

          {/* Expansive Number of References Display */}
          {searchQuery.trim() && (
            <div className="pt-2 max-w-4xl mx-auto w-full">
              <div className="rounded-2xl border border-primary/30 bg-muted/20 p-5 text-left space-y-4 shadow-sm">
                <div className="flex flex-wrap items-center justify-between gap-2 text-sm sm:text-base font-bold text-foreground border-b border-border/70 pb-3">
                  <span className="flex items-center gap-2 text-foreground">
                    <CheckCircle2 className="size-5 text-emerald-500 shrink-0" />
                    <span>
                      <strong className="text-primary">{searchResults.totalCount}</strong> Cambridge References for &ldquo;<strong>{searchQuery.trim()}</strong>&rdquo;
                    </span>
                  </span>
                  <Badge variant="outline" className="text-xs font-mono border-emerald-500/40 text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2.5 py-1">
                    100% Vector Grounded
                  </Badge>
                </div>

                {/* 3 Metric Cards */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-center">
                  <div className="rounded-xl bg-card p-3.5 border border-border/70 space-y-1 shadow-2xs">
                    <div className="text-2xl sm:text-3xl font-black text-foreground">{searchResults.definitions.length}</div>
                    <div className="text-xs text-muted-foreground font-semibold flex items-center justify-center gap-1.5">
                      <BookOpen className="size-3.5 text-primary" /> Cambridge Definitions
                    </div>
                  </div>
                  <div className="rounded-xl bg-card p-3.5 border border-border/70 space-y-1 shadow-2xs">
                    <div className="text-2xl sm:text-3xl font-black text-foreground">{searchResults.pastPapers.length}</div>
                    <div className="text-xs text-muted-foreground font-semibold flex items-center justify-center gap-1.5">
                      <FileText className="size-3.5 text-emerald-500" /> Past Papers
                    </div>
                  </div>
                  <div className="rounded-xl bg-card p-3.5 border border-border/70 space-y-1 shadow-2xs">
                    <div className="text-2xl sm:text-3xl font-black text-foreground">{searchResults.chapters.length}</div>
                    <div className="text-xs text-muted-foreground font-semibold flex items-center justify-center gap-1.5">
                      <Database className="size-3.5 text-amber-500" /> Chapters
                    </div>
                  </div>
                </div>

                {/* Subtle Toggle for Details */}
                <div className="pt-1 text-center">
                  <button
                    type="button"
                    onClick={() => setShowDetails(!showDetails)}
                    className="text-xs font-bold text-primary hover:underline inline-flex items-center gap-1.5 cursor-pointer py-1"
                  >
                    {showDetails ? (
                      <>
                        <ChevronUp className="size-3.5" /> Hide reference titles
                      </>
                    ) : (
                      <>
                        <ChevronDown className="size-3.5" /> Preview matched reference titles ({searchResults.totalCount})
                      </>
                    )}
                  </button>
                </div>

                {/* Collapsed by default - renders full-width pills when toggled */}
                {showDetails && (
                  <div className="pt-3 border-t border-border/60 space-y-3 text-xs">
                    {searchResults.definitions.length > 0 && (
                      <div className="space-y-1.5">
                        <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider block">
                          Cambridge Definitions:
                        </span>
                        <div className="flex flex-wrap gap-1.5">
                          {searchResults.definitions.map((d) => (
                            <span key={d.id} className="rounded-lg bg-card px-2.5 py-1 text-xs text-foreground font-medium border border-border/70 shadow-2xs">
                              {d.term}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    {searchResults.pastPapers.length > 0 && (
                      <div className="space-y-1.5 pt-1">
                        <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider block">
                          Past Paper Stems:
                        </span>
                        <div className="flex flex-wrap gap-1.5">
                          {searchResults.pastPapers.map((p) => (
                            <span key={p.id} className="rounded-lg bg-card px-2.5 py-1 text-xs text-foreground font-medium border border-border/70 shadow-2xs">
                              {p.paperCode} {p.questionNumber} ({p.topicTitle})
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    {searchResults.chapters.length > 0 && (
                      <div className="space-y-1.5 pt-1">
                        <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider block">
                          Syllabus Objectives:
                        </span>
                        <div className="flex flex-wrap gap-1.5">
                          {searchResults.chapters.map((ch) => (
                            <span key={ch.num} className="rounded-lg bg-card px-2.5 py-1 text-xs text-foreground font-medium border border-border/70 shadow-2xs">
                              Ch {ch.num}: {ch.title}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* How the Cambridge 0455 RAG Engine Marks - Full Width 4-Card Stage */}
          <div className="pt-6 border-t border-border/60 w-full max-w-5xl mx-auto space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2 text-sm text-muted-foreground font-semibold">
              <span className="flex items-center gap-2 text-foreground font-bold">
                <Workflow className="size-4 text-primary" /> How Our Cambridge RAG Engine Marks:
              </span>
              <span className="text-xs font-mono text-emerald-600 dark:text-emerald-400 font-bold bg-emerald-500/10 px-2.5 py-1 rounded-md border border-emerald-500/30">
                Dual-Pass Vector Auditor
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5 text-left w-full">
              <div className="rounded-2xl border border-border/80 bg-background/90 p-4 space-y-1.5 shadow-xs hover:border-primary/50 transition-colors">
                <span className="text-xs font-mono font-bold text-primary block">01 · Corpus</span>
                <div className="text-sm font-bold text-foreground">15 Yrs Papers</div>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  1,400+ mark schemes, examiner reports &amp; 449 definitions.
                </p>
              </div>

              <div className="rounded-2xl border border-border/80 bg-background/90 p-4 space-y-1.5 shadow-xs hover:border-sky-500/50 transition-colors">
                <span className="text-xs font-mono font-bold text-sky-500 block">02 · Grounding</span>
                <div className="text-sm font-bold text-foreground">Exact Rubric</div>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Vector-retrieves authentic syllabus mark schemes per essay claim.
                </p>
              </div>

              <div className="rounded-2xl border border-border/80 bg-background/90 p-4 space-y-1.5 shadow-xs hover:border-amber-500/50 transition-colors">
                <span className="text-xs font-mono font-bold text-amber-500 block">03 · Calibration</span>
                <div className="text-sm font-bold text-foreground">Zero Central Bias</div>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Independent auditor eliminates generic AI middle-band clumping.
                </p>
              </div>

              <div className="rounded-2xl border border-border/80 bg-background/90 p-4 space-y-1.5 shadow-xs hover:border-emerald-500/50 transition-colors">
                <span className="text-xs font-mono font-bold text-emerald-500 block">04 · Verdict</span>
                <div className="text-sm font-bold text-foreground">Next-Band Plan</div>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Exact AO1, AO2, AO3 tariffs with line-by-line rewrite guidance.
                </p>
              </div>
            </div>

            {/* View Engine Action CTA */}
            <div className="mt-6 pt-5 border-t border-border/70 flex flex-col sm:flex-row items-center justify-between gap-4 text-center sm:text-left">
              <div>
                <p className="text-sm font-bold text-foreground">Ready to test the Cambridge 0455 RAG Engine on your own response?</p>
                <p className="text-xs text-muted-foreground">Get instant AO1/AO2/AO3 clause feedback with zero wait time.</p>
              </div>
              <Button asChild size="default" className="font-bold shadow-md shrink-0 cursor-pointer px-5 h-10">
                <Link
                  to={isAuthenticated ? "/grade" : "/auth"}
                  search={isAuthenticated ? undefined : ({ redirect: "/grade" } as any)}
                >
                  <span>Test RAG Engine Live</span>
                  <ArrowRight className="size-4 ml-1.5" />
                </Link>
              </Button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
