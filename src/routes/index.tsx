import { DEFAULT_SETTINGS, type PublicSettings } from "@/lib/site-settings";
import { cn, copyTextToClipboard } from "@/lib/utils";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import {
  ArrowRight,
  BookOpen,
  Check,
  Copy,
  ExternalLink,
  Flame,
  Gift,
  GraduationCap,
  LineChart,
  ListChecks,
  Mail,
  MessageCircle,
  Minimize2,
  PenLine,
  Scan,
  School,
  Send,
  Share2,
  ShieldCheck,
  Sparkles,
  Target,
  TrendingUp,
  Users,
  FileSpreadsheet,
  FileText,
  Gamepad2,
  Trophy,
  Wand2,
} from "lucide-react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

import { Button } from "@/components/ui/button";

import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { AuroraCanvas } from "@/components/marketing/aurora";
import { CustomCursor } from "@/components/marketing/cursor";
import {
  CircleScribble,
  Curl,
  DottedArrow,
  Drift,
  ScrollProgress,
  Star,
  Waves,
} from "@/components/marketing/doodles";
import { SiteFooter } from "@/components/marketing/footer";
import { CommandWordDrill } from "@/components/marketing/interactive";
import { MarkingHand } from "@/components/marketing/mascot";
import { CountUp, Reveal } from "@/components/marketing/reveal";
import { Ribbon } from "@/components/marketing/ribbon";
import { SiteNavLinks, SiteNavMobile } from "@/components/marketing/site-nav";
import { ThemeToggle } from "@/components/marketing/theme-toggle";
import { Magnetic, TiltCard } from "@/components/marketing/three-d";
import { AiComparisonSection } from "@/components/marketing/ai-comparison-section";
import { AccuracyCredibilitySection } from "@/components/marketing/accuracy-credibility-section";
import { RealEssayShowcase } from "@/components/marketing/real-essay-showcase";
import { McqShowcaseSection } from "@/components/marketing/mcq-showcase-section";
import { TeachersSection } from "@/components/marketing/teachers-section";
import { CosmicAtmosphere } from "@/components/marketing/cosmic-atmosphere";
import { CommunityPartnerBanner } from "@/components/marketing/community-partner-banner";
import { captureReferralCode } from "@/lib/waitlist-client";
import { supabase } from "@/integrations/backend/client";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Marginalite | AI Cambridge IGCSE Economics (0455) Prep & Essay Examiner" },
      {
        name: "description",
        content:
          "Master Cambridge IGCSE Economics (0455) with Marginalite. Features instant dual-pass AI essay grading, Paper 2 Section A Data Response, and timed Paper 1 MCQ practice.",
      },
      {
        name: "keywords",
        content:
          "0455 economics, Cambridge IGCSE Economics 0455, Marginalite AI, IGCSE 0455 Economics prep, Cambridge 0455 essay grader, IGCSE Economics past papers, IGCSE Economics MCQ",
      },
      {
        property: "og:site_name",
        content: "Marginalite",
      },
      {
        property: "og:title",
        content: "Marginalite | Cambridge IGCSE Economics (0455) Prep",
      },
      {
        property: "og:description",
        content: "The complete Cambridge IGCSE Economics (0455) mastery platform with dual-pass AI essay grading, Paper 2 Data Response, and Paper 1 MCQ practice.",
      },
      {
        property: "og:url",
        content: "https://lite.marginal-econ.com",
      },
      {
        property: "og:type",
        content: "website",
      },
      {
        property: "og:image",
        content: "https://lite.marginal-econ.com/marginal-m-icon-clean.png",
      },
      {
        name: "twitter:card",
        content: "summary_large_image",
      },
      {
        name: "twitter:title",
        content: "Marginalite | Cambridge IGCSE Economics (0455) Prep",
      },
      {
        name: "twitter:description",
        content: "The complete Cambridge IGCSE Economics (0455) mastery platform with dual-pass AI essay grading, Paper 2 Data Response, and Paper 1 MCQ practice.",
      },
      {
        name: "application-name",
        content: "Marginalite AI",
      },
      {
        name: "apple-mobile-web-app-title",
        content: "Marginalite AI",
      },
      {
        name: "robots",
        content: "index, follow, max-snippet:-1, max-image-preview:large, max-video-preview:-1",
      },
    ],
    links: [
      {
        rel: "canonical",
        href: "https://lite.marginal-econ.com/",
      },
    ],
    scripts: [
      {
        type: "application/ld+json",
        children: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "WebSite",
          "name": "Marginalite",
          "alternateName": "Parginal",
          "url": "https://lite.marginal-econ.com",
          "potentialAction": {
            "@type": "SearchAction",
            "target": "https://lite.marginal-econ.com/search?q={search_term_string}",
            "query-input": "required name=search_term_string",
          },
        }),
      },
      {
        type: "application/ld+json",
        children: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "FAQPage",
          "mainEntity": [
            {
              "@type": "Question",
              "name": "What is Marginalite AI?",
              "acceptedAnswer": {
                "@type": "Answer",
                "text": "Marginalite AI is the Cambridge IGCSE Economics (0455) mastery platform featuring real-time Essay Grader coaching, automated AO1/AO2/AO3 essay grading calibrated against official Cambridge mark schemes, and Paper 1 & 3 MCQ past paper drills.",
              },
            },
            {
              "@type": "Question",
              "name": "Is Marginalite AI free to use?",
              "acceptedAnswer": {
                "@type": "Answer",
                "text": "Yes, Marginalite AI provides free access to unlimited essay evaluations, syllabus citations, and full past paper MCQ practice.",
              },
            },
            {
              "@type": "Question",
              "name": "How does Marginalite AI grade Cambridge IGCSE 0455 essays?",
              "acceptedAnswer": {
                "@type": "Answer",
                "text": "Marginalite AI uses Cambridge IGCSE 0455 syllabus mark schemes, official examiner reports, and calibrated anchor scripts to grade essays across AO1 (Knowledge), AO2 (Analysis), and AO3 (Evaluation) assessment objectives.",
              },
            },
            {
              "@type": "Question",
              "name": "Can Marginalite AI read handwritten essays and economic diagrams?",
              "acceptedAnswer": {
                "@type": "Answer",
                "text": "Yes, photograph your handwritten script or essay diagram and Marginalite AI OCR extracts the text while isolating diagrams for accurate examiner assessment.",
              },
            },
          ],
        }),
      },
    ],
  }),
  component: Index,
});

const RIBBON_ITEMS = [
  "Cambridge IGCSE 0455",
  "93.9% Senior Examiner Accuracy",
  "72.7% Exact Matches",
  "0.33 MAE Benchmark",
  "2m, 4m, 6m & 8m Questions",
  "Papers 1 & 2",
  "Dual-Pass Essay Grader",
  "Data Response Studio",
  "AO1 Knowledge",
  "AO2 Analysis",
  "AO3 Evaluation",
  "Paper 1 MCQs",
  "12h Exam Resume",
  "Paper 2 Section A & B",
  "Unlimited Essay Gradings",
  "Handwriting Vision OCR",
  "Diagram Studio",
  "Definition Hub",
  "Marked to 0455",
];

// The three assessment objectives in the product's own reserved colours, so
// the vocabulary a student meets on every mark breakdown is taught here
// first.
const OBJECTIVES = [
  { code: "AO1", name: "Knowledge", dot: "bg-ao1", share: 38 },
  { code: "AO2", name: "Analysis", dot: "bg-ao2", share: 72 },
  { code: "AO3", name: "Evaluation", dot: "bg-ao3", share: 45 },
];

// Specialized features engineered for Cambridge IGCSE 0455 Economics.
const TOOLS = [
  {
    icon: Gamepad2,
    tile: "bg-amber-600",
    badge: "Multiplayer Arena",
    title: "Live MCQ Quiz Arena",
    body: "Multiplayer Cambridge IGCSE 0455 past paper races with 6-digit PIN, Serious Exam sprint, and Game Arena with power-ups (Steal, Swap & Tax).",
    href: "/quiz",
  },
  {
    icon: PenLine,
    tile: "bg-ao2",
    badge: "Full Audit",
    title: "Dual-Pass Essay Grader",
    body: "Line-by-line mark scheme matching across AO1, AO2, and AO3 with dual-pass bias correction and rewrite plans.",
    href: "/grade",
  },
  {
    icon: ListChecks,
    tile: "bg-ao1",
    badge: "Exam Simulation",
    title: "Paper 1 MCQ Past Papers",
    body: "34 official Cambridge 0455 Paper 1 MCQ past papers with exam timers, distractor explanations, and auto-resume.",
    href: "/mcq-live",
  },
  {
    icon: FileSpreadsheet,
    tile: "bg-emerald-600",
    badge: "Section A Studio",
    title: "Data Response & Case Studies",
    body: "11 authentic 2022–2026 Paper 2 Section A case studies with Table 1.1 data interpretation, diagrams, and official mark schemes.",
    href: "/data-response",
  },
  {
    icon: Wand2,
    tile: "bg-violet-600",
    badge: "AI Models",
    title: "Sample Essay Generator",
    body: "Full-mark Cambridge IGCSE 0455 model answers tailored to any 2m, 4m, 6m, or 8m question with verified diagrams.",
    href: "/essay-generator",
  },
  {
    icon: BookOpen,
    tile: "bg-ao3",
    badge: "Revision Vault",
    title: "Cambridge Definition Hub",
    body: "Over 120 verified syllabus definitions with essential AO1 keywords, topic tags, and flashcards.",
    href: "/definitions",
  },
  {
    icon: LineChart,
    tile: "bg-primary",
    badge: "Visual Studio",
    title: "Economics Diagram Studio",
    body: "Dynamic micro and macro diagrams with interactive curve shifts, equilibrium tracking, and examiner labels.",
    href: "/diagrams",
  },
  {
    icon: Flame,
    tile: "bg-amber-600",
    badge: "15-Yr Intelligence",
    title: "Past Paper Topic Predictor",
    body: "Statistical rotation modeling across 15 years of Cambridge IGCSE 0455 exam papers (2010–2025).",
    href: "/paper-matrix",
  },
  {
    icon: Scan,
    tile: "bg-ao1",
    badge: "Vision AI",
    title: "Handwriting Vision OCR",
    body: "Extracts handwritten mock exam scripts and hand-drawn diagrams for instant examiner grading.",
    href: "/grade",
  },
  {
    icon: TrendingUp,
    tile: "bg-ao3",
    badge: "Intelligence",
    title: "Review & Analytics Hub",
    body: "Performance radar tracking projected Cambridge grades, MCQ topic mastery, and syllabus balance.",
    href: "/review",
  },
  {
    icon: Sparkles,
    tile: "bg-violet-600",
    badge: "729 Prompts",
    title: "Curated 0455 Question Bank",
    body: "Search 729 official Cambridge IGCSE 0455 past-paper questions filtered by Units 1–6, mark tariff, and command word.",
    href: "/question-bank",
  },
];

