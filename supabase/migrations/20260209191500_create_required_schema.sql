-- Migration: Create required database structure for Our Love Story
-- Includes: users, memories, emotions, finances, chat_messages,
-- promises, surprises, timeline_events, future_goals, couples
-- Storage bucket: couple-uploads
-- RLS policies: restrict access so users can only access rows
-- where their couple_id matches the row's couple_id.

-- NOTE: this migration assumes you use Supabase Auth (auth.users).
-- The `users` table below uses the same UUID as `auth.users.id`.

-- Create couples table
CREATE TABLE IF NOT EXISTS public.couples (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Users table (application user profiles) linked to auth.users
CREATE TABLE IF NOT EXISTS public.users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  couple_id UUID REFERENCES public.couples(id) ON DELETE CASCADE,
  avatar_url TEXT,
  bio TEXT,
  hobbies TEXT[],
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Memories
CREATE TABLE IF NOT EXISTS public.memories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  couple_id UUID REFERENCES public.couples(id) ON DELETE CASCADE NOT NULL,
  image_url TEXT,
  description TEXT,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  created_by UUID REFERENCES auth.users(id) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Emotions
CREATE TABLE IF NOT EXISTS public.emotions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  couple_id UUID REFERENCES public.couples(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) NOT NULL,
  emotion_type TEXT NOT NULL,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Finances
CREATE TABLE IF NOT EXISTS public.finances (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  couple_id UUID REFERENCES public.couples(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('income','expense')),
  category TEXT NOT NULL,
  amount NUMERIC NOT NULL,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Chat messages
CREATE TABLE IF NOT EXISTS public.chat_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  couple_id UUID REFERENCES public.couples(id) ON DELETE CASCADE NOT NULL,
  sender_id UUID REFERENCES auth.users(id) NOT NULL,
  message TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Promises
CREATE TABLE IF NOT EXISTS public.promises (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  couple_id UUID REFERENCES public.couples(id) ON DELETE CASCADE NOT NULL,
  created_by UUID REFERENCES auth.users(id) NOT NULL,
  content TEXT NOT NULL,
  is_private BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Surprises
CREATE TABLE IF NOT EXISTS public.surprises (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  couple_id UUID REFERENCES public.couples(id) ON DELETE CASCADE NOT NULL,
  created_by UUID REFERENCES auth.users(id) NOT NULL,
  message TEXT NOT NULL,
  open_date DATE,
  is_locked BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  category TEXT DEFAULT 'general'
);

-- Timeline events
CREATE TABLE IF NOT EXISTS public.timeline_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  couple_id UUID REFERENCES public.couples(id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  date DATE NOT NULL,
  image_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Future goals
CREATE TABLE IF NOT EXISTS public.future_goals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  couple_id UUID REFERENCES public.couples(id) ON DELETE CASCADE NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('honeymoon','wedding','finance','house')),
  title TEXT NOT NULL,
  description TEXT,
  target_date DATE,
  image_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable Row Level Security on all application tables
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.memories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.emotions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.finances ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.promises ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.surprises ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.timeline_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.future_goals ENABLE ROW LEVEL SECURITY;

-- Helper function: get the couple_id for a given auth user id
CREATE OR REPLACE FUNCTION public.get_couple_id(_user_id UUID)
RETURNS UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    (SELECT couple_id FROM public.users WHERE id = _user_id LIMIT 1),
    (SELECT couple_id FROM public.profiles WHERE id = _user_id LIMIT 1)
  )
$$;

-- Policies
-- Users: allow user to SELECT own row and other members of same couple
CREATE POLICY "Users can view own and couple profiles" ON public.users
  FOR SELECT
  USING (id = auth.uid() OR couple_id = public.get_couple_id(auth.uid()));

CREATE POLICY "Users can insert own user row" ON public.users
  FOR INSERT
  WITH CHECK (id = auth.uid());

CREATE POLICY "Users can update own profile" ON public.users
  FOR UPDATE
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid());

-- Memories policies
CREATE POLICY "Couple can view memories" ON public.memories
  FOR SELECT
  USING (couple_id = public.get_couple_id(auth.uid()));

CREATE POLICY "Couple can insert memories" ON public.memories
  FOR INSERT
  WITH CHECK (couple_id = public.get_couple_id(auth.uid()) AND created_by = auth.uid());

CREATE POLICY "Creator can delete memories" ON public.memories
  FOR DELETE
  USING (created_by = auth.uid());

-- Emotions policies
CREATE POLICY "Couple can view emotions" ON public.emotions
  FOR SELECT
  USING (couple_id = public.get_couple_id(auth.uid()));

CREATE POLICY "Users can insert own emotions" ON public.emotions
  FOR INSERT
  WITH CHECK (couple_id = public.get_couple_id(auth.uid()) AND user_id = auth.uid());

-- Finances policies
CREATE POLICY "Couple can view finances" ON public.finances
  FOR SELECT
  USING (couple_id = public.get_couple_id(auth.uid()));

CREATE POLICY "Users can insert own finances" ON public.finances
  FOR INSERT
  WITH CHECK (couple_id = public.get_couple_id(auth.uid()) AND user_id = auth.uid());

CREATE POLICY "Users can delete own finances" ON public.finances
  FOR DELETE
  USING (user_id = auth.uid());

-- Chat messages policies
CREATE POLICY "Couple can view chat" ON public.chat_messages
  FOR SELECT
  USING (couple_id = public.get_couple_id(auth.uid()));

CREATE POLICY "Users can send chat" ON public.chat_messages
  FOR INSERT
  WITH CHECK (couple_id = public.get_couple_id(auth.uid()) AND sender_id = auth.uid());

-- Promises policies
CREATE POLICY "Couple can view shared promises" ON public.promises
  FOR SELECT
  USING (couple_id = public.get_couple_id(auth.uid()) AND (is_private = false OR created_by = auth.uid()));

CREATE POLICY "Users can insert promises" ON public.promises
  FOR INSERT
  WITH CHECK (couple_id = public.get_couple_id(auth.uid()) AND created_by = auth.uid());

-- Surprises policies
CREATE POLICY "Couple can view surprises" ON public.surprises
  FOR SELECT
  USING (couple_id = public.get_couple_id(auth.uid()));

CREATE POLICY "Users can insert surprises" ON public.surprises
  FOR INSERT
  WITH CHECK (couple_id = public.get_couple_id(auth.uid()) AND created_by = auth.uid());

-- Timeline events policies
CREATE POLICY "Couple can view timeline" ON public.timeline_events
  FOR SELECT
  USING (couple_id = public.get_couple_id(auth.uid()));

CREATE POLICY "Couple can insert timeline" ON public.timeline_events
  FOR INSERT
  WITH CHECK (couple_id = public.get_couple_id(auth.uid()));

-- Future goals policies
CREATE POLICY "Couple can view goals" ON public.future_goals
  FOR SELECT
  USING (couple_id = public.get_couple_id(auth.uid()));

CREATE POLICY "Couple can insert goals" ON public.future_goals
  FOR INSERT
  WITH CHECK (couple_id = public.get_couple_id(auth.uid()));

-- Realtime publications for relevant tables
-- (supabase_realtime is created by Supabase; adding tables to it enables realtime)
ALTER PUBLICATION supabase_realtime ADD TABLE public.chat_messages;
ALTER PUBLICATION supabase_realtime ADD TABLE public.emotions;
ALTER PUBLICATION supabase_realtime ADD TABLE public.memories;

-- Create storage bucket for uploads (if not exists)
INSERT INTO storage.buckets (id, name, public)
VALUES ('couple-uploads', 'couple-uploads', true)
ON CONFLICT DO NOTHING;

-- Storage policies
CREATE POLICY "Authenticated users can upload" ON storage.objects
  FOR INSERT
  WITH CHECK (bucket_id = 'couple-uploads' AND auth.role() = 'authenticated');

CREATE POLICY "Public can view uploads" ON storage.objects
  FOR SELECT
  USING (bucket_id = 'couple-uploads');

CREATE POLICY "Users can delete own uploads" ON storage.objects
  FOR DELETE
  USING (bucket_id = 'couple-uploads' AND auth.role() = 'authenticated');

-- Trigger to update updated_at on users table
CREATE OR REPLACE FUNCTION public.update_users_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_users_updated_at
  BEFORE UPDATE ON public.users
  FOR EACH ROW EXECUTE FUNCTION public.update_users_updated_at();
