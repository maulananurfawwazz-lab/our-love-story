-- Add image_url column to playlists to store cover art from Spotify
ALTER TABLE public.playlists
  ADD COLUMN IF NOT EXISTS image_url TEXT;

-- Optional: allow couple members to insert/update image_url via existing policies
-- If you enforce WITH CHECK on insert/update, ensure it includes image_url or remove checks accordingly.
