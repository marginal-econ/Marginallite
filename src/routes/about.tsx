import { createFileRoute, Link } from "@tanstack/react-router";
import {
  ArrowLeft,
  ArrowRight,
  Clock,
  Linkedin,
  PenLine,
  RefreshCw,
  ShieldCheck,
  TriangleAlert,
} from "lucide-react";

import { SiteFooter } from "@/components/marketing/footer";
import { Reveal } from "@/components/marketing/reveal";

export const Route = createFileRoute("/about")({
  head: () => ({
    meta: [
      { title: "About us — Marginalite" },
      {
        name: "description",
        content:
          "Meet the two people building Marginalite, the Cambridge IGCSE Economics (0455) response-marking tool.",
      },
    ],
  }),
  component: AboutPage,
});

const founders = [
  {
    name: "Saikrish Karthikeyan",
    initials: "SK",
    role: "Co-founder and CEO",
    linkedin: "https://www.linkedin.com/in/saikrish-karthikeyan-074453400/",
    photo: "/founders/sai-krish.webp",
  },
  {
    name: "Suthir R",
    initials: "SR",
    role: "Co-founder and Design Head",
    linkedin: "https://www.linkedin.com/in/suthir-r",
    photo: "/founders/suthir.webp",
  },
];

const loop = [
  {
    icon: PenLine,
    title: "Essay written",
    text: "An hour of thinking, handed in and out of your hands.",
  },
  {
    icon: Clock,
    title: "Marked, eventually",
    text: "A number at the top of the page, a fortnight after you wrote it.",
  },
  {
    icon: RefreshCw,
    title: "Same gap, next essay",
    text: "Whatever cost the marks is still there, unnamed and unfixed.",
  },
];

