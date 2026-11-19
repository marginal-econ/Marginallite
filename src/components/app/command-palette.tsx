import { useNavigate } from "@tanstack/react-router";
import {
  Search,
  X,
  ArrowRight,
  Clock,
  Sparkles,
  BookOpen,
  LineChart,
  PenLine,
  ListChecks,
  FileSpreadsheet,
  LayoutDashboard,
  Target,
  Trophy,
  GraduationCap,
  UsersRound,
  ShieldCheck,
  Settings,
  LogOut,
  PanelsTopBottom,
  PanelLeft,
  Layers,
  Flame,
  Wand2,
  BookText,
  BookMarked,
  Send,
  MessageSquare,
  CornerDownLeft,
  Filter,
  FileText,
  Info,
} from "lucide-react";
import * as React from "react";
import { useState, useMemo, useEffect, useRef } from "react";

import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { CAMBRIDGE_CORE_DEFINITIONS, type CambridgeDefinition } from "@/lib/cambridge-definitions";
import { DIAGRAMS } from "@/lib/diagrams/catalog";
import type { DiagramEntry } from "@/lib/diagrams/types";
import type { NavigationLayout } from "@/lib/account.functions";
import { setPlatformNavLayout } from "@/components/app/app-shell";

export type SearchCategory = "all" | "pages" | "definitions" | "diagrams" | "papers" | "actions";

export type SearchResultItem = {
  id: string;
  title: string;
  subtitle?: string;
  category: "pages" | "definitions" | "diagrams" | "papers" | "actions";
  categoryLabel: string;
  icon: React.ElementType;
  iconBg?: string;
  iconColor?: string;
  badge?: string;
  badgeTone?: string;
  onSelect: () => void;
  keywords?: string[];
};

const RECENT_SEARCHES_STORAGE_KEY = "marginalite.recentSearches";

function HighlightMatch({ text, query }: { text: string; query: string }) {
  if (!query.trim()) return <>{text}</>;
  const escaped = query.trim().replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const regex = new RegExp(`(${escaped})`, "gi");
  const parts = text.split(regex);
  return (
    <>
      {parts.map((part, i) =>
        regex.test(part) ? (
          <mark
            key={i}
            className="bg-primary/20 text-primary font-bold rounded-xs px-0.5 not-italic"
          >
            {part}
          </mark>
        ) : (
          part
        ),
      )}
    </>
  );
}

