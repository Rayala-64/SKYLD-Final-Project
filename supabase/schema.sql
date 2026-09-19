-- SKYLD Word Vault™ Production Schema

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Enum for roles
DROP TYPE IF EXISTS user_role CASCADE;
CREATE TYPE user_role AS ENUM ('student', 'mentor', 'admin');

-- Enum for submission status
DROP TYPE IF EXISTS submission_status CASCADE;
CREATE TYPE submission_status AS ENUM ('not_started', 'practice_completed', 'reflection_completed', 'submitted', 'reviewed');

-- Enum for announcement scope
DROP TYPE IF EXISTS announcement_scope CASCADE;
CREATE TYPE announcement_scope AS ENUM ('global', 'pod');

-- 1. Pods (Created first because users reference it)
CREATE TABLE public.pods (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  admin_id UUID -- References users(id) later
);

-- 2. Users (Extended from auth.users)
CREATE TABLE public.users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT UNIQUE NOT NULL,
  full_name TEXT NOT NULL,
  role user_role DEFAULT 'student',
  pod_id UUID REFERENCES public.pods(id) ON DELETE SET NULL,
  buddy_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
  level INTEGER DEFAULT 1,
  consent_given BOOLEAN DEFAULT false,
  consent_date TIMESTAMPTZ,
  total_xp INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Update pods to reference users
ALTER TABLE public.pods ADD CONSTRAINT fk_pod_admin FOREIGN KEY (admin_id) REFERENCES public.users(id) ON DELETE SET NULL;

-- 3. Word Cards
CREATE TABLE public.word_cards (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  word TEXT NOT NULL UNIQUE,
  definition TEXT NOT NULL,
  example_sentence TEXT NOT NULL,
  activity JSONB,
  active_date DATE UNIQUE NOT NULL
);

-- 4. Submissions
CREATE TABLE public.submissions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
  word_card_id UUID REFERENCES public.word_cards(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  reflection_text TEXT,
  reflection_ai_feedback JSONB,
  video_url TEXT,
  video_ai_feedback JSONB,
  points_earned INTEGER DEFAULT 0,
  status submission_status DEFAULT 'not_started',
  UNIQUE(user_id, word_card_id)
);

-- 5. Streaks
CREATE TABLE public.streaks (
  user_id UUID PRIMARY KEY REFERENCES public.users(id) ON DELETE CASCADE,
  current_streak INTEGER DEFAULT 0,
  longest_streak INTEGER DEFAULT 0,
  last_active_date DATE
);

-- 6. Badges & User Badges
CREATE TABLE public.badges (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL UNIQUE,
  criteria JSONB NOT NULL
);

CREATE TABLE public.user_badges (
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
  badge_id UUID REFERENCES public.badges(id) ON DELETE CASCADE,
  earned_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (user_id, badge_id)
);

-- 7. Pod Messages
CREATE TABLE public.pod_messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  pod_id UUID REFERENCES public.pods(id) ON DELETE CASCADE,
  sender_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
  message TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 8. Announcements
CREATE TABLE public.announcements (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  scope announcement_scope NOT NULL,
  pod_id UUID REFERENCES public.pods(id) ON DELETE CASCADE, -- NULL if global
  author_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 9. Mentor Notes
CREATE TABLE public.mentor_notes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  mentor_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
  student_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
  note TEXT NOT NULL,
  flagged BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT mentor_notes_mentor_student_unique UNIQUE (mentor_id, student_id)
);

