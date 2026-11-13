import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import {
  MessageSquare,
  RefreshCw,
  Search,
  Send,
  Trash2,
  Mail,
  ExternalLink,
  Calendar,
  User,
  Filter,
  CheckCircle2,
  AlertCircle,
  Sparkles,
} from "lucide-react";
import { toast } from "sonner";

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
import { Skeleton } from "@/components/ui/skeleton";
import {
  fetchFeedbackList,
  deleteFeedbackItem,
  CATEGORY_DISPLAY_LABELS,
  FEEDBACK_CATEGORIES,
  type FeedbackCategory,
  type FeedbackItem,
} from "@/lib/feedback.functions";

interface FeedbackAdminPanelProps {
  onTextUser?: (userId: string) => void;
}

export function FeedbackAdminPanel({ onTextUser }: FeedbackAdminPanelProps = {}) {
  const queryClient = useQueryClient();
  const getFeedback = useServerFn(fetchFeedbackList);
  const deleteFeedback = useServerFn(deleteFeedbackItem);

  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");

  const query = useQuery({
    queryKey: ["admin-user-feedback"],
    queryFn: () => getFeedback(),
    refetchInterval: 15_000,
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteFeedback({ data: { id } }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-user-feedback"] });
      queryClient.invalidateQueries({ queryKey: ["admin-overview"] });
      toast.success("Feedback item dismissed.");
    },
    onError: (err: any) => {
      toast.error(err?.message || "Failed to dismiss item.");
    },
  });

  const items = query.data?.items ?? [];

  const filtered = useMemo(() => {
    return items.filter((item) => {
      if (categoryFilter !== "all" && item.category !== categoryFilter) return false;
      if (!search.trim()) return true;
      const q = search.toLowerCase();
      return (
        item.subject.toLowerCase().includes(q) ||
        item.message.toLowerCase().includes(q) ||
        item.name.toLowerCase().includes(q) ||
        item.email.toLowerCase().includes(q)
      );
    });
  }, [items, search, categoryFilter]);

  const categoryCounts = useMemo(() => {
    const counts: Record<string, number> = { all: items.length };
    for (const item of items) {
      counts[item.category] = (counts[item.category] || 0) + 1;
    }
    return counts;
  }, [items]);

  const getBadgeVariant = (cat: FeedbackCategory) => {
    switch (cat) {
      case "bug":
        return "border-rose-500/30 bg-rose-500/10 text-rose-600 dark:text-rose-400";
      case "feature_request":
        return "border-purple-500/30 bg-purple-500/10 text-purple-600 dark:text-purple-400";
      case "grading_question":
        return "border-amber-500/30 bg-amber-500/10 text-amber-600 dark:text-amber-400";
      case "feedback":
        return "border-blue-500/30 bg-blue-500/10 text-blue-600 dark:text-blue-400";
      default:
        return "border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400";
    }
  };

  return (
    <div className="space-y-6">
      {/* ── Summary & Stats ── */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="bg-card/70 backdrop-blur-sm">
          <CardHeader className="pb-2">
            <CardDescription className="text-xs font-medium">Total Messages</CardDescription>
            <CardTitle className="text-2xl font-bold tracking-tight">{items.length}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground">Direct in-app messages received</p>
          </CardContent>
        </Card>
        <Card className="bg-card/70 backdrop-blur-sm">
          <CardHeader className="pb-2">
            <CardDescription className="text-xs font-medium">Bugs & Technical</CardDescription>
            <CardTitle className="text-2xl font-bold tracking-tight text-rose-500">
              {categoryCounts.bug || 0}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground">Reported student/teacher glitches</p>
          </CardContent>
        </Card>
        <Card className="bg-card/70 backdrop-blur-sm">
          <CardHeader className="pb-2">
            <CardDescription className="text-xs font-medium">Feature Requests</CardDescription>
            <CardTitle className="text-2xl font-bold tracking-tight text-purple-500">
              {categoryCounts.feature_request || 0}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground">User ideas & requested syllabus tools</p>
          </CardContent>
        </Card>
        <Card className="bg-card/70 backdrop-blur-sm">
          <CardHeader className="pb-2">
            <CardDescription className="text-xs font-medium">Grading Questions</CardDescription>
            <CardTitle className="text-2xl font-bold tracking-tight text-amber-500">
              {categoryCounts.grading_question || 0}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground">AO marks & rubric queries</p>
          </CardContent>
        </Card>
      </div>

      {/* ── Toolbar: Search & Filter ── */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-card/60 p-3 rounded-xl border border-border">
        <div className="flex flex-1 items-center gap-2">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-2.5 top-2.5 size-4 text-muted-foreground" />
            <Input
              placeholder="Search by subject, message, or user..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 h-9 text-xs"
            />
          </div>
          <Select value={categoryFilter} onValueChange={setCategoryFilter}>
            <SelectTrigger className="w-[180px] h-9 text-xs">
              <SelectValue placeholder="Category" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all" className="text-xs">
                All Categories ({items.length})
              </SelectItem>
              {FEEDBACK_CATEGORIES.map((cat) => (
                <SelectItem key={cat} value={cat} className="text-xs">
                  {CATEGORY_DISPLAY_LABELS[cat]} ({categoryCounts[cat] || 0})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={() => query.refetch()}
          disabled={query.isFetching}
          className="h-9 gap-1.5 text-xs self-end sm:self-auto shrink-0"
        >
          <RefreshCw className={`size-3.5 ${query.isFetching ? "animate-spin" : ""}`} />
          <span>Refresh</span>
        </Button>
      </div>

      {/* ── Messages List ── */}
      {query.isLoading ? (
        <div className="space-y-3">
          <Skeleton className="h-28 w-full rounded-xl" />
          <Skeleton className="h-28 w-full rounded-xl" />
          <Skeleton className="h-28 w-full rounded-xl" />
        </div>
      ) : filtered.length === 0 ? (
        <Card className="py-12 text-center">
          <CardContent className="space-y-2">
            <div className="size-12 rounded-full bg-muted flex items-center justify-center mx-auto text-muted-foreground">
              <MessageSquare className="size-6" />
            </div>
            <h3 className="text-sm font-semibold">No messages found</h3>
            <p className="text-xs text-muted-foreground max-w-sm mx-auto">
              {search || categoryFilter !== "all"
                ? "Try clearing your search or category filter to view all messages."
                : "No student or teacher has submitted feedback yet. Direct messages submitted via the app will appear here instantly."}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {filtered.map((item) => {
            const formattedDate = new Date(item.createdAt).toLocaleString("en-GB", {
              day: "numeric",
              month: "short",
              year: "numeric",
              hour: "2-digit",
              minute: "2-digit",
            });
            const replyMailto = item.email && item.email !== "unknown" && !item.email.includes("anonymous")
              ? `mailto:${item.email}?subject=Re: ${encodeURIComponent(item.subject)}`
              : null;

            return (
              <Card
                key={item.id}
                className="overflow-hidden border border-border/80 transition-shadow hover:shadow-md"
              >
                <div className="p-4 sm:p-5 space-y-3">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <Badge
                          variant="outline"
                          className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${getBadgeVariant(
                            item.category,
                          )}`}
                        >
                          {item.categoryLabel}
                        </Badge>
                        <span className="text-xs text-muted-foreground flex items-center gap-1">
                          <Calendar className="size-3" />
                          {formattedDate}
                        </span>
                      </div>
                      <h3 className="text-sm font-bold text-foreground pt-0.5">{item.subject}</h3>
                    </div>

                    <div className="flex items-center gap-2">
                      {item.userId && onTextUser && (
                        <Button
                          variant="default"
                          size="sm"
                          onClick={() => onTextUser(item.userId!)}
                          className="h-8 gap-1.5 text-xs font-semibold"
                        >
                          <Send className="size-3" />
                          <span>Text in App</span>
                        </Button>
                      )}
                      {replyMailto && (
                        <Button
                          variant="outline"
                          size="sm"
                          asChild
                          className="h-8 gap-1.5 text-xs text-primary hover:text-primary"
                        >
                          <a href={replyMailto} target="_blank" rel="noopener noreferrer">
                            <Mail className="size-3.5" />
                            <span>Reply via Email</span>
                          </a>
                        </Button>
                      )}
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => deleteMutation.mutate(item.id)}
                        disabled={deleteMutation.isPending}
                        className="h-8 size-8 p-0 text-muted-foreground hover:text-destructive"
                        title="Dismiss feedback"
                      >
                        <Trash2 className="size-3.5" />
                      </Button>
                    </div>
                  </div>

                  <div className="bg-muted/30 border border-border/50 rounded-xl p-3.5 text-xs text-foreground/90 whitespace-pre-wrap leading-relaxed font-sans">
                    {item.message}
                  </div>

                  <div className="flex flex-wrap items-center justify-between text-[11px] text-muted-foreground pt-1 border-t border-border/40 gap-2">
                    <div className="flex items-center gap-2">
                      <span className="flex items-center gap-1 font-medium text-foreground/80">
                        <User className="size-3 text-muted-foreground" />
                        {item.name}
                      </span>
                      <span>·</span>
                      <span className="font-mono text-muted-foreground">{item.email}</span>
                    </div>

                    {item.pageUrl && (
                      <a
                        href={item.pageUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1 text-primary hover:underline"
                      >
                        <span>Submitted from: {item.pageUrl.replace(/^https?:\/\/[^/]+/, "") || "/"}</span>
                        <ExternalLink className="size-2.5" />
                      </a>
                    )}
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
