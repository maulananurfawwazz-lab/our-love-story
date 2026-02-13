import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Plus, Music, Trash } from 'lucide-react';
import { notifyPartner, NotificationTemplates } from '@/lib/notifications';

interface Playlist {
  id: string;
  title: string;
  spotify_url: string;
  category: string;
  image_url?: string | null;
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

  // Realtime: listen for playlist INSERT/UPDATE so UI updates automatically
  useEffect(() => {
    if (!profile?.couple_id) return;
    const channel = supabase
      .channel('playlists-realtime')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'playlists', filter: `couple_id=eq.${profile.couple_id}` }, (payload) => {
        setItems(prev => {
          const exists = prev.find(p => p.id === (payload.new as any).id);
          if (exists) return prev;
          return [(payload.new as Playlist), ...prev];
        });
      })
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'playlists', filter: `couple_id=eq.${profile.couple_id}` }, (payload) => {
        const updated = payload.new as Playlist;
        setItems(prev => prev.map(p => p.id === updated.id ? { ...p, ...updated } : p));
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [profile?.couple_id]);

  const add = async () => {
    if (!title.trim() || !url.trim() || !profile?.couple_id || !user) return;
    // We'll call the edge function after inserting the playlist so the server
    // can run with the service-role key and update the row; this keeps the
    // client free of service keys and allows fire-and-forget behaviour.
    let imageUrl: string | null = null;

    // optimistic UI: show temporary item immediately
    const tempId = `temp-${Date.now()}`;
    const tempItem = { id: tempId, title: title.trim(), spotify_url: url.trim(), category: cat, image_url: imageUrl } as Playlist;
    setItems(prev => [tempItem, ...prev]);

    try {
      const { data: inserted, error: insertErr } = await supabase.from('playlists').insert({ couple_id: profile.couple_id, created_by: user.id, title: title.trim(), spotify_url: url.trim(), category: cat, image_url: imageUrl }).select('id').maybeSingle();
      if (insertErr) throw insertErr;

      // Fire-and-forget: trigger server-side cover generation
      (async () => {
        try {
          const fnUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/fetch-playlist-cover`;
          const { data: { session } } = await supabase.auth.getSession();
          const headers: Record<string, string> = {
            'Content-Type': 'application/json',
            'apikey': String(import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY),
          };
          if (session?.access_token) headers['Authorization'] = `Bearer ${session.access_token}`;
          await fetch(fnUrl, { method: 'POST', headers, body: JSON.stringify({ url: url.trim(), couple_id: profile.couple_id, playlist_id: inserted?.id }) });
        } catch (e) {
          console.debug('fetch-playlist-cover (post-insert) error', e);
        }
      })();

    } catch (e) {
      console.error('insert playlist failed', e);
    }

    // Fire-and-forget push notification to partner
    notifyPartner(NotificationTemplates.playlist(profile?.name || 'Pasanganmu', title.trim()));

    setTitle(''); setUrl(''); setShowAdd(false);
    const { data } = await supabase.from('playlists').select('*').eq('couple_id', profile.couple_id).order('created_at', { ascending: false });
    if (data) setItems(data);

    // Start polling the inserted row for image_url so the UI updates automatically
    (async () => {
      try {
        const pid = inserted?.id;
        if (!pid) return;
        const maxAttempts = 12; // ~12 seconds
        for (let i = 0; i < maxAttempts; i++) {
          const { data: row } = await supabase.from('playlists').select('id,image_url').eq('id', pid).maybeSingle();
          const image = (row as any)?.image_url;
          if (image) {
            setItems(prev => prev.map(p => p.id === pid ? { ...p, image_url: image } : p));
            break;
          }
          await new Promise(r => setTimeout(r, 1000));
        }
      } catch (e) { console.debug('poll image_url error', e); }
    })();
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
                <div key={item.id} className="relative">
                <a href={item.spotify_url} target="_blank" rel="noopener noreferrer" className="glass-card p-3 flex items-center gap-3 block">
                  <div className="w-12 h-12 rounded-lg overflow-hidden bg-primary/10 flex-shrink-0">
                    {item.image_url ? (
                      <img src={item.image_url} alt={item.title} className="w-full h-full object-cover" />
                    ) : (
                      <div className="p-2 rounded-lg bg-primary/10 flex items-center justify-center h-full">
                        <Music size={16} className="text-primary" />
                      </div>
                    )}
                  </div>
                  <span className="text-sm font-medium text-foreground">{item.title}</span>
                </a>
                <button onClick={async () => {
                  if (!confirm('Hapus lagu ini?')) return;
                  try {
                    // fetch row to get image_url
                    const { data: row } = await supabase.from('playlists').select('image_url').eq('id', item.id).maybeSingle();
                    const { error: delErr } = await supabase.from('playlists').delete().eq('id', item.id).eq('couple_id', profile.couple_id);
                    if (delErr) { alert('Gagal menghapus lagu: ' + delErr.message); return; }
                    // remove storage object if owned by bucket path
                    try {
                      const imageUrl = (row as any)?.image_url;
                      if (imageUrl && imageUrl.includes('/couple-uploads/')) {
                        const idx = imageUrl.indexOf('/couple-uploads/');
                        const path = imageUrl.substring(idx + '/couple-uploads/'.length).split('?')[0];
                        if (path) await supabase.storage.from('couple-uploads').remove([path]);
                      }
                    } catch (e) { console.debug('failed to remove playlist image', e); }
                    // refresh list
                    const { data } = await supabase.from('playlists').select('*').eq('couple_id', profile.couple_id).order('created_at', { ascending: false });
                    if (data) setItems(data);
                  } catch (e) { console.error('delete playlist error', e); alert('Terjadi kesalahan saat menghapus'); }
                }} className="absolute right-3 top-3 text-destructive p-1 rounded hover:bg-destructive/10" aria-label="Hapus lagu">
                  <Trash size={16} />
                </button>
                </div>
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
