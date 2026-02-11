import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Camera, Heart, MessageSquare, Image as ImageIcon } from 'lucide-react';
import { Dialog, DialogContent } from '@/components/ui/dialog';

/**
 * Photo-first Home (journal-style)
 * - Large hero memory photo
 * - Text-first emotional headers
 * - Minimal UI and subtle feature pills
 */
const Home = () => {
  const { profile } = useAuth();
  const [hero, setHero] = useState<{ image_url: string | null; caption?: string | null } | null>(null);
  const [openHero, setOpenHero] = useState(false);

  useEffect(() => {
    if (!profile?.couple_id) return;
    (async () => {
      try {
        const { data } = await supabase.from('memories').select('*').eq('couple_id', profile.couple_id).order('date', { ascending: false }).limit(1);
        if (data && data.length) setHero({ image_url: data[0].image_url, caption: data[0].description });
      } catch (e) { console.debug('hero fetch', e); }
    })();
  }, [profile?.couple_id]);

  return (
    <div className="min-h-screen bg-[rgba(255,248,246,1)] px-4 pt-6 pb-28">
      <header className="mb-3">
        <h1 className="font-script text-2xl text-foreground leading-tight">Welcome back, {profile?.name ?? 'Sayang'} 💕</h1>
        <p className="text-sm text-muted-foreground mt-1 max-w-xl">Take a quiet moment — here are your recent memories and a little note from us.</p>
      </header>

      <main className="space-y-6">
        {/* Hero memory (photo-first) */}
        <motion.div initial={{ opacity: 0, scale: 1.02 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.35 }} className="relative rounded-[20px] overflow-hidden" onClick={() => hero?.image_url && setOpenHero(true)}>
          {hero?.image_url ? (
            <div className="relative">
              <img src={hero.image_url} alt={hero.caption ?? 'Hero memory'} className="w-full h-[56vh] object-cover" />
              <div className="absolute left-0 right-0 bottom-0 h-32" style={{ background: 'linear-gradient(180deg, rgba(255,255,255,0) 0%, rgba(255,230,235,0.18) 100%)' }} />
              <div className="absolute left-5 bottom-6 text-foreground max-w-[70%]">
                <div className="text-xs text-muted-foreground uppercase tracking-wider">Our latest memory</div>
                <div className="font-script text-lg leading-snug">{hero.caption ?? 'The night we laughed together'}</div>
              </div>
            </div>
          ) : (
            <div className="w-full h-[56vh] bg-primary/8 rounded-[20px] flex items-center justify-center">
              <Camera size={44} className="text-primary" />
            </div>
          )}
        </motion.div>

        {/* Emotional note */}
        <section className="px-1">
          <blockquote className="italic text-base text-foreground/85 leading-relaxed">“Love is not perfect — it’s ours. Tonight, let’s remember the little laughs and quiet talks.”</blockquote>
        </section>

        {/* Subtle feature pills (secondary) */}
        <nav className="flex gap-3 overflow-x-auto py-2">
          <a href="/gallery" className="flex-shrink-0 px-3 py-2 rounded-full border border-[rgba(0,0,0,0.04)] text-sm flex items-center gap-2 bg-white/60">
            <ImageIcon size={16} /> <span className="opacity-80">Memories</span>
          </a>
          <a href="/emotions" className="flex-shrink-0 px-3 py-2 rounded-full border border-[rgba(0,0,0,0.04)] text-sm flex items-center gap-2 bg-white/60">
            <Heart size={16} /> <span className="opacity-80">Mood</span>
          </a>
          <a href="/chat" className="flex-shrink-0 px-3 py-2 rounded-full border border-[rgba(0,0,0,0.04)] text-sm flex items-center gap-2 bg-white/60">
            <MessageSquare size={16} /> <span className="opacity-80">Chat</span>
          </a>
        </nav>
      </main>

      {/* Bottom nav (minimal) */}
      <nav className="fixed left-4 right-4 bottom-4 rounded-2xl bg-white/60 backdrop-blur-sm p-2 flex justify-around text-xs text-muted-foreground">
        <a href="/">Home</a>
        <a href="/gallery">Gallery</a>
        <a href="/chat">Chat</a>
        <a href="/profile">You</a>
      </nav>

      {/* Hero viewer modal */}
      <Dialog open={openHero} onOpenChange={setOpenHero}>
        <DialogContent className="p-0 bg-transparent max-w-full rounded-none">
          {hero?.image_url && (
            <div className="w-full h-screen bg-black/90 flex items-center justify-center p-4">
              <img src={hero.image_url} alt="Full memory" className="max-h-[90vh] max-w-[90vw] object-contain rounded-lg" />
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Home;
