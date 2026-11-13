-- ==============================================================================
-- MARGINALITE: FRESH BASELINE DATABASE MIGRATION
-- Cambridge IGCSE Economics (0455) Platform
-- ==============================================================================

-- 1. EXTENSIONS
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "vector";

-- 2. CUSTOM TYPES
DO $$ BEGIN
  CREATE TYPE public.app_role AS ENUM ('student', 'teacher', 'admin');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE public.marking_mode AS ENUM ('cambridge', 'diagnostic');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE public.doc_type AS ENUM (
    'past_paper',
    'mark_scheme',
    'examiner_report',
    'syllabus',
    'mcq_calibration',
    'coursebook',
    'notes',
    'other'
  );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE public.assessment_era AS ENUM ('legacy', '2027');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- 3. UTILITY FUNCTIONS
CREATE OR REPLACE FUNCTION public.touch_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 4. PROFILES & ROLES
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  full_name TEXT,
  avatar_url TEXT,
  target_grade TEXT DEFAULT 'A*',
  current_grade TEXT,
  school TEXT,
  country TEXT,
  city TEXT,
  tutorial_completed BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL DEFAULT 'student',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT user_roles_user_role_unique UNIQUE (user_id, role)
);

CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role public.app_role)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

CREATE OR REPLACE FUNCTION public.is_admin(_user_id UUID DEFAULT auth.uid())
RETURNS BOOLEAN AS $$
BEGIN
  IF _user_id IS NULL THEN RETURN false; END IF;
  RETURN public.has_role(_user_id, 'admin');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

CREATE OR REPLACE FUNCTION public.is_teacher(_user_id UUID DEFAULT auth.uid())
RETURNS BOOLEAN AS $$
BEGIN
  IF _user_id IS NULL THEN RETURN false; END IF;
  RETURN public.has_role(_user_id, 'teacher') OR public.has_role(_user_id, 'admin');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- Trigger to auto-create profile on user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, avatar_url)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', ''),
    NEW.raw_user_meta_data->>'avatar_url'
  )
  ON CONFLICT (id) DO UPDATE
  SET email = EXCLUDED.email,
      full_name = CASE WHEN profiles.full_name = '' THEN EXCLUDED.full_name ELSE profiles.full_name END;

  -- Default role is student unless specified in metadata
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'student')
  ON CONFLICT DO NOTHING;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 5. KNOWLEDGE BASE & PGVECTOR CHUNKS
CREATE TABLE IF NOT EXISTS public.knowledge_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  subject TEXT NOT NULL DEFAULT '0455',
  series TEXT,
  year INT,
  component INT,
  variant INT,
  doc_type public.doc_type NOT NULL,
  content_hash TEXT,
  source_url TEXT,
  retrieved_at TIMESTAMPTZ DEFAULT now(),
  status TEXT NOT NULL DEFAULT 'ready',
  error_message TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  topic_id UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS kd_hash_doctype_idx
  ON public.knowledge_documents (content_hash, doc_type);

CREATE INDEX IF NOT EXISTS kd_subject_series_year_idx
  ON public.knowledge_documents (subject, year, series, component, variant);

CREATE TABLE IF NOT EXISTS public.document_chunks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id UUID NOT NULL REFERENCES public.knowledge_documents(id) ON DELETE CASCADE,
  chunk_index INT NOT NULL,
  heading TEXT,
  content TEXT NOT NULL,
  unit INT,
  topic TEXT,
  topic_id UUID,
  question_number TEXT,
  mark_value INT,
  model_version TEXT DEFAULT 'google/gemini-embedding-2',
  embedding vector(2048),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS dc_document_idx
  ON public.document_chunks (document_id, chunk_index);

CREATE INDEX IF NOT EXISTS dc_embedding_idx
  ON public.document_chunks
  USING hnsw ((embedding::halfvec(2048)) halfvec_cosine_ops);