const STEPS = [
  {
    n: "01",
    title: "Pick or paste your question",
    body: "Choose from our 729-question Cambridge 0455 bank or paste any IGCSE Paper 2 question (2m, 4m, 6m, or 8m).",
  },
  {
    n: "02",
    title: "Add your answer or photo",
    body: "Type your answer or upload a photo of handwritten exam paper. Vision OCR lifts your writing and diagrams seamlessly.",
  },
  {
    n: "03",
    title: "Get your mark and rewrite plan",
    body: "Receive an instant AO1/AO2/AO3 breakdown, official mark-scheme citations, and an ordered plan for your next draft.",
  },
];

const TRUST = [
  {
    icon: BookOpen,
    title: "Grounded in Cambridge IGCSE 0455",
    body: "Every mark and citation is retrieved from 2,056 indexed chunks of official Cambridge 0455 textbooks, syllabus specs, and 2020–2026 mark schemes.",
  },
  {
    icon: Target,
    title: "Calibrated to Official 0455 Tariffs",
    body: "Respects point marking for 2m/4m/6m questions and Cambridge Table A Levels 1–3 for 8-mark Discuss questions — never A-Level bloat.",
  },
  {
    icon: ShieldCheck,
    title: "Independent Dual-Pass Audit",
    body: "Two independent examiner passes plus a consistency refiner ensure accurate scoring and actionable rewrite feedback.",
  },
];

const FAQS = [
  {
    q: "Which Cambridge Economics syllabus does Marginalite cover?",
    a: "Marginalite is built exclusively for Cambridge IGCSE Economics (0455), covering both Paper 1 (Multiple Choice — 30Q legacy & 40Q 2027 format) and Paper 2 (Section A Data Response case studies and Section B 2m, 4m, 6m, and 8m structured questions) across all six syllabus units.",
  },
  {
    q: "How does Marginalite grade Cambridge IGCSE 0455 essays?",
    a: "Marginalite evaluates your response against official Cambridge 0455 mark schemes and coursebook chapters using a two-pass examiner pipeline, awarding exact AO1 (Knowledge), AO2 (Analysis), and AO3 (Evaluation) marks with specific rewrite advice.",
  },
  {
    q: "Is Marginalite free for students?",
    a: "Yes. Students get 100% free access to unlimited IGCSE 0455 essay grading, Paper 2 Section A Data Response past papers, and timed Paper 1 MCQ drills.",
  },
  {
    q: "Can Marginalite read handwritten answers and diagrams?",
    a: "Yes. Snap a photo of your handwritten mock exam or notebook. Vision OCR extracts your text and hand-drawn demand/supply or PPC diagrams for immediate examiner grading.",
  },
  {
    q: "How is Marginalite built for IGCSE 0455?",
    a: "Marginalite is engineered from the ground up exclusively for Cambridge IGCSE Economics (0455), with dedicated 0455 mark schemes, Paper 1 MCQ drills, Paper 2 Data Response past papers, and Units 1–6 resources.",
  },
  {
    q: "Can teachers and schools use Marginalite?",
    a: "Yes. Teachers can create IGCSE 0455 cohorts, assign structured questions or Paper 1 MCQs, review student scripts, and track class-level AO progress.",
  },
];

