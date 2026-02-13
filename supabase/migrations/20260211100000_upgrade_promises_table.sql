-- Migration: Upgrade promises table for request-approval workflow
-- Adds: title, description, status (draft/pending/approved/rejected),
--        receiver_id, approved_at, rejected_at, rejection_reason, emoji

-- Add new columns
ALTER TABLE public.promises
  ADD COLUMN IF NOT EXISTS title TEXT,
  ADD COLUMN IF NOT EXISTS description TEXT,
  ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft', 'pending', 'approved', 'rejected')),
  ADD COLUMN IF NOT EXISTS receiver_id UUID REFERENCES auth.users(id),
  ADD COLUMN IF NOT EXISTS approved_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS rejected_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS rejection_reason TEXT,
  ADD COLUMN IF NOT EXISTS emoji TEXT DEFAULT '🤞';

-- Migrate existing data: move content → description, set approved status for existing rows
UPDATE public.promises
SET description = content,
    title = LEFT(content, 60),
    status = 'approved'
WHERE status = 'draft';

-- Drop old policies that are too restrictive for the new workflow
DROP POLICY IF EXISTS "Couple can view shared promises" ON public.promises;
DROP POLICY IF EXISTS "Users can insert promises" ON public.promises;

-- New SELECT policy: couple members can see all non-draft promises + own drafts
CREATE POLICY "Couple can view promises" ON public.promises
  FOR SELECT
  USING (
    couple_id = public.get_couple_id(auth.uid())
    AND (
      status != 'draft'
      OR created_by = auth.uid()
    )
  );

-- New INSERT policy
CREATE POLICY "Users can insert promises" ON public.promises
  FOR INSERT
  WITH CHECK (
    couple_id = public.get_couple_id(auth.uid())
    AND created_by = auth.uid()
  );

-- New UPDATE policy: creator can edit drafts, receiver can approve/reject pending
CREATE POLICY "Users can update promises" ON public.promises
  FOR UPDATE
  USING (
    couple_id = public.get_couple_id(auth.uid())
    AND (
      created_by = auth.uid()
      OR receiver_id = auth.uid()
    )
  )
  WITH CHECK (
    couple_id = public.get_couple_id(auth.uid())
  );

-- DELETE policy: only creator can delete drafts
CREATE POLICY "Creator can delete draft promises" ON public.promises
  FOR DELETE
  USING (
    created_by = auth.uid()
    AND status = 'draft'
  );

-- Enable realtime for promises
ALTER PUBLICATION supabase_realtime ADD TABLE public.promises;
