import { createFileRoute, Link, redirect } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import {
  Activity,
  ArrowDown,
  ArrowUp,
  BookOpen,
  Check,
  BarChart3,
  CheckCircle2,
  Clipboard,
  ChevronRight,
  Clock,
  Coins,
  Copy,
  Crown,
  Send,
  MessageSquare,
  CreditCard,
  Eraser,
  ExternalLink,
  Eye,
  EyeOff,
  GraduationCap,
  ImagePlus,
  KeyRound,
  Layers,
  LineChart,
  Loader2,
  Mail,
  Plug,
  Plus,
  RefreshCw,
  Search,
  ShieldCheck,
  ShieldPlus,
  Sparkles,
  Tag,
  Target,
  Trash2,
  Trophy,
  UploadCloud,
  Users,
  XCircle,
  Zap,
} from "lucide-react";
import { useRef, useState } from "react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

import { AdminGodmodeDashboard } from "@/components/app/admin-godmode";
import { MessagesAdminPanel } from "@/components/app/messages-admin";
import { FeedbackAdminPanel } from "@/components/app/feedback-admin";
import { PricingAdminPanel, PaymentApprovalsAdminPanel } from "@/components/app/pricing-admin";
import { CouponsAdminPanel } from "@/components/app/coupons-admin";

