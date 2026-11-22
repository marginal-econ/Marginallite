import { createFileRoute, Link, redirect } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import {
  Activity,
  Anchor,
  ArrowDown,
  ArrowUp,
  BellOff,
  BookOpen,
  Calendar,
  Check,
  CheckCircle2,
  Clipboard,
  ChevronLeft,
  ChevronRight,
  Clock,
  Coins,
  Copy,
  Crown,
  Cpu,
  Download,
  Eraser,
  ExternalLink,
  Eye,
  EyeOff,
  FileCheck2,
  Gamepad2,
  GraduationCap,
  ImagePlus,
  KeyRound,
  Layers,
  LineChart,
  Loader2,
  Mail,
  PauseCircle,
  Plug,
  Plus,
  RefreshCw,
  RotateCcw,
  Search,
  Send,
  Server,
  ShieldCheck,
  ShieldPlus,
  Sparkles,
  Tag,
  Target,
  Trash2,
  AlertTriangle,
  LayoutDashboard,
  MessageSquare,
  Trophy,
  UploadCloud,
  Users,
  UserPlus,
  XCircle,
  Zap,
} from "lucide-react";
import { useRef, useState, useEffect, useMemo } from "react";
import { toast } from "sonner";
import { cn, stripStars } from "@/lib/utils";

import { AdminGodmodeDashboard, EssaysVaultTab, GodmodeErrorBoundary } from "@/components/app/admin-godmode";
import { AdminDiagnosticsPanel } from "@/components/app/admin-diagnostics";
import { CouponsAdminPanel } from "@/components/app/coupons-admin";
import { FeedbackAdminPanel } from "@/components/app/feedback-admin";
import { MessagesAdminPanel } from "@/components/app/messages-admin";
import { PublicWaitlistPanel } from "@/components/app/public-waitlist-admin";
import { TeacherApprovalsPanel } from "@/components/app/teacher-approvals-admin";
import { PricingAdminPanel } from "@/components/app/pricing-admin";
import { DataResponseAdminPanel } from "@/components/app/data-response-admin";
import { AdminMcqQuizPanel } from "@/components/app/admin-mcq-quiz";
import {
  AccessPanel,
  ActivityOverview,
  SearchBox,
  displayName,
  matchesSearch,
  timeAgo,
  useUserActivity,
} from "@/components/app/admin-access";
import { PageHeader } from "@/components/app/app-shell";
import { UserAvatar } from "@/components/app/user-avatar";
import { MARGINAL_ADMIN_USER_ID, MARGINAL_ADMIN_EMAIL, isMarginaliteAdmin } from "@/lib/auth-admin";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { embedNextBatch, listDocuments, reembedAllDocuments } from "@/lib/knowledge.functions";
import {
  activateProviderKey,
  adminGetSettings,
  adminOverview,
  clearAiUsageLog,
  deleteProviderKey,
  deleteUserAccount,
  dismissPaidKeyAlerts,
  listProviderKeys,
  listUsers,
  fetchProviderModels,
  resetAllScores,
  resetStudentPracticeData,
  rotateProviderKey,
  saveProviderKey,
  setUserRole,
  testEmbeddingProviderKey,
  testProviderKey,
  testSpecificKey,
  testVisionProviderKey,
  toggleGeminiBypass,
} from "@/lib/admin.functions";
import {
  addShowcaseToCalibration,
  getCalibrationAnchorQuestions,
} from "@/lib/calibration.functions";
import { getMe } from "@/lib/account.functions";
import {
  getPlatformPricing,
  updatePlatformPricing,
  adminManageUserCredits,
} from "@/lib/pricing.functions";
import { DEFAULT_PRICING_PLANS } from "@/lib/pricing-plans";
import {
  AI_PROVIDERS,
  EMBEDDING_PROVIDERS,
  VISION_PROVIDERS,
  providerMeta,
} from "@/lib/ai/providers";
import {
  autofillDiagramFromImage,
  deleteCustomDiagram,
  listCustomDiagrams,
  saveCustomDiagram,
} from "@/lib/diagrams.functions";
import { filesToPageImages } from "@/lib/handwriting-images";
import { SPEC_TEMPLATES, templateSpec } from "@/lib/diagrams/custom";
import { EconomicsDiagram } from "@/components/diagrams/economics-diagram";
import {
  adminAddShowcaseExemplar,
  adminDeleteShowcaseExemplar,
  adminListShowcaseEssays,
  adminToggleShowcaseVisibility,
  type ShowcaseEssayItem,
} from "@/lib/showcase.functions";
import {
  getPaymentConfig,
  listUpiPaymentRequests,
  approveUpiPaymentRequest,
  rejectUpiPaymentRequest,
  revokeUpiPaymentRequest,
  updateMerchantUpiConfig,
} from "@/lib/payment.functions";

function embeddingModelsFor(meta: ReturnType<typeof providerMeta>): readonly string[] {
  return "embeddingModels" in meta ? meta.embeddingModels : [];
}

function visionModelsFor(meta: ReturnType<typeof providerMeta>): readonly string[] {
  return "visionModels" in meta ? meta.visionModels : [];
}

function AdminErrorComponent({ error, reset }: { error: unknown; reset: () => void }) {
  const errorMessage = error instanceof Error ? error.message : typeof error === "string" ? error : JSON.stringify(error);
  const errorStack = error instanceof Error ? error.stack : null;

  return (
    <div className="mx-auto max-w-xl px-5 py-16 text-center space-y-4">
      <XCircle className="mx-auto size-10 text-destructive" />
      <h1 className="text-xl font-bold">Admin Console encountered an issue</h1>
      <p className="text-sm text-muted-foreground">
        {errorMessage || "An unexpected error occurred while loading the Admin Console."}
      </p>
      {errorStack && (
        <pre className="max-h-48 overflow-auto rounded border border-border/80 bg-muted/70 p-3 text-left font-mono text-[11px] text-destructive whitespace-pre-wrap">
          {errorStack}
        </pre>
      )}
      <div className="flex justify-center gap-2 pt-2">
        <Button onClick={reset} variant="default" size="sm">
          Try again
        </Button>
        <Button onClick={() => window.location.reload()} variant="outline" size="sm">
          Refresh page
        </Button>
      </div>
    </div>
  );
}

export const Route = createFileRoute("/_authenticated/admin")({
  validateSearch: (search: Record<string, unknown>): { tab?: string } => ({
    tab: typeof search.tab === "string" ? search.tab : undefined,
  }),
  beforeLoad: async ({ context }) => {
    const user = (context as any)?.user;
    const isMarginalite = isMarginaliteAdmin({
      userId: user?.id,
      email: user?.email,
      claims: user?.user_metadata,
    });
    if (!isMarginalite) {
      throw redirect({ to: "/dashboard" });
    }
  },
  head: () => ({
    meta: [
      { title: "Admin console — Marginalite Economics" },
      {
        name: "description",
        content:
          "Platform admin console: manage roles, plug in your own AI provider keys, and monitor AI usage across the Economics platform.",
      },
      { property: "og:title", content: "Admin console — Marginalite Economics" },
      {
        property: "og:description",
        content: "Roles, AI provider keys and usage monitoring for Marginalite Economics.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: AdminPage,
  errorComponent: AdminErrorComponent,
});

type AdminSectionMeta = {
  id: string;
  category: string;
  title: string;
  subtitle: string;
  icon: typeof Activity;
  badge?: string;
  badgeColor?: string;
  sidebarLabel?: string;
};

const ADMIN_SECTIONS: Record<string, AdminSectionMeta> = {
  overview: {
    id: "overview",
    category: "Platform & Intelligence",
    title: "Executive Platform Dashboard",
    sidebarLabel: "Executive Overview",
    subtitle: "Real-time user sessions, grading throughput, AI token spend, database health, and error telemetry.",
    icon: Activity,
  },
  diagnostics: {
    id: "diagnostics",
    category: "Platform & Intelligence",
    title: "Platform Diagnostics & Institutional Telemetry",
    sidebarLabel: "Full Diagnostics & Stats",
    subtitle: "Complete institutional audit: school directory, repeat usage retention, academic marks distribution, and Cambridge maturity scorecard.",
    icon: LineChart,
    badge: "Full Report",
    badgeColor: "bg-purple-500/20 text-purple-600 dark:text-purple-400",
  },
  godmode: {
    id: "godmode",
    category: "Platform & Intelligence",
    title: "God Mode & Platform Vault",
    sidebarLabel: "God Mode",
    subtitle: "Real-time user surveillance, keystroke radar, 1-click essay repair, and 360° student dossiers.",
    icon: Crown,
  },
  essays: {
    id: "essays",
    category: "Platform & Intelligence",
    title: "Graded Student Essays Vault",
    sidebarLabel: "Graded Essays",
    subtitle: "Real-time repository of all Cambridge IGCSE 0455 essays, automated grades, student scripts, and examiner breakdowns.",
    icon: BookOpen,
  },
  quiz: {
    id: "quiz",
    category: "Platform & Intelligence",
    title: "Live Multiplayer MCQ Quiz Arena & Diagnostics",
    sidebarLabel: "Live MCQ Quizzes",
    subtitle: "Real-time surveillance of live and past quiz rooms, PINs, host teachers, active players, and student leaderboard scores.",
    icon: Gamepad2,
    badge: "Live Arena",
    badgeColor: "bg-emerald-500/20 text-emerald-600 dark:text-emerald-400",
  },
  feedback: {
    id: "feedback",
    category: "User & Community Support",
    title: "Bug Reports & User Feedback",
    sidebarLabel: "Bug Reports & Feedback",
    subtitle: "Direct in-app communication channel: Read, reply to, and manage bug reports, questions, and suggestions from students and teachers.",
    icon: MessageSquare,
  },
  messages: {
    id: "messages",
    category: "User & Community Support",
    title: "Direct In-App User Texting Portal",
    sidebarLabel: "Direct Messaging",
    subtitle: "Real-time 1-on-1 portal to text students and teachers directly inside the Marginalite web application.",
    icon: Send,
  },
  users: {
    id: "users",
    category: "User & Community Support",
    title: "User Directory & Role Management",
    sidebarLabel: "User Directory",
    subtitle: "Manage registered student and teacher accounts, grant staff privileges, and audit account states.",
    icon: Users,
  },
  teachers: {
    id: "teachers",
    category: "User & Community Support",
    title: "Teacher Verification Desk",
    sidebarLabel: "Teacher Verification",
    subtitle: "Verify Cambridge IGCSE 0455 educators, review compulsory school domains, and approve staff access to Knowledge Base & Classrooms.",
    icon: GraduationCap,
  },
  waitlist: {
    id: "waitlist",
    category: "User & Community Support",
    title: "Public Waitlist & Access Invitations",
    sidebarLabel: "Public Waitlist",
    subtitle: "Manage early signups, preview invitation templates, and send official access invitations via Mailjet.",
    icon: Mail,
  },
  pricing: {
    id: "pricing",
    category: "Monetization & Quotas",
    title: "Pricing Plans & Credit Control",
    sidebarLabel: "Pricing Plans",
    subtitle: "Real-time pricing editor: customize monthly/annual tier pricing, essay allowances, Essay Grader credit quotas, and user balances.",
    icon: Coins,
  },
  payments: {
    id: "payments",
    category: "Monetization & Quotas",
    title: "UPI Payment Approvals Desk",
    sidebarLabel: "UPI Payments",
    subtitle: "Verify incoming student UPI transaction references (UTR) against your bank credits, approve subscriptions with 1 click, or reject invalid entries.",
    icon: Coins,
  },
  coupons: {
    id: "coupons",
    category: "Monetization & Quotas",
    title: "Coupon Codes & Discounts",
    sidebarLabel: "Coupon Codes",
    subtitle: "Create, manipulate, pause, or cancel promotional discount codes. Configure flat ₹ or % cuts, caps, and expirations.",
    icon: Tag,
  },
  access: {
    id: "access",
    category: "Monetization & Quotas",
    title: "Capacity & AI Rate Controls",
    sidebarLabel: "Rate Limits & Capacity",
    subtitle: "Administer per-user daily essay allowances, global request quotas, and VIP token overrides.",
    icon: Coins,
  },
  data_response: {
    id: "data_response",
    category: "Curriculum & Content",
    title: "Cambridge Data Response & Case Study Studio",
    sidebarLabel: "Data Response Studio",
    subtitle: "Manage, upload QP & MS via OCR, practice Section A case study questions, and test strict mark scheme evaluation.",
    icon: FileCheck2,
  },
  showcase: {
    id: "showcase",
    category: "Curriculum & Content",
    title: "Exemplar Showcase Curation",
    sidebarLabel: "Exemplar Showcase",
    subtitle: "Review, approve, and curate Level 4 and Level 5 high-scoring Cambridge IGCSE 0455 model essays.",
    icon: Trophy,
  },
  diagrams: {
    id: "diagrams",
    category: "Curriculum & Content",
    title: "Diagram Library Engine",
    sidebarLabel: "Diagram Library",
    subtitle: "Cambridge IGCSE 0455 interactive visual graphs: label-by-label definitions, axes calibration, and custom graphs.",
    icon: LineChart,
  },
  gemini: {
    id: "gemini",
    category: "AI Engine & Infrastructure",
    title: "Google Gemini Enterprise & Pool",
    sidebarLabel: "Google Gemini",
    subtitle: "Dedicated Google AI Studio layer: multi-project key pooling, 20 RPD free tier rotation, and quota management.",
    icon: Sparkles,
  },
  providers: {
    id: "providers",
    category: "AI Engine & Infrastructure",
    title: "Multi-Provider Hub (Groq, Grok, etc.)",
    sidebarLabel: "Multi-Provider Hub",
    subtitle: "Dedicated external provider platform: Groq, xAI Grok, OpenRouter, Mistral, OpenAI, Anthropic, DeepSeek, & Custom.",
    icon: Cpu,
  },
  embeddings: {
    id: "embeddings",
    category: "AI Engine & Infrastructure",
    title: "Embedding Models & Vector Search",
    sidebarLabel: "Embedding Models",
    subtitle: "Configure semantic vector search models for syllabus retrieval, RAG grounding, and batch recalibration.",
    icon: Layers,
  },
  vision: {
    id: "vision",
    category: "AI Engine & Infrastructure",
    title: "Vision OCR & Handwriting Engine",
    sidebarLabel: "Vision OCR",
    subtitle: "Extract handwritten student scripts, diagrams, and mark scheme photos using multimodal AI models.",
    icon: ImagePlus,
  },
};

const ADMIN_CATEGORIES = [
  {
    title: "Platform & Intelligence",
    items: [
      ADMIN_SECTIONS.overview,
      ADMIN_SECTIONS.diagnostics,
      ADMIN_SECTIONS.godmode,
      ADMIN_SECTIONS.essays,
      ADMIN_SECTIONS.quiz,
    ],
    externalLinks: [
      { label: "Live Examiner Studio", to: "/live-examiner", icon: Sparkles, desc: "Real-time AI Essay Examiner (Admin Lab)" },
      { label: "Live Quiz Arena", to: "/quiz", icon: Gamepad2, desc: "Multiplayer Blooket / Quizizz Arena" },
    ],
  },
  {
    title: "User & Community Support",
    items: [ADMIN_SECTIONS.feedback, ADMIN_SECTIONS.messages, ADMIN_SECTIONS.users, ADMIN_SECTIONS.teachers, ADMIN_SECTIONS.waitlist],
  },
  {
    title: "Monetization & Quotas",
    items: [ADMIN_SECTIONS.pricing, ADMIN_SECTIONS.payments, ADMIN_SECTIONS.coupons, ADMIN_SECTIONS.access],
  },
  {
    title: "Curriculum & Content",
    items: [ADMIN_SECTIONS.data_response, ADMIN_SECTIONS.showcase, ADMIN_SECTIONS.diagrams],
    externalLinks: [
      { label: "Knowledge Base", to: "/knowledge", icon: BookOpen, desc: "RAG Syllabus & Mark Schemes" },
      { label: "Calibration Anchors", to: "/calibration", icon: Target, desc: "Worked Exam Exemplars" },
      { label: "Content Ingestion", to: "/content-admin", icon: ShieldPlus, desc: "Question Bank Ingestion" },
      { label: "MCQ Paper Library", to: "/mcq-papers-admin", icon: UploadCloud, desc: "Past Paper PDFs" },
    ],
  },
  {
    title: "AI Engine & Infrastructure",
    items: [ADMIN_SECTIONS.gemini, ADMIN_SECTIONS.providers, ADMIN_SECTIONS.embeddings, ADMIN_SECTIONS.vision],
  },
];

function AdminPage() {
  const queryClient = useQueryClient();
  const searchParams = Route.useSearch();
  const fetchMe = useServerFn(getMe);
  const fetchOverview = useServerFn(adminOverview);
  const dismissAlerts = useServerFn(dismissPaidKeyAlerts);
  const fetchSettings = useServerFn(adminGetSettings);
  const [activeTab, setActiveTab] = useState(searchParams?.tab || "overview");
  const [textTargetUserId, setTextTargetUserId] = useState<string | null>(null);
  const [localAlertDismissed, setLocalAlertDismissed] = useState(false);
  const [adminModuleSearch, setAdminModuleSearch] = useState("");

  const filteredCategories = useMemo(() => {
    if (!adminModuleSearch.trim()) return ADMIN_CATEGORIES;
    const q = adminModuleSearch.toLowerCase().trim();
    return ADMIN_CATEGORIES.map((cat) => {
      const matchingItems = cat.items.filter(
        (item) =>
          item.title.toLowerCase().includes(q) ||
          (item.sidebarLabel && item.sidebarLabel.toLowerCase().includes(q)) ||
          item.subtitle.toLowerCase().includes(q),
      );
      const matchingLinks = (cat.externalLinks || []).filter(
        (link) =>
          link.label.toLowerCase().includes(q) ||
          (link.desc && link.desc.toLowerCase().includes(q)),
      );
      if (matchingItems.length === 0 && matchingLinks.length === 0) return null;
      return {
        ...cat,
        items: matchingItems,
        externalLinks: matchingLinks,
      };
    }).filter(Boolean) as typeof ADMIN_CATEGORIES;
  }, [adminModuleSearch]);

  useEffect(() => {
    if (searchParams?.tab) {
      setActiveTab(searchParams.tab);
    }
  }, [searchParams?.tab]);

  const me = useQuery({ queryKey: ["me"], queryFn: () => fetchMe() });
  const overviewQuery = useQuery({
    queryKey: ["admin-overview"],
    queryFn: () => fetchOverview(),
    refetchInterval: 15_000,
  });
  const settingsQuery = useQuery({
    queryKey: ["admin-settings"],
    queryFn: () => fetchSettings(),
  });

  const dismissAlertMutation = useMutation({
    mutationFn: () => dismissAlerts(),
    onSuccess: () => {
      setLocalAlertDismissed(true);
      queryClient.invalidateQueries({ queryKey: ["admin-overview"] });
      toast.success("Paid key amber alert dismissed and silenced.");
    },
    onError: (err: Error) => toast.error(`Failed to dismiss alert: ${err.message}`),
  });

  const showAlert = Boolean(overviewQuery.data?.hasPaidKeyAlert) && !localAlertDismissed;

  if (me.isLoading) {
    return (
      <div className="space-y-3 p-6">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-40 w-full" />
      </div>
    );
  }

  if (me.isError) {
    return (
      <div className="mx-auto max-w-lg px-5 py-16 text-center space-y-4">
        <XCircle className="mx-auto size-8 text-destructive" />
        <h1 className="text-lg font-semibold">Unable to verify permissions</h1>
        <p className="text-sm text-muted-foreground">
          {me.error instanceof Error ? me.error.message : "Failed to load user profile."}
        </p>
        <Button onClick={() => me.refetch()} variant="outline" size="sm">
          Retry
        </Button>
      </div>
    );
  }

  if (!me.data?.isAdmin) {
    return (
      <div className="mx-auto max-w-lg px-5 py-16 text-center">
        <ShieldCheck className="mx-auto size-8 text-muted-foreground" />
        <h1 className="mt-4 text-lg font-semibold">Admin access required</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          This console is reserved exclusively for the platform administrator ({MARGINAL_ADMIN_EMAIL}).
        </p>
      </div>
    );
  }

  const currentSection = ADMIN_SECTIONS[activeTab] ?? ADMIN_SECTIONS.overview;
  const ActiveIcon = currentSection.icon;

  return (
    <div className="flex flex-1 flex-col">
      {/* ── Studio Header ── */}
      <PageHeader
        title="Admin Command Studio"
        description="Master control center: platform health, user roles, syllabus curriculum, and AI infrastructure."
        action={
          <div className="flex items-center gap-2">
            <Link to="/dashboard">
              <Button
                variant="default"
                size="sm"
                className="h-8 text-xs gap-1.5 bg-primary text-primary-foreground hover:bg-primary/90 font-semibold shadow-xs"
              >
                <LayoutDashboard className="size-3.5" />
                <span>Go to App Dashboard →</span>
              </Button>
            </Link>
            {settingsQuery.data?.aiBackupOnly ? (
              <div className="flex items-center gap-1.5 rounded-full border border-amber-500/40 bg-amber-500/10 px-3 py-1 text-xs font-semibold text-amber-600 dark:text-amber-400 animate-pulse">
                <AlertTriangle className="size-3.5" />
                <span>Backup Only (Gemini Off)</span>
              </div>
            ) : null}
            <div className="hidden sm:flex items-center gap-1.5 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1 text-xs font-medium text-emerald-600 dark:text-emerald-400">
              <span className="relative flex size-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex size-2 rounded-full bg-emerald-500" />
              </span>
              <span>Root: Marginalite Admin</span>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => window.location.reload()}
              className="h-8 text-xs gap-1.5"
            >
              <RefreshCw className="size-3.5" />
              <span className="hidden sm:inline">Reload Studio</span>
            </Button>
          </div>
        }
      />

      {/* ── Direct Return to App Dashboard Notice Bar ── */}
      <div className="bg-primary/10 border-b border-primary/20 px-4 py-2.5 flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-2 text-foreground font-medium">
          <ShieldCheck className="size-4 text-primary shrink-0" />
          <span>You are currently in the <strong>Admin Command Studio</strong> (telemetry &amp; controls).</span>
        </div>
        <Link to="/dashboard">
          <Button size="sm" variant="outline" className="h-7 text-xs gap-1.5 border-primary/40 text-primary hover:bg-primary hover:text-primary-foreground font-semibold">
            <LayoutDashboard className="size-3.5" />
            <span>Open Candidate Workspace &amp; Essay Grader →</span>
          </Button>
        </Link>
      </div>

      {/* ── Studio Layout: Left Sidebar + Right Workspace ── */}
      <div className="flex flex-1 flex-col md:flex-row min-h-[calc(100vh-140px)] border-t border-border/70">
        {/* Mobile Horizontal Selector (< md) */}
        <div className="md:hidden border-b border-border/70 bg-card/95 backdrop-blur-md p-3 space-y-2 sticky top-12 z-20 shadow-xs">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span className="font-semibold uppercase tracking-wider text-[10px]">Studio Module:</span>
            <span className="font-medium text-foreground">{currentSection.title}</span>
          </div>
          <div className="flex items-center gap-1.5 overflow-x-auto custom-scrollbar pb-1.5">
            {Object.values(ADMIN_SECTIONS).map((sec) => (
              <Button
                key={sec.id}
                variant={activeTab === sec.id ? "default" : "outline"}
                size="sm"
                onClick={() => setActiveTab(sec.id)}
                className="h-7 text-xs whitespace-nowrap gap-1 shrink-0"
              >
                <sec.icon className="size-3" />
                {sec.sidebarLabel || sec.title}
              </Button>
            ))}
          </div>
        </div>

        {/* Desktop Left-Hand Studio Sidebar (md:) — Sticky locked on viewport scroll with ambient effects */}
        <aside className="hidden md:flex md:w-64 lg:w-72 shrink-0 flex-col justify-between border-r border-border/70 bg-card/60 backdrop-blur-xl p-3.5 space-y-3 sticky top-12 h-[calc(100dvh-3rem)] self-start overflow-hidden z-20 relative shadow-sm">
          {/* Ambient lighting orb */}
          <div className="pointer-events-none absolute -top-10 -left-10 size-36 rounded-full bg-gradient-to-br from-purple-500/15 to-primary/10 blur-2xl" />
          <div className="pointer-events-none absolute -bottom-10 -right-10 size-36 rounded-full bg-gradient-to-tr from-indigo-500/10 to-transparent blur-2xl" />

          {/* Back to Candidate Workspace Shortcut */}
          <Link
            to="/dashboard"
            className="flex items-center justify-between px-3 py-2 text-xs font-semibold rounded-lg bg-primary/10 text-primary hover:bg-primary hover:text-primary-foreground transition-all shrink-0 z-10 border border-primary/20"
          >
            <div className="flex items-center gap-2">
              <LayoutDashboard className="size-3.5" />
              <span>Back to App Dashboard</span>
            </div>
            <ChevronRight className="size-3" />
          </Link>

          {/* Module Filter Input */}
          <div className="relative shrink-0 z-10">
            <Search className="pointer-events-none absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={adminModuleSearch}
              onChange={(e) => setAdminModuleSearch(e.target.value)}
              placeholder="Search 16 modules..."
              className="h-8 pl-8 pr-6 text-xs bg-background/80 rounded-lg border-border/70 focus-visible:ring-1 focus-visible:ring-primary/50 focus-visible:border-primary/50 shadow-2xs transition-all"
            />
            {adminModuleSearch && (
              <button
                type="button"
                onClick={() => setAdminModuleSearch("")}
                className="absolute top-1/2 right-2 -translate-y-1/2 text-[10px] text-muted-foreground hover:text-foreground font-semibold cursor-pointer size-4 flex items-center justify-center rounded-full hover:bg-muted"
              >
                ✕
              </button>
            )}
          </div>

          <div className="space-y-4 overflow-y-auto custom-scrollbar flex-1 pr-1 relative z-10">
            {filteredCategories.length === 0 ? (
              <div className="p-4 text-center text-xs text-muted-foreground">
                <p>No modules match &quot;{adminModuleSearch}&quot;.</p>
                <button
                  type="button"
                  onClick={() => setAdminModuleSearch("")}
                  className="mt-1 text-primary hover:underline font-semibold cursor-pointer text-[11px]"
                >
                  Clear filter
                </button>
              </div>
            ) : null}

            {filteredCategories.map((cat) => (
              <div key={cat.title} className="space-y-1">
                <p className="px-2.5 text-[10px] font-bold tracking-wider text-muted-foreground/70 uppercase">
                  {cat.title}
                </p>
                <div className="space-y-0.5">
                  {cat.items.map((item) => {
                    const isActive = activeTab === item.id;
                    const ItemIcon = item.icon;
                    return (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => setActiveTab(item.id)}
                        className={cn(
                          "group relative flex w-full items-center justify-between gap-2 rounded-lg px-2.5 py-2 text-left text-xs transition-all duration-200 cursor-pointer",
                          isActive
                            ? "bg-gradient-to-r from-primary/20 via-primary/10 to-transparent font-semibold text-primary shadow-xs border border-primary/25"
                            : "text-muted-foreground hover:bg-muted/70 hover:text-foreground hover:translate-x-1",
                        )}
                      >
                        <div className="flex items-center gap-2.5 min-w-0 flex-1">
                          <ItemIcon className={cn("size-4 shrink-0 transition-transform duration-200 group-hover:scale-115 group-hover:-rotate-3", isActive ? "text-primary drop-shadow-[0_0_6px_rgba(99,102,241,0.5)]" : "text-muted-foreground")} />
                          <span className="truncate">{item.sidebarLabel || item.title}</span>
                        </div>
                        {item.id === "feedback" && (overviewQuery.data?.feedbackCount ?? 0) > 0 ? (
                          <Badge variant="secondary" className="text-[9px] px-1.5 py-0 h-4 font-bold bg-primary/20 text-primary shrink-0 whitespace-nowrap">
                            {overviewQuery.data?.feedbackCount}
                          </Badge>
                        ) : item.id === "providers" && showAlert ? (
                          <Badge variant="destructive" className="text-[9px] px-1.5 py-0 h-4 font-bold animate-pulse shrink-0 whitespace-nowrap">
                            🚨 Alert
                          </Badge>
                        ) : item.badge ? (
                          <Badge variant="outline" className={cn("text-[9px] px-1.5 py-0 h-4 font-mono uppercase shrink-0 whitespace-nowrap", item.badgeColor)}>
                            {item.badge}
                          </Badge>
                        ) : null}
                        {isActive ? (
                          <span className="absolute left-0 top-1.5 bottom-1.5 w-1 rounded-r-full bg-gradient-to-b from-primary via-indigo-500 to-purple-500 shadow-[0_0_8px_rgba(99,102,241,0.8)]" />
                        ) : null}
                      </button>
                    );
                  })}

                  {/* External links under Curriculum */}
                  {cat.externalLinks?.map((link) => (
                    <Link
                      key={link.to}
                      to={link.to}
                      className="group flex w-full items-center justify-between gap-2 rounded-lg px-2.5 py-1.5 text-xs text-muted-foreground hover:bg-muted/60 hover:text-foreground hover:translate-x-1 transition-all duration-200"
                      title={link.desc}
                    >
                      <div className="flex items-center gap-2.5 min-w-0 flex-1">
                        <link.icon className="size-3.5 shrink-0 text-muted-foreground group-hover:text-foreground transition-transform duration-200 group-hover:scale-110" />
                        <span className="truncate">{link.label}</span>
                      </div>
                      <ExternalLink className="size-3 text-muted-foreground/50 group-hover:text-foreground shrink-0" />
                    </Link>
                  ))}
                </div>
              </div>
            ))}
          </div>

          {/* Sidebar Footer info with live engine status */}
          <div className="border-t border-border/60 pt-3 px-2 text-[11px] text-muted-foreground/80 space-y-1.5 relative z-10">
            <div className="flex items-center justify-between">
              <p className="font-bold text-foreground text-xs tracking-tight">Marginalite 0455 Engine</p>
              <span className="relative flex size-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex size-2 rounded-full bg-emerald-500" />
              </span>
            </div>
            <p className="text-[10px] text-muted-foreground flex items-center gap-1.5">
              <span>Cloudflare Workers</span>
              <span>·</span>
              <span>PostgreSQL</span>
            </p>
          </div>
        </aside>

        {/* ── Main Studio Workspace (Right) ── */}
        <main className="flex-1 min-w-0 p-4 sm:p-6 lg:p-8 bg-card/10 overflow-y-auto space-y-6">
          {/* Section Breadcrumb & Header Banner */}
          <div className="rounded-xl border border-border/80 bg-card p-5 sm:p-6 shadow-xs">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div className="space-y-1">
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <span>Admin</span>
                  <span>/</span>
                  <span className="text-foreground font-medium">{currentSection.category}</span>
                  <span>/</span>
                  <span className="text-primary font-semibold">{currentSection.title.split(" ")[0]}</span>
                </div>
                <div className="flex items-center gap-2.5 pt-1">
                  <span className="flex size-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
                    <ActiveIcon className="size-4" />
                  </span>
                  <h1 className="text-xl font-bold tracking-tight text-foreground sm:text-2xl">
                    {currentSection.title}
                  </h1>
                </div>
                <p className="text-xs sm:text-sm text-muted-foreground pt-0.5 leading-relaxed">
                  {currentSection.subtitle}
                </p>
              </div>

              {currentSection.badge ? (
                <Badge variant="outline" className={cn("self-start sm:self-center font-mono text-xs uppercase px-2.5 py-1", currentSection.badgeColor)}>
                  {currentSection.badge} active
                </Badge>
              ) : null}
            </div>
          </div>

          {/* Emergency Alert Banner if Paid Key was consumed */}
          {showAlert && (
            <div className="rounded-2xl border-2 border-rose-500 bg-rose-500/10 p-4 text-rose-600 dark:text-rose-400 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-lg mb-6">
              <div className="flex items-center gap-3">
                <div className="size-10 rounded-xl bg-rose-500/20 text-rose-500 flex items-center justify-center shrink-0">
                  <AlertTriangle className="size-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold uppercase tracking-wider text-rose-600 dark:text-rose-400">
                    🚨 URGENT PING: Emergency Paid Key Consumed!
                  </h3>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    All free pool keys were exhausted or hit rate limits. Marginalite auto-hopped to your emergency Paid Key to prevent student disruption.
                  </p>
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => dismissAlertMutation.mutate()}
                  disabled={dismissAlertMutation.isPending}
                  className="shrink-0 text-xs font-semibold border-rose-500/40 text-rose-700 hover:bg-rose-500/20 dark:text-rose-300"
                >
                  {dismissAlertMutation.isPending ? (
                    <Loader2 className="size-3 animate-spin mr-1" />
                  ) : (
                    <BellOff className="size-3 mr-1" />
                  )}
                  Silence &amp; Dismiss Alert
                </Button>
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => setActiveTab("providers")}
                  className="shrink-0 text-xs font-semibold"
                >
                  Inspect &amp; Add Free Keys &rarr;
                </Button>
              </div>
            </div>
          )}

          {/* Active Panel View */}
          <div className="space-y-6">
            {activeTab === "overview" && (
              <OverviewPanel
                onOpenDiagnostics={() => setActiveTab("diagnostics")}
                onOpenGodmode={() => setActiveTab("godmode")}
                onOpenEssays={() => setActiveTab("essays")}
                onOpenQuiz={() => setActiveTab("quiz")}
                onOpenUsers={() => setActiveTab("users")}
                onTextUser={(userId) => {
                  setTextTargetUserId(userId);
                  setActiveTab("messages");
                }}
              />
            )}
            {activeTab === "diagnostics" && <AdminDiagnosticsPanel />}
            {activeTab === "messages" && (
              <MessagesAdminPanel initialUserId={textTargetUserId} />
            )}
            {activeTab === "feedback" && (
              <FeedbackAdminPanel
                onTextUser={(userId) => {
                  setTextTargetUserId(userId);
                  setActiveTab("messages");
                }}
              />
            )}
            {activeTab === "godmode" && (
              <GodmodeErrorBoundary tabName="God Mode Console">
                <AdminGodmodeDashboard />
              </GodmodeErrorBoundary>
            )}
            {activeTab === "essays" && (
              <GodmodeErrorBoundary tabName="Graded Essays Vault">
                <EssaysVaultTab />
              </GodmodeErrorBoundary>
            )}
            {activeTab === "quiz" && <AdminMcqQuizPanel />}
            {activeTab === "users" && (
              <UsersPanel
                onTextUser={(userId) => {
                  setTextTargetUserId(userId);
                  setActiveTab("messages");
                }}
              />
            )}
            {activeTab === "teachers" && <TeacherApprovalsPanel />}
            {activeTab === "access" && <AccessPanel />}
            {activeTab === "waitlist" && <PublicWaitlistPanel />}
            {activeTab === "pricing" && <PricingAdminPanel />}
            {activeTab === "payments" && <PaymentApprovalsAdminPanel />}
            {activeTab === "coupons" && <CouponsAdminPanel />}
            {activeTab === "data_response" && <DataResponseAdminPanel />}
            {activeTab === "showcase" && <ShowcaseAdminPanel />}
            {activeTab === "diagrams" && <DiagramsPanel />}
            {activeTab === "gemini" && (
              <GeminiPanel onSwitchToMultiProvider={() => setActiveTab("providers")} />
            )}
            {activeTab === "providers" && (
              <MultiProviderPanel onSwitchToGemini={() => setActiveTab("gemini")} />
            )}
            {activeTab === "embeddings" && <EmbeddingsPanel />}
            {activeTab === "vision" && <VisionPanel />}
          </div>
        </main>
      </div>
    </div>
  );
}

