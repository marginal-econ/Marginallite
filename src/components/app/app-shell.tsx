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
  Dumbbell,
  LineChart,
  Wand2,
  ShieldCheck,
  ShieldPlus,
  ListOrdered,
  BookMarked,
  Sparkles,
  UploadCloud,
  PanelLeftClose,
  PanelLeftOpen,
  UsersRound,
  BookText,
  Trophy,
  CircleHelp,
} from "lucide-react";
import type { ReactNode } from "react";
import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import { usePresenceHeartbeat } from "@/hooks/use-presence";
import { supabase } from "@/integrations/backend/client";
import { cn } from "@/lib/utils";

type NavItem = {
  to: string;
  label: string;
  icon: typeof LayoutDashboard;
  staffOnly: boolean;
  adminOnly?: boolean;
};

type AppSection = "grader" | "bank";

const SECTION_STORAGE_KEY = "marginal.activeSection";
const SIDEBAR_COLLAPSED_STORAGE_KEY = "marginal.sidebarCollapsed";

// The two distinct apps that share this sidebar, same site, same database.
// "Grader" is everything about marking and model answers; "Question bank"
// is everything about practicing new questions (past-paper MCQ and structured questions).
const GRADER_NAV: NavItem[] = [
  { to: "/grade", label: "Essay marking", icon: PenLine, staffOnly: false },
  { to: "/response-structure", label: "Response structure", icon: ListOrdered, staffOnly: false },
  { to: "/practice", label: "AO skills coach", icon: Dumbbell, staffOnly: false },
  { to: "/essay-generator", label: "Perfect essay generator", icon: Wand2, staffOnly: false },
  { to: "/diagrams", label: "Diagram library", icon: LineChart, staffOnly: false },
  { to: "/definitions", label: "Definitions hub", icon: BookText, staffOnly: false },
  { to: "/command-words", label: "Command words test", icon: CircleHelp, staffOnly: false },
  { to: "/showcase", label: "Showcase", icon: Trophy, staffOnly: false },
];

const BANK_NAV: NavItem[] = [
  { to: "/question-bank", label: "Question bank", icon: BookMarked, staffOnly: false },
  { to: "/mcq-live", label: "MCQ papers", icon: ListChecks, staffOnly: false },
];

// Not part of the toggle — visible under either section for staff, since
// the knowledge base and calibration data feed both the grader and question systems.
const STAFF_NAV: NavItem[] = [
  { to: "/knowledge", label: "Knowledge base", icon: BookOpen, staffOnly: true },
  { to: "/calibration", label: "Calibration", icon: Target, staffOnly: true },
  {
    to: "/content-admin",
    label: "Content admin",
    icon: ShieldPlus,
    staffOnly: true,
    adminOnly: true,
  },
  {
    to: "/mcq-papers-admin",
    label: "MCQ paper library",
    icon: UploadCloud,
    staffOnly: true,
    adminOnly: true,
  },
  { to: "/admin", label: "Admin console", icon: ShieldCheck, staffOnly: true, adminOnly: true },
];

const SECTION_NAV: Record<AppSection, NavItem[]> = {
  grader: GRADER_NAV,
  bank: BANK_NAV,
};

function filterForRole(items: NavItem[], role: "student" | "teacher" | "admin") {
  return items.filter(
    (item) =>
      (!item.staffOnly || role === "teacher" || role === "admin") &&
      (!item.adminOnly || role === "admin"),
  );
}

function sectionForPathname(pathname: string): AppSection | null {
  if (BANK_NAV.some((item) => pathname.startsWith(item.to))) return "bank";
  if (GRADER_NAV.some((item) => pathname.startsWith(item.to))) return "grader";
  return null;
}

