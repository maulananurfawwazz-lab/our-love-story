-- Fix: UPDATE policy checks receiver_id = auth.uid() but receiver_id
-- stores profiles.id (not auth user id). Simplify to couple_id check
-- since only 2 people share a couple_id and UI controls actions.

DROP POLICY IF EXISTS "Users can update promises" ON public.promises;

CREATE POLICY "Couple can update promises" ON public.promises
  FOR UPDATE
  USING (couple_id = public.get_couple_id(auth.uid()))
  WITH CHECK (couple_id = public.get_couple_id(auth.uid()));
