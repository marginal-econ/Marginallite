import { useState } from "react";
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

import { AmbassadorApplyDialog } from "@/components/marketing/ambassador-apply-dialog";
import { SiteFooter } from "@/components/marketing/footer";
import { Reveal } from "@/components/marketing/reveal";
import { ThemeToggle } from "@/components/marketing/theme-toggle";

export const Route = createFileRoute("/about")({
  head: () => ({
    meta: [
      { title: "About Us — Marginal AI | Cambridge IGCSE Economics (0455)" },
      {
        name: "description",
        content:
          "Meet the team building Marginal AI, the Cambridge IGCSE Economics (0455) AI platform featuring automated essay grading and Live Examiner coaching.",
      },
      { name: "robots", content: "index, follow, max-snippet:-1, max-image-preview:large, max-video-preview:-1" },
      { property: "og:site_name", content: "Marginal AI" },
      { property: "og:title", content: "About Us — Marginal AI | Cambridge IGCSE Economics (0455)" },
      {
        property: "og:description",
        content:
          "Meet the team building Marginal AI, the Cambridge IGCSE Economics (0455) AI platform.",
      },
      { property: "og:url", content: "https://lite.marginal-econ.com/about" },
    ],
    links: [{ rel: "canonical", href: "https://lite.marginal-econ.com/about" }],
  }),
  component: AboutPage,
});

const founders = [
  {
    name: "Saikrish Karthikeyan",
    initials: "SK",
    role: "Founder, Creator & CEO",
    focus: "Conceived the Idea · Sole Backend & AI Architect",
    linkedin: "https://www.linkedin.com/in/saikrish-karthikeyan-074453400/",
    photo: "/founders/sai-krish.webp",
  },
  {
    name: "Suthir R",
    initials: "SR",
    role: "Design Head",
    focus: "Product Design, UI/UX & Brand Identity",
    linkedin: "https://www.linkedin.com/in/suthir-r",
    photo: "/founders/suthir.webp",
  },
  {
    name: "Athithya A",
    initials: "AA",
    role: "Chief Marketing Officer (CMO)",
    focus: "In Charge of Marketing & Expansion",
    linkedin: "https://www.linkedin.com/in/a-athithya/",
    photo: "/founders/athithya.png",
  },
];

