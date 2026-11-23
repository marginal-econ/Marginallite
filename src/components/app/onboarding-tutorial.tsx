import { useState, useEffect } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import {
  GraduationCap,
  ShieldCheck,
  Trophy,
  CheckCircle2,
  BookOpen,
  School,
} from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  markTutorialSeen,
  updateProfile,
  saveUserAcademicPreferences,
} from "@/lib/account.functions";
import { cn } from "@/lib/utils";

export function OnboardingTutorial({
  open,
  initialFullName = "",
  initialSchool = "",
  role = "student",
  onFinished,
}: {
  open: boolean;
  initialFullName?: string;
  initialSchool?: string;
  role?: "student" | "teacher" | "admin";
  onFinished: () => void;
}) {
  const isTeacher = role === "teacher";
  const [fullName, setFullName] = useState(initialFullName);
  const [school, setSchool] = useState(initialSchool);
  const [targetLevel, setTargetLevel] = useState<string>("igcse");
  const [targetGrade, setTargetGrade] = useState<"A*" | "A" | "B" | "C">("A*");
  const [wantTutorials, setWantTutorials] = useState(true);
  const [acknowledged, setAcknowledged] = useState(false);

  useEffect(() => {
    if (initialFullName && !fullName) setFullName(initialFullName);
    if (initialSchool && !school) setSchool(initialSchool);
  }, [initialFullName, initialSchool]);

  const updateProfileFn = useServerFn(updateProfile);
  const savePreferencesFn = useServerFn(saveUserAcademicPreferences);
  const finishTutorialFn = useServerFn(markTutorialSeen);
  const queryClient = useQueryClient();

  const { mutate: completeSetup, isPending } = useMutation({
    mutationFn: async () => {
      // 1. Update Profile (Name & School)
      if (fullName.trim() || school.trim()) {
        try {
          await updateProfileFn({
            data: {
              fullName: fullName.trim() || undefined,
              school: school.trim() || undefined,
            },
          });
        } catch {}
      }

      // 2. Save Academic Preferences (Level & Target Grade) - for students only
      if (!isTeacher) {
        try {
          await savePreferencesFn({
            data: {
              targetLevel,
              targetGrade,
            },
          });
        } catch {}
      }

      // 3. Save Feature Tutorial Preference
      try {
        if (!wantTutorials) {
          localStorage.setItem("marginalite_auto_tutorials_disabled", "true");
        } else {
          localStorage.removeItem("marginalite_auto_tutorials_disabled");
        }
      } catch {}

      // 4. Mark Tutorial Completed
      return finishTutorialFn();
    },
    onSuccess: () => {
      toast.success(
        isTeacher
          ? "Welcome, Educator! Your teaching workspace is ready."
          : "Welcome to Marginalite Economics! Your academic desk is ready.",
      );
      queryClient.invalidateQueries({ queryKey: ["me"] });
      onFinished();
    },
    onError: (err: Error) => {
      toast.error(err.message || "Could not complete setup. Please try again.");
    },
  });

  return (
    <Dialog open={open}>
      <DialogContent
        className="max-w-xl max-h-[92vh] flex flex-col p-0 rounded-3xl border border-border bg-card shadow-2xl [&>button]:hidden overflow-hidden text-left"
        onEscapeKeyDown={(event) => event.preventDefault()}
        onPointerDownOutside={(event) => event.preventDefault()}
      >
        {/* PINNED HEADER (Won't scroll or get cut off) */}
        <div className="p-5 sm:p-6 pb-4 border-b border-border/70 bg-muted/20 shrink-0">
          <DialogHeader className="space-y-2 text-left">
            <div className="flex items-center gap-2 flex-wrap">
              <Badge className="bg-purple-500/10 text-purple-700 dark:text-purple-300 border-purple-200 dark:border-purple-800 text-[11px] font-semibold">
                Cambridge International 0455
              </Badge>
              <Badge variant="outline" className="text-[11px] text-muted-foreground border-border">
                {isTeacher ? "Educator & Department Workspace" : "Student Enrollment & Guidelines"}
              </Badge>
            </div>

            <DialogTitle className="text-xl sm:text-2xl font-bold tracking-tight text-foreground flex items-center gap-2.5 pt-0.5">
              <div className="h-8 w-8 rounded-xl bg-purple-500/10 dark:bg-purple-500/20 border border-purple-500/20 text-purple-600 dark:text-purple-400 flex items-center justify-center shrink-0">
                {isTeacher ? <School className="h-5 w-5" /> : <GraduationCap className="h-5 w-5" />}
              </div>
              <span>
                {isTeacher
                  ? "Welcome to Marginalite Economics for Educators"
                  : "Welcome to Marginalite Economics"}
              </span>
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground leading-relaxed">
              {isTeacher
                ? "Please verify your educator details and review our institutional guidelines before managing your Cambridge Economics classes, mark schemes, and diagnostic tools."
                : "Please verify your academic profile and review our platform guidelines before starting your Cambridge Economics preparation."}
            </DialogDescription>
          </DialogHeader>
        </div>

        {/* SCROLLABLE BODY */}
        <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-5">
          {/* STEP 1: PROFILE SETUP */}
          <div className="p-4 sm:p-5 rounded-2xl bg-muted/30 border border-border space-y-4">
            <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-muted-foreground">
              <BookOpen className="h-3.5 w-3.5 text-purple-500" />
              <span>{isTeacher ? "1. Your Educator Profile" : "1. Your Academic Profile"}</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <div className="space-y-1.5">
                <Label htmlFor="ob-name" className="text-xs font-semibold text-foreground">
                  {isTeacher ? "Full Name / Title" : "Full Name / Display Name"}
                </Label>
                <Input
                  id="ob-name"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder={isTeacher ? "e.g. David Smith (or Dr. Smith)" : "e.g. Saikrish Karthikeyan"}
                  className="bg-background border-input text-xs h-9 rounded-xl focus-visible:ring-purple-500"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="ob-school" className="text-xs font-semibold text-foreground">
                  {isTeacher ? "School / Institution" : "School / College (Optional)"}
                </Label>
                <Input
                  id="ob-school"
                  value={school}
                  onChange={(e) => setSchool(e.target.value)}
                  placeholder="e.g. CS Academy"
                  className="bg-background border-input text-xs h-9 rounded-xl focus-visible:ring-purple-500"
                />
              </div>
            </div>

            {!isTeacher && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 pt-1">
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-foreground block">
                    Cambridge Syllabus Level
                  </Label>
                  <div className="grid grid-cols-3 gap-1.5">
                    {[
                      { id: "as_level", label: "AS Level" },
                      { id: "a2_level", label: "A2 Level" },
                      { id: "full_a_level", label: "Full A Level" },
                    ].map((lvl) => {
                      const isSelected = targetLevel === lvl.id;
                      return (
                        <button
                          key={lvl.id}
                          type="button"
                          onClick={() => setTargetLevel(lvl.id as any)}
                          className={cn(
                            "py-1.5 px-2 rounded-xl text-xs font-semibold border transition-all text-center",
                            isSelected
                              ? "bg-purple-600 border-purple-600 text-white shadow-sm"
                              : "bg-background border-border text-foreground/80 hover:bg-muted hover:text-foreground",
                          )}
                        >
                          {lvl.label}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-foreground block">
                    Target Economics Grade
                  </Label>
                  <div className="grid grid-cols-4 gap-1.5">
                    {["A*", "A", "B", "C"].map((grade) => {
                      const isSelected = targetGrade === grade;
                      return (
                        <button
                          key={grade}
                          type="button"
                          onClick={() => setTargetGrade(grade as any)}
                          className={cn(
                            "py-1.5 px-2 rounded-xl text-xs font-semibold border transition-all text-center",
                            isSelected
                              ? "bg-purple-600 border-purple-600 text-white shadow-sm"
                              : "bg-background border-border text-foreground/80 hover:bg-muted hover:text-foreground",
                          )}
                        >
                          {grade}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* STEP 2: TRANSPARENCY & PRIVACY GUIDELINES (MANDATORY DISCLOSURES) */}
          <div className="space-y-3">
            <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-muted-foreground">
              <ShieldCheck className="h-3.5 w-3.5 text-purple-500" />
              <span>
                {isTeacher
                  ? "2. Educator Guidelines & Platform Integrity"
                  : "2. Platform Guidelines & Academic Transparency"}
              </span>
            </div>

            <div className="space-y-3">
              {isTeacher ? (
                <>
                  {/* Teacher Disclosure 1: Cambridge IGCSE 0455 Standards & Calibration */}
                  <div className="p-4 rounded-2xl bg-amber-500/5 dark:bg-amber-950/20 border border-amber-500/20 dark:border-amber-500/30 space-y-2.5 transition-all">
                    <div className="flex items-center gap-2.5">
                      <div className="h-7 w-7 rounded-lg bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-700 dark:text-amber-400 shrink-0">
                        <Trophy className="h-4 w-4" />
                      </div>
                      <div className="flex-1">
                        <h5 className="text-xs font-semibold text-foreground">
                          Cambridge IGCSE 0455 Rubrics &amp; Mark Scheme Standards
                        </h5>
                        <span className="text-[10px] font-bold uppercase tracking-wider text-amber-700 dark:text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded-md inline-block mt-0.5">
                          Pedagogy &amp; Evaluation Benchmarks
                        </span>
                      </div>
                    </div>
                    <p className="text-xs text-foreground/80 dark:text-muted-foreground leading-relaxed pl-9">
                      Marginal provides automated evaluation calibrated to official Cambridge International 0455
                      mark schemes and examiner reports. Teacher-assisted grading, exemplar papers, and syllabus
                      benchmarks are provided to empower your teaching workflow and deliver formative cohort feedback.
                    </p>
                  </div>

                  {/* Teacher Disclosure 2: Classroom Privacy & Student Data Protection */}
                  <div className="p-4 rounded-2xl bg-purple-500/5 dark:bg-purple-950/20 border border-purple-500/20 dark:border-purple-500/30 space-y-2.5 transition-all">
                    <div className="flex items-center gap-2.5">
                      <div className="h-7 w-7 rounded-lg bg-purple-500/15 border border-purple-500/30 flex items-center justify-center text-purple-700 dark:text-purple-400 shrink-0">
                        <ShieldCheck className="h-4 w-4" />
                      </div>
                      <div className="flex-1">
                        <h5 className="text-xs font-semibold text-foreground">
                          Classroom Privacy &amp; Evaluation Confidentiality
                        </h5>
                        <span className="text-[10px] font-bold uppercase tracking-wider text-purple-700 dark:text-purple-300 bg-purple-500/10 px-2 py-0.5 rounded-md inline-block mt-0.5">
                          Confidentiality &amp; Moderation
                        </span>
                      </div>
                    </div>
                    <p className="text-xs text-foreground/80 dark:text-muted-foreground leading-relaxed pl-9">
                      Student submissions, diagnostic scorecards, and cohort performance analytics in your classes
                      remain strictly confidential to your institution and platform administrators. Any student essays
                      featured in the Exemplar Showcase are strictly anonymized using initials to protect student privacy.
                    </p>
                  </div>
                </>
              ) : (
                <>
                  {/* Disclosure 1: Exemplar Showcase using Initials */}
                  <div className="p-4 rounded-2xl bg-amber-500/5 dark:bg-amber-950/20 border border-amber-500/20 dark:border-amber-500/30 space-y-2.5 transition-all">
                    <div className="flex items-center gap-2.5">
                      <div className="h-7 w-7 rounded-lg bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-700 dark:text-amber-400 shrink-0">
                        <Trophy className="h-4 w-4" />
                      </div>
                      <div className="flex-1">
                        <h5 className="text-xs font-semibold text-foreground">
                          Best Essays Published Anonymously with Initials
                        </h5>
                        <span className="text-[10px] font-bold uppercase tracking-wider text-amber-700 dark:text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded-md inline-block mt-0.5">
                          Exemplar Showcase Guidelines
                        </span>
                      </div>
                    </div>
                    <p className="text-xs text-foreground/80 dark:text-muted-foreground leading-relaxed pl-9">
                      To provide exemplar study material for Cambridge IGCSE 0455 Economics students, your
                      highest-scoring essays (Band 4 &amp; Level 5 distinction marks) may be featured in
                      the public <strong className="text-foreground">Exemplar Showcase</strong>. To protect your personal privacy,
                      your full name and contact details are never shown — your essay will only ever be
                      credited using your initials (e.g. <strong className="text-foreground">"S.K."</strong>).
                    </p>
                  </div>

                  {/* Disclosure 2: Admin-Only Grading Quality Monitoring */}
                  <div className="p-4 rounded-2xl bg-purple-500/5 dark:bg-purple-950/20 border border-purple-500/20 dark:border-purple-500/30 space-y-2.5 transition-all">
                    <div className="flex items-center gap-2.5">
                      <div className="h-7 w-7 rounded-lg bg-purple-500/15 border border-purple-500/30 flex items-center justify-center text-purple-700 dark:text-purple-400 shrink-0">
                        <ShieldCheck className="h-4 w-4" />
                      </div>
                      <div className="flex-1">
                        <h5 className="text-xs font-semibold text-foreground">
                          Grading Monitored by Administrators Alone
                        </h5>
                        <span className="text-[10px] font-bold uppercase tracking-wider text-purple-700 dark:text-purple-300 bg-purple-500/10 px-2 py-0.5 rounded-md inline-block mt-0.5">
                          Confidentiality &amp; Moderation
                        </span>
                      </div>
                    </div>
                    <p className="text-xs text-foreground/80 dark:text-muted-foreground leading-relaxed pl-9">
                      Your essay evaluations, live writing checks, and diagnostic score cards are strictly
                      confidential. AI grading performance and tariff allocations are audited and monitored
                      <strong className="text-foreground"> exclusively by platform administrators</strong> to eliminate central-tendency
                      bias, verify rubric calibration, and ensure examiner consistency. No other students
                      have access to your individual grading history.
                    </p>
                  </div>
                </>
              )}
            </div>
          </div>

          {/* STEP 3: TUTORIAL PREFERENCE (ASK NEW USERS DIRECTLY) */}
          <div className="p-4 sm:p-5 rounded-2xl bg-muted/30 border border-border space-y-3">
            <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-muted-foreground">
              <GraduationCap className="h-3.5 w-3.5 text-purple-500" />
              <span>3. Guided Feature Walkthroughs</span>
            </div>

            <p className="text-xs text-muted-foreground leading-relaxed">
              Would you like interactive walkthroughs and Cambridge IGCSE 0455 examiner guides when exploring new features?
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-0.5">
              <button
                type="button"
                onClick={() => setWantTutorials(true)}
                className={cn(
                  "p-3 rounded-2xl border text-left transition-all cursor-pointer flex flex-col justify-between",
                  wantTutorials
                    ? "border-purple-600 bg-purple-500/10 dark:bg-purple-950/30 ring-1 ring-purple-500 text-foreground"
                    : "border-border bg-background hover:bg-muted/40 text-muted-foreground hover:text-foreground",
                )}
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-foreground">Yes, show walkthroughs</span>
                  <Badge
                    variant="outline"
                    className="text-[9.5px] border-purple-500/30 text-purple-600 dark:text-purple-400"
                  >
                    Recommended
                  </Badge>
                </div>
                <p className="text-[11px] text-muted-foreground mt-1 leading-normal">
                  Politely asks before offering a 1-minute guide on new tools.
                </p>
              </button>

              <button
                type="button"
                onClick={() => setWantTutorials(false)}
                className={cn(
                  "p-3 rounded-2xl border text-left transition-all cursor-pointer flex flex-col justify-between",
                  !wantTutorials
                    ? "border-purple-600 bg-purple-500/10 dark:bg-purple-950/30 ring-1 ring-purple-500 text-foreground"
                    : "border-border bg-background hover:bg-muted/40 text-muted-foreground hover:text-foreground",
                )}
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-foreground">No thanks, skip them</span>
                  <span className="text-[10px] text-muted-foreground font-mono">Independent</span>
                </div>
                <p className="text-[11px] text-muted-foreground mt-1 leading-normal">
                  Never interrupt with guides. You can still open them anytime from the top bar.
                </p>
              </button>
            </div>
          </div>

          {/* STEP 4: MANDATORY ACKNOWLEDGMENT CHECKBOX */}
          <div className="p-4 rounded-2xl bg-muted/40 border border-border space-y-2">
            <div className="flex items-start gap-3">
              <Checkbox
                id="guidelines-consent"
                checked={acknowledged}
                onCheckedChange={(checked) => setAcknowledged(Boolean(checked))}
                className="mt-0.5 border-muted-foreground/50 data-[state=checked]:bg-purple-600 data-[state=checked]:border-purple-600"
              />
              <Label
                htmlFor="guidelines-consent"
                className="text-xs text-foreground font-medium leading-relaxed cursor-pointer select-none"
              >
                {isTeacher
                  ? "I agree to uphold Cambridge IGCSE 0455 evaluation standards, maintain student grading confidentiality, and review institutional cohort data responsibly."
                  : "I understand that my best essays may be published with my initials in the Exemplar Showcase, and that my grading evaluations are monitored solely by platform administrators for quality assurance."}
              </Label>
            </div>
          </div>

          {/* CONFIRM BUTTON */}
          <Button
            type="button"
            disabled={!acknowledged || isPending}
            onClick={() => completeSetup()}
            className="w-full h-11 rounded-2xl bg-purple-600 hover:bg-purple-700 text-white font-semibold text-sm shadow-md shadow-purple-600/20 transition-all flex items-center justify-center gap-2"
          >
            {isPending ? (
              isTeacher ? "Setting up your workspace..." : "Setting up your account..."
            ) : (
              <>
                <CheckCircle2 className="h-4 w-4" />
                <span>{isTeacher ? "Confirm & Enter Teacher Workspace" : "Confirm & Enter Platform"}</span>
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