-- Hybrid search function
CREATE OR REPLACE FUNCTION public.match_document_chunks(
  query_embedding vector(2048),
  match_count INT DEFAULT 8,
  filter_doc_types public.doc_type[] DEFAULT NULL,
  filter_topic_id UUID DEFAULT NULL
)
RETURNS TABLE (
  chunk_id UUID,
  document_id UUID,
  document_title TEXT,
  doc_type public.doc_type,
  heading TEXT,
  content TEXT,
  similarity FLOAT
)
LANGUAGE SQL STABLE SECURITY INVOKER SET search_path = public AS $$
  SELECT
    c.id AS chunk_id,
    d.id AS document_id,
    d.title AS document_title,
    d.doc_type AS doc_type,
    c.heading,
    c.content,
    1 - (c.embedding::halfvec(2048) <=> query_embedding::halfvec(2048)) AS similarity
  FROM public.document_chunks c
  JOIN public.knowledge_documents d ON d.id = c.document_id
  WHERE c.embedding IS NOT NULL
    AND d.status = 'ready'
    AND (filter_doc_types IS NULL OR d.doc_type = ANY(filter_doc_types))
    AND (filter_topic_id IS NULL OR c.topic_id = filter_topic_id OR d.topic_id = filter_topic_id)
  ORDER BY c.embedding::halfvec(2048) <=> query_embedding::halfvec(2048)
  LIMIT match_count;
$$;

-- 6. QUESTION BANKS (PAPER 2 STRUCTURED & PAPER 1 MCQ)
CREATE TABLE IF NOT EXISTS public.bank_essay_questions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  subject TEXT NOT NULL DEFAULT '0455',
  series TEXT NOT NULL,
  year INT NOT NULL,
  variant INT NOT NULL,
  question_number INT NOT NULL,
  part TEXT NOT NULL,
  marks INT NOT NULL,
  command_word TEXT NOT NULL,
  tariff TEXT NOT NULL,
  question_text TEXT NOT NULL,
  ms_marking_points JSONB DEFAULT '[]'::jsonb,
  level_descriptors JSONB DEFAULT '[]'::jsonb,
  unit INT,
  topic TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS beq_subject_year_series_idx
  ON public.bank_essay_questions (subject, year, series, question_number, part);

CREATE TABLE IF NOT EXISTS public.bank_mcq_questions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  subject TEXT NOT NULL DEFAULT '0455',
  series TEXT NOT NULL,
  year INT NOT NULL,
  variant INT NOT NULL,
  question_number INT NOT NULL,
  question_text TEXT NOT NULL,
  options JSONB NOT NULL,
  correct_answer TEXT NOT NULL,
  explanation TEXT,
  unit INT,
  topic TEXT,
  diagram_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 7. MCQ TIMED EXAM ENGINE
