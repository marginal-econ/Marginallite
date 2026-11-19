/**
 * The shell both legal pages share.
 *
 * Terms pages get skimmed, not read, so this one is built for skimming: a
 * plain-English summary up top, numbered sections with stable anchors, and a
 * sticky contents list on wide screens. The chrome is the same sticker-and-
 * ink language as the landing page — a legal page that looks like it came
 * from a different website is a legal page nobody trusts.
 */

import { Link } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";

import { SiteFooter } from "@/components/marketing/footer";
import { Reveal } from "@/components/marketing/reveal";

export type LegalSection = {
  id: string;
  title: string;
  body: React.ReactNode;
};

export function LegalPage({
  eyebrow,
  title,
  updated,
  summary,
  sections,
}: {
  eyebrow: string;
  title: string;
  updated: string;
  summary: string[];
  sections: LegalSection[];
}) {
  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-40 border-b border-border bg-background/80 backdrop-blur-xl">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-3 px-5 py-3 md:px-8">
          <Link to="/" className="group flex items-center gap-2.5">
            <img
              src="/marginal-m-icon-clean.png"
              alt=""
              aria-hidden="true"
              className="size-9 object-contain transition-transform duration-300 group-hover:-rotate-6"
            />
            <span className="font-semibold">Marginalite</span>
          </Link>

          <Link
            to="/"
            className="pop-sm pop-press inline-flex items-center gap-1.5 bg-surface px-3 py-2 text-sm font-semibold"
          >
            <ArrowLeft className="size-4" />
            Back to site
          </Link>
        </div>
      </header>

      {/* ── Title band ───────────────────────────────────────────────── */}
      <section className="relative overflow-hidden border-b-[1.5px] border-ink bg-plum text-plum-foreground">
        <div
          className="paper-grid pointer-events-none absolute inset-0 opacity-20"
          aria-hidden="true"
        />
        <div className="relative mx-auto max-w-5xl px-5 py-14 md:px-8 md:py-16">
          <p className="eyebrow text-plum-foreground/60">{eyebrow}</p>
          <h1 className="mt-2.5 text-3xl font-bold text-balance md:text-5xl">{title}</h1>
          <p className="mt-4 font-mono text-xs text-plum-foreground/65">Last updated {updated}</p>

          <div className="pop mt-9 max-w-2xl bg-surface p-5 text-foreground md:p-6">
            <p className="eyebrow eyebrow-accent">In short</p>
            <ul className="mt-3 space-y-2.5">
              {summary.map((line) => (
                <li key={line} className="flex gap-2.5 text-sm leading-relaxed">
                  <span
                    className="mt-[0.55rem] size-1.5 shrink-0 rounded-full bg-primary"
                    aria-hidden="true"
                  />
                  <span>{line}</span>
                </li>
              ))}
            </ul>
            <p className="mt-4 border-t border-border pt-3 text-xs text-muted-foreground">
              The summary is here to be useful, not to replace the sections below — where the two
              differ, the full text is what applies.
            </p>
          </div>
        </div>
      </section>

      {/* ── Body ─────────────────────────────────────────────────────── */}
      <div className="mx-auto grid max-w-5xl gap-12 px-5 py-14 md:px-8 md:py-16 lg:grid-cols-[0.32fr_0.68fr]">
        <nav aria-label="Contents" className="hidden lg:block">
          <div className="sticky top-24">
            <p className="eyebrow">Contents</p>
            <ol className="mt-4 space-y-2 text-sm">
              {sections.map((section, index) => (
                <li key={section.id} className="flex gap-2.5">
                  <span className="font-mono text-xs text-muted-foreground">
                    {String(index + 1).padStart(2, "0")}
                  </span>
                  <a
                    href={`#${section.id}`}
                    className="text-muted-foreground transition-colors hover:text-foreground"
                  >
                    {section.title}
                  </a>
                </li>
              ))}
            </ol>
          </div>
        </nav>

        <div className="min-w-0 space-y-10">
          {sections.map((section, index) => (
            <Reveal key={section.id} delay={index * 30}>
              <section id={section.id} className="scroll-mt-24">
                <h2 className="flex items-baseline gap-3 text-lg font-semibold md:text-xl">
                  <span className="font-mono text-xs text-primary">
                    {String(index + 1).padStart(2, "0")}
                  </span>
                  {section.title}
                </h2>
                <div className="legal-prose mt-3 space-y-3 text-sm leading-relaxed text-muted-foreground">
                  {section.body}
                </div>
              </section>
            </Reveal>
          ))}
        </div>
      </div>

      <SiteFooter />
    </div>
  );
}
