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
  CheckCircle2,
  Reply,
  Loader2,
  Sparkles,
  Bug,
  HelpCircle,
  Lightbulb,
} from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
  replyToFeedback,
  CATEGORY_DISPLAY_LABELS,
  FEEDBACK_CATEGORIES,
  type FeedbackCategory,
  type FeedbackItem,
} from "@/lib/feedback.functions";

interface FeedbackAdminPanelProps {
  onTextUser?: (userId: string) => void;
}

const CANNED_REPLIES = [
  {
    label: "Bug Fixed & Deployed",
    icon: Bug,
    text: "Thank you for reporting this issue! We have investigated and resolved the bug. The fix has been deployed and is now live on Marginal. Please refresh your browser and let us know if you run into anything else.",
  },
  {
    label: "Under Investigation",
    icon: HelpCircle,
    text: "Thank you for bringing this to our attention. Our engineering team is currently investigating and reproducing this behavior. We will notify you as soon as an update is pushed.",
  },
  {
    label: "Feature Shipped",
    icon: Lightbulb,
    text: "Great suggestion! We loved this idea and have built it into the platform. You can now access this directly in your workspace. Thank you for helping shape Marginal!",
  },
  {
    label: "Need Details",
    icon: MessageSquare,
    text: "Thank you for reaching out! To help us reproduce and resolve this quickly, could you reply with your device/browser and the exact steps or page URL where you noticed this?",
  },
];