CREATE TABLE IF NOT EXISTS public.mcq_pdf_papers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  subject TEXT NOT NULL DEFAULT '0455',
  series TEXT NOT NULL,
  year INT NOT NULL,
  variant TEXT NOT NULL,
  paper_number INT NOT NULL DEFAULT 1,
  era public.assessment_era NOT NULL DEFAULT 'legacy',
  title TEXT NOT NULL,
  duration_seconds INT NOT NULL DEFAULT 2700,
  question_count INT NOT NULL DEFAULT 30,
  pdf_url TEXT,
  ms_url TEXT,
  answer_key JSONB DEFAULT '{}'::jsonb,
  parsed_questions JSONB DEFAULT '[]'::jsonb,
  status TEXT NOT NULL DEFAULT 'draft',
  parse_confidence NUMERIC DEFAULT 1.0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.mcq_attempts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  paper_id UUID NOT NULL REFERENCES public.mcq_pdf_papers(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  answers JSONB DEFAULT '{}'::jsonb,
  score INT DEFAULT 0,
  total_questions INT NOT NULL,
  time_spent_seconds INT DEFAULT 0,
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  server_deadline TIMESTAMPTZ,
  clock_offset_ms INT DEFAULT 0,
  submitted_at TIMESTAMPTZ,
  status TEXT NOT NULL DEFAULT 'in_progress',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS mcq_attempts_user_paper_idx
  ON public.mcq_attempts (user_id, paper_id, created_at DESC);

-- Legacy alias table if queried
CREATE TABLE IF NOT EXISTS public.mcq_pdf_attempts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  paper_id UUID NOT NULL REFERENCES public.mcq_pdf_papers(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  answers JSONB DEFAULT '{}'::jsonb,
  score INT DEFAULT 0,
  total_questions INT NOT NULL,
  time_spent_seconds INT DEFAULT 0,
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  submitted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 8. ESSAYS & MARKING ENGINE
CREATE TABLE IF NOT EXISTS public.essays (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  question_id UUID REFERENCES public.bank_essay_questions(id) ON DELETE SET NULL,
  custom_question_text TEXT,
  marks_available INT NOT NULL DEFAULT 8,
  student_answer TEXT NOT NULL,
  score INT,
  ao1_mark INT,
  ao2_mark INT,
  ao3_mark INT,
  feedback JSONB,
  marking_mode public.marking_mode DEFAULT 'cambridge',
  source TEXT DEFAULT 'student',
  status TEXT DEFAULT 'graded',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS essays_user_created_idx
  ON public.essays (user_id, created_at DESC);

CREATE TABLE IF NOT EXISTS public.essay_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  essay_id UUID NOT NULL REFERENCES public.essays(id) ON DELETE CASCADE,
  version_number INT NOT NULL DEFAULT 1,
  student_answer TEXT NOT NULL,
  score INT,
  feedback JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT essay_versions_unique UNIQUE (essay_id, version_number)
);

CREATE TABLE IF NOT EXISTS public.examiner_marking_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  essay_id UUID REFERENCES public.essays(id) ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'pass1_marking',
  pass1_result JSONB,
  pass2_result JSONB,
  final_result JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 9. DEFINITIONS & GLOSSARY HUB
CREATE TABLE IF NOT EXISTS public.definitions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  term TEXT NOT NULL UNIQUE,
  definition TEXT NOT NULL,
  syllabus_ref TEXT,
  unit INT,
  topic TEXT,
  example TEXT,
  source TEXT DEFAULT 'syllabus',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.definition_submissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  term TEXT NOT NULL,
  definition TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.calibration_anchors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  question_id UUID REFERENCES public.bank_essay_questions(id) ON DELETE CASCADE,
  target_score INT NOT NULL,
  marks_available INT NOT NULL,
  sample_essay TEXT NOT NULL,
  examiner_breakdown JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 10. CLASSROOMS & TEACHER DASHBOARDS
CREATE TABLE IF NOT EXISTS public.classrooms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  subject TEXT NOT NULL DEFAULT '0455',
  teacher_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
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
  description TEXT,
  question_id UUID REFERENCES public.bank_essay_questions(id) ON DELETE SET NULL,
  due_date TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.classroom_submissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  assignment_id UUID NOT NULL REFERENCES public.classroom_assignments(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  essay_id UUID REFERENCES public.essays(id) ON DELETE SET NULL,
  grade INT,
  teacher_feedback TEXT,
  submitted_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT classroom_submissions_unique UNIQUE (assignment_id, student_id)
);

CREATE OR REPLACE FUNCTION public.generate_classroom_join_code()
RETURNS TEXT AS $$
DECLARE
  chars TEXT := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  result TEXT := '';
  i INT;
BEGIN
  FOR i IN 1..6 LOOP
    result := result || substr(chars, floor(random() * length(chars) + 1)::int, 1);
  END LOOP;
  RETURN result;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION public.join_classroom_by_code(_code TEXT)
RETURNS JSONB AS $$
DECLARE
  v_class public.classrooms%ROWTYPE;
  v_uid UUID := auth.uid();
BEGIN
  IF v_uid IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Authentication required');
  END IF;

  SELECT * INTO v_class FROM public.classrooms WHERE upper(code) = upper(trim(_code));
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Invalid classroom code');
  END IF;

  INSERT INTO public.classroom_members (classroom_id, user_id, role)
  VALUES (v_class.id, v_uid, 'student')
  ON CONFLICT (classroom_id, user_id) DO NOTHING;

  RETURN jsonb_build_object('success', true, 'classroom_id', v_class.id, 'name', v_class.name);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 11. ADMIN AI KEY POOL & USAGE LOG
CREATE TABLE IF NOT EXISTS public.ai_provider_keys (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider TEXT NOT NULL,
  key_hash TEXT NOT NULL,
  key_encrypted TEXT NOT NULL,
  purpose TEXT NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  failure_count INT NOT NULL DEFAULT 0,
  last_used_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.ai_usage_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  provider TEXT NOT NULL,
  model TEXT NOT NULL,
  purpose TEXT NOT NULL,
  input_tokens INT DEFAULT 0,
  output_tokens INT DEFAULT 0,
  latency_ms INT DEFAULT 0,
  status TEXT DEFAULT 'success',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 12. INGESTION RUNS & REVIEW QUEUE
CREATE TABLE IF NOT EXISTS public.ingestion_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'running',
  papers_discovered INT DEFAULT 0,
  papers_ingested INT DEFAULT 0,
  papers_skipped INT DEFAULT 0,
  papers_failed INT DEFAULT 0,
  errors JSONB DEFAULT '[]'::jsonb,
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS public.paper_review_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  subject TEXT NOT NULL DEFAULT '0455',
  filename TEXT NOT NULL,
  reason TEXT NOT NULL,
  details JSONB DEFAULT '{}'::jsonb,
  status TEXT NOT NULL DEFAULT 'pending',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  resolved_at TIMESTAMPTZ
);

-- 13. PRESENCE & RATE LIMITS
CREATE TABLE IF NOT EXISTS public.user_presence (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
  last_seen TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.public_email_rate_limits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key TEXT NOT NULL UNIQUE,
  count INT DEFAULT 1,
  window_start TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.waitlist_users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL UNIQUE,
  full_name TEXT,
  role TEXT DEFAULT 'student',
  country TEXT,
  city TEXT,
  status TEXT DEFAULT 'pending',
  invited_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.waitlist_email_codes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL,
  code_hash TEXT NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  used BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ==============================================================================
-- 14. ROW LEVEL SECURITY (RLS) POLICIES
-- ==============================================================================

-- Enable RLS on all tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.knowledge_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.document_chunks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bank_essay_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bank_mcq_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mcq_pdf_papers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mcq_attempts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mcq_pdf_attempts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.essays ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.essay_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.examiner_marking_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.definitions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.definition_submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.calibration_anchors ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.classrooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.classroom_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.classroom_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.classroom_submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_provider_keys ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_usage_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ingestion_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.paper_review_queue ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_presence ENABLE ROW LEVEL SECURITY;

-- PROFILES
CREATE POLICY profiles_read ON public.profiles FOR SELECT TO authenticated
  USING (
    id = auth.uid()
    OR public.is_admin()
    OR EXISTS (
      SELECT 1 FROM public.classroom_members cm1
      JOIN public.classroom_members cm2 ON cm1.classroom_id = cm2.classroom_id
      WHERE cm1.user_id = auth.uid() AND cm2.user_id = profiles.id
    )
  );

CREATE POLICY profiles_update ON public.profiles FOR UPDATE TO authenticated
  USING (id = auth.uid() OR public.is_admin())
  WITH CHECK (id = auth.uid() OR public.is_admin());

-- USER ROLES
CREATE POLICY user_roles_read ON public.user_roles FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.is_admin());

CREATE POLICY user_roles_admin ON public.user_roles FOR ALL TO authenticated
  USING (public.is_admin());

-- KNOWLEDGE BASE & CHUNKS (Open read to authenticated, admin write)
CREATE POLICY kb_docs_read ON public.knowledge_documents FOR SELECT TO authenticated
  USING (status = 'ready' OR public.is_admin());

CREATE POLICY kb_docs_admin ON public.knowledge_documents FOR ALL TO authenticated
  USING (public.is_admin());

CREATE POLICY doc_chunks_read ON public.document_chunks FOR SELECT TO authenticated
  USING (true);

CREATE POLICY doc_chunks_admin ON public.document_chunks FOR ALL TO authenticated
  USING (public.is_admin());

-- QUESTION BANKS (Open read to authenticated, admin write)
CREATE POLICY bank_essay_read ON public.bank_essay_questions FOR SELECT TO authenticated
  USING (true);

CREATE POLICY bank_essay_admin ON public.bank_essay_questions FOR ALL TO authenticated
  USING (public.is_admin());

CREATE POLICY bank_mcq_read ON public.bank_mcq_questions FOR SELECT TO authenticated
  USING (true);

CREATE POLICY bank_mcq_admin ON public.bank_mcq_questions FOR ALL TO authenticated
  USING (public.is_admin());

-- MCQ PAPERS & ATTEMPTS
CREATE POLICY mcq_papers_read ON public.mcq_pdf_papers FOR SELECT TO authenticated
  USING (status = 'published' OR public.is_admin());

CREATE POLICY mcq_papers_admin ON public.mcq_pdf_papers FOR ALL TO authenticated
  USING (public.is_admin());

CREATE POLICY mcq_attempts_user ON public.mcq_attempts FOR ALL TO authenticated
  USING (user_id = auth.uid() OR public.is_admin())
  WITH CHECK (user_id = auth.uid() OR public.is_admin());

CREATE POLICY mcq_pdf_attempts_user ON public.mcq_pdf_attempts FOR ALL TO authenticated
  USING (user_id = auth.uid() OR public.is_admin())
  WITH CHECK (user_id = auth.uid() OR public.is_admin());

-- ESSAYS & VERSIONS (Strictly scoped to owner, teacher of student's class, or admin)
CREATE POLICY essays_owner ON public.essays FOR ALL TO authenticated
  USING (
    user_id = auth.uid()
    OR public.is_admin()
    OR EXISTS (
      SELECT 1 FROM public.classroom_submissions cs
      JOIN public.classroom_assignments ca ON ca.id = cs.assignment_id
      JOIN public.classrooms c ON c.id = ca.classroom_id
      WHERE cs.essay_id = essays.id AND c.teacher_id = auth.uid()
    )
  )
  WITH CHECK (user_id = auth.uid() OR public.is_admin());

CREATE POLICY essay_versions_owner ON public.essay_versions FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.essays e
      WHERE e.id = essay_versions.essay_id
        AND (e.user_id = auth.uid() OR public.is_admin())
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.essays e
      WHERE e.id = essay_versions.essay_id
        AND (e.user_id = auth.uid() OR public.is_admin())
    )
  );

CREATE POLICY marking_sessions_owner ON public.examiner_marking_sessions FOR ALL TO authenticated
  USING (user_id = auth.uid() OR public.is_admin())
  WITH CHECK (user_id = auth.uid() OR public.is_admin());

-- DEFINITIONS & GLOSSARY
CREATE POLICY defs_read ON public.definitions FOR SELECT TO authenticated
  USING (true);

CREATE POLICY defs_admin ON public.definitions FOR ALL TO authenticated
  USING (public.is_admin());

CREATE POLICY def_subs_user ON public.definition_submissions FOR ALL TO authenticated
  USING (user_id = auth.uid() OR public.is_admin())
  WITH CHECK (user_id = auth.uid() OR public.is_admin());

CREATE POLICY calibration_read ON public.calibration_anchors FOR SELECT TO authenticated
  USING (true);

CREATE POLICY calibration_admin ON public.calibration_anchors FOR ALL TO authenticated
  USING (public.is_admin());

-- CLASSROOMS
CREATE POLICY classrooms_read ON public.classrooms FOR SELECT TO authenticated
  USING (
    teacher_id = auth.uid()
    OR public.is_admin()
    OR EXISTS (
      SELECT 1 FROM public.classroom_members cm
      WHERE cm.classroom_id = classrooms.id AND cm.user_id = auth.uid()
    )
  );

CREATE POLICY classrooms_teacher ON public.classrooms FOR ALL TO authenticated
  USING (teacher_id = auth.uid() OR public.is_admin())
  WITH CHECK (teacher_id = auth.uid() OR public.is_admin());

CREATE POLICY classroom_members_read ON public.classroom_members FOR SELECT TO authenticated
  USING (
    user_id = auth.uid()
    OR public.is_admin()
    OR EXISTS (
      SELECT 1 FROM public.classrooms c
      WHERE c.id = classroom_members.classroom_id AND c.teacher_id = auth.uid()
    )
  );

CREATE POLICY classroom_members_manage ON public.classroom_members FOR ALL TO authenticated
  USING (
    user_id = auth.uid()
    OR public.is_admin()
    OR EXISTS (
      SELECT 1 FROM public.classrooms c
      WHERE c.id = classroom_members.classroom_id AND c.teacher_id = auth.uid()
    )
  );

CREATE POLICY classroom_assignments_read ON public.classroom_assignments FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.classroom_members cm
      WHERE cm.classroom_id = classroom_assignments.classroom_id AND cm.user_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM public.classrooms c
      WHERE c.id = classroom_assignments.classroom_id AND c.teacher_id = auth.uid()
    )
    OR public.is_admin()
  );

