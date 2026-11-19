import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import {
  Award,
  BookOpen,
  Calendar,
  Camera,
  Check,
  CheckCircle2,
  Clock,
  Copy,
  Download,
  GraduationCap,
  HelpCircle,
  Image as ImageIcon,
  Info,
  Layers,
  Loader2,
  Mail,
  PenLine,
  RotateCcw,
  Save,
  Shield,
  ShieldCheck,
  Sliders,
  Sparkles,
  Trash2,
  Upload,
  User,
  UserCheck,
  X,
  Zap,
  PanelsTopBottom,
  PanelLeft,
  ArrowRight,
  ExternalLink,
  FileText,
  Scale,
  Lock,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";

import {
  PageHeader,
  getPlatformNavLayout,
  setPlatformNavLayout,
} from "@/components/app/app-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { ThemeToggle } from "@/components/marketing/theme-toggle";
import { useFeatureTutorial } from "@/components/tutorials/tutorial-context";
import { FEATURE_TUTORIALS } from "@/lib/tutorials-data";
import { UserAvatar, ACADEMIC_AVATAR_PRESETS, getPresetById } from "@/components/app/user-avatar";
import {
  getMe,
  updateProfile,
  getUserAcademicPreferences,
  saveUserAcademicPreferences,
  type NavigationLayout,
} from "@/lib/account.functions";
import { AVAILABLE_CAMBRIDGE_SERIES } from "@/lib/cambridge-thresholds";
import { supabase } from "@/integrations/backend/client";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/settings")({
  head: () => ({
    meta: [
      { title: "Candidate Profile & Settings — Marginalite Economics" },
      {
        name: "description",
        content:
          "Manage your Cambridge IGCSE 0455 candidate profile, profile avatar, biography, exam benchmarks, evaluation depth, and workspace settings.",
      },
    ],
  }),
  component: SettingsPage,
});

const BIO_SUGGESTIONS = [
  "Target: Cambridge / Oxford Economics",
  "Reading PPE / Economics at LSE",
  "Cambridge IGCSE 0455 Candidate targeting A*",
  "Passionate about Monetary Policy & Macro",
  "Focus: Microeconomic Market Failure",
  "Aiming for First Class Cambridge Tripos",
];

