import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import {
  AlertTriangle,
  Check,
  CheckCircle2,
  Clock,
  Copy,
  Edit3,
  Loader2,
  Percent,
  Plus,
  PowerOff,
  RefreshCw,
  Search,
  Sparkles,
  Tag,
  Trash2,
  TrendingUp,
  XCircle,
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

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
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  cancelAllCoupons,
  createCouponCode,
  deleteCouponCode,
  listAllCoupons,
  updateCouponCode,
  type CouponAudience,
  type CouponRecord,
  type CouponType,
  PLAN_DISPLAY_NAMES,
} from "@/lib/coupon.functions";
import { TIER_LIMITS, type PlanTier } from "@/lib/usage-limits";
import { cn } from "@/lib/utils";

const AUDIENCE_OPTIONS: { id: CouponAudience; shortLabel: string; label: string; icon: string; description: string }[] = [
  { id: "all", shortLabel: "All Audiences", label: "All Audiences (Universal)", icon: "🌐", description: "Universal coupon code valid across any Student, Teacher, or School checkout." },
  { id: "students", shortLabel: "Students", label: "Students Only", icon: "🎒", description: "Valid only for Student Revision Plans (Foundation, Scholar Plus, Pro, Mastery, Elite)." },
  { id: "teachers", shortLabel: "Teachers", label: "Teachers & Educators Only", icon: "🎓", description: "Valid only for Teacher & Educator passes (Individual Pass, Senior Educator, Department Lead)." },
  { id: "schools", shortLabel: "Schools", label: "School Licensing Only", icon: "🏫", description: "Valid only for School Department Licenses (Department Starter 50, Campus Standard 150, Institution Premium 400)." },
];

const PLAN_PRESETS = [
  {
    group: "Student Revision Plans",
    plans: [
      { id: "foundation", label: "Foundation Scholar" },
      { id: "scholar_plus", label: "Scholar Plus" },
      { id: "pro", label: "Pro Accelerator" },
      { id: "mastery", label: "A* Mastery Sprint" },
      { id: "elite", label: "Cambridge Elite Pass" },
    ],
  },
  {
    group: "Teacher & Educator Passes",
    plans: [
      { id: "foundation", label: "Individual Educator AI Pass" },
      { id: "scholar_plus", label: "Senior Educator Pass" },
      { id: "pro", label: "Department Lead Pass" },
    ],
  },
  {
    group: "School Department Licensing",
    plans: [
      { id: "school_starter", label: "Department Starter (50 seats)" },
      { id: "school_campus", label: "Campus Standard (150 seats)" },
      { id: "school_institution", label: "Institution Premium (400 seats)" },
    ],
  },
];

