import {
  Award,
  CheckCircle2,
  Crown,
  Download,
  Flame,
  Medal,
  Target,
  Trophy,
  Users,
  XCircle,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  buildQuizResultsCsv,
  type PublicMcqQuizMeta,
  type QuestionStatEntry,
  type QuizLetter,
  type QuizPlayer,
} from "@/lib/mcq-quiz.types";
import { cn } from "@/lib/utils";

/** Celebratory Blooket/Quizizz style 1st / 2nd / 3rd place podium. */
export function QuizWinnerPodium({
  players,
  totalQuestions,
  highlightPlayerId,
}: {
  players: QuizPlayer[];
  totalQuestions: number;
  highlightPlayerId?: string | null;
}) {
  const first = players[0];
  const second = players[1];
  const third = players[2];

  if (players.length === 0) {
    return (
      <Card className="border-dashed">
        <CardContent className="py-10 text-center text-sm text-muted-foreground">
          No players completed this quiz yet.
        </CardContent>
      </Card>
    );
  }

  const podiumSlots = [
    {
      player: second,
      rank: 2,
      barHeight: "h-24 sm:h-28",
      ringClass: "border-slate-400/70 bg-slate-500/10",
      barClass: "from-slate-300 to-slate-400 dark:from-slate-600 dark:to-slate-700 text-slate-900 dark:text-white",
      badgeText: "2nd",
      icon: Medal,
      iconColor: "text-slate-400",
    },
    {
      player: first,
      rank: 1,
      barHeight: "h-32 sm:h-40",
      ringClass: "border-amber-400 bg-amber-500/15 shadow-lg shadow-amber-500/15",
      barClass: "from-amber-400 to-amber-500 dark:from-amber-500 dark:to-amber-600 text-amber-950",
      badgeText: "1st",
      icon: Crown,
      iconColor: "text-amber-500",
    },
    {
      player: third,
      rank: 3,
      barHeight: "h-20 sm:h-24",
      ringClass: "border-orange-500/60 bg-orange-500/10",
      barClass: "from-orange-300 to-orange-400 dark:from-orange-700 dark:to-orange-800 text-orange-950 dark:text-white",
      badgeText: "3rd",
      icon: Award,
      iconColor: "text-orange-500",
    },
  ];

  return (
    <div className="rounded-2xl border-2 border-amber-500/30 bg-gradient-to-b from-amber-500/[0.08] via-background to-background p-5 sm:p-7">
      <div className="text-center space-y-1 mb-6">
        <div className="inline-flex items-center gap-1.5 rounded-full bg-amber-500/15 px-3 py-0.5 text-[11px] font-extrabold uppercase tracking-wider text-amber-700 dark:text-amber-300">
          <Trophy className="h-3.5 w-3.5" />
          Winners Podium
        </div>
        <h2 className="text-xl sm:text-2xl font-black tracking-tight text-foreground">
          Top Performers
        </h2>
      </div>

      <div className="grid grid-cols-3 items-end gap-2 sm:gap-4 max-w-xl mx-auto">
        {podiumSlots.map((slot) => {
          const p = slot.player;
          if (!p) {
            return <div key={slot.rank} />;
          }
          const Icon = slot.icon;
          const acc = totalQuestions > 0 ? Math.round((p.correctCount / totalQuestions) * 100) : 0;
          const isMe = highlightPlayerId && p.id === highlightPlayerId;

          return (
            <div key={slot.rank} className="flex flex-col items-center">
              <div className="flex flex-col items-center text-center mb-2">
                <Icon className={cn("h-5 w-5 sm:h-6 sm:w-6 mb-1", slot.iconColor)} />
                <div
                  className={cn(
                    "flex h-12 w-12 sm:h-16 sm:w-16 items-center justify-center rounded-2xl border-2 text-2xl sm:text-3xl",
                    slot.ringClass,
                    isMe && "ring-2 ring-primary ring-offset-2 ring-offset-background",
                  )}
                >
                  {p.avatar}
                </div>
                <p className="mt-1.5 text-xs sm:text-sm font-extrabold text-foreground max-w-[100px] sm:max-w-[140px] truncate">
                  {p.name}
                  {isMe ? " (You)" : ""}
                </p>
                <p className="font-mono text-xs sm:text-sm font-black text-primary">
                  {p.score.toLocaleString()} pts
                </p>
                <p className="text-[10px] text-muted-foreground">
                  {p.correctCount}/{totalQuestions} ({acc}%)
                </p>
              </div>

              <div
                className={cn(
                  "w-full rounded-t-xl bg-gradient-to-b flex flex-col items-center justify-start pt-3 font-black shadow-inner",
                  slot.barHeight,
                  slot.barClass,
                )}
              >
                <span className="text-lg sm:text-2xl">{slot.badgeText}</span>
                {p.bestStreak >= 2 ? (
                  <span className="mt-1 inline-flex items-center gap-0.5 rounded-full bg-black/15 px-2 py-0.5 text-[10px] font-bold">
                    <Flame className="h-2.5 w-2.5" />
                    {p.bestStreak} max
                  </span>
                ) : null}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/** Quizizz-style Live Leaderboard with segmented question progress bar per student. */
export function QuizLiveLeaderboard({
  meta,
  players,
  highlightPlayerId,
  showExportCsv = false,
  compact = false,
}: {
  meta: PublicMcqQuizMeta;
  players: QuizPlayer[];
  highlightPlayerId?: string | null;
  showExportCsv?: boolean;
  compact?: boolean;
}) {
  const totalQ = Math.max(1, meta.questionNumbers.length);

  function handleExportCsv() {
    const csv = buildQuizResultsCsv(meta, players);
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `quiz-${meta.pin}-results.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <Card className="overflow-hidden">
      <CardHeader className="py-3 px-4 border-b border-border/70 bg-muted/20">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <CardTitle className="text-sm font-extrabold flex items-center gap-2">
            <Trophy className="h-4 w-4 text-amber-500" />
            <span>Live Leaderboard</span>
            <Badge variant="secondary" className="text-[10px] font-mono">
              <Users className="h-3 w-3 mr-1" />
              {players.length}
            </Badge>
          </CardTitle>
          {showExportCsv && players.length > 0 ? (
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={handleExportCsv}
              className="h-7 gap-1.5 text-xs"
            >
              <Download className="h-3.5 w-3.5" />
              Export CSV
            </Button>
          ) : null}
        </div>
      </CardHeader>
      <CardContent className={cn("p-3 space-y-2", compact && "max-h-[60vh] overflow-y-auto")}>
        {players.length === 0 ? (
          <p className="py-6 text-center text-xs text-muted-foreground">
            Waiting for players to submit answers…
          </p>
        ) : (
          players.map((p, idx) => {
            const rank = idx + 1;
            const isMe = highlightPlayerId && p.id === highlightPlayerId;
            const accPct = p.answeredCount > 0 ? Math.round((p.correctCount / p.answeredCount) * 100) : 0;

            return (
              <div
                key={p.id}
                className={cn(
                  "rounded-xl border p-3 transition-all",
                  isMe
                    ? "border-primary bg-primary/[0.06] ring-1 ring-primary/30"
                    : rank === 1
                      ? "border-amber-500/40 bg-amber-500/[0.04]"
                      : "border-border/80 bg-background",
                )}
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div
                      className={cn(
                        "flex h-7 w-7 shrink-0 items-center justify-center rounded-lg font-mono text-xs font-black",
                        rank === 1
                          ? "bg-amber-500 text-amber-950"
                          : rank === 2
                            ? "bg-slate-300 text-slate-900 dark:bg-slate-600 dark:text-white"
                            : rank === 3
                              ? "bg-orange-400 text-orange-950"
                              : "bg-muted text-muted-foreground",
                      )}
                    >
                      #{rank}
                    </div>
                    <span className="text-xl shrink-0">{p.avatar}</span>
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <p className="text-xs sm:text-sm font-bold text-foreground truncate">
                          {p.name}
                        </p>
                        {isMe ? (
                          <Badge className="text-[9px] py-0 px-1.5 h-4">You</Badge>
                        ) : null}
                        {p.finished ? (
                          <Badge
                            variant="outline"
                            className="text-[9px] py-0 px-1.5 h-4 border-emerald-500/40 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
                          >
                            Done
                          </Badge>
                        ) : null}
                      </div>
                      <p className="text-[10px] text-muted-foreground">
                        {p.answeredCount}/{totalQ} answered · {p.correctCount} right ({accPct}%)
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0 text-right">
                    {p.currentStreak >= 2 ? (
                      <Badge
                        variant="outline"
                        className="gap-0.5 border-amber-500/40 bg-amber-500/10 text-amber-700 dark:text-amber-300 text-[10px] font-bold"
                      >
                        <Flame className="h-3 w-3" />
                        {p.currentStreak}
                      </Badge>
                    ) : null}
                    <div>
                      <p className="font-mono text-sm sm:text-base font-black text-foreground">
                        {p.score.toLocaleString()}
                      </p>
                      <p className="text-[9px] uppercase tracking-wider text-muted-foreground font-semibold">
                        pts
                      </p>
                    </div>
                  </div>
                </div>

                {/* Quizizz-style per-question green/red mini progress segments */}
                {!compact ? (
                  <div className="mt-2.5 flex items-center gap-0.5">
                    {meta.questionNumbers.map((qNum) => {
                      const rec = p.answers?.[qNum];
                      return (
                        <div
                          key={qNum}
                          title={
                            rec
                              ? `Q${qNum}: ${rec.correct ? "Correct" : "Wrong"} (Picked ${rec.selected})`
                              : `Q${qNum}: Not answered yet`
                          }
                          className={cn(
                            "h-2 flex-1 rounded-xs transition-colors",
                            rec
                              ? rec.correct
                                ? "bg-emerald-500"
                                : "bg-rose-500"
                              : "bg-muted",
                          )}
                        />
                      );
                    })}
                  </div>
                ) : null}
              </div>
            );
          })
        )}
      </CardContent>
    </Card>
  );
}

/** Host Question-by-Question Accuracy Heatmap & Distractor Distribution. */
export function QuizQuestionHeatmap({
  questionNumbers,
  questionStats,
}: {
  questionNumbers: number[];
  questionStats: Record<number, QuestionStatEntry>;
}) {
  const sortedByDifficulty = [...questionNumbers]
    .map((qNum) => {
      const s = questionStats[qNum] ?? {
        attempted: 0,
        correct: 0,
        optionCounts: { A: 0, B: 0, C: 0, D: 0 },
      };
      const pct = s.attempted > 0 ? Math.round((s.correct / s.attempted) * 100) : null;
      return { qNum, ...s, pct };
    })
    .filter((item) => item.attempted > 0)
    .sort((a, b) => (a.pct ?? 100) - (b.pct ?? 100));

  const toughest = sortedByDifficulty.filter((q) => (q.pct ?? 100) < 65).slice(0, 5);

  return (
    <div className="space-y-4">
      {toughest.length > 0 ? (
        <Card className="border-rose-500/30 bg-rose-500/[0.04]">
          <CardHeader className="py-3 px-4 border-b border-rose-500/20">
            <CardTitle className="text-xs font-extrabold text-rose-700 dark:text-rose-300 flex items-center gap-1.5 uppercase tracking-wider">
              <Target className="h-3.5 w-3.5" />
              Toughest Questions to Review on the Board
            </CardTitle>
          </CardHeader>
          <CardContent className="p-3 flex flex-wrap gap-2">
            {toughest.map((q) => (
              <div
                key={q.qNum}
                className="inline-flex items-center gap-2 rounded-lg border border-rose-500/30 bg-background px-3 py-1.5 text-xs"
              >
                <span className="font-mono font-black text-foreground">Q{q.qNum}</span>
                <span className="font-bold text-rose-600 dark:text-rose-400">{q.pct}% right</span>
                <span className="text-[10px] text-muted-foreground">
                  ({q.correct}/{q.attempted})
                </span>
              </div>
            ))}
          </CardContent>
        </Card>
      ) : null}

      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2.5">
        {questionNumbers.map((qNum) => {
          const s = questionStats[qNum] ?? {
            attempted: 0,
            correct: 0,
            optionCounts: { A: 0, B: 0, C: 0, D: 0 },
          };
          const pct = s.attempted > 0 ? Math.round((s.correct / s.attempted) * 100) : null;
          const borderColor =
            pct === null
              ? "border-border"
              : pct >= 75
                ? "border-emerald-500/40 bg-emerald-500/[0.04]"
                : pct >= 50
                  ? "border-amber-500/40 bg-amber-500/[0.04]"
                  : "border-rose-500/40 bg-rose-500/[0.05]";

          return (
            <div key={qNum} className={cn("rounded-xl border p-3 space-y-2", borderColor)}>
              <div className="flex items-center justify-between gap-1">
                <span className="font-mono text-xs font-black text-foreground">Q{qNum}</span>
                {pct !== null ? (
                  <span
                    className={cn(
                      "inline-flex items-center gap-0.5 text-xs font-extrabold",
                      pct >= 75
                        ? "text-emerald-600 dark:text-emerald-400"
                        : pct >= 50
                          ? "text-amber-600 dark:text-amber-400"
                          : "text-rose-600 dark:text-rose-400",
                    )}
                  >
                    {pct >= 60 ? (
                      <CheckCircle2 className="h-3 w-3" />
                    ) : (
                      <XCircle className="h-3 w-3" />
                    )}
                    {pct}%
                  </span>
                ) : (
                  <span className="text-[10px] text-muted-foreground">—</span>
                )}
              </div>

              <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden">
                <div
                  className={cn(
                    "h-full transition-all",
                    pct === null
                      ? "w-0"
                      : pct >= 75
                        ? "bg-emerald-500"
                        : pct >= 50
                          ? "bg-amber-500"
                          : "bg-rose-500",
                  )}
                  style={{ width: `${pct ?? 0}%` }}
                />
              </div>

              <div className="grid grid-cols-4 gap-1 text-center text-[10px] font-mono">
                {(["A", "B", "C", "D"] as QuizLetter[]).map((letter) => (
                  <div
                    key={letter}
                    className="rounded bg-background/80 border border-border/50 py-0.5"
                    title={`${s.optionCounts[letter]} picked ${letter}`}
                  >
                    <span className="text-muted-foreground">{letter}:</span>
                    <span className="font-bold text-foreground">{s.optionCounts[letter]}</span>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