export function CommandPalette({
  open,
  onOpenChange,
  role,
  isAdmin,
  onLayoutChange,
  onSignOut,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  role?: "student" | "teacher" | "admin";
  isAdmin?: boolean;
  onLayoutChange?: (layout: NavigationLayout) => void;
  onSignOut?: () => void;
}) {
  const navigate = useNavigate();
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<SearchCategory>("all");
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  const listRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Load recent searches from localStorage
  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const stored = window.localStorage.getItem(RECENT_SEARCHES_STORAGE_KEY);
      if (stored) {
        setRecentSearches(JSON.parse(stored).slice(0, 5));
      }
    } catch {
      // ignore
    }
  }, [open]);

  // Save query to recent searches
  const saveRecentSearch = (term: string) => {
    if (!term.trim()) return;
    try {
      const cleaned = term.trim().slice(0, 40);
      const updated = [cleaned, ...recentSearches.filter((s) => s.toLowerCase() !== cleaned.toLowerCase())].slice(0, 6);
      setRecentSearches(updated);
      window.localStorage.setItem(RECENT_SEARCHES_STORAGE_KEY, JSON.stringify(updated));
    } catch {
      // ignore
    }
  };

  const clearRecentSearches = (e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      setRecentSearches([]);
      window.localStorage.removeItem(RECENT_SEARCHES_STORAGE_KEY);
    } catch {
      // ignore
    }
  };

  // Reset index when query or category changes
  useEffect(() => {
    setSelectedIndex(0);
  }, [query, category]);

  // Focus input on open
  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 50);
    } else {
      setQuery("");
      setCategory("all");
    }
  }, [open]);

  // 1. Static platform pages and workspaces
  const pages: SearchResultItem[] = useMemo(() => {
    const list: SearchResultItem[] = [
      {
        id: "page-dashboard",
        title: "Candidate Dashboard",
        subtitle: "Revision overview, target exam series, readiness trajectory, and AO split",
        category: "pages",
        categoryLabel: "Core Practice",
        icon: LayoutDashboard,
        iconBg: "bg-emerald-500/10",
        iconColor: "text-emerald-500",
        badge: "Overview",
        badgeTone: "border-emerald-500/30 text-emerald-600 dark:text-emerald-400 bg-emerald-500/10",
        keywords: ["home", "stats", "marks", "progress", "grade", "target", "overview"],
        onSelect: () => {
          navigate({ to: "/dashboard" });
          onOpenChange(false);
        },
      },
      {
        id: "page-grade",
        title: "Grade Essays (Strict AI Marking)",
        subtitle: "Submit 2, 4, 6, or 8-mark essays for official Cambridge IGCSE 0455 AO marking & rubrics",
        category: "pages",
        categoryLabel: "Exam Practice",
        icon: PenLine,
        iconBg: "bg-indigo-500/10",
        iconColor: "text-indigo-500",
        badge: "P2 & P4",
        badgeTone: "border-indigo-500/30 text-indigo-600 dark:text-indigo-400 bg-indigo-500/10",
        keywords: ["essay", "mark", "marking", "rubric", "ao1", "ao2", "ao3", "eval", "evaluative", "feedback"],
        onSelect: () => {
          navigate({ to: "/grade" });
          onOpenChange(false);
        },
      },
      {
        id: "page-mcq",
        title: "MCQ Past Papers",
        subtitle: "Complete official 30-question Cambridge Paper 1 & Paper 1 multiple-choice papers",
        category: "pages",
        categoryLabel: "Exam Practice",
        icon: ListChecks,
        iconBg: "bg-blue-500/10",
        iconColor: "text-blue-500",
        badge: "P1 & P3",
        badgeTone: "border-blue-500/30 text-blue-600 dark:text-blue-400 bg-blue-500/10",
        keywords: ["mcq", "multiple choice", "paper 1", "paper 3", "practice", "questions", "distractor"],
        onSelect: () => {
          navigate({ to: "/mcq-live" });
          onOpenChange(false);
        },
      },
      {
        id: "page-data-response",
        title: "Data Response Papers Studio",
        subtitle: "Practice real Table 1.1 extract interpretation, curve shift diagrams, and extended essays",
        category: "pages",
        categoryLabel: "Exam Practice",
        icon: FileSpreadsheet,
        iconBg: "bg-emerald-500/10",
        iconColor: "text-emerald-500",
        badge: "Paper 2 Section A",
        badgeTone: "border-emerald-500/30 text-emerald-600 dark:text-emerald-400 bg-emerald-500/10",
        keywords: ["data response", "extract", "table", "case study", "ofr", "calculations", "paper 2", "0455"],
        onSelect: () => {
          navigate({ to: "/data-response" });
          onOpenChange(false);
        },
      },
      {
        id: "page-definitions",
        title: "Definitions Hub",
        subtitle: "260+ Cambridge IGCSE 0455 syllabus definitions, command words, and flashcard drills",
        category: "pages",
        categoryLabel: "Syllabus Hub",
        icon: BookText,
        iconBg: "bg-sky-500/10",
        iconColor: "text-sky-500",
        badge: "Syllabus Core",
        badgeTone: "border-sky-500/30 text-sky-600 dark:text-sky-400 bg-sky-500/10",
        keywords: ["definitions", "glossary", "terms", "vocabulary", "concepts", "theory", "flashcards"],
        onSelect: () => {
          navigate({ to: "/definitions", search: {} as any });
          onOpenChange(false);
        },
      },
      {
        id: "page-diagrams",
        title: "Diagram Library & Visual Models",
        subtitle: "Cambridge exam convention curve models for micro & macro with label-by-label commentary",
        category: "pages",
        categoryLabel: "Syllabus Hub",
        icon: LineChart,
        iconBg: "bg-violet-500/10",
        iconColor: "text-violet-500",
        badge: "30+ Models",
        badgeTone: "border-violet-500/30 text-violet-600 dark:text-violet-400 bg-violet-500/10",
        keywords: ["diagrams", "curves", "micro", "macro", "ad-as", "ppc", "externality", "monopoly", "tariff"],
        onSelect: () => {
          navigate({ to: "/diagrams", search: {} as any });
          onOpenChange(false);
        },
      },
      {
        id: "page-paper-matrix",
        title: "15-Year Past Paper Predictor",
        subtitle: "Examine 15 years of Cambridge IGCSE 0455 exam trends, frequency heatmaps, and predicted question themes",
        category: "pages",
        categoryLabel: "Syllabus Hub",
        icon: Flame,
        iconBg: "bg-orange-500/10",
        iconColor: "text-orange-500",
        badge: "Trends",
        badgeTone: "border-orange-500/30 text-orange-600 dark:text-orange-400 bg-orange-500/10",
        keywords: ["predictor", "matrix", "trends", "past papers", "frequency", "forecast", "15 year"],
        onSelect: () => {
          navigate({ to: "/paper-matrix" });
          onOpenChange(false);
        },
      },
      {
        id: "page-question-bank",
        title: "Official Cambridge Question Bank",
        subtitle: "Explore searchable past paper questions organized by syllabus section and marks",
        category: "pages",
        categoryLabel: "Syllabus Hub",
        icon: BookMarked,
        iconBg: "bg-rose-500/10",
        iconColor: "text-rose-500",
        badge: "Past Papers",
        badgeTone: "border-rose-500/30 text-rose-600 dark:text-rose-400 bg-rose-500/10",
        keywords: ["question bank", "past questions", "8 mark", "12 mark", "20 mark", "browse questions"],
        onSelect: () => {
          navigate({ to: "/question-bank" });
          onOpenChange(false);
        },
      },
      {
        id: "page-response-structure",
        title: "How to Write an Essay (Structure Guide)",
        subtitle: "Master Cambridge IGCSE 0455 4, 6, and 8-mark paragraph blueprints for top AO marks",
        category: "pages",
        categoryLabel: "Exam Practice",
        icon: GraduationCap,
        iconBg: "bg-teal-500/10",
        iconColor: "text-teal-500",
        badge: "Guide",
        badgeTone: "border-teal-500/30 text-teal-600 dark:text-teal-400 bg-teal-500/10",
        keywords: ["structure", "guide", "how to write", "blueprint", "paragraphs", "top band", "technique"],
        onSelect: () => {
          navigate({ to: "/response-structure" });
          onOpenChange(false);
        },
      },
      {
        id: "page-essay-generator",
        title: "Sample Model Essay Generator",
        subtitle: "Generate high-mark Cambridge exemplar answers to inspect Level 3 analysis & evaluation",
        category: "pages",
        categoryLabel: "Exam Practice",
        icon: Wand2,
        iconBg: "bg-purple-500/10",
        iconColor: "text-purple-500",
        badge: "AI Models",
        badgeTone: "border-purple-500/30 text-purple-600 dark:text-purple-400 bg-purple-500/10",
        keywords: ["generator", "sample", "model essay", "exemplar", "ai", "benchmark"],
        onSelect: () => {
          navigate({ to: "/essay-generator" });
          onOpenChange(false);
        },
      },
      {
        id: "page-command-words",
        title: "Command Words Trainer",
        subtitle: "Distinguish between 'Explain', 'Discuss', 'Analyse', and 'Evaluate' to satisfy Cambridge rubrics",
        category: "pages",
        categoryLabel: "Syllabus Hub",
        icon: Target,
        iconBg: "bg-amber-500/10",
        iconColor: "text-amber-500",
        badge: "Drills",
        badgeTone: "border-amber-500/30 text-amber-600 dark:text-amber-400 bg-amber-500/10",
        keywords: ["command words", "discuss", "explain", "analyse", "evaluate", "to what extent"],
        onSelect: () => {
          navigate({ to: "/command-words" });
          onOpenChange(false);
        },
      },
      {
        id: "page-showcase",
        title: "Exemplars Showcase",
        subtitle: "Read marked high-scoring candidate scripts and annotated examiner comments",
        category: "pages",
        categoryLabel: "Syllabus Hub",
        icon: Trophy,
        iconBg: "bg-yellow-500/10",
        iconColor: "text-yellow-600 dark:text-yellow-400",
        badge: "Showcase",
        badgeTone: "border-yellow-500/30 text-yellow-600 dark:text-yellow-400 bg-yellow-500/10",
        keywords: ["showcase", "exemplar", "top student", "scripts", "high score", "annotations"],
        onSelect: () => {
          navigate({ to: "/showcase" });
          onOpenChange(false);
        },
      },
      {
        id: "page-review",
        title: "Analytics & Diagnostics",
        subtitle: "Diagnostic breakdown across syllabus chapters, AO mark trends, and revision radar",
        category: "pages",
        categoryLabel: "Classroom & Progress",
        icon: LineChart,
        iconBg: "bg-cyan-500/10",
        iconColor: "text-cyan-500",
        badge: "Diagnostics",
        badgeTone: "border-cyan-500/30 text-cyan-600 dark:text-cyan-400 bg-cyan-500/10",
        keywords: ["analytics", "review", "diagnostics", "marks", "history", "report"],
        onSelect: () => {
          navigate({ to: "/review" });
          onOpenChange(false);
        },
      },
      {
        id: "page-classes",
        title: role === "student" ? "Classroom Hub" : "Classes & Students",
        subtitle: "Collaborate with teachers, join revision classrooms, and submit designated homework",
        category: "pages",
        categoryLabel: "Classroom & Progress",
        icon: UsersRound,
        iconBg: "bg-emerald-500/10",
        iconColor: "text-emerald-500",
        badge: "Classroom",
        badgeTone: "border-emerald-500/30 text-emerald-600 dark:text-emerald-400 bg-emerald-500/10",
        keywords: ["classroom", "classes", "teacher", "homework", "school", "students"],
        onSelect: () => {
          navigate({ to: "/classes" });
          onOpenChange(false);
        },
      },
      {
        id: "page-settings",
        title: "Student Profile & Settings",
        subtitle: "Manage personal statement, avatar, exam targets, curriculum series, and layout",
        category: "pages",
        categoryLabel: "Account & Preferences",
        icon: Settings,
        iconBg: "bg-slate-500/10",
        iconColor: "text-slate-500",
        badge: "Profile",
        badgeTone: "border-slate-500/30 text-slate-600 dark:text-slate-400 bg-slate-500/10",
        keywords: ["settings", "profile", "avatar", "bio", "birthday", "layout", "account", "dossier"],
        onSelect: () => {
          navigate({ to: "/settings" });
          onOpenChange(false);
        },
      },
      {
        id: "page-about",
        title: "About Marginalite & Pedagogical Vision",
        subtitle: "Origins, Cambridge IGCSE 0455 syllabus grounding, 139 IGCSE 0455 RAG, and founders",
        category: "pages",
        categoryLabel: "Platform & Policies",
        icon: Info,
        iconBg: "bg-purple-500/10",
        iconColor: "text-purple-500",
        badge: "About",
        badgeTone: "border-purple-500/30 text-purple-600 dark:text-purple-400 bg-purple-500/10",
        keywords: ["about", "founders", "marginal", "team", "vision", "who built", "pedagogy", "mission"],
        onSelect: () => {
          navigate({ to: "/about" });
          onOpenChange(false);
        },
      },
      {
        id: "page-terms",
        title: "Terms & Conditions (Official Terms of Use)",
        subtitle: "Cambridge IGCSE 0455 non-affiliation notice, AI second opinion calibration, academic honesty",
        category: "pages",
        categoryLabel: "Platform & Policies",
        icon: FileText,
        iconBg: "bg-blue-500/10",
        iconColor: "text-blue-500",
        badge: "Legal",
        badgeTone: "border-blue-500/30 text-blue-600 dark:text-blue-400 bg-blue-500/10",
        keywords: ["terms", "conditions", "tos", "rules", "legal", "academic honesty", "disclaimer", "cambridge"],
        onSelect: () => {
          navigate({ to: "/terms" });
          onOpenChange(false);
        },
      },
      {
        id: "page-privacy",
        title: "Privacy Policy & Student Data Protection",
        subtitle: "Zero advertising tracking, private essay submissions, GDPR rights & JSON export",
        category: "pages",
        categoryLabel: "Platform & Policies",
        icon: ShieldCheck,
        iconBg: "bg-emerald-500/10",
        iconColor: "text-emerald-500",
        badge: "Privacy",
        badgeTone: "border-emerald-500/30 text-emerald-600 dark:text-emerald-400 bg-emerald-500/10",
        keywords: ["privacy", "policy", "gdpr", "data", "security", "confidential", "export", "delete"],
        onSelect: () => {
          navigate({ to: "/privacy" });
          onOpenChange(false);
        },
      },
    ];

    if (isAdmin || role === "admin") {
      list.push({
        id: "page-admin",
        title: "Admin Console (Root Command)",
        subtitle: "Manage user directory, coupon codes, Essay Grader models, and platform controls",
        category: "pages",
        categoryLabel: "Administration",
        icon: ShieldCheck,
        iconBg: "bg-purple-500/10",
        iconColor: "text-purple-500",
        badge: "Root Admin",
        badgeTone: "border-purple-500/35 text-purple-600 dark:text-purple-400 bg-purple-500/10",
        keywords: ["admin", "root", "console", "users", "coupons", "pricing", "quotas", "godmode"],
        onSelect: () => {
          navigate({ to: "/admin" });
          onOpenChange(false);
        },
      });
    }

    return list;
  }, [navigate, onOpenChange, role, isAdmin]);

  // 2. Cambridge Core Definitions
  const definitions: SearchResultItem[] = useMemo(() => {
    if (!query.trim() || category === "pages" || category === "diagrams" || category === "actions") {
      return [];
    }
    const q = query.trim().toLowerCase();
    const matches: CambridgeDefinition[] = [];

    // Prioritize exact/prefix matches first
    for (const def of CAMBRIDGE_CORE_DEFINITIONS) {
      if (def.term.toLowerCase().startsWith(q)) {
        matches.push(def);
        if (matches.length >= 10) break;
      }
    }

    // Then substring matches
    if (matches.length < 10) {
      for (const def of CAMBRIDGE_CORE_DEFINITIONS) {
        if (!matches.some((m) => m.id === def.id) && def.term.toLowerCase().includes(q)) {
          matches.push(def);
          if (matches.length >= 12) break;
        }
      }
    }

    // If still room, search definition body
    if (matches.length < 8) {
      for (const def of CAMBRIDGE_CORE_DEFINITIONS) {
        if (!matches.some((m) => m.id === def.id) && def.definition_text.toLowerCase().includes(q)) {
          matches.push(def);
          if (matches.length >= 12) break;
        }
      }
    }

    return matches.map((def) => ({
      id: `def-${def.id}`,
      title: def.term,
      subtitle: def.definition_text,
      category: "definitions",
      categoryLabel: "Cambridge Definitions",
      icon: BookText,
      iconBg: "bg-sky-500/10",
      iconColor: "text-sky-500",
      badge: def.category ? def.category.split(" ")[0] : "Syllabus",
      badgeTone: "border-sky-500/30 text-sky-600 dark:text-sky-400 bg-sky-500/10",
      onSelect: () => {
        saveRecentSearch(def.term);
        navigate({ to: "/definitions", search: { q: def.term } });
        onOpenChange(false);
      },
    }));
  }, [query, category, navigate, onOpenChange]);

  // 3. Cambridge Curve Diagrams
  const diagrams: SearchResultItem[] = useMemo(() => {
    if (!query.trim() || category === "pages" || category === "definitions" || category === "actions") {
      return [];
    }
    const q = query.trim().toLowerCase();
    return DIAGRAMS.filter((entry) => {
      return (
        entry.title.toLowerCase().includes(q) ||
        entry.topic.toLowerCase().includes(q) ||
        entry.represents.toLowerCase().includes(q) ||
        entry.section.toLowerCase().includes(q)
      );
    })
      .slice(0, 8)
      .map((entry) => ({
        id: `diag-${entry.id}`,
        title: entry.title,
        subtitle: `${entry.topic} — ${entry.represents}`,
        category: "diagrams",
        categoryLabel: "Diagram Library",
        icon: LineChart,
        iconBg: "bg-violet-500/10",
        iconColor: "text-violet-500",
        badge: entry.section === "Microeconomics" ? "Micro" : "Macro",
        badgeTone:
          entry.section === "Microeconomics"
            ? "border-emerald-500/30 text-emerald-600 dark:text-emerald-400 bg-emerald-500/10"
            : "border-violet-500/30 text-violet-600 dark:text-violet-400 bg-violet-500/10",
        onSelect: () => {
          saveRecentSearch(entry.title);
          navigate({ to: "/diagrams", search: { id: entry.id } });
          onOpenChange(false);
        },
      }));
  }, [query, category, navigate, onOpenChange]);

  // 4. Past Papers (Data Response & MCQ)
  const pastPapers: SearchResultItem[] = useMemo(() => {
    const papersList = [
      {
        id: "dr-0455-22-26-fm",
        title: "Cambridge IGCSE 0455 0455/22 (Feb/March 2026)",
        subtitle: "Section A Data Response: The market for fast food, demerit goods & Danish fat tax",
        type: "Data Response",
        paperTag: "AS Paper 22",
        link: "/data-response",
      },
      {
        id: "dr-0455-22-24-fm",
        title: "Cambridge IGCSE 0455 0455/22 (Feb/March 2024)",
        subtitle: "Section A Data Response: Japan & US real GDP growth comparisons, Table 1.1 interpretation",
        type: "Data Response",
        paperTag: "AS Paper 22",
        link: "/data-response",
      },
      {
        id: "dr-0455-42-23-on",
        title: "Cambridge IGCSE 0455 0455/42 (Oct/Nov 2023)",
        subtitle: "Section A Data Response: Terms of Trade calculations, export/import indices & currency shifts",
        type: "Data Response",
        paperTag: "IGCSE Paper 42",
        link: "/data-response",
      },
      {
        id: "mcq-0455-11-24-on",
        title: "Cambridge IGCSE 0455 0455/11 MCQ (Oct/Nov 2024)",
        subtitle: "Paper 1 Multiple Choice: 30 Questions with official mark scheme answers & distractor notes",
        type: "MCQ Paper 1",
        paperTag: "AS Paper 11",
        link: "/mcq-live",
      },
      {
        id: "mcq-0455-32-23-mj",
        title: "Cambridge IGCSE 0455 0455/32 MCQ (May/June 2023)",
        subtitle: "Paper 1 Multiple Choice: 30 Questions covering Advanced IGCSE market failure & macro models",
        type: "MCQ Paper 1",
        paperTag: "IGCSE Paper 32",
        link: "/mcq-live",
      },
    ];

    if (!query.trim() && category !== "papers") return [];

    const q = query.trim().toLowerCase();
    return papersList
      .filter((p) => {
        if (!q) return true;
        return (
          p.title.toLowerCase().includes(q) ||
          p.subtitle.toLowerCase().includes(q) ||
          p.paperTag.toLowerCase().includes(q) ||
          p.type.toLowerCase().includes(q)
        );
      })
      .map((p) => ({
        id: p.id,
        title: p.title,
        subtitle: p.subtitle,
        category: "papers" as const,
        categoryLabel: "Exam Papers",
        icon: FileSpreadsheet,
        iconBg: "bg-blue-500/10",
        iconColor: "text-blue-500",
        badge: p.paperTag,
        badgeTone: "border-blue-500/30 text-blue-600 dark:text-blue-400 bg-blue-500/10",
        onSelect: () => {
          saveRecentSearch(p.paperTag);
          navigate({ to: p.link });
          onOpenChange(false);
        },
      }));
  }, [query, category, navigate, onOpenChange]);

  // 5. Quick Command Actions
  const actions: SearchResultItem[] = useMemo(() => {
    const list: SearchResultItem[] = [
      {
        id: "action-layout-topbar",
        title: "Switch Navigation to Horizontal Topbar",
        subtitle: "100% scroll-free top navigation with category dropdowns",
        category: "actions",
        categoryLabel: "Quick Actions",
        icon: PanelsTopBottom,
        iconBg: "bg-primary/10",
        iconColor: "text-primary",
        badge: "Layout",
        badgeTone: "border-primary/30 text-primary bg-primary/10",
        keywords: ["layout", "topbar", "horizontal", "header", "scroll free"],
        onSelect: () => {
          setPlatformNavLayout("topbar");
          onLayoutChange?.("topbar");
          onOpenChange(false);
        },
      },
      {
        id: "action-layout-dock",
        title: "Switch Navigation to Category Hub Dock",
        subtitle: "Compact 68px icon dock rail with quick category panels",
        category: "actions",
        categoryLabel: "Quick Actions",
        icon: Layers,
        iconBg: "bg-indigo-500/10",
        iconColor: "text-indigo-500",
        badge: "Layout",
        badgeTone: "border-indigo-500/30 text-indigo-600 dark:text-indigo-400 bg-indigo-500/10",
        keywords: ["layout", "dock", "rail", "category hub", "compact"],
        onSelect: () => {
          setPlatformNavLayout("dock");
          onLayoutChange?.("dock");
          onOpenChange(false);
        },
      },
      {
        id: "action-layout-sidebar",
        title: "Switch Navigation to Classic Sidebar",
        subtitle: "Traditional vertical column with expandable categories",
        category: "actions",
        categoryLabel: "Quick Actions",
        icon: PanelLeft,
        iconBg: "bg-slate-500/10",
        iconColor: "text-slate-500",
        badge: "Layout",
        badgeTone: "border-slate-500/30 text-slate-600 dark:text-slate-400 bg-slate-500/10",
        keywords: ["layout", "sidebar", "column", "traditional"],
        onSelect: () => {
          setPlatformNavLayout("sidebar");
          onLayoutChange?.("sidebar");
          onOpenChange(false);
        },
      },
      {
        id: "action-sign-out",
        title: "Sign Out of Account",
        subtitle: "Safely end current session and return to authentication portal",
        category: "actions",
        categoryLabel: "Quick Actions",
        icon: LogOut,
        iconBg: "bg-rose-500/10",
        iconColor: "text-rose-500",
        badge: "Auth",
        badgeTone: "border-rose-500/30 text-rose-600 dark:text-rose-400 bg-rose-500/10",
        keywords: ["sign out", "logout", "exit", "disconnect"],
        onSelect: () => {
          onOpenChange(false);
          onSignOut?.();
        },
      },
    ];

    if (!query.trim() && category !== "actions") return list.slice(0, 3);

    const q = query.trim().toLowerCase();
    return list.filter((a) => {
      if (!q) return true;
      return (
        a.title.toLowerCase().includes(q) ||
        (a.subtitle && a.subtitle.toLowerCase().includes(q)) ||
        (a.keywords && a.keywords.some((k) => k.includes(q)))
      );
    });
  }, [query, category, onLayoutChange, onOpenChange, onSignOut]);

  // Combine and filter results
  const filteredPages = useMemo(() => {
    if (!query.trim()) return pages.slice(0, 8);
    const q = query.trim().toLowerCase();
    return pages.filter(
      (p) =>
        p.title.toLowerCase().includes(q) ||
        (p.subtitle && p.subtitle.toLowerCase().includes(q)) ||
        (p.keywords && p.keywords.some((k) => k.includes(q))),
    );
  }, [pages, query]);

  const allResults = useMemo(() => {
    if (category === "pages") return filteredPages;
    if (category === "definitions") return definitions;
    if (category === "diagrams") return diagrams;
    if (category === "papers") return pastPapers;
    if (category === "actions") return actions;

    // Combined "all" view
    return [...filteredPages, ...definitions, ...diagrams, ...pastPapers, ...actions];
  }, [category, filteredPages, definitions, diagrams, pastPapers, actions]);

  // Grouped results for clean display
  const groupedResults = useMemo(() => {
    const groups: { [key: string]: SearchResultItem[] } = {};
    for (const item of allResults) {
      if (!groups[item.categoryLabel]) {
        groups[item.categoryLabel] = [];
      }
      groups[item.categoryLabel]!.push(item);
    }
    return groups;
  }, [allResults]);

  // Flattened array for keyboard navigation
  const flattenedList = useMemo(() => {
    return allResults;
  }, [allResults]);

  // Handle keyboard navigation inside search list
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (flattenedList.length === 0) return;

    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelectedIndex((prev) => (prev + 1) % flattenedList.length);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelectedIndex((prev) => (prev - 1 + flattenedList.length) % flattenedList.length);
    } else if (e.key === "Enter") {
      e.preventDefault();
      const current = flattenedList[selectedIndex];
      if (current) {
        if (query.trim()) saveRecentSearch(query.trim());
        current.onSelect();
      }
    }
  };

  // Scroll active item into view
  useEffect(() => {
    const activeEl = listRef.current?.querySelector(`[data-index="${selectedIndex}"]`);
    if (activeEl) {
      activeEl.scrollIntoView({ block: "nearest", behavior: "smooth" });
    }
  }, [selectedIndex]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        hideCloseButton
        className="p-0 max-w-2xl w-[92vw] overflow-hidden rounded-2xl border border-border/80 bg-card/95 backdrop-blur-xl shadow-2xl gap-0"
        onKeyDown={handleKeyDown}
      >
        <DialogTitle className="sr-only">Cambridge IGCSE 0455 Command Palette</DialogTitle>
        <DialogDescription className="sr-only">
          Search Cambridge IGCSE 0455 syllabus definitions, exam curve diagrams, past papers, and platform tools.
        </DialogDescription>

        {/* ── Search Input Header ── */}
        <div className="flex items-center gap-2 sm:gap-3 border-b border-border/70 px-4 py-3 sm:px-5 sm:py-3.5 bg-muted/20">
          <Search className="size-5 text-primary shrink-0 transition-transform duration-200" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search pages, 7000+ definitions, curve diagrams, past papers, admin..."
            className="flex-1 min-w-0 bg-transparent text-sm sm:text-base text-foreground placeholder:text-muted-foreground/70 focus:outline-none focus:ring-0 font-medium"
          />
          {query && (
            <button
              type="button"
              onClick={() => {
                setQuery("");
                inputRef.current?.focus();
              }}
              className="size-6 rounded-md flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition-colors cursor-pointer shrink-0"
              title="Clear search"
              aria-label="Clear search"
            >
              <X className="size-3.5" />
            </button>
          )}
          <div className="flex items-center gap-1.5 shrink-0 pl-1.5 border-l border-border/60">
            <kbd className="hidden sm:inline-flex items-center gap-1 rounded border border-border bg-background px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground font-semibold">
              ESC
            </kbd>
            <button
              type="button"
              onClick={() => onOpenChange(false)}
              className="size-7 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition-colors cursor-pointer"
              title="Close command palette (Esc)"
              aria-label="Close command palette"
            >
              <X className="size-4" />
            </button>
          </div>
        </div>

        {/* ── Filter Category Chips ── */}
        <div className="flex items-center gap-1.5 px-4 py-2 border-b border-border/60 bg-card/60 overflow-x-auto no-scrollbar">
          {(
            [
              { id: "all", label: "All" },
              { id: "pages", label: "Pages & Tools" },
              { id: "definitions", label: "Definitions (7k+)" },
              { id: "diagrams", label: "Diagrams (30+)" },
              { id: "papers", label: "Past Papers" },
              { id: "actions", label: "Actions" },
            ] as const
          ).map((cat) => (
            <button
              key={cat.id}
              type="button"
              onClick={() => setCategory(cat.id)}
              className={cn(
                "px-2.5 py-1 rounded-lg text-xs font-semibold whitespace-nowrap transition-all cursor-pointer",
                category === cat.id
                  ? "bg-primary text-primary-foreground shadow-xs font-bold"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted/80",
              )}
            >
              {cat.label}
            </button>
          ))}
        </div>

        {/* ── Search Results List ── */}
        <div
          ref={listRef}
          className="max-h-[58vh] sm:max-h-[440px] overflow-y-auto px-2 py-2 space-y-4"
        >
          {/* Recent Searches Pills (when input is empty) */}
          {!query && recentSearches.length > 0 && (
            <div className="px-2 pt-1 pb-1">
              <div className="flex items-center justify-between text-[11px] font-semibold text-muted-foreground mb-1.5 px-1">
                <span className="flex items-center gap-1.5">
                  <Clock className="size-3" /> Recent Searches
                </span>
                <button
                  type="button"
                  onClick={clearRecentSearches}
                  className="text-[10px] hover:text-foreground text-muted-foreground/80 hover:underline cursor-pointer"
                >
                  Clear history
                </button>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {recentSearches.map((term) => (
                  <button
                    key={term}
                    type="button"
                    onClick={() => {
                      setQuery(term);
                      inputRef.current?.focus();
                    }}
                    className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-muted/60 hover:bg-muted text-xs font-medium text-foreground transition-colors cursor-pointer border border-border/60"
                  >
                    <Search className="size-3 text-muted-foreground" />
                    <span>{term}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Grouped Results */}
          {Object.keys(groupedResults).length > 0 ? (
            Object.entries(groupedResults).map(([groupLabel, items]) => (
              <div key={groupLabel} className="space-y-1">
                <p className="px-3 pt-1 text-[10.5px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                  <span className="size-1.5 rounded-full bg-primary" />
                  <span>{groupLabel}</span>
                  <span className="text-[10px] text-muted-foreground/70 font-normal">
                    ({items.length})
                  </span>
                </p>

                <div className="space-y-0.5">
                  {items.map((item) => {
                    const globalIdx = flattenedList.indexOf(item);
                    const isSelected = globalIdx === selectedIndex;
                    const Icon = item.icon;

                    return (
                      <button
                        key={item.id}
                        type="button"
                        data-index={globalIdx}
                        onClick={() => {
                          if (query.trim()) saveRecentSearch(query.trim());
                          item.onSelect();
                        }}
                        onMouseEnter={() => setSelectedIndex(globalIdx)}
                        className={cn(
                          "w-full flex items-center justify-between gap-3 px-3 py-2 sm:py-2.5 rounded-xl text-left transition-all duration-150 cursor-pointer group",
                          isSelected
                            ? "bg-primary/10 border border-primary/30 shadow-2xs"
                            : "hover:bg-muted/60 border border-transparent",
                        )}
                      >
                        <div className="flex items-center gap-3 min-w-0 flex-1">
                          <div
                            className={cn(
                              "size-8 rounded-lg flex items-center justify-center shrink-0 transition-transform duration-200 group-hover:scale-105",
                              item.iconBg ?? "bg-primary/10",
                              item.iconColor ?? "text-primary",
                            )}
                          >
                            <Icon className="size-4" />
                          </div>

                          <div className="min-w-0 flex-1">
                            <p
                              className={cn(
                                "text-xs sm:text-sm font-semibold truncate leading-tight",
                                isSelected ? "text-primary font-bold" : "text-foreground",
                              )}
                            >
                              <HighlightMatch text={item.title} query={query} />
                            </p>
                            {item.subtitle && (
                              <p className="text-[11px] text-muted-foreground truncate leading-relaxed mt-0.5">
                                <HighlightMatch text={item.subtitle} query={query} />
                              </p>
                            )}
                          </div>
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          {item.badge && (
                            <Badge
                              variant="outline"
                              className={cn(
                                "text-[9.5px] px-1.5 py-0 font-medium hidden sm:inline-flex",
                                item.badgeTone ?? "border-border/80 text-muted-foreground",
                              )}
                            >
                              {item.badge}
                            </Badge>
                          )}
                          <CornerDownLeft
                            className={cn(
                              "size-3.5 transition-opacity",
                              isSelected ? "opacity-100 text-primary" : "opacity-0 group-hover:opacity-60",
                            )}
                          />
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            ))
          ) : (
            <div className="py-12 px-4 text-center space-y-2">
              <div className="size-12 rounded-full bg-muted/60 flex items-center justify-center mx-auto text-muted-foreground">
                <Search className="size-6 opacity-60" />
              </div>
              <p className="text-sm font-bold text-foreground">
                No matching results for &ldquo;{query}&rdquo;
              </p>
              <p className="text-xs text-muted-foreground max-w-sm mx-auto">
                Try searching for economic terms (e.g. &ldquo;PED&rdquo;, &ldquo;demerit good&rdquo;, &ldquo;fiscal policy&rdquo;) or curve models (e.g. &ldquo;AD/AS&rdquo;, &ldquo;monopoly&rdquo;).
              </p>
            </div>
          )}
        </div>

        {/* ── Footer Navigation Tips ── */}
        <div className="flex flex-wrap items-center justify-between gap-2 border-t border-border/70 px-4 py-2 text-[11px] text-muted-foreground bg-muted/30">
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1 font-mono text-[10px]">
              <kbd className="rounded border border-border/80 bg-background px-1 py-0.5">↑</kbd>
              <kbd className="rounded border border-border/80 bg-background px-1 py-0.5">↓</kbd>
              <span className="ml-0.5">Navigate</span>
            </span>
            <span className="flex items-center gap-1 font-mono text-[10px]">
              <kbd className="rounded border border-border/80 bg-background px-1.5 py-0.5">↵</kbd>
              <span className="ml-0.5">Select</span>
            </span>
            <span className="flex items-center gap-1 font-mono text-[10px]">
              <kbd className="rounded border border-border/80 bg-background px-1.5 py-0.5">ESC</kbd>
              <span className="ml-0.5">Close</span>
            </span>
          </div>

          <div className="font-semibold text-[10.5px] text-muted-foreground/80">
            {flattenedList.length} {flattenedList.length === 1 ? "result" : "results"}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