-- 10. Invites
CREATE TABLE public.invites (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  code TEXT UNIQUE NOT NULL,
  role user_role NOT NULL,
  pod_id UUID REFERENCES public.pods(id) ON DELETE CASCADE,
  created_by UUID REFERENCES public.users(id) ON DELETE CASCADE,
  used_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 11. Feedback
CREATE TABLE public.feedback (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
  page TEXT NOT NULL,
  message TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);


-- ==========================================
-- ROW LEVEL SECURITY (RLS)
-- ==========================================
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pods ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.word_cards ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.streaks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pod_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.announcements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mentor_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invites ENABLE ROW LEVEL SECURITY;

-- Helper functions for RLS to prevent infinite recursion
CREATE OR REPLACE FUNCTION public.get_user_role()
RETURNS user_role
LANGUAGE sql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT role FROM public.users WHERE id = auth.uid();
$$;

CREATE OR REPLACE FUNCTION public.get_user_pod_id()
RETURNS uuid
LANGUAGE sql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT pod_id FROM public.users WHERE id = auth.uid();
$$;

-- Users: Users can read themselves. Mentors can read their pod students. Admins can read all.
CREATE POLICY "Users can read themselves" ON public.users FOR SELECT USING (id = auth.uid());
CREATE POLICY "Mentors can read pod students" ON public.users FOR SELECT USING (
  public.get_user_role() = 'mentor' AND pod_id = public.get_user_pod_id()
);
CREATE POLICY "Admins can read all users" ON public.users FOR SELECT USING (
  public.get_user_role() = 'admin'
);

-- Submissions: Students read/write own. Mentors read pod submissions. Admins read all.
CREATE POLICY "Students manage own submissions" ON public.submissions FOR ALL USING (user_id = auth.uid());
CREATE POLICY "Mentors view pod submissions" ON public.submissions FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.users s 
    JOIN public.users m ON s.pod_id = m.pod_id
    WHERE s.id = submissions.user_id AND m.id = auth.uid() AND m.role = 'mentor'
  )
);
CREATE POLICY "Admins view all submissions" ON public.submissions FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.users u WHERE u.id = auth.uid() AND u.role = 'admin')
);

-- Word Cards: Anyone logged in can read. Only admins can modify.
CREATE POLICY "Anyone can view word cards" ON public.word_cards FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Admins manage word cards" ON public.word_cards FOR ALL USING (
  EXISTS (SELECT 1 FROM public.users u WHERE u.id = auth.uid() AND u.role = 'admin')
);

-- Streaks: Anyone can view (for leaderboards). Students can only modify their own (or system triggered).
CREATE POLICY "Public streaks view" ON public.streaks FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Modify own streaks" ON public.streaks FOR ALL USING (user_id = auth.uid());

-- Mentor Notes: Mentors only.
CREATE POLICY "Mentors manage own notes" ON public.mentor_notes FOR ALL USING (mentor_id = auth.uid());

-- Pod Messages: Users in the same pod can read/insert.
CREATE POLICY "Pod members read messages" ON public.pod_messages FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.users u WHERE u.id = auth.uid() AND u.pod_id = pod_messages.pod_id)
);
CREATE POLICY "Pod members insert messages" ON public.pod_messages FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM public.users u WHERE u.id = auth.uid() AND u.pod_id = pod_messages.pod_id)
);


-- ==========================================
-- STORAGE (Videos)
-- ==========================================
-- Insert bucket (requires postgres permissions, usually run as superuser)
INSERT INTO storage.buckets (id, name, public) VALUES ('videos', 'videos', false) ON CONFLICT (id) DO NOTHING;

-- Storage RLS
-- (Requires enabling RLS on storage.objects, which is done by default in Supabase)
-- Students can insert and select their own videos
DROP POLICY IF EXISTS "Students manage own videos" ON storage.objects;
CREATE POLICY "Students manage own videos" ON storage.objects FOR ALL USING (
  bucket_id = 'videos' AND auth.uid()::text = (storage.foldername(name))[1]
);

-- Mentors can view videos in their pod
DROP POLICY IF EXISTS "Mentors view pod videos" ON storage.objects;
CREATE POLICY "Mentors view pod videos" ON storage.objects FOR SELECT USING (
  bucket_id = 'videos' AND EXISTS (
    SELECT 1 FROM public.users s
    JOIN public.users m ON s.pod_id = m.pod_id
    WHERE s.id::text = (storage.foldername(name))[1] AND m.id = auth.uid() AND m.role = 'mentor'
  )
);

-- Admins can view all videos
DROP POLICY IF EXISTS "Admins view all videos" ON storage.objects;
CREATE POLICY "Admins view all videos" ON storage.objects FOR SELECT USING (
  bucket_id = 'videos' AND EXISTS (
    SELECT 1 FROM public.users u WHERE u.id = auth.uid() AND u.role = 'admin'
  )
);

-- 12. XP Transactions
CREATE TABLE public.xp_transactions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
  amount INTEGER NOT NULL,
  reason TEXT NOT NULL,
  idempotency_key TEXT UNIQUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 13. Practice Attempts
CREATE TABLE public.practice_attempts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
  word_card_id UUID REFERENCES public.word_cards(id) ON DELETE CASCADE,
  is_correct BOOLEAN NOT NULL,
  time_spent_seconds INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.xp_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.practice_attempts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users read own xp" ON public.xp_transactions FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "Admins manage all xp" ON public.xp_transactions FOR ALL USING (
  EXISTS (SELECT 1 FROM public.users u WHERE u.id = auth.uid() AND u.role = 'admin')
);

