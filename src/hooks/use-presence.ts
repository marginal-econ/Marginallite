import { useEffect } from "react";

import { supabase } from "@/integrations/backend/client";
import { HEARTBEAT_INTERVAL_MS } from "@/lib/presence";
import { CONSENT_EVENT, readPrivacyConsent, type ConsentChoice } from "@/lib/privacy-consent";

/**
 * Tells the server "this signed-in user is here, on this page" every minute
 * while the tab is visible, so the admin console can show who is online right
 * now. Best-effort: a failed ping is silently ignored and never affects the app.
 */
export function usePresenceHeartbeat(pathname: string, userId: string) {
  useEffect(() => {
    let cancelled = false;
    let analyticsAllowed = readPrivacyConsent(userId)?.analytics === true;
    let rpcSupported = true;

    const ping = () => {
      if (cancelled || !analyticsAllowed || !rpcSupported || document.visibilityState !== "visible") return;
      void Promise.resolve(supabase.rpc("touch_presence", { p_path: pathname }))
        .then((res: any) => {
          if (res?.error) {
            rpcSupported = false;
          }
        })
        .catch(() => {
          rpcSupported = false;
        });
    };

    const onConsentChanged = (event: Event) => {
      analyticsAllowed = (event as CustomEvent<ConsentChoice>).detail.analytics === true;
      if (analyticsAllowed) ping();
    };

    ping();
    const interval = window.setInterval(ping, HEARTBEAT_INTERVAL_MS);
    const onVisible = () => {
      if (document.visibilityState === "visible") ping();
    };
    document.addEventListener("visibilitychange", onVisible);
    window.addEventListener(CONSENT_EVENT, onConsentChanged);

    return () => {
      cancelled = true;
      window.clearInterval(interval);
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener(CONSENT_EVENT, onConsentChanged);
    };
  }, [pathname, userId]);
}
