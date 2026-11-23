import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import {
  ArrowRight,
  BookOpen,
  Check,
  ChevronDown,
  GraduationCap,
  Pencil,
  Plus,
  Search,
  Sparkles,
  Trash2,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

import { PageHeader } from "@/components/app/app-shell";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { getMe } from "@/lib/account.functions";
import { CAMBRIDGE_CORE_DEFINITIONS } from "@/lib/cambridge-definitions";
import {
  deleteDefinition,
  listDefinitions,
  saveDefinition,
  type DefinitionListRow,
} from "@/lib/definitions.functions";

export const Route = createFileRoute("/_authenticated/definitions")({
  validateSearch: (search: Record<string, unknown>): { q?: string } => ({
    q: typeof search.q === "string" ? search.q : undefined,
  }),
  head: () => ({
    meta: [
      { title: "Definitions hub — Marginalite" },
      {
        name: "description",
        content: "Topic-organised Cambridge IGCSE 0455 Economics definitions and command words.",
      },
    ],
  }),
  component: DefinitionsPage,
});

const TOPIC_ORDER = [
  "The basic economic problem",
  "The allocation of resources",
  "Microeconomic decision-makers",
  "Government and the macroeconomy",
  "Economic development",
  "International trade and globalisation",
  "Other economic concepts",
];

function chapterMeta(index: number) {
  if (index < 6) {
    return { level: `Topic ${index + 1}`, chapter: index + 1, tone: "bg-primary/10 text-primary" };
  }
  return { level: "Reference", chapter: 1, tone: "bg-muted text-muted-foreground" };
}

type EditorState = { id?: string; term: string; definitionText: string; category: string };

function DefinitionsPage() {
  const queryClient = useQueryClient();
  const fetchMe = useServerFn(getMe);
  const fetchDefinitions = useServerFn(listDefinitions);
  const runDelete = useServerFn(deleteDefinition);
  const saveEntry = useServerFn(saveDefinition);
  const routeSearch = Route.useSearch();
  const [search, setSearch] = useState(() => routeSearch.q ?? "");

  useEffect(() => {
    if (typeof routeSearch.q === "string") {
      setSearch(routeSearch.q);
    }
  }, [routeSearch.q]);
  const [editor, setEditor] = useState<EditorState | null>(null);
  const me = useQuery({ queryKey: ["me"], queryFn: () => fetchMe() });
  const isStaff = me.data?.isStaff ?? false;
  const definitionsQuery = useQuery({
    queryKey: ["definitions", search],
    queryFn: () => fetchDefinitions({ data: { search: search || undefined } }),
  });

  const { topics, formulas, commandWords } = useMemo(() => {
    const rawRows = definitionsQuery.data ?? [];
    let rows: DefinitionListRow[] = (
      rawRows.length > 0 ? rawRows : CAMBRIDGE_CORE_DEFINITIONS
    ) as DefinitionListRow[];

    if (search.trim()) {
      const q = search.toLowerCase();
      rows = rows.filter(
        (r) =>
          r.term.toLowerCase().includes(q) ||
          r.definition_text.toLowerCase().includes(q) ||
          (r.category && r.category.toLowerCase().includes(q)),
      );
    }

    return {
      topics: TOPIC_ORDER.map((name, index) => ({
        name,
        index,
        ...chapterMeta(index),
        entries: rows.filter((row) => (row.category ?? "Other economic concepts") === name),
      })).filter((group) => group.entries.length > 0),
      formulas: rows.filter((row) => row.category === "Key formulas to remember"),
      commandWords: rows.filter((row) => row.category === "Command words"),
    };
  }, [definitionsQuery.data, search]);

  const totalTerms = topics.reduce((sum, topic) => sum + topic.entries.length, 0);
  const syllabusLevels = ["Topic 1", "Topic 2", "Topic 3", "Topic 4", "Topic 5", "Topic 6", "Reference"]
    .map((level) => ({ level, topics: topics.filter((topic) => topic.level === level) }))
    .filter((section) => section.topics.length > 0);

  async function handleDelete(id: string) {
    try {
      await runDelete({ data: { id } });
      await queryClient.invalidateQueries({ queryKey: ["definitions"] });
      toast.success("Definition removed.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not remove that definition.");
    }
  }

  async function handleSave() {
    if (!editor) return;
    try {
      await saveEntry({
        data: {
          id: editor.id,
          term: editor.term,
          definitionText: editor.definitionText,
          category: editor.category,
          sourceLabel: "Staff reviewed",
        },
      });
      await queryClient.invalidateQueries({ queryKey: ["definitions"] });
      setEditor(null);
      toast.success("Definition saved.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not save that definition.");
    }
  }

  return (
    <div className="flex flex-1 flex-col">
      <PageHeader
        title="Definitions hub"
        description="Precise Cambridge 0455 definitions, organised by syllabus topic. Command words are explained separately below."
      />
      <div className="flex flex-1 flex-col gap-7 p-4 sm:p-5 md:p-8">
        <section className="relative overflow-hidden rounded-2xl border border-primary/20 bg-linear-to-br from-primary/[0.10] via-card to-card p-5 sm:p-6">
          <div className="paper-grid pointer-events-none absolute inset-0 opacity-20" />
          <div className="relative flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
            <div className="max-w-2xl">
              <div className="mb-3 flex size-10 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-sm">
                <GraduationCap className="size-5" />
              </div>
              <p className="text-xs font-semibold tracking-[0.16em] text-primary uppercase">
                Cambridge 0455 glossary
              </p>
              <h2 className="mt-1.5 text-2xl font-bold tracking-tight sm:text-3xl">
                Learn the language of Economics, chapter by chapter.
              </h2>
              <p className="mt-2 max-w-xl text-sm leading-6 text-muted-foreground">
                Master core microeconomic and macroeconomic definitions, then use command words to
                shape full-mark responses.
              </p>
            </div>
            <div className="grid grid-cols-4 gap-2 sm:min-w-96">
              <HubStat value={topics.length} label="chapters" />
              <HubStat value={totalTerms} label="terms" />
              <HubStat value={formulas.length} label="formulas" />
              <HubStat value={commandWords.length} label="commands" />
            </div>
          </div>
        </section>

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="relative w-full max-w-xl">
            <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search a term or command word…"
              className="pl-9"
            />
          </div>
          {isStaff ? (
            <Button
              onClick={() => setEditor({ term: "", definitionText: "", category: TOPIC_ORDER[0] })}
            >
              <Plus className="size-4" /> Add definition
            </Button>
          ) : null}
        </div>
        {definitionsQuery.isLoading ? (
          <div className="space-y-3">
            {Array.from({ length: 5 }).map((_, index) => (
              <Skeleton key={index} className="h-20 rounded-xl" />
            ))}
          </div>
        ) : topics.length === 0 && commandWords.length === 0 ? (
          <div className="flex flex-col items-center gap-2 rounded-xl border border-dashed py-16 text-center">
            <BookOpen className="size-8 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">No definitions match that search.</p>
          </div>
        ) : (
          <>
            <section className="space-y-5">
              <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
                <div>
                  <h2 className="text-xl font-bold">Syllabus chapters</h2>
                  <p className="text-sm text-muted-foreground">
                    Follow the syllabus order or jump straight to the chapter you need.
                  </p>
                </div>
                <nav
                  aria-label="Jump to a definitions chapter"
                  className="flex max-w-full gap-2 overflow-x-auto pb-1 lg:max-w-2xl"
                >
                  {topics.map((topic) => (
                    <a
                      key={topic.name}
                      href={`#chapter-${topic.index + 1}`}
                      className="inline-flex shrink-0 items-center gap-1.5 rounded-full border bg-card px-3 py-1.5 text-xs font-semibold shadow-sm transition hover:border-primary/40 hover:text-primary"
                      title={topic.name}
                    >
                      {topic.level === "Reference"
                        ? "Reference"
                        : `${topic.level.replace(" Level", "")} ${topic.chapter}`}
                    </a>
                  ))}
                </nav>
              </div>

              {syllabusLevels.map((section) => (
                <div key={section.level} className="space-y-3">
                  <div className="flex items-center gap-3 pt-2">
                    <span
                      className={`rounded-full px-3 py-1 text-xs font-bold ${section.topics[0].tone}`}
                    >
                      {section.level}
                    </span>
                    <span className="h-px flex-1 bg-border" />
                    <span className="text-xs text-muted-foreground">
                      {section.topics.length} {section.topics.length === 1 ? "chapter" : "chapters"}
                    </span>
                  </div>

                  {section.topics.map((group) => (
                    <details
                      id={`chapter-${group.index + 1}`}
                      key={group.name}
                      open={Boolean(search) || group.index === 0}
                      className="group scroll-mt-24 overflow-hidden rounded-2xl border bg-card shadow-sm transition-shadow open:shadow-md"
                    >
                      <summary className="flex cursor-pointer list-none items-center gap-3 p-4 sm:p-5">
                        <span
                          className={`flex size-11 shrink-0 flex-col items-center justify-center rounded-xl text-xs font-bold ${group.tone}`}
                        >
                          <span className="text-[9px] leading-none uppercase">Ch</span>
                          <span className="mt-0.5 text-base leading-none">{group.chapter}</span>
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block text-xs font-semibold text-muted-foreground">
                            {group.level}
                          </span>
                          <span className="mt-0.5 block font-semibold leading-snug">
                            {group.name}
                          </span>
                        </span>
                        <span className="flex shrink-0 items-center gap-2">
                          <Badge variant="secondary" className="hidden sm:inline-flex">
                            {group.entries.length} terms
                          </Badge>
                          <ChevronDown className="size-5 text-muted-foreground transition-transform group-open:rotate-180" />
                        </span>
                      </summary>
                      <div className="border-t bg-muted/25 px-4 py-2 text-xs text-muted-foreground sm:hidden">
                        {group.entries.length} key {group.entries.length === 1 ? "term" : "terms"}
                      </div>
                      <div className="grid gap-px border-t bg-border md:grid-cols-2">
                        {group.entries.map((entry, entryIndex) => (
                          <DefinitionCard
                            key={entry.id}
                            entry={entry}
                            number={entryIndex + 1}
                            isStaff={isStaff}
                            onEdit={setEditor}
                            onDelete={handleDelete}
                          />
                        ))}
                      </div>
                    </details>
                  ))}
                </div>
              ))}
            </section>
                        {formulas.length > 0 ? (
              <section className="overflow-hidden rounded-2xl border border-emerald-500/30 bg-gradient-to-br from-emerald-50/60 to-card dark:from-emerald-950/20 dark:to-card shadow-sm">
                <div className="flex flex-col gap-3 border-b border-emerald-500/20 p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6">
                  <div>
                    <Badge className="mb-2 bg-emerald-600 text-white hover:bg-emerald-600">
                      Essential Reference
                    </Badge>
                    <h2 className="text-xl font-bold">Key formulas to remember</h2>
                    <p className="mt-1 text-sm text-muted-foreground">
                      Essential calculation formulas for Cambridge IGCSE 0455 Economics Paper 1 and Paper 2.
                    </p>
                  </div>
                  <div className="flex items-center gap-2 text-sm font-semibold text-emerald-700 dark:text-emerald-400">
                    <Sparkles className="size-4" /> 0455 Formula Mastery
                  </div>
                </div>
                <div className="grid gap-px bg-emerald-500/20 sm:grid-cols-2 lg:grid-cols-3">
                  {formulas.map((entry, idx) => (
                    <article key={entry.id} className="bg-card p-5 flex flex-col justify-between">
                      <div>
                        <div className="flex items-start justify-between gap-2">
                          <span className="font-mono text-[10px] font-semibold text-emerald-600 dark:text-emerald-400">
                            F{String(idx + 1).padStart(2, "0")}
                          </span>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-6 px-2 text-[11px] text-muted-foreground hover:text-foreground"
                            onClick={() => {
                              if (typeof navigator !== "undefined" && navigator.clipboard) {
                                navigator.clipboard.writeText(entry.definition_text);
                                toast.success(`Copied formula: ${entry.term}`);
                              }
                            }}
                          >
                            Copy
                          </Button>
                        </div>
                        <h3 className="font-bold text-base mt-1 text-foreground">{entry.term}</h3>
                      </div>
                      <div className="mt-3 rounded-lg border border-border/80 bg-muted/40 p-3 font-mono text-xs font-semibold text-primary">
                        {entry.definition_text}
                      </div>
                    </article>
                  ))}
                </div>
              </section>
            ) : null}

            {commandWords.length > 0 ? (
              <section className="overflow-hidden rounded-2xl border border-amber-300/50 bg-linear-to-br from-amber-50 to-card dark:from-amber-950/30 dark:to-card">
                <div className="flex flex-col gap-3 border-b border-amber-300/40 p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6">
                  <div>
                    <Badge className="mb-2 bg-amber-500 text-white hover:bg-amber-500">
                      Exam technique
                    </Badge>
                    <h2 className="text-xl font-bold">Command words</h2>
                    <p className="mt-1 text-sm text-muted-foreground">
                      The instruction controls the structure, depth and assessment objective of your
                      answer.
                    </p>
                  </div>
                  <div className="flex items-center gap-2 text-sm font-semibold text-amber-700 dark:text-amber-300">
                    <Sparkles className="size-4" /> Read these before practising
                    <ArrowRight className="size-4" />
                  </div>
                </div>
                <div className="grid gap-px bg-amber-300/40 sm:grid-cols-2 lg:grid-cols-3">
                  {commandWords.map((entry) => (
                    <DefinitionCard
                      key={entry.id}
                      entry={entry}
                      isStaff={isStaff}
                      commandWord
                      onEdit={setEditor}
                      onDelete={handleDelete}
                    />
                  ))}
                </div>
              </section>
            ) : null}
          </>
        )}
      </div>
      <Dialog open={Boolean(editor)} onOpenChange={(open) => !open && setEditor(null)}>
        <DialogContent className="sm:max-w-xl">
          <DialogHeader>
            <DialogTitle>{editor?.id ? "Edit definition" : "Add definition"}</DialogTitle>
            <DialogDescription>
              Check that the wording is precise, concise and suitable for Cambridge 0455.
            </DialogDescription>
          </DialogHeader>
          {editor ? (
            <div className="space-y-4">
              <div className="space-y-1.5">
                <Label>Term</Label>
                <Input
                  value={editor.term}
                  onChange={(event) => setEditor({ ...editor, term: event.target.value })}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Definition or explanation</Label>
                <Textarea
                  rows={6}
                  value={editor.definitionText}
                  onChange={(event) => setEditor({ ...editor, definitionText: event.target.value })}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Topic</Label>
                <select
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                  value={editor.category}
                  onChange={(event) => setEditor({ ...editor, category: event.target.value })}
                >
                  {[...TOPIC_ORDER, "Command words"].map((topic) => (
                    <option key={topic}>{topic}</option>
                  ))}
                </select>
              </div>
              <Button
                className="w-full"
                onClick={handleSave}
                disabled={!editor.term.trim() || !editor.definitionText.trim()}
              >
                <Check className="size-4" /> Save definition
              </Button>
            </div>
          ) : null}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function DefinitionCard({
  entry,
  isStaff,
  number,
  commandWord = false,
  onEdit,
  onDelete,
}: {
  entry: DefinitionListRow;
  isStaff: boolean;
  number?: number;
  commandWord?: boolean;
  onEdit: (editor: EditorState) => void;
  onDelete: (id: string) => void;
}) {
  return (
    <article className={commandWord ? "bg-card p-5" : "bg-card p-4 sm:p-5"}>
      <div className="flex items-start justify-between gap-2">
        <div className="flex min-w-0 items-start gap-2.5">
          {number ? (
            <span className="mt-0.5 font-mono text-[10px] font-semibold text-muted-foreground/70">
              {String(number).padStart(2, "0")}
            </span>
          ) : null}
          <h3 className="font-semibold leading-tight">{entry.term}</h3>
        </div>
        {isStaff ? (
          <div className="flex shrink-0">
            <Button
              variant="ghost"
              size="icon"
              className="size-7"
              onClick={() =>
                onEdit({
                  id: entry.id,
                  term: entry.term,
                  definitionText: entry.definition_text,
                  category: entry.category ?? "Other economic concepts",
                })
              }
            >
              <Pencil className="size-3.5" />
            </Button>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="ghost" size="icon" className="size-7">
                  <Trash2 className="size-3.5" />
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Remove this definition?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This permanently removes “{entry.term}” from the student hub.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction onClick={() => onDelete(entry.id)}>Remove</AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        ) : null}
      </div>
      <p className="mt-2 text-sm leading-6 text-muted-foreground">{entry.definition_text}</p>
    </article>
  );
}

function HubStat({ value, label }: { value: number; label: string }) {
  return (
    <div className="rounded-xl border bg-background/75 px-3 py-3 text-center shadow-sm backdrop-blur-sm">
      <p className="text-xl font-bold tabular-nums sm:text-2xl">{value}</p>
      <p className="mt-0.5 text-[10px] font-semibold tracking-wide text-muted-foreground uppercase sm:text-xs">
        {label}
      </p>
    </div>
  );
}
