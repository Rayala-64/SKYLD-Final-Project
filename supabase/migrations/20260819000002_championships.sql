-- ==========================================
-- Phase 3: Weekly Themes & Championships
-- ==========================================

-- 1. Weekly Theme Config
CREATE TABLE IF NOT EXISTS public.weekly_theme_config (
    day_of_week TEXT PRIMARY KEY,
    theme TEXT NOT NULL,
    description TEXT,
    active BOOLEAN DEFAULT true,
    CONSTRAINT valid_day CHECK (day_of_week IN ('MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY', 'SUNDAY'))
);

INSERT INTO public.weekly_theme_config (day_of_week, theme) VALUES
('MONDAY', 'Personal Experiences'),
('TUESDAY', 'Business & Management'),
('WEDNESDAY', 'Leadership'),
('THURSDAY', 'Current Affairs'),
('FRIDAY', 'Innovation & Technology'),
('SATURDAY', 'Inspiration & Motivation'),
('SUNDAY', 'Open Choice')
ON CONFLICT (day_of_week) DO NOTHING;

-- 2. Championships
CREATE TABLE IF NOT EXISTS public.championships (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    batch_id UUID REFERENCES public.batches(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    status TEXT DEFAULT 'DRAFT' CHECK (status IN ('DRAFT', 'ACTIVE', 'COMPLETED', 'ARCHIVED')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    CONSTRAINT start_before_end CHECK (start_date < end_date)
);

-- 3. Championship Weeks
CREATE TABLE IF NOT EXISTS public.championship_weeks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    championship_id UUID REFERENCES public.championships(id) ON DELETE CASCADE,
    week_number INTEGER NOT NULL CHECK (week_number BETWEEN 1 AND 4),
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    status TEXT DEFAULT 'DRAFT' CHECK (status IN ('DRAFT', 'ACTIVE', 'COMPLETED')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    CONSTRAINT unique_championship_week UNIQUE(championship_id, week_number),
    CONSTRAINT week_start_before_end CHECK (start_date < end_date)
);

-- 4. Weekly Challenges
CREATE TABLE IF NOT EXISTS public.weekly_challenges (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    championship_week_id UUID REFERENCES public.championship_weeks(id) ON DELETE CASCADE,
    theme TEXT NOT NULL,
    title TEXT NOT NULL,
    description TEXT,
    instructions TEXT,
    max_points INTEGER DEFAULT 10,
    active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 5. Pod Challenge Submissions
CREATE TABLE IF NOT EXISTS public.pod_challenge_submissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    weekly_challenge_id UUID REFERENCES public.weekly_challenges(id) ON DELETE CASCADE,
    pod_id UUID REFERENCES public.pods(id) ON DELETE CASCADE,
    submitted_by UUID REFERENCES public.users(id),
    artifact_type TEXT DEFAULT 'VIDEO',
    video_url TEXT NOT NULL,
    description TEXT,
    status TEXT DEFAULT 'SUBMITTED',
    submission_version INTEGER DEFAULT 1,
    submitted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    CONSTRAINT unique_weekly_pod_submission UNIQUE(weekly_challenge_id, pod_id, submission_version)
);

-- 6. Pod Challenge Evaluations (External/Peer Evaluators)
CREATE TABLE IF NOT EXISTS public.pod_challenge_evaluations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    submission_id UUID REFERENCES public.pod_challenge_submissions(id) ON DELETE CASCADE,
    evaluator_id UUID REFERENCES public.users(id),
    evaluator_type TEXT NOT NULL CHECK (evaluator_type IN ('PEER_POD', 'FACULTY', 'ALUMNI', 'INDUSTRY')),
    score NUMERIC NOT NULL CHECK (score >= 0 AND score <= 10),
    feedback TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 7. Peer Evaluations (Individual Student Level)
CREATE TABLE IF NOT EXISTS public.peer_evaluations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    championship_week_id UUID REFERENCES public.championship_weeks(id) ON DELETE CASCADE,
    reviewer_id UUID REFERENCES public.users(id),
    reviewee_id UUID REFERENCES public.users(id),
    score NUMERIC CHECK (score >= 0 AND score <= 10),
    feedback TEXT,
    status TEXT DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'COMPLETED')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    completed_at TIMESTAMP WITH TIME ZONE,
    CONSTRAINT reviewer_neq_reviewee CHECK (reviewer_id != reviewee_id),
    CONSTRAINT unique_peer_eval UNIQUE(championship_week_id, reviewer_id, reviewee_id)
);

