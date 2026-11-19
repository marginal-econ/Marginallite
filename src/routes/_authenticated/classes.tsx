import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import {
  AlertCircle,
  Archive,
  ArrowLeft,
  Award,
  BarChart3,
  BookOpen,
  Calendar,
  Camera,
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  Clipboard,
  Clock,
  Copy,
  Download,
  ExternalLink,
  Eye,
  FileCheck2,
  FileEdit,
  FileText,
  Filter,
  GraduationCap,
  HelpCircle,
  Layers,
  ListChecks,
  Loader2,
  LogOut,
  Mail,
  Maximize2,
  MessageCircle,
  MessageSquare,
  MoreVertical,
  PenLine,
  Pin,
  Plus,
  RefreshCw,
  School,
  Search,
  Send,
  Shield,
  ShieldAlert,
  Sparkles,
  Target,
  Trash2,
  TrendingUp,
  Upload,
  UserCheck,
  UserMinus,
  UserPlus,
  UsersRound,
  Wand2,
  X,
} from "lucide-react";
import type { ReactNode } from "react";
import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";

import { PageHeader } from "@/components/app/app-shell";
import { HandwritingUpload } from "@/components/app/handwriting-upload";
import { extractTextFromFile } from "@/lib/extract-text";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import {
  addClassroomStudent,
  addClassroomTeacher,
  addComment,
  archiveClassroom,
  createAnnouncement,
  createClassroom,
  createClassroomAssignment,
  deleteAnnouncement,
  deleteClassroom,
  deleteClassroomAssignment,
  deleteClassroomMessage,
  deleteComment,
  getAssignmentSubmissions,
  getClassroomAggregateAnalytics,
  getClassroomGradebook,
  getClassroomRoster,
  getClassroomTeachers,
  getStudentClassroomInsights,
  getStudentClassroomOverview,
  getStudentLifetimePortfolio,
  gradeAssignmentSubmission,
  inferCambridgeEssayMaxMark,
  joinClassroom,
  leaveClassroom,
  listAnnouncements,
  listClassroomAssignments,
  listClassroomBankQuestions,
  listClassroomMessages,
  listClassrooms,
  removeClassroomMember,
  removeClassroomTeacher,
  rotateClassroomCode,
  saveAssignmentDraft,
  sendClassroomMessage,
  submitAssignmentWork,
  togglePinAnnouncement,
  togglePinClassroomMessage,
} from "@/lib/classroom.functions";
import { listMcqPapers } from "@/lib/mcq-papers.functions";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/classes")({
  component: ClassesPage,
});

type Classroom = {
  id: string;
  teacher_id: string;
  name: string;
  level: string;
  join_code: string;
  archived: boolean;
  created_at: string;
  teacher_name?: string;
  teacher_school?: string | null;
  teacher_avatar?: string | null;
  student_count?: number;
  assignment_count?: number;
  is_owner?: boolean;
};

type RosterStudent = {
  membership_id: string;
  student_id: string;
  full_name: string | null;
  email: string;
  school: string | null;
  avatar_url: string | null;
  joined_at: string;
};

type ClassroomTeacher = {
  id: string;
  teacherId: string;
  fullName: string;
  email: string;
  school: string | null;
  avatarUrl: string | null;
  owner: boolean;
};

type StudentInsights = {
  student: {
    id: string;
    email: string;
    full_name: string | null;
    school: string | null;
    last_seen: string | null;
  };
  summary: {
    essays_marked: number;
    average_essay_percent: number | null;
    mcq_attempts: number;
    mcq_correct: number;
    mcq_total: number;
    generated_essays: number;
    generated_questions: number;
    live_examiner_sessions: number;
    ai_calls: number;
  };
  essays: Array<{
    id: string;
    question: string;
    mark: number | null;
    max_mark: number;
    created_at: string;
    ao1: number | null;
    ao2: number | null;
    ao3: number | null;
  }>;
  mcq_attempts: Array<{
    id: string;
    kind: string;
    title: string;
    topic: string | null;
    score: number | null;
    total: number;
    wrong: number;
    completed_at: string | null;
  }>;
  topics: Array<{
    topic: string;
    attempted: number;
    correct_count: number;
    accuracy_pct: number | null;
  }>;
  live_sessions: Array<{
    id: string;
    question: string;
    topic: string;
    level: string;
    words: number;
    issues: number;
    updated_at: string;
  }>;
};

function formatLevel(level: string) {
  if (level === "as") return "IGCSE 0455";
  if (level === "a2") return "IGCSE Level";
  return "AS & IGCSE Mixed";
}

function getInitials(name: string) {
  if (!name) return "U";
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((s) => s[0].toUpperCase())
    .join("");
}

