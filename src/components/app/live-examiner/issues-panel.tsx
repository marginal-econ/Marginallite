import {
  Check,
  CheckCheck,
  History,
  Info,
  ListFilter,
  Sparkles,
  Wand2,
  X,
} from "lucide-react";
import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { IssueV2 } from "@/lib/live-examiner/types";
import type { ActiveIssue, HistoryEntry } from "@/hooks/use-live-examiner-check";
import { cn } from "@/lib/utils";

export type IssuesPanelProps = {
  issues: ActiveIssue[];
  history: HistoryEntry[];
  onAcceptIssue: (id: string) => void;
  onDismissIssue: (id: string) => void;
  onAcceptAllMechanical: () => void;
  onFocusIssue: (id: string) => void;
  className?: string;
};

type GroupKey = "all" | "mechanical" | "ao1" | "ao2" | "ao3";

export function IssuesPanel({
  issues,
  history,
  onAcceptIssue,
  onDismissIssue,
  onAcceptAllMechanical,
  onFocusIssue,
  className,
}: IssuesPanelProps) {
  const [activeGroup, setActiveGroup] = useState<GroupKey>("all");

  const mechanicalIssues = issues.filter((i) =>
    ["spelling", "grammar", "punctuation"].includes(i.category),
  );
  const ao1Issues = issues.filter((i) =>
    ["economics_accuracy", "misconception", "terminology", "missing_definition"].includes(
      i.category,
    ),
  );
  const ao2Issues = issues.filter((i) =>
    ["analysis", "application", "broken_chain", "reasoning_chain", "unsupported_assertion"].includes(
      i.category,
    ),
  );
  const ao3Issues = issues.filter((i) =>
    ["evaluation", "one_sided", "evaluation_without_reason", "no_judgement"].includes(
      i.category,
    ),
  );

  const displayedIssues =
    activeGroup === "all"
      ? issues
      : activeGroup === "mechanical"
        ? mechanicalIssues
        : activeGroup === "ao1"
          ? ao1Issues
          : activeGroup === "ao2"
            ? ao2Issues
            : ao3Issues;

  return (
    <div className={cn("flex flex-col h-full rounded-2xl border border-border/80 bg-card shadow-sm", className)}>
      <Tabs defaultValue="suggestions" className="flex flex-col h-full">
        <div className="flex items-center justify-between border-b border-border/60 px-4 py-2.5">
          <TabsList className="h-8">
            <TabsTrigger value="suggestions" className="text-xs font-semibold gap-1.5 px-3">
              <span>Suggestions</span>
              <Badge variant="secondary" className="px-1.5 py-0 font-mono text-[10px]">
                {issues.length}
              </Badge>
            </TabsTrigger>
            <TabsTrigger value="history" className="text-xs font-semibold gap-1.5 px-3">
              <History className="size-3" />
              <span>History</span>
              <span className="font-mono text-[10px] text-muted-foreground">({history.length})</span>
            </TabsTrigger>
          </TabsList>

          {/* Quick Action: Accept all mechanical fixes */}
          {mechanicalIssues.length > 0 ? (
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-7 text-[11px] gap-1.5 font-semibold text-primary hover:text-primary"
              onClick={onAcceptAllMechanical}
            >
              <CheckCheck className="size-3.5" />
              <span>Accept spelling & grammar ({mechanicalIssues.length})</span>
            </Button>
          ) : null}
        </div>

        {/* Tab 1: Active Suggestions */}
        <TabsContent value="suggestions" className="flex-1 flex flex-col m-0 p-0 overflow-hidden">
          {/* Sub-group category filters */}
          <div className="flex items-center gap-1 border-b border-border/40 px-4 py-2 text-xs overflow-x-auto">
            <button
              type="button"
              onClick={() => setActiveGroup("all")}
              className={cn(
                "rounded-md px-2 py-0.5 font-medium transition-colors",
                activeGroup === "all" ? "bg-muted font-bold text-foreground" : "text-muted-foreground hover:text-foreground",
              )}
            >
              All ({issues.length})
            </button>
            <button
              type="button"
              onClick={() => setActiveGroup("mechanical")}
              className={cn(
                "rounded-md px-2 py-0.5 font-medium transition-colors",
                activeGroup === "mechanical" ? "bg-muted font-bold text-foreground" : "text-muted-foreground hover:text-foreground",
              )}
            >
              Mechanics ({mechanicalIssues.length})
            </button>
            <button
              type="button"
              onClick={() => setActiveGroup("ao1")}
              className={cn(
                "rounded-md px-2 py-0.5 font-medium transition-colors",
                activeGroup === "ao1" ? "bg-muted font-bold text-foreground" : "text-muted-foreground hover:text-foreground",
              )}
            >
              AO1 ({ao1Issues.length})
            </button>
            <button
              type="button"
              onClick={() => setActiveGroup("ao2")}
              className={cn(
                "rounded-md px-2 py-0.5 font-medium transition-colors",
                activeGroup === "ao2" ? "bg-muted font-bold text-foreground" : "text-muted-foreground hover:text-foreground",
              )}
            >
              AO2 ({ao2Issues.length})
            </button>
            <button
              type="button"
              onClick={() => setActiveGroup("ao3")}
              className={cn(
                "rounded-md px-2 py-0.5 font-medium transition-colors",
                activeGroup === "ao3" ? "bg-muted font-bold text-foreground" : "text-muted-foreground hover:text-foreground",
              )}
            >
              AO3 ({ao3Issues.length})
            </button>
          </div>

          <ScrollArea className="flex-1 p-4">
            {displayedIssues.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center text-muted-foreground">
                <Check className="size-8 text-emerald-500 mb-2" />
                <p className="text-sm font-semibold text-foreground">Clean section</p>
                <p className="text-xs">No active suggestions in this category.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {displayedIssues.map((issue) => (
                  <div
                    key={issue.id}
                    onClick={() => onFocusIssue(issue.id)}
                    className="group relative cursor-pointer rounded-xl border border-border/80 bg-card p-3 shadow-2xs transition-all hover:border-primary/50 hover:shadow-xs"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-1.5">
                        <span
                          className={cn(
                            "size-2 rounded-full",
                            issue.severity === "high"
                              ? "bg-rose-500"
                              : issue.severity === "medium"
                                ? "bg-amber-500"
                                : "bg-blue-500",
                          )}
                        />
                        <span className="text-xs font-bold capitalize text-foreground">
                          {issue.category.replace(/_/g, " ")}
                        </span>
                      </div>

                      <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="size-6 text-muted-foreground hover:text-foreground"
                          onClick={() => onDismissIssue(issue.id)}
                          title="Dismiss"
                        >
                          <X className="size-3.5" />
                        </Button>
                        {issue.suggestion ? (
                          <Button
                            type="button"
                            size="sm"
                            className="h-6 gap-1 px-2 text-[11px] font-semibold bg-primary text-primary-foreground"
                            onClick={() => onAcceptIssue(issue.id)}
                          >
                            <Check className="size-3" />
                            Accept
                          </Button>
                        ) : null}
                      </div>
                    </div>

                    <p className="mt-1 text-xs leading-relaxed text-foreground/90">
                      {issue.explanation}
                    </p>

                    {issue.suggestion ? (
                      <div className="mt-2 flex items-center gap-1.5 text-xs font-mono">
                        <span className="line-through text-rose-500">{issue.original}</span>
                        <span className="text-muted-foreground">→</span>
                        <span className="font-semibold text-emerald-600 dark:text-emerald-400">
                          {issue.suggestion}
                        </span>
                      </div>
                    ) : null}

                    {issue.evidence ? (
                      <p className="mt-2 italic text-[11px] text-muted-foreground bg-muted/30 p-1.5 rounded-md">
                        "{issue.evidence}"
                      </p>
                    ) : null}
                  </div>
                ))}
              </div>
            )}
          </ScrollArea>
        </TabsContent>

        {/* Tab 2: History Log */}
        <TabsContent value="history" className="flex-1 m-0 p-0 overflow-hidden">
          <ScrollArea className="h-full p-4">
            {history.length === 0 ? (
              <div className="py-12 text-center text-xs text-muted-foreground">
                No past revisions yet in this writing session.
              </div>
            ) : (
              <div className="space-y-2">
                {history.map((entry) => (
                  <div
                    key={entry.id}
                    className="flex items-center justify-between gap-2 rounded-lg border border-border/50 bg-muted/20 p-2.5 text-xs"
                  >
                    <div className="min-w-0">
                      <p className="font-medium text-foreground truncate">{entry.original}</p>
                      <p className="text-[11px] text-muted-foreground capitalize">
                        {entry.category.replace(/_/g, " ")} · {entry.status}
                      </p>
                    </div>

                    <Badge
                      variant={
                        entry.status === "accepted"
                          ? "default"
                          : entry.status === "dismissed"
                            ? "outline"
                            : "secondary"
                      }
                      className="text-[10px] capitalize shrink-0"
                    >
                      {entry.status}
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </ScrollArea>
        </TabsContent>
      </Tabs>
    </div>
  );
}
