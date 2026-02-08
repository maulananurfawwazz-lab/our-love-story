import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Plus, Music } from 'lucide-react';

interface Playlist {
  id: string;
  title: string;
  spotify_url: string;
  category: string;
}

const CATS = [
  { value: 'our-song', label: 'Our Song 💕' },
  { value: 'mood', label: 'Mood 🎵' },
  { value: 'romantic', label: 'Romantic 🌹' },
];

const PlaylistPage = () => {
  const { user, profile } = useAuth();
  const [items, setItems] = useState<Playlist[]>([]);
  const [showAdd, setShowAdd] = useState(false);
  const [title, setTitle] = useState('');
  const [url, setUrl] = useState('');
  const [cat, setCat] = useState('our-song');

  useEffect(() => {
    if (!profile?.couple_id) return;
    supabase.from('playlists').select('*').eq('couple_id', profile.couple_id).order('created_at', { ascending: false })
      .then(({ data }) => { if (data) setItems(data); });
  }, [profile?.couple_id]);

  const add = async () => {
    if (!title.trim() || !url.trim() || !profile?.couple_id || !user) return;
    await supabase.from('playlists').insert({ couple_id: profile.couple_id, created_by: user.id, title: title.trim(), spotify_url: url.trim(), category: cat });
    setTitle(''); setUrl(''); setShowAdd(false);
    const { data } = await supabase.from('playlists').select('*').eq('couple_id', profile.couple_id).order('created_at', { ascending: false });
    if (data) setItems(data);
  };

  return (
    <div className="px-5 py-6 max-w-lg mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="font-script text-2xl text-gradient-love">Playlist 🎵</h1>
        <motion.button whileTap={{ scale: 0.9 }} onClick={() => setShowAdd(!showAdd)} className="p-2.5 rounded-xl bg-primary text-primary-foreground">
          <Plus size={18} />
        </motion.button>
      </div>

      {showAdd && (
        <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} className="glass-card p-4 space-y-3">
          <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Judul lagu..." className="w-full px-3 py-2 rounded-xl bg-background/50 border border-border text-sm outline-none text-foreground placeholder:text-muted-foreground" />
          <input value={url} onChange={(e) => setUrl(e.target.value)} placeholder="Link Spotify..." className="w-full px-3 py-2 rounded-xl bg-background/50 border border-border text-sm outline-none text-foreground placeholder:text-muted-foreground" />
          <div className="flex gap-2">
            {CATS.map(c => (
              <button key={c.value} onClick={() => setCat(c.value)} className={`px-3 py-1.5 rounded-full text-xs font-medium ${cat === c.value ? 'bg-primary text-primary-foreground' : 'bg-secondary text-secondary-foreground'}`}>{c.label}</button>
            ))}
          </div>
          <motion.button whileTap={{ scale: 0.98 }} onClick={add} className="w-full py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-semibold">Tambah 🎵</motion.button>
        </motion.div>
      )}

      {CATS.map(c => {
        const filtered = items.filter(i => i.category === c.value);
        if (filtered.length === 0) return null;
        return (
          <div key={c.value}>
            <p className="text-sm font-semibold text-foreground mb-2">{c.label}</p>
            <div className="space-y-2">
              {filtered.map((item) => (
                <a key={item.id} href={item.spotify_url} target="_blank" rel="noopener noreferrer" className="glass-card p-3 flex items-center gap-3 block">
                  <div className="p-2 rounded-lg bg-primary/10">
                    <Music size={16} className="text-primary" />
                  </div>
                  <span className="text-sm font-medium text-foreground">{item.title}</span>
                </a>
              ))}
            </div>
          </div>
        );
      })}

      {items.length === 0 && !showAdd && (
        <div className="text-center py-16">
          <p className="text-4xl mb-3">🎵</p>
          <p className="text-muted-foreground text-sm">Belum ada lagu. Tambah yang pertama!</p>
        </div>
      )}
    </div>
  );
};

export default PlaylistPage;
