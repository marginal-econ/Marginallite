import { useEffect, useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { ArrowRight, Gamepad2, Lock, Play, Sparkles, Trophy } from "lucide-react";
import { toast } from "sonner";

import { ThemeToggle } from "@/components/marketing/theme-toggle";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { normalizeQuizPin } from "@/lib/mcq-quiz.types";
import { supabase } from "@/integrations/backend/client";

export const Route = createFileRoute("/quiz/")({
  ssr: false,
  component: QuizJoinLandingPage,
});

function QuizJoinLandingPage() {
  const navigate = useNavigate();
  const [pinInput, setPinInput] = useState("");
  const [currentUser, setCurrentUser] = useState<any | null>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setCurrentUser(data.session?.user ?? null);
    });

    const { data: authListener } = supabase.auth.onAuthStateChange((_event, session) => {
      setCurrentUser(session?.user ?? null);
    });

    return () => {
      authListener.subscription.unsubscribe();
    };
  }, []);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const clean = normalizeQuizPin(pinInput);
    if (clean.length !== 6) {
      toast.error("Please enter the 6-digit Game PIN shown by your teacher.");
      return;
    }
    if (!currentUser) {
      toast.info("Please sign in or create an account to enter the live quiz room.");
      navigate({ to: "/auth", search: { redirect: `/quiz/${clean}` } as any });
      return;
    }
    navigate({ to: "/quiz/$pin", params: { pin: clean } });
  }

  return (
    <div className="min-h-[100dvh] flex flex-col bg-gradient-to-br from-background via-primary/[0.04] to-emerald-500/[0.06] touch-manipulation">
      <header className="flex items-center justify-between px-5 py-4 border-b border-border/60 bg-background/80 backdrop-blur-sm">
        <Link to="/" className="flex items-center gap-2 font-extrabold tracking-tight text-foreground">
          <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-xs">
            <Gamepad2 className="h-4 w-4" />
          </div>
          <span>Marginal Live Quiz</span>
        </Link>
        <div className="flex items-center gap-2">
          <Link to="/mcq-live">
            <Button variant="outline" size="sm" className="text-xs font-semibold gap-1.5">
              <Sparkles className="h-3.5 w-3.5 text-primary" />
              Host a Quiz
            </Button>
          </Link>
          <ThemeToggle />
        </div>
      </header>

      <main className="flex-1 flex items-center justify-center p-5">
        <div className="w-full max-w-md space-y-6">
          <div className="text-center space-y-2">
            <div className="inline-flex items-center gap-1.5 rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-xs font-bold text-primary">
              <Trophy className="h-3.5 w-3.5" />
              Cambridge IGCSE 0455 Economics Live Arena
            </div>
            <h1 className="text-3xl sm:text-4xl font-black tracking-tight text-foreground">
              Join a Live MCQ Quiz
            </h1>
            <p className="text-sm text-muted-foreground">
              Enter the 6-digit Game PIN from your teacher to do the whole paper together in real time.
            </p>
          </div>

          <Card className="border-2 border-foreground/15 shadow-xl">
            <CardContent className="p-6">
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <label
                    htmlFor="quiz-pin-entry"
                    className="block text-center text-xs font-bold uppercase tracking-wider text-muted-foreground"
                  >
                    Enter 6-Digit Game PIN
                  </label>
                  <Input
                    id="quiz-pin-entry"
                    autoFocus
                    value={pinInput}
                    onChange={(e) => {
                      const digits = normalizeQuizPin(e.target.value);
                      setPinInput(
                        digits.length > 3 ? `${digits.slice(0, 3)} ${digits.slice(3)}` : digits,
                      );
                    }}
                    placeholder="849 201"
                    inputMode="numeric"
                    maxLength={7}
                    className="h-16 text-center font-mono text-3xl font-black tracking-[0.25em] border-2 bg-muted/20 focus-visible:ring-primary"
                  />
                </div>
                <Button
                  type="submit"
                  size="lg"
                  disabled={normalizeQuizPin(pinInput).length !== 6}
                  className="w-full h-12 text-base font-extrabold gap-2 shadow-md"
                >
                  <Play className="h-4 w-4 fill-current" />
                  Enter Game Room
                  <ArrowRight className="h-4 w-4" />
                </Button>

                {!currentUser ? (
                  <div className="rounded-xl border border-primary/25 bg-primary/5 p-3 text-center space-y-2 mt-3">
                    <div className="flex items-center justify-center gap-1.5 text-xs font-bold text-foreground">
                      <Lock className="size-3.5 text-primary" />
                      <span>Account required to join live quizzes</span>
                    </div>
                    <p className="text-[11px] text-muted-foreground leading-snug">
                      Sign in or create a free student account so your Cambridge MCQ scores and diagnostic feedback are saved.
                    </p>
                    <Button asChild size="sm" variant="outline" className="w-full h-8 text-xs font-bold">
                      <Link to="/auth" search={{ redirect: pinInput ? `/quiz/${normalizeQuizPin(pinInput)}` : "/quiz" } as any}>
                        Sign In / Sign Up Free
                      </Link>
                    </Button>
                  </div>
                ) : null}
              </form>
            </CardContent>
          </Card>

          <p className="text-center text-xs text-muted-foreground">
            Are you a teacher?{" "}
            <Link to="/mcq-live" className="font-semibold text-primary hover:underline underline-offset-2">
              Open MCQ Live to create a shareable quiz link &rarr;
            </Link>
          </p>
        </div>
      </main>
    </div>
  );
}