export function CouponsAdminPanel() {
  const queryClient = useQueryClient();
  const listCouponsFn = useServerFn(listAllCoupons);
  const createCouponFn = useServerFn(createCouponCode);
  const updateCouponFn = useServerFn(updateCouponCode);
  const deleteCouponFn = useServerFn(deleteCouponCode);
  const cancelAllFn = useServerFn(cancelAllCoupons);

  const couponsQuery = useQuery({
    queryKey: ["admin-coupons"],
    queryFn: () => listCouponsFn(),
  });

  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<"all" | "active" | "inactive" | "expired" | "students" | "teachers" | "schools">("all");
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  // Dialog states
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingCoupon, setEditingCoupon] = useState<CouponRecord | null>(null);
  const [deletingCoupon, setDeletingCoupon] = useState<CouponRecord | null>(null);
  const [isCancelAllOpen, setIsCancelAllOpen] = useState(false);

  // Form states
  const [formCode, setFormCode] = useState("");
  const [formType, setFormType] = useState<CouponType>("percentage");
  const [formValue, setFormValue] = useState<number>(20);
  const [formAudience, setFormAudience] = useState<CouponAudience>("all");
  const [formMaxUses, setFormMaxUses] = useState<string>("");
  const [formExpiresAt, setFormExpiresAt] = useState<string>("");
  const [formMinAmount, setFormMinAmount] = useState<string>("");
  const [formDescription, setFormDescription] = useState<string>("");
  const [formActive, setFormActive] = useState<boolean>(true);
  const [formTiers, setFormTiers] = useState<string[]>([]);

  const resetForm = () => {
    setFormCode("");
    setFormType("percentage");
    setFormValue(20);
    setFormAudience("all");
    setFormMaxUses("");
    setFormExpiresAt("");
    setFormMinAmount("");
    setFormDescription("");
    setFormActive(true);
    setFormTiers([]);
  };

  const openCreateDialog = () => {
    resetForm();
    setIsCreateOpen(true);
  };

  const openEditDialog = (coupon: CouponRecord) => {
    setEditingCoupon(coupon);
    setFormCode(coupon.code);
    setFormType(coupon.type);
    setFormValue(coupon.value);
    setFormAudience(coupon.targetAudience || "all");
    setFormMaxUses(coupon.maxUses ? String(coupon.maxUses) : "");
    setFormExpiresAt(coupon.expiresAt ? coupon.expiresAt.split("T")[0] : "");
    setFormMinAmount(coupon.minAmount ? String(coupon.minAmount) : "");
    setFormDescription(coupon.description || "");
    setFormActive(coupon.active);
    setFormTiers(coupon.applicableTiers || []);
  };

  // Mutations
  const createMutation = useMutation({
    mutationFn: (data: any) => createCouponFn({ data }),
    onSuccess: (res: any) => {
      toast.success(res?.message || "Coupon created successfully!");
      queryClient.invalidateQueries({ queryKey: ["admin-coupons"] });
      setIsCreateOpen(false);
      resetForm();
    },
    onError: (err: any) => toast.error(err?.message || "Failed to create coupon."),
  });

  const updateMutation = useMutation({
    mutationFn: (data: any) => updateCouponFn({ data }),
    onSuccess: (res: any) => {
      toast.success(res?.message || "Coupon updated successfully!");
      queryClient.invalidateQueries({ queryKey: ["admin-coupons"] });
      setEditingCoupon(null);
    },
    onError: (err: any) => toast.error(err?.message || "Failed to update coupon."),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteCouponFn({ data: { id } }),
    onSuccess: () => {
      toast.success("Coupon code deleted.");
      queryClient.invalidateQueries({ queryKey: ["admin-coupons"] });
      setDeletingCoupon(null);
    },
    onError: (err: any) => toast.error(err?.message || "Failed to delete coupon."),
  });

  const cancelAllMutation = useMutation({
    mutationFn: () => cancelAllFn(),
    onSuccess: (res: any) => {
      toast.success(res?.message || "All coupons deactivated.");
      queryClient.invalidateQueries({ queryKey: ["admin-coupons"] });
      setIsCancelAllOpen(false);
    },
    onError: (err: any) => toast.error(err?.message || "Failed to deactivate coupons."),
  });

  const handleCopy = (code: string) => {
    if (typeof navigator !== "undefined" && navigator.clipboard) {
      navigator.clipboard.writeText(code);
      setCopiedCode(code);
      toast.success(`Coupon "${code}" copied to clipboard!`);
      setTimeout(() => setCopiedCode(null), 2000);
    }
  };

  const handleToggleActive = (coupon: CouponRecord) => {
    updateMutation.mutate({
      id: coupon.id,
      active: !coupon.active,
    });
  };

  const handleSaveCreate = () => {
    if (!formCode.trim()) {
      toast.error("Please enter a coupon code.");
      return;
    }
    if (formValue <= 0) {
      toast.error("Discount value must be greater than 0.");
      return;
    }
    if (formType === "percentage" && formValue > 100) {
      toast.error("Percentage cannot exceed 100%.");
      return;
    }

    createMutation.mutate({
      code: formCode.trim().toUpperCase(),
      type: formType,
      value: Number(formValue),
      targetAudience: formAudience,
      maxUses: formMaxUses ? parseInt(formMaxUses, 10) : null,
      expiresAt: formExpiresAt ? new Date(formExpiresAt).toISOString() : null,
      minAmount: formMinAmount ? parseInt(formMinAmount, 10) : null,
      description: formDescription.trim() || undefined,
      active: formActive,
      applicableTiers: formTiers.length > 0 ? formTiers : null,
    });
  };

  const handleSaveEdit = () => {
    if (!editingCoupon) return;
    if (formValue <= 0) {
      toast.error("Discount value must be greater than 0.");
      return;
    }
    if (formType === "percentage" && formValue > 100) {
      toast.error("Percentage cannot exceed 100%.");
      return;
    }

    updateMutation.mutate({
      id: editingCoupon.id,
      type: formType,
      value: Number(formValue),
      targetAudience: formAudience,
      maxUses: formMaxUses ? parseInt(formMaxUses, 10) : null,
      expiresAt: formExpiresAt ? new Date(formExpiresAt).toISOString() : null,
      minAmount: formMinAmount ? parseInt(formMinAmount, 10) : null,
      description: formDescription.trim() || undefined,
      active: formActive,
      applicableTiers: formTiers.length > 0 ? formTiers : null,
    });
  };

  const coupons = couponsQuery.data?.coupons || [];

  // Filtered list
  const filteredCoupons = coupons.filter((c) => {
    const isExpired = c.expiresAt ? new Date(c.expiresAt).getTime() < Date.now() : false;

    if (filter === "active" && (!c.active || isExpired)) return false;
    if (filter === "inactive" && c.active) return false;
    if (filter === "expired" && !isExpired) return false;
    if (filter === "students" && c.targetAudience && c.targetAudience !== "students" && c.targetAudience !== "all") return false;
    if (filter === "teachers" && c.targetAudience !== "teachers" && c.targetAudience !== "all") return false;
    if (filter === "schools" && c.targetAudience !== "schools" && c.targetAudience !== "all") return false;

    if (search.trim()) {
      const q = search.toLowerCase().trim();
      const matchCode = c.code.toLowerCase().includes(q);
      const matchDesc = c.description?.toLowerCase().includes(q) ?? false;
      return matchCode || matchDesc;
    }

    return true;
  });

  // Aggregate stats
  const totalCoupons = coupons.length;
  const activeCoupons = coupons.filter(
    (c) => c.active && (!c.expiresAt || new Date(c.expiresAt).getTime() >= Date.now()),
  ).length;
  const totalRedemptions = coupons.reduce((acc, c) => acc + (c.usedCount || 0), 0);

  return (
    <div className="space-y-6">
      {/* Header & Main Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-border/80 pb-4">
        <div>
          <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
            <Tag className="size-5 text-primary" /> Coupon Codes &amp; Discounts
          </h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            Create, manipulate, or cancel promotional discount codes. Codes apply seamlessly across checkout at{" "}
            <code className="text-primary font-mono text-[11px]">/payment</code>.
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsCancelAllOpen(true)}
            disabled={activeCoupons === 0 || cancelAllMutation.isPending}
            className="h-8 text-xs font-semibold gap-1.5 text-destructive hover:bg-destructive/10 border-destructive/30"
            title="Emergency switch to pause all active coupon codes"
          >
            <PowerOff className="size-3.5" />
            <span>Cancel All Codes</span>
          </Button>

          <Button
            size="sm"
            onClick={openCreateDialog}
            className="h-8 text-xs font-semibold gap-1.5 shadow-sm"
          >
            <Plus className="size-3.5" />
            <span>Create Coupon</span>
          </Button>

          <Button
            variant="ghost"
            size="icon"
            onClick={() => couponsQuery.refetch()}
            disabled={couponsQuery.isFetching}
            className="size-8 text-muted-foreground hover:text-foreground"
            title="Refresh coupon list"
          >
            <RefreshCw className={cn("size-3.5", couponsQuery.isFetching && "animate-spin")} />
          </Button>
        </div>
      </div>

      {/* KPI Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="border-border/80 bg-card/60 shadow-xs">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs text-muted-foreground font-medium">Total Coupons</p>
              <p className="text-2xl font-bold text-foreground mt-0.5 tabular-nums">
                {totalCoupons}
              </p>
            </div>
            <div className="size-9 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
              <Tag className="size-4" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/80 bg-card/60 shadow-xs">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs text-muted-foreground font-medium">Active &amp; Redeemable</p>
              <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400 mt-0.5 tabular-nums">
                {activeCoupons}
              </p>
            </div>
            <div className="size-9 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
              <CheckCircle2 className="size-4" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/80 bg-card/60 shadow-xs">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs text-muted-foreground font-medium">Total Student Redemptions</p>
              <p className="text-2xl font-bold text-amber-600 dark:text-amber-400 mt-0.5 tabular-nums">
                {totalRedemptions}
              </p>
            </div>
            <div className="size-9 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center">
              <TrendingUp className="size-4" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search and Filters */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-2.5 top-2.5 size-3.5 text-muted-foreground" />
          <Input
            placeholder="Search coupon code or description..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="h-8 pl-8 text-xs"
          />
        </div>

        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
          {(
            [
              { id: "all", label: `All (${totalCoupons})` },
              { id: "active", label: "Active" },
              { id: "students", label: "🎒 Students" },
              { id: "teachers", label: "🎓 Teachers" },
              { id: "schools", label: "🏫 Schools" },
              { id: "inactive", label: "Paused" },
              { id: "expired", label: "Expired" },
            ] as const
          ).map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setFilter(tab.id as any)}
              className={cn(
                "px-2.5 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer whitespace-nowrap",
                filter === tab.id
                  ? "bg-primary text-primary-foreground shadow-xs font-bold"
                  : "bg-muted/60 text-muted-foreground hover:bg-muted hover:text-foreground",
              )}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Coupons List */}
      {couponsQuery.isLoading ? (
        <div className="flex flex-col items-center justify-center py-12 gap-3">
          <Loader2 className="size-6 text-primary animate-spin" />
          <p className="text-xs text-muted-foreground font-medium">Loading coupon records...</p>
        </div>
      ) : filteredCoupons.length === 0 ? (
        <Card className="border-dashed border-border/80">
          <CardContent className="py-12 text-center space-y-3">
            <div className="size-12 rounded-2xl bg-muted/60 text-muted-foreground mx-auto flex items-center justify-center">
              <Tag className="size-6 opacity-60" />
            </div>
            <p className="text-sm font-semibold text-foreground">No coupon codes found</p>
            <p className="text-xs text-muted-foreground max-w-sm mx-auto">
              {search || filter !== "all"
                ? "No coupons match your current search and filter criteria."
                : "You haven't created any promotional discount codes yet. Click 'Create Coupon' to generate your first code."}
            </p>
            {search || filter !== "all" ? (
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setSearch("");
                  setFilter("all");
                }}
                className="h-8 text-xs"
              >
                Reset Filters
              </Button>
            ) : (
              <Button size="sm" onClick={openCreateDialog} className="h-8 text-xs gap-1.5">
                <Plus className="size-3.5" />
                <span>Create First Coupon</span>
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredCoupons.map((coupon) => {
            const isExpired = coupon.expiresAt
              ? new Date(coupon.expiresAt).getTime() < Date.now()
              : false;
            const isCapReached =
              coupon.maxUses !== null && coupon.usedCount >= coupon.maxUses;
            const isFullyActive = coupon.active && !isExpired && !isCapReached;

            return (
              <Card
                key={coupon.id}
                className={cn(
                  "border transition-all shadow-xs flex flex-col justify-between overflow-hidden",
                  isFullyActive
                    ? "border-border/80 bg-card hover:border-primary/40"
                    : "border-border/50 bg-muted/20 opacity-80",
                )}
              >
                <div className="p-4 space-y-3">
                  {/* Top row: Code + Status Badge + Active Switch */}
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5 min-w-0">
                      <span className="font-mono text-sm font-black tracking-wider text-foreground px-2 py-0.5 rounded-md bg-primary/10 border border-primary/20">
                        {coupon.code}
                      </span>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => handleCopy(coupon.code)}
                        className="size-6 text-muted-foreground hover:text-foreground shrink-0 cursor-pointer"
                        title="Copy code"
                      >
                        {copiedCode === coupon.code ? (
                          <Check className="size-3 text-emerald-500" />
                        ) : (
                          <Copy className="size-3" />
                        )}
                      </Button>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      {isExpired ? (
                        <Badge variant="outline" className="border-destructive/30 bg-destructive/10 text-destructive text-[10px] font-bold">
                          Expired
                        </Badge>
                      ) : isCapReached ? (
                        <Badge variant="outline" className="border-amber-500/30 bg-amber-500/10 text-amber-600 text-[10px] font-bold">
                          Cap Reached
                        </Badge>
                      ) : coupon.active ? (
                        <Badge variant="outline" className="border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-[10px] font-bold">
                          Active
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="border-border text-muted-foreground text-[10px] font-bold">
                          Paused
                        </Badge>
                      )}

                      <Switch
                        checked={coupon.active}
                        onCheckedChange={() => handleToggleActive(coupon)}
                        title={coupon.active ? "Pause coupon" : "Activate coupon"}
                        className="scale-75 origin-right"
                      />
                    </div>
                  </div>

                  {/* Discount & Description */}
                  <div>
                    <div className="flex items-baseline gap-2">
                      <span className="text-xl font-extrabold text-foreground tracking-tight">
                        {coupon.type === "percentage" ? `${coupon.value}% OFF` : `₹${coupon.value.toLocaleString()} OFF`}
                      </span>
                      {coupon.minAmount ? (
                        <span className="text-[11px] text-muted-foreground">
                          (min cart ₹{coupon.minAmount.toLocaleString()})
                        </span>
                      ) : null}
                    </div>

                    <div className="flex items-center gap-1.5 flex-wrap mt-1">
                      {coupon.targetAudience === "teachers" ? (
                        <Badge className="bg-purple-500/15 text-purple-600 dark:text-purple-400 border border-purple-500/30 text-[10px] font-bold">
                          🎓 Teachers Only
                        </Badge>
                      ) : coupon.targetAudience === "schools" ? (
                        <Badge className="bg-indigo-500/15 text-indigo-600 dark:text-indigo-400 border border-indigo-500/30 text-[10px] font-bold">
                          🏫 Schools Only
                        </Badge>
                      ) : coupon.targetAudience === "students" ? (
                        <Badge className="bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 text-[10px] font-bold">
                          🎒 Students Only
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="border-border text-muted-foreground text-[10px]">
                          🌐 Universal (All)
                        </Badge>
                      )}
                    </div>

                    {coupon.description ? (
                      <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                        {coupon.description}
                      </p>
                    ) : null}
                  </div>

                  {/* Metadata and Stats */}
                  <div className="pt-2 border-t border-border/60 space-y-1.5 text-xs text-muted-foreground">
                    <div className="flex items-center justify-between">
                      <span className="flex items-center gap-1.5 text-[11px]">
                        <TrendingUp className="size-3 text-primary shrink-0" /> Redemptions:
                      </span>
                      <span className="font-mono font-bold text-foreground text-[11px]">
                        {coupon.usedCount}{" "}
                        {coupon.maxUses !== null ? `/ ${coupon.maxUses}` : "(Unlimited)"}
                      </span>
                    </div>

                    {coupon.maxUses !== null && coupon.maxUses > 0 ? (
                      <div className="w-full h-1.5 bg-muted rounded-full overflow-hidden">
                        <div
                          className={cn(
                            "h-full rounded-full transition-all duration-300",
                            coupon.usedCount >= coupon.maxUses
                              ? "bg-amber-500"
                              : "bg-primary",
                          )}
                          style={{
                            width: `${Math.min(100, (coupon.usedCount / coupon.maxUses) * 100)}%`,
                          }}
                        />
                      </div>
                    ) : null}

                    <div className="flex items-center justify-between text-[11px]">
                      <span className="flex items-center gap-1.5">
                        <Clock className="size-3 shrink-0" /> Expiry:
                      </span>
                      <span>
                        {coupon.expiresAt
                          ? new Date(coupon.expiresAt).toLocaleDateString()
                          : "No expiry date"}
                      </span>
                    </div>

                    <div className="flex items-center justify-between text-[11px]">
                      <span>Applicable plans:</span>
                      <span className="font-medium text-foreground text-right truncate max-w-[180px]" title={
                        coupon.applicableTiers && coupon.applicableTiers.length > 0
                          ? coupon.applicableTiers.map((t) => PLAN_DISPLAY_NAMES[t] || TIER_LIMITS[t as PlanTier]?.name || t).join(", ")
                          : "All Plans"
                      }>
                        {coupon.applicableTiers && coupon.applicableTiers.length > 0
                          ? coupon.applicableTiers.map((t) => PLAN_DISPLAY_NAMES[t]?.split(" ")[0] || t).join(", ")
                          : "All Plans"}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Bottom Card Footer Actions */}
                <div className="px-4 py-2.5 bg-muted/30 border-t border-border/60 flex items-center justify-between gap-2">
                  <span className="text-[10px] text-muted-foreground font-mono">
                    Created {new Date(coupon.createdAt).toLocaleDateString()}
                  </span>

                  <div className="flex items-center gap-1">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => openEditDialog(coupon)}
                      className="h-7 px-2 text-xs gap-1 cursor-pointer"
                    >
                      <Edit3 className="size-3" />
                      <span>Edit</span>
                    </Button>

                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => setDeletingCoupon(coupon)}
                      className="h-7 px-2 text-xs gap-1 text-destructive hover:bg-destructive/10 cursor-pointer"
                    >
                      <Trash2 className="size-3" />
                      <span className="sr-only">Delete</span>
                    </Button>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* Create / Edit Dialog */}
      <Dialog
        open={isCreateOpen || editingCoupon !== null}
        onOpenChange={(open) => {
          if (!open) {
            setIsCreateOpen(false);
            setEditingCoupon(null);
          }
        }}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Tag className="size-5 text-primary" />
              <span>{editingCoupon ? `Edit Coupon: ${editingCoupon.code}` : "Create New Coupon Code"}</span>
            </DialogTitle>
            <DialogDescription>
              {editingCoupon
                ? "Update promotional discount parameters, caps, or validity."
                : "Generate a custom code that students can enter during checkout to receive an instant discount."}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            {!editingCoupon ? (
              <div className="space-y-1.5">
                <Label htmlFor="coupon-code" className="text-xs font-semibold">
                  Coupon Code
                </Label>
                <Input
                  id="coupon-code"
                  placeholder="e.g. SAVE20, ECON50, LAUNCH100"
                  value={formCode}
                  onChange={(e) => setFormCode(e.target.value.toUpperCase().replace(/[^A-Z0-9_-]/g, ""))}
                  className="font-mono text-sm tracking-wider uppercase"
                />
                <p className="text-[10px] text-muted-foreground">
                  Alphanumeric only. Letters, numbers, underscores, and hyphens.
                </p>
              </div>
            ) : null}

            {/* Target Audience Selector */}
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Eligible Audience</Label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 p-1 rounded-xl border bg-muted/40">
                {AUDIENCE_OPTIONS.map((opt) => (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => setFormAudience(opt.id)}
                    className={cn(
                      "py-2 px-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer flex flex-col items-center gap-0.5 text-center",
                      formAudience === opt.id
                        ? "bg-background text-foreground shadow-xs font-bold border border-border"
                        : "text-muted-foreground hover:text-foreground",
                    )}
                  >
                    <span className="text-base">{opt.icon}</span>
                    <span className="text-[11px] leading-tight">{opt.shortLabel}</span>
                  </button>
                ))}
              </div>
              <p className="text-[10px] text-muted-foreground">
                {AUDIENCE_OPTIONS.find((o) => o.id === formAudience)?.description}
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Discount Type</Label>
                <div className="grid grid-cols-2 gap-1 p-0.5 rounded-lg border bg-muted/40">
                  <button
                    type="button"
                    onClick={() => setFormType("percentage")}
                    className={cn(
                      "py-1.5 text-xs font-bold rounded-md transition-all cursor-pointer",
                      formType === "percentage"
                        ? "bg-background text-foreground shadow-xs"
                        : "text-muted-foreground hover:text-foreground",
                    )}
                  >
                    Percent (%)
                  </button>
                  <button
                    type="button"
                    onClick={() => setFormType("fixed")}
                    className={cn(
                      "py-1.5 text-xs font-bold rounded-md transition-all cursor-pointer",
                      formType === "fixed"
                        ? "bg-background text-foreground shadow-xs"
                        : "text-muted-foreground hover:text-foreground",
                    )}
                  >
                    Flat (₹)
                  </button>
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="coupon-val" className="text-xs font-semibold">
                  Discount Value {formType === "percentage" ? "(%)" : "(₹)"}
                </Label>
                <Input
                  id="coupon-val"
                  type="number"
                  min={1}
                  max={formType === "percentage" ? 100 : undefined}
                  value={formValue}
                  onChange={(e) => setFormValue(Number(e.target.value))}
                  className="font-bold tabular-nums"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="max-uses" className="text-xs font-semibold">
                  Max Redemptions
                </Label>
                <Input
                  id="max-uses"
                  type="number"
                  min={1}
                  placeholder="Unlimited"
                  value={formMaxUses}
                  onChange={(e) => setFormMaxUses(e.target.value)}
                  className="text-xs tabular-nums"
                />
                <p className="text-[10px] text-muted-foreground">Leave empty for unlimited</p>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="expires-at" className="text-xs font-semibold">
                  Expiration Date
                </Label>
                <Input
                  id="expires-at"
                  type="date"
                  value={formExpiresAt}
                  onChange={(e) => setFormExpiresAt(e.target.value)}
                  className="text-xs"
                />
                <p className="text-[10px] text-muted-foreground">Leave empty for no expiry</p>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="min-cart" className="text-xs font-semibold">
                Minimum Cart Amount (₹)
              </Label>
              <Input
                id="min-cart"
                type="number"
                min={0}
                placeholder="No minimum requirement"
                value={formMinAmount}
                onChange={(e) => setFormMinAmount(e.target.value)}
                className="text-xs tabular-nums"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="description" className="text-xs font-semibold">
                Description / Internal Note
              </Label>
              <Input
                id="description"
                placeholder="e.g. Partner school discount, Teacher onboarding, 20% off"
                value={formDescription}
                onChange={(e) => setFormDescription(e.target.value)}
                className="text-xs"
              />
            </div>

            <div className="space-y-2 pt-1 border-t border-border/60">
              <div className="flex items-center justify-between">
                <Label className="text-xs font-semibold">Restricted Plan Tiers (Optional)</Label>
                {formTiers.length > 0 && (
                  <button
                    type="button"
                    onClick={() => setFormTiers([])}
                    className="text-[10px] text-primary hover:underline font-semibold cursor-pointer"
                  >
                    Clear all (Valid on all plans)
                  </button>
                )}
              </div>
              <p className="text-[10px] text-muted-foreground">
                Leave all unchecked to make this coupon valid across all subscription plans in the selected audience.
              </p>
              <div className="space-y-3 pt-1">
                {PLAN_PRESETS.filter((group) => {
                  if (formAudience === "students") return group.group.includes("Student");
                  if (formAudience === "teachers") return group.group.includes("Teacher");
                  if (formAudience === "schools") return group.group.includes("School");
                  return true;
                }).map((group) => (
                  <div key={group.group} className="space-y-1.5">
                    <p className="text-[10px] uppercase tracking-wider font-bold text-muted-foreground">
                      {group.group}
                    </p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                      {group.plans.map((p) => {
                        const isChecked = formTiers.includes(p.id);
                        return (
                          <button
                            key={group.group + p.id}
                            type="button"
                            onClick={() => {
                              if (isChecked) {
                                setFormTiers((prev) => prev.filter((t) => t !== p.id));
                              } else {
                                setFormTiers((prev) => [...prev, p.id]);
                              }
                            }}
                            className={cn(
                              "flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-xs font-semibold transition-all cursor-pointer text-left",
                              isChecked
                                ? "border-primary bg-primary/10 text-primary"
                                : "border-border text-muted-foreground hover:bg-muted/60",
                            )}
                          >
                            <div
                              className={cn(
                                "size-3.5 rounded border flex items-center justify-center shrink-0",
                                isChecked
                                  ? "border-primary bg-primary text-primary-foreground"
                                  : "border-muted-foreground/40",
                              )}
                            >
                              {isChecked ? <Check className="size-2.5 stroke-[3]" /> : null}
                            </div>
                            <span className="truncate text-[11px]">{p.label}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex items-center justify-between pt-2 border-t border-border/60">
              <div>
                <Label htmlFor="active-toggle" className="text-xs font-semibold block">
                  Activate Immediately
                </Label>
                <p className="text-[10px] text-muted-foreground">
                  Students can use this code upon saving
                </p>
              </div>
              <Switch
                id="active-toggle"
                checked={formActive}
                onCheckedChange={setFormActive}
              />
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setIsCreateOpen(false);
                setEditingCoupon(null);
              }}
            >
              Cancel
            </Button>
            <Button
              type="button"
              disabled={createMutation.isPending || updateMutation.isPending}
              onClick={editingCoupon ? handleSaveEdit : handleSaveCreate}
              className="gap-1.5"
            >
              {createMutation.isPending || updateMutation.isPending ? (
                <Loader2 className="size-3.5 animate-spin" />
              ) : null}
              <span>{editingCoupon ? "Save Changes" : "Create Coupon"}</span>
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Alert */}
      <AlertDialog open={deletingCoupon !== null} onOpenChange={(open) => !open && setDeletingCoupon(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-destructive">
              <Trash2 className="size-5" />
              <span>Delete Coupon: {deletingCoupon?.code}?</span>
            </AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to permanently delete coupon code{" "}
              <strong className="text-foreground">{deletingCoupon?.code}</strong>? Students will no
              longer be able to apply this code during checkout. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deletingCoupon && deleteMutation.mutate(deletingCoupon.id)}
              className="bg-destructive hover:bg-destructive/90 text-destructive-foreground"
            >
              Delete Coupon
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Mass Deactivate Confirmation Alert */}
      <AlertDialog open={isCancelAllOpen} onOpenChange={setIsCancelAllOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-destructive">
              <PowerOff className="size-5" />
              <span>Cancel All Active Coupons?</span>
            </AlertDialogTitle>
            <AlertDialogDescription>
              This emergency killswitch will immediately deactivate all{" "}
              <strong className="text-foreground">{activeCoupons}</strong> currently active coupon codes.
              No discounts will be redeemable by students until you re-enable them individually.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep Active</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => cancelAllMutation.mutate()}
              className="bg-destructive hover:bg-destructive/90 text-destructive-foreground"
            >
              Deactivate All Codes
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