-- 8. Master Evaluations (Mentor Ownership Team evaluates the Pod)
CREATE TABLE IF NOT EXISTS public.master_evaluations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    championship_week_id UUID REFERENCES public.championship_weeks(id) ON DELETE CASCADE,
    pod_id UUID REFERENCES public.pods(id) ON DELETE CASCADE,
    mentor_id UUID REFERENCES public.users(id),
    score NUMERIC CHECK (score >= 0 AND score <= 10),
    feedback TEXT,
    status TEXT DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'COMPLETED')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    completed_at TIMESTAMP WITH TIME ZONE,
    CONSTRAINT unique_master_eval UNIQUE(championship_week_id, pod_id, mentor_id)
);

-- 9. Grand Championship Entries
CREATE TABLE IF NOT EXISTS public.grand_championship_entries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    championship_id UUID REFERENCES public.championships(id) ON DELETE CASCADE,
    pod_id UUID REFERENCES public.pods(id) ON DELETE CASCADE,
    presentation_url TEXT NOT NULL,
    status TEXT DEFAULT 'SUBMITTED',
    score NUMERIC CHECK (score >= 0 AND score <= 150),
    feedback TEXT,
    submitted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    evaluated_at TIMESTAMP WITH TIME ZONE,
    CONSTRAINT unique_grand_entry UNIQUE(championship_id, pod_id)
);

-- 10. Grand Championship Participants (Attribution Rule)
CREATE TABLE IF NOT EXISTS public.grand_championship_participants (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    grand_championship_entry_id UUID REFERENCES public.grand_championship_entries(id) ON DELETE CASCADE,
    student_id UUID REFERENCES public.users(id),
    eligible BOOLEAN DEFAULT true,
    score_allocation NUMERIC DEFAULT 0, -- Set by RPC when Pod score is finalized
    CONSTRAINT unique_grand_participant UNIQUE(grand_championship_entry_id, student_id)
);

-- 11. Championship Score Events (The Ledger)
CREATE TABLE IF NOT EXISTS public.championship_score_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    championship_id UUID REFERENCES public.championships(id) ON DELETE CASCADE,
    student_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
    source_type TEXT NOT NULL CHECK (source_type IN ('DAILY_RITUAL', 'POD_CHALLENGE', 'PEER_EVALUATION', 'MASTER_EVALUATION', 'GRAND_CHAMPIONSHIP')),
    source_id UUID NOT NULL, -- The ID of the ritual, eval, etc.
    points NUMERIC NOT NULL,
    week_number INTEGER, -- Nullable for Grand Championship
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    CONSTRAINT unique_score_event UNIQUE(student_id, source_type, source_id)
);

-- 12. Championship Score Adjustments (Audit Trail)
CREATE TABLE IF NOT EXISTS public.championship_score_adjustments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id UUID REFERENCES public.users(id),
    championship_id UUID REFERENCES public.championships(id),
    points_delta NUMERIC NOT NULL,
    reason TEXT NOT NULL,
    created_by UUID REFERENCES public.users(id), -- Admin
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ==========================================
-- VIEWS: Leaderboards
-- ==========================================

