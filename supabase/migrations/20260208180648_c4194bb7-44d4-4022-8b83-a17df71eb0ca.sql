
-- Couples table
CREATE TABLE public.couples (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Profiles table
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  couple_id UUID REFERENCES public.couples(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  avatar_url TEXT,
  bio TEXT,
  hobbies TEXT[],
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Memories table
CREATE TABLE public.memories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  couple_id UUID REFERENCES public.couples(id) ON DELETE CASCADE NOT NULL,
  image_url TEXT,
  description TEXT,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  created_by UUID REFERENCES auth.users(id) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Emotions table
CREATE TABLE public.emotions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  couple_id UUID REFERENCES public.couples(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) NOT NULL,
  emotion_type TEXT NOT NULL,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Finances table
CREATE TABLE public.finances (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  couple_id UUID REFERENCES public.couples(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('income', 'expense')),
  category TEXT NOT NULL,
  amount NUMERIC NOT NULL,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Chat messages table
CREATE TABLE public.chat_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  couple_id UUID REFERENCES public.couples(id) ON DELETE CASCADE NOT NULL,
  sender_id UUID REFERENCES auth.users(id) NOT NULL,
  message TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Promises table
CREATE TABLE public.promises (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  couple_id UUID REFERENCES public.couples(id) ON DELETE CASCADE NOT NULL,
  created_by UUID REFERENCES auth.users(id) NOT NULL,
  content TEXT NOT NULL,
  is_private BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Surprises table
CREATE TABLE public.surprises (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  couple_id UUID REFERENCES public.couples(id) ON DELETE CASCADE NOT NULL,
  created_by UUID REFERENCES auth.users(id) NOT NULL,
  message TEXT NOT NULL,
  open_date DATE,
  is_locked BOOLEAN NOT NULL DEFAULT true,
  category TEXT DEFAULT 'general',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Timeline events table
CREATE TABLE public.timeline_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  couple_id UUID REFERENCES public.couples(id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  date DATE NOT NULL,
  image_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Future goals table
CREATE TABLE public.future_goals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  couple_id UUID REFERENCES public.couples(id) ON DELETE CASCADE NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('honeymoon', 'wedding', 'finance', 'house')),
  title TEXT NOT NULL,
  description TEXT,
  target_date DATE,
  image_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Couple playlist table
CREATE TABLE public.playlists (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  couple_id UUID REFERENCES public.couples(id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL,
  spotify_url TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'our-song',
  created_by UUID REFERENCES auth.users(id) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS on all tables
ALTER TABLE public.couples ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.memories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.emotions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.finances ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.promises ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.surprises ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.timeline_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.future_goals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.playlists ENABLE ROW LEVEL SECURITY;

-- Helper function to get user's couple_id
CREATE OR REPLACE FUNCTION public.get_couple_id(_user_id UUID)
RETURNS UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT couple_id FROM public.profiles WHERE user_id = _user_id LIMIT 1
$$;

-- Couples policies
CREATE POLICY "Users can view their couple" ON public.couples
  FOR SELECT USING (id = public.get_couple_id(auth.uid()));

-- Profiles policies
CREATE POLICY "Users can view couple profiles" ON public.profiles
  FOR SELECT USING (couple_id = public.get_couple_id(auth.uid()));
CREATE POLICY "Users can update own profile" ON public.profiles
  FOR UPDATE USING (user_id = auth.uid());
CREATE POLICY "Users can insert own profile" ON public.profiles
  FOR INSERT WITH CHECK (user_id = auth.uid());

-- Memories policies
CREATE POLICY "Couple can view memories" ON public.memories
  FOR SELECT USING (couple_id = public.get_couple_id(auth.uid()));
CREATE POLICY "Couple can insert memories" ON public.memories
  FOR INSERT WITH CHECK (couple_id = public.get_couple_id(auth.uid()) AND created_by = auth.uid());
CREATE POLICY "Creator can delete memories" ON public.memories
  FOR DELETE USING (created_by = auth.uid());

-- Emotions policies
CREATE POLICY "Couple can view emotions" ON public.emotions
  FOR SELECT USING (couple_id = public.get_couple_id(auth.uid()));
CREATE POLICY "Users can insert own emotions" ON public.emotions
  FOR INSERT WITH CHECK (couple_id = public.get_couple_id(auth.uid()) AND user_id = auth.uid());

-- Finances policies
CREATE POLICY "Couple can view finances" ON public.finances
  FOR SELECT USING (couple_id = public.get_couple_id(auth.uid()));
CREATE POLICY "Users can insert own finances" ON public.finances
  FOR INSERT WITH CHECK (couple_id = public.get_couple_id(auth.uid()) AND user_id = auth.uid());
CREATE POLICY "Users can delete own finances" ON public.finances
  FOR DELETE USING (user_id = auth.uid());

-- Chat messages policies
CREATE POLICY "Couple can view chat" ON public.chat_messages
  FOR SELECT USING (couple_id = public.get_couple_id(auth.uid()));
CREATE POLICY "Users can send chat" ON public.chat_messages
  FOR INSERT WITH CHECK (couple_id = public.get_couple_id(auth.uid()) AND sender_id = auth.uid());

-- Promises policies
CREATE POLICY "Couple can view shared promises" ON public.promises
  FOR SELECT USING (couple_id = public.get_couple_id(auth.uid()) AND (is_private = false OR created_by = auth.uid()));
CREATE POLICY "Users can insert promises" ON public.promises
  FOR INSERT WITH CHECK (couple_id = public.get_couple_id(auth.uid()) AND created_by = auth.uid());

-- Surprises policies
CREATE POLICY "Couple can view surprises" ON public.surprises
  FOR SELECT USING (couple_id = public.get_couple_id(auth.uid()));
CREATE POLICY "Users can insert surprises" ON public.surprises
  FOR INSERT WITH CHECK (couple_id = public.get_couple_id(auth.uid()) AND created_by = auth.uid());

-- Timeline events policies
CREATE POLICY "Couple can view timeline" ON public.timeline_events
  FOR SELECT USING (couple_id = public.get_couple_id(auth.uid()));
CREATE POLICY "Couple can insert timeline" ON public.timeline_events
  FOR INSERT WITH CHECK (couple_id = public.get_couple_id(auth.uid()));

-- Future goals policies
CREATE POLICY "Couple can view goals" ON public.future_goals
  FOR SELECT USING (couple_id = public.get_couple_id(auth.uid()));
CREATE POLICY "Couple can insert goals" ON public.future_goals
  FOR INSERT WITH CHECK (couple_id = public.get_couple_id(auth.uid()));
CREATE POLICY "Couple can update goals" ON public.future_goals
  FOR UPDATE USING (couple_id = public.get_couple_id(auth.uid()));

-- Playlists policies
CREATE POLICY "Couple can view playlists" ON public.playlists
  FOR SELECT USING (couple_id = public.get_couple_id(auth.uid()));
CREATE POLICY "Users can insert playlists" ON public.playlists
  FOR INSERT WITH CHECK (couple_id = public.get_couple_id(auth.uid()) AND created_by = auth.uid());

-- Enable realtime for chat and emotions
ALTER PUBLICATION supabase_realtime ADD TABLE public.chat_messages;
ALTER PUBLICATION supabase_realtime ADD TABLE public.emotions;
ALTER PUBLICATION supabase_realtime ADD TABLE public.memories;

-- Create storage bucket for uploads
INSERT INTO storage.buckets (id, name, public) VALUES ('couple-uploads', 'couple-uploads', true);

CREATE POLICY "Authenticated users can upload" ON storage.objects
  FOR INSERT WITH CHECK (bucket_id = 'couple-uploads' AND auth.role() = 'authenticated');
CREATE POLICY "Public can view uploads" ON storage.objects
  FOR SELECT USING (bucket_id = 'couple-uploads');
CREATE POLICY "Users can delete own uploads" ON storage.objects
  FOR DELETE USING (bucket_id = 'couple-uploads' AND auth.role() = 'authenticated');

-- Updated at trigger
CREATE OR REPLACE FUNCTION public.update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- Insert the couple
INSERT INTO public.couples (id) VALUES ('00000000-0000-0000-0000-000000000001');