function Index() {
  const [settings, setSettings] = useState<PublicSettings>(DEFAULT_SETTINGS);
  const [settingsLoaded, setSettingsLoaded] = useState(false);
  useEffect(() => {
    const controller = new AbortController();
    fetch("/api/settings", { signal: controller.signal })
      .then(async (response) => {
        if (!response.ok) throw new Error("Settings unavailable");
        const body = await response.json();
        if (!body.success) throw new Error("Settings unavailable");
        setSettings(body.settings);
        setSettingsLoaded(true);
      })
      .catch(() => {
        if (!controller.signal.aborted) setSettingsLoaded(true);
      });
    return () => controller.abort();
  }, []);
  // Read once here purely so the invitation banner can be shown. The form
  // does its own capture; both read the same stored value, and whichever
  // runs first is the one that cleans the query string.
  const [invitedBy, setInvitedBy] = useState<string | null>(null);
  useEffect(() => setInvitedBy(captureReferralCode()), []);

  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setIsAuthenticated(Boolean(data.session));
    });
  }, []);

  const [shareOpen, setShareOpen] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [copiedMessage, setCopiedMessage] = useState(false);

  const shareOrigin = typeof window !== "undefined" ? window.location.origin : "https://lite.marginal-econ.com";
  const shareUrl = `${shareOrigin}${invitedBy ? `?ref=${encodeURIComponent(invitedBy)}` : ""}`;
  const shareMessage = `Hey! I'm using Marginalite for Cambridge IGCSE Economics (0455). It gives real-time Essay Grader coaching, breaks down essays into AO1/AO2/AO3 marks grounded in official Cambridge mark schemes, and offers full MCQ past paper practice with resume. Grade unlimited essays free:\n${shareUrl}`;

  const handleCopyLink = async () => {
    const ok = await copyTextToClipboard(shareUrl);
    if (ok) {
      setCopiedLink(true);
      toast.success("Invite link copied to clipboard!");
      setTimeout(() => setCopiedLink(false), 2000);
    } else {
      toast.error("Could not copy link to clipboard.");
    }
  };

  const handleCopyMessage = async () => {
    const ok = await copyTextToClipboard(shareMessage);
    if (ok) {
      setCopiedMessage(true);
      toast.success("Study group message copied to clipboard!");
      setTimeout(() => setCopiedMessage(false), 2000);
    } else {
      toast.error("Could not copy message to clipboard.");
    }
  };

  const [isMinimalist, setIsMinimalist] = useState(false);
  useEffect(() => {
    if (typeof window !== "undefined") {
      setIsMinimalist(localStorage.getItem("marginal_minimalist_mode") === "true");
    }
  }, []);

  const toggleMinimalist = (value?: boolean) => {
    setIsMinimalist((prev) => {
      const next = typeof value === "boolean" ? value : !prev;
      if (typeof window !== "undefined") {
        localStorage.setItem("marginal_minimalist_mode", String(next));
      }
      return next;
    });
  };

  if (isMinimalist) {
    return (
      <MinimalistHome
        onToggleFull={() => toggleMinimalist(false)}
        isAuthenticated={isAuthenticated}
        settings={settings}
      />
    );
  }

  return (
    <div className="min-h-screen overflow-x-hidden bg-background">
      <CustomCursor />
      <ScrollProgress />

      {/* ── Community Partner Banner (r/The_IGCSE_Workaholics) ─────────── */}
      <CommunityPartnerBanner />

      {/* ── Header ───────────────────────────────────────────────────────── */}
      <header className="sticky top-0 z-40 border-b border-border bg-background/80 backdrop-blur-xl">
        <div className="relative mx-auto flex max-w-7xl 2xl:max-w-[1440px] items-center justify-between gap-3 px-4 py-2.5 sm:px-6 md:px-10 lg:px-12 xl:px-16 sm:py-3">
          <Link to="/">
            <Wordmark />
          </Link>

          <SiteNavLinks />

          <div className="flex items-center gap-2">
            <SiteNavMobile />

            {/* Back link to Marginal (A-Level Economics 9708) */}
            <a
              href="https://marginal-econ.com/"
              target="_blank"
              rel="noopener noreferrer"
              className="group inline-flex items-center gap-1.5 rounded-lg border border-purple-500/40 bg-purple-500/10 px-2 sm:px-3 py-1.5 text-xs font-bold text-purple-700 dark:text-purple-300 hover:bg-purple-500/20 hover:border-purple-500/60 transition-all shadow-2xs hover:scale-[1.02] active:scale-[0.98] whitespace-nowrap"
              title="Switch to Marginal (Cambridge AS & A Level Economics 9708) (https://marginal-econ.com/)"
            >
              <Sparkles className="size-3.5 text-purple-500 fill-purple-500/30 group-hover:scale-110 transition-transform" />
              <span>Marginal <span className="hidden sm:inline">(A-Level 9708)</span></span>
              <ExternalLink className="size-2.5 opacity-60 group-hover:opacity-100 transition-opacity" />
            </a>

            <ThemeToggle className="size-8 sm:size-9" />

            <Link
              to="/teacher-auth"
              search={{ tab: "signup" }}
              className="inline-flex items-center gap-1.5 rounded-lg border border-purple-500/40 bg-purple-500/15 px-2 sm:px-3 py-1.5 text-xs font-bold text-purple-800 dark:text-purple-200 hover:bg-purple-500/25 hover:border-purple-500/60 transition-all shadow-2xs whitespace-nowrap"
              title="Official Cambridge IGCSE 0455 Teacher & Department Registration"
            >
              <School className="size-3.5 text-purple-600 dark:text-purple-400 shrink-0" />
              <span className="hidden sm:inline">Teacher: Sign Up</span>
              <span className="sm:hidden">Teachers</span>
            </Link>
            <Link
              to="/auth"
              className="hidden rounded-lg px-3 py-1.5 text-xs xl:text-sm font-semibold text-muted-foreground transition-colors hover:bg-muted hover:text-foreground md:inline-flex whitespace-nowrap"
            >
              Sign in
            </Link>
            <Magnetic strength={8}>
              <Link
                to="/auth"
                className="pop-sm pop-press shine inline-flex min-h-8 sm:min-h-9 items-center justify-center gap-1.5 whitespace-nowrap bg-primary px-2.5 sm:px-3.5 py-1.5 text-xs font-semibold text-primary-foreground sm:text-sm rounded-lg"
              >
                <span className="hidden min-[380px]:inline">Get Started Free</span>
                <span className="min-[380px]:hidden">Get Started</span>
              </Link>
            </Magnetic>
          </div>
        </div>
      </header>

      {/* ── Hero ─────────────────────────────────────────────────────────── */}
      <section className="relative overflow-hidden border-b-[1.5px] border-ink pb-0">
        {/* Three background layers, back to front: the CSS aurora wash, WebGL curtain,
            cosmic twinkling starfield, and paper-grid overlay. */}
        <div className="aurora-wash pointer-events-none absolute inset-0" aria-hidden="true" />
        <AuroraCanvas />
        <CosmicAtmosphere variant="hero" sparkles={true} density="high" />
        <div className="paper-grid pointer-events-none absolute inset-0" aria-hidden="true" />

        <Drift speed={0.1} className="top-52 left-[1%] hidden xl:block">
          <Curl className="w-16 text-primary/30" />
        </Drift>
        <Drift speed={-0.06} className="top-40 right-[2%] hidden xl:block">
          <Waves className="w-20 text-ao3/60" />
        </Drift>
        <Drift speed={0.14} className="bottom-36 left-[40%] hidden lg:block">
          <Star className="doodle size-6 text-primary/25" />
        </Drift>
        <Star className="doodle absolute top-32 left-[46%] hidden size-4 text-ao3/30 md:block" />

        <div className="relative z-10 mx-auto grid max-w-7xl 2xl:max-w-[1440px] items-center gap-8 lg:gap-10 xl:gap-14 px-4 py-8 sm:px-6 sm:py-10 md:px-10 md:py-12 lg:grid-cols-[1.1fr_1fr] xl:grid-cols-[1.15fr_1fr]">
          <div>
            <Reveal>
              <div className="flex flex-wrap items-center gap-2">
                <span className="chip-soft shadow-xs flex items-center gap-1.5 border border-primary/30 bg-primary/10 text-primary font-semibold">
                  <span className="relative flex size-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
                    <span className="relative inline-flex rounded-full size-2 bg-primary"></span>
                  </span>
                  <Sparkles className="size-3.5 text-primary animate-pulse" />
                  Cambridge IGCSE 0455 Examiner Calibration
                </span>
                <span className="rounded-full bg-emerald-500/15 border border-emerald-500/40 px-2.5 py-0.5 text-[10.5px] font-mono font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5 shadow-2xs">
                  <ShieldCheck className="size-3 text-emerald-500" />
                  93.9% Examiner Accuracy (72.7% Exact · 0.33 MAE)
                </span>
                <span className="rounded-full bg-violet-500/15 border border-violet-500/30 px-2.5 py-0.5 text-[10.5px] font-mono font-bold text-violet-700 dark:text-violet-300 flex items-center gap-1.5 shadow-2xs">
                  <GraduationCap className="size-3 text-violet-500" />
                  Cambridge IGCSE 0455 (Papers 1 &amp; 2)
                </span>
                <a
                  href="https://marginal-econ.com/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="rounded-full bg-purple-500/15 border border-purple-500/40 px-2.5 py-0.5 text-[10.5px] font-mono font-bold text-purple-700 dark:text-purple-300 flex items-center gap-1.5 shadow-2xs hover:bg-purple-500/25 hover:border-purple-500/60 transition-all cursor-pointer"
                  title="Visit Marginal for Cambridge AS & A Level Economics 9708 (https://marginal-econ.com/)"
                >
                  <Sparkles className="size-3 text-purple-500" />
                  <span>Looking for A-Level 9708? Visit Marginal ↗</span>
                </a>
                <span className="rounded-full bg-emerald-500/15 border border-emerald-500/30 px-2.5 py-0.5 text-[10.5px] font-mono font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5 shadow-2xs">
                  <span className="size-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  <BookOpen className="size-3 text-emerald-500" />
                  100% Free · Built for IGCSE 0455
                </span>
              </div>
            </Reveal>

            <Reveal delay={60}>
              <h1 className="mt-5 text-2xl min-[380px]:text-3xl sm:text-4xl md:text-[3.25rem] lg:text-[3.5rem] xl:text-[3.85rem] leading-[1.1] font-extrabold tracking-tight break-words">
                Marginalite AI —{" "}
                <span className="relative inline-block mt-1 sm:mt-1.5 px-2.5 sm:px-3 py-1 rounded-xl bg-indigo-950/70 dark:bg-indigo-950/80 border border-violet-400/40 text-violet-200 shadow-[0_0_20px_rgba(124,109,240,0.28)] backdrop-blur-md max-w-full">
                  <span className="bg-gradient-to-r from-violet-200 via-indigo-100 to-purple-200 bg-clip-text text-transparent font-black tracking-tight break-words">
                    The Cambridge IGCSE 0455 Platform
                  </span>
                </span>
              </h1>
              <h2 className="mt-3 text-base sm:text-xl md:text-2xl font-semibold text-primary">
                Engineered Exclusively for Cambridge IGCSE Economics (0455)
              </h2>
            </Reveal>

            <Reveal delay={85}>
              <div className="mt-3.5 flex items-center gap-2 text-xs text-muted-foreground">
                <div className="flex text-amber-500 text-xs tracking-wider font-bold" aria-hidden="true">
                  ★★★★★
                </div>
                <span className="font-medium text-foreground">
                  Grounded in 2,056 official Cambridge 0455 textbook &amp; mark-scheme chunks
                </span>
              </div>
            </Reveal>

            <Reveal delay={110}>
              <p className="mt-4 max-w-2xl text-base sm:text-lg leading-relaxed text-pretty text-muted-foreground dark:text-foreground/90">
                {settings.heroDescription}
              </p>
            </Reveal>

            {/* Live Cambridge Diagnostic Accuracy & Benchmark Highlights */}
            <Reveal delay={150}>
              <div className="mt-5 grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-2.5 max-w-2xl">
                <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/[0.08] p-2.5 sm:p-3 text-center backdrop-blur-md shadow-xs hover:border-emerald-500/60 transition-colors">
                  <div className="flex items-center justify-center gap-1">
                    <span className="text-xl sm:text-2xl font-black text-foreground tracking-tight">93.9%</span>
                    <span className="text-[10px] font-bold text-emerald-500 font-mono">±1 Mark</span>
                  </div>
                  <span className="text-[9.5px] sm:text-[11px] text-muted-foreground font-semibold leading-tight block mt-0.5">Examiner Match</span>
                </div>
                <div className="rounded-xl border border-primary/30 bg-primary/[0.08] p-2.5 sm:p-3 text-center backdrop-blur-md shadow-xs hover:border-primary/60 transition-colors">
                  <div className="flex items-center justify-center gap-1">
                    <span className="text-xl sm:text-2xl font-black text-foreground tracking-tight">72.7%</span>
                    <span className="text-[10px] font-bold text-primary font-mono">Exact</span>
                  </div>
                  <span className="text-[9.5px] sm:text-[11px] text-muted-foreground font-semibold leading-tight block mt-0.5">33 Real Scripts</span>
                </div>
                <div className="rounded-xl border border-violet-500/30 bg-violet-500/[0.08] p-2.5 sm:p-3 text-center backdrop-blur-md shadow-xs hover:border-violet-500/60 transition-colors">
                  <div className="flex items-center justify-center gap-1">
                    <span className="text-xl sm:text-2xl font-black text-foreground tracking-tight">0.33</span>
                    <span className="text-[10px] font-bold text-violet-400 font-mono">MAE</span>
                  </div>
                  <span className="text-[9.5px] sm:text-[11px] text-muted-foreground font-semibold leading-tight block mt-0.5">Avg Mark Error</span>
                </div>
                <div className="rounded-xl border border-amber-500/30 bg-amber-500/[0.08] p-2.5 sm:p-3 text-center backdrop-blur-md shadow-xs hover:border-amber-500/60 transition-colors">
                  <div className="flex items-center justify-center gap-1">
                    <span className="text-xl sm:text-2xl font-black text-foreground tracking-tight">100%</span>
                    <span className="text-[10px] font-bold text-amber-500 font-mono">Pass</span>
                  </div>
                  <span className="text-[9.5px] sm:text-[11px] text-muted-foreground font-semibold leading-tight block mt-0.5">10/10 Stress Matrix</span>
                </div>
              </div>
            </Reveal>

            {/* IGCSE 0455 Syllabus Scope Breakdown */}
            <Reveal delay={165}>
              <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-2.5 max-w-xl">
                <div className="rounded-xl border border-border/80 bg-card/60 p-2.5 backdrop-blur-xs flex items-start gap-2.5 text-left">
                  <span className="rounded-lg bg-blue-500/10 border border-blue-500/20 text-blue-600 dark:text-blue-400 font-mono text-[10px] font-black px-1.5 py-0.5 shrink-0 mt-0.5">
                    PAPER 1
                  </span>
                  <div className="text-xs">
                    <p className="font-bold text-foreground">Multiple Choice (30%)</p>
                    <p className="text-[11px] text-muted-foreground mt-0.5">
                      Timed Past Papers (30Q/45m &amp; 2027 40Q/60m) · Tutor &amp; Proctored Modes
                    </p>
                  </div>
                </div>
                <div className="rounded-xl border border-border/80 bg-card/60 p-2.5 backdrop-blur-xs flex items-start gap-2.5 text-left">
                  <span className="rounded-lg bg-purple-500/10 border border-purple-500/20 text-purple-600 dark:text-purple-400 font-mono text-[10px] font-black px-1.5 py-0.5 shrink-0 mt-0.5">
                    PAPER 2
                  </span>
                  <div className="text-xs">
                    <p className="font-bold text-foreground">Structured Questions (70%)</p>
                    <p className="text-[11px] text-muted-foreground mt-0.5">
                      Section A Data Response &amp; Section B 2m/4m/6m/8m Marking
                    </p>
                  </div>
                </div>
              </div>
            </Reveal>

            {/* Direct candidate conversion actions */}
            <Reveal delay={180}>
              <div className="mt-6 flex flex-col sm:flex-row flex-wrap items-stretch sm:items-center gap-3">
                <Button
                  asChild
                  size="lg"
                  className="h-12 px-6 text-sm font-extrabold shadow-lg shadow-primary/25 bg-primary hover:bg-primary/90 text-primary-foreground transition-all hover:scale-[1.02] cursor-pointer w-full sm:w-auto inline-flex items-center justify-center gap-2"
                >
                  <Link to="/auth">
                    <span>Grade Essays Free</span>
                    <ArrowRight className="size-4 shrink-0" />
                  </Link>
                </Button>
                <Button
                  asChild
                  variant="outline"
                  size="lg"
                  className="h-12 px-5 text-sm font-semibold border-2 hover:bg-muted gap-2 shadow-xs cursor-pointer w-full sm:w-auto inline-flex items-center justify-center"
                >
                  <a href="#graded-exemplar">
                    <FileText className="size-4 text-primary shrink-0" />
                    <span>See Graded Sample</span>
                  </a>
                </Button>
                <Button
                  asChild
                  variant="outline"
                  size="lg"
                  className="h-12 px-4 text-sm font-semibold border-2 border-amber-500/40 bg-amber-500/10 hover:bg-amber-500/20 text-foreground gap-2 shadow-xs cursor-pointer w-full sm:w-auto inline-flex items-center justify-center"
                >
                  <Link to="/quiz">
                    <Gamepad2 className="size-4 text-amber-500 shrink-0" />
                    <span>Live Quiz (PIN)</span>
                  </Link>
                </Button>
              </div>
              <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                <span className="inline-flex items-center gap-1.5 font-medium text-foreground">
                  <ShieldCheck className="size-3.5 text-emerald-500 shrink-0" /> No credit card required
                </span>
                <span>•</span>
                <span>Free instant access</span>
                <span>•</span>
                <span>Grounded in Cambridge IGCSE 0455</span>
                <span>•</span>
                <button
                  type="button"
                  onClick={() => setShareOpen(true)}
                  className="inline-flex items-center gap-1 font-semibold text-primary hover:underline cursor-pointer"
                >
                  <Share2 className="size-3 shrink-0" /> Share
                </button>
              </div>
            </Reveal>

            {invitedBy ? (
              <Reveal delay={210}>
                <p className="mt-3 inline-flex items-center gap-2 text-xs text-muted-foreground">
                  <Gift className="size-3.5 text-primary shrink-0" aria-hidden="true" />
                  Invited with code <span className="font-semibold text-foreground">{invitedBy.toLowerCase()}</span> — unlimited essay grading unlocked.
                </p>
              </Reveal>
            ) : null}
          </div>

          {/* Centered Cambridge Specimen Showcase */}
          <Reveal variant="pop" delay={120} className="relative w-full">
            <div className="relative w-full">
              {/* Ambient Stage Halo Glow */}
              <div className="absolute -inset-2 rounded-3xl bg-gradient-to-r from-primary/30 via-violet-500/20 to-amber-500/20 blur-xl opacity-75 -z-10 animate-pulse" />
              <TiltCard max={6} lift={12} className="relative mx-auto w-full max-w-xl xl:max-w-2xl 2xl:max-w-[680px] min-w-0 shadow-2xl rounded-2xl overflow-visible backdrop-blur-xl">
                <SpecimenCard />
              </TiltCard>
            </div>
          </Reveal>
        </div>

        {/* Docked Cambridge IGCSE 0455 Feature Marquee Ticker */}
        <div className="relative mt-8 sm:mt-10 md:mt-12 w-full">
          <Ribbon items={RIBBON_ITEMS} />
        </div>
      </section>

      {/* ── Verified Cambridge 0455 Examiner Accuracy Benchmark ────────── */}
      <AccuracyCredibilitySection />

      {/* ── Real Graded Essay Showcase (User Scored Exemplar) ────────────── */}
      <RealEssayShowcase />

      {/* ── Cambridge IGCSE 0455 MCQ Past Paper & Live Arena Suite ────────── */}
      <McqShowcaseSection />

      {/* ── Why Marginalite Beats Raw AI (Real 8-Mark Discuss Stress Test) ─────────── */}
      <AiComparisonSection />

      {/* ── Cambridge Teachers & Department Workspace ──────────────────────── */}
      <TeachersSection />

      {/* ── What's inside ────────────────────────────────────────────────── */}
      <section
        id="tools"
        className="relative border-b-[1.5px] border-ink bg-surface-raised scroll-mt-20 overflow-hidden"
      >
        <CosmicAtmosphere variant="default" sparkles={true} density="high" />
        <div className="relative z-10 mx-auto max-w-7xl 2xl:max-w-[1440px] px-4 sm:px-6 md:px-10 lg:px-12 xl:px-16 py-16 md:py-20">
          <Reveal>
            <SectionHeading
              eyebrow="Cambridge IGCSE 0455 Tools"
              title="Eleven specialized tools, one Cambridge syllabus"
              lead="Eleven specialized features engineered exclusively for Cambridge IGCSE Economics (0455)."
            />
          </Reveal>

          {/* Spotlight Banner: Live Multiplayer MCQ Quiz Arena */}
          <Reveal delay={40}>
            <div className="mt-8 mb-4 overflow-hidden rounded-2xl border-2 border-amber-500/40 bg-gradient-to-r from-amber-500/[0.12] via-primary/[0.06] to-purple-500/[0.12] p-5 sm:p-7 shadow-xl relative">
              <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-5">
                <div className="space-y-2 max-w-2xl">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="rounded-full bg-amber-500/20 border border-amber-500/40 px-2.5 py-0.5 text-[11px] font-mono font-bold text-amber-700 dark:text-amber-300 flex items-center gap-1.5 shadow-2xs">
                      <Gamepad2 className="size-3.5 text-amber-500 animate-pulse" />
                      NEW: MULTIPLAYER MCQ ARENA
                    </span>
                    <span className="rounded-full bg-emerald-500/15 border border-emerald-500/30 px-2.5 py-0.5 text-[10.5px] font-mono font-bold text-emerald-600 dark:text-emerald-400">
                      ⚡ 6-Digit PIN · Sign In to Compete &amp; Save Diagnostics
                    </span>
                    <span className="rounded-full bg-primary/10 border border-primary/20 px-2.5 py-0.5 text-[10.5px] font-mono font-bold text-primary">
                      Cambridge IGCSE 0455
                    </span>
                  </div>
                  <h3 className="text-xl sm:text-2xl font-black text-foreground tracking-tight">
                    Race Cambridge 0455 Past Papers Live with Classmates &amp; Teachers
                  </h3>
                  <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
                    Choose between <strong className="text-foreground">Serious Exam Sprint</strong> (silent timed mock) or <strong className="text-foreground">Game Arena</strong> with strategic power-ups (Pigouvian Tax, Rival Steals, 50/50 Elimination &amp; Policy Shock Freezes). Live podium and instant mark schemes.
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-3 shrink-0 w-full sm:w-auto">
                  <Button
                    asChild
                    size="lg"
                    className="h-11 px-5 text-xs sm:text-sm font-extrabold bg-amber-500 hover:bg-amber-600 text-amber-950 shadow-md gap-2"
                  >
                    <Link to="/quiz">
                      <Gamepad2 className="size-4" />
                      <span>Join with PIN</span>
                    </Link>
                  </Button>
                  <Button
                    asChild
                    variant="outline"
                    size="lg"
                    className="h-11 px-4 text-xs sm:text-sm font-bold border-2 gap-2"
                  >
                    <Link to="/mcq-live">
                      <Trophy className="size-4 text-primary" />
                      <span>Host a Quiz (Free)</span>
                    </Link>
                  </Button>
                </div>
              </div>
            </div>
          </Reveal>

          <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {TOOLS.map((tool, index) => {
              const isCenteredStart = TOOLS.length % 4 === 2 && index === TOOLS.length - 2;
              return (
                <Reveal
                  key={tool.title}
                  variant="pop"
                  delay={index * 35}
                  className={cn(isCenteredStart && "lg:col-start-2")}
                >
                  <Link
                    to={isAuthenticated ? tool.href : "/auth"}
                    search={isAuthenticated ? undefined : ({ redirect: tool.href } as any)}
                    className="pop pop-press group flex h-full flex-col justify-between p-5 sm:p-6 transition-all duration-300 hover:-translate-y-1 hover:border-primary/60 hover:shadow-xl bg-card border-2 cursor-pointer no-underline block"
                  >
                    <div>
                      <div className="flex items-center justify-between gap-2">
                        <span
                          className={`pop-sm flex size-10 items-center justify-center rounded-xl text-primary-foreground transition-transform duration-300 group-hover:scale-110 ${tool.tile}`}
                        >
                          <tool.icon className="size-5" />
                        </span>
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-[9.5px] uppercase tracking-wider font-bold text-muted-foreground bg-muted/80 px-2 py-0.5 rounded-full border border-border/60">
                            {tool.badge}
                          </span>
                          <span className="font-mono text-[10px] text-muted-foreground font-semibold">
                            {String(index + 1).padStart(2, "0")} / {String(TOOLS.length).padStart(2, "0")}
                          </span>
                        </div>
                      </div>

                    <h3 className="mt-4 text-base font-bold text-foreground group-hover:text-primary transition-colors">
                      {tool.title}
                    </h3>
                    <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
                      {tool.body}
                    </p>
                  </div>

                  <div className="mt-5 pt-3 border-t border-border/60 flex items-center justify-between text-[11px] text-muted-foreground">
                    <span className="font-mono text-[10px] uppercase font-semibold tracking-wider text-muted-foreground/80">
                      Cambridge IGCSE 0455 Engine
                    </span>
                    <span className="inline-flex items-center gap-1 text-primary text-[11px] font-bold group-hover:translate-x-1 transition-transform">
                      <span>View tool</span>
                      <span aria-hidden="true">→</span>
                    </span>
                  </div>
                </Link>
              </Reveal>
            );
          })}
          </div>
        </div>
      </section>

      {/* ── How it works ─────────────────────────────────────────────────── */}
      <section id="how" className="relative border-b-[1.5px] border-ink scroll-mt-20 overflow-hidden">
        <CosmicAtmosphere variant="cyan" sparkles={true} density="medium" />
        <Drift speed={-0.09} className="top-16 right-[5%] hidden lg:block pointer-events-none">
          <Waves className="w-24 text-primary/40" />
        </Drift>
        <Drift speed={0.07} className="bottom-20 left-[4%] hidden xl:block pointer-events-none">
          <Curl className="w-20 -scale-x-100 text-ao1/40" />
        </Drift>
        <div className="relative z-10 mx-auto max-w-5xl px-5 py-16 md:px-8 md:py-20">
          <Reveal>
            <SectionHeading
              eyebrow="How it works"
              title="Three steps, about four minutes"
              lead="No setup, no onboarding tour. On day one you'll bring one essay you're unsure about."
            />
          </Reveal>

          <Reveal variant="pop" delay={80}>
            <ol className="pop mt-12 divide-y-[1.5px] divide-ink/12 overflow-hidden bg-card/80 backdrop-blur-xs border border-border/70 shadow-sm">
              {STEPS.map((step) => (
                <li
                  key={step.n}
                  className="group flex flex-col gap-4 p-6 transition-colors duration-200 hover:bg-accent/40 md:flex-row md:gap-8 md:p-8"
                >
                  <span className="pop-sm flex size-10 shrink-0 items-center justify-center bg-primary font-mono text-sm font-semibold text-primary-foreground transition-transform duration-300 group-hover:-rotate-12 group-hover:scale-110 shadow-sm">
                    {step.n}
                  </span>
                  <div className="min-w-0">
                    <h3 className="text-lg font-semibold">{step.title}</h3>
                    <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">
                      {step.body}
                    </p>
                  </div>
                </li>
              ))}
            </ol>
          </Reveal>
        </div>
      </section>

      {/* ── Command-word drill ───────────────────────────────────────────── */}
      <section
        id="drill"
        className="relative border-b-[1.5px] border-ink bg-surface-raised scroll-mt-20 overflow-hidden"
      >
        <CosmicAtmosphere variant="purple" sparkles={true} density="medium" />
        <div className="starfield" aria-hidden="true" />
        <div className="relative z-10 mx-auto grid max-w-7xl 2xl:max-w-[1440px] items-center gap-12 px-4 sm:px-6 md:px-10 lg:px-12 xl:px-16 py-16 md:py-20 lg:grid-cols-[0.85fr_1.15fr]">
          <Reveal>
            <p className="eyebrow eyebrow-accent">Command Word Mastery</p>
            <h2 className="mt-2.5 text-2xl font-bold text-balance md:text-4xl">
              The command word decides <span className="aurora-text">where the marks are</span>
            </h2>
            <p className="mt-3.5 max-w-md text-sm leading-relaxed text-pretty text-muted-foreground md:text-base">
              “Explain” and “assess” test completely different assessment objectives and mark allocations. Learn the difference in seconds.
            </p>
            <p className="mt-3 text-xs font-semibold text-muted-foreground">
              Interactive 2-minute drill · No account required
            </p>
          </Reveal>

          <Reveal variant="pop" delay={80}>
            <CommandWordDrill />
          </Reveal>
        </div>
      </section>

      {/* ── Why trust it ─────────────────────────────────────────────────── */}
      <section id="trust" className="relative border-b-[1.5px] border-ink scroll-mt-20 overflow-hidden">
        <CosmicAtmosphere variant="amber" sparkles={true} density="medium" />
        <div className="relative z-10 mx-auto max-w-7xl 2xl:max-w-[1440px] px-4 sm:px-6 md:px-10 lg:px-12 xl:px-16 py-16 md:py-20">
          <Reveal>
            <SectionHeading
              eyebrow="Purpose-Built for IGCSE 0455"
              title="Why Cambridge IGCSE 0455 Economics Students Use Marginalite"
              lead="Calibrated mechanisms designed to evaluate IGCSE 0455 answers with official examiner precision."
            />
          </Reveal>

          <div className="mt-12 grid gap-5 md:grid-cols-3">
            {TRUST.map((item, index) => (
              <Reveal key={item.title} variant="pop" delay={index * 80}>
                <TiltCard max={7} lift={12} className="h-full">
                  <div className="pop flex h-full flex-col p-6 backdrop-blur-xs bg-card/85 border border-border/70 hover:border-amber-500/40 transition-colors shadow-sm">
                    <span className="layer-1 flex size-10 items-center justify-center rounded-lg bg-primary/12 text-primary">
                      <item.icon className="size-5" />
                    </span>
                    <h3 className="mt-5 text-base font-semibold">{item.title}</h3>
                    <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                      {item.body}
                    </p>
                  </div>
                </TiltCard>
              </Reveal>
            ))}
          </div>

          <Reveal delay={100} className="mt-12">
            <div className="mx-auto max-w-2xl rounded-2xl border border-border/80 bg-card/60 p-6 md:p-8 backdrop-blur-xs shadow-xs text-center sm:text-left space-y-3">
              <p className="text-sm sm:text-base font-semibold leading-relaxed text-foreground italic">
                “I personally lost critical marks in IGCSE Economics on structured answers despite knowing the theory inside out. That is why we built Marginalite — to give Cambridge IGCSE 0455 students the exact line-by-line mark scheme diagnosis and examiner structuring needed to master the top band.”
              </p>
              <div className="text-xs sm:text-[13px] font-bold text-foreground flex flex-wrap items-center justify-center sm:justify-start gap-2 pt-1">
                <span className="text-primary font-black">Saikrish</span>
                <span className="text-muted-foreground/60 font-normal">|</span>
                <span className="font-semibold text-foreground">CS Academy</span>
                <span className="text-muted-foreground/60 font-normal">|</span>
                <span className="text-muted-foreground">Founder, Marginalite</span>
              </div>
            </div>
          </Reveal>
        </div>
      </section>

      {/* ── FAQ ──────────────────────────────────────────────────────────── */}
      <section id="faq" className="relative border-b-[1.5px] border-ink bg-surface-raised scroll-mt-20 overflow-hidden">
        <CosmicAtmosphere variant="default" sparkles={true} density="low" />
        <div className="relative z-10 mx-auto max-w-4xl px-5 py-16 md:px-8 md:py-20">
          <Reveal>
            <SectionHeading eyebrow="Questions" title="Frequently asked, honestly answered" />
          </Reveal>

          <Reveal variant="pop" delay={80}>
            <Accordion type="single" collapsible className="pop mt-12 px-6 md:px-8 backdrop-blur-xs bg-card/80 border border-border/70 shadow-sm">
              {FAQS.map((faq, index) => (
                <AccordionItem key={faq.q} value={faq.q} className="border-ink/12 last:border-0">
                  <AccordionTrigger className="gap-4 py-5 text-left hover:no-underline">
                    <span className="flex min-w-0 items-baseline gap-4">
                      <span className="font-mono text-xs text-muted-foreground">
                        {String(index + 1).padStart(2, "0")}
                      </span>
                      <span className="text-base font-semibold">{faq.q}</span>
                    </span>
                  </AccordionTrigger>
                  <AccordionContent className="pb-5 pl-10 text-sm leading-relaxed text-muted-foreground">
                    {faq.a}
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </Reveal>
        </div>
      </section>

      {/* ── Candidate Onboarding CTA ──────────────────────────────────── */}
      <section
        id="join"
        className="relative scroll-mt-20 px-4 py-14 sm:px-5 sm:py-16 md:px-8 md:py-20 overflow-hidden"
      >
        <CosmicAtmosphere variant="hero" sparkles={true} density="high" />
        <div className="aurora-wash pointer-events-none absolute inset-0 opacity-40" aria-hidden="true" />
        <Reveal variant="pop" className="relative z-10">
          <div className="pop relative mx-auto max-w-5xl overflow-hidden bg-plum bg-linear-to-br from-plum-soft via-plum to-plum-deep px-4 py-10 sm:px-6 sm:py-14 md:px-12 border border-plum-soft/40 shadow-2xl">
            <CosmicAtmosphere variant="hero" sparkles={true} density="medium" />
            <div
              className="paper-grid pointer-events-none absolute inset-0 opacity-20"
              aria-hidden="true"
            />
            <div className="starfield" aria-hidden="true" />
            <div className="relative z-10 grid items-center gap-10 md:grid-cols-[1.15fr_0.85fr]">
              <div className="text-center md:text-left">
                <span className="chip-soft bg-plum-foreground/15 text-plum-foreground">
                  <Sparkles className="size-3.5" />
                  Cambridge IGCSE 0455 Candidate Workspace
                </span>

                <h2 className="mt-4 text-3xl font-bold text-balance text-plum-foreground md:text-4xl">
                  Start scoring higher in IGCSE Economics (0455)
                </h2>
                <p className="mt-4 max-w-md text-sm text-pretty text-plum-foreground/85 md:text-base">
                  Every candidate gets unlimited Cambridge essay gradings, the real-time Essay Grader, and authentic past paper MCQ drills with auto-save resume completely free.
                </p>

                <div className="mt-7 flex flex-wrap items-center justify-center md:justify-start gap-3 relative z-20">
                  <Button
                    asChild
                    size="lg"
                    className="h-11 sm:h-12 px-6 text-xs sm:text-sm font-bold bg-white text-zinc-950 hover:bg-white/90 shadow-xl shadow-black/25 hover:scale-[1.02] active:scale-[0.98] transition-all rounded-xl cursor-pointer"
                  >
                    <Link to="/auth" className="inline-flex items-center gap-2">
                      <span>Create Free Account</span>
                      <ArrowRight className="size-4" />
                    </Link>
                  </Button>
                  <Button
                    asChild
                    variant="outline"
                    size="lg"
                    className="h-11 sm:h-12 px-5 text-xs sm:text-sm font-semibold border-white/25 bg-white/5 text-white hover:bg-white/15 hover:border-white/40 backdrop-blur-md rounded-xl transition-all cursor-pointer"
                  >
                    <Link to="/grade" className="inline-flex items-center gap-2">
                      <PenLine className="size-4 text-emerald-400" />
                      <span>Grade Essays Free</span>
                    </Link>
                  </Button>

                </div>

                <p className="mt-5 text-xs text-plum-foreground/70">
                  By joining you agree to the{" "}
                  <Link to="/terms" className="font-medium underline underline-offset-4">
                    terms &amp; conditions
                  </Link>{" "}
                  and the{" "}
                  <Link to="/privacy" className="font-medium underline underline-offset-4">
                    privacy policy
                  </Link>
                  .
                </p>
              </div>
              <MarkingHand className="wiggle mx-auto w-52 md:w-full md:max-w-xs" />
            </div>
          </div>
        </Reveal>
      </section>

      {/* ── Share with Classmates Modal ──────────────────────────────────── */}
      <Dialog open={shareOpen} onOpenChange={setShareOpen}>
        <DialogContent className="max-w-md sm:max-w-lg border-2 border-border p-6 rounded-2xl shadow-xl">
          <DialogHeader className="space-y-2 text-left">
            <div className="flex items-center gap-2.5">
              <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary border border-primary/20">
                <Users className="size-5" />
              </span>
              <div>
                <DialogTitle className="text-lg font-bold sm:text-xl">
                  Share Marginalite with Classmates
                </DialogTitle>
                <DialogDescription className="text-xs text-muted-foreground mt-0.5">
                  Invite your study group to practice with official Cambridge IGCSE 0455 mark schemes &amp; live feedback.
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          <div className="space-y-4 pt-2">
            {/* Free Classmate Benefit Callout */}
            <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-3.5 text-xs text-emerald-950 dark:text-emerald-200 flex items-start gap-2.5">
              <Gift className="size-4 shrink-0 text-emerald-600 dark:text-emerald-400 mt-0.5" />
              <div className="space-y-0.5">
                <p className="font-semibold text-emerald-700 dark:text-emerald-300">
                  Unlimited Graded Essays + Full MCQ Practice
                </p>
                <p className="text-muted-foreground dark:text-emerald-200/80 leading-relaxed">
                  Anyone who joins through your link gets instant access to unlimited essays marked by our Cambridge IGCSE 0455 examiner engine, Essay Grader coaching, and past paper drills with no credit card required.
                </p>
              </div>
            </div>

            {/* Quick Share Buttons */}
            <div>
              <label className="text-xs font-semibold text-foreground mb-2 block">
                Quick Share via Social &amp; Chat
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                <a
                  href={`https://api.whatsapp.com/send?text=${encodeURIComponent(shareMessage)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex flex-col items-center justify-center gap-1.5 p-3 rounded-xl border border-border bg-card hover:bg-emerald-500/10 hover:border-emerald-500/30 hover:text-emerald-600 transition-all text-xs font-semibold group cursor-pointer text-center"
                >
                  <MessageCircle className="size-5 text-emerald-600 transition-transform group-hover:scale-110" />
                  <span>WhatsApp</span>
                </a>
                <a
                  href={`https://t.me/share/url?url=${encodeURIComponent(shareUrl)}&text=${encodeURIComponent("Check out Marginalite for Cambridge IGCSE Economics (0455) — unlimited essays graded + Essay Grader & MCQ past paper drills!")}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex flex-col items-center justify-center gap-1.5 p-3 rounded-xl border border-border bg-card hover:bg-sky-500/10 hover:border-sky-500/30 hover:text-sky-600 transition-all text-xs font-semibold group cursor-pointer text-center"
                >
                  <Send className="size-5 text-sky-500 transition-transform group-hover:scale-110" />
                  <span>Telegram</span>
                </a>
                <a
                  href={`https://twitter.com/intent/tweet?text=${encodeURIComponent("Preparing for Cambridge IGCSE Economics (0455) with Marginalite — unlimited essays graded + Essay Grader & MCQ past paper drills:")}&url=${encodeURIComponent(shareUrl)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex flex-col items-center justify-center gap-1.5 p-3 rounded-xl border border-border bg-card hover:bg-primary/10 hover:border-primary/30 hover:text-primary transition-all text-xs font-semibold group cursor-pointer text-center"
                >
                  <Share2 className="size-5 text-primary transition-transform group-hover:scale-110" />
                  <span>X / Twitter</span>
                </a>
                <a
                  href={`mailto:?subject=${encodeURIComponent("Cambridge IGCSE 0455 Economics Prep — Unlimited Graded Essays on Marginalite")}&body=${encodeURIComponent(shareMessage)}`}
                  className="flex flex-col items-center justify-center gap-1.5 p-3 rounded-xl border border-border bg-card hover:bg-muted hover:border-border transition-all text-xs font-semibold group cursor-pointer text-center"
                >
                  <Mail className="size-5 text-muted-foreground transition-transform group-hover:scale-110 group-hover:text-foreground" />
                  <span>Email</span>
                </a>
              </div>
            </div>

            {/* Direct Copy Link Input */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground">
                Your Shareable Link
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  readOnly
                  value={shareUrl}
                  className="flex-1 rounded-lg border border-border bg-muted/50 px-3 py-2 text-xs font-mono text-foreground focus:outline-hidden"
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleCopyLink}
                  className="gap-1.5 shrink-0 h-9 font-semibold border-2 cursor-pointer"
                >
                  {copiedLink ? (
                    <>
                      <Check className="size-3.5 text-emerald-500" />
                      <span>Copied</span>
                    </>
                  ) : (
                    <>
                      <Copy className="size-3.5" />
                      <span>Copy</span>
                    </>
                  )}
                </Button>
              </div>
            </div>

            {/* Study Group Quick Message */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold text-foreground">
                  Ready-made message for Discord or group chats
                </label>
                <button
                  type="button"
                  onClick={handleCopyMessage}
                  className="text-[11px] font-bold text-primary hover:underline inline-flex items-center gap-1 cursor-pointer"
                >
                  {copiedMessage ? (
                    <>
                      <Check className="size-3 text-emerald-500" /> Copied
                    </>
                  ) : (
                    <>
                      <Copy className="size-3" /> Copy full message
                    </>
                  )}
                </button>
              </div>
              <div className="rounded-lg border border-border bg-muted/40 p-3 text-xs text-muted-foreground leading-relaxed font-sans select-all">
                {shareMessage}
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <SiteFooter onToggleMinimalist={() => toggleMinimalist(true)} />
    </div>
  );
}

/**
 * A specimen of the thing itself, clearly labelled as an example rather than
 * a real script — it shows the actual vocabulary (command word, AO split,
 * missing points) a student will meet inside.
 */
function SpecimenCard() {
  const [view, setView] = useState<"marginal" | "generic">("marginal");

  return (
    <div className="relative pt-2.5">
      <span className="sticker layer-2 absolute top-0 right-3 z-10 bg-ao3 text-foreground font-bold shadow-sm">
        Live Inspection
      </span>

      <div className="pop p-6 md:p-7 bg-card">
        {/* Toggle between Marginalite Examiner vs Generic AI */}
        <div className="flex items-center justify-between gap-2 border-b border-border pb-4 mb-4">
          <div className="inline-flex rounded-lg bg-muted p-1 text-xs font-semibold">
            <button
              type="button"
              onClick={() => setView("marginal")}
              className={cn(
                "rounded-md px-3 py-1 transition-all",
                view === "marginal"
                  ? "bg-primary text-primary-foreground shadow-2xs font-bold"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              Marginalite 0455 Examiner
            </button>
            <button
              type="button"
              onClick={() => setView("generic")}
              className={cn(
                "rounded-md px-3 py-1 transition-all",
                view === "generic"
                  ? "bg-destructive/20 text-destructive font-bold shadow-2xs"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              Generic AI Bot
            </button>
          </div>
          <span className="font-mono text-[10px] text-muted-foreground uppercase font-bold hidden sm:inline">
            Paper 2 · Q4(d)
          </span>
        </div>

        <p className="eyebrow">IGCSE 0455 Paper 2 · Section B [8 Marks]</p>
        <p className="mt-2 text-sm leading-relaxed font-medium">
          “Discuss whether or not a minimum price is the most effective way to reduce consumption of a
          demerit good.”
        </p>

        {view === "marginal" ? (
          <>
            <div className="layer-1 mt-6 space-y-3.5">
              {OBJECTIVES.map((objective, index) => (
                <div key={objective.code}>
                  <div className="flex items-baseline justify-between text-xs">
                    <span className="flex items-center gap-2 font-medium">
                      <span className={`size-2 rounded-full ${objective.dot}`} aria-hidden="true" />
                      {objective.code}
                      <span className="text-muted-foreground">{objective.name}</span>
                    </span>
                    <span className="font-mono text-muted-foreground">
                      <CountUp value={objective.share} suffix="%" delay={240 + index * 130} />
                    </span>
                  </div>
                  <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-muted">
                    <div
                      className={`grow-bar h-full rounded-full ${objective.dot}`}
                      style={
                        {
                          width: `${objective.share}%`,
                          "--bar-delay": `${240 + index * 130}ms`,
                        } as React.CSSProperties
                      }
                    />
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-6 border-t border-border pt-4">
              <p className="eyebrow text-primary">Marginalite Diagnostic Feedback</p>
              <ul className="mt-2.5 space-y-2 text-xs text-muted-foreground">
                <li className="flex gap-2.5">
                  <span className="mt-1 size-1.5 shrink-0 rounded-full bg-ao3" aria-hidden="true" />
                  <span>
                    <strong className="text-foreground">AO3 Gap:</strong> Listed alternative policies (taxation, education) without synthesizing <em>which</em> policy dominates when price elasticity of demand is inelastic.
                  </span>
                </li>
                <li className="flex gap-2.5">
                  <span className="mt-1 size-1.5 shrink-0 rounded-full bg-ao2" aria-hidden="true" />
                  <span>
                    <strong className="text-foreground">AO2 Gap:</strong> Transmission halts at “quantity demanded falls”; omitted informal black-market emergence and producer surplus changes.
                  </span>
                </li>
              </ul>
              <div className="mt-4 pt-3 border-t border-border flex items-center justify-between">
                <span className="text-[11px] text-muted-foreground">Calibrated against real 0455 candidates</span>
                <a href="#graded-exemplar" className="text-xs font-bold text-primary hover:underline inline-flex items-center gap-1">
                  View Full 8/8 Script Exemplar ↓
                </a>
              </div>
            </div>
          </>
        ) : (
          <div className="mt-5 space-y-4">
            <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-4 text-xs text-muted-foreground space-y-2">
              <div className="flex items-center gap-1.5 font-bold text-destructive">
                <span>⚠️ Generic Chatbot Output (ChatGPT / Claude default):</span>
              </div>
              <p className="italic text-foreground/80 leading-relaxed">
                “This is a very good essay! You clearly understand minimum prices and explain how they reduce demand for demerit goods like cigarettes. You also mentioned other policies. Mark: 6 / 8 (Level 2). Keep practicing!”
              </p>
            </div>

            <div className="rounded-lg border border-border bg-muted/40 p-3 text-[11px] text-muted-foreground space-y-1.5">
              <p className="font-bold text-foreground">Why generic AI fails Cambridge students:</p>
              <ul className="list-disc pl-4 space-y-1">
                <li>Cannot separate marks into official AO1, AO2, AO3 quotas.</li>
                <li>Suffers from central-tendency bias (clusters all scores around 60%).</li>
                <li>Provides polite encouragement instead of actionable mark-scheme rubrics.</li>
              </ul>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function SectionHeading({
  eyebrow,
  title,
  lead,
}: {
  eyebrow: string;
  title: React.ReactNode;
  lead?: string;
}) {
  return (
    <div className="mx-auto max-w-2xl text-center">
      <p className="eyebrow eyebrow-accent">{eyebrow}</p>
      <h2 className="mt-2.5 text-2xl font-bold text-balance md:text-4xl">{title}</h2>
      {lead ? (
        <p className="mx-auto mt-4 max-w-xl text-sm leading-relaxed text-pretty text-muted-foreground md:text-base">
          {lead}
        </p>
      ) : null}
    </div>
  );
}

function Wordmark({ muted = false }: { muted?: boolean }) {
  return (
    <span className="group flex items-center gap-2 sm:gap-2.5 whitespace-nowrap shrink-0">
      <img
        src="/marginal-m-icon-clean.png"
        alt="Marginalite AI Cambridge Economics 0455 Essay Examiner dashboard logo"
        className={
          "size-8 shrink-0 object-contain transition-transform duration-300 group-hover:-rotate-6 sm:size-9 " +
          (muted ? "opacity-70 grayscale" : "")
        }
      />
      <span
        className={
          muted
            ? "text-sm font-semibold text-muted-foreground sm:text-base flex items-center gap-1.5"
            : "text-sm font-semibold sm:text-base flex items-center gap-1.5"
        }
      >
        <span>Marginalite</span>
        <span className="text-[10px] font-mono font-bold tracking-tight px-1.5 py-0.5 rounded-md bg-purple-500/15 text-purple-600 dark:text-purple-300 border border-purple-500/30">
          AI
        </span>
        <span className="hidden min-[440px]:inline-flex text-[9.5px] font-mono font-semibold px-1.5 py-0.5 rounded bg-muted/80 text-muted-foreground border border-border/60">
          IGCSE 0455
        </span>
      </span>
    </span>
  );
}

/**
 * Clean, distraction-free minimalist homepage view.
 * Zero animations, no WebGL/canvas, concise copy, direct tool directory.
 */
function MinimalistHome({
  onToggleFull,
  isAuthenticated,
  settings,
}: {
  onToggleFull: () => void;
  isAuthenticated: boolean | null;
  settings: PublicSettings;
}) {
  return (
    <div className="min-h-screen bg-background text-foreground antialiased selection:bg-primary/20">
      {/* ── Community Partner Banner (r/The_IGCSE_Workaholics) ─────────── */}
      <CommunityPartnerBanner />

      {/* ── Minimal Header ────────────────────────────────────────────── */}
      <header className="sticky top-0 z-40 border-b border-border bg-background/95 backdrop-blur-xs">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-4 px-4 py-3 sm:px-6">
          <Link to="/" className="flex items-center gap-2 font-bold text-base text-foreground no-underline">
            <img src="/marginal-m-icon-clean.png" alt="Marginalite" className="size-7 object-contain" />
            <span>Marginalite AI</span>
            <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded bg-violet-500/15 text-violet-700 dark:text-violet-300 border border-violet-500/30">
              IGCSE 0455
            </span>
          </Link>

          <div className="flex items-center gap-2 sm:gap-3">
            {/* View Mode Switcher Pill */}
            <div className="inline-flex items-center rounded-lg border border-border bg-muted/40 p-0.5 text-xs">
              <button
                type="button"
                onClick={onToggleFull}
                className="flex items-center gap-1.5 px-2.5 py-1 rounded-md text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                title="Switch to Full Experience (Animations & Visuals)"
              >
                <Sparkles className="size-3 text-amber-500" />
                <span className="hidden sm:inline">Full Experience</span>
              </button>
              <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-background text-foreground font-bold shadow-2xs">
                <Minimize2 className="size-3 text-primary" />
                <span>Minimalist</span>
              </span>
            </div>

            <Link
              to="/teacher-auth"
              className="hidden sm:inline-flex items-center gap-1 rounded-lg border border-purple-500/30 bg-purple-500/10 px-2.5 py-1.5 text-xs font-semibold text-purple-700 dark:text-purple-300 hover:bg-purple-500/20"
            >
              <School className="size-3.5" />
              <span>Teachers</span>
            </Link>

            <ThemeToggle className="size-8" />

            <Link
              to="/auth"
              className="rounded-lg px-2.5 py-1.5 text-xs sm:text-sm font-semibold text-muted-foreground hover:text-foreground"
            >
              Sign in
            </Link>

            <Link
              to="/auth"
              className="rounded-lg bg-primary px-3 py-1.5 text-xs sm:text-sm font-semibold text-primary-foreground hover:bg-primary/90"
            >
              Get Started
            </Link>
          </div>
        </div>
      </header>

      {/* ── Main Minimalist Content ───────────────────────────────────── */}
      <main className="mx-auto max-w-5xl px-4 py-10 sm:px-6 sm:py-14 space-y-12">
        {/* Minimal Hero */}
        <section className="border-b border-border pb-10 space-y-4">
          <div className="inline-flex items-center gap-2 text-xs font-mono font-bold uppercase tracking-wider text-primary">
            <span>Cambridge IGCSE Economics (0455)</span>
            <span>·</span>
            <span className="text-muted-foreground">Code 0455 · Papers 1 &amp; 2</span>
          </div>

          <h1 className="text-3xl sm:text-4xl md:text-5xl font-black tracking-tight text-foreground">
            Master Cambridge IGCSE Economics (0455).
          </h1>

          <div className="flex flex-wrap items-center gap-2 pt-1">
            <span className="rounded-md border border-blue-500/30 bg-blue-500/10 px-2 py-0.5 text-xs font-mono font-bold text-blue-600 dark:text-blue-400">
              Paper 1: Multiple Choice
            </span>
            <span className="rounded-md border border-violet-500/30 bg-violet-500/10 px-2 py-0.5 text-xs font-mono font-bold text-violet-600 dark:text-violet-400">
              Paper 2: Data Response &amp; Section B
            </span>
            <span className="rounded-md border border-emerald-500/30 bg-emerald-500/10 px-2 py-0.5 text-xs font-mono font-bold text-emerald-600 dark:text-emerald-400">
              2m, 4m, 6m &amp; 8m Questions
            </span>
          </div>

          <p className="max-w-2xl text-base sm:text-lg text-muted-foreground leading-relaxed">
            {settings.heroDescription ||
              "Marginalite AI is the complete Cambridge IGCSE Economics (0455) mastery platform with dual-pass AI Essay Grading, Paper 2 Data Response, and Paper 1 MCQ practice."}
          </p>

          <div className="pt-2 flex flex-wrap items-center gap-3">
            <Link
              to={isAuthenticated ? "/grade" : "/auth"}
              search={isAuthenticated ? undefined : ({ redirect: "/grade" } as any)}
              className="rounded-lg bg-primary px-5 py-2.5 text-sm font-bold text-primary-foreground hover:bg-primary/90 inline-flex items-center gap-2"
            >
              <span>Grade an Essay Free</span>
              <ArrowRight className="size-4" />
            </Link>
            <Link
              to={isAuthenticated ? "/mcq-live" : "/auth"}
              search={isAuthenticated ? undefined : ({ redirect: "/mcq-live" } as any)}
              className="rounded-lg border border-border bg-card px-4 py-2.5 text-sm font-semibold text-foreground hover:bg-muted inline-flex items-center gap-2"
            >
              <ListChecks className="size-4 text-primary" />
              <span>MCQ Past Papers</span>
            </Link>
            <Link
              to="/quiz"
              className="rounded-lg border-2 border-amber-500/50 bg-amber-500/10 px-4 py-2.5 text-sm font-bold text-amber-700 dark:text-amber-300 hover:bg-amber-500/20 inline-flex items-center gap-2"
            >
              <Gamepad2 className="size-4 text-amber-500" />
              <span>Live Quiz (PIN)</span>
            </Link>
            <Link
              to={isAuthenticated ? "/grade" : "/auth"}
              search={isAuthenticated ? undefined : ({ redirect: "/grade" } as any)}
              className="rounded-lg border border-border bg-card px-4 py-2.5 text-sm font-semibold text-foreground hover:bg-muted inline-flex items-center gap-2"
            >
              <Sparkles className="size-4 text-purple-600" />
              <span>Essay Grader</span>
            </Link>
            <Link
              to={isAuthenticated ? "/definitions" : "/auth"}
              search={isAuthenticated ? undefined : ({ redirect: "/definitions" } as any)}
              className="rounded-lg border border-border bg-card px-4 py-2.5 text-sm font-semibold text-foreground hover:bg-muted inline-flex items-center gap-2"
            >
              <BookOpen className="size-4 text-emerald-600" />
              <span>Definition Hub</span>
            </Link>
          </div>

          <p className="text-xs text-muted-foreground pt-1">
            ✓ No credit card required &nbsp;•&nbsp; ✓ Free instant access &nbsp;•&nbsp; ✓ Grounded in official 0455 mark schemes
          </p>
        </section>

        {/* ── Core Tools Directory ────────────────────────────────────── */}
        <section className="space-y-4 border-b border-border pb-12">
          <div className="flex items-baseline justify-between">
            <h2 className="text-xl font-bold tracking-tight text-foreground">
              Cambridge IGCSE 0455 Examination Suite
            </h2>
            <span className="text-xs text-muted-foreground font-mono">10 Specialized Tools</span>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            {TOOLS.map((tool) => (
              <Link
                key={tool.title}
                to={isAuthenticated ? tool.href : "/auth"}
                search={isAuthenticated ? undefined : ({ redirect: tool.href } as any)}
                className="group flex items-start gap-3 rounded-xl border border-border bg-card p-4 hover:border-primary hover:bg-muted/30 transition-colors"
              >
                <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-muted text-foreground">
                  <tool.icon className="size-4 text-primary" />
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-sm font-bold text-foreground group-hover:text-primary transition-colors">
                      {tool.title}
                    </span>
                    <span className="text-[10px] font-mono uppercase text-muted-foreground px-1.5 py-0.5 rounded bg-muted border border-border/60">
                      {tool.badge}
                    </span>
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground leading-relaxed">
                    {tool.body}
                  </p>
                </div>
              </Link>
            ))}
          </div>
        </section>

        {/* ── Assessment Objectives Reference ─────────────────────────── */}
        <section className="space-y-4 border-b border-border pb-12">
          <h2 className="text-xl font-bold tracking-tight text-foreground">
            Assessment Objectives (AO) Reference
          </h2>
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="rounded-xl border border-border bg-card p-4 space-y-1.5">
              <span className="text-xs font-mono font-bold text-ao1">AO1 · Knowledge &amp; Understanding</span>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Precise definitions, correct economic equations, and accurate diagrams. Secures foundational marks without ambiguity.
              </p>
            </div>
            <div className="rounded-xl border border-border bg-card p-4 space-y-1.5">
              <span className="text-xs font-mono font-bold text-ao2">AO2 · Analysis &amp; Application</span>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Multi-stage causal chains linking policy changes to transmission mechanisms, elasticities, and output effects.
              </p>
            </div>
            <div className="rounded-xl border border-border bg-card p-4 space-y-1.5">
              <span className="text-xs font-mono font-bold text-ao3">AO3 · Evaluation &amp; Synthesis</span>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Supported judgements: weighing short-run vs long-run tradeoffs, policy efficacy under elasticity assumptions, and prioritized conclusions.
              </p>
            </div>
          </div>
        </section>

        {/* ── Frequently Asked Questions ────────────────────────────────── */}
        <section className="space-y-4 border-b border-border pb-12">
          <h2 className="text-xl font-bold tracking-tight text-foreground">
            Frequently Asked Questions
          </h2>
          <div className="space-y-3">
            {FAQS.map((faq) => (
              <div key={faq.q} className="rounded-xl border border-border bg-card p-4 space-y-1">
                <h3 className="text-sm font-bold text-foreground">{faq.q}</h3>
                <p className="text-xs text-muted-foreground leading-relaxed">{faq.a}</p>
              </div>
            ))}
          </div>
        </section>

        {/* ── Minimal Footer ────────────────────────────────────────────── */}
        <footer className="pt-4 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-muted-foreground">
          <div className="flex items-center gap-4">
            <span>&copy; {new Date().getFullYear()} Marginalite AI</span>
            <Link to="/terms" className="hover:text-foreground underline-offset-4 hover:underline">
              Terms
            </Link>
            <Link to="/privacy" className="hover:text-foreground underline-offset-4 hover:underline">
              Privacy
            </Link>
            <Link to="/help" className="hover:text-foreground underline-offset-4 hover:underline">
              Help
            </Link>
          </div>
          <button
            type="button"
            onClick={onToggleFull}
            className="inline-flex items-center gap-1.5 font-bold text-primary hover:underline cursor-pointer"
          >
            <Sparkles className="size-3.5 text-amber-500" />
            <span>Switch to Full Experience (Animations &amp; Visuals)</span>
          </button>
        </footer>
      </main>
    </div>
  );
}
