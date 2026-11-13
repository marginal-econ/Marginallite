import { Link } from "@tanstack/react-router";
import { BarChart3, LockKeyhole, ShieldCheck } from "lucide-react";
import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import {
  CONSENT_EVENT,
  CONSENT_VERSION,
  privacyConsentStorageKey,
  readPrivacyConsent,
  type ConsentChoice,
} from "@/lib/privacy-consent";

export function PrivacyConsent({
  userId,
  onResolved,
}: {
  userId: string;
  onResolved?: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [customizing, setCustomizing] = useState(false);
  const [analytics, setAnalytics] = useState(false);

  useEffect(() => {
    try {
      const saved = readPrivacyConsent(userId);
      if (!saved) setOpen(true);
      else onResolved?.();
    } catch {
      setOpen(true);
    }
  }, [onResolved, userId]);

  function save(analyticsAllowed: boolean) {
    const choice: ConsentChoice = {
      version: CONSENT_VERSION,
      essential: true,
      analytics: analyticsAllowed,
      savedAt: new Date().toISOString(),
    };
    window.localStorage.setItem(privacyConsentStorageKey(userId), JSON.stringify(choice));
    window.dispatchEvent(new CustomEvent(CONSENT_EVENT, { detail: choice }));
    setOpen(false);
    onResolved?.();
  }

  return (
    <Dialog open={open}>
      <DialogContent
        overlayClassName="bg-black/25 backdrop-blur-[1px]"
        className="!top-auto !right-auto !bottom-4 !left-4 max-h-[calc(100dvh-2rem)] w-[calc(100%-2rem)] max-w-md !translate-x-0 !translate-y-0 gap-0 overflow-y-auto rounded-3xl border-2 border-foreground p-0 shadow-[8px_8px_0_hsl(var(--foreground))] data-[state=open]:slide-in-from-bottom-5 sm:!bottom-6 sm:!left-6 sm:w-[28rem] [&>button]:hidden"
        onEscapeKeyDown={(event) => event.preventDefault()}
        onInteractOutside={(event) => event.preventDefault()}
      >
        <div className="h-2 bg-primary" />
        <div className="p-5 sm:p-6">
          <DialogHeader className="text-left">
            <p className="text-xs font-bold tracking-[0.2em] text-primary uppercase">
              Your privacy choices
            </p>
            <DialogTitle className="text-2xl">Cookies and privacy</DialogTitle>
            <DialogDescription className="pt-2 text-sm leading-relaxed">
              Marginalite uses essential browser storage to keep you signed in, protect your session,
              and remember your settings. Optional analytics help us understand which features need
              improvement.
            </DialogDescription>
          </DialogHeader>

          {customizing ? (
            <div className="mt-5 space-y-3">
              <div className="flex items-start justify-between gap-3 rounded-xl border bg-muted/25 p-3.5">
                <div className="flex gap-3">
                  <LockKeyhole className="mt-0.5 size-5 shrink-0 text-primary" />
                  <div>
                    <p className="text-sm font-semibold">Essential storage</p>
                    <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                      Required for authentication, security, navigation, and saved preferences. This
                      cannot be switched off while using your account.
                    </p>
                  </div>
                </div>
                <span className="rounded-full bg-primary/10 px-2.5 py-1 text-xs font-semibold text-primary">
                  Always on
                </span>
              </div>

              <div className="flex items-start justify-between gap-3 rounded-xl border p-3.5">
                <div className="flex gap-3">
                  <BarChart3 className="mt-0.5 size-5 shrink-0 text-primary" />
                  <div>
                    <label htmlFor="analytics-consent" className="text-sm font-semibold">
                      Usage analytics
                    </label>
                    <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                      Allows privacy-conscious measurement of feature usage. It is optional and is
                      never used for advertising.
                    </p>
                  </div>
                </div>
                <Switch
                  id="analytics-consent"
                  checked={analytics}
                  onCheckedChange={setAnalytics}
                  aria-label="Allow optional usage analytics"
                />
              </div>

              <Button className="mt-2 w-full" size="lg" onClick={() => save(analytics)}>
                Save my choices
              </Button>
            </div>
          ) : (
            <>
              <button
                type="button"
                className="mt-5 text-sm font-semibold underline decoration-border decoration-2 underline-offset-8 hover:text-primary"
                onClick={() => setCustomizing(true)}
              >
                Customize choices
              </button>

              <div className="mt-6 flex flex-col gap-3 min-[420px]:flex-row">
                <Button className="flex-1" variant="outline" size="lg" onClick={() => save(false)}>
                  Essential only
                </Button>
                <Button className="flex-1" size="lg" onClick={() => save(true)}>
                  <ShieldCheck className="size-4" />
                  Accept all
                </Button>
              </div>
            </>
          )}

          <p className="mt-6 text-xs text-muted-foreground">
            Read our{" "}
            <Link to="/privacy" className="underline underline-offset-4 hover:text-foreground">
              Privacy Policy
            </Link>{" "}
            and{" "}
            <Link to="/terms" className="underline underline-offset-4 hover:text-foreground">
              Terms
            </Link>
            .
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
