-- Fix: receiver_id FK references auth.users(id) but we store profiles.id
-- Drop the FK constraint since RLS already enforces data security.
ALTER TABLE public.promises DROP CONSTRAINT IF EXISTS promises_receiver_id_fkey;
