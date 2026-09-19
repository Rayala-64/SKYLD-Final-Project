-- ==========================================
-- Cleanup Legacy Buddy ID
-- ==========================================

-- 1. Drop the legacy RPC if it exists
DROP FUNCTION IF EXISTS public.set_study_buddy(UUID);

-- 2. Drop the column from users table
ALTER TABLE public.users DROP COLUMN IF EXISTS buddy_id;

