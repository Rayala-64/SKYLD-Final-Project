-- ==========================================
-- Phase 2: SKYLD-LDOS Social Hierarchy & Daily Ritual Foundation
-- ==========================================

-- 1. Organization & Hierarchy
CREATE TABLE IF NOT EXISTS public.batches (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    start_date DATE NOT NULL,
    active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.units (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    batch_id UUID REFERENCES public.batches(id) ON DELETE CASCADE,
    active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Mentor Assignments (Explicit tables instead of polymorphic for FK integrity)
CREATE TABLE IF NOT EXISTS public.unit_mentors (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    unit_id UUID REFERENCES public.units(id) ON DELETE CASCADE,
    mentor_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
    role TEXT DEFAULT 'MENTOR',
    active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(unit_id, mentor_id)
);

CREATE TABLE IF NOT EXISTS public.pod_mentors (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    pod_id UUID REFERENCES public.pods(id) ON DELETE CASCADE,
    mentor_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
    role TEXT DEFAULT 'MENTOR',
    active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(pod_id, mentor_id)
);

-- Modify Pods
ALTER TABLE public.pods ADD COLUMN IF NOT EXISTS unit_id UUID REFERENCES public.units(id) ON DELETE SET NULL;

-- Modify Users
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS batch_id UUID REFERENCES public.batches(id) ON DELETE SET NULL;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS unit_id UUID REFERENCES public.units(id) ON DELETE SET NULL;

-- Buddy Pairs
CREATE TABLE IF NOT EXISTS public.buddy_pairs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    pod_id UUID REFERENCES public.pods(id) ON DELETE CASCADE,
    user1_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
    user2_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
    active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
    CONSTRAINT buddy_pairs_users_check CHECK (user1_id < user2_id)
);
-- Ensure a student can only be in ONE active buddy pair at a time
CREATE UNIQUE INDEX IF NOT EXISTS idx_unique_active_user1 ON public.buddy_pairs (user1_id) WHERE active = true;
CREATE UNIQUE INDEX IF NOT EXISTS idx_unique_active_user2 ON public.buddy_pairs (user2_id) WHERE active = true;

-- ==========================================
-- 2. Daily Ritual State Machine
-- ==========================================

DROP TYPE IF EXISTS ritual_status CASCADE;
CREATE TYPE ritual_status AS ENUM ('NOT_STARTED', 'IN_PROGRESS', 'COMPLETED');

CREATE TABLE IF NOT EXISTS public.daily_rituals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
    word_card_id UUID REFERENCES public.word_cards(id) ON DELETE CASCADE,
    ritual_date DATE NOT NULL,
    status ritual_status DEFAULT 'NOT_STARTED',
    total_points INTEGER DEFAULT 0,
    completed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(student_id, ritual_date)
);

-- Add ritual_id to existing submissions table (which acts as the artifact layer)
ALTER TABLE public.submissions ADD COLUMN IF NOT EXISTS daily_ritual_id UUID REFERENCES public.daily_rituals(id) ON DELETE CASCADE;

CREATE TABLE IF NOT EXISTS public.daily_ritual_steps (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ritual_id UUID REFERENCES public.daily_rituals(id) ON DELETE CASCADE,
    step_number INTEGER NOT NULL CHECK (step_number BETWEEN 1 AND 10),
    step_type TEXT NOT NULL,
    status TEXT DEFAULT 'pending',
    points_awarded INTEGER DEFAULT 0,
    completed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(ritual_id, step_number),
    UNIQUE(ritual_id, step_type) -- Idempotency: Only 1 step type per ritual
);

-- Ritual Reviews (Buddy & Peer)
CREATE TABLE IF NOT EXISTS public.ritual_reviews (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ritual_id UUID REFERENCES public.daily_rituals(id) ON DELETE CASCADE,
    reviewer_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
    reviewee_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
    review_type TEXT NOT NULL CHECK (review_type IN ('BUDDY', 'PEER')),
    status TEXT DEFAULT 'pending',
    feedback_text TEXT,
    strength_text TEXT,
    improvement_text TEXT,
    score INTEGER,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    completed_at TIMESTAMPTZ
);

-- ==========================================
-- 3. Indexes for Scalability
-- ==========================================
CREATE INDEX IF NOT EXISTS idx_daily_rituals_student_date ON public.daily_rituals(student_id, ritual_date);
CREATE INDEX IF NOT EXISTS idx_daily_ritual_steps_ritual ON public.daily_ritual_steps(ritual_id, step_number);
CREATE INDEX IF NOT EXISTS idx_ritual_reviews_ritual ON public.ritual_reviews(ritual_id);
CREATE INDEX IF NOT EXISTS idx_ritual_reviews_reviewer ON public.ritual_reviews(reviewer_id, status);
CREATE INDEX IF NOT EXISTS idx_ritual_reviews_reviewee ON public.ritual_reviews(reviewee_id, status);
CREATE INDEX IF NOT EXISTS idx_buddy_pairs_pod ON public.buddy_pairs(pod_id);