export function AppShell({
  children,
  role,
  name,
  school: _school,
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

  const [section, setSection] = useState<AppSection>(
    () => sectionForPathname(pathname) ?? "grader",
  );
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  // Keep the toggle in sync with direct navigation (a link from Dashboard,
  // browser back/forward, etc.) and remember the choice across visits to
  // shared pages like Dashboard or the staff tools.
  useEffect(() => {
    const fromPath = sectionForPathname(pathname);
    if (fromPath) {
      setSection(fromPath);
      window.localStorage.setItem(SECTION_STORAGE_KEY, fromPath);
    }
  }, [pathname]);

  useEffect(() => {
    const stored = window.localStorage.getItem(SECTION_STORAGE_KEY);
    if (stored === "grader" || stored === "bank") setSection(stored);

    setSidebarCollapsed(window.localStorage.getItem(SIDEBAR_COLLAPSED_STORAGE_KEY) === "true");
  }, []);

  const signOut = async () => {
    await queryClient.cancelQueries();
    queryClient.clear();
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  };

  const switchSection = (next: AppSection) => {
    setSection(next);
    window.localStorage.setItem(SECTION_STORAGE_KEY, next);
    const target = SECTION_NAV[next][0];
    if (target) navigate({ to: target.to });
  };

  const toggleSidebar = () => {
    setSidebarCollapsed((current) => {
      const next = !current;
      window.localStorage.setItem(SIDEBAR_COLLAPSED_STORAGE_KEY, String(next));
      return next;
    });
  };

  const activeNav = role === "teacher" ? [] : filterForRole(SECTION_NAV[section], role);
  const staffNav = filterForRole(STAFF_NAV, role);
  const classroomLabel = role === "student" ? "Join class" : "Classes";
  const mobileNav = [...activeNav, ...staffNav];

  return (
    <div className="flex min-h-screen bg-background">
      <aside
        className={cn(
          "hidden shrink-0 flex-col border-r border-sidebar-border bg-sidebar py-5 transition-[width,padding] duration-300 ease-out md:flex",
          sidebarCollapsed ? "w-[4.5rem] px-2" : "w-60 px-3",
        )}
      >
        <div
          className={cn(
            "mb-5 flex items-center",
            sidebarCollapsed ? "justify-center" : "gap-2 px-2",
          )}
        >
          <Link
            to="/dashboard"
            className="flex min-w-0 items-center gap-2"
            title="Marginal dashboard"
          >
            <img
              src="/marginal-m-icon-clean.png"
              alt=""
              aria-hidden="true"
              className="size-9 shrink-0 object-contain"
            />
            <span
              className={cn("text-sm leading-tight font-semibold", sidebarCollapsed && "hidden")}
            >
              Marginal
              <span className="block text-[11px] font-normal text-muted-foreground">
                Economics 0455
              </span>
            </span>
          </Link>
          {!sidebarCollapsed ? (
            <Button
              variant="ghost"
              size="icon"
              className="ml-auto size-8 shrink-0 text-muted-foreground hover:text-foreground"
              onClick={toggleSidebar}
              title="Collapse sidebar"
              aria-label="Collapse sidebar"
            >
              <PanelLeftClose className="size-4" />
            </Button>
          ) : null}
        </div>

        {sidebarCollapsed ? (
          <Button
            variant="ghost"
            size="icon"
            className="mb-3 size-10 self-center text-muted-foreground hover:text-foreground"
            onClick={toggleSidebar}
            title="Expand sidebar"
            aria-label="Expand sidebar"
          >
            <PanelLeftOpen className="size-4" />
          </Button>
        ) : null}

        <Link
          to="/dashboard"
          className={cn(
            "mb-3 flex items-center rounded-md py-2 text-sm text-sidebar-foreground/75 transition-colors",
            sidebarCollapsed ? "justify-center px-2" : "gap-2.5 px-2.5",
            "hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
            pathname === "/dashboard" &&
              "bg-sidebar-accent font-medium text-sidebar-accent-foreground",
          )}
        >
          <LayoutDashboard className="size-4" />
          <span className={cn(sidebarCollapsed && "sr-only")}>Dashboard</span>
        </Link>

        {role !== "teacher" ? (
          <Link
            to="/review"
            className={cn(
              "mb-3 flex items-center rounded-md py-2 text-sm text-sidebar-foreground/75 transition-colors",
              sidebarCollapsed ? "justify-center px-2" : "gap-2.5 px-2.5",
              "hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
              pathname === "/review" &&
                "bg-sidebar-accent font-medium text-sidebar-accent-foreground",
            )}
          >
            <ClipboardCheck className="size-4" />
            <span className={cn(sidebarCollapsed && "sr-only")}>Review panel</span>
          </Link>
        ) : null}

        <Link
          to="/classes"
          className={cn(
            "mb-3 flex items-center rounded-md py-2 text-sm text-sidebar-foreground/75 transition-colors",
            sidebarCollapsed ? "justify-center px-2" : "gap-2.5 px-2.5",
            "hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
            pathname.startsWith("/classes") &&
              "bg-sidebar-accent font-medium text-sidebar-accent-foreground",
          )}
          title={classroomLabel}
        >
          <UsersRound className="size-4" />
          <span className={cn(sidebarCollapsed && "sr-only")}>{classroomLabel}</span>
        </Link>

        {role !== "teacher" ? (
          <div
            className={cn(
              "mb-3 grid gap-1 rounded-lg bg-muted p-1",
              sidebarCollapsed ? "grid-cols-1" : "grid-cols-2",
            )}
          >
            <button
              type="button"
              onClick={() => switchSection("grader")}
              className={cn(
                "rounded-md px-2 py-1.5 text-xs font-medium transition-colors",
                section === "grader"
                  ? "bg-background text-foreground shadow-sm font-semibold"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              <span className={cn(sidebarCollapsed && "sr-only")}>Grader</span>
              {sidebarCollapsed ? <PenLine className="mx-auto size-4" /> : null}
            </button>
            <button
              type="button"
              onClick={() => switchSection("bank")}
              className={cn(
                "rounded-md px-2 py-1.5 text-xs font-medium transition-colors",
                section === "bank"
                  ? "bg-background text-foreground shadow-sm font-semibold"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              <span className={cn(sidebarCollapsed && "sr-only")}>Question bank</span>
              {sidebarCollapsed ? <BookMarked className="mx-auto size-4" /> : null}
            </button>
          </div>
        ) : null}

        <nav className="flex flex-col gap-0.5">
          {activeNav.map((item) => {
            const active = pathname.startsWith(item.to);
            return (
              <Link
                key={item.to}
                to={item.to}
                className={cn(
                  "flex items-center rounded-md py-2 text-sm text-sidebar-foreground/75 transition-colors",
                  sidebarCollapsed ? "justify-center px-2" : "gap-2.5 px-2.5",
                  "hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
                  active && "bg-sidebar-accent font-medium text-sidebar-accent-foreground",
                )}
              >
                <item.icon className="size-4" />
                <span className={cn(sidebarCollapsed && "sr-only")}>{item.label}</span>
              </Link>
            );
          })}
        </nav>

        {staffNav.length > 0 ? (
          <>
            <p
              className={cn(
                "mt-5 mb-1 px-2.5 text-[11px] font-medium tracking-wide text-muted-foreground uppercase",
                sidebarCollapsed && "sr-only",
              )}
            >
              Staff
            </p>
            <nav className="flex flex-1 flex-col gap-0.5">
              {staffNav.map((item) => {
                const active = pathname.startsWith(item.to);
                return (
                  <Link
                    key={item.to}
                    to={item.to}
                    className={cn(
                      "flex items-center rounded-md py-2 text-sm text-sidebar-foreground/75 transition-colors",
                      sidebarCollapsed ? "justify-center px-2" : "gap-2.5 px-2.5",
                      "hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
                      active && "bg-sidebar-accent font-medium text-sidebar-accent-foreground",
                    )}
                  >
                    <item.icon className="size-4" />
                    <span className={cn(sidebarCollapsed && "sr-only")}>{item.label}</span>
                  </Link>
                );
              })}
            </nav>
          </>
        ) : (
          <div className="flex-1" />
        )}

        <div className="mt-4 border-t border-sidebar-border pt-3">
          <Link
            to="/settings"
            className={cn(
              "block rounded-md py-1.5 transition-colors hover:bg-sidebar-accent",
              sidebarCollapsed ? "px-2 text-center" : "px-2.5",
              pathname.startsWith("/settings") && "bg-sidebar-accent",
            )}
          >
            <p className={cn("text-sm font-medium", sidebarCollapsed && "sr-only")}>
              {name ?? "Your account"}
            </p>
            <p
              className={cn(
                "text-xs text-muted-foreground capitalize",
                sidebarCollapsed && "sr-only",
              )}
            >
              {role} · Edit profile
            </p>
            {sidebarCollapsed ? (
              <span className="text-xs font-medium">{role.slice(0, 1).toUpperCase()}</span>
            ) : null}
          </Link>
          <Button
            variant="ghost"
            size="sm"
            className={cn("mt-1 w-full", sidebarCollapsed ? "justify-center" : "justify-start")}
            onClick={signOut}
            title="Sign out"
          >
            <LogOut className="size-4" />{" "}
            <span className={cn(sidebarCollapsed && "sr-only")}>Sign out</span>
          </Button>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex flex-col gap-2 border-b border-border px-3 py-2 md:hidden">
          <div className="flex items-center gap-1">
            {role !== "teacher" ? (
              <div className="grid flex-1 grid-cols-2 gap-1 rounded-lg bg-muted p-1">
                <button
                  type="button"
                  onClick={() => switchSection("grader")}
                  className={cn(
                    "rounded-md px-2 py-1 text-xs font-medium transition-colors",
                    section === "grader"
                      ? "bg-background text-foreground shadow-sm font-semibold"
                      : "text-muted-foreground",
                  )}
                >
                  Grader
                </button>
                <button
                  type="button"
                  onClick={() => switchSection("bank")}
                  className={cn(
                    "rounded-md px-2 py-1 text-xs font-medium transition-colors",
                    section === "bank"
                      ? "bg-background text-foreground shadow-sm font-semibold"
                      : "text-muted-foreground",
                  )}
                >
                  Question bank
                </button>
              </div>
            ) : (
              <div className="flex-1 px-2 text-sm font-semibold">Marginal teacher</div>
            )}
            <Button variant="ghost" size="sm" onClick={signOut}>
              <LogOut className="size-4" />
            </Button>
          </div>
          <div className="flex items-center gap-1 overflow-x-auto">
            <Link
              to="/dashboard"
              className={cn(
                "rounded-md px-2.5 py-1.5 text-xs whitespace-nowrap text-muted-foreground",
                pathname === "/dashboard" && "bg-accent text-accent-foreground font-medium",
              )}
            >
              Dashboard
            </Link>
            {role !== "teacher" ? (
              <Link
                to="/review"
                className={cn(
                  "rounded-md px-2.5 py-1.5 text-xs whitespace-nowrap text-muted-foreground",
                  pathname === "/review" && "bg-accent text-accent-foreground font-medium",
                )}
              >
                Review panel
              </Link>
            ) : null}
            <Link
              to="/classes"
              className={cn(
                "rounded-md px-2.5 py-1.5 text-xs whitespace-nowrap text-muted-foreground",
                pathname.startsWith("/classes") && "bg-accent text-accent-foreground font-medium",
              )}
            >
              {classroomLabel}
            </Link>
            {mobileNav.map((item) => (
              <Link
                key={item.to}
                to={item.to}
                className={cn(
                  "rounded-md px-2.5 py-1.5 text-xs whitespace-nowrap text-muted-foreground",
                  pathname.startsWith(item.to) && "bg-accent text-accent-foreground font-medium",
                )}
              >
                {item.label}
              </Link>
            ))}
          </div>
        </header>

        <main className="min-w-0 flex-1">{children}</main>
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
    <div className="flex flex-wrap items-start justify-between gap-3 border-b border-border px-5 py-5 md:px-8">
      <div>
        <h1 className="text-lg font-semibold md:text-xl text-foreground">{title}</h1>
        {description ? (
          <p className="mt-1 max-w-2xl text-sm text-muted-foreground">{description}</p>
        ) : null}
      </div>
      {action ? <div className="flex items-center gap-2">{action}</div> : null}
    </div>
  );
}
