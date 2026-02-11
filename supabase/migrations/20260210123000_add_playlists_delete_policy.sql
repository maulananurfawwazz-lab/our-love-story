-- Allow playlist creators to delete their own playlists
CREATE POLICY "Users can delete playlists" ON public.playlists
  FOR DELETE USING (created_by = auth.uid());
