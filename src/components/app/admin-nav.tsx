import { Link, useRouterState } from "@tanstack/react-router";
import { BookOpen, ShieldCheck, ShieldPlus, Target, UploadCloud } from "lucide-react";
import { cn } from "@/lib/utils";

export const ADMIN_TABS = [
  { to: "/admin", label: "Admin Console", icon: ShieldCheck, adminOnly: true },
  { to: "/knowledge", label: "Knowledge Base", icon: BookOpen, adminOnly: false },
  { to: "/calibration", label: "Calibration Anchors", icon: Target, adminOnly: false },
  { to: "/content-admin", label: "Content Admin", icon: ShieldPlus, adminOnly: true },
  { to: "/mcq-papers-admin", label: "MCQ Paper Library", icon: UploadCloud, adminOnly: true },
] as const;

export function AdminNavTabs({ role }: { role?: "student" | "teacher" | "admin" }) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  const visibleTabs = ADMIN_TABS.filter((tab) => {
    if (tab.adminOnly) return role === "admin";
    return role === "admin" || role === "teacher";
  });

  return (
    <nav
      aria-label="Staff and admin console navigation"
      className="flex items-center gap-1 overflow-x-auto border-b border-border/70 bg-card/50 px-5 pt-1.5 pb-0 md:px-8"
    >
      {visibleTabs.map((tab) => {
        const active = pathname === tab.to;
        return (
          <Link
            key={tab.to}
            to={tab.to}
            className={cn(
              "flex items-center gap-1.5 border-b-2 px-3.5 py-2.5 text-xs font-medium whitespace-nowrap transition-colors",
              active
                ? "border-primary text-foreground font-semibold"
                : "border-transparent text-muted-foreground hover:border-border hover:text-foreground",
            )}
          >
            <tab.icon className={cn("size-3.5", active ? "text-primary" : "text-muted-foreground")} />
            {tab.label}
          </Link>
        );
      })}
    </nav>
  );
}
