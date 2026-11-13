/**
 * The floating day/night switch that lives in the bottom-right corner.
 *
 * Three things matter here beyond the animation:
 *
 * 1. The class is applied by an inline script in the document head (see
 *    __root.tsx), never by this component on mount. Toggling the theme in a
 *    useEffect is what produces the white flash on every page load in dark
 *    mode, because the first paint has already happened by then.
 * 2. The stored choice is remembered, while every first-time visitor starts
 *    in the site's normal light theme regardless of their OS preference.
 * 3. It is an ordinary button with a real label and a live region, so the
 *    switch is usable without seeing the coin flip at all.
 */

import { useCallback, useEffect, useRef, useState } from "react";
import { Moon, Sun } from "lucide-react";

const STORAGE_KEY = "marginalite-theme";

export function ThemeToggle() {
  // Starts as null so the server render and the first client render agree;
  // the real value is read from the DOM after hydration, where the inline
  // script has already put it.
  const [theme, setTheme] = useState<"light" | "dark" | null>(null);
  const [pulse, setPulse] = useState(false);
  const pulseTimer = useRef<number | undefined>(undefined);
  const shiftTimer = useRef<number | undefined>(undefined);

  useEffect(() => {
    setTheme(document.documentElement.classList.contains("dark") ? "dark" : "light");
  }, []);

  useEffect(
    () => () => {
      window.clearTimeout(pulseTimer.current);
      window.clearTimeout(shiftTimer.current);
    },
    [],
  );

  const toggle = useCallback(() => {
    const root = document.documentElement;
    const next = root.classList.contains("dark") ? "light" : "dark";

    // The cross-fade class is added for the length of one transition only.
    // Left on permanently it would put a 420ms easing on every hover state
    // on the page.
    root.classList.add("theme-shifting");
    root.classList.toggle("dark", next === "dark");
    try {
      localStorage.setItem(STORAGE_KEY, next);
    } catch {
      // Private mode, or storage disabled. The theme still switches for this
      // page view; it just will not be remembered.
    }
    setTheme(next);

    window.clearTimeout(shiftTimer.current);
    shiftTimer.current = window.setTimeout(() => root.classList.remove("theme-shifting"), 500);

    setPulse(false);
    window.clearTimeout(pulseTimer.current);
    // One frame off, so re-pressing quickly restarts the ripple instead of
    // being swallowed as "the animation is already running".
    requestAnimationFrame(() => {
      setPulse(true);
      pulseTimer.current = window.setTimeout(() => setPulse(false), 800);
    });
  }, []);

  const label = theme === "dark" ? "Switch to day theme" : "Switch to night theme";

  return (
    <button
      type="button"
      onClick={toggle}
      className="theme-orb"
      data-theme={theme ?? "light"}
      aria-label={label}
      title={label}
    >
      <span className="orb-coin" aria-hidden="true">
        <span className="orb-face">
          <Sun className="size-4 text-amber-500" strokeWidth={2.2} />
        </span>
        <span className="orb-face orb-face-back">
          <Moon className="size-4 text-primary" strokeWidth={2.2} />
        </span>
      </span>
      <span className="sr-only" aria-live="polite">
        {theme === "dark" ? "Night theme on" : "Day theme on"}
      </span>
    </button>
  );
}
