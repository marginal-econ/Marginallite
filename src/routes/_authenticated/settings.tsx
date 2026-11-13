import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Loader2, Save } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { PageHeader } from "@/components/app/app-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { getMe, updateProfile } from "@/lib/account.functions";

export const Route = createFileRoute("/_authenticated/settings")({
  component: SettingsPage,
});

function SettingsPage() {
  const queryClient = useQueryClient();
  const fetchMe = useServerFn(getMe);
  const save = useServerFn(updateProfile);

  const me = useQuery({ queryKey: ["me"], queryFn: () => fetchMe() });

  const [fullName, setFullName] = useState("");
  const [school, setSchool] = useState("");

  // The admin console lists every user's school (see admin.tsx's user
  // table), but until this page existed nothing ever wrote that field —
  // it was permanently "No school" for everyone. Seed the form from the
  // loaded profile once, not on every refetch, so the user's in-progress
  // edits are never clobbered by a background refresh.
  const [seeded, setSeeded] = useState(false);
  useEffect(() => {
    if (seeded || !me.data) return;
    setFullName(me.data.fullName ?? "");
    setSchool(me.data.school ?? "");
    setSeeded(true);
  }, [me.data, seeded]);

  const mutation = useMutation({
    mutationFn: () =>
      save({ data: { fullName: fullName.trim(), school: school.trim() || undefined } }),
    onSuccess: () => {
      toast.success("Profile updated.");
      queryClient.invalidateQueries({ queryKey: ["me"] });
      queryClient.invalidateQueries({ queryKey: ["admin-users"] });
    },
    onError: (error: Error) => toast.error(error.message),
  });

  return (
    <>
      <PageHeader
        title="Profile"
        description="Your name and school — shown to administrators in the console and used in reports."
      />
      <div className="mx-auto max-w-md space-y-4 px-5 py-6 md:px-8">
        {me.isLoading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="size-5 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <form
            className="panel space-y-4 p-5"
            onSubmit={(event) => {
              event.preventDefault();
              mutation.mutate();
            }}
          >
            <div className="space-y-1.5">
              <Label htmlFor="settings-name">Full name</Label>
              <Input
                id="settings-name"
                value={fullName}
                onChange={(event) => setFullName(event.target.value)}
                placeholder="Your name"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="settings-school">School</Label>
              <Input
                id="settings-school"
                value={school}
                onChange={(event) => setSchool(event.target.value)}
                placeholder="Your school or college"
              />
            </div>
            <div className="flex items-center gap-3 border-t border-border pt-4">
              <p className="text-xs text-muted-foreground capitalize">
                Signed in as {me.data?.role ?? "…"}
              </p>
              <Button type="submit" className="ml-auto" disabled={mutation.isPending}>
                {mutation.isPending ? (
                  <>
                    <Loader2 className="size-4 animate-spin" /> Saving…
                  </>
                ) : (
                  <>
                    <Save className="size-4" /> Save
                  </>
                )}
              </Button>
            </div>
          </form>
        )}
      </div>
    </>
  );
}
