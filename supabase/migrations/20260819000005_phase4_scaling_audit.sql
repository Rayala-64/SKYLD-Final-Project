-- ==========================================
-- Phase 4: Scaling & Audit (₹0 Cost Architecture)
-- ==========================================

-- 1. Notifications System
CREATE TABLE IF NOT EXISTS public.notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
    type TEXT NOT NULL CHECK (type IN ('BUDDY_REVIEW_ASSIGNED', 'PEER_REVIEW_ASSIGNED', 'POD_CHALLENGE_GRADED', 'MASTER_EVALUATION_COMPLETED', 'DAILY_RITUAL_COMPLETED', 'CHAMPIONSHIP_UPDATE', 'SYSTEM')),
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    entity_type TEXT,
    entity_id UUID,
    read_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Notification Indexes
CREATE INDEX IF NOT EXISTS idx_notifications_user_id_read_at ON public.notifications(user_id, read_at, created_at);

-- Notification RLS
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own notifications" 
    ON public.notifications FOR SELECT 
    USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own notifications (mark as read)" 
    ON public.notifications FOR UPDATE 
    USING (auth.uid() = user_id);

-- Only trusted server roles can insert notifications. Normal users cannot.

-- Notification Cleanup Function (can be triggered by pg_cron or an API endpoint)
CREATE OR REPLACE FUNCTION public.cleanup_old_notifications()
RETURNS void AS $$
BEGIN
    -- Delete notifications that have been read and are older than 90 days
    -- Deletes in small batches if necessary, but a single statement is usually fine for daily cron
    DELETE FROM public.notifications
    WHERE read_at IS NOT NULL AND created_at < NOW() - INTERVAL '90 days';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- 2. Audit Logging System
CREATE TABLE IF NOT EXISTS public.audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    actor_id UUID REFERENCES public.users(id), -- Nullable for system actions
    action TEXT NOT NULL CHECK (action IN ('BATCH_CREATED', 'UNIT_CREATED', 'POD_CREATED', 'BUDDY_ASSIGNED', 'MENTOR_ASSIGNED', 'RITUAL_SCORE_AWARDED', 'PEER_EVALUATION_CREATED', 'MASTER_EVALUATION_CREATED', 'CHAMPIONSHIP_CREATED', 'CHAMPIONSHIP_FINALIZED', 'SCORE_ADJUSTED', 'USER_ROLE_CHANGED')),
    entity_type TEXT NOT NULL,
    entity_id UUID NOT NULL,
    old_value JSONB,
    new_value JSONB,
    reason TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Audit Indexes
CREATE INDEX IF NOT EXISTS idx_audit_logs_entity ON public.audit_logs(entity_type, entity_id, created_at);
CREATE INDEX IF NOT EXISTS idx_audit_logs_actor ON public.audit_logs(actor_id, created_at);

-- Audit RLS (Append Only by Server, Read Only by Admin/Mentor)
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view all audit logs" 
    ON public.audit_logs FOR SELECT 
    USING (EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'admin'));

-- No user can INSERT/UPDATE/DELETE directly via API. Must be done via Server RPC/Service Role.

-- 3. Production Performance Indexes (per spec)
CREATE INDEX IF NOT EXISTS idx_championship_score_events_student ON public.championship_score_events(championship_id, student_id);
CREATE INDEX IF NOT EXISTS idx_championship_score_events_source ON public.championship_score_events(championship_id, source_type);
CREATE INDEX IF NOT EXISTS idx_daily_rituals_student_date ON public.daily_rituals(student_id, ritual_date);
CREATE INDEX IF NOT EXISTS idx_ritual_reviews_reviewer_status ON public.ritual_reviews(reviewer_id, status);
CREATE INDEX IF NOT EXISTS idx_peer_evaluations_reviewer_status ON public.peer_evaluations(reviewer_id, status);
CREATE INDEX IF NOT EXISTS idx_master_evaluations_pod_week ON public.master_evaluations(pod_id, championship_week_id);

-- 4. Advanced Analytics Views (SECURITY INVOKER to respect underlying RLS/privileges)

-- Ensure daily_rituals has the columns expected by the view
ALTER TABLE public.daily_rituals ADD COLUMN IF NOT EXISTS status ritual_status DEFAULT 'NOT_STARTED';
ALTER TABLE public.daily_rituals ADD COLUMN IF NOT EXISTS started_at TIMESTAMPTZ;

-- Student Engagement Stats
CREATE OR REPLACE VIEW public.student_engagement_stats WITH (security_invoker=on) AS
SELECT 
    u.batch_id,
    u.unit_id,
    u.pod_id,
    COUNT(u.id) as total_students,
    COUNT(u.id) FILTER (WHERE dr.id IS NOT NULL) as active_students, -- basic active proxy
    COUNT(u.id) FILTER (WHERE dr.id IS NULL) as inactive_students,
    AVG(CASE WHEN dr.status = 'COMPLETED' THEN 1 ELSE 0 END) * 100 as ritual_completion_rate,
    AVG(EXTRACT(EPOCH FROM (dr.completed_at - dr.started_at))/60) as average_completion_time_minutes
FROM public.users u
LEFT JOIN public.daily_rituals dr ON u.id = dr.student_id
WHERE u.role = 'student'
GROUP BY u.batch_id, u.unit_id, u.pod_id;

-- Vocabulary Performance Stats
CREATE OR REPLACE VIEW public.vocabulary_performance_stats WITH (security_invoker=on) AS
SELECT 
    w.word,
    w.level as difficulty_level,
    COUNT(s.id) as attempt_count,
    COUNT(s.id) FILTER (WHERE s.points_earned = 0) as failed_attempts,
    (COUNT(s.id) FILTER (WHERE s.points_earned = 0)::FLOAT / NULLIF(COUNT(s.id), 0)) * 100 as failure_rate
FROM public.word_cards w
LEFT JOIN public.submissions s ON w.id = s.word_card_id
GROUP BY w.id, w.word, w.level
ORDER BY failure_rate DESC;

-- Pod Performance Stats
CREATE OR REPLACE VIEW public.pod_performance_stats WITH (security_invoker=on) AS
SELECT 
    p.id as pod_id,
    p.name as pod_name,
    c.championship_id,
    AVG(c.total_score) as average_pod_score,
    MAX(c.total_score) as top_score,
    COUNT(u.id) as total_students,
    RANK() OVER (PARTITION BY c.championship_id ORDER BY AVG(c.total_score) DESC) as batch_rank
FROM public.pods p
LEFT JOIN public.users u ON p.id = u.pod_id AND u.role = 'student'
LEFT JOIN public.championship_standings c ON u.id = c.student_id
GROUP BY p.id, p.name, c.championship_id;

-- Championship Analytics
CREATE OR REPLACE VIEW public.championship_analytics WITH (security_invoker=on) AS
SELECT 
    championship_id,
    AVG(total_score) as average_score,
    MAX(total_score) as top_score,
    PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY total_score) as median_score,
    COUNT(student_id) as total_participants
FROM public.championship_standings
GROUP BY championship_id;
