import { StudentMessagesDialog } from "@/components/app/student-messages-dialog";
import { FloatingFeedbackPill, FeedbackDialog } from "@/components/feedback/feedback-dialog";
import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import {
  BookOpen,
  ClipboardCheck,
  LayoutDashboard,
  ListChecks,
  LogOut,
  PenLine,
  Target,
  ShieldCheck,
  BookMarked,
  Sparkles,
  PanelLeftClose,
  PanelLeftOpen,
  UsersRound,
  BookText,
  ChevronDown,
  Menu,
  MessageSquare,
  GraduationCap,
  Settings,
  LineChart,
  Trophy,
} from "lucide-react";
import type { ReactNode } from "react";
import { useEffect, useMemo, useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { usePresenceHeartbeat } from "@/hooks/use-presence";
import { supabase } from "@/integrations/backend/client";
import { cn } from "@/lib/utils";

export type NavItem = {
  to: string;
  label: string;
  icon: typeof LayoutDashboard;
  badge?: string;
  staffOnly?: boolean;
  adminOnly?: boolean;
};

export type NavGroup = {
  id: string;
  label: string;
  collapsible?: boolean;
  adminOnly?: boolean;
  staffOnly?: boolean;
  items: NavItem[];
};

const SIDEBAR_COLLAPSED_STORAGE_KEY = "marginalite.sidebarCollapsed";
const COLLAPSED_GROUPS_STORAGE_KEY = "marginalite.collapsedNavGroups";

/**
 * Cambridge IGCSE Economics 0455 Navigation
 */
const NAV_GROUPS: NavGroup[] = [
  {
    id: "dashboard_analytics",
    label: "Dashboard & Analytics",
    collapsible: true,
    items: [
      { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
      { to: "/review", label: "Analytics & Diagnostics", icon: ClipboardCheck },
      { to: "/classes", label: "Classes", icon: UsersRound },
    ],
  },
  {
    id: "grading",
    label: "Exam Practice",
    collapsible: true,
    items: [
      { to: "/grade", label: "Grade Answer", icon: PenLine },
      { to: "/mcq-live", label: "MCQ Past Papers", icon: ListChecks },
    ],
  },
  {
    id: "syllabus",
    label: "Syllabus Resources",
    collapsible: true,
    items: [
      { to: "/definitions", label: "Definitions Hub", icon: BookText },
      { to: "/question-bank", label: "Question Bank", icon: BookMarked },
      { to: "/diagrams", label: "Diagram Library", icon: LineChart },
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
      { to: "/admin", label: "Admin Console", icon: ShieldCheck, badge: "Root" },
      { to: "/knowledge", label: "Knowledge Base", icon: BookOpen },
      { to: "/calibration", label: "Anchor Calibration", icon: ShieldCheck },
    ],
  },
];

const TEACHER_NAV_GROUPS: NavGroup[] = [
  {
    id: "dashboard_analytics",
    label: "Dashboard & Classrooms",
    collapsible: true,
    items: [
      { to: "/dashboard", label: "Educator Dashboard", icon: LayoutDashboard },
      { to: "/classes", label: "My Classrooms", icon: UsersRound },
      { to: "/review", label: "Analytics & Diagnostics", icon: ClipboardCheck },
    ],
  },
  {
    id: "grading",
    label: "Exam Practice",
    collapsible: true,
    items: [
      { to: "/grade", label: "Answer Grader", icon: PenLine },
      { to: "/mcq-live", label: "MCQ Past Papers", icon: ListChecks },
    ],
  },
  {
    id: "syllabus",
    label: "Syllabus Resources",
    collapsible: true,
    items: [
      { to: "/definitions", label: "Definitions Hub", icon: BookText },
      { to: "/question-bank", label: "Question Bank", icon: BookMarked },
      { to: "/diagrams", label: "Diagram Library", icon: LineChart },
      { to: "/command-words", label: "Command Words", icon: Target },
      { to: "/showcase", label: "Exemplars Showcase", icon: Trophy },
      { to: "/knowledge", label: "Knowledge Base", icon: BookOpen },
      { to: "/calibration", label: "Anchor Calibration", icon: ShieldCheck },
    ],
  },
];

function filterGroupForRole(
  group: NavGroup,
  role: "student" | "teacher" | "admin",
): NavGroup | null {
  const isAdmin = role === "admin";

  if (group.adminOnly && !isAdmin) return null;
  if (group.staffOnly && role !== "teacher" && !isAdmin) return null;

  const visibleItems = group.items.filter((item) => {
    if (item.adminOnly && !isAdmin) return false;
    if (item.staffOnly && role !== "teacher" && !isAdmin) return false;
    return true;
  });

  if (visibleItems.length === 0) return null;
  return { ...group, items: visibleItems };
}

const GROUP_META: Record<
  string,
  { dot: string; text: string; bg: string }
> = {
  dashboard_analytics: {
    dot: "bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.6)]",
    text: "text-emerald-600 dark:text-emerald-400",
    bg: "hover:bg-emerald-500/10",
  },
  grading: {
    dot: "bg-cyan-500 shadow-[0_0_8px_rgba(6,182,212,0.6)]",
    text: "text-cyan-600 dark:text-cyan-400",
    bg: "hover:bg-cyan-500/10",
  },
  syllabus: {
    dot: "bg-sky-500 shadow-[0_0_8px_rgba(14,165,233,0.6)]",
    text: "text-sky-600 dark:text-sky-400",
    bg: "hover:bg-sky-500/10",
  },
  admin: {
    dot: "bg-rose-500 shadow-[0_0_8px_rgba(225,29,72,0.6)]",
    text: "text-rose-600 dark:text-rose-400",
    bg: "hover:bg-rose-500/10",
  },
};

export function AppShell({
  children,
  role,
  name,
  school,
  userId,
}: {
  children: ReactNode;
  role: "student" | "teacher" | "admin";
  name: string | null;
  school?: string | null;
  userId: string;
}) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const pathname = useRouterState({ select: (state) => state.location.pathname });
  usePresenceHeartbeat(pathname, userId);

  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(() => new Set());
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false);

  useEffect(() => {
    try {
      const isCollapsed = window.localStorage.getItem(SIDEBAR_COLLAPSED_STORAGE_KEY) === "true";
      setSidebarCollapsed(isCollapsed);

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

  const isTeacherUser = role === "teacher";

  const signOut = async () => {
    await queryClient.cancelQueries();
    queryClient.clear();
    await supabase.auth.signOut();
    const target = isTeacherUser ? "/teacher-auth" : "/auth";
    navigate({ to: target, replace: true });
  };

  const visibleGroups = useMemo(() => {
    if (isTeacherUser) {
      return TEACHER_NAV_GROUPS;
    }
    return NAV_GROUPS.map((g) => filterGroupForRole(g, role)).filter(
      (g): g is NavGroup => g !== null,
    );
  }, [role, isTeacherUser]);

  const classroomLabel = role === "student" ? "Classroom" : "Classes";

  const isItemActive = (to: string) => {
    if (to === "/dashboard") return pathname === "/dashboard";
    if (pathname === to) return true;
    if (to !== "/dashboard" && pathname.startsWith(to)) {
      if (to === "/grade") return pathname === "/grade" || pathname.startsWith("/essay");
      return true;
    }
    if ((to === "/admin" || to === "/knowledge") && ["/calibration", "/content-admin", "/mcq-papers-admin"].some((p) => pathname.startsWith(p))) {
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
                isOpen ? (meta?.text ?? "text-foreground") : "text-muted-foreground/70 hover:text-foreground",
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
                const Icon = item.icon;

                return (
                  <Link
                    key={item.to}
                    to={item.to}
                    onClick={() => isMobile && setMobileDrawerOpen(false)}
                    className={cn(
                      "flex items-center rounded-xl text-xs font-semibold transition-all duration-150 relative group",
                      sidebarCollapsed && !isMobile ? "justify-center p-2.5" : "gap-3 px-3 py-2",
                      active
                        ? "bg-primary/15 text-primary border border-primary/25 shadow-xs font-bold"
                        : "text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
                    )}
                    title={sidebarCollapsed && !isMobile ? label : undefined}
                  >
                    <Icon className={cn("size-4 shrink-0 transition-transform duration-150 group-hover:scale-105", active ? "text-primary font-bold" : "text-muted-foreground group-hover:text-foreground")} />
                    <span className={cn("truncate", sidebarCollapsed && !isMobile && "sr-only")}>
                      {label}
                    </span>
                    {item.badge && (!sidebarCollapsed || isMobile) ? (
                      <Badge
                        variant="secondary"
                        className={cn(
                          "ml-auto text-[9px] px-1.5 py-0 font-bold",
                          active ? "bg-primary-foreground/20 text-primary-foreground" : "bg-muted text-muted-foreground",
                        )}
                      >
                        {item.badge}
                      </Badge>
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

  const candidateInitials = (name || "Candidate")
    .split(" ")
    .map((n) => n[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <div className="flex min-h-screen bg-background text-foreground">
      {/* ── Desktop Sidebar ── */}
      <aside
        className={cn(
          "hidden md:flex flex-col border-r border-sidebar-border bg-sidebar/95 backdrop-blur-md transition-all duration-300 ease-in-out shrink-0 select-none z-30 sticky top-0 h-screen",
          sidebarCollapsed ? "w-16 p-2" : "w-64 p-3",
        )}
      >
        {/* Brand Header */}
        <div className={cn("flex items-center mb-3 px-1", sidebarCollapsed ? "justify-center" : "justify-between")}>
          <Link to="/dashboard" className="flex items-center gap-2.5 overflow-hidden">
            <div className="size-8 rounded-xl bg-primary flex items-center justify-center text-primary-foreground font-black text-sm shadow-sm shrink-0">
              M
            </div>
            {!sidebarCollapsed ? (
              <div className="flex flex-col min-w-0">
                <span className="font-extrabold text-sm tracking-tight text-foreground truncate">Marginalite</span>
                <span className="text-[10px] text-muted-foreground font-semibold tracking-wider uppercase">IGCSE 0455</span>
              </div>
            ) : null}
          </Link>

          {!sidebarCollapsed ? (
            <Button
              variant="ghost"
              size="icon"
              className="size-7 text-muted-foreground hover:text-foreground"
              onClick={toggleSidebar}
              title="Collapse sidebar"
              aria-label="Collapse sidebar"
            >
              <PanelLeftClose className="size-3.5" />
            </Button>
          ) : null}
        </div>

        {sidebarCollapsed ? (
          <Button
            variant="ghost"
            size="icon"
            className="mb-2 size-8 self-center text-muted-foreground hover:text-foreground shrink-0"
            onClick={toggleSidebar}
            title="Expand sidebar"
            aria-label="Expand sidebar"
          >
            <PanelLeftOpen className="size-3.5" />
          </Button>
        ) : null}

        {/* User Status Widget */}
        {!sidebarCollapsed ? (
          <div className="mb-3 rounded-2xl border border-border/80 bg-gradient-to-br from-card via-card to-primary/[0.04] p-3 shrink-0 shadow-sm relative overflow-hidden group">
            <div className="flex items-center justify-between gap-2 relative z-10">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="relative size-8 rounded-xl bg-primary/10 text-primary flex items-center justify-center text-xs font-bold shrink-0 border border-primary/20 shadow-xs">
                  {candidateInitials}
                  <span className="absolute -bottom-0.5 -right-0.5 size-2 rounded-full bg-emerald-500 border-2 border-background animate-pulse" />
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-bold truncate text-foreground leading-tight">
                    {name?.toLowerCase().includes("admin") ? "Marginalite Admin" : (name ?? (role === "admin" ? "Marginalite Admin" : role === "teacher" ? "Educator" : "Candidate"))}
                  </p>
                  <p className="text-[10px] text-muted-foreground capitalize leading-tight mt-0.5 font-medium truncate">
                    {role === "teacher" && school ? school : role}
                  </p>
                </div>
              </div>
              <Badge
                variant="outline"
                className="border-primary/30 bg-primary/10 text-primary text-[9.5px] px-2 py-0.5 font-bold shrink-0 shadow-2xs capitalize"
              >
                {role}
              </Badge>
            </div>
          </div>
        ) : null}

        {/* Scrollable Navigation Groups */}
        <div className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden space-y-2.5 px-0.5 pt-1.5 pb-3">
          {visibleGroups.map((group) => renderNavGroup(group))}
        </div>

        {/* User Footer */}
        <div className="shrink-0 pt-2 border-t border-sidebar-border/70 mt-auto space-y-0.5">
          <StudentMessagesDialog
            trigger={
              <div
                className={cn(
                  "flex items-center rounded-lg py-1.5 text-xs font-medium text-sidebar-foreground/80 transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground cursor-pointer select-none",
                  sidebarCollapsed ? "justify-center px-1" : "gap-2.5 px-2.5",
                )}
                title="Direct messages with Marginalite Team"
              >
                <MessageSquare className="size-4 shrink-0 text-muted-foreground/80" />
                <span className={cn("truncate", sidebarCollapsed && "sr-only")}>
                  Messages
                </span>
              </div>
            }
          />
          <Link
            to="/settings"
            className={cn(
              "flex items-center rounded-lg py-1.5 text-xs font-medium text-sidebar-foreground/80 transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
              sidebarCollapsed ? "justify-center px-1" : "gap-2.5 px-2.5",
              pathname.startsWith("/settings") && "bg-sidebar-accent text-sidebar-accent-foreground font-semibold",
            )}
            title="Account settings"
          >
            <Settings className="size-4 shrink-0 text-muted-foreground/80" />
            <span className={cn("truncate", sidebarCollapsed && "sr-only")}>
              Settings
            </span>
          </Link>

          <Button
            variant="ghost"
            size="sm"
            className={cn(
              "h-8 w-full text-xs text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors",
              sidebarCollapsed ? "justify-center p-0" : "justify-start px-2.5 gap-2.5"
            )}
            onClick={signOut}
            title="Sign out of account"
          >
            <LogOut className="size-4 shrink-0" />
            <span className={cn(sidebarCollapsed && "sr-only")}>Sign out</span>
          </Button>
        </div>
      </aside>

      {/* ── Main Content & Mobile Header ── */}
      <div className="flex min-w-0 flex-1 flex-col overflow-x-hidden">
        <header className="flex items-center justify-between border-b border-border bg-card/80 px-4 py-2.5 backdrop-blur-sm md:hidden sticky top-0 z-40 w-full max-w-full">
          <div className="flex items-center gap-2.5">
            <Sheet open={mobileDrawerOpen} onOpenChange={setMobileDrawerOpen}>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon" className="size-8">
                  <Menu className="size-4" />
                  <span className="sr-only">Open navigation menu</span>
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="w-72 p-4 flex flex-col h-full">
                <SheetHeader className="mb-3 text-left shrink-0">
                  <SheetTitle className="flex items-center gap-2">
                    <div className="size-6 rounded-lg bg-primary text-primary-foreground flex items-center justify-center text-xs font-black">
                      M
                    </div>
                    <span className="font-bold">Marginalite 0455</span>
                  </SheetTitle>
                </SheetHeader>

                <div className="min-h-0 flex-1 overflow-y-auto space-y-2 pr-1">
                  {visibleGroups.map((group) => renderNavGroup(group, true))}
                </div>

                <div className="mt-auto shrink-0 pt-3 border-t border-border space-y-1">
                  <Link
                    to="/settings"
                    onClick={() => setMobileDrawerOpen(false)}
                    className="flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-xs font-medium text-foreground hover:bg-muted"
                  >
                    <Settings className="size-4 text-muted-foreground" /> Settings
                  </Link>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="w-full justify-start text-xs text-muted-foreground hover:text-destructive hover:bg-destructive/10 px-2.5 gap-2.5"
                    onClick={signOut}
                  >
                    <LogOut className="size-4" /> Sign out
                  </Button>
                </div>
              </SheetContent>
            </Sheet>

            <Link to="/dashboard" className="flex items-center gap-2">
              <div className="size-6 rounded-lg bg-primary text-primary-foreground flex items-center justify-center text-xs font-black">
                M
              </div>
              <span className="text-sm font-bold">Marginalite</span>
            </Link>
          </div>

          <div className="flex items-center gap-2">
            <Badge
              variant="outline"
              className="text-[10px] font-bold border-primary/30 text-primary capitalize"
            >
              {role}
            </Badge>
          </div>
        </header>

        <main className="flex-1 min-w-0 overflow-x-hidden">{children}</main>
      </div>
    </div>
  );
}

export function PageHeader({
  title,
  description,
  action,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between mb-6 pb-4 border-b border-border">
      <div>
        <h1 className="text-xl font-bold tracking-tight text-foreground sm:text-2xl">{title}</h1>
        {description ? <p className="text-xs text-muted-foreground mt-0.5 sm:text-sm">{description}</p> : null}
      </div>
      {action ? <div className="mt-2 sm:mt-0 flex items-center gap-2">{action}</div> : null}
    </div>
  );
}
