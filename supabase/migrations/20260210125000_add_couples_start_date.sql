-- Add start_date column to couples (used by frontend)
ALTER TABLE public.couples
  ADD COLUMN IF NOT EXISTS start_date DATE;
