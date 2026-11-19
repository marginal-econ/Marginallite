import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import {
  BookOpen,
  ChevronsUpDown,
  ClipboardCheck,
  LayoutDashboard,
  ListChecks,
  LogOut,
  PenLine,
  Search,
  Target,
  Dumbbell,
  ShieldCheck,
  BookMarked,
  Sparkles,
  PanelLeftClose,
  PanelLeftOpen,
  UsersRound,
  BookText,
  ChevronDown,
  ChevronRight,
  Menu,
  GraduationCap,
  Flame,
  Sliders,
  Settings,
  CreditCard,
  Zap,
  Lock,
  LineChart,
  MessageSquare,
  MessageSquarePlus,
  Send,
  Trophy,
  ArrowRight,
  FileSpreadsheet,
  Wand2,
  PanelsTopBottom,
  PanelLeft,
  Layers,
  Check,
  Search as SearchIcon,
  FileText,
  Info,
} from "lucide-react";
import * as React from "react";
import type { ReactNode } from "react";
import { useEffect, useMemo, useState, useRef } from "react";
import { toast } from "sonner";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { NavigationLayout } from "@/lib/account.functions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { FeedbackDialog, FloatingFeedbackPill } from "@/components/feedback/feedback-dialog";
import {
  StudentMessagesDialog,
  playMessageNotificationChime,
} from "@/components/app/student-messages-dialog";
import { UserAvatar } from "@/components/app/user-avatar";
import { getUnreadMessageCount } from "@/lib/messages.functions";
import { usePresenceHeartbeat } from "@/hooks/use-presence";
import { supabase } from "@/integrations/backend/client";
import type { UserSubscriptionDetails } from "@/lib/usage-limits";
import { cn } from "@/lib/utils";
import { TopTutorialButton } from "@/components/tutorials/feature-tutorial-dialog";
import { ThemeToggle } from "@/components/marketing/theme-toggle";
import { matchTutorialByPath } from "@/lib/tutorials-data";
import { useFeatureTutorial } from "@/components/tutorials/tutorial-context";
import { CommandPalette } from "@/components/app/command-palette";

export type NavItem = {
  to: string;
  label: string;
  icon: typeof LayoutDashboard;
  badge?: string;
  staffOnly?: boolean;
  adminOnly?: boolean;
  requiresPaid?: boolean;
  requiresHigherTier?: boolean;
};

export type NavGroup = {
  id: string;
  label: string;
  collapsible?: boolean;
  adminOnly?: boolean;
  staffOnly?: boolean;
  isExperimental?: boolean;
  items: NavItem[];
};

const SIDEBAR_COLLAPSED_STORAGE_KEY = "marginal.sidebarCollapsed";
const COLLAPSED_GROUPS_STORAGE_KEY = "marginal.collapsedNavGroups";
export const NAVIGATION_LAYOUT_STORAGE_KEY = "marginal.navigationLayout";

export function getPlatformNavLayout(): NavigationLayout {
  if (typeof window === "undefined") return "topbar";
  try {
    const saved = window.localStorage.getItem(NAVIGATION_LAYOUT_STORAGE_KEY);
    if (saved === "sidebar" || saved === "dock" || saved === "topbar") {
      return saved;
    }
  } catch {
    /* ignore */
  }
  return "topbar";
}

export function setPlatformNavLayout(layout: NavigationLayout) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(NAVIGATION_LAYOUT_STORAGE_KEY, layout);
  } catch {
    /* ignore */
  }
  window.dispatchEvent(new CustomEvent("marginal-layout-change", { detail: layout }));
}

