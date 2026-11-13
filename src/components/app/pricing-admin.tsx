import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import {
  Coins,
  Check,
  CheckCircle2,
  Clock,
  Copy,
  ExternalLink,
  Layers,
  Loader2,
  Plus,
  RefreshCw,
  Search,
  ShieldCheck,
  Sparkles,
  Tag,
  Trash2,
  XCircle,
  AlertTriangle,
  QrCode,
  CreditCard,
  Crown,
} from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { DEFAULT_PRICING_PLANS } from "@/lib/pricing-plans";
import {
  getPlatformPricing,
  updatePlatformPricing,
  adminManageUserCredits,
} from "@/lib/pricing.functions";
import {
  listUpiPaymentRequests,
  approveUpiPaymentRequest,
  rejectUpiPaymentRequest,
  revokeUpiPaymentRequest,
  updateMerchantUpiConfig,
  getPaymentConfig,
} from "@/lib/payment.functions";
import { cn } from "@/lib/utils";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export function PricingAdminPanel() {
  const queryClient = useQueryClient();
  const getPricingFn = useServerFn(getPlatformPricing);
  const updatePricingFn = useServerFn(updatePlatformPricing);
  const manageUserCreditsFn = useServerFn(adminManageUserCredits);

  const pricingQuery = useQuery({
    queryKey: ["platform-pricing"],
    queryFn: () => getPricingFn(),
    staleTime: 30_000,
  });

  const activePlans = pricingQuery.data?.plans ?? DEFAULT_PRICING_PLANS;

  // Local state for tier editing
  const [tierForms, setTierForms] = useState<
    Record<
      string,
      {
        monthlyPrice: number;
        annualPrice: number;
        essaysPerMonth: number;
        liveCredits: number;
        hasExperimentalLabs: boolean;
      }
    >
  >({});

  const getTierState = (tier: "foundation" | "scholar_plus" | "pro" | "mastery" | "elite") => {
    if (tierForms[tier]) return tierForms[tier];
    const plan = activePlans[tier];
    return {
      monthlyPrice: plan.monthlyPrice,
      annualPrice: plan.annualPrice,
      essaysPerMonth: plan.essaysPerMonth,
      liveCredits: plan.liveCredits,
      hasExperimentalLabs: plan.hasExperimentalLabs ?? (tier === "mastery" || tier === "elite"),
    };
  };

  const updateTierMutation = useMutation({
    mutationFn: (data: {
      tier: "foundation" | "scholar_plus" | "pro" | "mastery" | "elite";
      monthlyPrice: number;
      annualPrice: number;
      essaysPerMonth: number;
      liveCredits: number;
      hasExperimentalLabs: boolean;
    }) => updatePricingFn({ data }),
    onSuccess: (res: any) => {
      toast.success(res?.message || "Plan pricing updated successfully!");
      queryClient.invalidateQueries({ queryKey: ["platform-pricing"] });
    },
    onError: (err: any) => toast.error(err?.message || "Failed to update pricing."),
  });

  // User Credit Manager State
  const [targetUserId, setTargetUserId] = useState("");
  const [selectedUserTier, setSelectedUserTier] = useState<string>("pro");
  const [bonusLiveCredits, setBonusLiveCredits] = useState<number>(0);
  const [bonusEssays, setBonusEssays] = useState<number>(0);
  const [resetUsage, setResetUsage] = useState<boolean>(false);

  const manageCreditsMutation = useMutation({
    mutationFn: (data: {
      userId: string;
      tier?: any;
      bonusLiveCredits?: number;
      bonusEssays?: number;
      resetUsageCount?: boolean;
    }) => manageUserCreditsFn({ data }),
    onSuccess: (res: any) => {
      toast.success(res?.message || "User subscription and credits updated!");
      queryClient.invalidateQueries({ queryKey: ["admin-overview"] });
      setBonusLiveCredits(0);
      setBonusEssays(0);
      setResetUsage(false);
    },
    onError: (err: any) => toast.error(err?.message || "Failed to update user credits."),
  });

  const tiers: ("foundation" | "scholar_plus" | "pro" | "mastery" | "elite")[] = [
    "foundation",
    "scholar_plus",
    "pro",
    "mastery",
    "elite",
  ];

  return (
    <div className="space-y-8">
      {/* Superadmin Status Notice */}
      <div className="rounded-2xl border border-primary/20 bg-primary/[0.04] p-5 shadow-xs">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <Crown className="size-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-foreground">
                Administrator Root: Marginal Admin
              </h3>
              <p className="text-xs text-muted-foreground mt-0.5">
                Admin account operates with <strong>Uncapped Godmode</strong>. Zero credit counters, no daily essay caps, and unrestricted bypass across all candidate features and experimental labs.
              </p>
            </div>
          </div>
          <Badge className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20 text-xs font-mono">
            Uncapped · 0 Limits
          </Badge>
        </div>
      </div>

      {/* Dynamic Tier Pricing Editor */}
      <div className="rounded-2xl border border-border bg-card p-5 sm:p-6 shadow-xs space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-border/80 pb-4">
          <div>
            <h2 className="text-base font-semibold text-foreground flex items-center gap-2">
              <Coins className="size-4 text-primary" />
              Dynamic Platform Pricing &amp; Tier Editor
            </h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              Edit live student prices, annual discounts, monthly essay quotas, and Live Examiner credit allocations. Changes instantly reflect across{" "}
              <code className="text-primary font-mono text-[11px]">/pricing</code> and{" "}
              <code className="text-primary font-mono text-[11px]">/payment</code>.
            </p>
          </div>
          {pricingQuery.data?.isCustom ? (
            <Badge variant="outline" className="text-xs border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
              Custom DB Values Active
            </Badge>
          ) : (
            <Badge variant="outline" className="text-xs border-muted-foreground/30 text-muted-foreground">
              Default Config Active
            </Badge>
          )}
        </div>

        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {tiers.map((tierKey) => {
            const plan = activePlans[tierKey];
            const current = getTierState(tierKey);

            return (
              <div
                key={tierKey}
                className="flex flex-col justify-between rounded-xl border border-border/80 bg-background/50 p-4 space-y-4 shadow-2xs"
              >
                <div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold uppercase tracking-wider text-primary">
                      {tierKey}
                    </span>
                    {current.hasExperimentalLabs && (
                      <Badge className="text-[9px] bg-amber-500/10 text-amber-500 border border-amber-500/30">
                        Labs Access
                      </Badge>
                    )}
                  </div>
                  <h4 className="text-sm font-bold text-foreground mt-1">{plan.name}</h4>
                  <p className="text-[11px] text-muted-foreground line-clamp-2 mt-0.5">
                    {plan.tagline}
                  </p>
                </div>

                <div className="space-y-3 border-t border-border/60 pt-3 text-xs">
                  <div>
                    <Label className="text-[11px] text-muted-foreground">Monthly Price (₹)</Label>
                    <Input
                      type="number"
                      value={current.monthlyPrice}
                      onChange={(e) =>
                        setTierForms((prev) => ({
                          ...prev,
                          [tierKey]: { ...current, monthlyPrice: Number(e.target.value) },
                        }))
                      }
                      className="h-8 text-xs font-semibold tabular-nums mt-1"
                    />
                  </div>

                  <div>
                    <Label className="text-[11px] text-muted-foreground">Annual Price (₹)</Label>
                    <Input
                      type="number"
                      value={current.annualPrice}
                      onChange={(e) =>
                        setTierForms((prev) => ({
                          ...prev,
                          [tierKey]: { ...current, annualPrice: Number(e.target.value) },
                        }))
                      }
                      className="h-8 text-xs font-semibold tabular-nums mt-1"
                    />
                  </div>

                  <div>
                    <Label className="text-[11px] text-muted-foreground">Monthly Essays Quota</Label>
                    <Input
                      type="number"
                      value={current.essaysPerMonth}
                      onChange={(e) =>
                        setTierForms((prev) => ({
                          ...prev,
                          [tierKey]: { ...current, essaysPerMonth: Number(e.target.value) },
                        }))
                      }
                      className="h-8 text-xs font-semibold tabular-nums mt-1"
                    />
                  </div>

                  <div>
                    <Label className="text-[11px] text-muted-foreground">Live Examiner Credits</Label>
                    <Input
                      type="number"
                      value={current.liveCredits}
                      onChange={(e) =>
                        setTierForms((prev) => ({
                          ...prev,
                          [tierKey]: { ...current, liveCredits: Number(e.target.value) },
                        }))
                      }
                      className="h-8 text-xs font-semibold tabular-nums mt-1"
                    />
                  </div>

                  <div className="flex items-center justify-between pt-1">
                    <span className="text-[11px] font-medium text-muted-foreground">
                      Experimental Labs
                    </span>
                    <Switch
                      checked={current.hasExperimentalLabs}
                      onCheckedChange={(val) =>
                        setTierForms((prev) => ({
                          ...prev,
                          [tierKey]: { ...current, hasExperimentalLabs: val },
                        }))
                      }
                    />
                  </div>
                </div>

                <Button
                  size="sm"
                  className="w-full text-xs font-medium h-8 cursor-pointer"
                  disabled={updateTierMutation.isPending}
                  onClick={() =>
                    updateTierMutation.mutate({
                      tier: tierKey,
                      ...current,
                    })
                  }
                >
                  {updateTierMutation.isPending ? (
                    <Loader2 className="size-3 animate-spin mr-1" />
                  ) : null}
                  Save {plan.name}
                </Button>
              </div>
            );
          })}
        </div>
      </div>

      {/* User Credit & Subscription Granting Console */}
      <div className="rounded-2xl border border-border bg-card p-5 sm:p-6 shadow-xs space-y-5">
        <div>
          <h2 className="text-base font-semibold text-foreground flex items-center gap-2">
            <Coins className="size-4 text-emerald-500" />
            Manage User Credits, Quotas &amp; Tier Assignment
          </h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            Target any user by UUID to promote their tier, inject bonus Live Examiner credits, grant extra essays, or reset their usage counter.
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="sm:col-span-2 space-y-1.5">
            <Label className="text-xs">User ID (UUID)</Label>
            <Input
              placeholder="e.g. 550e8400-e29b-41d4-a716-446655440000"
              value={targetUserId}
              onChange={(e) => setTargetUserId(e.target.value)}
              className="font-mono text-xs"
            />
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs">Assign Active Tier</Label>
            <Select value={selectedUserTier} onValueChange={setSelectedUserTier}>
              <SelectTrigger className="text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="free">Free Starter (2 essays)</SelectItem>
                <SelectItem value="foundation">Foundation Scholar</SelectItem>
                <SelectItem value="scholar_plus">Scholar Plus</SelectItem>
                <SelectItem value="pro">Pro Accelerator</SelectItem>
                <SelectItem value="mastery">A* Mastery Sprint</SelectItem>
                <SelectItem value="elite">Cambridge Elite Pass</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs">Bonus Live Credits</Label>
            <Input
              type="number"
              placeholder="+10"
              value={bonusLiveCredits || ""}
              onChange={(e) => setBonusLiveCredits(Number(e.target.value))}
              className="text-xs"
            />
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs">Bonus Graded Essays</Label>
            <Input
              type="number"
              placeholder="+5"
              value={bonusEssays || ""}
              onChange={(e) => setBonusEssays(Number(e.target.value))}
              className="text-xs"
            />
          </div>

          <div className="flex items-center gap-2 pt-6">
            <Switch checked={resetUsage} onCheckedChange={setResetUsage} id="reset-usage-switch" />
            <Label htmlFor="reset-usage-switch" className="text-xs cursor-pointer">
              Reset Essay Counter to 0
            </Label>
          </div>

          <div className="sm:col-span-2 flex items-end">
            <Button
              className="w-full text-xs font-semibold h-9 cursor-pointer"
              disabled={!targetUserId.trim() || manageCreditsMutation.isPending}
              onClick={() =>
                manageCreditsMutation.mutate({
                  userId: targetUserId.trim(),
                  tier: selectedUserTier as any,
                  bonusLiveCredits,
                  bonusEssays,
                  resetUsageCount: resetUsage,
                })
              }
            >
              {manageCreditsMutation.isPending ? (
                <Loader2 className="size-3.5 animate-spin mr-1.5" />
              ) : (
                <CheckCircle2 className="size-3.5 mr-1.5 text-emerald-400" />
              )}
              Apply User Quota &amp; Tier
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

export function PaymentApprovalsAdminPanel() {
  const queryClient = useQueryClient();
  const listRequestsFn = useServerFn(listUpiPaymentRequests);
  const approveRequestFn = useServerFn(approveUpiPaymentRequest);
  const rejectRequestFn = useServerFn(rejectUpiPaymentRequest);
  const revokeRequestFn = useServerFn(revokeUpiPaymentRequest);
  const updateUpiFn = useServerFn(updateMerchantUpiConfig);
  const getPricingConfigFn = useServerFn(getPaymentConfig);

  const paymentsQuery = useQuery({
    queryKey: ["admin-upi-payments"],
    queryFn: () => listRequestsFn(),
    refetchInterval: 12_000,
  });

  const configQuery = useQuery({
    queryKey: ["payment-config"],
    queryFn: () => getPricingConfigFn(),
    staleTime: 0,
    refetchOnMount: "always",
  });

  const [upiInput, setUpiInput] = useState("");
  const [copiedUtr, setCopiedUtr] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<"all" | "pending" | "approved" | "rejected">("pending");
  const [searchQuery, setSearchQuery] = useState("");

  const requests: any[] = paymentsQuery.data?.requests || [];
  const activeMerchantUpi = configQuery.data?.merchantUpiId || "8754256082-2@ybl";

  const updateUpiMutation = useMutation({
    mutationFn: (data: { upiId: string }) => updateUpiFn({ data }),
    onSuccess: async (res: any) => {
      toast.success(res?.message || "Merchant UPI updated!");
      await queryClient.invalidateQueries({ queryKey: ["payment-config"] });
      configQuery.refetch();
      setUpiInput("");
    },
    onError: (err: any) => toast.error(err?.message || "Failed to update UPI ID."),
  });

  const approveMutation = useMutation({
    mutationFn: (data: { logId: string; userId: string; tier: any }) => approveRequestFn({ data }),
    onSuccess: (res: any) => {
      toast.success(res?.message || "Payment verified and approved!");
      queryClient.invalidateQueries({ queryKey: ["admin-upi-payments"] });
      queryClient.invalidateQueries({ queryKey: ["admin-overview"] });
    },
    onError: (err: any) => toast.error(err?.message || "Approval failed."),
  });

  const rejectMutation = useMutation({
    mutationFn: (data: { logId: string; userId: string; reason?: string }) => rejectRequestFn({ data }),
    onSuccess: (res: any) => {
      toast.success(res?.message || "Payment request rejected.");
      queryClient.invalidateQueries({ queryKey: ["admin-upi-payments"] });
    },
    onError: (err: any) => toast.error(err?.message || "Rejection failed."),
  });

  const revokeMutation = useMutation({
    mutationFn: (data: { logId: string; userId: string; reason?: string }) => revokeRequestFn({ data }),
    onSuccess: (res: any) => {
      toast.success(res?.message || "Subscription access revoked.");
      queryClient.invalidateQueries({ queryKey: ["admin-upi-payments"] });
      queryClient.invalidateQueries({ queryKey: ["admin-overview"] });
    },
    onError: (err: any) => toast.error(err?.message || "Revocation failed."),
  });

  const copyUtr = (utr: string) => {
    if (typeof navigator !== "undefined" && navigator.clipboard) {
      navigator.clipboard.writeText(utr);
      setCopiedUtr(utr);
      toast.success(`UTR #${utr} copied!`);
      setTimeout(() => setCopiedUtr(null), 2000);
    }
  };

  const pendingCount = requests.filter((r) => r.status === "pending").length;
  const approvedCount = requests.filter((r) => r.status === "approved").length;
  const rejectedCount = requests.filter((r) => r.status === "rejected").length;

  const filteredRequests = requests.filter((r) => {
    if (statusFilter !== "all" && r.status !== statusFilter) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return (
        r.utr.toLowerCase().includes(q) ||
        r.userEmail.toLowerCase().includes(q) ||
        r.tier.toLowerCase().includes(q)
      );
    }
    return true;
  });

  return (
    <div className="space-y-6">
      {/* ── Section 1: Merchant UPI Settings ── */}
      <div className="rounded-2xl border border-border bg-card p-5 sm:p-6 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h2 className="text-base font-bold flex items-center gap-2">
              <Coins className="size-4 text-emerald-500" />
              Direct UPI Merchant Configuration
            </h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              Set the bank UPI ID where student payments will be sent via QR code or direct UPI apps.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">Active UPI ID:</span>
            <code className="text-xs font-mono font-bold bg-muted px-2.5 py-1 rounded-md text-foreground border border-border">
              {activeMerchantUpi}
            </code>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row items-center gap-3 pt-2 border-t border-border/60">
          <Input
            placeholder="Enter your real UPI ID (e.g. yourname@okhdfcbank or 9876543210@paytm)"
            value={upiInput}
            onChange={(e) => setUpiInput(e.target.value)}
            className="text-xs font-mono bg-background h-9 flex-1"
          />
          <Button
            size="sm"
            disabled={!upiInput.trim() || updateUpiMutation.isPending}
            onClick={() => updateUpiMutation.mutate({ upiId: upiInput.trim() })}
            className="w-full sm:w-auto text-xs font-semibold h-9 shrink-0 gap-1.5 cursor-pointer"
          >
            {updateUpiMutation.isPending ? (
              <Loader2 className="size-3.5 animate-spin" />
            ) : (
              <CheckCircle2 className="size-3.5" />
            )}
            Save Active UPI ID
          </Button>
        </div>
      </div>

      {/* ── Section 2: Metrics Strip ── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="rounded-xl border border-border bg-card p-4 shadow-xs">
          <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
            Total Submissions
          </p>
          <p className="text-2xl font-bold mt-1 text-foreground">{requests.length}</p>
        </div>
        <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-4 shadow-xs">
          <p className="text-[11px] font-semibold text-amber-700 dark:text-amber-300 uppercase tracking-wider flex items-center gap-1.5">
            <Clock className="size-3.5 text-amber-500 animate-pulse" />
            Pending Verification
          </p>
          <p className="text-2xl font-bold mt-1 text-amber-900 dark:text-amber-200">{pendingCount}</p>
        </div>
        <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-4 shadow-xs">
          <p className="text-[11px] font-semibold text-emerald-700 dark:text-emerald-300 uppercase tracking-wider flex items-center gap-1.5">
            <CheckCircle2 className="size-3.5 text-emerald-500" />
            Approved Payments
          </p>
          <p className="text-2xl font-bold mt-1 text-emerald-900 dark:text-emerald-200">{approvedCount}</p>
        </div>
        <div className="rounded-xl border border-border bg-card p-4 shadow-xs">
          <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
            Rejected / Fraud
          </p>
          <p className="text-2xl font-bold mt-1 text-muted-foreground">{rejectedCount}</p>
        </div>
      </div>

      {/* ── Section 3: Approvals Desk Table ── */}
      <div className="rounded-2xl border border-border bg-card shadow-xs overflow-hidden">
        {/* Table Controls */}
        <div className="p-4 sm:p-5 border-b border-border flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="flex items-center gap-1.5 bg-muted/60 p-1 rounded-xl text-xs">
            <button
              type="button"
              onClick={() => setStatusFilter("pending")}
              className={cn(
                "px-3 py-1.5 rounded-lg font-semibold transition-all cursor-pointer",
                statusFilter === "pending"
                  ? "bg-amber-500 text-white shadow-xs"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              Pending ({pendingCount})
            </button>
            <button
              type="button"
              onClick={() => setStatusFilter("all")}
              className={cn(
                "px-3 py-1.5 rounded-lg font-semibold transition-all cursor-pointer",
                statusFilter === "all"
                  ? "bg-card text-foreground shadow-xs"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              All ({requests.length})
            </button>
            <button
              type="button"
              onClick={() => setStatusFilter("approved")}
              className={cn(
                "px-3 py-1.5 rounded-lg font-semibold transition-all cursor-pointer",
                statusFilter === "approved"
                  ? "bg-card text-foreground shadow-xs"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              Approved ({approvedCount})
            </button>
            <button
              type="button"
              onClick={() => setStatusFilter("rejected")}
              className={cn(
                "px-3 py-1.5 rounded-lg font-semibold transition-all cursor-pointer",
                statusFilter === "rejected"
                  ? "bg-card text-foreground shadow-xs"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              Rejected ({rejectedCount})
            </button>
          </div>

          <div className="flex items-center gap-2">
            <div className="relative w-full sm:w-64">
              <Search className="absolute left-2.5 top-2.5 size-3.5 text-muted-foreground" />
              <Input
                placeholder="Search UTR or student email..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="h-8 text-xs pl-8 bg-background"
              />
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => paymentsQuery.refetch()}
              className="h-8 px-2 text-xs cursor-pointer"
              title="Refresh queue"
            >
              <RefreshCw className={cn("size-3.5", paymentsQuery.isFetching && "animate-spin")} />
            </Button>
          </div>
        </div>

        {/* Requests List */}
        {filteredRequests.length === 0 ? (
          <div className="py-16 text-center text-xs text-muted-foreground space-y-2">
            <CheckCircle2 className="mx-auto size-8 text-emerald-500/60" />
            <p className="font-semibold text-foreground text-sm">
              {statusFilter === "pending"
                ? "No pending approvals in queue!"
                : "No matching payment requests found."}
            </p>
            <p className="max-w-xs mx-auto text-muted-foreground">
              {statusFilter === "pending"
                ? "All student payments have been verified against your bank statement."
                : "Incoming UPI reference submissions will appear here automatically."}
            </p>
          </div>
        ) : (
          <div className="divide-y divide-border/60">
            {filteredRequests.map((req: any) => (
              <div
                key={req.id}
                className="p-4 sm:p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 hover:bg-muted/30 transition-colors"
              >
                {/* Left Info: Email & Tier */}
                <div className="space-y-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-semibold text-xs text-foreground truncate">
                      {req.userEmail}
                    </span>
                    <Badge
                      variant="outline"
                      className="font-mono text-[10px] uppercase font-bold px-2 py-0.5 border-primary/30 text-primary bg-primary/5"
                    >
                      {req.tier} · ₹{req.amount}
                    </Badge>
                    {(req as any).couponCode && (
                      <Badge variant="outline" className="bg-emerald-500/10 border-emerald-500/30 text-emerald-600 dark:text-emerald-400 text-[10px] gap-1 font-mono font-bold">
                        <Tag className="size-2.5" /> {(req as any).couponCode}
                      </Badge>
                    )}
                    {req.status === "pending" && (
                      <Badge className="bg-amber-500 text-white text-[10px] gap-1 font-semibold">
                        <Clock className="size-3 animate-pulse" /> Pending Verification
                      </Badge>
                    )}
                    {req.status === "approved" && (
                      <Badge className="bg-emerald-600 text-white text-[10px] gap-1 font-semibold">
                        <CheckCircle2 className="size-3" /> Approved
                      </Badge>
                    )}
                    {req.status === "rejected" && (
                      <Badge variant="destructive" className="text-[10px] gap-1 font-semibold">
                        <XCircle className="size-3" /> Rejected
                      </Badge>
                    )}
                  </div>

                  <div className="flex items-center gap-3 text-[11px] text-muted-foreground flex-wrap">
                    <span>
                      Submitted: {new Date(req.submittedAt).toLocaleDateString()} at{" "}
                      {new Date(req.submittedAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                    </span>
                    {req.reviewedAt && (
                      <span className="text-[10px] text-muted-foreground/80">
                        (Reviewed {new Date(req.reviewedAt).toLocaleDateString()})
                      </span>
                    )}
                  </div>
                </div>

                {/* Center: 12-Digit UTR with 1-Click Copy */}
                <div className="flex items-center gap-2 bg-muted/60 px-3 py-1.5 rounded-lg border border-border/80 shrink-0">
                  <div className="space-y-0.5">
                    <p className="text-[9.5px] uppercase font-bold text-muted-foreground tracking-wider">
                      Bank Ref (UTR)
                    </p>
                    <code className="text-xs font-mono font-bold text-foreground">
                      {req.utr}
                    </code>
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => copyUtr(req.utr)}
                    className="h-7 px-2 text-[11px] gap-1 cursor-pointer"
                    title="Copy UTR to check bank SMS or GPay app"
                  >
                    {copiedUtr === req.utr ? (
                      <Check className="size-3 text-emerald-500" />
                    ) : (
                      <Copy className="size-3" />
                    )}
                    {copiedUtr === req.utr ? "Copied" : "Copy"}
                  </Button>
                </div>

                {/* Right: Actions */}
                <div className="flex items-center gap-2 shrink-0">
                  {req.status === "pending" && (
                    <>
                      <Button
                        size="sm"
                        disabled={approveMutation.isPending || rejectMutation.isPending}
                        onClick={() =>
                          approveMutation.mutate({
                            logId: req.id,
                            userId: req.userId,
                            tier: req.tier,
                          })
                        }
                        className="h-8 text-xs font-semibold gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white cursor-pointer"
                      >
                        <CheckCircle2 className="size-3.5" />
                        Approve &amp; Upgrade
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={approveMutation.isPending || rejectMutation.isPending}
                        onClick={() => {
                          if (window.confirm(`Reject payment submission for ${req.userEmail} with UTR #${req.utr}?`)) {
                            rejectMutation.mutate({
                              logId: req.id,
                              userId: req.userId,
                              reason: "UTR not found in bank credits",
                            });
                          }
                        }}
                        className="h-8 text-xs font-semibold gap-1 text-destructive hover:bg-destructive/10 cursor-pointer"
                      >
                        <XCircle className="size-3.5" />
                        Reject
                      </Button>
                    </>
                  )}

                  {req.status === "approved" && (
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={revokeMutation.isPending}
                      onClick={() => {
                        if (window.confirm(`Revoke subscription for ${req.userEmail} and reset to Free?`)) {
                          revokeMutation.mutate({
                            logId: req.id,
                            userId: req.userId,
                            reason: "Admin manual revocation",
                          });
                        }
                      }}
                      className="h-7 text-[11px] font-semibold text-muted-foreground hover:text-destructive cursor-pointer"
                    >
                      Revoke Access
                    </Button>
                  )}

                  {req.status === "rejected" && (
                    <span className="text-[11px] text-muted-foreground italic">
                      Rejected ({req.rejectionReason || "Invalid UTR"})
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

