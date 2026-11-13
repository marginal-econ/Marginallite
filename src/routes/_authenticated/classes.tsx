import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import {
  Archive,
  ArrowLeft,
  Award,
  BarChart3,
  BookOpen,
  Calendar,
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  Clipboard,
  Clock,
  Copy,
  Download,
  FileCheck2,
  FileEdit,
  FileText,
  Filter,
  GraduationCap,
  HelpCircle,
  Layers,
  LogOut,
  Mail,
  Maximize2,
  MessageCircle,
  MessageSquare,
  MoreVertical,
  Pin,
  Plus,
  RefreshCw,
  School,
  Search,
  Send,
  Shield,
  ShieldAlert,
  Sparkles,
  Trash2,
  TrendingUp,
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
  getClassroomGradebook,
  getClassroomRoster,
  getClassroomTeachers,
  getStudentClassroomInsights,
  getStudentClassroomOverview,
  gradeAssignmentSubmission,
  joinClassroom,
  leaveClassroom,
  listAnnouncements,
  listClassroomAssignments,
  listClassroomMessages,
  listClassrooms,
  removeClassroomMember,
  removeClassroomTeacher,
  rotateClassroomCode,
  sendClassroomMessage,
  submitAssignmentWork,
  togglePinAnnouncement,
  togglePinClassroomMessage,
} from "@/lib/classroom.functions";
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
};

