import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { AlertTriangle, BookMarked, Globe2, Lightbulb, Plus, Search, Tags } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import { PageHeader } from "@/components/app/app-shell";
import { Button } from "@/components/ui/button";
import { EconomicsDiagram } from "@/components/diagrams/economics-diagram";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { DIAGRAMS as BUILT_IN, SECTIONS } from "@/lib/diagrams/catalog";
import { toDiagramEntry } from "@/lib/diagrams/custom";
import { listCustomDiagrams } from "@/lib/diagrams.functions";
import { getMe } from "@/lib/account.functions";
import type { DiagramEntry, DiagramSection } from "@/lib/diagrams/types";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/diagrams")({
  validateSearch: (search: Record<string, unknown>): { id?: string; q?: string } => ({
    id: typeof search.id === "string" ? search.id : undefined,
    q: typeof search.q === "string" ? search.q : undefined,
  }),
  head: () => ({
    meta: [
      { title: "Diagram library — Cambridge IGCSE 0455 Economics" },
      {
        name: "description",
        content:
          "Every Cambridge IGCSE Economics (0455) diagram, drawn to exam convention, with label-by-label definitions, examiner tips, common mistakes and real-world examples.",
      },
      { property: "og:title", content: "Diagram library — Cambridge IGCSE 0455 Economics" },
      {
        property: "og:description",
        content:
          "Micro and macro diagrams explained the way an examiner marks them: what, why, when and how to read each one.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: DiagramLibraryPage,
});

function DiagramLibraryPage() {
  const routeSearch = Route.useSearch();
  const [section, setSection] = useState<DiagramSection>("Microeconomics");
  const [query, setQuery] = useState(() => routeSearch.q ?? "");
  const [selectedId, setSelectedId] = useState<string>(() => routeSearch.id ?? BUILT_IN[0]?.id ?? "");

  useEffect(() => {
    if (routeSearch.id) {
      setSelectedId(routeSearch.id);
      const found = BUILT_IN.find((d) => d.id === routeSearch.id);
      if (found) setSection(found.section);
    }
    if (typeof routeSearch.q === "string") {
      setQuery(routeSearch.q);
    }
  }, [routeSearch.id, routeSearch.q]);

  const fetchMe = useServerFn(getMe);
  const me = useQuery({ queryKey: ["me"], queryFn: () => fetchMe() });

  const fetchCustom = useServerFn(listCustomDiagrams);
  const custom = useQuery({ queryKey: ["custom-diagrams"], queryFn: () => fetchCustom() });

  const DIAGRAMS = useMemo(
    () => [...BUILT_IN, ...(custom.data ?? []).map(toDiagramEntry)],
    [custom.data],
  );

  const topicOrder = (target: DiagramSection) => {
    const seen: string[] = [];
    for (const entry of DIAGRAMS) {
      if (entry.section !== target) continue;
      if (!seen.includes(entry.topic)) seen.push(entry.topic);
    }
    return seen;
  };

  const list = useMemo(() => {
    const q = query.trim().toLowerCase();
    return DIAGRAMS.filter((entry) => {
      if (!q && entry.section !== section) return false;
      if (!q) return true;
      return (
        entry.title.toLowerCase().includes(q) ||
        entry.topic.toLowerCase().includes(q) ||
        entry.represents.toLowerCase().includes(q)
      );
    });
  }, [DIAGRAMS, query, section]);

  const selected =
    DIAGRAMS.find((entry) => entry.id === selectedId) ?? list[0] ?? DIAGRAMS[0] ?? null;

  const groups = useMemo(() => {
    const order = query.trim()
      ? [...new Set(list.map((entry) => entry.topic))]
      : topicOrder(section);
    return order
      .map((topic) => ({ topic, items: list.filter((entry) => entry.topic === topic) }))
      .filter((group) => group.items.length > 0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [DIAGRAMS, list, query, section]);

  return (
    <>
      <PageHeader
        title="Diagram library"
        description={`${DIAGRAMS.length} Cambridge IGCSE 0455 diagrams drawn to exam convention — with label definitions, examiner tips, common mistakes and real-world examples.`}
        action={
          me.data?.isAdmin ? (
            <Link to="/admin" search={{ tab: "diagrams" }}>
              <Button size="sm" className="gap-1.5">
                <Plus className="size-4" /> Add custom diagram
              </Button>
            </Link>
          ) : null
        }
      />

      {/* Mobile Diagram Selector (< lg screens) */}
      <div className="lg:hidden p-3.5 border-b border-border bg-card/60 space-y-2.5">
        <div className="flex items-center justify-between gap-2">
          <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
            <BookMarked className="size-3.5 text-primary" /> Diagram ({DIAGRAMS.length})
          </span>
          <div className="flex gap-1 rounded-md bg-muted p-0.5">
            {SECTIONS.map((item) => (
              <button
                key={item}
                type="button"
                onClick={() => {
                  setSection(item);
                  setQuery("");
                }}
                className={cn(
                  "rounded px-2.5 py-1 text-[11px] font-medium text-muted-foreground transition-colors",
                  section === item && !query.trim() && "bg-background text-foreground font-semibold shadow-2xs",
                )}
              >
                {item === "Microeconomics" ? "Micro" : "Macro"}
              </button>
            ))}
          </div>
        </div>
        <Select value={selected?.id} onValueChange={(val) => setSelectedId(val)}>
          <SelectTrigger className="w-full bg-background text-xs font-semibold h-9">
            <SelectValue placeholder="Choose a diagram..." />
          </SelectTrigger>
          <SelectContent className="max-h-80">
            {groups.map((group) => (
              <SelectGroup key={group.topic}>
                <SelectLabel className="text-[10px] font-bold text-muted-foreground uppercase">{group.topic}</SelectLabel>
                {group.items.map((entry) => (
                  <SelectItem key={entry.id} value={entry.id} className="text-xs">
                    {entry.title}
                  </SelectItem>
                ))}
              </SelectGroup>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="grid min-h-0 flex-1 gap-0 lg:grid-cols-[300px_1fr]">
        <aside className="hidden lg:block border-border lg:border-r lg:sticky lg:top-12 lg:self-start lg:max-h-[calc(100dvh-3rem)] lg:overflow-y-auto custom-scrollbar">
          <div className="space-y-3 border-b border-border p-4">
            <div className="flex gap-1 rounded-lg bg-muted p-1">
              {SECTIONS.map((item) => (
                <button
                  key={item}
                  type="button"
                  onClick={() => {
                    setSection(item);
                    setQuery("");
                  }}
                  className={cn(
                    "flex-1 rounded-md px-2 py-1.5 text-xs font-medium text-muted-foreground transition-colors",
                    section === item && !query.trim() && "bg-background text-foreground shadow-sm",
                  )}
                >
                  {item === "Microeconomics" ? "Micro" : "Macro"}
                </button>
              ))}
            </div>
            <div className="relative">
              <Search className="pointer-events-none absolute top-2.5 left-2.5 size-4 text-muted-foreground" />
              <Input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search all diagrams"
                className="pl-8"
              />
            </div>
          </div>

          <nav className="max-h-[70vh] space-y-4 overflow-y-auto p-4">
            {groups.map((group) => (
              <div key={group.topic}>
                <p className="mb-1.5 text-[11px] font-semibold tracking-wide text-muted-foreground uppercase">
                  {group.topic}
                </p>
                <div className="space-y-0.5">
                  {group.items.map((entry) => (
                    <button
                      key={entry.id}
                      type="button"
                      onClick={() => setSelectedId(entry.id)}
                      className={cn(
                        "block w-full rounded-md px-2.5 py-1.5 text-left text-sm text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground",
                        selected?.id === entry.id && "bg-accent font-medium text-accent-foreground",
                      )}
                    >
                      {entry.title}
                    </button>
                  ))}
                </div>
              </div>
            ))}
            {groups.length === 0 ? (
              <p className="text-sm text-muted-foreground">No diagram matches that search.</p>
            ) : null}
          </nav>
        </aside>

        {selected ? <DiagramDetail entry={selected} onSelect={setSelectedId} /> : null}
      </div>
    </>
  );
}

function DiagramDetail({
  entry,
  onSelect,
}: {
  entry: DiagramEntry;
  onSelect: (id: string) => void;
}) {
  return (
    <article className="min-w-0 space-y-6 p-5 md:p-8">
      <header className="space-y-2">
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="secondary">{entry.section}</Badge>
          <Badge variant="outline">{entry.topic}</Badge>
          <Badge variant="outline">{entry.level}</Badge>
        </div>
        <h2 className="text-xl font-semibold md:text-2xl">{entry.title}</h2>
        <p className="max-w-3xl text-sm text-muted-foreground">{entry.represents}</p>
      </header>

      <div className="rounded-xl border border-border bg-card p-4 md:p-6">
        <EconomicsDiagram spec={entry.spec} title={entry.title} className="mx-auto max-w-2xl" />
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Panel title="Why Cambridge uses it">{entry.whyUsed}</Panel>
        <Panel title="When to draw it">{entry.whenToDraw}</Panel>
        <Panel title="What it represents">{entry.represents}</Panel>
      </div>

      <Section title="How to read it, step by step">
        <ol className="space-y-2">
          {entry.howToRead.map((step, index) => (
            <li key={index} className="flex gap-3 text-sm">
              <span className="mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full bg-primary/15 text-[11px] font-semibold text-primary">
                {index + 1}
              </span>
              <span className="text-muted-foreground">{step}</span>
            </li>
          ))}
        </ol>
      </Section>

      <Section title="Every label explained" icon={<Tags className="size-4" />}>
        <dl className="divide-y divide-border">
          {entry.labels.map((label) => (
            <div key={label.symbol} className="grid gap-1 py-2.5 sm:grid-cols-[110px_1fr] sm:gap-4">
              <dt className="font-mono text-sm font-semibold text-foreground">{label.symbol}</dt>
              <dd className="text-sm text-muted-foreground">{label.meaning}</dd>
            </div>
          ))}
        </dl>
      </Section>

      <div className="grid gap-4 md:grid-cols-2">
        <Section
          title="Common mistakes"
          icon={<AlertTriangle className="size-4 text-destructive" />}
        >
          <List items={entry.mistakes} />
        </Section>
        <Section title="Examiner tips" icon={<Lightbulb className="size-4 text-primary" />}>
          <List items={entry.tips} />
        </Section>
        <Section title="Real-world examples" icon={<Globe2 className="size-4" />}>
          <List items={entry.realWorld} />
        </Section>
        <Section title="Typical exam questions" icon={<BookMarked className="size-4" />}>
          <List items={entry.examQuestions} />
        </Section>
      </div>

      {entry.related.length > 0 ? (
        <Section title="Related diagrams">
          <div className="flex flex-wrap gap-2">
            {entry.related.map((id) => {
              const related = BUILT_IN.find((item) => item.id === id);
              if (!related) return null;
              return (
                <button
                  key={id}
                  type="button"
                  onClick={() => onSelect(id)}
                  className="rounded-full border border-border px-3 py-1 text-xs text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
                >
                  {related.title}
                </button>
              );
            })}
          </div>
        </Section>
      ) : null}
    </article>
  );
}

function Panel({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-lg border border-border bg-card p-4">
      <p className="mb-1.5 text-[11px] font-semibold tracking-wide text-muted-foreground uppercase">
        {title}
      </p>
      <p className="text-sm text-muted-foreground">{children}</p>
    </div>
  );
}

function Section({
  title,
  icon,
  children,
}: {
  title: string;
  icon?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-xl border border-border bg-card p-4 md:p-5">
      <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold">
        {icon}
        {title}
      </h3>
      {children}
    </section>
  );
}

function List({ items }: { items: string[] }) {
  return (
    <ul className="space-y-2">
      {items.map((item, index) => (
        <li key={index} className="flex gap-2.5 text-sm text-muted-foreground">
          <span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-muted-foreground/60" />
          <span>{item}</span>
        </li>
      ))}
    </ul>
  );
}
