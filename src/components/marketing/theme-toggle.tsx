import { useCallback, useEffect, useRef, useState } from "react";
import { Moon, Sun } from "lucide-react";
import { cn } from "@/lib/utils";

const STORAGE_KEY = "marginal-theme";

export type ThemeToggleProps = {
  className?: string;
  variant?: "button" | "menu-item" | "pill";
  showLabel?: boolean;
};

export function ThemeToggle({
  className,
  variant = "button",
  showLabel = false,
}: ThemeToggleProps) {
  // Starts as null so the server render and the first client render agree;
  // the real value is read from the DOM after hydration, where the inline
  // script has already put it.
  const [theme, setTheme] = useState<"light" | "dark" | null>(null);
  const pulseTimer = useRef<number | undefined>(undefined);
  const shiftTimer = useRef<number | undefined>(undefined);

  const syncFromDOM = useCallback(() => {
    if (typeof document === "undefined") return;
    setTheme(document.documentElement.classList.contains("dark") ? "dark" : "light");
  }, []);

  useEffect(() => {
    syncFromDOM();
    const handleSync = () => syncFromDOM();
    window.addEventListener("marginal-theme-change", handleSync);
    window.addEventListener("storage", handleSync);
    return () => {
      window.removeEventListener("marginal-theme-change", handleSync);
      window.removeEventListener("storage", handleSync);
    };
  }, [syncFromDOM]);

  useEffect(
    () => () => {
      window.clearTimeout(pulseTimer.current);
      window.clearTimeout(shiftTimer.current);
    },
    [],
  );

  const toggle = useCallback(() => {
    if (typeof document === "undefined") return;
    const root = document.documentElement;
    const next = root.classList.contains("dark") ? "light" : "dark";

    // The cross-fade class is added for the length of one transition only.
    root.classList.add("theme-shifting");
    root.classList.toggle("dark", next === "dark");
    try {
      localStorage.setItem(STORAGE_KEY, next);
    } catch {
      // Private mode, or storage disabled.
    }
    setTheme(next);
    window.dispatchEvent(new CustomEvent("marginal-theme-change", { detail: next }));

    window.clearTimeout(shiftTimer.current);
    shiftTimer.current = window.setTimeout(() => root.classList.remove("theme-shifting"), 500);

    window.clearTimeout(pulseTimer.current);
  }, []);

  const label = theme === "dark" ? "Switch to day theme" : "Switch to night theme";

  if (variant === "menu-item") {
    return (
      <button
        type="button"
        onClick={toggle}
        className={cn(
          "flex w-full items-center justify-between gap-2.5 px-2.5 py-2 text-xs rounded-lg cursor-pointer hover:bg-muted/70 text-foreground transition-colors",
          className,
        )}
        aria-label={label}
        title={label}
      >
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="size-6 rounded-md bg-muted/80 flex items-center justify-center shrink-0">
            {theme === "dark" ? (
              <Moon className="size-3.5 text-primary" />
            ) : (
              <Sun className="size-3.5 text-amber-500" />
            )}
          </div>
          <span className="font-medium truncate">
            {theme === "dark" ? "Night Mode" : "Day Mode"}
          </span>
        </div>
        <span className="text-[10px] font-mono font-semibold px-1.5 py-0.5 rounded bg-muted text-muted-foreground border border-border/40">
          {theme === "dark" ? "Dark" : "Light"}
        </span>
      </button>
    );
  }

  if (variant === "pill") {
    return (
      <button
        type="button"
        onClick={toggle}
        className={cn(
          "inline-flex items-center gap-2 rounded-xl border border-border/80 bg-card/80 px-2.5 py-1.5 text-xs font-medium text-foreground hover:bg-muted/80 transition-all cursor-pointer shadow-xs shrink-0",
          className,
        )}
        aria-label={label}
        title={label}
      >
        <span className="theme-orb-inline" data-theme={theme ?? "dark"}>
          <span className="orb-coin" aria-hidden="true">
            <span className="orb-face">
              <Sun className="size-4 text-amber-500" strokeWidth={2.2} />
            </span>
            <span className="orb-face orb-face-back">
              <Moon className="size-4 text-purple-600 dark:text-purple-400" strokeWidth={2.2} />
            </span>
          </span>
        </span>
        <span className="font-semibold text-xs">
          {theme === "dark" ? "Night Mode" : "Day Mode"}
        </span>
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={toggle}
      className={cn(
        "theme-orb relative flex items-center justify-center size-9 sm:size-9.5 rounded-2xl border border-border/80 bg-card/90 hover:bg-muted/80 text-foreground transition-all cursor-pointer shadow-xs hover:shadow-sm hover:border-amber-500/40 dark:hover:border-purple-500/40 group shrink-0",
        className,
      )}
      data-theme={theme ?? "dark"}
      aria-label={label}
      title={label}
    >
      <span className="orb-coin" aria-hidden="true">
        <span className="orb-face">
          <Sun className="size-5 text-amber-500 drop-shadow-[0_0_8px_rgba(245,158,11,0.35)] transition-transform duration-200 group-hover:scale-110" strokeWidth={2.2} />
        </span>
        <span className="orb-face orb-face-back">
          <Moon className="size-5 text-purple-600 dark:text-purple-400 drop-shadow-[0_0_8px_rgba(168,85,247,0.35)] transition-transform duration-200 group-hover:scale-110" strokeWidth={2.2} />
        </span>
      </span>
      {showLabel && (
        <span className="ml-1.5 text-xs font-semibold hidden sm:inline">
          {theme === "dark" ? "Night" : "Day"}
        </span>
      )}
      <span className="sr-only" aria-live="polite">
        {theme === "dark" ? "Night theme on" : "Day theme on"}
      </span>
    </button>
  );
}
