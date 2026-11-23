import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Link } from "@tanstack/react-router";
import {
  Activity,
  AlertTriangle,
  Award,
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  Clock,
  Copy,
  ExternalLink,
  Flame,
  Gamepad2,
  GraduationCap,
  Layers,
  Loader2,
  Play,
  Plus,
  RefreshCw,
  Search,
  ShieldAlert,
  Sparkles,
  StopCircle,
  Trash2,
  Trophy,
  UserCheck,
  Users,
  Zap,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import {
  listAdminQuizSessions,
  endMcqQuiz,
  deleteMcqQuiz,
} from "@/lib/mcq-quiz.functions";
import type {
  AdminQuizDashboardData,
  AdminQuizRoomSummary,
  AdminQuizAttemptSummary,
  AdminQuizPlayerSummary,
} from "@/lib/mcq-quiz.types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
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

function formatTimeAgo(isoString?: string | null): string {
  if (!isoString) return "just now";
  const diffMs = Date.now() - new Date(isoString).getTime();
  const diffSec = Math.floor(diffMs / 1000);
  if (diffSec < 45) return "just now";
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHours = Math.floor(diffMin / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  const diffDays = Math.floor(diffHours / 24);
  return `${diffDays}d ago`;
}

// Multi-browser clipboard helper
async function copyTextToClipboard(text: string): Promise<boolean> {
  if (typeof window === "undefined") return false;
  try {
    if (navigator?.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch {
    /* fallback to execCommand below */
  }

  try {
    const textArea = document.createElement("textarea");
    textArea.value = text;
    textArea.style.position = "fixed";
    textArea.style.top = "0";
    textArea.style.left = "0";
    textArea.style.width = "2em";
    textArea.style.height = "2em";
    textArea.style.padding = "0";
    textArea.style.border = "none";
    textArea.style.outline = "none";
    textArea.style.boxShadow = "none";
    textArea.style.background = "transparent";
    textArea.style.opacity = "0";
    textArea.setAttribute("readonly", "");
    document.body.appendChild(textArea);
    textArea.focus();
    textArea.select();
    textArea.setSelectionRange(0, textArea.value.length);
    const successful = document.execCommand("copy");
    document.body.removeChild(textArea);
    return successful;
  } catch {
    return false;
  }
}

export function AdminMcqQuizPanel() {
  const queryClient = useQueryClient();
  const fetchAdminSessions = useServerFn(listAdminQuizSessions);
  const endQuizFn = useServerFn(endMcqQuiz);
  const deleteQuizFn = useServerFn(deleteMcqQuiz);

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "lobby" | "in_progress" | "ended">("all");
  const [levelFilter, setLevelFilter] = useState<"all" | "as" | "a2">("all");
  const [activeTab, setActiveTab] = useState<"rooms" | "attempts">("rooms");
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [expandedPin, setExpandedPin] = useState<string | null>(null);
  const [copiedPin, setCopiedPin] = useState<string | null>(null);

  // Dialog state
  const [roomToEnd, setRoomToEnd] = useState<AdminQuizRoomSummary | null>(null);
  const [roomToDelete, setRoomToDelete] = useState<AdminQuizRoomSummary | null>(null);

  const { data, isLoading, isError, error, refetch, isFetching } = useQuery<AdminQuizDashboardData>({
    queryKey: ["admin-mcq-quiz-sessions"],
    queryFn: () => fetchAdminSessions(),
    refetchInterval: autoRefresh ? 8_000 : false,
  });

  const endMutation = useMutation({
    mutationFn: (pin: string) => endQuizFn({ data: { pin } }),
    onSuccess: (_, pin) => {
      toast.success(`Room #${pin} has been ended. Podium and final mark scheme revealed.`);
      queryClient.invalidateQueries({ queryKey: ["admin-mcq-quiz-sessions"] });
      setRoomToEnd(null);
    },
    onError: (err: Error) => toast.error(`Failed to end room: ${err.message}`),
  });

  const deleteMutation = useMutation({
    mutationFn: (pin: string) => deleteQuizFn({ data: { pin } }),
    onSuccess: (_, pin) => {
      toast.success(`Room #${pin} and player records deleted.`);
      queryClient.invalidateQueries({ queryKey: ["admin-mcq-quiz-sessions"] });
      setRoomToDelete(null);
      if (expandedPin === pin) setExpandedPin(null);
    },
    onError: (err: Error) => toast.error(`Failed to delete room: ${err.message}`),
  });

  const handleCopyPin = async (pin: string) => {
    const ok = await copyTextToClipboard(pin);
    setCopiedPin(pin);
    if (ok) {
      toast.success(`Room PIN ${pin} copied to clipboard!`);
    } else {
      toast.info(`PIN: ${pin}`);
    }
    setTimeout(() => setCopiedPin(null), 2000);
  };

  const handleCopyLink = async (pin: string) => {
    const origin = typeof window !== "undefined" ? window.location.origin : "https://lite.marginal-econ.com";
    const link = `${origin}/quiz/${pin}`;
    const ok = await copyTextToClipboard(link);
    if (ok) {
      toast.success(`Direct Join Link copied: ${link}`);
    } else {
      toast.info(`Link: ${link}`);
    }
  };

  const rooms = data?.rooms ?? [];
  const recentAttempts = data?.recentAttempts ?? [];

  const filteredRooms = rooms.filter((r) => {
    if (statusFilter === "active" && r.status !== "lobby" && r.status !== "in_progress") return false;
    if (statusFilter !== "all" && statusFilter !== "active" && r.status !== statusFilter) return false;
    if (levelFilter !== "all" && r.level !== levelFilter) return false;

    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (
      r.pin.toLowerCase().includes(q) ||
      (r.title && r.title.toLowerCase().includes(q)) ||
      (r.paperTitle && r.paperTitle.toLowerCase().includes(q)) ||
      (r.hostName && r.hostName.toLowerCase().includes(q)) ||
      r.players.some((p) => p.name.toLowerCase().includes(q))
    );
  });

  const filteredAttempts = recentAttempts.filter((a) => {
    if (levelFilter !== "all" && a.level !== levelFilter) return false;
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (
      a.title.toLowerCase().includes(q) ||
      (a.studentName && a.studentName.toLowerCase().includes(q)) ||
      (a.studentEmail && a.studentEmail.toLowerCase().includes(q))
    );
  });

  return (
    <div className="space-y-6">
      {/* ── Top Header Bar ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-border/60">
        <div>
          <div className="flex items-center gap-2">
            <Gamepad2 className="h-6 w-6 text-emerald-500" />
            <h2 className="text-xl font-bold tracking-tight">Live Multiplayer MCQ Quiz Arena</h2>
            <Badge
              variant="outline"
              className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30 gap-1.5 py-0.5 text-xs font-semibold"
            >
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
              </span>
              <span>Live Surveillance</span>
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground mt-1">
            Real-time monitoring of Cambridge IGCSE 0455 quiz lobbies, active live race arenas, connected students, and synced diagnostic records.
          </p>
        </div>

        <div className="flex items-center gap-2.5 shrink-0">
          <div className="flex items-center gap-2 bg-muted/50 rounded-lg px-2.5 py-1.5 border border-border/60 text-xs">
            <span className="text-muted-foreground font-medium">Auto-sync (8s):</span>
            <Switch
              checked={autoRefresh}
              onCheckedChange={setAutoRefresh}
              aria-label="Toggle auto-refresh"
            />
          </div>

          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => refetch()}
            disabled={isFetching}
            className="gap-1.5 text-xs font-semibold h-8"
          >
            <RefreshCw className={cn("h-3.5 w-3.5", isFetching && "animate-spin text-primary")} />
            <span>Refresh</span>
          </Button>

          <Button
            asChild
            size="sm"
            className="gap-1.5 text-xs font-bold h-8 bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs"
          >
            <Link to="/mcq-live" target="_blank">
              <Plus className="h-3.5 w-3.5" />
              <span>Launch Quiz Host</span>
              <ExternalLink className="h-3 w-3 opacity-70 ml-0.5" />
            </Link>
          </Button>
        </div>
      </div>

      {/* ── Key Metrics Cards ── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
        <Card className="border-border/70 bg-gradient-to-br from-emerald-500/5 via-transparent to-transparent shadow-xs">
          <CardHeader className="p-4 pb-2">
            <CardDescription className="flex items-center justify-between text-xs font-medium text-emerald-700 dark:text-emerald-400">
              <span>Active Arenas</span>
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
              </span>
            </CardDescription>
            <CardTitle className="text-2xl sm:text-3xl font-black tracking-tight text-foreground">
              {isLoading ? "…" : data?.activeRooms ?? 0}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-0 text-[11px] text-muted-foreground">
            Lobbies &amp; live race games in progress
          </CardContent>
        </Card>

        <Card className="border-border/70 shadow-xs">
          <CardHeader className="p-4 pb-2">
            <CardDescription className="flex items-center justify-between text-xs font-medium">
              <span>Connected Players</span>
              <Users className="h-3.5 w-3.5 text-sky-500" />
            </CardDescription>
            <CardTitle className="text-2xl sm:text-3xl font-black tracking-tight text-foreground">
              {isLoading ? "…" : data?.totalPlayersConnected ?? 0}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-0 text-[11px] text-muted-foreground">
            Students in live rooms right now
          </CardContent>
        </Card>

        <Card className="border-border/70 shadow-xs">
          <CardHeader className="p-4 pb-2">
            <CardDescription className="flex items-center justify-between text-xs font-medium">
              <span>Total Arenas Hosted</span>
              <Trophy className="h-3.5 w-3.5 text-amber-500" />
            </CardDescription>
            <CardTitle className="text-2xl sm:text-3xl font-black tracking-tight text-foreground">
              {isLoading ? "…" : data?.totalRooms ?? 0}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-0 text-[11px] text-muted-foreground">
            All multiplayer rooms created
          </CardContent>
        </Card>

        <Card className="border-border/70 shadow-xs">
          <CardHeader className="p-4 pb-2">
            <CardDescription className="flex items-center justify-between text-xs font-medium">
              <span>Synced Exam Attempts</span>
              <GraduationCap className="h-3.5 w-3.5 text-purple-500" />
            </CardDescription>
            <CardTitle className="text-2xl sm:text-3xl font-black tracking-tight text-foreground">
              {isLoading ? "…" : data?.totalCompletedAttempts ?? 0}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-0 text-[11px] text-muted-foreground">
            Recorded in student profiles &amp; radars
          </CardContent>
        </Card>
      </div>

      {/* ── Filters & View Switcher ── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pt-1">
        <div className="flex items-center gap-1.5 bg-muted/60 p-1 rounded-lg border border-border/60 shrink-0">
          <button
            type="button"
            onClick={() => setActiveTab("rooms")}
            className={cn(
              "flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-bold transition-colors",
              activeTab === "rooms"
                ? "bg-background text-foreground shadow-xs"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            <Gamepad2 className="h-3.5 w-3.5 text-emerald-500" />
            <span>Live &amp; Recent Rooms</span>
            <Badge variant="secondary" className="text-[10px] py-0 px-1.5 ml-0.5">
              {rooms.length}
            </Badge>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("attempts")}
            className={cn(
              "flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-bold transition-colors",
              activeTab === "attempts"
                ? "bg-background text-foreground shadow-xs"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            <Award className="h-3.5 w-3.5 text-amber-500" />
            <span>Completed Attempts</span>
            <Badge variant="secondary" className="text-[10px] py-0 px-1.5 ml-0.5">
              {recentAttempts.length}
            </Badge>
          </button>
        </div>

        <div className="flex flex-wrap items-center gap-2 flex-1 md:justify-end">
          <div className="relative flex-1 max-w-xs">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              type="search"
              placeholder={activeTab === "rooms" ? "Search PIN, host, paper…" : "Search student, paper…"}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-8 h-8 text-xs bg-background"
            />
          </div>

          {activeTab === "rooms" && (
            <Select value={statusFilter} onValueChange={(val: any) => setStatusFilter(val)}>
              <SelectTrigger className="w-[125px] h-8 text-xs bg-background">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="active">Active (Live/Lobby)</SelectItem>
                <SelectItem value="lobby">Lobby Only</SelectItem>
                <SelectItem value="in_progress">Live Race</SelectItem>
                <SelectItem value="ended">Ended</SelectItem>
              </SelectContent>
            </Select>
          )}

          <Select value={levelFilter} onValueChange={(val: any) => setLevelFilter(val)}>
            <SelectTrigger className="w-[110px] h-8 text-xs bg-background">
              <SelectValue placeholder="Level" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Levels</SelectItem>
              <SelectItem value="as">AS Level</SelectItem>
              <SelectItem value="a2">A2 Level</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* ── Main Content Area ── */}
      {isLoading ? (
        <div className="flex flex-col items-center justify-center p-12 space-y-3 rounded-xl border border-dashed border-border bg-card/50">
          <Loader2 className="h-8 w-8 animate-spin text-emerald-500" />
          <p className="text-sm font-semibold text-muted-foreground">Surveilling live quiz arena records…</p>
        </div>
      ) : isError ? (
        <div className="rounded-xl border border-destructive/40 bg-destructive/10 p-6 space-y-3">
          <div className="flex items-center gap-2 text-destructive font-semibold">
            <AlertTriangle className="size-5" />
            <span>Failed to load Live Quiz sessions</span>
          </div>
          <p className="text-sm text-muted-foreground">
            {error instanceof Error ? error.message : "An unexpected server error occurred."}
          </p>
          <Button type="button" size="sm" variant="outline" onClick={() => refetch()} className="gap-2">
            <RefreshCw className="size-3.5" />
            <span>Retry</span>
          </Button>
        </div>
      ) : activeTab === "rooms" ? (
        <div className="space-y-3">
          {filteredRooms.length === 0 ? (
            <div className="flex flex-col items-center justify-center p-12 text-center rounded-xl border border-dashed border-border bg-card/40 space-y-3">
              <Gamepad2 className="h-10 w-10 text-muted-foreground/50" />
              <div className="space-y-1">
                <p className="text-sm font-bold text-foreground">No quiz rooms found</p>
                <p className="text-xs text-muted-foreground max-w-sm">
                  {search
                    ? "Try adjusting your search query or status filter."
                    : "No live or recent quiz rooms have been launched yet. Teachers can start a live quiz from the Live Quiz Arena."}
                </p>
              </div>
              <Button asChild size="sm" variant="outline" className="gap-1.5 text-xs font-bold">
                <Link to="/mcq-live" target="_blank">
                  <Play className="h-3.5 w-3.5 text-emerald-500" />
                  <span>Host First Quiz Room</span>
                </Link>
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-3.5">
              {filteredRooms.map((room) => {
                const isExpanded = expandedPin === room.pin;
                const isLobby = room.status === "lobby";
                const isInProgress = room.status === "in_progress";
                const isEnded = room.status === "ended";

                return (
                  <Card
                    key={room.pin}
                    className={cn(
                      "transition-all duration-150 border-border/80 shadow-xs hover:border-primary/40",
                      isInProgress && "border-emerald-500/40 bg-emerald-500/[0.01]",
                    )}
                  >
                    <div className="p-4 sm:p-5 space-y-3.5">
                      {/* Card Top Row: PIN, badges, actions */}
                      <div className="flex flex-wrap items-center justify-between gap-2.5">
                        <div className="flex flex-wrap items-center gap-2">
                          {/* PIN Box with 1-click copy */}
                          <div className="flex items-center bg-muted/80 border border-border rounded-lg pl-2.5 pr-1.5 py-1 gap-1.5 shadow-2xs">
                            <span className="font-mono text-sm sm:text-base font-black tracking-wider text-foreground">
                              #{room.pin}
                            </span>
                            <Button
                              type="button"
                              size="icon"
                              variant="ghost"
                              onClick={() => handleCopyPin(room.pin)}
                              className="h-6 w-6 text-muted-foreground hover:text-foreground"
                              title="Copy 6-digit PIN"
                            >
                              {copiedPin === room.pin ? (
                                <Check className="h-3.5 w-3.5 text-emerald-500" />
                              ) : (
                                <Copy className="h-3.5 w-3.5" />
                              )}
                            </Button>
                          </div>

                          {/* Status Badge */}
                          {isInProgress ? (
                            <Badge className="bg-emerald-500 text-white font-bold text-xs gap-1.5 py-1 px-2.5 shadow-xs">
                              <span className="relative flex h-2 w-2">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75" />
                                <span className="relative inline-flex rounded-full h-2 w-2 bg-white" />
                              </span>
                              <span>LIVE IN PROGRESS</span>
                            </Badge>
                          ) : isLobby ? (
                            <Badge
                              variant="outline"
                              className="border-amber-500/50 bg-amber-500/10 text-amber-600 dark:text-amber-400 font-bold text-xs gap-1 py-1 px-2.5"
                            >
                              <Clock className="h-3 w-3" />
                              <span>LOBBY WAITING</span>
                            </Badge>
                          ) : (
                            <Badge
                              variant="outline"
                              className="border-border text-muted-foreground font-semibold text-xs py-1 px-2.5"
                            >
                              <span>ENDED</span>
                            </Badge>
                          )}

                          {/* Mode Badge */}
                          <Badge
                            variant="secondary"
                            className="font-semibold text-xs gap-1 py-1"
                          >
                            {room.gameMode === "live_race" ? (
                              <>
                                <Zap className="h-3 w-3 text-amber-500" />
                                <span>Live Race (Blooket Mode)</span>
                              </>
                            ) : (
                              <>
                                <Clock className="h-3 w-3 text-sky-500" />
                                <span>Exam Sprint</span>
                              </>
                            )}
                          </Badge>

                          {/* Level Badge */}
                          <Badge
                            variant="outline"
                            className="font-bold text-xs uppercase font-mono py-1"
                          >
                            Cambridge {room.level.toUpperCase()}
                          </Badge>
                        </div>

                        {/* Top Action buttons */}
                        <div className="flex items-center gap-1.5 shrink-0 ml-auto">
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            onClick={() => handleCopyLink(room.pin)}
                            className="h-8 text-xs font-semibold gap-1.5"
                            title="Copy student invite link"
                          >
                            <Copy className="h-3.5 w-3.5" />
                            <span className="hidden sm:inline">Invite Link</span>
                          </Button>

                          <Button
                            asChild
                            size="sm"
                            className="h-8 text-xs font-bold gap-1.5 bg-primary text-primary-foreground"
                            title="Spectate Host Dashboard"
                          >
                            <Link to="/quiz/$pin" params={{ pin: room.pin }} search={{ mode: "host" } as any} target="_blank">
                              <ExternalLink className="h-3.5 w-3.5" />
                              <span>Spectate</span>
                            </Link>
                          </Button>

                          <Button
                            asChild
                            size="sm"
                            variant="secondary"
                            className="h-8 text-xs font-bold gap-1.5"
                            title="Join and play this quiz as a participant"
                          >
                            <Link to="/quiz/$pin" params={{ pin: room.pin }} search={{ mode: "player" } as any} target="_blank">
                              <Gamepad2 className="h-3.5 w-3.5" />
                              <span className="hidden sm:inline">Play</span>
                            </Link>
                          </Button>

                          {!isEnded && (
                            <Button
                              type="button"
                              size="sm"
                              variant="outline"
                              onClick={() => setRoomToEnd(room)}
                              className="h-8 text-xs font-bold text-amber-600 dark:text-amber-400 border-amber-500/30 hover:bg-amber-500/10 gap-1.5"
                              title="Force end quiz and show podium"
                            >
                              <StopCircle className="h-3.5 w-3.5" />
                              <span className="hidden sm:inline">End Game</span>
                            </Button>
                          )}

                          <Button
                            type="button"
                            size="icon"
                            variant="ghost"
                            onClick={() => setRoomToDelete(room)}
                            className="h-8 w-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                            title="Delete room"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>

                      {/* Paper Title & Host info */}
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pt-1 border-t border-border/40 text-xs">
                        <div className="space-y-0.5">
                          <p className="font-bold text-sm text-foreground">
                            {room.title || room.paperTitle}
                          </p>
                          <div className="flex flex-wrap items-center gap-3 text-muted-foreground">
                            <span className="flex items-center gap-1">
                              <GraduationCap className="h-3.5 w-3.5 text-primary" />
                              <span>Host: <strong className="text-foreground">{room.hostName}</strong></span>
                            </span>
                            <span>•</span>
                            <span className="flex items-center gap-1">
                              <Layers className="h-3.5 w-3.5 text-muted-foreground" />
                              <span>{room.questionCount} Questions</span>
                            </span>
                            <span>•</span>
                            <span>Created {formatTimeAgo(room.createdAt)}</span>
                          </div>
                        </div>

                        {/* Leaderboard highlight */}
                        <div className="flex items-center gap-3 bg-muted/40 rounded-lg px-3 py-1.5 border border-border/50 shrink-0">
                          <div className="flex items-center gap-1.5">
                            <Users className="h-3.5 w-3.5 text-sky-500" />
                            <span className="font-bold text-foreground">
                              {room.playerCount} {room.playerCount === 1 ? "Student" : "Students"}
                            </span>
                          </div>
                          {room.topScorer && (
                            <>
                              <span className="text-border">|</span>
                              <div className="flex items-center gap-1.5 text-amber-600 dark:text-amber-400 font-bold">
                                <Trophy className="h-3.5 w-3.5" />
                                <span>Leader: {room.topScorer} ({room.topScore} pts)</span>
                              </div>
                            </>
                          )}
                        </div>
                      </div>

                      {/* Expandable Player Roster Accordion */}
                      <div>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => setExpandedPin(isExpanded ? null : room.pin)}
                          className="h-7 text-xs font-bold gap-1.5 text-muted-foreground hover:text-foreground p-0 hover:bg-transparent"
                        >
                          {isExpanded ? (
                            <ChevronDown className="h-3.5 w-3.5 text-primary" />
                          ) : (
                            <ChevronRight className="h-3.5 w-3.5 text-primary" />
                          )}
                          <span>
                            {isExpanded
                              ? "Hide Connected Students Roster"
                              : `View Connected Students Roster (${room.players.length})`}
                          </span>
                        </Button>

                        {isExpanded && (
                          <div className="mt-3 rounded-lg border border-border/80 bg-muted/20 p-3 space-y-2">
                            {room.players.length === 0 ? (
                              <p className="text-xs text-muted-foreground italic text-center py-2">
                                No students have joined this room yet. Share the PIN #{room.pin} with students.
                              </p>
                            ) : (
                              <div className="overflow-x-auto">
                                <table className="w-full text-xs text-left">
                                  <thead>
                                    <tr className="border-b border-border/60 text-muted-foreground">
                                      <th className="py-1.5 px-2 font-semibold">Rank</th>
                                      <th className="py-1.5 px-2 font-semibold">Student</th>
                                      <th className="py-1.5 px-2 font-semibold text-right">Score (pts)</th>
                                      <th className="py-1.5 px-2 font-semibold text-center">Answered</th>
                                      <th className="py-1.5 px-2 font-semibold text-center">Correct</th>
                                      <th className="py-1.5 px-2 font-semibold text-center">Streak</th>
                                      <th className="py-1.5 px-2 font-semibold text-right">Status</th>
                                    </tr>
                                  </thead>
                                  <tbody className="divide-y divide-border/40">
                                    {room.players.map((player, idx) => (
                                      <tr key={player.id} className="hover:bg-muted/40 transition-colors">
                                        <td className="py-2 px-2 font-mono font-bold text-muted-foreground">
                                          #{idx + 1}
                                        </td>
                                        <td className="py-2 px-2 font-bold text-foreground">
                                          <div className="flex items-center gap-1.5">
                                            <span className="text-base">{player.avatar}</span>
                                            <span>{player.name}</span>
                                            {player.userId && (
                                              <Badge variant="outline" className="text-[9px] py-0 px-1 border-sky-500/30 text-sky-600 dark:text-sky-400">
                                                Verified Student
                                              </Badge>
                                            )}
                                          </div>
                                        </td>
                                        <td className="py-2 px-2 font-mono font-black text-right text-emerald-600 dark:text-emerald-400">
                                          {player.score.toLocaleString()}
                                        </td>
                                        <td className="py-2 px-2 text-center font-mono">
                                          {player.answeredCount} / {room.questionCount}
                                        </td>
                                        <td className="py-2 px-2 text-center font-mono text-emerald-600 dark:text-emerald-400 font-bold">
                                          {player.correctCount}
                                        </td>
                                        <td className="py-2 px-2 text-center">
                                          {player.currentStreak > 0 ? (
                                            <span className="inline-flex items-center gap-0.5 text-amber-600 dark:text-amber-400 font-bold">
                                              <Flame className="h-3 w-3 fill-amber-500 text-amber-500" />
                                              {player.currentStreak}
                                            </span>
                                          ) : (
                                            <span className="text-muted-foreground">—</span>
                                          )}
                                        </td>
                                        <td className="py-2 px-2 text-right">
                                          {player.finished ? (
                                            <Badge variant="outline" className="text-[10px] bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30">
                                              Finished
                                            </Badge>
                                          ) : (
                                            <Badge variant="outline" className="text-[10px] bg-sky-500/10 text-sky-600 dark:text-sky-400 border-sky-500/30">
                                              Playing
                                            </Badge>
                                          )}
                                        </td>
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      ) : (
        /* ── Completed Attempts Tab ── */
        <div className="space-y-3">
          {filteredAttempts.length === 0 ? (
            <div className="flex flex-col items-center justify-center p-12 text-center rounded-xl border border-dashed border-border bg-card/40 space-y-2">
              <Award className="h-10 w-10 text-muted-foreground/50" />
              <p className="text-sm font-bold text-foreground">No completed live quiz attempts recorded</p>
              <p className="text-xs text-muted-foreground max-w-sm">
                When students finish a live multiplayer quiz session, their verified scores, mark scheme accuracy, and topic radars are automatically archived here.
              </p>
            </div>
          ) : (
            <div className="rounded-xl border border-border/80 bg-card shadow-xs overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left">
                  <thead>
                    <tr className="bg-muted/40 border-b border-border/70 text-muted-foreground font-semibold">
                      <th className="py-2.5 px-3">Student Name</th>
                      <th className="py-2.5 px-3">Paper / Quiz Title</th>
                      <th className="py-2.5 px-3 text-center">Level</th>
                      <th className="py-2.5 px-3 text-center">Score &amp; Accuracy</th>
                      <th className="py-2.5 px-3 text-right">Completed At</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/50">
                    {filteredAttempts.map((attempt) => {
                      const isHigh = attempt.percentage >= 80;
                      const isMid = attempt.percentage >= 60 && attempt.percentage < 80;

                      return (
                        <tr key={attempt.id} className="hover:bg-muted/30 transition-colors">
                          <td className="py-2.5 px-3">
                            <div className="font-bold text-foreground">{attempt.studentName}</div>
                            {attempt.studentEmail && (
                              <div className="text-[11px] text-muted-foreground">{attempt.studentEmail}</div>
                            )}
                          </td>
                          <td className="py-2.5 px-3">
                            <span className="font-semibold text-foreground">{attempt.title}</span>
                          </td>
                          <td className="py-2.5 px-3 text-center">
                            <Badge variant="outline" className="font-mono text-[10px] uppercase">
                              {attempt.level || "AS"}
                            </Badge>
                          </td>
                          <td className="py-2.5 px-3 text-center">
                            <div className="inline-flex items-center gap-1.5">
                              <Badge
                                variant="outline"
                                className={cn(
                                  "font-mono font-bold text-xs py-0.5 px-2",
                                  isHigh && "border-emerald-500/40 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
                                  isMid && "border-amber-500/40 bg-amber-500/10 text-amber-700 dark:text-amber-300",
                                  !isHigh && !isMid && "border-rose-500/40 bg-rose-500/10 text-rose-700 dark:text-rose-300",
                                )}
                              >
                                {attempt.score} / {attempt.total} ({attempt.percentage}%)
                              </Badge>
                            </div>
                          </td>
                          <td className="py-2.5 px-3 text-right font-mono text-muted-foreground text-[11px]">
                            {formatTimeAgo(attempt.completedAt)}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── Dialogs: End Room Confirmation ── */}
      <AlertDialog open={Boolean(roomToEnd)} onOpenChange={(open) => !open && setRoomToEnd(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <StopCircle className="h-5 w-5 text-amber-500" />
              <span>Force End Room #{roomToEnd?.pin}?</span>
            </AlertDialogTitle>
            <AlertDialogDescription className="space-y-2 text-xs leading-relaxed">
              <p>
                Ending this live quiz will stop gameplay for all {roomToEnd?.playerCount} connected students and reveal the final podium and mark scheme answers.
              </p>
              <p className="font-bold text-foreground">
                Quiz: {roomToEnd?.title || roomToEnd?.paperTitle} (Host: {roomToEnd?.hostName})
              </p>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={endMutation.isPending}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => roomToEnd && endMutation.mutate(roomToEnd.pin)}
              disabled={endMutation.isPending}
              className="bg-amber-600 hover:bg-amber-700 text-white font-bold"
            >
              {endMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "End Quiz Now"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* ── Dialogs: Delete Room Confirmation ── */}
      <AlertDialog open={Boolean(roomToDelete)} onOpenChange={(open) => !open && setRoomToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-destructive">
              <Trash2 className="h-5 w-5" />
              <span>Delete Quiz Room #{roomToDelete?.pin}?</span>
            </AlertDialogTitle>
            <AlertDialogDescription className="space-y-2 text-xs leading-relaxed">
              <p>
                Are you sure you want to permanently delete this room and all live student state? Connected students will be disconnected from the lobby.
              </p>
              <p className="font-bold text-foreground">
                Quiz: {roomToDelete?.title || roomToDelete?.paperTitle} (Host: {roomToDelete?.hostName})
              </p>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleteMutation.isPending}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => roomToDelete && deleteMutation.mutate(roomToDelete.pin)}
              disabled={deleteMutation.isPending}
              className="bg-destructive hover:bg-destructive/90 text-destructive-foreground font-bold"
            >
              {deleteMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Delete Room"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
