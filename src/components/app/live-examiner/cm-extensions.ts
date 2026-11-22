import {
  EditorView,
  Decoration,
  type DecorationSet,
  ViewPlugin,
  type ViewUpdate,
} from "@codemirror/view";
import { StateField, StateEffect, type Range } from "@codemirror/state";
import type { IssueV2, SentenceSpan, AoTag } from "@/lib/live-examiner/types";

// ============================================================================
// State Effects for dynamic updates
// ============================================================================
export const setAnnotationsEffect = StateEffect.define<{
  sentences: SentenceSpan[];
  issues: IssueV2[];
  showAo: boolean;
  showIssues: boolean;
}>();

export const setHoveredSpanEffect = StateEffect.define<string | null>();

// ============================================================================
// Theme Definition for Calm, Comfortable Essay Writing (~17px, 1.7 line height)
// ============================================================================
export const essayEditorTheme = EditorView.theme(
  {
    "&": {
      fontSize: "17px",
      lineHeight: "1.7",
      fontFamily: "var(--font-serif, Georgia, serif)",
      color: "var(--foreground)",
      backgroundColor: "transparent",
      outline: "none",
      height: "100%",
    },
    ".cm-content": {
      maxWidth: "74ch",
      padding: "16px 20px 80px 20px",
      caretColor: "var(--primary)",
      whiteSpace: "pre-wrap",
      wordBreak: "break-word",
    },
    ".cm-line": {
      padding: "0",
    },
    ".cm-cursor": {
      borderLeftColor: "var(--primary)",
      borderLeftWidth: "2px",
    },
    "&.cm-focused .cm-selectionBackground, .cm-selectionBackground, ::selection": {
      backgroundColor: "oklch(0.545 0.185 295 / 20%) !important",
    },
    ".cm-scroller": {
      overflow: "auto",
      fontFamily: "inherit",
    },

    // AO Tints & Left Border Markers
    ".cm-ao-ao1": {
      backgroundColor: "oklch(0.575 0.125 228 / 12%)",
      borderBottom: "2px solid oklch(0.575 0.125 228 / 55%)",
      borderRadius: "2px",
      padding: "1px 0",
      transition: "background-color 150ms ease",
    },
    ".cm-ao-ao2": {
      backgroundColor: "oklch(0.53 0.115 168 / 12%)",
      borderBottom: "2px solid oklch(0.53 0.115 168 / 50%)",
      borderRadius: "2px",
      padding: "1px 0",
      transition: "background-color 150ms ease",
    },
    ".cm-ao-ao3": {
      backgroundColor: "oklch(0.63 0.145 58 / 14%)",
      borderBottom: "2px solid oklch(0.63 0.145 58 / 65%)",
      borderRadius: "2px",
      padding: "1px 0",
      transition: "background-color 150ms ease",
    },
    ".cm-ao-no-credit": {
      backgroundColor: "transparent",
      borderBottom: "none",
    },
    ".cm-ao-provisional": {
      opacity: "0.85",
    },

    // Unified Issue Underline for all errors (Spelling, Grammar, Accuracy, Clarity)
    ".cm-issue": {
      textDecoration: "underline wavy oklch(0.55 0.22 25 / 95%)",
      textUnderlineOffset: "4px",
      textDecorationThickness: "1.75px",
      cursor: "pointer",
    },
    ".cm-issue:hover": {
      backgroundColor: "oklch(0.55 0.22 25 / 10%)",
      borderRadius: "2px",
    },
    ".cm-issue-stale": {
      opacity: "0.5",
      transition: "opacity 1000ms ease",
    },
    ".cm-issue-focused": {
      outline: "2px solid var(--primary)",
      borderRadius: "2px",
    },
  },
  { dark: false },
);

// ============================================================================
// StateField for Combined AO and Issue Decorations
// ============================================================================
export const annotationsField = StateField.define<DecorationSet>({
  create() {
    return Decoration.none;
  },
  update(decorations, tr) {
    // 1. Map existing decorations through user edits
    decorations = decorations.map(tr.changes);

    // 2. Check for newly delivered annotations
    for (const effect of tr.effects) {
      if (effect.is(setAnnotationsEffect)) {
        const { sentences, issues, showAo, showIssues } = effect.value;
        const widgets: Range<Decoration>[] = [];
        const docLength = tr.newDoc.length;

        // Add AO Sentence marks if enabled
        if (showAo) {
          for (const s of sentences) {
            if (s.from >= s.to || s.to > docLength || !s.ao) continue;
            let aoClass = "cm-ao-no-credit";
            if (s.ao.tag === "ao1") aoClass = "cm-ao-ao1";
            else if (s.ao.tag === "ao2") aoClass = "cm-ao-ao2";
            else if (s.ao.tag === "ao3") aoClass = "cm-ao-ao3";

            if (s.ao.isProvisional) {
              aoClass += " cm-ao-provisional";
            }

            widgets.push(
              Decoration.mark({
                class: aoClass,
                attributes: {
                  "data-sentence-id": s.id,
                  "data-ao-tag": s.ao.tag,
                },
              }).range(s.from, s.to),
            );
          }
        }

        // Add Issue underlines if enabled (Unified single error styling)
        if (showIssues) {
          for (const iss of issues) {
            if (iss.from >= iss.to || iss.to > docLength || iss.status !== "active") continue;

            let issueClass = "cm-issue";
            if (iss.isStale) {
              issueClass += " cm-issue-stale";
            }

            widgets.push(
              Decoration.mark({
                class: issueClass,
                attributes: {
                  "data-issue-id": iss.id,
                  "data-category": iss.category,
                },
              }).range(iss.from, iss.to),
            );
          }
        }

        // Sort widgets in ascending order
        widgets.sort((a, b) => a.from - b.from || a.to - b.to);
        return Decoration.set(widgets, true);
      }
    }

    return decorations;
  },
  provide: (f) => EditorView.decorations.from(f),
});

// ============================================================================
// Hover/Click Plugin: Coordinates target bounding rect for React Floating Card
// ============================================================================
export type HoverTarget = {
  issueId?: string;
  sentenceId?: string;
  rect: { left: number; top: number; right: number; bottom: number; width: number; height: number };
};

export function createInteractionPlugin(
  onHoverTarget: (target: HoverTarget | null) => void,
) {
  return ViewPlugin.fromClass(
    class {
      private timer: number | null = null;

      constructor(readonly view: EditorView) {}

      handleHover(event: MouseEvent) {
        const target = event.target as HTMLElement | null;
        if (!target) return;

        const issueEl = target.closest("[data-issue-id]") as HTMLElement | null;
        if (issueEl) {
          const issueId = issueEl.getAttribute("data-issue-id") || undefined;
          const rect = issueEl.getBoundingClientRect();
          onHoverTarget({
            issueId,
            rect,
          });
        } else {
          onHoverTarget(null);
        }
      }

      destroy() {
        if (this.timer) window.clearTimeout(this.timer);
      }
    },
    {
      eventHandlers: {
        mouseover(event, view) {
          this.handleHover(event);
        },
        click(event, view) {
          this.handleHover(event);
        },
      },
    },
  );
}
