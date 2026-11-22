import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Clock, History, Loader2, Trash2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

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
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { deleteLiveExaminerSession, listLiveExaminerSessions } from "@/lib/live-examiner.functions";

export type LiveExaminerSessionSummary = {
  id: string;
  level: "as" | "a2";
  topic: string;
  question: string;
  maxMark: number;
  wordCount: number;
  updatedAt: string;
};

function formatWhen(iso: string): string {
  const date = new Date(iso);
  const now = new Date();
  const sameDay = date.toDateString() === now.toDateString();
  if (sameDay) {
    return date.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
  }
  return date.toLocaleDateString(undefined, { day: "numeric", month: "short" });
}

/**
 * Past-essay history for Live Examiner — every question the student has
 * ever started here, newest first, click to resume exactly where they left
 * off. Same idea as a chat app's conversation history sidebar, applied to
 * writing sessions.
 */
export function LiveExaminerHistoryPanel({
  onResume,
}: {
  onResume: (entry: LiveExaminerSessionSummary) => void;
}) {
  const queryClient = useQueryClient();
  const fetchSessions = useServerFn(listLiveExaminerSessions);
  const sessionsQuery = useQuery({
    queryKey: ["live-examiner-sessions"],
    queryFn: () => fetchSessions(),
  });

  const removeSession = useServerFn(deleteLiveExaminerSession);
  const [pendingDelete, setPendingDelete] = useState<LiveExaminerSessionSummary | null>(null);
  const deleteMutation = useMutation({
    mutationFn: (id: string) => removeSession({ data: { id } }),
    onSuccess: () => {
      queryClient.setQueryData<LiveExaminerSessionSummary[]>(
        ["live-examiner-sessions"],
        (current) => (current ?? []).filter((entry) => entry.id !== pendingDelete?.id),
      );
      toast.success("Deleted.");
      setPendingDelete(null);
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const sessions = sessionsQuery.data ?? [];

  return (
    <div className="panel flex min-h-0 flex-col">
      <div className="flex items-center gap-2 border-b border-border px-4 py-3.5">
        <History className="size-4 text-muted-foreground" />
        <h2 className="text-sm font-semibold">Your essay history</h2>
        {sessions.length > 0 ? (
          <Badge variant="secondary" className="ml-auto">
            {sessions.length}
          </Badge>
        ) : null}
      </div>

      {sessionsQuery.isLoading ? (
        <div className="space-y-2 p-4">
          <Skeleton className="h-14 w-full" />
          <Skeleton className="h-14 w-full" />
          <Skeleton className="h-14 w-full" />
        </div>
      ) : sessions.length === 0 ? (
        <p className="px-4 py-10 text-center text-sm text-muted-foreground">
          Nothing yet — every question you start writing here will show up in this list, so you can
          always pick up where you left off.
        </p>
      ) : (
        <ScrollArea className="max-h-[28rem]">
          <ul className="divide-y divide-border">
            {sessions.map((entry) => (
              <li key={entry.id} className="group flex items-start gap-2 px-4 py-3">
                <button
                  type="button"
                  onClick={() => onResume(entry)}
                  className="min-w-0 flex-1 text-left"
                >
                  <p className="line-clamp-2 text-sm leading-snug">{entry.question}</p>
                  <div className="mt-1.5 flex flex-wrap items-center gap-1.5 text-[11px] text-muted-foreground">
                    <Badge variant="outline" className="text-[10px]">
                      {entry.level === "a2" ? "A Level" : "AS Level"}
                    </Badge>
                    {entry.topic ? (
                      <Badge variant="outline" className="text-[10px]">
                        {entry.topic}
                      </Badge>
                    ) : null}
                    <span>{entry.maxMark} marks</span>
                    <span>·</span>
                    <span>{entry.wordCount} words</span>
                    <span className="ml-auto flex items-center gap-1">
                      <Clock className="size-3" /> {formatWhen(entry.updatedAt)}
                    </span>
                  </div>
                </button>
                <Button
                  type="button"
                  size="icon"
                  variant="ghost"
                  className="size-7 shrink-0 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100 hover:text-destructive"
                  aria-label="Delete this essay"
                  onClick={() => setPendingDelete(entry)}
                >
                  <Trash2 className="size-3.5" />
                </Button>
              </li>
            ))}
          </ul>
        </ScrollArea>
      )}

      <AlertDialog open={!!pendingDelete} onOpenChange={(open) => !open && setPendingDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this essay?</AlertDialogTitle>
            <AlertDialogDescription>
              This permanently removes "{pendingDelete?.question}" and everything written for it.
              This can't be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleteMutation.isPending}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              disabled={deleteMutation.isPending}
              onClick={() => pendingDelete && deleteMutation.mutate(pendingDelete.id)}
            >
              {deleteMutation.isPending ? (
                <>
                  <Loader2 className="size-4 animate-spin" /> Deleting…
                </>
              ) : (
                "Delete"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
