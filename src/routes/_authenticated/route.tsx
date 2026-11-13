import { createFileRoute, Outlet, redirect, isRedirect } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useCallback, useState } from "react";

import { AppShell } from "@/components/app/app-shell";
import { OnboardingTutorial } from "@/components/app/onboarding-tutorial";
import { PrivacyConsent } from "@/components/app/privacy-consent";
import { supabase } from "@/integrations/backend/client";
import { getMe } from "@/lib/account.functions";
import { isAdmin } from "@/lib/auth-admin";

export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  beforeLoad: async ({ location }) => {
    try {
      const { data, error } = await supabase.auth.getUser();
      if (error || !data.user) {
        throw redirect({
          to: "/auth",
          search: { redirect: location.pathname },
        });
      }
      return { user: data.user };
    } catch (err) {
      if (isRedirect(err)) throw err;
      throw redirect({
        to: "/auth",
        search: { redirect: location.pathname },
      });
    }
  },
  component: AuthenticatedLayout,
});

function AuthenticatedLayout() {
  const context = Route.useRouteContext();
  const user = context?.user;
  const [privacyResolved, setPrivacyResolved] = useState(false);
  const handlePrivacyResolved = useCallback(() => setPrivacyResolved(true), []);
  const fetchMe = useServerFn(getMe);
  const { data } = useQuery({
    queryKey: ["me"],
    queryFn: () => fetchMe(),
    staleTime: 0,
    refetchOnMount: "always",
  });

  if (!user) {
    return null;
  }

  // Derive role
  const userRole = isAdmin({ userId: user.id, email: user.email, claims: user })
    ? "admin"
    : (user.user_metadata as any)?.role === "teacher" ||
        (user.app_metadata as any)?.role === "teacher"
      ? "teacher"
      : "student";

  const resolvedName =
    data?.fullName ||
    (user.user_metadata as any)?.full_name ||
    (user.user_metadata as any)?.name ||
    (user.email ? user.email.split("@")[0] : null);

  const resolvedRole = data?.role ?? userRole;

  return (
    <AppShell
      role={resolvedRole}
      name={resolvedName}
      school={data?.school || (user.user_metadata as any)?.school || null}
      userId={user.id}
    >
      <Outlet />
      <PrivacyConsent userId={user.id} onResolved={handlePrivacyResolved} />
      <OnboardingTutorial
        open={privacyResolved && data?.tutorialCompleted === false}
        onFinished={() => {}}
      />
    </AppShell>
  );
}