CREATE POLICY "Users read/write own attempts" ON public.practice_attempts FOR ALL USING (user_id = auth.uid());
CREATE POLICY "Admins read all attempts" ON public.practice_attempts FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.users u WHERE u.id = auth.uid() AND u.role = 'admin')
);

-- 15. AI Jobs
CREATE TYPE job_status AS ENUM ('pending', 'processing', 'completed', 'failed');

CREATE TABLE public.ai_jobs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  submission_id UUID REFERENCES public.submissions(id) ON DELETE CASCADE,
  status job_status DEFAULT 'pending',
  attempts integer DEFAULT 0,
  next_attempt_at TIMESTAMPTZ DEFAULT NOW(),
  error_message text,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);


-- 16. System Logs
CREATE TABLE public.system_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  level TEXT NOT NULL,
  message TEXT NOT NULL,
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 17. Trigger to aggregate XP
CREATE OR REPLACE FUNCTION update_total_xp()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE public.users
  SET total_xp = total_xp + NEW.amount
  WHERE id = NEW.user_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER on_xp_transaction_insert
  AFTER INSERT ON public.xp_transactions
  FOR EACH ROW
  EXECUTE FUNCTION update_total_xp();

-- 18. Realtime for Pod Messages
-- In Supabase, you typically publish tables using the pgoutput plugin.
-- To explicitly enable it via SQL:
ALTER PUBLICATION supabase_realtime ADD TABLE public.pod_messages;


-- Create atomic AI Job claim function returning joined data (Moved to end of file)
-- Retention Policy: Delete videos older than 30 days
-- In production, this can be scheduled via pg_cron:
-- SELECT cron.schedule('0 0 * * *', $$SELECT public.delete_old_videos()$$);
CREATE OR REPLACE FUNCTION public.delete_old_videos()
RETURNS void AS $$
BEGIN
  UPDATE public.submissions
  SET video_url = NULL
  WHERE date < CURRENT_DATE - INTERVAL '30 days'
  AND video_url IS NOT NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp;