export function LayoutSwitcherButton({
  navLayout,
  onChange,
  className,
}: {
  navLayout: NavigationLayout;
  onChange: (layout: NavigationLayout) => void;
  className?: string;
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          className={cn(
            "flex items-center gap-1.5 rounded-lg border border-border/70 bg-card/60 px-2.5 py-1 text-xs font-semibold text-foreground hover:bg-muted/80 transition-all cursor-pointer shadow-2xs whitespace-nowrap shrink-0",
            className,
          )}
          title="Switch Navigation & Workspace Layout"
        >
          {(navLayout as NavigationLayout) === "topbar" ? (
            <PanelsTopBottom className="size-3.5 text-primary shrink-0" />
          ) : (navLayout as NavigationLayout) === "dock" ? (
            <Layers className="size-3.5 text-primary shrink-0" />
          ) : (
            <PanelLeft className="size-3.5 text-primary shrink-0" />
          )}
          <span className="hidden sm:inline capitalize font-medium">
            {(navLayout as NavigationLayout) === "topbar" ? "Topbar" : (navLayout as NavigationLayout) === "dock" ? "Category Hub" : "Sidebar"}
          </span>
          <ChevronDown className="size-3 opacity-60 shrink-0" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-64 p-1.5 z-50 bg-popover/95 backdrop-blur-xl border border-border/80 shadow-xl rounded-xl">
        <DropdownMenuLabel className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground px-2 py-1">
          Workspace Navigation
        </DropdownMenuLabel>
        <DropdownMenuItem
          onClick={() => onChange("topbar")}
          className={cn(
            "flex items-center justify-between gap-2 px-2.5 py-2 text-xs rounded-lg cursor-pointer transition-colors mb-0.5",
            (navLayout as NavigationLayout) === "topbar" ? "bg-primary/10 font-bold text-primary" : "hover:bg-muted/70",
          )}
        >
          <div className="flex items-center gap-2.5">
            <div className="size-6 rounded-md bg-primary/10 flex items-center justify-center shrink-0">
              <PanelsTopBottom className="size-3.5 text-primary" />
            </div>
            <div>
              <p className="font-semibold leading-tight">Horizontal Topbar</p>
              <p className="text-[10px] text-muted-foreground font-normal">100% Scroll-free header</p>
            </div>
          </div>
          {(navLayout as NavigationLayout) === "topbar" ? (
            <Check className="size-3.5 text-primary shrink-0" />
          ) : (
            <Badge variant="outline" className="text-[9px] px-1 py-0 text-emerald-600 border-emerald-500/30 font-mono">
              Rec
            </Badge>
          )}
        </DropdownMenuItem>

        <DropdownMenuItem
          onClick={() => onChange("dock")}
          className={cn(
            "flex items-center justify-between gap-2 px-2.5 py-2 text-xs rounded-lg cursor-pointer transition-colors mb-0.5",
            (navLayout as NavigationLayout) === "dock" ? "bg-primary/10 font-bold text-primary" : "hover:bg-muted/70",
          )}
        >
          <div className="flex items-center gap-2.5">
            <div className="size-6 rounded-md bg-indigo-500/10 flex items-center justify-center shrink-0">
              <Layers className="size-3.5 text-indigo-500" />
            </div>
            <div>
              <p className="font-semibold leading-tight">Compact Category Hub</p>
              <p className="text-[10px] text-muted-foreground font-normal">Scroll-free icon rail</p>
            </div>
          </div>
          {(navLayout as NavigationLayout) === "dock" && <Check className="size-3.5 text-primary shrink-0" />}
        </DropdownMenuItem>

        <DropdownMenuItem
          onClick={() => onChange("sidebar")}
          className={cn(
            "flex items-center justify-between gap-2 px-2.5 py-2 text-xs rounded-lg cursor-pointer transition-colors",
            (navLayout as NavigationLayout) === "sidebar" ? "bg-primary/10 font-bold text-primary" : "hover:bg-muted/70",
          )}
        >
          <div className="flex items-center gap-2.5">
            <div className="size-6 rounded-md bg-muted flex items-center justify-center shrink-0">
              <PanelLeft className="size-3.5 text-muted-foreground" />
            </div>
            <div>
              <p className="font-semibold leading-tight">Classic Sidebar</p>
              <p className="text-[10px] text-muted-foreground font-normal">Traditional column</p>
            </div>
          </div>
          {(navLayout as NavigationLayout) === "sidebar" && <Check className="size-3.5 text-primary shrink-0" />}
        </DropdownMenuItem>

        <DropdownMenuSeparator className="my-1 border-border/60" />
        <DropdownMenuItem asChild>
          <Link
            to="/settings"
            className="flex items-center gap-2 text-xs px-2.5 py-1.5 text-muted-foreground hover:text-foreground cursor-pointer rounded-lg"
          >
            <Settings className="size-3.5" />
            <span>Customize in Settings...</span>
          </Link>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

/**
 * Intuitive, Cambridge IGCSE 0455 organized navigation:
 * 1. Essay Marking & Live: Grade Essay, Essay Grader (Chained for Free), Exemplars & Submissions
 * 2. Classroom & Progress: Dashboard, Classes, Review & Diagnostics (Together!)
 * 3. Syllabus & Knowledge: Definitions Hub, Diagram Library (Required!), Command Words, MCQ Past Papers, Question Bank
 * 4. Administration: Admin Console & Staff Console (Admin only)

 */
const NAV_GROUPS: NavGroup[] = [
  {
    id: "core",
    label: "Core Practice",
    collapsible: true,
    items: [
      { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
      { to: "/review", label: "Diagnostics & Review", icon: ClipboardCheck, badge: "Analytics" },
      { to: "/grade", label: "Grade Essays", icon: PenLine, badge: "AI Grader" },
      { to: "/mcq-live", label: "MCQ Past Papers", icon: ListChecks, badge: "P1 & P3" },
      {
        to: "/data-response",
        label: "Data Response Papers",
        icon: FileSpreadsheet,
        badge: "P2 & P4",
      },
      { to: "/essay-generator", label: "Sample Essay Generator", icon: Wand2, badge: "AI Models" },
      {
        to: "/response-structure",
        label: "Essay Structure Guide",
        icon: GraduationCap,
        badge: "Guide",
      },
    ],
  },
  {
    id: "classroom",
    label: "Classroom",
    collapsible: true,
    items: [
      { to: "/classes", label: "Classes", icon: UsersRound, badge: "Cohorts" },
    ],
  },
  {
    id: "syllabus",
    label: "Syllabus Hub",
    collapsible: true,
    items: [
      { to: "/definitions", label: "Definitions Hub", icon: BookText },
      { to: "/diagrams", label: "Diagram Library", icon: LineChart },
      { to: "/question-bank", label: "Question Bank", icon: BookMarked },
      { to: "/paper-matrix", label: "Paper Predictor", icon: Flame },
      { to: "/command-words", label: "Command Words", icon: Target },
      { to: "/showcase", label: "Exemplars Showcase", icon: Trophy },
    ],
  },
  {
    id: "admin",
    label: "Administration",
    adminOnly: true,
    collapsible: true,
    items: [
      { to: "/admin", label: "Admin Console", icon: ShieldCheck, badge: "Root" },      { to: "/calibration", label: "Anchor Calibration", icon: ShieldCheck, adminOnly: true },
    ],
  },
];

const TEACHER_NAV_GROUPS: NavGroup[] = [
  {
    id: "core",
    label: "Core Practice",
    collapsible: true,
    items: [
      { to: "/dashboard", label: "Educator Dashboard", icon: LayoutDashboard },
      { to: "/review", label: "Diagnostics & Review", icon: ClipboardCheck, badge: "Analytics" },
      { to: "/grade", label: "Grade Essays", icon: PenLine, badge: "AI Grader" },
      { to: "/mcq-live", label: "MCQ Past Papers", icon: ListChecks, badge: "P1 & P3" },
      {
        to: "/data-response",
        label: "Data Response Papers",
        icon: FileSpreadsheet,
        badge: "P2 & P4",
      },
      { to: "/essay-generator", label: "Sample Essay Generator", icon: Wand2, badge: "AI Models" },
      {
        to: "/response-structure",
        label: "Essay Structure Guide",
        icon: GraduationCap,
        badge: "Guide",
      },
    ],
  },
  {
    id: "classroom",
    label: "Classroom",
    collapsible: true,
    items: [
      { to: "/classes", label: "My Classrooms", icon: UsersRound, badge: "Cohorts" },
    ],
  },
  {
    id: "syllabus",
    label: "Syllabus Hub",
    collapsible: true,
    items: [
      { to: "/definitions", label: "Definitions Hub", icon: BookText },
      { to: "/diagrams", label: "Diagram Library", icon: LineChart },
      { to: "/question-bank", label: "Question Bank", icon: BookMarked },
      { to: "/paper-matrix", label: "Paper Predictor", icon: Flame },
      { to: "/command-words", label: "Command Words", icon: Target },
      { to: "/showcase", label: "Exemplars Showcase", icon: Trophy },
    ],
  },
  {
    id: "admin",
    label: "Administration",
    adminOnly: true,
    collapsible: true,
    items: [
      { to: "/admin", label: "Admin Console", icon: ShieldCheck, badge: "Root" },      { to: "/calibration", label: "Anchor Calibration", icon: ShieldCheck, adminOnly: true },
    ],
  },
];

function filterGroupForRole(
  group: NavGroup,
  role: "student" | "teacher" | "admin",
  subscription?: UserSubscriptionDetails,
): NavGroup | null {
  const isAdmin = role === "admin" || Boolean(subscription?.isAdmin);
  const isPaid = Boolean(subscription?.isPaid || isAdmin);

  if (group.adminOnly && !isAdmin) return null;
  if (group.staffOnly && role !== "teacher" && !isAdmin) return null;
  // Experimental labs and features are confidential and visible strictly to administrators
  if (group.isExperimental && !isAdmin) return null;

  const visibleItems = group.items.filter((item) => {
    if (item.adminOnly && !isAdmin) return false;
    if (item.staffOnly && role !== "teacher" && !isAdmin) return false;
    if (item.requiresHigherTier && !isAdmin) return false;
    return true;
  });

  if (visibleItems.length === 0) return null;
  return { ...group, items: visibleItems };
}

const GROUP_META: Record<string, { dot: string; text: string; bg: string }> = {
  core: {
    dot: "bg-indigo-500 shadow-[0_0_8px_rgba(99,102,241,0.6)]",
    text: "text-indigo-600 dark:text-indigo-400",
    bg: "hover:bg-indigo-500/10",
  },
  grading: {
    dot: "bg-indigo-500 shadow-[0_0_8px_rgba(99,102,241,0.6)]",
    text: "text-indigo-600 dark:text-indigo-400",
    bg: "hover:bg-indigo-500/10",
  },
  syllabus: {
    dot: "bg-sky-500 shadow-[0_0_8px_rgba(14,165,233,0.6)]",
    text: "text-sky-600 dark:text-sky-400",
    bg: "hover:bg-sky-500/10",
  },
  classroom: {
    dot: "bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.6)]",
    text: "text-emerald-600 dark:text-emerald-400",
    bg: "hover:bg-emerald-500/10",
  },
  dashboard_analytics: {
    dot: "bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.6)]",
    text: "text-emerald-600 dark:text-emerald-400",
    bg: "hover:bg-emerald-500/10",
  },
  admin: {
    dot: "bg-purple-500 shadow-[0_0_8px_rgba(168,85,247,0.6)]",
    text: "text-purple-600 dark:text-purple-400",
    bg: "hover:bg-purple-500/10",
  },
};

export function AppShell({
  children,
  role,
  name,
  school,
  avatarUrl,
  bio,
  birthday,
  userId,
  subscription,
}: {
  children: ReactNode;
  role: "student" | "teacher" | "admin";
  name: string | null;
  school?: string | null;
  avatarUrl?: string | null;
  bio?: string | null;
  birthday?: string | null;
  userId: string;
  subscription?: UserSubscriptionDetails;
}) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const pathname = useRouterState({ select: (state) => state.location.pathname });
  usePresenceHeartbeat(pathname, userId);
  const { openTutorial } = useFeatureTutorial();
  const currentTutorial = useMemo(() => matchTutorialByPath(pathname), [pathname]);

  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(() => new Set());
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false);
  const [commandOpen, setCommandOpen] = useState(false);  const [navLayout, setNavLayout] = useState<NavigationLayout>(() => getPlatformNavLayout());
  const [activeDockCategory, setActiveDockCategory] = useState<string>("core");
  const [inExamSession, setInExamSession] = useState(false);

  useEffect(() => {
    const syncExamState = () => {
      setInExamSession(
        typeof document !== "undefined" &&
          (document.body.dataset.inExamSession === "true" ||
            document.body.hasAttribute("data-in-exam-session")),
      );
    };
    syncExamState();
    window.addEventListener("marginal-exam-state", syncExamState);
    return () => window.removeEventListener("marginal-exam-state", syncExamState);
  }, [pathname]);

  // Global ⌘K / Ctrl+K and / command palette trigger
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setCommandOpen((prev) => !prev);
      } else if (
        e.key === "/" &&
        !["INPUT", "TEXTAREA", "SELECT"].includes((e.target as HTMLElement)?.tagName) &&
        !(e.target as HTMLElement)?.isContentEditable
      ) {
        e.preventDefault();
        setCommandOpen(true);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  useEffect(() => {
    const onLayoutChange = (e: Event) => {
      const customEvent = e as CustomEvent<NavigationLayout>;
      if (customEvent.detail) {
        setNavLayout(customEvent.detail);
      } else {
        setNavLayout(getPlatformNavLayout());
      }
    };
    window.addEventListener("marginal-layout-change", onLayoutChange);
    return () => window.removeEventListener("marginal-layout-change", onLayoutChange);
  }, []);

  const handleLayoutChange = (layout: NavigationLayout) => {
    setNavLayout(layout);
    setPlatformNavLayout(layout);
  };

  useEffect(() => {
    try {
      const stored = window.localStorage.getItem(SIDEBAR_COLLAPSED_STORAGE_KEY);
      if (stored !== null) {
        setSidebarCollapsed(stored === "true");
      } else if (typeof window !== "undefined" && window.innerWidth < 1280) {
        // Auto-collapse on standard laptop displays (< 1280px) so workspace editors have full breathing room
        setSidebarCollapsed(true);
      }

      const savedCollapsedGroups = window.localStorage.getItem(COLLAPSED_GROUPS_STORAGE_KEY);
      if (savedCollapsedGroups) {
        setCollapsedGroups(new Set(JSON.parse(savedCollapsedGroups)));
      }
    } catch {
      // Ignore localStorage errors
    }
  }, []);

  const toggleGroup = (groupId: string) => {
    setCollapsedGroups((prev) => {
      const next = new Set(prev);
      if (next.has(groupId)) next.delete(groupId);
      else next.add(groupId);
      try {
        window.localStorage.setItem(COLLAPSED_GROUPS_STORAGE_KEY, JSON.stringify(Array.from(next)));
      } catch {
        // Ignore localStorage write error
      }
      return next;
    });
  };

  const toggleSidebar = () => {
    setSidebarCollapsed((current) => {
      const next = !current;
      try {
        window.localStorage.setItem(SIDEBAR_COLLAPSED_STORAGE_KEY, String(next));
      } catch {
        // Ignore localStorage error
      }
      return next;
    });
  };

  const isTeacherUser = role === "teacher" || Boolean(subscription?.isTeacher);

  const signOut = async () => {
    await queryClient.cancelQueries();
    queryClient.clear();
    await supabase.auth.signOut();
    const target = isTeacherUser ? "/teacher-auth" : "/auth";
    navigate({ to: target, replace: true });
  };

  const visibleGroups = useMemo(() => {
    if (isTeacherUser && role !== "admin" && !subscription?.isAdmin) {
      return TEACHER_NAV_GROUPS;
    }
    return NAV_GROUPS.map((g) => filterGroupForRole(g, role, subscription)).filter(
      (g): g is NavGroup => g !== null,
    );
  }, [role, subscription, isTeacherUser]);

  const classroomLabel = role === "student" ? "Classroom" : "Classes";

  const isUserAdmin = role === "admin" || Boolean(subscription?.isAdmin);
  const isHigherTierUser =
    isUserAdmin || subscription?.tier === "mastery" || subscription?.tier === "elite";
  const canLiveExaminer = isUserAdmin || Boolean(subscription?.canUseLiveExaminer);
  const isPaidUser = isUserAdmin || Boolean(subscription?.isPaid);

  const getUnreadFn = useServerFn(getUnreadMessageCount);
  const unreadMsgQuery = useQuery({
    queryKey: ["student-unread-count"],
    queryFn: () => getUnreadFn(),
    refetchInterval: 3_000,
  });
  const unreadMsgCount = unreadMsgQuery.data?.unreadCount ?? 0;

  const prevAdminCountRef = useRef<number | null>(null);
  useEffect(() => {
    if (!isUserAdmin) return;
    if (prevAdminCountRef.current === null) {
      if (unreadMsgCount > 0) {
        playMessageNotificationChime();
        toast.info("Unread student messages in queue", {
          description: `You have ${unreadMsgCount} direct message(s) from students.`,
          action: {
            label: "Open Portal",
            onClick: () => navigate({ to: "/admin", search: { tab: "messages" } }),
          },
          duration: 8000,
        });
      }
      prevAdminCountRef.current = unreadMsgCount;
      return;
    }
    if (unreadMsgCount > prevAdminCountRef.current) {
      playMessageNotificationChime();
      toast.info("New message from student", {
        description: "A student sent a message in the direct portal.",
        action: {
          label: "View Chat",
          onClick: () => navigate({ to: "/admin", search: { tab: "messages" } }),
        },
        duration: 8000,
      });
    }
    prevAdminCountRef.current = unreadMsgCount;
  }, [unreadMsgCount, isUserAdmin, navigate]);

  const isItemActive = (to: string) => {
    if (to === "/dashboard") return pathname === "/dashboard";
    if (pathname === to) return true;
    if (to !== "/dashboard" && pathname.startsWith(to)) {
      if (to === "/grade") return pathname === "/grade" || pathname.startsWith("/essay");
      return true;
    }
    if (
      (to === "/admin" || to === "/knowledge") &&
      ["/calibration", "/content-admin", "/mcq-papers-admin"].some((p) => pathname.startsWith(p))
    ) {
      return true;
    }
    return false;
  };

  const renderNavGroup = (group: NavGroup, isMobile = false) => {
    const isCollapsed = collapsedGroups.has(group.id);
    const isOpen = !isCollapsed;
    const meta = GROUP_META[group.id];

    return (
      <div key={group.id} className="space-y-0.5">
        {group.label ? (
          sidebarCollapsed && !isMobile ? (
            <div className="my-2 border-t border-sidebar-border/60" />
          ) : (
            <button
              type="button"
              onClick={() => group.collapsible && toggleGroup(group.id)}
              className={cn(
                "w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-[10.5px] font-bold tracking-tight uppercase select-none transition-all duration-200 group cursor-pointer text-left",
                meta?.bg ?? "hover:bg-sidebar-accent/50",
                isOpen
                  ? (meta?.text ?? "text-foreground")
                  : "text-muted-foreground/70 hover:text-foreground",
              )}
              title={isOpen ? "Collapse section" : "Expand section"}
            >
              <span className="flex items-center gap-2 truncate">
                <span
                  className={cn(
                    "size-1.5 rounded-full transition-transform duration-200 shrink-0",
                    meta?.dot ?? "bg-primary/70",
                    isOpen && "scale-125",
                  )}
                />
                <span className="truncate">{group.label}</span>
                {group.isExperimental && !isHigherTierUser ? (
                  <Lock className="size-3 text-amber-500 shrink-0" />
                ) : null}
              </span>
              {group.collapsible ? (
                <ChevronDown
                  className={cn(
                    "size-3 text-muted-foreground/50 transition-transform duration-300 ease-out group-hover:text-foreground shrink-0",
                    !isOpen && "-rotate-90 text-muted-foreground/30",
                  )}
                />
              ) : null}
            </button>
          )
        ) : null}

        <div
          className={cn(
            "grid transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] overflow-hidden",
            isOpen || (sidebarCollapsed && !isMobile)
              ? "grid-rows-[1fr] opacity-100"
              : "grid-rows-[0fr] opacity-0 pointer-events-none",
          )}
        >
          <div className="min-h-0 overflow-hidden space-y-0.5">
            <nav className="flex flex-col gap-0.5 pt-0.5 pb-1">
              {group.items.map((item) => {
                const active = isItemActive(item.to);
                const label = item.to === "/classes" ? classroomLabel : item.label;

                return (
                  <Link
                    key={item.to}
                    to={item.to}
                    onClick={() => isMobile && setMobileDrawerOpen(false)}
                    className={cn(
                      "group relative flex items-center rounded-xl py-2 text-xs font-medium transition-all duration-200",
                      sidebarCollapsed && !isMobile ? "justify-center px-2" : "gap-2.5 px-2.5",
                      active
                        ? "bg-gradient-to-r from-primary/20 via-primary/10 to-transparent text-sidebar-accent-foreground font-semibold shadow-xs border border-primary/25"
                        : "text-sidebar-foreground/80 hover:bg-sidebar-accent/70 hover:text-sidebar-accent-foreground hover:translate-x-1",
                    )}
                    title={sidebarCollapsed && !isMobile ? label : undefined}
                  >
                    {active && (!sidebarCollapsed || isMobile) ? (
                      <span className="absolute left-0.5 top-1.5 bottom-1.5 w-1 rounded-full bg-gradient-to-b from-primary via-indigo-500 to-purple-500 shadow-[0_0_10px_rgba(99,102,241,0.8)]" />
                    ) : null}
                    <item.icon
                      className={cn(
                        "size-4 shrink-0 transition-transform duration-200 group-hover:scale-115 group-hover:-rotate-3",
                        active
                          ? "text-primary drop-shadow-[0_0_6px_rgba(99,102,241,0.6)]"
                          : "text-muted-foreground/80 group-hover:text-foreground",
                      )}
                    />
                    <span className={cn("truncate", sidebarCollapsed && !isMobile && "sr-only")}>
                      {label}
                    </span>
                    {item.badge && (!sidebarCollapsed || isMobile) ? (
                      <span
                        className={cn(
                          "ml-auto rounded-full px-1.5 py-0.5 text-[9px] font-bold shadow-2xs transition-colors shrink-0 flex items-center gap-1.5",
                          item.badge === "Live" || item.badge === "Beta"
                            ? "bg-emerald-500/15 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400 shadow-[0_0_8px_rgba(16,185,129,0.25)]"
                            : item.badge === "Root" || item.badge === "Admin"
                              ? "bg-purple-500/15 border border-purple-500/30 text-purple-600 dark:text-purple-400 shadow-[0_0_8px_rgba(168,85,247,0.3)]"
                              : "bg-muted border border-border/80 text-muted-foreground",
                        )}
                      >
                        {item.badge === "Live" && (
                          <span className="relative flex size-1.5">
                            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                            <span className="relative inline-flex size-1.5 rounded-full bg-emerald-500" />
                          </span>
                        )}
                        {item.badge}
                      </span>
                    ) : null}
                  </Link>
                );
              })}
            </nav>
          </div>
        </div>
      </div>
    );
  };

  const candidateInitials = useMemo(() => {
    if (!name) return "E";
    const parts = name.trim().split(/\s+/);
    if (parts.length >= 2) return `${parts[0]![0]}${parts[1]![0]}`.toUpperCase();
    return (name[0] ?? "E").toUpperCase();
  }, [name]);

  const practiceGroup = useMemo(
    () => visibleGroups.find((g) => g.id === "core" || g.id === "grading"),
    [visibleGroups],
  );
  const syllabusGroup = useMemo(
    () => visibleGroups.find((g) => g.id === "syllabus"),
    [visibleGroups],
  );
  const classroomGroup = useMemo(
    () => visibleGroups.find((g) => g.id === "classroom" || g.id === "dashboard_analytics"),
    [visibleGroups],
  );
  const adminGroup = useMemo(
    () => visibleGroups.find((g) => g.id === "admin"),
    [visibleGroups],
  );
  const isPracticeActive = useMemo(
    () =>
      Boolean(
        practiceGroup?.items
          .filter((item) => item.to !== "/dashboard" && item.to !== "/review")
          .some((item) => isItemActive(item.to)),
      ),
    [practiceGroup, pathname],
  );
  const isSyllabusActive = useMemo(
    () => Boolean(syllabusGroup?.items.some((item) => isItemActive(item.to))),
    [syllabusGroup, pathname],
  );
  const isClassroomActive = useMemo(
    () =>
      Boolean(
        classroomGroup?.items.some((item) => isItemActive(item.to)) ||
          pathname.startsWith("/classes"),
      ),
    [classroomGroup, pathname],
  );
  const isAdminActive = useMemo(
    () =>
      Boolean(
        adminGroup?.items.some((item) => isItemActive(item.to)) ||
          pathname.startsWith("/admin") ||          pathname.startsWith("/calibration"),
      ),
    [adminGroup, pathname],
  );

  return (
    <div className="flex min-h-screen bg-background">
      {/* ── 1. Desktop Sidebar: Fixed, locked to viewport, perfectly pinned with ambient glow ── */}
      {(navLayout as NavigationLayout) === "sidebar" && (
        <aside
          className={cn(
            "fixed inset-y-0 left-0 h-screen h-[100dvh] max-h-[100dvh] shrink-0 flex-col border-r border-sidebar-border/80 bg-sidebar/95 backdrop-blur-xl py-3 transition-[width,padding] duration-300 ease-out hidden lg:flex z-30 select-none overflow-hidden",
            sidebarCollapsed ? "w-[4.5rem] px-2" : "w-64 px-3",
          )}
        >
          {/* Subtle Ambient Background Orbs */}
          <div className="pointer-events-none absolute -top-12 -left-12 size-36 rounded-full bg-gradient-to-br from-primary/15 via-purple-500/10 to-transparent blur-3xl opacity-75" />
          <div className="pointer-events-none absolute -bottom-16 -right-12 size-40 rounded-full bg-gradient-to-tr from-sky-500/10 via-primary/10 to-transparent blur-3xl opacity-75" />

          {/* Brand Header */}
          <div
            className={cn(
              "mb-2.5 flex items-center pb-2.5 border-b border-sidebar-border/60 shrink-0 relative z-10",
              sidebarCollapsed ? "justify-center" : "gap-2 px-1.5",
            )}
          >
            <Link
              to="/dashboard"
              className="flex min-w-0 items-center gap-2.5 group"
              title="Marginalite Economics Dashboard"
            >
              <div className="relative group/logo shrink-0">
                <div className="absolute -inset-1 rounded-2xl bg-gradient-to-r from-primary/30 to-purple-600/30 blur-xs opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                <div className="relative size-9.5 shrink-0 rounded-xl bg-gradient-to-br from-primary/15 via-primary/8 to-transparent border border-primary/25 flex items-center justify-center overflow-hidden transition-all duration-200 group-hover:border-primary/50 group-hover:shadow-[0_0_16px_rgba(168,85,247,0.35)] shadow-xs">
                  <img
                    src="/marginal-m-icon-clean.png"
                    alt=""
                    aria-hidden="true"
                    className="size-7 object-contain transition-transform duration-300 group-hover:scale-110 drop-shadow-xs"
                  />
                </div>
              </div>
              <span
                className={cn(
                  "text-base leading-tight font-extrabold tracking-tight text-foreground transition-colors group-hover:text-primary",
                  sidebarCollapsed && "hidden",
                )}
              >
                Marginal
                <span className="flex items-center gap-1.5 text-[10px] font-normal text-muted-foreground mt-0.5">
                  <span className="size-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  Cambridge IGCSE 0455
                </span>
              </span>
            </Link>
            {!sidebarCollapsed ? (
              <Button
                variant="ghost"
                size="icon"
                className="ml-auto size-7 shrink-0 text-muted-foreground hover:text-foreground hover:bg-sidebar-accent transition-colors"
                onClick={toggleSidebar}
                title="Collapse sidebar"
                aria-label="Collapse sidebar"
              >
                <PanelLeftClose className="size-3.5" />
              </Button>
            ) : null}
          </div>

          {sidebarCollapsed ? (
            <div className="flex flex-col items-center gap-2 mb-2 shrink-0 relative z-10">
              <Button
                variant="ghost"
                size="icon"
                className="size-8 text-muted-foreground hover:text-foreground hover:bg-sidebar-accent transition-all duration-200"
                onClick={toggleSidebar}
                title="Expand sidebar"
                aria-label="Expand sidebar"
              >
                <PanelLeftOpen className="size-3.5" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="size-8 text-muted-foreground hover:text-primary hover:bg-primary/10 hover:border hover:border-primary/30 transition-all duration-200 group/btn"
                onClick={() => setCommandOpen(true)}
                title="Quick Jump (Ctrl+K)"
                aria-label="Quick Jump"
              >
                <Search className="size-3.5 transition-transform duration-200 group-hover/btn:scale-110" />
              </Button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setCommandOpen(true)}
              className="relative mb-2.5 flex w-full items-center justify-between rounded-xl border border-sidebar-border/80 bg-gradient-to-r from-sidebar-accent/50 via-sidebar-accent/30 to-sidebar-accent/20 px-2.5 py-1.5 text-xs text-muted-foreground transition-all duration-300 hover:border-primary/40 hover:bg-sidebar-accent/80 hover:shadow-[0_0_15px_rgba(99,102,241,0.12)] cursor-pointer group shrink-0 z-10"
              title="Quick Search or Jump (Ctrl+K)"
            >
              <span className="flex items-center gap-2 min-w-0">
                <Search className="size-3.5 shrink-0 text-muted-foreground/70 group-hover:text-primary transition-colors duration-200" />
                <span className="truncate text-[11.5px] font-medium group-hover:text-foreground transition-colors">Search or jump...</span>
              </span>
              <kbd className="pointer-events-none inline-flex h-4 select-none items-center gap-0.5 rounded border border-border/80 bg-background/90 px-1 font-mono text-[9px] font-semibold text-muted-foreground shadow-2xs group-hover:border-primary/40 group-hover:text-primary transition-colors">
                <span className="text-[10px]">⌘</span>K
              </kbd>
            </button>
          )}

          {/* Scrollable Navigation Groups */}
          <div
            className={cn(
              "min-h-0 flex-1 overflow-y-auto space-y-2",
              sidebarCollapsed ? "no-scrollbar px-0" : "custom-scrollbar pr-1",
            )}
          >
            {visibleGroups.map((group) => renderNavGroup(group))}
          </div>

          {/* ── User Footer: Sleek, compact bottom bar with Direct Messages & Account Menu ── */}
          <div className="shrink-0 pt-2 border-t border-sidebar-border/70 mt-auto space-y-1">
            {isUserAdmin ? (
              <Link
                to="/admin"
                search={{ tab: "messages" }}
                className={cn(
                  "flex items-center rounded-xl p-2 text-xs font-medium text-sidebar-foreground transition-all duration-200 border border-purple-500/30 bg-purple-500/10 hover:bg-purple-500/20 hover:border-purple-500/50 hover:shadow-[0_0_12px_rgba(168,85,247,0.15)]",
                  sidebarCollapsed ? "justify-center" : "gap-2 justify-between",
                )}
                title="Direct Messages & Broadcasts"
              >
                <div className="flex items-center gap-2 min-w-0">
                  <Send className="size-4 shrink-0 text-purple-400 animate-pulse" />
                  <span className={cn("truncate font-semibold", sidebarCollapsed && "sr-only")}>
                    Admin Messages
                  </span>
                </div>
                {unreadMsgCount > 0 ? (
                  <span className="flex h-4 min-w-4 items-center justify-center rounded-full bg-rose-500 px-1 text-[10px] font-bold text-white shadow-xs">
                    {unreadMsgCount}
                  </span>
                ) : null}
              </Link>
            ) : null}

            {/* Quick Feedback pill for student */}
            <FeedbackDialog
              trigger={
                <button
                  type="button"
                  className={cn(
                    "flex items-center rounded-xl p-2 text-xs font-medium text-sidebar-foreground/75 transition-all duration-200 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground w-full text-left cursor-pointer",
                    sidebarCollapsed ? "justify-center" : "gap-2.5",
                  )}
                  title="Share feedback or report an issue"
                >
                  <MessageSquare className="size-4 shrink-0 text-primary" />
                  <span className={cn("truncate", sidebarCollapsed && "sr-only")}>
                    Message Us / Feedback
                  </span>
                </button>
              }
            />

            {/* Unified Profile & Settings Dropdown */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  type="button"
                  className={cn(
                    "flex items-center rounded-xl p-1.5 text-xs transition-all duration-300 w-full text-left cursor-pointer outline-none group border border-sidebar-border/60 bg-gradient-to-r from-sidebar-accent/30 to-card/40 hover:border-primary/40 hover:bg-sidebar-accent/70 hover:shadow-[0_0_15px_rgba(99,102,241,0.12)]",
                    sidebarCollapsed ? "justify-center" : "gap-2 justify-between",
                  )}
                  title={`${name ?? "Candidate"} — Profile & Menu`}
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <UserAvatar
                      avatarUrl={avatarUrl}
                      name={name}
                      fallbackInitials={candidateInitials}
                      showStatusDot={true}
                      className="size-7 shrink-0 transition-transform group-hover:scale-105"
                    />
                    {!sidebarCollapsed && (
                      <div className="min-w-0 flex-1 text-left">
                        <p className="text-xs font-semibold truncate text-foreground leading-tight">
                          {name ?? "Candidate"}
                        </p>
                        <p className="text-[10px] text-muted-foreground truncate leading-tight capitalize">
                          {role === "admin" || subscription?.isAdmin
                            ? "Root Admin"
                            : role === "teacher" || subscription?.isTeacher
                              ? "Educator"
                              : school || "Candidate"}
                        </p>
                      </div>
                    )}
                  </div>
                  {!sidebarCollapsed && (
                    <ChevronsUpDown className="size-3.5 shrink-0 text-muted-foreground/60 group-hover:text-foreground transition-colors" />
                  )}
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                side={sidebarCollapsed ? "right" : "top"}
                align={sidebarCollapsed ? "end" : "start"}
                className="w-56 p-1.5 shadow-xl border-border/80"
              >
                <DropdownMenuLabel className="p-2 font-normal">
                  <div className="flex flex-col space-y-1">
                    <p className="text-xs font-bold leading-none text-foreground truncate">{name ?? "Candidate"}</p>
                    <p className="text-[10px] leading-none text-muted-foreground truncate">
                      {role === "admin" || subscription?.isAdmin
                        ? "Administrator Access"
                        : role === "teacher" || subscription?.isTeacher
                          ? (school ?? "Educator")
                          : "Cambridge IGCSE 0455 Candidate"}
                    </p>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <Link to="/settings" className="flex items-center gap-2 cursor-pointer text-xs">
                    <Settings className="size-3.5 text-muted-foreground" />
                    <span>Profile & Settings</span>
                  </Link>
                </DropdownMenuItem>

                {/* Navigation Layout Switcher */}
                <DropdownMenuSeparator className="my-1 border-border/60" />
                <div className="px-2 py-1 text-[9.5px] font-bold text-muted-foreground uppercase tracking-wider">
                  Navigation Layout
                </div>
                <div className="px-1.5 py-1 grid grid-cols-3 gap-1">
                  <button
                    type="button"
                    onClick={() => handleLayoutChange("topbar")}
                    className={cn(
                      "flex flex-col items-center justify-center py-1.5 px-1 rounded-lg text-[10.5px] font-semibold transition-all cursor-pointer border",
                      (navLayout as NavigationLayout) === "topbar"
                        ? "bg-primary text-primary-foreground border-primary shadow-2xs font-bold"
                        : "bg-muted/40 text-muted-foreground border-transparent hover:bg-muted/70 hover:text-foreground",
                    )}
                  >
                    <PanelsTopBottom className="size-3.5 mb-0.5" />
                    <span>Topbar</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleLayoutChange("sidebar")}
                    className={cn(
                      "flex flex-col items-center justify-center py-1.5 px-1 rounded-lg text-[10.5px] font-semibold transition-all cursor-pointer border",
                      (navLayout as NavigationLayout) === "sidebar"
                        ? "bg-primary text-primary-foreground border-primary shadow-2xs font-bold"
                        : "bg-muted/40 text-muted-foreground border-transparent hover:bg-muted/70 hover:text-foreground",
                    )}
                  >
                    <PanelLeft className="size-3.5 mb-0.5" />
                    <span>Sidebar</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleLayoutChange("dock")}
                    className={cn(
                      "flex flex-col items-center justify-center py-1.5 px-1 rounded-lg text-[10.5px] font-semibold transition-all cursor-pointer border",
                      (navLayout as NavigationLayout) === "dock"
                        ? "bg-primary text-primary-foreground border-primary shadow-2xs font-bold"
                        : "bg-muted/40 text-muted-foreground border-transparent hover:bg-muted/70 hover:text-foreground",
                    )}
                  >
                    <Layers className="size-3.5 mb-0.5" />
                    <span>Dock</span>
                  </button>
                </div>
                <DropdownMenuItem
                  onClick={() => openTutorial()}
                  className="flex items-center gap-2 cursor-pointer text-xs"
                >
                  <GraduationCap className="size-3.5 text-purple-500" />
                  <span>Feature Tutorials</span>
                </DropdownMenuItem>
                <FeedbackDialog
                  trigger={
                    <div className="relative flex cursor-pointer select-none items-center gap-2 rounded-sm px-2 py-1.5 text-xs outline-none transition-colors hover:bg-accent hover:text-accent-foreground w-full">
                      <MessageSquare className="size-3.5 text-primary" />
                      <span>Send Feedback / Message</span>
                    </div>
                  }
                />
                <DropdownMenuSeparator />
                <div className="px-2 py-1 text-[9.5px] font-bold text-muted-foreground uppercase tracking-wider">
                  Platform &amp; Legal
                </div>
                <DropdownMenuItem asChild>
                  <Link to="/about" className="flex items-center gap-2 cursor-pointer text-xs">
                    <Info className="size-3.5 text-muted-foreground" />
                    <span>About Marginal</span>
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link to="/terms" className="flex items-center gap-2 cursor-pointer text-xs">
                    <FileText className="size-3.5 text-muted-foreground" />
                    <span>Terms of Service</span>
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link to="/privacy" className="flex items-center gap-2 cursor-pointer text-xs">
                    <ShieldCheck className="size-3.5 text-muted-foreground" />
                    <span>Privacy Policy</span>
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={signOut}
                  className="flex items-center gap-2 cursor-pointer text-xs text-destructive focus:text-destructive focus:bg-destructive/10"
                >
                  <LogOut className="size-3.5" />
                  <span>Sign out</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </aside>
      )}

      {/* ── 2. Compact Category Hub Dock Layout ── */}
      {(navLayout as NavigationLayout) === "dock" && (
        <aside className="sticky top-0 h-screen h-[100dvh] max-h-[100dvh] shrink-0 hidden lg:flex z-30 select-none">
          {/* Slim 68px Icon Rail */}
          <div className="w-[4.25rem] h-full flex flex-col items-center justify-between py-3 border-r border-sidebar-border bg-sidebar shrink-0">
            <div className="flex flex-col items-center gap-3 w-full">
              <Link
                to="/dashboard"
                className="relative group/logo shrink-0 p-1"
                title="Dashboard"
              >
                <div className="absolute -inset-1 rounded-xl bg-gradient-to-r from-primary/30 to-purple-600/30 blur-xs opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                <div className="relative size-9 shrink-0 rounded-xl bg-gradient-to-br from-primary/15 via-primary/8 to-transparent border border-primary/25 flex items-center justify-center overflow-hidden transition-all duration-200 group-hover:border-primary/50 group-hover:shadow-[0_0_16px_rgba(168,85,247,0.35)] shadow-xs">
                  <img
                    src="/marginal-m-icon-clean.png"
                    alt="Marginalite"
                    className="size-6.5 object-contain transition-transform duration-300 group-hover:scale-110 drop-shadow-xs"
                  />
                </div>
              </Link>

              <button
                type="button"
                onClick={() => setCommandOpen(true)}
                className="size-10 rounded-xl flex flex-col items-center justify-center text-muted-foreground hover:bg-sidebar-accent hover:text-foreground transition-all cursor-pointer group"
                title="Search Cambridge IGCSE 0455 (⌘K)"
              >
                <SearchIcon className="size-4.5 text-primary group-hover:scale-110 transition-transform" />
                <span className="text-[8.5px] font-bold text-muted-foreground/80 mt-0.5">Search</span>
              </button>

              <div className="w-8 h-px bg-sidebar-border/70 my-1" />

              {/* Category Icons */}
              {visibleGroups.map((group) => {
                const effectiveCategory = visibleGroups.some((g) => g.id === activeDockCategory)
                  ? activeDockCategory
                  : (visibleGroups[0]?.id ?? "core");
                const isSelected = effectiveCategory === group.id;
                const Icon =
                  group.id === "core" || group.id === "grading"
                    ? PenLine
                    : group.id === "syllabus"
                      ? BookOpen
                      : group.id === "classroom" || group.id === "dashboard_analytics"
                        ? UsersRound
                        : ShieldCheck;

                return (
                  <button
                    key={group.id}
                    type="button"
                    onClick={() => setActiveDockCategory(group.id)}
                    className={cn(
                      "group relative flex flex-col items-center justify-center size-11 rounded-xl transition-all cursor-pointer",
                      isSelected
                        ? "bg-primary text-primary-foreground shadow-xs font-bold"
                        : "text-muted-foreground hover:bg-sidebar-accent/80 hover:text-foreground",
                    )}
                    title={group.label}
                  >
                    <Icon className="size-5" />
                    <span className="text-[9px] font-bold mt-0.5 truncate max-w-[48px]">
                      {group.id === "core" || group.id === "grading"
                        ? "Practice"
                        : group.id === "syllabus"
                          ? "Syllabus"
                          : group.id === "classroom" || group.id === "dashboard_analytics"
                            ? "Classes"
                            : "Admin"}
                    </span>
                    {isSelected && (
                      <span className="absolute -left-1 top-2.5 bottom-2.5 w-1 rounded-r-full bg-primary" />
                    )}
                  </button>
                );
              })}
            </div>

            {/* Bottom Dock Utilities */}
            <div className="flex flex-col items-center gap-2 w-full pt-2 border-t border-sidebar-border/70">
              <LayoutSwitcherButton
                navLayout={navLayout}
                onChange={handleLayoutChange}
                className="size-8 justify-center p-0 rounded-xl"
              />
              <Link
                to="/settings"
                className="p-0.5 rounded-xl hover:ring-2 hover:ring-primary/40 transition-all"
                title="Settings"
              >
                <UserAvatar
                  avatarUrl={avatarUrl}
                  name={name}
                  fallbackInitials={candidateInitials}
                  showStatusDot={true}
                  className="size-8"
                />
              </Link>
            </div>
          </div>

          {/* Adjacent Compact Sub-Panel: Scroll-Free 4–6 tools */}
          <div className="w-56 h-full flex flex-col py-3 px-2.5 border-r border-sidebar-border/60 bg-card/60 backdrop-blur-md shrink-0">
            {visibleGroups
              .filter(
                (g) =>
                  g.id === activeDockCategory ||
                  (!visibleGroups.some((vg) => vg.id === activeDockCategory) &&
                    g.id === (visibleGroups[0]?.id ?? "core")),
              )
              .map((group) => (
                <div key={group.id} className="flex flex-col h-full">
                  <div className="pb-2.5 mb-2 border-b border-border/60">
                    <p className="text-xs font-bold text-foreground truncate">
                      {group.label}
                    </p>
                    <p className="text-[10.5px] text-muted-foreground">
                      Quick Cambridge Navigation
                    </p>
                  </div>
                  <nav className="flex flex-col gap-1 flex-1">
                    {group.items.map((item) => {
                      const active = isItemActive(item.to);
                      const label =
                        item.to === "/classes" ? classroomLabel : item.label;
                      return (
                        <Link
                          key={item.to}
                          to={item.to}
                          className={cn(
                            "group relative flex items-center justify-between rounded-xl px-2.5 py-2 text-xs font-medium transition-all duration-150",
                            active
                              ? "bg-primary/10 text-primary font-bold shadow-2xs"
                              : "text-muted-foreground hover:bg-muted/80 hover:text-foreground",
                          )}
                        >
                          <div className="flex items-center gap-2 min-w-0">
                            <item.icon className="size-4 shrink-0 text-muted-foreground group-hover:text-foreground" />
                            <span className="truncate">{label}</span>
                          </div>
                          {item.badge && (
                            <Badge
                              variant="outline"
                              className={cn(
                                "text-[9px] px-1.5 py-0 shrink-0",
                                item.badge === "Beta" ||
                                  item.badge === "Under Building"
                                  ? "border-amber-500/35 bg-amber-500/10 text-amber-600 dark:text-amber-400"
                                  : "border-primary/30 text-primary bg-primary/10",
                              )}
                            >
                              {item.badge}
                            </Badge>
                          )}
                        </Link>
                      );
                    })}
                  </nav>
                </div>
              ))}
          </div>
        </aside>
      )}

      {/* ── Main Content & Mobile Header ── */}
      <div
        className={cn(
          "flex min-w-0 flex-1 flex-col overflow-x-hidden transition-[padding] duration-300 ease-out",
          (navLayout as NavigationLayout) === "sidebar"
            ? sidebarCollapsed
              ? "lg:pl-[4.5rem]"
              : "lg:pl-64"
            : "",
        )}
      >
        {/* Mobile Header (all layouts) */}
        <header className="flex items-center justify-between border-b border-border bg-card/80 px-3 sm:px-4 py-2 sm:py-2.5 backdrop-blur-sm lg:hidden sticky top-0 z-40 w-full max-w-full">
          <div className="flex items-center gap-2 sm:gap-2.5 min-w-0">
            <Sheet open={mobileDrawerOpen} onOpenChange={setMobileDrawerOpen}>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon" className="size-8 shrink-0">
                  <Menu className="size-4" />
                  <span className="sr-only">Open navigation menu</span>
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="w-[85vw] sm:w-72 max-w-[320px] p-4 flex flex-col h-full">
                <SheetHeader className="mb-3 text-left shrink-0">
                  <SheetTitle className="flex items-center gap-2.5">
                    <div className="relative size-8.5 shrink-0 rounded-xl bg-gradient-to-br from-primary/15 via-primary/8 to-transparent border border-primary/25 flex items-center justify-center overflow-hidden shadow-xs">
                      <img
                        src="/marginal-m-icon-clean.png"
                        alt="Marginalite"
                        aria-hidden="true"
                        className="size-6 object-contain drop-shadow-xs"
                      />
                    </div>
                    <span className="font-extrabold tracking-tight">Marginalite 0455</span>
                  </SheetTitle>
                </SheetHeader>

                {/* Mobile Quick Jump */}
                <button
                  type="button"
                  onClick={() => {
                    setMobileDrawerOpen(false);
                    setCommandOpen(true);
                  }}
                  className="mb-2.5 flex w-full items-center justify-between rounded-xl border border-border/80 bg-muted/40 px-3 py-2 text-xs text-muted-foreground cursor-pointer shrink-0"
                >
                  <span className="flex items-center gap-2">
                    <Search className="size-3.5 text-primary" />
                    <span>Search or jump...</span>
                  </span>
                  <kbd className="text-[9px] font-mono px-1 rounded bg-background border border-border">⌘K</kbd>
                </button>

                <div className="min-h-0 flex-1 overflow-y-auto custom-scrollbar space-y-2 pr-1">
                  {visibleGroups.map((group) => renderNavGroup(group, true))}
                </div>

                <div className="mt-auto shrink-0 pt-3 border-t border-border space-y-1">
                  <LayoutSwitcherButton
                    navLayout={navLayout}
                    onChange={(l) => {
                      setMobileDrawerOpen(false);
                      handleLayoutChange(l);
                    }}
                    className="w-full justify-start"
                  />

                  <ThemeToggle
                    variant="menu-item"
                    className="w-full justify-between"
                  />

                  {isUserAdmin ? (
                    <Link
                      to="/admin"
                      search={{ tab: "messages" }}
                      onClick={() => setMobileDrawerOpen(false)}
                      className="relative flex items-center gap-2.5 rounded-lg px-2.5 py-1.5 text-xs font-medium text-foreground hover:bg-muted w-full text-left cursor-pointer"
                    >
                      <Send className="size-4 text-primary" /> Direct Messages
                      {unreadMsgCount > 0 && (
                        <span className="ml-auto flex h-4 min-w-4 items-center justify-center rounded-full bg-rose-500 px-1 text-[10px] font-bold text-white shadow-xs">
                          {unreadMsgCount}
                        </span>
                      )}
                    </Link>
                  ) : (
                    <StudentMessagesDialog
                      trigger={
                        <button
                          type="button"
                          onClick={() => setMobileDrawerOpen(false)}
                          className="flex items-center gap-2.5 rounded-lg px-2.5 py-1.5 text-xs font-medium text-foreground hover:bg-muted w-full text-left cursor-pointer"
                        >
                          <Send className="size-4 text-primary" /> Direct Messages
                        </button>
                      }
                    />
                  )}
                  <FeedbackDialog
                    trigger={
                      <button
                        type="button"
                        onClick={() => setMobileDrawerOpen(false)}
                        className="flex items-center gap-2.5 rounded-lg px-2.5 py-1.5 text-xs font-medium text-foreground hover:bg-muted w-full text-left cursor-pointer"
                      >
                        <MessageSquare className="size-4 text-primary" /> Message Us / Feedback
                      </button>
                    }
                  />
                  <button
                    type="button"
                    onClick={() => {
                      setMobileDrawerOpen(false);
                      openTutorial();
                    }}
                    className="flex items-center gap-2.5 rounded-lg px-2.5 py-1.5 text-xs font-medium text-foreground hover:bg-muted w-full text-left cursor-pointer"
                  >
                    <GraduationCap className="size-4 text-purple-500" /> Feature Tutorials
                  </button>

                  <div className="flex items-center justify-between pt-2 border-t border-border/60">
                    <Link
                      to="/settings"
                      onClick={() => setMobileDrawerOpen(false)}
                      className="flex items-center gap-2 min-w-0 flex-1 py-1"
                    >
                      <UserAvatar
                        avatarUrl={avatarUrl}
                        name={name}
                        fallbackInitials={candidateInitials}
                        showStatusDot={true}
                        className="size-7 shrink-0"
                      />
                      <div className="min-w-0">
                        <span className="font-bold text-xs text-foreground block truncate">
                          {name ?? "Candidate"}
                        </span>
                        <span className="text-[10px] text-muted-foreground block truncate capitalize">
                          {role === "admin" || subscription?.isAdmin
                            ? "Root Admin"
                            : role === "teacher" || subscription?.isTeacher
                              ? "Educator"
                              : school || "Candidate"}
                        </span>
                      </div>
                    </Link>
                    <div className="flex items-center gap-1 shrink-0">
                      <Link
                        to="/settings"
                        onClick={() => setMobileDrawerOpen(false)}
                        className="size-7 rounded-md flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                        title="Settings"
                      >
                        <Settings className="size-3.5" />
                      </Link>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="size-7 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                        onClick={signOut}
                        title="Sign out"
                      >
                        <LogOut className="size-3.5" />
                      </Button>
                    </div>
                  </div>
                </div>
              </SheetContent>
            </Sheet>

            <Link to="/dashboard" className="flex items-center gap-2 shrink-0 group">
              <div className="relative size-8 shrink-0 rounded-xl bg-gradient-to-br from-primary/15 via-primary/8 to-transparent border border-primary/25 flex items-center justify-center overflow-hidden shadow-2xs">
                <img
                  src="/marginal-m-icon-clean.png"
                  alt="Marginalite"
                  aria-hidden="true"
                  className="size-6 object-contain"
                />
              </div>
              <span className="text-sm font-extrabold tracking-tight truncate hidden min-[360px]:inline">Marginalite</span>
            </Link>
          </div>

          <div className="flex items-center gap-1 sm:gap-2 shrink-0">
            <button
              type="button"
              onClick={() => setCommandOpen(true)}
              className="flex items-center justify-center size-8 rounded-lg border border-border/70 bg-card/60 hover:bg-muted/80 transition-colors text-muted-foreground hover:text-foreground cursor-pointer shadow-2xs shrink-0"
              title="Search Cambridge IGCSE 0455 (⌘K)"
              aria-label="Search or jump"
            >
              <SearchIcon className="size-3.5 text-primary" />
            </button>
            <TopTutorialButton size="sm" showLabel={false} className="size-8 p-0 justify-center shrink-0" />
            <LayoutSwitcherButton
              navLayout={navLayout}
              onChange={handleLayoutChange}
              className="hidden sm:flex"
            />
            {isUserAdmin ? (
              <Link
                to="/admin"
                search={{ tab: "messages" }}
                className="relative flex items-center justify-center size-8 rounded-lg border border-border/70 bg-card/60 hover:bg-muted/80 text-foreground transition-all cursor-pointer shadow-2xs shrink-0"
                title="Direct Messages Portal"
              >
                <Send className="size-3.5 text-primary" />
                {unreadMsgCount > 0 && (
                  <span className="absolute -top-1 -right-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-rose-500 px-1 text-[9.5px] font-bold text-white shadow-xs ring-2 ring-background">
                    {unreadMsgCount}
                  </span>
                )}
              </Link>
            ) : (
              <StudentMessagesDialog
                trigger={
                  <button
                    type="button"
                    className="relative flex items-center justify-center size-8 rounded-lg border border-border/70 bg-card/60 hover:bg-muted/80 text-foreground transition-all cursor-pointer shadow-2xs shrink-0"
                    title="Direct Messages from Examiners"
                  >
                    <Send className="size-3.5 text-primary" />
                  </button>
                }
              />
            )}

            {/* Night / Day Theme Toggle */}
            <ThemeToggle className="size-8" />

            {/* Mobile User Profile Avatar Trigger */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  type="button"
                  className="flex items-center rounded-full p-0.5 ring-1.5 ring-primary/30 hover:ring-primary/70 transition-all cursor-pointer shrink-0"
                  title="User Account"
                >
                  <UserAvatar
                    avatarUrl={avatarUrl}
                    name={name}
                    fallbackInitials={candidateInitials}
                    showStatusDot={true}
                    className="size-7"
                  />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-60 p-2 z-50 bg-popover/95 backdrop-blur-xl border border-border/80 shadow-2xl rounded-2xl">
                <div className="flex items-center gap-2.5 p-2 rounded-xl bg-muted/40 mb-1 border border-border/40">
                  <UserAvatar
                    avatarUrl={avatarUrl}
                    name={name}
                    fallbackInitials={candidateInitials}
                    showStatusDot={false}
                    className="size-8"
                  />
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-bold text-foreground truncate">
                      {name ?? "Candidate"}
                    </p>
                    <p className="text-[10px] text-muted-foreground truncate">
                      {school || (isTeacherUser ? "Educator" : "Cambridge IGCSE 0455 Candidate")}
                    </p>
                  </div>
                </div>
                <DropdownMenuItem asChild className="p-0 mb-0.5">
                  <Link
                    to="/dashboard"
                    className="flex items-center gap-2.5 px-2.5 py-2 text-xs rounded-lg cursor-pointer hover:bg-muted/70 text-foreground"
                  >
                    <LayoutDashboard className="size-3.5 text-muted-foreground" />
                    <span>Dashboard</span>
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild className="p-0 mb-0.5">
                  <Link
                    to="/settings"
                    className="flex items-center gap-2.5 px-2.5 py-2 text-xs rounded-lg cursor-pointer hover:bg-muted/70 text-foreground"
                  >
                    <Settings className="size-3.5 text-muted-foreground" />
                    <span>Profile &amp; Settings</span>
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => openTutorial()}
                  className="flex items-center gap-2.5 px-2.5 py-2 text-xs rounded-lg cursor-pointer hover:bg-muted/70 text-foreground"
                >
                  <GraduationCap className="size-3.5 text-purple-500" />
                  <span>Feature Tutorials</span>
                </DropdownMenuItem>

                {/* Navigation Layout Switcher */}
                <DropdownMenuSeparator className="my-1 border-border/60" />
                <div className="px-2 py-1 text-[9.5px] font-bold text-muted-foreground uppercase tracking-wider">
                  Navigation Layout
                </div>
                <div className="px-1.5 py-1 grid grid-cols-3 gap-1">
                  <button
                    type="button"
                    onClick={() => handleLayoutChange("topbar")}
                    className={cn(
                      "flex flex-col items-center justify-center py-1.5 px-1 rounded-lg text-[10.5px] font-semibold transition-all cursor-pointer border",
                      (navLayout as NavigationLayout) === "topbar"
                        ? "bg-primary text-primary-foreground border-primary shadow-2xs font-bold"
                        : "bg-muted/40 text-muted-foreground border-transparent hover:bg-muted/70 hover:text-foreground",
                    )}
                  >
                    <PanelsTopBottom className="size-3.5 mb-0.5" />
                    <span>Topbar</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleLayoutChange("sidebar")}
                    className={cn(
                      "flex flex-col items-center justify-center py-1.5 px-1 rounded-lg text-[10.5px] font-semibold transition-all cursor-pointer border",
                      (navLayout as NavigationLayout) === "sidebar"
                        ? "bg-primary text-primary-foreground border-primary shadow-2xs font-bold"
                        : "bg-muted/40 text-muted-foreground border-transparent hover:bg-muted/70 hover:text-foreground",
                    )}
                  >
                    <PanelLeft className="size-3.5 mb-0.5" />
                    <span>Sidebar</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleLayoutChange("dock")}
                    className={cn(
                      "flex flex-col items-center justify-center py-1.5 px-1 rounded-lg text-[10.5px] font-semibold transition-all cursor-pointer border",
                      (navLayout as NavigationLayout) === "dock"
                        ? "bg-primary text-primary-foreground border-primary shadow-2xs font-bold"
                        : "bg-muted/40 text-muted-foreground border-transparent hover:bg-muted/70 hover:text-foreground",
                    )}
                  >
                    <Layers className="size-3.5 mb-0.5" />
                    <span>Dock</span>
                  </button>
                </div>
                <DropdownMenuSeparator className="my-1 border-border/60" />
                <div className="px-1 py-0.5">
                  <ThemeToggle variant="menu-item" />
                </div>
                <DropdownMenuSeparator className="my-1 border-border/60" />
                <div className="px-2 py-1 text-[9.5px] font-bold text-muted-foreground uppercase tracking-wider">
                  Platform &amp; Legal
                </div>
                <DropdownMenuItem asChild className="p-0 mb-0.5">
                  <Link
                    to="/about"
                    className="flex items-center gap-2.5 px-2.5 py-1.5 text-xs rounded-lg cursor-pointer hover:bg-muted/70 text-foreground"
                  >
                    <Info className="size-3.5 text-muted-foreground" />
                    <span>About Marginal</span>
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild className="p-0 mb-0.5">
                  <Link
                    to="/terms"
                    className="flex items-center gap-2.5 px-2.5 py-1.5 text-xs rounded-lg cursor-pointer hover:bg-muted/70 text-foreground"
                  >
                    <FileText className="size-3.5 text-muted-foreground" />
                    <span>Terms of Service</span>
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild className="p-0 mb-0.5">
                  <Link
                    to="/privacy"
                    className="flex items-center gap-2.5 px-2.5 py-1.5 text-xs rounded-lg cursor-pointer hover:bg-muted/70 text-foreground"
                  >
                    <ShieldCheck className="size-3.5 text-muted-foreground" />
                    <span>Privacy Policy</span>
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator className="my-1 border-border/60" />
                <DropdownMenuItem
                  onClick={signOut}
                  className="flex items-center gap-2.5 px-2.5 py-2 text-xs rounded-lg text-destructive hover:bg-destructive/10 cursor-pointer font-medium"
                >
                  <LogOut className="size-3.5" />
                  <span>Sign out</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>

        {/* ── Desktop Horizontal Topbar Navigation (navLayout === 'topbar') ── */}
        {(navLayout as NavigationLayout) === "topbar" && (
          <header className="hidden lg:flex items-center justify-between h-14 border-b border-border/60 bg-background/80 backdrop-blur-xl px-4 sm:px-6 sticky top-0 z-40 w-full shrink-0 select-none shadow-[0_1px_3px_0_rgba(0,0,0,0.03)] dark:shadow-[0_1px_3px_0_rgba(0,0,0,0.2)]">
            {/* Left: Brand + Navigation Dropdowns */}
            <div className="flex items-center gap-3 xl:gap-4 min-w-0 shrink-0">
              <Link to="/dashboard" className="flex items-center gap-2.5 shrink-0 group pr-1.5" title="Marginalite Economics Dashboard">
                <div className="relative group/logo shrink-0">
                  <div className="absolute -inset-1 rounded-xl bg-gradient-to-r from-primary/30 to-purple-600/30 blur-xs opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                  <div className="relative size-9.5 shrink-0 rounded-xl bg-gradient-to-br from-primary/15 via-primary/8 to-transparent border border-primary/25 flex items-center justify-center overflow-hidden transition-all duration-200 group-hover:border-primary/50 group-hover:shadow-[0_0_16px_rgba(168,85,247,0.35)] shadow-xs">
                    <img
                      src="/marginal-m-icon-clean.png"
                      alt="Marginalite"
                      aria-hidden="true"
                      className="size-7 object-contain transition-transform duration-300 group-hover:scale-110 drop-shadow-xs"
                    />
                  </div>
                </div>
                <span className="text-base font-extrabold tracking-tight text-foreground transition-colors group-hover:text-primary">
                  Marginalite
                </span>
              </Link>

              {/* Subtle Vertical Hairline Separator */}
              <div className="hidden xl:block h-4 w-px bg-border/60 shrink-0" />

              {/* Top Navigation Menus */}
              <nav className="flex items-center gap-1 p-1 rounded-xl bg-muted/45 border border-border/60 shadow-2xs backdrop-blur-xs shrink-0">
                <Link
                  to="/dashboard"
                  className={cn(
                    "group relative flex items-center gap-2 h-8 px-3 rounded-lg text-xs transition-all duration-150 cursor-pointer select-none whitespace-nowrap",
                    pathname === "/dashboard"
                      ? "bg-background text-primary font-semibold shadow-xs border border-border/80 dark:border-border/60 ring-1 ring-primary/20"
                      : "text-muted-foreground hover:text-foreground hover:bg-background/60 font-medium",
                  )}
                >
                  <LayoutDashboard
                    className={cn(
                      "size-3.5 shrink-0 transition-colors",
                      pathname === "/dashboard"
                        ? "text-primary"
                        : "text-muted-foreground/80 group-hover:text-foreground",
                    )}
                  />
                  <span>Dashboard</span>
                </Link>

                {/* Diagnostics & Review: directly visible outside without dropdown */}
                <Link
                  to="/review"
                  className={cn(
                    "group relative flex items-center gap-2 h-8 px-3 rounded-lg text-xs transition-all duration-150 cursor-pointer select-none whitespace-nowrap",
                    pathname.startsWith("/review")
                      ? "bg-background text-primary font-semibold shadow-xs border border-border/80 dark:border-border/60 ring-1 ring-primary/20"
                      : "text-muted-foreground hover:text-foreground hover:bg-background/60 font-medium",
                  )}
                  title="Diagnostics, Assessment Objective Radar & Performance Review"
                >
                  <ClipboardCheck
                    className={cn(
                      "size-3.5 shrink-0 transition-colors",
                      pathname.startsWith("/review")
                        ? "text-primary"
                        : "text-muted-foreground/80 group-hover:text-foreground",
                    )}
                  />
                  <span>Diagnostics &amp; Review</span>
                </Link>

                {/* Exam Practice Dropdown */}
                {practiceGroup && (
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <button
                        type="button"
                        className={cn(
                          "group relative flex items-center gap-2 h-8 px-3 rounded-lg text-xs transition-all duration-150 cursor-pointer select-none whitespace-nowrap",
                          isPracticeActive
                            ? "bg-background text-primary font-semibold shadow-xs border border-border/80 dark:border-border/60 ring-1 ring-primary/20"
                            : "text-muted-foreground hover:text-foreground hover:bg-background/60 font-medium group-data-[state=open]:bg-background/70 group-data-[state=open]:text-foreground",
                        )}
                      >
                        <PenLine
                          className={cn(
                            "size-3.5 shrink-0 transition-colors",
                            isPracticeActive
                              ? "text-primary"
                              : "text-muted-foreground/80 group-hover:text-foreground",
                          )}
                        />
                        <span>Exam Practice</span>
                        <ChevronDown className="size-3 text-muted-foreground/60 group-hover:text-foreground group-data-[state=open]:rotate-180 transition-all duration-200 shrink-0" />
                      </button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="start" className="w-72 p-1.5 z-50 bg-popover/95 backdrop-blur-xl border border-border/80 shadow-xl rounded-xl animate-in fade-in-0 zoom-in-95">
                      <div className="px-2.5 py-1.5 mb-1 border-b border-border/50 flex items-center justify-between">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                          Cambridge IGCSE 0455 Practice
                        </span>
                        <span className="text-[9px] font-mono text-muted-foreground/80">Paper 1 &amp; 2</span>
                      </div>
                      {practiceGroup.items
                        .filter((item) => item.to !== "/dashboard" && item.to !== "/review")
                        .map((item) => (
                        <DropdownMenuItem key={item.to} asChild className="p-0 mb-0.5">
                          <Link
                            to={item.to}
                            className={cn(
                              "flex items-center justify-between gap-2.5 px-2.5 py-2 text-xs rounded-lg cursor-pointer transition-all group",
                              isItemActive(item.to)
                                ? "bg-primary/10 text-primary font-semibold"
                                : "hover:bg-muted/70 text-foreground",
                            )}
                          >
                            <div className="flex items-center gap-2.5 min-w-0">
                              <div className="size-6 rounded-md bg-muted/60 flex items-center justify-center shrink-0 group-hover:bg-primary/10 transition-colors">
                                <item.icon className="size-3.5 text-muted-foreground group-hover:text-primary transition-colors shrink-0" />
                              </div>
                              <span className="truncate font-medium">{item.label}</span>
                            </div>
                            {item.badge && (
                              <Badge
                                variant="outline"
                                className={cn(
                                  "text-[9px] px-1.5 py-0 shrink-0 font-mono",
                                  item.badge === "Under Building" || item.badge === "Beta" || item.badge === "In Dev"
                                    ? "border-amber-500/35 bg-amber-500/10 text-amber-600 dark:text-amber-400"
                                    : "border-primary/30 text-primary bg-primary/10",
                                )}
                              >
                                {item.badge}
                              </Badge>
                            )}
                          </Link>
                        </DropdownMenuItem>
                      ))}
                    </DropdownMenuContent>
                  </DropdownMenu>
                )}

                {/* Syllabus Hub Dropdown */}
                {syllabusGroup && (
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <button
                        type="button"
                        className={cn(
                          "group relative flex items-center gap-2 h-8 px-3 rounded-lg text-xs transition-all duration-150 cursor-pointer select-none whitespace-nowrap",
                          isSyllabusActive
                            ? "bg-background text-primary font-semibold shadow-xs border border-border/80 dark:border-border/60 ring-1 ring-primary/20"
                            : "text-muted-foreground hover:text-foreground hover:bg-background/60 font-medium group-data-[state=open]:bg-background/70 group-data-[state=open]:text-foreground",
                        )}
                      >
                        <BookOpen
                          className={cn(
                            "size-3.5 shrink-0 transition-colors",
                            isSyllabusActive
                              ? "text-primary"
                              : "text-muted-foreground/80 group-hover:text-foreground",
                          )}
                        />
                        <span>Syllabus Resources</span>
                        <ChevronDown className="size-3 text-muted-foreground/60 group-hover:text-foreground group-data-[state=open]:rotate-180 transition-all duration-200 shrink-0" />
                      </button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="start" className="w-72 p-1.5 z-50 bg-popover/95 backdrop-blur-xl border border-border/80 shadow-xl rounded-xl animate-in fade-in-0 zoom-in-95">
                      <div className="px-2.5 py-1.5 mb-1 border-b border-border/50 flex items-center justify-between">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                          Syllabus Hub &amp; Knowledge
                        </span>
                        <span className="text-[9px] font-mono text-muted-foreground/80">0455 Papers</span>
                      </div>
                      {syllabusGroup.items.map((item) => (
                        <DropdownMenuItem key={item.to} asChild className="p-0 mb-0.5">
                          <Link
                            to={item.to}
                            className={cn(
                              "flex items-center justify-between gap-2.5 px-2.5 py-2 text-xs rounded-lg cursor-pointer transition-all group",
                              isItemActive(item.to)
                                ? "bg-primary/10 text-primary font-semibold"
                                : "hover:bg-muted/70 text-foreground",
                            )}
                          >
                            <div className="flex items-center gap-2.5 min-w-0">
                              <div className="size-6 rounded-md bg-muted/60 flex items-center justify-center shrink-0 group-hover:bg-primary/10 transition-colors">
                                <item.icon className="size-3.5 text-muted-foreground group-hover:text-primary transition-colors shrink-0" />
                              </div>
                              <span className="truncate font-medium">{item.label}</span>
                            </div>
                            {item.badge && (
                              <Badge
                                variant="outline"
                                className="text-[9px] px-1.5 py-0 shrink-0 border-border/80 font-mono text-muted-foreground"
                              >
                                {item.badge}
                              </Badge>
                            )}
                          </Link>
                        </DropdownMenuItem>
                      ))}
                    </DropdownMenuContent>
                  </DropdownMenu>
                )}

                {/* Classroom: Standalone feature link directly visible */}
                <Link
                  to="/classes"
                  className={cn(
                    "group relative flex items-center gap-2 h-8 px-3 rounded-lg text-xs transition-all duration-150 cursor-pointer select-none whitespace-nowrap",
                    pathname.startsWith("/classes")
                      ? "bg-background text-emerald-600 dark:text-emerald-400 font-semibold shadow-xs border border-border/80 dark:border-border/60 ring-1 ring-emerald-500/20"
                      : "text-muted-foreground hover:text-foreground hover:bg-background/60 font-medium",
                  )}
                  title="Classrooms, Cohorts &amp; Moderation"
                >
                  <UsersRound
                    className={cn(
                      "size-3.5 shrink-0 transition-colors",
                      pathname.startsWith("/classes")
                        ? "text-emerald-500"
                        : "text-muted-foreground/80 group-hover:text-foreground",
                    )}
                  />
                  <span>{classroomLabel}</span>
                </Link>

                {/* Admin Console Dropdown (if admin) */}
                {isUserAdmin && adminGroup && (
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <button
                        type="button"
                        className={cn(
                          "group relative flex items-center gap-2 h-8 px-3 rounded-lg text-xs transition-all duration-150 cursor-pointer select-none whitespace-nowrap",
                          isAdminActive
                            ? "bg-purple-500/15 text-purple-700 dark:text-purple-300 font-semibold shadow-xs border border-purple-500/30 ring-1 ring-purple-500/20"
                            : "text-purple-600/80 dark:text-purple-400/80 hover:text-purple-700 dark:hover:text-purple-300 hover:bg-purple-500/10 font-medium group-data-[state=open]:bg-purple-500/15",
                        )}
                      >
                        <ShieldCheck className="size-3.5 text-purple-600 dark:text-purple-400 shrink-0" />
                        <span>Administration</span>
                        <span className="text-[9px] font-mono font-bold px-1.5 py-0.2 rounded-full bg-purple-500/15 border border-purple-500/25 text-purple-700 dark:text-purple-300 shrink-0">
                          Root
                        </span>
                        <ChevronDown className="size-3 text-purple-600/60 group-hover:text-purple-700 group-data-[state=open]:rotate-180 transition-all duration-200 shrink-0" />
                      </button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="start" className="w-60 p-1.5 z-50 bg-popover/95 backdrop-blur-xl border border-border/80 shadow-xl rounded-xl animate-in fade-in-0 zoom-in-95">
                      <div className="px-2.5 py-1.5 mb-1 border-b border-border/50">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-purple-600 dark:text-purple-400">
                          Root Admin Studio
                        </span>
                      </div>
                      <DropdownMenuItem asChild className="p-0 mb-0.5">
                        <Link
                          to="/admin"
                          className="flex items-center gap-2.5 px-2.5 py-2 text-xs rounded-lg cursor-pointer hover:bg-muted/70 text-foreground"
                        >
                          <div className="size-6 rounded-md bg-purple-500/10 flex items-center justify-center shrink-0">
                            <ShieldCheck className="size-3.5 text-purple-600" />
                          </div>
                          <div>
                            <p className="font-semibold leading-tight">Admin Console</p>
                            <p className="text-[10px] text-muted-foreground font-normal">System metrics, users & logs</p>
                          </div>
                        </Link>
                      </DropdownMenuItem>
                      <DropdownMenuItem asChild>
                        <Link
                          to="/calibration"
                          className="flex items-center justify-between gap-2 px-2.5 py-2 text-xs cursor-pointer"
                        >
                          <div className="flex items-center gap-2">
                            <ShieldCheck className="size-4 text-purple-600" />
                            <span>Anchor Calibration</span>
                          </div>
                          <Badge variant="outline" className="text-[9px] border-purple-500/35 text-purple-600">
                            System
                          </Badge>
                        </Link>
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                )}
              </nav>
            </div>

            {/* Right: Clean, Uncrowded Action Toolbar */}
            <div className="flex items-center gap-1.5 sm:gap-2 shrink-0 ml-auto">
              {/* Search / Command Trigger */}
              <button
                type="button"
                onClick={() => setCommandOpen(true)}
                className="flex items-center gap-1.5 h-8 rounded-lg border border-border/70 bg-muted/30 hover:bg-muted/60 hover:border-primary/40 px-2 sm:px-2.5 text-xs text-muted-foreground hover:text-foreground transition-all cursor-pointer shadow-2xs group w-24 sm:w-28 xl:w-36 shrink-0"
                title="Search Cambridge IGCSE 0455 definitions, diagrams & tools (⌘K)"
              >
                <SearchIcon className="size-3.5 text-primary group-hover:scale-110 transition-transform shrink-0" />
                <span className="truncate text-muted-foreground/90 font-medium hidden sm:inline">Search...</span>
                <kbd className="pointer-events-none hidden xl:inline-flex h-4.5 select-none items-center gap-0.5 rounded border border-border/80 bg-background/90 px-1 font-mono text-[9px] font-medium text-muted-foreground ml-auto shadow-2xs shrink-0">
                  ⌘K
                </kbd>
              </button>

              {/* Direct Messaging Portal */}
              {isUserAdmin ? (
                <Link
                  to="/admin"
                  search={{ tab: "messages" }}
                  className="relative flex items-center justify-center size-8 rounded-lg border border-border/70 bg-card/60 hover:bg-muted/80 text-foreground transition-all cursor-pointer shadow-2xs group shrink-0"
                  title="Direct Messages Portal"
                >
                  <Send className="size-3.5 text-primary group-hover:scale-105 transition-transform" />
                  {unreadMsgCount > 0 && (
                    <span className="absolute -top-1 -right-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-rose-500 px-1 text-[9.5px] font-bold text-white shadow-xs ring-2 ring-background">
                      {unreadMsgCount}
                    </span>
                  )}
                </Link>
              ) : (
                <StudentMessagesDialog
                  trigger={
                    <button
                      type="button"
                      className="relative flex items-center justify-center size-8 rounded-lg border border-border/70 bg-card/60 hover:bg-muted/80 text-foreground transition-all cursor-pointer shadow-2xs group shrink-0"
                      title="Direct Messages from Examiners"
                    >
                      <Send className="size-3.5 text-primary group-hover:scale-105 transition-transform" />
                    </button>
                  }
                />
              )}

              {/* Send Feedback Dialog */}
              <FeedbackDialog
                trigger={
                  <button
                    type="button"
                    className="flex items-center gap-1.5 h-8 px-2 xl:px-2.5 rounded-lg border border-border/70 bg-card/60 hover:bg-muted/80 text-xs font-medium text-foreground transition-all shadow-2xs cursor-pointer group shrink-0"
                    title="Send feedback or report an issue"
                  >
                    <MessageSquarePlus className="size-3.5 text-primary group-hover:scale-105 transition-transform shrink-0" />
                    <span className="hidden 2xl:inline">Feedback</span>
                  </button>
                }
              />

              {/* Night / Day Theme Toggle */}
              <ThemeToggle className="size-8" />

              {/* Vertical Hairline Divider */}
              <div className="h-4 w-px bg-border/60 mx-0.5 shrink-0" />

              {/* User Profile Avatar Popover */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button
                    type="button"
                    className="flex items-center gap-1.5 rounded-full p-1 ring-2 ring-primary/30 hover:ring-primary/70 hover:bg-primary/5 transition-all cursor-pointer shrink-0 shadow-2xs hover:shadow-[0_0_16px_rgba(168,85,247,0.35)] hover:scale-105 active:scale-95 duration-200"
                    title="User Account & Settings"
                  >
                    <UserAvatar
                      avatarUrl={avatarUrl}
                      name={name}
                      fallbackInitials={candidateInitials}
                      showStatusDot={true}
                      shape="circle"
                      className="size-9"
                    />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-64 p-2 z-50 bg-popover/95 backdrop-blur-xl border border-border/80 shadow-2xl rounded-2xl animate-in fade-in-0 zoom-in-95">
                  <div className="flex items-center gap-2.5 p-2 rounded-xl bg-muted/40 mb-1 border border-border/40">
                    <UserAvatar
                      avatarUrl={avatarUrl}
                      name={name}
                      fallbackInitials={candidateInitials}
                      showStatusDot={false}
                      className="size-9"
                    />
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-bold text-foreground truncate">
                        {name ?? "Candidate"}
                      </p>
                      <p className="text-[10px] text-muted-foreground truncate">
                        {school || (isTeacherUser ? "Educator" : "Cambridge IGCSE 0455 Candidate")}
                      </p>
                      <span className="inline-block mt-0.5 text-[9px] font-mono px-1 py-0 rounded bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                        May/June 2026 Series
                      </span>
                    </div>
                  </div>
                  <DropdownMenuItem asChild className="p-0 mb-0.5">
                    <Link
                      to="/dashboard"
                      className="flex items-center gap-2.5 px-2.5 py-2 text-xs rounded-lg cursor-pointer hover:bg-muted/70 text-foreground"
                    >
                      <LayoutDashboard className="size-3.5 text-muted-foreground" />
                      <span>Dashboard</span>
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild className="p-0 mb-0.5">
                    <Link
                      to="/settings"
                      className="flex items-center gap-2.5 px-2.5 py-2 text-xs rounded-lg cursor-pointer hover:bg-muted/70 text-foreground"
                    >
                      <Settings className="size-3.5 text-muted-foreground" />
                      <span>Profile &amp; Settings</span>
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => openTutorial()}
                    className="flex items-center gap-2.5 px-2.5 py-2 text-xs rounded-lg cursor-pointer hover:bg-muted/70 text-foreground"
                  >
                    <GraduationCap className="size-3.5 text-purple-500" />
                    <span>Feature Tutorials</span>
                  </DropdownMenuItem>

                  {/* Navigation Layout Switcher */}
                  <DropdownMenuSeparator className="my-1 border-border/60" />
                  <div className="px-2 py-1 text-[9.5px] font-bold text-muted-foreground uppercase tracking-wider">
                    Navigation Layout
                  </div>
                  <div className="px-1.5 py-1 grid grid-cols-3 gap-1">
                    <button
                      type="button"
                      onClick={() => handleLayoutChange("topbar")}
                      className={cn(
                        "flex flex-col items-center justify-center py-1.5 px-1 rounded-lg text-[10.5px] font-semibold transition-all cursor-pointer border",
                        (navLayout as NavigationLayout) === "topbar"
                          ? "bg-primary text-primary-foreground border-primary shadow-2xs font-bold"
                          : "bg-muted/40 text-muted-foreground border-transparent hover:bg-muted/70 hover:text-foreground",
                      )}
                    >
                      <PanelsTopBottom className="size-3.5 mb-0.5" />
                      <span>Topbar</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleLayoutChange("sidebar")}
                      className={cn(
                        "flex flex-col items-center justify-center py-1.5 px-1 rounded-lg text-[10.5px] font-semibold transition-all cursor-pointer border",
                        (navLayout as NavigationLayout) === "sidebar"
                          ? "bg-primary text-primary-foreground border-primary shadow-2xs font-bold"
                          : "bg-muted/40 text-muted-foreground border-transparent hover:bg-muted/70 hover:text-foreground",
                      )}
                    >
                      <PanelLeft className="size-3.5 mb-0.5" />
                      <span>Sidebar</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleLayoutChange("dock")}
                      className={cn(
                        "flex flex-col items-center justify-center py-1.5 px-1 rounded-lg text-[10.5px] font-semibold transition-all cursor-pointer border",
                        (navLayout as NavigationLayout) === "dock"
                          ? "bg-primary text-primary-foreground border-primary shadow-2xs font-bold"
                          : "bg-muted/40 text-muted-foreground border-transparent hover:bg-muted/70 hover:text-foreground",
                      )}
                    >
                      <Layers className="size-3.5 mb-0.5" />
                      <span>Dock</span>
                    </button>
                  </div>
                  <DropdownMenuSeparator className="my-1 border-border/60" />
                  <div className="px-1 py-0.5">
                    <ThemeToggle variant="menu-item" />
                  </div>
                  <DropdownMenuSeparator className="my-1 border-border/60" />
                  <div className="px-2 py-1 text-[9.5px] font-bold text-muted-foreground uppercase tracking-wider">
                    Platform &amp; Legal
                  </div>
                  <DropdownMenuItem asChild className="p-0 mb-0.5">
                    <Link
                      to="/about"
                      className="flex items-center gap-2.5 px-2.5 py-1.5 text-xs rounded-lg cursor-pointer hover:bg-muted/70 text-foreground"
                    >
                      <Info className="size-3.5 text-muted-foreground" />
                      <span>About Marginal</span>
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild className="p-0 mb-0.5">
                    <Link
                      to="/terms"
                      className="flex items-center gap-2.5 px-2.5 py-1.5 text-xs rounded-lg cursor-pointer hover:bg-muted/70 text-foreground"
                    >
                      <FileText className="size-3.5 text-muted-foreground" />
                      <span>Terms of Service</span>
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild className="p-0 mb-0.5">
                    <Link
                      to="/privacy"
                      className="flex items-center gap-2.5 px-2.5 py-1.5 text-xs rounded-lg cursor-pointer hover:bg-muted/70 text-foreground"
                    >
                      <ShieldCheck className="size-3.5 text-muted-foreground" />
                      <span>Privacy Policy</span>
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator className="my-1 border-border/60" />
                  <DropdownMenuItem
                    onClick={signOut}
                    className="flex items-center gap-2.5 px-2.5 py-2 text-xs rounded-lg text-destructive hover:bg-destructive/10 cursor-pointer font-medium"
                  >
                    <LogOut className="size-3.5" />
                    <span>Sign out</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </header>
        )}

        {/* ── Desktop Secondary Header Bar for Dock & Sidebar Layouts ── */}
        {navLayout !== "topbar" && (
          <header className="hidden lg:flex items-center justify-between border-b border-border/70 bg-card/70 px-6 py-2.5 backdrop-blur-md sticky top-0 z-30 w-full shrink-0">
            <div className="flex items-center gap-2.5 min-w-0">
              {currentTutorial ? (
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="size-7 rounded-lg bg-purple-500/10 border border-purple-500/20 text-purple-600 dark:text-purple-400 flex items-center justify-center shrink-0">
                    <currentTutorial.icon className="size-4" />
                  </div>
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="text-xs font-bold text-foreground truncate">
                      {currentTutorial.title}
                    </span>
                    {currentTutorial.paperTag && (
                      <Badge
                        variant="outline"
                        className="text-[10px] text-muted-foreground border-border/80 py-0 hidden lg:inline-flex"
                      >
                        {currentTutorial.paperTag}
                      </Badge>
                    )}
                  </div>
                </div>
              ) : (
                <span className="text-xs font-semibold text-muted-foreground">
                  Cambridge International Economics 0455
                </span>
              )}
            </div>

            <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
              <button
                type="button"
                onClick={() => setCommandOpen(true)}
                className="flex items-center gap-1.5 xl:gap-2 h-8 rounded-lg border border-border/70 bg-muted/30 hover:bg-muted/60 hover:border-primary/40 px-2 xl:px-2.5 text-xs text-muted-foreground hover:text-foreground transition-all cursor-pointer shadow-2xs group w-28 lg:w-32 xl:w-44 2xl:w-52 shrink-0"
                title="Search Cambridge IGCSE 0455 definitions, diagrams & tools (⌘K)"
              >
                <SearchIcon className="size-3.5 text-primary group-hover:scale-110 transition-transform shrink-0" />
                <span className="truncate text-muted-foreground/90 font-medium hidden 2xl:inline">Search or jump...</span>
                <span className="truncate text-muted-foreground/90 font-medium 2xl:hidden">Search...</span>
                <kbd className="pointer-events-none hidden sm:inline-flex h-4.5 select-none items-center gap-0.5 rounded border border-border/80 bg-background/90 px-1 font-mono text-[9px] font-medium text-muted-foreground ml-auto shadow-2xs shrink-0">
                  ⌘K
                </kbd>
              </button>

              {isUserAdmin ? (
                <Link
                  to="/admin"
                  search={{ tab: "messages" }}
                  className="relative flex items-center justify-center size-8 rounded-lg border border-border/70 bg-card/60 hover:bg-muted/80 text-foreground transition-all cursor-pointer shadow-2xs group shrink-0"
                  title="Direct Messages Portal"
                >
                  <Send className="size-3.5 text-primary group-hover:scale-105 transition-transform" />
                  {unreadMsgCount > 0 && (
                    <span className="absolute -top-1 -right-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-rose-500 px-1 text-[9.5px] font-bold text-white shadow-xs ring-2 ring-background">
                      {unreadMsgCount}
                    </span>
                  )}
                </Link>
              ) : (
                <StudentMessagesDialog
                  trigger={
                    <button
                      type="button"
                      className="relative flex items-center justify-center size-8 rounded-lg border border-border/70 bg-card/60 hover:bg-muted/80 text-foreground transition-all cursor-pointer shadow-2xs group shrink-0"
                      title="Direct Messages from Examiners"
                    >
                      <Send className="size-3.5 text-primary group-hover:scale-105 transition-transform" />
                    </button>
                  }
                />
              )}

              <FeedbackDialog
                trigger={
                  <button
                    type="button"
                    className="flex items-center gap-1.5 h-8 px-2.5 rounded-lg border border-border/70 bg-card/60 hover:bg-muted/80 text-xs font-medium text-foreground transition-all shadow-2xs cursor-pointer group shrink-0"
                    title="Send feedback or report an issue"
                  >
                    <MessageSquarePlus className="size-3.5 text-primary group-hover:scale-105 transition-transform shrink-0" />
                    <span className="hidden xl:inline">Feedback</span>
                  </button>
                }
              />

              {/* Night / Day Theme Toggle */}
              <ThemeToggle className="size-8" />
            </div>
          </header>
        )}

        <main className={cn("flex-1 min-w-0 overflow-x-hidden", inExamSession ? "pb-0" : "pb-16 lg:pb-0")}>{children}</main>
      </div>

      {/* ── Mobile Phone & Tablet Bottom Navigation Bar (lg:hidden) ── */}
      {!inExamSession && (
        <nav
          aria-label="Mobile Navigation"
          className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-background/95 backdrop-blur-md border-t border-border px-1.5 py-1.5 flex items-center justify-around shadow-lg pb-[calc(env(safe-area-inset-bottom,0px)+0.375rem)]"
        >
          <Link
            to="/dashboard"
            className={cn(
              "flex flex-col items-center justify-center gap-0.5 px-2 py-1 rounded-lg text-[10px] font-medium transition-all active:scale-95",
              pathname === "/dashboard"
                ? "text-primary font-bold"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            <LayoutDashboard className="size-5" />
            <span>Dashboard</span>
          </Link>

          <Link
            to="/grade"
            className={cn(
              "flex flex-col items-center justify-center gap-0.5 px-2 py-1 rounded-lg text-[10px] font-medium transition-all active:scale-95",
              pathname === "/grade" || pathname.startsWith("/essay")
                ? "text-primary font-bold"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            <PenLine className="size-5" />
            <span>Grade</span>
          </Link>

          <Link
            to="/mcq-live"
            className={cn(
              "flex flex-col items-center justify-center gap-0.5 px-2 py-1 rounded-lg text-[10px] font-medium transition-all active:scale-95",
              pathname.startsWith("/mcq")
                ? "text-primary font-bold"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            <ListChecks className="size-5" />
            <span>MCQ</span>
          </Link>

          <Link
            to="/data-response"
            className={cn(
              "flex flex-col items-center justify-center gap-0.5 px-2 py-1 rounded-lg text-[10px] font-medium transition-all active:scale-95",
              pathname.startsWith("/data-response")
                ? "text-primary font-bold"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            <FileSpreadsheet className="size-5" />
            <span>Data Resp</span>
          </Link>

          <button
            type="button"
            onClick={() => setMobileDrawerOpen(true)}
            className="flex flex-col items-center justify-center gap-0.5 px-2 py-1 rounded-lg text-[10px] font-medium text-muted-foreground hover:text-foreground active:scale-95 transition-all cursor-pointer"
          >
            <Menu className="size-5" />
            <span>All Tools</span>
          </button>
        </nav>
      )}

      <CommandPalette
        open={commandOpen}
        onOpenChange={setCommandOpen}
        role={role}
        isAdmin={isUserAdmin}
        onLayoutChange={handleLayoutChange}
        onSignOut={signOut}
      />

      {!pathname.startsWith("/mcq") && <FloatingFeedbackPill />}


    </div>
  );
}

export function PageHeader({
  title,
  description,
  subtitle,
  badge,
  action,
  backTo,
  maxWidthClassName = "max-w-7xl 2xl:max-w-[1600px]",
}: {
  title: string;
  description?: string;
  subtitle?: string;
  badge?: ReactNode;
  action?: ReactNode;
  backTo?: string;
  maxWidthClassName?: string;
}) {
  const effectiveDescription = description ?? subtitle;
  const effectiveAction = action ?? badge;

  return (
    <div className="border-b border-border bg-card/60 px-4 py-3.5 sm:px-6 sm:py-5 md:px-8">
      <div className={cn("mx-auto flex flex-col gap-2.5 sm:flex-row sm:items-center sm:justify-between", maxWidthClassName)}>
        <div className="min-w-0">
          <h1 className="text-lg font-bold tracking-tight text-foreground sm:text-2xl">{title}</h1>
          {effectiveDescription ? (
            <p className="mt-0.5 text-xs text-muted-foreground sm:mt-1 sm:text-sm leading-relaxed">
              {effectiveDescription}
            </p>
          ) : null}
        </div>
        {effectiveAction ? <div className="shrink-0 pt-0.5 sm:pt-0">{effectiveAction}</div> : null}
      </div>
    </div>
  );
}