function GeminiPanel({
  onSwitchToMultiProvider,
}: {
  onSwitchToMultiProvider?: () => void;
}) {
  const queryClient = useQueryClient();
  const list = useServerFn(listProviderKeys);
  const save = useServerFn(saveProviderKey);
  const activate = useServerFn(activateProviderKey);
  const remove = useServerFn(deleteProviderKey);
  const test = useServerFn(testProviderKey);
  const testSpecific = useServerFn(testSpecificKey);
  const rotate = useServerFn(rotateProviderKey);
  const getSettingsFn = useServerFn(adminGetSettings);
  const toggleBypassFn = useServerFn(toggleGeminiBypass);

  const keys = useQuery({
    queryKey: ["provider-keys", "chat"],
    queryFn: () => list({ data: { purpose: "chat" } }),
  });

  const settingsQuery = useQuery({
    queryKey: ["admin-settings"],
    queryFn: () => getSettingsFn(),
  });

  const toggleBypassMutation = useMutation({
    mutationFn: (backupOnly: boolean) => toggleBypassFn({ data: { backupOnly } }),
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ["admin-settings"] });
      queryClient.invalidateQueries({ queryKey: ["provider-keys"] });
      if (res.backupOnly) {
        toast.warning(
          `Google Gemini is now SWITCHED OFF. Platform is running exclusively on backup provider: ${res.activeBackupLabel || res.activeBackupProvider || "External"} (${res.activeBackupModel || "default model"}).`,
          { duration: 6000 },
        );
      } else {
        toast.success("Google Gemini restored as primary AI engine.");
      }
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const isBypassActive = settingsQuery.data?.aiBackupOnly ?? false;

  type PoolKeyItem = {
    id: string;
    key: string;
    label: string;
    priority: number;
  };

  const provider = "google";
  const [label, setLabel] = useState("Google Gemini Enterprise");
  const [paidPrimaryKey, setPaidPrimaryKey] = useState("");
  const [paidSecondaryKey, setPaidSecondaryKey] = useState("");
  const [poolKeys, setPoolKeys] = useState<PoolKeyItem[]>([
    { id: "pool-1", key: "", label: "Free Key 1", priority: 1 },
  ]);
  const [bulkInput, setBulkInput] = useState("");
  const [showBulkInput, setShowBulkInput] = useState(false);
  const [keyTestState, setKeyTestState] = useState<
    Record<string, { status: "testing" | "success" | "error"; message: string }>
  >({});
  const [model, setModel] = useState("gemini-3.8-flash");
  const [activateNow, setActivateNow] = useState(true);
  const [rotatingId, setRotatingId] = useState<string | null>(null);
  const [rotateValue, setRotateValue] = useState("");

  const meta = providerMeta("google");
  const refresh = () => queryClient.invalidateQueries({ queryKey: ["provider-keys", "chat"] });

  const handleBulkImport = () => {
    const rawKeys = bulkInput
      .split(/[\n\r,;]+/)
      .map((k) => k.trim())
      .filter((k) => k.length > 5);
    if (rawKeys.length === 0) {
      toast.error("No valid keys found in paste input.");
      return;
    }
    setPoolKeys((prev) => {
      const existing = new Set(prev.map((p) => p.key.trim()));
      const newItems: PoolKeyItem[] = [];
      let nextPriority = prev.filter((p) => p.key.trim().length > 5).length + 1;
      for (const k of rawKeys) {
        if (!existing.has(k)) {
          newItems.push({
            id: `pool-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
            key: k,
            label: `Free Key ${nextPriority}`,
            priority: nextPriority++,
          });
        }
      }
      toast.success(`Imported ${newItems.length} Google Gemini keys into free pool!`);
      const keepOld = prev.filter((p) => p.key.trim().length > 5);
      return keepOld.length > 0 ? [...keepOld, ...newItems] : newItems;
    });
    setBulkInput("");
    setShowBulkInput(false);
  };

  const handleAddPoolKey = () => {
    setPoolKeys((prev) => [
      ...prev,
      {
        id: `pool-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        key: "",
        label: `Free Key ${prev.length + 1}`,
        priority: prev.length + 1,
      },
    ]);
  };

  const handleRemovePoolKey = (id: string) => {
    setPoolKeys((prev) => {
      const next = prev.filter((item) => item.id !== id);
      return next.map((item, index) => ({
        ...item,
        priority: index + 1,
      }));
    });
  };

  const handleUpdatePoolKey = (id: string, updates: Partial<PoolKeyItem>) => {
    setPoolKeys((prev) =>
      prev.map((item) => (item.id === id ? { ...item, ...updates } : item)),
    );
  };

  const handleMovePoolKey = (index: number, direction: "up" | "down") => {
    setPoolKeys((prev) => {
      const targetIndex = direction === "up" ? index - 1 : index + 1;
      if (targetIndex < 0 || targetIndex >= prev.length) return prev;
      const copy = [...prev];
      const [item] = copy.splice(index, 1);
      copy.splice(targetIndex, 0, item);
      return copy.map((k, idx) => ({
        ...k,
        priority: idx + 1,
      }));
    });
  };

  const handleTestSingleKey = async (slotId: string, keyValue: string) => {
    const trimmed = keyValue.trim();
    if (!trimmed || trimmed.length < 5) {
      toast.error("Please enter a valid key before testing");
      return;
    }
    setKeyTestState((prev) => ({
      ...prev,
      [slotId]: { status: "testing", message: "Verifying with Google AI Studio..." },
    }));
    try {
      const res = await testSpecific({
        data: {
          provider: "google",
          apiKey: trimmed,
          model: model.trim() || "gemini-3.8-flash",
        },
      });
      if (res.ok) {
        setKeyTestState((prev) => ({
          ...prev,
          [slotId]: { status: "success", message: `Passed (${res.model})` },
        }));
        toast.success(`Google key verified successfully with ${res.model}`);
      } else {
        setKeyTestState((prev) => ({
          ...prev,
          [slotId]: { status: "error", message: res.reply.slice(0, 70) },
        }));
        toast.error(`Key test failed: ${res.reply}`);
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Key test failed";
      setKeyTestState((prev) => ({
        ...prev,
        [slotId]: { status: "error", message: message.slice(0, 70) },
      }));
      toast.error(message);
    }
  };

  const saveMutation = useMutation({
    mutationFn: () => {
      const validPool = poolKeys
        .filter((k) => k.key.trim().length > 5)
        .map((k, index) => ({
          key: k.key.trim(),
          label: k.label.trim() || `Free Key ${index + 1}`,
          priority: k.priority || index + 1,
        }));

      const primaryPaid = paidPrimaryKey.trim();
      const secondaryPaid = paidSecondaryKey.trim();

      const payload = {
        freeKeys: validPool.map((k) => k.key),
        paidKeys: [primaryPaid, secondaryPaid].filter(Boolean),
        paidPrimary: primaryPaid,
        paidSecondary: secondaryPaid,
        budgetPool: validPool,
      };

      const finalKey = JSON.stringify(payload);

      return save({
        data: {
          provider: "google" as never,
          label: label || "Google Gemini Enterprise",
          apiKey: finalKey,
          model: model || "gemini-3.8-flash",
          activate: activateNow,
        },
      });
    },
    onSuccess: async () => {
      toast.success("Google Gemini configuration saved. AI features will use it immediately.");
      setPaidPrimaryKey("");
      setPaidSecondaryKey("");
      setPoolKeys([{ id: "pool-1", key: "", label: "Free Key 1", priority: 1 }]);
      setKeyTestState({});
      await refresh();
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const activateMutation = useMutation({
    mutationFn: (id: string | null) => activate({ data: { id } }),
    onSuccess: async () => {
      toast.success("Active provider updated.");
      await refresh();
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => remove({ data: { id } }),
    onSuccess: async () => {
      toast.success("Key removed.");
      await refresh();
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const testMutation = useMutation({
    mutationFn: (id: string) => test({ data: { id } }),
    onSuccess: (result) =>
      result.ok
        ? toast.success(`Google Gemini works — ${result.model} replied "${result.reply}"`)
        : toast.error(result.reply),
    onError: (error: Error) => toast.error(error.message),
  });

  const rotateMutation = useMutation({
    mutationFn: (input: { id: string; apiKey: string }) => rotate({ data: input }),
    onSuccess: async () => {
      toast.success("Key rotated successfully.");
      setRotatingId(null);
      setRotateValue("");
      await refresh();
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const allChatKeys = keys.data ?? [];
  const googleKeys = allChatKeys.filter((row) => row.provider === "google");
  const activeKey = allChatKeys.find((row) => row.isActive);
  const isGoogleActive = activeKey?.provider === "google";
  const hasValidPaid = paidPrimaryKey.trim().length >= 8;
  const hasValidPool = poolKeys.some((k) => k.key.trim().length >= 8);

  return (
    <div className="space-y-4">
      {/* ── Status Banner: Active vs Switched Off (Backup Only) ── */}
      <div
        className={cn(
          "rounded-xl border p-4 transition-all flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4",
          isBypassActive
            ? "border-amber-500/40 bg-amber-500/10 text-amber-950 dark:text-amber-200"
            : "border-blue-500/30 bg-blue-500/5 text-foreground",
        )}
      >
        <div className="flex items-start gap-3">
          <div
            className={cn(
              "rounded-lg p-2 mt-0.5",
              isBypassActive
                ? "bg-amber-500/20 text-amber-600 dark:text-amber-400"
                : "bg-blue-500/20 text-blue-600 dark:text-blue-400",
            )}
          >
            {isBypassActive ? <AlertTriangle className="size-5" /> : <Sparkles className="size-5" />}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-semibold text-sm">
                {isBypassActive
                  ? "Google Gemini is SWITCHED OFF (Backup-Only Mode)"
                  : "Google Gemini is ONLINE & ACTIVE"}
              </span>
              <Badge
                variant="outline"
                className={
                  isBypassActive
                    ? "border-amber-500/40 bg-amber-500/20 text-amber-600 dark:text-amber-300"
                    : "border-blue-500/40 bg-blue-500/20 text-blue-600 dark:text-blue-300"
                }
              >
                {isBypassActive ? "Bypassed / Running on Backup" : "Primary Engine"}
              </Badge>
            </div>
            <p className="mt-1 text-xs opacity-90 max-w-2xl leading-relaxed">
              {isBypassActive
                ? "All essay grading, Essay Grader checks, and prompt queries are currently routing 100% through your external backup providers (Groq, OpenRouter, Mistral, xAI Grok, etc.). Click below to re-enable Gemini."
                : "Student requests use Google Gemini with multi-project quota rotation. If all Gemini keys hit rate limits or outage, requests automatically hop to configured backup providers."}
            </p>
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-2">
          {isBypassActive ? (
            <Button
              type="button"
              variant="default"
              size="sm"
              disabled={toggleBypassMutation.isPending}
              onClick={() => toggleBypassMutation.mutate(false)}
              className="gap-1.5 bg-blue-600 hover:bg-blue-700 text-white font-medium"
            >
              <CheckCircle2 className="size-4" />
              Turn Gemini Back On
            </Button>
          ) : (
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={toggleBypassMutation.isPending}
              onClick={() => toggleBypassMutation.mutate(true)}
              className="gap-1.5 border-amber-500/40 hover:bg-amber-500/10 text-amber-600 dark:text-amber-400 font-medium"
            >
              <PauseCircle className="size-4" />
              Switch Off Gemini (Run Backup Only)
            </Button>
          )}
        </div>
      </div>

      <div className="grid gap-5 lg:grid-cols-[460px_1fr]">
      <section className="panel rounded-xl border border-blue-500/20 bg-card p-5 shadow-xs">
        <div className="flex items-center justify-between border-b border-border/60 pb-3">
          <h2 className="flex items-center gap-2 text-sm font-semibold text-foreground">
            <Sparkles className="size-4 text-blue-500" /> Google Gemini Core Platform
          </h2>
          <div className="flex items-center gap-1.5">
            {onSwitchToMultiProvider && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={onSwitchToMultiProvider}
                className="h-6 px-2 text-[11px] text-muted-foreground hover:text-foreground gap-1"
              >
                <Cpu className="size-3 text-emerald-500" />
                Multi-Provider Hub &rarr;
              </Button>
            )}
            <Badge variant="outline" className="text-[10px] text-blue-600 dark:text-blue-400 border-blue-500/30">
              Dedicated Layer
            </Badge>
          </div>
        </div>
        <p className="mt-2 text-xs text-muted-foreground leading-relaxed">
          Dedicated Google AI Studio engine. Configure independent Google Cloud Project keys for high-volume free tier rotation (20 RPD per project) with emergency paid key fallback.
        </p>

        <div className="mt-4 space-y-3.5">
          <div className="space-y-1.5">
            <Label>Configuration Name</Label>
            <Input
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              placeholder="Google Gemini Enterprise"
            />
          </div>

          <div className="space-y-4 rounded-xl border border-border/80 bg-muted/20 p-3.5">
            {/* Free Keys Pool Section */}
            <div className="space-y-2.5">
              <div className="flex items-center justify-between">
                <div>
                  <Label className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                    <span className="inline-block h-2 w-2 rounded-full bg-emerald-500" />
                    Gemini Free Keys Pool (Auto-Hopping)
                  </Label>
                  <p className="text-[11px] text-muted-foreground mt-0.5">
                    Tried in priority order with warm failover between keys.
                  </p>
                </div>
                <div className="flex items-center gap-1.5">
                  <Badge variant="outline" className="text-[10px] text-amber-600 dark:text-amber-400 border-amber-500/30">
                    {poolKeys.length} {poolKeys.length === 1 ? "Key" : "Keys"}
                  </Badge>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="h-6 px-2 text-[10px] gap-1"
                    onClick={() => setShowBulkInput(!showBulkInput)}
                  >
                    <Clipboard className="size-2.5" />
                    {showBulkInput ? "Hide Bulk" : "Bulk Paste"}
                  </Button>
                </div>
              </div>

              {showBulkInput && (
                <div className="rounded-lg border border-amber-500/30 bg-amber-500/5 p-2.5 space-y-2">
                  <Label className="text-[11px] font-medium text-amber-700 dark:text-amber-300">
                    Paste Multiple Google Gemini Keys (one per line or comma-separated):
                  </Label>
                  <Textarea
                    rows={3}
                    value={bulkInput}
                    onChange={(e) => setBulkInput(e.target.value)}
                    placeholder="AIzaSyA...\nAIzaSyB...\nAIzaSyC..."
                    className="font-mono text-xs bg-background"
                  />
                  <div className="flex justify-end gap-1.5">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="h-6 px-2 text-[11px]"
                      onClick={() => setShowBulkInput(false)}
                    >
                      Cancel
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      className="h-6 px-2.5 text-[11px]"
                      onClick={handleBulkImport}
                    >
                      Import Keys into Free Pool
                    </Button>
                  </div>
                </div>
              )}

              {poolKeys.length === 0 ? (
                <div className="rounded-lg border border-dashed border-border/80 p-3 text-center">
                  <p className="text-xs text-muted-foreground">No free keys added yet.</p>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="mt-2 text-xs"
                    onClick={handleAddPoolKey}
                  >
                    <Plus className="mr-1.5 size-3" /> Add Free Key
                  </Button>
                </div>
              ) : (
                <div className="space-y-2">
                  {poolKeys.map((item, index) => {
                    const testState = keyTestState[item.id];
                    return (
                      <div
                        key={item.id}
                        className="rounded-lg border border-border/80 bg-background/60 p-2.5 space-y-2 shadow-xs"
                      >
                        <div className="flex items-center justify-between gap-1.5">
                          <div className="flex items-center gap-1.5">
                            <Badge variant="outline" className="text-[10px] font-mono">
                              #{item.priority || index + 1}
                            </Badge>
                            <span className="text-xs font-medium text-foreground">
                              {item.label || `Free Key ${index + 1}`}
                            </span>
                          </div>
                          <div className="flex items-center gap-1">
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              className="h-6 w-6"
                              onClick={() => handleMovePoolKey(index, "up")}
                              disabled={index === 0}
                              title="Move up in priority"
                            >
                              <ArrowUp className="size-3" />
                            </Button>
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              className="h-6 w-6"
                              onClick={() => handleMovePoolKey(index, "down")}
                              disabled={index === poolKeys.length - 1}
                              title="Move down in priority"
                            >
                              <ArrowDown className="size-3" />
                            </Button>
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              className="h-6 px-2 text-[10px] gap-1"
                              onClick={() => handleTestSingleKey(item.id, item.key)}
                              disabled={testState?.status === "testing" || item.key.trim().length < 5}
                            >
                              {testState?.status === "testing" ? (
                                <>
                                  <Loader2 className="size-2.5 animate-spin" /> Testing
                                </>
                              ) : testState?.status === "success" ? (
                                <>
                                  <CheckCircle2 className="size-2.5 text-emerald-500" /> Pass
                                </>
                              ) : testState?.status === "error" ? (
                                <>
                                  <XCircle className="size-2.5 text-destructive" /> Retry
                                </>
                              ) : (
                                <>
                                  <Zap className="size-2.5 text-amber-500" /> Test Key
                                </>
                              )}
                            </Button>
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              className="h-6 w-6 text-muted-foreground hover:text-destructive"
                              onClick={() => handleRemovePoolKey(item.id)}
                              title="Delete this key slot"
                            >
                              <Trash2 className="size-3" />
                            </Button>
                          </div>
                        </div>

                        <div className="grid grid-cols-[120px_1fr] gap-2">
                          <Input
                            value={item.label}
                            onChange={(e) =>
                              handleUpdatePoolKey(item.id, { label: e.target.value })
                            }
                            placeholder="Key label"
                            className="h-8 text-xs font-medium"
                          />
                          <Input
                            type="password"
                            value={item.key}
                            onChange={(e) =>
                              handleUpdatePoolKey(item.id, { key: e.target.value })
                            }
                            placeholder="AIzaSy... (Free API Key)"
                            className="h-8 text-xs font-mono"
                          />
                        </div>

                        {testState && (
                          <div
                            className={cn(
                              "text-[10px] px-2 py-0.5 rounded flex items-center gap-1 font-mono",
                              testState.status === "testing" && "text-muted-foreground bg-muted/40",
                              testState.status === "success" &&
                                "text-emerald-600 dark:text-emerald-400 bg-emerald-500/10",
                              testState.status === "error" &&
                                "text-destructive bg-destructive/10",
                            )}
                          >
                            {testState.status === "testing" ? (
                              <Loader2 className="size-2.5 animate-spin" />
                            ) : testState.status === "success" ? (
                              <CheckCircle2 className="size-2.5" />
                            ) : (
                              <XCircle className="size-2.5" />
                            )}
                            <span className="truncate">{testState.message}</span>
                          </div>
                        )}
                      </div>
                    );
                  })}

                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="w-full text-xs border-dashed gap-1 text-muted-foreground hover:text-foreground"
                    onClick={handleAddPoolKey}
                  >
                    <Plus className="size-3.5" /> Add Another Free Key Slot
                  </Button>
                </div>
              )}
            </div>

            {/* Emergency Paid Fallback Section */}
            <div className="space-y-3 pt-3 border-t border-border/70">
              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <Label className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                    <span className="inline-block h-2 w-2 rounded-full bg-blue-500" />
                    Emergency Paid Gemini Key (Last Resort Fallback)
                  </Label>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="h-6 px-2 text-[10px] gap-1"
                    onClick={() => handleTestSingleKey("paid-primary", paidPrimaryKey)}
                    disabled={
                      keyTestState["paid-primary"]?.status === "testing" ||
                      paidPrimaryKey.trim().length < 5
                    }
                  >
                    {keyTestState["paid-primary"]?.status === "testing" ? (
                      <>
                        <Loader2 className="size-2.5 animate-spin" /> Testing
                      </>
                    ) : keyTestState["paid-primary"]?.status === "success" ? (
                      <>
                        <CheckCircle2 className="size-2.5 text-emerald-500" /> Pass
                      </>
                    ) : keyTestState["paid-primary"]?.status === "error" ? (
                      <>
                        <XCircle className="size-2.5 text-destructive" /> Retry
                      </>
                    ) : (
                      <>
                        <Zap className="size-2.5 text-blue-500" /> Test Key
                      </>
                    )}
                  </Button>
                </div>
                <Input
                  type="password"
                  value={paidPrimaryKey}
                  onChange={(event) => setPaidPrimaryKey(event.target.value)}
                  placeholder="AIza... (Untouched unless all free keys fail)"
                />
                {keyTestState["paid-primary"] && (
                  <div
                    className={cn(
                      "text-[10px] px-2 py-0.5 rounded flex items-center gap-1 font-mono",
                      keyTestState["paid-primary"].status === "testing" && "text-muted-foreground bg-muted/40",
                      keyTestState["paid-primary"].status === "success" &&
                        "text-emerald-600 dark:text-emerald-400 bg-emerald-500/10",
                      keyTestState["paid-primary"].status === "error" &&
                        "text-destructive bg-destructive/10",
                    )}
                  >
                    {keyTestState["paid-primary"].status === "testing" ? (
                      <Loader2 className="size-2.5 animate-spin" />
                    ) : keyTestState["paid-primary"].status === "success" ? (
                      <CheckCircle2 className="size-2.5" />
                    ) : (
                      <XCircle className="size-2.5" />
                    )}
                    <span className="truncate">{keyTestState["paid-primary"].message}</span>
                  </div>
                )}
                <p className="text-[11px] text-muted-foreground leading-relaxed">
                  Strictly used as the absolute last resort only after every single free key in the pool above fails or returns 429 quota exhaustion.
                </p>
                <p className="text-[11px] text-blue-600 dark:text-blue-400 font-medium leading-relaxed">
                  💡 Tip: Google pools free tier quotas per Google Cloud Project (20 req/day). Create each key in a separate Google Cloud Project to give each key its own independent quota.
                </p>
              </div>

              {/* Optional Secondary Paid Backup */}
              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <Label className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
                    <span className="inline-block h-2 w-2 rounded-full bg-purple-500" />
                    Secondary Paid Key (Optional Backup)
                  </Label>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="h-6 px-2 text-[10px] gap-1"
                    onClick={() => handleTestSingleKey("paid-secondary", paidSecondaryKey)}
                    disabled={
                      keyTestState["paid-secondary"]?.status === "testing" ||
                      paidSecondaryKey.trim().length < 5
                    }
                  >
                    {keyTestState["paid-secondary"]?.status === "testing" ? (
                      <>
                        <Loader2 className="size-2.5 animate-spin" /> Testing
                      </>
                    ) : keyTestState["paid-secondary"]?.status === "success" ? (
                      <>
                        <CheckCircle2 className="size-2.5 text-purple-500" /> Pass
                      </>
                    ) : keyTestState["paid-secondary"]?.status === "error" ? (
                      <>
                        <XCircle className="size-2.5 text-destructive" /> Retry
                      </>
                    ) : (
                      <>
                        <Zap className="size-2.5 text-purple-500" /> Test Key
                      </>
                    )}
                  </Button>
                </div>
                <Input
                  type="password"
                  value={paidSecondaryKey}
                  onChange={(event) => setPaidSecondaryKey(event.target.value)}
                  placeholder="AIza... (Optional backup if primary emergency key fails)"
                />
              </div>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>Gemini Model</Label>
            <Input
              value={model}
              onChange={(e) => setModel(e.target.value)}
              placeholder="gemini-3.8-flash"
            />
            <div className="flex flex-wrap gap-1 pt-1">
              {meta.models.map((suggestion) => (
                <button
                  key={suggestion}
                  type="button"
                  onClick={() => setModel(suggestion)}
                  className={cn(
                    "rounded-md border px-1.5 py-0.5 text-[11px] transition-colors",
                    model === suggestion
                      ? "border-blue-500 bg-blue-500/10 text-blue-600 dark:text-blue-400 font-semibold"
                      : "border-border text-muted-foreground hover:text-foreground",
                  )}
                >
                  {suggestion}
                </button>
              ))}
            </div>
          </div>

          <div className="flex items-center justify-between rounded-lg border border-border px-3 py-2">
            <div>
              <p className="text-sm font-medium">Make Google Gemini Active</p>
              <p className="text-xs text-muted-foreground">
                All marking, essays, and Essay Grader route through Gemini.
              </p>
            </div>
            <Switch checked={activateNow} onCheckedChange={setActivateNow} />
          </div>

          <Button
            className="w-full bg-blue-600 hover:bg-blue-700 text-white"
            onClick={() => saveMutation.mutate()}
            disabled={saveMutation.isPending || (!hasValidPaid && !hasValidPool)}
          >
            {saveMutation.isPending ? <Loader2 className="size-4 animate-spin mr-2" /> : null}
            Save Google Gemini Configuration
          </Button>
        </div>
      </section>

      <section className="space-y-3">
        <div className="panel flex flex-wrap items-center justify-between gap-3 rounded-xl border border-blue-500/20 bg-blue-500/5 p-4">
          <div>
            <p className="text-sm font-semibold flex items-center gap-2">
              <span className="size-2 rounded-full bg-blue-500" />
              Active Chat Engine:{" "}
              {activeKey
                ? `${providerMeta(activeKey.provider).label} · ${activeKey.model}`
                : "Marginalite AI (built in)"}
            </p>
            <p className="text-xs text-muted-foreground mt-0.5">
              {isGoogleActive
                ? "Google Gemini is currently active and processing all essay evaluation."
                : "A different provider or built-in gateway is currently active."}
            </p>
          </div>
          {isGoogleActive && (
            <Button variant="outline" size="sm" onClick={() => activateMutation.mutate(null)}>
              <Plug className="size-4 mr-1.5" /> Switch back to Marginalite AI
            </Button>
          )}
        </div>

        {keys.isLoading ? <Skeleton className="h-28 w-full" /> : null}

        {googleKeys.map((row) => (
          <div key={row.id} className="panel rounded-xl border border-border p-4 shadow-xs">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="flex items-center gap-2 text-sm font-medium">
                  {row.label}
                  {row.isActive ? (
                    <Badge className="gap-1 bg-emerald-600 text-white">
                      <CheckCircle2 className="size-3" /> Active (Serving)
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="text-[10px] text-blue-500 border-blue-500/30">
                      Standby Pool
                    </Badge>
                  )}
                </p>
                <p className="mt-1 text-xs text-muted-foreground font-mono">
                  {providerMeta(row.provider).label} · {row.model} · {row.maskedKey}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => testMutation.mutate(row.id)}
                  disabled={testMutation.isPending}
                >
                  {testMutation.isPending ? <Loader2 className="size-4 animate-spin" /> : null}
                  Test
                </Button>
                {row.isActive ? null : (
                  <Button size="sm" onClick={() => activateMutation.mutate(row.id)}>
                    Use this
                  </Button>
                )}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setRotateValue("");
                    setRotatingId(rotatingId === row.id ? null : row.id);
                  }}
                >
                  <RefreshCw className="size-4 mr-1" /> Rotate
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => deleteMutation.mutate(row.id)}
                  aria-label={`Delete ${row.label}`}
                >
                  <Trash2 className="size-4 text-muted-foreground hover:text-destructive" />
                </Button>
              </div>
            </div>

            {rotatingId === row.id ? (
              <div className="mt-3 space-y-2 rounded-lg border border-border p-3 bg-muted/20">
                <div className="flex items-center justify-between">
                  <Label htmlFor={`rotate-${row.id}`} className="text-xs">New Gemini API key</Label>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="h-6 px-2 text-[10px] gap-1"
                    onClick={() => handleTestSingleKey(`rotate-${row.id}`, rotateValue)}
                    disabled={
                      keyTestState[`rotate-${row.id}`]?.status === "testing" ||
                      rotateValue.trim().length < 5
                    }
                  >
                    Test Key
                  </Button>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Input
                    id={`rotate-${row.id}`}
                    type="password"
                    className="min-w-48 flex-1"
                    value={rotateValue}
                    onChange={(event) => setRotateValue(event.target.value)}
                    placeholder="AIza..."
                  />
                  <Button
                    onClick={() => rotateMutation.mutate({ id: row.id, apiKey: rotateValue })}
                    disabled={rotateMutation.isPending || rotateValue.trim().length < 8}
                  >
                    Save Key
                  </Button>
                </div>
              </div>
            ) : null}
          </div>
        ))}

        {googleKeys.length === 0 && !keys.isLoading && (
          <div className="rounded-xl border border-dashed border-border p-6 text-center">
            <Sparkles className="size-8 mx-auto text-muted-foreground/50 mb-2" />
            <p className="text-sm font-medium">No Google Gemini keys configured yet.</p>
            <p className="text-xs text-muted-foreground mt-1">
              Add your Google AI Studio keys on the left to activate high-speed free tier rotation.
            </p>
          </div>
        )}
      </section>
    </div>
    </div>
  );
}

function MultiProviderPanel({
  onSwitchToGemini,
}: {
  onSwitchToGemini?: () => void;
}) {
  const queryClient = useQueryClient();
  const list = useServerFn(listProviderKeys);
  const save = useServerFn(saveProviderKey);
  const activate = useServerFn(activateProviderKey);
  const remove = useServerFn(deleteProviderKey);
  const test = useServerFn(testProviderKey);
  const testSpecific = useServerFn(testSpecificKey);
  const rotate = useServerFn(rotateProviderKey);
  const fetchModels = useServerFn(fetchProviderModels);
  const getSettingsFn = useServerFn(adminGetSettings);
  const toggleBypassFn = useServerFn(toggleGeminiBypass);

  const keys = useQuery({
    queryKey: ["provider-keys", "chat"],
    queryFn: () => list({ data: { purpose: "chat" } }),
  });

  const settingsQuery = useQuery({
    queryKey: ["admin-settings"],
    queryFn: () => getSettingsFn(),
  });

  const toggleBypassMutation = useMutation({
    mutationFn: (backupOnly: boolean) => toggleBypassFn({ data: { backupOnly } }),
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ["admin-settings"] });
      queryClient.invalidateQueries({ queryKey: ["provider-keys"] });
      if (res.backupOnly) {
        toast.warning(
          `Google Gemini is now SWITCHED OFF. Platform is running exclusively on backup provider: ${res.activeBackupLabel || res.activeBackupProvider || "External"} (${res.activeBackupModel || "default model"}).`,
          { duration: 6000 },
        );
      } else {
        toast.success("Google Gemini restored as primary AI engine.");
      }
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const isBypassActive = settingsQuery.data?.aiBackupOnly ?? false;

  type PoolKeyItem = {
    id: string;
    key: string;
    label: string;
    priority: number;
  };

  const [provider, setProvider] = useState<string>("groq");
  const [label, setLabel] = useState("");
  const [paidPrimaryKey, setPaidPrimaryKey] = useState("");
  const [paidSecondaryKey, setPaidSecondaryKey] = useState("");
  const [poolKeys, setPoolKeys] = useState<PoolKeyItem[]>([
    { id: "pool-1", key: "", label: "Primary Key", priority: 1 },
  ]);
  const [bulkInput, setBulkInput] = useState("");
  const [showBulkInput, setShowBulkInput] = useState(false);
  const [keyTestState, setKeyTestState] = useState<
    Record<string, { status: "testing" | "success" | "error"; message: string }>
  >({});
  const [model, setModel] = useState("llama-3.1-8b-instant");
  const [baseUrl, setBaseUrl] = useState("");
  const [activateNow, setActivateNow] = useState(true);
  const [rotatingId, setRotatingId] = useState<string | null>(null);
  const [rotateValue, setRotateValue] = useState("");

  const [discoveredModels, setDiscoveredModels] = useState<string[]>([]);
  const [isDiscovering, setIsDiscovering] = useState(false);

  const meta = providerMeta(provider);
  const refresh = () => queryClient.invalidateQueries({ queryKey: ["provider-keys", "chat"] });

  const handleSelectProvider = (provId: string) => {
    setProvider(provId);
    const newMeta = providerMeta(provId);
    const defaultModel = newMeta.models[0] ?? "";
    setModel(defaultModel);
    setBaseUrl("");
    setLabel(newMeta.label);
    setDiscoveredModels([]);
    setKeyTestState({});
  };

  const handleFetchLiveModels = async () => {
    const candidateKey =
      paidPrimaryKey.trim() ||
      paidSecondaryKey.trim() ||
      poolKeys.find((p) => p.key.trim().length > 5)?.key.trim() ||
      "";

    if (!candidateKey) {
      toast.error("Please enter an API key first to discover active models from your account.");
      return;
    }

    setIsDiscovering(true);
    try {
      const res = await fetchModels({
        data: {
          provider,
          apiKey: candidateKey,
          baseUrl: baseUrl || undefined,
        },
      });

      if (res.ok && Array.isArray(res.models) && res.models.length > 0) {
        setDiscoveredModels(res.models);
        toast.success(`Discovered ${res.models.length} active models from ${meta.label}!`);
      } else {
        toast.error((res as any).error || `No models could be retrieved from ${meta.label}. Check API key.`);
      }
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to fetch models");
    } finally {
      setIsDiscovering(false);
    }
  };

  const handleBulkImport = () => {
    const rawKeys = bulkInput
      .split(/[\n\r,;]+/)
      .map((k) => k.trim())
      .filter((k) => k.length > 5);
    if (rawKeys.length === 0) {
      toast.error("No valid keys found in paste input.");
      return;
    }
    setPoolKeys((prev) => {
      const existing = new Set(prev.map((p) => p.key.trim()));
      const newItems: PoolKeyItem[] = [];
      let nextPriority = prev.filter((p) => p.key.trim().length > 5).length + 1;
      for (const k of rawKeys) {
        if (!existing.has(k)) {
          newItems.push({
            id: `pool-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
            key: k,
            label: `Key ${nextPriority}`,
            priority: nextPriority++,
          });
        }
      }
      toast.success(`Imported ${newItems.length} keys into pool!`);
      const keepOld = prev.filter((p) => p.key.trim().length > 5);
      return keepOld.length > 0 ? [...keepOld, ...newItems] : newItems;
    });
    setBulkInput("");
    setShowBulkInput(false);
  };

  const handleAddPoolKey = () => {
    setPoolKeys((prev) => [
      ...prev,
      {
        id: `pool-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        key: "",
        label: `Key ${prev.length + 1}`,
        priority: prev.length + 1,
      },
    ]);
  };

  const handleRemovePoolKey = (id: string) => {
    setPoolKeys((prev) => {
      const next = prev.filter((item) => item.id !== id);
      return next.map((item, index) => ({
        ...item,
        priority: index + 1,
      }));
    });
  };

  const handleUpdatePoolKey = (id: string, updates: Partial<PoolKeyItem>) => {
    setPoolKeys((prev) =>
      prev.map((item) => (item.id === id ? { ...item, ...updates } : item)),
    );
  };

  const handleMovePoolKey = (index: number, direction: "up" | "down") => {
    setPoolKeys((prev) => {
      const targetIndex = direction === "up" ? index - 1 : index + 1;
      if (targetIndex < 0 || targetIndex >= prev.length) return prev;
      const copy = [...prev];
      const [item] = copy.splice(index, 1);
      copy.splice(targetIndex, 0, item);
      return copy.map((k, idx) => ({
        ...k,
        priority: idx + 1,
      }));
    });
  };

  const handleTestSingleKey = async (slotId: string, keyValue: string) => {
    const trimmed = keyValue.trim();
    if (!trimmed || trimmed.length < 5) {
      toast.error("Please enter a valid key before testing");
      return;
    }
    setKeyTestState((prev) => ({
      ...prev,
      [slotId]: { status: "testing", message: `Connecting to ${meta.label}...` },
    }));

    const testModel = (model || meta.models[0] || "gpt-4o-mini").trim();
    try {
      const res = await testSpecific({
        data: {
          provider,
          apiKey: trimmed,
          model: testModel,
          baseUrl: baseUrl || undefined,
        },
      });

      if (res.ok) {
        setKeyTestState((prev) => ({
          ...prev,
          [slotId]: {
            status: "success",
            message: `Passed (${res.model}) · ${res.latencyMs}ms`,
          },
        }));

        if (res.fallbackUsed && res.model !== testModel) {
          setModel(res.model);
          toast.success(
            `Key verified! (Auto-selected supported model "${res.model}" instead of unavailable "${testModel}")`,
          );
        } else {
          toast.success(`Key verified successfully with ${res.model} (${res.latencyMs}ms)`);
        }
      } else {
        setKeyTestState((prev) => ({
          ...prev,
          [slotId]: { status: "error", message: res.reply.slice(0, 75) },
        }));
        toast.error(`Key test failed: ${res.reply}`);
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Key test failed";
      setKeyTestState((prev) => ({
        ...prev,
        [slotId]: { status: "error", message: message.slice(0, 75) },
      }));
      toast.error(message);
    }
  };

  const saveMutation = useMutation({
    mutationFn: () => {
      const validPool = poolKeys
        .filter((k) => k.key.trim().length > 5)
        .map((k, index) => ({
          key: k.key.trim(),
          label: k.label.trim() || `Key ${index + 1}`,
          priority: k.priority || index + 1,
        }));

      const primaryPaid = paidPrimaryKey.trim();
      const secondaryPaid = paidSecondaryKey.trim();

      const payload = {
        freeKeys: validPool.map((k) => k.key),
        paidKeys: [primaryPaid, secondaryPaid].filter(Boolean),
        paidPrimary: primaryPaid,
        paidSecondary: secondaryPaid,
        budgetPool: validPool,
      };

      const finalKey = JSON.stringify(payload);

      return save({
        data: {
          provider: provider as never,
          label: label || meta.label,
          apiKey: finalKey,
          baseUrl,
          model: model || meta.models[0] || "",
          activate: activateNow,
        },
      });
    },
    onSuccess: async () => {
      toast.success(`${meta.label} configuration saved. Platform AI features ready immediately.`);
      setPaidPrimaryKey("");
      setPaidSecondaryKey("");
      setPoolKeys([{ id: "pool-1", key: "", label: "Primary Key", priority: 1 }]);
      setKeyTestState({});
      setLabel("");
      await refresh();
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const activateMutation = useMutation({
    mutationFn: (id: string | null) => activate({ data: { id } }),
    onSuccess: async () => {
      toast.success("Active provider updated.");
      await refresh();
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => remove({ data: { id } }),
    onSuccess: async () => {
      toast.success("Key removed.");
      await refresh();
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const testMutation = useMutation({
    mutationFn: (id: string) => test({ data: { id } }),
    onSuccess: (result) =>
      result.ok
        ? toast.success(`Key works — ${result.model} replied "${result.reply}"`)
        : toast.error(result.reply),
    onError: (error: Error) => toast.error(error.message),
  });

  const rotateMutation = useMutation({
    mutationFn: (input: { id: string; apiKey: string }) => rotate({ data: input }),
    onSuccess: async () => {
      toast.success("Key rotated successfully.");
      setRotatingId(null);
      setRotateValue("");
      await refresh();
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const allChatKeys = keys.data ?? [];
  const multiProviderKeys = allChatKeys.filter(
    (row) => row.provider !== "google" && row.provider !== "lovable",
  );
  const activeKey = allChatKeys.find((row) => row.isActive);
  const hasValidPaid = paidPrimaryKey.trim().length >= 8;
  const hasValidPool = poolKeys.some((k) => k.key.trim().length >= 8);

  const EXTERNAL_PROVIDERS = AI_PROVIDERS.filter(
    (p) => p.id !== "google" && p.id !== "lovable",
  );

  return (
    <div className="space-y-4">
      {/* ── Status Banner: Multi-Provider Standby vs Live Primary ── */}
      <div
        className={cn(
          "rounded-xl border p-4 transition-all flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4",
          isBypassActive
            ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-950 dark:text-emerald-200"
            : "border-border/80 bg-card p-4",
        )}
      >
        <div className="flex items-start gap-3">
          <div
            className={cn(
              "rounded-lg p-2 mt-0.5",
              isBypassActive
                ? "bg-emerald-500/20 text-emerald-600 dark:text-emerald-400"
                : "bg-muted text-muted-foreground",
            )}
          >
            <Cpu className="size-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-semibold text-sm">
                {isBypassActive
                  ? "⚡ Backup Platform is LIVE (Serving 100% of Platform Traffic)"
                  : "Multi-Provider Standby & Hot Failover Platform"}
              </span>
              <Badge
                variant="outline"
                className={
                  isBypassActive
                    ? "border-emerald-500/40 bg-emerald-500/20 text-emerald-600 dark:text-emerald-300"
                    : "border-border text-muted-foreground"
                }
              >
                {isBypassActive ? "Active Primary Engine" : "Standby Backup"}
              </Badge>
            </div>
            <p className="mt-1 text-xs opacity-90 max-w-2xl leading-relaxed">
              {isBypassActive
                ? "Google Gemini is switched off. All student essay evaluations, Essay Grader checks, and prompts are currently powered exclusively by your configured external keys below."
                : "Google Gemini is currently handling primary traffic. Providers configured here (Groq, OpenRouter, Mistral, xAI Grok, etc.) serve as instant hot failover backups. You can also switch Gemini off to test this platform directly."}
            </p>
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-2">
          {isBypassActive ? (
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={toggleBypassMutation.isPending}
              onClick={() => toggleBypassMutation.mutate(false)}
              className="gap-1.5"
            >
              <Sparkles className="size-4 text-blue-500" />
              Restore Gemini as Primary
            </Button>
          ) : (
            <Button
              type="button"
              variant="default"
              size="sm"
              disabled={toggleBypassMutation.isPending}
              onClick={() => toggleBypassMutation.mutate(true)}
              className="gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-medium"
            >
              <Cpu className="size-4" />
              Switch Off Gemini & Run on This Hub
            </Button>
          )}
        </div>
      </div>

      <div className="grid gap-5 lg:grid-cols-[480px_1fr]">
      <section className="panel rounded-xl border border-emerald-500/20 bg-card p-5 shadow-xs">
        <div className="flex items-center justify-between border-b border-border/60 pb-3">
          <h2 className="flex items-center gap-2 text-sm font-semibold text-foreground">
            <Cpu className="size-4 text-emerald-500" /> Multi-Provider LLM Platform
          </h2>
          <div className="flex items-center gap-1.5">
            {onSwitchToGemini && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={onSwitchToGemini}
                className="h-6 px-2 text-[11px] text-muted-foreground hover:text-foreground gap-1"
              >
                <Sparkles className="size-3 text-blue-500" />
                Google Gemini &rarr;
              </Button>
            )}
            <Badge variant="outline" className="text-[10px] text-emerald-600 dark:text-emerald-400 border-emerald-500/30">
              Universal Hub
            </Badge>
          </div>
        </div>
        <p className="mt-2 text-xs text-muted-foreground leading-relaxed">
          Plug in Groq, xAI Grok, OpenRouter, Anthropic, OpenAI, Mistral, DeepSeek, or any custom OpenAI-compatible endpoint. Features live model discovery, auto-healing 404 fallbacks, and multi-key pooling.
        </p>

        {/* Provider Selector Quick Bar */}
        <div className="mt-4 space-y-1.5">
          <Label className="text-xs font-medium">Select Provider</Label>
          <div className="grid grid-cols-4 gap-1.5">
            {EXTERNAL_PROVIDERS.map((p) => {
              const isSelected = provider === p.id;
              return (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => handleSelectProvider(p.id)}
                  className={cn(
                    "flex flex-col items-center justify-center p-2 rounded-lg border text-xs transition-all",
                    isSelected
                      ? "border-emerald-500 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 font-semibold shadow-xs"
                      : "border-border/70 hover:bg-muted/70 text-muted-foreground hover:text-foreground",
                  )}
                >
                  <span className="truncate w-full text-center">{p.label.split(" ")[0]}</span>
                </button>
              );
            })}
          </div>
        </div>

        <div className="mt-4 space-y-3.5">
          <div className="space-y-1.5">
            <Label>Configuration Label</Label>
            <Input
              value={label}
              onChange={(event) => setLabel(event.target.value)}
              placeholder={meta.label}
            />
          </div>

          {/* Model Specification & Live Discovery */}
          <div className="space-y-2 rounded-xl border border-border/80 bg-muted/20 p-3">
            <div className="flex items-center justify-between">
              <Label className="text-xs font-semibold flex items-center gap-1.5">
                <span className="inline-block h-2 w-2 rounded-full bg-emerald-500" />
                Target Model
              </Label>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-6 px-2 text-[10px] gap-1 text-emerald-600 dark:text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/10"
                onClick={handleFetchLiveModels}
                disabled={isDiscovering}
              >
                {isDiscovering ? (
                  <>
                    <Loader2 className="size-2.5 animate-spin" /> Fetching...
                  </>
                ) : (
                  <>
                    <Zap className="size-2.5" /> Fetch Live Models
                  </>
                )}
              </Button>
            </div>

            <Input
              value={model}
              onChange={(event) => setModel(event.target.value)}
              placeholder={meta.models?.[0] ?? "model-id"}
              className="font-mono text-xs"
            />

            {/* Clickable Recommended Presets */}
            {(meta.models?.length ?? 0) > 0 && (
              <div className="space-y-1 pt-1">
                <span className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold">
                  Recommended Models:
                </span>
                <div className="flex flex-wrap gap-1">
                  {(meta.models ?? []).map((suggestion) => (
                    <button
                      key={suggestion}
                      type="button"
                      onClick={() => setModel(suggestion)}
                      className={cn(
                        "rounded-md border px-1.5 py-0.5 text-[11px] transition-colors font-mono",
                        model === suggestion
                          ? "border-emerald-500 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-semibold"
                          : "border-border text-muted-foreground hover:text-foreground",
                      )}
                    >
                      {suggestion}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Dynamically Fetched Live Models from Provider */}
            {discoveredModels.length > 0 && (
              <div className="space-y-1.5 pt-2 border-t border-border/60">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold uppercase tracking-wider">
                    Verified Account Models ({discoveredModels.length}):
                  </span>
                  <span className="text-[10px] text-muted-foreground">Click to select</span>
                </div>
                <div className="max-h-32 overflow-y-auto flex flex-wrap gap-1 p-1 bg-background rounded-md border border-border/80">
                  {discoveredModels.map((m) => (
                    <button
                      key={m}
                      type="button"
                      onClick={() => setModel(m)}
                      className={cn(
                        "rounded px-1.5 py-0.5 text-[10px] font-mono border transition-colors",
                        model === m
                          ? "bg-emerald-500 text-white border-emerald-600 font-medium"
                          : "border-border/60 hover:bg-muted text-foreground",
                      )}
                    >
                      {m}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Base URL (if custom or overriding) */}
          <div className="space-y-1.5">
            <Label className="text-xs">
              Base URL <span className="text-muted-foreground">(optional override)</span>
            </Label>
            <Input
              value={baseUrl}
              onChange={(event) => setBaseUrl(event.target.value)}
              placeholder={meta.baseUrl || "https://api.your-provider.com/v1"}
              className="font-mono text-xs"
            />
          </div>

          {/* Keys Pool Section */}
          <div className="space-y-4 rounded-xl border border-border/80 bg-muted/20 p-3.5">
            <div className="space-y-2.5">
              <div className="flex items-center justify-between">
                <div>
                  <Label className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                    <span className="inline-block h-2 w-2 rounded-full bg-emerald-500" />
                    {meta.label} API Keys
                  </Label>
                  <p className="text-[11px] text-muted-foreground mt-0.5">
                    Add single or multiple keys for automated load balancing and failover.
                  </p>
                </div>
                <div className="flex items-center gap-1.5">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="h-6 px-2 text-[10px] gap-1"
                    onClick={() => setShowBulkInput(!showBulkInput)}
                  >
                    <Clipboard className="size-2.5" />
                    {showBulkInput ? "Hide Bulk" : "Bulk Paste"}
                  </Button>
                </div>
              </div>

              {showBulkInput && (
                <div className="rounded-lg border border-amber-500/30 bg-amber-500/5 p-2.5 space-y-2">
                  <Label className="text-[11px] font-medium text-amber-700 dark:text-amber-300">
                    Paste Multiple {meta.label} Keys (one per line or comma-separated):
                  </Label>
                  <Textarea
                    rows={3}
                    value={bulkInput}
                    onChange={(e) => setBulkInput(e.target.value)}
                    placeholder={meta.keyHint}
                    className="font-mono text-xs bg-background"
                  />
                  <div className="flex justify-end gap-1.5">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="h-6 px-2 text-[11px]"
                      onClick={() => setShowBulkInput(false)}
                    >
                      Cancel
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      className="h-6 px-2.5 text-[11px]"
                      onClick={handleBulkImport}
                    >
                      Import Keys
                    </Button>
                  </div>
                </div>
              )}

              <div className="space-y-2">
                {poolKeys.map((item, index) => {
                  const testState = keyTestState[item.id];
                  return (
                    <div
                      key={item.id}
                      className="rounded-lg border border-border/80 bg-background/60 p-2.5 space-y-2 shadow-xs"
                    >
                      <div className="flex items-center justify-between gap-1.5">
                        <div className="flex items-center gap-1.5">
                          <Badge variant="outline" className="text-[10px] font-mono">
                            #{item.priority || index + 1}
                          </Badge>
                          <span className="text-xs font-medium text-foreground">
                            {item.label || `Key ${index + 1}`}
                          </span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6"
                            onClick={() => handleMovePoolKey(index, "up")}
                            disabled={index === 0}
                            title="Move up"
                          >
                            <ArrowUp className="size-3" />
                          </Button>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6"
                            onClick={() => handleMovePoolKey(index, "down")}
                            disabled={index === poolKeys.length - 1}
                            title="Move down"
                          >
                            <ArrowDown className="size-3" />
                          </Button>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            className="h-6 px-2 text-[10px] gap-1"
                            onClick={() => handleTestSingleKey(item.id, item.key)}
                            disabled={testState?.status === "testing" || item.key.trim().length < 5}
                          >
                            {testState?.status === "testing" ? (
                              <>
                                <Loader2 className="size-2.5 animate-spin" /> Testing
                              </>
                            ) : testState?.status === "success" ? (
                              <>
                                <CheckCircle2 className="size-2.5 text-emerald-500" /> Pass
                              </>
                            ) : testState?.status === "error" ? (
                              <>
                                <XCircle className="size-2.5 text-destructive" /> Retry
                              </>
                            ) : (
                              <>
                                <Zap className="size-2.5 text-emerald-500" /> Test Key
                              </>
                            )}
                          </Button>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6 text-muted-foreground hover:text-destructive"
                            onClick={() => handleRemovePoolKey(item.id)}
                            title="Remove key"
                          >
                            <Trash2 className="size-3" />
                          </Button>
                        </div>
                      </div>

                      <div className="grid grid-cols-[120px_1fr] gap-2">
                        <Input
                          value={item.label}
                          onChange={(e) =>
                            handleUpdatePoolKey(item.id, { label: e.target.value })
                          }
                          placeholder="Key label"
                          className="h-8 text-xs font-medium"
                        />
                        <Input
                          type="password"
                          value={item.key}
                          onChange={(e) =>
                            handleUpdatePoolKey(item.id, { key: e.target.value })
                          }
                          placeholder={meta.keyHint}
                          className="h-8 text-xs font-mono"
                        />
                      </div>

                      {testState && (
                        <div
                          className={cn(
                            "text-[10px] px-2 py-0.5 rounded flex items-center gap-1 font-mono",
                            testState.status === "testing" && "text-muted-foreground bg-muted/40",
                            testState.status === "success" &&
                              "text-emerald-600 dark:text-emerald-400 bg-emerald-500/10",
                            testState.status === "error" &&
                              "text-destructive bg-destructive/10",
                          )}
                        >
                          {testState.status === "testing" ? (
                            <Loader2 className="size-2.5 animate-spin" />
                          ) : testState.status === "success" ? (
                            <CheckCircle2 className="size-2.5" />
                          ) : (
                            <XCircle className="size-2.5" />
                          )}
                          <span className="truncate">{testState.message}</span>
                        </div>
                      )}
                    </div>
                  );
                })}

                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="w-full text-xs border-dashed gap-1 text-muted-foreground hover:text-foreground"
                  onClick={handleAddPoolKey}
                >
                  <Plus className="size-3.5" /> Add Another Key Slot
                </Button>
              </div>
            </div>

            {/* Dedicated Primary / Backup Key Section */}
            <div className="space-y-3 pt-3 border-t border-border/70">
              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <Label className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                    <span className="inline-block h-2 w-2 rounded-full bg-emerald-500" />
                    Dedicated Primary / Backup Key (Optional)
                  </Label>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="h-6 px-2 text-[10px] gap-1"
                    onClick={() => handleTestSingleKey("paid-primary", paidPrimaryKey)}
                    disabled={
                      keyTestState["paid-primary"]?.status === "testing" ||
                      paidPrimaryKey.trim().length < 5
                    }
                  >
                    {keyTestState["paid-primary"]?.status === "testing" ? (
                      <>
                        <Loader2 className="size-2.5 animate-spin" /> Testing
                      </>
                    ) : keyTestState["paid-primary"]?.status === "success" ? (
                      <>
                        <CheckCircle2 className="size-2.5 text-emerald-500" /> Pass
                      </>
                    ) : keyTestState["paid-primary"]?.status === "error" ? (
                      <>
                        <XCircle className="size-2.5 text-destructive" /> Retry
                      </>
                    ) : (
                      <>
                        <Zap className="size-2.5 text-emerald-500" /> Test Key
                      </>
                    )}
                  </Button>
                </div>
                <Input
                  type="password"
                  value={paidPrimaryKey}
                  onChange={(event) => setPaidPrimaryKey(event.target.value)}
                  placeholder={meta.keyHint}
                  className="font-mono text-xs"
                />
                {keyTestState["paid-primary"] && (
                  <div
                    className={cn(
                      "text-[10px] px-2 py-0.5 rounded flex items-center gap-1 font-mono",
                      keyTestState["paid-primary"].status === "testing" && "text-muted-foreground bg-muted/40",
                      keyTestState["paid-primary"].status === "success" &&
                        "text-emerald-600 dark:text-emerald-400 bg-emerald-500/10",
                      keyTestState["paid-primary"].status === "error" &&
                        "text-destructive bg-destructive/10",
                    )}
                  >
                    {keyTestState["paid-primary"].status === "testing" ? (
                      <Loader2 className="size-2.5 animate-spin" />
                    ) : keyTestState["paid-primary"].status === "success" ? (
                      <CheckCircle2 className="size-2.5" />
                    ) : (
                      <XCircle className="size-2.5" />
                    )}
                    <span className="truncate">{keyTestState["paid-primary"].message}</span>
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between rounded-lg border border-border px-3 py-2">
            <div>
              <p className="text-sm font-medium">Make {meta.label} Active</p>
              <p className="text-xs text-muted-foreground">
                Marks, essays, and coaching will immediately route through {meta.label}.
              </p>
            </div>
            <Switch checked={activateNow} onCheckedChange={setActivateNow} />
          </div>

          <Button
            className="w-full bg-emerald-600 hover:bg-emerald-700 text-white"
            onClick={() => saveMutation.mutate()}
            disabled={saveMutation.isPending || (!hasValidPaid && !hasValidPool)}
          >
            {saveMutation.isPending ? <Loader2 className="size-4 animate-spin mr-2" /> : null}
            Save {meta.label} Configuration
          </Button>
        </div>
      </section>

      <section className="space-y-3">
        <div className="panel flex flex-wrap items-center justify-between gap-3 rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-4">
          <div>
            <p className="text-sm font-semibold flex items-center gap-2">
              <span className="size-2 rounded-full bg-emerald-500" />
              Currently Serving:{" "}
              {activeKey
                ? `${providerMeta(activeKey.provider).label} · ${activeKey.model}`
                : "Marginalite AI (built in)"}
            </p>
            <p className="text-xs text-muted-foreground mt-0.5">
              {activeKey
                ? `System is routing inference calls through ${providerMeta(activeKey.provider).label}.`
                : "Using built-in system gateway."}
            </p>
          </div>
          {activeKey ? (
            <Button variant="outline" size="sm" onClick={() => activateMutation.mutate(null)}>
              <Plug className="size-4 mr-1.5" /> Switch to Built-in AI
            </Button>
          ) : null}
        </div>

        {keys.isLoading ? <Skeleton className="h-28 w-full" /> : null}

        {multiProviderKeys.map((row) => (
          <div key={row.id} className="panel rounded-xl border border-border p-4 shadow-xs">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="flex items-center gap-2 text-sm font-medium">
                  {row.label}
                  {row.isActive ? (
                    <Badge className="gap-1 bg-emerald-600 text-white">
                      <CheckCircle2 className="size-3" /> Active (Primary)
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="text-[10px] text-emerald-500 border-emerald-500/30">
                      Standby
                    </Badge>
                  )}
                </p>
                <p className="mt-1 text-xs text-muted-foreground font-mono">
                  {providerMeta(row.provider).label} · {row.model} · {row.maskedKey}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => testMutation.mutate(row.id)}
                  disabled={testMutation.isPending}
                >
                  {testMutation.isPending ? <Loader2 className="size-4 animate-spin" /> : null}
                  Test
                </Button>
                {row.isActive ? null : (
                  <Button size="sm" onClick={() => activateMutation.mutate(row.id)}>
                    Use this
                  </Button>
                )}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setRotateValue("");
                    setRotatingId(rotatingId === row.id ? null : row.id);
                  }}
                >
                  <RefreshCw className="size-4 mr-1" /> Rotate
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => deleteMutation.mutate(row.id)}
                  aria-label={`Delete ${row.label}`}
                >
                  <Trash2 className="size-4 text-muted-foreground hover:text-destructive" />
                </Button>
              </div>
            </div>

            {rotatingId === row.id ? (
              <div className="mt-3 space-y-2 rounded-lg border border-border p-3 bg-muted/20">
                <div className="flex items-center justify-between">
                  <Label htmlFor={`rotate-${row.id}`} className="text-xs">
                    New API key for {providerMeta(row.provider).label}
                  </Label>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="h-6 px-2 text-[10px] gap-1"
                    onClick={() => handleTestSingleKey(`rotate-${row.id}`, rotateValue)}
                    disabled={
                      keyTestState[`rotate-${row.id}`]?.status === "testing" ||
                      rotateValue.trim().length < 5
                    }
                  >
                    Test Key
                  </Button>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Input
                    id={`rotate-${row.id}`}
                    type="password"
                    className="min-w-48 flex-1 font-mono text-xs"
                    value={rotateValue}
                    onChange={(event) => setRotateValue(event.target.value)}
                    placeholder={providerMeta(row.provider).keyHint}
                  />
                  <Button
                    onClick={() => rotateMutation.mutate({ id: row.id, apiKey: rotateValue })}
                    disabled={rotateMutation.isPending || rotateValue.trim().length < 8}
                  >
                    Save Key
                  </Button>
                </div>
              </div>
            ) : null}
          </div>
        ))}

        {multiProviderKeys.length === 0 && !keys.isLoading && (
          <div className="rounded-xl border border-dashed border-border p-6 text-center">
            <Cpu className="size-8 mx-auto text-muted-foreground/50 mb-2" />
            <p className="text-sm font-medium">No external providers configured yet.</p>
            <p className="text-xs text-muted-foreground mt-1">
              Select Groq, xAI, OpenRouter, Mistral, OpenAI, or Anthropic on the left to configure your API keys.
            </p>
          </div>
        )}
      </section>
    </div>
    </div>
  );
}

/**
 * Separate console section for embedding-purpose keys — deliberately its
 * own tab, own list, own active flag from the chat providers above, since
 * "which model marks essays" and "which model produces vectors for the
 * knowledge base" are independent choices that used to silently share one
 * setting. Multiple embedding keys can be saved at once; the Knowledge page
 * lets a specific ingestion job pick any of them, not just whichever is
 * flagged active here.
 */
function EmbeddingsPanel() {
  const queryClient = useQueryClient();
  const list = useServerFn(listProviderKeys);
  const save = useServerFn(saveProviderKey);
  const activate = useServerFn(activateProviderKey);
  const remove = useServerFn(deleteProviderKey);
  const test = useServerFn(testEmbeddingProviderKey);
  const rotate = useServerFn(rotateProviderKey);
  const reembedAll = useServerFn(reembedAllDocuments);
  const getDocuments = useServerFn(listDocuments);
  const embedBatch = useServerFn(embedNextBatch);

  const keys = useQuery({
    queryKey: ["provider-keys", "embedding"],
    queryFn: () => list({ data: { purpose: "embedding" } }),
  });

  // Drives every queued document's embedding to completion right here in
  // Admin, rather than requiring a separate trip to the Knowledge page.
  // Sequential (one document at a time, one batch at a time) on purpose:
  // embedNextBatch already batches internally, and running documents in
  // parallel would just race the same rate limits a free/shared embedding
  // key is most likely to hit.
  const [reembedProgress, setReembedProgress] = useState<{ done: number; total: number } | null>(
    null,
  );
  const reembedMutation = useMutation({
    mutationFn: async () => {
      const { queued } = await reembedAll();
      setReembedProgress({ done: 0, total: queued });
      const documents = await getDocuments();
      const toEmbed = documents.filter((doc) => doc.status !== "ready");
      let completed = 0;
      for (const doc of toEmbed) {
        let done = false;
        let guard = 0;
        while (!done && guard < 500) {
          guard += 1;
          const batch = await embedBatch({ data: { documentId: doc.id } });
          done = batch.done;
        }
        completed += 1;
        setReembedProgress({ done: completed, total: toEmbed.length });
      }
      return { reembedded: completed };
    },
    onSuccess: ({ reembedded }) => {
      toast.success(
        reembedded > 0
          ? `Re-embedded ${reembedded} document${reembedded === 1 ? "" : "s"} under the active embedding provider.`
          : "Nothing to re-embed — the knowledge base is empty.",
      );
      setReembedProgress(null);
      queryClient.invalidateQueries({ queryKey: ["documents"] });
    },
    onError: (error: Error) => {
      toast.error(error.message);
      setReembedProgress(null);
    },
  });

  const [provider, setProvider] = useState<string>(EMBEDDING_PROVIDERS[0]?.id ?? "google");
  const [label, setLabel] = useState("");
  const [apiKey, setApiKey] = useState("");
  const [model, setModel] = useState("");
  const [baseUrl, setBaseUrl] = useState("");
  const [activateNow, setActivateNow] = useState(true);
  const [rotatingId, setRotatingId] = useState<string | null>(null);
  const [rotateValue, setRotateValue] = useState("");
  const [discoveredModels, setDiscoveredModels] = useState<string[]>([]);
  const [isDiscovering, setIsDiscovering] = useState(false);
  const fetchModels = useServerFn(fetchProviderModels);

  const meta = providerMeta(provider);
  const embeddingModels = embeddingModelsFor(meta);
  const refresh = () => queryClient.invalidateQueries({ queryKey: ["provider-keys", "embedding"] });

  const handleFetchLiveModels = async () => {
    const candidateKey = (apiKey || "").split(/[\n\r,;]+/)[0]?.trim();
    if (!candidateKey || candidateKey.length < 5) {
      toast.error("Please enter an API key first to discover active embedding models from your account.");
      return;
    }
    setIsDiscovering(true);
    try {
      const res = await fetchModels({
        data: {
          provider,
          apiKey: candidateKey,
          baseUrl: baseUrl || undefined,
          purpose: "embedding",
        },
      });
      if (res.ok && Array.isArray(res.models) && res.models.length > 0) {
        setDiscoveredModels(res.models);
        toast.success(`Discovered ${res.models.length} active embedding models from ${meta.label}!`);
      } else {
        toast.error((res as any).error || `No embedding models could be retrieved from ${meta.label}. Check API key.`);
      }
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to fetch embedding models");
    } finally {
      setIsDiscovering(false);
    }
  };

  const saveMutation = useMutation({
    mutationFn: () =>
      save({
        data: {
          provider: provider as never,
          purpose: "embedding",
          label: label || `${meta.label} embeddings`,
          apiKey,
          baseUrl,
          model: model || embeddingModels[0] || "",
          activate: activateNow,
        },
      }),
    onSuccess: async () => {
      toast.success("Embedding key saved. Knowledge ingestion and retrieval will use it.");
      setApiKey("");
      setLabel("");
      await refresh();
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const activateMutation = useMutation({
    mutationFn: (id: string | null) => activate({ data: { id, purpose: "embedding" } }),
    onSuccess: async () => {
      toast.success("Active embedding provider updated.");
      await refresh();
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => remove({ data: { id } }),
    onSuccess: async () => {
      toast.success("Key removed.");
      await refresh();
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const testMutation = useMutation({
    mutationFn: (id: string) => test({ data: { id } }),
    onSuccess: (result) =>
      result.ok
        ? toast.success(
            `Key works — ${result.dimensions}-dimension vector in ${result.latencyMs}ms (${result.model})`,
          )
        : toast.error(result.error ?? "Test failed."),
    onError: (error: Error) => toast.error(error.message),
  });

  const rotateMutation = useMutation({
    mutationFn: (input: { id: string; apiKey: string }) => rotate({ data: input }),
    onSuccess: async () => {
      toast.success("Key rotated. The old secret no longer works here.");
      setRotatingId(null);
      setRotateValue("");
      await refresh();
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const activeKey = (keys.data ?? []).find((row) => row.isActive);

  return (
    <div className="grid gap-5 lg:grid-cols-[420px_1fr]">
      <section className="panel rounded-xl border border-border p-5">
        <h2 className="flex items-center gap-2 text-sm font-semibold">
          <KeyRound className="size-4 text-primary" /> Add an embedding key
        </h2>
        <p className="mt-1 text-xs text-muted-foreground">
          Only providers with a working embeddings endpoint are listed here — this is deliberately
          separate from the chat/marking providers, so switching one never silently changes the
          other. Accuracy of retrieval-grounded grading depends directly on this.
        </p>

        <div className="mt-4 space-y-3">
          <div className="space-y-1.5">
            <Label>Provider</Label>
            <Select
              value={provider}
              onValueChange={(value) => {
                setProvider(value);
                setModel(embeddingModelsFor(providerMeta(value))[0] ?? "");
                setBaseUrl("");
                setDiscoveredModels([]);
              }}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {EMBEDDING_PROVIDERS.map((item) => (
                  <SelectItem key={item.id} value={item.id}>
                    {item.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label>Name</Label>
            <Input
              value={label}
              onChange={(event) => setLabel(event.target.value)}
              placeholder={`${meta.label} embeddings`}
            />
          </div>

          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <Label>API Key(s)</Label>
              <span className="text-[10px] text-primary font-mono font-medium">Auto key-hopping</span>
            </div>
            <Textarea
              rows={2}
              value={apiKey}
              onChange={(event) => setApiKey(event.target.value)}
              placeholder={`${meta.keyHint} (one per line or comma-separated for automatic key hopping)`}
              className="font-mono text-xs"
            />
            <p className="text-[11px] text-muted-foreground">
              Enter one or multiple keys. During large ingestion or batch retrieval, rate-limited keys (429/503) automatically hop to the next active key.
            </p>
          </div>

          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <Label>Embedding model id</Label>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-6 text-[10px] text-primary gap-1 px-2"
                onClick={handleFetchLiveModels}
                disabled={isDiscovering}
              >
                {isDiscovering ? (
                  <>
                    <Loader2 className="size-2.5 animate-spin" /> Fetching...
                  </>
                ) : (
                  <>
                    <Zap className="size-2.5" /> Check Available Models
                  </>
                )}
              </Button>
            </div>
            <Input
              value={model}
              onChange={(event) => setModel(event.target.value)}
              placeholder={embeddingModels[0] ?? "model-id"}
              className="font-mono text-xs"
            />
            {/* Clickable Recommended Presets */}
            {embeddingModels.length ? (
              <div className="space-y-1 pt-1">
                <span className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold">
                  Recommended Presets:
                </span>
                <div className="flex flex-wrap gap-1">
                  {embeddingModels.map((suggestion: string) => (
                    <button
                      key={suggestion}
                      type="button"
                      onClick={() => setModel(suggestion)}
                      className={cn(
                        "rounded-md border px-1.5 py-0.5 text-[11px] font-mono transition-colors",
                        model === suggestion
                          ? "border-emerald-500 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-semibold"
                          : "border-border text-muted-foreground hover:text-foreground",
                      )}
                    >
                      {suggestion}
                    </button>
                  ))}
                </div>
              </div>
            ) : null}

            {/* Dynamically Fetched Live Models from Provider */}
            {discoveredModels.length > 0 && (
              <div className="space-y-1.5 pt-2 border-t border-border/60">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold uppercase tracking-wider">
                    Verified Account Models ({discoveredModels.length}):
                  </span>
                  <span className="text-[10px] text-muted-foreground">Click to select</span>
                </div>
                <div className="max-h-32 overflow-y-auto flex flex-wrap gap-1 p-1 bg-background rounded-md border border-border/80">
                  {discoveredModels.map((m) => (
                    <button
                      key={m}
                      type="button"
                      onClick={() => setModel(m)}
                      className={cn(
                        "rounded px-1.5 py-0.5 text-[10px] font-mono border transition-colors",
                        model === m
                          ? "bg-emerald-500 text-white border-emerald-600 font-medium"
                          : "border-border/60 hover:bg-muted text-foreground",
                      )}
                    >
                      {m}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="space-y-1.5">
            <Label>
              Base URL <span className="text-muted-foreground">(optional)</span>
            </Label>
            <Input
              value={baseUrl}
              onChange={(event) => setBaseUrl(event.target.value)}
              placeholder={meta.baseUrl || "https://your-endpoint/v1"}
            />
          </div>

          <div className="flex items-center justify-between rounded-lg border border-border px-3 py-2">
            <div>
              <p className="text-sm font-medium">Make active</p>
              <p className="text-xs text-muted-foreground">
                Default for knowledge ingestion and retrieval unless a call picks a different key.
              </p>
            </div>
            <Switch checked={activateNow} onCheckedChange={setActivateNow} />
          </div>

          <Button
            className="w-full"
            onClick={() => saveMutation.mutate()}
            disabled={saveMutation.isPending || apiKey.trim().length < 8}
          >
            {saveMutation.isPending ? <Loader2 className="size-4 animate-spin" /> : null}
            Save embedding key
          </Button>
        </div>
      </section>

      <section className="space-y-3">
        <div className="panel flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border p-4">
          <div>
            <p className="text-sm font-semibold">
              Currently embedding with:{" "}
              {activeKey
                ? `${providerMeta(activeKey.provider).label} · ${activeKey.model}`
                : "No embedding key configured yet"}
            </p>
            <p className="text-xs text-muted-foreground">
              {activeKey
                ? "Knowledge ingestion and retrieval-grounded grading use this by default."
                : "Add a key on the left — without one, embeddings will fail once the built-in gateway is unavailable."}
            </p>
            {reembedProgress ? (
              <p className="mt-1 text-xs font-medium text-primary">
                Re-embedding {reembedProgress.done}/{reembedProgress.total} documents…
              </p>
            ) : null}
          </div>
          <div className="flex items-center gap-2">
            {activeKey ? (
              <Button
                variant="outline"
                size="sm"
                onClick={() => reembedMutation.mutate()}
                disabled={reembedMutation.isPending}
                title="Switched embedding provider or model? Re-embed everything so the knowledge base is back in one consistent vector space."
              >
                {reembedMutation.isPending ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <RefreshCw className="size-4" />
                )}
                Re-embed knowledge base
              </Button>
            ) : null}
            {activeKey ? (
              <Button variant="outline" size="sm" onClick={() => activateMutation.mutate(null)}>
                <Plug className="size-4" /> Clear active embedding key
              </Button>
            ) : null}
          </div>
        </div>

        {keys.isLoading ? <Skeleton className="h-28 w-full" /> : null}

        {(keys.data ?? []).map((row) => (
          <div key={row.id} className="panel rounded-xl border border-border p-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="flex items-center gap-2 text-sm font-medium">
                  {row.label}
                  {row.isActive ? (
                    <Badge className="gap-1 bg-emerald-600 text-white">
                      <CheckCircle2 className="size-3" /> Active (Primary)
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="text-[10px] text-blue-500 border-blue-500/30">
                      Standby Failover
                    </Badge>
                  )}
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {providerMeta(row.provider).label} · {row.model} · key {row.maskedKey}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => testMutation.mutate(row.id)}
                  disabled={testMutation.isPending}
                >
                  {testMutation.isPending ? <Loader2 className="size-4 animate-spin" /> : null}
                  Test
                </Button>
                {row.isActive ? null : (
                  <Button size="sm" onClick={() => activateMutation.mutate(row.id)}>
                    Use this
                  </Button>
                )}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setRotateValue("");
                    setRotatingId(rotatingId === row.id ? null : row.id);
                  }}
                >
                  <RefreshCw className="size-4" /> Rotate
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => deleteMutation.mutate(row.id)}
                  aria-label={`Delete ${row.label}`}
                >
                  <Trash2 className="size-4" />
                </Button>
              </div>
            </div>
            {rotatingId === row.id ? (
              <div className="mt-3 space-y-2 rounded-lg border border-border p-3">
                <Label htmlFor={`rotate-embed-${row.id}`}>New API key</Label>
                <div className="flex flex-wrap gap-2">
                  <Input
                    id={`rotate-embed-${row.id}`}
                    type="password"
                    className="min-w-48 flex-1"
                    value={rotateValue}
                    onChange={(event) => setRotateValue(event.target.value)}
                    placeholder={providerMeta(row.provider).keyHint}
                  />
                  <Button
                    onClick={() => rotateMutation.mutate({ id: row.id, apiKey: rotateValue })}
                    disabled={rotateMutation.isPending || rotateValue.trim().length < 8}
                  >
                    {rotateMutation.isPending ? <Loader2 className="size-4 animate-spin" /> : null}
                    Save new key
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">
                  Provider, model and active state stay the same — only the secret changes.
                </p>
              </div>
            ) : null}
          </div>
        ))}

        {Array.isArray(keys.data) && keys.data.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No embedding keys yet. Add one on the left — Google and OpenRouter both offer free tiers
            that work well for a 0455 knowledge base.
          </p>
        ) : null}
      </section>
    </div>
  );
}

/**
 * Separate console section for vision-purpose keys — reads handwriting
 * pages and photographed/scanned past-paper pages (MCQ/essay bank
 * extraction, including hand-drawn/printed diagrams and data tables on the
 * page). Fully independent active flag from chat and embeddings, same
 * pattern as EmbeddingsPanel above. Only providers with a real image-input
 * endpoint (VISION_PROVIDERS) are offered here.
 */
function VisionPanel() {
  const queryClient = useQueryClient();
  const list = useServerFn(listProviderKeys);
  const save = useServerFn(saveProviderKey);
  const activate = useServerFn(activateProviderKey);
  const remove = useServerFn(deleteProviderKey);
  const test = useServerFn(testVisionProviderKey);
  const rotate = useServerFn(rotateProviderKey);

  const keys = useQuery({
    queryKey: ["provider-keys", "vision"],
    queryFn: () => list({ data: { purpose: "vision" } }),
  });

  const [provider, setProvider] = useState<string>(VISION_PROVIDERS[0]?.id ?? "google");
  const [label, setLabel] = useState("");
  const [apiKey, setApiKey] = useState("");
  const [model, setModel] = useState("");
  const [baseUrl, setBaseUrl] = useState("");
  const [activateNow, setActivateNow] = useState(true);
  const [rotatingId, setRotatingId] = useState<string | null>(null);
  const [rotateValue, setRotateValue] = useState("");

  const meta = providerMeta(provider);
  const visionModels = visionModelsFor(meta);
  const refresh = () => queryClient.invalidateQueries({ queryKey: ["provider-keys", "vision"] });

  const saveMutation = useMutation({
    mutationFn: () =>
      save({
        data: {
          provider: provider as never,
          purpose: "vision",
          label: label || `${meta.label} vision`,
          apiKey,
          baseUrl,
          model: model || visionModels[0] || "",
          activate: activateNow,
        },
      }),
    onSuccess: async () => {
      toast.success("Vision key saved. Handwriting OCR and MCQ/essay extraction will use it.");
      setApiKey("");
      setLabel("");
      await refresh();
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const activateMutation = useMutation({
    mutationFn: (id: string | null) => activate({ data: { id, purpose: "vision" } }),
    onSuccess: async () => {
      toast.success("Active vision provider updated.");
      await refresh();
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => remove({ data: { id } }),
    onSuccess: async () => {
      toast.success("Key removed.");
      await refresh();
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const testMutation = useMutation({
    mutationFn: (id: string) => test({ data: { id } }),
    onSuccess: (result) =>
      result.ok
        ? toast.success(
            `Key works — ${result.model} read the test image in ${result.latencyMs}ms ("${result.reply}")`,
          )
        : toast.error(result.reply),
    onError: (error: Error) => toast.error(error.message),
  });

  const rotateMutation = useMutation({
    mutationFn: (input: { id: string; apiKey: string }) => rotate({ data: input }),
    onSuccess: async () => {
      toast.success("Key rotated. The old secret no longer works here.");
      setRotatingId(null);
      setRotateValue("");
      await refresh();
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const activeKey = (keys.data ?? []).find((row) => row.isActive);

  return (
    <div className="grid gap-5 lg:grid-cols-[420px_1fr]">
      <section className="panel rounded-xl border border-border p-5">
        <h2 className="flex items-center gap-2 text-sm font-semibold">
          <Eye className="size-4 text-primary" /> Add a vision key
        </h2>
        <p className="mt-1 text-xs text-muted-foreground">
          Powers handwriting transcription (grade/practice uploads) and MCQ/essay bank extraction
          from photographed or scanned past-paper pages — including reading the real diagrams and
          data tables printed on the page, not just typed text. Deliberately separate from the
          chat/marking and embedding providers above, so pointing this at a stronger vision model
          never changes what marks essays or what embeds the knowledge base.
        </p>

        <div className="mt-4 space-y-3">
          <div className="space-y-1.5">
            <Label>Provider</Label>
            <Select
              value={provider}
              onValueChange={(value) => {
                setProvider(value);
                setModel(visionModelsFor(providerMeta(value))[0] ?? "");
                setBaseUrl("");
              }}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {VISION_PROVIDERS.map((item) => (
                  <SelectItem key={item.id} value={item.id}>
                    {item.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label>Name</Label>
            <Input
              value={label}
              onChange={(event) => setLabel(event.target.value)}
              placeholder={`${meta.label} vision`}
            />
          </div>

          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <Label>API Key(s)</Label>
              <span className="text-[10px] text-primary font-mono font-medium">Auto key-hopping</span>
            </div>
            <Textarea
              rows={2}
              value={apiKey}
              onChange={(event) => setApiKey(event.target.value)}
              placeholder={`${meta.keyHint} (one per line or comma-separated for automatic key hopping)`}
              className="font-mono text-xs"
            />
            <p className="text-[11px] text-muted-foreground">
              Enter one or multiple keys. During large exam OCR scans and handwritten past paper extractions, rate-limited keys (429/503) automatically hop to the next active key.
            </p>
          </div>

          <div className="space-y-1.5">
            <Label>Vision model id</Label>
            <Input
              value={model}
              onChange={(event) => setModel(event.target.value)}
              placeholder={visionModels[0] ?? "model-id"}
            />
            {visionModels.length ? (
              <div className="flex flex-wrap gap-1 pt-1">
                {visionModels.map((suggestion: string) => (
                  <button
                    key={suggestion}
                    type="button"
                    onClick={() => setModel(suggestion)}
                    className="rounded-md border border-border px-1.5 py-0.5 text-[11px] text-muted-foreground hover:text-foreground"
                  >
                    {suggestion}
                  </button>
                ))}
              </div>
            ) : null}
            {provider === "google" ? (
              <p className="pt-1 text-[11px] text-muted-foreground">
                Use the Google AI Studio id (e.g. <code>models/gemini-3.8-flash</code>) — the
                handwriting OCR path calls Google's API directly for the highest legibility.
              </p>
            ) : null}
          </div>

          <div className="space-y-1.5">
            <Label>
              Base URL <span className="text-muted-foreground">(optional)</span>
            </Label>
            <Input
              value={baseUrl}
              onChange={(event) => setBaseUrl(event.target.value)}
              placeholder={meta.baseUrl || "https://your-endpoint/v1"}
            />
          </div>

          <div className="flex items-center justify-between rounded-lg border border-border px-3 py-2">
            <div>
              <p className="text-sm font-medium">Make active</p>
              <p className="text-xs text-muted-foreground">
                Default for handwriting OCR and bank extraction unless a call picks a different key.
              </p>
            </div>
            <Switch checked={activateNow} onCheckedChange={setActivateNow} />
          </div>

          <Button
            className="w-full"
            onClick={() => saveMutation.mutate()}
            disabled={saveMutation.isPending || apiKey.trim().length < 8}
          >
            {saveMutation.isPending ? <Loader2 className="size-4 animate-spin" /> : null}
            Save vision key
          </Button>
        </div>
      </section>

      <section className="space-y-3">
        <div className="panel flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border p-4">
          <div>
            <p className="text-sm font-semibold">
              Currently reading images with:{" "}
              {activeKey
                ? `${providerMeta(activeKey.provider).label} · ${activeKey.model}`
                : "Falls back to the active chat provider / built-in AI"}
            </p>
            <p className="text-xs text-muted-foreground">
              {activeKey
                ? "Handwriting OCR and MCQ/essay bank extraction use this by default."
                : "Add a key on the left for the most accurate handwriting and diagram/table reads."}
            </p>
          </div>
          {activeKey ? (
            <Button variant="outline" size="sm" onClick={() => activateMutation.mutate(null)}>
              <Plug className="size-4" /> Clear active vision key
            </Button>
          ) : null}
        </div>

        {keys.isLoading ? <Skeleton className="h-28 w-full" /> : null}

        {(keys.data ?? []).map((row) => (
          <div key={row.id} className="panel rounded-xl border border-border p-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="flex items-center gap-2 text-sm font-medium">
                  {row.label}
                  {row.isActive ? (
                    <Badge className="gap-1 bg-emerald-600 text-white">
                      <CheckCircle2 className="size-3" /> Active (Primary)
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="text-[10px] text-blue-500 border-blue-500/30">
                      Standby Failover
                    </Badge>
                  )}
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {providerMeta(row.provider).label} · {row.model} · key {row.maskedKey}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => testMutation.mutate(row.id)}
                  disabled={testMutation.isPending}
                >
                  {testMutation.isPending ? <Loader2 className="size-4 animate-spin" /> : null}
                  Test
                </Button>
                {row.isActive ? null : (
                  <Button size="sm" onClick={() => activateMutation.mutate(row.id)}>
                    Use this
                  </Button>
                )}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setRotateValue("");
                    setRotatingId(rotatingId === row.id ? null : row.id);
                  }}
                >
                  <RefreshCw className="size-4" /> Rotate
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => deleteMutation.mutate(row.id)}
                  aria-label={`Delete ${row.label}`}
                >
                  <Trash2 className="size-4" />
                </Button>
              </div>
            </div>
            {rotatingId === row.id ? (
              <div className="mt-3 space-y-2 rounded-lg border border-border p-3">
                <Label htmlFor={`rotate-vision-${row.id}`}>New API key</Label>
                <div className="flex flex-wrap gap-2">
                  <Input
                    id={`rotate-vision-${row.id}`}
                    type="password"
                    className="min-w-48 flex-1"
                    value={rotateValue}
                    onChange={(event) => setRotateValue(event.target.value)}
                    placeholder={providerMeta(row.provider).keyHint}
                  />
                  <Button
                    onClick={() => rotateMutation.mutate({ id: row.id, apiKey: rotateValue })}
                    disabled={rotateMutation.isPending || rotateValue.trim().length < 8}
                  >
                    {rotateMutation.isPending ? <Loader2 className="size-4 animate-spin" /> : null}
                    Save new key
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">
                  Provider, model and active state stay the same — only the secret changes.
                </p>
              </div>
            ) : null}
          </div>
        ))}

        {Array.isArray(keys.data) && keys.data.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No vision keys yet. Without one, handwriting OCR and bank extraction fall back to the
            active chat provider, then the built-in gateway.
          </p>
        ) : null}
      </section>
    </div>
  );
}

const RESET_ALL_CATEGORIES: {
  category: "mcq" | "essays" | "liveExaminer" | "aiUsage";
  title: string;
  description: string;
  confirmWord: string;
}[] = [
  {
    category: "mcq",
    title: "Reset all MCQ scores",
    description:
      "Permanently deletes every MCQ attempt for every student — generated-paper history and real-past-paper history alike.",
    confirmWord: "MCQ",
  },
  {
    category: "essays",
    title: "Reset all essay scores",
    description: "Permanently deletes every essay (and its versions) for every student.",
    confirmWord: "ESSAYS",
  },
  {
    category: "liveExaminer",
    title: "Reset all Essay Grader sessions",
    description: "Permanently deletes every Essay Grader writing session for every student.",
    confirmWord: "LIVE",
  },
  {
    category: "aiUsage",
    title: "Clear all AI calls & cost logs",
    description: "Permanently wipes all AI usage logs, token tracking, and cost accounting back to zero for a clean slate.",
    confirmWord: "CLEAR",
  },
];

function DangerZoneSection() {
  const queryClient = useQueryClient();
  const resetAll = useServerFn(resetAllScores);
  const [target, setTarget] = useState<(typeof RESET_ALL_CATEGORIES)[number] | null>(null);
  const [confirmText, setConfirmText] = useState("");

  const resetAllMutation = useMutation({
    mutationFn: (category: "mcq" | "essays" | "liveExaminer" | "aiUsage") => resetAll({ data: { category } }),
    onSuccess: async (result) => {
      const total = Object.values(result.counts).reduce((sum, n) => sum + n, 0);
      toast.success(
        total > 0
          ? `Cleared ${total} record${total === 1 ? "" : "s"} across every account.`
          : "Nothing to clear — already empty.",
      );
      setTarget(null);
      setConfirmText("");
      await queryClient.invalidateQueries({ queryKey: ["admin-overview"] });
    },
    onError: (error: Error) => toast.error(error.message),
  });

  return (
    <div className="panel rounded-xl border border-destructive/40">
      <p className="border-b border-destructive/40 px-4 py-3 text-sm font-semibold text-destructive">
        Danger zone
      </p>
      <div className="divide-y divide-border">
        {RESET_ALL_CATEGORIES.map((item) => (
          <div key={item.category} className="flex flex-wrap items-center gap-3 px-4 py-3">
            <div className="min-w-0">
              <p className="text-sm font-medium">{item.title}</p>
              <p className="text-xs text-muted-foreground">{item.description}</p>
            </div>
            <Button
              type="button"
              variant="outline"
              className="ml-auto border-destructive/50 text-destructive hover:bg-destructive/10 hover:text-destructive"
              onClick={() => {
                setTarget(item);
                setConfirmText("");
              }}
            >
              Reset
            </Button>
          </div>
        ))}
      </div>

      <AlertDialog
        open={!!target}
        onOpenChange={(open) => {
          if (!open) {
            setTarget(null);
            setConfirmText("");
          }
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{target?.title}?</AlertDialogTitle>
            <AlertDialogDescription>
              {target?.description} This affects every account on the platform at once and can't be
              undone. Type <span className="font-mono font-semibold">{target?.confirmWord}</span>{" "}
              below to confirm.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <Input
            value={confirmText}
            onChange={(e) => setConfirmText(e.target.value)}
            placeholder={target?.confirmWord}
            autoComplete="off"
          />
          <AlertDialogFooter>
            <AlertDialogCancel disabled={resetAllMutation.isPending}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              disabled={resetAllMutation.isPending || confirmText.trim() !== target?.confirmWord}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => target && resetAllMutation.mutate(target.category)}
            >
              {resetAllMutation.isPending ? (
                <>
                  <Loader2 className="size-4 animate-spin" /> Clearing…
                </>
              ) : (
                "Reset for everyone"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

type UsageRow = {
  id: string;
  user_id: string | null;
  feature: string;
  model: string;
  prompt_tokens: number | null;
  completion_tokens: number | null;
  ok: boolean;
  error_message: string | null;
  latency_ms: number | null;
  created_at: string;
};

type FeatureMetric = {
  feature: string;
  label: string;
  calls: number;
  okCalls: number;
  failedCalls: number;
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
  totalLatencyMs: number;
  estCostUsd: number;
  estCostInr: number;
  avgLatencyMs: number;
};

type AdminMetrics = {
  totalTokens: number;
  totalPromptTokens: number;
  totalCompletionTokens: number;
  totalCostUsd: number;
  totalCostInr: number;
  last24hTokens: number;
  last24hCostInr: number;
  liveExaminer: {
    calls: number;
    totalTokens: number;
    promptTokens: number;
    completionTokens: number;
    costInr: number;
    costUsd: number;
    avgLatencyMs: number;
  };
  essayGrader: {
    calls: number;
    totalTokens: number;
    promptTokens: number;
    completionTokens: number;
    costInr: number;
    costUsd: number;
    avgLatencyMs: number;
  };
  byFeature: FeatureMetric[];
};

function OverviewPanel({
  onOpenDiagnostics,
  onOpenGodmode,
  onOpenEssays,
  onOpenQuiz,
  onOpenUsers,
  onTextUser,
}: {
  onOpenDiagnostics?: () => void;
  onOpenGodmode?: () => void;
  onOpenEssays?: () => void;
  onOpenQuiz?: () => void;
  onOpenUsers?: () => void;
  onTextUser?: (userId: string) => void;
} = {}) {
  const queryClient = useQueryClient();
  const fetchOverview = useServerFn(adminOverview);
  const clearAi = useServerFn(clearAiUsageLog);
  const overview = useQuery({
    queryKey: ["admin-overview"],
    queryFn: () => fetchOverview(),
    refetchInterval: 5_000,
  });
  const activity = useUserActivity();
  const [search, setSearch] = useState("");
  const [overviewSubTab, setOverviewSubTab] = useState<"activeness" | "ai" | "platform">("activeness");
  const [featureFilter, setFeatureFilter] = useState<"all" | "live_examiner" | "essay_grade" | "other">("all");
  const [clearAiDialogOpen, setClearAiDialogOpen] = useState(false);
  const [clearConfirmText, setClearConfirmText] = useState("");

  const clearAiMutation = useMutation({
    mutationFn: () => clearAi(),
    onSuccess: async (result) => {
      toast.success(
        result.deletedCount > 0
          ? `Cleared ${result.deletedCount} AI usage log records. Telemetry reset to clean slate.`
          : "AI calls and cost are already at clean slate (0).",
      );
      setClearAiDialogOpen(false);
      setClearConfirmText("");
      await queryClient.invalidateQueries({ queryKey: ["admin-overview"] });
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const whoIs = new Map(
    (activity.data ?? []).map((row) => [row.userId, `${displayName(row)} ${row.email ?? ""}`]),
  );

  if (overview.isLoading) return <Skeleton className="h-64 w-full" />;

  if (overview.isError) {
    return (
      <div className="rounded-xl border border-destructive/40 bg-destructive/10 p-6 space-y-3">
        <div className="flex items-center gap-2 text-destructive font-semibold">
          <XCircle className="size-5" />
          <span>Failed to load admin overview metrics</span>
        </div>
        <p className="text-sm text-muted-foreground">
          {overview.error instanceof Error ? overview.error.message : "An unexpected server error occurred."}
        </p>
        <Button
          type="button"
          size="sm"
          variant="outline"
          onClick={() => overview.refetch()}
          className="gap-2"
        >
          <RefreshCw className="size-3.5" />
          <span>Retry</span>
        </Button>
      </div>
    );
  }

  if (!overview.data) return <p className="text-sm text-muted-foreground">Nothing to show yet.</p>;

  const counts = overview.data.counts;
  const usage = overview.data.usage ?? [];
  const metrics = (overview.data as { metrics?: AdminMetrics }).metrics;

  const tiles = [
    { label: "Users", value: counts?.users ?? 0 },
    { label: "Essays marked", value: counts?.essays ?? 0 },
    { label: "Knowledge documents", value: counts?.documents ?? 0 },
    { label: "Indexed sections", value: counts?.chunks ?? 0 },
    { label: "MCQ attempts", value: counts?.attempts ?? 0 },
    { label: "Calibration anchors", value: counts?.anchors ?? 0 },
  ];

  const shownUsage = (usage as UsageRow[]).filter((row) => {
    if (featureFilter === "live_examiner") {
      if (!row.feature || !row.feature.startsWith("live_examiner")) return false;
    } else if (featureFilter === "essay_grade") {
      if (row.feature !== "grade_essay" && row.feature !== "essay_grade") return false;
    } else if (featureFilter === "other") {
      if (
        !row.feature ||
        row.feature.startsWith("live_examiner") ||
        row.feature === "grade_essay" ||
        row.feature === "essay_grade"
      )
        return false;
    }

    return matchesSearch(
      [
        row.feature,
        row.model,
        row.ok ? "ok success" : "failed error",
        row.error_message,
        row.user_id ? whoIs.get(row.user_id) : null,
      ],
      search,
    );
  });

  return (
    <div className="space-y-6">
      {/* ── Top Header Bar with Search & Executive Sub-Tab Switcher ── */}
      <div className="flex flex-col gap-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <SearchBox
            value={search}
            onChange={setSearch}
            placeholder="Search everything — user name, email, feature, model, or status…"
            className="max-w-xl flex-1"
          />
          <div className="flex items-center gap-2 shrink-0">
            {onOpenDiagnostics && (
              <Button
                type="button"
                size="sm"
                onClick={onOpenDiagnostics}
                className="gap-1.5 shrink-0 h-9 text-xs bg-purple-600 hover:bg-purple-700 text-white font-medium shadow-xs"
              >
                <LineChart className="size-3.5" />
                <span>Full Diagnostics &amp; Report →</span>
              </Button>
            )}
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() => overview.refetch()}
              disabled={overview.isFetching}
              className="gap-2 shrink-0 h-9 text-xs cursor-pointer"
            >
              <RefreshCw className={cn("size-3.5", overview.isFetching && "animate-spin")} />
              <span>Refresh metrics</span>
            </Button>
          </div>
        </div>

        {/* 3 Executive Tabs: Activeness / AI Spend / Platform Vault */}
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border/80 pb-3 pt-1">
          <div className="inline-flex rounded-xl bg-muted/60 p-1 border border-border/70 text-xs font-semibold shadow-2xs">
            <button
              type="button"
              onClick={() => setOverviewSubTab("activeness")}
              className={cn(
                "flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg transition-all cursor-pointer",
                overviewSubTab === "activeness"
                  ? "bg-background text-foreground shadow-xs font-bold"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              <span className="size-2 rounded-full bg-emerald-500 animate-pulse" />
              <span>User Activeness &amp; Presence</span>
            </button>

            <button
              type="button"
              onClick={() => setOverviewSubTab("ai")}
              className={cn(
                "flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg transition-all cursor-pointer",
                overviewSubTab === "ai"
                  ? "bg-background text-foreground shadow-xs font-bold"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              <Zap className="size-3.5 text-amber-500" />
              <span>AI Telemetry &amp; Unit Economics</span>
              <span className="text-[10px] font-mono text-muted-foreground ml-0.5">
                (₹{(metrics?.totalCostInr ?? 0).toFixed(0)})
              </span>
            </button>

            <button
              type="button"
              onClick={() => setOverviewSubTab("platform")}
              className={cn(
                "flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg transition-all cursor-pointer",
                overviewSubTab === "platform"
                  ? "bg-background text-foreground shadow-xs font-bold"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              <Crown className="size-3.5 text-primary" />
              <span>Platform Vault &amp; Totals</span>
            </button>
          </div>

          <div className="text-[11px] text-muted-foreground">
            Auto-refreshes every 5s · Production Telemetry
          </div>
        </div>
      </div>

      {/* ── Sub-Tab 1: User Activeness & Presence ── */}
      {overviewSubTab === "activeness" && (
        <ActivityOverview search={search}  />
      )}

      {/* ── Sub-Tab 2: Real-time AI Token & Credit Analytics ── */}
      {overviewSubTab === "ai" && (
        <div className="space-y-6">
          <section className="panel rounded-xl border border-border p-5 space-y-5 bg-card/40">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border pb-3">
              <div>
                <h2 className="flex items-center gap-2 text-sm font-semibold">
                  <Zap className="size-4 text-emerald-500" /> Real-time AI Token &amp; Credit Consumption
                </h2>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  Internal accounting of Gemini and Claude token expenditures across Essay Grader, Essay Grader, and generators.
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="h-7 text-xs border-destructive/40 text-destructive hover:bg-destructive/10 hover:text-destructive cursor-pointer"
                  onClick={() => {
                    setClearAiDialogOpen(true);
                    setClearConfirmText("");
                  }}
                  disabled={clearAiMutation.isPending}
                >
                  <Eraser className="size-3.5 mr-1" />
                  Clear calls &amp; cost
                </Button>
                <Badge variant="outline" className="font-mono text-xs border-emerald-500/40 text-emerald-600 dark:text-emerald-400">
                  Real-time Log Active
                </Badge>
              </div>
            </div>

            {/* 4 Hero KPI Cards */}
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <div className="rounded-lg border border-border/70 bg-background/60 p-3.5 space-y-1">
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span>Total Tokens Consumed</span>
                  <Zap className="size-3.5 text-emerald-500" />
                </div>
                <p className="text-2xl font-bold tracking-tight tabular-nums">
                  {(metrics?.totalTokens ?? 0).toLocaleString()}
                </p>
                <div className="flex items-center justify-between text-[11px] text-muted-foreground pt-1">
                  <span>{(metrics?.totalPromptTokens ?? 0).toLocaleString()} in / {(metrics?.totalCompletionTokens ?? 0).toLocaleString()} out</span>
                  <span className="text-emerald-600 dark:text-emerald-400 font-medium">
                    +{(metrics?.last24hTokens ?? 0).toLocaleString()} 24h
                  </span>
                </div>
              </div>

              <div className="rounded-lg border border-border/70 bg-background/60 p-3.5 space-y-1">
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span>Total Estimated Cost</span>
                  <Coins className="size-3.5 text-amber-500" />
                </div>
                <p className="text-2xl font-bold tracking-tight tabular-nums text-foreground">
                  ₹{(metrics?.totalCostInr ?? 0).toFixed(2)}
                </p>
                <div className="flex items-center justify-between text-[11px] text-muted-foreground pt-1">
                  <span>${(metrics?.totalCostUsd ?? 0).toFixed(3)} USD</span>
                  <span className="text-muted-foreground font-medium">
                    ₹{(metrics?.last24hCostInr ?? 0).toFixed(2)} 24h
                  </span>
                </div>
              </div>

              <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/5 p-3.5 space-y-1">
                <div className="flex items-center justify-between text-xs text-emerald-700 dark:text-emerald-400 font-medium">
                  <span>Essay Grader</span>
                  <Badge variant="outline" className="text-[10px] border-emerald-500/40 text-emerald-700 dark:text-emerald-300">
                    {(metrics?.liveExaminer?.calls ?? 0)} calls
                  </Badge>
                </div>
                <p className="text-2xl font-bold tracking-tight tabular-nums text-foreground">
                  {(metrics?.liveExaminer?.totalTokens ?? 0).toLocaleString()}
                  <span className="text-xs font-normal text-muted-foreground ml-1">tokens</span>
                </p>
                <div className="flex items-center justify-between text-[11px] text-muted-foreground pt-1">
                  <span>Est: ₹{(metrics?.liveExaminer?.costInr ?? 0).toFixed(2)}</span>
                  <span className="font-mono text-emerald-600 dark:text-emerald-400">
                    ⚡ ~{(metrics?.liveExaminer?.avgLatencyMs ?? 0)}ms
                  </span>
                </div>
              </div>

              <div className="rounded-lg border border-primary/30 bg-primary/5 p-3.5 space-y-1">
                <div className="flex items-center justify-between text-xs text-primary font-medium">
                  <span>Essay Grader</span>
                  <Badge variant="outline" className="text-[10px] border-primary/40 text-primary">
                    {(metrics?.essayGrader?.calls ?? 0)} essays
                  </Badge>
                </div>
                <p className="text-2xl font-bold tracking-tight tabular-nums text-foreground">
                  {(metrics?.essayGrader?.totalTokens ?? 0).toLocaleString()}
                  <span className="text-xs font-normal text-muted-foreground ml-1">tokens</span>
                </p>
                <div className="flex items-center justify-between text-[11px] text-muted-foreground pt-1">
                  <span>Est: ₹{(metrics?.essayGrader?.costInr ?? 0).toFixed(2)}</span>
                  <span className="font-mono text-muted-foreground">
                    ~{(metrics?.essayGrader?.avgLatencyMs ?? 0)}ms
                  </span>
                </div>
              </div>
            </div>

            {/* Feature Breakdown Table with custom scrollbar */}
            {metrics?.byFeature && metrics.byFeature.length > 0 ? (
              <div className="rounded-lg border border-border overflow-hidden">
                <div className="bg-muted/40 px-3.5 py-2 text-xs font-semibold flex items-center justify-between">
                  <span>Feature Breakdown &amp; Unit Economics</span>
                  <span className="text-[11px] font-normal text-muted-foreground">Based on latest 500 AI calls</span>
                </div>
                <div className="overflow-x-auto custom-scrollbar">
                  <table className="w-full text-left text-xs">
                    <thead className="border-b border-border bg-muted/20 text-muted-foreground text-[11px]">
                      <tr>
                        <th className="px-3.5 py-2">Feature</th>
                        <th className="px-3.5 py-2 text-right">Calls</th>
                        <th className="px-3.5 py-2 text-right">Prompt In</th>
                        <th className="px-3.5 py-2 text-right">Completion Out</th>
                        <th className="px-3.5 py-2 text-right">Total Tokens</th>
                        <th className="px-3.5 py-2 text-right">Avg Latency</th>
                        <th className="px-3.5 py-2 text-right">Est. Cost (₹)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {metrics.byFeature.map((f) => (
                        <tr key={f.feature} className="hover:bg-muted/10 transition-colors">
                          <td className="px-3.5 py-2">
                            <div className="font-medium">{f.label}</div>
                            <div className="text-[10px] font-mono text-muted-foreground">{f.feature}</div>
                          </td>
                          <td className="px-3.5 py-2 text-right tabular-nums">
                            {f.calls}
                            {f.failedCalls > 0 ? (
                              <span className="text-destructive ml-1 text-[10px]">({f.failedCalls} fail)</span>
                            ) : null}
                          </td>
                          <td className="px-3.5 py-2 text-right tabular-nums text-muted-foreground">
                            {(f.promptTokens ?? 0).toLocaleString()}
                          </td>
                          <td className="px-3.5 py-2 text-right tabular-nums text-muted-foreground">
                            {(f.completionTokens ?? 0).toLocaleString()}
                          </td>
                          <td className="px-3.5 py-2 text-right tabular-nums font-semibold">
                            {(f.totalTokens ?? 0).toLocaleString()}
                          </td>
                          <td className="px-3.5 py-2 text-right tabular-nums text-muted-foreground">
                            {f.avgLatencyMs > 0 ? `${f.avgLatencyMs} ms` : "—"}
                          </td>
                          <td className="px-3.5 py-2 text-right tabular-nums font-medium">
                            ₹{(f.estCostInr ?? 0).toFixed(2)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ) : null}
          </section>

          {/* Recent AI calls with real-time token counts, scroll container and sticky header */}
          <div className="panel rounded-xl border border-border overflow-hidden">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border px-4 py-3 bg-card/60">
              <p className="text-sm font-semibold">
                Recent AI Calls Log{" "}
                <span className="font-normal text-muted-foreground">
                  (latest {usage.length}
                  {search || featureFilter !== "all" ? `, ${shownUsage.length} match` : ""})
                </span>
              </p>
              <div className="flex items-center gap-1.5 text-xs">
                <Button
                  type="button"
                  size="sm"
                  variant={featureFilter === "all" ? "default" : "outline"}
                  className="h-7 px-2.5 text-xs"
                  onClick={() => setFeatureFilter("all")}
                >
                  All
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant={featureFilter === "live_examiner" ? "default" : "outline"}
                  className="h-7 px-2.5 text-xs"
                  onClick={() => setFeatureFilter("live_examiner")}
                >
                  Essay Grader
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant={featureFilter === "essay_grade" ? "default" : "outline"}
                  className="h-7 px-2.5 text-xs"
                  onClick={() => setFeatureFilter("essay_grade")}
                >
                  Essay Grader
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant={featureFilter === "other" ? "default" : "outline"}
                  className="h-7 px-2.5 text-xs"
                  onClick={() => setFeatureFilter("other")}
                >
                  Others
                </Button>
              </div>
            </div>

            {/* Scrollable Container with Custom Scrollbar */}
            <div className="max-h-[460px] overflow-y-auto custom-scrollbar divide-y divide-border/60">
              {shownUsage.length === 0 ? (
                <p className="px-4 py-8 text-center text-xs text-muted-foreground">
                  {search || featureFilter !== "all" ? "No AI calls match that filter." : "No AI calls logged yet."}
                </p>
              ) : null}
              {shownUsage.map((row) => {
                const rowTokens = (row.prompt_tokens ?? 0) + (row.completion_tokens ?? 0);
                const rowCostInr = (((row.prompt_tokens ?? 0) * 0.00000015 + (row.completion_tokens ?? 0) * 0.00000060) * 86.5);
                return (
                  <div key={row.id} className="flex flex-wrap items-center gap-2 px-4 py-2.5 text-xs hover:bg-muted/10 transition-colors">
                    {row.ok ? (
                      <CheckCircle2 className="size-3.5 text-primary shrink-0" />
                    ) : (
                      <XCircle className="size-3.5 text-destructive shrink-0" />
                    )}
                    <Badge variant="outline" className="text-[10px] font-medium">
                      {row.feature}
                    </Badge>
                    <span className="text-muted-foreground text-[11px] font-mono">{row.model}</span>

                    {rowTokens > 0 ? (
                      <Badge variant="secondary" className="font-mono text-[10px] tabular-nums">
                        ⚡ {rowTokens.toLocaleString()} tok ({row.prompt_tokens ?? 0} in / {row.completion_tokens ?? 0} out)
                      </Badge>
                    ) : null}

                    {rowCostInr > 0 ? (
                      <span className="font-mono text-[11px] text-muted-foreground">
                        ₹{rowCostInr.toFixed(3)}
                      </span>
                    ) : null}

                    {row.latency_ms ? (
                      <span className="text-muted-foreground text-[11px]">{row.latency_ms} ms</span>
                    ) : null}

                    {row.user_id && whoIs.get(row.user_id) ? (
                      <span className="truncate text-muted-foreground text-[11px]">
                        · {whoIs.get(row.user_id)?.trim()}
                      </span>
                    ) : null}

                    <span className="ml-auto text-muted-foreground text-[11px] font-mono">
                      {row.created_at ? new Date(row.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" }) : "—"}
                    </span>

                    {row.error_message ? (
                      row.feature === "LIVE_DRAFT_GRADE" || row.ok ? (
                        <div className="w-full pl-5 mt-1 text-[11px]">
                          {(() => {
                            try {
                              const parsed = JSON.parse(row.error_message);
                              return (
                                <div className="flex items-center gap-2 flex-wrap text-muted-foreground font-mono text-[10px] bg-muted/30 px-2.5 py-1 rounded-md border border-border/50">
                                  <span className="text-purple-400 font-semibold">📝 Live Essay Draft Autosave:</span>
                                  <span className="truncate max-w-lg text-foreground/90 font-medium">
                                    &quot;{parsed.question || "Essay Draft"}&quot;
                                  </span>
                                  <span className="text-muted-foreground">
                                    ({parsed.wordCount ?? 0} words · {parsed.charCount ?? 0} chars)
                                  </span>
                                  <span className="text-muted-foreground/70">
                                    Max: {parsed.maxMark ?? 12}m
                                  </span>
                                </div>
                              );
                            } catch {
                              return (
                                <p className="font-mono text-[10px] text-muted-foreground/80">{row.error_message}</p>
                              );
                            }
                          })()}
                        </div>
                      ) : (
                        <p className="w-full text-destructive text-[11px] pl-5 font-mono">{row.error_message}</p>
                      )
                    ) : null}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* ── Sub-Tab 3: Platform Totals & Vault ── */}
      {overviewSubTab === "platform" && (
        <div className="space-y-6">
          {/* God-Mode Quick Entry Banner */}
          <div className="relative overflow-hidden rounded-xl border border-amber-500/30 bg-gradient-to-r from-amber-500/10 via-amber-500/5 to-transparent p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-sm">
            <div className="flex items-center gap-3">
              <span className="flex size-9 items-center justify-center rounded-lg bg-amber-500/20 text-amber-500 shrink-0">
                <Crown className="size-5" />
              </span>
              <div>
                <h3 className="text-sm font-bold text-foreground sm:text-base flex items-center gap-2">
                  God-Mode Platform Vault &amp; Keystroke Monitor
                  <Badge variant="outline" className="border-amber-500/40 text-amber-600 dark:text-amber-400 text-[10px] py-0 font-bold">
                    ROOT ACCESS
                  </Badge>
                </h3>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Real-time student surveillance, live typing radar, 1-click failed essay diagnosis &amp; repair, and 360° dossiers.
                </p>
              </div>
            </div>
            {onOpenGodmode && (
              <Button
                type="button"
                size="sm"
                variant="default"
                className="h-8 text-xs font-semibold bg-amber-600 hover:bg-amber-700 text-white shrink-0 gap-1.5 shadow-sm cursor-pointer"
                onClick={onOpenGodmode}
              >
                <span>Launch God Mode Console</span>
                <ChevronRight className="size-3.5" />
              </Button>
            )}
          </div>

          {/* Platform Totals Grid */}
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-3">
              Platform Data Totals &amp; Repositories
            </h3>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
              {tiles.map((tile) => {
                const isEssays = tile.label === "Essays marked";
                const isUsers = tile.label === "Users";
                const isClickable = (isEssays && onOpenEssays) || (isUsers && onOpenUsers);
                return (
                  <div
                    key={tile.label}
                    onClick={() => {
                      if (isEssays && onOpenEssays) onOpenEssays();
                      if (isUsers && onOpenUsers) onOpenUsers();
                    }}
                    className={cn(
                      "panel rounded-xl border border-border p-4 transition-all",
                      isClickable && "cursor-pointer hover:border-primary/50 hover:bg-muted/40 shadow-xs",
                    )}
                  >
                    <div className="flex items-center justify-between">
                      <p className="text-xs text-muted-foreground">{tile.label}</p>
                      {isEssays && <span className="text-[10px] text-primary font-medium hover:underline">Vault &rarr;</span>}
                      {isUsers && <span className="text-[10px] text-primary font-medium hover:underline">Directory &rarr;</span>}
                    </div>
                    <p className="mt-1 text-2xl font-bold tracking-tight tabular-nums text-foreground">{tile.value}</p>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Direct Vault Links */}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
            {onOpenQuiz && (
              <button
                type="button"
                onClick={onOpenQuiz}
                className="p-4 rounded-xl border border-emerald-500/30 bg-emerald-500/[0.03] hover:border-emerald-500/60 hover:bg-emerald-500/[0.08] text-left transition-all space-y-1.5 cursor-pointer group"
              >
                <div className="flex items-center justify-between">
                  <span className="flex size-7 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-500">
                    <Gamepad2 className="size-4" />
                  </span>
                  <ChevronRight className="size-4 text-muted-foreground group-hover:text-emerald-500 transition-transform group-hover:translate-x-0.5" />
                </div>
                <h4 className="text-xs font-bold text-foreground flex items-center gap-1.5">
                  <span>Live Quiz Arena</span>
                  <Badge variant="outline" className="border-emerald-500/40 text-emerald-600 dark:text-emerald-400 text-[9px] py-0 px-1">
                    Live
                  </Badge>
                </h4>
                <p className="text-[11px] text-muted-foreground">Multiplayer rooms, PINs, active players &amp; live leaderboard.</p>
              </button>
            )}

            {onOpenEssays && (
              <button
                type="button"
                onClick={onOpenEssays}
                className="p-4 rounded-xl border border-border/80 bg-card hover:border-primary/50 hover:bg-muted/30 text-left transition-all space-y-1.5 cursor-pointer group"
              >
                <div className="flex items-center justify-between">
                  <span className="flex size-7 items-center justify-center rounded-lg bg-blue-500/10 text-blue-500">
                    <BookOpen className="size-4" />
                  </span>
                  <ChevronRight className="size-4 text-muted-foreground group-hover:text-primary transition-transform group-hover:translate-x-0.5" />
                </div>
                <h4 className="text-xs font-bold text-foreground">Graded Essays Vault</h4>
                <p className="text-[11px] text-muted-foreground">Every essay ever scored on Marginalite with full feedback.</p>
              </button>
            )}

            <Link
              to="/knowledge"
              className="p-4 rounded-xl border border-border/80 bg-card hover:border-primary/50 hover:bg-muted/30 text-left transition-all space-y-1.5 cursor-pointer group"
            >
              <div className="flex items-center justify-between">
                <span className="flex size-7 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-500">
                  <BookOpen className="size-4" />
                </span>
                <ChevronRight className="size-4 text-muted-foreground group-hover:text-primary transition-transform group-hover:translate-x-0.5" />
              </div>
              <h4 className="text-xs font-bold text-foreground">Knowledge Base</h4>
              <p className="text-[11px] text-muted-foreground">Syllabus vectors, mark scheme chunks, and RAG index.</p>
            </Link>

            <Link
              to="/calibration"
              className="p-4 rounded-xl border border-border/80 bg-card hover:border-primary/50 hover:bg-muted/30 text-left transition-all space-y-1.5 cursor-pointer group"
            >
              <div className="flex items-center justify-between">
                <span className="flex size-7 items-center justify-center rounded-lg bg-purple-500/10 text-purple-500">
                  <Target className="size-4" />
                </span>
                <ChevronRight className="size-4 text-muted-foreground group-hover:text-primary transition-transform group-hover:translate-x-0.5" />
              </div>
              <h4 className="text-xs font-bold text-foreground">Anchor Calibration</h4>
              <p className="text-[11px] text-muted-foreground">Human-verified exemplar anchors and Level boundaries.</p>
            </Link>

            <Link
              to="/question-bank"
              className="p-4 rounded-xl border border-border/80 bg-card hover:border-primary/50 hover:bg-muted/30 text-left transition-all space-y-1.5 cursor-pointer group"
            >
              <div className="flex items-center justify-between">
                <span className="flex size-7 items-center justify-center rounded-lg bg-amber-500/10 text-amber-500">
                  <Sparkles className="size-4" />
                </span>
                <ChevronRight className="size-4 text-muted-foreground group-hover:text-primary transition-transform group-hover:translate-x-0.5" />
              </div>
              <h4 className="text-xs font-bold text-foreground">Question Bank</h4>
              <p className="text-[11px] text-muted-foreground">Cambridge past paper database, diagrams &amp; topics.</p>
            </Link>
          </div>
        </div>
      )}

      {/* Recent AI calls with real-time token counts and cost */}
      <div className="panel rounded-xl border border-border">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border px-4 py-3">
          <p className="text-sm font-semibold">
            Recent AI calls{" "}
            <span className="font-normal text-muted-foreground">
              (latest {usage.length}
              {search || featureFilter !== "all" ? `, ${shownUsage.length} match` : ""})
            </span>
          </p>
          <div className="flex items-center gap-1.5 text-xs">
            <Button
              type="button"
              size="sm"
              variant={featureFilter === "all" ? "default" : "outline"}
              className="h-7 px-2.5 text-xs"
              onClick={() => setFeatureFilter("all")}
            >
              All
            </Button>
            <Button
              type="button"
              size="sm"
              variant={featureFilter === "live_examiner" ? "default" : "outline"}
              className="h-7 px-2.5 text-xs"
              onClick={() => setFeatureFilter("live_examiner")}
            >
              Essay Grader
            </Button>
            <Button
              type="button"
              size="sm"
              variant={featureFilter === "essay_grade" ? "default" : "outline"}
              className="h-7 px-2.5 text-xs"
              onClick={() => setFeatureFilter("essay_grade")}
            >
              Essay Grader
            </Button>
            <Button
              type="button"
              size="sm"
              variant={featureFilter === "other" ? "default" : "outline"}
              className="h-7 px-2.5 text-xs"
              onClick={() => setFeatureFilter("other")}
            >
              Others
            </Button>
          </div>
        </div>

        <div className="divide-y divide-border">
          {shownUsage.length === 0 ? (
            <p className="px-4 py-4 text-sm text-muted-foreground">
              {search || featureFilter !== "all" ? "No AI calls match that filter." : "No AI calls logged yet."}
            </p>
          ) : null}
          {shownUsage.map((row) => {
            const rowTokens = (row.prompt_tokens ?? 0) + (row.completion_tokens ?? 0);
            const rowCostInr = (((row.prompt_tokens ?? 0) * 0.00000015 + (row.completion_tokens ?? 0) * 0.00000060) * 86.5);
            return (
              <div key={row.id} className="flex flex-wrap items-center gap-2 px-4 py-2.5 text-xs hover:bg-muted/10 transition-colors">
                {row.ok ? (
                  <CheckCircle2 className="size-3.5 text-primary shrink-0" />
                ) : (
                  <XCircle className="size-3.5 text-destructive shrink-0" />
                )}
                <Badge variant="outline" className="text-[10px] font-medium">
                  {row.feature}
                </Badge>
                <span className="text-muted-foreground text-[11px]">{row.model}</span>

                {rowTokens > 0 ? (
                  <Badge variant="secondary" className="font-mono text-[10px] tabular-nums">
                    ⚡ {rowTokens.toLocaleString()} tok ({row.prompt_tokens ?? 0} in / {row.completion_tokens ?? 0} out)
                  </Badge>
                ) : null}

                {rowCostInr > 0 ? (
                  <span className="font-mono text-[11px] text-muted-foreground">
                    ₹{rowCostInr.toFixed(3)}
                  </span>
                ) : null}

                {row.latency_ms ? (
                  <span className="text-muted-foreground text-[11px]">{row.latency_ms} ms</span>
                ) : null}

                {row.user_id && whoIs.get(row.user_id) ? (
                  <span className="truncate text-muted-foreground text-[11px]">
                    · {whoIs.get(row.user_id)?.trim()}
                  </span>
                ) : null}

                <span className="ml-auto text-muted-foreground text-[11px]">
                  {row.created_at ? new Date(row.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" }) : "—"}
                </span>

                {row.error_message ? (
                  row.feature === "LIVE_DRAFT_GRADE" || row.ok ? (
                    <div className="w-full pl-5 mt-1 text-[11px]">
                      {(() => {
                        try {
                          const parsed = JSON.parse(row.error_message);
                          return (
                            <div className="flex items-center gap-2 flex-wrap text-muted-foreground font-mono text-[10px] bg-muted/30 px-2.5 py-1 rounded-md border border-border/50">
                              <span className="text-purple-400 font-semibold">📝 Live Essay Draft Autosave:</span>
                              <span className="truncate max-w-lg text-foreground/90 font-medium">
                                "{parsed.question || "Essay Draft"}"
                              </span>
                              <span className="text-muted-foreground">
                                ({parsed.wordCount ?? 0} words · {parsed.charCount ?? 0} chars)
                              </span>
                              <span className="text-muted-foreground/70">
                                Max: {parsed.maxMark ?? 12}m
                              </span>
                            </div>
                          );
                        } catch {
                          return (
                            <p className="font-mono text-[10px] text-muted-foreground/80">{row.error_message}</p>
                          );
                        }
                      })()}
                    </div>
                  ) : (
                    <p className="w-full text-destructive text-[11px] pl-5 font-mono">{row.error_message}</p>
                  )
                ) : null}
              </div>
            );
          })}
        </div>
      </div>

      <AlertDialog
        open={clearAiDialogOpen}
        onOpenChange={(open) => {
          if (!open) {
            setClearAiDialogOpen(false);
            setClearConfirmText("");
          }
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Clear all AI calls &amp; cost logs?</AlertDialogTitle>
            <AlertDialogDescription className="space-y-2">
              <span>
                This will permanently wipe all AI telemetry records, prompt/completion tokens, and cost accounting.
                All student essays, questions, and accounts will remain intact — only AI consumption metrics will reset to 0.
              </span>
              <span className="block pt-2 font-mono text-xs text-foreground">
                Type <strong>CLEAR</strong> to confirm:
              </span>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <Input
            value={clearConfirmText}
            onChange={(e) => setClearConfirmText(e.target.value)}
            placeholder="CLEAR"
            className="font-mono"
            autoFocus
          />
          <AlertDialogFooter>
            <AlertDialogCancel disabled={clearAiMutation.isPending}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={clearConfirmText.trim().toUpperCase() !== "CLEAR" || clearAiMutation.isPending}
              onClick={(e) => {
                e.preventDefault();
                clearAiMutation.mutate();
              }}
            >
              {clearAiMutation.isPending ? "Clearing..." : "Wipe to clean slate"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <DangerZoneSection />
    </div>
  );
}

function UsersPanel({ onTextUser }: { onTextUser?: (userId: string) => void } = {}) {
  const queryClient = useQueryClient();
  const fetchUsers = useServerFn(listUsers);
  const updateRole = useServerFn(setUserRole);
  const resetData = useServerFn(resetStudentPracticeData);
  const deleteAccount = useServerFn(deleteUserAccount);
  const users = useQuery({ queryKey: ["admin-users"], queryFn: () => fetchUsers() });
  const activity = useUserActivity();
  const activityById = new Map((activity.data ?? []).map((row) => [row.userId, row]));

  const [search, setSearch] = useState("");
  const [filterRole, setFilterRole] = useState<"all" | "new" | "student" | "teacher" | "online" | "writers">("all");
  const [sortBy, setSortBy] = useState<"newest" | "oldest" | "essays" | "active" | "name">("newest");
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(15);

  const [resetTarget, setResetTarget] = useState<{ id: string; name: string } | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; name: string } | null>(null);

  const roleMutation = useMutation({
    mutationFn: (input: { userId: string; role: "student" | "teacher" | "admin" }) =>
      updateRole({ data: input }),
    onSuccess: async () => {
      toast.success("Role updated.");
      await queryClient.invalidateQueries({ queryKey: ["admin-users"] });
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const resetMutation = useMutation({
    mutationFn: (userId: string) => resetData({ data: { userId } }),
    onSuccess: (result) => {
      const total = Object.values(result.counts).reduce((sum, n) => sum + n, 0);
      toast.success(
        total > 0
          ? `Cleared ${total} record${total === 1 ? "" : "s"}.`
          : "Nothing to clear — already empty.",
      );
      setResetTarget(null);
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const deleteMutation = useMutation({
    mutationFn: (userId: string) => deleteAccount({ data: { userId } }),
    onSuccess: async () => {
      toast.success("Account deleted.");
      setDeleteTarget(null);
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["admin-users"] }),
        queryClient.invalidateQueries({ queryKey: ["admin-user-activity"] }),
      ]);
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    toast.success("Copied to clipboard");
    setTimeout(() => setCopiedId(null), 2000);
  };

  const usersList = (users.data ?? []) as Array<{
    id: string;
    email?: string | null;
    fullName: string;
    school?: string | null;
    avatarUrl?: string | null;
    createdAt: string;
    lastSignInAt?: string | null;
    role: "admin" | "teacher" | "student";
  }>;

  const nowMs = Date.now();
  const weekAgoMs = nowMs - 7 * 24 * 60 * 60 * 1000;
  const dayAgoMs = nowMs - 24 * 60 * 60 * 1000;
  const twoDaysAgoMs = nowMs - 2 * 24 * 60 * 60 * 1000;

  // Key KPI Metrics
  const totalUsers = usersList.length;
  const studentsCount = usersList.filter((u) => u.role === "student").length;
  const teachersCount = usersList.filter((u) => u.role === "teacher").length;
  const adminsCount = usersList.filter((u) => u.role === "admin").length;
  const onlineUsers = usersList.filter((u) => activityById.get(u.id)?.isOnline);
  const onlineCount = onlineUsers.length;
  const joinedThisWeek = usersList.filter(
    (u) => new Date(u.createdAt).getTime() >= weekAgoMs,
  );
  const joinedToday = usersList.filter(
    (u) => new Date(u.createdAt).getTime() >= dayAgoMs,
  );
  const writersCount = usersList.filter(
    (u) => (activityById.get(u.id)?.essaysGraded ?? 0) > 0,
  ).length;

  // Sorted list by newest joined for the spotlight
  const sortedByNewest = [...usersList].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
  );
  const latestUser = sortedByNewest[0] ?? null;
  const topLatestUsers = sortedByNewest.slice(0, 6);

  // Filtered & Sorted Users
  const filteredUsers = usersList
    .filter((user) => {
      const extra = activityById.get(user.id);
      const email = user.email || extra?.email;

      if (filterRole === "new") {
        if (new Date(user.createdAt).getTime() < weekAgoMs) return false;
      } else if (filterRole === "student") {
        if (user.role !== "student") return false;
      } else if (filterRole === "teacher") {
        if (user.role !== "teacher") return false;
      } else if (filterRole === "online") {
        if (!extra?.isOnline) return false;
      } else if (filterRole === "writers") {
        if ((extra?.essaysGraded ?? 0) <= 0) return false;
      }

      return matchesSearch(
        [user.fullName, user.school, user.role, email, user.id],
        search,
      );
    })
    .sort((a, b) => {
      const extraA = activityById.get(a.id);
      const extraB = activityById.get(b.id);

      if (sortBy === "newest") {
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      }
      if (sortBy === "oldest") {
        return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
      }
      if (sortBy === "essays") {
        return (extraB?.essaysGraded ?? 0) - (extraA?.essaysGraded ?? 0);
      }
      if (sortBy === "active") {
        const timeA = extraA?.lastActivity ? new Date(extraA.lastActivity).getTime() : 0;
        const timeB = extraB?.lastActivity ? new Date(extraB.lastActivity).getTime() : 0;
        return timeB - timeA;
      }
      if (sortBy === "name") {
        return (a.fullName || "").localeCompare(b.fullName || "");
      }
      return 0;
    });

  useEffect(() => {
    setCurrentPage(1);
  }, [search, filterRole, sortBy, pageSize]);

  const totalPages = Math.max(1, Math.ceil(filteredUsers.length / pageSize));
  const startIndex = (currentPage - 1) * pageSize;
  const paginatedUsers = filteredUsers.slice(startIndex, startIndex + pageSize);

  const exportUsersCsv = () => {
    try {
      const rows = [
        ["User ID", "Full Name", "Email", "Role", "School / Centre", "Joined At", "Essays Graded", "MCQ Attempts", "Live Sessions", "Status"],
        ...filteredUsers.map((u) => {
          const extra = activityById.get(u.id);
          return [
            u.id,
            `"${(u.fullName || "").replace(/"/g, '""')}"`,
            u.email || extra?.email || "",
            u.role,
            `"${(u.school || "").replace(/"/g, '""')}"`,
            u.createdAt,
            extra?.essaysGraded ?? 0,
            extra?.mcqAttempts ?? 0,
            extra?.liveExaminerSessions ?? 0,
            extra?.isOnline ? "Online" : "Offline",
          ];
        }),
      ];
      const csvContent = rows.map((r) => r.join(",")).join("\n");
      const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `marginal-users-${new Date().toISOString().slice(0, 10)}.csv`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success("Candidate directory exported to CSV.");
    } catch {
      toast.error("Failed to export CSV.");
    }
  };

  if (users.isLoading) return <Skeleton className="h-64 w-full" />;

  return (
    <div className="space-y-6">
      {/* ── 1. Top KPI Intelligence Cards: Total Users, Latest Joined, Roles & Online ── */}
      <div className="grid gap-3.5 sm:grid-cols-2 lg:grid-cols-4">
        {/* Total Registered Users */}
        <div className="rounded-2xl border border-primary/20 bg-gradient-to-br from-primary/[0.07] via-card to-card p-4 shadow-xs relative overflow-hidden group">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
              <Users className="size-3.5 text-primary" /> Total Users
            </span>
            <Badge className="bg-emerald-500/15 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400 text-[10px] font-bold">
              +{joinedThisWeek.length} this wk
            </Badge>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-extrabold tracking-tight text-foreground">
              {totalUsers}
            </span>
            <span className="text-xs text-muted-foreground font-medium">
              registered accounts
            </span>
          </div>
          <p className="text-[11px] text-muted-foreground mt-2 pt-2 border-t border-border/60 flex items-center justify-between">
            <span>+{joinedToday.length} joined today</span>
            <span className="font-semibold text-primary">{studentsCount} students</span>
          </p>
        </div>

        {/* Latest Joined Member Spotlight */}
        <div className="rounded-2xl border border-amber-500/25 bg-gradient-to-br from-amber-500/[0.08] via-card to-card p-4 shadow-xs relative overflow-hidden group">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-amber-600 dark:text-amber-400 uppercase tracking-wider flex items-center gap-1.5">
              <Sparkles className="size-3.5 text-amber-500" /> Latest Joined
            </span>
            {latestUser && (
              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30">
                {timeAgo(latestUser.createdAt)}
              </span>
            )}
          </div>
          {latestUser ? (
            <div className="flex items-center justify-between gap-2 mt-1">
              <div className="flex items-center gap-2.5 min-w-0">
                <UserAvatar
                  avatarUrl={latestUser.avatarUrl}
                  name={latestUser.fullName}
                  showStatusDot={activityById.get(latestUser.id)?.isOnline}
                  className="size-8 shrink-0 shadow-xs ring-1 ring-amber-500/30"
                />
                <div className="min-w-0">
                  <p className="text-sm font-bold truncate text-foreground leading-tight">
                    {latestUser.fullName}
                  </p>
                  <p className="text-[10.5px] text-muted-foreground truncate mt-0.5">
                    {latestUser.email || latestUser.school || "New Candidate"}
                  </p>
                </div>
              </div>
              {onTextUser && (
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => onTextUser(latestUser.id)}
                  className="h-7 px-2 text-[11px] gap-1 border-amber-500/40 text-amber-600 dark:text-amber-400 hover:bg-amber-500/10 shrink-0 font-semibold cursor-pointer"
                  title="Direct message this newly joined user"
                >
                  <Send className="size-3" /> Text
                </Button>
              )}
            </div>
          ) : (
            <p className="text-xs text-muted-foreground mt-2">No users registered yet.</p>
          )}
          <p className="text-[11px] text-muted-foreground mt-2 pt-2 border-t border-border/60 truncate">
            {latestUser ? `Joined ${new Date(latestUser.createdAt).toLocaleDateString()} (${latestUser.role})` : "Waiting for candidates"}
          </p>
        </div>

        {/* Students & Educators Breakdown */}
        <div className="rounded-2xl border border-indigo-500/20 bg-gradient-to-br from-indigo-500/[0.07] via-card to-card p-4 shadow-xs relative overflow-hidden group">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-wider flex items-center gap-1.5">
              <GraduationCap className="size-3.5 text-indigo-500" /> User Roles
            </span>
            <span className="text-[10px] font-bold text-muted-foreground">
              {Math.round((studentsCount / Math.max(1, totalUsers)) * 100)}% students
            </span>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-extrabold tracking-tight text-foreground">
              {studentsCount}
            </span>
            <span className="text-xs text-muted-foreground font-medium">
              Students · <strong className="text-foreground">{teachersCount}</strong> Teachers
            </span>
          </div>
          <p className="text-[11px] text-muted-foreground mt-2 pt-2 border-t border-border/60 flex items-center justify-between">
            <span>{teachersCount} authorized educators</span>
            <span>{adminsCount} platform admin</span>
          </p>
        </div>

        {/* Live Active Now */}
        <div className="rounded-2xl border border-emerald-500/25 bg-gradient-to-br from-emerald-500/[0.08] via-card to-card p-4 shadow-xs relative overflow-hidden group">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider flex items-center gap-1.5">
              <span className="size-2 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_8px_rgba(16,185,129,0.8)]" />
              Online Now
            </span>
            <Badge className="bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border-emerald-500/35 text-[10px] font-bold">
              Live Presence
            </Badge>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-extrabold tracking-tight text-foreground">
              {onlineCount}
            </span>
            <span className="text-xs text-muted-foreground font-medium">
              active in app right now
            </span>
          </div>
          <p className="text-[11px] text-muted-foreground mt-2 pt-2 border-t border-border/60 flex items-center justify-between">
            <span>{writersCount} active essay writers</span>
            <span className="text-emerald-600 dark:text-emerald-400 font-semibold">Real-time Heartbeat</span>
          </p>
        </div>
      </div>

      {/* ── 2. Latest Joined Candidates Quick Spotlight Strip ── */}
      {topLatestUsers.length > 0 && (
        <div className="rounded-2xl border border-border/80 bg-card p-4 sm:p-5 shadow-xs space-y-3">
          <div className="flex items-center justify-between border-b border-border/70 pb-2.5">
            <div className="flex items-center gap-2">
              <Sparkles className="size-4 text-amber-500" />
              <h3 className="text-xs sm:text-sm font-bold text-foreground">
                Latest Joined Members Spotlight
              </h3>
              <Badge variant="outline" className="text-[10px] font-semibold bg-muted">
                Newest {topLatestUsers.length} signups
              </Badge>
            </div>
            <span className="text-[11px] text-muted-foreground">
              Instant welcome &amp; direct messaging channel
            </span>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 pt-1">
            {topLatestUsers.map((u) => {
              const extra = activityById.get(u.id);
              const isRecent = new Date(u.createdAt).getTime() >= twoDaysAgoMs;
              return (
                <div
                  key={u.id}
                  className="rounded-xl border border-border/70 bg-muted/25 hover:bg-muted/50 p-3 flex flex-col justify-between transition-all group/card hover:border-primary/40 hover:shadow-xs"
                >
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <UserAvatar
                      avatarUrl={u.avatarUrl}
                      name={u.fullName}
                      showStatusDot={extra?.isOnline}
                      className="size-8 ring-1 ring-border/80 shrink-0"
                    />
                    <span
                      className={cn(
                        "text-[9.5px] font-extrabold uppercase px-1.5 py-0.5 rounded-full",
                        isRecent
                          ? "bg-amber-500/15 border border-amber-500/30 text-amber-600 dark:text-amber-400 font-bold"
                          : "bg-muted text-muted-foreground",
                      )}
                    >
                      {timeAgo(u.createdAt)}
                    </span>
                  </div>

                  <div className="min-w-0 mb-2">
                    <p className="text-xs font-bold text-foreground truncate group-hover/card:text-primary transition-colors">
                      {u.fullName}
                    </p>
                    <p className="text-[10px] font-mono text-muted-foreground truncate">
                      {u.email || activityById.get(u.id)?.email || "—"}
                    </p>
                    <p className="text-[10px] text-muted-foreground/80 truncate mt-0.5">
                      {u.school || "Independent"}
                    </p>
                  </div>

                  <div className="flex items-center justify-between pt-2 border-t border-border/60 text-[10px]">
                    <span className="capitalize font-semibold text-muted-foreground">
                      {u.role}
                    </span>
                    {onTextUser && u.role !== "admin" && (
                      <button
                        type="button"
                        onClick={() => onTextUser(u.id)}
                        className="text-[10.5px] font-bold text-primary hover:underline inline-flex items-center gap-1 cursor-pointer"
                      >
                        <Send className="size-2.5" /> Text
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── 3. Filters, Search & Sorting Controls ── */}
      <div className="space-y-3">
        {/* Filter Pills */}
        <div className="flex flex-wrap items-center gap-1.5">
          <Button
            type="button"
            size="sm"
            variant={filterRole === "all" ? "default" : "outline"}
            onClick={() => setFilterRole("all")}
            className="h-8 text-xs font-semibold rounded-lg"
          >
            All Accounts ({totalUsers})
          </Button>

          <Button
            type="button"
            size="sm"
            variant={filterRole === "new" ? "default" : "outline"}
            onClick={() => setFilterRole("new")}
            className={cn(
              "h-8 text-xs font-semibold rounded-lg gap-1.5",
              filterRole === "new" ? "bg-amber-600 hover:bg-amber-700 text-white" : "border-amber-500/40 text-amber-600 dark:text-amber-400 hover:bg-amber-500/10",
            )}
          >
            <Sparkles className="size-3 text-amber-500" />
            Latest (7d) ({joinedThisWeek.length})
          </Button>

          <Button
            type="button"
            size="sm"
            variant={filterRole === "student" ? "default" : "outline"}
            onClick={() => setFilterRole("student")}
            className="h-8 text-xs font-semibold rounded-lg"
          >
            Students ({studentsCount})
          </Button>

          <Button
            type="button"
            size="sm"
            variant={filterRole === "teacher" ? "default" : "outline"}
            onClick={() => setFilterRole("teacher")}
            className="h-8 text-xs font-semibold rounded-lg"
          >
            Teachers ({teachersCount})
          </Button>

          <Button
            type="button"
            size="sm"
            variant={filterRole === "online" ? "default" : "outline"}
            onClick={() => setFilterRole("online")}
            className={cn(
              "h-8 text-xs font-semibold rounded-lg gap-1.5",
              filterRole === "online" ? "bg-emerald-600 hover:bg-emerald-700 text-white" : "border-emerald-500/40 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/10",
            )}
          >
            <span className="size-2 rounded-full bg-emerald-500 animate-pulse" />
            Online Now ({onlineCount})
          </Button>

          <Button
            type="button"
            size="sm"
            variant={filterRole === "writers" ? "default" : "outline"}
            onClick={() => setFilterRole("writers")}
            className="h-8 text-xs font-semibold rounded-lg"
          >
            Active Writers ({writersCount})
          </Button>

          <div className="ml-auto flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={exportUsersCsv}
              className="h-8 text-xs gap-1.5 font-semibold shrink-0 cursor-pointer"
              title="Download user directory CSV"
            >
              <Download className="size-3.5" />
              <span>Export CSV</span>
            </Button>
          </div>
        </div>

        {/* Search & Sort Row */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          <SearchBox
            value={search}
            onChange={setSearch}
            placeholder="Search by name, email, school, role, or UUID…"
            className="max-w-xl flex-1"
          />

          <div className="flex items-center gap-2 shrink-0">
            <span className="text-xs text-muted-foreground font-medium">Sort:</span>
            <Select value={sortBy} onValueChange={(val: any) => setSortBy(val)}>
              <SelectTrigger className="h-9 w-48 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="newest">Latest Joined (Newest first)</SelectItem>
                <SelectItem value="oldest">Oldest Joined (Earliest first)</SelectItem>
                <SelectItem value="essays">Most Essays Marked</SelectItem>
                <SelectItem value="active">Recently Active (Last seen)</SelectItem>
                <SelectItem value="name">Candidate Name (A - Z)</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {/* Directory Count Header */}
      <div className="flex items-center justify-between text-xs text-muted-foreground px-1">
        <span>
          Showing <strong className="text-foreground">{filteredUsers.length}</strong> of{" "}
          <strong className="text-foreground">{totalUsers}</strong> accounts
        </span>
        {search && (
          <button
            type="button"
            onClick={() => setSearch("")}
            className="text-primary hover:underline font-semibold cursor-pointer"
          >
            Clear search
          </button>
        )}
      </div>

      {/* ── 4. Main User Directory List ── */}
      <div className="panel divide-y divide-border rounded-2xl border border-border bg-card shadow-xs overflow-hidden">
        <div className="max-h-[720px] overflow-y-auto custom-scrollbar divide-y divide-border/60">
          {paginatedUsers.map((user) => {
          const extra = activityById.get(user.id);
          const email = user.email || extra?.email;
          const isSoleAdmin =
            user.id === MARGINAL_ADMIN_USER_ID ||
            email?.toLowerCase().trim() === MARGINAL_ADMIN_EMAIL.toLowerCase();
          const isNewlyJoined = new Date(user.createdAt).getTime() >= twoDaysAgoMs;

          return (
            <div
              key={user.id}
              className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 px-4 sm:px-5 py-3.5 hover:bg-muted/30 transition-colors"
            >
              {/* User Avatar + Details */}
              <div className="flex items-start sm:items-center gap-3.5 min-w-0 flex-1">
                <UserAvatar
                  avatarUrl={user.avatarUrl}
                  name={user.fullName}
                  showStatusDot={extra?.isOnline}
                  className="size-11 shrink-0 ring-1 ring-border shadow-xs"
                />

                <div className="min-w-0 flex-1 space-y-1">
                  {/* Top Line: Name, Badges, Status */}
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-sm font-bold text-foreground truncate">
                      {user.fullName ?? "Unnamed candidate"}
                    </span>

                    {isSoleAdmin ? (
                      <Badge className="h-5 px-2 text-[9.5px] font-extrabold uppercase border-amber-500/40 text-amber-600 dark:text-amber-400 bg-amber-500/10 shadow-2xs">
                        Root Admin
                      </Badge>
                    ) : user.role === "teacher" ? (
                      <Badge className="h-5 px-2 text-[9.5px] font-bold uppercase bg-purple-500/15 text-purple-600 dark:text-purple-400 border border-purple-500/30">
                        Educator
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="h-5 px-2 text-[9.5px] font-medium bg-muted text-muted-foreground">
                        Candidate
                      </Badge>
                    )}

                    {isNewlyJoined && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400 text-[9.5px] font-extrabold uppercase shadow-2xs">
                        <Sparkles className="size-2.5" /> New Member
                      </span>
                    )}

                    {extra?.isOnline ? (
                      <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-emerald-600 dark:text-emerald-400">
                        <span className="size-2 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_8px_rgba(16,185,129,0.8)]" />
                        Online now {extra.currentPath ? `(${extra.currentPath})` : ""}
                      </span>
                    ) : extra?.lastActivity ? (
                      <span className="text-[11px] text-muted-foreground">
                        Active {timeAgo(extra.lastActivity)}
                      </span>
                    ) : null}
                  </div>

                  {/* Middle Line: Email, School, Joined Date */}
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                    {email ? (
                      <button
                        type="button"
                        onClick={() => copyToClipboard(email, user.id)}
                        className="inline-flex items-center gap-1 font-mono text-[11px] text-foreground hover:text-primary transition-colors cursor-pointer"
                        title="Click to copy email address"
                      >
                        <Mail className="size-3 text-muted-foreground" />
                        <span className="truncate max-w-[200px] sm:max-w-xs">{email}</span>
                        {copiedId === user.id ? (
                          <Check className="size-3 text-emerald-500 shrink-0" />
                        ) : (
                          <Copy className="size-3 text-muted-foreground/60 shrink-0" />
                        )}
                      </button>
                    ) : (
                      <span className="text-muted-foreground">No email</span>
                    )}

                    <span>·</span>
                    <span className="truncate max-w-xs">
                      {user.school ? `🏫 ${user.school}` : "🏫 Independent"}
                    </span>

                    <span>·</span>
                    <span className="text-foreground/90 font-medium">
                      Joined <strong className="text-primary">{timeAgo(user.createdAt)}</strong> ({new Date(user.createdAt).toLocaleDateString()})
                    </span>
                  </div>

                  {/* Bottom Line: Practice Counters */}
                  <div className="flex flex-wrap items-center gap-2 pt-0.5 text-[11px]">
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-muted/60 text-foreground font-medium">
                      <BookOpen className="size-3 text-primary" />
                      {extra?.essaysGraded ?? 0} essays marked
                      {(extra?.essaysToday ?? 0) > 0 && (
                        <strong className="text-emerald-600 dark:text-emerald-400 font-bold ml-0.5">
                          (+{extra?.essaysToday} today)
                        </strong>
                      )}
                    </span>

                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-muted/60 text-foreground font-medium">
                      <Target className="size-3 text-emerald-500" />
                      {extra?.mcqAttempts ?? 0} MCQs
                    </span>

                    {(extra?.liveExaminerSessions ?? 0) > 0 && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-muted/60 text-foreground font-medium">
                        <Sparkles className="size-3 text-indigo-500" />
                        {extra?.liveExaminerSessions} Live sessions
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Action Buttons on the Right */}
              <div className="flex flex-wrap items-center gap-2 shrink-0 self-end lg:self-center">
                {isSoleAdmin ? (
                  <Badge variant="outline" className="h-8 px-2.5 font-semibold border-amber-500/40 text-amber-600 dark:text-amber-400 bg-amber-500/10">
                    Administrator
                  </Badge>
                ) : (
                  <Select
                    value={user.role === "admin" ? "student" : user.role}
                    onValueChange={(value) =>
                      roleMutation.mutate({
                        userId: user.id,
                        role: value as "student" | "teacher",
                      })
                    }
                  >
                    <SelectTrigger className="w-32 h-8 text-xs font-semibold">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="student">Student</SelectItem>
                      <SelectItem value="teacher">Teacher</SelectItem>
                    </SelectContent>
                  </Select>
                )}

                {onTextUser && !isSoleAdmin && (
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    className="h-8 gap-1.5 text-xs text-primary hover:text-primary hover:bg-primary/10 border-primary/30 font-semibold cursor-pointer"
                    title="Send direct in-app message"
                    onClick={() => onTextUser(user.id)}
                  >
                    <Send className="size-3.5" />
                    <span>Text</span>
                  </Button>
                )}

                <Button
                  type="button"
                  size="icon"
                  variant="ghost"
                  className="size-8 text-muted-foreground hover:text-foreground cursor-pointer"
                  aria-label="Clear practice data"
                  title="Clear practice data (essays, MCQ attempts, Essay Grader sessions)"
                  onClick={() =>
                    setResetTarget({ id: user.id, name: user.fullName ?? "this account" })
                  }
                >
                  <Eraser className="size-4" />
                </Button>

                {!isSoleAdmin && (
                  <Button
                    type="button"
                    size="icon"
                    variant="ghost"
                    className="size-8 text-muted-foreground hover:text-destructive cursor-pointer"
                    aria-label="Delete this account"
                    title="Delete account permanently"
                    onClick={() =>
                      setDeleteTarget({ id: user.id, name: user.fullName ?? "this account" })
                    }
                  >
                    <Trash2 className="size-4" />
                  </Button>
                )}
              </div>
            </div>
          );
        })}

        {filteredUsers.length === 0 && (
          <div className="py-12 px-4 text-center space-y-2">
            <Users className="size-8 text-muted-foreground/50 mx-auto" />
            <p className="text-sm font-semibold text-foreground">No accounts match your criteria</p>
            <p className="text-xs text-muted-foreground">
              Try adjusting your search terms or clearing your role filter.
            </p>
            {search && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setSearch("")}
                className="mt-2 text-xs"
              >
                Clear Search
              </Button>
            )}
          </div>
        )}
        </div>

        {/* Pagination Controls Footer */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between border-t border-border/80 px-5 py-3 bg-card/60 text-xs">
            <span className="text-muted-foreground text-xs">
              Showing {startIndex + 1}–{Math.min(startIndex + pageSize, filteredUsers.length)} of {filteredUsers.length} accounts
            </span>
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={currentPage <= 1}
                className="h-8 px-3 text-xs gap-1 cursor-pointer"
              >
                <ChevronLeft className="size-3.5" />
                <span>Previous</span>
              </Button>
              <span className="text-xs font-semibold px-2">
                Page {currentPage} of {totalPages}
              </span>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                disabled={currentPage >= totalPages}
                className="h-8 px-3 text-xs gap-1 cursor-pointer"
              >
                <span>Next</span>
                <ChevronRight className="size-3.5" />
              </Button>
            </div>
          </div>
        )}
      </div>

      <AlertDialog open={!!resetTarget} onOpenChange={(open) => !open && setResetTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Clear practice data for {resetTarget?.name}?</AlertDialogTitle>
            <AlertDialogDescription>
              This permanently deletes every essay, MCQ attempt, and Essay Grader writing session
              for this account — a clean slate. Their login, role, and profile are untouched. This
              can't be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={resetMutation.isPending}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              disabled={resetMutation.isPending}
              onClick={() => resetTarget && resetMutation.mutate(resetTarget.id)}
            >
              {resetMutation.isPending ? (
                <>
                  <Loader2 className="size-4 animate-spin" /> Clearing…
                </>
              ) : (
                "Clear data"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete {deleteTarget?.name}?</AlertDialogTitle>
            <AlertDialogDescription>
              This permanently deletes the account and everything tied to it — essays, MCQ attempts,
              Essay Grader sessions, role, profile. This can't be undone and the person will be
              signed out everywhere immediately.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleteMutation.isPending}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              disabled={deleteMutation.isPending}
              onClick={() => deleteTarget && deleteMutation.mutate(deleteTarget.id)}
            >
              {deleteMutation.isPending ? (
                <>
                  <Loader2 className="size-4 animate-spin" /> Deleting…
                </>
              ) : (
                "Delete account"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
/* ------------------------------------------------------------------ */
/* Diagrams — admins add their own Cambridge diagrams to the library    */
/* ------------------------------------------------------------------ */

function DiagramsPanel() {
  const queryClient = useQueryClient();
  const list = useServerFn(listCustomDiagrams);
  const save = useServerFn(saveCustomDiagram);
  const remove = useServerFn(deleteCustomDiagram);
  const autofill = useServerFn(autofillDiagramFromImage);
  const photoInputRef = useRef<HTMLInputElement>(null);

  const diagrams = useQuery({ queryKey: ["custom-diagrams"], queryFn: () => list() });

  const [title, setTitle] = useState("");
  const [section, setSection] = useState<"Microeconomics" | "Macroeconomics">("Microeconomics");
  const [topic, setTopic] = useState("Added by your school");
  const [level, setLevel] = useState<"AS" | "IGCSE 0455" | "IGCSE 0455">("IGCSE 0455");
  const [templateId, setTemplateId] = useState(SPEC_TEMPLATES[0]?.id ?? "");
  const [represents, setRepresents] = useState("");
  const [whyUsed, setWhyUsed] = useState("");
  const [whenToDraw, setWhenToDraw] = useState("");
  const [howToRead, setHowToRead] = useState("");
  const [labels, setLabels] = useState("");
  const [mistakes, setMistakes] = useState("");
  const [tips, setTips] = useState("");
  const [specJson, setSpecJson] = useState("");

  const autofillMutation = useMutation({
    mutationFn: async (file: File) => {
      const [image] = await filesToPageImages([file]);
      if (!image) throw new Error("Could not read that photo.");
      return autofill({ data: { image } });
    },
    onSuccess: (draft) => {
      setTitle(draft.title);
      setSection(draft.section);
      setLevel(draft.level as any);
      setTopic(draft.topic);
      if (SPEC_TEMPLATES.some((item) => item.id === draft.templateId)) {
        setTemplateId(draft.templateId);
      }
      setRepresents(draft.represents);
      setWhyUsed(draft.whyUsed);
      setWhenToDraw(draft.whenToDraw);
      setHowToRead(draft.howToRead.join("\n"));
      setLabels(draft.labels.join("\n"));
      setMistakes(draft.mistakes.join("\n"));
      setTips(draft.tips.join("\n"));
      setSpecJson("");
      toast.success("Drafted from the photo — review each field, then add it.");
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const templatePreview = templateSpec(templateId);
  const parsedSpec = (() => {
    if (!specJson.trim()) return { spec: templatePreview, error: null as string | null };
    try {
      return { spec: JSON.parse(specJson), error: null as string | null };
    } catch {
      return { spec: null, error: "That geometry JSON is not valid." };
    }
  })();

  const toLines = (value: string) =>
    value
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean);

  const saveMutation = useMutation({
    mutationFn: () =>
      save({
        data: {
          title,
          section,
          topic,
          level,
          represents,
          whyUsed,
          whenToDraw,
          howToRead: toLines(howToRead),
          labels: toLines(labels).map((line) => {
            const [symbol, ...rest] = line.split("=");
            const sym = (symbol ?? "").trim();
            const mean = rest.join("=").trim();
            return { symbol: sym || "Label", meaning: mean || sym };
          }),
          mistakes: toLines(mistakes),
          tips: toLines(tips),
          realWorld: [],
          related: [],
          examQuestions: [],
          spec: parsedSpec.spec as Record<string, unknown>,
        },
      }),
    onSuccess: async () => {
      toast.success("Diagram added to the library.");
      setTitle("");
      setRepresents("");
      setWhyUsed("");
      setWhenToDraw("");
      setHowToRead("");
      setLabels("");
      setMistakes("");
      setTips("");
      setSpecJson("");
      await queryClient.invalidateQueries({ queryKey: ["custom-diagrams"] });
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => remove({ data: { id } }),
    onSuccess: async () => {
      toast.success("Diagram removed.");
      await queryClient.invalidateQueries({ queryKey: ["custom-diagrams"] });
    },
    onError: (error: Error) => toast.error(error.message),
  });

  return (
    <div className="grid gap-5 lg:grid-cols-[440px_1fr]">
      <section className="panel space-y-3 rounded-xl border border-border p-5">
        <h2 className="text-sm font-semibold">Add a diagram</h2>
        <p className="text-xs text-muted-foreground">
          Start from an exam-convention template, then rewrite the geometry if you need something
          different. New diagrams appear in the diagram library for every student.
        </p>

        <div className="space-y-1.5 rounded-lg border border-dashed border-border bg-muted/30 p-3">
          <Label className="flex items-center gap-1.5 text-xs font-medium">
            <Sparkles className="size-3.5" /> Quick add from a photo
          </Label>
          <p className="text-xs text-muted-foreground">
            Photograph a diagram from a coursebook, whiteboard or past paper — every field below
            gets drafted for you to review, instead of typing it all out by hand.
          </p>
          <input
            ref={photoInputRef}
            type="file"
            accept="image/*,application/pdf"
            className="hidden"
            onChange={(event) => {
              const file = event.target.files?.[0];
              if (file) autofillMutation.mutate(file);
              event.target.value = "";
            }}
          />
          <Button
            type="button"
            variant="secondary"
            size="sm"
            className="w-full"
            disabled={autofillMutation.isPending}
            onClick={() => photoInputRef.current?.click()}
          >
            {autofillMutation.isPending ? (
              <>
                <Loader2 className="size-4 animate-spin" /> Reading diagram…
              </>
            ) : (
              <>
                <ImagePlus className="size-4" /> Photograph or upload a diagram
              </>
            )}
          </Button>
        </div>

        <div className="space-y-1.5">
          <Label>Title</Label>
          <Input
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            placeholder="Minimum wage in a labour market"
          />
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label>Section</Label>
            <Select value={section} onValueChange={(value) => setSection(value as never)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Microeconomics">Microeconomics</SelectItem>
                <SelectItem value="Macroeconomics">Macroeconomics</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Level</Label>
            <Select value={level} onValueChange={(value) => setLevel(value as never)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="AS">AS</SelectItem>
                <SelectItem value="IGCSE 0455">IGCSE 0455</SelectItem>
                <SelectItem value="AS &amp; IGCSE 0455">AS &amp; IGCSE 0455</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="space-y-1.5">
          <Label>Topic group</Label>
          <Input value={topic} onChange={(event) => setTopic(event.target.value)} />
        </div>

        <div className="space-y-1.5">
          <Label>Geometry template</Label>
          <Select value={templateId} onValueChange={setTemplateId}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="max-h-72">
              {SPEC_TEMPLATES.map((item) => (
                <SelectItem key={item.id} value={item.id}>
                  {item.title}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1.5">
          <Label>
            What it represents <span className="text-muted-foreground">(one paragraph)</span>
          </Label>
          <Textarea rows={2} value={represents} onChange={(e) => setRepresents(e.target.value)} />
        </div>
        <div className="space-y-1.5">
          <Label>Why Cambridge uses it</Label>
          <Textarea rows={2} value={whyUsed} onChange={(e) => setWhyUsed(e.target.value)} />
        </div>
        <div className="space-y-1.5">
          <Label>When to draw it</Label>
          <Textarea rows={2} value={whenToDraw} onChange={(e) => setWhenToDraw(e.target.value)} />
        </div>
        <div className="space-y-1.5">
          <Label>
            How to read it <span className="text-muted-foreground">(one step per line)</span>
          </Label>
          <Textarea rows={3} value={howToRead} onChange={(e) => setHowToRead(e.target.value)} />
        </div>
        <div className="space-y-1.5">
          <Label>
            Labels <span className="text-muted-foreground">(one per line, e.g. P = price)</span>
          </Label>
          <Textarea rows={3} value={labels} onChange={(e) => setLabels(e.target.value)} />
        </div>
        <div className="space-y-1.5">
          <Label>
            Common mistakes <span className="text-muted-foreground">(one per line)</span>
          </Label>
          <Textarea rows={2} value={mistakes} onChange={(e) => setMistakes(e.target.value)} />
        </div>
        <div className="space-y-1.5">
          <Label>
            Examiner tips <span className="text-muted-foreground">(one per line)</span>
          </Label>
          <Textarea rows={2} value={tips} onChange={(e) => setTips(e.target.value)} />
        </div>
        <div className="space-y-1.5">
          <Label>
            Geometry JSON <span className="text-muted-foreground">(optional override)</span>
          </Label>
          <Textarea
            rows={4}
            className="font-mono text-[12px]"
            value={specJson}
            onChange={(event) => setSpecJson(event.target.value)}
            placeholder={JSON.stringify(templatePreview ?? {}).slice(0, 120)}
          />
          {parsedSpec.error ? <p className="text-xs text-destructive">{parsedSpec.error}</p> : null}
        </div>

        <Button
          className="w-full"
          onClick={() => saveMutation.mutate()}
          disabled={saveMutation.isPending || title.trim().length < 3 || !parsedSpec.spec}
        >
          {saveMutation.isPending ? <Loader2 className="size-4 animate-spin" /> : null}
          Add to diagram library
        </Button>
      </section>

      <section className="space-y-3">
        <div className="panel rounded-xl border border-border p-4">
          <p className="text-sm font-semibold">Preview</p>
          {parsedSpec.spec ? (
            <div className="mt-3">
              <EconomicsDiagram
                spec={parsedSpec.spec as never}
                title={title || "Untitled diagram"}
              />
            </div>
          ) : (
            <p className="mt-2 text-xs text-muted-foreground">Fix the geometry JSON to preview.</p>
          )}
        </div>

        {diagrams.isLoading ? <Skeleton className="h-24 w-full" /> : null}

        {(diagrams.data ?? []).map((row) => (
          <div
            key={row.id}
            className="panel flex flex-wrap items-center gap-3 rounded-xl border border-border p-4"
          >
            <div className="min-w-0">
              <p className="truncate text-sm font-medium">{row.title}</p>
              <p className="text-xs text-muted-foreground">
                {row.section} · {row.topic} · {row.level}
              </p>
            </div>
            <Button
              variant="ghost"
              size="sm"
              className="ml-auto"
              onClick={() => deleteMutation.mutate(row.id)}
              aria-label={`Delete ${row.title}`}
            >
              <Trash2 className="size-4" />
            </Button>
          </div>
        ))}

        {Array.isArray(diagrams.data) && diagrams.data.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No custom diagrams yet — the library still shows all built-in Cambridge diagrams.
          </p>
        ) : null}
      </section>
    </div>
  );
}

function ShowcaseAdminPanel() {
  const queryClient = useQueryClient();
  const listShowcase = useServerFn(adminListShowcaseEssays);
  const toggleVisibility = useServerFn(adminToggleShowcaseVisibility);
  const addExemplar = useServerFn(adminAddShowcaseExemplar);
  const deleteExemplar = useServerFn(adminDeleteShowcaseExemplar);
  const addToCalibrationFn = useServerFn(addShowcaseToCalibration);
  const getAnchorQuestionsFn = useServerFn(getCalibrationAnchorQuestions);

  const query = useQuery({
    queryKey: ["admin-showcase-essays"],
    queryFn: () => listShowcase(),
  });

  const anchorQuestionsQuery = useQuery({
    queryKey: ["calibration-anchor-questions"],
    queryFn: () => getAnchorQuestionsFn(),
  });

  const anchorQuestions = new Set(anchorQuestionsQuery.data ?? []);
  const [calibratingId, setCalibratingId] = useState<string | null>(null);

  const calibrationMutation = useMutation({
    mutationFn: (item: ShowcaseEssayItem) => {
      setCalibratingId(item.version_id);
      return addToCalibrationFn({
        data: {
          question: item.question,
          essayText: item.essay_text,
          mark: item.total_mark,
          maxMark: item.max_mark,
          notes: item.grading?.examiner_summary
            ? `Examiner note: ${item.grading.examiner_summary}`
            : `Exemplar essay imported from Showcase (${item.author_initials})`,
        },
      });
    },
    onSuccess: (res) => {
      toast.success(
        res.updated
          ? "Calibration anchor updated from this exemplar."
          : "Exemplar successfully added as a calibration anchor!",
      );
      queryClient.invalidateQueries({ queryKey: ["calibration-anchor-questions"] });
      queryClient.invalidateQueries({ queryKey: ["admin-overview"] });
    },
    onError: (err: Error) => toast.error(`Failed to add anchor: ${err.message}`),
    onSettled: () => setCalibratingId(null),
  });

  const [search, setSearch] = useState("");
  const [question, setQuestion] = useState("");
  const [maxMark, setMaxMark] = useState<number>(12);
  const [totalMark, setTotalMark] = useState<number>(12);
  const [ao1, setAo1] = useState<number | undefined>(2);
  const [ao2, setAo2] = useState<number | undefined>(6);
  const [ao3, setAo3] = useState<number | undefined>(4);
  const [topicName, setTopicName] = useState("");
  const [authorName, setAuthorName] = useState("");
  const [examinerSummary, setExaminerSummary] = useState("");
  const [essayText, setEssayText] = useState("");
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const refresh = () => {
    queryClient.invalidateQueries({ queryKey: ["admin-showcase-essays"] });
    queryClient.invalidateQueries({ queryKey: ["showcase-essays"] });
  };

  const addMutation = useMutation({
    mutationFn: () =>
      addExemplar({
        data: {
          question,
          maxMark,
          totalMark,
          ao1Awarded: ao1,
          ao2Awarded: ao2,
          ao3Awarded: ao3,
          topicName: topicName || undefined,
          authorName: authorName || undefined,
          examinerSummary: examinerSummary || undefined,
          essayText,
        },
      }),
    onSuccess: async () => {
      toast.success("Exemplar essay added to Showcase.");
      setQuestion("");
      setEssayText("");
      setExaminerSummary("");
      setTopicName("");
      setAuthorName("");
      await refresh();
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const toggleMutation = useMutation({
    mutationFn: (input: { versionId: string; hidden: boolean; essayId?: string }) =>
      toggleVisibility({ data: input }),
    onSuccess: async (res) => {
      toast.success(
        res.hidden ? "Essay hidden from student showcase." : "Essay restored to showcase.",
      );
      await refresh();
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const deleteMutation = useMutation({
    mutationFn: (item: { id: string; essayId?: string }) =>
      deleteExemplar({ data: item }),
    onSuccess: async () => {
      toast.success("Essay permanently removed from showcase.");
      await refresh();
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const [statusFilter, setStatusFilter] = useState<"active" | "hidden" | "removed" | "all">("active");

  const allItems: ShowcaseEssayItem[] = (query.data as ShowcaseEssayItem[]) ?? [];
  const activeCount = allItems.filter((i) => !i.is_hidden && !i.is_removed).length;
  const hiddenCount = allItems.filter((i) => i.is_hidden && !i.is_removed).length;
  const removedCount = allItems.filter((i) => i.is_removed).length;

  const filtered = allItems.filter((item) => {
    // Status filter
    if (statusFilter === "active" && (item.is_hidden || item.is_removed)) return false;
    if (statusFilter === "hidden" && (!item.is_hidden || item.is_removed)) return false;
    if (statusFilter === "removed" && !item.is_removed) return false;
    if (statusFilter === "all" && item.is_removed) return false;

    if (!search.trim()) return true;
    const q = search.toLowerCase().trim();
    return (
      item.question.toLowerCase().includes(q) ||
      (item.topic_name && item.topic_name.toLowerCase().includes(q)) ||
      item.author_initials.toLowerCase().includes(q) ||
      item.essay_text.toLowerCase().includes(q)
    );
  });

  return (
    <div className="grid gap-5 lg:grid-cols-[440px_1fr]">
      {/* Left: Add Exemplar */}
      <section className="panel rounded-xl border border-border p-5 space-y-4">
        <div>
          <h2 className="flex items-center gap-2 text-sm font-semibold">
            <Plus className="size-4 text-primary" /> Add Model Exemplar
          </h2>
          <p className="mt-1 text-xs text-muted-foreground">
            Publish verified Cambridge examiner exemplar answers directly to the Showcase.
          </p>
        </div>

        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label>Question text</Label>
            <Textarea
              rows={2}
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              placeholder="e.g. Evaluate whether supply-side policies are more effective than demand-side..."
              className="text-xs"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Tariff</Label>
              <Select
                value={String(maxMark)}
                onValueChange={(val) => {
                  const num = Number(val);
                  setMaxMark(num);
                  setTotalMark(num);
                  if (num === 8) {
                    setAo1(3);
                    setAo2(5);
                    setAo3(undefined);
                  } else if (num === 12) {
                    setAo1(2);
                    setAo2(6);
                    setAo3(4);
                  } else if (num === 20) {
                    setAo1(4);
                    setAo2(8);
                    setAo3(8);
                  }
                }}
              >
                <SelectTrigger className="text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="8">8-mark question</SelectItem>
                  <SelectItem value="12">12-mark question</SelectItem>
                  <SelectItem value="20">20-mark question</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label>Awarded mark</Label>
              <Input
                type="number"
                min={1}
                max={maxMark}
                value={totalMark}
                onChange={(e) => setTotalMark(Number(e.target.value))}
                className="text-xs"
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-2">
            <div className="space-y-1">
              <Label className="text-[11px]">AO1 Mark</Label>
              <Input
                type="number"
                value={ao1 ?? ""}
                onChange={(e) => setAo1(e.target.value ? Number(e.target.value) : undefined)}
                className="h-8 text-xs"
                placeholder="AO1"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-[11px]">AO2 Mark</Label>
              <Input
                type="number"
                value={ao2 ?? ""}
                onChange={(e) => setAo2(e.target.value ? Number(e.target.value) : undefined)}
                className="h-8 text-xs"
                placeholder="AO2"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-[11px]">AO3 Mark</Label>
              <Input
                type="number"
                value={ao3 ?? ""}
                onChange={(e) => setAo3(e.target.value ? Number(e.target.value) : undefined)}
                className="h-8 text-xs"
                placeholder="AO3"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Topic name (optional)</Label>
              <Input
                value={topicName}
                onChange={(e) => setTopicName(e.target.value)}
                placeholder="e.g. Macroeconomic policy"
                className="text-xs"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Author name</Label>
              <Input
                value={authorName}
                onChange={(e) => setAuthorName(e.target.value)}
                placeholder="e.g. Cambridge Senior Examiner"
                className="text-xs"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>Examiner commentary / Band notes</Label>
            <Textarea
              rows={2}
              value={examinerSummary}
              onChange={(e) => setExaminerSummary(e.target.value)}
              placeholder="Why this essay achieves Level 5..."
              className="text-xs"
            />
          </div>

          <div className="space-y-1.5">
            <Label>Full exemplar essay text</Label>
            <Textarea
              rows={6}
              value={essayText}
              onChange={(e) => setEssayText(e.target.value)}
              placeholder="Write or paste full model essay here..."
              className="font-serif text-xs leading-relaxed"
            />
          </div>

          <Button
            className="w-full"
            onClick={() => addMutation.mutate()}
            disabled={
              addMutation.isPending || question.trim().length < 5 || essayText.trim().length < 20
            }
          >
            {addMutation.isPending ? (
              <Loader2 className="mr-1.5 size-4 animate-spin" />
            ) : (
              <Plus className="mr-1.5 size-4" />
            )}
            Publish to Showcase
          </Button>
        </div>
      </section>

      {/* Right: Manage Showcase Essays */}
      <section className="space-y-4">
        <div className="panel space-y-3 rounded-xl border border-border p-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h3 className="text-sm font-semibold">Showcase Repository &amp; Moderation</h3>
              <p className="text-xs text-muted-foreground">
                {activeCount} live in student showcase • {hiddenCount} hidden • {removedCount} removed
              </p>
            </div>
            <div className="relative min-w-[200px]">
              <Search className="absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Filter showcase essays…"
                className="h-8 pl-8 text-xs"
              />
            </div>
          </div>

          {/* Quick status tabs */}
          <div className="flex flex-wrap items-center gap-1.5 border-t border-border/50 pt-2.5">
            <button
              type="button"
              onClick={() => setStatusFilter("active")}
              className={cn(
                "rounded-md px-2.5 py-1 text-xs font-medium transition-colors cursor-pointer",
                statusFilter === "active"
                  ? "bg-primary text-primary-foreground shadow-xs"
                  : "bg-muted/60 text-muted-foreground hover:bg-muted hover:text-foreground",
              )}
            >
              Active in Showcase ({activeCount})
            </button>
            <button
              type="button"
              onClick={() => setStatusFilter("hidden")}
              className={cn(
                "rounded-md px-2.5 py-1 text-xs font-medium transition-colors cursor-pointer",
                statusFilter === "hidden"
                  ? "bg-destructive text-destructive-foreground shadow-xs"
                  : "bg-muted/60 text-muted-foreground hover:bg-muted hover:text-foreground",
              )}
            >
              Hidden from Students ({hiddenCount})
            </button>
            <button
              type="button"
              onClick={() => setStatusFilter("removed")}
              className={cn(
                "rounded-md px-2.5 py-1 text-xs font-medium transition-colors cursor-pointer",
                statusFilter === "removed"
                  ? "bg-amber-600 text-white shadow-xs"
                  : "bg-muted/60 text-muted-foreground hover:bg-muted hover:text-foreground",
              )}
            >
              Removed Archive ({removedCount})
            </button>
            <button
              type="button"
              onClick={() => setStatusFilter("all")}
              className={cn(
                "rounded-md px-2.5 py-1 text-xs font-medium transition-colors cursor-pointer",
                statusFilter === "all"
                  ? "bg-secondary text-secondary-foreground shadow-xs"
                  : "bg-muted/60 text-muted-foreground hover:bg-muted hover:text-foreground",
              )}
            >
              All Live ({activeCount + hiddenCount})
            </button>
          </div>
        </div>

        {query.isLoading ? (
          <div className="space-y-3">
            <Skeleton className="h-24 w-full" />
            <Skeleton className="h-24 w-full" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border p-8 text-center text-xs text-muted-foreground">
            {statusFilter === "removed"
              ? "No removed essays in archive."
              : statusFilter === "hidden"
                ? "No essays currently hidden."
                : "No showcase essays match your search or filter."}
          </div>
        ) : (
          <div className="space-y-3">
            {filtered.map((item) => (
              <div
                key={item.version_id}
                className={`panel rounded-xl border p-4 transition-all duration-150 ${
                  item.is_removed
                    ? "border-amber-500/30 bg-amber-500/[0.03] opacity-75"
                    : item.is_hidden
                      ? "border-destructive/30 bg-destructive/[0.02] opacity-75"
                      : "border-border"
                }`}
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0 flex-1 space-y-1.5">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <Badge
                        variant={item.is_removed ? "outline" : item.is_hidden ? "destructive" : "default"}
                        className="text-[11px] font-semibold"
                      >
                        <Trophy className="mr-1 size-3" />
                        {item.total_mark} / {item.max_mark} marks
                      </Badge>

                      {item.is_removed ? (
                        <Badge
                          variant="outline"
                          className="border-amber-500/40 bg-amber-500/10 text-[11px] font-semibold text-amber-600 dark:text-amber-400"
                        >
                          <Trash2 className="mr-1 size-3" /> Removed from Showcase
                        </Badge>
                      ) : item.is_hidden ? (
                        <Badge
                          variant="outline"
                          className="border-destructive/40 text-[11px] text-destructive"
                        >
                          <EyeOff className="mr-1 size-3" /> Hidden from Students
                        </Badge>
                      ) : (
                        <Badge
                          variant="outline"
                          className="border-emerald-500/40 text-[11px] text-emerald-600 dark:text-emerald-400"
                        >
                          <Eye className="mr-1 size-3" /> Live in Showcase
                        </Badge>
                      )}

                      {anchorQuestions.has(item.question.trim()) ? (
                        <Badge
                          variant="outline"
                          className="border-primary/40 bg-primary/10 text-[11px] font-semibold text-primary"
                        >
                          <Anchor className="mr-1 size-3" /> Calibration Anchor
                        </Badge>
                      ) : null}

                      <Badge variant="secondary" className="text-[11px]">
                        {item.source === "cambridge_model"
                          ? "Cambridge Model"
                          : item.source === "teacher_model"
                            ? "Teacher Exemplar"
                            : item.source === "admin_added"
                              ? "Admin Added"
                              : "Student Auto"}
                      </Badge>

                      <span className="text-[11px] text-muted-foreground">
                        Author:{" "}
                        <strong className="font-medium text-foreground">
                          {item.author_initials}
                        </strong>
                      </span>
                    </div>

                    <p className="text-xs font-semibold leading-snug text-foreground">
                      {item.question}
                    </p>
                  </div>

                  <div className="flex shrink-0 items-center gap-1.5">
                    <Button
                      variant={anchorQuestions.has(item.question.trim()) ? "secondary" : "default"}
                      size="sm"
                      className="h-7 text-xs gap-1"
                      onClick={() => calibrationMutation.mutate(item)}
                      disabled={calibratingId === item.version_id}
                      title={
                        anchorQuestions.has(item.question.trim())
                          ? "Already grounded as a Calibration Anchor (click to sync)"
                          : "Add this exemplar directly into Calibration Anchors to ground the AI examiner"
                      }
                    >
                      {calibratingId === item.version_id ? (
                        <Loader2 className="size-3.5 animate-spin" />
                      ) : (
                        <Anchor className="size-3.5" />
                      )}
                      <span>
                        {anchorQuestions.has(item.question.trim())
                          ? "Sync Anchor"
                          : "Add to Calibration"}
                      </span>
                    </Button>

                    {item.is_removed ? (
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-7 text-xs gap-1 border-amber-500/40 text-amber-700 dark:text-amber-300 hover:bg-amber-500/10"
                        onClick={() =>
                          toggleMutation.mutate({
                            versionId: item.version_id,
                            essayId: item.essay_id,
                            hidden: false,
                          })
                        }
                        disabled={toggleMutation.isPending}
                        title="Restore this exemplar back to the active showcase"
                      >
                        <RotateCcw className="size-3.5 mr-1" /> Restore to Showcase
                      </Button>
                    ) : (
                      <>
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-7 text-xs"
                          onClick={() =>
                            toggleMutation.mutate({
                              versionId: item.version_id,
                              essayId: item.essay_id,
                              hidden: !item.is_hidden,
                            })
                          }
                          disabled={toggleMutation.isPending}
                        >
                          {item.is_hidden ? (
                            <>
                              <Eye className="mr-1 size-3.5" /> Restore
                            </>
                          ) : (
                            <>
                              <EyeOff className="mr-1 size-3.5 text-muted-foreground" /> Hide
                            </>
                          )}
                        </Button>

                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 text-xs text-destructive hover:bg-destructive/10"
                          onClick={() =>
                            deleteMutation.mutate({
                              id: item.version_id,
                              essayId: item.essay_id,
                            })
                          }
                          disabled={deleteMutation.isPending}
                          title="Remove permanently from showcase"
                        >
                          <Trash2 className="size-3.5" />
                        </Button>
                      </>
                    )}

                    <Button
                      variant="secondary"
                      size="sm"
                      className="h-7 text-xs"
                      onClick={() =>
                        setExpandedId(expandedId === item.version_id ? null : item.version_id)
                      }
                    >
                      {expandedId === item.version_id ? "Close" : "Inspect"}
                    </Button>
                  </div>
                </div>

                {expandedId === item.version_id ? (
                  <div className="mt-3 space-y-2 border-t border-border/60 pt-3 text-xs">
                    {item.grading?.examiner_summary ? (
                      <p className="rounded-md bg-muted/40 p-2.5 italic text-muted-foreground">
                        "{stripStars(item.grading.examiner_summary)}"
                      </p>
                    ) : null}
                    <div className="max-h-60 overflow-y-auto whitespace-pre-wrap rounded-lg bg-muted/20 p-3 font-serif text-foreground border border-border/40">
                      {stripStars(item.essay_text)}
                    </div>
                    <div className="flex items-center justify-between gap-2 pt-2 border-t border-border/40">
                      <span className="text-[11px] text-muted-foreground flex items-center gap-1.5">
                        <Anchor className="size-3 text-primary" />
                        {anchorQuestions.has(item.question.trim())
                          ? "Grounded in AI examiner prompt as an active Calibration Anchor."
                          : "Not yet loaded into Calibration Anchors."}
                      </span>
                      <Button
                        size="sm"
                        variant={anchorQuestions.has(item.question.trim()) ? "outline" : "default"}
                        className="h-7 text-xs gap-1"
                        onClick={() => calibrationMutation.mutate(item)}
                        disabled={calibratingId === item.version_id}
                      >
                        {calibratingId === item.version_id ? (
                          <Loader2 className="size-3 animate-spin" />
                        ) : (
                          <Anchor className="size-3" />
                        )}
                        {anchorQuestions.has(item.question.trim())
                          ? "Sync Calibration Anchor"
                          : "Add to Calibration Anchors"}
                      </Button>
                    </div>
                  </div>
                ) : null}
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

// PricingAdminPanel imported from @/components/app/pricing-admin-panel

function PaymentApprovalsAdminPanel() {
  const queryClient = useQueryClient();
  const listRequestsFn = useServerFn(listUpiPaymentRequests);
  const approveRequestFn = useServerFn(approveUpiPaymentRequest);
  const rejectRequestFn = useServerFn(rejectUpiPaymentRequest);
  const revokeRequestFn = useServerFn(revokeUpiPaymentRequest);
  const updateUpiFn = useServerFn(updateMerchantUpiConfig);
  const getPricingConfigFn = useServerFn(getPaymentConfig);

  const paymentsQuery = useQuery({
    queryKey: ["admin-upi-payments"],
    queryFn: () => listRequestsFn(),
    refetchInterval: 12_000,
  });

  const configQuery = useQuery({
    queryKey: ["payment-config"],
    queryFn: () => getPricingConfigFn(),
    staleTime: 0,
    refetchOnMount: "always",
  });

  const [upiInput, setUpiInput] = useState("");
  const [copiedUtr, setCopiedUtr] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<"all" | "pending" | "approved" | "rejected">("pending");
  const [searchQuery, setSearchQuery] = useState("");

  const requests = paymentsQuery.data?.requests || [];
  const activeMerchantUpi = configQuery.data?.merchantUpiId || "8754256082-2@ybl";

  const updateUpiMutation = useMutation({
    mutationFn: (data: { upiId: string }) => updateUpiFn({ data }),
    onSuccess: async (res: any) => {
      toast.success(res?.message || "Merchant UPI updated!");
      await queryClient.invalidateQueries({ queryKey: ["payment-config"] });
      configQuery.refetch();
      setUpiInput("");
    },
    onError: (err: any) => toast.error(err?.message || "Failed to update UPI ID."),
  });

  const approveMutation = useMutation({
    mutationFn: (data: { logId: string; userId: string; tier: any }) => approveRequestFn({ data }),
    onSuccess: (res: any) => {
      toast.success(res?.message || "Payment verified and approved!");
      queryClient.invalidateQueries({ queryKey: ["admin-upi-payments"] });
      queryClient.invalidateQueries({ queryKey: ["admin-overview"] });
    },
    onError: (err: any) => toast.error(err?.message || "Approval failed."),
  });

  const rejectMutation = useMutation({
    mutationFn: (data: { logId: string; userId: string; reason?: string }) => rejectRequestFn({ data }),
    onSuccess: (res: any) => {
      toast.success(res?.message || "Payment request rejected.");
      queryClient.invalidateQueries({ queryKey: ["admin-upi-payments"] });
    },
    onError: (err: any) => toast.error(err?.message || "Rejection failed."),
  });

  const revokeMutation = useMutation({
    mutationFn: (data: { logId: string; userId: string; reason?: string }) => revokeRequestFn({ data }),
    onSuccess: (res: any) => {
      toast.success(res?.message || "Subscription access revoked.");
      queryClient.invalidateQueries({ queryKey: ["admin-upi-payments"] });
      queryClient.invalidateQueries({ queryKey: ["admin-overview"] });
    },
    onError: (err: any) => toast.error(err?.message || "Revocation failed."),
  });

  const copyUtr = (utr: string) => {
    if (typeof navigator !== "undefined" && navigator.clipboard) {
      navigator.clipboard.writeText(utr);
      setCopiedUtr(utr);
      toast.success(`UTR #${utr} copied!`);
      setTimeout(() => setCopiedUtr(null), 2000);
    }
  };

  const pendingCount = requests.filter((r) => r.status === "pending").length;
  const approvedCount = requests.filter((r) => r.status === "approved").length;
  const rejectedCount = requests.filter((r) => r.status === "rejected").length;

  const filteredRequests = requests.filter((r) => {
    if (statusFilter !== "all" && r.status !== statusFilter) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return (
        r.utr.toLowerCase().includes(q) ||
        r.userEmail.toLowerCase().includes(q) ||
        r.tier.toLowerCase().includes(q)
      );
    }
    return true;
  });

  return (
    <div className="space-y-6">
      {/* ── Section 1: Merchant UPI Settings ── */}
      <div className="rounded-2xl border border-border bg-card p-5 sm:p-6 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h2 className="text-base font-bold flex items-center gap-2">
              <Coins className="size-4 text-emerald-500" />
              Direct UPI Merchant Configuration
            </h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              Set the bank UPI ID where student payments will be sent via QR code or direct UPI apps.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">Active UPI ID:</span>
            <code className="text-xs font-mono font-bold bg-muted px-2.5 py-1 rounded-md text-foreground border border-border">
              {activeMerchantUpi}
            </code>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row items-center gap-3 pt-2 border-t border-border/60">
          <Input
            placeholder="Enter your real UPI ID (e.g. yourname@okhdfcbank or 9876543210@paytm)"
            value={upiInput}
            onChange={(e) => setUpiInput(e.target.value)}
            className="text-xs font-mono bg-background h-9 flex-1"
          />
          <Button
            size="sm"
            disabled={!upiInput.trim() || updateUpiMutation.isPending}
            onClick={() => updateUpiMutation.mutate({ upiId: upiInput.trim() })}
            className="w-full sm:w-auto text-xs font-semibold h-9 shrink-0 gap-1.5 cursor-pointer"
          >
            {updateUpiMutation.isPending ? (
              <Loader2 className="size-3.5 animate-spin" />
            ) : (
              <CheckCircle2 className="size-3.5" />
            )}
            Save Active UPI ID
          </Button>
        </div>
      </div>

      {/* ── Section 2: Metrics Strip ── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="rounded-xl border border-border bg-card p-4 shadow-xs">
          <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
            Total Submissions
          </p>
          <p className="text-2xl font-bold mt-1 text-foreground">{requests.length}</p>
        </div>
        <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-4 shadow-xs">
          <p className="text-[11px] font-semibold text-amber-700 dark:text-amber-300 uppercase tracking-wider flex items-center gap-1.5">
            <Clock className="size-3.5 text-amber-500 animate-pulse" />
            Pending Verification
          </p>
          <p className="text-2xl font-bold mt-1 text-amber-900 dark:text-amber-200">{pendingCount}</p>
        </div>
        <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-4 shadow-xs">
          <p className="text-[11px] font-semibold text-emerald-700 dark:text-emerald-300 uppercase tracking-wider flex items-center gap-1.5">
            <CheckCircle2 className="size-3.5 text-emerald-500" />
            Approved Payments
          </p>
          <p className="text-2xl font-bold mt-1 text-emerald-900 dark:text-emerald-200">{approvedCount}</p>
        </div>
        <div className="rounded-xl border border-border bg-card p-4 shadow-xs">
          <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
            Rejected / Fraud
          </p>
          <p className="text-2xl font-bold mt-1 text-muted-foreground">{rejectedCount}</p>
        </div>
      </div>

      {/* ── Section 3: Approvals Desk Table ── */}
      <div className="rounded-2xl border border-border bg-card shadow-xs overflow-hidden">
        {/* Table Controls */}
        <div className="p-4 sm:p-5 border-b border-border flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="flex items-center gap-1.5 bg-muted/60 p-1 rounded-xl text-xs">
            <button
              type="button"
              onClick={() => setStatusFilter("pending")}
              className={cn(
                "px-3 py-1.5 rounded-lg font-semibold transition-all cursor-pointer",
                statusFilter === "pending"
                  ? "bg-amber-500 text-white shadow-xs"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              Pending ({pendingCount})
            </button>
            <button
              type="button"
              onClick={() => setStatusFilter("all")}
              className={cn(
                "px-3 py-1.5 rounded-lg font-semibold transition-all cursor-pointer",
                statusFilter === "all"
                  ? "bg-card text-foreground shadow-xs"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              All ({requests.length})
            </button>
            <button
              type="button"
              onClick={() => setStatusFilter("approved")}
              className={cn(
                "px-3 py-1.5 rounded-lg font-semibold transition-all cursor-pointer",
                statusFilter === "approved"
                  ? "bg-card text-foreground shadow-xs"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              Approved ({approvedCount})
            </button>
            <button
              type="button"
              onClick={() => setStatusFilter("rejected")}
              className={cn(
                "px-3 py-1.5 rounded-lg font-semibold transition-all cursor-pointer",
                statusFilter === "rejected"
                  ? "bg-card text-foreground shadow-xs"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              Rejected ({rejectedCount})
            </button>
          </div>

          <div className="flex items-center gap-2">
            <div className="relative w-full sm:w-64">
              <Search className="absolute left-2.5 top-2.5 size-3.5 text-muted-foreground" />
              <Input
                placeholder="Search UTR or student email..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="h-8 text-xs pl-8 bg-background"
              />
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => paymentsQuery.refetch()}
              className="h-8 px-2 text-xs cursor-pointer"
              title="Refresh queue"
            >
              <RefreshCw className={cn("size-3.5", paymentsQuery.isFetching && "animate-spin")} />
            </Button>
          </div>
        </div>

        {/* Requests List */}
        {filteredRequests.length === 0 ? (
          <div className="py-16 text-center text-xs text-muted-foreground space-y-2">
            <CheckCircle2 className="mx-auto size-8 text-emerald-500/60" />
            <p className="font-semibold text-foreground text-sm">
              {statusFilter === "pending"
                ? "No pending approvals in queue!"
                : "No matching payment requests found."}
            </p>
            <p className="max-w-xs mx-auto text-muted-foreground">
              {statusFilter === "pending"
                ? "All student payments have been verified against your bank statement."
                : "Incoming UPI reference submissions will appear here automatically."}
            </p>
          </div>
        ) : (
          <div className="divide-y divide-border/60">
            {filteredRequests.map((req) => (
              <div
                key={req.id}
                className="p-4 sm:p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 hover:bg-muted/30 transition-colors"
              >
                {/* Left Info: Email & Tier */}
                <div className="space-y-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-semibold text-xs text-foreground truncate">
                      {req.userEmail}
                    </span>
                    <Badge
                      variant="outline"
                      className="font-mono text-[10px] uppercase font-bold px-2 py-0.5 border-primary/30 text-primary bg-primary/5"
                    >
                      {req.tier} · ₹{req.amount}
                    </Badge>
                    {(req as any).couponCode && (
                      <Badge variant="outline" className="bg-emerald-500/10 border-emerald-500/30 text-emerald-600 dark:text-emerald-400 text-[10px] gap-1 font-mono font-bold">
                        <Tag className="size-2.5" /> {(req as any).couponCode}
                      </Badge>
                    )}
                    {req.status === "pending" && (
                      <Badge className="bg-amber-500 text-white text-[10px] gap-1 font-semibold">
                        <Clock className="size-3 animate-pulse" /> Pending Verification
                      </Badge>
                    )}
                    {req.status === "approved" && (
                      <Badge className="bg-emerald-600 text-white text-[10px] gap-1 font-semibold">
                        <CheckCircle2 className="size-3" /> Approved
                      </Badge>
                    )}
                    {req.status === "rejected" && (
                      <Badge variant="destructive" className="text-[10px] gap-1 font-semibold">
                        <XCircle className="size-3" /> Rejected
                      </Badge>
                    )}
                  </div>

                  <div className="flex items-center gap-3 text-[11px] text-muted-foreground flex-wrap">
                    <span>
                      Submitted: {new Date(req.submittedAt).toLocaleDateString()} at{" "}
                      {new Date(req.submittedAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                    </span>
                    {req.reviewedAt && (
                      <span className="text-[10px] text-muted-foreground/80">
                        (Reviewed {new Date(req.reviewedAt).toLocaleDateString()})
                      </span>
                    )}
                  </div>
                </div>

                {/* Center: 12-Digit UTR with 1-Click Copy */}
                <div className="flex items-center gap-2 bg-muted/60 px-3 py-1.5 rounded-lg border border-border/80 shrink-0">
                  <div className="space-y-0.5">
                    <p className="text-[9.5px] uppercase font-bold text-muted-foreground tracking-wider">
                      Bank Ref (UTR)
                    </p>
                    <code className="text-xs font-mono font-bold text-foreground">
                      {req.utr}
                    </code>
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => copyUtr(req.utr)}
                    className="h-7 px-2 text-[11px] gap-1 cursor-pointer"
                    title="Copy UTR to check bank SMS or GPay app"
                  >
                    {copiedUtr === req.utr ? (
                      <Check className="size-3 text-emerald-500" />
                    ) : (
                      <Copy className="size-3" />
                    )}
                    {copiedUtr === req.utr ? "Copied" : "Copy"}
                  </Button>
                </div>

                {/* Right: Actions */}
                <div className="flex items-center gap-2 shrink-0">
                  {req.status === "pending" && (
                    <>
                      <Button
                        size="sm"
                        disabled={approveMutation.isPending || rejectMutation.isPending}
                        onClick={() =>
                          approveMutation.mutate({
                            logId: req.id,
                            userId: req.userId,
                            tier: req.tier,
                          })
                        }
                        className="h-8 text-xs font-semibold gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white cursor-pointer"
                      >
                        <CheckCircle2 className="size-3.5" />
                        Approve &amp; Upgrade
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={approveMutation.isPending || rejectMutation.isPending}
                        onClick={() => {
                          if (window.confirm(`Reject payment submission for ${req.userEmail} with UTR #${req.utr}?`)) {
                            rejectMutation.mutate({
                              logId: req.id,
                              userId: req.userId,
                              reason: "UTR not found in bank credits",
                            });
                          }
                        }}
                        className="h-8 text-xs font-semibold gap-1 text-destructive hover:bg-destructive/10 cursor-pointer"
                      >
                        <XCircle className="size-3.5" />
                        Reject
                      </Button>
                    </>
                  )}

                  {req.status === "approved" && (
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={revokeMutation.isPending}
                      onClick={() => {
                        if (window.confirm(`Revoke subscription for ${req.userEmail} and reset to Free?`)) {
                          revokeMutation.mutate({
                            logId: req.id,
                            userId: req.userId,
                            reason: "Admin manual revocation",
                          });
                        }
                      }}
                      className="h-7 text-[11px] font-semibold text-muted-foreground hover:text-destructive cursor-pointer"
                    >
                      Revoke Access
                    </Button>
                  )}

                  {req.status === "rejected" && (
                    <span className="text-[11px] text-muted-foreground italic">
                      Rejected ({req.rejectionReason || "Invalid UTR"})
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

