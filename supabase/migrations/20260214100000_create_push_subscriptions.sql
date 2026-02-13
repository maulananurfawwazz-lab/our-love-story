-- ═══════════════════════════════════════════════════════════
-- Push Subscriptions table
-- Stores Web Push subscriptions per user per device
-- ═══════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS public.push_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  couple_id UUID NOT NULL REFERENCES public.couples(id) ON DELETE CASCADE,
  endpoint TEXT NOT NULL,
  keys_p256dh TEXT NOT NULL,
  keys_auth TEXT NOT NULL,
  user_agent TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  
  -- Unique per endpoint to avoid duplicate subscriptions
  UNIQUE(endpoint)
);

-- Index for fast lookups: "find all partner's subscriptions"
CREATE INDEX IF NOT EXISTS idx_push_subs_couple_user 
  ON public.push_subscriptions(couple_id, user_id);

-- RLS policies
ALTER TABLE public.push_subscriptions ENABLE ROW LEVEL SECURITY;

-- Users can insert their own subscriptions
CREATE POLICY "Users can insert own push subscriptions"
  ON public.push_subscriptions FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Users can view subscriptions in their couple
CREATE POLICY "Users can view couple push subscriptions"
  ON public.push_subscriptions FOR SELECT
  USING (
    couple_id IN (
      SELECT p.couple_id FROM public.profiles p WHERE p.user_id = auth.uid()
    )
  );

-- Users can update their own subscriptions
CREATE POLICY "Users can update own push subscriptions"
  ON public.push_subscriptions FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Users can delete their own subscriptions
CREATE POLICY "Users can delete own push subscriptions"
  ON public.push_subscriptions FOR DELETE
  USING (auth.uid() = user_id);
