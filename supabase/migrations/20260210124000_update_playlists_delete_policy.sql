-- Allow couple members (and creators) to delete playlists
-- Replace restrictive creator-only delete policy with couple-scoped deletion
DROP POLICY IF EXISTS "Users can delete playlists" ON public.playlists;
CREATE POLICY "Couple can delete playlists" ON public.playlists
  FOR DELETE USING (couple_id = public.get_couple_id(auth.uid()) OR created_by = auth.uid());
