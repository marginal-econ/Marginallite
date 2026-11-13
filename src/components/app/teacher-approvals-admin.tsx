import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Check, CheckCircle2, Clock, Mail, RefreshCw, School, Search, ShieldAlert, ShieldCheck, UserCheck, X } from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
  listTeacherApplications,
  approveTeacherApplication,
  rejectTeacherApplication,
} from "@/lib/teacher.functions";

export function TeacherApprovalsPanel() {
  const listFn = useServerFn(listTeacherApplications);
  const approveFn = useServerFn(approveTeacherApplication);
  const rejectFn = useServerFn(rejectTeacherApplication);
  const cache = useQueryClient();

  const [search, setSearch] = useState("");
  const [selectedToReject, setSelectedToReject] = useState<{ id: string; name: string } | null>(null);

  const query = useQuery({
    queryKey: ["teacher-applications"],
    queryFn: () => listFn(),
  });

  const approveMutation = useMutation({
    mutationFn: (userId: string) => approveFn({ data: { userId } }),
    onSuccess: (res) => {
      toast.success(res.message);
      void cache.invalidateQueries({ queryKey: ["teacher-applications"] });
      void cache.invalidateQueries({ queryKey: ["users"] });
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const rejectMutation = useMutation({
    mutationFn: (userId: string) => rejectFn({ data: { userId } }),
    onSuccess: (res) => {
      toast.info(res.message);
      setSelectedToReject(null);
      void cache.invalidateQueries({ queryKey: ["teacher-applications"] });
      void cache.invalidateQueries({ queryKey: ["users"] });
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const teachers = (query.data || []).filter((t) => {
    const term = search.toLowerCase().trim();
    if (!term) return true;
    return (
      t.fullName.toLowerCase().includes(term) ||
      t.email.toLowerCase().includes(term) ||
      t.school.toLowerCase().includes(term)
    );
  });

  const pendingCount = (query.data || []).filter((t) => t.status === "pending").length;
  const approvedCount = (query.data || []).filter((t) => t.status === "approved").length;

  return (
    <div className="space-y-6">
      {/* Header Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="panel border border-border p-4 rounded-xl bg-card">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Pending Approvals
            </span>
            <span className="flex size-8 items-center justify-center rounded-lg bg-amber-500/10 text-amber-600">
              <Clock className="size-4" />
            </span>
          </div>
          <p className="mt-2 text-2xl font-bold text-amber-600 dark:text-amber-400">
            {pendingCount}
          </p>
          <p className="text-xs text-muted-foreground mt-0.5">
            Require admin verification to grant staff privileges
          </p>
        </div>

        <div className="panel border border-border p-4 rounded-xl bg-card">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Active Educators
            </span>
            <span className="flex size-8 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-600">
              <ShieldCheck className="size-4" />
            </span>
          </div>
          <p className="mt-2 text-2xl font-bold text-emerald-600 dark:text-emerald-400">
            {approvedCount}
          </p>
          <p className="text-xs text-muted-foreground mt-0.5">
            Verified teachers with Knowledge, Calibration &amp; Classrooms access
          </p>
        </div>

        <div className="panel border border-border p-4 rounded-xl bg-card">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Verification Policy
            </span>
            <span className="flex size-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <School className="size-4" />
            </span>
          </div>
          <p className="mt-2 text-sm font-semibold">
            Institutional Verification
          </p>
          <p className="text-xs text-muted-foreground mt-0.5">
            Verify official school domain before approving
          </p>
        </div>
      </div>

      {/* Search & Actions Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
          <Input
            placeholder="Search teachers by name, school email, or institution…"
            className="pl-9 text-sm"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => void query.refetch()}
          disabled={query.isFetching}
          className="gap-2"
        >
          <RefreshCw className={`size-3.5 ${query.isFetching ? "animate-spin" : ""}`} />
          Refresh List
        </Button>
      </div>

      {/* Teachers Table */}
      <div className="panel border border-border rounded-xl overflow-hidden bg-card">
        {query.isLoading ? (
          <div className="py-12 text-center text-sm text-muted-foreground">
            Loading teacher applications…
          </div>
        ) : teachers.length === 0 ? (
          <div className="py-12 text-center text-sm text-muted-foreground">
            {search ? "No teacher accounts match your search." : "No teacher registrations recorded yet."}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-border bg-muted/40 font-semibold text-muted-foreground">
                  <th className="py-3 px-4">Teacher &amp; Institution</th>
                  <th className="py-3 px-4">Institutional Email</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Registered Date</th>
                  <th className="py-3 px-4 text-right">Verification Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {teachers.map((t) => (
                  <tr key={t.id} className="hover:bg-muted/30 transition-colors">
                    <td className="py-3 px-4">
                      <div className="font-semibold text-foreground text-sm">{t.fullName}</div>
                      <div className="text-muted-foreground flex items-center gap-1.5 mt-0.5">
                        <School className="size-3 text-primary" />
                        {t.school}
                      </div>
                    </td>
                    <td className="py-3 px-4 font-mono text-[11px] text-foreground">
                      {t.email}
                    </td>
                    <td className="py-3 px-4">
                      {t.status === "approved" ? (
                        <Badge variant="outline" className="bg-emerald-500/10 text-emerald-600 border-emerald-500/30 gap-1">
                          <Check className="size-3" /> Approved Staff
                        </Badge>
                      ) : t.status === "pending" ? (
                        <Badge variant="outline" className="bg-amber-500/10 text-amber-600 border-amber-500/30 gap-1">
                          <Clock className="size-3" /> Pending Review
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="bg-destructive/10 text-destructive border-destructive/30 gap-1">
                          <X className="size-3" /> Rejected
                        </Badge>
                      )}
                    </td>
                    <td className="py-3 px-4 text-muted-foreground">
                      {new Date(t.createdAt).toLocaleDateString("en-GB", {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                      })}
                    </td>
                    <td className="py-3 px-4 text-right space-x-2">
                      {t.status !== "approved" && (
                        <Button
                          size="sm"
                          className="bg-emerald-600 hover:bg-emerald-500 text-white font-medium h-8 px-3"
                          disabled={approveMutation.isPending}
                          onClick={() => approveMutation.mutate(t.id)}
                        >
                          <Check className="size-3.5 mr-1" />
                          Approve Staff Access
                        </Button>
                      )}
                      {t.status === "approved" && (
                        <Button
                          size="sm"
                          variant="outline"
                          className="text-xs text-muted-foreground h-8"
                          disabled
                        >
                          <ShieldCheck className="size-3.5 mr-1 text-emerald-600" />
                          Verified
                        </Button>
                      )}
                      {t.status !== "rejected" && (
                        <Button
                          size="sm"
                          variant="ghost"
                          className="text-destructive hover:bg-destructive/10 h-8 px-2"
                          onClick={() => setSelectedToReject({ id: t.id, name: t.fullName })}
                        >
                          Reject
                        </Button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Reject Confirmation Dialog */}
      <AlertDialog open={!!selectedToReject} onOpenChange={() => setSelectedToReject(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Reject Teacher Application?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to reject the application for <strong>{selectedToReject?.name}</strong>?
              They will not be granted access to the Teacher Workspace.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => {
                if (selectedToReject) rejectMutation.mutate(selectedToReject.id);
              }}
            >
              Reject Application
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