CREATE POLICY classroom_assignments_teacher ON public.classroom_assignments FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.classrooms c
      WHERE c.id = classroom_assignments.classroom_id AND c.teacher_id = auth.uid()
    )
    OR public.is_admin()
  );

CREATE POLICY classroom_submissions_policy ON public.classroom_submissions FOR ALL TO authenticated
  USING (
    student_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.classroom_assignments ca
      JOIN public.classrooms c ON c.id = ca.classroom_id
      WHERE ca.id = classroom_submissions.assignment_id AND c.teacher_id = auth.uid()
    )
    OR public.is_admin()
  );

-- ADMIN TABLES
CREATE POLICY ai_keys_admin ON public.ai_provider_keys FOR ALL TO authenticated
  USING (public.is_admin());

CREATE POLICY ai_usage_admin ON public.ai_usage_log FOR ALL TO authenticated
  USING (user_id = auth.uid() OR public.is_admin());

CREATE POLICY ingestion_runs_admin ON public.ingestion_runs FOR ALL TO authenticated
  USING (public.is_admin());

CREATE POLICY review_queue_admin ON public.paper_review_queue FOR ALL TO authenticated
  USING (public.is_admin());

-- USER PRESENCE
CREATE POLICY user_presence_all ON public.user_presence FOR ALL TO authenticated
  USING (true)
  WITH CHECK (user_id = auth.uid() OR public.is_admin());