export function FeedbackAdminPanel({ onTextUser }: FeedbackAdminPanelProps = {}) {
  const queryClient = useQueryClient();
  const getFeedback = useServerFn(fetchFeedbackList);
  const deleteFeedback = useServerFn(deleteFeedbackItem);
  const sendReply = useServerFn(replyToFeedback);

  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");

  // Reply Modal State
  const [replyTarget, setReplyTarget] = useState<FeedbackItem | null>(null);
  const [replySubject, setReplySubject] = useState("");
  const [replyMessage, setReplyMessage] = useState("");
  const [sendEmail, setSendEmail] = useState(true);
  const [sendInApp, setSendInApp] = useState(true);

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

  const replyMutation = useMutation({
    mutationFn: (params: {
      feedbackId: string;
      recipientEmail: string;
      recipientName: string;
      recipientUserId?: string | null;
      replySubject: string;
      replyMessage: string;
      originalMessage?: string;
      sendEmail: boolean;
      sendInApp: boolean;
    }) => sendReply({ data: params }),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["admin-user-feedback"] });
      queryClient.invalidateQueries({ queryKey: ["admin-overview"] });
      toast.success(data.message || "Reply sent successfully!");
      setReplyTarget(null);
      setReplyMessage("");
    },
    onError: (err: any) => {
      toast.error(err?.message || "Failed to dispatch reply.");
    },
  });

  const openReplyModal = (item: FeedbackItem) => {
    setReplyTarget(item);
    setReplySubject(`Re: [${item.categoryLabel}] ${item.subject}`);
    setReplyMessage(
      item.replied && item.replyMessage
        ? `\n\n--- Follow-up Note ---\n`
        : `Hi ${item.name},\n\nThank you for reaching out to the Marginal team regarding "${item.subject}".\n\n`
    );
    setSendEmail(Boolean(item.email && !item.email.includes("anonymous")));
    setSendInApp(Boolean(item.userId));
  };

  const handleSendReply = () => {
    if (!replyTarget) return;
    if (!replyMessage.trim()) {
      toast.error("Please enter a reply message.");
      return;
    }
    replyMutation.mutate({
      feedbackId: replyTarget.id,
      recipientEmail: replyTarget.email,
      recipientName: replyTarget.name,
      recipientUserId: replyTarget.userId,
      replySubject: replySubject.trim(),
      replyMessage: replyMessage.trim(),
      originalMessage: replyTarget.message,
      sendEmail,
      sendInApp,
    });
  };

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
            <CardDescription className="text-xs font-medium">Bugs & Glitches</CardDescription>
            <CardTitle className="text-2xl font-bold tracking-tight text-rose-500">
              {categoryCounts.bug || 0}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground">Reported technical issues</p>
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
            <p className="text-xs text-muted-foreground">User ideas & curriculum requests</p>
          </CardContent>
        </Card>
        <Card className="bg-card/70 backdrop-blur-sm">
          <CardHeader className="pb-2">
            <CardDescription className="text-xs font-medium">Resolved / Replied</CardDescription>
            <CardTitle className="text-2xl font-bold tracking-tight text-emerald-500">
              {items.filter((i) => i.replied).length}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground">Answered user inquiries</p>
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
            const formattedReplyDate = item.repliedAt
              ? new Date(item.repliedAt).toLocaleString("en-GB", {
                  day: "numeric",
                  month: "short",
                  hour: "2-digit",
                  minute: "2-digit",
                })
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
                        {item.replied ? (
                          <Badge
                            variant="secondary"
                            className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 flex items-center gap-1"
                          >
                            <CheckCircle2 className="size-3" />
                            Replied
                          </Badge>
                        ) : (
                          <Badge
                            variant="secondary"
                            className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30"
                          >
                            Open
                          </Badge>
                        )}
                        <span className="text-xs text-muted-foreground flex items-center gap-1">
                          <Calendar className="size-3" />
                          {formattedDate}
                        </span>
                      </div>
                      <h3 className="text-sm font-bold text-foreground pt-0.5">{item.subject}</h3>
                    </div>

                    <div className="flex items-center gap-2">
                      {/* Interactive Reply Button */}
                      <Button
                        variant="default"
                        size="sm"
                        onClick={() => openReplyModal(item)}
                        className="h-8 gap-1.5 text-xs font-semibold bg-primary hover:bg-primary/90 text-primary-foreground shadow-xs"
                      >
                        <Reply className="size-3.5" />
                        <span>{item.replied ? "Send Follow-up" : "Reply to User"}</span>
                      </Button>

                      {item.userId && onTextUser && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => onTextUser(item.userId!)}
                          className="h-8 gap-1.5 text-xs font-semibold"
                          title="Open live chat drawer"
                        >
                          <Send className="size-3" />
                          <span>Chat Drawer</span>
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

                  {/* User's Original Message */}
                  <div className="bg-muted/30 border border-border/50 rounded-xl p-3.5 text-xs text-foreground/90 whitespace-pre-wrap leading-relaxed font-sans">
                    {item.message}
                  </div>

                  {/* Admin's Previous Reply Section (if already answered) */}
                  {item.replied && item.replyMessage && (
                    <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-3.5 text-xs text-foreground space-y-1.5">
                      <div className="flex items-center justify-between text-[11px] font-bold text-emerald-600 dark:text-emerald-400">
                        <span className="flex items-center gap-1.5">
                          <CheckCircle2 className="size-3.5" />
                          Marginal Team Reply
                        </span>
                        {formattedReplyDate && <span>{formattedReplyDate}</span>}
                      </div>
                      <p className="whitespace-pre-wrap leading-relaxed text-foreground/90 font-sans">
                        {item.replyMessage}
                      </p>
                    </div>
                  )}

                  {/* User Metadata Footer */}
                  <div className="flex flex-wrap items-center justify-between text-[11px] text-muted-foreground pt-1 border-t border-border/40 gap-2">
                    <div className="flex items-center gap-2">
                      <span className="flex items-center gap-1 font-medium text-foreground/80">
                        <User className="size-3 text-muted-foreground" />
                        {item.name}
                      </span>
                      <span>·</span>
                      <span className="font-mono text-muted-foreground">{item.email}</span>
                      {item.userId && (
                        <Badge variant="outline" className="text-[9px] px-1 py-0 border-primary/30 text-primary">
                          Registered User
                        </Badge>
                      )}
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

      {/* ── Interactive Reply Dialog ── */}
      <Dialog open={Boolean(replyTarget)} onOpenChange={(open) => !open && setReplyTarget(null)}>
        <DialogContent className="sm:max-w-xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base font-bold">
              <Reply className="size-4 text-primary" />
              Reply to {replyTarget?.name || "User"}
            </DialogTitle>
            <DialogDescription className="text-xs">
              Dispatch an official response via email and/or in-app notification.
            </DialogDescription>
          </DialogHeader>

          {replyTarget && (
            <div className="space-y-4 py-2">
              {/* Recipient Details */}
              <div className="rounded-lg bg-muted/40 p-3 text-xs space-y-1 border border-border">
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Recipient:</span>
                  <span className="font-semibold text-foreground">{replyTarget.name} ({replyTarget.email})</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Category:</span>
                  <Badge variant="outline" className="text-[10px] font-bold">
                    {replyTarget.categoryLabel}
                  </Badge>
                </div>
              </div>

              {/* Quick Template Chips */}
              <div className="space-y-1.5">
                <Label className="text-[11px] font-semibold text-muted-foreground">Quick Templates:</Label>
                <div className="flex flex-wrap gap-1.5">
                  {CANNED_REPLIES.map((tpl) => (
                    <Button
                      key={tpl.label}
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setReplyMessage(
                          `Hi ${replyTarget.name},\n\n${tpl.text}\n\nBest regards,\nMarginal Engineering Team`
                        );
                      }}
                      className="h-7 text-[11px] gap-1 px-2.5 bg-card hover:bg-muted font-normal"
                    >
                      <tpl.icon className="size-3 text-primary" />
                      <span>{tpl.label}</span>
                    </Button>
                  ))}
                </div>
              </div>

              {/* Subject */}
              <div className="space-y-1.5">
                <Label htmlFor="reply-subject" className="text-xs font-semibold">
                  Subject
                </Label>
                <Input
                  id="reply-subject"
                  value={replySubject}
                  onChange={(e) => setReplySubject(e.target.value)}
                  className="h-9 text-xs"
                />
              </div>

              {/* Message Body */}
              <div className="space-y-1.5">
                <Label htmlFor="reply-message" className="text-xs font-semibold">
                  Response Message
                </Label>
                <Textarea
                  id="reply-message"
                  rows={6}
                  value={replyMessage}
                  onChange={(e) => setReplyMessage(e.target.value)}
                  placeholder="Type your response here..."
                  className="text-xs leading-relaxed font-sans"
                />
              </div>

              {/* Dispatch Channel Options */}
              <div className="flex flex-wrap gap-4 pt-1">
                <label className="flex items-center gap-2 text-xs cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={sendEmail}
                    onChange={(e) => setSendEmail(e.target.checked)}
                    className="size-4 rounded border-border text-primary focus:ring-primary"
                  />
                  <span>Send via Email to {replyTarget.email}</span>
                </label>

                {replyTarget.userId && (
                  <label className="flex items-center gap-2 text-xs cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={sendInApp}
                      onChange={(e) => setSendInApp(e.target.checked)}
                      className="size-4 rounded border-border text-primary focus:ring-primary"
                    />
                    <span>Send In-App Notification</span>
                  </label>
                )}
              </div>
            </div>
          )}

          <DialogFooter className="gap-2 sm:gap-0 pt-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setReplyTarget(null)}
              disabled={replyMutation.isPending}
              className="text-xs"
            >
              Cancel
            </Button>
            <Button
              type="button"
              size="sm"
              onClick={handleSendReply}
              disabled={replyMutation.isPending || (!sendEmail && !sendInApp)}
              className="text-xs gap-1.5 bg-primary font-semibold"
            >
              {replyMutation.isPending ? (
                <>
                  <Loader2 className="size-3.5 animate-spin" />
                  <span>Sending Reply…</span>
                </>
              ) : (
                <>
                  <Send className="size-3.5" />
                  <span>Send Reply</span>
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
