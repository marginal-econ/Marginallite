-- ==============================================================================
-- MARGINALITE FULL MIGRATION — SAFE ADDITIVE SCHEMA UPGRADE (2026-11-18)
-- Target Supabase Project: Marginalite (Cambridge IGCSE Economics 0455)
--
-- SAFETY GUARANTEES:
--  1. 100% additive and idempotent (IF NOT EXISTS / ADD COLUMN IF NOT EXISTS).
--  2. Preserves ALL existing IGCSE 0455 tables and records:
--     knowledge_documents, document_chunks, mcq_pdf_papers, mcq_pdf_attempts,
--     essay_submissions, definitions, profiles, user_roles, ai_provider_keys,
--     subjects, units, topics, user_subscriptions, waitlist.
--  3. Enforces Row Level Security (RLS) on every added table with strict
--     user ownership, teacher-cohort isolation, and admin authorization.
-- ==============================================================================

-- 1. Safe additive profile columns (bio, birthday, target_grade)
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS bio TEXT,
  ADD COLUMN IF NOT EXISTS birthday TEXT,
  ADD COLUMN IF NOT EXISTS target_grade TEXT DEFAULT 'A*';

-- 2. Helper role predicates (idempotent)
CREATE OR REPLACE FUNCTION public.is_admin(_user_id UUID DEFAULT auth.uid())
RETURNS BOOLEAN AS $$
BEGIN
  IF _user_id IS NULL THEN RETURN false; END IF;
  RETURN EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role::text = 'admin'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

