import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import {
  AlertTriangle,
  Check,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Copy,
  Cpu,
  Gauge,
  Loader2,
  PauseCircle,
  Save,
  Search,
  Send,
  Sparkles,
  Trophy,
  Users,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

import { UserAvatar } from "@/components/app/user-avatar";
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
import {
  adminGetSettings,
  adminSetSettings,
  adminUserActivity,
  type AiGatewayMode,
  type UserActivityRow,
} from "@/lib/admin.functions";
import { describePath } from "@/lib/presence";
import { cn } from "@/lib/utils";

/* ------------------------------------------------------------------ */
/* Small shared helpers                                                */
/* ------------------------------------------------------------------ */

export function timeAgo(iso: string | null | undefined): string {
  if (!iso) return "never";
  const seconds = Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 1000));
  if (seconds < 60) return "just now";
  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours} h ago`;
  const days = Math.round(hours / 24);
  if (days < 30) return `${days} d ago`;
  return new Date(iso).toLocaleDateString();
}

export function displayName(row?: Partial<UserActivityRow> | null): string {
  return row?.fullName?.trim() || row?.email || "Unnamed account";
}

/** Case-insensitive "every word must appear somewhere" match. */
export function matchesSearch(haystack: (string | null | undefined)[], query: string): boolean {
  const words = query.toLowerCase().split(/\s+/).filter(Boolean);
  if (words.length === 0) return true;
  const text = haystack.filter(Boolean).join(" ").toLowerCase();
  return words.every((word) => text.includes(word));
}

export function useUserActivity() {
  const fetchActivity = useServerFn(adminUserActivity);
  return useQuery({
    queryKey: ["admin-user-activity"],
    queryFn: () => fetchActivity(),
    // Keeps "online now" honest while the tab is open.
    refetchInterval: 30_000,
  });
}

export function SearchBox({
  value,
  onChange,
  placeholder,
  className,
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  className?: string;
}) {
  return (
    <div className={cn("relative", className)}>
      <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
      <Input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        className="pl-9"
        aria-label={placeholder}
      />
    </div>
  );
}

function OnlineDot({ online }: { online: boolean }) {
  return (
    <span
      className={cn(
        "inline-block size-2 shrink-0 rounded-full",
        online
          ? "bg-emerald-500 shadow-[0_0_0_3px_rgba(16,185,129,0.2)]"
          : "bg-muted-foreground/30",
      )}
      title={online ? "Online now" : "Offline"}
      aria-label={online ? "Online now" : "Offline"}
    />
  );
}

/* ------------------------------------------------------------------ */
/* Overview: who is online, who uses the most, searchable per-user data */
/* ------------------------------------------------------------------ */

type SortKey = "total" | "essays" | "live" | "mcq" | "ai" | "recent" | "joined";

const SORT_LABELS: Record<SortKey, string> = {
  total: "Most active overall",
  essays: "Most essays graded",
  live: "Most Live Examiner sessions",
  mcq: "Most MCQ attempts",
  ai: "Most AI calls",
  recent: "Most recently active",
  joined: "Newest accounts",
};

function totalActivity(row?: UserActivityRow | null): number {
  if (!row) return 0;
  return (row.essaysGraded || 0) + (row.liveExaminerSessions || 0) + (row.mcqAttempts || 0);
}

function sortValue(row?: UserActivityRow | null, key?: SortKey): number {
  if (!row) return 0;
  switch (key) {
    case "total":
      return totalActivity(row);
    case "essays":
      return row.essaysGraded || 0;
    case "live":
      return row.liveExaminerSessions || 0;
    case "mcq":
      return row.mcqAttempts || 0;
    case "ai":
      return row.aiCalls || 0;
    case "recent":
      return row.lastActivity ? new Date(row.lastActivity).getTime() : 0;
    case "joined":
      return row.joinedAt ? new Date(row.joinedAt).getTime() : 0;
    default:
      return 0;
  }
}

export function ActivityOverview({
  search,
  onTextUser,
}: {
  search: string;
  onTextUser?: (userId: string) => void;
}) {
  const activity = useUserActivity();
  const fetchSettings = useServerFn(adminGetSettings);
  const settings = useQuery({
    queryKey: ["admin-settings"],
    queryFn: () => fetchSettings(),
    refetchInterval: 30_000,
  });
  const [sortKey, setSortKey] = useState<SortKey>("total");
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState<number>(10);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const copyEmail = (email: string, id: string) => {
    navigator.clipboard.writeText(email);
    setCopiedId(id);
    toast.success("Email copied to clipboard");
    setTimeout(() => setCopiedId(null), 2000);
  };

  const rows = useMemo(() => activity.data ?? [], [activity.data]);
  const online = useMemo(() => rows.filter((row) => row.isOnline), [rows]);
  const topUsers = useMemo(
    () =>
      [...rows]
        .filter((row) => totalActivity(row) > 0)
        .sort((a, b) => totalActivity(b) - totalActivity(a))
        .slice(0, 10),
    [rows],
  );
  const maxTotal = topUsers[0] ? totalActivity(topUsers[0]) : 0;

  const filtered = useMemo(() => {
    return rows
      .filter((row) =>
        matchesSearch(
          [
            row.fullName,
            row.email,
            row.school,
            row.role,
            row.isOnline ? "online" : "offline",
            row.isOnline ? describePath(row.currentPath) : null,
          ],
          search,
        ),
      )
      .sort((a, b) => sortValue(b, sortKey) - sortValue(a, sortKey));
  }, [rows, search, sortKey]);

  // Reset to first page when search or sortKey changes
  useEffect(() => {
    setCurrentPage(1);
  }, [search, sortKey, pageSize]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const startIndex = (currentPage - 1) * pageSize;
  const paginatedRows = filtered.slice(startIndex, startIndex + pageSize);

  if (activity.isLoading) return <Skeleton className="h-64 w-full" />;
  if (activity.error) {
    return (
      <p className="text-sm text-destructive">
        Couldn't load user activity: {(activity.error as Error).message}. Make sure migration
        20260919090000 has been run on your database.
      </p>
    );
  }

  const gradedToday = rows.reduce((sum, row) => sum + row.essaysToday, 0);
  const s = settings.data;
  const currentSeats = s?.currentUsers ?? rows.length;
  const maxSeats = s?.maxUsers && s.maxUsers > 0 ? s.maxUsers : 100;
  const seatPct = Math.min(100, Math.round((currentSeats / maxSeats) * 100));

  return (
    <div className="space-y-5">
      {/* ── 1. Top KPI Summary Tiles ── */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <div className="panel rounded-xl border border-emerald-500/20 bg-gradient-to-br from-emerald-500/5 via-card to-card p-4 shadow-xs">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span className="font-semibold uppercase tracking-wider text-[10.5px]">Online Now</span>
            <span className="size-2 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_8px_rgba(16,185,129,0.8)]" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold tracking-tight text-foreground">{online.length}</span>
            <span className="text-xs text-emerald-600 dark:text-emerald-400 font-medium">live candidates</span>
          </div>
          <p className="text-[11px] text-muted-foreground mt-1.5 pt-1.5 border-t border-border/60">
            Real-time WebSocket heartbeat
          </p>
        </div>

        <div className="panel rounded-xl border border-border/80 bg-card p-4 shadow-xs">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span className="font-semibold uppercase tracking-wider text-[10.5px]">Essays Today</span>
            <span className="text-primary font-bold">24h</span>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold tracking-tight text-foreground">{gradedToday}</span>
            <span className="text-xs text-muted-foreground font-medium">scripts graded</span>
          </div>
          <p className="text-[11px] text-muted-foreground mt-1.5 pt-1.5 border-t border-border/60">
            Submissions since midnight
          </p>
        </div>

        <div className="panel rounded-xl border border-border/80 bg-card p-4 shadow-xs">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span className="font-semibold uppercase tracking-wider text-[10.5px]">Active Seats</span>
            <span className="text-[11px] font-mono font-semibold">{seatPct}%</span>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold tracking-tight text-foreground">
              {currentSeats} <span className="text-xs font-normal text-muted-foreground">/ {maxSeats}</span>
            </span>
          </div>
          <div className="mt-2 h-1.5 w-full rounded-full bg-muted overflow-hidden">
            <div
              className={cn("h-full rounded-full transition-all", seatPct > 90 ? "bg-rose-500" : "bg-primary")}
              style={{ width: `${seatPct}%` }}
            />
          </div>
        </div>

        <div className="panel rounded-xl border border-border/80 bg-card p-4 shadow-xs">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span className="font-semibold uppercase tracking-wider text-[10.5px]">Total Accounts</span>
            <Users className="size-3.5 text-muted-foreground" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold tracking-tight text-foreground">{rows.length}</span>
            <span className="text-xs text-muted-foreground font-medium">registered</span>
          </div>
          <p className="text-[11px] text-muted-foreground mt-1.5 pt-1.5 border-t border-border/60">
            Students, educators &amp; admin
          </p>
        </div>
      </div>

      {/* ── 2. Side-by-Side: Online Right Now & Top Learners ── */}
      <div className="grid gap-5 lg:grid-cols-2">
        {/* Online Right Now Card */}
        <div className="panel rounded-xl border border-border/80 bg-card shadow-xs flex flex-col">
          <div className="flex items-center justify-between border-b border-border/80 px-4 py-3 bg-card/60">
            <div className="flex items-center gap-2">
              <OnlineDot online={online.length > 0} />
              <h3 className="text-sm font-semibold text-foreground">Online Right Now</h3>
              <Badge variant="secondary" className="text-[10px] h-4 px-1.5 font-bold">
                {online.length}
              </Badge>
            </div>
            <span className="text-[11px] text-muted-foreground">refreshes every 30s</span>
          </div>

          <div className="max-h-72 overflow-y-auto custom-scrollbar divide-y divide-border/60 p-1 flex-1">
            {online.length === 0 ? (
              <div className="p-8 text-center text-xs text-muted-foreground">
                <p>Nobody is currently online.</p>
                <p className="text-[11px] mt-1 text-muted-foreground/70">Users active in the last 60 seconds appear here.</p>
              </div>
            ) : (
              online.map((row) => (
                <div key={row.userId} className="flex items-center justify-between gap-3 px-3 py-2.5 hover:bg-muted/30 rounded-lg transition-colors">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <UserAvatar
                      avatarUrl={null}
                      name={row.fullName}
                      showStatusDot={true}
                      className="size-7 shrink-0 ring-1 ring-emerald-500/30"
                    />
                    <div className="min-w-0">
                      <p className="truncate text-xs font-semibold text-foreground leading-tight">
                        {displayName(row)}
                      </p>
                      <p className="truncate text-[10.5px] text-muted-foreground font-mono">
                        {row.email || "No email"}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <Badge variant="outline" className="text-[10px] bg-muted/50 border-border/80 text-foreground/80 py-0 max-w-[140px] truncate">
                      {describePath(row.currentPath)}
                    </Badge>
                    {onTextUser && (
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        onClick={() => onTextUser(row.userId)}
                        className="h-6 px-2 text-[10.5px] font-semibold text-primary hover:bg-primary/10 gap-1 cursor-pointer"
                        title="Direct message user"
                      >
                        <Send className="size-2.5" /> Text
                      </Button>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Most Active Learners (Leaderboard) */}
        <div className="panel rounded-xl border border-border/80 bg-card shadow-xs flex flex-col">
          <div className="flex items-center justify-between border-b border-border/80 px-4 py-3 bg-card/60">
            <div className="flex items-center gap-2">
              <Trophy className="size-4 text-amber-500" />
              <h3 className="text-sm font-semibold text-foreground">Top Learners Leaderboard</h3>
            </div>
            <span className="text-[11px] text-muted-foreground">Most practice activity</span>
          </div>

          <div className="max-h-72 overflow-y-auto custom-scrollbar divide-y divide-border/60 p-1 flex-1">
            {topUsers.length === 0 ? (
              <div className="p-8 text-center text-xs text-muted-foreground">
                <p>No activity recorded yet.</p>
              </div>
            ) : (
              topUsers.map((row, index) => {
                const total = totalActivity(row);
                const pct = maxTotal ? Math.round((total / maxTotal) * 100) : 0;
                return (
                  <div key={row.userId} className="px-3 py-2.5 hover:bg-muted/30 rounded-lg transition-colors space-y-1.5">
                    <div className="flex items-center justify-between gap-2 text-xs">
                      <div className="flex items-center gap-2 min-w-0">
                        <span
                          className={cn(
                            "flex size-5 shrink-0 items-center justify-center rounded-full text-[10px] font-extrabold",
                            index === 0
                              ? "bg-amber-500/20 text-amber-600 dark:text-amber-400 border border-amber-500/40"
                              : index === 1
                                ? "bg-slate-400/20 text-slate-700 dark:text-slate-300 border border-slate-400/40"
                                : index === 2
                                  ? "bg-orange-500/20 text-orange-700 dark:text-orange-400 border border-orange-500/40"
                                  : "bg-muted text-muted-foreground",
                          )}
                        >
                          {index + 1}
                        </span>
                        <span className="truncate font-semibold text-foreground">{displayName(row)}</span>
                        {row.role !== "student" && (
                          <Badge variant="outline" className="text-[9px] px-1 py-0 uppercase">
                            {row.role}
                          </Badge>
                        )}
                      </div>

                      <div className="flex items-center gap-2 text-[11px] text-muted-foreground shrink-0 font-medium">
                        <span>{row.essaysGraded} essays</span>
                        <span>·</span>
                        <span>{row.liveExaminerSessions} live</span>
                        <span>·</span>
                        <span>{row.mcqAttempts} MCQ</span>
                      </div>
                    </div>

                    <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden">
                      <div
                        className={cn(
                          "h-full rounded-full transition-all",
                          index === 0 ? "bg-amber-500" : index === 1 ? "bg-indigo-500" : "bg-primary",
                        )}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>

      {/* ── 3. Contained, Scrollable & Paginated All Users Directory ── */}
      <div className="panel rounded-xl border border-border/80 bg-card shadow-xs overflow-hidden">
        {/* Table Top Controls Bar */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border/80 px-4 py-3 bg-card/60">
          <div>
            <h3 className="text-sm font-semibold text-foreground">
              User Activity Stream &amp; Accounts{" "}
              <span className="font-normal text-muted-foreground text-xs">
                ({filtered.length} total)
              </span>
            </h3>
            <p className="text-[11px] text-muted-foreground mt-0.5">
              Showing page {currentPage} of {totalPages} ({paginatedRows.length} displayed)
            </p>
          </div>

          <div className="flex items-center gap-2.5">
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <span className="hidden sm:inline">Sort:</span>
              <Select value={sortKey} onValueChange={(value) => setSortKey(value as SortKey)}>
                <SelectTrigger className="h-8 w-44 text-xs bg-background">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {(Object.keys(SORT_LABELS) as SortKey[]).map((key) => (
                    <SelectItem key={key} value={key} className="text-xs">
                      {SORT_LABELS[key]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <span className="hidden sm:inline">Rows:</span>
              <Select
                value={String(pageSize)}
                onValueChange={(val) => setPageSize(Number(val))}
              >
                <SelectTrigger className="h-8 w-20 text-xs bg-background">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="10">10</SelectItem>
                  <SelectItem value="25">25</SelectItem>
                  <SelectItem value="50">50</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        {/* Scrollable Table Container with Custom Scrollbar */}
        <div className="max-h-[460px] overflow-auto custom-scrollbar">
          <table className="w-full text-left text-xs">
            <thead className="sticky top-0 bg-muted/90 backdrop-blur-sm z-10 border-b border-border text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
              <tr>
                <th className="px-4 py-2.5">User</th>
                <th className="px-3 py-2.5 text-right">Essays Marked</th>
                <th className="px-3 py-2.5 text-right">Today</th>
                <th className="px-3 py-2.5 text-right">Live Ex.</th>
                <th className="px-3 py-2.5 text-right">MCQ Attempts</th>
                <th className="px-3 py-2.5 text-right">AI Calls</th>
                <th className="px-3 py-2.5 text-right">Last Seen</th>
                <th className="px-4 py-2.5 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60">
              {paginatedRows.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-8 text-center text-xs text-muted-foreground">
                    {search ? "No users match your search." : "No registered accounts yet."}
                  </td>
                </tr>
              ) : (
                paginatedRows.map((row) => (
                  <tr key={row.userId} className="hover:bg-muted/30 transition-colors">
                    <td className="px-4 py-2.5">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <OnlineDot online={row.isOnline} />
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5">
                            <span className="font-semibold text-foreground truncate">
                              {displayName(row)}
                            </span>
                            {row.role === "admin" ? (
                              <Badge className="h-4 px-1 text-[9px] font-extrabold uppercase bg-amber-500/20 text-amber-600 dark:text-amber-400 border-amber-500/30">
                                Admin
                              </Badge>
                            ) : row.role === "teacher" ? (
                              <Badge className="h-4 px-1 text-[9px] font-bold uppercase bg-purple-500/15 text-purple-600 dark:text-purple-400 border-purple-500/30">
                                Educator
                              </Badge>
                            ) : null}
                          </div>
                          <div className="flex items-center gap-2 text-[10.5px] text-muted-foreground mt-0.5">
                            {row.email ? (
                              <button
                                type="button"
                                onClick={() => copyEmail(row.email!, row.userId)}
                                className="inline-flex items-center gap-1 font-mono hover:text-foreground transition-colors cursor-pointer"
                                title="Click to copy email"
                              >
                                <span className="truncate max-w-[180px]">{row.email}</span>
                                {copiedId === row.userId ? (
                                  <Check className="size-2.5 text-emerald-500 shrink-0" />
                                ) : (
                                  <Copy className="size-2.5 text-muted-foreground/60 shrink-0" />
                                )}
                              </button>
                            ) : (
                              <span>No email</span>
                            )}
                            {row.isOnline && (
                              <span className="text-emerald-600 dark:text-emerald-400 font-semibold truncate max-w-[130px]">
                                · {describePath(row.currentPath)}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-3 py-2.5 text-right tabular-nums font-semibold text-foreground">
                      {row.essaysGraded}
                    </td>
                    <td className="px-3 py-2.5 text-right tabular-nums">
                      {row.essaysToday > 0 ? (
                        <span className="font-bold text-emerald-600 dark:text-emerald-400">
                          +{row.essaysToday}
                        </span>
                      ) : (
                        <span className="text-muted-foreground">0</span>
                      )}
                    </td>
                    <td className="px-3 py-2.5 text-right tabular-nums text-muted-foreground">
                      {row.liveExaminerSessions}
                    </td>
                    <td className="px-3 py-2.5 text-right tabular-nums text-muted-foreground">
                      {row.mcqAttempts}
                    </td>
                    <td className="px-3 py-2.5 text-right tabular-nums text-muted-foreground">
                      {row.aiCalls}
                    </td>
                    <td className="px-3 py-2.5 text-right text-[11px] text-muted-foreground whitespace-nowrap">
                      {row.isOnline ? (
                        <span className="font-bold text-emerald-600 dark:text-emerald-400">online</span>
                      ) : (
                        timeAgo(row.lastActivity)
                      )}
                    </td>
                    <td className="px-4 py-2.5 text-right">
                      {onTextUser && (
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          onClick={() => onTextUser(row.userId)}
                          className="h-6 px-2 text-[10.5px] font-semibold text-primary hover:bg-primary/10 gap-1 border-primary/30 cursor-pointer"
                          title="Direct message this user"
                        >
                          <Send className="size-2.5" /> Text
                        </Button>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Footer */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between border-t border-border/80 px-4 py-2.5 bg-card/60 text-xs">
            <span className="text-muted-foreground text-[11px]">
              Showing {startIndex + 1}–{Math.min(startIndex + pageSize, filtered.length)} of {filtered.length} users
            </span>
            <div className="flex items-center gap-1.5">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={currentPage <= 1}
                className="h-7 px-2.5 text-xs gap-1"
              >
                <ChevronLeft className="size-3" />
                <span>Prev</span>
              </Button>
              <span className="text-xs font-semibold px-2">
                {currentPage} / {totalPages}
              </span>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                disabled={currentPage >= totalPages}
                className="h-7 px-2.5 text-xs gap-1"
              >
                <span>Next</span>
                <ChevronRight className="size-3" />
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Access: seat cap, essays/day, AI usage controls, waitlist           */
/* ------------------------------------------------------------------ */

const AI_MODE_LABELS: Record<AiGatewayMode, string> = {
  max: "Max quality",
  balanced: "Balanced",
  economy: "Max savings",
};

const AI_MODE_DESCRIPTIONS: Record<AiGatewayMode, string> = {
  max: "No change — every feature uses its normal model and full reply length.",
  balanced: "Same models, shorter replies. A moderate credit saving with little quality loss.",
  economy:
    "Every AI call (including essay grading) is switched to the fast/cheap model and capped hard. Real quality trade-off — use this to stretch credits in an emergency, not as the everyday setting.",
};

export function AccessPanel() {
  const queryClient = useQueryClient();
  const fetchSettings = useServerFn(adminGetSettings);
  const saveSettings = useServerFn(adminSetSettings);

  const settings = useQuery({ queryKey: ["admin-settings"], queryFn: () => fetchSettings() });

  const [maxUsers, setMaxUsers] = useState("100");

  useEffect(() => {
    if (settings.data) {
      setMaxUsers(String(settings.data.maxUsers || 100));
    }
  }, [settings.data]);

  const parsedMax = Number(maxUsers);
  const validMax = Number.isInteger(parsedMax) && parsedMax >= 1 && parsedMax <= 10000;
  const dirty = !!settings.data && parsedMax !== settings.data.maxUsers;

  const saveMutation = useMutation({
    mutationFn: () => saveSettings({ data: { maxUsers: parsedMax } }),
    onSuccess: async (data) => {
      toast.success(
        `Platform capacity updated: Active seat cap is now ${data.maxUsers} users.`,
      );
      queryClient.setQueryData(["admin-settings"], data);
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["admin-settings"] }),
        queryClient.invalidateQueries({ queryKey: ["admin-overview"] }),
      ]);
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const aiMutation = useMutation({
    mutationFn: (vars: { aiEnabled?: boolean; aiMode?: AiGatewayMode; aiBackupOnly?: boolean }) =>
      saveSettings({ data: vars }),
    onSuccess: (result, vars) => {
      queryClient.setQueryData(["admin-settings"], result);
      if (vars.aiBackupOnly !== undefined) {
        toast.success(
          result.aiBackupOnly
            ? "Gemini is switched OFF. Platform is running strictly on backup providers."
            : "Gemini is restored as primary AI engine.",
        );
      } else if (vars.aiEnabled !== undefined) {
        toast.success(
          result.aiEnabled
            ? "AI is live again for everyone."
            : "AI paused site-wide — every AI feature will fail fast until you turn this back on.",
        );
      } else {
        toast.success(`AI mode set to ${AI_MODE_LABELS[result.aiMode]}.`);
      }
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const s = settings.data;
  const currentUsers = s?.currentUsers ?? 32;
  const targetMax = s?.maxUsers && s.maxUsers > 0 ? s.maxUsers : 100;
  const freeSeats = Math.max(targetMax - currentUsers, 0);
  const overCap = currentUsers > targetMax;
  const capacityPct = Math.min(100, Math.round((currentUsers / targetMax) * 100));

  if (settings.isLoading) return <Skeleton className="h-64 w-full" />;
  if (settings.error) {
    return (
      <p className="text-sm text-destructive">
        Couldn't load access settings: {(settings.error as Error).message}.
      </p>
    );
  }

  const ai = settings.data;
  const USER_PRESETS = [50, 100, 250, 500, 1000, 2500, 5000];

  return (
    <div className="space-y-6">
      {/* AI Gateway Global Switch & Modes */}
      <div
        className={cn(
          "panel space-y-4 rounded-xl border p-5 transition-colors",
          ai && !ai.aiEnabled ? "border-destructive/40 bg-destructive/5" : "border-border",
        )}
      >
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="flex items-center gap-2 text-sm font-semibold">
              <Gauge className="size-4 text-primary" /> AI Usage & Gateway Controls
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              Applies instantly platform-wide — essay grading, Live Examiner, MCQ generation, and
              diagram evaluation.
            </p>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <Label htmlFor="ai-enabled" className="text-xs font-medium">
              {ai?.aiEnabled ? (
                <span className="text-emerald-500 font-semibold flex items-center gap-1">
                  <CheckCircle2 className="size-3.5" /> AI Live
                </span>
              ) : (
                <span className="text-destructive font-semibold flex items-center gap-1">
                  <PauseCircle className="size-3.5" /> AI Paused
                </span>
              )}
            </Label>
            <Switch
              id="ai-enabled"
              checked={ai?.aiEnabled ?? true}
              disabled={!ai || aiMutation.isPending}
              onCheckedChange={(checked) => aiMutation.mutate({ aiEnabled: checked })}
            />
          </div>
        </div>

        {ai && !ai.aiEnabled ? (
          <div className="flex items-start gap-2 rounded-lg border border-destructive/30 bg-destructive/10 px-3.5 py-2.5 text-xs text-destructive">
            <PauseCircle className="mt-0.5 size-4 shrink-0" />
            AI is paused platform-wide. Every essay grading request and Live Examiner session will
            return a safe pause notice until re-enabled.
          </div>
        ) : null}

        <div className="space-y-2 pt-1 border-t border-border/60">
          <Label htmlFor="ai-mode" className="text-xs font-semibold">
            Quality vs Credit Optimization Mode
          </Label>
          <div className="flex flex-wrap items-center gap-3">
            <Select
              value={ai?.aiMode ?? "max"}
              disabled={!ai || aiMutation.isPending}
              onValueChange={(value) => aiMutation.mutate({ aiMode: value as AiGatewayMode })}
            >
              <SelectTrigger id="ai-mode" className="sm:w-64">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {(Object.keys(AI_MODE_LABELS) as AiGatewayMode[]).map((mode) => (
                  <SelectItem key={mode} value={mode}>
                    {AI_MODE_LABELS[mode]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
              {ai?.aiMode === "economy" ? (
                <AlertTriangle className="size-3.5 shrink-0 text-amber-500" />
              ) : null}
              {AI_MODE_DESCRIPTIONS[ai?.aiMode ?? "max"]}
            </p>
          </div>
        </div>

        <div className="space-y-3 pt-3 border-t border-border/60">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-xs font-semibold flex items-center gap-1.5">
                <Cpu className="size-3.5 text-primary" />
                Gemini Engine Status & Backup-Only Mode
              </p>
              <p className="mt-0.5 text-xs text-muted-foreground">
                Temporarily switch off Google Gemini to test or run 100% on external backup providers (Groq, OpenRouter, Mistral, xAI, etc.).
              </p>
            </div>
            <div className="flex shrink-0 items-center gap-2">
              <Label htmlFor="ai-backup-only" className="text-xs font-medium">
                {ai?.aiBackupOnly ? (
                  <span className="text-amber-500 font-semibold flex items-center gap-1">
                    <AlertTriangle className="size-3.5" /> Backup Only
                  </span>
                ) : (
                  <span className="text-emerald-500 font-semibold flex items-center gap-1">
                    <CheckCircle2 className="size-3.5" /> Gemini Active
                  </span>
                )}
              </Label>
              <Switch
                id="ai-backup-only"
                checked={ai?.aiBackupOnly ?? false}
                disabled={!ai || aiMutation.isPending}
                onCheckedChange={(checked) => aiMutation.mutate({ aiBackupOnly: checked })}
              />
            </div>
          </div>
          {ai?.aiBackupOnly ? (
            <div className="flex items-start gap-2 rounded-lg border border-amber-500/30 bg-amber-500/10 px-3.5 py-2.5 text-xs text-amber-600 dark:text-amber-400">
              <AlertTriangle className="mt-0.5 size-4 shrink-0" />
              <span>
                <strong>Gemini is switched OFF:</strong> All student essay marking, Live Examiner checks, and prompts are running strictly on your configured backup providers (Groq, OpenRouter, Mistral, etc.).
              </span>
            </div>
          ) : null}
        </div>
      </div>

      {/* Platform Capacity & User Cap Manager */}
      <div className="panel space-y-6 rounded-xl border border-border p-5">
        <div>
          <p className="flex items-center gap-2 text-sm font-semibold">
            <Users className="size-4 text-primary" /> Platform Capacity & Limits
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            Configure the maximum number of permitted active accounts and daily student essay
            limits.
          </p>
        </div>

        {/* Real-time Seat Progress Bar */}
        <div className="rounded-lg border border-border/80 bg-muted/30 p-4 space-y-2">
          <div className="flex items-center justify-between text-xs">
            <span className="font-semibold text-foreground">
              Platform Seat Allocation: {currentUsers} / {targetMax} seats ({capacityPct}%)
            </span>
            <span
              className={cn(
                "font-medium",
                overCap ? "text-destructive font-semibold" : "text-muted-foreground",
              )}
            >
              {overCap
                ? "Capacity exceeded"
                : `${freeSeats} seat${freeSeats === 1 ? "" : "s"} available`}
            </span>
          </div>
          <div className="h-2.5 w-full overflow-hidden rounded-full bg-muted">
            <div
              className={cn(
                "h-full rounded-full transition-all duration-500",
                capacityPct >= 90 ? "bg-amber-500" : "bg-primary",
              )}
              style={{ width: `${Math.min(100, Math.max(0, capacityPct))}%` }}
            />
          </div>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          {/* Maximum Active Users Configuration */}
          <div className="space-y-3">
            <div className="space-y-1">
              <Label htmlFor="max-users" className="text-xs font-semibold">
                Maximum Active Users (Seat Cap)
              </Label>
              <Input
                id="max-users"
                type="number"
                inputMode="numeric"
                min={1}
                max={10000}
                value={maxUsers}
                onChange={(event) => setMaxUsers(event.target.value)}
                className="font-mono text-sm"
              />
            </div>

            {/* Quick Presets */}
            <div className="space-y-1">
              <p className="text-[11px] text-muted-foreground">Quick presets:</p>
              <div className="flex flex-wrap gap-1.5">
                {USER_PRESETS.map((preset) => (
                  <button
                    key={preset}
                    type="button"
                    onClick={() => setMaxUsers(String(preset))}
                    className={cn(
                      "rounded-md border px-2 py-1 text-xs font-medium transition-colors",
                      parsedMax === preset
                        ? "border-primary bg-primary/10 text-primary"
                        : "border-border bg-background text-muted-foreground hover:text-foreground",
                    )}
                  >
                    {preset}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Tier-Based Quotas (Active Subscription Architecture) */}
          <div className="space-y-3 rounded-lg border border-border/70 bg-card/60 p-3.5">
            <div className="flex items-center justify-between">
              <Label className="text-xs font-semibold flex items-center gap-1.5">
                <Sparkles className="size-3.5 text-primary" /> Tier-Based Capacity &amp; Quotas
              </Label>
              <Badge variant="outline" className="text-[10px] border-primary/30 text-primary">
                Plan-Governed
              </Badge>
            </div>
            <p className="text-[11px] text-muted-foreground leading-relaxed">
              Essay limits and Live Examiner credits are governed strictly by subscription tier quotas rather than an arbitrary global daily cap.
            </p>
            <div className="grid grid-cols-2 gap-2 text-[11px]">
              <div className="rounded border border-border/50 bg-background/50 p-2">
                <div className="font-semibold text-foreground">Free Tier</div>
                <div className="text-muted-foreground">Unlimited essays · 0 live credits</div>
              </div>
              <div className="rounded border border-border/50 bg-background/50 p-2">
                <div className="font-semibold text-foreground">Foundation Scholar</div>
                <div className="text-muted-foreground">8 essays/mo · 3 live credits</div>
              </div>
              <div className="rounded border border-border/50 bg-background/50 p-2">
                <div className="font-semibold text-foreground">Pro Accelerator</div>
                <div className="text-muted-foreground">20 essays/mo · 10 live credits</div>
              </div>
              <div className="rounded border border-border/50 bg-background/50 p-2">
                <div className="font-semibold text-foreground">A* Mastery Sprint</div>
                <div className="text-muted-foreground">45 essays/mo · 20 live credits</div>
              </div>
            </div>
            <div className="pt-1 text-[10px] text-muted-foreground flex items-center justify-between">
              <span>Elite Pass: 80 essays/mo · 35 live credits</span>
              <span>Educators: 3 trial evaluations</span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3 pt-2 border-t border-border/60">
          <Button
            onClick={() => saveMutation.mutate()}
            disabled={!dirty || !validMax || saveMutation.isPending}
          >
            {saveMutation.isPending ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <Save className="size-4" />
            )}
            Save seat capacity
          </Button>
          {!validMax ? (
            <p className="text-xs text-destructive">
              Users: 1–10,000 (whole numbers).
            </p>
          ) : dirty ? (
            <p className="text-xs text-amber-500 font-medium">Unsaved changes</p>
          ) : (
            <p className="text-xs text-muted-foreground">All changes saved and active.</p>
          )}
        </div>
      </div>
    </div>
  );
}
