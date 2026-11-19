import { useState } from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/backend/client";
import { cn } from "@/lib/utils";

interface GoogleSignInButtonProps {
  redirectTo?: string;
  label?: string;
  className?: string;
  disabled?: boolean;
}

export function GoogleIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      width="18"
      height="18"
      className={cn("shrink-0", className)}
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <path
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
        fill="#4285F4"
      />
      <path
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
        fill="#34A853"
      />
      <path
        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
        fill="#FBBC05"
      />
      <path
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
        fill="#EA4335"
      />
    </svg>
  );
}

export function GoogleSignInButton({
  redirectTo = "/dashboard",
  label = "Continue with Google",
  className,
  disabled = false,
}: GoogleSignInButtonProps) {
  const [loading, setLoading] = useState(false);

  const handleGoogleSignIn = async () => {
    if (loading || disabled) return;
    setLoading(true);

    try {
      const origin =
        typeof window !== "undefined" && window.location.origin
          ? window.location.origin
          : "https://lite.marginal-econ.com";

      const returnUrl = new URL("/auth", origin);
      if (redirectTo && redirectTo.startsWith("/")) {
        returnUrl.searchParams.set("redirect", redirectTo);
      }

      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: returnUrl.toString(),
          queryParams: {
            access_type: "offline",
            prompt: "select_account",
          },
        },
      });

      if (error) {
        throw error;
      }

      if (data?.url) {
        window.location.assign(data.url);
      }
    } catch (err: any) {
      console.error("Google sign in error:", err);
      toast.error(err?.message || "Failed to initiate Google authentication. Please try again.");
      setLoading(false);
    }
  };

  return (
    <Button
      type="button"
      variant="outline"
      size="lg"
      onClick={handleGoogleSignIn}
      disabled={loading || disabled}
      className={cn(
        "relative flex w-full items-center justify-center gap-3 rounded-xl border border-border/90 bg-card py-2.5 px-4 font-semibold text-foreground text-xs sm:text-sm shadow-2xs transition-all duration-150 hover:bg-muted/80 hover:text-foreground active:scale-[0.99] focus-visible:ring-2 focus-visible:ring-primary/40",
        className,
      )}
    >
      {loading ? (
        <>
          <Loader2 className="size-4 animate-spin text-primary shrink-0" />
          <span>Connecting to Google…</span>
        </>
      ) : (
        <>
          <GoogleIcon className="size-4.5" />
          <span>{label}</span>
        </>
      )}
    </Button>
  );
}
