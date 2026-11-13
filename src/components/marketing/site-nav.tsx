/**
 * The marketing header's section navigation.
 */

import { useCallback, useEffect, useRef, useState } from "react";
import { Link } from "@tanstack/react-router";
import { GraduationCap, Menu, X } from "lucide-react";

import { cn } from "@/lib/utils";

type NavSection = { id: string; label: string; to?: string };

const NAV_SECTIONS: NavSection[] = [
  { id: "graded-exemplar", label: "Real Graded Essay" },
  { id: "rag-engine", label: "RAG Engine & Syllabus" },
  { id: "teachers-section", label: "For Teachers" },
  { id: "tools", label: "Features" },
  { id: "faq", label: "FAQ" },
];

const SECTION_IDS = NAV_SECTIONS.filter((s) => !("to" in s)).map((section) => section.id);

/** Returns the id of the section currently occupying the viewport. */
function useScrollSpy(ids: readonly string[]) {
  const [active, setActive] = useState<string | null>(null);

  useEffect(() => {
    if (typeof IntersectionObserver === "undefined") return;

    const elements = ids
      .map((id) => document.getElementById(id))
      .filter((el): el is HTMLElement => el !== null);
    if (elements.length === 0) return;

    const ratios = new Map<string, number>();

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          ratios.set(entry.target.id, entry.isIntersecting ? entry.intersectionRatio : 0);
        }
        let best: string | null = null;
        let bestRatio = 0;
        for (const [id, ratio] of ratios) {
          if (ratio > bestRatio) {
            best = id;
            bestRatio = ratio;
          }
        }
        setActive(best);
      },
      {
        rootMargin: "-20% 0px -45% 0px",
        threshold: [0, 0.15, 0.35, 0.6, 0.9],
      },
    );

    for (const el of elements) observer.observe(el);
    return () => observer.disconnect();
  }, [ids]);

  return active;
}

/** The desktop row of section links, with the current section marked. */
export function SiteNavLinks() {
  const active = useScrollSpy(SECTION_IDS);

  return (
    <nav aria-label="Sections" className="hidden items-center gap-7 text-sm font-medium lg:flex">
      {NAV_SECTIONS.map((section) => {
        if (section.to) {
          return (
            <Link
              key={section.id}
              to={section.to}
              className="nav-link text-muted-foreground transition-colors hover:text-foreground"
            >
              {section.label}
            </Link>
          );
        }
        return (
          <a
            key={section.id}
            href={`#${section.id}`}
            aria-current={active === section.id ? "true" : undefined}
            className={cn(
              "nav-link transition-colors",
              active === section.id
                ? "text-foreground font-semibold"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            {section.label}
          </a>
        );
      })}
    </nav>
  );
}

/**
 * The small-screen menu.
 */
export function SiteNavMobile() {
  const active = useScrollSpy(SECTION_IDS);
  const [open, setOpen] = useState(false);
  const panelRef = useRef<HTMLDivElement | null>(null);
  const buttonRef = useRef<HTMLButtonElement | null>(null);

  const close = useCallback(() => setOpen(false), []);

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpen(false);
        buttonRef.current?.focus();
        return;
      }
      if (event.key === "Tab") {
        const focusable = panelRef.current?.querySelectorAll<HTMLElement>("a[href], button");
        if (!focusable?.length) return;
        const first = focusable[0];
        const last = focusable[focusable.length - 1];
        if (event.shiftKey && document.activeElement === first) {
          event.preventDefault();
          last.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault();
          first.focus();
        }
      }
    };
    const onPointer = (event: PointerEvent) => {
      const target = event.target as Node;
      if (panelRef.current?.contains(target)) return;
      if (buttonRef.current?.contains(target)) return;
      setOpen(false);
    };
    document.addEventListener("keydown", onKey);
    document.addEventListener("pointerdown", onPointer);
    panelRef.current?.querySelector<HTMLElement>("a[href], button")?.focus();
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("pointerdown", onPointer);
    };
  }, [open]);

  return (
    <>
      <button
        ref={buttonRef}
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-controls="site-nav-panel"
        aria-label={open ? "Close menu" : "Open menu"}
        className="pop-sm pop-press flex size-9 shrink-0 items-center justify-center bg-surface lg:hidden"
      >
        {open ? <X className="size-4" /> : <Menu className="size-4" />}
      </button>

      <div
        ref={panelRef}
        id="site-nav-panel"
        hidden={!open}
        className="absolute inset-x-3 top-full z-50 lg:hidden"
      >
        <nav aria-label="Mobile sections" className="pop pop-in mt-2 overflow-hidden p-2">
          {NAV_SECTIONS.map((section) => {
            if (section.to) {
              return (
                <Link
                  key={section.id}
                  to={section.to}
                  onClick={close}
                  className="flex items-center justify-between rounded-lg px-3 py-3 text-sm font-medium text-muted-foreground hover:bg-muted hover:text-foreground"
                >
                  {section.label}
                </Link>
              );
            }
            return (
              <a
                key={section.id}
                href={`#${section.id}`}
                onClick={close}
                className={cn(
                  "flex items-center justify-between rounded-lg px-3 py-3 text-sm font-medium transition-colors",
                  active === section.id
                    ? "bg-accent text-foreground font-semibold"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground",
                )}
              >
                {section.label}
                {active === section.id ? (
                  <span className="size-1.5 rounded-full bg-primary" aria-hidden="true" />
                ) : null}
              </a>
            );
          })}
          <Link
            to="/teacher-auth"
            onClick={close}
            className="mt-1 flex items-center justify-center gap-1.5 rounded-lg border border-primary/30 bg-primary/10 px-3 py-2.5 text-sm font-semibold text-primary"
          >
            <GraduationCap className="size-4" />
            Teacher Portal
          </Link>
          <Link
            to="/auth"
            onClick={close}
            className="mt-1.5 flex items-center justify-center rounded-lg border border-border bg-surface px-3 py-2.5 text-sm font-semibold text-foreground"
          >
            Sign in
          </Link>
        </nav>
      </div>
    </>
  );
}
