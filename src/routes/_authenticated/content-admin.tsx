import { createFileRoute, redirect } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";

import { PageHeader } from "@/components/app/app-shell";
import { AdminNavTabs } from "@/components/app/admin-nav";
import { QuestionBankAdmin } from "@/components/app/question-bank-admin";
import { supabase } from "@/integrations/backend/client";
import { isAdmin } from "@/lib/auth-admin";
import { getMe } from "@/lib/account.functions";

export const Route = createFileRoute("/_authenticated/content-admin")({
  beforeLoad: async () => {
    const { data, error } = await supabase.auth.getUser();
    if (error || !data?.user) throw redirect({ to: "/auth" });
    let adminOk = isAdmin({ userId: data.user.id, email: data.user.email, claims: data.user });
    if (!adminOk) {
      try {
        const { data: roleRow } = await supabase
          .from("user_roles")
          .select("role")
          .eq("user_id", data.user.id)
          .eq("role", "admin")
          .maybeSingle();
        if (roleRow) adminOk = true;
      } catch {
        /* ignore */
      }
    }
    if (!adminOk) {
      throw redirect({ to: "/dashboard" });
    }
  },
  head: () => ({
    meta: [
      { title: "Content admin — Marginalite" },
      {
        name: "description",
        content:
          "Extract real past-paper MCQ and essay questions, then review and approve them into the student-facing question bank.",
      },
    ],
  }),
  component: ContentAdminPage,
});

function ContentAdminPage() {
  const fetchMe = useServerFn(getMe);
  const meQuery = useQuery({ queryKey: ["me"], queryFn: () => fetchMe() });

  if (meQuery.isLoading) return null;
  if (!meQuery.data?.isAdmin) {
    return (
      <div className="mx-auto max-w-md px-5 py-16 text-center">
        <p className="text-sm text-muted-foreground">
          This console is reserved exclusively for the platform administrator.
        </p>
      </div>
    );
  }

  return (
    <div>
      <PageHeader
        title="Content admin"
        description="Paper and question-bank ingestion — separate from the App admin console. Extract real past-paper questions, then review and approve them before they reach students."
      />
      <AdminNavTabs role="admin" />
      <QuestionBankAdmin />
    </div>
  );
}