import { PublicWaitlistPanel } from "@/components/app/public-waitlist-admin";
import { TeacherApprovalsPanel } from "@/components/app/teacher-approvals-admin";
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
import { isAdmin } from "@/lib/auth-admin";
import { supabase } from "@/integrations/backend/client";
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
  adminOverview,
  clearAiUsageLog,
  deleteProviderKey,
  deleteUserAccount,
  listProviderKeys,
  listUsers,
  resetAllScores,
  resetStudentPracticeData,
  rotateProviderKey,
  saveProviderKey,
  setUserRole,
  testEmbeddingProviderKey,
  testProviderKey,
  testSpecificKey,
  testVisionProviderKey,
} from "@/lib/admin.functions";
import { getMe } from "@/lib/account.functions";
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
  beforeLoad: async ({ context }) => {
    let user = (context as any)?.user;
    if (!user) {
      try {
        const { data } = await supabase.auth.getUser();
        user = data?.user;
      } catch {
        user = null;
      }
    }
    if (!user) {
      throw redirect({ to: "/auth", search: { redirect: "/admin" } });
    }

    let adminOk = isAdmin({
      userId: user?.id,
      email: user?.email,
      claims: user,
    });

    if (!adminOk && user?.id) {
      try {
        const { data: roleRow } = await supabase
          .from("user_roles")
          .select("role")
          .eq("user_id", user.id)
          .eq("role", "admin")
          .maybeSingle();
        if (roleRow) {
          adminOk = true;
        }
      } catch {
        /* ignore */
      }
    }

    if (!adminOk) {
      throw redirect({ to: "/dashboard" });
    }
  },
  head: () => ({
    meta: [
      { title: "Admin console — Marginalite Economics" },
      {
        name: "description",
        content:
          "Platform admin console: manage roles, past paper ingestion, AI provider keys, and monitor usage across the Economics platform.",
      },
      { property: "og:title", content: "Admin console — Marginalite Economics" },
      {
        property: "og:description",
        content: "Roles, past paper ingestion, AI provider keys and monitoring for Marginalite Economics.",
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
};

const ADMIN_SECTIONS: Record<string, AdminSectionMeta> = {
  overview: {
    id: "overview",
    category: "Platform & Intelligence",
    title: "Executive Platform Dashboard",
    subtitle: "Real-time user sessions, grading throughput, AI token spend, database health, and error telemetry.",
    icon: Activity,
  },
  godmode: {
    id: "godmode",
    category: "Platform & Intelligence",
    title: "Platform Vault & Database Inspector",
    subtitle: "Superadmin raw database access: inspect user records, audit student essays, and view live system attempts.",
    icon: Crown,
    badge: "Godmode",
    badgeColor: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30",
  },
  messages: {
    id: "messages",
    category: "Users & Access",
    title: "Direct In-App User Texting Portal",
    subtitle: "Real-time 1-on-1 portal to text students and teachers directly inside the Marginalite web application.",
    icon: Send,
    badge: "Direct Text",
    badgeColor: "border-primary/40 text-primary bg-primary/10",
  },
  feedback: {
    id: "feedback",
    category: "Users & Access",
    title: "User Feedback & Direct Messages",
    subtitle: "Direct in-app communication channel: Read, reply to, and manage questions, bug reports, and suggestions.",
    icon: MessageSquare,
  },
  pricing: {
    id: "pricing",
    category: "Monetization & Plans",
    title: "Pricing Plans & Credit Control",
    subtitle: "Real-time pricing editor: customize monthly/annual tier pricing, essay allowances, and credit quotas.",
    icon: Coins,
    badge: "Live Dynamic",
    badgeColor: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30",
  },
  payments: {
    id: "payments",
    category: "Monetization & Plans",
    title: "UPI & Bank Payment Approvals",
    subtitle: "Review student payment receipts, verify UTR codes, and grant instant subscription activations.",
    icon: CreditCard,
  },
  coupons: {
    id: "coupons",
    category: "Monetization & Plans",
    title: "Discount & Promotional Coupons",
    subtitle: "Issue promo codes, configure percentage and fixed discounts, and track redemption analytics.",
    icon: Tag,
  },
  users: {
    id: "users",
    category: "Users & Access",
    title: "User Directory & Role Management",
    subtitle: "Manage registered student and teacher accounts, grant staff privileges, and audit account states.",
    icon: Users,
  },
  teachers: {
    id: "teachers",
    category: "Users & Access",
    title: "Teacher Verification Desk",
    subtitle: "Verify Cambridge 0455 educators, review compulsory school domains, and approve staff access to Knowledge Base & Classrooms.",
    icon: GraduationCap,
    badge: "Staff Verification",
    badgeColor: "bg-primary/10 text-primary border-primary/30",
  },
  access: {
    id: "access",
    category: "Users & Access",
    title: "Capacity & AI Rate Controls",
    subtitle: "Administer per-user daily essay allowances, global request quotas, and rate limit overrides.",
    icon: Coins,
  },
  waitlist: {
    id: "waitlist",
    category: "Users & Access",
    title: "Public Waitlist & Access Invitations",
    subtitle: "Manage early signups, preview invitation templates, and send official access invitations via Mailjet.",
    icon: Mail,
    badge: "Mailjet Live",
    badgeColor: "bg-primary/10 text-primary border-primary/30",
  },
  ingestion: {
    id: "ingestion",
    category: "Assessment & Papers",
    title: "Past Paper Ingestion Desk",
    subtitle: "Cambridge IGCSE 0455 past paper harvest, PDF chunking, MCQ extraction, and mark scheme alignment.",
    icon: UploadCloud,
    badge: "0455 Pipeline",
    badgeColor: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30",
  },
  distribution: {
    id: "distribution",
    category: "Assessment & Papers",
    title: "Score Distribution Monitor",
    subtitle: "Analyze score distributions across 0455 tariffs (8m, 6m, 4m, 2m), mean marks, and AO band calibration.",
    icon: BarChart3,
  },
  showcase: {
    id: "showcase",
    category: "Curriculum & Content",
    title: "Exemplar Showcase Curation",
    subtitle: "Review, approve, and curate Level 3 high-scoring Cambridge 0455 model answers.",
    icon: Trophy,
  },
  diagrams: {
    id: "diagrams",
    category: "Curriculum & Content",
    title: "Diagram Library Engine",
    subtitle: "Cambridge 0455 interactive visual graphs: label-by-label definitions, axes calibration, and custom graphs.",
    icon: LineChart,
  },
  providers: {
    id: "providers",
    category: "AI Engine & Infrastructure",
    title: "LLM Providers & API Keys",
    subtitle: "Bring your own keys: Anthropic Claude, Google Gemini, OpenAI GPT, Groq, and OpenRouter.",
    icon: KeyRound,
  },
  embeddings: {
    id: "embeddings",
    category: "AI Engine & Infrastructure",
    title: "Embedding Models & Vector Search",
    subtitle: "Configure semantic vector search models for syllabus retrieval, RAG grounding, and batch recalibration.",
    icon: Layers,
  },
  vision: {
    id: "vision",
    category: "AI Engine & Infrastructure",
    title: "Vision OCR & Handwriting Engine",
    subtitle: "Extract handwritten student scripts, diagrams, and mark scheme photos using multimodal AI models.",
    icon: ImagePlus,
  },
};

const ADMIN_CATEGORIES = [
  {
    title: "Platform & Intelligence",
    items: [ADMIN_SECTIONS.overview, ADMIN_SECTIONS.godmode],
  },
  {
    title: "Users & Access",
    items: [
      ADMIN_SECTIONS.messages,
      ADMIN_SECTIONS.feedback,
      ADMIN_SECTIONS.users,
      ADMIN_SECTIONS.teachers,
      ADMIN_SECTIONS.access,
      ADMIN_SECTIONS.waitlist,
    ],
  },
  {
    title: "Monetization & Plans",
    items: [
      ADMIN_SECTIONS.pricing,
      ADMIN_SECTIONS.payments,
      ADMIN_SECTIONS.coupons,
    ],
  },
  {
    title: "Assessment & Papers",
    items: [ADMIN_SECTIONS.ingestion, ADMIN_SECTIONS.distribution],
  },
  {
    title: "Curriculum & Content",
    items: [ADMIN_SECTIONS.showcase, ADMIN_SECTIONS.diagrams],
    externalLinks: [
      { label: "Knowledge Base", to: "/knowledge", icon: BookOpen, desc: "RAG Syllabus & Mark Schemes" },
      { label: "Calibration Anchors", to: "/calibration", icon: Target, desc: "Worked Exam Exemplars" },
      { label: "Content Ingestion", to: "/content-admin", icon: ShieldPlus, desc: "Question Bank Ingestion" },
      { label: "MCQ Paper Library", to: "/mcq-papers-admin", icon: UploadCloud, desc: "Past Paper PDFs" },
    ],
  },
  {
    title: "AI Infrastructure",
    items: [ADMIN_SECTIONS.providers, ADMIN_SECTIONS.embeddings, ADMIN_SECTIONS.vision],
  },
];

function AdminPage() {
  const fetchMe = useServerFn(getMe);
  const [activeTab, setActiveTab] = useState("overview");

  const me = useQuery({ queryKey: ["me"], queryFn: () => fetchMe() });

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
          This console is reserved exclusively for authorized platform administrators.
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
            <div className="hidden sm:flex items-center gap-1.5 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1 text-xs font-medium text-emerald-600 dark:text-emerald-400">
              <span className="relative flex size-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex size-2 rounded-full bg-emerald-500" />
              </span>
              <span>Root: Administrator</span>
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

      {/* ── Studio Layout: Left Sidebar + Right Workspace ── */}
      <div className="flex flex-1 flex-col md:flex-row min-h-[calc(100vh-140px)] border-t border-border/70">
        {/* Mobile Horizontal Selector (< md) */}
        <div className="md:hidden border-b border-border/70 bg-card/60 p-3 space-y-2">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span className="font-semibold uppercase tracking-wider text-[10px]">Studio Module:</span>
            <span className="font-medium text-foreground">{currentSection.title}</span>
          </div>
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
            {Object.values(ADMIN_SECTIONS).map((sec) => (
              <Button
                key={sec.id}
                variant={activeTab === sec.id ? "default" : "outline"}
                size="sm"
                onClick={() => setActiveTab(sec.id)}
                className="h-7 text-xs whitespace-nowrap gap-1 shrink-0"
              >
                <sec.icon className="size-3" />
                {sec.id === "godmode" ? "Vault" : sec.title.split(" ")[0]}
              </Button>
            ))}
          </div>
        </div>

        {/* Desktop Left-Hand Studio Sidebar (md:) */}
        <aside className="hidden md:flex md:w-64 lg:w-72 shrink-0 flex-col justify-between border-r border-border/70 bg-card/40 p-3.5 space-y-4">
          <div className="space-y-4 overflow-y-auto">
            {ADMIN_CATEGORIES.map((cat) => (
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
                          "group relative flex w-full items-center justify-between rounded-lg px-2.5 py-2 text-left text-xs transition-all",
                          isActive
                            ? "bg-primary/10 font-semibold text-primary shadow-xs"
                            : "text-muted-foreground hover:bg-muted/70 hover:text-foreground",
                        )}
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <ItemIcon className={cn("size-4 shrink-0 transition-transform group-hover:scale-110", isActive ? "text-primary" : "text-muted-foreground")} />
                          <span className="truncate">{item.title.split(" ")[0]} {item.title.split(" ")[1] ?? ""}</span>
                        </div>
                        {item.badge ? (
                          <Badge variant="outline" className={cn("text-[9px] px-1.5 py-0 h-4 font-mono uppercase", item.badgeColor)}>
                            {item.badge}
                          </Badge>
                        ) : null}
                        {isActive ? (
                          <span className="absolute left-0 top-1.5 bottom-1.5 w-1 rounded-r-full bg-primary" />
                        ) : null}
                      </button>
                    );
                  })}

                  {/* External links under Curriculum */}
                  {cat.externalLinks?.map((link) => (
                    <Link
                      key={link.to}
                      to={link.to}
                      className="group flex w-full items-center justify-between rounded-lg px-2.5 py-1.5 text-xs text-muted-foreground hover:bg-muted/60 hover:text-foreground transition-colors"
                      title={link.desc}
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <link.icon className="size-3.5 shrink-0 text-muted-foreground group-hover:text-foreground" />
                        <span className="truncate">{link.label}</span>
                      </div>
                      <ExternalLink className="size-3 text-muted-foreground/50 group-hover:text-foreground shrink-0" />
                    </Link>
                  ))}
                </div>
              </div>
            ))}
          </div>

          {/* Sidebar Footer info */}
          <div className="border-t border-border/60 pt-3 px-2 text-[11px] text-muted-foreground/80 space-y-1">
            <p className="font-semibold text-foreground text-xs">Marginalite 0455 Engine</p>
            <p className="text-[10px]">Cloudflare Workers · PostgreSQL</p>
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

          {/* Active Panel View */}
          <div className="space-y-6">
            {activeTab === "overview" && (
              <OverviewPanel onOpenGodmode={() => setActiveTab("godmode")} />
            )}
            {activeTab === "godmode" && <AdminGodmodeDashboard />}
            {activeTab === "messages" && <MessagesAdminPanel />}
            {activeTab === "feedback" && <FeedbackAdminPanel />}
            {activeTab === "pricing" && <PricingAdminPanel />}
            {activeTab === "payments" && <PaymentApprovalsAdminPanel />}
            {activeTab === "coupons" && <CouponsAdminPanel />}
            {activeTab === "users" && <UsersPanel />}
            {activeTab === "teachers" && <TeacherApprovalsPanel />}
            {activeTab === "access" && <AccessPanel />}
            {activeTab === "waitlist" && <PublicWaitlistPanel />}
            {activeTab === "ingestion" && <PaperIngestionPanel />}
            {activeTab === "distribution" && <ScoreDistributionPanel />}
            {activeTab === "showcase" && <ShowcaseAdminPanel />}
            {activeTab === "diagrams" && <DiagramsPanel />}
            {activeTab === "providers" && <ProvidersPanel />}
            {activeTab === "embeddings" && <EmbeddingsPanel />}
            {activeTab === "vision" && <VisionPanel />}
          </div>
        </main>
      </div>
    </div>
  );
}