-- ==============================================================================
-- 15. STORAGE BUCKETS CONFIGURATION
-- ==============================================================================
INSERT INTO storage.buckets (id, name, public)
VALUES
  ('igcse-papers', 'igcse-papers', false),
  ('uploads', 'uploads', false),
  ('bank-diagrams', 'bank-diagrams', true)
ON CONFLICT (id) DO UPDATE SET public = EXCLUDED.public;

-- Storage RLS: uploads bucket (user-isolated)
CREATE POLICY storage_uploads_user ON storage.objects FOR ALL TO authenticated
  USING (bucket_id = 'uploads' AND (auth.uid()::text = (storage.foldername(name))[1] OR public.is_admin()))
  WITH CHECK (bucket_id = 'uploads' AND (auth.uid()::text = (storage.foldername(name))[1] OR public.is_admin()));

-- Storage RLS: igcse-papers bucket (private to authenticated, admin write)
CREATE POLICY storage_papers_read ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'igcse-papers');

CREATE POLICY storage_papers_admin ON storage.objects FOR ALL TO authenticated
  USING (bucket_id = 'igcse-papers' AND public.is_admin());

-- Storage RLS: bank-diagrams (public read, admin write)
CREATE POLICY storage_diagrams_read ON storage.objects FOR SELECT TO public
  USING (bucket_id = 'bank-diagrams');

CREATE POLICY storage_diagrams_admin ON storage.objects FOR ALL TO authenticated
  USING (bucket_id = 'bank-diagrams' AND public.is_admin());