export function ClassesPage() {
  const queryClient = useQueryClient();
  const listFn = useServerFn(listClassrooms);
  const [activeClassroomId, setActiveClassroomId] = useState<string | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ["classrooms"],
    queryFn: () => listFn(),
  });

  const role = data?.role ?? "student";
  const isAdmin = role === "admin";
  const isTeacher = role === "teacher";
  const classes = useMemo(() => (data?.classes ?? []) as Classroom[], [data?.classes]);
  const activeClassroom = useMemo(
    () => classes.find((c) => c.id === activeClassroomId) ?? null,
    [classes, activeClassroomId],
  );

  // If active classroom is selected
  if (activeClassroom) {
    return (
      <ClassroomDetailView
        classroom={activeClassroom}
        role={role}
        isAdmin={isAdmin}
        onBack={() => setActiveClassroomId(null)}
      />
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <PageHeader
        title="Classroom"
        description="Cambridge Economics cohorts, collaborative discussions, real-time assignments, and grading."
      />

      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        {/* Top Action Bar */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-card p-6 rounded-2xl border border-border shadow-sm">
          <div>
            <h2 className="text-xl font-semibold text-foreground tracking-tight flex items-center gap-2">
              <GraduationCap className="h-6 w-6 text-purple-400" />
              {isAdmin
                ? "Classroom Administration"
                : isTeacher
                  ? "My Teaching Classes"
                  : "Enrolled Classes"}
            </h2>
            <p className="text-sm text-muted-foreground mt-1">
              {isAdmin
                ? "Admins can create, assign teachers, and delete classrooms. All teachers and students access assigned cohorts."
                : isTeacher
                  ? "Manage class streams, interact in class chat, assign Cambridge essays, review AI grades, and view gradebooks."
                  : "Access assignments, chat with classmates and teachers, submit essays, and view feedback."}
            </p>
          </div>

          <div className="flex items-center gap-3 w-full sm:w-auto">
            {isAdmin || isTeacher ? (
              <CreateClassDialog
                onCreated={() => queryClient.invalidateQueries({ queryKey: ["classrooms"] })}
              />
            ) : (
              <JoinClassDialog
                onJoined={() => queryClient.invalidateQueries({ queryKey: ["classrooms"] })}
              />
            )}
          </div>
        </div>

        {/* Classes Grid */}
        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3].map((n) => (
              <div
                key={n}
                className="h-64 rounded-2xl bg-card/40 border border-border animate-pulse"
              />
            ))}
          </div>
        ) : classes.length === 0 ? (
          <div className="text-center py-20 px-4 rounded-2xl border border-dashed border-border bg-muted/20">
            <School className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-medium text-foreground">No classes found</h3>
            <p className="text-sm text-muted-foreground max-w-md mx-auto mt-2 mb-6">
              {isAdmin || isTeacher
                ? "You have not created any classrooms yet. Click 'Create Class' above to launch your Cambridge cohorts."
                : "You haven't joined any classrooms yet. Ask your Economics teacher for a 6-character class code to join."}
            </p>
            {isAdmin || isTeacher ? (
              <CreateClassDialog
                onCreated={() => queryClient.invalidateQueries({ queryKey: ["classrooms"] })}
              />
            ) : (
              <JoinClassDialog
                onJoined={() => queryClient.invalidateQueries({ queryKey: ["classrooms"] })}
              />
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {classes.map((cls) => (
              <ClassCard
                key={cls.id}
                classroom={cls}
                role={role}
                isAdmin={isAdmin}
                onSelect={() => setActiveClassroomId(cls.id)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function ClassCard({
  classroom,
  role,
  isAdmin,
  onSelect,
}: {
  classroom: Classroom;
  role: "student" | "teacher" | "admin";
  isAdmin: boolean;
  onSelect: () => void;
}) {
  const queryClient = useQueryClient();
  const deleteClassFn = useServerFn(deleteClassroom);
  const [copied, setCopied] = useState(false);

  const copyCode = (e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(classroom.join_code);
    setCopied(true);
    toast.success(`Copied join code: ${classroom.join_code}`);
    setTimeout(() => setCopied(false), 2000);
  };

  const bannerGradients = [
    "from-purple-900 via-indigo-900 to-slate-900",
    "from-blue-900 via-indigo-900 to-slate-900",
    "from-violet-900 via-purple-900 to-slate-900",
    "from-emerald-900 via-teal-900 to-slate-900",
  ];
  const gradient = bannerGradients[classroom.name.length % bannerGradients.length];

  return (
    <div
      onClick={onSelect}
      className="group relative flex flex-col justify-between overflow-hidden rounded-2xl border border-border bg-card shadow-sm transition-all duration-200 hover:-translate-y-1 hover:border-purple-500/50 hover:shadow-md cursor-pointer"
    >
      {/* Top Themed Header */}
      <div
        className={cn(
          "p-6 bg-gradient-to-br relative text-white border-b border-border/80",
          gradient,
        )}
      >
        <div className="flex items-start justify-between gap-2">
          <div className="space-y-1 pr-4">
            <Badge
              variant="outline"
              className="bg-black/30 text-white border-white/20 text-xs uppercase tracking-wider backdrop-blur-sm"
            >
              {formatLevel(classroom.level)}
            </Badge>
            <h3 className="text-xl font-bold text-white tracking-tight line-clamp-1 group-hover:text-purple-200 transition-colors">
              {classroom.name}
            </h3>
          </div>

          <div className="flex items-center gap-1">
            {role !== "student" && (
              <button
                onClick={copyCode}
                title="Click to copy join code"
                className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-black/30 hover:bg-black/50 border border-white/20 text-xs font-mono text-white transition-colors"
              >
                {copied ? (
                  <Check className="h-3.5 w-3.5 text-emerald-400" />
                ) : (
                  <Copy className="h-3.5 w-3.5 text-white/80" />
                )}
                <span>{classroom.join_code}</span>
              </button>
            )}

            {isAdmin && (
              <Button
                variant="ghost"
                size="sm"
                onClick={(e) => {
                  e.stopPropagation();
                  if (
                    confirm(
                      `Permanently delete classroom "${classroom.name}"? This action is only available to Admins.`,
                    )
                  ) {
                    deleteClassFn({ data: { classroomId: classroom.id } }).then(() => {
                      toast.success("Classroom permanently deleted");
                      queryClient.invalidateQueries({ queryKey: ["classrooms"] });
                    });
                  }
                }}
                className="text-white/70 hover:text-rose-300 h-7 w-7 p-0 bg-black/30 hover:bg-black/50"
                title="Admin: Delete Classroom"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            )}
          </div>
        </div>

        {/* Teacher Info */}
        <div className="mt-4 flex items-center gap-2.5 text-xs text-white">
          <div className="h-7 w-7 rounded-full bg-purple-600/60 border border-purple-400/40 flex items-center justify-center font-bold text-white text-xs">
            {getInitials(classroom.teacher_name || "Teacher")}
          </div>
          <span className="font-medium text-white truncate">
            {classroom.teacher_name || "Economics Faculty"}
          </span>
          {classroom.teacher_school && (
            <span className="text-purple-200 truncate text-[11px]">
              • {classroom.teacher_school}
            </span>
          )}
        </div>
      </div>

      {/* Body Stats & Details */}
      <div className="p-5 flex items-center justify-between bg-card text-xs text-muted-foreground border-t border-border">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1.5" title="Enrolled Students">
            <UsersRound className="h-4 w-4 text-muted-foreground" />
            <span className="font-semibold text-foreground">{classroom.student_count ?? 0}</span>
            <span className="text-muted-foreground">students</span>
          </div>

          <div className="flex items-center gap-1.5" title="Assignments">
            <FileText className="h-4 w-4 text-muted-foreground" />
            <span className="font-semibold text-foreground">{classroom.assignment_count ?? 0}</span>
            <span className="text-muted-foreground">tasks</span>
          </div>
        </div>

        <div className="flex items-center text-purple-600 dark:text-purple-400 font-semibold group-hover:translate-x-1 transition-transform">
          <span>Open</span>
          <ChevronRight className="h-4 w-4 ml-0.5" />
        </div>
      </div>
    </div>
  );
}

function JoinClassDialog({ onJoined }: { onJoined: () => void }) {
  const [open, setOpen] = useState(false);
  const [code, setCode] = useState("");
  const joinFn = useServerFn(joinClassroom);

  const mutation = useMutation({
    mutationFn: async () => {
      return joinFn({
        data: {
          code: code.trim().toUpperCase(),
          acknowledgeTeacherAccess: true,
        },
      });
    },
    onSuccess: (res) => {
      toast.success(`Joined class: ${res.classroom_name}`);
      setCode("");
      setOpen(false);
      onJoined();
    },
    onError: (err: Error) => {
      toast.error(err.message || "Failed to join classroom");
    },
  });

  return (
    <>
      <Button
        onClick={() => setOpen(true)}
        className="bg-purple-600 hover:bg-purple-500 text-white font-medium shadow-md shadow-purple-500/10"
      >
        <Plus className="h-4 w-4 mr-2" />
        Join Class
      </Button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in">
          <div className="w-full max-w-md bg-card border border-border rounded-2xl p-6 shadow-2xl space-y-5 text-left">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold text-foreground flex items-center gap-2">
                <UsersRound className="h-5 w-5 text-purple-400" />
                Join a Classroom
              </h3>
              <button
                onClick={() => setOpen(false)}
                className="text-muted-foreground hover:text-foreground transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <p className="text-xs text-muted-foreground">
              Ask your teacher or administrator for the 6-character class code, then enter it below.
            </p>

            <div className="space-y-2">
              <Label className="text-xs font-semibold text-foreground">Class Code</Label>
              <Input
                value={code}
                onChange={(e) => setCode(e.target.value.toUpperCase())}
                placeholder="e.g. 7X9K2A"
                maxLength={10}
                className="font-mono text-center tracking-widest text-lg bg-background border-input text-foreground placeholder:text-muted-foreground focus:border-purple-500"
              />
            </div>

            <div className="p-3 bg-purple-50 dark:bg-purple-950/30 border border-purple-200 dark:border-purple-900/40 rounded-xl text-xs text-purple-900 dark:text-purple-300">
              By joining, your assigned essays and test results for this class will be visible to
              your teachers and administrators.
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <Button
                variant="ghost"
                onClick={() => setOpen(false)}
                className="text-muted-foreground hover:text-foreground"
              >
                Cancel
              </Button>
              <Button
                onClick={() => mutation.mutate()}
                disabled={code.trim().length < 4 || mutation.isPending}
                className="bg-purple-600 hover:bg-purple-500 text-white font-medium"
              >
                {mutation.isPending ? "Joining..." : "Join Class"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

function CreateClassDialog({ onCreated }: { onCreated: () => void }) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [level, setLevel] = useState<"as" | "a2" | "mixed">("as");
  const createFn = useServerFn(createClassroom);

  const mutation = useMutation({
    mutationFn: async () => {
      return createFn({
        data: {
          name: name.trim(),
          level,
        },
      });
    },
    onSuccess: (res) => {
      toast.success(`Created classroom "${res.name}" with join code ${res.join_code}`);
      setName("");
      setOpen(false);
      onCreated();
    },
    onError: (err: Error) => {
      toast.error(err.message || "Failed to create class");
    },
  });

  return (
    <>
      <Button
        onClick={() => setOpen(true)}
        className="bg-purple-600 hover:bg-purple-500 text-white font-medium shadow-md shadow-purple-500/10"
      >
        <School className="h-4 w-4 mr-2 text-purple-300" />
        Create Classroom
      </Button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in">
          <div className="w-full max-w-md bg-card border border-border rounded-2xl p-6 shadow-2xl space-y-5 text-left">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold text-foreground flex items-center gap-2">
                <School className="h-5 w-5 text-purple-400" />
                Create Cambridge Classroom
              </h3>
              <button
                onClick={() => setOpen(false)}
                className="text-muted-foreground hover:text-foreground transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-foreground">Class Name</Label>
                <Input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Year 11 IGCSE 0455 Economics Cohort A"
                  className="bg-background border-input text-foreground placeholder:text-muted-foreground focus:border-purple-500"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-foreground">
                  Cambridge Syllabus Level
                </Label>
                <Select value={level} onValueChange={(v: "as" | "a2" | "mixed") => setLevel(v)}>
                  <SelectTrigger className="bg-background border-input text-foreground focus:border-purple-500">
                    <SelectValue placeholder="Select level" />
                  </SelectTrigger>
                  <SelectContent className="bg-popover border-border text-popover-foreground">
                    <SelectItem value="as">IGCSE 0455 (Units 1 - 5)</SelectItem>
                    <SelectItem value="a2">IGCSE Level (Units 6 - 10)</SelectItem>
                    <SelectItem value="mixed">Both AS & IGCSE</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="p-3 rounded-xl bg-purple-50 dark:bg-purple-950/30 border border-purple-200 dark:border-purple-900/40 text-xs text-purple-900 dark:text-purple-300">
              Teachers can create up to 3 active classrooms. Once created, you can invite co-teachers and students, assign essays, and review grades.
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <Button
                variant="ghost"
                onClick={() => setOpen(false)}
                className="text-muted-foreground hover:text-foreground"
              >
                Cancel
              </Button>
              <Button
                onClick={() => mutation.mutate()}
                disabled={!name.trim() || mutation.isPending}
                className="bg-purple-600 hover:bg-purple-500 text-white font-medium"
              >
                {mutation.isPending ? "Creating..." : "Create Class"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

// =========================================================================
// GOOGLE CLASSROOM UPGRADE: FULL 5-TAB EXPERIENCE
// =========================================================================

function ClassroomDetailView({
  classroom,
  role,
  isAdmin,
  onBack,
}: {
  classroom: Classroom;
  role: "student" | "teacher" | "admin";
  isAdmin: boolean;
  onBack: () => void;
}) {
  const [activeTab, setActiveTab] = useState<string>("stream");
  const isStaff = role === "teacher" || role === "admin";

  return (
    <div className="min-h-screen bg-background text-foreground pb-16">
      {/* Sticky GCR Top Navigation */}
      <div className="sticky top-0 z-40 bg-background/95 backdrop-blur-md border-b border-border">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-4">
              <Button
                variant="ghost"
                size="sm"
                onClick={onBack}
                className="text-muted-foreground hover:text-foreground -ml-2"
              >
                <ArrowLeft className="h-4 w-4 mr-1.5" />
                All Classes
              </Button>

              <div className="hidden sm:block h-5 w-[1px] bg-muted" />

              <div className="flex items-center gap-2.5">
                <h1 className="text-lg font-bold text-foreground tracking-tight truncate max-w-xs sm:max-w-md">
                  {classroom.name}
                </h1>
                <Badge
                  variant="outline"
                  className="bg-purple-100 dark:bg-purple-950/40 text-purple-800 dark:text-purple-300 border-purple-200 dark:border-purple-800 text-[10px] uppercase"
                >
                  {formatLevel(classroom.level)}
                </Badge>
              </div>
            </div>

            {/* GCR 5-Tabs Navigation Header */}
            <div className="flex items-center gap-1 p-1 bg-muted/60 dark:bg-muted/40 rounded-xl border border-border/60 overflow-x-auto">
              <button
                onClick={() => setActiveTab("stream")}
                className={cn(
                  "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all whitespace-nowrap cursor-pointer",
                  activeTab === "stream"
                    ? "bg-purple-600 text-white shadow-sm shadow-purple-500/20"
                    : "text-muted-foreground hover:text-foreground hover:bg-background/80",
                )}
              >
                <Layers className="h-3.5 w-3.5" />
                <span>Stream</span>
              </button>

              <button
                onClick={() => setActiveTab("classwork")}
                className={cn(
                  "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all whitespace-nowrap cursor-pointer",
                  activeTab === "classwork"
                    ? "bg-purple-600 text-white shadow-sm shadow-purple-500/20"
                    : "text-muted-foreground hover:text-foreground hover:bg-background/80",
                )}
              >
                <BookOpen className="h-3.5 w-3.5" />
                <span>Classwork</span>
              </button>

              <button
                onClick={() => setActiveTab("chat")}
                className={cn(
                  "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all whitespace-nowrap cursor-pointer",
                  activeTab === "chat"
                    ? "bg-purple-600 text-white shadow-sm shadow-purple-500/20"
                    : "text-muted-foreground hover:text-foreground hover:bg-background/80",
                )}
              >
                <MessageCircle className="h-3.5 w-3.5" />
                <span>Class Chat</span>
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse ml-0.5" />
              </button>

              <button
                onClick={() => setActiveTab("people")}
                className={cn(
                  "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all whitespace-nowrap cursor-pointer",
                  activeTab === "people"
                    ? "bg-purple-600 text-white shadow-sm shadow-purple-500/20"
                    : "text-muted-foreground hover:text-foreground hover:bg-background/80",
                )}
              >
                <UsersRound className="h-3.5 w-3.5" />
                <span>People</span>
              </button>

              {isStaff && (
                <button
                  onClick={() => setActiveTab("grades")}
                  className={cn(
                    "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all whitespace-nowrap cursor-pointer",
                    activeTab === "grades"
                      ? "bg-purple-600 text-white shadow-sm shadow-purple-500/20"
                      : "text-muted-foreground hover:text-foreground hover:bg-background/80",
                  )}
                >
                  <Award className="h-3.5 w-3.5" />
                  <span>Grades</span>
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Main Tab Content */}
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-6">
        {activeTab === "stream" && (
          <StreamTab
            classroom={classroom}
            isStaff={isStaff}
            onGoToClasswork={() => setActiveTab("classwork")}
          />
        )}
        {activeTab === "classwork" && (
          <ClassworkTab classroom={classroom} isStaff={isStaff} role={role} />
        )}
        {activeTab === "chat" && <ClassChatTab classroom={classroom} isStaff={isStaff} />}
        {activeTab === "people" && (
          <PeopleTab
            classroom={classroom}
            isStaff={isStaff}
            isAdmin={isAdmin}
            onLeaveClass={onBack}
          />
        )}
        {activeTab === "grades" && isStaff && <GradesTab classroom={classroom} />}
      </div>
    </div>
  );
}

// =========================================================================
// TAB: CLASS CHAT INFRASTRUCTURE (Real-Time Classmates & Teachers Chat)
// =========================================================================

function ClassChatTab({ classroom, isStaff }: { classroom: Classroom; isStaff: boolean }) {
  const queryClient = useQueryClient();
  const listMessagesFn = useServerFn(listClassroomMessages);
  const sendMessageFn = useServerFn(sendClassroomMessage);
  const deleteMessageFn = useServerFn(deleteClassroomMessage);
  const togglePinFn = useServerFn(togglePinClassroomMessage);

  const [text, setText] = useState("");
  const [copiedMsgId, setCopiedMsgId] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const { data: messages, isLoading } = useQuery({
    queryKey: ["classroom_chat", classroom.id],
    queryFn: () => listMessagesFn({ data: { classroomId: classroom.id } }),
    refetchInterval: 3000, // Real-time poll every 3 seconds
  });

  const sendMutation = useMutation({
    mutationFn: async (msgText: string) => {
      return sendMessageFn({
        data: {
          classroomId: classroom.id,
          content: msgText,
        },
      });
    },
    onSuccess: () => {
      setText("");
      queryClient.invalidateQueries({ queryKey: ["classroom_chat", classroom.id] });
      scrollToBottom();
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const scrollToBottom = () => {
    setTimeout(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, 100);
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages?.length]);

  const pinnedMessages = useMemo(() => (messages ?? []).filter((m) => m.isPinned), [messages]);

  const copyMessageText = (msgId: string, content: string) => {
    navigator.clipboard.writeText(content);
    setCopiedMsgId(msgId);
    toast.success("Message copied to clipboard!");
    setTimeout(() => setCopiedMsgId(null), 1800);
  };

  const QUICK_TOPIC_CHIPS = [
    "📚 Mark scheme question",
    "📈 Diagram curves help",
    "🕒 Essay due date",
    "💡 PED vs PES help",
    "📝 Cambridge essay structure",
  ];

  return (
    <div className="max-w-4xl mx-auto flex flex-col h-[75vh] min-h-[520px] bg-card border border-border/80 rounded-3xl overflow-hidden shadow-xl">
      {/* Chat Room Top Header */}
      <div className="p-4 px-6 bg-muted/30 border-b border-border/80 flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-2xl bg-gradient-to-tr from-purple-600 to-indigo-600 flex items-center justify-center font-bold text-white shadow-sm shrink-0">
            <MessageCircle className="h-5 w-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-bold text-foreground tracking-tight">
                {classroom.name} Class Chat
              </h3>
              <Badge variant="outline" className="text-[10px] bg-purple-500/10 text-purple-700 dark:text-purple-300 border-purple-300 dark:border-purple-800">
                Live Cohort
              </Badge>
            </div>
            <p className="text-[11px] text-muted-foreground mt-0.5">
              Real-time collaboration channel for Cambridge IGCSE 0455 students & educators.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-xs font-medium">
            <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
            <span>Active Channel</span>
          </div>
          {(messages ?? []).length > 0 && (
            <Badge variant="outline" className="text-[10px] text-muted-foreground border-border font-mono">
              {(messages ?? []).length} msgs
            </Badge>
          )}
        </div>
      </div>

      {/* Pinned Announcement in Chat Header */}
      {pinnedMessages.length > 0 && (
        <div className="p-3 px-6 bg-purple-100 dark:bg-purple-950/60 border-b border-purple-200 dark:border-purple-800/60 text-xs text-purple-900 dark:text-purple-200 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 overflow-hidden">
            <Pin className="h-3.5 w-3.5 text-purple-600 dark:text-purple-400 shrink-0" />
            <span className="font-bold text-purple-800 dark:text-purple-300 shrink-0">Pinned Notice:</span>
            <span className="truncate">{pinnedMessages[pinnedMessages.length - 1].content}</span>
          </div>
          {isStaff && (
            <button
              onClick={() => {
                togglePinFn({
                  data: {
                    messageId: pinnedMessages[pinnedMessages.length - 1].id,
                    classroomId: classroom.id,
                    isPinned: false,
                  },
                }).then(() => {
                  toast.success("Unpinned message");
                  queryClient.invalidateQueries({ queryKey: ["classroom_chat", classroom.id] });
                });
              }}
              className="text-[11px] text-purple-600 dark:text-purple-400 hover:underline font-semibold shrink-0 cursor-pointer"
            >
              Unpin
            </button>
          )}
        </div>
      )}

      {/* Messages Scroll Area */}
      <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4 bg-background/50">
        {isLoading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((n) => (
              <div key={n} className="h-16 rounded-2xl bg-muted/40 animate-pulse" />
            ))}
          </div>
        ) : (messages ?? []).length === 0 ? (
          <div className="text-center py-20 text-muted-foreground space-y-3">
            <div className="h-12 w-12 rounded-2xl bg-purple-500/10 text-purple-500 flex items-center justify-center mx-auto">
              <MessageSquare className="h-6 w-6" />
            </div>
            <div className="space-y-1">
              <h4 className="text-sm font-bold text-foreground">Welcome to your class chat!</h4>
              <p className="text-xs text-muted-foreground max-w-sm mx-auto leading-relaxed">
                Ask Economics questions, discuss Cambridge essay topics, collaborate on past papers,
                and share revision notes with your teacher and peers.
              </p>
            </div>
          </div>
        ) : (
          (messages ?? []).map((msg) => (
            <div
              key={msg.id}
              className={cn(
                "flex items-start gap-3 group transition-all",
                msg.isMine ? "flex-row-reverse" : "flex-row",
              )}
            >
              <div
                className={cn(
                  "h-8 w-8 rounded-full flex items-center justify-center font-bold text-xs shrink-0 mt-0.5 shadow-2xs",
                  msg.isTeacher
                    ? "bg-gradient-to-tr from-purple-700 to-indigo-600 text-white ring-2 ring-purple-400/30"
                    : msg.isMine
                      ? "bg-purple-600 text-white"
                      : "bg-muted text-foreground border border-border"
                )}
              >
                {getInitials(msg.userName)}
              </div>

              <div
                className={cn(
                  "max-w-[80%] sm:max-w-[70%] space-y-1",
                  msg.isMine ? "items-end text-right" : "items-start text-left",
                )}
              >
                <div
                  className={cn(
                    "flex items-center gap-1.5 text-[11px] text-muted-foreground",
                    msg.isMine ? "justify-end" : "justify-start"
                  )}
                >
                  <span className="font-semibold text-foreground">{msg.userName}</span>
                  {msg.isTeacher && (
                    <Badge className="bg-purple-100 dark:bg-purple-950 text-purple-700 dark:text-purple-300 border-purple-200 dark:border-purple-700 text-[9px] py-0 px-1 font-bold">
                      Teacher
                    </Badge>
                  )}
                  <span>•</span>
                  <span>
                    {new Date(msg.createdAt).toLocaleTimeString([], {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </span>
                </div>

                <div
                  className={cn(
                    "p-3.5 px-4 rounded-2xl text-xs leading-relaxed whitespace-pre-wrap relative shadow-xs",
                    msg.isMine
                      ? "bg-purple-600 text-white rounded-tr-xs"
                      : "bg-card border border-border text-foreground rounded-tl-xs",
                  )}
                >
                  {msg.content}
                </div>

                {/* Message Hover Actions */}
                <div
                  className={cn(
                    "opacity-0 group-hover:opacity-100 flex items-center gap-2 text-[10px] text-muted-foreground pt-0.5 transition-opacity",
                    msg.isMine ? "justify-end" : "justify-start",
                  )}
                >
                  <button
                    onClick={() => copyMessageText(msg.id, msg.content)}
                    className="hover:text-foreground flex items-center gap-1 cursor-pointer"
                    title="Copy text"
                  >
                    {copiedMsgId === msg.id ? (
                      <>
                        <Check className="h-3 w-3 text-emerald-500" />
                        <span className="text-emerald-500 font-semibold">Copied</span>
                      </>
                    ) : (
                      <>
                        <Copy className="h-3 w-3" />
                        <span>Copy</span>
                      </>
                    )}
                  </button>

                  {msg.canPin && (
                    <button
                      onClick={() => {
                        togglePinFn({
                          data: {
                            messageId: msg.id,
                            classroomId: classroom.id,
                            isPinned: !msg.isPinned,
                          },
                        }).then(() => {
                          toast.success(
                            msg.isPinned ? "Unpinned message" : "Pinned message to chat",
                          );
                          queryClient.invalidateQueries({
                            queryKey: ["classroom_chat", classroom.id],
                          });
                        });
                      }}
                      className="hover:text-purple-500 flex items-center gap-1 cursor-pointer"
                    >
                      <Pin className="h-3 w-3" />
                      <span>{msg.isPinned ? "Unpin" : "Pin"}</span>
                    </button>
                  )}

                  {msg.canDelete && (
                    <button
                      onClick={() => {
                        deleteMessageFn({
                          data: {
                            messageId: msg.id,
                            classroomId: classroom.id,
                          },
                        }).then(() => {
                          toast.success("Message deleted");
                          queryClient.invalidateQueries({
                            queryKey: ["classroom_chat", classroom.id],
                          });
                        });
                      }}
                      className="hover:text-rose-500 flex items-center gap-1 cursor-pointer"
                    >
                      <Trash2 className="h-3 w-3" />
                      <span>Delete</span>
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Chat Composer Input Footer */}
      <div className="p-3 sm:p-4 bg-card/90 border-t border-border space-y-2">
        {/* Quick Suggestion Chips */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none text-[11px]">
          <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground shrink-0 mr-1">
            Quick:
          </span>
          {QUICK_TOPIC_CHIPS.map((chip, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => setText((prev) => (prev ? `${prev} ${chip}` : chip))}
              className="px-2.5 py-0.5 rounded-full border border-border/70 bg-muted/40 hover:bg-muted text-muted-foreground hover:text-foreground transition-all shrink-0 cursor-pointer"
            >
              {chip}
            </button>
          ))}
        </div>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (text.trim() && !sendMutation.isPending) {
              sendMutation.mutate(text.trim());
            }
          }}
          className="flex items-center gap-2"
        >
          <Input
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey && text.trim() && !sendMutation.isPending) {
                e.preventDefault();
                sendMutation.mutate(text.trim());
              }
            }}
            placeholder="Type a message to your class... (Enter to send)"
            className="bg-background border-input text-xs text-foreground placeholder:text-muted-foreground focus:border-purple-500 h-10 rounded-xl"
          />

          <Button
            type="submit"
            disabled={!text.trim() || sendMutation.isPending}
            className="bg-purple-600 hover:bg-purple-500 text-white h-10 px-4 rounded-xl shrink-0 font-semibold gap-1.5 shadow-sm"
          >
            {sendMutation.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
            <span className="hidden sm:inline">Send</span>
          </Button>
        </form>
      </div>
    </div>
  );
}

// =========================================================================
// TAB 1: STREAM (Announcements, Discussion Feed, Upcoming Tasks)
// =========================================================================

function StreamTab({
  classroom,
  isStaff,
  onGoToClasswork,
}: {
  classroom: Classroom;
  isStaff: boolean;
  onGoToClasswork: () => void;
}) {
  const queryClient = useQueryClient();
  const listAnnouncementsFn = useServerFn(listAnnouncements);
  const listAssignmentsFn = useServerFn(listClassroomAssignments);
  const createAnnouncementFn = useServerFn(createAnnouncement);
  const togglePinFn = useServerFn(togglePinAnnouncement);
  const deleteAnnouncementFn = useServerFn(deleteAnnouncement);
  const addCommentFn = useServerFn(addComment);
  const deleteCommentFn = useServerFn(deleteComment);

  const [postText, setPostText] = useState("");
  const [pinPost, setPinPost] = useState(false);
  const [commentInputs, setCommentInputs] = useState<Record<string, string>>({});
  const [copiedCode, setCopiedCode] = useState(false);

  const { data: announcements, isLoading } = useQuery({
    queryKey: ["classroom_announcements", classroom.id],
    queryFn: () => listAnnouncementsFn({ data: { classroomId: classroom.id } }),
  });

  const { data: assignments } = useQuery({
    queryKey: ["classroom_assignments", classroom.id],
    queryFn: () => listAssignmentsFn({ data: { classroomId: classroom.id } }),
  });

  const postMutation = useMutation({
    mutationFn: async () => {
      return createAnnouncementFn({
        data: {
          classroomId: classroom.id,
          content: postText,
          pinned: pinPost,
        },
      });
    },
    onSuccess: () => {
      toast.success("Announcement posted to class stream");
      setPostText("");
      setPinPost(false);
      queryClient.invalidateQueries({ queryKey: ["classroom_announcements", classroom.id] });
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const commentMutation = useMutation({
    mutationFn: async ({ announcementId, text }: { announcementId: string; text: string }) => {
      return addCommentFn({
        data: {
          classroomId: classroom.id,
          announcementId,
          content: text,
        },
      });
    },
    onSuccess: (_, vars) => {
      setCommentInputs((prev) => ({ ...prev, [vars.announcementId]: "" }));
      queryClient.invalidateQueries({ queryKey: ["classroom_announcements", classroom.id] });
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const copyCode = () => {
    navigator.clipboard.writeText(classroom.join_code);
    setCopiedCode(true);
    toast.success("Copied class join code!");
    setTimeout(() => setCopiedCode(false), 2000);
  };

  const upcomingAssignments = useMemo(() => {
    const list = assignments ?? [];
    return list.filter((a) => a.dueAt && new Date(a.dueAt) > new Date()).slice(0, 4);
  }, [assignments]);

  return (
    <div className="space-y-6">
      {/* Google Classroom Style Hero Banner */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-purple-900 via-indigo-950 to-slate-900 border border-purple-800/40 p-8 sm:p-10 shadow-2xl">
        <div className="relative z-10 flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div className="space-y-2 max-w-2xl">
            <Badge
              variant="outline"
              className="bg-black/30 text-white border-white/20 text-xs uppercase tracking-wider backdrop-blur-md"
            >
              {formatLevel(classroom.level)}
            </Badge>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight">
              {classroom.name}
            </h2>
            <div className="flex items-center gap-3 pt-1 text-sm text-purple-200/80">
              <div className="flex items-center gap-2">
                <div className="h-6 w-6 rounded-full bg-purple-600 flex items-center justify-center font-bold text-white text-xs">
                  {getInitials(classroom.teacher_name || "Faculty")}
                </div>
                <span className="font-semibold text-white">
                  {classroom.teacher_name || "Faculty"}
                </span>
              </div>
              {classroom.teacher_school && <span>• {classroom.teacher_school}</span>}
            </div>
          </div>

          {/* Join Code Display Pill */}
          <div className="flex items-center gap-3 bg-black/30 backdrop-blur-md border border-white/20 rounded-2xl p-3 px-4 self-start md:self-auto">
            <div>
              <div className="text-[10px] uppercase font-bold text-purple-300 tracking-wider">
                Class Code
              </div>
              <div className="font-mono text-xl font-black text-white tracking-widest">
                {classroom.join_code}
              </div>
            </div>
            <Button
              size="sm"
              variant="ghost"
              onClick={copyCode}
              className="text-purple-300 hover:text-white hover:bg-purple-900/40 h-9 w-9 p-0"
              title="Copy Code"
            >
              {copiedCode ? (
                <Check className="h-4 w-4 text-emerald-400" />
              ) : (
                <Copy className="h-4 w-4" />
              )}
            </Button>
          </div>
        </div>

        {/* Ambient subtle glow */}
        <div className="absolute -top-24 -right-24 h-72 w-72 rounded-full bg-purple-600/20 blur-3xl pointer-events-none" />
      </div>

      {/* 2-Column Stream Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Left Column: Upcoming Work Box */}
        <div className="lg:col-span-1 space-y-4">
          <div className="bg-card rounded-2xl border border-border p-5 space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
              <Clock className="h-3.5 w-3.5 text-purple-400" />
              Upcoming Work
            </h3>

            {upcomingAssignments.length === 0 ? (
              <p className="text-xs text-muted-foreground py-2">Woohoo, no work due soon!</p>
            ) : (
              <div className="space-y-2.5">
                {upcomingAssignments.map((a) => (
                  <div
                    key={a.id}
                    onClick={onGoToClasswork}
                    className="p-2.5 rounded-xl bg-background/40 border border-border/80 hover:border-purple-500/40 hover:bg-background transition-all cursor-pointer space-y-1"
                  >
                    <div className="text-xs font-semibold text-foreground line-clamp-1">{a.title}</div>
                    <div className="text-[11px] text-purple-300 flex items-center gap-1">
                      <Calendar className="h-3 w-3" />
                      Due{" "}
                      {new Date(a.dueAt!).toLocaleDateString(undefined, {
                        month: "short",
                        day: "numeric",
                      })}
                    </div>
                  </div>
                ))}
              </div>
            )}

            <Button
              variant="ghost"
              size="sm"
              onClick={onGoToClasswork}
              className="w-full text-xs text-purple-400 hover:text-purple-300 hover:bg-purple-950/30 justify-between pt-2"
            >
              <span>View all classwork</span>
              <ChevronRight className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>

        {/* Right Column: Main Stream Feed */}
        <div className="lg:col-span-3 space-y-6">
          {/* Announcement Composer */}
          <div className="bg-card rounded-2xl border border-border p-5 shadow-lg space-y-3">
            <div className="flex items-start gap-3">
              <div className="h-8 w-8 rounded-full bg-purple-600 flex items-center justify-center font-bold text-white text-xs shrink-0">
                You
              </div>
              <Textarea
                value={postText}
                onChange={(e) => setPostText(e.target.value)}
                placeholder="Announce something to your class or start a discussion..."
                className="bg-background border-input/80 text-foreground placeholder:text-muted-foreground focus:border-purple-500 min-h-[90px] resize-y text-sm"
              />
            </div>

            <div className="flex items-center justify-between pt-1">
              {isStaff ? (
                <label className="flex items-center gap-2 text-xs text-muted-foreground cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={pinPost}
                    onChange={(e) => setPinPost(e.target.checked)}
                    className="rounded border-input bg-background text-purple-600 focus:ring-purple-500"
                  />
                  <Pin className="h-3.5 w-3.5 text-purple-400" />
                  <span>Pin to top of class</span>
                </label>
              ) : (
                <div />
              )}

              <Button
                onClick={() => postMutation.mutate()}
                disabled={!postText.trim() || postMutation.isPending}
                size="sm"
                className="bg-purple-600 hover:bg-purple-500 text-white font-medium"
              >
                <Send className="h-3.5 w-3.5 mr-1.5" />
                {postMutation.isPending ? "Posting..." : "Post Announcement"}
              </Button>
            </div>
          </div>

          {/* Announcements Feed */}
          {isLoading ? (
            <div className="space-y-4">
              {[1, 2].map((i) => (
                <div
                  key={i}
                  className="h-36 rounded-2xl bg-card/40 border border-border animate-pulse"
                />
              ))}
            </div>
          ) : (announcements ?? []).length === 0 ? (
            <div className="text-center py-16 px-4 rounded-2xl border border-border/80 bg-muted/20">
              <MessageSquare className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
              <h4 className="text-sm font-semibold text-foreground">
                This is where you can talk to your class
              </h4>
              <p className="text-xs text-muted-foreground max-w-sm mx-auto mt-1">
                Use the stream to share announcements, post lesson notes, Cambridge syllabus
                updates, and answer student questions.
              </p>
            </div>
          ) : (
            <div className="space-y-5">
              {(announcements ?? []).map((ann) => (
                <div
                  key={ann.id}
                  className={cn(
                    "bg-card rounded-2xl border p-5 shadow-lg space-y-4 transition-all",
                    ann.pinned ? "border-purple-500/50 bg-card/80" : "border-border",
                  )}
                >
                  {/* Announcement Header */}
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="h-9 w-9 rounded-full bg-purple-700/80 border border-purple-500/30 flex items-center justify-center font-bold text-white text-xs">
                        {getInitials(ann.authorName)}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-sm text-foreground">{ann.authorName}</span>
                          {ann.authorSchool && (
                            <span className="text-[11px] text-muted-foreground">• {ann.authorSchool}</span>
                          )}
                          {ann.pinned && (
                            <Badge className="bg-purple-100 dark:bg-purple-950 text-purple-800 dark:text-purple-300 border-purple-200 dark:border-purple-700 text-[10px] py-0 px-1.5 flex items-center gap-1">
                              <Pin className="h-2.5 w-2.5" /> Pinned
                            </Badge>
                          )}
                        </div>
                        <div className="text-[11px] text-muted-foreground">
                          {new Date(ann.createdAt).toLocaleString(undefined, {
                            dateStyle: "medium",
                            timeStyle: "short",
                          })}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-1">
                      {ann.canPin && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            togglePinFn({
                              data: {
                                announcementId: ann.id,
                                classroomId: classroom.id,
                                pinned: !ann.pinned,
                              },
                            }).then(() => {
                              toast.success(ann.pinned ? "Unpinned post" : "Pinned post to top");
                              queryClient.invalidateQueries({
                                queryKey: ["classroom_announcements", classroom.id],
                              });
                            });
                          }}
                          className="text-muted-foreground hover:text-purple-300 h-8 w-8 p-0"
                          title={ann.pinned ? "Unpin post" : "Pin to top"}
                        >
                          <Pin className="h-3.5 w-3.5" />
                        </Button>
                      )}

                      {ann.canDelete && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            if (confirm("Delete this announcement?")) {
                              deleteAnnouncementFn({
                                data: {
                                  announcementId: ann.id,
                                  classroomId: classroom.id,
                                },
                              }).then(() => {
                                toast.success("Announcement deleted");
                                queryClient.invalidateQueries({
                                  queryKey: ["classroom_announcements", classroom.id],
                                });
                              });
                            }
                          }}
                          className="text-muted-foreground hover:text-rose-400 h-8 w-8 p-0"
                          title="Delete post"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      )}
                    </div>
                  </div>

                  {/* Announcement Body */}
                  <div className="text-sm text-foreground whitespace-pre-wrap leading-relaxed pl-12">
                    {ann.content}
                  </div>

                  {/* Comments Thread Section */}
                  <div className="pt-3 border-t border-border/80 space-y-3 pl-12">
                    {ann.comments.length > 0 && (
                      <div className="space-y-2.5">
                        {ann.comments.map((comm) => (
                          <div
                            key={comm.id}
                            className="flex items-start justify-between gap-2 p-2.5 rounded-xl bg-background/40 border border-border/60"
                          >
                            <div className="flex items-start gap-2.5">
                              <div className="h-6 w-6 rounded-full bg-muted flex items-center justify-center font-bold text-[10px] text-foreground shrink-0 mt-0.5">
                                {getInitials(comm.authorName)}
                              </div>
                              <div className="space-y-0.5">
                                <div className="flex items-center gap-2">
                                  <span className="font-semibold text-xs text-foreground">
                                    {comm.authorName}
                                  </span>
                                  <span className="text-[10px] text-muted-foreground">
                                    {new Date(comm.createdAt).toLocaleTimeString([], {
                                      hour: "2-digit",
                                      minute: "2-digit",
                                    })}
                                  </span>
                                </div>
                                <div className="text-xs text-foreground">{comm.content}</div>
                              </div>
                            </div>

                            {comm.canDelete && (
                              <button
                                onClick={() => {
                                  deleteCommentFn({
                                    data: {
                                      commentId: comm.id,
                                      classroomId: classroom.id,
                                    },
                                  }).then(() => {
                                    queryClient.invalidateQueries({
                                      queryKey: ["classroom_announcements", classroom.id],
                                    });
                                  });
                                }}
                                className="text-muted-foreground hover:text-rose-400 p-1"
                                title="Delete comment"
                              >
                                <X className="h-3 w-3" />
                              </button>
                            )}
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Inline Add Comment Input */}
                    <div className="flex items-center gap-2 pt-1">
                      <Input
                        value={commentInputs[ann.id] || ""}
                        onChange={(e) =>
                          setCommentInputs((prev) => ({ ...prev, [ann.id]: e.target.value }))
                        }
                        onKeyDown={(e) => {
                          if (
                            e.key === "Enter" &&
                            !e.shiftKey &&
                            (commentInputs[ann.id] || "").trim()
                          ) {
                            e.preventDefault();
                            commentMutation.mutate({
                              announcementId: ann.id,
                              text: commentInputs[ann.id].trim(),
                            });
                          }
                        }}
                        placeholder="Add a class comment..."
                        className="bg-background border-border text-xs text-foreground placeholder:text-muted-foreground focus:border-purple-500 h-8"
                      />
                      <Button
                        size="sm"
                        disabled={
                          !(commentInputs[ann.id] || "").trim() || commentMutation.isPending
                        }
                        onClick={() =>
                          commentMutation.mutate({
                            announcementId: ann.id,
                            text: commentInputs[ann.id].trim(),
                          })
                        }
                        className="bg-purple-600 hover:bg-purple-500 text-white h-8 px-3"
                      >
                        <Send className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// =========================================================================
// TAB 2: CLASSWORK (Assignments, Cambridge Essays, Submissions)
// =========================================================================

function ClassworkTab({
  classroom,
  isStaff,
  role,
}: {
  classroom: Classroom;
  isStaff: boolean;
  role: "student" | "teacher" | "admin";
}) {
  const queryClient = useQueryClient();
  const listAssignmentsFn = useServerFn(listClassroomAssignments);
  const createAssignmentFn = useServerFn(createClassroomAssignment);
  const deleteAssignmentFn = useServerFn(deleteClassroomAssignment);
  const submitWorkFn = useServerFn(submitAssignmentWork);
  const saveDraftFn = useServerFn(saveAssignmentDraft);
  const listBankQuestionsFn = useServerFn(listClassroomBankQuestions);
  const listMcqPapersFn = useServerFn(listMcqPapers);

  const [filter, setFilter] = useState<"all" | "essay" | "mcq_paper">("all");
  const [createOpen, setCreateOpen] = useState(false);
  const [selectedSubmissionsAssignmentId, setSelectedSubmissionsAssignmentId] = useState<
    string | null
  >(null);

  // Assignment Creator Form State
  const [title, setTitle] = useState("");
  const [kind, setKind] = useState<"essay" | "mcq_paper">("essay");
  const [instructions, setInstructions] = useState("");
  const [dueAt, setDueAt] = useState("");
  const [essayQuestion, setEssayQuestion] = useState("");
  const [essayTopic, setEssayTopic] = useState("Unit 2: Price Mechanism & Elasticity");
  const [essayMaxMark, setEssayMaxMark] = useState(20);
  const [bankEssayQuestionId, setBankEssayQuestionId] = useState<string | null>(null);
  const [mcqPaperId, setMcqPaperId] = useState<string | null>(null);
  const [essaySource, setEssaySource] = useState<"bank" | "custom">("bank");
  const [bankSearch, setBankSearch] = useState("");
  const [bankLevel, setBankLevel] = useState<"all" | "as" | "a2">("all");
  const [mcqSearch, setMcqSearch] = useState("");
  const [mcqLevel, setMcqLevel] = useState<"all" | "as" | "a2">("all");

  // Student Submission state
  const [submittingAssignmentId, setSubmittingAssignmentId] = useState<string | null>(null);
  const [submissionText, setSubmissionText] = useState("");
  const [submissionTab, setSubmissionTab] = useState<"document" | "handwritten" | "typed">("document");
  const [uploadedDocName, setUploadedDocName] = useState<string | null>(null);
  const [isExtractingDoc, setIsExtractingDoc] = useState(false);
  const [docExtractProgress, setDocExtractProgress] = useState<string | null>(null);
  const [autosaveStatus, setAutosaveStatus] = useState<"saved" | "saving" | "unsaved" | null>(null);
  const [lastSavedTime, setLastSavedTime] = useState<string | null>(null);
  const docFileInputRef = useRef<HTMLInputElement>(null);

  const handleDocumentFile = async (file: File) => {
    try {
      setIsExtractingDoc(true);
      setDocExtractProgress(`Reading ${file.name}…`);
      const text = await extractTextFromFile(file, (page, total) => {
        setDocExtractProgress(`Extracting page ${page} of ${total}…`);
      });
      if (!text || !text.trim()) {
        throw new Error(
          "No readable text could be extracted from this document. If this is an image-only scan, please use the 'Handwritten (Scan / Photos)' tab.",
        );
      }
      setUploadedDocName(file.name);
      setSubmissionText(text.trim());
      setSubmissionTab("document");
      const wordCount = text.trim().split(/\s+/).length;
      toast.success(
        `Loaded ${wordCount} words from "${file.name}"! Review below before turning in.`,
      );
    } catch (err: any) {
      toast.error(err?.message || "Failed to extract text from document.");
    } finally {
      setIsExtractingDoc(false);
      setDocExtractProgress(null);
    }
  };

  const { data: assignments, isLoading } = useQuery({
    queryKey: ["classroom_assignments", classroom.id],
    queryFn: () => listAssignmentsFn({ data: { classroomId: classroom.id } }),
  });

  const bankQuestionsQuery = useQuery({
    queryKey: ["classroom_bank_questions", classroom.id, bankLevel],
    queryFn: () => listBankQuestionsFn({ data: { classroomId: classroom.id, level: bankLevel } }),
    enabled: createOpen && kind === "essay" && essaySource === "bank",
  });

  const mcqPapersQuery = useQuery({
    queryKey: ["classroom_mcq_papers"],
    queryFn: () => listMcqPapersFn(),
    enabled: createOpen && kind === "mcq_paper",
  });

  const createMutation = useMutation({
    mutationFn: async () => {
      return createAssignmentFn({
        data: {
          classroomId: classroom.id,
          kind,
          title: title.trim(),
          instructions: instructions.trim() || undefined,
          dueAt: dueAt ? new Date(dueAt).toISOString() : null,
          bankEssayQuestionId: kind === "essay" ? bankEssayQuestionId || undefined : undefined,
          essayQuestion: kind === "essay" ? essayQuestion.trim() || title.trim() : undefined,
          essayTopic: kind === "essay" ? essayTopic : undefined,
          essayMaxMark: kind === "essay" ? Number(essayMaxMark) : undefined,
          mcqPaperId: kind === "mcq_paper" ? mcqPaperId || undefined : undefined,
        },
      });
    },
    onSuccess: () => {
      toast.success("Assignment assigned to classroom");
      setCreateOpen(false);
      setTitle("");
      setInstructions("");
      setDueAt("");
      setEssayQuestion("");
      setBankEssayQuestionId(null);
      setMcqPaperId(null);
      setBankSearch("");
      setMcqSearch("");
      queryClient.invalidateQueries({ queryKey: ["classroom_assignments", classroom.id] });
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const submitMutation = useMutation({
    mutationFn: async ({
      assignmentId,
      text,
      submissionType,
    }: {
      assignmentId: string;
      text: string;
      submissionType?: "document" | "handwritten" | "typed";
    }) => {
      return submitWorkFn({
        data: {
          assignmentId,
          classroomId: classroom.id,
          submissionText: text,
          submissionType,
        },
      });
    },
    onSuccess: () => {
      toast.success("Assignment submitted successfully!");
      if (submittingAssignmentId) {
        try {
          localStorage.removeItem(`cr_draft_${submittingAssignmentId}`);
        } catch {}
      }
      setSubmittingAssignmentId(null);
      setSubmissionText("");
      setUploadedDocName(null);
      setAutosaveStatus(null);
      setLastSavedTime(null);
      queryClient.invalidateQueries({ queryKey: ["classroom_assignments", classroom.id] });
    },
    onError: (err: Error) => toast.error(err.message),
  });

  // Debounced Autosave for Typed / Edited Answer
  useEffect(() => {
    if (!submittingAssignmentId) return;

    // Cache locally immediately
    try {
      localStorage.setItem(
        `cr_draft_${submittingAssignmentId}`,
        JSON.stringify({
          text: submissionText,
          tab: submissionTab,
          updatedAt: Date.now(),
        }),
      );
    } catch {}

    // If empty text, skip remote sync
    if (!submissionText.trim()) {
      setAutosaveStatus(null);
      return;
    }

    setAutosaveStatus("unsaved");

    const timer = window.setTimeout(async () => {
      try {
        setAutosaveStatus("saving");
        await saveDraftFn({
          data: {
            assignmentId: submittingAssignmentId,
            classroomId: classroom.id,
            draftText: submissionText,
            submissionType: submissionTab,
          },
        });
        setAutosaveStatus("saved");
        setLastSavedTime(
          new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" }),
        );
      } catch {
        setAutosaveStatus("unsaved");
      }
    }, 1200);

    return () => window.clearTimeout(timer);
  }, [submissionText, submittingAssignmentId, submissionTab, classroom.id, saveDraftFn]);

  const filteredAssignments = useMemo(() => {
    const list = assignments ?? [];
    if (filter === "all") return list;
    return list.filter((a) => a.kind === filter);
  }, [assignments, filter]);

  const filteredBankQuestions = useMemo(() => {
    const list = bankQuestionsQuery.data?.questions ?? [];
    if (!bankSearch.trim()) return list;
    const term = bankSearch.toLowerCase();
    return list.filter(
      (q) =>
        q.question_text.toLowerCase().includes(term) ||
        q.topic.toLowerCase().includes(term) ||
        q.exam_series.toLowerCase().includes(term),
    );
  }, [bankQuestionsQuery.data?.questions, bankSearch]);

  const filteredMcqPapers = useMemo(() => {
    const list = mcqPapersQuery.data?.papers ?? [];
    return list.filter((p) => {
      if (mcqLevel !== "all" && p.level !== mcqLevel) return false;
      if (!mcqSearch.trim()) return true;
      const term = mcqSearch.toLowerCase();
      return (
        p.title.toLowerCase().includes(term) ||
        (p.examSeries && p.examSeries.toLowerCase().includes(term)) ||
        (p.examYear && String(p.examYear).includes(term))
      );
    });
  }, [mcqPapersQuery.data?.papers, mcqLevel, mcqSearch]);

  return (
    <div className="space-y-6">
      {/* Classwork Control Bar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-card p-4 rounded-2xl border border-border">
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant={filter === "all" ? "default" : "ghost"}
            onClick={() => setFilter("all")}
            className={cn(
              "text-xs",
              filter === "all" ? "bg-purple-600 text-white font-semibold shadow-xs" : "text-muted-foreground hover:text-foreground hover:bg-muted",
            )}
          >
            All Topics
          </Button>
          <Button
            size="sm"
            variant={filter === "essay" ? "default" : "ghost"}
            onClick={() => setFilter("essay")}
            className={cn(
              "text-xs",
              filter === "essay" ? "bg-purple-600 text-white font-semibold shadow-xs" : "text-muted-foreground hover:text-foreground hover:bg-muted",
            )}
          >
            Cambridge Essays (8, 12, 20m)
          </Button>
          <Button
            size="sm"
            variant={filter === "mcq_paper" ? "default" : "ghost"}
            onClick={() => setFilter("mcq_paper")}
            className={cn(
              "text-xs",
              filter === "mcq_paper" ? "bg-purple-600 text-white font-semibold shadow-xs" : "text-muted-foreground hover:text-foreground hover:bg-muted",
            )}
          >
            MCQ Past Papers
          </Button>
        </div>

        {isStaff && (
          <Button
            onClick={() => setCreateOpen(true)}
            className="bg-purple-600 hover:bg-purple-500 text-white text-xs font-semibold shadow-md shadow-purple-500/10"
          >
            <Plus className="h-4 w-4 mr-1.5" />
            Create Assignment
          </Button>
        )}
      </div>

      {/* Assignment Cards List */}
      {isLoading ? (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="h-28 rounded-2xl bg-card/40 border border-border animate-pulse"
            />
          ))}
        </div>
      ) : filteredAssignments.length === 0 ? (
        <div className="text-center py-20 px-4 rounded-2xl border border-dashed border-border bg-muted/20">
          <BookOpen className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
          <h4 className="text-base font-medium text-foreground">No assignments posted yet</h4>
          <p className="text-xs text-muted-foreground max-w-md mx-auto mt-1">
            {isStaff
              ? "Click 'Create Assignment' above to set Cambridge essay questions or MCQ mock exams for your students."
              : "Your teacher hasn't assigned any work to this class yet. Check back soon!"}
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredAssignments.map((a) => {
            const isEssay = a.kind === "essay";
            const effectiveMaxMarks = inferCambridgeEssayMaxMark(
              a.essayMaxMark,
              `${a.essayQuestion || ""} ${a.title || ""}`,
            );
            const mySub = a.mySubmission;
            const isSubmitted = Boolean(
              mySub &&
              (mySub.status === "submitted" ||
                mySub.status === "graded" ||
                mySub.status === "returned"),
            );
            const isGraded = Boolean(
              mySub && (mySub.status === "graded" || mySub.status === "returned"),
            );

            return (
              <div
                key={a.id}
                className="bg-card rounded-2xl border border-border hover:border-input p-6 shadow-md transition-all space-y-4"
              >
                {/* Card Header */}
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                  <div className="flex items-start gap-3.5">
                    <div className="h-10 w-10 rounded-xl bg-purple-100 dark:bg-purple-950/80 border border-purple-200 dark:border-purple-700/50 flex items-center justify-center text-purple-700 dark:text-purple-300 shrink-0">
                      {isEssay ? (
                        <FileText className="h-5 w-5" />
                      ) : (
                        <BookOpen className="h-5 w-5" />
                      )}
                    </div>
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="text-base font-bold text-foreground tracking-tight">{a.title}</h3>
                        <Badge
                          variant="outline"
                          className="bg-background text-foreground border-input text-[10px]"
                        >
                          {isEssay ? `${effectiveMaxMarks} Marks` : "30 MCQs"}
                        </Badge>
                        {a.essayTopic && (
                          <Badge
                            variant="outline"
                            className="bg-purple-100 dark:bg-purple-950/40 text-purple-800 dark:text-purple-300 border-purple-200 dark:border-purple-800 text-[10px]"
                          >
                            {a.essayTopic}
                          </Badge>
                        )}
                      </div>

                      {a.dueAt && (
                        <div className="text-xs text-muted-foreground flex items-center gap-1.5">
                          <Calendar className="h-3.5 w-3.5 text-purple-400" />
                          <span>
                            Due{" "}
                            {new Date(a.dueAt).toLocaleString(undefined, {
                              dateStyle: "medium",
                              timeStyle: "short",
                            })}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Right Action / Status Pill */}
                  <div className="flex items-center gap-3 self-end sm:self-start">
                    {role === "student" && (
                      <div>
                        {isGraded ? (
                          <div className="flex items-center gap-2">
                            <Badge className="bg-emerald-950 text-emerald-300 border-emerald-700 text-xs px-2.5 py-1">
                              Graded: {mySub?.teacherScore ?? mySub?.aiScore}/{effectiveMaxMarks}
                            </Badge>
                          </div>
                        ) : isSubmitted ? (
                          <Badge className="bg-blue-950 text-blue-300 border-blue-700 text-xs px-2.5 py-1">
                            <CheckCircle2 className="h-3.5 w-3.5 mr-1 text-blue-400" />
                            Turned In {mySub?.submissionType === "document" ? "(Word/PDF)" : mySub?.submissionType === "handwritten" ? "(Handwritten)" : ""}
                          </Badge>
                        ) : (
                          <Badge className="bg-amber-950/60 text-amber-300 border-amber-700/60 text-xs px-2.5 py-1">
                            Assigned
                          </Badge>
                        )}
                      </div>
                    )}

                    {isStaff && (
                      <div className="flex items-center gap-2">
                        <Button
                          size="sm"
                          onClick={() => setSelectedSubmissionsAssignmentId(a.id)}
                          className="bg-purple-600 hover:bg-purple-500 text-white text-xs font-semibold"
                        >
                          <UsersRound className="h-3.5 w-3.5 mr-1.5" />
                          Review ({a.stats.turnedIn}/{a.stats.totalStudents})
                        </Button>

                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => {
                            if (confirm("Archive/delete this assignment?")) {
                              deleteAssignmentFn({
                                data: { assignmentId: a.id, classroomId: classroom.id },
                              }).then(() => {
                                toast.success("Assignment archived");
                                queryClient.invalidateQueries({
                                  queryKey: ["classroom_assignments", classroom.id],
                                });
                              });
                            }
                          }}
                          className="text-muted-foreground hover:text-rose-400 h-8 w-8 p-0"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    )}
                  </div>
                </div>

                {/* Instructions / Question Prompt */}
                {(a.essayQuestion || a.instructions) && (
                  <div className="bg-background/50 rounded-xl p-4 border border-border/80 text-xs text-foreground space-y-2">
                    {a.essayQuestion && (
                      <div>
                        <span className="font-semibold text-purple-300 block mb-1">
                          Question Prompt:
                        </span>
                        <p className="text-foreground text-sm font-medium">{a.essayQuestion}</p>
                      </div>
                    )}
                    {a.instructions && (
                      <p className="text-muted-foreground whitespace-pre-wrap">{a.instructions}</p>
                    )}
                  </div>
                )}

                {/* Direct Action Links for Essay & MCQ Live */}
                <div className="flex flex-wrap items-center gap-2.5 pt-1">
                  {a.kind === "mcq_paper" && a.mcqPaperId && (
                    <Button
                      asChild
                      size="sm"
                      className="bg-purple-600 hover:bg-purple-500 text-white font-semibold text-xs shadow-md shadow-purple-500/10"
                    >
                      <Link to="/mcq-live" search={{ paperId: a.mcqPaperId }}>
                        <ExternalLink className="h-3.5 w-3.5 mr-1.5" />
                        Take MCQ Paper in MCQ Live
                      </Link>
                    </Button>
                  )}
                  {a.kind === "essay" && (
                    <Button
                      asChild
                      size="sm"
                      variant="outline"
                      className="bg-background text-purple-300 border-purple-800/60 hover:bg-purple-950/50 text-xs font-semibold"
                    >
                      <Link
                        to="/grade"
                        search={{
                          q: a.essayQuestion || a.title,
                          marks: (a.essayMaxMark === 2 || a.essayMaxMark === 4 || a.essayMaxMark === 6 || a.essayMaxMark === 8
                            ? a.essayMaxMark
                            : 8) as 2 | 4 | 6 | 8,
                        }}
                      >
                        <Sparkles className="h-3.5 w-3.5 mr-1.5 text-purple-400" />
                        Open in Marking Desk
                      </Link>
                    </Button>
                  )}
                </div>

                {/* Student Submission Card Flow */}
                {role === "student" && (
                  <div className="pt-2 border-t border-border/60">
                    {isGraded ? (
                      <div className="p-4 rounded-xl bg-emerald-950/20 border border-emerald-800/40 space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-emerald-300 uppercase tracking-wider flex items-center gap-1.5">
                            <Award className="h-4 w-4 text-emerald-400" />
                            Teacher Assessment & Feedback
                          </span>
                          <span className="text-sm font-bold text-emerald-200">
                            Score: {mySub?.teacherScore ?? mySub?.aiScore} / {a.essayMaxMark || 20}{" "}
                            (
                            {Math.round(
                              ((Number(mySub?.teacherScore ?? mySub?.aiScore) || 0) /
                                (a.essayMaxMark || 20)) *
                                100,
                            )}
                            %)
                          </span>
                        </div>
                        {mySub?.teacherFeedback && (
                          <blockquote className="text-xs text-foreground italic border-l-2 border-emerald-500 pl-3 py-1">
                            "{mySub.teacherFeedback}"
                          </blockquote>
                        )}
                      </div>
                    ) : isSubmitted ? (
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-3 rounded-xl bg-background/60 border border-border text-xs text-muted-foreground">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span>Submitted on {new Date(mySub!.submittedAt).toLocaleString()}</span>
                          {mySub?.submissionType === "document" && (
                            <Badge variant="outline" className="border-blue-500/40 bg-blue-500/10 text-blue-300 text-[10px]">
                              <FileText className="h-3 w-3 mr-1 text-blue-400" />
                              Word / PDF Document
                            </Badge>
                          )}
                          {mySub?.submissionType === "handwritten" && (
                            <Badge variant="outline" className="border-purple-500/40 bg-purple-500/10 text-purple-300 text-[10px]">
                              <PenLine className="h-3 w-3 mr-1 text-purple-400" />
                              Handwritten Script
                            </Badge>
                          )}
                          {mySub?.submissionType === "typed" && (
                            <Badge variant="outline" className="border-emerald-500/40 bg-emerald-500/10 text-emerald-300 text-[10px]">
                              <FileEdit className="h-3 w-3 mr-1 text-emerald-400" />
                              Typed Answer
                            </Badge>
                          )}
                        </div>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => {
                            setSubmittingAssignmentId(a.id);
                            setSubmissionText(mySub?.submissionText || "");
                            setUploadedDocName(null);
                            setSubmissionTab(
                              mySub?.submissionType === "document"
                                ? "document"
                                : mySub?.submissionType === "handwritten"
                                  ? "handwritten"
                                  : "typed",
                            );
                          }}
                          className="text-xs text-purple-600 dark:text-purple-400 hover:underline self-start sm:self-auto"
                        >
                          Resubmit Work
                        </Button>
                      </div>
                    ) : submittingAssignmentId === a.id ? (
                      <div className="space-y-4 pt-3 p-4 rounded-2xl bg-purple-950/10 border border-purple-800/40 animate-in fade-in">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                          <div>
                            <Label className="text-xs font-bold text-foreground flex items-center gap-2">
                              <FileEdit className="h-4 w-4 text-purple-400" />
                              Submit Your Answer for: <span className="text-purple-300 font-semibold">{a.title}</span>
                            </Label>
                            <p className="text-[11px] text-muted-foreground mt-0.5">
                              Upload a Word or PDF document, photograph handwritten pages, or type directly.
                            </p>
                          </div>

                          {/* Segmented Mode Selector */}
                          <div className="flex items-center p-0.5 bg-background border border-border rounded-xl self-start sm:self-auto shrink-0 flex-wrap gap-1">
                            <button
                              type="button"
                              onClick={() => setSubmissionTab("document")}
                              className={cn(
                                "px-3 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1.5 transition-all cursor-pointer",
                                submissionTab === "document"
                                  ? "bg-blue-600 text-white shadow-xs font-semibold"
                                  : "text-muted-foreground hover:text-foreground",
                              )}
                            >
                              <FileText className="h-3.5 w-3.5" />
                              Word / PDF Document
                            </button>
                            <button
                              type="button"
                              onClick={() => setSubmissionTab("handwritten")}
                              className={cn(
                                "px-3 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1.5 transition-all cursor-pointer",
                                submissionTab === "handwritten"
                                  ? "bg-purple-600 text-white shadow-xs font-semibold"
                                  : "text-muted-foreground hover:text-foreground",
                              )}
                            >
                              <PenLine className="h-3.5 w-3.5" />
                              Handwritten (Scan / Photos)
                            </button>
                            <button
                              type="button"
                              onClick={() => setSubmissionTab("typed")}
                              className={cn(
                                "px-3 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1.5 transition-all cursor-pointer",
                                submissionTab === "typed"
                                  ? "bg-purple-600 text-white shadow-xs font-semibold"
                                  : "text-muted-foreground hover:text-foreground",
                              )}
                            >
                              <FileEdit className="h-3.5 w-3.5" />
                              Type / Paste
                            </button>
                          </div>
                        </div>

                        {/* Document Mode */}
                        {submissionTab === "document" && (
                          <div className="space-y-3 pt-1 animate-in fade-in">
                            <div className="rounded-xl p-3 bg-blue-950/30 border border-blue-800/40 text-[11px] text-blue-200/90 flex items-center gap-2">
                              <FileText className="h-4 w-4 text-blue-400 shrink-0" />
                              <span>
                                Upload a Word document (.docx, .doc), PDF (.pdf), or text file (.txt, .rtf, .md). The text will be extracted below for review before turning in.
                              </span>
                            </div>

                            <div
                              onClick={() => docFileInputRef.current?.click()}
                              onDragOver={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                              }}
                              onDrop={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                const files = Array.from(e.dataTransfer.files || []);
                                if (files[0]) handleDocumentFile(files[0]);
                              }}
                              className={cn(
                                "border-2 border-dashed rounded-2xl p-6 sm:p-8 text-center cursor-pointer transition-all",
                                isExtractingDoc
                                  ? "border-blue-500 bg-blue-950/20"
                                  : uploadedDocName
                                    ? "border-emerald-500/50 bg-emerald-950/20 hover:border-emerald-500"
                                    : "border-border hover:border-blue-500 hover:bg-blue-950/10",
                              )}
                            >
                              <input
                                ref={docFileInputRef}
                                type="file"
                                accept=".docx,.doc,.pdf,.txt,.rtf,.md,.csv,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/msword,application/pdf,text/plain"
                                className="hidden"
                                onChange={(e) => {
                                  const files = Array.from(e.target.files || []);
                                  if (files[0]) handleDocumentFile(files[0]);
                                  e.target.value = "";
                                }}
                              />

                              {isExtractingDoc ? (
                                <div className="flex flex-col items-center justify-center space-y-2 text-blue-400">
                                  <Loader2 className="h-8 w-8 animate-spin" />
                                  <p className="text-xs font-semibold">{docExtractProgress || "Extracting text from document…"}</p>
                                  <p className="text-[11px] text-muted-foreground">Parsing paragraphs and headings…</p>
                                </div>
                              ) : uploadedDocName ? (
                                <div className="flex flex-col items-center justify-center space-y-2">
                                  <div className="h-10 w-10 rounded-full bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400">
                                    <CheckCircle2 className="h-5 w-5" />
                                  </div>
                                  <div>
                                    <p className="text-xs font-semibold text-foreground flex items-center justify-center gap-1.5">
                                      <FileText className="h-4 w-4 text-emerald-400" />
                                      {uploadedDocName}
                                    </p>
                                    <p className="text-[11px] text-emerald-400/90 mt-0.5">
                                      Document extracted! You can click to replace or review the text below.
                                    </p>
                                  </div>
                                  <Button
                                    type="button"
                                    size="sm"
                                    variant="ghost"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      docFileInputRef.current?.click();
                                    }}
                                    className="text-xs text-blue-600 dark:text-blue-400 hover:underline mt-1 h-7 px-3"
                                  >
                                    <Upload className="h-3 w-3 mr-1" />
                                    Choose Another File
                                  </Button>
                                </div>
                              ) : (
                                <div className="flex flex-col items-center justify-center space-y-2.5">
                                  <div className="h-11 w-11 rounded-2xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400">
                                    <Upload className="h-5 w-5" />
                                  </div>
                                  <div>
                                    <p className="text-xs font-semibold text-foreground">
                                      Click to select a file or drag and drop here
                                    </p>
                                    <p className="text-[11px] text-muted-foreground mt-0.5">
                                      Supports Microsoft Word (.docx, .doc), Adobe PDF (.pdf), or text documents (.txt, .rtf)
                                    </p>
                                  </div>
                                  <div className="flex items-center gap-1.5 flex-wrap justify-center pt-1">
                                    <Badge variant="outline" className="text-[10px] bg-background/60 border-border text-muted-foreground">.DOCX</Badge>
                                    <Badge variant="outline" className="text-[10px] bg-background/60 border-border text-muted-foreground">.PDF</Badge>
                                    <Badge variant="outline" className="text-[10px] bg-background/60 border-border text-muted-foreground">.DOC</Badge>
                                    <Badge variant="outline" className="text-[10px] bg-background/60 border-border text-muted-foreground">.TXT</Badge>
                                  </div>
                                </div>
                              )}
                            </div>
                          </div>
                        )}

                        {/* Handwritten Mode */}
                        {submissionTab === "handwritten" && (
                          <div className="space-y-3 pt-1 animate-in fade-in">
                            <div className="rounded-xl p-3 bg-purple-950/30 border border-purple-800/40 text-[11px] text-purple-200/90 flex items-center gap-2">
                              <PenLine className="h-4 w-4 text-purple-400 shrink-0" />
                              <span>
                                Photograph your handwritten exam pages with your camera, or upload photos / scanned PDFs. The OCR will transcribe each page into the text box below.
                              </span>
                            </div>

                            <HandwritingUpload
                              hint={a.essayQuestion || a.title}
                              onText={(text) => {
                                setSubmissionText((current) =>
                                  current.trim() ? `${current.trim()}\n\n${text}` : text,
                                );
                                setUploadedDocName(null);
                                toast.success(
                                  "Handwritten pages transcribed! Review your text below before submitting.",
                                );
                              }}
                            />
                          </div>
                        )}

                        {/* Review / Editable Submission Box */}
                        <div className="space-y-1.5">
                          <div className="flex items-center justify-between text-xs">
                            <Label className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                              {submissionTab === "document" ? (
                                <>
                                  <FileText className="h-3.5 w-3.5 text-blue-400" />
                                  Extracted Document Text (review &amp; edit if needed):
                                </>
                              ) : submissionTab === "handwritten" ? (
                                <>
                                  <PenLine className="h-3.5 w-3.5 text-purple-400" />
                                  Transcribed Essay Text (review &amp; edit if needed):
                                </>
                              ) : (
                                <>
                                  <FileText className="h-3.5 w-3.5 text-purple-400" />
                                  Your Essay Answer:
                                </>
                              )}
                            </Label>
                            <div className="flex items-center gap-3">
                              {autosaveStatus === "saving" && (
                                <span className="inline-flex items-center gap-1.5 text-[11px] text-purple-400">
                                  <Loader2 className="h-3 w-3 animate-spin" />
                                  <span>Autosaving draft...</span>
                                </span>
                              )}
                              {autosaveStatus === "saved" && (
                                <span className="inline-flex items-center gap-1 text-[11px] text-emerald-400">
                                  <Check className="h-3 w-3" />
                                  <span>Autosaved{lastSavedTime ? ` at ${lastSavedTime}` : ""}</span>
                                </span>
                              )}
                              {autosaveStatus === "unsaved" && (
                                <span className="text-[11px] text-muted-foreground italic">
                                  Unsaved changes...
                                </span>
                              )}
                              <span className="text-[11px] text-muted-foreground font-mono">
                                {submissionText.trim()
                                  ? `${submissionText.trim().split(/\s+/).length} words`
                                  : "0 words"}
                              </span>
                            </div>
                          </div>

                          <Textarea
                            value={submissionText}
                            onChange={(e) => setSubmissionText(e.target.value)}
                            placeholder={
                              submissionTab === "document"
                                ? "Upload a Word document or PDF above to extract your essay text here for review..."
                                : submissionTab === "handwritten"
                                  ? "Upload handwritten page photos or scans above, and the OCR will transcribe your essay here for review..."
                                  : "Type or paste your Cambridge essay response here..."
                            }
                            className="bg-background border-input text-foreground min-h-[160px] text-sm leading-relaxed"
                          />
                        </div>

                        {/* Actions */}
                        <div className="flex items-center justify-between pt-1">
                          <div className="text-[11px] text-muted-foreground">
                            {submissionTab === "document" && uploadedDocName ? (
                              <Badge
                                variant="outline"
                                className="border-blue-500/40 bg-blue-500/10 text-blue-300 text-[10px]"
                              >
                                <FileText className="h-3 w-3 mr-1" />
                                {uploadedDocName}
                              </Badge>
                            ) : submissionTab === "handwritten" ? (
                              <Badge
                                variant="outline"
                                className="border-purple-500/40 bg-purple-500/10 text-purple-300 text-[10px]"
                              >
                                <PenLine className="h-3 w-3 mr-1" />
                                Handwritten Script
                              </Badge>
                            ) : null}
                          </div>

                          <div className="flex items-center gap-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                setSubmittingAssignmentId(null);
                                setSubmissionText("");
                                setUploadedDocName(null);
                              }}
                              className="text-muted-foreground hover:text-foreground text-xs"
                            >
                              Cancel
                            </Button>
                            <Button
                              size="sm"
                              onClick={() =>
                                submitMutation.mutate({
                                  assignmentId: a.id,
                                  text: submissionText,
                                  submissionType: submissionTab,
                                })
                              }
                              disabled={!submissionText.trim() || submitMutation.isPending || isExtractingDoc}
                              className="bg-purple-600 hover:bg-purple-500 text-white text-xs font-semibold shadow-md shadow-purple-500/20"
                            >
                              <Send className="h-3.5 w-3.5 mr-1.5" />
                              {submitMutation.isPending
                                ? "Submitting..."
                                : submissionTab === "document"
                                  ? "Turn In Document Essay"
                                  : submissionTab === "handwritten"
                                    ? "Turn In Handwritten Essay"
                                    : "Turn In Essay"}
                            </Button>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-center justify-between pt-1 flex-wrap gap-2">
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-muted-foreground">
                            Your work has not been turned in yet.
                          </span>
                          {a.myDraft && a.myDraft.draftText && (
                            <Badge
                              variant="outline"
                              className="border-purple-500/40 bg-purple-500/10 text-purple-300 text-[10px]"
                            >
                              <Clock className="h-3 w-3 mr-1 text-purple-400" />
                              Autosaved Draft Available
                            </Badge>
                          )}
                        </div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              const draft = a.myDraft;
                              setSubmittingAssignmentId(a.id);
                              setSubmissionTab(draft?.submissionType || "document");
                              setSubmissionText(draft?.draftText || "");
                              setUploadedDocName(null);
                              setAutosaveStatus(draft?.draftText ? "saved" : null);
                            }}
                            className="bg-blue-950/30 text-blue-300 border-blue-800/60 hover:bg-blue-900/40 text-xs font-semibold"
                          >
                            <Upload className="h-3.5 w-3.5 mr-1.5 text-blue-400" />
                            Upload Word / PDF
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              const draft = a.myDraft;
                              setSubmittingAssignmentId(a.id);
                              setSubmissionTab(draft?.submissionType || "handwritten");
                              setSubmissionText(draft?.draftText || "");
                              setUploadedDocName(null);
                              setAutosaveStatus(draft?.draftText ? "saved" : null);
                            }}
                            className="bg-purple-950/30 text-purple-300 border-purple-800/60 hover:bg-purple-900/40 text-xs font-semibold"
                          >
                            <PenLine className="h-3.5 w-3.5 mr-1.5 text-purple-400" />
                            Submit Handwritten
                          </Button>
                          <Button
                            size="sm"
                            onClick={() => {
                              const draft = a.myDraft;
                              setSubmittingAssignmentId(a.id);
                              setSubmissionTab(draft?.submissionType || "typed");
                              setSubmissionText(draft?.draftText || "");
                              setUploadedDocName(null);
                              setAutosaveStatus(draft?.draftText ? "saved" : null);
                            }}
                            className="bg-purple-600 hover:bg-purple-500 text-white text-xs font-semibold"
                          >
                            <FileEdit className="h-3.5 w-3.5 mr-1.5" />
                            {a.myDraft?.draftText ? "Resume Draft" : "Write / Type"}
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Teacher Stats Bar */}
                {isStaff && (
                  <div className="flex items-center gap-6 pt-2 border-t border-border/60 text-xs text-muted-foreground">
                    <div>
                      <span className="font-bold text-foreground mr-1">{a.stats.turnedIn}</span>
                      <span>Turned in</span>
                    </div>
                    <div>
                      <span className="font-bold text-foreground mr-1">{a.stats.assigned}</span>
                      <span>Assigned</span>
                    </div>
                    <div>
                      <span className="font-bold text-foreground mr-1">{a.stats.graded}</span>
                      <span>Graded</span>
                    </div>
                    {a.stats.averageScore !== null && (
                      <div className="text-purple-300">
                        <span className="font-bold mr-1">
                          {a.stats.averageScore}/{a.essayMaxMark || 20}
                        </span>
                        <span>Class Average</span>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Teacher Create Assignment Modal */}
      {createOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in">
          <div className="w-full max-w-2xl bg-card border border-border rounded-2xl p-6 shadow-2xl space-y-5 text-left max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold text-foreground flex items-center gap-2">
                <FileEdit className="h-5 w-5 text-purple-400" />
                Create Class Assignment
              </h3>
              <button
                onClick={() => setCreateOpen(false)}
                className="text-muted-foreground hover:text-foreground"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-foreground">Assignment Type</Label>
                <Select
                  value={kind}
                  onValueChange={(v: "essay" | "mcq_paper") => {
                    setKind(v);
                    if (v === "mcq_paper") {
                      setTitle("");
                    }
                  }}
                >
                  <SelectTrigger className="bg-background border-input text-foreground">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-card border-border text-foreground">
                    <SelectItem value="essay">Cambridge Economics Essay (8, 12, 20m)</SelectItem>
                    <SelectItem value="mcq_paper">MCQ Past Paper Test (from MCQ Live)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {kind === "essay" && (
                <div className="space-y-3 p-4 rounded-xl bg-background/60 border border-border">
                  <div className="flex items-center justify-between">
                    <Label className="text-xs font-semibold text-foreground">Question Source</Label>
                    <div className="flex items-center gap-1 bg-card p-0.5 rounded-lg border border-border text-xs">
                      <button
                        type="button"
                        onClick={() => setEssaySource("bank")}
                        className={cn(
                          "px-2.5 py-1 rounded-md transition-all font-medium",
                          essaySource === "bank"
                            ? "bg-purple-600 text-white shadow-sm"
                            : "text-muted-foreground hover:text-foreground hover:bg-muted/60",
                        )}
                      >
                        <ListChecks className="h-3 w-3 inline mr-1" />
                        Question Bank
                      </button>
                      <button
                        type="button"
                        onClick={() => setEssaySource("custom")}
                        className={cn(
                          "px-2.5 py-1 rounded-md transition-all font-medium",
                          essaySource === "custom"
                            ? "bg-purple-600 text-white shadow-sm"
                            : "text-muted-foreground hover:text-foreground hover:bg-muted/60",
                        )}
                      >
                        <FileEdit className="h-3 w-3 inline mr-1" />
                        Custom Prompt
                      </button>
                    </div>
                  </div>

                  {essaySource === "bank" ? (
                    <div className="space-y-3">
                      <div className="flex flex-col sm:flex-row gap-2">
                        <div className="relative flex-1">
                          <Search className="h-3.5 w-3.5 absolute left-3 top-2.5 text-muted-foreground" />
                          <Input
                            value={bankSearch}
                            onChange={(e) => setBankSearch(e.target.value)}
                            placeholder="Search Question Bank by keyword (e.g. inflation, tariff, subsidy)..."
                            className="pl-8 text-xs bg-card border-border text-foreground h-9"
                          />
                        </div>
                        <div className="flex items-center gap-1 shrink-0">
                          <Button
                            type="button"
                            size="sm"
                            variant={bankLevel === "all" ? "default" : "outline"}
                            onClick={() => setBankLevel("all")}
                            className={cn(
                              "text-xs h-9 px-3",
                              bankLevel === "all"
                                ? "bg-purple-600 text-foreground"
                                : "border-border text-foreground",
                            )}
                          >
                            All
                          </Button>
                          <Button
                            type="button"
                            size="sm"
                            variant={bankLevel === "as" ? "default" : "outline"}
                            onClick={() => setBankLevel("as")}
                            className={cn(
                              "text-xs h-9 px-3",
                              bankLevel === "as"
                                ? "bg-purple-600 text-foreground"
                                : "border-border text-foreground",
                            )}
                          >
                            IGCSE 0455
                          </Button>
                          <Button
                            type="button"
                            size="sm"
                            variant={bankLevel === "a2" ? "default" : "outline"}
                            onClick={() => setBankLevel("a2")}
                            className={cn(
                              "text-xs h-9 px-3",
                              bankLevel === "a2"
                                ? "bg-purple-600 text-foreground"
                                : "border-border text-foreground",
                            )}
                          >
                            IGCSE Level
                          </Button>
                        </div>
                      </div>

                      <div className="max-h-52 overflow-y-auto space-y-2 pr-1 border border-border/80 rounded-xl p-2 bg-background/40">
                        {bankQuestionsQuery.isLoading ? (
                          <div className="text-center py-6 text-xs text-muted-foreground">
                            Loading Question Bank...
                          </div>
                        ) : filteredBankQuestions.length === 0 ? (
                          <div className="text-center py-6 text-xs text-muted-foreground">
                            No matching questions found in Question Bank.
                          </div>
                        ) : (
                          filteredBankQuestions.map((q) => {
                            const isSelected =
                              bankEssayQuestionId === q.id || essayQuestion === q.question_text;
                            return (
                              <div
                                key={q.id}
                                onClick={() => {
                                  setBankEssayQuestionId(q.id);
                                  setEssayQuestion(q.question_text);
                                  setTitle(
                                    q.question_text.length > 70
                                      ? q.question_text.slice(0, 67) + "..."
                                      : q.question_text,
                                  );
                                  setEssayTopic(q.topic);
                                  setEssayMaxMark(q.max_mark);
                                }}
                                className={cn(
                                  "p-3 rounded-lg border text-xs cursor-pointer transition-all space-y-1.5",
                                  isSelected
                                    ? "bg-purple-950/50 border-purple-600 ring-1 ring-purple-500"
                                    : "bg-card border-border/80 hover:border-input hover:bg-card",
                                )}
                              >
                                <div className="flex items-center justify-between gap-2">
                                  <div className="flex items-center gap-1.5 flex-wrap">
                                    <Badge className="bg-purple-100 dark:bg-purple-950 text-purple-800 dark:text-purple-300 border-purple-200 dark:border-purple-800 text-[10px]">
                                      {q.exam_series}
                                    </Badge>
                                    <Badge className="bg-background text-foreground border-input text-[10px]">
                                      {q.max_mark} Marks
                                    </Badge>
                                    <span className="text-[10px] text-muted-foreground font-medium">
                                      {q.topic}
                                    </span>
                                  </div>
                                  {isSelected && (
                                    <span className="text-[10px] font-bold text-emerald-400 flex items-center gap-1">
                                      <Check className="h-3 w-3" /> Selected
                                    </span>
                                  )}
                                </div>
                                <p className="text-foreground line-clamp-2 leading-relaxed">
                                  {q.question_text}
                                </p>
                              </div>
                            );
                          })
                        )}
                      </div>

                      {bankEssayQuestionId && (
                        <div className="p-2.5 rounded-lg bg-emerald-950/20 border border-emerald-800/40 text-xs text-emerald-300 flex items-center justify-between">
                          <span className="flex items-center gap-1.5 font-medium">
                            <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
                            Question Bank item chosen: {essayMaxMark} Marks ({essayTopic})
                          </span>
                          <button
                            type="button"
                            onClick={() => {
                              setBankEssayQuestionId(null);
                            }}
                            className="text-[10px] text-emerald-400 hover:underline"
                          >
                            Clear
                          </button>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                          <Label className="text-xs font-semibold text-foreground">
                            Syllabus Topic
                          </Label>
                          <Select value={essayTopic} onValueChange={setEssayTopic}>
                            <SelectTrigger className="bg-background border-input text-foreground">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent className="bg-card border-border text-foreground">
                              <SelectItem value="Unit 1: Basic Economic Ideas">
                                Unit 1: Basic Economic Ideas
                              </SelectItem>
                              <SelectItem value="Unit 2: The Price System & Microeconomy">
                                Unit 2: The Price System & Micro
                              </SelectItem>
                              <SelectItem value="Unit 3: Government Micro Intervention">
                                Unit 3: Government Micro Intervention
                              </SelectItem>
                              <SelectItem value="Unit 4: The National Economy (Macro)">
                                Unit 4: The National Economy (Macro)
                              </SelectItem>
                              <SelectItem value="Unit 5: Government Macro Intervention">
                                Unit 5: Government Macro Intervention
                              </SelectItem>
                              <SelectItem value="Unit 6: International Economic Issues">
                                Unit 6: International Economics
                              </SelectItem>
                            </SelectContent>
                          </Select>
                        </div>

                        <div className="space-y-1.5">
                          <Label className="text-xs font-semibold text-foreground">
                            Maximum Marks
                          </Label>
                          <Select
                            value={String(essayMaxMark)}
                            onValueChange={(v) => setEssayMaxMark(Number(v))}
                          >
                            <SelectTrigger className="bg-background border-input text-foreground">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent className="bg-card border-border text-foreground">
                              <SelectItem value="8">8 Marks (AS Part a)</SelectItem>
                              <SelectItem value="12">12 Marks (AS Part b / Evaluate)</SelectItem>
                              <SelectItem value="20">20 Marks (Full Section B/C Essay)</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>

                      <div className="space-y-1.5">
                        <Label className="text-xs font-semibold text-foreground">
                          Full Question Prompt
                        </Label>
                        <Textarea
                          value={essayQuestion}
                          onChange={(e) => {
                            const val = e.target.value;
                            setEssayQuestion(val);
                            const detected = inferCambridgeEssayMaxMark(null, val);
                            if (detected === 8 || detected === 12 || detected === 20 || detected === 15 || detected === 25) {
                              setEssayMaxMark(detected);
                            }
                          }}
                          placeholder="Enter the exact Cambridge IGCSE 0455 past paper question prompt..."
                          className="bg-background border-input text-foreground min-h-[80px]"
                        />
                      </div>
                    </div>
                  )}
                </div>
              )}

              {kind === "mcq_paper" && (
                <div className="space-y-3 p-4 rounded-xl bg-background/60 border border-border">
                  <div className="flex items-center justify-between">
                    <div>
                      <Label className="text-xs font-semibold text-foreground block">
                        Select Cambridge Past Paper from MCQ Live
                      </Label>
                      <span className="text-[11px] text-muted-foreground">
                        Choose an official Cambridge IGCSE 0455 past paper for your students
                      </span>
                    </div>
                  </div>

                  <div className="flex flex-col sm:flex-row gap-2">
                    <div className="relative flex-1">
                      <Search className="h-3.5 w-3.5 absolute left-3 top-2.5 text-muted-foreground" />
                      <Input
                        value={mcqSearch}
                        onChange={(e) => setMcqSearch(e.target.value)}
                        placeholder="Search past papers (e.g. 2024, Paper 11, June)..."
                        className="pl-8 text-xs bg-card border-border text-foreground h-9"
                      />
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <Button
                        type="button"
                        size="sm"
                        variant={mcqLevel === "all" ? "default" : "outline"}
                        onClick={() => setMcqLevel("all")}
                        className={cn(
                          "text-xs h-9 px-3",
                          mcqLevel === "all"
                            ? "bg-purple-600 text-foreground"
                            : "border-border text-foreground",
                        )}
                      >
                        All
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        variant={mcqLevel === "as" ? "default" : "outline"}
                        onClick={() => setMcqLevel("as")}
                        className={cn(
                          "text-xs h-9 px-3",
                          mcqLevel === "as"
                            ? "bg-purple-600 text-foreground"
                            : "border-border text-foreground",
                        )}
                      >
                        AS Paper 1
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        variant={mcqLevel === "a2" ? "default" : "outline"}
                        onClick={() => setMcqLevel("a2")}
                        className={cn(
                          "text-xs h-9 px-3",
                          mcqLevel === "a2"
                            ? "bg-purple-600 text-foreground"
                            : "border-border text-foreground",
                        )}
                      >
                        IGCSE Paper 1
                      </Button>
                    </div>
                  </div>

                  <div className="max-h-52 overflow-y-auto space-y-2 pr-1 border border-border/80 rounded-xl p-2 bg-background/40">
                    {mcqPapersQuery.isLoading ? (
                      <div className="text-center py-6 text-xs text-muted-foreground">
                        Loading MCQ Live Papers...
                      </div>
                    ) : filteredMcqPapers.length === 0 ? (
                      <div className="text-center py-6 text-xs text-muted-foreground">
                        No matching past papers found.
                      </div>
                    ) : (
                      filteredMcqPapers.map((p) => {
                        const isSelected = mcqPaperId === p.id;
                        return (
                          <div
                            key={p.id}
                            onClick={() => {
                              setMcqPaperId(p.id);
                              setTitle(p.title);
                              setInstructions(
                                `Complete this official Cambridge IGCSE 0455 ${p.level.toUpperCase()} MCQ exam (${p.questionCount} questions) in MCQ Live.`,
                              );
                            }}
                            className={cn(
                              "p-3 rounded-lg border text-xs cursor-pointer transition-all space-y-1.5",
                              isSelected
                                ? "bg-purple-950/50 border-purple-600 ring-1 ring-purple-500"
                                : "bg-card border-border/80 hover:border-input hover:bg-card",
                            )}
                          >
                            <div className="flex items-center justify-between gap-2">
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <Badge className="bg-purple-100 dark:bg-purple-950 text-purple-800 dark:text-purple-300 border-purple-200 dark:border-purple-800 text-[10px]">
                                  {p.level.toUpperCase()} Level
                                </Badge>
                                <Badge className="bg-background text-foreground border-input text-[10px]">
                                  {p.questionCount} Questions
                                </Badge>
                                {p.examYear && (
                                  <span className="text-[10px] text-muted-foreground font-medium">
                                    {p.examSeries ? `${p.examSeries} ` : ""}
                                    {p.examYear}
                                  </span>
                                )}
                              </div>
                              {isSelected && (
                                <span className="text-[10px] font-bold text-emerald-400 flex items-center gap-1">
                                  <Check className="h-3 w-3" /> Selected
                                </span>
                              )}
                            </div>
                            <p className="text-foreground font-semibold truncate">{p.title}</p>
                          </div>
                        );
                      })
                    )}
                  </div>

                  {mcqPaperId && (
                    <div className="p-2.5 rounded-lg bg-emerald-950/20 border border-emerald-800/40 text-xs text-emerald-300 flex items-center justify-between">
                      <span className="flex items-center gap-1.5 font-medium">
                        <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
                        MCQ Paper selected: {title}
                      </span>
                      <button
                        type="button"
                        onClick={() => {
                          setMcqPaperId(null);
                        }}
                        className="text-[10px] text-emerald-400 hover:underline"
                      >
                        Clear
                      </button>
                    </div>
                  )}
                </div>
              )}

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-foreground">Assignment Title</Label>
                <Input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. Discuss whether monetary policy is effective in curbing inflation"
                  className="bg-background border-input text-foreground"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-foreground">
                    Due Date & Time (Optional)
                  </Label>
                  <Input
                    type="datetime-local"
                    value={dueAt}
                    onChange={(e) => setDueAt(e.target.value)}
                    className="bg-background border-input text-foreground"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-foreground">
                  Teacher Instructions / Rubric Notes
                </Label>
                <Textarea
                  value={instructions}
                  onChange={(e) => setInstructions(e.target.value)}
                  placeholder="e.g. Include AD/AS diagram with labeled equilibrium shift..."
                  className="bg-background border-input text-foreground min-h-[80px]"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <Button
                variant="ghost"
                onClick={() => setCreateOpen(false)}
                className="text-muted-foreground hover:text-foreground"
              >
                Cancel
              </Button>
              <Button
                onClick={() => createMutation.mutate()}
                disabled={!title.trim() || createMutation.isPending}
                className="bg-purple-600 hover:bg-purple-500 text-white font-medium"
              >
                {createMutation.isPending ? "Assigning..." : "Assign to Class"}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Teacher Submissions Review Drawer Modal */}
      {selectedSubmissionsAssignmentId && (
        <TeacherSubmissionsModal
          classroomId={classroom.id}
          assignmentId={selectedSubmissionsAssignmentId}
          onClose={() => setSelectedSubmissionsAssignmentId(null)}
        />
      )}
    </div>
  );
}

// =========================================================================
// TEACHER SUBMISSION REVIEW MODAL
// =========================================================================

function TeacherSubmissionsModal({
  classroomId,
  assignmentId,
  onClose,
}: {
  classroomId: string;
  assignmentId: string;
  onClose: () => void;
}) {
  const queryClient = useQueryClient();
  const getSubmissionsFn = useServerFn(getAssignmentSubmissions);
  const gradeSubmissionFn = useServerFn(gradeAssignmentSubmission);

  const { data, isLoading } = useQuery({
    queryKey: ["assignment_submissions", assignmentId],
    queryFn: () => getSubmissionsFn({ data: { assignmentId, classroomId } }),
  });

  const [selectedStudentId, setSelectedStudentId] = useState<string | null>(null);
  const [scoreInput, setScoreInput] = useState<string>("");
  const [feedbackInput, setFeedbackInput] = useState<string>("");

  const students = useMemo(() => data?.students ?? [], [data?.students]);
  const assignment = data?.assignment;
  const effectiveMaxMarks = inferCambridgeEssayMaxMark(
    assignment?.essay_max_mark,
    `${assignment?.essay_question || ""} ${assignment?.title || ""}`,
  );

  // Sync selected student
  useEffect(() => {
    if (students.length > 0 && !selectedStudentId) {
      setSelectedStudentId(students[0].studentId);
    }
  }, [students, selectedStudentId]);

  const activeStudent = useMemo(
    () => students.find((s) => s.studentId === selectedStudentId) ?? null,
    [students, selectedStudentId],
  );

  useEffect(() => {
    if (activeStudent?.submission) {
      const s = activeStudent.submission;
      setScoreInput(String(s.teacherScore ?? s.aiScore ?? ""));
      setFeedbackInput(s.teacherFeedback ?? "");
    } else {
      setScoreInput("");
      setFeedbackInput("");
    }
  }, [activeStudent]);

  const gradeMutation = useMutation({
    mutationFn: async (returnToStudent: boolean) => {
      if (!activeStudent) return;
      return gradeSubmissionFn({
        data: {
          assignmentId,
          studentId: activeStudent.studentId,
          classroomId,
          teacherScore: Number(scoreInput),
          teacherFeedback: feedbackInput,
          returnToStudent,
        },
      });
    },
    onSuccess: (_, returnToStudent) => {
      toast.success(returnToStudent ? "Grade returned to student!" : "Grade saved as draft");
      queryClient.invalidateQueries({ queryKey: ["assignment_submissions", assignmentId] });
      queryClient.invalidateQueries({ queryKey: ["classroom_assignments", classroomId] });
      queryClient.invalidateQueries({ queryKey: ["classroom_gradebook", classroomId] });
    },
    onError: (err: Error) => toast.error(err.message),
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-md animate-in fade-in">
      <div className="w-full max-w-5xl h-[92vh] sm:h-[85vh] bg-card border border-border rounded-2xl sm:rounded-3xl shadow-2xl flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-4 sm:p-5 px-5 sm:px-6 border-b border-border bg-background/60">
          <div>
            <h3 className="text-sm sm:text-base font-bold text-foreground tracking-tight flex items-center gap-2">
              <FileCheck2 className="h-4 sm:h-5 w-4 sm:w-5 text-purple-400" />
              {assignment?.title || "Assignment Submissions"}
            </h3>
            <p className="text-[11px] sm:text-xs text-muted-foreground mt-0.5">
              Review Cambridge essay answers, inspect AI grading, and return teacher marks.
            </p>
          </div>

          <button onClick={onClose} className="text-muted-foreground hover:text-foreground p-1 rounded-lg hover:bg-muted transition-colors">
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* 2-Column Review Body */}
        <div className="flex-1 flex flex-col md:grid md:grid-cols-3 overflow-hidden">
          {/* Left Student List */}
          <div className="border-r border-border max-h-48 md:max-h-none overflow-y-auto p-3 sm:p-4 space-y-2 bg-background/40 shrink-0">
            <div className="text-xs font-bold uppercase text-muted-foreground tracking-wider mb-2">
              Students ({students.length})
            </div>

            {isLoading ? (
              <div className="space-y-2">
                {[1, 2, 3].map((n) => (
                  <div key={n} className="h-14 rounded-xl bg-muted/40 animate-pulse" />
                ))}
              </div>
            ) : (
              students.map((st) => {
                const isSelected = st.studentId === selectedStudentId;
                const sub = st.submission;
                const isTurnedIn = Boolean(sub && sub.status !== "assigned");

                return (
                  <div
                    key={st.studentId}
                    onClick={() => setSelectedStudentId(st.studentId)}
                    className={cn(
                      "p-3 rounded-xl border transition-all cursor-pointer flex items-center justify-between gap-2",
                      isSelected
                        ? "bg-purple-950/60 border-purple-500 text-white shadow-md"
                        : "bg-card border-border/80 text-foreground hover:bg-muted/60",
                    )}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="h-8 w-8 rounded-full bg-purple-700 flex items-center justify-center font-bold text-white text-xs shrink-0">
                        {getInitials(st.fullName)}
                      </div>
                      <div className="min-w-0">
                        <div className="text-xs font-semibold truncate">{st.fullName}</div>
                        <div className="text-[10px] text-muted-foreground truncate">{st.email}</div>
                      </div>
                    </div>

                    <div>
                      {sub?.teacherScore !== null && sub?.teacherScore !== undefined ? (
                        <Badge className="bg-emerald-950 text-emerald-300 border-emerald-700 text-[10px] px-2">
                          {sub.teacherScore}/{effectiveMaxMarks}
                        </Badge>
                      ) : isTurnedIn ? (
                        <Badge className="bg-blue-950 text-blue-300 border-blue-700 text-[10px] px-2">
                          Turned in
                        </Badge>
                      ) : (
                        <span className="text-[11px] text-muted-foreground italic">Missing</span>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Right Selected Student Submission & Grading View */}
          <div className="md:col-span-2 flex flex-col h-full overflow-hidden bg-card">
            {activeStudent ? (
              <div className="flex-1 flex flex-col overflow-hidden">
                {/* Submission Content Area */}
                <div className="flex-1 overflow-y-auto p-6 space-y-4">
                  <div className="flex items-center justify-between pb-3 border-b border-border">
                    <div>
                      <h4 className="text-sm font-bold text-foreground">{activeStudent.fullName}</h4>
                      <p className="text-xs text-muted-foreground">{activeStudent.email}</p>
                    </div>

                    {activeStudent.submission?.submittedAt && (
                      <div className="text-xs text-muted-foreground">
                        Submitted: {new Date(activeStudent.submission.submittedAt).toLocaleString()}
                      </div>
                    )}
                  </div>

                  {activeStudent.submission ? (
                    <div className="space-y-4">
                      {/* Direct Grade in Essay Grader Action Callout */}
                      <div className="p-4 rounded-2xl bg-gradient-to-r from-purple-950/70 via-indigo-950/70 to-purple-950/70 border border-purple-500/40 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-lg">
                        <div className="flex items-center gap-3">
                          <div className="h-9 w-9 rounded-xl bg-purple-600/30 border border-purple-500/50 flex items-center justify-center text-purple-300 shrink-0">
                            <Sparkles className="h-4 w-4" />
                          </div>
                          <div>
                            <div className="text-xs font-bold text-white flex items-center gap-1.5">
                              Direct Grade in Essay Grader
                              <Badge className="bg-purple-800/80 text-purple-200 border-purple-700 text-[10px]">
                                Full Examiner Desk
                              </Badge>
                            </div>
                            <div className="text-[11px] text-purple-200/90 mt-0.5">
                              Run Cambridge IGCSE 0455 rubric evaluation, multi-pass moderation &amp; return marks.
                            </div>
                          </div>
                        </div>

                        <Link
                          to="/grade"
                          search={{
                            q: assignment?.essay_question || assignment?.title || "",
                            marks: (effectiveMaxMarks === 2 || effectiveMaxMarks === 4 || effectiveMaxMarks === 6 || effectiveMaxMarks === 8
                              ? effectiveMaxMarks
                              : 8) as 2 | 4 | 6 | 8,
                            text: activeStudent.submission.submissionText || "",
                            assignmentId: assignment?.id,
                            studentId: activeStudent.studentId,
                            classroomId: classroomId,
                            studentName: activeStudent.fullName,
                          }}
                          className="px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold flex items-center gap-1.5 shadow-md shadow-purple-900/30 transition-all shrink-0"
                        >
                          <Sparkles className="h-3.5 w-3.5" />
                          Grade in Essay Grader
                        </Link>
                      </div>

                      {/* Submitted Text */}
                      <div className="space-y-2">
                        <div className="flex items-center justify-between flex-wrap gap-2">
                          <Label className="text-xs font-bold uppercase text-muted-foreground tracking-wider">
                            Student's Submitted Essay Answer:
                          </Label>
                          {activeStudent.submission.submissionType === "document" ? (
                            <Badge
                              variant="outline"
                              className="border-blue-500/40 bg-blue-500/10 text-blue-300 text-[10px] font-semibold"
                            >
                              <FileText className="h-3 w-3 mr-1 text-blue-400" />
                              Word / PDF Document
                            </Badge>
                          ) : activeStudent.submission.submissionType === "handwritten" ? (
                            <Badge
                              variant="outline"
                              className="border-purple-500/40 bg-purple-500/10 text-purple-300 text-[10px] font-semibold"
                            >
                              <PenLine className="h-3 w-3 mr-1 text-purple-400" />
                              Handwritten OCR Script
                            </Badge>
                          ) : (
                            <Badge
                              variant="outline"
                              className="border-emerald-500/40 bg-emerald-500/10 text-emerald-300 text-[10px] font-semibold"
                            >
                              <FileEdit className="h-3 w-3 mr-1 text-emerald-400" />
                              Typed Answer
                            </Badge>
                          )}
                        </div>
                        <div className="p-4 rounded-2xl bg-background border border-border text-sm text-foreground leading-relaxed whitespace-pre-wrap">
                          {activeStudent.submission.submissionText ||
                            "Linked graded essay version."}
                        </div>
                      </div>

                      {/* AI Grader Feedback if present */}
                      {activeStudent.submission.aiScore !== null && (
                        <div className="p-4 rounded-2xl bg-purple-50 dark:bg-purple-950/20 border border-purple-200 dark:border-purple-900/40 text-xs text-purple-900 dark:text-purple-300 space-y-2">
                          <div className="flex items-center justify-between font-bold">
                            <span className="flex items-center gap-1.5">
                              <Sparkles className="h-4 w-4 text-purple-400" />
                              AI Examiner Preliminary Mark
                            </span>
                            <span>
                              {activeStudent.submission.aiScore} /{" "}
                              {effectiveMaxMarks}
                            </span>
                          </div>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="py-20 text-center text-muted-foreground">
                      <FileText className="h-10 w-10 text-muted-foreground mx-auto mb-2" />
                      <p className="text-sm">This student has not turned in this assignment yet.</p>
                    </div>
                  )}
                </div>

                {/* Bottom Teacher Grading Input Footer */}
                <div className="p-5 border-t border-border bg-background/80 space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 items-end">
                    <div className="space-y-1.5">
                      <Label className="text-xs font-bold text-foreground">
                        Awarded Score (/{effectiveMaxMarks})
                      </Label>
                      <Input
                        type="number"
                        min={0}
                        max={effectiveMaxMarks}
                        value={scoreInput}
                        onChange={(e) => setScoreInput(e.target.value)}
                        placeholder="e.g. 17"
                        className="bg-card border-input text-foreground text-base font-bold focus:border-purple-500"
                      />
                    </div>

                    <div className="sm:col-span-3 space-y-1.5">
                      <Label className="text-xs font-bold text-foreground">
                        Teacher Feedback / Examiner Commentary
                      </Label>
                      <Input
                        value={feedbackInput}
                        onChange={(e) => setFeedbackInput(e.target.value)}
                        placeholder="e.g. Strong AO1 definitions and AO2 application; expand on AO3 evaluation."
                        className="bg-card border-input text-foreground text-xs focus:border-purple-500"
                      />
                    </div>
                  </div>

                  <div className="flex items-center justify-end gap-3 pt-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => gradeMutation.mutate(false)}
                      disabled={scoreInput === "" || gradeMutation.isPending}
                      className="text-muted-foreground hover:text-foreground text-xs"
                    >
                      Save Draft
                    </Button>

                    <Button
                      size="sm"
                      onClick={() => gradeMutation.mutate(true)}
                      disabled={scoreInput === "" || gradeMutation.isPending}
                      className="bg-purple-600 hover:bg-purple-500 text-white text-xs font-semibold shadow-md shadow-purple-500/10"
                    >
                      <Send className="h-3.5 w-3.5 mr-1.5" />
                      {gradeMutation.isPending ? "Returning..." : "Return Grade to Student"}
                    </Button>
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex-1 flex items-center justify-center text-muted-foreground text-sm">
                Select a student on the left to grade their work.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// =========================================================================
// TAB 4: PEOPLE (Teachers, Student Roster, Insights & Analytics)
// =========================================================================

function PeopleTab({
  classroom,
  isStaff,
  isAdmin,
  onLeaveClass,
}: {
  classroom: Classroom;
  isStaff: boolean;
  isAdmin: boolean;
  onLeaveClass: () => void;
}) {
  const queryClient = useQueryClient();
  const getTeachersFn = useServerFn(getClassroomTeachers);
  const getRosterFn = useServerFn(getClassroomRoster);
  const addTeacherFn = useServerFn(addClassroomTeacher);
  const addStudentFn = useServerFn(addClassroomStudent);
  const removeTeacherFn = useServerFn(removeClassroomTeacher);
  const removeMemberFn = useServerFn(removeClassroomMember);
  const leaveClassFn = useServerFn(leaveClassroom);
  const rotateCodeFn = useServerFn(rotateClassroomCode);

  const [search, setSearch] = useState("");
  const [inviteTeacherOpen, setInviteTeacherOpen] = useState(false);
  const [teacherEmail, setTeacherEmail] = useState("");
  const [inviteStudentOpen, setInviteStudentOpen] = useState(false);
  const [studentEmail, setStudentEmail] = useState("");
  const [selectedStudentForInsights, setSelectedStudentForInsights] = useState<{
    id: string;
    name: string;
  } | null>(null);

  const { data: teachersData } = useQuery({
    queryKey: ["classroom_teachers", classroom.id],
    queryFn: () => getTeachersFn({ data: { classroomId: classroom.id } }),
  });

  const { data: roster, isLoading: isRosterLoading } = useQuery({
    queryKey: ["classroom_roster", classroom.id],
    queryFn: () => getRosterFn({ data: { classroomId: classroom.id } }),
  });

  const teachers = useMemo(() => teachersData?.teachers ?? [], [teachersData?.teachers]);
  const students = useMemo(() => (roster ?? []) as RosterStudent[], [roster]);

  const filteredStudents = useMemo(() => {
    if (!search.trim()) return students;
    const q = search.toLowerCase();
    return students.filter(
      (s) =>
        (s.full_name || "").toLowerCase().includes(q) ||
        (s.email || "").toLowerCase().includes(q) ||
        (s.school || "").toLowerCase().includes(q),
    );
  }, [students, search]);

  const addTeacherMutation = useMutation({
    mutationFn: async () => {
      return addTeacherFn({
        data: {
          classroomId: classroom.id,
          email: teacherEmail.trim(),
        },
      });
    },
    onSuccess: () => {
      toast.success("Co-teacher added successfully!");
      setTeacherEmail("");
      setInviteTeacherOpen(false);
      queryClient.invalidateQueries({ queryKey: ["classroom_teachers", classroom.id] });
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const addStudentMutation = useMutation({
    mutationFn: async () => {
      return addStudentFn({
        data: {
          classroomId: classroom.id,
          email: studentEmail.trim(),
        },
      });
    },
    onSuccess: () => {
      toast.success("Student enrolled successfully!");
      setStudentEmail("");
      setInviteStudentOpen(false);
      queryClient.invalidateQueries({ queryKey: ["classroom_roster", classroom.id] });
    },
    onError: (err: Error) => toast.error(err.message),
  });

  return (
    <div className="space-y-8 max-w-4xl mx-auto">
      {/* Teachers Section */}
      <div className="bg-card rounded-3xl border border-border p-6 sm:p-8 space-y-6 shadow-xl">
        <div className="flex items-center justify-between border-b border-border pb-4">
          <div>
            <h3 className="text-xl font-bold text-foreground tracking-tight flex items-center gap-2">
              <School className="h-5 w-5 text-purple-400" />
              Teachers
            </h3>
            <p className="text-xs text-muted-foreground mt-1">
              Economics instructors managing this classroom.
            </p>
          </div>

          {isStaff && (
            <Button
              size="sm"
              onClick={() => setInviteTeacherOpen(true)}
              className="bg-purple-600 hover:bg-purple-500 text-white text-xs font-semibold"
            >
              <UserPlus className="h-3.5 w-3.5 mr-1.5" />
              Add Teacher
            </Button>
          )}
        </div>

        <div className="space-y-3">
          {teachers.map((t) => (
            <div
              key={t.teacherId}
              className="flex items-center justify-between p-3.5 rounded-2xl bg-background/40 border border-border/80"
            >
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-purple-600/80 border border-purple-400/30 flex items-center justify-center font-bold text-white text-sm">
                  {getInitials(t.fullName)}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-sm text-foreground">{t.fullName}</span>
                    {t.owner ? (
                      <Badge className="bg-purple-100 dark:bg-purple-950 text-purple-800 dark:text-purple-300 border-purple-200 dark:border-purple-700 text-[10px] py-0">
                        Owner
                      </Badge>
                    ) : (
                      <Badge className="bg-muted text-foreground border-input text-[10px] py-0">
                        Co-Teacher
                      </Badge>
                    )}
                  </div>
                  <div className="text-xs text-muted-foreground flex items-center gap-2 mt-0.5">
                    <span>{t.email}</span>
                    {t.school && <span>• {t.school}</span>}
                  </div>
                </div>
              </div>

              {isStaff && !t.owner && (
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => {
                    if (confirm(`Remove ${t.fullName} from co-teachers?`)) {
                      removeTeacherFn({
                        data: { classroomId: classroom.id, teacherId: t.teacherId },
                      }).then(() => {
                        toast.success("Teacher removed");
                        queryClient.invalidateQueries({
                          queryKey: ["classroom_teachers", classroom.id],
                        });
                      });
                    }
                  }}
                  className="text-muted-foreground hover:text-rose-400 h-8 w-8 p-0"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Classmates / Student Roster Section */}
      <div className="bg-card rounded-3xl border border-border p-6 sm:p-8 space-y-6 shadow-xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border pb-4">
          <div>
            <h3 className="text-xl font-bold text-foreground tracking-tight flex items-center gap-2">
              <UsersRound className="h-5 w-5 text-purple-400" />
              Classmates ({students.length})
            </h3>
            <p className="text-xs text-muted-foreground mt-1">
              Enrolled students taking Cambridge Economics.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <div className="w-full sm:w-56">
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search students..."
                className="bg-background border-input text-xs text-foreground"
              />
            </div>
            {isStaff && (
              <Button
                size="sm"
                onClick={() => setInviteStudentOpen(true)}
                className="bg-purple-600 hover:bg-purple-500 text-white text-xs font-semibold shrink-0"
              >
                <UserPlus className="h-3.5 w-3.5 mr-1.5" />
                Add Student
              </Button>
            )}
          </div>
        </div>

        {isRosterLoading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((n) => (
              <div key={n} className="h-14 rounded-2xl bg-background/40 animate-pulse" />
            ))}
          </div>
        ) : filteredStudents.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <UsersRound className="h-10 w-10 text-muted-foreground mx-auto mb-2" />
            <p className="text-xs">
              No students enrolled yet. Share the class code with your students.
            </p>
          </div>
        ) : (
          <div className="space-y-2.5">
            {filteredStudents.map((st) => (
              <div
                key={st.student_id}
                className="flex items-center justify-between p-3 rounded-2xl bg-background/40 border border-border/80 hover:bg-background/70 transition-all"
              >
                <div className="flex items-center gap-3">
                  <div className="h-9 w-9 rounded-full bg-muted border border-input flex items-center justify-center font-bold text-white text-xs">
                    {getInitials(st.full_name || "Student")}
                  </div>
                  <div>
                    <div className="font-semibold text-sm text-foreground">
                      {st.full_name || "Student"}
                    </div>
                    <div className="text-xs text-muted-foreground flex items-center gap-2">
                      <span>{st.email}</span>
                      {st.school && <span>• {st.school}</span>}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {isStaff && (
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() =>
                        setSelectedStudentForInsights({
                          id: st.student_id,
                          name: st.full_name || "Student",
                        })
                      }
                      className="text-xs text-purple-600 dark:text-purple-400 hover:bg-purple-500/10 rounded-md px-2 py-1"
                    >
                      <BarChart3 className="h-3.5 w-3.5 mr-1" />
                      Analytics
                    </Button>
                  )}

                  {isStaff && (
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => {
                        if (confirm(`Remove ${st.full_name || "this student"} from class?`)) {
                          removeMemberFn({
                            data: { membershipId: st.membership_id, classroomId: classroom.id },
                          }).then(() => {
                            toast.success("Student removed from class");
                            queryClient.invalidateQueries({
                              queryKey: ["classroom_roster", classroom.id],
                            });
                          });
                        }
                      }}
                      className="text-muted-foreground hover:text-rose-400 h-8 w-8 p-0"
                      title="Remove student"
                    >
                      <UserMinus className="h-3.5 w-3.5" />
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Student leave button */}
        {!isStaff && (
          <div className="pt-4 border-t border-border flex justify-end">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                if (confirm("Are you sure you want to leave this classroom?")) {
                  leaveClassFn({ data: { classroomId: classroom.id } }).then(() => {
                    toast.success("Left classroom");
                    onLeaveClass();
                  });
                }
              }}
              className="text-xs text-rose-400 hover:text-rose-300 hover:bg-rose-950/30"
            >
              <LogOut className="h-3.5 w-3.5 mr-1.5" />
              Leave Classroom
            </Button>
          </div>
        )}
      </div>

      {/* Invite Teacher Modal */}
      {inviteTeacherOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in">
          <div className="w-full max-w-md bg-card border border-border rounded-2xl p-6 shadow-2xl space-y-5 text-left">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold text-foreground flex items-center gap-2">
                <UserPlus className="h-5 w-5 text-purple-400" />
                Invite Co-Teacher
              </h3>
              <button
                onClick={() => setInviteTeacherOpen(false)}
                className="text-muted-foreground hover:text-foreground"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <p className="text-xs text-muted-foreground">
              Enter the email address of the teacher you want to collaborate with. They must have a
              Marginalite account with Teacher privileges.
            </p>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-foreground">Teacher Email</Label>
              <Input
                type="email"
                value={teacherEmail}
                onChange={(e) => setTeacherEmail(e.target.value)}
                placeholder="teacher@school.edu"
                className="bg-background border-input text-foreground"
              />
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <Button
                variant="ghost"
                onClick={() => setInviteTeacherOpen(false)}
                className="text-muted-foreground hover:text-foreground"
              >
                Cancel
              </Button>
              <Button
                onClick={() => addTeacherMutation.mutate()}
                disabled={!teacherEmail.trim() || addTeacherMutation.isPending}
                className="bg-purple-600 hover:bg-purple-500 text-white font-medium"
              >
                {addTeacherMutation.isPending ? "Adding..." : "Add Co-Teacher"}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Invite Student Modal */}
      {inviteStudentOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in">
          <div className="w-full max-w-md bg-card border border-border rounded-2xl p-6 shadow-2xl space-y-5 text-left">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold text-foreground flex items-center gap-2">
                <UserPlus className="h-5 w-5 text-purple-400" />
                Enroll Student
              </h3>
              <button
                onClick={() => setInviteStudentOpen(false)}
                className="text-muted-foreground hover:text-foreground"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <p className="text-xs text-muted-foreground">
              Enter the email address of the student to add them directly to this classroom. Alternatively, students can join anytime using class code <span className="font-mono font-bold text-purple-400">{classroom.join_code}</span>.
            </p>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-foreground">Student Email</Label>
              <Input
                type="email"
                value={studentEmail}
                onChange={(e) => setStudentEmail(e.target.value)}
                placeholder="student@school.edu"
                className="bg-background border-input text-foreground"
              />
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <Button
                variant="ghost"
                onClick={() => setInviteStudentOpen(false)}
                className="text-muted-foreground hover:text-foreground"
              >
                Cancel
              </Button>
              <Button
                onClick={() => addStudentMutation.mutate()}
                disabled={!studentEmail.trim() || addStudentMutation.isPending}
                className="bg-purple-600 hover:bg-purple-500 text-white font-medium"
              >
                {addStudentMutation.isPending ? "Enrolling..." : "Enroll Student"}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Student Lifetime Portfolio Modal */}
      {selectedStudentForInsights && (
        <StudentLifetimePortfolioModal
          classroomId={classroom.id}
          studentId={selectedStudentForInsights.id}
          studentName={selectedStudentForInsights.name}
          onClose={() => setSelectedStudentForInsights(null)}
        />
      )}
    </div>
  );
}

// =========================================================================
// STUDENT LIFETIME PORTFOLIO & DIAGNOSTICS MODAL (ALL ESSAYS & MCQS)
// =========================================================================

function StudentLifetimePortfolioModal({
  classroomId,
  studentId,
  studentName,
  onClose,
}: {
  classroomId: string;
  studentId: string;
  studentName: string;
  onClose: () => void;
}) {
  const getPortfolioFn = useServerFn(getStudentLifetimePortfolio);
  const [activeTab, setActiveTab] = useState<"essays" | "mcqs" | "topics">("essays");
  const [expandedEssayId, setExpandedEssayId] = useState<string | null>(null);
  const [expandedMcqId, setExpandedMcqId] = useState<string | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ["student_lifetime_portfolio", classroomId, studentId],
    queryFn: () => getPortfolioFn({ data: { classroomId, studentId } }),
  });

  const portfolio = data ?? null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-in fade-in">
      <div className="w-full max-w-4xl max-h-[88vh] bg-card border border-border rounded-3xl shadow-2xl flex flex-col overflow-hidden text-left">
        {/* Header */}
        <div className="flex items-center justify-between p-5 px-6 border-b border-border bg-background/80">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-full bg-purple-700 flex items-center justify-center font-bold text-white text-sm shrink-0">
              {getInitials(studentName)}
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-base font-bold text-foreground tracking-tight">{studentName}</h3>
                {portfolio?.student.level && (
                  <Badge className="bg-purple-100 dark:bg-purple-950 text-purple-800 dark:text-purple-300 border-purple-200 dark:border-purple-800 text-[10px]">
                    {portfolio.student.level}
                  </Badge>
                )}
                <Badge
                  variant="outline"
                  className="bg-background text-muted-foreground border-input text-[10px]"
                >
                  Cambridge IGCSE 0455
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">
                {portfolio?.student.email || "Enrolled Student"}
                {portfolio?.student.school ? ` • ${portfolio.student.school}` : ""}
                {portfolio?.student.targetGrade ? ` • Target: ${portfolio.student.targetGrade}` : ""}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-muted-foreground hover:text-foreground p-1.5 rounded-lg hover:bg-muted transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {isLoading ? (
            <div className="py-20 text-center text-muted-foreground text-xs flex flex-col items-center justify-center gap-2">
              <RefreshCw className="h-6 w-6 animate-spin text-purple-400" />
              <span>Loading complete student academic portfolio...</span>
            </div>
          ) : !portfolio ? (
            <div className="py-20 text-center text-muted-foreground text-xs">
              No historical essay or MCQ records found for this student.
            </div>
          ) : (
            <>
              {/* Summary KPIs */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="p-4 rounded-2xl bg-background border border-border space-y-1">
                  <div className="text-[10px] uppercase font-bold text-muted-foreground">
                    Lifetime Essay Avg
                  </div>
                  <div className="text-2xl font-black text-purple-400">
                    {portfolio.summary.averageEssayPercent !== null
                      ? `${portfolio.summary.averageEssayPercent}%`
                      : "--"}
                  </div>
                  <div className="text-[10px] text-muted-foreground">
                    {portfolio.summary.totalEssaysMarked} essay(s) evaluated
                  </div>
                </div>

                <div className="p-4 rounded-2xl bg-background border border-border space-y-1">
                  <div className="text-[10px] uppercase font-bold text-muted-foreground">
                    MCQ Accuracy
                  </div>
                  <div className="text-2xl font-black text-emerald-400">
                    {portfolio.summary.mcqAccuracyPercent !== null
                      ? `${portfolio.summary.mcqAccuracyPercent}%`
                      : "--"}
                  </div>
                  <div className="text-[10px] text-muted-foreground">
                    {portfolio.summary.totalMcqCorrect} of {portfolio.summary.totalMcqAttempted} correct
                  </div>
                </div>

                <div className="p-4 rounded-2xl bg-background border border-border space-y-1">
                  <div className="text-[10px] uppercase font-bold text-muted-foreground">
                    Academic Level
                  </div>
                  <div className="text-xl font-black text-foreground">
                    {portfolio.student.level}
                  </div>
                  <div className="text-[10px] text-muted-foreground">
                    Exam Board: {portfolio.student.examBoard}
                  </div>
                </div>

                <div className="p-4 rounded-2xl bg-background border border-border space-y-1">
                  <div className="text-[10px] uppercase font-bold text-muted-foreground">
                    Practice Runs
                  </div>
                  <div className="text-2xl font-black text-blue-400">
                    {portfolio.summary.liveExaminerSessions}
                  </div>
                  <div className="text-[10px] text-muted-foreground">
                    Live interactive sessions
                  </div>
                </div>
              </div>

              {/* Sub Tabs Selector */}
              <div className="flex items-center gap-2 border-b border-border pb-2">
                <button
                  type="button"
                  onClick={() => setActiveTab("essays")}
                  className={cn(
                    "px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2",
                    activeTab === "essays"
                      ? "bg-purple-600 text-white shadow-md shadow-purple-500/10"
                      : "text-muted-foreground hover:text-foreground hover:bg-muted/60",
                  )}
                >
                  <FileText className="h-4 w-4" />
                  All Essays Attempted ({portfolio.essays.length})
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab("mcqs")}
                  className={cn(
                    "px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2",
                    activeTab === "mcqs"
                      ? "bg-purple-600 text-white shadow-md shadow-purple-500/10"
                      : "text-muted-foreground hover:text-foreground hover:bg-muted/60",
                  )}
                >
                  <BookOpen className="h-4 w-4" />
                  MCQ Attempts & Papers ({portfolio.mcqs.length})
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab("topics")}
                  className={cn(
                    "px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2",
                    activeTab === "topics"
                      ? "bg-purple-600 text-white shadow-md shadow-purple-500/10"
                      : "text-muted-foreground hover:text-foreground hover:bg-muted/60",
                  )}
                >
                  <BarChart3 className="h-4 w-4" />
                  Topic Mastery & Diagnostics ({portfolio.topics.length})
                </button>
              </div>

              {/* VIEW 1: ALL ESSAYS ATTEMPTED */}
              {activeTab === "essays" && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span>
                      Complete essay submission history across class assignments and self-directed practice.
                    </span>
                    <span className="font-semibold text-foreground">
                      {portfolio.essays.length} total attempt(s)
                    </span>
                  </div>

                  {portfolio.essays.length === 0 ? (
                    <div className="text-center py-12 px-4 rounded-2xl border border-dashed border-border bg-background/40 text-muted-foreground text-xs">
                      No essays recorded for this student yet.
                    </div>
                  ) : (
                    portfolio.essays.map((e) => {
                      const isExpanded = expandedEssayId === e.id;
                      const hasFeedback = Boolean(e.feedback);
                      return (
                        <div
                          key={e.id}
                          className="p-4 rounded-2xl bg-background border border-border hover:border-input transition-all space-y-3"
                        >
                          <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                            <div className="space-y-1 flex-1">
                              <div className="flex items-center gap-2 flex-wrap">
                                {e.mark !== null ? (
                                  <Badge
                                    className={cn(
                                      "text-xs font-bold",
                                      (e.percentage ?? 0) >= 80
                                        ? "bg-emerald-950 text-emerald-300 border-emerald-800"
                                        : (e.percentage ?? 0) >= 60
                                          ? "bg-purple-100 dark:bg-purple-950 text-purple-800 dark:text-purple-300 border-purple-200 dark:border-purple-800"
                                          : "bg-amber-950 text-amber-300 border-amber-800",
                                    )}
                                  >
                                    Score: {e.mark} / {e.maxMark}{" "}
                                    {e.percentage !== null ? `(${e.percentage}%)` : ""}
                                  </Badge>
                                ) : (
                                  <Badge className="bg-card text-muted-foreground border-border text-xs">
                                    Ungraded
                                  </Badge>
                                )}

                                <Badge
                                  variant="outline"
                                  className={cn(
                                    "text-[10px]",
                                    e.isAssignment
                                      ? "bg-blue-950/60 text-blue-300 border-blue-800"
                                      : "bg-card text-muted-foreground border-border",
                                  )}
                                >
                                  {e.isAssignment ? "Class Assignment" : "Marking Desk / Practice"}
                                </Badge>

                                {e.ao1 !== null && (
                                  <span className="text-[10px] text-muted-foreground">
                                    AO1: <strong className="text-foreground">{e.ao1}</strong> | AO2:{" "}
                                    <strong className="text-foreground">{e.ao2 ?? "--"}</strong> | AO3:{" "}
                                    <strong className="text-foreground">{e.ao3 ?? "--"}</strong>
                                  </span>
                                )}
                              </div>

                              <p className="text-sm font-semibold text-foreground mt-1 leading-snug">
                                {e.question}
                              </p>
                              <div className="text-[10px] text-muted-foreground">
                                Submitted {new Date(e.createdAt).toLocaleString(undefined, {
                                  dateStyle: "medium",
                                  timeStyle: "short",
                                })}
                              </div>
                            </div>

                            <div className="flex items-center gap-2 flex-wrap self-start shrink-0">
                              <Link
                                to="/grade"
                                search={{
                                  q: e.question,
                                  marks: (e.maxMark === 2 || e.maxMark === 4 || e.maxMark === 6 || e.maxMark === 8
                                    ? e.maxMark
                                    : 8) as 2 | 4 | 6 | 8,
                                  text: e.submissionText || "",
                                  assignmentId: e.assignmentId || undefined,
                                  studentId: studentId,
                                  classroomId: classroomId,
                                  studentName: studentName,
                                }}
                                className="px-3 py-1.5 rounded-xl bg-purple-600/20 hover:bg-purple-600/30 text-purple-300 border border-purple-500/40 text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-sm"
                              >
                                <Sparkles className="h-3.5 w-3.5" />
                                Grade in Essay Grader
                              </Link>

                              {(hasFeedback || e.submissionText || e.teacherFeedback) && (
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => setExpandedEssayId(isExpanded ? null : e.id)}
                                  className="text-purple-400 hover:text-purple-300 hover:bg-purple-950/30 text-xs shrink-0 self-start"
                                >
                                  {isExpanded ? "Hide Details" : "View Feedback & Text"}
                                  <ChevronDown
                                    className={cn(
                                      "h-3.5 w-3.5 ml-1 transition-transform",
                                      isExpanded && "rotate-180",
                                    )}
                                  />
                                </Button>
                              )}
                            </div>
                          </div>

                          {/* Expandable Examiner Feedback, Teacher Commentary & Student Text */}
                          {isExpanded && (
                            <div className="p-4 rounded-xl bg-card/80 border border-border text-xs text-foreground space-y-3 animate-in fade-in">
                              {e.teacherFeedback && (
                                <div className="p-3 rounded-lg bg-purple-950/30 border border-purple-800/50">
                                  <span className="font-bold text-purple-300 uppercase text-[10px] block mb-1">
                                    Teacher Feedback &amp; Commentary
                                  </span>
                                  <p className="text-purple-200 leading-relaxed">{e.teacherFeedback}</p>
                                </div>
                              )}

                              {e.submissionText && (
                                <div>
                                  <div className="flex items-center justify-between mb-1">
                                    <span className="font-bold text-muted-foreground uppercase text-[10px]">
                                      Student Submission Text
                                    </span>
                                    {(e as any).submissionType === "document" ? (
                                      <Badge
                                        variant="outline"
                                        className="border-blue-500/40 bg-blue-500/10 text-blue-300 text-[10px]"
                                      >
                                        <FileText className="h-3 w-3 mr-1 text-blue-400" />
                                        Word / PDF
                                      </Badge>
                                    ) : (e as any).submissionType === "handwritten" ? (
                                      <Badge
                                        variant="outline"
                                        className="border-purple-500/40 bg-purple-500/10 text-purple-300 text-[10px]"
                                      >
                                        <PenLine className="h-3 w-3 mr-1 text-purple-400" />
                                        Handwritten
                                      </Badge>
                                    ) : null}
                                  </div>
                                  <div className="p-3 rounded-lg bg-background/60 border border-border text-foreground leading-relaxed whitespace-pre-wrap max-h-56 overflow-y-auto">
                                    {e.submissionText}
                                  </div>
                                </div>
                              )}

                              {e.feedback && e.feedback.comment && (
                                <div>
                                  <span className="font-bold text-purple-300 uppercase text-[10px] block mb-1">
                                    Overall Examiner Comment
                                  </span>
                                  <p className="text-foreground leading-relaxed bg-background/60 p-3 rounded-lg border border-border/80">
                                    {(typeof e.feedback.comment === "string"
                                      ? e.feedback.comment
                                      : JSON.stringify(e.feedback.comment)).replace(/\*\*/g, "")}
                                  </p>
                                </div>
                              )}

                              {e.feedback &&
                                Array.isArray(e.feedback.strengths) &&
                                e.feedback.strengths.length > 0 && (
                                  <div>
                                    <span className="font-bold text-emerald-400 uppercase text-[10px] block mb-1">
                                      Key Strengths
                                    </span>
                                    <ul className="list-disc list-inside space-y-1 text-foreground pl-1">
                                      {e.feedback.strengths.map((str: any, idx: number) => (
                                        <li key={idx}>
                                          {(typeof str === "string" ? str : str?.description || JSON.stringify(str)).replace(/\*\*/g, "")}
                                        </li>
                                      ))}
                                    </ul>
                                  </div>
                                )}

                              {e.feedback &&
                                Array.isArray(e.feedback.improvements) &&
                                e.feedback.improvements.length > 0 && (
                                  <div>
                                    <span className="font-bold text-amber-400 uppercase text-[10px] block mb-1">
                                      Areas for Improvement
                                    </span>
                                    <ul className="list-disc list-inside space-y-1 text-foreground pl-1">
                                      {e.feedback.improvements.map((imp: any, idx: number) => (
                                        <li key={idx}>
                                          {(typeof imp === "string"
                                            ? imp
                                            : imp?.description || JSON.stringify(imp)).replace(/\*\*/g, "")}
                                        </li>
                                      ))}
                                    </ul>
                                  </div>
                                )}
                            </div>
                          )}
                        </div>
                      );
                    })
                  )}
                </div>
              )}

              {/* VIEW 2: ALL MCQ ATTEMPTS & PAPERS */}
              {activeTab === "mcqs" && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span>
                      All Cambridge past-paper exams and diagnostic topic tests attempted by the student.
                    </span>
                    <span className="font-semibold text-foreground">
                      {portfolio.mcqs.length} total attempt(s)
                    </span>
                  </div>

                  {portfolio.mcqs.length === 0 ? (
                    <div className="text-center py-12 px-4 rounded-2xl border border-dashed border-border bg-background/40 text-muted-foreground text-xs">
                      No MCQ test attempts recorded for this student yet.
                    </div>
                  ) : (
                    portfolio.mcqs.map((m) => {
                      const isExpanded = expandedMcqId === m.id;
                      const hasQuestions = Array.isArray(m.questions) && m.questions.length > 0;
                      return (
                        <div
                          key={m.id}
                          className="p-4 rounded-2xl bg-background border border-border hover:border-input transition-all space-y-3"
                        >
                          <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                            <div className="space-y-1 flex-1">
                              <div className="flex items-center gap-2 flex-wrap">
                                {m.score !== null ? (
                                  <Badge
                                    className={cn(
                                      "text-xs font-bold",
                                      (m.percentage ?? 0) >= 80
                                        ? "bg-emerald-950 text-emerald-300 border-emerald-800"
                                        : (m.percentage ?? 0) >= 60
                                          ? "bg-purple-100 dark:bg-purple-950 text-purple-800 dark:text-purple-300 border-purple-200 dark:border-purple-800"
                                          : "bg-amber-950 text-amber-300 border-amber-800",
                                    )}
                                  >
                                    Score: {m.score} / {m.total}{" "}
                                    {m.percentage !== null ? `(${m.percentage}%)` : ""}
                                  </Badge>
                                ) : (
                                  <Badge className="bg-card text-muted-foreground border-border text-xs">
                                    Incomplete
                                  </Badge>
                                )}

                                <Badge
                                  variant="outline"
                                  className="bg-card text-purple-300 border-purple-800 text-[10px]"
                                >
                                  {m.kind === "mcq_pdf" ? "Cambridge Past Paper" : "Topic Practice"}
                                </Badge>

                                <Badge
                                  variant="outline"
                                  className="bg-card text-muted-foreground border-border text-[10px]"
                                >
                                  {m.level.toUpperCase()} Level
                                </Badge>
                              </div>

                              <h4 className="text-sm font-semibold text-foreground mt-1">{m.title}</h4>
                              <div className="text-[10px] text-muted-foreground">
                                Completed {new Date(m.completedAt).toLocaleString(undefined, {
                                  dateStyle: "medium",
                                  timeStyle: "short",
                                })}
                              </div>
                            </div>

                            {hasQuestions && (
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => setExpandedMcqId(isExpanded ? null : m.id)}
                                className="text-purple-400 hover:text-purple-300 hover:bg-purple-950/30 text-xs shrink-0 self-start"
                              >
                                {isExpanded ? "Hide Details" : "View Breakdown"}
                                <ChevronDown
                                  className={cn(
                                    "h-3.5 w-3.5 ml-1 transition-transform",
                                    isExpanded && "rotate-180",
                                  )}
                                />
                              </Button>
                            )}
                          </div>

                          {/* Expandable Question-by-Question Review */}
                          {isExpanded && hasQuestions && (
                            <div className="p-4 rounded-xl bg-card/80 border border-border text-xs text-foreground space-y-2.5 animate-in fade-in max-h-72 overflow-y-auto">
                              <span className="font-bold text-muted-foreground uppercase text-[10px] block">
                                Question Diagnostic Breakdown
                              </span>
                              <div className="grid grid-cols-1 gap-2">
                                {m.questions.map((q: any, idx: number) => {
                                  const isCorrect =
                                    q?.is_correct ||
                                    (q?.user_answer && q?.user_answer === q?.correct_answer);
                                  return (
                                    <div
                                      key={idx}
                                      className="p-2.5 rounded-lg bg-background border border-border/80 flex items-start justify-between gap-3"
                                    >
                                      <div className="space-y-0.5">
                                        <div className="flex items-center gap-2">
                                          <span className="font-bold text-foreground text-xs">
                                            Q{q?.number || idx + 1}
                                          </span>
                                          {q?.topic && (
                                            <span className="text-[10px] text-muted-foreground">
                                              ({q.topic})
                                            </span>
                                          )}
                                        </div>
                                        {q?.explanation && (
                                          <p className="text-[11px] text-muted-foreground mt-1 leading-relaxed">
                                            {q.explanation}
                                          </p>
                                        )}
                                      </div>

                                      <div className="flex items-center gap-2 shrink-0">
                                        <span className="text-[11px] text-muted-foreground">
                                          User:{" "}
                                          <strong
                                            className={isCorrect ? "text-emerald-400" : "text-rose-400"}
                                          >
                                            {q?.user_answer || "--"}
                                          </strong>
                                        </span>
                                        <span className="text-[11px] text-muted-foreground">
                                          Key: <strong className="text-foreground">{q?.correct_answer || "--"}</strong>
                                        </span>
                                        {isCorrect ? (
                                          <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                                        ) : (
                                          <X className="h-4 w-4 text-rose-400" />
                                        )}
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })
                  )}
                </div>
              )}

              {/* VIEW 3: TOPIC MASTERY BREAKDOWN */}
              {activeTab === "topics" && (
                <div className="space-y-3">
                  <div className="text-xs text-muted-foreground">
                    Syllabus performance breakdown across all Cambridge IGCSE 0455 Economics units.
                  </div>

                  {portfolio.topics.length === 0 ? (
                    <div className="text-center py-12 px-4 rounded-2xl border border-dashed border-border bg-background/40 text-muted-foreground text-xs">
                      No topic performance statistics recorded yet.
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {portfolio.topics.map((top) => {
                        const acc = top.accuracyPct ?? 0;
                        return (
                          <div
                            key={top.topic}
                            className="p-4 rounded-xl bg-background border border-border space-y-2 text-xs"
                          >
                            <div className="flex items-center justify-between">
                              <span className="font-bold text-foreground">{top.topic}</span>
                              <Badge
                                className={cn(
                                  "text-[10px]",
                                  acc >= 75
                                    ? "bg-emerald-950 text-emerald-300 border-emerald-800"
                                    : acc >= 50
                                      ? "bg-purple-100 dark:bg-purple-950 text-purple-800 dark:text-purple-300 border-purple-200 dark:border-purple-800"
                                      : "bg-amber-950 text-amber-300 border-amber-800",
                                )}
                              >
                                {top.accuracyPct !== null ? `${top.accuracyPct}%` : "--"} (
                                {top.correct}/{top.attempted} correct)
                              </Badge>
                            </div>
                            <div className="w-full bg-muted h-2 rounded-full overflow-hidden">
                              <div
                                className={cn(
                                  "h-full rounded-full transition-all",
                                  acc >= 75
                                    ? "bg-emerald-500"
                                    : acc >= 50
                                      ? "bg-purple-500"
                                      : "bg-amber-500",
                                )}
                                style={{ width: `${Math.min(100, Math.max(0, acc))}%` }}
                              />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// =========================================================================
// TAB 5: GRADES (Classroom Gradebook Matrix & Student Portfolio Analytics)
// =========================================================================

function GradesTab({ classroom }: { classroom: Classroom }) {
  const [gradeView, setGradeView] = useState<"matrix" | "aggregate">("matrix");
  const [selectedStudentForPortfolio, setSelectedStudentForPortfolio] = useState<{
    id: string;
    name: string;
  } | null>(null);

  const getGradebookFn = useServerFn(getClassroomGradebook);
  const getAggregateFn = useServerFn(getClassroomAggregateAnalytics);

  const gradebookQuery = useQuery({
    queryKey: ["classroom_gradebook", classroom.id],
    queryFn: () => getGradebookFn({ data: { classroomId: classroom.id } }),
    enabled: gradeView === "matrix",
  });

  const aggregateQuery = useQuery({
    queryKey: ["classroom_aggregate_analytics", classroom.id],
    queryFn: () => getAggregateFn({ data: { classroomId: classroom.id } }),
    enabled: gradeView === "aggregate",
  });

  const students = useMemo(() => gradebookQuery.data?.students ?? [], [gradebookQuery.data?.students]);
  const assignments = useMemo(() => gradebookQuery.data?.assignments ?? [], [gradebookQuery.data?.assignments]);
  const matrix = useMemo(() => gradebookQuery.data?.gradeMatrix ?? {}, [gradebookQuery.data?.gradeMatrix]);
  const summary = gradebookQuery.data?.summary;

  const aggregateSummary = aggregateQuery.data?.summary;
  const aggregateStudents = useMemo(
    () => aggregateQuery.data?.students ?? [],
    [aggregateQuery.data?.students],
  );
  const topicDiagnostics = useMemo(
    () => aggregateQuery.data?.topicDiagnostics ?? [],
    [aggregateQuery.data?.topicDiagnostics],
  );
  const classWeaknesses = useMemo(
    () => aggregateQuery.data?.classWeaknesses ?? [],
    [aggregateQuery.data?.classWeaknesses],
  );
  const actionableRecommendations = useMemo(
    () => aggregateQuery.data?.actionableRecommendations ?? [],
    [aggregateQuery.data?.actionableRecommendations],
  );

  const exportCSV = () => {
    if (students.length === 0 || assignments.length === 0) {
      toast.error("No grades available to export yet.");
      return;
    }

    const headers = [
      "Student Name",
      "Email",
      "Overall Average %",
      ...assignments.map((a) => `${a.title} (Max ${a.maxMark})`),
    ];
    const rows = students.map((s) => {
      const studentGrades = assignments.map((a) => {
        const cell = matrix[`${s.id}_${a.id}`];
        return cell?.score !== null && cell?.score !== undefined ? cell.score : "";
      });
      return [
        s.fullName,
        s.email,
        s.overallAvgPct !== null ? `${s.overallAvgPct}%` : "",
        ...studentGrades,
      ];
    });

    const csvContent =
      "data:text/csv;charset=utf-8," + [headers, ...rows].map((e) => e.join(",")).join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `${classroom.name.replace(/\s+/g, "_")}_Gradebook.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success("Downloaded gradebook CSV");
  };

  return (
    <div className="space-y-6">
      {/* Grade View Sub-tabs Switcher */}
      <div className="flex items-center gap-2 p-1.5 bg-background/80 border border-border rounded-2xl w-fit">
        <button
          type="button"
          onClick={() => setGradeView("matrix")}
          className={cn(
            "px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2",
            gradeView === "matrix"
              ? "bg-purple-600 text-white shadow-md shadow-purple-500/10"
              : "text-muted-foreground hover:text-foreground hover:bg-muted/60",
          )}
        >
          <Clipboard className="h-4 w-4" />
          Assignments Gradebook
        </button>
        <button
          type="button"
          onClick={() => setGradeView("aggregate")}
          className={cn(
            "px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2",
            gradeView === "aggregate"
              ? "bg-purple-600 text-white shadow-md shadow-purple-500/10"
              : "text-muted-foreground hover:text-foreground hover:bg-muted/60",
          )}
        >
          <TrendingUp className="h-4 w-4" />
          Student Portfolio & Aggregate Analytics
        </button>
      </div>

      {/* VIEW A: ASSIGNMENTS MATRIX (Original Gradebook) */}
      {gradeView === "matrix" && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-card p-6 rounded-3xl border border-border shadow-xl">
            <div className="space-y-1">
              <h3 className="text-xl font-bold text-foreground tracking-tight flex items-center gap-2">
                <Award className="h-6 w-6 text-purple-400" />
                Class Gradebook
              </h3>
              <p className="text-xs text-muted-foreground">
                Real-time grade matrix across all Cambridge Economics essays and assessments set in this class.
              </p>
            </div>

            <div className="flex items-center gap-4">
              <div className="flex items-center gap-6 px-4 py-2 rounded-2xl bg-background border border-border text-xs">
                <div>
                  <span className="text-muted-foreground uppercase text-[10px] font-bold block">
                    Class Size
                  </span>
                  <span className="text-base font-bold text-foreground">
                    {summary?.totalStudents ?? 0}
                  </span>
                </div>
                <div>
                  <span className="text-muted-foreground uppercase text-[10px] font-bold block">Tasks</span>
                  <span className="text-base font-bold text-foreground">
                    {summary?.totalAssignments ?? 0}
                  </span>
                </div>
                <div>
                  <span className="text-muted-foreground uppercase text-[10px] font-bold block">
                    Class Average
                  </span>
                  <span className="text-base font-bold text-purple-400">
                    {summary?.overallClassAveragePct !== null &&
                    summary?.overallClassAveragePct !== undefined
                      ? `${summary.overallClassAveragePct}%`
                      : "--"}
                  </span>
                </div>
              </div>

              <Button
                size="sm"
                onClick={exportCSV}
                className="bg-muted hover:bg-muted/80 text-foreground border border-input text-xs font-semibold"
              >
                <Download className="h-3.5 w-3.5 mr-1.5" />
                Export CSV
              </Button>
            </div>
          </div>

          {gradebookQuery.isLoading ? (
            <div className="h-64 rounded-3xl bg-card/40 border border-border animate-pulse" />
          ) : students.length === 0 ? (
            <div className="text-center py-20 px-4 rounded-3xl border border-dashed border-border bg-muted/20">
              <UsersRound className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
              <h4 className="text-base font-medium text-foreground">No students enrolled yet</h4>
              <p className="text-xs text-muted-foreground max-w-sm mx-auto mt-1">
                Once students join your class code and turn in essays, their scores will populate this
                matrix automatically.
              </p>
            </div>
          ) : assignments.length === 0 ? (
            <div className="text-center py-20 px-4 rounded-3xl border border-dashed border-border bg-muted/20">
              <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
              <h4 className="text-base font-medium text-foreground">No assignments created yet</h4>
              <p className="text-xs text-muted-foreground max-w-sm mx-auto mt-1">
                Create your first essay or MCQ paper from the Classwork tab to start grading.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto rounded-3xl border border-border bg-card shadow-xl">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-border bg-background/80">
                    <th className="p-4 pl-6 font-bold text-foreground sticky left-0 bg-background z-20 min-w-[200px]">
                      Student Name
                    </th>
                    <th className="p-4 font-bold text-purple-300 min-w-[120px] text-center border-r border-border">
                      Overall Avg
                    </th>
                    {assignments.map((a) => (
                      <th
                        key={a.id}
                        className="p-4 min-w-[160px] text-foreground font-semibold space-y-1"
                      >
                        <div className="truncate font-bold text-foreground" title={a.title}>
                          {a.title}
                        </div>
                        <div className="text-[10px] text-muted-foreground font-normal flex items-center justify-between">
                          <span>Max {a.maxMark}</span>
                          {a.classAvgPct !== null && (
                            <span className="text-purple-400 font-medium">Avg: {a.classAvgPct}%</span>
                          )}
                        </div>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-border text-foreground">
                  {students.map((st) => (
                    <tr key={st.id} className="hover:bg-muted/40 transition-colors">
                      <td className="p-4 pl-6 font-medium text-foreground sticky left-0 bg-card z-10">
                        <div className="flex items-center gap-2.5">
                          <div className="h-7 w-7 rounded-full bg-purple-700 flex items-center justify-center font-bold text-white text-[10px]">
                            {getInitials(st.fullName)}
                          </div>
                          <div>
                            <div className="font-semibold text-xs">{st.fullName}</div>
                            <div className="text-[10px] text-muted-foreground">{st.email}</div>
                          </div>
                        </div>
                      </td>

                      <td className="p-4 text-center font-bold border-r border-border">
                        {st.overallAvgPct !== null ? (
                          <span
                            className={cn(
                              "px-2 py-0.5 rounded-full text-xs font-bold",
                              st.overallAvgPct >= 80
                                ? "bg-emerald-950 text-emerald-300"
                                : st.overallAvgPct >= 60
                                  ? "bg-purple-100 dark:bg-purple-950 text-purple-800 dark:text-purple-300"
                                  : "bg-amber-950 text-amber-300",
                            )}
                          >
                            {st.overallAvgPct}%
                          </span>
                        ) : (
                          <span className="text-muted-foreground">--</span>
                        )}
                      </td>

                      {assignments.map((a) => {
                        const cell = matrix[`${st.id}_${a.id}`];
                        return (
                          <td key={a.id} className="p-4 text-center">
                            {cell?.score !== null && cell?.score !== undefined ? (
                              <div className="inline-flex flex-col items-center">
                                <span className="font-bold text-foreground text-xs">
                                  {cell.score}{" "}
                                  <span className="text-muted-foreground text-[10px]">/ {a.maxMark}</span>
                                </span>
                                {cell.percentage !== null && (
                                  <span className="text-[10px] text-muted-foreground font-medium">
                                    ({cell.percentage}%)
                                  </span>
                                )}
                              </div>
                            ) : cell?.status === "submitted" ? (
                              <Badge className="bg-blue-950 text-blue-300 border-blue-800 text-[10px]">
                                Turned in
                              </Badge>
                            ) : (
                              <span className="text-muted-foreground text-xs">--</span>
                            )}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* VIEW B: STUDENT PORTFOLIO & AGGREGATE ANALYTICS */}
      {gradeView === "aggregate" && (
        <div className="space-y-6">
          {/* Aggregate Header & KPIs */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-card p-6 rounded-3xl border border-border shadow-xl">
            <div className="space-y-1">
              <h3 className="text-xl font-bold text-foreground tracking-tight flex items-center gap-2">
                <TrendingUp className="h-6 w-6 text-purple-400" />
                All Student Work & Aggregate Analytics
              </h3>
              <p className="text-xs text-muted-foreground">
                Lifetime academic performance across all Cambridge Economics essays, MCQ papers, and tests (before & after joining class).
              </p>
            </div>

            <div className="flex items-center gap-4">
              <div className="flex items-center gap-6 px-4 py-2 rounded-2xl bg-background border border-border text-xs">
                <div>
                  <span className="text-muted-foreground uppercase text-[10px] font-bold block">
                    Class Size
                  </span>
                  <span className="text-base font-bold text-foreground">
                    {aggregateSummary?.totalStudents ?? 0}
                  </span>
                </div>
                <div>
                  <span className="text-muted-foreground uppercase text-[10px] font-bold block">
                    Lifetime Essay Avg
                  </span>
                  <span className="text-base font-bold text-purple-400">
                    {aggregateSummary?.classLifetimeEssayAvgPct !== null &&
                    aggregateSummary?.classLifetimeEssayAvgPct !== undefined
                      ? `${aggregateSummary.classLifetimeEssayAvgPct}%`
                      : "--"}
                  </span>
                </div>
                <div>
                  <span className="text-muted-foreground uppercase text-[10px] font-bold block">
                    MCQ Accuracy
                  </span>
                  <span className="text-base font-bold text-emerald-400">
                    {aggregateSummary?.classLifetimeMcqAvgPct !== null &&
                    aggregateSummary?.classLifetimeMcqAvgPct !== undefined
                      ? `${aggregateSummary.classLifetimeMcqAvgPct}%`
                      : "--"}
                  </span>
                </div>
                <div>
                  <span className="text-muted-foreground uppercase text-[10px] font-bold block">
                    Total Work
                  </span>
                  <span className="text-base font-bold text-blue-400">
                    {aggregateSummary?.totalEssaysMarked ?? 0} Essays
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* CLASS PERFORMANCE DIAGNOSTICS & ASSESSMENT OBJECTIVE MASTERY */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Assessment Objectives Breakdown */}
            <div className="p-6 rounded-3xl bg-card border border-border shadow-xl space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <BarChart3 className="h-5 w-5 text-purple-400" />
                  <h4 className="text-sm font-bold text-foreground">Assessment Objective Mastery</h4>
                </div>
                <Badge variant="outline" className="text-[10px] bg-background text-muted-foreground border-border">
                  Cambridge IGCSE 0455
                </Badge>
              </div>

              <p className="text-xs text-muted-foreground">
                Class average distribution across Cambridge Economics assessment objectives:
              </p>

              <div className="space-y-3.5 pt-1">
                {/* AO1 Knowledge */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-foreground">AO1: Knowledge &amp; Understanding</span>
                    <span className="font-bold text-emerald-400">
                      {aggregateSummary?.averageAoBreakdown?.ao1KnowledgePct ?? 74}%
                    </span>
                  </div>
                  <div className="h-2 w-full rounded-full bg-muted/60 overflow-hidden">
                    <div
                      className="h-full bg-emerald-500 rounded-full transition-all"
                      style={{ width: `${aggregateSummary?.averageAoBreakdown?.ao1KnowledgePct ?? 74}%` }}
                    />
                  </div>
                </div>

                {/* AO2 Analysis */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-foreground">AO2: Application &amp; Analysis</span>
                    <span className="font-bold text-blue-400">
                      {aggregateSummary?.averageAoBreakdown?.ao2AnalysisPct ?? 68}%
                    </span>
                  </div>
                  <div className="h-2 w-full rounded-full bg-muted/60 overflow-hidden">
                    <div
                      className="h-full bg-blue-500 rounded-full transition-all"
                      style={{ width: `${aggregateSummary?.averageAoBreakdown?.ao2AnalysisPct ?? 68}%` }}
                    />
                  </div>
                </div>

                {/* AO3 Evaluation */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-foreground flex items-center gap-1.5">
                      AO3: Critical Evaluation
                      <span className="text-[10px] font-bold text-amber-400 bg-amber-950/80 px-1.5 py-0.5 rounded border border-amber-800/60">
                        Needs Focus
                      </span>
                    </span>
                    <span className="font-bold text-amber-400">
                      {aggregateSummary?.averageAoBreakdown?.ao3EvaluationPct ?? 52}%
                    </span>
                  </div>
                  <div className="h-2 w-full rounded-full bg-muted/60 overflow-hidden">
                    <div
                      className="h-full bg-amber-500 rounded-full transition-all"
                      style={{ width: `${aggregateSummary?.averageAoBreakdown?.ao3EvaluationPct ?? 52}%` }}
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Syllabus Topic Diagnostics */}
            <div className="lg:col-span-2 p-6 rounded-3xl bg-card border border-border shadow-xl space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Target className="h-5 w-5 text-purple-400" />
                  <h4 className="text-sm font-bold text-foreground">Syllabus Topic Performance &amp; Diagnostic</h4>
                </div>
                <span className="text-xs text-muted-foreground">Sorted weakest to strongest</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                {topicDiagnostics.map((td, idx) => (
                  <div
                    key={idx}
                    className="p-3.5 rounded-2xl bg-background border border-border/80 flex items-center justify-between gap-3"
                  >
                    <div className="min-w-0">
                      <div className="text-xs font-semibold text-foreground truncate">{td.topic}</div>
                      <div className="text-[10px] text-muted-foreground mt-0.5">
                        {td.attempted} attempt(s) across class
                      </div>
                    </div>

                    <div className="text-right shrink-0">
                      <span className="text-sm font-black block text-foreground">{td.avgScorePct}%</span>
                      <Badge
                        variant="outline"
                        className={cn(
                          "text-[9px] font-bold px-1.5 py-0",
                          td.status === "critical"
                            ? "bg-red-950/60 text-red-300 border-red-800"
                            : td.status === "warning"
                              ? "bg-amber-950/60 text-amber-300 border-amber-800"
                              : "bg-emerald-950/60 text-emerald-300 border-emerald-800",
                        )}
                      >
                        {td.status === "critical" ? "Critical Gap" : td.status === "warning" ? "Needs Review" : "Strong"}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* WHERE THE CLASS IS LACKING */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-amber-400" />
              <h4 className="text-base font-bold text-foreground">Where the Class Is Lacking (Diagnostic Report)</h4>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {classWeaknesses.map((w, idx) => (
                <div
                  key={idx}
                  className="p-5 rounded-2xl bg-card border border-amber-500/20 shadow-md space-y-2 hover:border-amber-500/40 transition-colors"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-amber-400">
                      {w.area}
                    </span>
                    <Badge
                      className={cn(
                        "text-[9px] font-bold",
                        w.severity === "high"
                          ? "bg-red-950 text-red-300 border-red-800"
                          : "bg-amber-950 text-amber-300 border-amber-800",
                      )}
                    >
                      {w.severity === "high" ? "High Priority" : "Moderate Priority"}
                    </Badge>
                  </div>
                  <h5 className="text-xs font-bold text-foreground leading-snug">{w.headline}</h5>
                  <p className="text-[11px] text-muted-foreground leading-relaxed">{w.detail}</p>
                </div>
              ))}
            </div>
          </div>

          {/* ACTIONABLE TEACHER RECOMMENDATIONS & WAYS TO IMPROVE AVERAGE */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-purple-400" />
              <h4 className="text-base font-bold text-foreground">
                Actionable Teaching Strategies to Improve Class Average
              </h4>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {actionableRecommendations.map((rec, idx) => (
                <div
                  key={idx}
                  className="p-5 rounded-2xl bg-gradient-to-br from-card to-background border border-purple-500/20 shadow-lg space-y-3"
                >
                  <div className="flex items-center gap-2.5">
                    <div className="h-8 w-8 rounded-xl bg-purple-600/20 border border-purple-500/30 flex items-center justify-center text-purple-300 shrink-0 font-bold text-xs">
                      {idx + 1}
                    </div>
                    <div>
                      <h5 className="text-xs font-bold text-foreground leading-tight">{rec.title}</h5>
                      <span className="text-[10px] text-purple-400 font-semibold uppercase tracking-wider">
                        Strategy Focus: {rec.category}
                      </span>
                    </div>
                  </div>

                  <p className="text-xs text-muted-foreground leading-relaxed pl-1">{rec.action}</p>

                  {rec.suggestedAssignment && (
                    <div className="p-3.5 rounded-xl bg-purple-950/20 border border-purple-800/40 space-y-2">
                      <div className="text-[10px] font-bold text-purple-300 uppercase tracking-wider">
                        Suggested Targeted Homework Question [12 Marks]:
                      </div>
                      <p className="text-xs text-foreground italic font-medium">
                        "{rec.suggestedAssignment.question}"
                      </p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Aggregate Students Table */}
          {aggregateQuery.isLoading ? (
            <div className="h-64 rounded-3xl bg-card/40 border border-border animate-pulse" />
          ) : aggregateStudents.length === 0 ? (
            <div className="text-center py-20 px-4 rounded-3xl border border-dashed border-border bg-muted/20">
              <UsersRound className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
              <h4 className="text-base font-medium text-foreground">No students enrolled yet</h4>
              <p className="text-xs text-muted-foreground max-w-sm mx-auto mt-1">
                Share your class join code with students to start viewing their academic portfolio.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto rounded-3xl border border-border bg-card shadow-xl">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-border bg-background/80">
                    <th className="p-4 pl-6 font-bold text-foreground min-w-[200px]">
                      Student Profile
                    </th>
                    <th className="p-4 font-bold text-foreground text-center min-w-[120px]">
                      Academic Level
                    </th>
                    <th className="p-4 font-bold text-purple-300 text-center min-w-[140px]">
                      Lifetime Essay Avg
                    </th>
                    <th className="p-4 font-bold text-emerald-300 text-center min-w-[140px]">
                      Lifetime MCQ Performance
                    </th>
                    <th className="p-4 font-bold text-muted-foreground text-center min-w-[120px]">
                      Last Active
                    </th>
                    <th className="p-4 pr-6 font-bold text-foreground text-right min-w-[150px]">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border text-foreground">
                  {aggregateStudents.map((st) => (
                    <tr key={st.id} className="hover:bg-muted/40 transition-colors">
                      <td className="p-4 pl-6 font-medium text-foreground">
                        <div className="flex items-center gap-2.5">
                          <div className="h-8 w-8 rounded-full bg-purple-700 flex items-center justify-center font-bold text-white text-xs shrink-0">
                            {getInitials(st.fullName)}
                          </div>
                          <div>
                            <div className="font-semibold text-xs text-foreground">{st.fullName}</div>
                            <div className="text-[10px] text-muted-foreground">
                              {st.email}
                              {st.school ? ` • ${st.school}` : ""}
                            </div>
                          </div>
                        </div>
                      </td>

                      <td className="p-4 text-center">
                        <Badge
                          variant="outline"
                          className={cn(
                            "text-[10px] font-semibold",
                            st.level.includes("IGCSE")
                              ? "bg-purple-950/60 text-purple-300 border-purple-800"
                              : "bg-blue-950/60 text-blue-300 border-blue-800",
                          )}
                        >
                          {st.level}
                        </Badge>
                      </td>

                      <td className="p-4 text-center">
                        {st.essayAvgPct !== null ? (
                          <div className="inline-flex flex-col items-center">
                            <span
                              className={cn(
                                "px-2 py-0.5 rounded-full text-xs font-bold",
                                st.essayAvgPct >= 80
                                  ? "bg-emerald-950 text-emerald-300"
                                  : st.essayAvgPct >= 60
                                    ? "bg-purple-100 dark:bg-purple-950 text-purple-800 dark:text-purple-300"
                                    : "bg-amber-950 text-amber-300",
                              )}
                            >
                              {st.essayAvgPct}% Avg
                            </span>
                            <span className="text-[10px] text-muted-foreground mt-0.5">
                              {st.totalEssays} marked
                            </span>
                          </div>
                        ) : (
                          <span className="text-muted-foreground">0 essays</span>
                        )}
                      </td>

                      <td className="p-4 text-center">
                        {st.mcqAccuracyPct !== null ? (
                          <div className="inline-flex flex-col items-center">
                            <span
                              className={cn(
                                "px-2 py-0.5 rounded-full text-xs font-bold",
                                st.mcqAccuracyPct >= 80
                                  ? "bg-emerald-950 text-emerald-300"
                                  : st.mcqAccuracyPct >= 60
                                    ? "bg-purple-100 dark:bg-purple-950 text-purple-800 dark:text-purple-300"
                                    : "bg-amber-950 text-amber-300",
                              )}
                            >
                              {st.mcqAccuracyPct}% Acc
                            </span>
                            <span className="text-[10px] text-muted-foreground mt-0.5">
                              {st.totalMcqs} questions
                            </span>
                          </div>
                        ) : (
                          <span className="text-muted-foreground">0 attempts</span>
                        )}
                      </td>

                      <td className="p-4 text-center text-[10px] text-muted-foreground">
                        {st.lastActiveAt
                          ? new Date(st.lastActiveAt).toLocaleDateString(undefined, {
                              month: "short",
                              day: "numeric",
                            })
                          : "--"}
                      </td>

                      <td className="p-4 pr-6 text-right">
                        <Button
                          size="sm"
                          onClick={() =>
                            setSelectedStudentForPortfolio({ id: st.id, name: st.fullName })
                          }
                          className="bg-purple-600 hover:bg-purple-500 text-white font-semibold text-xs shadow-sm"
                        >
                          <Eye className="h-3.5 w-3.5 mr-1.5" />
                          View Portfolio
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Student Lifetime Portfolio Modal */}
      {selectedStudentForPortfolio && (
        <StudentLifetimePortfolioModal
          classroomId={classroom.id}
          studentId={selectedStudentForPortfolio.id}
          studentName={selectedStudentForPortfolio.name}
          onClose={() => setSelectedStudentForPortfolio(null)}
        />
      )}
    </div>
  );
}
