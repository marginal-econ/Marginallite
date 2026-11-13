import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import {
  ArrowUpRight,
  BookOpen,
  CircleDot,
  LibraryBig,
  PenLine,
  Sparkles,
  TrendingUp,
  UsersRound,
} from "lucide-react";

import { PageHeader } from "@/components/app/app-shell";
import { SiteFooter } from "@/components/marketing/footer";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { listMyEssays, getProgress } from "@/lib/grading.functions";
import { getCommunityPulse, getMe } from "@/lib/account.functions";
import { listDocuments } from "@/lib/knowledge.functions";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({
    meta: [
      { title: "Dashboard — Marginalite Economics" },
      {
        name: "description",
        content:
          "Track your Cambridge IGCSE 0455 Economics essay marks, AO breakdown and knowledge base coverage in one place.",
      },
      { property: "og:title", content: "Dashboard — Marginalite Economics" },
      {
        property: "og:description",
        content: "Your marks, assessment-objective trends and graded essay history.",
      },
    ],
  }),
  component: DashboardPage,
});

export function DashboardPage() {
  const fetchProgress = useServerFn(getProgress);
  const fetchEssays = useServerFn(listMyEssays);
  const fetchMe = useServerFn(getMe);
  const fetchDocs = useServerFn(listDocuments);
  const fetchCommunityPulse = useServerFn(getCommunityPulse);

  const progress = useQuery({ queryKey: ["progress"], queryFn: () => fetchProgress() });
  const essays = useQuery({ queryKey: ["essays"], queryFn: () => fetchEssays() });
  const me = useQuery({ queryKey: ["me"], queryFn: () => fetchMe() });
  const docs = useQuery({
    queryKey: ["documents"],
    queryFn: () => fetchDocs(),
    enabled: me.data?.isStaff === true,
  });
  const communityPulse = useQuery({
    queryKey: ["community-pulse"],
    queryFn: () => fetchCommunityPulse(),
    refetchInterval: 60_000,
  });

  const versions = progress.data ?? [];
  const marks = versions.map((v) => v.total_mark ?? 0);
  const average = marks.length ? marks.reduce((a, b) => a + b, 0) / marks.length : 0;
  const best = marks.length ? Math.max(...marks) : 0;
  const readyDocs = (docs.data ?? []).filter((document) => document.status === "ready").length;
  const recent = marks.slice(-5);
  const earlier = marks.slice(0, -5);
  const delta =
    recent.length && earlier.length
      ? recent.reduce((a, b) => a + b, 0) / recent.length -
        earlier.reduce((a, b) => a + b, 0) / earlier.length
      : 0;

  const aoAverage = (key: "ao1_awarded" | "ao2_awarded" | "ao3_awarded") => {
    const values = versions.map((v) => v[key] ?? 0);
    return values.length ? values.reduce((a, b) => a + b, 0) / values.length : 0;
  };

  return (
    <>
      <PageHeader
        title="Dashboard"
        description="Everything you've submitted, marked against Cambridge IGCSE 0455 standards."
        action={
          <Button asChild className="bg-primary text-primary-foreground hover:bg-primary/90 font-semibold shadow-xs">
            <Link to="/grade">
              <PenLine className="size-4 mr-1.5" /> Mark an answer
            </Link>
          </Button>
        }
      />

      <div className="space-y-6 px-5 py-6 md:px-8">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Stat
            label="Answers marked"
            value={String(versions.length)}
            hint={`${essays.data?.length ?? 0} submission threads`}
            loading={progress.isLoading}
          />
          <Stat
            label="Average mark"
            value={versions.length ? average.toFixed(1) : "—"}
            hint={
              delta !== 0
                ? `${delta > 0 ? "+" : ""}${delta.toFixed(1)} vs earlier attempts`
                : "Submit more to see a trend"
            }
            loading={progress.isLoading}
          />
          <Stat
            label="Best mark"
            value={versions.length ? String(best) : "—"}
            hint="Highest single attempt"
            loading={progress.isLoading}
          />
          <Stat
            label="Knowledge base"
            value={me.data?.isStaff ? String(readyDocs) : "130+"}
            hint="0455 Sources ready for grounding"
            loading={me.isLoading || (me.data?.isStaff === true && docs.isLoading)}
          />
        </div>

        {versions.length > 0 ? (
          <div className="panel p-5">
            <h2 className="flex items-center gap-2 text-sm font-semibold">
              <TrendingUp className="size-4 text-primary" /> Assessment objective averages
            </h2>
            <div className="mt-4 grid gap-4 sm:grid-cols-3">
              <AoBar label="AO1 Knowledge" value={aoAverage("ao1_awarded")} tone="bg-ao1" />
              <AoBar label="AO2 Analysis" value={aoAverage("ao2_awarded")} tone="bg-ao2" />
              <AoBar label="AO3 Evaluation" value={aoAverage("ao3_awarded")} tone="bg-ao3" />
            </div>
            <p className="mt-4 text-xs text-muted-foreground">
              Evaluation is where most 0455 candidates lose marks — a weak AO3 average usually means
              judgements are asserted rather than weighed with clear reasoned justification.
            </p>
          </div>
        ) : null}

        <div className="panel">
          <div className="flex items-center justify-between border-b border-border px-5 py-3.5">
            <h2 className="text-sm font-semibold">Recent submissions</h2>
            <Button asChild variant="ghost" size="sm">
              <Link to="/knowledge">
                <BookOpen className="size-4" /> Knowledge base
              </Link>
            </Button>
          </div>

          {essays.isLoading ? (
            <div className="space-y-2 p-5">
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-12 w-full" />
            </div>
          ) : (essays.data?.length ?? 0) === 0 ? (
            <div className="px-5 py-12 text-center">
              <p className="text-sm text-muted-foreground">
                No submissions yet. Paste a Cambridge past-paper question and your answer to get a mark with a full
                AO breakdown.
              </p>
              <Button asChild className="mt-4 bg-primary text-primary-foreground hover:bg-primary/90 font-semibold shadow-xs">
                <Link to="/grade">Mark your first answer</Link>
              </Button>
            </div>
          ) : (
            <ul className="divide-y divide-border">
              {essays.data?.map((essay) => (
                <li key={essay.id}>
                  <Link
                    to="/essay/$essayId"
                    params={{ essayId: essay.id }}
                    className="flex items-center gap-4 px-5 py-3.5 transition-colors hover:bg-accent/50"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm">{essay.question}</p>
                      <p className="mt-0.5 text-xs text-muted-foreground">
                        {new Date(essay.updated_at).toLocaleDateString(undefined, {
                          day: "numeric",
                          month: "short",
                          year: "numeric",
                        })}
                      </p>
                    </div>
                    <span className="text-sm font-semibold tabular-nums">
                      {essay.latest_mark ?? "—"}
                      <span className="text-muted-foreground">/{essay.max_mark}</span>
                    </span>
                    <ArrowUpRight className="size-4 shrink-0 text-muted-foreground" />
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>

        <section className="grid gap-5 lg:grid-cols-[1.1fr_1.9fr]">
          <div className="relative overflow-hidden rounded-xl border border-primary/20 bg-primary/[0.07] p-6 dark:bg-primary/[0.12]">
            <div className="absolute -top-8 -right-6 size-28 rounded-full bg-primary/15 blur-2xl" />
            <div className="relative">
              <div className="flex items-center gap-2 text-sm font-semibold">
                <span className="relative flex size-8 items-center justify-center rounded-full bg-primary text-primary-foreground">
                  <UsersRound className="size-4" />
                  <span className="absolute -right-0.5 -bottom-0.5 size-2.5 rounded-full border-2 border-background bg-emerald-400" />
                </span>
                Community pulse
              </div>
              {communityPulse.isLoading ? (
                <Skeleton className="mt-6 h-10 w-28" />
              ) : (
                <p className="mt-6 text-4xl font-semibold tracking-tight tabular-nums">
                  {communityPulse.data?.onlineCount ?? 0}
                </p>
              )}
              <p className="mt-1 text-sm text-muted-foreground">
                member{communityPulse.data?.onlineCount === 1 ? "" : "s"} studying now
              </p>
              <p className="mt-5 text-xs leading-relaxed text-muted-foreground">
                {communityPulse.data?.memberCount
                  ? `Part of a ${communityPulse.data.memberCount}-member Cambridge Economics community.`
                  : "The community is ready for students and classes."}
              </p>
            </div>
          </div>

          <div className="panel p-6">
            <div className="flex items-center gap-2">
              <CircleDot className="size-4 text-primary" />
              <h2 className="text-sm font-semibold">A focused next step</h2>
            </div>
            <p className="mt-3 max-w-2xl text-sm leading-relaxed text-muted-foreground">
              Build momentum with one small, specific session. Your dashboard keeps the route simple
              so you can spend your time on Economics rather than deciding what to open.
            </p>
            <div className="mt-5 grid gap-3 sm:grid-cols-3">
              <DashboardLink
                to="/grade"
                icon={PenLine}
                title="Mark an answer"
                description="Get an AO breakdown."
              />
              <DashboardLink
                to="/question-bank"
                icon={LibraryBig}
                title="Choose a question"
                description="Find your next practice prompt."
              />
              <DashboardLink
                to="/practice"
                icon={Sparkles}
                title="Train an AO skill"
                description="Sharpen analysis or evaluation."
              />
            </div>
          </div>
        </section>

        <section className="grid gap-4 rounded-xl border border-border bg-muted/35 p-5 md:grid-cols-[1fr_auto] md:items-center md:p-7">
          <div>
            <p className="eyebrow text-primary">Your study space</p>
            <h2 className="mt-2 text-xl font-semibold tracking-tight">
              Keep the next answer a little better.
            </h2>
            <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted-foreground">
              Come back after each attempt to spot a pattern, revisit the question bank, and turn
              feedback into a stronger next response.
            </p>
          </div>
          <Button asChild variant="outline" className="justify-self-start md:justify-self-end">
            <Link to="/review">Open review panel</Link>
          </Button>
        </section>
      </div>
      <SiteFooter />
    </>
  );
}

function DashboardLink({
  to,
  icon: Icon,
  title,
  description,
}: {
  to: "/grade" | "/question-bank" | "/practice";
  icon: typeof PenLine;
  title: string;
  description: string;
}) {
  return (
    <Link
      to={to}
      className="group rounded-lg border border-border bg-background p-4 transition-all duration-200 ease-out hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-md motion-reduce:transform-none"
    >
      <Icon className="size-4 text-primary transition-transform duration-200 group-hover:scale-110" />
      <p className="mt-3 text-sm font-medium">{title}</p>
      <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{description}</p>
    </Link>
  );
}

function Stat({
  label,
  value,
  hint,
  loading,
}: {
  label: string;
  value: string;
  hint: string;
  loading: boolean;
}) {
  return (
    <div className="panel p-4">
      <p className="text-xs text-muted-foreground">{label}</p>
      {loading ? (
        <Skeleton className="mt-2 h-8 w-16" />
      ) : (
        <p className="mt-1 text-3xl font-semibold tabular-nums">{value}</p>
      )}
      <p className="mt-1.5 text-xs text-muted-foreground">{hint}</p>
    </div>
  );
}

function AoBar({ label, value, tone }: { label: string; value: number; tone: string }) {
  return (
    <div>
      <div className="flex items-baseline justify-between">
        <span className="text-xs text-muted-foreground">{label}</span>
        <span className="text-sm font-semibold tabular-nums">{value.toFixed(1)}</span>
      </div>
      <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-muted">
        <div
          className={tone + " h-full rounded-full"}
          style={{ width: `${Math.min(value * 16, 100)}%` }}
        />
      </div>
    </div>
  );
}
