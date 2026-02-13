-- Migration: Upgrade surprises table for emotional surprise experience
-- Adds: title, mood, is_opened, opened_at, reaction, content (rename message)

-- Add new columns
ALTER TABLE public.surprises
  ADD COLUMN IF NOT EXISTS title TEXT,
  ADD COLUMN IF NOT EXISTS mood TEXT DEFAULT '💌',
  ADD COLUMN IF NOT EXISTS is_opened BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS opened_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS reaction TEXT;

-- Migrate existing data: set title from category
UPDATE public.surprises
SET title = CASE
    WHEN category = 'sad' THEN 'Buka saat sedih 😢'
    WHEN category = 'miss' THEN 'Buka saat kangen 🥺'
    WHEN category = 'anniversary' THEN 'Anniversary 🎉'
    ELSE 'Kejutan Spesial 💌'
  END
WHERE title IS NULL;

-- Add UPDATE policy so partner can open (mark as opened) & react
CREATE POLICY "Couple can update surprises" ON public.surprises
  FOR UPDATE
  USING (couple_id = public.get_couple_id(auth.uid()))
  WITH CHECK (couple_id = public.get_couple_id(auth.uid()));

-- Add DELETE policy for creator
CREATE POLICY "Creator can delete surprises" ON public.surprises
  FOR DELETE
  USING (created_by = auth.uid());

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.surprises;