function AboutPage() {
  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-40 border-b border-border bg-background/85 backdrop-blur-xl">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-5 py-3 md:px-8">
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
            <ArrowLeft className="size-4" /> Back to site
          </Link>
        </div>
      </header>

      <section className="relative overflow-hidden border-b-[1.5px] border-ink bg-plum text-plum-foreground">
        <div
          className="paper-grid pointer-events-none absolute inset-0 opacity-20"
          aria-hidden="true"
        />
        <div className="relative mx-auto max-w-6xl px-5 py-14 md:px-8 md:py-20">
          <p className="eyebrow text-plum-foreground/60">About</p>
          <h1 className="mt-2.5 max-w-4xl text-3xl font-bold text-balance md:text-5xl">
            A response comes back in two weeks. The exam does not wait that long.
          </h1>
          <p className="mt-5 max-w-3xl text-base leading-relaxed text-plum-foreground/80 md:text-lg">
            Marginalite is being built by two people for one syllabus — Cambridge IGCSE Economics (0455)
            — because the gap between writing a response and finding out what was wrong with it is
            where most learning quietly goes missing.
          </p>
          <div className="mt-8 flex items-center gap-4">
            <div className="flex -space-x-3" aria-hidden="true">
              {founders.map((founder) => (
                <img
                  key={founder.initials}
                  src={founder.photo}
                  alt=""
                  className="size-11 rounded-full border-[1.5px] border-ink bg-surface object-cover object-top"
                />
              ))}
            </div>
            <span className="text-sm font-medium text-plum-foreground/85">
              Built by Saikrish and Suthir
            </span>
          </div>
          <div className="mt-7 flex flex-wrap gap-2">
            {["One syllabus — Cambridge 0455", "Independent of Cambridge", "Built carefully"].map(
              (fact) => (
                <span
                  key={fact}
                  className="rounded-full border border-plum-foreground/25 bg-plum-foreground/10 px-3 py-1 text-xs font-medium text-plum-foreground/85"
                >
                  {fact}
                </span>
              ),
            )}
          </div>
        </div>
      </section>

      <main className="mx-auto max-w-6xl space-y-16 px-5 py-14 md:px-8 md:py-20">
        <Reveal>
          <section>
            <p className="eyebrow eyebrow-accent">Why we are building it</p>
            <h2 className="mt-2 max-w-3xl text-2xl font-bold text-balance md:text-3xl">
              The mark is the easy part. Knowing <span className="highlight">why</span> is the part
              nobody has time for.
            </h2>
            <div className="mt-8 grid gap-3 sm:grid-cols-3">
              {loop.map((item, index) => (
                <div key={item.title} className="pop relative bg-surface p-5">
                  <span className="absolute top-4 right-4 font-mono text-xs font-bold text-muted-foreground/60">
                    0{index + 1}
                  </span>
                  <item.icon className="size-5 text-primary" />
                  <p className="mt-3 text-sm font-bold">{item.title}</p>
                  <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">
                    {item.text}
                  </p>
                </div>
              ))}
            </div>
            <div className="mt-10 grid gap-8 md:grid-cols-[1fr_auto_1fr] md:gap-10">
              <div className="space-y-4 text-sm leading-relaxed text-muted-foreground md:text-base">
                <p>
                  A 0455 response is not marked on whether the answer is right. It is marked on
                  knowledge, application, analysis and evaluation — and a script can be full of
                  correct economics yet still lose marks because the evaluation never arrives.
                </p>
                <p>
                  Teachers know this better than anyone, but detailed feedback takes hours. So
                  feedback comes back thin, late, or both, and the next essay repeats the same
                  mistake.
                </p>
              </div>
              <div className="hidden w-px bg-border md:block" />
              <div className="space-y-4">
                <p className="quote text-xl text-foreground md:text-2xl">
                  Not a tutor. Not a replacement for a teacher. One thing, done carefully.
                </p>
                <p className="text-sm leading-relaxed text-muted-foreground md:text-base">
                  Marginalite gives a response back with an assessment-objective breakdown: what earned
                  marks, what did not, and what a stronger answer would have done differently.
                </p>
              </div>
            </div>
          </section>
        </Reveal>

        <Reveal>
          <section>
            <p className="eyebrow eyebrow-accent">Who is building it</p>
            <h2 className="mt-2 text-2xl font-bold text-balance md:text-3xl">
              Two co-founders, and no one else yet.
            </h2>
            <p className="mt-3 max-w-2xl text-sm leading-relaxed text-muted-foreground md:text-base">
              Both profiles are public — worth a look before you give an early product your email
              address.
            </p>
            <div className="mt-8 grid gap-5 sm:grid-cols-2">
              {founders.map((founder) => (
                <a
                  key={founder.initials}
                  href={founder.linkedin}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="pop pop-press group block overflow-hidden bg-surface"
                >
                  <div className="relative overflow-hidden border-b-[1.5px] border-ink bg-[#f3ebdf]">
                    <img
                      src={founder.photo}
                      alt={`${founder.name}, co-founder of Marginalite`}
                      className="aspect-square w-full object-cover transition-transform duration-500 ease-out group-hover:scale-[1.03]"
                    />
                    <span className="absolute top-3 left-3 rounded-md border-[1.5px] border-ink bg-surface/90 px-2 py-0.5 font-mono text-xs font-bold">
                      {founder.initials}
                    </span>
                  </div>
                  <div className="flex items-center justify-between gap-3 p-5">
                    <div>
                      <p className="text-lg font-bold">{founder.name}</p>
                      <p className="mt-0.5 text-sm text-muted-foreground">{founder.role}</p>
                    </div>
                    <span className="pop-sm inline-flex size-10 shrink-0 items-center justify-center bg-primary text-primary-foreground">
                      <Linkedin className="size-4" />
                    </span>
                  </div>
                </a>
              ))}
            </div>
          </section>
        </Reveal>

        <Reveal>
          <section>
            <p className="eyebrow eyebrow-accent">What Marginalite is not</p>
            <h2 className="mt-2 text-2xl font-bold text-balance md:text-3xl">
              Two things worth saying plainly.
            </h2>
            <div className="mt-7 grid gap-4 md:grid-cols-2">
              <HonestyCard icon={ShieldCheck} title="It is independent.">
                Marginalite is not affiliated with, endorsed by, or connected to Cambridge Assessment
                International Education. The syllabus code describes what the tool marks, and
                nothing more.
              </HonestyCard>
              <HonestyCard icon={TriangleAlert} title="It can be wrong.">
                Marking is done by AI, and AI can make mistakes — on marks, feedback, and reading
                text from a photographed script. Every mark is a second opinion, not a verdict.
              </HonestyCard>
            </div>
            <p className="mt-5 text-sm text-muted-foreground">
              The longer version is in the{" "}
              <Link to="/terms" className="font-medium underline underline-offset-4">
                terms
              </Link>{" "}
              and{" "}
              <Link to="/privacy" className="font-medium underline underline-offset-4">
                privacy policy
              </Link>
              .
            </p>
          </section>
        </Reveal>

        <Reveal>
          <section className="pop relative overflow-hidden bg-plum p-7 text-plum-foreground md:p-10">
            <div className="paper-grid pointer-events-none absolute inset-0 opacity-20" />
            <div className="relative flex flex-col items-start gap-5 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="text-xl font-bold md:text-2xl">Want it when it opens?</h2>
                <p className="mt-1.5 text-sm text-plum-foreground/75">
                  One email when the first cohort opens. Nothing else.
                </p>
              </div>
              <Link
                to="/"
                hash="join"
                className="pop pop-press inline-flex items-center gap-2 bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground"
              >
                Join the waitlist <ArrowRight className="size-4" />
              </Link>
            </div>
          </section>
        </Reveal>
      </main>
      <SiteFooter />
    </div>
  );
}

function HonestyCard({
  icon: Icon,
  title,
  children,
}: {
  icon: typeof ShieldCheck;
  title: string;
  children: string;
}) {
  return (
    <div className="pop relative overflow-hidden bg-surface p-6 md:p-7">
      <div className="paper-grid pointer-events-none absolute inset-0 opacity-35" />
      <div className="relative">
        <span className="pop-sm inline-flex size-10 items-center justify-center bg-ao1/15 text-foreground">
          <Icon className="size-5" />
        </span>
        <h3 className="mt-4 text-lg font-bold">{title}</h3>
        <p className="mt-2 text-sm leading-relaxed text-muted-foreground md:text-base">
          {children}
        </p>
      </div>
    </div>
  );
}
