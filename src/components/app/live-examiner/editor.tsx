import {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
} from "react";
import { EditorState, Compartment } from "@codemirror/state";
import { EditorView, keymap } from "@codemirror/view";
import { defaultKeymap, history, historyKeymap, undo, redo } from "@codemirror/commands";
import {
  annotationsField,
  createInteractionPlugin,
  essayEditorTheme,
  setAnnotationsEffect,
  type HoverTarget,
} from "./cm-extensions";
import { IssueCard } from "./issue-card";
import type { IssueV2, SentenceSpan } from "@/lib/live-examiner/types";
import { cn } from "@/lib/utils";

export type LiveExaminerEditorHandle = {
  applyReplacement: (issueId: string) => void;
  focusSpan: (spanId: string) => void;
  focus: () => void;
};

export type LiveExaminerEditorProps = {
  value: string;
  onChange: (value: string) => void;
  issues?: any[];
  classifications?: any[];
  sentences?: SentenceSpan[];
  onAccept?: (id: string) => void;
  onDismiss?: (id: string) => void;
  showAo?: boolean;
  showIssues?: boolean;
  placeholder?: string;
  className?: string;
  focusedIssueId?: string | null;
  predictedMark?: any;
  maxMark?: number;
  checking?: boolean;
};

const MAX_DOC_CHARS = 40000;

