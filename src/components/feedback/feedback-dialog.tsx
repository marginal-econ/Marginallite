import { useState } from "react";
import { MessageSquarePlus, Send, Loader2, Sparkles, AlertCircle, CheckCircle2, X } from "lucide-react";
import { useRouterState } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  submitFeedback,
  FEEDBACK_CATEGORIES,
  CATEGORY_DISPLAY_LABELS,
  type FeedbackCategory,
} from "@/lib/feedback.functions";

interface FeedbackDialogProps {
  trigger?: React.ReactNode;
  defaultCategory?: FeedbackCategory;
  defaultSubject?: string;
  className?: string;
}

export function FeedbackDialog({
  trigger,
  defaultCategory = "feedback",
  defaultSubject = "",
  className,
}: FeedbackDialogProps) {
  const [open, setOpen] = useState(false);
  const [category, setCategory] = useState<FeedbackCategory>(defaultCategory);
  const [subject, setSubject] = useState(defaultSubject);
  const [message, setMessage] = useState("");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const sendFeedback = useServerFn(submitFeedback);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!subject.trim()) {
      toast.error("Please provide a subject line.");
      return;
    }
    if (message.trim().length < 5) {
      toast.error("Please write a short message (at least 5 characters).");
      return;
    }

    setSubmitting(true);
    try {
      const pageUrl = typeof window !== "undefined" ? window.location.href : "";
      const res = await sendFeedback({
        data: {
          category,
          subject: subject.trim(),
          message: message.trim(),
          name: name.trim() || undefined,
          email: email.trim() || undefined,
          pageUrl,
        },
      });

      if (res.ok) {
        toast.success("Thank you! Your message was sent directly to our team.");
        setMessage("");
        setSubject("");
        setOpen(false);
      } else {
        toast.error("Could not send feedback. Please try again.");
      }
    } catch (err: any) {
      toast.error(err?.message || "Failed to send feedback.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger ? (
          trigger
        ) : (
          <Button
            variant="outline"
            size="sm"
            className={className || "gap-2 rounded-full shadow-sm bg-card/80 backdrop-blur border-border/80 text-xs font-semibold hover:border-primary/50"}
          >
            <MessageSquarePlus className="size-3.5 text-primary" />
            <span>Send Feedback</span>
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader>
          <div className="flex items-center gap-2 mb-1">
            <div className="size-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
              <Sparkles className="size-4" />
            </div>
            <DialogTitle className="text-base font-bold">Direct Message to Marginalite Team</DialogTitle>
          </div>
          <DialogDescription className="text-xs text-muted-foreground">
            Share ideas, report errors, ask questions about grading, or request features. Your message goes directly to our core developers and examiners.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-3.5 pt-1">
          <div className="space-y-1.5">
            <Label htmlFor="feedback-category" className="text-xs font-semibold">
              Category
            </Label>
            <Select
              value={category}
              onValueChange={(val) => setCategory(val as FeedbackCategory)}
            >
              <SelectTrigger id="feedback-category" className="h-8 text-xs">
                <SelectValue placeholder="Select topic" />
              </SelectTrigger>
              <SelectContent>
                {FEEDBACK_CATEGORIES.map((cat) => (
                  <SelectItem key={cat} value={cat} className="text-xs">
                    {CATEGORY_DISPLAY_LABELS[cat]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="feedback-subject" className="text-xs font-semibold">
              Subject
            </Label>
            <Input
              id="feedback-subject"
              placeholder="e.g. Question regarding AO2 scoring in 12-mark essay"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              className="h-8 text-xs"
              required
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="feedback-message" className="text-xs font-semibold">
              Your Message
            </Label>
            <Textarea
              id="feedback-message"
              placeholder="Tell us what you noticed, what could be improved, or how we can help..."
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              className="min-h-[110px] text-xs resize-none"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1">
              <Label htmlFor="feedback-name" className="text-[11px] text-muted-foreground">
                Your Name (optional)
              </Label>
              <Input
                id="feedback-name"
                placeholder="Name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="h-7 text-xs"
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="feedback-email" className="text-[11px] text-muted-foreground">
                Your Email (optional)
              </Label>
              <Input
                id="feedback-email"
                type="email"
                placeholder="name@school.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="h-7 text-xs"
              />
            </div>
          </div>

          <div className="flex items-center justify-end gap-2 pt-2 border-t border-border/60">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setOpen(false)}
              className="h-8 text-xs"
              disabled={submitting}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              size="sm"
              disabled={submitting || !subject.trim() || message.trim().length < 5}
              className="h-8 gap-1.5 text-xs font-semibold"
            >
              {submitting ? (
                <>
                  <Loader2 className="size-3 animate-spin" />
                  Sending...
                </>
              ) : (
                <>
                  <Send className="size-3" />
                  Send to Team
                </>
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

/**
 * Floating feedback pill fixed at bottom-right corner of screen.
 * Intentionally hidden on MCQ live practice and exam routes so it never covers answers or controls.
 */
export function FloatingFeedbackPill() {
  const pathname = useRouterState({
    select: (state) => state.location.pathname,
  });
  const [dismissed, setDismissed] = useState(false);

  // Never render on MCQ practice or test pages to prevent interference with answers and questions
  if (dismissed || pathname.startsWith("/mcq")) {
    return null;
  }

  return (
    <div
      className="fixed z-50 hidden sm:flex items-center gap-1"
      style={{
        bottom: "clamp(1rem, 2.5vw, 1.5rem)",
        right: "calc(clamp(1rem, 2.5vw, 1.5rem) + 52px)",
        height: "44px",
      }}
    >
      <FeedbackDialog
        trigger={
          <button
            type="button"
            className="group flex h-[40px] items-center gap-2 rounded-full border border-border/80 bg-card/90 px-3.5 text-xs font-semibold text-foreground shadow-lg backdrop-blur transition-all duration-200 hover:border-primary/60 hover:bg-card hover:scale-105 active:scale-95 cursor-pointer"
            title="Send direct feedback or communicate with Marginal team"
          >
            <span className="relative flex size-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex size-2 rounded-full bg-emerald-500" />
            </span>
            <MessageSquarePlus className="size-3.5 text-primary transition-transform group-hover:rotate-12" />
            <span>Message Us</span>
          </button>
        }
      />
      <button
        type="button"
        onClick={() => setDismissed(true)}
        className="flex size-6 items-center justify-center rounded-full border border-border/70 bg-card/90 text-muted-foreground hover:text-foreground hover:bg-muted transition-colors shadow-sm cursor-pointer"
        title="Hide message button"
        aria-label="Hide message button"
      >
        <X className="size-3" />
      </button>
    </div>
  );
}
