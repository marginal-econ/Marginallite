import { useState, useEffect } from "react";
import { ExternalLink, X } from "lucide-react";
import { cn } from "@/lib/utils";

export function CommunityPartnerBanner({ className }: { className?: string }) {
  const [isDismissed, setIsDismissed] = useState(false);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const dismissed = sessionStorage.getItem("marginal_partner_banner_dismissed");
      if (dismissed === "true") {
        setIsDismissed(true);
      }
    }
  }, []);

  const handleDismiss = () => {
    setIsDismissed(true);
    if (typeof window !== "undefined") {
      sessionStorage.setItem("marginal_partner_banner_dismissed", "true");
    }
  };

  if (isDismissed) return null;

  return (
    <aside
      aria-label="Community Partner Announcement"
      className={cn(
        "relative z-50 border-b border-purple-200/80 dark:border-purple-500/20",
        "bg-gradient-to-r from-purple-50 via-background to-purple-50/80",
        "dark:from-purple-950/50 dark:via-background dark:to-purple-950/50",
        "py-1.5 px-3 text-xs transition-colors backdrop-blur-md",
        className,
      )}
    >
      <div className="mx-auto flex max-w-7xl 2xl:max-w-[1440px] items-center justify-between gap-3 px-1 sm:px-4 md:px-8">
        {/* Left: Logo + Text */}
        <div className="flex items-center gap-2 sm:gap-2.5 min-w-0">
          <a
            href="https://www.reddit.com/r/The_IGCSE_Workaholics/"
            target="_blank"
            rel="noopener noreferrer"
            className="shrink-0 transition-transform hover:scale-105 active:scale-95"
            title="r/The_IGCSE_Workaholics"
          >
            <img
              src="/the-igcse-workaholics.png"
              alt="r/The_IGCSE_Workaholics Logo"
              className="size-5 sm:size-5.5 rounded-md object-contain border border-purple-300 dark:border-purple-500/30 shadow-2xs"
            />
          </a>

          <div className="flex items-center gap-1.5 sm:gap-2 text-[11px] sm:text-xs truncate">
            <span className="hidden min-[480px]:inline-flex items-center rounded-full bg-purple-100 dark:bg-purple-500/20 border border-purple-300/80 dark:border-purple-500/30 px-2 py-0.5 text-[10px] font-bold text-purple-800 dark:text-purple-300 shrink-0">
              Community Partner
            </span>

            <p className="truncate text-muted-foreground">
              <span className="hidden sm:inline">A lot of our users study here — </span>
              <span className="sm:hidden">Study partner: </span>
              <span className="text-foreground font-semibold">r/The_IGCSE_Workaholics</span>
              <span className="hidden md:inline">
                {" "}— join the discussions, ask questions &amp; interact with fellow students!
              </span>
              <span className="hidden sm:inline md:hidden">
                {" "}— join &amp; interact with fellow Cambridge peers!
              </span>
            </p>
          </div>
        </div>

        {/* Right: CTA Button + Dismiss */}
        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
          <a
            href="https://www.reddit.com/r/The_IGCSE_Workaholics/"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 rounded-full bg-purple-600 hover:bg-purple-700 text-white dark:bg-purple-500/20 dark:hover:bg-purple-500/30 dark:text-purple-200 border border-purple-500/30 px-2.5 py-0.5 text-[11px] font-bold transition-all shadow-2xs hover:scale-102"
          >
            <span>Visit Subreddit</span>
            <ExternalLink className="size-3" />
          </a>

          <button
            type="button"
            onClick={handleDismiss}
            className="rounded p-1 text-muted-foreground/70 hover:text-foreground hover:bg-muted/50 transition-colors"
            title="Dismiss announcement"
            aria-label="Dismiss banner"
          >
            <X className="size-3.5" />
          </button>
        </div>
      </div>
    </aside>
  );
}