const contributors = [
  {
    name: "Shiju R",
    initials: "SR",
    role: "Teacher & Academic Mentor",
    tag: "Academic Mentor",
    focus: "Economics educator providing curriculum rigor, Cambridge exam insights, and pedagogical mentorship.",
    linkedin: "https://www.linkedin.com/in/shiju-rappai-csa-cbe-761889247/",
  },
  {
    name: "Jaahnvi Lakshmi Narayan",
    initials: "JL",
    role: "Student Ambassador",
    tag: "Student Ambassador",
    focus: "Leading peer economics study groups, revision advocacy, and student feedback across Cambridge cohorts.",
    linkedin: "https://www.linkedin.com/in/jaahnvi-lakshmi-narayan-34a5b3249/",
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
  const [ambassadorOpen, setAmbassadorOpen] = useState(false);

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-40 border-b border-border bg-background/85 backdrop-blur-xl">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-5 py-3 md:px-8">
          <Link to="/" className="group flex items-center gap-2.5">
            <img
              src="/marginal-m-icon-clean.png"
              alt="Marginalite Cambridge IGCSE Economics 0455"
              aria-hidden="true"
              className="size-9 object-contain transition-transform duration-300 group-hover:-rotate-6"
            />
            <span className="font-semibold">Marginal</span>
          </Link>
          <div className="flex items-center gap-2">
            <ThemeToggle className="size-8" />
            <Link
              to="/"
              className="pop-sm pop-press inline-flex items-center gap-1.5 bg-surface px-3 py-2 text-sm font-semibold"
            >
              <ArrowLeft className="size-4" /> Back to site
            </Link>
          </div>
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
            An essay comes back in two weeks. The exam does not wait that long.
          </h1>
          <p className="mt-5 max-w-3xl text-base leading-relaxed text-plum-foreground/80 md:text-lg">
            Marginal is built for one syllabus — Cambridge IGCSE Economics (0455)
            — because the gap between writing an essay and finding out what was wrong with it is
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
              Founded &amp; created by Saikrish, with Suthir (Design) and Athithya (Marketing)
            </span>
          </div>
          <div className="mt-7 flex flex-wrap gap-2">
            {["One syllabus — Cambridge IGCSE 0455", "Independent of Cambridge", "Built carefully"].map(
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
                  An IGCSE 0455 essay is not marked on whether the answer is right. It is marked on
                  knowledge, analysis and reasoned two-sided discussion — and a script can be full of
                  correct economics yet still lose marks because the balanced discussion never arrives.
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
                  Marginal gives an essay back with an assessment-objective breakdown: what earned
                  marks, what did not, and what a stronger answer would have done differently.
                </p>
              </div>
            </div>
          </section>
        </Reveal>

        <Reveal>
          <section>
            <p className="eyebrow eyebrow-accent">Founder &amp; Leadership Team</p>
            <h2 className="mt-2 text-2xl font-bold text-balance md:text-3xl">
              Conceived &amp; created by Saikrish Karthikeyan.
            </h2>
            <p className="mt-3 max-w-2xl text-sm leading-relaxed text-muted-foreground md:text-base">
              The team building, designing, and expanding Marginal across Cambridge schools globally. All profiles are public.
            </p>
            <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {founders.map((founder) => (
                <a
                  key={founder.initials}
                  href={founder.linkedin}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="pop pop-press group flex flex-col justify-between overflow-hidden bg-surface"
                >
                  <div className="relative overflow-hidden border-b-[1.5px] border-ink bg-[#f3ebdf]">
                    <img
                      src={founder.photo}
                      alt={`${founder.name}, ${founder.role} at Marginal`}
                      className="aspect-square w-full object-cover transition-transform duration-500 ease-out group-hover:scale-[1.03]"
                    />
                    <span className="absolute top-3 left-3 rounded-md border-[1.5px] border-ink bg-surface/90 px-2 py-0.5 font-mono text-xs font-bold">
                      {founder.initials}
                    </span>
                  </div>
                  <div className="flex items-start justify-between gap-3 p-5 flex-1">
                    <div>
                      <p className="text-lg font-bold">{founder.name}</p>
                      <p className="mt-0.5 text-xs font-bold text-primary tracking-wide">{founder.role}</p>
                      <p className="mt-1 text-xs text-muted-foreground leading-snug">{founder.focus}</p>
                    </div>
                    <span className="pop-sm inline-flex size-9 shrink-0 items-center justify-center bg-primary text-primary-foreground mt-0.5">
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
            <p className="eyebrow eyebrow-accent">Community &amp; Mentorship</p>
            <h2 className="mt-2 text-2xl font-bold text-balance md:text-3xl">
              Mentors &amp; Student Ambassadors.
            </h2>
            <p className="mt-3 max-w-2xl text-sm leading-relaxed text-muted-foreground md:text-base">
              Dedicated educators and student advocates collaborating with Marginal to support Cambridge Economics learners.
            </p>
            <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {contributors.map((person) => (
                <a
                  key={person.name}
                  href={person.linkedin}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="pop pop-press group flex flex-col justify-between overflow-hidden bg-surface"
                >
                  <div className="relative flex aspect-4/3 items-center justify-center border-b-[1.5px] border-ink bg-gradient-to-br from-muted/50 via-purple-500/10 to-muted/80">
                    <div className="flex size-20 items-center justify-center rounded-2xl border-2 border-ink bg-background font-mono text-2xl font-black text-foreground shadow-sm transition-transform duration-300 group-hover:scale-105">
                      {person.initials}
                    </div>
                    <span className="absolute top-3 right-3 rounded-md border-[1.5px] border-ink bg-surface/90 px-2.5 py-0.5 font-mono text-[11px] font-bold">
                      {person.tag}
                    </span>
                  </div>
                  <div className="flex items-start justify-between gap-3 p-5 flex-1">
                    <div>
                      <p className="text-lg font-bold">{person.name}</p>
                      <p className="mt-0.5 text-xs font-bold text-primary tracking-wide">{person.role}</p>
                      <p className="mt-1 text-xs text-muted-foreground leading-snug">{person.focus}</p>
                    </div>
                    <span className="pop-sm inline-flex size-9 shrink-0 items-center justify-center bg-primary text-primary-foreground mt-0.5">
                      <Linkedin className="size-4" />
                    </span>
                  </div>
                </a>
              ))}

              {/* Expanding Community / Ambassador Card */}
              <div className="pop relative flex flex-col justify-between border-dashed border-2 border-border/80 bg-surface/50 p-6">
                <div>
                  <span className="inline-flex items-center rounded-md border-[1.5px] border-ink bg-primary/10 px-2 py-0.5 text-[11px] font-bold text-primary">
                    Growing Community
                  </span>
                  <h3 className="mt-3 text-lg font-bold">Join as an Ambassador</h3>
                  <p className="mt-1.5 text-xs sm:text-sm text-muted-foreground leading-relaxed">
                    Passionate about economics? We will soon be welcoming more student ambassadors across Cambridge schools globally.
                  </p>
                </div>
                <div className="pt-4 mt-auto border-t border-border/60">
                  <button
                    type="button"
                    onClick={() => setAmbassadorOpen(true)}
                    className="inline-flex items-center gap-1.5 text-xs font-bold text-primary hover:underline cursor-pointer group/btn"
                  >
                    <span>Apply to represent Marginal</span>
                    <ArrowRight className="size-3.5 transition-transform group-hover/btn:translate-x-0.5" />
                  </button>
                </div>
              </div>
            </div>
          </section>
        </Reveal>

        <Reveal>
          <section>
            <p className="eyebrow eyebrow-accent">What Marginal is not</p>
            <h2 className="mt-2 text-2xl font-bold text-balance md:text-3xl">
              Two things worth saying plainly.
            </h2>
            <div className="mt-7 grid gap-4 md:grid-cols-2">
              <HonestyCard icon={ShieldCheck} title="It is independent.">
                Marginal is not affiliated with, endorsed by, or connected to Cambridge Assessment
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

        <AmbassadorApplyDialog open={ambassadorOpen} onOpenChange={setAmbassadorOpen} />
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
