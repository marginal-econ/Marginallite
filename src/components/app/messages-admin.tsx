import { useState, useMemo, useEffect, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import {
  MessageSquare,
  Search,
  Send,
  User,
  CheckCircle2,
  Clock,
  Sparkles,
  RefreshCw,
  School,
  Mail,
  Loader2,
  ChevronRight,
  ShieldCheck,
} from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import {
  listAdminConversations,
  getConversationThread,
  sendAdminTextMessage,
  markConversationAsRead,
  type UserConversation,
  type DirectMessage,
} from "@/lib/messages.functions";

interface MessagesAdminPanelProps {
  initialUserId?: string | null;
}

export function MessagesAdminPanel({ initialUserId }: MessagesAdminPanelProps) {
  const queryClient = useQueryClient();
  const listConversationsFn = useServerFn(listAdminConversations);
  const getThreadFn = useServerFn(getConversationThread);
  const sendMessageFn = useServerFn(sendAdminTextMessage);
  const markReadFn = useServerFn(markConversationAsRead);

  const [selectedUserId, setSelectedUserId] = useState<string | null>(initialUserId || null);
  const [search, setSearch] = useState("");
  const [filterMode, setFilterMode] = useState<"all" | "active" | "unread">("all");
  const [messageInput, setMessageInput] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // 1. Fetch conversations list
  const convQuery = useQuery({
    queryKey: ["admin-conversations"],
    queryFn: () => listConversationsFn(),
    refetchInterval: 10_000,
  });

  const allConversations: UserConversation[] = convQuery.data ?? [];

  const handleSelectUser = (userId: string) => {
    setSelectedUserId(userId);

    const prevUnread = allConversations.find((c) => c.userId === userId)?.unreadCount ?? 0;

    // 1. Instantly zero out unreadCount in the local conversations cache
    queryClient.setQueryData<UserConversation[]>(["admin-conversations"], (old) => {
      if (!old) return old;
      return old.map((c) => (c.userId === userId ? { ...c, unreadCount: 0 } : c));
    });

    // Also immediately update the global badge counter in client cache
    if (prevUnread > 0) {
      queryClient.setQueryData<{ unreadCount: number }>(["student-unread-count"], (old) => {
        if (!old) return { unreadCount: 0 };
        return { unreadCount: Math.max(0, old.unreadCount - prevUnread) };
      });
    }

    // 2. Persist to DB and sync query caches
    void markReadFn({ data: { userId } }).then(() => {
      queryClient.invalidateQueries({ queryKey: ["admin-conversations"] });
      queryClient.invalidateQueries({ queryKey: ["student-unread-count"] });
    });
  };

  // If initialUserId changes or not set yet, select first conversation
  useEffect(() => {
    if (initialUserId) {
      handleSelectUser(initialUserId);
    } else if (!selectedUserId && allConversations.length > 0) {
      handleSelectUser(allConversations[0].userId);
    }
  }, [initialUserId, allConversations.length]);

  // Filter conversations
  const filteredConversations = useMemo(() => {
    return allConversations.filter((c) => {
      if (filterMode === "unread" && c.unreadCount === 0) return false;
      if (filterMode === "active" && c.totalMessages === 0) return false;
      if (!search.trim()) return true;
      const q = search.toLowerCase();
      return (
        c.name.toLowerCase().includes(q) ||
        c.email.toLowerCase().includes(q) ||
        (c.school && c.school.toLowerCase().includes(q))
      );
    });
  }, [allConversations, filterMode, search]);

  const selectedConv = allConversations.find((c) => c.userId === selectedUserId) ?? null;

  // 2. Fetch thread for selected user
  const threadQuery = useQuery({
    queryKey: ["admin-thread", selectedUserId],
    queryFn: () => (selectedUserId ? getThreadFn({ data: { userId: selectedUserId } }) : Promise.resolve([])),
    enabled: Boolean(selectedUserId),
    refetchInterval: 5_000,
  });

  const messages: DirectMessage[] = threadQuery.data ?? [];

  // Scroll to bottom when messages update & invalidate unread counter
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    if (selectedUserId && messages.length > 0) {
      queryClient.invalidateQueries({ queryKey: ["student-unread-count"] });
    }
  }, [messages.length, selectedUserId, queryClient]);

  // 3. Send message mutation
  const sendMutation = useMutation({
    mutationFn: (text: string) => {
      if (!selectedUserId) throw new Error("No recipient selected");
      return sendMessageFn({
        data: {
          recipientUserId: selectedUserId,
          text,
        },
      });
    },
    onSuccess: () => {
      setMessageInput("");
      queryClient.invalidateQueries({ queryKey: ["admin-thread", selectedUserId] });
      queryClient.invalidateQueries({ queryKey: ["admin-conversations"] });
      toast.success("Message sent directly to user in app.");
    },
    onError: (err: any) => {
      toast.error(err?.message || "Failed to deliver message.");
    },
  });

  const handleSend = () => {
    if (!messageInput.trim() || sendMutation.isPending) return;
    sendMutation.mutate(messageInput.trim());
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="flex flex-col lg:flex-row h-[700px] max-h-[calc(100vh-13rem)] min-h-[520px] rounded-2xl border border-border/80 bg-card/60 overflow-hidden shadow-sm">
      {/* ── Left Sidebar: Conversations & User Directory ── */}
      <div className="w-full lg:w-[350px] shrink-0 flex flex-col h-full min-h-0 border-r border-border/70 bg-card/40">
        {/* Search & Header (Pinned) */}
        <div className="shrink-0 p-3.5 border-b border-border/60 space-y-2.5 bg-card/50">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="size-7 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
                <MessageSquare className="size-4" />
              </div>
              <div>
                <h3 className="text-xs font-bold text-foreground">In-App User Messages</h3>
                <p className="text-[10px] text-muted-foreground">{allConversations.length} total students</p>
              </div>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => convQuery.refetch()}
              disabled={convQuery.isFetching}
              className="size-7 p-0"
              title="Refresh messages"
            >
              <RefreshCw className={`size-3.5 text-muted-foreground ${convQuery.isFetching ? "animate-spin" : ""}`} />
            </Button>
          </div>

          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search student or email…"
              className="h-8 pl-8 text-xs bg-background/60"
            />
          </div>

          <div className="flex items-center gap-1">
            <Button
              variant={filterMode === "all" ? "default" : "outline"}
              size="sm"
              className="h-6 px-2 text-[10px] flex-1"
              onClick={() => setFilterMode("all")}
            >
              All
            </Button>
            <Button
              variant={filterMode === "active" ? "default" : "outline"}
              size="sm"
              className="h-6 px-2 text-[10px] flex-1"
              onClick={() => setFilterMode("active")}
            >
              Chats
            </Button>
            <Button
              variant={filterMode === "unread" ? "default" : "outline"}
              size="sm"
              className="h-6 px-2 text-[10px] flex-1 text-rose-600 dark:text-rose-400"
              onClick={() => setFilterMode("unread")}
            >
              Unread
            </Button>
          </div>
        </div>

        {/* User Conversation List (Smooth Mouse-Wheel Scrollable) */}
        <div className="flex-1 min-h-0 overflow-y-auto divide-y divide-border/40 overscroll-contain">
          {convQuery.isLoading ? (
            <div className="p-3 space-y-2.5">
              <Skeleton className="h-14 w-full rounded-xl" />
              <Skeleton className="h-14 w-full rounded-xl" />
              <Skeleton className="h-14 w-full rounded-xl" />
            </div>
          ) : filteredConversations.length === 0 ? (
            <div className="p-8 text-center text-xs text-muted-foreground">
              No students match your filter.
            </div>
          ) : (
            filteredConversations.map((conv) => {
              const isSelected = conv.userId === selectedUserId;
              const hasUnread = conv.unreadCount > 0 && !isSelected;

              return (
                <button
                  key={conv.userId}
                  type="button"
                  onClick={() => handleSelectUser(conv.userId)}
                  className={`w-full text-left p-3 transition-colors flex items-start gap-2.5 hover:bg-muted/50 cursor-pointer ${
                    isSelected ? "bg-primary/10 border-l-2 border-primary" : ""
                  }`}
                >
                  <div className="relative shrink-0">
                    <div className="size-8 rounded-full bg-muted border border-border/80 flex items-center justify-center font-bold text-xs text-foreground uppercase">
                      {conv.name.slice(0, 2)}
                    </div>
                    {hasUnread && (
                      <span className="absolute -top-0.5 -right-0.5 size-2.5 rounded-full bg-rose-500 border-2 border-background" />
                    )}
                  </div>

                  <div className="flex-1 min-w-0 space-y-0.5">
                    <div className="flex items-center justify-between gap-1">
                      <span className="text-xs font-semibold text-foreground truncate">{conv.name}</span>
                      {hasUnread && (
                        <Badge variant="destructive" className="text-[9px] px-1 py-0 h-3.5 font-bold">
                          {conv.unreadCount} new
                        </Badge>
                      )}
                    </div>
                    <p className="text-[11px] text-muted-foreground truncate">{conv.email}</p>
                    {conv.lastMessage ? (
                      <p className="text-[11px] text-muted-foreground/80 truncate pt-0.5 italic">
                        {conv.lastSender === "admin" ? "You: " : ""}{conv.lastMessage}
                      </p>
                    ) : (
                      <p className="text-[10px] text-muted-foreground/50 italic">No messages yet</p>
                    )}
                  </div>
                </button>
              );
            })
          )}
        </div>
      </div>

      {/* ── Right Workspace: Chat Conversation Thread & Composer ── */}
      <div className="flex-1 flex flex-col h-full min-h-0 bg-background/20">
        {selectedConv ? (
          <>
            {/* Thread Header (Pinned) */}
            <div className="shrink-0 p-3.5 border-b border-border/60 bg-card/60 flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2.5">
                <div className="size-9 rounded-full bg-primary/10 text-primary border border-primary/20 flex items-center justify-center font-bold text-xs uppercase">
                  {selectedConv.name.slice(0, 2)}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-xs sm:text-sm font-bold text-foreground">{selectedConv.name}</h2>
                    <Badge variant="outline" className="text-[10px] px-1.5 py-0 capitalize">
                      {selectedConv.role}
                    </Badge>
                  </div>
                  <p className="text-[11px] text-muted-foreground flex items-center gap-2">
                    <span>{selectedConv.email}</span>
                    {selectedConv.school && <span>• {selectedConv.school}</span>}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <Badge variant="secondary" className="text-[10px]">
                  {messages.length} {messages.length === 1 ? "Message" : "Messages"}
                </Badge>
              </div>
            </div>

            {/* Chat Messages Area (Smooth Mouse-Wheel Scrollable) */}
            <div className="flex-1 min-h-0 overflow-y-auto p-4 space-y-3.5 overscroll-contain">
              {threadQuery.isLoading ? (
                <div className="space-y-3 py-6">
                  <Skeleton className="h-12 w-2/3 ml-auto rounded-2xl" />
                  <Skeleton className="h-12 w-2/3 mr-auto rounded-2xl" />
                  <Skeleton className="h-12 w-2/3 ml-auto rounded-2xl" />
                </div>
              ) : messages.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-center p-8 space-y-2 text-muted-foreground">
                  <div className="size-12 rounded-2xl bg-primary/10 text-primary flex items-center justify-center">
                    <Send className="size-5" />
                  </div>
                  <h4 className="text-xs font-semibold text-foreground">No messages with this user yet</h4>
                  <p className="text-[11px] max-w-xs">
                    Send a direct message below. Your text appears instantly in the student's Marginalite dashboard.
                  </p>
                </div>
              ) : (
                messages.map((msg) => {
                  const isAdminMsg = msg.sender === "admin";
                  const timeStr = new Date(msg.createdAt).toLocaleTimeString([], {
                    hour: "2-digit",
                    minute: "2-digit",
                  });
                  const dateStr = new Date(msg.createdAt).toLocaleDateString([], {
                    day: "numeric",
                    month: "short",
                  });

                  return (
                    <div
                      key={msg.id}
                      className={`flex flex-col ${isAdminMsg ? "items-end" : "items-start"}`}
                    >
                      <div className="flex items-center gap-1.5 px-1 pb-1 text-[10px] text-muted-foreground">
                        <span className="font-semibold text-foreground">
                          {isAdminMsg ? "Marginalite Team" : msg.senderName}
                        </span>
                        <span>•</span>
                        <span>{dateStr} {timeStr}</span>
                      </div>
                      <div
                        className={`max-w-[85%] sm:max-w-[70%] rounded-2xl px-4 py-2.5 text-xs whitespace-pre-wrap leading-relaxed shadow-xs ${
                          isAdminMsg
                            ? "bg-primary text-primary-foreground rounded-tr-xs"
                            : "bg-card border border-border text-foreground rounded-tl-xs"
                        }`}
                      >
                        {msg.text}
                      </div>
                    </div>
                  );
                })
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Quick Prompt Starters (Pinned) */}
            <div className="shrink-0 px-4 py-1.5 border-t border-border/40 bg-card/30 flex items-center gap-1.5 overflow-x-auto text-[10px]">
              <span className="text-muted-foreground shrink-0 font-medium">Quick text:</span>
              <button
                type="button"
                onClick={() => setMessageInput("Hi! Just reviewed your recent essay. Great progress on AO3 evaluation!")}
                className="rounded-full border border-border/70 bg-card px-2 py-0.5 hover:bg-muted shrink-0 text-foreground cursor-pointer"
              >
                "Great progress on AO3 evaluation!"
              </button>
              <button
                type="button"
                onClick={() => setMessageInput("Hello! Your teacher approval has been confirmed. You now have full educator access.")}
                className="rounded-full border border-border/70 bg-card px-2 py-0.5 hover:bg-muted shrink-0 text-foreground cursor-pointer"
              >
                "Teacher approval confirmed"
              </button>
              <button
                type="button"
                onClick={() => setMessageInput("Hi! How is your Cambridge 0455 revision going? Do you have any questions about essay tariffs?")}
                className="rounded-full border border-border/70 bg-card px-2 py-0.5 hover:bg-muted shrink-0 text-foreground cursor-pointer"
              >
                "How is revision going?"
              </button>
            </div>

            {/* Message Input Box (Pinned) */}
            <div className="shrink-0 p-3 border-t border-border/70 bg-card/80 space-y-2">
              <div className="relative">
                <Textarea
                  value={messageInput}
                  onChange={(e) => setMessageInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder={`Type text message to ${selectedConv.name}… (Enter to send, Shift+Enter for new line)`}
                  rows={2}
                  className="pr-12 text-xs resize-none"
                />
                <Button
                  size="sm"
                  onClick={handleSend}
                  disabled={sendMutation.isPending || !messageInput.trim()}
                  className="absolute right-2 bottom-2 size-8 p-0 shrink-0"
                >
                  {sendMutation.isPending ? (
                    <Loader2 className="size-4 animate-spin" />
                  ) : (
                    <Send className="size-4" />
                  )}
                </Button>
              </div>
              <p className="text-[10px] text-muted-foreground flex items-center justify-between">
                <span>Direct in-app messaging delivered immediately to student.</span>
                <span className="font-mono">Press Enter to send</span>
              </p>
            </div>
          </>
        ) : (
          <div className="h-full flex flex-col items-center justify-center text-center p-8 space-y-2 text-muted-foreground">
            <User className="size-12 text-muted-foreground/40" />
            <h4 className="text-sm font-semibold text-foreground">Select a student</h4>
            <p className="text-xs max-w-sm">
              Choose any student from the left panel to open their direct chat thread and text them.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
