-- ==========================================
-- Phase 2.1: Review Step Trigger RPC
-- ==========================================

-- This RPC allows a reviewer to complete a ritual step (Buddy Review or Peer Review) 
-- on behalf of the reviewee, bypassing RLS safely since it checks authorization first.
CREATE OR REPLACE FUNCTION public.complete_review_step_trigger(
    p_ritual_id UUID,
    p_step_number INTEGER,
    p_step_type TEXT,
    p_points INTEGER,
    p_reviewer_id UUID
) RETURNS JSONB AS $$
DECLARE
    v_review_auth UUID;
    v_existing_step UUID;
BEGIN
    -- 1. Validate that p_reviewer_id is assigned to review this ritual
    SELECT id INTO v_review_auth FROM public.ritual_reviews 
    WHERE ritual_id = p_ritual_id AND reviewer_id = p_reviewer_id AND status = 'completed';
    
    IF v_review_auth IS NULL THEN
        RAISE EXCEPTION 'Not authorized to advance this ritual or review not completed.';
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

    -- 4. Update Ritual Total Points
    UPDATE public.daily_rituals 
    SET 
        total_points = total_points + p_points,
        updated_at = NOW()
    WHERE id = p_ritual_id;

    RETURN jsonb_build_object('success', true, 'points_awarded', p_points);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
