export type SchoolRole = "school_admin" | "teacher" | "lead_examiner" | "moderator";

export type School = {
  id: string;
  name: string;
  slug: string;
  domain: string | null;
  max_teachers: number;
  plan?: string;
  scripts_processed_this_month?: number;
  monthly_script_limit?: number;
  created_at: string;
};

export type SchoolMember = {
  id: string;
  school_id: string;
  user_id: string;
  role: SchoolRole;
  department: string;
  status: "active" | "invited" | "suspended";
  invited_by: string | null;
  created_at: string;
  email?: string;
  full_name?: string;
};

export type MarkingSessionStatus = "draft" | "active" | "processing" | "completed" | "archived";

export type MarkingSession = {
  id: string;
  school_id: string;
  teacher_id: string;
  title: string;
  class_name: string;
  subject_code: string; // '0455'
  subject_title: string;
  qualification_level: "igcse";
  era: "legacy" | "2027";
  exam_series: string; // '2026_feb_march'
  paper_number: string; // '12', '22'
  paper_id?: string | null;
  qp_url?: string | null;
  ms_url?: string | null;
  max_mark: number;
  status: MarkingSessionStatus;
  resource_verified: boolean;
  resource_notes: string | null;
  total_scripts_count: number;
  completed_scripts_count: number;
  created_at: string;
  updated_at: string;
};

export type ScriptStatus =
  | "queued"
  | "ocr_processing"
  | "marking"
  | "verification"
  | "ready_for_review"
  | "teacher_approved"
  | "moderated"
  | "failed";

export type ScriptPageTranscription = {
  page_number: number;
  image_url?: string;
  raw_text: string;
  detected_questions: string[];
  diagram_tags: string[];
  uncertain_words: string[];
  has_cross_outs: boolean;
  confidence: number;
};

export type StudentScript = {
  id: string;
  session_id: string;
  candidate_number: string;
  candidate_code?: string;
  candidate_name: string | null;
  file_name?: string;
  raw_pdf_url: string;
  page_count: number;
  ocr_text?: string | null;
  ocr_confidence?: number | null;
  status: ScriptStatus;
  total_mark?: number | null;
  total_ai_mark?: number | null;
  total_teacher_approved_mark?: number | null;
  total_moderated_mark?: number | null;
  max_mark: number;
  percentage?: number | null;
  grade_band?: string | null;
  needs_teacher_review: boolean;
  teacher_review_reason?: string | null;
  teacher_override_mark?: number | null;
  teacher_notes?: string | null;
  approved_at?: string | null;
  page_transcriptions?: ScriptPageTranscription[];
  created_at: string;
  updated_at: string;
};

export type AoBreakdown = {
  knowledge: { awarded: number; out_of: number; comment?: string };
  analysis: { awarded: number; out_of: number; comment?: string };
  evaluation: { awarded: number; out_of: number; comment?: string };
};

export type DiagramEvaluation = {
  detected: boolean;
  name?: string;
  axes_labelled_correctly?: boolean;
  curves_drawn_correctly?: boolean;
  shift_direction_correct?: boolean;
  equilibrium_labelled?: boolean;
  examiner_comment?: string;
  marks_awarded_for_diagram?: number;
};

export type VerificationFlag = {
  id?: string;
  severity: "warning" | "error" | "info" | "flag" | "caution";
  category?: string;
  message: string;
  details?: string;
};

export type QuestionMarkRecord = {
  id: string;
  script_id: string;
  question_number: string;
  question_title?: string;
  max_mark: number;
  ai_awarded_mark: number;
  teacher_approved_mark?: number | null;
  moderated_mark?: number | null;
  is_disagreement?: boolean;
  ao_breakdown: AoBreakdown;
  marking_rationale: string;
  evidence_quotes: string[];
  missing_elements: string[];
  diagram_detected: boolean;
  diagram_evaluation?: DiagramEvaluation | null;
  verification_flags: VerificationFlag[];
  transcription_snippet: string;
  teacher_feedback_note?: string | null;
  is_approved: boolean;
  created_at?: string;
  updated_at?: string;
};

// Aliases
export type QuestionMark = QuestionMarkRecord;

export type CandidateScript = StudentScript & {
  marks?: QuestionMarkRecord[];
  marking_flags?: VerificationFlag[];
  examiner_marking_sessions?: MarkingSession;
};

export type ReliabilityBenchmark = {
  id: string;
  script_id?: string;
  human_mark?: number;
  ai_mark?: number;
  discrepancy?: number;
  status?: "aligned" | "discrepant" | "acceptable";
  notes?: string;
  title?: string;
  paper_code?: string;
  sample_size?: number;
  mean_absolute_error?: number;
  exact_agreement_percentage?: number;
  within_1_mark_percentage?: number;
  diagram_accuracy_percentage?: number;
  tested_at?: string;
  created_at?: string;
};

export type ExaminerAuditLog = {
  id: string;
  session_id: string;
  script_id?: string | null;
  user_id?: string | null;
  action: string;
  rationale?: string;
  details?: any;
  created_at: string;
};
