import { Link } from "@tanstack/react-router";
import {
  GraduationCap,
  Users2,
  Sliders,
  ShieldCheck,
  BookOpen,
  ArrowRight,
  School,
  Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Reveal } from "./reveal";
import { CosmicAtmosphere } from "./cosmic-atmosphere";

export function TeachersSection() {
  const capabilities = [
    {
      icon: Users2,
      title: "Interactive Classrooms",
      lead: "Real-time essay submission, grading rosters, and class cohorts.",
      desc: "Create bespoke classrooms for your year groups. Assign questions straight from Cambridge IGCSE 0455 papers, track turnaround times, and broadcast cohort-wide feedback instantly.",
      badge: "Cohorts",
    },
    {
      icon: Sliders,
      title: "Arbitration & Oversight",
      lead: "Audit AI marks and adjust level tariffs with examiner override authority.",
      desc: "Review any AI mark breakdown with complete transparency across AO1 Knowledge, AO2 Application, and AO3 Analysis. Easily edit score bands, leave custom teacher remarks, or recalibrate tariffs.",
      badge: "Teacher Authority",
    },
    {
      icon: BookOpen,
      title: "Mark Scheme Ingestion",
      lead: "Ingest past exam papers & internal mark schemes straight into RAG.",
      desc: "Upload official Cambridge IGCSE mark schemes or proprietary school mock assessments. The system grounds its two-pass marking engine directly against your department's exact rubric descriptors.",
      badge: "RAG Ingestion",
    },
    {
      icon: ShieldCheck,
      title: "Standardized Anchors",
      lead: "Calibrate examiner models to match your school's grading standards.",
      desc: "Establish anchor essays across 2m, 4m, 6m, and 8m question tariffs. Benchmark marking consistency across your entire faculty and ensure student grades reflect official Cambridge standards.",
      badge: "Exam Calibration",
    },
  ];

  return (
    <section id="teachers-section" className="relative border-b-[1.5px] border-ink bg-card/40 py-20 md:py-24 scroll-mt-16 overflow-hidden">
      <CosmicAtmosphere variant="hero" sparkles={true} density="medium" />
      <div className="relative z-10 mx-auto max-w-7xl 2xl:max-w-[1440px] px-4 sm:px-6 md:px-10 lg:px-12 xl:px-16">
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto">
          <Reveal>
            <div className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-3.5 py-1 text-xs font-semibold text-primary mb-3">
              <GraduationCap className="size-4" />
              For Cambridge IGCSE (0455) Economics Teachers &amp; Departments
            </div>
            <h2 className="text-3xl md:text-5xl font-bold tracking-tight text-balance">
              Transform Your Economics Department’s Marking &amp; Assessment
            </h2>
            <p className="mt-4 text-base md:text-lg text-muted-foreground leading-relaxed text-pretty">
              Marginalite gives Cambridge Economics teachers the dedicated tools to organize interactive classrooms, conduct deep AO diagnostic reviews, ingest internal mark schemes, and calibrate standardized grading anchors with examiner precision.
            </p>
          </Reveal>
        </div>

        {/* 4 Capabilities Grid */}
        <div className="mt-14 grid grid-cols-1 md:grid-cols-2 gap-6">
          {capabilities.map((c, i) => {
            const Icon = c.icon;
            return (
              <Reveal key={c.title} delay={100 + i * 80}>
                <div className="panel border-2 border-border p-6 md:p-8 rounded-2xl bg-card hover:border-primary/40 transition-all duration-300 h-full flex flex-col justify-between shadow-sm hover:shadow-md">
                  <div>
                    <div className="flex items-center justify-between gap-3 mb-4">
                      <span className="flex size-11 items-center justify-center rounded-xl bg-primary/10 text-primary border border-primary/20">
                        <Icon className="size-5.5" />
                      </span>
                      <span className="text-[11px] font-semibold text-primary uppercase tracking-wider bg-primary/5 px-2.5 py-1 rounded-md border border-primary/20">
                        {c.badge}
                      </span>
                    </div>
                    <h3 className="text-xl font-bold text-foreground">{c.title}</h3>
                    <p className="text-sm font-medium text-primary mt-1">{c.lead}</p>
                    <p className="text-sm text-muted-foreground mt-3 leading-relaxed">{c.desc}</p>
                  </div>
                </div>
              </Reveal>
            );
          })}
        </div>

        {/* Teacher Security & Call To Action Banner */}
        <Reveal delay={300}>
          <div className="mt-12 rounded-2xl border-2 border-primary/30 bg-gradient-to-r from-primary/10 via-card to-primary/5 p-6 md:p-10 flex flex-col md:flex-row items-center justify-between gap-8 shadow-lg">
            <div className="space-y-2 text-center md:text-left">
              <div className="flex items-center justify-center md:justify-start gap-2 text-xs font-semibold uppercase tracking-wider text-primary">
                <School className="size-4" />
                Institutional Verification Required
              </div>
              <h3 className="text-2xl md:text-3xl font-bold text-foreground">
                Ready to empower your Cambridge economics cohort?
              </h3>
              <p className="text-sm text-muted-foreground max-w-xl">
                Teachers can register freely with their official school email domain. All accounts receive immediate verification review by our academic team to protect examination security.
              </p>
            </div>

            <div className="flex flex-col sm:flex-row items-center gap-3 shrink-0 w-full sm:w-auto">
              <Link to="/teacher-auth" className="w-full sm:w-auto">
                <Button size="lg" className="w-full sm:w-auto bg-primary hover:bg-primary/90 text-primary-foreground font-bold px-6 shadow-md">
                  Sign In to Teacher Portal →
                </Button>
              </Link>
              <Link to="/teacher-auth" className="w-full sm:w-auto">
                <Button size="lg" variant="outline" className="w-full sm:w-auto border-primary/40 text-foreground font-semibold px-5">
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