export const LiveExaminerEditor = forwardRef<LiveExaminerEditorHandle, LiveExaminerEditorProps>(
  function LiveExaminerEditor(props, ref) {
    const {
      value,
      onChange,
      issues = [],
      sentences = [],
      classifications = [],
      onAccept,
      onDismiss,
      showAo = true,
      showIssues = true,
      placeholder = "Type your essay here...",
      className,
      focusedIssueId,
    } = props;

    const editorHostRef = useRef<HTMLDivElement>(null);
    const viewRef = useRef<EditorView | null>(null);
    const [hoverTarget, setHoverTarget] = useState<HoverTarget | null>(null);
    const [activeIssueIndex, setActiveIssueIndex] = useState(0);

    // Map legacy issues / classifications into standard IssueV2 / SentenceSpan
    const normalizedIssues: IssueV2[] = issues.map((iss: any, idx: number) => {
      const id = iss.id || `issue_${idx}`;
      return {
        id,
        from: typeof iss.from === "number" ? iss.from : typeof iss.start === "number" ? iss.start : 0,
        to: typeof iss.to === "number" ? iss.to : typeof iss.end === "number" ? iss.end : 0,
        sentenceId: iss.sentenceId || "",
        category: iss.category || "clarity",
        severity: iss.severity || "medium",
        original: iss.original || "",
        suggestion: iss.suggestion,
        insertAfter: iss.insertAfter,
        explanation: iss.explanation || iss.message || "",
        evidence: iss.evidence,
        aoImpact: iss.aoImpact,
        status: iss.status || "active",
        isStale: iss.isStale,
      };
    });

    const normalizedSentences: SentenceSpan[] = sentences.length > 0
      ? sentences
      : classifications.map((cls: any, idx: number) => ({
          id: cls.id || `sentence_${idx}`,
          from: typeof cls.start === "number" ? cls.start : 0,
          to: typeof cls.end === "number" ? cls.end : 0,
          text: cls.original || cls.context || "",
          hash: cls.id || `h_${idx}`,
          paragraphIndex: 0,
          sentenceIndex: idx,
          isComplete: true,
          ao: {
            tag: (cls.ao?.toLowerCase() as any) || "ao1",
            reason: cls.explanation || "",
          },
          issues: [],
        }));

    // Find active issue or sentence under hover
    const activeIssue = normalizedIssues.find((iss) => iss.id === hoverTarget?.issueId);
    const activeSentence = normalizedSentences.find((s) => s.id === hoverTarget?.sentenceId);

    // Apply replacement as a single undoable transaction
    const applyReplacement = useCallback(
      (issueId: string) => {
        const targetIssue = normalizedIssues.find((iss) => iss.id === issueId);
        if (!targetIssue || !targetIssue.suggestion || !viewRef.current) return;

        const view = viewRef.current;
        const currentDoc = view.state.doc.toString();

        // Verify bounds
        if (targetIssue.from < 0 || targetIssue.to > currentDoc.length) return;

        // Perform atomic replacement transaction
        view.dispatch({
          changes: {
            from: targetIssue.from,
            to: targetIssue.to,
            insert: targetIssue.suggestion,
          },
          userEvent: "input.replacement",
        });

        onAccept?.(issueId);
        setHoverTarget(null);
      },
      [normalizedIssues, onAccept],
    );

    // Focus a span in the editor
    const focusSpan = useCallback((spanId: string) => {
      const issue = normalizedIssues.find((iss) => iss.id === spanId);
      if (issue && viewRef.current) {
        viewRef.current.dispatch({
          selection: { anchor: issue.from, head: issue.to },
          scrollIntoView: true,
        });
        viewRef.current.focus();
      }
    }, [normalizedIssues]);

    useImperativeHandle(
      ref,
      () => ({
        applyReplacement,
        focusSpan,
        focus: () => viewRef.current?.focus(),
      }),
      [applyReplacement, focusSpan],
    );

    // Initialize CodeMirror 6 Editor
    useEffect(() => {
      if (!editorHostRef.current) return;

      const interactionPlugin = createInteractionPlugin((target) => {
        setHoverTarget(target);
      });

      const startState = EditorState.create({
        doc: value,
        extensions: [
          history(),
          essayEditorTheme,
          annotationsField,
          interactionPlugin,
          keymap.of([
            ...defaultKeymap,
            ...historyKeymap,
            {
              key: "Alt-j",
              run: () => {
                if (normalizedIssues.length === 0) return false;
                setActiveIssueIndex((prev) => (prev + 1) % normalizedIssues.length);
                const next = normalizedIssues[(activeIssueIndex + 1) % normalizedIssues.length];
                if (next) focusSpan(next.id);
                return true;
              },
            },
            {
              key: "Alt-k",
              run: () => {
                if (normalizedIssues.length === 0) return false;
                setActiveIssueIndex((prev) => (prev - 1 + normalizedIssues.length) % normalizedIssues.length);
                const prevIssue = normalizedIssues[(activeIssueIndex - 1 + normalizedIssues.length) % normalizedIssues.length];
                if (prevIssue) focusSpan(prevIssue.id);
                return true;
              },
            },
            {
              key: "Escape",
              run: () => {
                setHoverTarget(null);
                return true;
              },
            },
          ]),
          EditorView.updateListener.of((update) => {
            if (update.docChanged) {
              const text = update.state.doc.toString();
              // Normalize \r\n to \n
              const normalized = text.replace(/\r\n/g, "\n");
              // Enforce 40,000 char cap
              if (normalized.length <= MAX_DOC_CHARS) {
                onChange(normalized);
              }
            }
          }),
          EditorView.lineWrapping,
        ],
      });

      const view = new EditorView({
        state: startState,
        parent: editorHostRef.current,
      });

      viewRef.current = view;

      return () => {
        view.destroy();
        viewRef.current = null;
      };
    }, []); // eslint-disable-line react-hooks/exhaustive-deps

    // Sync external doc changes into CodeMirror if different
    useEffect(() => {
      const view = viewRef.current;
      if (!view) return;
      const currentDoc = view.state.doc.toString();
      if (currentDoc !== value) {
        view.dispatch({
          changes: { from: 0, to: currentDoc.length, insert: value },
        });
      }
    }, [value]);

    // Dispatch annotations update effect
    useEffect(() => {
      const view = viewRef.current;
      if (!view) return;

      view.dispatch({
        effects: setAnnotationsEffect.of({
          sentences: normalizedSentences,
          issues: normalizedIssues,
          showAo,
          showIssues,
        }),
      });
    }, [normalizedSentences, normalizedIssues, showAo, showIssues]);

    return (
      <div className={cn("relative min-h-[400px] w-full bg-transparent", className)}>
        {/* Placeholder if empty */}
        {value.length === 0 ? (
          <div className="pointer-events-none absolute left-5 top-4 font-serif text-[17px] leading-[1.7] text-muted-foreground/50">
            {placeholder}
          </div>
        ) : null}

        {/* CodeMirror 6 Editor Host */}
        <div ref={editorHostRef} className="h-full min-h-[500px] w-full cursor-text" />

        {/* Grammarly-Style Floating Card Portal for Active Issues */}
        {hoverTarget && activeIssue ? (
          <IssueCard
            issue={activeIssue}
            sentence={activeSentence}
            anchorRect={hoverTarget.rect}
            onAccept={activeIssue ? () => applyReplacement(activeIssue.id) : undefined}
            onDismiss={activeIssue ? () => onDismiss?.(activeIssue.id) : undefined}
            onClose={() => setHoverTarget(null)}
          />
        ) : null}
      </div>
    );
  },
);