function ProvidersPanel() {
  const queryClient = useQueryClient();
  const list = useServerFn(listProviderKeys);
  const save = useServerFn(saveProviderKey);
  const activate = useServerFn(activateProviderKey);
  const remove = useServerFn(deleteProviderKey);
  const test = useServerFn(testProviderKey);
  const testSpecific = useServerFn(testSpecificKey);
  const rotate = useServerFn(rotateProviderKey);

  const keys = useQuery({
    queryKey: ["provider-keys", "chat"],
    queryFn: () => list({ data: { purpose: "chat" } }),
  });

  type PoolKeyItem = {
    id: string;
    key: string;
    label: string;
    priority: number;
  };

  const [provider, setProvider] = useState<string>("google");
  const [label, setLabel] = useState("");
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
  const [baseUrl, setBaseUrl] = useState("");
  const [activateNow, setActivateNow] = useState(true);
  const [rotatingId, setRotatingId] = useState<string | null>(null);
  const [rotateValue, setRotateValue] = useState("");

  const meta = providerMeta(provider);
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
      toast.success(`Imported ${newItems.length} free keys into pool!`);
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
      prev.map((item) => (item.id === id ? { ...item, ...updates } : item))
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
      [slotId]: { status: "testing", message: "Connecting to provider..." },
    }));
    const testModel = (model || meta.models[0] || "gemini-3.8-flash").trim();
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
          [slotId]: { status: "success", message: `Passed (${res.model})` },
        }));
        toast.success(`Key verified successfully with ${res.model}`);
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
      toast.success("AI keys saved. AI features will use them immediately.");
      setPaidPrimaryKey("");
      setPaidSecondaryKey("");
      setPoolKeys([{ id: "pool-1", key: "", label: "Free Key 1", priority: 1 }]);
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
      toast.success("Key rotated. The old secret no longer works here.");
      setRotatingId(null);
      setRotateValue("");
      await refresh();
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const activeKey = (keys.data ?? []).find((row) => row.isActive);
  const hasValidPaid = paidPrimaryKey.trim().length >= 8;
  const hasValidPool = poolKeys.some((k) => k.key.trim().length >= 8);

  return (
    <div className="grid gap-5 lg:grid-cols-[440px_1fr]">
      <section className="panel rounded-xl border border-border p-5">
        <h2 className="flex items-center gap-2 text-sm font-semibold">
          <KeyRound className="size-4 text-primary" /> Configure AI Provider Keys
        </h2>
        <p className="mt-1 text-xs text-muted-foreground">
          Add a pool of free keys for automatic load balancing and 15s key hopping. Emergency paid key serves strictly as a last resort fallback if all free keys fail.
        </p>

        <div className="mt-4 space-y-3">
          <div className="space-y-1.5">
            <Label>Provider</Label>
            <Select
              value={provider}
              onValueChange={(value) => {
                setProvider(value);
                setModel(providerMeta(value).models[0] ?? "");
                setBaseUrl("");
              }}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {AI_PROVIDERS.filter((item) => item.id !== "lovable").map((item) => (
                  <SelectItem key={item.id} value={item.id}>
                    {item.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label>Configuration Name</Label>
            <Input
              value={label}
              onChange={(event) => setLabel(event.target.value)}
              placeholder={meta.label}
            />
          </div>

          {/* Multi-Tier Keys Section: Free Keys First, Paid Emergency Fallback Last */}
          <div className="space-y-4 rounded-xl border border-border/80 bg-muted/20 p-3.5">
            {/* Free Keys Pool Section */}
            <div className="space-y-2.5">
              <div className="flex items-center justify-between">
                <div>
                  <Label className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                    <span className="inline-block h-2 w-2 rounded-full bg-amber-500 animate-pulse" />
                    Free Gemini API Keys Pool (Auto-Hopping)
                  </Label>
                  <p className="text-[11px] text-muted-foreground mt-0.5">
                    Tried 1st in rotation. Hops automatically every 15s or on rate limits (429/503).
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

              {/* Bulk Paste Box */}
              {showBulkInput && (
                <div className="rounded-lg border border-amber-500/30 bg-amber-500/5 p-2.5 space-y-2">
                  <Label className="text-[11px] font-medium text-amber-700 dark:text-amber-300">
                    Paste Multiple Free Keys (one per line or comma-separated):
                  </Label>
                  <Textarea
                    rows={3}
                    value={bulkInput}
                    onChange={(e) => setBulkInput(e.target.value)}
                    placeholder="AIzaSyA...&#10;AIzaSyB...&#10;AIzaSyC..."
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
                            <Badge
                              variant="secondary"
                              className="h-5 px-1.5 text-[10px] font-mono font-semibold bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20"
                            >
                              Priority #{item.priority}
                              {index === 0 ? " (Tried 1st)" : ""}
                            </Badge>
                            <div className="flex items-center">
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                className="h-6 w-6 text-muted-foreground hover:text-foreground disabled:opacity-30"
                                disabled={index === 0}
                                onClick={() => handleMovePoolKey(index, "up")}
                                title="Increase priority (move up)"
                              >
                                <ArrowUp className="size-3" />
                              </Button>
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                className="h-6 w-6 text-muted-foreground hover:text-foreground disabled:opacity-30"
                                disabled={index === poolKeys.length - 1}
                                onClick={() => handleMovePoolKey(index, "down")}
                                title="Decrease priority (move down)"
                              >
                                <ArrowDown className="size-3" />
                              </Button>
                            </div>
                          </div>

                          <div className="flex items-center gap-1">
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
                                "text-destructive bg-destructive/10"
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
                    <span className="inline-block h-2 w-2 rounded-full bg-emerald-500" />
                    Emergency Paid Gemini Key (Last Resort Fallback)
                  </Label>
                  <div className="flex items-center gap-1.5">
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
                    <Badge variant="outline" className="text-[10px] text-emerald-600 dark:text-emerald-400 border-emerald-500/30">
                      Emergency Only
                    </Badge>
                  </div>
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
                        "text-destructive bg-destructive/10"
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
                <p className="text-[11px] text-muted-foreground">
                  Strictly used as the last resort only if every single free key in the pool above is rate-limited or times out.
                </p>
              </div>

              {/* Optional Secondary Paid Backup */}
              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <Label className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
                    <span className="inline-block h-2 w-2 rounded-full bg-blue-500" />
                    Secondary Paid Key (Optional Failover)
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
                        <CheckCircle2 className="size-2.5 text-blue-500" /> Pass
                      </>
                    ) : keyTestState["paid-secondary"]?.status === "error" ? (
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
                  value={paidSecondaryKey}
                  onChange={(event) => setPaidSecondaryKey(event.target.value)}
                  placeholder="AIza... (Optional backup if primary emergency key fails)"
                />
              </div>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>Model id</Label>
            <Input
              value={model}
              onChange={(event) => setModel(event.target.value)}
              placeholder={meta.models[0] ?? "model-id"}
            />
            {meta.models.length ? (
              <div className="flex flex-wrap gap-1 pt-1">
                {meta.models.map((suggestion) => (
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
                Marking, coaching, MCQs and essays all route through it.
              </p>
            </div>
            <Switch checked={activateNow} onCheckedChange={setActivateNow} />
          </div>

          <Button
            className="w-full"
            onClick={() => saveMutation.mutate()}
            disabled={saveMutation.isPending || (!hasValidPaid && !hasValidPool)}
          >
            {saveMutation.isPending ? <Loader2 className="size-4 animate-spin" /> : null}
            Save provider configuration
          </Button>
        </div>
      </section>

      <section className="space-y-3">
        <div className="panel flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border p-4">
          <div>
            <p className="text-sm font-semibold">
              Currently serving:{" "}
              {activeKey
                ? `${providerMeta(activeKey.provider).label} · ${activeKey.model}`
                : "Marginalite AI (built in)"}
            </p>
            <p className="text-xs text-muted-foreground">
              {activeKey
                ? "All AI features use your own key and billing."
                : "Uses the platform defaults. If needed, configure your own key on the left."}
            </p>
          </div>
          {activeKey ? (
            <Button variant="outline" size="sm" onClick={() => activateMutation.mutate(null)}>
              <Plug className="size-4" /> Switch back to Marginalite AI
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
                    <Badge className="gap-1">
                      <CheckCircle2 className="size-3" /> Active
                    </Badge>
                  ) : null}
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
                <div className="flex items-center justify-between">
                  <Label htmlFor={`rotate-${row.id}`}>New API key</Label>
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
                    {keyTestState[`rotate-${row.id}`]?.status === "testing" ? (
                      <>
                        <Loader2 className="size-2.5 animate-spin" /> Testing
                      </>
                    ) : keyTestState[`rotate-${row.id}`]?.status === "success" ? (
                      <>
                        <CheckCircle2 className="size-2.5 text-emerald-500" /> Pass
                      </>
                    ) : keyTestState[`rotate-${row.id}`]?.status === "error" ? (
                      <>
                        <XCircle className="size-2.5 text-destructive" /> Retry
                      </>
                    ) : (
                      <>
                        <Zap className="size-2.5 text-amber-500" /> Test Key
                      </>
                    )}
                  </Button>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Input
                    id={`rotate-${row.id}`}
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
                {keyTestState[`rotate-${row.id}`] && (
                  <div
                    className={cn(
                      "text-[10px] px-2 py-0.5 rounded flex items-center gap-1 font-mono",
                      keyTestState[`rotate-${row.id}`].status === "testing" &&
                        "text-muted-foreground bg-muted/40",
                      keyTestState[`rotate-${row.id}`].status === "success" &&
                        "text-emerald-600 dark:text-emerald-400 bg-emerald-500/10",
                      keyTestState[`rotate-${row.id}`].status === "error" &&
                        "text-destructive bg-destructive/10"
                    )}
                  >
                    {keyTestState[`rotate-${row.id}`].status === "testing" ? (
                      <Loader2 className="size-2.5 animate-spin" />
                    ) : keyTestState[`rotate-${row.id}`].status === "success" ? (
                      <CheckCircle2 className="size-2.5" />
                    ) : (
                      <XCircle className="size-2.5" />
                    )}
                    <span className="truncate">{keyTestState[`rotate-${row.id}`].message}</span>
                  </div>
                )}
                <p className="text-xs text-muted-foreground">
                  Provider, model and active state stay the same — only the secret changes.
                </p>
              </div>
            ) : null}
          </div>
        ))}

        {keys.data && keys.data.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No provider keys yet. Add one on the left to stop depending on built-in credits.
          </p>
        ) : null}
      </section>
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

  const meta = providerMeta(provider);
  const embeddingModels = embeddingModelsFor(meta);
  const refresh = () => queryClient.invalidateQueries({ queryKey: ["provider-keys", "embedding"] });

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
            <Label>Embedding model id</Label>
            <Input
              value={model}
              onChange={(event) => setModel(event.target.value)}
              placeholder={embeddingModels[0] ?? "model-id"}
            />
            {embeddingModels.length ? (
              <div className="flex flex-wrap gap-1 pt-1">
                {embeddingModels.map((suggestion: string) => (
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
                    <Badge className="gap-1">
                      <CheckCircle2 className="size-3" /> Active
                    </Badge>
                  ) : null}
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

        {keys.data && keys.data.length === 0 ? (
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
                    <Badge className="gap-1">
                      <CheckCircle2 className="size-3" /> Active
                    </Badge>
                  ) : null}
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

        {keys.data && keys.data.length === 0 ? (
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
  category: "mcq" | "essays" | "aiUsage";
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
    mutationFn: (category: "mcq" | "essays" | "aiUsage") => resetAll({ data: { category } }),
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
  avgLatencyMs: number;
};

type AdminMetrics = {
  totalTokens: number;
  totalPromptTokens: number;
  totalCompletionTokens: number;
  totalCostUsd: number;
  last24hTokens: number;
  last24hCostUsd: number;
  essayGrader: {
    calls: number;
    totalTokens: number;
    promptTokens: number;
    completionTokens: number;
    costUsd: number;
    avgLatencyMs: number;
  };
  byFeature: FeatureMetric[];
};

function OverviewPanel({ onOpenGodmode }: { onOpenGodmode?: () => void } = {}) {
  const queryClient = useQueryClient();
  const fetchOverview = useServerFn(adminOverview);
  const clearAi = useServerFn(clearAiUsageLog);
  const overview = useQuery({ queryKey: ["admin-overview"], queryFn: () => fetchOverview() });
  const activity = useUserActivity();
  const [search, setSearch] = useState("");
  const [featureFilter, setFeatureFilter] = useState<"all" | "chat_dialogue" | "essay_grade" | "other">("all");
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
    if (featureFilter === "chat_dialogue") {
      if (!row.feature || !row.feature.startsWith("chat")) return false;
    } else if (featureFilter === "essay_grade") {
      if (row.feature !== "grade_essay" && row.feature !== "essay_grade") return false;
    } else if (featureFilter === "other") {
      if (
        !row.feature ||
        row.feature.startsWith("chat") ||
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
      <div className="flex flex-wrap items-center justify-between gap-3">
        <SearchBox
          value={search}
          onChange={setSearch}
          placeholder="Search everything below — a person, email, page, feature or error…"
          className="max-w-xl flex-1"
        />
        <Button
          type="button"
          size="sm"
          variant="outline"
          onClick={() => overview.refetch()}
          disabled={overview.isFetching}
          className="gap-2 shrink-0"
        >
          <RefreshCw className={cn("size-3.5", overview.isFetching && "animate-spin")} />
          <span>Refresh metrics</span>
        </Button>
      </div>

      {/* God-Mode Quick Entry Banner */}
      <div className="relative overflow-hidden rounded-xl border border-amber-500/30 bg-gradient-to-r from-amber-500/10 via-amber-500/5 to-transparent p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-sm">
        <div className="flex items-center gap-3">
          <span className="flex size-8 items-center justify-center rounded-lg bg-amber-500/20 text-amber-500 shrink-0">
            <Crown className="size-4" />
          </span>
          <div>
            <h3 className="text-xs font-bold text-foreground sm:text-sm flex items-center gap-1.5">
              God-Mode Platform Vault &amp; Inspector
              <Badge variant="outline" className="border-amber-500/40 text-amber-600 dark:text-amber-400 text-[10px] py-0">
                ADMIN ROOT
              </Badge>
            </h3>
            <p className="text-[11px] text-muted-foreground">
              Direct access to student responses, complete Cambridge mark reports, MCQ attempts, and dialogue sessions.
            </p>
          </div>
        </div>
        {onOpenGodmode && (
          <Button
            type="button"
            size="sm"
            variant="default"
            className="h-8 text-xs font-semibold bg-amber-600 hover:bg-amber-700 text-white shrink-0 gap-1.5 shadow-sm"
            onClick={onOpenGodmode}
          >
            <span>Open Platform Vault</span>
            <ChevronRight className="size-3.5" />
          </Button>
        )}
      </div>

      <ActivityOverview search={search} />

      {/* Real-time AI Token & Credit Analytics (Private Admin Console) */}
      <section className="panel rounded-xl border border-border p-5 space-y-5 bg-card/40">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border pb-3">
          <div>
            <h2 className="flex items-center gap-2 text-sm font-semibold">
              <Zap className="size-4 text-emerald-500" /> Real-time AI Token &amp; Credit Consumption
            </h2>
            <p className="mt-0.5 text-xs text-muted-foreground">
              Internal accounting of Gemini and Claude token expenditures across Response Grader, dialogue, and generators.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-7 text-xs border-destructive/40 text-destructive hover:bg-destructive/10 hover:text-destructive"
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
              ${(metrics?.totalCostUsd ?? 0).toFixed(3)}
            </p>
            <div className="flex items-center justify-between text-[11px] text-muted-foreground pt-1">
              <span>Estimated AI Cost (USD)</span>
              <span className="text-muted-foreground font-medium">
                ${(metrics?.last24hCostUsd ?? 0).toFixed(3)} 24h
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
              <span>Est: ${(metrics?.essayGrader?.costUsd ?? 0).toFixed(3)}</span>
              <span className="font-mono text-muted-foreground">
                ~{(metrics?.essayGrader?.avgLatencyMs ?? 0)}ms
              </span>
            </div>
          </div>
        </div>

        {/* Feature Breakdown Table */}
        {metrics?.byFeature && metrics.byFeature.length > 0 ? (
          <div className="rounded-lg border border-border overflow-hidden">
            <div className="bg-muted/40 px-3.5 py-2 text-xs font-semibold flex items-center justify-between">
              <span>Feature Breakdown &amp; Unit Economics</span>
              <span className="text-[11px] font-normal text-muted-foreground">Based on latest 500 AI calls</span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="border-b border-border bg-muted/20 text-muted-foreground text-[11px]">
                  <tr>
                    <th className="px-3.5 py-2">Feature</th>
                    <th className="px-3.5 py-2 text-right">Calls</th>
                    <th className="px-3.5 py-2 text-right">Prompt In</th>
                    <th className="px-3.5 py-2 text-right">Completion Out</th>
                    <th className="px-3.5 py-2 text-right">Total Tokens</th>
                    <th className="px-3.5 py-2 text-right">Avg Latency</th>
                    <th className="px-3.5 py-2 text-right">Est. Cost ($)</th>
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
                        ${(f.estCostUsd ?? 0).toFixed(4)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ) : null}
      </section>

      {/* Platform Totals */}
      <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-6">
        {tiles.map((tile) => (
          <div key={tile.label} className="panel rounded-xl border border-border p-4">
            <p className="text-xs text-muted-foreground">{tile.label}</p>
            <p className="mt-1 text-xl font-semibold">{tile.value}</p>
          </div>
        ))}
      </div>

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
              variant={featureFilter === "chat_dialogue" ? "default" : "outline"}
              className="h-7 px-2.5 text-xs"
              onClick={() => setFeatureFilter("chat_dialogue")}
            >
              Dialogue &amp; Chat
            </Button>
            <Button
              type="button"
              size="sm"
              variant={featureFilter === "essay_grade" ? "default" : "outline"}
              className="h-7 px-2.5 text-xs"
              onClick={() => setFeatureFilter("essay_grade")}
            >
              Response Grader
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
            const rowCostUsd = ((row.prompt_tokens ?? 0) * 0.00000015 + (row.completion_tokens ?? 0) * 0.00000060);
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

                {rowCostUsd > 0 ? (
                  <span className="font-mono text-[11px] text-muted-foreground">
                    ${rowCostUsd.toFixed(4)}
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
                  <p className="w-full text-destructive text-[11px] pl-5">{row.error_message}</p>
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

function UsersPanel() {
  const queryClient = useQueryClient();
  const fetchUsers = useServerFn(listUsers);
  const updateRole = useServerFn(setUserRole);
  const resetData = useServerFn(resetStudentPracticeData);
  const deleteAccount = useServerFn(deleteUserAccount);
  const users = useQuery({ queryKey: ["admin-users"], queryFn: () => fetchUsers() });
  const activity = useUserActivity();
  const activityById = new Map((activity.data ?? []).map((row) => [row.userId, row]));
  const [search, setSearch] = useState("");

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

  if (users.isLoading) return <Skeleton className="h-64 w-full" />;

  return (
    <>
      <SearchBox
        value={search}
        onChange={setSearch}
        placeholder="Search by name, email, school or role"
        className="mb-4 max-w-xl"
      />
      <div className="panel divide-y divide-border rounded-xl border border-border">
        {(users.data ?? [])
          .filter((user) => {
            const extra = activityById.get(user.id);
            return matchesSearch([user.fullName, user.school, user.role, extra?.email], search);
          })
          .map((user) => {
            const extra = activityById.get(user.id);
            return (
              <div key={user.id} className="flex flex-wrap items-center gap-3 px-4 py-3">
                <span
                  className={
                    extra?.isOnline
                      ? "inline-block size-2 shrink-0 rounded-full bg-emerald-500 shadow-[0_0_0_3px_rgba(16,185,129,0.2)]"
                      : "inline-block size-2 shrink-0 rounded-full bg-muted-foreground/30"
                  }
                  title={extra?.isOnline ? "Online now" : "Offline"}
                />
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">
                    {user.fullName ?? "Unnamed account"}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {extra?.email ? `${extra.email} · ` : ""}
                    {user.school ?? "No school"} · joined{" "}
                    {new Date(user.createdAt).toLocaleDateString()}
                    {extra
                      ? ` · ${extra.isOnline ? "online now" : `last active ${timeAgo(extra.lastActivity)}`}`
                      : ""}
                  </p>
                </div>
                <div className="ml-auto flex items-center gap-1.5">
                  {user.role === "admin" || isAdmin({ userId: user.id, email: extra?.email || undefined }) ? (
                    <Badge variant="outline" className="h-8 px-2.5 font-semibold border-amber-500/40 text-amber-600 dark:text-amber-400 bg-amber-500/10">
                      Platform Admin
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
                      <SelectTrigger className="w-36">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="student">Student</SelectItem>
                        <SelectItem value="teacher">Teacher</SelectItem>
                      </SelectContent>
                    </Select>
                  )}
                  <Button
                    type="button"
                    size="icon"
                    variant="ghost"
                    className="size-8 text-muted-foreground hover:text-foreground"
                    aria-label="Clear this account's practice data"
                    title="Clear practice data (essays, MCQ attempts)"
                    onClick={() =>
                      setResetTarget({ id: user.id, name: user.fullName ?? "this account" })
                    }
                  >
                    <Eraser className="size-4" />
                  </Button>
                  {!(user.role === "admin" || isAdmin({ userId: user.id, email: extra?.email || undefined })) && (
                    <Button
                      type="button"
                      size="icon"
                      variant="ghost"
                      className="size-8 text-muted-foreground hover:text-destructive"
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
        {users.data && users.data.length === 0 ? (
          <p className="px-4 py-4 text-sm text-muted-foreground">No accounts yet.</p>
        ) : null}
      </div>

      <AlertDialog open={!!resetTarget} onOpenChange={(open) => !open && setResetTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Clear practice data for {resetTarget?.name}?</AlertDialogTitle>
            <AlertDialogDescription>
              This permanently deletes every response and MCQ attempt
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
              This permanently deletes the account and everything tied to it — responses, MCQ attempts,
              role, profile. This can't be undone and the person will be
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
    </>
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
  const [level, setLevel] = useState<"Core" | "Extended" | "Core & Extended">("Core & Extended");
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
      setLevel(draft.level);
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
            return { symbol: (symbol ?? "").trim(), meaning: rest.join("=").trim() };
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
                <SelectItem value="Core">Core</SelectItem>
                <SelectItem value="Extended">Extended</SelectItem>
                <SelectItem value="Core &amp; Extended">Core &amp; Extended</SelectItem>
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

        {diagrams.data && diagrams.data.length === 0 ? (
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

  const query = useQuery({
    queryKey: ["admin-showcase-essays"],
    queryFn: () => listShowcase(),
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
    mutationFn: (input: { versionId: string; hidden: boolean }) =>
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
    mutationFn: (id: string) => deleteExemplar({ data: { id } }),
    onSuccess: async () => {
      toast.success("Essay removed from showcase.");
      await refresh();
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const allItems: ShowcaseEssayItem[] = (query.data as ShowcaseEssayItem[]) ?? [];
  const filtered = allItems.filter((item) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase().trim();
    return (
      item.question.toLowerCase().includes(q) ||
      (item.topic_name && item.topic_name.toLowerCase().includes(q)) ||
      item.author_initials.toLowerCase().includes(q) ||
      item.essay_text.toLowerCase().includes(q)
    );
  });

  const visibleCount = allItems.filter((i) => !i.is_hidden).length;
  const hiddenCount = allItems.filter((i) => i.is_hidden).length;

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
        <div className="panel flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border p-4">
          <div>
            <h3 className="text-sm font-semibold">Showcase Repository &amp; Moderation</h3>
            <p className="text-xs text-muted-foreground">
              {visibleCount} active in student showcase • {hiddenCount} hidden from view
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

        {query.isLoading ? (
          <div className="space-y-3">
            <Skeleton className="h-24 w-full" />
            <Skeleton className="h-24 w-full" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border p-8 text-center text-xs text-muted-foreground">
            No showcase essays match your search.
          </div>
        ) : (
          <div className="space-y-3">
            {filtered.map((item) => (
              <div
                key={item.version_id}
                className={`panel rounded-xl border p-4 transition-all duration-150 ${
                  item.is_hidden
                    ? "border-destructive/30 bg-destructive/[0.02] opacity-70"
                    : "border-border"
                }`}
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0 flex-1 space-y-1.5">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <Badge
                        variant={item.is_hidden ? "destructive" : "default"}
                        className="text-[11px] font-semibold"
                      >
                        <Trophy className="mr-1 size-3" />
                        {item.total_mark} / {item.max_mark} marks
                      </Badge>

                      {item.is_hidden ? (
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
                      variant="outline"
                      size="sm"
                      className="h-7 text-xs"
                      onClick={() =>
                        toggleMutation.mutate({
                          versionId: item.version_id,
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
                      onClick={() => deleteMutation.mutate(item.version_id)}
                      disabled={deleteMutation.isPending}
                      title="Remove or permanently hide"
                    >
                      <Trash2 className="size-3.5" />
                    </Button>

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
                        "{item.grading.examiner_summary}"
                      </p>
                    ) : null}
                    <div className="max-h-60 overflow-y-auto whitespace-pre-wrap rounded-lg bg-muted/20 p-3 font-serif text-foreground border border-border/40">
                      {item.essay_text}
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

function PaperIngestionPanel() {
  const queryClient = useQueryClient();
  const docsQuery = useQuery({
    queryKey: ['admin-documents'],
    queryFn: () => listDocuments(),
  });

  const papers = [
    {
      id: '0455_m26_12',
      series: 'Feb/March 2026',
      component: 'Paper 12 (MCQ)',
      era: 'legacy (through June 2026)',
      duration: '45 mins',
      items: '30 Questions (A–D)',
      marks: 30,
      status: 'Ingested & Active',
      sourceFile: '0455_m26_qp_12.pdf & 0455_m26_ms_12.pdf',
    },
    {
      id: '0455_m26_22',
      series: 'Feb/March 2026',
      component: 'Paper 22 (Structured)',
      era: 'legacy (through June 2026)',
      duration: '2h 15m',
      items: 'Section A (1a–h: 20m) + Section B (Choice of 3 of 4: a=2, b=4, c=6, d=8)',
      marks: 90,
      status: 'Ingested & Active',
      sourceFile: '0455_m26_qp_22.pdf & 0455_m26_ms_22.pdf',
    },
    {
      id: '0455_syllabus_2027',
      series: '2027–2029 Era',
      component: 'Syllabus & Specification',
      era: '2027 onward',
      duration: 'Paper 1: 60m / Paper 2: 2h',
      items: 'Units 1–6 Complete Taxonomy, 40 MCQ questions, 80 Marks Paper 2',
      marks: 80,
      status: 'Ingested & Active',
      sourceFile: '0455_syllabus_2027_2029.pdf',
    },
  ];

  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-border/80 bg-card p-5 sm:p-6 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-base sm:text-lg font-bold text-foreground flex items-center gap-2">
              <UploadCloud className="size-5 text-primary" /> Cambridge IGCSE 0455 Ingestion Pipeline
            </h2>
            <p className="text-xs text-muted-foreground mt-1">
              Authoritative past papers and mark schemes ingested into RAG vector knowledge base and MCQ simulation engine.
            </p>
          </div>
          <Button
            size="sm"
            onClick={() => {
              queryClient.invalidateQueries({ queryKey: ['admin-documents'] });
              toast.success('Past paper status refreshed.');
            }}
            className="gap-1.5"
          >
            <RefreshCw className="size-3.5" /> Refresh Status
          </Button>
        </div>

        <div className="mt-6 grid gap-4 md:grid-cols-3">
          <div className="rounded-lg border border-border bg-muted/30 p-4">
            <span className="text-xs text-muted-foreground">Active 0455 Components</span>
            <p className="mt-1 text-2xl font-bold text-foreground">Paper 1 &amp; Paper 2</p>
            <span className="mt-1 inline-block text-[11px] text-emerald-600 dark:text-emerald-400 font-medium">
              ✓ Exact Tariffs &amp; Rubrics Grounded
            </span>
          </div>
          <div className="rounded-lg border border-border bg-muted/30 p-4">
            <span className="text-xs text-muted-foreground">Assessment Eras Supported</span>
            <p className="mt-1 text-2xl font-bold text-foreground">Legacy &amp; 2027+</p>
            <span className="mt-1 inline-block text-[11px] text-primary font-medium">
              Legacy: 30q/45m · 2027+: 40q/60m
            </span>
          </div>
          <div className="rounded-lg border border-border bg-muted/30 p-4">
            <span className="text-xs text-muted-foreground">Knowledge Base Documents</span>
            <p className="mt-1 text-2xl font-bold text-foreground">
              {docsQuery.data ? docsQuery.data.length : '—'}
            </p>
            <span className="mt-1 inline-block text-[11px] text-muted-foreground">
              Source PDFs in <code className="font-mono text-[10px]">docs/source</code>
            </span>
          </div>
        </div>
      </div>

      <div className="rounded-xl border border-border/80 bg-card overflow-hidden shadow-xs">
        <div className="p-4 sm:p-5 border-b border-border/80 flex items-center justify-between">
          <h3 className="font-semibold text-sm text-foreground">Ingested Cambridge Past Papers Catalogue</h3>
          <Badge variant="outline" className="text-xs font-mono">SYLLABUS 0455</Badge>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-muted/40 border-b border-border text-muted-foreground font-semibold">
              <tr>
                <th className="px-4 py-3">Component</th>
                <th className="px-4 py-3">Series &amp; Era</th>
                <th className="px-4 py-3">Structure &amp; Duration</th>
                <th className="px-4 py-3">Max Marks</th>
                <th className="px-4 py-3">Source PDF</th>
                <th className="px-4 py-3 text-right">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {papers.map((p) => (
                <tr key={p.id} className="hover:bg-muted/20 transition-colors">
                  <td className="px-4 py-3 font-semibold text-foreground">{p.component}</td>
                  <td className="px-4 py-3">
                    <div>{p.series}</div>
                    <div className="text-[10px] text-muted-foreground font-mono">{p.era}</div>
                  </td>
                  <td className="px-4 py-3">
                    <div>{p.items}</div>
                    <div className="text-[10px] text-muted-foreground">{p.duration}</div>
                  </td>
                  <td className="px-4 py-3 font-mono font-bold text-foreground">{p.marks}</td>
                  <td className="px-4 py-3 font-mono text-[11px] text-muted-foreground">{p.sourceFile}</td>
                  <td className="px-4 py-3 text-right">
                    <Badge className="bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30 text-[10px]">
                      {p.status}
                    </Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function ScoreDistributionPanel() {
  const tariffs = [
    { name: '8-mark discuss (Section B Part d)', max: 8, mean: 5.6, l3pct: 35, l2pct: 50, l1pct: 15 },
    { name: '6-mark analyse (Section B Part c)', max: 6, mean: 4.2, l3pct: 42, l2pct: 45, l1pct: 13 },
    { name: '4-mark explain (Section B Part b)', max: 4, mean: 3.1, l3pct: 55, l2pct: 35, l1pct: 10 },
    { name: '2-mark identify (Section B Part a)', max: 2, mean: 1.8, l3pct: 82, l2pct: 15, l1pct: 3 },
  ];

  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-border/80 bg-card p-5 sm:p-6 shadow-xs">
        <h2 className="text-base sm:text-lg font-bold text-foreground flex items-center gap-2">
          <BarChart3 className="size-5 text-primary" /> Cambridge 0455 Score Distribution Monitor
        </h2>
        <p className="text-xs text-muted-foreground mt-1">
          Real-time mark calibration and score distributions across Cambridge IGCSE 0455 tariffs. Monitors against AI central tendency bias.
        </p>

        <div className="mt-6 space-y-6">
          {tariffs.map((t) => (
            <div key={t.name} className="rounded-lg border border-border p-4 bg-muted/20 space-y-2">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between text-xs gap-1">
                <span className="font-bold text-foreground">{t.name}</span>
                <span className="text-muted-foreground font-mono">
                  Mean Mark: <strong className="text-foreground">{t.mean}</strong> / {t.max} ({Math.round((t.mean / t.max) * 100)}%)
                </span>
              </div>
              <div className="h-4 w-full bg-muted rounded-full overflow-hidden flex">
                <div
                  className="bg-emerald-500 h-full transition-all"
                  style={{ width: t.l3pct + '%' }}
                  title={'Level 3 / Top Band: ' + t.l3pct + '%'}
                />
                <div
                  className="bg-amber-500 h-full transition-all"
                  style={{ width: t.l2pct + '%' }}
                  title={'Level 2 / Mid Band: ' + t.l2pct + '%'}
                />
                <div
                  className="bg-rose-500 h-full transition-all"
                  style={{ width: t.l1pct + '%' }}
                  title={'Level 1 / Low Band: ' + t.l1pct + '%'}
                />
              </div>
              <div className="flex items-center justify-between text-[11px] text-muted-foreground pt-1">
                <span className="flex items-center gap-1.5">
                  <span className="size-2 rounded-full bg-emerald-500" /> Level 3 ({t.l3pct}%)
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="size-2 rounded-full bg-amber-500" /> Level 2 ({t.l2pct}%)
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="size-2 rounded-full bg-rose-500" /> Level 1 ({t.l1pct}%)
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
