import { Link } from "@tanstack/react-router";
import { ArrowRight, LockKeyhole, type LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

interface ChainedFeatureItem {
  icon: LucideIcon;
  iconColor?: string;
  title: string;
  description: string;
}

interface ChainedChamberProps {
  badgeText?: string;
  title: string;
  description: string;
  features?: ChainedFeatureItem[];
  primaryCtaText?: string;
  primaryCtaLink?: string;
  secondaryCtaText?: string;
  secondaryCtaLink?: string;
  onSecondaryCtaClick?: () => void;
  children?: ReactNode;
}

export function ChainedChamber({
  badgeText = "Feature Chained · Limit Reached",
  title,
  description,
  features,
  primaryCtaText = "Open Essay Grader",
  primaryCtaLink = "/grade",
  secondaryCtaText,
  secondaryCtaLink,
  onSecondaryCtaClick,
  children,
}: ChainedChamberProps) {
  return (
    <div className="mx-auto max-w-2xl px-5 py-14 text-center">
      {/* ── Metallic Crossed Chains & Glowing Padlock Graphic ── */}
      <div className="relative mx-auto size-24 flex items-center justify-center mb-6">
        <svg
          viewBox="0 0 100 100"
          className="absolute inset-0 size-full text-muted-foreground/35 stroke-current"
          fill="none"
          strokeWidth="3.5"
          strokeLinecap="round"
        >
          {/* Diagonal Chain 1 */}
          <path d="M15 15 L35 35 M45 45 L55 55 M65 65 L85 85" strokeDasharray="6 3" />
          {/* Diagonal Chain 2 */}
          <path d="M85 15 L65 35 M55 45 L45 55 M35 65 L15 85" strokeDasharray="6 3" />
        </svg>

        {/* Padlock center badge with amber aura */}
        <div className="relative z-10 flex size-16 items-center justify-center rounded-2xl border-2 border-amber-500/50 bg-card shadow-xl shadow-amber-500/20 text-amber-500">
          <LockKeyhole className="size-8 animate-pulse" />
        </div>
      </div>

      <Badge
        variant="outline"
        className="mb-3 border-amber-500/40 bg-amber-500/10 text-amber-600 dark:text-amber-400 font-bold text-xs uppercase px-3 py-1"
      >
        {badgeText}
      </Badge>

      <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground">
        {title}
      </h2>

      <p className="mx-auto mt-3 max-w-lg text-sm text-muted-foreground leading-relaxed">
        {description}
      </p>

      {/* Feature cards */}
      {features && features.length > 0 ? (
        <div className="mt-8 grid gap-3 sm:grid-cols-2 text-left max-w-xl mx-auto">
          {features.map((feat, idx) => (
            <div
              key={idx}
              className="rounded-xl border border-border/80 bg-card/70 p-4 space-y-1 shadow-2xs"
            >
              <span
                className={`text-xs font-bold flex items-center gap-1.5 ${
                  feat.iconColor ?? "text-primary"
                }`}
              >
                <feat.icon className="size-3.5 shrink-0" />
                {feat.title}
              </span>
              <p className="text-[11.5px] text-muted-foreground leading-relaxed">
                {feat.description}
              </p>
            </div>
          ))}
        </div>
      ) : null}

      {children}

      {/* Action CTA Buttons */}
      <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3">
        <Button size="lg" className="w-full sm:w-auto font-bold shadow-md" asChild>
          <Link to={primaryCtaLink}>
            <span>{primaryCtaText}</span>
            <ArrowRight className="ml-2 size-4" />
          </Link>
        </Button>

        {secondaryCtaText ? (
          secondaryCtaLink ? (
            <Button variant="outline" size="lg" className="w-full sm:w-auto" asChild>
              <Link to={secondaryCtaLink}>{secondaryCtaText}</Link>
            </Button>
          ) : (
            <Button
              variant="outline"
              size="lg"
              className="w-full sm:w-auto"
              onClick={onSecondaryCtaClick}
            >
              {secondaryCtaText}
            </Button>
          )
        ) : null}
      </div>
    </div>
  );
}
