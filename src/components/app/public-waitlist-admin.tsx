import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Eye, Mail, RefreshCw, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  listPublicWaitlist,
  invitePublicWaitlistMember,
  removePublicWaitlistMember,
} from "@/lib/admin.functions";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export function PublicWaitlistPanel() {
  const list = useServerFn(listPublicWaitlist);
  const invite = useServerFn(invitePublicWaitlistMember);
  const removeMember = useServerFn(removePublicWaitlistMember);
  const cache = useQueryClient();
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<{ id: string; email: string } | null>(null);
  const [selectedForRemoval, setSelectedForRemoval] = useState<{
    id: string;
    email: string;
  } | null>(null);
  const [previewOpen, setPreviewOpen] = useState(false);
  const members = useQuery({ queryKey: ["public-waitlist"], queryFn: () => list() });
  const send = useMutation({
    mutationFn: (id: string) => invite({ data: { id } }),
    onSuccess: (result) => {
      if (result.warning) toast.warning(result.warning);
      else toast.success("Invitation sent. They can use the email link to set their password.");
      void cache.invalidateQueries({ queryKey: ["public-waitlist"] });
      void cache.invalidateQueries({ queryKey: ["users"] });
    },
    onError: (error: Error) => toast.error(error.message),
  });
  const remove = useMutation({
    mutationFn: (id: string) => removeMember({ data: { id } }),
    onSuccess: () => {
      toast.success("Removed from the waitlist.");
      setSelectedForRemoval(null);
      void cache.invalidateQueries({ queryKey: ["public-waitlist"] });
    },
    onError: (error: Error) => toast.error(error.message),
  });
  const rows = (members.data ?? []).filter((member) =>
    `${member.name ?? ""} ${member.email} ${member.city ?? ""} ${member.country ?? ""}`
      .toLowerCase()
      .includes(search.toLowerCase().trim()),
  );
  const acceptedCount = (members.data ?? []).filter(
    (member) => member.status === "accepted",
  ).length;
  const waitingCount = (members.data?.length ?? 0) - acceptedCount;

  return (
    <section className="panel space-y-5 p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="font-semibold">Website waitlist</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            {members.data
              ? `${waitingCount} awaiting access · ${acceptedCount} accepted`
              : "Loading members…"}{" "}
            · Listed in signup order, matching the website.
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => setPreviewOpen(true)}>
            <Eye className="size-4" /> Preview email
          </Button>
          <Button
            variant="outline"
            size="sm"
            disabled={members.isFetching}
            onClick={() => void members.refetch()}
          >
            <RefreshCw className="size-4" /> Refresh
          </Button>
        </div>
      </div>
      <p className="text-sm text-muted-foreground">
        Invite a member to give them student access. Their email link lets them choose a password.
        You can change their role in the Users tab afterwards.
      </p>
      <Input
        aria-label="Search waitlist"
        placeholder="Search by name, email, city or country"
        value={search}
        onChange={(event) => setSearch(event.target.value)}
      />
      {members.isPending ? (
        <p>Loading waitlist…</p>
      ) : members.isError ? (
        <p role="alert" className="text-sm text-destructive">
          {members.error.message}
        </p>
      ) : rows.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          {search ? "No matching members." : "No one has joined yet."}
        </p>
      ) : (
        <div className="divide-y divide-border">
          {rows.map((member) => {
            const accepted = member.status === "accepted";
            return (
              <div
                key={member.id}
                className={
                  accepted
                    ? "flex flex-wrap items-center gap-4 py-4 opacity-65"
                    : "flex flex-wrap items-center gap-4 py-4"
                }
              >
                <span className="w-10 text-sm font-semibold text-muted-foreground">
                  #{member.position}
                </span>
                <div className="min-w-0 flex-1 basis-48">
                  <p className={accepted ? "font-medium line-through" : "font-medium"}>
                    {member.name || "Name not provided"}
                  </p>
                  <p
                    className={
                      accepted
                        ? "break-all text-sm text-muted-foreground line-through"
                        : "break-all text-sm text-muted-foreground"
                    }
                  >
                    {member.email}
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {[member.city, member.country].filter(Boolean).join(", ") ||
                      "Location not recorded"}
                    {" · "}
                    {accepted && member.accepted_at
                      ? `Accepted ${new Date(member.accepted_at).toLocaleString()}`
                      : `Joined ${new Date(member.created_at).toLocaleString()}`}
                  </p>
                </div>
                <Badge variant="secondary">
                  {accepted ? "accepted · user created" : member.status}
                </Badge>
                {accepted ? (
                  <span className="min-w-36 text-center text-sm font-medium text-emerald-700">
                    Access active
                  </span>
                ) : (
                  <Button
                    size="sm"
                    disabled={member.status === "archived" || send.isPending}
                    onClick={() => setSelected(member)}
                  >
                    <Mail className="size-4" />
                    {send.isPending && send.variables === member.id
                      ? "Sending…"
                      : member.status === "invited"
                        ? "Resend invite"
                        : "Invite student"}
                  </Button>
                )}
                <Button
                  size="sm"
                  variant="outline"
                  className="text-destructive hover:text-destructive"
                  disabled={remove.isPending}
                  onClick={() => setSelectedForRemoval({ id: member.id, email: member.email })}
                >
                  <Trash2 className="size-4" />
                  {remove.isPending && remove.variables === member.id ? "Removing…" : "Remove"}
                </Button>
              </div>
            );
          })}
        </div>
      )}
      <AlertDialog
        open={!!selected}
        onOpenChange={(open) => {
          if (!open) setSelected(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Send access invitation?</AlertDialogTitle>
            <AlertDialogDescription>
              This emails {selected?.email} an invitation and gives them student access to Marginalite.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (selected) send.mutate(selected.id);
              }}
            >
              Send invitation
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      <AlertDialog
        open={!!selectedForRemoval}
        onOpenChange={(open) => {
          if (!open && !remove.isPending) setSelectedForRemoval(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove from the waitlist?</AlertDialogTitle>
            <AlertDialogDescription>
              This permanently removes {selectedForRemoval?.email} from the waitlist. It does not
              delete an existing login account or revoke access already granted.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={remove.isPending}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              disabled={remove.isPending}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={(event) => {
                event.preventDefault();
                if (selectedForRemoval) remove.mutate(selectedForRemoval.id);
              }}
            >
              {remove.isPending ? "Removing…" : "Remove member"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
        <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto p-0">
          <DialogHeader className="border-b px-6 py-5">
            <DialogTitle>Invitation email preview</DialogTitle>
            <DialogDescription>
              This is how the email will look. The recipient’s name, address, and secure link are
              inserted automatically.
            </DialogDescription>
          </DialogHeader>
          <div className="bg-[#f7f4ff] p-5 sm:p-8">
            <div className="overflow-hidden rounded-3xl border-2 border-[#21172d] bg-white shadow-[7px_7px_0_#21172d]">
              <div className="h-2.5 bg-[#7c4edb]" />
              <div className="space-y-5 p-7 sm:p-9">
                <div className="flex items-center gap-3">
                  <span className="grid size-11 place-items-center rounded-xl border-2 border-[#21172d] bg-[#7c4edb] text-xl font-bold text-white">
                    m
                  </span>
                  <span className="text-xl font-bold text-[#181323]">Marginalite</span>
                </div>
                <p className="text-xs font-bold uppercase tracking-[0.14em] text-[#7c4edb]">
                  Your access is ready
                </p>
                <h3 className="text-3xl font-bold leading-tight text-[#181323]">
                  Welcome to Marginalite, Student.
                </h3>
                <p className="text-base leading-7 text-[#625d6c]">
                  You’ve been invited to use Marginalite for AS and IGCSE 0455 Economics (0455). Choose a
                  password to open your student account.
                </p>
                <span className="inline-flex rounded-xl border-2 border-[#21172d] bg-[#7c4edb] px-5 py-3 font-bold text-white shadow-[4px_4px_0_#21172d]">
                  Set up my account →
                </span>
                <p className="text-xs leading-5 text-[#777180]">
                  The real email shows the recipient’s address here. If they weren’t expecting the
                  invitation, they can safely ignore it.
                </p>
              </div>
            </div>
            <p className="mt-5 text-center text-xs text-[#777180]">
              Marginalite · Built for Cambridge Economics 0455
            </p>
          </div>
        </DialogContent>
      </Dialog>
    </section>
  );
}
