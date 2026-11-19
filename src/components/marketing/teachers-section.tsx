import { Link } from "@tanstack/react-router";
import { ArrowRight, BookOpen, CheckCircle2, FileCheck2, GraduationCap, Layers, LineChart, Lock, School, ShieldCheck, Sparkles, Users } from "lucide-react";
import { Reveal } from "./reveal";
import { Button } from "@/components/ui/button";
import { CosmicAtmosphere } from "./cosmic-atmosphere";

export function TeachersSection() {
  const capabilities = [
    {
      icon: Users,
      title: "Interactive Classroom Manager",
      desc: "Organize IGCSE 0455 cohorts, issue structured question assignments, track submissions in real time, and monitor revision deadlines.",
      badge: "Cohorts",
    },
    {
      icon: LineChart,
      title: "Diagnostic AO Heatmaps",
      desc: "Audit automated AO1, AO2, and AO3 class performance to pinpoint syllabus weaknesses before exam series.",
      badge: "Diagnostics",
    },
    {
      icon: BookOpen,
      title: "School Resource Grounding",
      desc: "Upload custom mark schemes, coursebooks, and department notes for verified clause-level citations in student feedback.",
      badge: "Knowledge",
    },
    {
      icon: ShieldCheck,
      title: "Examiner Anchor Standards",
      desc: "Calibrate exemplar essays against Cambridge IGCSE 0455 Level 4 and Level 5 grade boundaries for consistent department marking.",
      badge: "Calibration",
    },
  ];

  return (
    <section id="teachers-section" className="relative border-b-[1.5px] border-ink bg-card/40 py-16 md:py-20 scroll-mt-16 overflow-hidden">
      <CosmicAtmosphere variant="purple" sparkles={true} density="medium" />
      <div className="relative z-10 mx-auto max-w-7xl 2xl:max-w-[1440px] px-4 sm:px-6 md:px-10 lg:px-12 xl:px-16">
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto">
          <Reveal>
            <div className="inline-flex items-center gap-2 rounded-full border border-purple-500/30 bg-purple-500/10 px-3.5 py-1 text-xs font-semibold text-purple-600 dark:text-purple-400 mb-3">
              <GraduationCap className="size-4" />
              For Cambridge IGCSE 0455 Economics Teachers &amp; Departments
            </div>
            <h2 className="text-3xl md:text-5xl font-bold tracking-tight text-balance">
              Transform Your Economics Department’s Marking &amp; Assessment
            </h2>
            <p className="mt-3 text-sm md:text-base text-muted-foreground leading-relaxed text-pretty">
              Dedicated tools for Cambridge IGCSE 0455 teachers to manage cohorts, audit AO diagnostics, and standardize marking across the department.
            </p>
          </Reveal>
        </div>

        {/* 4 Capabilities Grid */}
        <div className="mt-12 grid grid-cols-1 md:grid-cols-2 gap-5">
          {capabilities.map((c, i) => {
            const Icon = c.icon;
            return (
              <Reveal key={c.title} delay={100 + i * 80}>
                <div className="panel border-2 border-border p-6 rounded-2xl bg-card hover:border-purple-500/40 transition-all duration-300 h-full flex flex-col justify-between shadow-sm hover:shadow-md">
                  <div>
                    <div className="flex items-center justify-between gap-3 mb-3">
                      <span className="flex size-10 items-center justify-center rounded-xl bg-purple-500/10 text-purple-600 border border-purple-500/20">
                        <Icon className="size-5" />
                      </span>
                      <span className="text-[10px] font-semibold text-purple-600 dark:text-purple-400 uppercase tracking-wider bg-purple-500/5 px-2.5 py-0.5 rounded-md border border-purple-500/20">
                        {c.badge}
                      </span>
                    </div>
                    <h3 className="text-lg font-bold text-foreground">{c.title}</h3>
                    <p className="text-xs sm:text-sm text-muted-foreground mt-2 leading-relaxed">{c.desc}</p>
                  </div>
                </div>
              </Reveal>
            );
          })}
        </div>

        {/* Teacher Security & Call To Action Banner */}
        <Reveal delay={250}>
          <div className="mt-10 rounded-2xl border-2 border-purple-500/30 bg-gradient-to-r from-purple-500/10 via-card to-purple-500/5 p-6 md:p-8 flex flex-col md:flex-row items-center justify-between gap-6 shadow-md">
            <div className="space-y-1.5 text-center md:text-left">
              <div className="flex items-center justify-center md:justify-start gap-2 text-xs font-semibold uppercase tracking-wider text-purple-600 dark:text-purple-400">
                <School className="size-4" />
                Institutional Verification
              </div>
              <h3 className="text-xl md:text-2xl font-bold text-foreground">
                Ready to empower your Cambridge economics cohort?
              </h3>
              <p className="text-xs sm:text-sm text-muted-foreground max-w-xl">
                Register with your school email for verified access to cohorts, custom mark schemes, and diagnostic analytics.
              </p>
            </div>

            <div className="flex flex-col sm:flex-row items-center gap-3 shrink-0 w-full sm:w-auto">
              <Link to="/teacher-auth" className="w-full sm:w-auto">
                <Button size="default" className="w-full sm:w-auto bg-purple-600 hover:bg-purple-700 text-white font-bold px-5 shadow-sm">
                  Teacher Portal →
                </Button>
              </Link>
              <Link to="/teacher-auth" search={{ tab: "signup" }} className="w-full sm:w-auto">
                <Button size="default" variant="outline" className="w-full sm:w-auto border-purple-500/40 text-foreground font-semibold px-4">
                  Register as Teacher
                </Button>
              </Link>
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