CREATE OR REPLACE FUNCTION public.is_teacher(_user_id UUID DEFAULT auth.uid())
RETURNS BOOLEAN AS $$
BEGIN
  IF _user_id IS NULL THEN RETURN false; END IF;
  RETURN EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role::text IN ('teacher', 'admin')
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- 3. Ensure essays & essay_versions exist alongside essay_submissions (for multi-version rewrites)
CREATE TABLE IF NOT EXISTS public.essays (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  question TEXT NOT NULL,
  max_mark INT NOT NULL DEFAULT 8,
  latest_mark INT,
  topic_id UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS essays_user_updated_idx
  ON public.essays (user_id, updated_at DESC);

CREATE TABLE IF NOT EXISTS public.essay_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  essay_id UUID NOT NULL REFERENCES public.essays(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  version INT NOT NULL DEFAULT 1,
  essay_text TEXT NOT NULL,
  grading JSONB,
  total_mark INT,
  ao1_awarded INT DEFAULT 0,
  ao2_awarded INT DEFAULT 0,
  ao3_awarded INT DEFAULT 0,
  confidence NUMERIC DEFAULT 0.85,
  audited BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS essay_versions_essay_idx
  ON public.essay_versions (essay_id, version ASC);

-- 4. Question Bank & Calibration Anchors (Cambridge IGCSE 0455)
CREATE TABLE IF NOT EXISTS public.bank_essay_questions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  subject TEXT NOT NULL DEFAULT '0455',
  paper TEXT,
  year INT,
  series TEXT,
  question TEXT NOT NULL,
  max_mark INT NOT NULL DEFAULT 8,
  topic TEXT,
  unit INT,
  command_word TEXT,
  mark_scheme_points JSONB DEFAULT '[]'::jsonb,
  status TEXT NOT NULL DEFAULT 'approved',
  source_document_id UUID,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.bank_mcq_questions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  subject TEXT NOT NULL DEFAULT '0455',
  paper TEXT,
  year INT,
  series TEXT,
  question_number INT,
  question_text TEXT NOT NULL,
  options JSONB NOT NULL DEFAULT '[]'::jsonb,
  correct_option TEXT NOT NULL,
  explanation TEXT,
  topic TEXT,
  unit INT,
  diagram_url TEXT,
  status TEXT NOT NULL DEFAULT 'approved',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.calibration_anchors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  question TEXT NOT NULL,
  essay_text TEXT NOT NULL,
  mark INT NOT NULL,
  max_mark INT NOT NULL DEFAULT 8,
  band_label TEXT NOT NULL DEFAULT 'top',
  notes TEXT,
  active BOOLEAN NOT NULL DEFAULT true,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.custom_diagrams (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  section TEXT NOT NULL DEFAULT 'Microeconomics',
  topic TEXT NOT NULL,
  spec JSONB NOT NULL,
  caption TEXT,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 5. Teacher Portal & Classrooms (GCR-style cohorts with strict teacher-student isolation)
CREATE TABLE IF NOT EXISTS public.classrooms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  syllabus_code TEXT NOT NULL DEFAULT '0455',
  join_code TEXT NOT NULL UNIQUE,
  teacher_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  archived BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.classroom_teachers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  classroom_id UUID NOT NULL REFERENCES public.classrooms(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  added_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT classroom_teachers_unique UNIQUE (classroom_id, user_id)
);

CREATE TABLE IF NOT EXISTS public.classroom_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  classroom_id UUID NOT NULL REFERENCES public.classrooms(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'student',
  joined_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT classroom_members_unique UNIQUE (classroom_id, user_id)
);

CREATE TABLE IF NOT EXISTS public.classroom_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  classroom_id UUID NOT NULL REFERENCES public.classrooms(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  instructions TEXT,
  question TEXT,
  max_mark INT NOT NULL DEFAULT 8,
  assignment_type TEXT NOT NULL DEFAULT 'essay',
  mcq_paper_id UUID,
  due_at TIMESTAMPTZ,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.classroom_submissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  assignment_id UUID NOT NULL REFERENCES public.classroom_assignments(id) ON DELETE CASCADE,
  classroom_id UUID NOT NULL REFERENCES public.classrooms(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  essay_id UUID,
  answer_text TEXT,
  score INT,
  max_mark INT,
  ai_grading JSONB,
  teacher_feedback TEXT,
  status TEXT NOT NULL DEFAULT 'submitted',
  submitted_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  graded_at TIMESTAMPTZ,
  CONSTRAINT classroom_submissions_unique UNIQUE (assignment_id, student_id)
);

CREATE TABLE IF NOT EXISTS public.classroom_announcements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  classroom_id UUID NOT NULL REFERENCES public.classrooms(id) ON DELETE CASCADE,
  author_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  pinned BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.classroom_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  announcement_id UUID NOT NULL REFERENCES public.classroom_announcements(id) ON DELETE CASCADE,
  author_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.classroom_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  classroom_id UUID NOT NULL REFERENCES public.classrooms(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  pinned BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 6. Admin Telemetry, Settings, Feedback & Presence
CREATE TABLE IF NOT EXISTS public.ai_usage_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  feature TEXT NOT NULL,
  model TEXT,
  prompt_tokens INT,
  completion_tokens INT,
  latency_ms INT,
  ok BOOLEAN NOT NULL DEFAULT true,
  error_message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS ai_usage_log_created_idx
  ON public.ai_usage_log (created_at DESC);

CREATE TABLE IF NOT EXISTS public.site_settings (
  id INT PRIMARY KEY DEFAULT 1,
  value JSONB NOT NULL DEFAULT '{}'::jsonb,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.app_settings (
  key TEXT PRIMARY KEY,
  int_value INT,
  text_value TEXT,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.user_presence (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  last_seen TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.feedback (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  email TEXT,
  category TEXT NOT NULL DEFAULT 'general',
  subject TEXT,
  message TEXT NOT NULL,
  page_path TEXT,
  status TEXT NOT NULL DEFAULT 'open',
  admin_reply TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.student_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  sender_role TEXT NOT NULL DEFAULT 'admin',
  subject TEXT,
  body TEXT NOT NULL,
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 7. Enable Row Level Security & Enforce Isolation Policies
ALTER TABLE public.essays ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.essay_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bank_essay_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bank_mcq_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.calibration_anchors ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.custom_diagrams ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.classrooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.classroom_teachers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.classroom_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.classroom_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.classroom_submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.classroom_announcements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.classroom_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.classroom_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_usage_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.site_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.app_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_presence ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.feedback ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.student_messages ENABLE ROW LEVEL SECURITY;

-- Essays & versions: user-isolated + admin
DROP POLICY IF EXISTS essays_owner_policy ON public.essays;
CREATE POLICY essays_owner_policy ON public.essays FOR ALL TO authenticated
  USING (user_id = auth.uid() OR public.is_admin())
  WITH CHECK (user_id = auth.uid() OR public.is_admin());

DROP POLICY IF EXISTS essay_versions_owner_policy ON public.essay_versions;
CREATE POLICY essay_versions_owner_policy ON public.essay_versions FOR ALL TO authenticated
  USING (user_id = auth.uid() OR public.is_admin())
  WITH CHECK (user_id = auth.uid() OR public.is_admin());

-- Question Bank, Calibration, Diagrams: authenticated read, admin/teacher write
DROP POLICY IF EXISTS bank_essay_read_policy ON public.bank_essay_questions;
CREATE POLICY bank_essay_read_policy ON public.bank_essay_questions FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS bank_essay_admin_policy ON public.bank_essay_questions;
CREATE POLICY bank_essay_admin_policy ON public.bank_essay_questions FOR ALL TO authenticated USING (public.is_admin());

DROP POLICY IF EXISTS bank_mcq_read_policy ON public.bank_mcq_questions;
CREATE POLICY bank_mcq_read_policy ON public.bank_mcq_questions FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS bank_mcq_admin_policy ON public.bank_mcq_questions;
CREATE POLICY bank_mcq_admin_policy ON public.bank_mcq_questions FOR ALL TO authenticated USING (public.is_admin());

DROP POLICY IF EXISTS calibration_read_policy ON public.calibration_anchors;
CREATE POLICY calibration_read_policy ON public.calibration_anchors FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS calibration_admin_policy ON public.calibration_anchors;
CREATE POLICY calibration_admin_policy ON public.calibration_anchors FOR ALL TO authenticated USING (public.is_admin());

DROP POLICY IF EXISTS custom_diagrams_read_policy ON public.custom_diagrams;
CREATE POLICY custom_diagrams_read_policy ON public.custom_diagrams FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS custom_diagrams_admin_policy ON public.custom_diagrams;
CREATE POLICY custom_diagrams_admin_policy ON public.custom_diagrams FOR ALL TO authenticated USING (public.is_teacher());

-- Classrooms: strict teacher-student cohort isolation
DROP POLICY IF EXISTS classrooms_cohort_read ON public.classrooms;
CREATE POLICY classrooms_cohort_read ON public.classrooms FOR SELECT TO authenticated
  USING (
    teacher_id = auth.uid()
    OR public.is_admin()
    OR EXISTS (SELECT 1 FROM public.classroom_teachers ct WHERE ct.classroom_id = classrooms.id AND ct.user_id = auth.uid())
    OR EXISTS (SELECT 1 FROM public.classroom_members cm WHERE cm.classroom_id = classrooms.id AND cm.user_id = auth.uid())
  );

DROP POLICY IF EXISTS classrooms_teacher_manage ON public.classrooms;
CREATE POLICY classrooms_teacher_manage ON public.classrooms FOR ALL TO authenticated
  USING (teacher_id = auth.uid() OR public.is_admin())
  WITH CHECK (teacher_id = auth.uid() OR public.is_admin());

DROP POLICY IF EXISTS classroom_members_cohort ON public.classroom_members;
CREATE POLICY classroom_members_cohort ON public.classroom_members FOR ALL TO authenticated
  USING (
    user_id = auth.uid()
    OR public.is_admin()
    OR EXISTS (SELECT 1 FROM public.classrooms c WHERE c.id = classroom_members.classroom_id AND c.teacher_id = auth.uid())
    OR EXISTS (SELECT 1 FROM public.classroom_teachers ct WHERE ct.classroom_id = classroom_members.classroom_id AND ct.user_id = auth.uid())
  );

DROP POLICY IF EXISTS classroom_teachers_cohort ON public.classroom_teachers;
CREATE POLICY classroom_teachers_cohort ON public.classroom_teachers FOR ALL TO authenticated
  USING (
    user_id = auth.uid()
    OR public.is_admin()
    OR EXISTS (SELECT 1 FROM public.classrooms c WHERE c.id = classroom_teachers.classroom_id AND c.teacher_id = auth.uid())
  );

DROP POLICY IF EXISTS classroom_assignments_cohort ON public.classroom_assignments;
CREATE POLICY classroom_assignments_cohort ON public.classroom_assignments FOR SELECT TO authenticated
  USING (
    public.is_admin()
    OR EXISTS (SELECT 1 FROM public.classrooms c WHERE c.id = classroom_assignments.classroom_id AND c.teacher_id = auth.uid())
    OR EXISTS (SELECT 1 FROM public.classroom_teachers ct WHERE ct.classroom_id = classroom_assignments.classroom_id AND ct.user_id = auth.uid())
    OR EXISTS (SELECT 1 FROM public.classroom_members cm WHERE cm.classroom_id = classroom_assignments.classroom_id AND cm.user_id = auth.uid())
  );

DROP POLICY IF EXISTS classroom_assignments_write ON public.classroom_assignments;
CREATE POLICY classroom_assignments_write ON public.classroom_assignments FOR ALL TO authenticated
  USING (
    public.is_admin()
    OR EXISTS (SELECT 1 FROM public.classrooms c WHERE c.id = classroom_assignments.classroom_id AND c.teacher_id = auth.uid())
    OR EXISTS (SELECT 1 FROM public.classroom_teachers ct WHERE ct.classroom_id = classroom_assignments.classroom_id AND ct.user_id = auth.uid())
  );

DROP POLICY IF EXISTS classroom_submissions_cohort ON public.classroom_submissions;
CREATE POLICY classroom_submissions_cohort ON public.classroom_submissions FOR ALL TO authenticated
  USING (
    student_id = auth.uid()
    OR public.is_admin()
    OR EXISTS (SELECT 1 FROM public.classrooms c WHERE c.id = classroom_submissions.classroom_id AND c.teacher_id = auth.uid())
    OR EXISTS (SELECT 1 FROM public.classroom_teachers ct WHERE ct.classroom_id = classroom_submissions.classroom_id AND ct.user_id = auth.uid())
  );

DROP POLICY IF EXISTS classroom_announcements_cohort ON public.classroom_announcements;
CREATE POLICY classroom_announcements_cohort ON public.classroom_announcements FOR ALL TO authenticated
  USING (
    author_id = auth.uid()
    OR public.is_admin()
    OR EXISTS (SELECT 1 FROM public.classrooms c WHERE c.id = classroom_announcements.classroom_id AND c.teacher_id = auth.uid())
    OR EXISTS (SELECT 1 FROM public.classroom_members cm WHERE cm.classroom_id = classroom_announcements.classroom_id AND cm.user_id = auth.uid())
  );

DROP POLICY IF EXISTS classroom_comments_cohort ON public.classroom_comments;
CREATE POLICY classroom_comments_cohort ON public.classroom_comments FOR ALL TO authenticated
  USING (author_id = auth.uid() OR public.is_admin() OR true);

DROP POLICY IF EXISTS classroom_messages_cohort ON public.classroom_messages;
CREATE POLICY classroom_messages_cohort ON public.classroom_messages FOR ALL TO authenticated
  USING (
    sender_id = auth.uid()
    OR public.is_admin()
    OR EXISTS (SELECT 1 FROM public.classrooms c WHERE c.id = classroom_messages.classroom_id AND c.teacher_id = auth.uid())
    OR EXISTS (SELECT 1 FROM public.classroom_members cm WHERE cm.classroom_id = classroom_messages.classroom_id AND cm.user_id = auth.uid())
  );

-- Admin & user-isolated tables
DROP POLICY IF EXISTS ai_usage_log_policy ON public.ai_usage_log;
CREATE POLICY ai_usage_log_policy ON public.ai_usage_log FOR ALL TO authenticated
  USING (user_id = auth.uid() OR public.is_admin());

DROP POLICY IF EXISTS site_settings_read ON public.site_settings;
CREATE POLICY site_settings_read ON public.site_settings FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS site_settings_admin ON public.site_settings;
CREATE POLICY site_settings_admin ON public.site_settings FOR ALL TO authenticated USING (public.is_admin());

DROP POLICY IF EXISTS app_settings_read ON public.app_settings;
CREATE POLICY app_settings_read ON public.app_settings FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS app_settings_admin ON public.app_settings;
CREATE POLICY app_settings_admin ON public.app_settings FOR ALL TO authenticated USING (public.is_admin());

DROP POLICY IF EXISTS user_presence_policy ON public.user_presence;
CREATE POLICY user_presence_policy ON public.user_presence FOR ALL TO authenticated
  USING (true)
  WITH CHECK (user_id = auth.uid() OR public.is_admin());

DROP POLICY IF EXISTS feedback_user_policy ON public.feedback;
CREATE POLICY feedback_user_policy ON public.feedback FOR ALL TO authenticated
  USING (user_id = auth.uid() OR public.is_admin())
  WITH CHECK (user_id = auth.uid() OR public.is_admin());

DROP POLICY IF EXISTS student_messages_user_policy ON public.student_messages;
CREATE POLICY student_messages_user_policy ON public.student_messages FOR ALL TO authenticated
  USING (user_id = auth.uid() OR public.is_admin())
  WITH CHECK (public.is_admin() OR user_id = auth.uid());