-- 19. Rate Limits
CREATE TABLE public.rate_limits (
  ip_key TEXT PRIMARY KEY,
  requests INTEGER NOT NULL DEFAULT 1,
  window_start TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE OR REPLACE FUNCTION public.check_rate_limit(
  p_ip_key TEXT,
  p_limit INTEGER,
  p_window_seconds INTEGER
) RETURNS BOOLEAN AS $$
DECLARE
  v_requests INTEGER;
  v_window_start TIMESTAMPTZ;
BEGIN
  -- Atomic Upsert
  INSERT INTO public.rate_limits (ip_key, requests, window_start)
  VALUES (p_ip_key, 1, NOW())
  ON CONFLICT (ip_key) DO UPDATE
  SET 
    requests = CASE 
      WHEN rate_limits.window_start > NOW() - (p_window_seconds || ' seconds')::interval 
      THEN rate_limits.requests + 1 
      ELSE 1 
    END,
    window_start = CASE 
      WHEN rate_limits.window_start > NOW() - (p_window_seconds || ' seconds')::interval 
      THEN rate_limits.window_start 
      ELSE NOW() 
    END
  RETURNING requests, window_start INTO v_requests, v_window_start;

  -- Return true if the limit is EXCEEDED
  IF v_requests > p_limit THEN
    RETURN true;
  ELSE
    RETURN false;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp;

REVOKE EXECUTE ON FUNCTION public.check_rate_limit(TEXT, INTEGER, INTEGER) FROM anon, authenticated, PUBLIC;
GRANT EXECUTE ON FUNCTION public.check_rate_limit(TEXT, INTEGER, INTEGER) TO service_role;
-------------------------------------------------------------------------------
-- 2. Claim Next AI Job Security Definer
-------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.claim_next_ai_job()
RETURNS TABLE (
  job_id uuid,
  submission_id uuid,
  user_id uuid,
  word_card_id uuid,
  reflection_text text,
  video_url text,
  word text,
  job_attempts integer
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_job_id uuid;
  v_submission_id uuid;
  v_attempts integer;
  v_user_id uuid;
  v_word_card_id uuid;
  v_reflection_text text;
  v_video_url text;
  v_word text;
BEGIN
  -- 1. Find and lock the next pending job atomically, respecting next_attempt_at
  SELECT aj.id, aj.submission_id, aj.attempts
  INTO v_job_id, v_submission_id, v_attempts
  FROM public.ai_jobs aj
  WHERE aj.status IN ('pending', 'failed') AND aj.attempts < 3 AND aj.next_attempt_at <= NOW()
  ORDER BY aj.created_at ASC
  FOR UPDATE SKIP LOCKED
  LIMIT 1;

  IF v_job_id IS NULL THEN
    RETURN; -- No jobs available
  END IF;

  -- 2. Update job status to 'processing'
  UPDATE public.ai_jobs
  SET status = 'processing',
      attempts = ai_jobs.attempts + 1,
      updated_at = NOW()
  WHERE id = v_job_id;

  -- 3. Fetch associated data required for the prompt
  SELECT s.user_id, s.word_card_id, s.reflection_text, s.video_url, wc.word
  INTO v_user_id, v_word_card_id, v_reflection_text, v_video_url, v_word
  FROM public.submissions s
  JOIN public.word_cards wc ON s.word_card_id = wc.id
  WHERE s.id = v_submission_id;

  RETURN QUERY SELECT 
    v_job_id, v_submission_id, v_user_id, v_word_card_id, 
    v_reflection_text, v_video_url, v_word, v_attempts + 1;
END;
$$;

-- Must be executable by service role but NOT anon
REVOKE EXECUTE ON FUNCTION public.claim_next_ai_job() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.claim_next_ai_job() FROM anon;
REVOKE EXECUTE ON FUNCTION public.claim_next_ai_job() FROM authenticated;
GRANT EXECUTE ON FUNCTION public.claim_next_ai_job() TO service_role;

-------------------------------------------------------------------------------
-- 3. Submit Daily Mission TX Unique Violation Fix
-------------------------------------------------------------------------------
DROP FUNCTION IF EXISTS public.submit_daily_mission_tx(UUID, UUID, DATE, TEXT, JSONB, TEXT, JSONB, BOOLEAN, TEXT);

CREATE OR REPLACE FUNCTION public.submit_daily_mission_tx(
  p_student_id UUID,
  p_word_card_id UUID,
  p_date DATE,
  p_reflection_text TEXT,
  p_reflection_ai_feedback JSONB,
  p_video_url TEXT,
  p_video_ai_feedback JSONB,
  p_is_quiz_correct BOOLEAN,
  p_idempotency_key TEXT
) RETURNS JSONB AS $$
DECLARE
  v_submission_id UUID;
  v_calculated_points INTEGER := 0;
  v_current_streak INTEGER;
  v_longest_streak INTEGER;
  v_last_active_date DATE;
  v_today DATE := (CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Kolkata')::DATE;
  v_yesterday DATE := v_today - 1;
  v_constraint_name TEXT;
BEGIN
  -- Authenticate & authorize
  IF auth.uid() IS NULL OR auth.uid() != p_student_id THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  IF p_idempotency_key IS NULL THEN
    RAISE EXCEPTION 'Idempotency key is required';
  END IF;

  -- Force match the date parameter to today strictly
  IF p_date != v_today THEN
    RAISE EXCEPTION 'Mission date mismatch. Missions can only be submitted for today.';
  END IF;

  -- Validate user is student
  IF NOT EXISTS (
    SELECT 1 FROM public.users WHERE id = p_student_id AND role = 'student'
  ) THEN
    RAISE EXCEPTION 'Only students can submit daily missions';
  END IF;

  -- Validate word card matches today's active_date
  IF NOT EXISTS (
    SELECT 1 FROM public.word_cards WHERE id = p_word_card_id AND active_date = p_date
  ) THEN
    RAISE EXCEPTION 'Invalid daily mission word';
  END IF;

  -- Base XP logic
  v_calculated_points := 10;
  IF p_is_quiz_correct THEN v_calculated_points := v_calculated_points + 5; END IF;
  IF p_reflection_text IS NOT NULL AND length(p_reflection_text) > 0 THEN v_calculated_points := v_calculated_points + 10; END IF;
  IF p_video_url IS NOT NULL THEN v_calculated_points := v_calculated_points + 15; END IF;

  -- Insert submission
  INSERT INTO public.submissions (
    user_id, word_card_id, reflection_text, reflection_ai_feedback, video_url, video_ai_feedback, status, date, points_earned
  ) VALUES (
    p_student_id, p_word_card_id, p_reflection_text, p_reflection_ai_feedback, p_video_url, p_video_ai_feedback, 'submitted', p_date, v_calculated_points
  ) RETURNING id INTO v_submission_id;

  -- Insert AI job if it's pending
  IF p_reflection_ai_feedback IS NULL OR p_reflection_ai_feedback = 'null'::jsonb OR p_video_ai_feedback IS NULL OR p_video_ai_feedback = 'null'::jsonb THEN
    INSERT INTO public.ai_jobs (submission_id, status) VALUES (v_submission_id, 'pending');
  END IF;


  -- Add XP transaction
  INSERT INTO public.xp_transactions (
    user_id, amount, reason, idempotency_key
  ) VALUES (
    p_student_id, v_calculated_points, 'daily_mission', p_idempotency_key
  );

  -- Update Streaks
  SELECT current_streak, longest_streak, last_active_date 
  INTO v_current_streak, v_longest_streak, v_last_active_date
  FROM public.streaks
  WHERE user_id = p_student_id;

  IF NOT FOUND THEN
    INSERT INTO public.streaks (user_id, current_streak, longest_streak, last_active_date)
    VALUES (p_student_id, 1, 1, v_today);
  ELSE
    IF v_last_active_date = v_yesterday THEN
      UPDATE public.streaks
      SET current_streak = current_streak + 1,
          longest_streak = GREATEST(longest_streak, current_streak + 1),
          last_active_date = v_today
      WHERE user_id = p_student_id;
    ELSIF v_last_active_date < v_yesterday THEN
      UPDATE public.streaks
      SET current_streak = 1,
          last_active_date = v_today
      WHERE user_id = p_student_id;
    END IF;
  END IF;

  RETURN jsonb_build_object('success', true, 'submission_id', v_submission_id);
EXCEPTION WHEN unique_violation THEN
  GET STACKED DIAGNOSTICS v_constraint_name = CONSTRAINT_NAME;
  IF v_constraint_name = 'xp_transactions_idempotency_key_key' OR v_constraint_name = 'submissions_user_id_word_card_id_key' THEN
    RETURN jsonb_build_object('success', true, 'duplicated', true);
  ELSE
    RAISE EXCEPTION 'Unique violation: %', v_constraint_name;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp;

REVOKE EXECUTE ON FUNCTION public.submit_daily_mission_tx(UUID, UUID, DATE, TEXT, JSONB, TEXT, JSONB, BOOLEAN, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.submit_daily_mission_tx(UUID, UUID, DATE, TEXT, JSONB, TEXT, JSONB, BOOLEAN, TEXT) TO authenticated;

-------------------------------------------------------------------------------
-- 4. Secure Invite Claiming (using used_by)
-------------------------------------------------------------------------------
-- We need to drop the old one with 1 argument since we are redefining with 2
DROP FUNCTION IF EXISTS public.validate_and_claim_invite(TEXT);

CREATE OR REPLACE FUNCTION public.claim_invite(p_code TEXT, p_user_id UUID)
RETURNS JSONB AS $$
DECLARE
  v_invite_id UUID;
  v_pod_id UUID;
  v_role TEXT;
BEGIN
  -- Validate the invite first without consuming it
  SELECT id, pod_id, role::text INTO v_invite_id, v_pod_id, v_role
  FROM public.invites
  WHERE code = p_code AND used_by IS NULL AND expires_at > NOW()
  FOR UPDATE SKIP LOCKED;

  IF v_invite_id IS NULL THEN
    RAISE EXCEPTION 'Invalid, expired, or already used invite code';
  END IF;

  -- Validate p_user_id
  IF NOT EXISTS (SELECT 1 FROM auth.users WHERE id = p_user_id) THEN
    RAISE EXCEPTION 'Invalid user';
  END IF;

  IF EXISTS (SELECT 1 FROM public.users WHERE id = p_user_id) THEN
    RAISE EXCEPTION 'User already has a profile';
  END IF;

  -- Mark as used by this user
  UPDATE public.invites SET used_by = p_user_id WHERE id = v_invite_id;
  
  RETURN jsonb_build_object('success', true, 'pod_id', v_pod_id, 'role', v_role);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp;

-- Must be accessible anonymously during signup (via Service Role or Anon)
-- But typically this is called via Service Role during signup flow
REVOKE EXECUTE ON FUNCTION public.claim_invite(TEXT, UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.claim_invite(TEXT, UUID) TO service_role;

-------------------------------------------------------------------------------
-- 5. Secure Mentor Pod Authorization
-------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.mark_submission_reviewed(p_submission_id UUID)
RETURNS JSONB AS $$
DECLARE
  v_mentor_role TEXT;
  v_mentor_pod UUID;
  v_student_pod UUID;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  SELECT role::text, pod_id INTO v_mentor_role, v_mentor_pod FROM public.users WHERE id = auth.uid();
  IF v_mentor_role != 'mentor' THEN
    RAISE EXCEPTION 'Only mentors can review submissions';
  END IF;

  -- Student's pod
  SELECT u.pod_id INTO v_student_pod 
  FROM public.submissions s
  JOIN public.users u ON u.id = s.user_id
  WHERE s.id = p_submission_id;

  IF v_student_pod != v_mentor_pod THEN
    RAISE EXCEPTION 'You can only review submissions for students in your pod';
  END IF;

  UPDATE public.submissions SET status = 'reviewed' WHERE id = p_submission_id;
  RETURN jsonb_build_object('success', true);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp;

REVOKE EXECUTE ON FUNCTION public.mark_submission_reviewed(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.mark_submission_reviewed(UUID) TO authenticated;

CREATE OR REPLACE FUNCTION public.save_mentor_note(p_student_id UUID, p_note TEXT, p_flagged BOOLEAN DEFAULT FALSE)
RETURNS JSONB AS $$
DECLARE
  v_mentor_role TEXT;
  v_mentor_pod UUID;
  v_student_pod UUID;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  SELECT role::text, pod_id INTO v_mentor_role, v_mentor_pod FROM public.users WHERE id = auth.uid();
  IF v_mentor_role != 'mentor' THEN
    RAISE EXCEPTION 'Only mentors can save notes';
  END IF;

  SELECT pod_id INTO v_student_pod FROM public.users WHERE id = p_student_id;

  IF v_student_pod != v_mentor_pod THEN
    RAISE EXCEPTION 'You can only save notes for students in your pod';
  END IF;

  INSERT INTO public.mentor_notes (mentor_id, student_id, note, flagged)
  VALUES (auth.uid(), p_student_id, p_note, p_flagged)
  ON CONFLICT (mentor_id, student_id)
  DO UPDATE SET note = p_note, flagged = p_flagged, updated_at = NOW();

  RETURN jsonb_build_object('success', true);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp;

REVOKE EXECUTE ON FUNCTION public.save_mentor_note(UUID, TEXT, BOOLEAN) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.save_mentor_note(UUID, TEXT, BOOLEAN) TO authenticated;

-------------------------------------------------------------------------------
-- 6. Verify Rate Limit Permissions
-------------------------------------------------------------------------------
REVOKE EXECUTE ON FUNCTION public.check_rate_limit(TEXT, INTEGER, INTEGER) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.check_rate_limit(TEXT, INTEGER, INTEGER) FROM anon;
REVOKE EXECUTE ON FUNCTION public.check_rate_limit(TEXT, INTEGER, INTEGER) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.check_rate_limit(TEXT, INTEGER, INTEGER) TO service_role;

-------------------------------------------------------------------------------
-- 7. Scalability: Leaderboard & Pod Roster RPCs
-------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_global_leaderboard(p_limit INTEGER DEFAULT 50)
RETURNS TABLE (
  id uuid,
  full_name text,
  level integer,
  total_xp integer
) LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  SELECT 
    u.id, 
    u.full_name, 
    u.level, 
    u.total_xp
  FROM public.users u
  LEFT JOIN (
    SELECT user_id, MAX(date) as latest_sub
    FROM public.submissions
    GROUP BY user_id
  ) s ON s.user_id = u.id
  WHERE u.role = 'student'
  ORDER BY u.total_xp DESC NULLS LAST, s.latest_sub ASC NULLS LAST
  LIMIT p_limit;
$$;

CREATE OR REPLACE FUNCTION public.get_pod_roster(p_pod_id UUID)
RETURNS TABLE (
  id uuid,
  full_name text,
  level integer,
  total_xp integer
) LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  SELECT 
    u.id, 
    u.full_name, 
    u.level, 
    u.total_xp
  FROM public.users u
  LEFT JOIN (
    SELECT user_id, MAX(date) as latest_sub
    FROM public.submissions
    GROUP BY user_id
  ) s ON s.user_id = u.id
  WHERE u.role = 'student' AND u.pod_id = p_pod_id
  ORDER BY u.total_xp DESC NULLS LAST, s.latest_sub ASC NULLS LAST;
$$;

REVOKE EXECUTE ON FUNCTION public.get_global_leaderboard(INTEGER) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_global_leaderboard(INTEGER) TO service_role;

REVOKE EXECUTE ON FUNCTION public.get_pod_roster(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_pod_roster(UUID) TO service_role;
