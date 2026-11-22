import { Link } from "@tanstack/react-router";
import {
  ArrowRight,
  Flame,
  Lock,
  PenLine,
  School,
  ShieldAlert,
  Sliders,
  Sparkles,
  Users,
  Zap,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export type LockedFeatureType =
  | "live_examiner"
  | "essay_limit"
  | "mcq_limit"
  | "experimental"
  | "chat"
  | "school_license"
  | null;

interface LockedFeatureModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  type: LockedFeatureType;
}

export function LockedFeatureModal({
  open,
  onOpenChange,
  type,
}: LockedFeatureModalProps) {
  if (!type) return null;

  const config = {
    school_license: {
      badge: "Educator AI Pass Required",
      title: "Teacher AI Grading & Live Coaching",
      desc: "Teacher accounts require an active Educator AI Pass (from $19/mo) or School Department License to use personal AI essay grading and live coaching. Classroom homework submissions submitted by your students are funded through their individual student quotas.",
      ctaText: "Unlock Educator AI Pass (from $19/mo)",
      items: [
        {
          icon: Sparkles,
          color: "text-amber-500",
          title: "Individual Educator AI Pass",
          desc: "Subscribe from $19/mo to grade student essays, test Cambridge mark schemes, and run live classroom coaching.",
        },
        {
          icon: School,
          color: "text-purple-500",
          title: "School Department Licensing",
          desc: "Empower your entire department with 50 to 400+ student seats, faculty admin desks, and batch moderation.",
        },
        {
          icon: Users,
          color: "text-primary",
          title: "Student Quotas are Independent",
          desc: "Students in your classrooms submit essay assignments using their own student tier quotas (unlimited essays + upgrades).",
        },
      ],
    },
    chat: {
      badge: "Paid Feature · Grounded Chat",
      title: "Cambridge AI Grounded Chat is Locked",
      desc: "Instant syllabus-grounded economics discussions, voice speech recognition, and automated essay drafting are reserved for paid members.",
      items: [
        {
          icon: Sparkles,
          color: "text-primary",
          title: "100% Authentic Syllabus Grounding",
          desc: "Every answer strictly cites Cambridge IGCSE 0455 syllabus chapters, definitions, and official past mark schemes.",
        },
        {
          icon: Zap,
          color: "text-amber-500",
          title: "Voice Chat & 1-Click Auto-Draft",
          desc: "Talk via microphone, listen aloud with natural voice speech, and auto-draft 5-paragraph Cambridge essays straight to the grader.",
        },
      ],
    },
    live_examiner: {
      badge: "Paid Feature · Chained",
      title: "Live Examiner is Chained",
      desc: "Keystroke-level Cambridge IGCSE 0455 live evaluation and real-time AO coaching are locked for Free accounts.",
      items: [
        {
          icon: Sparkles,
          color: "text-primary",
          title: "Real-Time AO Evaluation",
          desc: "Grammarly-style clause checking as you type for AO1 Knowledge, AO2 Analysis, and AO3 Evaluation.",
        },
        {
          icon: Zap,
          color: "text-amber-500",
          title: "Dedicated Live Examiner Credits",
          desc: "Upgrade to Foundation (3 credits), Scholar Plus (6 credits), or Pro (10 credits) to run live question coaching sessions.",
        },
      ],
    },
    essay_limit: {
      badge: "Feature Chained · Limit Reached",
      title: "Essay Grader is Chained",
      desc: "You have completed your included Cambridge essay evaluations for your current tier.",
      items: [
        {
          icon: PenLine,
          color: "text-primary",
          title: "Higher Monthly Essay Quota",
          desc: "Get 8 essays/mo on Foundation, 15 essays/mo on Scholar Plus, 20 on Pro, or 80 on Cambridge Elite.",
        },
        {
          icon: ShieldAlert,
          color: "text-emerald-500",
          title: "Dual-Pass Auditor Grounding",
          desc: "Submissions are audited against 1,400+ past mark schemes with sentence-level rewrite pathways.",
        },
      ],
    },
    mcq_limit: {
      badge: "Feature Chained · Trial Expired",
      title: "MCQ Past Papers are Chained",
      desc: "Your 30-day Free Trial for Cambridge IGCSE 0455 MCQ Past Papers has concluded.",
      items: [
        {
          icon: Sparkles,
          color: "text-primary",
          title: "Full Past Paper Archive Access",
          desc: "Practice all Cambridge IGCSE 0455 Paper 1 (MCQ) exam sessions from 2016–2025.",
        },
        {
          icon: Zap,
          color: "text-amber-500",
          title: "Instant Answer Key & Performance Analytics",
          desc: "Identify topic-by-topic weak spots and trap questions with syllabus-locked examiner explanations.",
        },
      ],
    },
    experimental: {
      badge: "Experimental Lab · Locked",
      title: "Experimental Labs Locked",
      desc: "Cambridge Chat Lab and Diagram CAD Lab are experimental suites reserved for A* Mastery and Cambridge Elite passes.",
      items: [
        {
          icon: Sparkles,
          color: "text-primary",
          title: "Cambridge Grounded Chat & Voiceover Lab",
          desc: "Conversational examiner with 100% syllabus grounding, interactive voiceover studio, and auto-draft essays.",
        },
        {
          icon: Sliders,
          color: "text-violet-500",
          title: "Diagram CAD & Geometry Canvas",
          desc: "Interactive vector lab to dynamically manipulate curve shifts, elasticity, and consumer surplus.",
        },
      ],
    },
  }[type];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md p-0 overflow-hidden border-2 border-border/80 shadow-2xl">
        {/* Cool Chained Hero Graphic Banner */}
        <div className="relative overflow-hidden bg-gradient-to-br from-background via-muted/40 to-background border-b border-border/70 p-6 text-center">
          {/* Subtle starfield/glow */}
          <div className="absolute inset-0 bg-radial from-primary/10 via-transparent to-transparent pointer-events-none" />

          {/* Metallic Chains & Padlock Illustration */}
          <div className="relative mx-auto size-20 flex items-center justify-center">
            {/* SVG Crossed Metallic Security Chains */}
            <svg
              viewBox="0 0 100 100"
              className="absolute inset-0 size-full text-muted-foreground/40 stroke-current"
              fill="none"
              strokeWidth="3.5"
              strokeLinecap="round"
            >
              {/* Chain link 1 */}
              <path d="M15 15 L35 35 M45 45 L55 55 M65 65 L85 85" strokeDasharray="6 3" />
              {/* Chain link 2 */}
              <path d="M85 15 L65 35 M55 45 L45 55 M35 65 L15 85" strokeDasharray="6 3" />
            </svg>

            {/* Glowing Padlock Centerpiece */}
            <div className="relative z-10 flex size-14 items-center justify-center rounded-2xl border-2 border-amber-500/50 bg-card shadow-lg shadow-amber-500/20 text-amber-500">
              <Lock className="size-7 animate-pulse" />
            </div>
          </div>

          <Badge
            variant="outline"
            className="mt-4 border-amber-500/40 bg-amber-500/10 text-amber-600 dark:text-amber-400 font-bold text-[11px] tracking-wide uppercase px-3 py-0.5"
          >
            {config.badge}
          </Badge>

          <DialogTitle className="mt-2 text-xl font-extrabold tracking-tight text-foreground">
            {config.title}
          </DialogTitle>

          <DialogDescription className="mt-1 text-xs text-muted-foreground max-w-sm mx-auto leading-relaxed">
            {config.desc}
          </DialogDescription>
        </div>

        {/* Feature Highlights Grid */}
        <div className="p-5 space-y-4">
          <div className="space-y-2.5">
            {config.items.map((item, idx) => (
              <div
                key={idx}
                className="flex items-start gap-2.5 rounded-lg border border-border/70 bg-card/60 p-2.5 text-xs"
              >
                <item.icon className={`size-4 shrink-0 ${item.color} mt-0.5`} />
                <div>
                  <span className="font-bold text-foreground">{item.title}</span>
                  <p className="text-[11px] text-muted-foreground mt-0.5">{item.desc}</p>
                </div>
              </div>
            ))}
          </div>

          {/* Action CTAs */}
          <div className="pt-2 flex flex-col gap-2">
            <Button asChild size="default" className="w-full font-bold shadow-md">
              <Link to="/grade" onClick={() => onOpenChange(false)}>
                <span>Explore Free Cambridge Tools</span>
                <ArrowRight className="ml-1.5 size-4" />
              </Link>
            </Button>

            <Button
              variant="ghost"
              size="sm"
              className="w-full text-xs text-muted-foreground hover:text-foreground"
              onClick={() => onOpenChange(false)}
            >
              Continue with Free Features
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