function formatLevel(level: string) {
  if (level === "as") return "Paper 1 & 2 Core";
  if (level === "a2") return "Paper 2 Extended";
  return "All 0455 Components";
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
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <PageHeader
        title="Classroom"
        description="Cambridge Economics cohorts, collaborative discussions, real-time assignments, and grading."
      />

      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        {/* Top Action Bar */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-slate-900/60 p-6 rounded-2xl border border-slate-800 shadow-xl backdrop-blur-sm">
          <div>
            <h2 className="text-xl font-semibold text-white tracking-tight flex items-center gap-2">
              <GraduationCap className="h-6 w-6 text-pink-400" />
              {isAdmin
                ? "Classroom Administration"
                : isTeacher
                  ? "My Teaching Classes"
                  : "Enrolled Classes"}
            </h2>
            <p className="text-sm text-slate-400 mt-1">
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
                className="h-64 rounded-2xl bg-slate-900/40 border border-slate-800 animate-pulse"
              />
            ))}
          </div>
        ) : classes.length === 0 ? (
          <div className="text-center py-20 px-4 rounded-2xl border border-dashed border-slate-800 bg-slate-900/20">
            <School className="h-16 w-16 text-slate-600 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-slate-300">No classes found</h3>
            <p className="text-sm text-slate-500 max-w-md mx-auto mt-2 mb-6">
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
    "from-pink-900 via-pink-900 to-slate-900",
    "from-blue-900 via-pink-900 to-slate-900",
    "from-rose-900 via-pink-900 to-slate-900",
    "from-emerald-900 via-teal-900 to-slate-900",
  ];
  const gradient = bannerGradients[classroom.name.length % bannerGradients.length];

  return (
    <div
      onClick={onSelect}
      className="group relative flex flex-col justify-between overflow-hidden rounded-2xl border border-slate-800 bg-slate-900/60 transition-all duration-200 hover:-translate-y-1 hover:border-pink-500/50 hover:shadow-xl hover:shadow-pink-950/20 cursor-pointer"
    >
      {/* Top Themed Header */}
      <div
        className={cn(
          "p-6 bg-gradient-to-br relative text-white border-b border-slate-800/80",
          gradient,
        )}
      >
        <div className="flex items-start justify-between gap-2">
          <div className="space-y-1 pr-4">
            <Badge
              variant="outline"
              className="bg-slate-950/40 text-pink-300 border-pink-400/30 text-xs uppercase tracking-wider backdrop-blur-sm"
            >
              {formatLevel(classroom.level)}
            </Badge>
            <h3 className="text-xl font-bold text-white tracking-tight line-clamp-1 group-hover:text-pink-200 transition-colors">
              {classroom.name}
            </h3>
          </div>

          <div className="flex items-center gap-1">
            {role !== "student" && (
              <button
                onClick={copyCode}
                title="Click to copy join code"
                className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-950/60 hover:bg-slate-950 border border-slate-700/50 text-xs font-mono text-slate-300 transition-colors"
              >
                {copied ? (
                  <Check className="h-3.5 w-3.5 text-emerald-400" />
                ) : (
                  <Copy className="h-3.5 w-3.5 text-slate-400" />
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
                className="text-slate-400 hover:text-rose-400 h-7 w-7 p-0 bg-slate-950/40"
                title="Admin: Delete Classroom"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            )}
          </div>
        </div>

        {/* Teacher Info */}
        <div className="mt-4 flex items-center gap-2.5 text-xs text-slate-300">
          <div className="h-7 w-7 rounded-full bg-pink-600/60 border border-pink-400/40 flex items-center justify-center font-bold text-white text-xs">
            {getInitials(classroom.teacher_name || "Teacher")}
          </div>
          <span className="font-medium truncate">
            {classroom.teacher_name || "Economics Faculty"}
          </span>
          {classroom.teacher_school && (
            <span className="text-slate-400 truncate text-[11px]">
              • {classroom.teacher_school}
            </span>
          )}
        </div>
      </div>

      {/* Body Stats & Details */}
      <div className="p-5 flex items-center justify-between bg-slate-900/40 text-xs text-slate-400">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1.5" title="Enrolled Students">
            <UsersRound className="h-4 w-4 text-slate-400" />
            <span className="font-semibold text-slate-200">{classroom.student_count ?? 0}</span>
            <span className="text-slate-500">students</span>
          </div>

          <div className="flex items-center gap-1.5" title="Assignments">
            <FileText className="h-4 w-4 text-slate-400" />
            <span className="font-semibold text-slate-200">{classroom.assignment_count ?? 0}</span>
            <span className="text-slate-500">tasks</span>
          </div>
        </div>

        <div className="flex items-center text-pink-400 font-medium group-hover:translate-x-1 transition-transform">
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
        className="bg-pink-600 hover:bg-pink-500 text-white font-medium shadow-md shadow-pink-950/40"
      >
        <Plus className="h-4 w-4 mr-2" />
        Join Class
      </Button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
          <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-2xl space-y-5 text-left">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <UsersRound className="h-5 w-5 text-pink-400" />
                Join a Classroom
              </h3>
              <button
                onClick={() => setOpen(false)}
                className="text-slate-400 hover:text-white transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <p className="text-xs text-slate-400">
              Ask your teacher or administrator for the 6-character class code, then enter it below.
            </p>

            <div className="space-y-2">
              <Label className="text-xs font-semibold text-slate-300">Class Code</Label>
              <Input
                value={code}
                onChange={(e) => setCode(e.target.value.toUpperCase())}
                placeholder="e.g. 7X9K2A"
                maxLength={10}
                className="font-mono text-center tracking-widest text-lg bg-slate-950 border-slate-700 text-white placeholder:text-slate-600 focus:border-pink-500"
              />
            </div>

            <div className="p-3 bg-pink-950/30 border border-pink-900/40 rounded-xl text-xs text-pink-300">
              By joining, your assigned essays and test results for this class will be visible to
              your teachers and administrators.
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <Button
                variant="ghost"
                onClick={() => setOpen(false)}
                className="text-slate-400 hover:text-white"
              >
                Cancel
              </Button>
              <Button
                onClick={() => mutation.mutate()}
                disabled={code.trim().length < 4 || mutation.isPending}
                className="bg-pink-600 hover:bg-pink-500 text-white font-medium"
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
        className="bg-pink-600 hover:bg-pink-500 text-white font-medium shadow-md shadow-pink-950/40"
      >
        <School className="h-4 w-4 mr-2 text-pink-300" />
        Create Classroom
      </Button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
          <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-2xl space-y-5 text-left">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <School className="h-5 w-5 text-pink-400" />
                Create Cambridge Classroom
              </h3>
              <button
                onClick={() => setOpen(false)}
                className="text-slate-400 hover:text-white transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-slate-300">Class Name</Label>
                <Input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Year 10 IGCSE Economics Cohort A"
                  className="bg-slate-950 border-slate-700 text-white placeholder:text-slate-600 focus:border-pink-500"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-slate-300">
                  Cambridge Syllabus Focus
                </Label>
                <Select value={level} onValueChange={(v: "as" | "a2" | "mixed") => setLevel(v)}>
                  <SelectTrigger className="bg-slate-950 border-slate-700 text-white focus:border-pink-500">
                    <SelectValue placeholder="Select level" />
                  </SelectTrigger>
                  <SelectContent className="bg-slate-900 border-slate-800 text-white">
                    <SelectItem value="as">Paper 1 & 2 (Core)</SelectItem>
                    <SelectItem value="a2">Paper 2 (Extended Response)</SelectItem>
                    <SelectItem value="mixed">All 0455 Components</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="p-3 rounded-xl bg-pink-950/30 border border-pink-900/40 text-xs text-pink-300">
              Teachers can create up to 3 active classrooms. Once created, you can invite co-teachers and students, assign essays, and review grades.
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <Button
                variant="ghost"
                onClick={() => setOpen(false)}
                className="text-slate-400 hover:text-white"
              >
                Cancel
              </Button>
              <Button
                onClick={() => mutation.mutate()}
                disabled={!name.trim() || mutation.isPending}
                className="bg-pink-600 hover:bg-pink-500 text-white font-medium"
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
    <div className="min-h-screen bg-slate-950 text-slate-100 pb-16">
      {/* Sticky GCR Top Navigation */}
      <div className="sticky top-0 z-40 bg-slate-900/90 backdrop-blur-md border-b border-slate-800">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-4">
              <Button
                variant="ghost"
                size="sm"
                onClick={onBack}
                className="text-slate-400 hover:text-white -ml-2"
              >
                <ArrowLeft className="h-4 w-4 mr-1.5" />
                All Classes
              </Button>

              <div className="hidden sm:block h-5 w-[1px] bg-slate-800" />

              <div className="flex items-center gap-2.5">
                <h1 className="text-lg font-bold text-white tracking-tight truncate max-w-xs sm:max-w-md">
                  {classroom.name}
                </h1>
                <Badge
                  variant="outline"
                  className="bg-pink-950/40 text-pink-300 border-pink-800 text-[10px] uppercase"
                >
                  {formatLevel(classroom.level)}
                </Badge>
              </div>
            </div>

            {/* GCR 5-Tabs Navigation Header */}
            <div className="flex items-center gap-1 sm:gap-1.5 overflow-x-auto">
              <button
                onClick={() => setActiveTab("stream")}
                className={cn(
                  "px-3 py-1.5 rounded-lg text-xs font-semibold transition-all whitespace-nowrap",
                  activeTab === "stream"
                    ? "bg-pink-600 text-white shadow-md shadow-pink-950/40"
                    : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/60",
                )}
              >
                Stream
              </button>

              <button
                onClick={() => setActiveTab("classwork")}
                className={cn(
                  "px-3 py-1.5 rounded-lg text-xs font-semibold transition-all whitespace-nowrap",
                  activeTab === "classwork"
                    ? "bg-pink-600 text-white shadow-md shadow-pink-950/40"
                    : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/60",
                )}
              >
                Classwork
              </button>

              <button
                onClick={() => setActiveTab("chat")}
                className={cn(
                  "px-3 py-1.5 rounded-lg text-xs font-semibold transition-all whitespace-nowrap flex items-center gap-1.5",
                  activeTab === "chat"
                    ? "bg-pink-600 text-white shadow-md shadow-pink-950/40"
                    : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/60",
                )}
              >
                <MessageCircle className="h-3.5 w-3.5" />
                <span>Class Chat</span>
              </button>

              <button
                onClick={() => setActiveTab("people")}
                className={cn(
                  "px-3 py-1.5 rounded-lg text-xs font-semibold transition-all whitespace-nowrap",
                  activeTab === "people"
                    ? "bg-pink-600 text-white shadow-md shadow-pink-950/40"
                    : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/60",
                )}
              >
                People
              </button>

              {isStaff && (
                <button
                  onClick={() => setActiveTab("grades")}
                  className={cn(
                    "px-3 py-1.5 rounded-lg text-xs font-semibold transition-all whitespace-nowrap",
                    activeTab === "grades"
                      ? "bg-pink-600 text-white shadow-md shadow-pink-950/40"
                      : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/60",
                  )}
                >
                  Grades
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

  return (
    <div className="max-w-4xl mx-auto flex flex-col h-[75vh] bg-slate-900/70 border border-slate-800 rounded-3xl overflow-hidden shadow-2xl">
      {/* Chat Room Top Header */}
      <div className="p-4 px-6 bg-slate-950/80 border-b border-slate-800 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="h-9 w-9 rounded-full bg-pink-600/80 flex items-center justify-center font-bold text-white text-sm">
            <MessageCircle className="h-5 w-5" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-white tracking-tight flex items-center gap-2">
              {classroom.name} Class Chat
            </h3>
            <p className="text-[11px] text-slate-400">
              Live discussion channel for all enrolled students & teachers.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 text-xs text-slate-400">
          <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
          <span>Active Channel</span>
        </div>
      </div>

      {/* Pinned Announcement in Chat Header */}
      {pinnedMessages.length > 0 && (
        <div className="p-3 px-6 bg-pink-950/40 border-b border-pink-800/40 text-xs text-pink-200 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 overflow-hidden">
            <Pin className="h-3.5 w-3.5 text-pink-400 shrink-0" />
            <span className="font-semibold text-pink-300 shrink-0">Pinned:</span>
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
                  queryClient.invalidateQueries({ queryKey: ["classroom_chat", classroom.id] });
                });
              }}
              className="text-[11px] text-pink-400 hover:text-pink-200 underline shrink-0"
            >
              Unpin
            </button>
          )}
        </div>
      )}

      {/* Messages Scroll Area */}
      <div className="flex-1 overflow-y-auto p-6 space-y-4 bg-slate-950/40">
        {isLoading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((n) => (
              <div key={n} className="h-16 rounded-2xl bg-slate-900/50 animate-pulse" />
            ))}
          </div>
        ) : (messages ?? []).length === 0 ? (
          <div className="text-center py-20 text-slate-500 space-y-2">
            <MessageSquare className="h-10 w-10 text-slate-600 mx-auto" />
            <h4 className="text-sm font-semibold text-slate-300">Welcome to your class chat!</h4>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              Ask Economics questions, discuss Cambridge essay topics, collaborate on past papers,
              and share study tips here.
            </p>
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
              <div className="h-8 w-8 rounded-full bg-pink-700/80 flex items-center justify-center font-bold text-white text-xs shrink-0 mt-0.5">
                {getInitials(msg.userName)}
              </div>

              <div
                className={cn(
                  "max-w-[75%] space-y-1",
                  msg.isMine ? "items-end text-right" : "items-start text-left",
                )}
              >
                <div className="flex items-center gap-2 text-[11px] text-slate-400">
                  <span className="font-semibold text-slate-300">{msg.userName}</span>
                  {msg.isTeacher && (
                    <Badge className="bg-pink-950 text-pink-300 border-pink-700 text-[9px] py-0 px-1">
                      Teacher
                    </Badge>
                  )}
                  <span>
                    {new Date(msg.createdAt).toLocaleTimeString([], {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </span>
                </div>

                <div
                  className={cn(
                    "p-3.5 rounded-2xl text-xs leading-relaxed whitespace-pre-wrap relative",
                    msg.isMine
                      ? "bg-pink-600 text-white rounded-tr-none shadow-md shadow-pink-950/40"
                      : "bg-slate-900 border border-slate-800 text-slate-200 rounded-tl-none shadow-sm",
                  )}
                >
                  {msg.content}
                </div>

                {/* Message Hover Actions */}
                <div
                  className={cn(
                    "opacity-0 group-hover:opacity-100 flex items-center gap-1.5 text-[10px] text-slate-500 pt-0.5",
                    msg.isMine ? "justify-end" : "justify-start",
                  )}
                >
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
                      className="hover:text-pink-400"
                    >
                      {msg.isPinned ? "Unpin" : "Pin"}
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
                          queryClient.invalidateQueries({
                            queryKey: ["classroom_chat", classroom.id],
                          });
                        });
                      }}
                      className="hover:text-rose-400"
                    >
                      Delete
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
      <div className="p-4 bg-slate-950/90 border-t border-slate-800">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (text.trim() && !sendMutation.isPending) {
              sendMutation.mutate(text.trim());
            }
          }}
          className="flex items-center gap-3"
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
            placeholder="Type a message to your classmates..."
            className="bg-slate-900 border-slate-700 text-xs text-white placeholder:text-slate-500 focus:border-pink-500 h-10"
          />

          <Button
            type="submit"
            disabled={!text.trim() || sendMutation.isPending}
            className="bg-pink-600 hover:bg-pink-500 text-white h-10 px-4 shrink-0 font-semibold"
          >
            <Send className="h-4 w-4 mr-1.5" />
            Send
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
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-pink-900 via-pink-950 to-slate-900 border border-pink-800/40 p-8 sm:p-10 shadow-2xl">
        <div className="relative z-10 flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div className="space-y-2 max-w-2xl">
            <Badge
              variant="outline"
              className="bg-pink-950/60 text-pink-300 border-pink-500/40 text-xs uppercase tracking-wider backdrop-blur-md"
            >
              {formatLevel(classroom.level)}
            </Badge>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight">
              {classroom.name}
            </h2>
            <div className="flex items-center gap-3 pt-1 text-sm text-pink-200/80">
              <div className="flex items-center gap-2">
                <div className="h-6 w-6 rounded-full bg-pink-600 flex items-center justify-center font-bold text-white text-xs">
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
          <div className="flex items-center gap-3 bg-slate-950/60 backdrop-blur-md border border-pink-500/30 rounded-2xl p-3 px-4 self-start md:self-auto">
            <div>
              <div className="text-[10px] uppercase font-bold text-pink-300 tracking-wider">
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
              className="text-pink-300 hover:text-white hover:bg-pink-900/40 h-9 w-9 p-0"
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
        <div className="absolute -top-24 -right-24 h-72 w-72 rounded-full bg-pink-600/20 blur-3xl pointer-events-none" />
      </div>

      {/* 2-Column Stream Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Left Column: Upcoming Work Box */}
        <div className="lg:col-span-1 space-y-4">
          <div className="bg-slate-900/60 rounded-2xl border border-slate-800 p-5 space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
              <Clock className="h-3.5 w-3.5 text-pink-400" />
              Upcoming Work
            </h3>

            {upcomingAssignments.length === 0 ? (
              <p className="text-xs text-slate-500 py-2">Woohoo, no work due soon!</p>
            ) : (
              <div className="space-y-2.5">
                {upcomingAssignments.map((a) => (
                  <div
                    key={a.id}
                    onClick={onGoToClasswork}
                    className="p-2.5 rounded-xl bg-slate-950/40 border border-slate-800/80 hover:border-pink-500/40 hover:bg-slate-950 transition-all cursor-pointer space-y-1"
                  >
                    <div className="text-xs font-semibold text-white line-clamp-1">{a.title}</div>
                    <div className="text-[11px] text-pink-300 flex items-center gap-1">
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
              className="w-full text-xs text-pink-400 hover:text-pink-300 hover:bg-pink-950/30 justify-between pt-2"
            >
              <span>View all classwork</span>
              <ChevronRight className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>

        {/* Right Column: Main Stream Feed */}
        <div className="lg:col-span-3 space-y-6">
          {/* Announcement Composer */}
          <div className="bg-slate-900/70 rounded-2xl border border-slate-800 p-5 shadow-lg space-y-3">
            <div className="flex items-start gap-3">
              <div className="h-8 w-8 rounded-full bg-pink-600 flex items-center justify-center font-bold text-white text-xs shrink-0">
                You
              </div>
              <Textarea
                value={postText}
                onChange={(e) => setPostText(e.target.value)}
                placeholder="Announce something to your class or start a discussion..."
                className="bg-slate-950 border-slate-700/80 text-white placeholder:text-slate-500 focus:border-pink-500 min-h-[90px] resize-y text-sm"
              />
            </div>

            <div className="flex items-center justify-between pt-1">
              {isStaff ? (
                <label className="flex items-center gap-2 text-xs text-slate-400 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={pinPost}
                    onChange={(e) => setPinPost(e.target.checked)}
                    className="rounded border-slate-700 bg-slate-950 text-pink-600 focus:ring-pink-500"
                  />
                  <Pin className="h-3.5 w-3.5 text-pink-400" />
                  <span>Pin to top of class</span>
                </label>
              ) : (
                <div />
              )}

              <Button
                onClick={() => postMutation.mutate()}
                disabled={!postText.trim() || postMutation.isPending}
                size="sm"
                className="bg-pink-600 hover:bg-pink-500 text-white font-medium"
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
                  className="h-36 rounded-2xl bg-slate-900/40 border border-slate-800 animate-pulse"
                />
              ))}
            </div>
          ) : (announcements ?? []).length === 0 ? (
            <div className="text-center py-16 px-4 rounded-2xl border border-slate-800/80 bg-slate-900/20">
              <MessageSquare className="h-10 w-10 text-slate-600 mx-auto mb-3" />
              <h4 className="text-sm font-semibold text-slate-300">
                This is where you can talk to your class
              </h4>
              <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1">
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
                    "bg-slate-900/60 rounded-2xl border p-5 shadow-lg space-y-4 transition-all",
                    ann.pinned ? "border-pink-500/50 bg-slate-900/80" : "border-slate-800",
                  )}
                >
                  {/* Announcement Header */}
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="h-9 w-9 rounded-full bg-pink-700/80 border border-pink-500/30 flex items-center justify-center font-bold text-white text-xs">
                        {getInitials(ann.authorName)}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-sm text-white">{ann.authorName}</span>
                          {ann.authorSchool && (
                            <span className="text-[11px] text-slate-400">• {ann.authorSchool}</span>
                          )}
                          {ann.pinned && (
                            <Badge className="bg-pink-950 text-pink-300 border-pink-700 text-[10px] py-0 px-1.5 flex items-center gap-1">
                              <Pin className="h-2.5 w-2.5" /> Pinned
                            </Badge>
                          )}
                        </div>
                        <div className="text-[11px] text-slate-500">
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
                          className="text-slate-400 hover:text-pink-300 h-8 w-8 p-0"
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
                          className="text-slate-400 hover:text-rose-400 h-8 w-8 p-0"
                          title="Delete post"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      )}
                    </div>
                  </div>

                  {/* Announcement Body */}
                  <div className="text-sm text-slate-200 whitespace-pre-wrap leading-relaxed pl-12">
                    {ann.content}
                  </div>

                  {/* Comments Thread Section */}
                  <div className="pt-3 border-t border-slate-800/80 space-y-3 pl-12">
                    {ann.comments.length > 0 && (
                      <div className="space-y-2.5">
                        {ann.comments.map((comm) => (
                          <div
                            key={comm.id}
                            className="flex items-start justify-between gap-2 p-2.5 rounded-xl bg-slate-950/40 border border-slate-800/60"
                          >
                            <div className="flex items-start gap-2.5">
                              <div className="h-6 w-6 rounded-full bg-slate-800 flex items-center justify-center font-bold text-[10px] text-slate-300 shrink-0 mt-0.5">
                                {getInitials(comm.authorName)}
                              </div>
                              <div className="space-y-0.5">
                                <div className="flex items-center gap-2">
                                  <span className="font-semibold text-xs text-slate-300">
                                    {comm.authorName}
                                  </span>
                                  <span className="text-[10px] text-slate-500">
                                    {new Date(comm.createdAt).toLocaleTimeString([], {
                                      hour: "2-digit",
                                      minute: "2-digit",
                                    })}
                                  </span>
                                </div>
                                <div className="text-xs text-slate-300">{comm.content}</div>
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
                                className="text-slate-500 hover:text-rose-400 p-1"
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
                        className="bg-slate-950 border-slate-800 text-xs text-white placeholder:text-slate-600 focus:border-pink-500 h-8"
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
                        className="bg-pink-600 hover:bg-pink-500 text-white h-8 px-3"
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

  // Student Submission state
  const [submittingAssignmentId, setSubmittingAssignmentId] = useState<string | null>(null);
  const [submissionText, setSubmissionText] = useState("");

  const { data: assignments, isLoading } = useQuery({
    queryKey: ["classroom_assignments", classroom.id],
    queryFn: () => listAssignmentsFn({ data: { classroomId: classroom.id } }),
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
          essayQuestion: kind === "essay" ? essayQuestion.trim() || title.trim() : undefined,
          essayTopic: kind === "essay" ? essayTopic : undefined,
          essayMaxMark: kind === "essay" ? Number(essayMaxMark) : undefined,
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
      queryClient.invalidateQueries({ queryKey: ["classroom_assignments", classroom.id] });
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const submitMutation = useMutation({
    mutationFn: async ({ assignmentId, text }: { assignmentId: string; text: string }) => {
      return submitWorkFn({
        data: {
          assignmentId,
          classroomId: classroom.id,
          submissionText: text,
        },
      });
    },
    onSuccess: () => {
      toast.success("Assignment submitted successfully!");
      setSubmittingAssignmentId(null);
      setSubmissionText("");
      queryClient.invalidateQueries({ queryKey: ["classroom_assignments", classroom.id] });
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const filteredAssignments = useMemo(() => {
    const list = assignments ?? [];
    if (filter === "all") return list;
    return list.filter((a) => a.kind === filter);
  }, [assignments, filter]);

  return (
    <div className="space-y-6">
      {/* Classwork Control Bar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-slate-900/60 p-4 rounded-2xl border border-slate-800">
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant={filter === "all" ? "default" : "ghost"}
            onClick={() => setFilter("all")}
            className={cn(
              "text-xs",
              filter === "all" ? "bg-pink-600 text-white" : "text-slate-400",
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
              filter === "essay" ? "bg-pink-600 text-white" : "text-slate-400",
            )}
          >
            Cambridge Questions (2, 4, 6, 8m)
          </Button>
          <Button
            size="sm"
            variant={filter === "mcq_paper" ? "default" : "ghost"}
            onClick={() => setFilter("mcq_paper")}
            className={cn(
              "text-xs",
              filter === "mcq_paper" ? "bg-pink-600 text-white" : "text-slate-400",
            )}
          >
            MCQ Past Papers
          </Button>
        </div>

        {isStaff && (
          <Button
            onClick={() => setCreateOpen(true)}
            className="bg-pink-600 hover:bg-pink-500 text-white text-xs font-semibold shadow-md shadow-pink-950/40"
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
              className="h-28 rounded-2xl bg-slate-900/40 border border-slate-800 animate-pulse"
            />
          ))}
        </div>
      ) : filteredAssignments.length === 0 ? (
        <div className="text-center py-20 px-4 rounded-2xl border border-dashed border-slate-800 bg-slate-900/20">
          <BookOpen className="h-12 w-12 text-slate-600 mx-auto mb-3" />
          <h4 className="text-base font-medium text-slate-300">No assignments posted yet</h4>
          <p className="text-xs text-slate-500 max-w-md mx-auto mt-1">
            {isStaff
              ? "Click 'Create Assignment' above to set Cambridge essay questions or MCQ mock exams for your students."
              : "Your teacher hasn't assigned any work to this class yet. Check back soon!"}
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredAssignments.map((a) => {
            const isEssay = a.kind === "essay";
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
                className="bg-slate-900/60 rounded-2xl border border-slate-800 hover:border-slate-700 p-6 shadow-md transition-all space-y-4"
              >
                {/* Card Header */}
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                  <div className="flex items-start gap-3.5">
                    <div className="h-10 w-10 rounded-xl bg-pink-950/80 border border-pink-700/50 flex items-center justify-center text-pink-300 shrink-0">
                      {isEssay ? (
                        <FileText className="h-5 w-5" />
                      ) : (
                        <BookOpen className="h-5 w-5" />
                      )}
                    </div>
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="text-base font-bold text-white tracking-tight">{a.title}</h3>
                        <Badge
                          variant="outline"
                          className="bg-slate-950 text-slate-300 border-slate-700 text-[10px]"
                        >
                          {isEssay ? `${a.essayMaxMark || 20} Marks` : "30 MCQs"}
                        </Badge>
                        {a.essayTopic && (
                          <Badge
                            variant="outline"
                            className="bg-pink-950/40 text-pink-300 border-pink-800 text-[10px]"
                          >
                            {a.essayTopic}
                          </Badge>
                        )}
                      </div>

                      {a.dueAt && (
                        <div className="text-xs text-slate-400 flex items-center gap-1.5">
                          <Calendar className="h-3.5 w-3.5 text-pink-400" />
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
                              Graded: {mySub?.teacherScore ?? mySub?.aiScore}/{a.essayMaxMark || 20}
                            </Badge>
                          </div>
                        ) : isSubmitted ? (
                          <Badge className="bg-blue-950 text-blue-300 border-blue-700 text-xs px-2.5 py-1">
                            <CheckCircle2 className="h-3.5 w-3.5 mr-1 text-blue-400" />
                            Turned In
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
                          className="bg-pink-600 hover:bg-pink-500 text-white text-xs font-semibold"
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
                          className="text-slate-400 hover:text-rose-400 h-8 w-8 p-0"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    )}
                  </div>
                </div>

                {/* Instructions / Question Prompt */}
                {(a.essayQuestion || a.instructions) && (
                  <div className="bg-slate-950/50 rounded-xl p-4 border border-slate-800/80 text-xs text-slate-300 space-y-2">
                    {a.essayQuestion && (
                      <div>
                        <span className="font-semibold text-pink-300 block mb-1">
                          Question Prompt:
                        </span>
                        <p className="text-slate-200 text-sm font-medium">{a.essayQuestion}</p>
                      </div>
                    )}
                    {a.instructions && (
                      <p className="text-slate-400 whitespace-pre-wrap">{a.instructions}</p>
                    )}
                  </div>
                )}

                {/* Student Submission Card Flow */}
                {role === "student" && (
                  <div className="pt-2 border-t border-slate-800/60">
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
                          <blockquote className="text-xs text-slate-300 italic border-l-2 border-emerald-500 pl-3 py-1">
                            "{mySub.teacherFeedback}"
                          </blockquote>
                        )}
                      </div>
                    ) : isSubmitted ? (
                      <div className="flex items-center justify-between p-3 rounded-xl bg-slate-950/60 border border-slate-800 text-xs text-slate-400">
                        <span>Submitted on {new Date(mySub!.submittedAt).toLocaleString()}</span>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => setSubmittingAssignmentId(a.id)}
                          className="text-xs text-pink-400 hover:text-white"
                        >
                          Resubmit Work
                        </Button>
                      </div>
                    ) : submittingAssignmentId === a.id ? (
                      <div className="space-y-3 pt-2">
                        <Label className="text-xs font-semibold text-slate-300">
                          Write or Paste Your Essay Answer:
                        </Label>
                        <Textarea
                          value={submissionText}
                          onChange={(e) => setSubmissionText(e.target.value)}
                          placeholder="Type your Cambridge essay response here..."
                          className="bg-slate-950 border-slate-700 text-white min-h-[160px] text-sm leading-relaxed"
                        />
                        <div className="flex items-center justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setSubmittingAssignmentId(null);
                              setSubmissionText("");
                            }}
                            className="text-slate-400 hover:text-white text-xs"
                          >
                            Cancel
                          </Button>
                          <Button
                            size="sm"
                            onClick={() =>
                              submitMutation.mutate({ assignmentId: a.id, text: submissionText })
                            }
                            disabled={!submissionText.trim() || submitMutation.isPending}
                            className="bg-pink-600 hover:bg-pink-500 text-white text-xs font-semibold"
                          >
                            <Send className="h-3.5 w-3.5 mr-1.5" />
                            {submitMutation.isPending ? "Submitting..." : "Turn In Essay"}
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-center justify-between pt-1">
                        <span className="text-xs text-slate-500">
                          Your work has not been turned in yet.
                        </span>
                        <Button
                          size="sm"
                          onClick={() => setSubmittingAssignmentId(a.id)}
                          className="bg-pink-600 hover:bg-pink-500 text-white text-xs font-semibold"
                        >
                          <FileEdit className="h-3.5 w-3.5 mr-1.5" />
                          Write & Submit Answer
                        </Button>
                      </div>
                    )}
                  </div>
                )}

                {/* Teacher Stats Bar */}
                {isStaff && (
                  <div className="flex items-center gap-6 pt-2 border-t border-slate-800/60 text-xs text-slate-400">
                    <div>
                      <span className="font-bold text-white mr-1">{a.stats.turnedIn}</span>
                      <span>Turned in</span>
                    </div>
                    <div>
                      <span className="font-bold text-white mr-1">{a.stats.assigned}</span>
                      <span>Assigned</span>
                    </div>
                    <div>
                      <span className="font-bold text-white mr-1">{a.stats.graded}</span>
                      <span>Graded</span>
                    </div>
                    {a.stats.averageScore !== null && (
                      <div className="text-pink-300">
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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
          <div className="w-full max-w-2xl bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-2xl space-y-5 text-left max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <FileEdit className="h-5 w-5 text-pink-400" />
                Create Class Assignment
              </h3>
              <button
                onClick={() => setCreateOpen(false)}
                className="text-slate-400 hover:text-white"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-slate-300">Assignment Type</Label>
                <Select value={kind} onValueChange={(v: "essay" | "mcq_paper") => setKind(v)}>
                  <SelectTrigger className="bg-slate-950 border-slate-700 text-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-slate-900 border-slate-800 text-white">
                    <SelectItem value="essay">Cambridge Economics Essay (8, 12, 20m)</SelectItem>
                    <SelectItem value="mcq_paper">MCQ Past Paper Test</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-slate-300">Assignment Title</Label>
                <Input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. Discuss whether monetary policy is effective in curbing inflation"
                  className="bg-slate-950 border-slate-700 text-white"
                />
              </div>

              {kind === "essay" && (
                <>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <Label className="text-xs font-semibold text-slate-300">Syllabus Topic</Label>
                      <Select value={essayTopic} onValueChange={setEssayTopic}>
                        <SelectTrigger className="bg-slate-950 border-slate-700 text-white">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="bg-slate-900 border-slate-800 text-white">
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
                      <Label className="text-xs font-semibold text-slate-300">Maximum Marks</Label>
                      <Select
                        value={String(essayMaxMark)}
                        onValueChange={(v) => setEssayMaxMark(Number(v))}
                      >
                        <SelectTrigger className="bg-slate-950 border-slate-700 text-white">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="bg-slate-900 border-slate-800 text-white">
                          <SelectItem value="2">2 Marks (Part a: Identify / Define)</SelectItem>
                          <SelectItem value="4">4 Marks (Part b: Explain / Calculate)</SelectItem>
                          <SelectItem value="6">6 Marks (Part c: Analyse)</SelectItem>
                          <SelectItem value="8">8 Marks (Part d: Discuss / Evaluate)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold text-slate-300">
                      Full Question Prompt
                    </Label>
                    <Textarea
                      value={essayQuestion}
                      onChange={(e) => setEssayQuestion(e.target.value)}
                      placeholder="Enter the exact Cambridge 0455 past paper question prompt..."
                      className="bg-slate-950 border-slate-700 text-white min-h-[80px]"
                    />
                  </div>
                </>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-slate-300">
                    Due Date & Time (Optional)
                  </Label>
                  <Input
                    type="datetime-local"
                    value={dueAt}
                    onChange={(e) => setDueAt(e.target.value)}
                    className="bg-slate-950 border-slate-700 text-white"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-slate-300">
                  Teacher Instructions / Rubric Notes
                </Label>
                <Textarea
                  value={instructions}
                  onChange={(e) => setInstructions(e.target.value)}
                  placeholder="e.g. Include AD/AS diagram with labeled equilibrium shift..."
                  className="bg-slate-950 border-slate-700 text-white min-h-[80px]"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <Button
                variant="ghost"
                onClick={() => setCreateOpen(false)}
                className="text-slate-400 hover:text-white"
              >
                Cancel
              </Button>
              <Button
                onClick={() => createMutation.mutate()}
                disabled={!title.trim() || createMutation.isPending}
                className="bg-pink-600 hover:bg-pink-500 text-white font-medium"
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-in fade-in">
      <div className="w-full max-w-5xl h-[85vh] bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-5 px-6 border-b border-slate-800 bg-slate-950/60">
          <div>
            <h3 className="text-base font-bold text-white tracking-tight flex items-center gap-2">
              <FileCheck2 className="h-5 w-5 text-pink-400" />
              {assignment?.title || "Assignment Submissions"}
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Review Cambridge essay answers, inspect AI grading, and return teacher marks.
            </p>
          </div>

          <button onClick={onClose} className="text-slate-400 hover:text-white p-1 rounded-lg">
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* 2-Column Review Body */}
        <div className="flex-1 grid grid-cols-1 md:grid-cols-3 overflow-hidden">
          {/* Left Student List */}
          <div className="border-r border-slate-800 overflow-y-auto p-4 space-y-2 bg-slate-950/40">
            <div className="text-xs font-bold uppercase text-slate-400 tracking-wider mb-2">
              Students ({students.length})
            </div>

            {isLoading ? (
              <div className="space-y-2">
                {[1, 2, 3].map((n) => (
                  <div key={n} className="h-14 rounded-xl bg-slate-800/40 animate-pulse" />
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
                        ? "bg-pink-950/60 border-pink-500 text-white shadow-md"
                        : "bg-slate-900/60 border-slate-800/80 text-slate-300 hover:bg-slate-800/60",
                    )}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="h-8 w-8 rounded-full bg-pink-700 flex items-center justify-center font-bold text-white text-xs shrink-0">
                        {getInitials(st.fullName)}
                      </div>
                      <div className="min-w-0">
                        <div className="text-xs font-semibold truncate">{st.fullName}</div>
                        <div className="text-[10px] text-slate-500 truncate">{st.email}</div>
                      </div>
                    </div>

                    <div>
                      {sub?.teacherScore !== null && sub?.teacherScore !== undefined ? (
                        <Badge className="bg-emerald-950 text-emerald-300 border-emerald-700 text-[10px] px-2">
                          {sub.teacherScore}/{assignment?.essay_max_mark || 20}
                        </Badge>
                      ) : isTurnedIn ? (
                        <Badge className="bg-blue-950 text-blue-300 border-blue-700 text-[10px] px-2">
                          Turned in
                        </Badge>
                      ) : (
                        <span className="text-[11px] text-slate-500 italic">Missing</span>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Right Selected Student Submission & Grading View */}
          <div className="md:col-span-2 flex flex-col h-full overflow-hidden bg-slate-900">
            {activeStudent ? (
              <div className="flex-1 flex flex-col overflow-hidden">
                {/* Submission Content Area */}
                <div className="flex-1 overflow-y-auto p-6 space-y-4">
                  <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                    <div>
                      <h4 className="text-sm font-bold text-white">{activeStudent.fullName}</h4>
                      <p className="text-xs text-slate-400">{activeStudent.email}</p>
                    </div>

                    {activeStudent.submission?.submittedAt && (
                      <div className="text-xs text-slate-400">
                        Submitted: {new Date(activeStudent.submission.submittedAt).toLocaleString()}
                      </div>
                    )}
                  </div>

                  {activeStudent.submission ? (
                    <div className="space-y-4">
                      {/* Submitted Text */}
                      <div className="space-y-2">
                        <Label className="text-xs font-bold uppercase text-slate-400 tracking-wider">
                          Student's Submitted Essay Answer:
                        </Label>
                        <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 text-sm text-slate-200 leading-relaxed whitespace-pre-wrap">
                          {activeStudent.submission.submissionText ||
                            "Linked graded essay version."}
                        </div>
                      </div>

                      {/* AI Grader Feedback if present */}
                      {activeStudent.submission.aiScore !== null && (
                        <div className="p-4 rounded-2xl bg-pink-950/20 border border-pink-900/40 text-xs text-pink-300 space-y-2">
                          <div className="flex items-center justify-between font-bold">
                            <span className="flex items-center gap-1.5">
                              <Sparkles className="h-4 w-4 text-pink-400" />
                              AI Examiner Preliminary Mark
                            </span>
                            <span>
                              {activeStudent.submission.aiScore} /{" "}
                              {assignment?.essay_max_mark || 20}
                            </span>
                          </div>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="py-20 text-center text-slate-500">
                      <FileText className="h-10 w-10 text-slate-600 mx-auto mb-2" />
                      <p className="text-sm">This student has not turned in this assignment yet.</p>
                    </div>
                  )}
                </div>

                {/* Bottom Teacher Grading Input Footer */}
                <div className="p-5 border-t border-slate-800 bg-slate-950/80 space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 items-end">
                    <div className="space-y-1.5">
                      <Label className="text-xs font-bold text-slate-300">
                        Awarded Score (/{assignment?.essay_max_mark || 20})
                      </Label>
                      <Input
                        type="number"
                        min={0}
                        max={assignment?.essay_max_mark || 20}
                        value={scoreInput}
                        onChange={(e) => setScoreInput(e.target.value)}
                        placeholder="e.g. 17"
                        className="bg-slate-900 border-slate-700 text-white text-base font-bold focus:border-pink-500"
                      />
                    </div>

                    <div className="sm:col-span-3 space-y-1.5">
                      <Label className="text-xs font-bold text-slate-300">
                        Teacher Feedback / Examiner Commentary
                      </Label>
                      <Input
                        value={feedbackInput}
                        onChange={(e) => setFeedbackInput(e.target.value)}
                        placeholder="e.g. Strong AO1 definitions and AO2 application; expand on AO3 evaluation."
                        className="bg-slate-900 border-slate-700 text-white text-xs focus:border-pink-500"
                      />
                    </div>
                  </div>

                  <div className="flex items-center justify-end gap-3 pt-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => gradeMutation.mutate(false)}
                      disabled={scoreInput === "" || gradeMutation.isPending}
                      className="text-slate-400 hover:text-white text-xs"
                    >
                      Save Draft
                    </Button>

                    <Button
                      size="sm"
                      onClick={() => gradeMutation.mutate(true)}
                      disabled={scoreInput === "" || gradeMutation.isPending}
                      className="bg-pink-600 hover:bg-pink-500 text-white text-xs font-semibold shadow-md shadow-pink-950/40"
                    >
                      <Send className="h-3.5 w-3.5 mr-1.5" />
                      {gradeMutation.isPending ? "Returning..." : "Return Grade to Student"}
                    </Button>
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex-1 flex items-center justify-center text-slate-500 text-sm">
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
      <div className="bg-slate-900/60 rounded-3xl border border-slate-800 p-6 sm:p-8 space-y-6 shadow-xl">
        <div className="flex items-center justify-between border-b border-slate-800 pb-4">
          <div>
            <h3 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
              <School className="h-5 w-5 text-pink-400" />
              Teachers
            </h3>
            <p className="text-xs text-slate-400 mt-1">
              Economics instructors managing this classroom.
            </p>
          </div>

          {isStaff && (
            <Button
              size="sm"
              onClick={() => setInviteTeacherOpen(true)}
              className="bg-pink-600 hover:bg-pink-500 text-white text-xs font-semibold"
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
              className="flex items-center justify-between p-3.5 rounded-2xl bg-slate-950/40 border border-slate-800/80"
            >
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-pink-600/80 border border-pink-400/30 flex items-center justify-center font-bold text-white text-sm">
                  {getInitials(t.fullName)}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-sm text-white">{t.fullName}</span>
                    {t.owner ? (
                      <Badge className="bg-pink-950 text-pink-300 border-pink-700 text-[10px] py-0">
                        Owner
                      </Badge>
                    ) : (
                      <Badge className="bg-slate-800 text-slate-300 border-slate-700 text-[10px] py-0">
                        Co-Teacher
                      </Badge>
                    )}
                  </div>
                  <div className="text-xs text-slate-400 flex items-center gap-2 mt-0.5">
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
                  className="text-slate-400 hover:text-rose-400 h-8 w-8 p-0"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Classmates / Student Roster Section */}
      <div className="bg-slate-900/60 rounded-3xl border border-slate-800 p-6 sm:p-8 space-y-6 shadow-xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-4">
          <div>
            <h3 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
              <UsersRound className="h-5 w-5 text-pink-400" />
              Classmates ({students.length})
            </h3>
            <p className="text-xs text-slate-400 mt-1">
              Enrolled students taking Cambridge Economics.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <div className="w-full sm:w-56">
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search students..."
                className="bg-slate-950 border-slate-700 text-xs text-white"
              />
            </div>
            {isStaff && (
              <Button
                size="sm"
                onClick={() => setInviteStudentOpen(true)}
                className="bg-pink-600 hover:bg-pink-500 text-white text-xs font-semibold shrink-0"
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
              <div key={n} className="h-14 rounded-2xl bg-slate-950/40 animate-pulse" />
            ))}
          </div>
        ) : filteredStudents.length === 0 ? (
          <div className="text-center py-12 text-slate-500">
            <UsersRound className="h-10 w-10 text-slate-600 mx-auto mb-2" />
            <p className="text-xs">
              No students enrolled yet. Share the class code with your students.
            </p>
          </div>
        ) : (
          <div className="space-y-2.5">
            {filteredStudents.map((st) => (
              <div
                key={st.student_id}
                className="flex items-center justify-between p-3 rounded-2xl bg-slate-950/40 border border-slate-800/80 hover:bg-slate-950/70 transition-all"
              >
                <div className="flex items-center gap-3">
                  <div className="h-9 w-9 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center font-bold text-white text-xs">
                    {getInitials(st.full_name || "Student")}
                  </div>
                  <div>
                    <div className="font-semibold text-sm text-white">
                      {st.full_name || "Student"}
                    </div>
                    <div className="text-xs text-slate-400 flex items-center gap-2">
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
                      className="text-xs text-pink-400 hover:text-white hover:bg-pink-950/40"
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
                      className="text-slate-500 hover:text-rose-400 h-8 w-8 p-0"
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
          <div className="pt-4 border-t border-slate-800 flex justify-end">
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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
          <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-2xl space-y-5 text-left">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <UserPlus className="h-5 w-5 text-pink-400" />
                Invite Co-Teacher
              </h3>
              <button
                onClick={() => setInviteTeacherOpen(false)}
                className="text-slate-400 hover:text-white"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <p className="text-xs text-slate-400">
              Enter the email address of the teacher you want to collaborate with. They must have a
              Marginalite account with Teacher privileges.
            </p>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-slate-300">Teacher Email</Label>
              <Input
                type="email"
                value={teacherEmail}
                onChange={(e) => setTeacherEmail(e.target.value)}
                placeholder="teacher@school.edu"
                className="bg-slate-950 border-slate-700 text-white"
              />
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <Button
                variant="ghost"
                onClick={() => setInviteTeacherOpen(false)}
                className="text-slate-400 hover:text-white"
              >
                Cancel
              </Button>
              <Button
                onClick={() => addTeacherMutation.mutate()}
                disabled={!teacherEmail.trim() || addTeacherMutation.isPending}
                className="bg-pink-600 hover:bg-pink-500 text-white font-medium"
              >
                {addTeacherMutation.isPending ? "Adding..." : "Add Co-Teacher"}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Invite Student Modal */}
      {inviteStudentOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
          <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-2xl space-y-5 text-left">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <UserPlus className="h-5 w-5 text-pink-400" />
                Enroll Student
              </h3>
              <button
                onClick={() => setInviteStudentOpen(false)}
                className="text-slate-400 hover:text-white"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <p className="text-xs text-slate-400">
              Enter the email address of the student to add them directly to this classroom. Alternatively, students can join anytime using class code <span className="font-mono font-bold text-pink-400">{classroom.join_code}</span>.
            </p>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-slate-300">Student Email</Label>
              <Input
                type="email"
                value={studentEmail}
                onChange={(e) => setStudentEmail(e.target.value)}
                placeholder="student@school.edu"
                className="bg-slate-950 border-slate-700 text-white"
              />
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <Button
                variant="ghost"
                onClick={() => setInviteStudentOpen(false)}
                className="text-slate-400 hover:text-white"
              >
                Cancel
              </Button>
              <Button
                onClick={() => addStudentMutation.mutate()}
                disabled={!studentEmail.trim() || addStudentMutation.isPending}
                className="bg-pink-600 hover:bg-pink-500 text-white font-medium"
              >
                {addStudentMutation.isPending ? "Enrolling..." : "Enroll Student"}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Student Diagnostic Insights Modal */}
      {selectedStudentForInsights && (
        <StudentInsightsModal
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
// STUDENT DIAGNOSTIC INSIGHTS MODAL
// =========================================================================

function StudentInsightsModal({
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
  const getInsightsFn = useServerFn(getStudentClassroomInsights);

  const { data, isLoading } = useQuery({
    queryKey: ["student_insights", classroomId, studentId],
    queryFn: () => getInsightsFn({ data: { classroomId, studentId } }),
  });

  const insights = (data as StudentInsights) ?? null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-in fade-in">
      <div className="w-full max-w-4xl max-h-[85vh] bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl flex flex-col overflow-hidden">
        <div className="flex items-center justify-between p-5 px-6 border-b border-slate-800 bg-slate-950/60">
          <div>
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <BarChart3 className="h-5 w-5 text-pink-400" />
              Student Performance: {studentName}
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Comprehensive Cambridge Economics activity & diagnostic profile
            </p>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white p-1">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {isLoading ? (
            <div className="py-16 text-center text-slate-500">Loading student analytics...</div>
          ) : !insights ? (
            <div className="py-16 text-center text-slate-500">
              No insight data recorded for this student yet.
            </div>
          ) : (
            <>
              {/* Summary KPIs */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-1">
                  <div className="text-[10px] uppercase font-bold text-slate-500">
                    Average Essay %
                  </div>
                  <div className="text-2xl font-black text-pink-400">
                    {insights.summary.average_essay_percent !== null
                      ? `${insights.summary.average_essay_percent}%`
                      : "--"}
                  </div>
                </div>

                <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-1">
                  <div className="text-[10px] uppercase font-bold text-slate-500">
                    Essays Marked
                  </div>
                  <div className="text-2xl font-black text-white">
                    {insights.summary.essays_marked}
                  </div>
                </div>

                <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-1">
                  <div className="text-[10px] uppercase font-bold text-slate-500">MCQ Accuracy</div>
                  <div className="text-2xl font-black text-emerald-400">
                    {insights.summary.mcq_total > 0
                      ? `${Math.round((insights.summary.mcq_correct / insights.summary.mcq_total) * 100)}%`
                      : "--"}
                  </div>
                </div>

                <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-1">
                  <div className="text-[10px] uppercase font-bold text-slate-500">
                    Essay Practice Runs
                  </div>
                  <div className="text-2xl font-black text-blue-400">
                    {insights.summary.generated_essays ?? 0}
                  </div>
                </div>
              </div>

              {/* Topic Mastery breakdown */}
              <div className="space-y-3">
                <h4 className="text-xs font-bold uppercase text-slate-400 tracking-wider">
                  Topic Accuracy Breakdown
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {insights.topics.map((top) => (
                    <div
                      key={top.topic}
                      className="p-3 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-between text-xs"
                    >
                      <span className="font-semibold text-slate-200">{top.topic}</span>
                      <Badge
                        className={cn(
                          "text-[10px]",
                          (top.accuracy_pct ?? 0) >= 70
                            ? "bg-emerald-950 text-emerald-300"
                            : "bg-amber-950 text-amber-300",
                        )}
                      >
                        {top.accuracy_pct !== null ? `${top.accuracy_pct}%` : "--"} ({top.attempted}{" "}
                        MCQs)
                      </Badge>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// =========================================================================
// TAB 5: GRADES (Full Google Classroom Gradebook Matrix)
// =========================================================================

function GradesTab({ classroom }: { classroom: Classroom }) {
  const getGradebookFn = useServerFn(getClassroomGradebook);
  const { data, isLoading } = useQuery({
    queryKey: ["classroom_gradebook", classroom.id],
    queryFn: () => getGradebookFn({ data: { classroomId: classroom.id } }),
  });

  const students = useMemo(() => data?.students ?? [], [data?.students]);
  const assignments = useMemo(() => data?.assignments ?? [], [data?.assignments]);
  const matrix = useMemo(() => data?.gradeMatrix ?? {}, [data?.gradeMatrix]);
  const summary = data?.summary;

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
      {/* Gradebook Header with KPIs */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-slate-900/60 p-6 rounded-3xl border border-slate-800 shadow-xl">
        <div className="space-y-1">
          <h3 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
            <Award className="h-6 w-6 text-pink-400" />
            Class Gradebook
          </h3>
          <p className="text-xs text-slate-400">
            Real-time grade matrix across all Cambridge Economics essays and assessments.
          </p>
        </div>

        <div className="flex items-center gap-4">
          <div className="flex items-center gap-6 px-4 py-2 rounded-2xl bg-slate-950 border border-slate-800 text-xs">
            <div>
              <span className="text-slate-500 uppercase text-[10px] font-bold block">
                Class Size
              </span>
              <span className="text-base font-bold text-white">{summary?.totalStudents ?? 0}</span>
            </div>
            <div>
              <span className="text-slate-500 uppercase text-[10px] font-bold block">Tasks</span>
              <span className="text-base font-bold text-white">
                {summary?.totalAssignments ?? 0}
              </span>
            </div>
            <div>
              <span className="text-slate-500 uppercase text-[10px] font-bold block">
                Class Average
              </span>
              <span className="text-base font-bold text-pink-400">
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
            className="bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-semibold"
          >
            <Download className="h-3.5 w-3.5 mr-1.5" />
            Export CSV
          </Button>
        </div>
      </div>

      {/* Gradebook Matrix Table */}
      {isLoading ? (
        <div className="h-64 rounded-3xl bg-slate-900/40 border border-slate-800 animate-pulse" />
      ) : students.length === 0 ? (
        <div className="text-center py-20 px-4 rounded-3xl border border-dashed border-slate-800 bg-slate-900/20">
          <UsersRound className="h-12 w-12 text-slate-600 mx-auto mb-3" />
          <h4 className="text-base font-medium text-slate-300">No students enrolled yet</h4>
          <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1">
            Once students join your class code and turn in essays, their scores will populate this
            matrix automatically.
          </p>
        </div>
      ) : assignments.length === 0 ? (
        <div className="text-center py-20 px-4 rounded-3xl border border-dashed border-slate-800 bg-slate-900/20">
          <FileText className="h-12 w-12 text-slate-600 mx-auto mb-3" />
          <h4 className="text-base font-medium text-slate-300">No assignments created yet</h4>
          <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1">
            Create your first essay or MCQ paper from the Classwork tab to start grading.
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-3xl border border-slate-800 bg-slate-900/60 shadow-xl">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-slate-800 bg-slate-950/80">
                <th className="p-4 pl-6 font-bold text-slate-300 sticky left-0 bg-slate-950 z-20 min-w-[200px]">
                  Student Name
                </th>
                <th className="p-4 font-bold text-pink-300 min-w-[120px] text-center border-r border-slate-800">
                  Overall Avg
                </th>
                {assignments.map((a) => (
                  <th
                    key={a.id}
                    className="p-4 min-w-[160px] text-slate-300 font-semibold space-y-1"
                  >
                    <div className="truncate font-bold text-white" title={a.title}>
                      {a.title}
                    </div>
                    <div className="text-[10px] text-slate-500 font-normal flex items-center justify-between">
                      <span>Max {a.maxMark}</span>
                      {a.classAvgPct !== null && (
                        <span className="text-pink-400 font-medium">Avg: {a.classAvgPct}%</span>
                      )}
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 text-slate-300">
              {students.map((st) => (
                <tr key={st.id} className="hover:bg-slate-800/40 transition-colors">
                  <td className="p-4 pl-6 font-medium text-white sticky left-0 bg-slate-900/90 z-10">
                    <div className="flex items-center gap-2.5">
                      <div className="h-7 w-7 rounded-full bg-pink-700 flex items-center justify-center font-bold text-white text-[10px]">
                        {getInitials(st.fullName)}
                      </div>
                      <div>
                        <div className="font-semibold text-xs">{st.fullName}</div>
                        <div className="text-[10px] text-slate-500">{st.email}</div>
                      </div>
                    </div>
                  </td>

                  <td className="p-4 text-center font-bold border-r border-slate-800">
                    {st.overallAvgPct !== null ? (
                      <span
                        className={cn(
                          "px-2 py-0.5 rounded-full text-xs font-bold",
                          st.overallAvgPct >= 80
                            ? "bg-emerald-950 text-emerald-300"
                            : st.overallAvgPct >= 60
                              ? "bg-pink-950 text-pink-300"
                              : "bg-amber-950 text-amber-300",
                        )}
                      >
                        {st.overallAvgPct}%
                      </span>
                    ) : (
                      <span className="text-slate-600">--</span>
                    )}
                  </td>

                  {assignments.map((a) => {
                    const cell = matrix[`${st.id}_${a.id}`];
                    return (
                      <td key={a.id} className="p-4 text-center">
                        {cell?.score !== null && cell?.score !== undefined ? (
                          <div className="inline-flex flex-col items-center">
                            <span className="font-bold text-white text-xs">
                              {cell.score}{" "}
                              <span className="text-slate-500 text-[10px]">/ {a.maxMark}</span>
                            </span>
                            {cell.percentage !== null && (
                              <span className="text-[10px] text-slate-400 font-medium">
                                ({cell.percentage}%)
                              </span>
                            )}
                          </div>
                        ) : cell?.status === "submitted" ? (
                          <Badge className="bg-blue-950 text-blue-300 border-blue-800 text-[10px]">
                            Turned in
                          </Badge>
                        ) : (
                          <span className="text-slate-600 text-xs">--</span>
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
  );
}
