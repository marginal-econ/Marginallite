import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import {
  AlertTriangle,
  CheckCircle2,
  Gauge,
  Loader2,
  PauseCircle,
  Save,
  Search,
  Sparkles,
  Users,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

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

type SortKey = "total" | "essays" | "mcq" | "ai" | "recent" | "joined";

const SORT_LABELS: Record<SortKey, string> = {
  total: "Most active overall",
  essays: "Most essays graded",
  mcq: "Most MCQ attempts",
  ai: "Most AI calls",
  recent: "Most recently active",
  joined: "Newest accounts",
};

function totalActivity(row?: UserActivityRow | null): number {
  if (!row) return 0;
  return (row.essaysGraded || 0) + (row.mcqAttempts || 0);
}

function sortValue(row?: UserActivityRow | null, key?: SortKey): number {
  if (!row) return 0;
  switch (key) {
    case "total":
      return totalActivity(row);
    case "essays":
      return row.essaysGraded || 0;
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

export function ActivityOverview({ search }: { search: string }) {
  const activity = useUserActivity();
  const fetchSettings = useServerFn(adminGetSettings);
  const settings = useQuery({
    queryKey: ["admin-settings"],
    queryFn: () => fetchSettings(),
    refetchInterval: 30_000,
  });
  const [sortKey, setSortKey] = useState<SortKey>("total");

  const rows = useMemo(() => activity.data ?? [], [activity.data]);
  const online = useMemo(() => rows.filter((row) => row.isOnline), [rows]);
  const topUsers = useMemo(
    () =>
      [...rows]
        .filter((row) => totalActivity(row) > 0)
        .sort((a, b) => totalActivity(b) - totalActivity(a))
        .slice(0, 5),
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
  const currentSeats = Math.max(rows.length, s?.currentUsers ?? 0);
  const maxSeats = s?.maxUsers && s.maxUsers > 0 ? s.maxUsers : 100;
  const totalRegisteredAccounts = currentSeats;
  const tiles = [
    { label: "Online now", value: online.length, tone: online.length > 0 },
    { label: "Active seats", value: `${currentSeats} / ${maxSeats}` },
    { label: "Registered accounts", value: totalRegisteredAccounts },
    { label: "Essays graded today", value: gradedToday },
  ];

  return (
    <div className="space-y-5">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {tiles.map((tile) => (
          <div key={tile.label} className="panel rounded-xl border border-border p-4">
            <p className="text-xs text-muted-foreground">{tile.label}</p>
            <p className="mt-1 flex items-center gap-2 text-xl font-semibold">
              {tile.tone ? <OnlineDot online /> : null}
              {tile.value}
            </p>
          </div>
        ))}
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        <div className="panel rounded-xl border border-border">
          <p className="flex items-center gap-2 border-b border-border px-4 py-3 text-sm font-semibold">
            <OnlineDot online={online.length > 0} /> Online right now
            <span className="ml-auto text-xs font-normal text-muted-foreground">
              updates every 30 s
            </span>
          </p>
          <div className="divide-y divide-border">
            {online.length === 0 ? (
              <p className="px-4 py-4 text-sm text-muted-foreground">
                Nobody is on the platform at the moment.
              </p>
            ) : (
              online.map((row) => (
                <div key={row.userId} className="flex items-center gap-3 px-4 py-2.5 text-sm">
                  <OnlineDot online />
                  <div className="min-w-0">
                    <p className="truncate font-medium">{displayName(row)}</p>
                    <p className="truncate text-xs text-muted-foreground">{row.email}</p>
                  </div>
                  <span className="ml-auto shrink-0 text-xs text-muted-foreground">
                    {describePath(row.currentPath)}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="panel rounded-xl border border-border">
          <p className="border-b border-border px-4 py-3 text-sm font-semibold">
            Who uses it the most
          </p>
          <div className="divide-y divide-border">
            {topUsers.length === 0 ? (
              <p className="px-4 py-4 text-sm text-muted-foreground">No activity recorded yet.</p>
            ) : (
              topUsers.map((row, index) => (
                <div key={row.userId} className="px-4 py-2.5 text-sm">
                  <div className="flex items-center gap-2">
                    <span className="w-4 text-xs text-muted-foreground">{index + 1}</span>
                    <span className="truncate font-medium">{displayName(row)}</span>
                    <span className="ml-auto shrink-0 text-xs text-muted-foreground">
                      {row.essaysGraded} essays · {row.mcqAttempts} MCQ
                    </span>
                  </div>
                  <div className="mt-1.5 ml-6 h-1.5 overflow-hidden rounded-full bg-muted">
                    <div
                      className="h-full rounded-full bg-primary"
                      style={{ width: `${maxTotal ? (totalActivity(row) / maxTotal) * 100 : 0}%` }}
                    />
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      <div className="panel rounded-xl border border-border">
        <div className="flex flex-wrap items-center gap-3 border-b border-border px-4 py-3">
          <p className="text-sm font-semibold">
            All users{" "}
            <span className="font-normal text-muted-foreground">
              ({filtered.length}
              {filtered.length !== rows.length ? ` of ${rows.length}` : ""})
            </span>
          </p>
          <div className="ml-auto w-full sm:w-64">
            <Select value={sortKey} onValueChange={(value) => setSortKey(value as SortKey)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {(Object.keys(SORT_LABELS) as SortKey[]).map((key) => (
                  <SelectItem key={key} value={key}>
                    {SORT_LABELS[key]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        <div className="overflow-x-auto">
          <div className="min-w-[760px] divide-y divide-border">
            <div className="grid grid-cols-[minmax(0,2.2fr)_repeat(4,minmax(0,0.8fr))_minmax(0,1fr)] gap-3 px-4 py-2 text-[11px] font-medium tracking-wide text-muted-foreground uppercase">
              <span>User</span>
              <span className="text-right">Essays</span>
              <span className="text-right">Today</span>
              <span className="text-right">MCQ</span>
              <span className="text-right">AI calls</span>
              <span className="text-right">Last active</span>
            </div>
            {filtered.length === 0 ? (
              <p className="px-4 py-4 text-sm text-muted-foreground">
                {search ? "No users match that search." : "No accounts yet."}
              </p>
            ) : null}
            {filtered.map((row) => (
              <div
                key={row.userId}
                className="grid grid-cols-[minmax(0,2.2fr)_repeat(4,minmax(0,0.8fr))_minmax(0,1fr)] items-center gap-3 px-4 py-2.5 text-sm"
              >
                <div className="flex min-w-0 items-center gap-2.5">
                  <OnlineDot online={row.isOnline} />
                  <div className="min-w-0">
                    <p className="flex items-center gap-1.5 truncate font-medium">
                      {displayName(row)}
                      {row.role !== "student" ? (
                        <Badge variant="secondary" className="px-1.5 py-0 text-[10px]">
                          {row.role}
                        </Badge>
                      ) : null}
                    </p>
                    <p className="truncate text-xs text-muted-foreground">
                      {row.email}
                      {row.isOnline ? ` · ${describePath(row.currentPath)}` : ""}
                    </p>
                  </div>
                </div>
                <span className="text-right tabular-nums">{row.essaysGraded}</span>
                <span className="text-right tabular-nums">{row.essaysToday}</span>
                <span className="text-right tabular-nums">{row.mcqAttempts}</span>
                <span className="text-right tabular-nums">{row.aiCalls}</span>
                <span className="text-right text-xs text-muted-foreground">
                  {row.isOnline ? "online" : timeAgo(row.lastActivity)}
                </span>
              </div>
            ))}
          </div>
        </div>
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
    mutationFn: (vars: { aiEnabled?: boolean; aiMode?: AiGatewayMode }) =>
      saveSettings({ data: vars }),
    onSuccess: (result, vars) => {
      queryClient.setQueryData(["admin-settings"], result);
      if (vars.aiEnabled !== undefined) {
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
              Applies instantly platform-wide — essay grading, MCQ generation, and
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
            AI is paused platform-wide. Every essay grading request and evaluation will
            return a safe pause notice until re-enabled.
          </div>
        ) : null}

        <div className="space-y-2 pt-1 border-t border-border/60">
          <Label htmlFor="ai-mode" className="text-xs font-semibold">
            Quality vs Speed Optimization Mode
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
