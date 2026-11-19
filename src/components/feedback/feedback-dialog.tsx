import { useState, useEffect } from "react";
import {
  MessageSquarePlus,
  Send,
  Loader2,
  Sparkles,
  AlertCircle,
  CheckCircle2,
  X,
  Bug,
  Lightbulb,
  HelpCircle,
  ThumbsUp,
} from "lucide-react";
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
import { InteractiveBoyMascot } from "@/components/feedback/interactive-boy-mascot";
import { cn } from "@/lib/utils";

interface FeedbackDialogProps {
  trigger?: React.ReactNode;
  defaultCategory?: FeedbackCategory;
  defaultSubject?: string;
  className?: string;
}

const CATEGORY_SHORT_LABELS: Record<FeedbackCategory, string> = {
  feedback: "Feedback",
  bug: "Bug Report",
  feature_request: "Feature",
  grading_question: "Grading",
  general: "General",
};

function CategoryIcon({
  category,
  className,
}: {
  category: FeedbackCategory;
  className?: string;
}) {
  switch (category) {
    case "bug":
      return <Bug className={className} />;
    case "feature_request":
      return <Lightbulb className={className} />;
    case "grading_question":
      return <HelpCircle className={className} />;
    case "feedback":
      return <Sparkles className={className} />;
    case "general":
    default:
      return <MessageSquarePlus className={className} />;
  }
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

  // Interactive Mascot interaction state
  const [isTyping, setIsTyping] = useState(false);
  const [isHoveringSend, setIsHoveringSend] = useState(false);
  const [activeField, setActiveField] = useState<
    "category" | "subject" | "message" | "name" | "email" | null
  >(null);
  const [bug1Caught, setBug1Caught] = useState(false);
  const [bug2Caught, setBug2Caught] = useState(false);

  useEffect(() => {
    if (category !== "bug" || !open) {
      setBug1Caught(false);
      setBug2Caught(false);
    }
  }, [category, open]);

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
            className={
              className ||
              "h-8 gap-1.5 rounded-lg border border-border/70 bg-card/60 hover:bg-muted/80 text-xs font-semibold text-foreground transition-all shadow-2xs hover:border-primary/50 whitespace-nowrap shrink-0"
            }
          >
            <MessageSquarePlus className="size-3.5 text-primary" />
            <span>Send Feedback</span>
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[760px] md:max-w-[800px] p-0 overflow-hidden border border-border/80 shadow-2xl">
        <style>{`
          @keyframes dialogBugFlight {
            0% { transform: translate(0px, 0px) rotate(0deg); }
            20% { transform: translate(50px, -20px) rotate(20deg); }
            45% { transform: translate(110px, 35px) rotate(-15deg); }
            70% { transform: translate(40px, 65px) rotate(15deg); }
            85% { transform: translate(-25px, 25px) rotate(-10deg); }
            100% { transform: translate(0px, 0px) rotate(0deg); }
          }
          @keyframes hoverflyWingLeft {
            0%, 100% { transform: rotate(-30deg) scaleY(1); }
            50% { transform: rotate(40deg) scaleY(0.7); }
          }
          @keyframes hoverflyWingRight {
            0%, 100% { transform: rotate(30deg) scaleY(1); }
            50% { transform: rotate(-40deg) scaleY(0.7); }
          }
        `}</style>

        {/* ── Bug #1: Pip the Luminous Hoverfly (Soaring gracefully across header airspace) ────── */}
        {category === "bug" && (
          <div className="pointer-events-none absolute inset-0 z-30 overflow-hidden">
            <div
              className={cn(
                "pointer-events-auto absolute z-40 cursor-pointer transition-transform duration-300 select-none group",
                bug1Caught ? "hover:scale-110" : "hover:scale-125 active:scale-90",
              )}
              style={{
                top: "13%",
                left: "60%",
                animation: bug1Caught ? "none" : "dialogBugFlight 14s infinite ease-in-out",
                transform: bug1Caught ? "translate(30px, 10px) rotate(10deg)" : undefined,
              }}
              onClick={() => {
                const next = !bug1Caught;
                setBug1Caught(next);
                if (next) {
                  toast.success(
                    bug2Caught
                      ? "🎉 Both bugs caught! 2/2! You're a master debugger."
                      : "🎯 Caught Pip the Hoverfly! (1 of 2 bugs caught) Now catch the jewel beetle!",
                  );
                }
              }}
              title={
                bug1Caught
                  ? "Pip the Hoverfly (Caught!) — Click to release"
                  : "Pip the Hoverfly (~bzz!~) — Click to catch!"
              }
            >
              {/* Luminous Hoverfly Vector */}
              <div className="relative flex flex-col items-center justify-center p-1.5">
                <svg
                  viewBox="0 0 36 36"
                  className="size-9 overflow-visible drop-shadow-md select-none pointer-events-none"
                  aria-hidden="true"
                >
                  <defs>
                    <linearGradient id="hoverfly-body" x1="0" y1="0" x2="1" y2="1">
                      <stop offset="0%" stopColor="#34d399" />
                      <stop offset="50%" stopColor="#10b981" />
                      <stop offset="100%" stopColor="#047857" />
                    </linearGradient>
                    <radialGradient id="hoverfly-lantern" cx="50%" cy="50%" r="50%">
                      <stop offset="0%" stopColor="#fef08a" />
                      <stop offset="60%" stopColor="#facc15" />
                      <stop offset="100%" stopColor="#d97706" />
                    </radialGradient>
                    <linearGradient id="hoverfly-wing" x1="0" y1="0" x2="1" y2="1">
                      <stop offset="0%" stopColor="rgba(224, 242, 254, 0.95)" />
                      <stop offset="100%" stopColor="rgba(56, 189, 248, 0.45)" />
                    </linearGradient>
                  </defs>

                  {/* Bioluminescent soft glow */}
                  <circle cx="18" cy="22" r="10" fill="#facc15" opacity="0.35" filter="blur(3px)" />

                  {/* Translucent Fluttering Wings */}
                  {!bug1Caught && (
                    <g>
                      <path
                        d="M16 16 C9 4 3 6 7 17 C9 22 14 20 16 17 Z"
                        fill="url(#hoverfly-wing)"
                        stroke="#0284c7"
                        strokeWidth="0.9"
                        style={{
                          transformOrigin: "16px 16px",
                          animation: "hoverflyWingLeft 0.05s infinite alternate ease-in-out",
                        }}
                      />
                      <path
                        d="M20 16 C27 4 33 6 29 17 C27 22 22 20 20 17 Z"
                        fill="url(#hoverfly-wing)"
                        stroke="#0284c7"
                        strokeWidth="0.9"
                        style={{
                          transformOrigin: "20px 16px",
                          animation: "hoverflyWingRight 0.05s infinite alternate ease-in-out",
                        }}
                      />
                    </g>
                  )}

                  {/* Jointed Fly Legs */}
                  <g stroke="#064e3b" strokeWidth="1.3" strokeLinecap="round" fill="none">
                    <path d="M14 18 L9 16 L6 20" />
                    <path d="M14 22 L8 24 L5 28" />
                    <path d="M22 18 L27 16 L30 20" />
                    <path d="M22 22 L28 24 L31 28" />
                  </g>

                  {/* Luminous Abdomen */}
                  <ellipse cx="18" cy="23" rx="5.5" ry="7" fill="url(#hoverfly-lantern)" />
                  <ellipse cx="18" cy="23" rx="3.5" ry="4.5" fill="#fef9c3" opacity="0.85" />

                  {/* Thorax */}
                  <ellipse cx="18" cy="15" rx="4.8" ry="4.2" fill="url(#hoverfly-body)" stroke="#064e3b" strokeWidth="1.2" />

                  {/* Head & Big Glossy Eyes */}
                  <circle cx="18" cy="10" r="3.2" fill="#064e3b" />
                  <circle cx="15.8" cy="9.2" r="2" fill="#38bdf8" stroke="#0c4a6e" strokeWidth="0.6" />
                  <circle cx="15.2" cy="8.6" r="0.7" fill="#ffffff" />
                  <circle cx="20.2" cy="9.2" r="2" fill="#38bdf8" stroke="#0c4a6e" strokeWidth="0.6" />
                  <circle cx="19.6" cy="8.6" r="0.7" fill="#ffffff" />

                  {/* Antennae */}
                  <path d="M16.5 8 Q14 4 12 5" fill="none" stroke="#064e3b" strokeWidth="1.2" strokeLinecap="round" />
                  <path d="M19.5 8 Q22 4 24 5" fill="none" stroke="#064e3b" strokeWidth="1.2" strokeLinecap="round" />
                  <circle cx="12" cy="5" r="0.9" fill="#facc15" />
                  <circle cx="24" cy="5" r="0.9" fill="#facc15" />

                  {/* Dazed Stars when caught */}
                  {bug1Caught && (
                    <g style={{ transformOrigin: "18px 8px", animation: "dazedStars 2.5s infinite linear" }}>
                      <text x="10" y="5" fontSize="7" fill="#facc15">⭐</text>
                      <text x="22" y="5" fontSize="6" fill="#38bdf8">✨</text>
                    </g>
                  )}
                </svg>

                {/* Subtle Hover Status Pill */}
                <span
                  className={cn(
                    "mt-0.5 text-[8.5px] font-mono font-bold px-1.5 py-0.2 rounded-full border shadow-2xs whitespace-nowrap transition-all duration-200",
                    bug1Caught
                      ? "bg-amber-500/15 border-amber-500/30 text-amber-600 dark:text-amber-400 font-extrabold"
                      : "bg-emerald-500/15 border-emerald-500/30 text-emerald-600 dark:text-emerald-400 opacity-80 group-hover:opacity-100",
                  )}
                >
                  {bug1Caught ? "⭐ CAUGHT!" : "~bzz!~"}
                </span>
              </div>
            </div>
          </div>
        )}

        <div className="flex flex-col sm:flex-row">
          {/* ── Left / Bottom-Left: The Boy Mascot Stage ────────────────── */}
          <div className="hidden sm:flex flex-col justify-between w-64 md:w-72 bg-gradient-to-b from-primary/[0.08] via-card to-primary/[0.04] p-5 border-r border-border/60 relative overflow-hidden shrink-0">
            {/* Ambient Background Aura */}
            <div className="pointer-events-none absolute -left-8 -top-8 size-36 rounded-full bg-primary/10 blur-2xl" />

            <div className="space-y-1.5 relative z-10">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5 text-[10.5px] font-bold text-primary tracking-wide uppercase">
                  <span className="size-2 rounded-full bg-emerald-500 animate-pulse" />
                  Student Mascot
                </div>
                {category === "bug" && (
                  <span
                    className={cn(
                      "text-[9.5px] font-bold font-mono px-2 py-0.5 rounded-full border shadow-2xs transition-all",
                      bug1Caught && bug2Caught
                        ? "bg-purple-500/20 border-purple-500/40 text-purple-700 dark:text-purple-300 font-extrabold"
                        : bug1Caught || bug2Caught
                        ? "bg-amber-500/15 border-amber-500/35 text-amber-600 dark:text-amber-400 font-bold"
                        : "bg-emerald-500/10 border-emerald-500/25 text-emerald-600 dark:text-emerald-400",
                    )}
                  >
                    {bug1Caught && bug2Caught
                      ? "🏆 2/2 Caught!"
                      : bug1Caught || bug2Caught
                      ? "🎯 1/2 Caught!"
                      : "🪲 2 Bugs Flying"}
                  </span>
                )}
              </div>
              <p className="text-[11px] text-muted-foreground leading-snug">
                {category === "bug"
                  ? "Catch both bugs buzzing around the screen to help our engineers squash them!"
                  : "Always here to react and send your message to the Marginalite team."}
              </p>
            </div>

            {/* Mascot Character standing quite big */}
            <div className="relative z-10 flex flex-col items-center justify-end pt-3">
              <InteractiveBoyMascot
                category={category}
                isTyping={isTyping}
                isSubmitting={submitting}
                isHoveringSend={isHoveringSend}
                activeField={activeField}
                className="w-full"
                bug1Caught={bug1Caught}
                bug2Caught={bug2Caught}
                onBug2CaughtChange={(caught) => {
                  setBug2Caught(caught);
                  if (caught) {
                    toast.success(
                      bug1Caught
                        ? "🎉 Both bugs caught! 2/2! You squashed all of them!"
                        : "🎯 Squashed Barnaby the Jewel Beetle! (1 of 2 bugs caught) Now catch the flying one!",
                    );
                  }
                }}
              />
            </div>
          </div>

          {/* ── Right: Form & Controls ──────────────────────────────────── */}
          <div className="flex-1 min-w-0 p-5 sm:p-6 max-h-[88vh] overflow-y-auto">
            <DialogHeader className="pb-3 border-b border-border/60">
              <div className="flex items-center gap-2 mb-1">
                <div className="size-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
                  <Sparkles className="size-4" />
                </div>
                <DialogTitle className="text-base font-bold text-foreground">
                  Direct Message to Marginalite Team
                </DialogTitle>
              </div>
              <DialogDescription className="text-xs text-muted-foreground leading-relaxed">
                Share ideas, report bugs, ask questions about grading, or request features. Your message goes directly to our core developers and examiners.
              </DialogDescription>
            </DialogHeader>

            {/* Mobile Mascot banner (visible on phone screens < sm) */}
            <div className="sm:hidden flex items-center gap-3 p-3 rounded-xl border border-primary/20 bg-primary/[0.04] mt-3">
              <div className="w-24 shrink-0">
                <InteractiveBoyMascot
                  category={category}
                  isTyping={isTyping}
                  isSubmitting={submitting}
                  isHoveringSend={isHoveringSend}
                  activeField={activeField}
                  className="w-full h-32"
                />
              </div>
              <div className="text-xs space-y-0.5 min-w-0">
                <p className="font-bold text-foreground">Marginalite Mascot</p>
                <p className="text-[11px] text-muted-foreground leading-tight">
                  {category === "bug"
                    ? "Catch the bug flying around!"
                    : category === "feature_request"
                    ? "Great idea! What should we build?"
                    : "Tell our engineers anything!"}
                </p>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4 pt-3">
              {/* Category Quick Chips */}
              <div className="space-y-1.5">
                <Label htmlFor="feedback-category" className="text-xs font-semibold flex items-center justify-between">
                  <span>Category</span>
                  <span className="text-[10.5px] text-muted-foreground font-normal">
                    Select to see mascot reactions
                  </span>
                </Label>
                <div className="grid grid-cols-2 xs:grid-cols-3 sm:grid-cols-3 gap-1.5">
                  {FEEDBACK_CATEGORIES.map((cat) => {
                    const isSelected = category === cat;
                    return (
                      <button
                        key={cat}
                        type="button"
                        onClick={() => {
                          setCategory(cat);
                          setActiveField("category");
                        }}
                        className={cn(
                          "flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-xs font-semibold transition-all text-left cursor-pointer",
                          isSelected
                            ? "border-primary bg-primary/10 text-primary shadow-xs ring-1 ring-primary/30"
                            : "border-border/70 bg-card hover:bg-muted/70 text-muted-foreground hover:text-foreground",
                        )}
                      >
                        <CategoryIcon
                          category={cat}
                          className={cn(
                            "size-3.5 shrink-0",
                            isSelected ? "text-primary" : "text-muted-foreground",
                          )}
                        />
                        <span className="truncate">{CATEGORY_SHORT_LABELS[cat]}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Subject */}
              <div className="space-y-1.5">
                <Label htmlFor="feedback-subject" className="text-xs font-semibold">
                  Subject
                </Label>
                <Input
                  id="feedback-subject"
                  placeholder="e.g. Question regarding AO2 scoring in 12-mark essay"
                  value={subject}
                  onChange={(e) => {
                    setSubject(e.target.value);
                    setIsTyping(true);
                  }}
                  onFocus={() => setActiveField("subject")}
                  onBlur={() => {
                    setActiveField(null);
                    setIsTyping(false);
                  }}
                  className="h-8 text-xs"
                  required
                />
              </div>

              {/* Your Message */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <Label htmlFor="feedback-message" className="text-xs font-semibold">
                    Your Message
                  </Label>
                  <span className="text-[10.5px] font-mono text-muted-foreground">
                    {message.length} chars
                  </span>
                </div>
                <Textarea
                  id="feedback-message"
                  placeholder="Tell us what you noticed, what could be improved, or how we can help..."
                  value={message}
                  onChange={(e) => {
                    setMessage(e.target.value);
                    setIsTyping(true);
                  }}
                  onFocus={() => setActiveField("message")}
                  onBlur={() => {
                    setActiveField(null);
                    setIsTyping(false);
                  }}
                  className="min-h-[110px] text-xs resize-none"
                  required
                />
              </div>

              {/* Name & Email */}
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
                    onFocus={() => setActiveField("name")}
                    onBlur={() => setActiveField(null)}
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
                    onFocus={() => setActiveField("email")}
                    onBlur={() => setActiveField(null)}
                    className="h-7 text-xs"
                  />
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center justify-end gap-2 pt-3 border-t border-border/60">
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
                  onMouseEnter={() => setIsHoveringSend(true)}
                  onMouseLeave={() => setIsHoveringSend(false)}
                  className="h-8 gap-1.5 text-xs font-semibold bg-primary hover:bg-primary/90 text-primary-foreground shadow-sm"
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
          </div>
        </div>
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

  // Never render on exam/practice/marking workspaces so it never covers answers, candidate text, or action buttons
  const isWorkspace =
    pathname.startsWith("/mcq") ||
    pathname.startsWith("/data-response") ||
    pathname.startsWith("/grade") ||
    pathname.startsWith("/examiner") ||
    pathname.startsWith("/practice");

  if (dismissed || isWorkspace) {
    return null;
  }

  return (
    <div
      className="fixed z-50 hidden sm:flex items-center gap-1"
      style={{
        bottom: "clamp(1rem, 2.5vw, 1.5rem)",
        right: "clamp(1rem, 2.5vw, 1.5rem)",
        height: "44px",
      }}
    >
      <FeedbackDialog
        trigger={
          <button
            type="button"
            className="group flex h-[40px] items-center gap-2 rounded-full border border-border/80 bg-card/90 px-3.5 text-xs font-semibold text-foreground shadow-lg backdrop-blur transition-all duration-200 hover:border-primary/60 hover:bg-card hover:scale-105 active:scale-95 cursor-pointer"
            title="Send direct feedback or communicate with Marginalite team"
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
