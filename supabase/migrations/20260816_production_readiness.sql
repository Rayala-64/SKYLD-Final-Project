-- SKYLD Production Readiness Migration (2026-08-16)
-- Please copy and run this entire file in your Supabase SQL Editor.

-------------------------------------------------------------------------------
-- 1. Secure submit_daily_mission_tx
-------------------------------------------------------------------------------
-- Drops the old version since we are removing a parameter (p_points_earned)
DROP FUNCTION IF EXISTS public.submit_daily_mission_tx(UUID, UUID, DATE, TEXT, JSONB, TEXT, JSONB, INTEGER, BOOLEAN, TEXT);

CREATE OR REPLACE FUNCTION public.submit_daily_mission_tx(
  p_student_id UUID,
  p_word_card_id UUID,
  p_date DATE,
  p_reflection_text TEXT,
  p_reflection_ai_feedback JSONB DEFAULT NULL,
  p_video_url TEXT DEFAULT NULL,
  p_video_ai_feedback JSONB DEFAULT NULL,
  p_is_quiz_correct BOOLEAN DEFAULT FALSE,
  p_idempotency_key TEXT DEFAULT NULL
) RETURNS JSONB AS $$
DECLARE
  v_submission_id UUID;
  v_current_streak INTEGER;
  v_longest_streak INTEGER;
  v_last_active_date DATE;
  v_today DATE := (CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Kolkata')::DATE;
  v_yesterday DATE := v_today - 1;
  v_calculated_points INTEGER;
BEGIN
  -- Security check: Ensure the caller is authenticated
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;
  
  -- Security check: Ensure caller matches the student submitting the mission
  IF auth.uid() != p_student_id THEN
    RAISE EXCEPTION 'Unauthorized: Cannot submit mission for another user';
  END IF;

  -- Security check: Validate the submitted date matches today's date in Asia/Kolkata
  IF p_date != v_today THEN
    RAISE EXCEPTION 'Invalid submission date: must be today';
  END IF;

  -- Security check: Validate caller is a student
  IF NOT EXISTS (SELECT 1 FROM public.users WHERE id = p_student_id AND role = 'student') THEN
    RAISE EXCEPTION 'Unauthorized: Only students can submit missions';
  END IF;

  -- Security check: Validate idempotency key is provided
  IF p_idempotency_key IS NULL THEN
    RAISE EXCEPTION 'Idempotency key is required';
  END IF;

  -- Security check: Validate the word card is today's active word
  IF NOT EXISTS (SELECT 1 FROM public.word_cards WHERE id = p_word_card_id AND active_date = p_date) THEN
    RAISE EXCEPTION 'Invalid daily mission: word card is not active for today';
  END IF;

  -- Security check: Constrain points
  IF p_is_quiz_correct THEN
    v_calculated_points := 50;
  ELSE
    v_calculated_points := 25;
  END IF;

  -- Insert Submission
  INSERT INTO public.submissions (
    user_id, word_card_id, date, reflection_text, reflection_ai_feedback, video_url, video_ai_feedback, points_earned, status
  ) VALUES (
    p_student_id, p_word_card_id, p_date, p_reflection_text, p_reflection_ai_feedback, p_video_url, p_video_ai_feedback, v_calculated_points, 'submitted'
  ) RETURNING id INTO v_submission_id;

  -- Insert AI Job if it's pending (if AI feedback is missing)
  IF p_reflection_ai_feedback IS NULL OR p_reflection_ai_feedback = 'null'::jsonb OR p_video_ai_feedback IS NULL OR p_video_ai_feedback = 'null'::jsonb THEN
    INSERT INTO public.ai_jobs (submission_id, status) VALUES (v_submission_id, 'pending');
  END IF;

  -- Insert XP Transaction
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
  -- Assuming this is caught by idempotency key unique constraint or submission user_id+word_card_id constraint
  RETURN jsonb_build_object('success', true, 'duplicated', true);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp;

-- Explicit Execution Control
REVOKE EXECUTE ON FUNCTION public.submit_daily_mission_tx(UUID, UUID, DATE, TEXT, JSONB, TEXT, JSONB, BOOLEAN, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.submit_daily_mission_tx(UUID, UUID, DATE, TEXT, JSONB, TEXT, JSONB, BOOLEAN, TEXT) TO authenticated;


-------------------------------------------------------------------------------
-- 2. Secure Buddy Selection (RPC)
-------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.set_study_buddy(p_buddy_id UUID)
RETURNS JSONB AS $$
DECLARE
  v_caller_pod UUID;
  v_caller_role TEXT;
  v_buddy_pod UUID;
  v_buddy_role TEXT;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  IF auth.uid() = p_buddy_id THEN
    RAISE EXCEPTION 'Cannot select yourself as a buddy';
  END IF;

  -- Get caller pod and role
  SELECT pod_id, role::text INTO v_caller_pod, v_caller_role FROM public.users WHERE id = auth.uid();

  IF v_caller_role != 'student' THEN
    RAISE EXCEPTION 'Only students can select a study buddy';
  END IF;
  
  -- Get buddy pod and role
  SELECT pod_id, role::text INTO v_buddy_pod, v_buddy_role FROM public.users WHERE id = p_buddy_id;

  IF v_buddy_pod IS NULL OR v_caller_pod IS NULL OR v_buddy_pod != v_caller_pod THEN
    RAISE EXCEPTION 'Buddy must be in the same pod';
  END IF;

  IF v_buddy_role != 'student' THEN
    RAISE EXCEPTION 'Buddy must be a student';
  END IF;

  UPDATE public.users SET buddy_id = p_buddy_id WHERE id = auth.uid();
  RETURN jsonb_build_object('success', true);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp;

REVOKE EXECUTE ON FUNCTION public.set_study_buddy(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.set_study_buddy(UUID) TO authenticated;


-------------------------------------------------------------------------------
-- 3. Secure Mentor Submission Review
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

  SELECT role::text INTO v_mentor_role FROM public.users WHERE id = auth.uid();
  IF v_mentor_role != 'mentor' THEN
    RAISE EXCEPTION 'Only mentors can review submissions';
  END IF;

  -- Mentor's pod is the pod they admin
  SELECT id INTO v_mentor_pod FROM public.pods WHERE admin_id = auth.uid() LIMIT 1;
  
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


-------------------------------------------------------------------------------
-- 4. Secure Mentor Notes
-------------------------------------------------------------------------------
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

  SELECT role::text INTO v_mentor_role FROM public.users WHERE id = auth.uid();
  IF v_mentor_role != 'mentor' THEN
    RAISE EXCEPTION 'Only mentors can save notes';
  END IF;

  SELECT id INTO v_mentor_pod FROM public.pods WHERE admin_id = auth.uid() LIMIT 1;
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
-- 5. Secure Invite Claiming
-------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.validate_and_claim_invite(p_code TEXT)
RETURNS JSONB AS $$
DECLARE
  v_invite_id UUID;
  v_pod_id UUID;
  v_role TEXT;
BEGIN
  -- We don't check auth here because it's called during signup
  -- Atomic select and update
  SELECT id, pod_id, role::text INTO v_invite_id, v_pod_id, v_role
  FROM public.invites
  WHERE code = p_code AND is_used = false AND expires_at > NOW()
  FOR UPDATE SKIP LOCKED;

  IF v_invite_id IS NULL THEN
    RAISE EXCEPTION 'Invalid or expired invite code';
  END IF;

  -- Mark as used
  UPDATE public.invites SET is_used = true WHERE id = v_invite_id;
  
  RETURN jsonb_build_object('success', true, 'pod_id', v_pod_id, 'role', v_role);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp;

-- Must be accessible anonymously during signup
GRANT EXECUTE ON FUNCTION public.validate_and_claim_invite(TEXT) TO anon, authenticated;


-------------------------------------------------------------------------------
-- 6. Atomic Distributed Rate Limiter
-------------------------------------------------------------------------------
DROP FUNCTION IF EXISTS public.check_rate_limit(TEXT, TEXT, INTEGER, INTEGER);
DROP FUNCTION IF EXISTS public.check_rate_limit(TEXT, INTEGER, INTEGER);
DROP TABLE IF EXISTS public.rate_limits;

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
-- 7. Add exponential backoff columns to ai_jobs if missing
-------------------------------------------------------------------------------
ALTER TABLE public.ai_jobs ADD COLUMN IF NOT EXISTS next_attempt_at TIMESTAMPTZ DEFAULT NOW();
ALTER TABLE public.ai_jobs ADD COLUMN IF NOT EXISTS attempts INTEGER DEFAULT 0;

-------------------------------------------------------------------------------
-- 8. Replace claim_next_ai_job to use exponential backoff
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
  attempts integer
)
LANGUAGE plpgsql
SECURITY DEFINER
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
  LIMIT 1
  FOR UPDATE SKIP LOCKED;

  IF v_job_id IS NULL THEN
    RETURN; -- No pending jobs ready
  END IF;

  -- 2. Mark it as processing
  UPDATE public.ai_jobs
  SET status = 'processing', updated_at = NOW(), attempts = ai_jobs.attempts + 1
  WHERE id = v_job_id;

  -- 3. Gather the required submission data to return
  SELECT 
    s.user_id, s.word_card_id, s.reflection_text, s.video_url, wc.word
  INTO 
    v_user_id, v_word_card_id, v_reflection_text, v_video_url, v_word
  FROM public.submissions s
  JOIN public.word_cards wc ON wc.id = s.word_card_id
  WHERE s.id = v_submission_id;

  -- 4. Return the row
  RETURN QUERY SELECT 
    v_job_id, v_submission_id, v_user_id, v_word_card_id, v_reflection_text, v_video_url, v_word, v_attempts + 1;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.claim_next_ai_job() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.claim_next_ai_job() FROM anon;
REVOKE EXECUTE ON FUNCTION public.claim_next_ai_job() FROM authenticated;
GRANT EXECUTE ON FUNCTION public.claim_next_ai_job() TO service_role;