-- ==========================================
-- 4. Atomic Point Awarding RPC
-- ==========================================
CREATE OR REPLACE FUNCTION public.complete_ritual_step(
    p_ritual_id UUID,
    p_step_number INTEGER,
    p_step_type TEXT,
    p_points INTEGER,
    p_user_id UUID
) RETURNS JSONB AS $$
DECLARE
    v_ritual public.daily_rituals%ROWTYPE;
    v_existing_step UUID;
BEGIN
    -- 1. Validate ritual belongs to the user
    SELECT * INTO v_ritual FROM public.daily_rituals WHERE id = p_ritual_id AND student_id = p_user_id;
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Ritual not found or does not belong to user';
    END IF;
    
    -- 2. Check if step is already completed
    SELECT id INTO v_existing_step FROM public.daily_ritual_steps 
    WHERE ritual_id = p_ritual_id AND step_number = p_step_number AND status = 'completed';
    
    IF v_existing_step IS NOT NULL THEN
        RETURN jsonb_build_object('success', false, 'message', 'Step already completed');
    END IF;

    -- 3. Upsert step
    INSERT INTO public.daily_ritual_steps (ritual_id, step_number, step_type, status, points_awarded, completed_at)
    VALUES (p_ritual_id, p_step_number, p_step_type, 'completed', p_points, NOW())
    ON CONFLICT (ritual_id, step_number) 
    DO UPDATE SET 
        status = 'completed', 
        points_awarded = p_points, 
        completed_at = NOW() 
        WHERE public.daily_ritual_steps.status != 'completed';

    -- 4. Update Ritual Total Points & Status
    UPDATE public.daily_rituals 
    SET 
        total_points = total_points + p_points,
        status = CASE WHEN p_step_number = 1 THEN 'IN_PROGRESS' ELSE status END,
        updated_at = NOW()
    WHERE id = p_ritual_id;

    RETURN jsonb_build_object('success', true, 'points_awarded', p_points);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ==========================================
-- 5. Row Level Security (RLS)
-- ==========================================
ALTER TABLE public.batches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.units ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.unit_mentors ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pod_mentors ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.buddy_pairs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.daily_rituals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.daily_ritual_steps ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ritual_reviews ENABLE ROW LEVEL SECURITY;

-- Admins can do anything
DROP POLICY IF EXISTS "Admins manage batches" ON public.batches;
CREATE POLICY "Admins manage batches" ON public.batches FOR ALL USING (public.get_user_role() = 'admin');
DROP POLICY IF EXISTS "Admins manage units" ON public.units;
CREATE POLICY "Admins manage units" ON public.units FOR ALL USING (public.get_user_role() = 'admin');
DROP POLICY IF EXISTS "Admins manage buddy pairs" ON public.buddy_pairs;
CREATE POLICY "Admins manage buddy pairs" ON public.buddy_pairs FOR ALL USING (public.get_user_role() = 'admin');

-- Everyone can view batches and units
DROP POLICY IF EXISTS "Anyone can view batches" ON public.batches;
CREATE POLICY "Anyone can view batches" ON public.batches FOR SELECT USING (auth.role() = 'authenticated');
DROP POLICY IF EXISTS "Anyone can view units" ON public.units;
CREATE POLICY "Anyone can view units" ON public.units FOR SELECT USING (auth.role() = 'authenticated');

-- Mentors can view mentors
DROP POLICY IF EXISTS "Anyone can view mentor assignments" ON public.unit_mentors;
CREATE POLICY "Anyone can view mentor assignments" ON public.unit_mentors FOR SELECT USING (auth.role() = 'authenticated');
DROP POLICY IF EXISTS "Anyone can view pod mentor assignments" ON public.pod_mentors;
CREATE POLICY "Anyone can view pod mentor assignments" ON public.pod_mentors FOR SELECT USING (auth.role() = 'authenticated');

-- Buddy Pairs: Students can view their own, Mentors can view their pod
DROP POLICY IF EXISTS "Students can view own buddy pair" ON public.buddy_pairs;
CREATE POLICY "Students can view own buddy pair" ON public.buddy_pairs FOR SELECT USING (
    user1_id = auth.uid() OR user2_id = auth.uid()
);

-- Daily Rituals: Students manage own
DROP POLICY IF EXISTS "Students manage own rituals" ON public.daily_rituals;
CREATE POLICY "Students manage own rituals" ON public.daily_rituals FOR ALL USING (student_id = auth.uid());
DROP POLICY IF EXISTS "Students manage own ritual steps" ON public.daily_ritual_steps;
CREATE POLICY "Students manage own ritual steps" ON public.daily_ritual_steps FOR ALL USING (
    EXISTS (SELECT 1 FROM public.daily_rituals r WHERE r.id = ritual_id AND r.student_id = auth.uid())
);

-- Ritual Reviews: Reviewer can manage, Reviewee can read
DROP POLICY IF EXISTS "Reviewer can manage review" ON public.ritual_reviews;
CREATE POLICY "Reviewer can manage review" ON public.ritual_reviews FOR ALL USING (reviewer_id = auth.uid());
DROP POLICY IF EXISTS "Reviewee can read review" ON public.ritual_reviews;
CREATE POLICY "Reviewee can read review" ON public.ritual_reviews FOR SELECT USING (reviewee_id = auth.uid());