-- Student Standings
CREATE OR REPLACE VIEW public.championship_standings AS
WITH student_scores AS (
    SELECT 
        student_id,
        championship_id,
        COALESCE(SUM(points) FILTER (WHERE source_type = 'DAILY_RITUAL'), 0) as daily_ritual_points,
        COALESCE(SUM(points) FILTER (WHERE source_type = 'POD_CHALLENGE'), 0) as pod_challenge_points,
        COALESCE(SUM(points) FILTER (WHERE source_type = 'PEER_EVALUATION'), 0) as peer_evaluation_points,
        COALESCE(SUM(points) FILTER (WHERE source_type = 'MASTER_EVALUATION'), 0) as master_evaluation_points,
        COALESCE(SUM(points) FILTER (WHERE source_type = 'GRAND_CHAMPIONSHIP'), 0) as grand_championship_points,
        COALESCE(SUM(points), 0) as total_event_score
    FROM public.championship_score_events
    GROUP BY student_id, championship_id
),
adjustments AS (
    SELECT student_id, championship_id, COALESCE(SUM(points_delta), 0) as adjustment_points
    FROM public.championship_score_adjustments
    GROUP BY student_id, championship_id
)
SELECT 
    u.id as student_id,
    u.full_name as student_name,
    u.batch_id,
    u.unit_id,
    u.pod_id,
    c.id as championship_id,
    LEAST(COALESCE(ss.daily_ritual_points, 0), 280) as daily_ritual_points,
    LEAST(COALESCE(ss.pod_challenge_points, 0), 40) as pod_challenge_points,
    LEAST(COALESCE(ss.peer_evaluation_points, 0), 40) as peer_evaluation_points,
    LEAST(COALESCE(ss.master_evaluation_points, 0), 40) as master_evaluation_points,
    LEAST(COALESCE(ss.grand_championship_points, 0), 150) as grand_championship_points,
    COALESCE(adj.adjustment_points, 0) as adjustment_points,
    -- Cap total score at 550
    LEAST(
        LEAST(COALESCE(ss.daily_ritual_points, 0), 280) + 
        LEAST(COALESCE(ss.pod_challenge_points, 0), 40) + 
        LEAST(COALESCE(ss.peer_evaluation_points, 0), 40) + 
        LEAST(COALESCE(ss.master_evaluation_points, 0), 40) + 
        LEAST(COALESCE(ss.grand_championship_points, 0), 150) + 
        COALESCE(adj.adjustment_points, 0), 
    550) as total_score,
    RANK() OVER (PARTITION BY c.id ORDER BY (
        LEAST(COALESCE(ss.daily_ritual_points, 0), 280) + 
        LEAST(COALESCE(ss.pod_challenge_points, 0), 40) + 
        LEAST(COALESCE(ss.peer_evaluation_points, 0), 40) + 
        LEAST(COALESCE(ss.master_evaluation_points, 0), 40) + 
        LEAST(COALESCE(ss.grand_championship_points, 0), 150) + 
        COALESCE(adj.adjustment_points, 0)
    ) DESC) as batch_rank,
    RANK() OVER (PARTITION BY c.id, u.unit_id ORDER BY (
        LEAST(COALESCE(ss.daily_ritual_points, 0), 280) + 
        LEAST(COALESCE(ss.pod_challenge_points, 0), 40) + 
        LEAST(COALESCE(ss.peer_evaluation_points, 0), 40) + 
        LEAST(COALESCE(ss.master_evaluation_points, 0), 40) + 
        LEAST(COALESCE(ss.grand_championship_points, 0), 150) + 
        COALESCE(adj.adjustment_points, 0)
    ) DESC) as unit_rank,
    RANK() OVER (PARTITION BY c.id, u.pod_id ORDER BY (
        LEAST(COALESCE(ss.daily_ritual_points, 0), 280) + 
        LEAST(COALESCE(ss.pod_challenge_points, 0), 40) + 
        LEAST(COALESCE(ss.peer_evaluation_points, 0), 40) + 
        LEAST(COALESCE(ss.master_evaluation_points, 0), 40) + 
        LEAST(COALESCE(ss.grand_championship_points, 0), 150) + 
        COALESCE(adj.adjustment_points, 0)
    ) DESC) as pod_rank
