import { describe, expect, it } from "vitest";
import { EditorState, Transaction } from "@codemirror/state";
import {
  annotationsField,
  setAnnotationsEffect,
} from "./cm-extensions";

describe("Live Examiner v2 - CodeMirror 6 Integration", () => {
  it("initializes document state and applies annotations as decorations without drift", () => {
    const text = "A minimum price creates excess supply. Demerit goods are overconsumed.";
    let state = EditorState.create({
      doc: text,
      extensions: [annotationsField],
    });

    // Dispatch annotations effect
    const tr1 = state.update({
      effects: setAnnotationsEffect.of({
        sentences: [
          {
            id: "s1",
            from: 0,
            to: 38,
            text: "A minimum price creates excess supply.",
            hash: "h1",
            paragraphIndex: 0,
            sentenceIndex: 0,
            isComplete: true,
            ao: { tag: "ao2", reason: "Analysis chain" },
            issues: [],
          },
          {
            id: "s2",
            from: 39,
            to: 70,
            text: "Demerit goods are overconsumed.",
            hash: "h2",
            paragraphIndex: 0,
            sentenceIndex: 1,
            isComplete: true,
            ao: { tag: "ao1", reason: "Definition/knowledge" },
            issues: [],
          },
        ],
        issues: [
          {
            id: "i1",
            from: 57,
            to: 69,
            sentenceId: "s2",
            category: "terminology",
            severity: "medium",
            original: "overconsumed",
            suggestion: "over-consumed",
            explanation: "Hyphenated form",
            status: "active",
          },
        ],
        showAo: true,
        showIssues: true,
      }),
    });
    state = tr1.state;

    // Verify decorations exist in state field
    const decos = state.field(annotationsField);
    expect(decos.size).toBe(3); // 2 AO marks + 1 issue underline

    // Type text at the very beginning of the document: "Furthermore, " (13 chars)
    const tr2 = state.update({
      changes: { from: 0, to: 0, insert: "Furthermore, " },
    });
    state = tr2.state;

    // Verify annotations mapped forward by 13 characters
    const mappedDecos = state.field(annotationsField);
    let count = 0;
    mappedDecos.between(0, state.doc.length, (from, to) => {
      count++;
      // First sentence now starts at 13 instead of 0
      if (count === 1) expect(from).toBe(13);
      if (count === 3) expect(from).toBe(57 + 13);
    });
    expect(count).toBe(3);
  });

  it("applies a replacement as an atomic transaction", () => {
    const initial = "Price elasticy of demand.";
    let state = EditorState.create({
      doc: initial,
    });

    // Replace "elasticy" (from 6, to 14) with "elasticity"
    const tr = state.update({
      changes: { from: 6, to: 14, insert: "elasticity" },
    });
    state = tr.state;
    expect(state.doc.toString()).toBe("Price elasticity of demand.");
  });
});
