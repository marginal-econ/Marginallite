import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import {
  ArrowLeft,
  BookOpen,
  CheckCircle2,
  Clock,
  GraduationCap,
  KeyRound,
  Loader2,
  Lock,
  School,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { useServerFn } from "@tanstack/react-start";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/backend/client";
import { registerTeacher, getTeacherProfileStatus } from "@/lib/teacher.functions";

export const Route = createFileRoute("/teacher-auth")({
  head: () => ({
    meta: [
      { title: "Teacher & Department Portal — Marginalite | Cambridge IGCSE 0455 Economics" },
      {
        name: "description",
        content:
          "Official Teacher Portal for Cambridge IGCSE Economics (0455) educators. Ingest mark schemes, calibrate anchors, manage cohorts, and moderate student scripts.",
      },
    ],
  }),
  component: TeacherAuthPage,
});

type TeacherAuthView = "credentials" | "forgot" | "recovery" | "verifying";

function readRecoveryLinkState(): "recovery" | "error" | null {
  if (typeof window === "undefined") return null;

  const hash = new URLSearchParams(window.location.hash.replace(/^#/, ""));
  const query = new URLSearchParams(window.location.search);

  const errorCode = hash.get("error_code") || query.get("error_code");
  if (errorCode) return "error";

  if (query.get("token_hash")) return "recovery";

  const type = hash.get("type") || query.get("type");
  if (type === "recovery" || type === "invite") return "recovery";
  if (hash.get("access_token") && !type) return "recovery";
  if (query.get("code")) return "recovery";

  return null;
}

export function TeacherAuthPage() {
  const navigate = useNavigate();
  const registerTeacherFn = useServerFn(registerTeacher);
  const checkTeacherStatusFn = useServerFn(getTeacherProfileStatus);

  const [view, setView] = useState<TeacherAuthView>("credentials");

  // Sign in state
  const [signInEmail, setSignInEmail] = useState("");
  const [signInPassword, setSignInPassword] = useState("");
  const [signInBusy, setSignInBusy] = useState(false);

  // Forgot password & Recovery state
  const [resetEmail, setResetEmail] = useState("");
  const [resetSent, setResetSent] = useState(false);
  const [resetBusy, setResetBusy] = useState(false);
  const [linkError, setLinkError] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [recoveryBusy, setRecoveryBusy] = useState(false);

  // Sign up state
  const [fullName, setFullName] = useState("");
  const [schoolName, setSchoolName] = useState("");
  const [schoolEmail, setSchoolEmail] = useState("");
  const [signUpPassword, setSignUpPassword] = useState("");
  const [signUpBusy, setSignUpBusy] = useState(false);
  const [submittedSuccess, setSubmittedSuccess] = useState(false);
  const [pendingAccountWarning, setPendingAccountWarning] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const queryParams = new URLSearchParams(window.location.search);
    const hashParams = new URLSearchParams(window.location.hash.replace(/^#/, ""));

    const errorCode = hashParams.get("error_code") || queryParams.get("error_code");
    const errorDescription =
      hashParams.get("error_description") || queryParams.get("error_description");

    if (errorCode) {
      setLinkError(true);
      toast.error(
        errorDescription
          ? decodeURIComponent(errorDescription.replace(/\+/g, " "))
          : "Reset link expired or invalid.",
      );
      setView("forgot");
      return;
    }

    const tokenHash = queryParams.get("token_hash");
    const tokenType = (queryParams.get("type") || "recovery") as any;

    if (tokenHash) {
      setView("verifying");
      supabase.auth.verifyOtp({ token_hash: tokenHash, type: tokenType }).then(({ data, error }) => {
        // Clean URL so refresh does not re-verify consumed token
        const cleanUrl = new URL(window.location.href);
        cleanUrl.searchParams.delete("token_hash");
        cleanUrl.searchParams.delete("type");
        window.history.replaceState({}, document.title, cleanUrl.pathname + cleanUrl.search + cleanUrl.hash);

        if (error) {
          console.error("Teacher token verification error:", error);
          setLinkError(true);
          toast.error(error.message || "This invitation or reset link is invalid or has expired.");
          setView("forgot");
        } else {
          toast.success("Identity verified. Please set your educator password.");
          setLinkError(false);
          setView("recovery");
        }
      });
      return;
    }

    const initialRecovery = readRecoveryLinkState();
    if (initialRecovery === "recovery") {
      setView("verifying");
    }

    const timeout = window.setTimeout(() => {
      setView((current) => {
        if (current !== "verifying") return current;
        setLinkError(true);
        return "forgot";
      });
    }, 8000);

    const { data: subscription } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY") {
        window.clearTimeout(timeout);
        setLinkError(false);
        setView("recovery");
      }
    });

    return () => {
      window.clearTimeout(timeout);
      subscription.subscription.unsubscribe();
    };
  }, []);

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setSignInBusy(true);
    setPendingAccountWarning(null);

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: signInEmail.trim(),
        password: signInPassword,
      });

      if (error) {
        toast.error(error.message);
        setSignInBusy(false);
        return;
      }

      // Check teacher verification status
      const statusRes = await checkTeacherStatusFn();

      if (statusRes.isStaff || statusRes.isAdmin || (statusRes.status as string) === "approved") {
        toast.success("Welcome, Educator! Staff privileges verified.");
        navigate({ to: "/classes", replace: true });
      } else if (statusRes.status === "pending") {
        // Teacher registered but admin hasn't approved yet
        await supabase.auth.signOut();
        setPendingAccountWarning(
          "Your teacher registration for this school is currently pending administrative verification. For exam security, access is granted once your institutional email is verified by our team.",
        );
      } else {
        // Normal student account trying to sign in through teacher portal
        await supabase.auth.signOut();
        toast.error("This account does not have teacher staff privileges. Please use the student sign-in portal.");
      }
    } catch (err: any) {
      toast.error(err?.message || "Sign in failed.");
    } finally {
      setSignInBusy(false);
    }
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!schoolName.trim()) {
      toast.error("Official School Name is compulsory for teacher verification.");
      return;
    }
    if (!schoolEmail.trim() || !schoolEmail.includes("@")) {
      toast.error("A valid school/institutional email address is compulsory.");
      return;
    }
    if (signUpPassword.length < 6) {
      toast.error("Password must be at least 6 characters.");
      return;
    }

    setSignUpBusy(true);
    try {
      const res = await registerTeacherFn({
        data: {
          fullName,
          schoolName,
          schoolEmail,
          password: signUpPassword,
        },
      });

      if (res.success) {
        setSubmittedSuccess(true);
        toast.success("Teacher registration submitted for administrative verification!");
      }
    } catch (err: any) {
      toast.error(err?.message || "Registration failed.");
    } finally {
      setSignUpBusy(false);
    }
  };

  const handleSendResetLink = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resetEmail.trim() || !resetEmail.includes("@")) {
      toast.error("Please enter a valid school/institutional email address.");
      return;
    }
    setResetBusy(true);
    try {
      const res = await fetch("/api/password-reset", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email: resetEmail.trim(), portal: "teacher" }),
      });
      const data = (await res.json().catch(() => ({}))) as { message?: string };
      if (!res.ok) {
        toast.error(data.message || "The reset email could not be sent.");
      } else {
        setResetSent(true);
        toast.success("Educator password reset link sent!");
      }
    } catch (err: any) {
      toast.error(err?.message || "Failed to send reset link.");
    } finally {
      setResetBusy(false);
    }
  };

  const handleSetNewPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword.length < 6) {
      toast.error("Password must be at least 6 characters.");
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error("Those two passwords don't match.");
      return;
    }
    setRecoveryBusy(true);
    try {
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) {
        toast.error(error.message);
        setRecoveryBusy(false);
        return;
      }
      toast.success("Educator password successfully updated!");
      const statusRes = await checkTeacherStatusFn();
      if (statusRes.isStaff || statusRes.isAdmin || (statusRes.status as string) === "approved") {
        navigate({ to: "/classes", replace: true });
      } else if (statusRes.status === "pending") {
        await supabase.auth.signOut();
        setView("credentials");
        setPendingAccountWarning(
          "Your password was updated, but your teacher account is still pending administrative verification before full workspace access is granted.",
        );
      } else {
        navigate({ to: "/classes", replace: true });
      }
    } catch (err: any) {
      toast.error(err?.message || "Failed to update password.");
    } finally {
      setRecoveryBusy(false);
    }
  };

  return (
    <div className="hero-glow relative flex min-h-dvh items-start justify-center overflow-x-hidden overflow-y-auto px-3 py-6 sm:items-center sm:px-4 sm:py-12">
      <div className="paper-grid pointer-events-none absolute inset-0 opacity-25" aria-hidden="true" />
      <div className="pointer-events-none absolute -top-24 -right-24 size-96 rounded-full bg-primary/10 blur-3xl" aria-hidden="true" />

      <div className="relative w-full max-w-xl">
        {/* Navigation Bar */}
        <div className="mb-6 flex items-center justify-between gap-4">
          <Link to="/" className="group flex items-center gap-2.5">
            <img
              src="/marginalite-mark.svg"
              alt="Marginalite"
              className="size-9 object-contain transition-transform group-hover:-rotate-6"
            />
            <div className="flex items-center gap-2">
              <span className="text-lg font-bold">Marginalite</span>
              <span className="rounded-full bg-primary/15 border border-primary/30 px-2 py-0.5 text-[11px] font-semibold text-primary">
                Teacher Portal
              </span>
            </div>
          </Link>

          <Link
            to="/"
            className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
          >
            <ArrowLeft className="size-3.5" />
            Back to site
          </Link>
        </div>

        {/* Auth Card */}
        <div className="panel border-2 border-border shadow-xl p-6 sm:p-8 rounded-2xl bg-card">
          {submittedSuccess ? (
            <div className="text-center py-6 space-y-4 animate-in fade-in zoom-in-95 duration-300">
              <div className="mx-auto flex size-14 items-center justify-center rounded-2xl bg-primary/10 text-primary border border-primary/30">
                <Clock className="size-7" />
              </div>
              <h2 className="text-xl font-bold">Teacher Application Under Review</h2>
              <p className="text-sm text-muted-foreground max-w-md mx-auto leading-relaxed">
                Thank you, <strong>{fullName}</strong>. Your teacher account for <strong>{schoolName}</strong> ({schoolEmail}) has been registered and submitted to the Marginalite administration team.
              </p>
              <div className="rounded-xl border border-border bg-muted/50 p-4 text-xs text-left space-y-2 text-muted-foreground">
                <div className="flex items-center gap-2 font-semibold text-foreground">
                  <ShieldCheck className="size-4 text-primary" />
                  Why is verification required?
                </div>
                <p>
                  To protect confidential Cambridge IGCSE 0455 mark schemes, examination anchor calibrations, and student classwork, all teacher privileges require one-time manual verification of institutional affiliation.
                </p>
                <p className="text-primary font-medium">
                  You will receive an email confirmation once your account is verified.
                </p>
              </div>
              <div className="pt-2">
                <Button
                  variant="outline"
                  onClick={() => {
                    setSubmittedSuccess(false);
                    setSignInEmail(schoolEmail);
                  }}
                >
                  Return to Sign In
                </Button>
              </div>
            </div>
          ) : view === "verifying" ? (
            <div className="text-center py-8 space-y-4 animate-in fade-in duration-300">
              <div className="mx-auto flex size-14 items-center justify-center rounded-2xl bg-primary/10 text-primary border border-primary/30">
                <KeyRound className="size-7 animate-pulse" />
              </div>
              <h2 className="text-xl font-bold">Verifying Educator Link</h2>
              <p className="text-sm text-muted-foreground max-w-sm mx-auto">
                Confirming your security token with the Teacher Portal. This only takes a moment…
              </p>
              <div className="flex justify-center pt-2">
                <Loader2 className="size-6 animate-spin text-primary" />
              </div>
            </div>
          ) : view === "forgot" ? (
            <div className="space-y-5 animate-in fade-in slide-in-from-right-3 duration-300">
              <button
                type="button"
                onClick={() => {
                  setLinkError(false);
                  setResetSent(false);
                  setView("credentials");
                }}
                className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
              >
                <ArrowLeft className="size-3.5" />
                Back to Teacher Sign In
              </button>

              <div className="flex items-center gap-3">
                <div className="flex size-10 items-center justify-center rounded-xl bg-primary/10 text-primary border border-primary/30 shrink-0">
                  <KeyRound className="size-5" />
                </div>
                <div>
                  <h2 className="text-base font-bold text-foreground">Reset Educator Password</h2>
                  <p className="text-xs text-muted-foreground">
                    We'll send a secure password reset link to your official school email.
                  </p>
                </div>
              </div>

              {linkError && (
                <div className="rounded-xl border border-destructive/30 bg-destructive/10 p-3 text-xs text-destructive">
                  That reset link has expired or has already been used. Please request a new one below.
                </div>
              )}

              {resetSent ? (
                <div className="rounded-2xl border border-primary/30 bg-primary/10 p-5 text-center space-y-3">
                  <div className="mx-auto flex size-10 items-center justify-center rounded-full bg-primary/20 text-primary">
                    <CheckCircle2 className="size-5" />
                  </div>
                  <h3 className="text-sm font-bold text-foreground">Check Your School Email</h3>
                  <p className="text-xs text-muted-foreground max-w-sm mx-auto leading-relaxed">
                    If an authorized educator account exists for <strong>{resetEmail}</strong>, a secure password reset link has been dispatched. Please check your inbox and spam folder.
                  </p>
                  <div className="pt-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setView("credentials");
                        setResetSent(false);
                      }}
                    >
                      Return to Sign In
                    </Button>
                  </div>
                </div>
              ) : (
                <form onSubmit={handleSendResetLink} className="space-y-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="t-reset-email">School / Institutional Email</Label>
                    <Input
                      id="t-reset-email"
                      type="email"
                      required
                      placeholder="teacher@school.edu"
                      value={resetEmail}
                      onChange={(e) => setResetEmail(e.target.value)}
                    />
                    <p className="text-[11px] text-muted-foreground">
                      Enter the registered email associated with your verified Cambridge educator account.
                    </p>
                  </div>

                  <Button
                    type="submit"
                    className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-semibold"
                    disabled={resetBusy}
                  >
                    {resetBusy ? (
                      <>
                        <Loader2 className="mr-2 size-4 animate-spin" />
                        Sending Reset Link…
                      </>
                    ) : (
                      "Send Educator Reset Link →"
                    )}
                  </Button>
                </form>
              )}
            </div>
          ) : view === "recovery" ? (
            <div className="space-y-5 animate-in fade-in slide-in-from-right-3 duration-300">
              <div className="flex items-center gap-3">
                <div className="flex size-10 items-center justify-center rounded-xl bg-primary/10 text-primary border border-primary/30 shrink-0">
                  <Lock className="size-5" />
                </div>
                <div>
                  <h2 className="text-base font-bold text-foreground">Set New Educator Password</h2>
                  <p className="text-xs text-muted-foreground">
                    Identity verified. Choose a new secure password for your teacher account.
                  </p>
                </div>
              </div>

              <form onSubmit={handleSetNewPassword} className="space-y-4">
                <div className="space-y-1.5">
                  <Label htmlFor="t-new-password">New Password</Label>
                  <Input
                    id="t-new-password"
                    type="password"
                    required
                    minLength={6}
                    placeholder="At least 6 characters"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="t-confirm-password">Confirm New Password</Label>
                  <Input
                    id="t-confirm-password"
                    type="password"
                    required
                    minLength={6}
                    placeholder="Re-enter new password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                  />
                  {confirmPassword.length > 0 && confirmPassword !== newPassword && (
                    <p className="text-xs text-destructive">Passwords do not match.</p>
                  )}
                </div>

                <Button
                  type="submit"
                  className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-semibold"
                  disabled={recoveryBusy}
                >
                  {recoveryBusy ? (
                    <>
                      <Loader2 className="mr-2 size-4 animate-spin" />
                      Updating Password…
                    </>
                  ) : (
                    "Update Educator Password & Sign In →"
                  )}
                </Button>
              </form>
            </div>
          ) : (
            <div>
              <div className="mb-6">
                <div className="flex items-center gap-2 text-primary text-xs font-semibold uppercase tracking-wider mb-1">
                  <GraduationCap className="size-4" />
                  Cambridge IGCSE (0455) Educators
                </div>
                <h1 className="text-2xl font-bold">Teacher &amp; Department Workspace</h1>
                <p className="text-sm text-muted-foreground mt-1">
                  Organize Cambridge classrooms, issue essay homework, review student diagnostic heatmaps, and calibrate department standards.
                </p>
              </div>

              {pendingAccountWarning && (
                <div className="mb-5 rounded-xl border border-amber-500/30 bg-amber-500/10 p-4 text-xs text-amber-700 dark:text-amber-400 flex items-start gap-3">
                  <Clock className="size-5 shrink-0 mt-0.5" />
                  <div>
                    <strong className="block font-semibold mb-0.5">Account Pending Verification</strong>
                    {pendingAccountWarning}
                  </div>
                </div>
              )}

              <Tabs defaultValue="signin">
                <TabsList className="grid w-full grid-cols-2 mb-6">
                  <TabsTrigger value="signin">Teacher Sign In</TabsTrigger>
                  <TabsTrigger value="signup">Register as Teacher</TabsTrigger>
                </TabsList>

                {/* Teacher Sign In Tab */}
                <TabsContent value="signin">
                  <form onSubmit={handleSignIn} className="space-y-4">
                    <div className="space-y-1.5">
                      <Label htmlFor="t-signin-email">School / Institutional Email</Label>
                      <Input
                        id="t-signin-email"
                        type="email"
                        required
                        placeholder="teacher@school.edu"
                        value={signInEmail}
                        onChange={(e) => setSignInEmail(e.target.value)}
                      />
                    </div>

                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between">
                        <Label htmlFor="t-signin-password">Password</Label>
                        <button
                          type="button"
                          onClick={() => {
                            setResetEmail(signInEmail);
                            setResetSent(false);
                            setLinkError(false);
                            setView("forgot");
                          }}
                          className="text-xs text-primary hover:underline cursor-pointer font-medium"
                        >
                          Forgot password?
                        </button>
                      </div>
                      <Input
                        id="t-signin-password"
                        type="password"
                        required
                        placeholder="••••••••"
                        value={signInPassword}
                        onChange={(e) => setSignInPassword(e.target.value)}
                      />
                    </div>

                    <Button type="submit" className="w-full bg-primary hover:bg-primary/90 text-primary-foreground" disabled={signInBusy}>
                      {signInBusy ? "Verifying Credentials…" : "Sign In to Teacher Portal →"}
                    </Button>

                    <div className="pt-2 text-center text-xs text-muted-foreground">
                      Student looking for revision?{" "}
                      <Link to="/auth" className="text-primary font-semibold hover:underline">
                        Go to Student Portal
                      </Link>
                    </div>
                  </form>
                </TabsContent>

                {/* Teacher Sign Up Tab */}
                <TabsContent value="signup">
                  <form onSubmit={handleSignUp} className="space-y-4">
                    <div className="space-y-1.5">
                      <Label htmlFor="t-signup-name">Full Name</Label>
                      <Input
                        id="t-signup-name"
                        required
                        placeholder="Dr. Eleanor Vance"
                        value={fullName}
                        onChange={(e) => setFullName(e.target.value)}
                      />
                    </div>

                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between">
                        <Label htmlFor="t-signup-school">Official School / Institution Name</Label>
                        <span className="text-[11px] text-primary font-medium">Compulsory</span>
                      </div>
                      <Input
                        id="t-signup-school"
                        required
                        placeholder="e.g. Cambridge International School, Delhi"
                        value={schoolName}
                        onChange={(e) => setSchoolName(e.target.value)}
                      />
                    </div>

                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between">
                        <Label htmlFor="t-signup-email">School / Institutional Email</Label>
                        <span className="text-[11px] text-primary font-medium">Compulsory</span>
                      </div>
                      <Input
                        id="t-signup-email"
                        type="email"
                        required
                        placeholder="e.vance@school.edu"
                        value={schoolEmail}
                        onChange={(e) => setSchoolEmail(e.target.value)}
                      />
                      <p className="text-[11px] text-muted-foreground">
                        Use your official school or college email domain to accelerate administrator verification.
                      </p>
                    </div>

                    <div className="space-y-1.5">
                      <Label htmlFor="t-signup-password">Choose Password</Label>
                      <Input
                        id="t-signup-password"
                        type="password"
                        required
                        placeholder="At least 6 characters"
                        value={signUpPassword}
                        onChange={(e) => setSignUpPassword(e.target.value)}
                      />
                    </div>

                    <div className="rounded-lg border border-primary/20 bg-primary/5 p-3 text-xs text-muted-foreground space-y-1">
                      <div className="flex items-center gap-1.5 font-semibold text-foreground">
                        <School className="size-3.5 text-primary" />
                        Staff Verification Safeguard
                      </div>
                      <p>
                        Teacher accounts receive authority to ingest custom syllabus mark schemes, calibrate exam anchors, and manage student grades. All accounts require administrator verification before activation.
                      </p>
                    </div>

                    <Button type="submit" className="w-full bg-primary hover:bg-primary/90 text-primary-foreground" disabled={signUpBusy}>
                      {signUpBusy ? "Submitting Application…" : "Submit Teacher Registration →"}
                    </Button>

                    <div className="pt-1 text-center text-xs text-muted-foreground">
                      Already verified? Switch to the <strong>Teacher Sign In</strong> tab above.
                    </div>
                  </form>
                </TabsContent>
              </Tabs>
            </div>
          )}
        </div>

        {/* Feature Highlights Grid */}
        <div className="mt-8 grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs text-muted-foreground">
          <div className="flex items-center gap-2 p-3 rounded-xl border border-border bg-card/60">
            <BookOpen className="size-4 text-primary shrink-0" />
            <span>Mark Scheme &amp; RAG Ingestion</span>
          </div>
          <div className="flex items-center gap-2 p-3 rounded-xl border border-border bg-card/60">
            <ShieldCheck className="size-4 text-primary shrink-0" />
            <span>Anchor Calibration Standards</span>
          </div>
          <div className="flex items-center gap-2 p-3 rounded-xl border border-border bg-card/60">
            <School className="size-4 text-primary shrink-0" />
            <span>Cohort Classroom Management</span>
          </div>
        </div>
      </div>
    </div>
  );
}
