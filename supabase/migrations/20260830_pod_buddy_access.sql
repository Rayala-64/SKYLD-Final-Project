-- 20260830_pod_buddy_access.sql
-- Implements view-only access for Buddy pairs and Pod members

-- 1. Helper Function to securely get caller's pod_id without triggering recursion
CREATE OR REPLACE FUNCTION public.get_auth_pod_id()
RETURNS UUID AS $$
DECLARE
  v_pod_id UUID;
BEGIN
  SELECT pod_id INTO v_pod_id FROM public.users WHERE id = auth.uid();
  RETURN v_pod_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp;

-- 2. Users Table RLS
-- Allows a student to read profiles of anyone in their pod.
CREATE POLICY "Users can view members of their own pod" 
ON public.users 
FOR SELECT 
USING (
  id = auth.uid() OR 
  pod_id = public.get_auth_pod_id()
);

-- 3. Submissions Table RLS
-- Allows a student to read submissions of anyone in their pod.
CREATE POLICY "Users can view submissions from their own pod" 
ON public.submissions 
FOR SELECT 
USING (
  user_id = auth.uid() OR 
  user_id IN (SELECT id FROM public.users WHERE pod_id = public.get_auth_pod_id())
);

-- 4. Streaks Table RLS
-- Allows a student to read streaks of anyone in their pod.
CREATE POLICY "Users can view streaks from their own pod" 
ON public.streaks 
FOR SELECT 
USING (
  user_id = auth.uid() OR 
  user_id IN (SELECT id FROM public.users WHERE pod_id = public.get_auth_pod_id())
);

-- 5. XP Transactions Table RLS
-- Allows a student to read XP transactions of anyone in their pod.
CREATE POLICY "Users can view xp transactions from their own pod" 
ON public.xp_transactions 
FOR SELECT 
USING (
  user_id = auth.uid() OR 
  user_id IN (SELECT id FROM public.users WHERE pod_id = public.get_auth_pod_id())
);

-- 6. Pod Messages Table & RLS
CREATE TABLE IF NOT EXISTS public.pod_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    pod_id UUID NOT NULL REFERENCES public.pods(id) ON DELETE CASCADE,
    sender_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    message TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.pod_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read messages in their pod"
ON public.pod_messages
FOR SELECT
USING (
  pod_id = public.get_auth_pod_id()
);

CREATE POLICY "Users can insert messages in their pod"
ON public.pod_messages
FOR INSERT
WITH CHECK (
  pod_id = public.get_auth_pod_id() AND
  sender_id = auth.uid()
);