FROM public.users u
CROSS JOIN public.championships c
LEFT JOIN student_scores ss ON u.id = ss.student_id AND c.id = ss.championship_id
LEFT JOIN adjustments adj ON u.id = adj.student_id AND c.id = adj.championship_id
WHERE u.role = 'student' AND c.status != 'DRAFT';

-- Pod Standings
CREATE OR REPLACE VIEW public.pod_championship_standings AS
SELECT 
    pod_id,
    championship_id,
    AVG(total_score) as average_pod_score,
    SUM(total_score) as total_pod_score,
    RANK() OVER (PARTITION BY championship_id ORDER BY AVG(total_score) DESC) as batch_rank
FROM public.championship_standings
GROUP BY pod_id, championship_id;

-- ==========================================
-- RPC FUNCTIONS FOR SECURE ATOMIC SCORING
-- ==========================================

-- Aggregate Master Evaluations for a Pod and allocate points to all eligible students
CREATE OR REPLACE FUNCTION public.finalize_master_evaluation(
    p_championship_id UUID,
    p_week_number INTEGER,
    p_pod_id UUID
) RETURNS JSONB AS $$
DECLARE
    v_week_id UUID;
    v_avg_score NUMERIC;
    v_student RECORD;
BEGIN
    -- Get week id
    SELECT id INTO v_week_id FROM public.championship_weeks WHERE championship_id = p_championship_id AND week_number = p_week_number;
    IF v_week_id IS NULL THEN RETURN jsonb_build_object('success', false, 'message', 'Week not found'); END IF;

    -- Calculate average mentor score
    SELECT AVG(score) INTO v_avg_score FROM public.master_evaluations WHERE championship_week_id = v_week_id AND pod_id = p_pod_id AND status = 'COMPLETED';
    IF v_avg_score IS NULL THEN RETURN jsonb_build_object('success', false, 'message', 'No completed master evaluations'); END IF;
    
    -- Normalize to max 10
    v_avg_score := LEAST(v_avg_score, 10.0);

    -- Award points to all active students in the pod
    FOR v_student IN SELECT id FROM public.users WHERE pod_id = p_pod_id AND role = 'student' LOOP
        INSERT INTO public.championship_score_events (championship_id, student_id, source_type, source_id, points, week_number)
        VALUES (p_championship_id, v_student.id, 'MASTER_EVALUATION', p_pod_id, v_avg_score, p_week_number)
        ON CONFLICT (student_id, source_type, source_id) 
        DO UPDATE SET points = EXCLUDED.points;
    END LOOP;

    RETURN jsonb_build_object('success', true, 'score_awarded', v_avg_score);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Aggregate Pod Challenge Evaluations and allocate points to all eligible students
CREATE OR REPLACE FUNCTION public.finalize_pod_challenge(
    p_championship_id UUID,
    p_week_number INTEGER,
    p_pod_id UUID
) RETURNS JSONB AS $$
DECLARE
    v_week_id UUID;
    v_challenge_id UUID;
    v_submission_id UUID;
    v_avg_score NUMERIC;
    v_student RECORD;
BEGIN
    SELECT id INTO v_week_id FROM public.championship_weeks WHERE championship_id = p_championship_id AND week_number = p_week_number;
    SELECT id INTO v_challenge_id FROM public.weekly_challenges WHERE championship_week_id = v_week_id;
    SELECT id INTO v_submission_id FROM public.pod_challenge_submissions WHERE weekly_challenge_id = v_challenge_id AND pod_id = p_pod_id LIMIT 1;
    
    IF v_submission_id IS NULL THEN RETURN jsonb_build_object('success', false, 'message', 'No submission found'); END IF;

    SELECT AVG(score) INTO v_avg_score FROM public.pod_challenge_evaluations WHERE submission_id = v_submission_id;
    IF v_avg_score IS NULL THEN RETURN jsonb_build_object('success', false, 'message', 'No evaluations found'); END IF;
    
    v_avg_score := LEAST(v_avg_score, 10.0);

    FOR v_student IN SELECT id FROM public.users WHERE pod_id = p_pod_id AND role = 'student' LOOP
        INSERT INTO public.championship_score_events (championship_id, student_id, source_type, source_id, points, week_number)
        VALUES (p_championship_id, v_student.id, 'POD_CHALLENGE', v_submission_id, v_avg_score, p_week_number)
        ON CONFLICT (student_id, source_type, source_id) 
        DO UPDATE SET points = EXCLUDED.points;
    END LOOP;

    RETURN jsonb_build_object('success', true, 'score_awarded', v_avg_score);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Finalize Grand Championship
