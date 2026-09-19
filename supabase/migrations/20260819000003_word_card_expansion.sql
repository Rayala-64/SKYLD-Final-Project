-- Migration: Expand word_cards for SKYLD-LDOS 16-field architecture

-- Create status enum
DO $$ BEGIN
    CREATE TYPE word_card_status AS ENUM ('draft', 'review', 'approved', 'published', 'archived');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Alter table to add the new fields
ALTER TABLE public.word_cards 
  -- Status and metadata
  ADD COLUMN IF NOT EXISTS status word_card_status DEFAULT 'draft',
  ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS approved_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW(),
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW(),
  ADD COLUMN IF NOT EXISTS published_at TIMESTAMPTZ,
  
  -- Grouping/Sequencing
  ADD COLUMN IF NOT EXISTS module_name TEXT,
  ADD COLUMN IF NOT EXISTS level TEXT DEFAULT 'Level 1: Foundational Vocabulary',
  
  -- The 16 Fields (word and active_date already exist)
  ADD COLUMN IF NOT EXISTS ipa_pronunciation TEXT,
  ADD COLUMN IF NOT EXISTS word_type TEXT,
  -- Re-using definition as meaning, but renaming to match the poster conceptually is not strictly necessary at DB level, let's just add 'meaning' and migrate data
  ADD COLUMN IF NOT EXISTS meaning TEXT,
  ADD COLUMN IF NOT EXISTS synonyms JSONB DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS antonyms JSONB DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS word_family JSONB DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS common_collocations JSONB DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS business_example TEXT,
  ADD COLUMN IF NOT EXISTS daily_life_example TEXT,
  ADD COLUMN IF NOT EXISTS interview_example TEXT,
  ADD COLUMN IF NOT EXISTS related_concepts JSONB DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS common_mistakes JSONB DEFAULT '[]'::jsonb, -- Array of {mistake, correction, is_correct}
  ADD COLUMN IF NOT EXISTS memory_tip TEXT,
  ADD COLUMN IF NOT EXISTS reflection_question TEXT,
  ADD COLUMN IF NOT EXISTS communication_challenge TEXT;

-- Migrate existing data: map definition to meaning, example_sentence to daily_life_example
UPDATE public.word_cards
SET 
  meaning = definition,
  daily_life_example = example_sentence,
  status = 'published',
  published_at = NOW()
WHERE meaning IS NULL;

-- Create trigger for updated_at
CREATE OR REPLACE FUNCTION update_word_cards_updated_at()
RETURNS TRIGGER AS $$
BEGIN
   NEW.updated_at = NOW();
   RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_word_cards_updated_at ON public.word_cards;
CREATE TRIGGER trg_word_cards_updated_at
BEFORE UPDATE ON public.word_cards
FOR EACH ROW
EXECUTE FUNCTION update_word_cards_updated_at();

-- Update RLS policies
ALTER TABLE public.word_cards ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can read published word cards" ON public.word_cards;
CREATE POLICY "Anyone can read published word cards" 
ON public.word_cards FOR SELECT 
USING (status = 'published' OR status IS NULL);

DROP POLICY IF EXISTS "Admins can read all word cards" ON public.word_cards;
CREATE POLICY "Admins can read all word cards" 
ON public.word_cards FOR SELECT 
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.users 
    WHERE users.id = auth.uid() AND users.role IN ('admin', 'mentor')
  )
);

DROP POLICY IF EXISTS "Admins can insert word cards" ON public.word_cards;
CREATE POLICY "Admins can insert word cards" 
ON public.word_cards FOR INSERT 
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.users 
    WHERE users.id = auth.uid() AND users.role IN ('admin', 'mentor')
  )
);

DROP POLICY IF EXISTS "Admins can update word cards" ON public.word_cards;
CREATE POLICY "Admins can update word cards" 
ON public.word_cards FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.users 
    WHERE users.id = auth.uid() AND users.role IN ('admin', 'mentor')
  )
);
