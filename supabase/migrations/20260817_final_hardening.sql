-------------------------------------------------------------------------------
-- 1. Mentor Notes Constraints & Updated At
-------------------------------------------------------------------------------
ALTER TABLE public.mentor_notes
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

ALTER TABLE public.mentor_notes
DROP CONSTRAINT IF EXISTS mentor_notes_mentor_student_unique;

ALTER TABLE public.mentor_notes
ADD CONSTRAINT mentor_notes_mentor_student_unique UNIQUE (mentor_id, student_id);

-------------------------------------------------------------------------------
-- 2. Claim Next AI Job Security Definer
-------------------------------------------------------------------------------
DROP FUNCTION IF EXISTS public.claim_next_ai_job();
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
      attempts = attempts + 1,
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
    user_id, word_card_id, reflection_text, reflection_ai_feedback, video_url, video_ai_feedback, status, date
  ) VALUES (
    p_student_id, p_word_card_id, p_reflection_text, p_reflection_ai_feedback, p_video_url, p_video_ai_feedback, 'submitted', p_date
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