CREATE OR REPLACE FUNCTION public.finalize_grand_championship(
    p_championship_id UUID,
    p_pod_id UUID,
    p_final_score NUMERIC
) RETURNS JSONB AS $$
DECLARE
    v_entry_id UUID;
    v_student RECORD;
    v_normalized_score NUMERIC;
BEGIN
    -- Check if championship is active
    -- Ensure score doesn't exceed 150
    v_normalized_score := LEAST(p_final_score, 150.0);

    SELECT id INTO v_entry_id FROM public.grand_championship_entries WHERE championship_id = p_championship_id AND pod_id = p_pod_id;
    IF v_entry_id IS NULL THEN
        -- create it
        INSERT INTO public.grand_championship_entries (championship_id, pod_id, presentation_url, status, score, evaluated_at)
        VALUES (p_championship_id, p_pod_id, '', 'EVALUATED', v_normalized_score, NOW())
        RETURNING id INTO v_entry_id;
    ELSE
        UPDATE public.grand_championship_entries SET score = v_normalized_score, status = 'EVALUATED', evaluated_at = NOW() WHERE id = v_entry_id;
    END IF;

    -- Award points to all eligible participants
    FOR v_student IN SELECT id FROM public.users WHERE pod_id = p_pod_id AND role = 'student' LOOP
        -- Upsert participant record
        INSERT INTO public.grand_championship_participants (grand_championship_entry_id, student_id, eligible, score_allocation)
        VALUES (v_entry_id, v_student.id, true, v_normalized_score)
        ON CONFLICT (grand_championship_entry_id, student_id) 
        DO UPDATE SET score_allocation = v_normalized_score;

        -- Write to ledger
        INSERT INTO public.championship_score_events (championship_id, student_id, source_type, source_id, points)
        VALUES (p_championship_id, v_student.id, 'GRAND_CHAMPIONSHIP', v_entry_id, v_normalized_score)
        ON CONFLICT (student_id, source_type, source_id) 
        DO UPDATE SET points = EXCLUDED.points;
    END LOOP;

    RETURN jsonb_build_object('success', true, 'score_awarded', v_normalized_score);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Award Peer Evaluation Points
CREATE OR REPLACE FUNCTION public.award_peer_evaluation_points(
    p_eval_id UUID,
    p_score NUMERIC
) RETURNS JSONB AS $$
DECLARE
    v_eval RECORD;
    v_week RECORD;
    v_normalized_score NUMERIC;
BEGIN
    SELECT * INTO v_eval FROM public.peer_evaluations WHERE id = p_eval_id;
    IF v_eval IS NULL THEN RETURN jsonb_build_object('success', false, 'message', 'Eval not found'); END IF;

    SELECT * INTO v_week FROM public.championship_weeks WHERE id = v_eval.championship_week_id;
    
    v_normalized_score := LEAST(p_score, 10.0);

    INSERT INTO public.championship_score_events (championship_id, student_id, source_type, source_id, points, week_number)
    VALUES (v_week.championship_id, v_eval.reviewee_id, 'PEER_EVALUATION', p_eval_id, v_normalized_score, v_week.week_number)
    ON CONFLICT (student_id, source_type, source_id) 
    DO UPDATE SET points = EXCLUDED.points;

    RETURN jsonb_build_object('success', true);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
