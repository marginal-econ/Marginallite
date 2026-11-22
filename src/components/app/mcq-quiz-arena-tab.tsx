import { useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import {
  ArrowRight,
  Copy,
  ExternalLink,
  Flame,
  Gamepad2,
  GraduationCap,
  Link2,
  Loader2,
  Play,
  Plus,
  Trash2,
  Trophy,
  Users,
  Zap,
} from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { deleteMcqQuiz, listMyHostedQuizzes } from "@/lib/mcq-quiz.functions";
import { formatQuizPin, normalizeQuizPin } from "@/lib/mcq-quiz.types";
import { cn } from "@/lib/utils";

export function McqQuizArenaTab({
  onOpenHostModal,
}: {
  onOpenHostModal: (sourceType?: "library_paper" | "topical_paper" | "custom_questions") => void;
}) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [joinPin, setJoinPin] = useState("");
  const [deletingPin, setDeletingPin] = useState<string | null>(null);

  const listQuizzesFn = useServerFn(listMyHostedQuizzes);
  const deleteQuizFn = useServerFn(deleteMcqQuiz);

  const hostedQuery = useQuery({
    queryKey: ["my-hosted-mcq-quizzes"],
    queryFn: () => listQuizzesFn(),
    refetchInterval: 10_000,
  });

  function handleJoinSubmit(e: React.FormEvent) {
    e.preventDefault();
    const clean = normalizeQuizPin(joinPin);
    if (clean.length !== 6) {
      toast.error("Enter the full 6-digit quiz PIN (e.g. 849 201).");
      return;
    }
    navigate({ to: "/quiz/$pin", params: { pin: clean } });
  }

  async function handleCopyLink(pin: string) {
    const url = `${window.location.origin}/quiz/${pin}`;
    try {
      await navigator.clipboard.writeText(url);
      toast.success(`Quiz link copied! PIN: ${formatQuizPin(pin)}`);
    } catch {
      toast.info(`Share link: ${url}`);
    }
  }

  async function handleDelete(pin: string) {
    setDeletingPin(pin);
    try {
      await deleteQuizFn({ data: { pin } });
      await queryClient.invalidateQueries({ queryKey: ["my-hosted-mcq-quizzes"] });
      toast.success("Quiz room removed.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not delete quiz.");
    } finally {
      setDeletingPin(null);
    }
  }

  const quizzes = hostedQuery.data?.quizzes ?? [];

  return (
    <div className="space-y-6">
      {/* Split Hero: Host vs Join */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Host a Live Quiz Card */}
        <Card className="relative overflow-hidden border-2 border-primary/35 bg-gradient-to-br from-primary/[0.06] via-background to-amber-500/[0.05] shadow-sm">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between gap-2">
              <Badge className="gap-1 bg-primary text-primary-foreground font-bold text-[10px] uppercase tracking-wider">
                <Gamepad2 className="h-3 w-3" />
                Teacher &amp; Host Mode
              </Badge>
              <Badge variant="outline" className="text-[10px] font-semibold">
                Blooket / Quizizz Style
              </Badge>
            </div>
            <CardTitle className="text-xl font-extrabold tracking-tight pt-1">
              Host a Whole-Paper Live Quiz
            </CardTitle>
            <CardDescription className="text-xs leading-relaxed">
              Turn any Cambridge IGCSE 0455 past paper, topical paper, or your own custom MCQs into a live multiplayer battle. Share one link or 6-digit PIN and watch the live leaderboard &amp; class accuracy heatmap update in real time.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-3 gap-2 text-center text-[11px]">
              <div className="rounded-lg border border-border/70 bg-background/80 p-2">
                <p className="font-bold text-foreground">Real PDFs</p>
                <p className="text-muted-foreground text-[10px]">Diagrams &amp; tables</p>
              </div>
              <div className="rounded-lg border border-border/70 bg-background/80 p-2">
                <p className="font-bold text-foreground">No Login Wall</p>
                <p className="text-muted-foreground text-[10px]">Join via link / PIN</p>
              </div>
              <div className="rounded-lg border border-border/70 bg-background/80 p-2">
                <p className="font-bold text-foreground">Live Podium</p>
                <p className="text-muted-foreground text-[10px]">Streaks + CSV export</p>
              </div>
            </div>

            <div className="flex flex-wrap gap-2 pt-1">
              <Button
                type="button"
                onClick={() => onOpenHostModal("library_paper")}
                className="flex-1 gap-2 font-bold h-10 shadow-xs"
              >
                <Plus className="h-4 w-4" />
                Create Live Quiz Link
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenHostModal("custom_questions")}
                className="gap-1.5 h-10 text-xs font-semibold"
              >
                Build Custom Paper
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Join with PIN Card */}
        <Card className="relative overflow-hidden border-2 border-emerald-500/35 bg-gradient-to-br from-emerald-500/[0.06] via-background to-sky-500/[0.05] shadow-sm">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between gap-2">
              <Badge
                variant="outline"
                className="gap-1 border-emerald-500/40 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 font-bold text-[10px] uppercase tracking-wider"
              >
                <Users className="h-3 w-3" />
                Student Join
              </Badge>
              <Badge variant="outline" className="text-[10px] font-mono">
                6-Digit PIN
              </Badge>
            </div>
            <CardTitle className="text-xl font-extrabold tracking-tight pt-1">
              Join a Class Quiz
            </CardTitle>
            <CardDescription className="text-xs leading-relaxed">
              Got a 6-digit Game PIN from your teacher or classmate? Enter it below, pick your avatar, and race through the whole paper together!
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleJoinSubmit} className="space-y-3">
              <div className="flex items-center gap-2">
                <Input
                  value={joinPin}
                  onChange={(e) => {
                    const digits = normalizeQuizPin(e.target.value);
                    setJoinPin(digits.length > 3 ? `${digits.slice(0, 3)} ${digits.slice(3)}` : digits);
                  }}
                  placeholder="000 000"
                  inputMode="numeric"
                  maxLength={7}
                  className="h-12 text-center font-mono text-2xl font-black tracking-[0.25em] bg-background border-2 focus-visible:ring-emerald-500"
                />
              </div>
              <Button
                type="submit"
                disabled={normalizeQuizPin(joinPin).length !== 6}
                className="w-full h-10 gap-2 font-bold bg-emerald-600 hover:bg-emerald-700 text-white"
              >
                <Play className="h-4 w-4 fill-current" />
                Join Live Quiz
                <ArrowRight className="h-4 w-4" />
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>

      {/* Hosted Quizzes List */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <CardTitle className="text-base font-bold flex items-center gap-2">
                <Trophy className="h-4 w-4 text-primary" />
                Your Hosted Live Quizzes
              </CardTitle>
              <CardDescription className="text-xs">
                Reopen a live lobby, track real-time class progress, or copy the invite link anytime.
              </CardDescription>
            </div>
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() => onOpenHostModal("library_paper")}
              className="gap-1.5 text-xs"
            >
              <Plus className="h-3.5 w-3.5" />
              New Quiz Room
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {hostedQuery.isLoading ? (
            <div className="flex items-center justify-center py-8 text-xs text-muted-foreground gap-2">
              <Loader2 className="h-4 w-4 animate-spin" />
              Loading your live quiz rooms…
            </div>
          ) : quizzes.length === 0 ? (
            <div className="rounded-xl border border-dashed border-border py-10 px-4 text-center space-y-2">
              <Gamepad2 className="h-8 w-8 mx-auto text-muted-foreground/60" />
              <p className="text-sm font-semibold text-foreground">No live quizzes hosted yet</p>
              <p className="text-xs text-muted-foreground max-w-md mx-auto">
                Click &ldquo;Create Live Quiz Link&rdquo; above to turn any Cambridge paper or custom question set into a multiplayer game room.
              </p>
            </div>
          ) : (
            <div className="space-y-2.5">
              {quizzes.map((quiz) => {
                const statusBadge =
                  quiz.status === "lobby" ? (
                    <Badge className="bg-amber-500/15 text-amber-700 dark:text-amber-300 border border-amber-500/30 text-[10px]">
                      Waiting in Lobby
                    </Badge>
                  ) : quiz.status === "in_progress" ? (
                    <Badge className="bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30 text-[10px] gap-1">
                      <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                      Live Now
                    </Badge>
                  ) : (
                    <Badge variant="secondary" className="text-[10px]">
                      Ended
                    </Badge>
                  );

                return (
                  <div
                    key={quiz.pin}
                    className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-xl border border-border/80 bg-muted/15 px-4 py-3 hover:border-border transition-colors"
                  >
                    <div className="min-w-0 space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="inline-flex items-center rounded-md bg-foreground text-background px-2 py-0.5 font-mono text-xs font-extrabold tracking-widest">
                          {formatQuizPin(quiz.pin)}
                        </span>
                        {statusBadge}
                        <Badge variant="outline" className="text-[10px] uppercase">
                          {quiz.level} · {quiz.questionNumbers.length}Q
                        </Badge>
                        {quiz.gameMode === "live_race" ? (
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-600 dark:text-amber-400 bg-amber-500/10 px-1.5 py-0.5 rounded-full border border-amber-500/20">
                            <Zap className="h-3 w-3" />
                            Game Arena
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-muted-foreground bg-muted/60 px-1.5 py-0.5 rounded-full border border-border/40">
                            <GraduationCap className="h-3 w-3" />
                            Exam Sprint
                          </span>
                        )}
                      </div>
                      <p className="text-sm font-bold text-foreground truncate">{quiz.title}</p>
                      <p className="text-[11px] text-muted-foreground flex flex-wrap items-center gap-2">
                        <span className="inline-flex items-center gap-1">
                          <Users className="h-3 w-3" />
                          {quiz.playerCount} player{quiz.playerCount === 1 ? "" : "s"}
                        </span>
                        <span>·</span>
                        <span className="truncate">{quiz.paperTitle}</span>
                      </p>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        onClick={() => handleCopyLink(quiz.pin)}
                        className="h-8 gap-1 text-xs"
                        title="Copy student join link"
                      >
                        <Link2 className="h-3.5 w-3.5" />
                        <span className="hidden sm:inline">Copy Link</span>
                        <Copy className="h-3 w-3 sm:hidden" />
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        onClick={() => navigate({ to: "/quiz/$pin", params: { pin: quiz.pin } })}
                        className="h-8 gap-1 text-xs font-semibold"
                      >
                        <span>{quiz.status === "ended" ? "View Results" : "Open Host Room"}</span>
                        <ExternalLink className="h-3 w-3" />
                      </Button>
                      <Button
                        type="button"
                        size="icon"
                        variant="ghost"
                        disabled={deletingPin === quiz.pin}
                        onClick={() => handleDelete(quiz.pin)}
                        className={cn(
                          "h-8 w-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10",
                        )}
                        title="Delete quiz room"
                      >
                        {deletingPin === quiz.pin ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                          <Trash2 className="h-3.5 w-3.5" />
                        )}
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