export function SettingsPage() {
  const queryClient = useQueryClient();
  const fetchMe = useServerFn(getMe);
  const save = useServerFn(updateProfile);
  const fetchAcademicPrefs = useServerFn(getUserAcademicPreferences);
  const saveAcademicPrefsFn = useServerFn(saveUserAcademicPreferences);

  const me = useQuery({ queryKey: ["me"], queryFn: () => fetchMe() });
  const academicPrefsQuery = useQuery({
    queryKey: ["academic-prefs"],
    queryFn: () => fetchAcademicPrefs(),
  });

  // Profile Identity States
  const [fullName, setFullName] = useState("");
  const [school, setSchool] = useState("");
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [bio, setBio] = useState("");
  const [birthday, setBirthday] = useState("");
  const [customUrlInput, setCustomUrlInput] = useState("");
  const [showUrlInput, setShowUrlInput] = useState(false);
  const [avatarPickerOpen, setAvatarPickerOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState(false);

  // Cambridge Study & Exam Preferences (calibrated with official thresholds)
  const [examSeries, setExamSeries] = useState("all_average");
  const [targetLevel, setTargetLevel] = useState("igcse_0455");
  const [targetGrade, setTargetGrade] = useState("A*");
  const [currencyContext, setCurrencyContext] = useState("uk_intl");
  const [feedbackDepth, setFeedbackDepth] = useState("detailed");
  const [timedModeDefault, setTimedModeDefault] = useState(true);
  const [showDiagramLabels, setShowDiagramLabels] = useState(true);
  const [navigationLayout, setNavigationLayout] = useState<NavigationLayout>(() =>
    getPlatformNavLayout(),
  );
  const [legalDialog, setLegalDialog] = useState<"terms" | "privacy" | "about" | null>(null);

  const {
    openTutorial,
    seenTutorials,
    autoTutorialsEnabled,
    toggleAutoTutorials,
    resetSeenStatus,
  } = useFeatureTutorial();

  const totalTutorialsCount = FEATURE_TUTORIALS.length;
  const completedTutorialsCount = useMemo(() => {
    return Object.keys(seenTutorials).filter((k) => seenTutorials[k]).length;
  }, [seenTutorials]);

  // Initialize from server preferences or fallback to localStorage
  const [prefsSeeded, setPrefsSeeded] = useState(false);
  useEffect(() => {
    if (prefsSeeded) return;
    if (academicPrefsQuery.data) {
      setExamSeries(academicPrefsQuery.data.examSeries || "all_average");
      setTargetLevel(academicPrefsQuery.data.targetLevel || "igcse_0455");
      setTargetGrade(academicPrefsQuery.data.targetGrade || "A*");
      setCurrencyContext(academicPrefsQuery.data.currencyContext || "uk_intl");
      setFeedbackDepth(academicPrefsQuery.data.feedbackDepth || "detailed");
      setTimedModeDefault(academicPrefsQuery.data.timedModeDefault ?? true);
      setShowDiagramLabels(academicPrefsQuery.data.showDiagramLabels ?? true);
      if (academicPrefsQuery.data.navigationLayout) {
        setNavigationLayout(academicPrefsQuery.data.navigationLayout);
      }
      setPrefsSeeded(true);
      return;
    }

    try {
      const saved = localStorage.getItem("marginal_candidate_prefs");
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.examSeries) setExamSeries(parsed.examSeries);
        if (parsed.targetLevel) setTargetLevel(parsed.targetLevel);
        if (parsed.targetGrade) setTargetGrade(parsed.targetGrade);
        if (parsed.currencyContext) setCurrencyContext(parsed.currencyContext);
        if (parsed.feedbackDepth) setFeedbackDepth(parsed.feedbackDepth);
        if (typeof parsed.timedModeDefault === "boolean")
          setTimedModeDefault(parsed.timedModeDefault);
        if (typeof parsed.showDiagramLabels === "boolean")
          setShowDiagramLabels(parsed.showDiagramLabels);
        if (parsed.navigationLayout) setNavigationLayout(parsed.navigationLayout);
      }
    } catch {
      /* ignore */
    }
  }, [academicPrefsQuery.data, prefsSeeded]);

  // Fetch client user email for display
  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (data?.user?.email) {
        setUserEmail(data.user.email);
      }
    });
  }, []);

  const [seeded, setSeeded] = useState(false);
  useEffect(() => {
    if (seeded || !me.data) return;
    setFullName(me.data.fullName ?? "");
    setSchool(me.data.school ?? "");
    setAvatarUrl((me.data as any).avatarUrl ?? null);
    setBio((me.data as any).bio ?? "");
    setBirthday((me.data as any).birthday ?? "");
    setSeeded(true);
  }, [me.data, seeded]);

  const profileMutation = useMutation({
    mutationFn: () =>
      save({
        data: {
          fullName: fullName.trim(),
          school: school.trim() || undefined,
          avatarUrl: avatarUrl ?? undefined,
          bio: bio.trim() || undefined,
          birthday: birthday.trim() || undefined,
        },
      }),
    onSuccess: () => {
      toast.success("Cambridge candidate profile updated successfully.");
      queryClient.invalidateQueries({ queryKey: ["me"] });
      queryClient.invalidateQueries({ queryKey: ["admin-users"] });
    },
    onError: (error: Error) => toast.error(error.message || "Failed to save profile changes."),
  });

  const academicPrefsMutation = useMutation({
    mutationFn: async (overrides?: {
      examSeries?: string;
      targetLevel?: "igcse_core" | "igcse_extended" | "igcse_0455";
      targetGrade?: "A*" | "A" | "B" | "C";
      currencyContext?: string;
      feedbackDepth?: string;
      timedModeDefault?: boolean;
      showDiagramLabels?: boolean;
      navigationLayout?: NavigationLayout;
    }) => {
      const payload = {
        examSeries: overrides?.examSeries ?? examSeries,
        targetLevel: (overrides?.targetLevel ?? targetLevel) as
          "igcse_core" | "igcse_extended" | "igcse_0455",
        targetGrade: (overrides?.targetGrade ?? targetGrade) as "A*" | "A" | "B" | "C",
        currencyContext: overrides?.currencyContext ?? currencyContext,
        feedbackDepth: overrides?.feedbackDepth ?? feedbackDepth,
        timedModeDefault: overrides?.timedModeDefault ?? timedModeDefault,
        showDiagramLabels: overrides?.showDiagramLabels ?? showDiagramLabels,
        navigationLayout: overrides?.navigationLayout ?? navigationLayout,
      };
      try {
        localStorage.setItem("marginal_candidate_prefs", JSON.stringify(payload));
      } catch {
        /* ignore */
      }
      return await saveAcademicPrefsFn({ data: payload });
    },
    onSuccess: () => {
      toast.success("Cambridge examination series & grade thresholds saved.");
      queryClient.invalidateQueries({ queryKey: ["academic-prefs"] });
      queryClient.invalidateQueries({ queryKey: ["review-panel"] });
    },
    onError: (error: Error) => toast.error(error.message || "Failed to save preferences."),
  });

  const handleSaveAcademicPrefs = (overrides?: any) => {
    academicPrefsMutation.mutate(overrides);
  };

  const copyUserId = () => {
    if (me.data?.userId) {
      navigator.clipboard.writeText(me.data.userId);
      setCopiedId(true);
      toast.success("Account User ID copied to clipboard.");
      setTimeout(() => setCopiedId(false), 2000);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      toast.error("Please select an image file (PNG, JPG, WebP).");
      return;
    }

    if (file.size > 2 * 1024 * 1024) {
      toast.error("Image size must be under 2MB.");
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const result = event.target?.result as string;
      if (result) {
        setAvatarUrl(result);
        setAvatarPickerOpen(false);
        toast.success("Profile photo uploaded. Click 'Save Profile' to persist.");
      }
    };
    reader.onerror = () => {
      toast.error("Failed to read image file.");
    };
    reader.readAsDataURL(file);
  };

  const handleCustomUrlApply = () => {
    const trimmed = customUrlInput.trim();
    if (!trimmed) return;
    if (!trimmed.startsWith("http://") && !trimmed.startsWith("https://")) {
      toast.error("Please enter a valid URL starting with http:// or https://");
      return;
    }
    setAvatarUrl(trimmed);
    setCustomUrlInput("");
    setShowUrlInput(false);
    setAvatarPickerOpen(false);
    toast.success("Avatar image URL applied. Click 'Save Profile' to persist.");
  };

  const handleBioSuggestionClick = (suggestion: string) => {
    if (bio.includes(suggestion)) return;
    const newBio = bio ? `${bio.trim()} · ${suggestion}` : suggestion;
    if (newBio.length <= 500) {
      setBio(newBio);
    } else {
      toast.error("Bio is close to the 500-character limit.");
    }
  };

  const calculatedAge = useMemo(() => {
    if (!birthday) return null;
    const birthDate = new Date(birthday);
    if (isNaN(birthDate.getTime())) return null;
    const diff = Date.now() - birthDate.getTime();
    const ageDate = new Date(diff);
    const age = Math.abs(ageDate.getUTCFullYear() - 1970);
    return `${age} years old`;
  }, [birthday]);

  const formattedBirthday = useMemo(() => {
    if (!birthday) return null;
    try {
      const parts = birthday.split("-");
      if (parts.length === 3) {
        const d = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
        return d.toLocaleDateString("en-GB", {
          day: "numeric",
          month: "long",
          year: "numeric",
        });
      }
      return birthday;
    } catch {
      return birthday;
    }
  }, [birthday]);

  const candidateInitials = useMemo(() => {
    const target = fullName || me.data?.fullName;
    if (!target) return "CA";
    const parts = target.trim().split(/\s+/);
    if (parts.length >= 2) return `${parts[0]![0]}${parts[1]![0]}`.toUpperCase();
    return (target[0] ?? "C").toUpperCase();
  }, [fullName, me.data?.fullName]);

  const candidateRefNumber = useMemo(() => {
    const uid = me.data?.userId || "candidate";
    const hash = uid
      .replace(/[^a-zA-Z0-9]/g, "")
      .slice(0, 6)
      .toUpperCase();
    return `0455-${hash || "7402"}`;
  }, [me.data?.userId]);

  const handleExportData = () => {
    try {
      const exportObject = {
        candidateName: fullName || me.data?.fullName || "Candidate",
        candidateId: me.data?.userId || "unknown",
        candidateReference: candidateRefNumber,
        school: school || me.data?.school || "Independent Centre",
        avatarUrl: avatarUrl || undefined,
        bio: bio || undefined,
        birthday: birthday || undefined,
        calculatedAge: calculatedAge || undefined,
        accountRole: me.data?.role || "student",
        exportedAt: new Date().toISOString(),
        examSeries,
        targetGrade,
        targetLevel,
        currencyContext,
        syllabus: "Cambridge IGCSE Economics (0455)",
        platform: "Marginalite Economics Engine v2.4",
      };
      const blob = new Blob([JSON.stringify(exportObject, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `marginal-economics-candidate-${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success("Academic candidate profile data exported.");
    } catch {
      toast.error("Failed to export data.");
    }
  };

  return (
    <div>
      <PageHeader
        title="Student Profile & Settings"
        description="Configure your official Cambridge IGCSE 0455 candidate identity, avatar, statement, examination targets, and evaluation preferences."
      />

      <div className="space-y-6 px-4 py-5 sm:px-6 md:px-8 max-w-6xl mx-auto">
        {me.isLoading ? (
          <div className="flex flex-col items-center justify-center py-24 space-y-3">
            <Loader2 className="size-8 animate-spin text-primary" />
            <p className="text-xs text-muted-foreground font-medium">
              Loading account settings &amp; dossier...
            </p>
          </div>
        ) : (
          <div className="grid gap-6 lg:grid-cols-12">
            {/* Left 7 Columns: Profile Studio & Academic Goals */}
            <div className="lg:col-span-7 space-y-6">
              {/* 1. Candidate Identity & Profile */}
              <div className="rounded-2xl border border-border/80 bg-card p-5 sm:p-6 shadow-xs space-y-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border/80 pb-4">
                  <div className="flex items-center gap-3">
                    <UserAvatar
                      avatarUrl={avatarUrl}
                      name={fullName || me.data?.fullName}
                      fallbackInitials={candidateInitials}
                      showStatusDot={true}
                      className="size-12 shadow-sm ring-2 ring-primary/20"
                    />
                    <div>
                      <h2 className="text-sm sm:text-base font-bold text-foreground flex items-center gap-2">
                        Candidate Identity &amp; Profile
                        {me.data?.role === "teacher" ? (
                          <Badge className="bg-purple-500/20 text-purple-600 dark:text-purple-400 border-purple-500/30 text-[10px] font-bold">
                            Authorized Educator
                          </Badge>
                        ) : me.data?.isAdmin ? (
                          <Badge className="bg-primary/20 text-primary border-primary/30 text-[10px] font-bold">
                            Root Administrator
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="text-[10px] font-medium bg-muted">
                            Cambridge IGCSE 0455 Candidate
                          </Badge>
                        )}
                      </h2>
                      <p className="text-xs text-muted-foreground">
                        Your registered academic identity and student dossier for Cambridge IGCSE 0455
                        evaluations.
                      </p>
                    </div>
                  </div>
                </div>

                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    profileMutation.mutate();
                  }}
                  className="space-y-5"
                >
                  {/* Avatar Picker Studio */}
                  <div className="rounded-xl border border-border/70 bg-muted/20 p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <Label className="text-xs font-bold text-foreground flex items-center gap-1.5">
                        <Camera className="size-3.5 text-primary" /> Profile Picture &amp; Academic
                        Avatar
                      </Label>
                      <div className="flex items-center gap-1.5">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className="h-7 text-[11px] px-2.5"
                          onClick={() => setAvatarPickerOpen(!avatarPickerOpen)}
                        >
                          {avatarPickerOpen ? "Hide Avatar Studio" : "Change Avatar"}
                        </Button>
                        {avatarUrl && (
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="h-7 text-[11px] px-2 text-muted-foreground hover:text-destructive"
                            onClick={() => setAvatarUrl(null)}
                            title="Reset to Initials"
                          >
                            <Trash2 className="size-3 mr-1" /> Remove
                          </Button>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <UserAvatar
                        avatarUrl={avatarUrl}
                        name={fullName || me.data?.fullName}
                        fallbackInitials={candidateInitials}
                        showStatusDot={true}
                        className="size-14 shadow-sm ring-2 ring-primary/30 shrink-0"
                      />
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-semibold text-foreground">
                          {avatarUrl
                            ? getPresetById(avatarUrl)?.name ||
                              (avatarUrl.startsWith("data:")
                                ? "Custom Uploaded Photo"
                                : "Custom Web Image")
                            : "Standard Candidate Initials"}
                        </p>
                        <p className="text-[11px] text-muted-foreground leading-relaxed mt-0.5">
                          Choose an official Cambridge academic persona, upload your photo, or paste
                          a link.
                        </p>
                      </div>
                    </div>

                    {/* Expandable Avatar Selection Grid */}
                    {avatarPickerOpen && (
                      <div className="pt-3 border-t border-border/60 space-y-3.5 animate-in fade-in-50 duration-200">
                        <div>
                          <p className="text-[11px] font-bold text-foreground mb-2 flex items-center gap-1">
                            <Sparkles className="size-3 text-primary" /> Curated Cambridge Academic
                            Presets
                          </p>
                          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                            {ACADEMIC_AVATAR_PRESETS.map((preset) => {
                              const isSelected = avatarUrl === preset.id;
                              const Icon = preset.icon;
                              return (
                                <button
                                  key={preset.id}
                                  type="button"
                                  onClick={() => {
                                    setAvatarUrl(preset.id);
                                    toast.success(`Selected ${preset.name}`);
                                  }}
                                  className={cn(
                                    "flex flex-col items-center text-center p-2.5 rounded-xl border transition-all text-xs cursor-pointer group",
                                    isSelected
                                      ? "border-primary bg-primary/10 shadow-xs ring-1 ring-primary/40"
                                      : "border-border/70 hover:border-primary/40 hover:bg-card/80",
                                  )}
                                >
                                  <div
                                    className={cn(
                                      "size-9 rounded-lg flex items-center justify-center mb-1.5 transition-transform group-hover:scale-105",
                                      preset.bg,
                                      preset.border,
                                      preset.text,
                                    )}
                                  >
                                    <Icon className="size-4" />
                                  </div>
                                  <span className="font-bold text-[11px] text-foreground leading-tight truncate w-full">
                                    {preset.name}
                                  </span>
                                  <span className="text-[9.5px] text-muted-foreground mt-0.5 leading-tight truncate w-full">
                                    {preset.title}
                                  </span>
                                  {isSelected && (
                                    <span className="mt-1 text-[9px] font-bold text-primary flex items-center gap-0.5">
                                      <Check className="size-2.5" /> Selected
                                    </span>
                                  )}
                                </button>
                              );
                            })}
                          </div>
                        </div>

                        {/* Upload & Link Buttons */}
                        <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-border/50">
                          <input
                            ref={fileInputRef}
                            type="file"
                            accept="image/*"
                            onChange={handleFileUpload}
                            className="hidden"
                          />
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            className="h-8 text-xs font-medium"
                            onClick={() => fileInputRef.current?.click()}
                          >
                            <Upload className="size-3.5 mr-1.5 text-primary" /> Upload Photo File
                            (Max 2MB)
                          </Button>

                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            className="h-8 text-xs font-medium"
                            onClick={() => setShowUrlInput(!showUrlInput)}
                          >
                            <ImageIcon className="size-3.5 mr-1.5" /> Paste Image URL
                          </Button>
                        </div>

                        {showUrlInput && (
                          <div className="flex items-center gap-2 pt-1 animate-in fade-in-50">
                            <Input
                              value={customUrlInput}
                              onChange={(e) => setCustomUrlInput(e.target.value)}
                              placeholder="https://example.com/my-photo.jpg"
                              className="h-8 text-xs font-mono"
                            />
                            <Button
                              type="button"
                              size="sm"
                              className="h-8 text-xs px-3 font-semibold"
                              onClick={handleCustomUrlApply}
                            >
                              Apply
                            </Button>
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              className="h-8 text-xs px-2"
                              onClick={() => setShowUrlInput(false)}
                            >
                              Cancel
                            </Button>
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Name and School Inputs */}
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-1.5">
                      <Label htmlFor="settings-name" className="text-xs font-semibold">
                        Full Name
                      </Label>
                      <Input
                        id="settings-name"
                        value={fullName}
                        onChange={(e) => setFullName(e.target.value)}
                        placeholder="e.g. Eleanor Vance"
                        className="h-9 text-xs"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <Label htmlFor="settings-school" className="text-xs font-semibold">
                        School / Examination Centre
                      </Label>
                      <Input
                        id="settings-school"
                        value={school}
                        onChange={(e) => setSchool(e.target.value)}
                        placeholder="e.g. Raffles Institution / Cambridge College"
                        className="h-9 text-xs"
                      />
                    </div>
                  </div>

                  {/* Birthday & Age Field */}
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between">
                        <Label
                          htmlFor="settings-birthday"
                          className="text-xs font-semibold flex items-center gap-1.5"
                        >
                          <Calendar className="size-3 text-primary" /> Date of Birth
                        </Label>
                        {calculatedAge && (
                          <span className="text-[10.5px] font-bold text-primary">
                            {calculatedAge}
                          </span>
                        )}
                      </div>
                      <Input
                        id="settings-birthday"
                        type="date"
                        value={birthday}
                        onChange={(e) => setBirthday(e.target.value)}
                        className="h-9 text-xs"
                      />
                      <p className="text-[10.5px] text-muted-foreground">
                        {formattedBirthday
                          ? `Recorded as: ${formattedBirthday}`
                          : "Used to calibrate candidate cohort analytics."}
                      </p>
                    </div>

                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between">
                        <Label className="text-xs font-semibold text-muted-foreground">
                          Email Address
                        </Label>
                        <span className="inline-flex items-center gap-1 text-[10px] font-medium text-emerald-600 dark:text-emerald-400">
                          <CheckCircle2 className="size-3" /> Verified
                        </span>
                      </div>
                      <div className="flex items-center gap-2 rounded-lg border border-border/80 bg-muted/40 px-3 py-2 text-xs text-foreground font-mono">
                        <Mail className="size-3.5 text-muted-foreground shrink-0" />
                        <span className="truncate">{userEmail || "Signed in candidate"}</span>
                      </div>
                      <p className="text-[10.5px] text-muted-foreground">
                        Authentication identity secured via Google / Supabase.
                      </p>
                    </div>
                  </div>

                  {/* Bio & Academic Statement */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label
                        htmlFor="settings-bio"
                        className="text-xs font-semibold flex items-center gap-1.5"
                      >
                        <PenLine className="size-3 text-primary" /> Candidate Personal Statement
                        &amp; Bio
                      </Label>
                      <span
                        className={cn(
                          "text-[10px] font-mono",
                          bio.length > 450 ? "text-amber-500 font-bold" : "text-muted-foreground",
                        )}
                      >
                        {bio.length} / 500
                      </span>
                    </div>
                    <Textarea
                      id="settings-bio"
                      value={bio}
                      onChange={(e) => setBio(e.target.value.slice(0, 500))}
                      placeholder="e.g. Cambridge IGCSE 0455 candidate preparing for May/June series. Targeting A* with aspirations to read PPE or Economics at Cambridge / LSE. Interested in monetary policy and behavioral market failure."
                      rows={3}
                      className="text-xs leading-relaxed resize-none"
                    />
                    {/* Bio Quick Suggestions */}
                    <div className="space-y-1.5">
                      <p className="text-[10.5px] font-semibold text-muted-foreground">
                        Quick Inspiration Pills (click to add):
                      </p>
                      <div className="flex flex-wrap gap-1.5">
                        {BIO_SUGGESTIONS.map((sug) => (
                          <button
                            key={sug}
                            type="button"
                            onClick={() => handleBioSuggestionClick(sug)}
                            className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-muted/60 hover:bg-primary/10 hover:text-primary text-[10.5px] text-muted-foreground border border-border/70 transition-colors cursor-pointer"
                          >
                            + {sug}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* User ID & Reference */}
                  <div className="pt-2 border-t border-border/60">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-medium text-muted-foreground">
                        Candidate Reference:{" "}
                        <strong className="font-mono text-foreground">{candidateRefNumber}</strong>
                      </span>
                      <button
                        type="button"
                        onClick={copyUserId}
                        className="text-[11px] font-semibold text-primary hover:underline inline-flex items-center gap-1 cursor-pointer"
                      >
                        {copiedId ? (
                          <Check className="size-3 text-emerald-500" />
                        ) : (
                          <Copy className="size-3" />
                        )}
                        {copiedId ? "Copied ID" : "Copy Account UUID"}
                      </button>
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-3 border-t border-border/70">
                    <span className="text-[11px] text-muted-foreground">
                      Updates appear across your Cambridge Dossier, essay reports, and classrooms.
                    </span>
                    <Button
                      type="submit"
                      size="sm"
                      disabled={profileMutation.isPending}
                      className="h-9 px-4 text-xs font-bold shadow-sm"
                    >
                      {profileMutation.isPending ? (
                        <>
                          <Loader2 className="size-3.5 animate-spin mr-1.5" /> Saving...
                        </>
                      ) : (
                        <>
                          <Save className="size-3.5 mr-1.5" /> Save Candidate Profile
                        </>
                      )}
                    </Button>
                  </div>
                </form>
              </div>

              {/* 2. Cambridge IGCSE 0455 Academic Target & Preferences */}
              <div className="rounded-2xl border border-border/80 bg-card p-5 sm:p-6 shadow-xs space-y-5">
                <div className="flex items-center justify-between border-b border-border/80 pb-4">
                  <div className="space-y-0.5">
                    <h2 className="text-sm sm:text-base font-bold text-foreground flex items-center gap-2">
                      <GraduationCap className="size-4 text-primary" /> Cambridge IGCSE 0455 Academic
                      Profile
                    </h2>
                    <p className="text-xs text-muted-foreground">
                      Tailor feedback, exemplar comparisons, and question suggestions to your
                      syllabus track.
                    </p>
                  </div>
                  <Badge
                    variant="outline"
                    className="border-primary/30 bg-primary/10 text-primary text-[10px] font-semibold"
                  >
                    0455 Syllabus Grounded
                  </Badge>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-1.5 sm:col-span-2">
                    <div className="flex items-center justify-between">
                      <Label className="text-xs font-semibold">
                        Examination Target Series &amp; Thresholds
                      </Label>
                      <span className="text-[10px] text-muted-foreground font-medium">
                        Calibrates predicted marks &amp; grades
                      </span>
                    </div>
                    <Select value={examSeries} onValueChange={setExamSeries}>
                      <SelectTrigger className="h-9 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {AVAILABLE_CAMBRIDGE_SERIES.map((s) => (
                          <SelectItem key={s.id} value={s.id}>
                            {s.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <p className="text-[11px] text-muted-foreground">
                      Marginalite applies official Cambridge IGCSE 0455 grade thresholds for your chosen
                      series. If left as default, the multi-year all-series average (A* 68%, A 60%,
                      B 52%, C 46%) is used across all papers.
                    </p>
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold">Curriculum Focus Level</Label>
                    <Select value={targetLevel} onValueChange={setTargetLevel}>
                      <SelectTrigger className="h-9 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="igcse_core">
                          IGCSE 0455 Focus (Paper 1 MCQ &amp; Paper 2 Essays)
                        </SelectItem>
                        <SelectItem value="igcse_extended">
                          IGCSE Level Focus (Paper 1 MCQ &amp; Paper 2 Essays)
                        </SelectItem>
                        <SelectItem value="igcse_0455">
                          Full Cambridge IGCSE 0455 (Papers 1, 2, 3 &amp; 4)
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold">Target Benchmark Grade</Label>
                    <Select value={targetGrade} onValueChange={setTargetGrade}>
                      <SelectTrigger className="h-9 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="A*">
                          Target A* (80%+ Overall Cambridge Band 1)
                        </SelectItem>
                        <SelectItem value="A">Target A (70% - 79% Solid Band 1)</SelectItem>
                        <SelectItem value="B">Target B (60% - 69% Band 2 Competence)</SelectItem>
                        <SelectItem value="C">Target C (50% - 59% Foundational Pass)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-1.5 sm:col-span-2">
                    <Label className="text-xs font-semibold">Economic Context &amp; Currency</Label>
                    <Select value={currencyContext} onValueChange={setCurrencyContext}>
                      <SelectTrigger className="h-9 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="uk_intl">
                          UK &amp; International Standards (£ / $)
                        </SelectItem>
                        <SelectItem value="us_global">US &amp; Global Markets ($)</SelectItem>
                        <SelectItem value="inr">South Asian Markets &amp; Rupee (₹)</SelectItem>
                        <SelectItem value="eur">European Economic Area (€)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-3 pt-2">
                  <Label className="text-xs font-semibold">Examiner Feedback Calibration</Label>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div
                      onClick={() => setFeedbackDepth("detailed")}
                      className={cn(
                        "rounded-xl border p-3 cursor-pointer transition-all space-y-1 text-xs",
                        feedbackDepth === "detailed"
                          ? "border-primary bg-primary/[0.04] text-foreground"
                          : "border-border hover:border-border/80 text-muted-foreground",
                      )}
                    >
                      <div className="flex items-center justify-between font-bold">
                        <span className="flex items-center gap-1.5">
                          <Sparkles className="size-3.5 text-primary" /> Full Diagnostic Marking
                        </span>
                        {feedbackDepth === "detailed" && (
                          <Check className="size-3.5 text-primary" />
                        )}
                      </div>
                      <p className="text-[11px] text-muted-foreground leading-relaxed">
                        Line-by-line mark scheme breakdown, explicit AO1/AO2/AO3 allocations, and
                        rewritten model answers.
                      </p>
                    </div>

                    <div
                      onClick={() => setFeedbackDepth("concise")}
                      className={cn(
                        "rounded-xl border p-3 cursor-pointer transition-all space-y-1 text-xs",
                        feedbackDepth === "concise"
                          ? "border-primary bg-primary/[0.04] text-foreground"
                          : "border-border hover:border-border/80 text-muted-foreground",
                      )}
                    >
                      <div className="flex items-center justify-between font-bold">
                        <span className="flex items-center gap-1.5">
                          <Sliders className="size-3.5 text-primary" /> Rapid Band &amp; Tips
                        </span>
                        {feedbackDepth === "concise" && <Check className="size-3.5 text-primary" />}
                      </div>
                      <p className="text-[11px] text-muted-foreground leading-relaxed">
                        Fast band assignment, total marks, and top 3 decisive improvement levers for
                        rapid practice sessions.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-border/70">
                  <span className="text-[11px] text-muted-foreground">
                    Preferences calibrate your essay diagnostics, MCQ drills, and rubrics.
                  </span>
                  <Button
                    type="button"
                    size="sm"
                    disabled={academicPrefsMutation.isPending}
                    onClick={() => handleSaveAcademicPrefs()}
                    className="h-8 text-xs font-semibold"
                  >
                    {academicPrefsMutation.isPending ? (
                      <>
                        <Loader2 className="size-3.5 animate-spin mr-1.5" /> Saving...
                      </>
                    ) : (
                      <>
                        <Save className="size-3.5 mr-1.5" /> Save Academic Goals
                      </>
                    )}
                  </Button>
                </div>
              </div>

              {/* 3. Study Workspace & Interface Preferences */}
              <div className="rounded-2xl border border-border/80 bg-card p-5 sm:p-6 shadow-xs space-y-4">
                <div className="border-b border-border/80 pb-3">
                  <h2 className="text-sm sm:text-base font-bold text-foreground flex items-center gap-2">
                    <Sliders className="size-4 text-primary" /> Exam Workspace Controls
                  </h2>
                  <p className="text-xs text-muted-foreground">
                    Customize navigation layouts, practice exam timer behaviors, and interactive vector diagram rendering.
                  </p>
                </div>

                <div className="space-y-4">
                  {/* Navigation Architecture Selector */}
                  <div className="space-y-2.5 pb-2">
                    <div className="space-y-1">
                      <Label className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                        <PanelsTopBottom className="size-3.5 text-primary" /> Workspace Navigation Architecture
                      </Label>
                      <p className="text-[11px] text-muted-foreground">
                        Select your preferred platform navigation layout. You can also toggle layouts on the fly using the quick switcher pill in the header.
                      </p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-1">
                      {/* Option 1: Topbar */}
                      <div
                        onClick={() => {
                          setNavigationLayout("topbar");
                          setPlatformNavLayout("topbar");
                          handleSaveAcademicPrefs({ navigationLayout: "topbar" });
                          toast.success("Navigation set to Horizontal Topbar (Scroll-Free)");
                        }}
                        className={cn(
                          "rounded-xl border p-3.5 cursor-pointer transition-all flex flex-col justify-between gap-3 text-left relative",
                          navigationLayout === "topbar"
                            ? "border-primary bg-primary/10 shadow-xs ring-1 ring-primary"
                            : "border-border/80 bg-card hover:border-primary/40 hover:bg-muted/40",
                        )}
                      >
                        <div className="space-y-1.5">
                          <div className="flex items-center justify-between">
                            <div className="size-8 rounded-lg bg-primary/15 text-primary flex items-center justify-center">
                              <PanelsTopBottom className="size-4" />
                            </div>
                            <Badge
                              variant="outline"
                              className="text-[9px] font-bold border-emerald-500/30 text-emerald-600 bg-emerald-500/10"
                            >
                              Recommended
                            </Badge>
                          </div>
                          <p className="text-xs font-bold text-foreground">Horizontal Topbar</p>
                          <p className="text-[11px] text-muted-foreground leading-snug">
                            100% scroll-free sticky top bar. Maximizes full screen width for essay writing and past papers with zero vertical scrolling.
                          </p>
                        </div>
                        <div className="flex items-center justify-between pt-2 border-t border-border/50 text-[10.5px]">
                          <span className="font-mono text-muted-foreground">Header Menus</span>
                          {navigationLayout === "topbar" ? (
                            <span className="font-bold text-primary flex items-center gap-1">
                              <Check className="size-3" /> Active
                            </span>
                          ) : (
                            <span className="text-muted-foreground">Select</span>
                          )}
                        </div>
                      </div>

                      {/* Option 2: Compact Category Dock */}
                      <div
                        onClick={() => {
                          setNavigationLayout("dock");
                          setPlatformNavLayout("dock");
                          handleSaveAcademicPrefs({ navigationLayout: "dock" });
                          toast.success("Navigation set to Compact Category Hub");
                        }}
                        className={cn(
                          "rounded-xl border p-3.5 cursor-pointer transition-all flex flex-col justify-between gap-3 text-left relative",
                          navigationLayout === "dock"
                            ? "border-primary bg-primary/10 shadow-xs ring-1 ring-primary"
                            : "border-border/80 bg-card hover:border-primary/40 hover:bg-muted/40",
                        )}
                      >
                        <div className="space-y-1.5">
                          <div className="flex items-center justify-between">
                            <div className="size-8 rounded-lg bg-indigo-500/15 text-indigo-500 flex items-center justify-center">
                              <Layers className="size-4" />
                            </div>
                            <Badge
                              variant="outline"
                              className="text-[9px] font-bold border-indigo-500/30 text-indigo-600 bg-indigo-500/10"
                            >
                              Scroll-Free
                            </Badge>
                          </div>
                          <p className="text-xs font-bold text-foreground">Compact Category Hub</p>
                          <p className="text-[11px] text-muted-foreground leading-snug">
                            Slim 68px icon rail that expands only the active category (4–6 tools max). Perfectly fits on any laptop screen without scrolling.
                          </p>
                        </div>
                        <div className="flex items-center justify-between pt-2 border-t border-border/50 text-[10.5px]">
                          <span className="font-mono text-muted-foreground">Dock + Pop-out</span>
                          {navigationLayout === "dock" ? (
                            <span className="font-bold text-primary flex items-center gap-1">
                              <Check className="size-3" /> Active
                            </span>
                          ) : (
                            <span className="text-muted-foreground">Select</span>
                          )}
                        </div>
                      </div>

                      {/* Option 3: Classic Vertical Sidebar */}
                      <div
                        onClick={() => {
                          setNavigationLayout("sidebar");
                          setPlatformNavLayout("sidebar");
                          handleSaveAcademicPrefs({ navigationLayout: "sidebar" });
                          toast.success("Navigation set to Classic Vertical Sidebar");
                        }}
                        className={cn(
                          "rounded-xl border p-3.5 cursor-pointer transition-all flex flex-col justify-between gap-3 text-left relative",
                          navigationLayout === "sidebar"
                            ? "border-primary bg-primary/10 shadow-xs ring-1 ring-primary"
                            : "border-border/80 bg-card hover:border-primary/40 hover:bg-muted/40",
                        )}
                      >
                        <div className="space-y-1.5">
                          <div className="flex items-center justify-between">
                            <div className="size-8 rounded-lg bg-muted text-muted-foreground flex items-center justify-center">
                              <PanelLeft className="size-4" />
                            </div>
                            <Badge
                              variant="outline"
                              className="text-[9px] font-bold border-border/80 text-muted-foreground"
                            >
                              Classic
                            </Badge>
                          </div>
                          <p className="text-xs font-bold text-foreground">Classic Vertical Sidebar</p>
                          <p className="text-[11px] text-muted-foreground leading-snug">
                            Traditional multi-section vertical sidebar displaying all tools and categories simultaneously.
                          </p>
                        </div>
                        <div className="flex items-center justify-between pt-2 border-t border-border/50 text-[10.5px]">
                          <span className="font-mono text-muted-foreground">Full Column</span>
                          {navigationLayout === "sidebar" ? (
                            <span className="font-bold text-primary flex items-center gap-1">
                              <Check className="size-3" /> Active
                            </span>
                          ) : (
                            <span className="text-muted-foreground">Select</span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="pt-3 border-t border-border/60 divide-y divide-border/60">
                    <div className="flex items-center justify-between pb-3">
                      <div className="space-y-0.5 max-w-[80%]">
                        <Label className="text-xs font-semibold">Appearance &amp; Color Theme</Label>
                        <p className="text-[11px] text-muted-foreground">
                          Switch between Day (clean paper surface) and Night (high-contrast dark mode) themes.
                        </p>
                      </div>
                      <ThemeToggle variant="pill" />
                    </div>

                    <div className="flex items-center justify-between pt-2">
                      <div className="space-y-0.5 max-w-[80%]">
                        <Label className="text-xs font-semibold">
                          Automatic Exam Timer by Default
                        </Label>
                        <p className="text-[11px] text-muted-foreground">
                          Automatically start official Cambridge clock (e.g. 1 hour for Paper 1) when
                          opening MCQ papers.
                        </p>
                      </div>
                      <Switch
                        checked={timedModeDefault}
                        onCheckedChange={(val) => {
                          setTimedModeDefault(val);
                          handleSaveAcademicPrefs({ timedModeDefault: val });
                        }}
                      />
                    </div>

                    <div className="flex items-center justify-between pt-3">
                      <div className="space-y-0.5 max-w-[80%]">
                        <Label className="text-xs font-semibold">
                          Show Diagram Equilibrium Annotations
                        </Label>
                        <p className="text-[11px] text-muted-foreground">
                          Highlight equilibrium shift lines (P1 to P2, Q1 to Q2) directly on vector
                          diagram canvases.
                        </p>
                      </div>
                      <Switch
                        checked={showDiagramLabels}
                        onCheckedChange={(val) => {
                          setShowDiagramLabels(val);
                          handleSaveAcademicPrefs({ showDiagramLabels: val });
                        }}
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* 4. Feature Tutorials & Platform Guides */}
              <div className="rounded-2xl border border-border/80 bg-card p-5 sm:p-6 shadow-xs space-y-4">
                <div className="border-b border-border/80 pb-3 flex items-center justify-between gap-2">
                  <div>
                    <h2 className="text-sm sm:text-base font-bold text-foreground flex items-center gap-2">
                      <GraduationCap className="size-4 text-purple-600 dark:text-purple-400" />
                      Feature Tutorials &amp; Walkthroughs
                    </h2>
                    <p className="text-xs text-muted-foreground">
                      Learn how every feature in Marginalite Upgrade works with step-by-step Cambridge
                      0455 guides.
                    </p>
                  </div>
                  <Badge
                    variant="outline"
                    className="text-xs font-semibold border-purple-500/30 text-purple-600 bg-purple-500/10"
                  >
                    {completedTutorialsCount} / {totalTutorialsCount} Seen
                  </Badge>
                </div>

                <div className="space-y-3.5 divide-y divide-border/60">
                  <div className="flex items-center justify-between pt-2">
                    <div className="space-y-0.5 max-w-[80%]">
                      <Label className="text-xs font-semibold">
                        Auto-Show Tutorials on New Features
                      </Label>
                      <p className="text-[11px] text-muted-foreground">
                        When you visit a feature for the first time, a helpful 60-second walkthrough
                        will show automatically.
                      </p>
                    </div>
                    <Switch checked={autoTutorialsEnabled} onCheckedChange={toggleAutoTutorials} />
                  </div>

                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-3">
                    <div className="space-y-0.5">
                      <p className="text-xs font-semibold text-foreground">
                        Launch Interactive Tutorials Directory
                      </p>
                      <p className="text-[11px] text-muted-foreground">
                        Browse all {totalTutorialsCount} feature guides with full examiner rubrics
                        and tips.
                      </p>
                    </div>
                    <Button
                      type="button"
                      size="sm"
                      onClick={() => openTutorial()}
                      className="h-8 text-xs font-semibold bg-purple-600 hover:bg-purple-700 text-white rounded-xl gap-1.5"
                    >
                      <GraduationCap className="size-3.5" />
                      Open Feature Tutorials
                    </Button>
                  </div>

                  <div className="flex items-center justify-between pt-3">
                    <div className="space-y-0.5">
                      <p className="text-xs font-semibold text-foreground">
                        Reset All Tutorial Seen Badges
                      </p>
                      <p className="text-[11px] text-muted-foreground">
                        Clear all seen statuses so you can re-experience first-time feature intros.
                      </p>
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        resetSeenStatus();
                        toast.success(
                          "Tutorial history reset. First-time walkthroughs will appear again.",
                        );
                      }}
                      className="h-8 text-xs rounded-xl gap-1 text-muted-foreground hover:text-foreground"
                    >
                      <RotateCcw className="size-3.5" />
                      Reset History
                    </Button>
                  </div>
                </div>
              </div>
            </div>

            {/* Right 5 Columns: Cambridge Candidate Dossier (Live Preview) & Grounding */}
            <div className="lg:col-span-5 space-y-6">
              {/* Cambridge Candidate Dossier (Official ID Card Card) */}
              <div className="rounded-2xl border-2 border-primary/40 bg-gradient-to-br from-card via-card to-primary/[0.05] p-5 sm:p-6 shadow-lg relative overflow-hidden space-y-4">
                {/* Holographic header stripe */}
                <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-primary via-indigo-500 to-amber-500" />
                <div className="absolute -right-10 -bottom-10 size-32 bg-primary/10 rounded-full blur-2xl pointer-events-none" />

                <div className="flex items-center justify-between border-b border-border/80 pb-3">
                  <div className="flex items-center gap-2">
                    <div className="size-6 rounded-md bg-primary/20 text-primary flex items-center justify-center font-bold text-xs">
                      M
                    </div>
                    <div>
                      <p className="text-[10px] font-extrabold tracking-wider uppercase text-primary">
                        Cambridge IGCSE 0455 Candidate Dossier
                      </p>
                      <p className="text-[9px] text-muted-foreground">
                        Official Academic Verification
                      </p>
                    </div>
                  </div>
                  <Badge className="bg-emerald-500/15 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400 text-[9px] font-extrabold uppercase">
                    Active
                  </Badge>
                </div>

                {/* Candidate Photo & Basic Info */}
                <div className="flex items-start gap-3.5">
                  <UserAvatar
                    avatarUrl={avatarUrl}
                    name={fullName || me.data?.fullName}
                    fallbackInitials={candidateInitials}
                    showStatusDot={true}
                    className="size-16 shadow-md ring-2 ring-primary/40 shrink-0"
                  />
                  <div className="min-w-0 flex-1">
                    <h3 className="text-base font-extrabold text-foreground truncate">
                      {fullName || me.data?.fullName || "Cambridge Candidate"}
                    </h3>
                    <p className="text-xs text-muted-foreground truncate font-medium">
                      {school || me.data?.school || "Independent Cambridge Centre"}
                    </p>
                    <div className="mt-1 flex flex-wrap items-center gap-1.5">
                      <span className="font-mono text-[10px] px-2 py-0.5 rounded-md bg-muted text-foreground font-bold">
                        {candidateRefNumber}
                      </span>
                      {calculatedAge && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-primary/10 text-primary font-medium">
                          {calculatedAge}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Candidate Statement / Bio Quote */}
                <div className="rounded-xl border border-border/70 bg-muted/30 p-3 relative">
                  <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-1 flex items-center gap-1">
                    <PenLine className="size-2.5" /> Personal Statement
                  </p>
                  <p className="text-xs text-foreground italic leading-relaxed">
                    {bio
                      ? `"${bio}"`
                      : '"No statement added yet. Add your university aspirations, economics interests, and target grades above."'}
                  </p>
                </div>

                {/* Academic Metadata Grid */}
                <div className="grid grid-cols-2 gap-2 text-xs pt-1">
                  <div className="rounded-lg border border-border/60 bg-card p-2.5 space-y-0.5">
                    <p className="text-[10px] text-muted-foreground uppercase font-bold">
                      Exam Target Series
                    </p>
                    <p className="font-bold text-foreground text-xs truncate">
                      {AVAILABLE_CAMBRIDGE_SERIES.find((s) => s.id === examSeries)?.label ||
                        "Multi-Year Average"}
                    </p>
                  </div>
                  <div className="rounded-lg border border-border/60 bg-card p-2.5 space-y-0.5">
                    <p className="text-[10px] text-muted-foreground uppercase font-bold">
                      Benchmark Grade
                    </p>
                    <p className="font-bold text-primary text-xs flex items-center gap-1">
                      <Award className="size-3.5" /> Target {targetGrade}
                    </p>
                  </div>
                  <div className="rounded-lg border border-border/60 bg-card p-2.5 space-y-0.5">
                    <p className="text-[10px] text-muted-foreground uppercase font-bold">
                      Curriculum Level
                    </p>
                    <p className="font-semibold text-foreground text-xs truncate">
                      {targetLevel === "igcse_core"
                        ? "IGCSE 0455 (P1 & P2)"
                        : targetLevel === "igcse_extended"
                          ? "IGCSE Level (P3 & P4)"
                          : "Cambridge IGCSE 0455 (Full Syllabus) (0455)"}
                    </p>
                  </div>
                  <div className="rounded-lg border border-border/60 bg-card p-2.5 space-y-0.5">
                    <p className="text-[10px] text-muted-foreground uppercase font-bold">
                      Platform Access
                    </p>
                    <p className="font-semibold text-emerald-600 dark:text-emerald-400 text-xs truncate">
                      Full Uncapped Access
                    </p>
                  </div>
                </div>

                {/* Footer seal */}
                <div className="pt-2 border-t border-border/70 flex items-center justify-between text-[10.5px]">
                  <span className="text-muted-foreground flex items-center gap-1">
                    <ShieldCheck className="size-3 text-primary" /> Verified Cambridge Dossier
                  </span>
                  <span className="font-mono text-muted-foreground text-[10px]">Syllabus 0455</span>
                </div>
              </div>

              {/* Cambridge IGCSE 0455 Knowledge Grounding Status */}
              <div className="rounded-2xl border border-primary/30 bg-primary/[0.03] p-5 shadow-xs space-y-3 text-xs">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="size-4 text-primary" />
                  <h3 className="font-bold text-foreground">Knowledge Base Grounding</h3>
                </div>
                <p className="text-muted-foreground text-[11.5px] leading-relaxed">
                  Evaluations and model answers are grounded in 259 official Cambridge mark schemes,
                  chief examiner reports, and syllabi via 2048-dimension vector search.
                </p>
                <div className="pt-2 border-t border-primary/20 flex items-center justify-between text-[11px]">
                  <span className="text-muted-foreground">RAG Accuracy Index:</span>
                  <Badge
                    variant="outline"
                    className="border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-[10px]"
                  >
                    100% Calibrated
                  </Badge>
                </div>
              </div>

              {/* Data & Privacy Controls */}
              <div className="rounded-2xl border border-border/80 bg-card p-5 shadow-xs space-y-3 text-xs">
                <div className="flex items-center gap-2 border-b border-border/80 pb-2.5">
                  <Shield className="size-4 text-muted-foreground" />
                  <h3 className="font-bold text-foreground">Data &amp; Privacy</h3>
                </div>

                <p className="text-[11.5px] text-muted-foreground leading-relaxed">
                  Your academic essays and performance trajectories are strictly private to you and
                  your authorized classroom teachers.
                </p>

                <div className="space-y-2 pt-1">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleExportData}
                    className="w-full text-xs h-8 justify-start"
                  >
                    <Download className="size-3.5 mr-2 text-primary" /> Export Candidate Dossier
                    JSON
                  </Button>

                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      if (
                        confirm(
                          "Reset local practice cache and filters? (Your saved essays on the server will NOT be touched).",
                        )
                      ) {
                        localStorage.removeItem("marginal_candidate_prefs");
                        toast.success("Local cache reset to defaults.");
                        window.location.reload();
                      }
                    }}
                    className="w-full text-xs h-8 justify-start text-muted-foreground hover:text-foreground"
                  >
                    <RotateCcw className="size-3.5 mr-2" /> Reset Local Preferences
                  </Button>
                </div>
              </div>

              {/* Platform Legal Policies & About Marginalite */}
              <div className="rounded-2xl border border-border/80 bg-card p-5 shadow-xs space-y-4 text-xs">
                <div className="flex items-center justify-between border-b border-border/80 pb-3">
                  <div className="flex items-center gap-2">
                    <div className="size-7 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
                      <Scale className="size-4" />
                    </div>
                    <div>
                      <h3 className="font-bold text-foreground text-sm flex items-center gap-1.5">
                        Terms, Privacy &amp; About
                      </h3>
                      <p className="text-[10.5px] text-muted-foreground">
                        Official terms of service, candidate data privacy, and platform background.
                      </p>
                    </div>
                  </div>
                  <Badge
                    variant="outline"
                    className="text-[10px] border-emerald-500/30 text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 font-bold"
                  >
                    Active
                  </Badge>
                </div>

                <Tabs defaultValue="terms" className="w-full">
                  <TabsList className="grid grid-cols-3 w-full h-8 bg-muted/60 p-0.5 rounded-lg text-[11px]">
                    <TabsTrigger value="terms" className="text-[11px] font-semibold gap-1 px-1">
                      <FileText className="size-3 text-blue-500" /> Terms
                    </TabsTrigger>
                    <TabsTrigger value="privacy" className="text-[11px] font-semibold gap-1 px-1">
                      <ShieldCheck className="size-3 text-emerald-500" /> Privacy
                    </TabsTrigger>
                    <TabsTrigger value="about" className="text-[11px] font-semibold gap-1 px-1">
                      <Info className="size-3 text-purple-500" /> About
                    </TabsTrigger>
                  </TabsList>

                  {/* Tab 1: Terms & Conditions */}
                  <TabsContent value="terms" className="space-y-3 pt-3 mt-0 focus-visible:outline-none">
                    <div className="flex flex-wrap gap-1.5">
                      <span className="px-2 py-0.5 rounded-md bg-blue-500/10 text-blue-600 dark:text-blue-400 text-[10px] font-semibold border border-blue-500/20">
                        Independent 0455 Tool
                      </span>
                      <span className="px-2 py-0.5 rounded-md bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-[10px] font-semibold border border-emerald-500/20">
                        100% Student Owned
                      </span>
                    </div>

                    <div className="space-y-2 rounded-xl border border-border/70 bg-muted/20 p-3 text-[11px] leading-relaxed text-muted-foreground">
                      <p className="flex items-start gap-1.5 text-foreground">
                        <Check className="size-3.5 text-emerald-500 shrink-0 mt-0.5" />
                        <span>
                          <strong className="text-foreground">Cambridge Independence:</strong> Marginalite is an independent platform and is not affiliated with, endorsed by, or connected to Cambridge Assessment International Education (CAIE) or UCLES.
                        </span>
                      </p>
                      <p className="flex items-start gap-1.5 text-foreground">
                        <Check className="size-3.5 text-emerald-500 shrink-0 mt-0.5" />
                        <span>
                          <strong className="text-foreground">AI Second Opinion:</strong> Marking is generated by calibrated AI models grounded in 259 mark schemes. Every mark is a diagnostic second opinion, never an official Cambridge examination mark.
                        </span>
                      </p>
                      <p className="flex items-start gap-1.5">
                        <Check className="size-3.5 text-emerald-500 shrink-0 mt-0.5" />
                        <span>
                          <strong className="text-foreground">Your Work Stays Yours:</strong> You retain full intellectual property ownership of all essays and responses submitted.
                        </span>
                      </p>
                      <p className="flex items-start gap-1.5">
                        <Check className="size-3.5 text-emerald-500 shrink-0 mt-0.5" />
                        <span>
                          <strong className="text-foreground">Academic Honesty:</strong> Submitting AI-generated essays or misrepresenting model answers as your own violates these terms and school honesty rules.
                        </span>
                      </p>
                    </div>

                    <div className="flex items-center gap-2 pt-1">
                      <Button
                        asChild
                        variant="outline"
                        size="sm"
                        className="flex-1 text-xs h-8 justify-between hover:bg-blue-500/10 hover:text-blue-600 hover:border-blue-500/30"
                      >
                        <Link to="/terms">
                          <span className="flex items-center gap-1.5">
                            <FileText className="size-3.5 text-blue-500" /> Read Full Terms
                          </span>
                          <ArrowRight className="size-3 text-muted-foreground" />
                        </Link>
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setLegalDialog("terms")}
                        className="text-[11px] h-8 px-2.5 text-muted-foreground hover:text-foreground"
                      >
                        Quick Summary
                      </Button>
                    </div>
                  </TabsContent>

                  {/* Tab 2: Privacy Policy */}
                  <TabsContent value="privacy" className="space-y-3 pt-3 mt-0 focus-visible:outline-none">
                    <div className="flex flex-wrap gap-1.5">
                      <span className="px-2 py-0.5 rounded-md bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-[10px] font-semibold border border-emerald-500/20">
                        Zero Ad-Tracking
                      </span>
                      <span className="px-2 py-0.5 rounded-md bg-purple-500/10 text-purple-600 dark:text-purple-400 text-[10px] font-semibold border border-purple-500/20">
                        Full Data Erasure
                      </span>
                    </div>

                    <div className="space-y-2 rounded-xl border border-border/70 bg-muted/20 p-3 text-[11px] leading-relaxed text-muted-foreground">
                      <p className="flex items-start gap-1.5 text-foreground">
                        <Check className="size-3.5 text-emerald-500 shrink-0 mt-0.5" />
                        <span>
                          <strong className="text-foreground">Confidential Essays:</strong> Submitted work and performance trends are private to you and designated classroom educators.
                        </span>
                      </p>
                      <p className="flex items-start gap-1.5 text-foreground">
                        <Check className="size-3.5 text-emerald-500 shrink-0 mt-0.5" />
                        <span>
                          <strong className="text-foreground">Never Sold to Advertisers:</strong> Student essays and account records are never sold, rented, or monetized for commercial advertising.
                        </span>
                      </p>
                      <p className="flex items-start gap-1.5">
                        <Check className="size-3.5 text-emerald-500 shrink-0 mt-0.5" />
                        <span>
                          <strong className="text-foreground">Anonymised Showcase:</strong> Top distinction essays featured in the Exemplar Showcase are stripped of all personal names and school tags.
                        </span>
                      </p>
                      <p className="flex items-start gap-1.5">
                        <Check className="size-3.5 text-emerald-500 shrink-0 mt-0.5" />
                        <span>
                          <strong className="text-foreground">Export &amp; Deletion Rights:</strong> You can export your JSON dossier anytime (above) or request complete deletion of your account.
                        </span>
                      </p>
                    </div>

                    <div className="flex items-center gap-2 pt-1">
                      <Button
                        asChild
                        variant="outline"
                        size="sm"
                        className="flex-1 text-xs h-8 justify-between hover:bg-emerald-500/10 hover:text-emerald-600 hover:border-emerald-500/30"
                      >
                        <Link to="/privacy">
                          <span className="flex items-center gap-1.5">
                            <ShieldCheck className="size-3.5 text-emerald-500" /> Read Full Privacy
                          </span>
                          <ArrowRight className="size-3 text-muted-foreground" />
                        </Link>
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setLegalDialog("privacy")}
                        className="text-[11px] h-8 px-2.5 text-muted-foreground hover:text-foreground"
                      >
                        Quick Summary
                      </Button>
                    </div>
                  </TabsContent>

                  {/* Tab 3: About Marginalite */}
                  <TabsContent value="about" className="space-y-3 pt-3 mt-0 focus-visible:outline-none">
                    <div className="flex flex-wrap gap-1.5">
                      <span className="px-2 py-0.5 rounded-md bg-purple-500/10 text-purple-600 dark:text-purple-400 text-[10px] font-semibold border border-purple-500/20">
                        Cambridge IGCSE 0455 Focused
                      </span>
                      <span className="px-2 py-0.5 rounded-md bg-amber-500/10 text-amber-600 dark:text-amber-400 text-[10px] font-semibold border border-amber-500/20">
                        259 Mark Schemes
                      </span>
                    </div>

                    <div className="space-y-2 rounded-xl border border-border/70 bg-muted/20 p-3 text-[11px] leading-relaxed text-muted-foreground">
                      <p className="flex items-start gap-1.5 text-foreground">
                        <Check className="size-3.5 text-emerald-500 shrink-0 mt-0.5" />
                        <span>
                          <strong className="text-foreground">The 14-Day Feedback Problem:</strong> Traditional essay grading takes 2 weeks. Marginalite closes the feedback loop instantly so students learn before errors become habits.
                        </span>
                      </p>
                      <p className="flex items-start gap-1.5 text-foreground">
                        <Check className="size-3.5 text-emerald-500 shrink-0 mt-0.5" />
                        <span>
                          <strong className="text-foreground">259 Mark Scheme Grounding:</strong> Calibrated with official Cambridge IGCSE 0455 mark schemes, chief examiner reports, and real grade boundaries.
                        </span>
                      </p>
                      <p className="flex items-start gap-1.5">
                        <Check className="size-3.5 text-emerald-500 shrink-0 mt-0.5" />
                        <span>
                          <strong className="text-foreground">Founding Team:</strong> Built by Saikrish Karthikeyan &amp; Suthir R to democratize top-tier economics pedagogy.
                        </span>
                      </p>
                      <p className="flex items-start gap-1.5">
                        <Check className="size-3.5 text-emerald-500 shrink-0 mt-0.5" />
                        <span>
                          <strong className="text-foreground">Comprehensive Tools:</strong> Complete Cambridge IGCSE 0455 coverage: Paper 1 MCQs, Paper 2 Data Response &amp; Structured Questions (2m–8m), vector diagrams, and curated question bank.
                        </span>
                      </p>
                    </div>

                    <div className="flex items-center gap-2 pt-1">
                      <Button
                        asChild
                        variant="outline"
                        size="sm"
                        className="flex-1 text-xs h-8 justify-between hover:bg-purple-500/10 hover:text-purple-600 hover:border-purple-500/30"
                      >
                        <Link to="/about">
                          <span className="flex items-center gap-1.5">
                            <Info className="size-3.5 text-purple-500" /> Read About Marginalite
                          </span>
                          <ArrowRight className="size-3 text-muted-foreground" />
                        </Link>
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setLegalDialog("about")}
                        className="text-[11px] h-8 px-2.5 text-muted-foreground hover:text-foreground"
                      >
                        Quick Summary
                      </Button>
                    </div>
                  </TabsContent>
                </Tabs>
              </div>
            </div>
          </div>
        )}

        {/* Platform Legal & Policy Footer */}
        <div className="pt-6 border-t border-border/80 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-muted-foreground">
          <div className="flex items-center gap-2">
            <div className="size-5 rounded-md bg-primary/10 text-primary flex items-center justify-center font-bold text-[10px]">
              m
            </div>
            <span className="font-semibold text-foreground">Marginalite Economics Engine</span>
            <span>&bull;</span>
            <span>Grounded for Cambridge IGCSE 0455</span>
          </div>
          <div className="flex items-center gap-3.5 text-[11px] font-medium">
            <Link
              to="/about"
              className="hover:text-primary transition-colors underline-offset-4 hover:underline"
            >
              About Marginalite
            </Link>
            <span className="text-border/80">&bull;</span>
            <Link
              to="/terms"
              className="hover:text-primary transition-colors underline-offset-4 hover:underline"
            >
              Terms &amp; Conditions
            </Link>
            <span className="text-border/80">&bull;</span>
            <Link
              to="/privacy"
              className="hover:text-primary transition-colors underline-offset-4 hover:underline"
            >
              Privacy Policy
            </Link>
          </div>
        </div>
      </div>

      {/* Quick In-App Legal & About Dialog */}
      <Dialog open={legalDialog !== null} onOpenChange={(open) => !open && setLegalDialog(null)}>
        <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
          {legalDialog === "terms" && (
            <div className="space-y-4">
              <DialogHeader className="text-left space-y-1">
                <p className="text-[10px] font-bold tracking-wider text-blue-600 dark:text-blue-400 uppercase">
                  Official Terms of Use
                </p>
                <DialogTitle className="text-lg font-bold flex items-center gap-2">
                  <FileText className="size-5 text-blue-500" />
                  Marginalite Terms &amp; Conditions
                </DialogTitle>
                <DialogDescription className="text-xs">
                  Summary of official terms governing your Cambridge IGCSE 0455 practice and evaluation.
                </DialogDescription>
              </DialogHeader>

              <div className="rounded-xl border border-blue-500/25 bg-blue-500/5 p-3.5 text-xs space-y-2">
                <p className="font-semibold text-foreground">Key Principles in Short:</p>
                <ul className="space-y-2 text-[11.5px] text-muted-foreground list-disc list-inside">
                  <li>
                    <strong className="text-foreground">Independent Tool:</strong> Marginalite is independent and not affiliated with, endorsed by, or connected to Cambridge Assessment International Education or UCLES.
                  </li>
                  <li>
                    <strong className="text-foreground">Formative Second Opinion:</strong> Marking is AI-generated and calibrated against 259 official mark schemes. It is a diagnostic second opinion, never an official Cambridge mark.
                  </li>
                  <li>
                    <strong className="text-foreground">Student Ownership:</strong> You retain complete copyright and ownership of all submitted essays and responses.
                  </li>
                  <li>
                    <strong className="text-foreground">Academic Honesty:</strong> Submitting AI-generated text as your own work breaches these terms and school academic honesty rules.
                  </li>
                  <li>
                    <strong className="text-foreground">Exemplar Showcase:</strong> Only top distinction essays (&gt;10/12, &gt;15/20) may be featured in strictly de-identified form for peer learning.
                  </li>
                </ul>
              </div>

              <div className="flex items-center justify-between pt-2 border-t border-border/80">
                <Button variant="ghost" size="sm" onClick={() => setLegalDialog(null)} className="text-xs">
                  Close
                </Button>
                <Button asChild size="sm" className="text-xs font-semibold gap-1.5">
                  <Link to="/terms" onClick={() => setLegalDialog(null)}>
                    Open Full Terms Page <ArrowRight className="size-3.5" />
                  </Link>
                </Button>
              </div>
            </div>
          )}

          {legalDialog === "privacy" && (
            <div className="space-y-4">
              <DialogHeader className="text-left space-y-1">
                <p className="text-[10px] font-bold tracking-wider text-emerald-600 dark:text-emerald-400 uppercase">
                  Student Privacy &amp; Data Rights
                </p>
                <DialogTitle className="text-lg font-bold flex items-center gap-2">
                  <ShieldCheck className="size-5 text-emerald-500" />
                  Marginalite Privacy Policy
                </DialogTitle>
                <DialogDescription className="text-xs">
                  How your submissions, account details, and diagnostic trajectories are protected.
                </DialogDescription>
              </DialogHeader>

              <div className="rounded-xl border border-emerald-500/25 bg-emerald-500/5 p-3.5 text-xs space-y-2">
                <p className="font-semibold text-foreground">Privacy Commitments:</p>
                <ul className="space-y-2 text-[11.5px] text-muted-foreground list-disc list-inside">
                  <li>
                    <strong className="text-foreground">Strict Confidentiality:</strong> Your essays and progress are private to you and designated teachers.
                  </li>
                  <li>
                    <strong className="text-foreground">Never Sold to Advertisers:</strong> We never sell student data or essays to advertisers or third parties.
                  </li>
                  <li>
                    <strong className="text-foreground">Anonymised Peer Learning:</strong> Any exemplar answers featured are stripped of all names, emails, and school tags.
                  </li>
                  <li>
                    <strong className="text-foreground">Full Data Portability:</strong> Export your complete candidate dossier in JSON format anytime from Settings.
                  </li>
                  <li>
                    <strong className="text-foreground">Right to Erasure:</strong> You can request permanent account and data deletion at any time.
                  </li>
                </ul>
              </div>

              <div className="flex items-center justify-between pt-2 border-t border-border/80">
                <Button variant="ghost" size="sm" onClick={() => setLegalDialog(null)} className="text-xs">
                  Close
                </Button>
                <Button asChild size="sm" className="text-xs font-semibold gap-1.5">
                  <Link to="/privacy" onClick={() => setLegalDialog(null)}>
                    Open Full Privacy Page <ArrowRight className="size-3.5" />
                  </Link>
                </Button>
              </div>
            </div>
          )}

          {legalDialog === "about" && (
            <div className="space-y-4">
              <DialogHeader className="text-left space-y-1">
                <p className="text-[10px] font-bold tracking-wider text-purple-600 dark:text-purple-400 uppercase">
                  Our Mission &amp; Origins
                </p>
                <DialogTitle className="text-lg font-bold flex items-center gap-2">
                  <Info className="size-5 text-purple-500" />
                  About Marginalite AI
                </DialogTitle>
                <DialogDescription className="text-xs">
                  Closing the 14-day essay turnaround gap for Cambridge Economics (0455).
                </DialogDescription>
              </DialogHeader>

              <div className="rounded-xl border border-purple-500/25 bg-purple-500/5 p-3.5 text-xs space-y-2">
                <p className="font-semibold text-foreground">Pedagogical Vision:</p>
                <ul className="space-y-2 text-[11.5px] text-muted-foreground list-disc list-inside">
                  <li>
                    <strong className="text-foreground">Instant Feedback:</strong> Built because the two-week delay in teacher marking allows misconceptions to calcify.
                  </li>
                  <li>
                    <strong className="text-foreground">259 Mark Schemes:</strong> Grounded via vector search in 15+ years of Cambridge IGCSE 0455 mark schemes and examiner reports.
                  </li>
                  <li>
                    <strong className="text-foreground">Full Syllabus:</strong> Supports Paper 1 (MCQ), Paper 2 (Data Response/Essays), Paper 1 (MCQ), and Paper 2 (IGCSE).
                  </li>
                  <li>
                    <strong className="text-foreground">Founders:</strong> Created by Saikrish Karthikeyan and Suthir R with a vision of accessible, rigorous economics pedagogy.
                  </li>
                </ul>
              </div>

              <div className="flex items-center justify-between pt-2 border-t border-border/80">
                <Button variant="ghost" size="sm" onClick={() => setLegalDialog(null)} className="text-xs">
                  Close
                </Button>
                <Button asChild size="sm" className="text-xs font-semibold gap-1.5">
                  <Link to="/about" onClick={() => setLegalDialog(null)}>
                    Open Full About Page <ArrowRight className="size-3.5" />
                  </Link>
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
