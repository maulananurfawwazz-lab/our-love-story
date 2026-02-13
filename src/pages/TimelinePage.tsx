import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Plus, Trash2, Calendar } from 'lucide-react';
import { format } from 'date-fns';
import { id as localeId } from 'date-fns/locale';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from '@/components/ui/dialog';
import { useRealtimeTable } from '@/hooks/useRealtimeTable';

interface TimelineEvent {
  id: string;
  title: string;
  description: string | null;
  date: string;
  image_url: string | null;
}

const ICONS = ['💑', '💕', '🥂', '✈️', '🎂', '💍', '🏠', '🎉', '📸', '🌹'];

const TimelinePage = () => {
  const { profile } = useAuth();
  const [showAdd, setShowAdd] = useState(false);
  const [title, setTitle] = useState('');
  const [desc, setDesc] = useState('');
  const [date, setDate] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [favorites, setFavorites] = useState<Record<string, boolean>>({});
  const [zoomSrc, setZoomSrc] = useState<string | null>(null);

  const { data: events, insert, remove, setData: setEvents } = useRealtimeTable<TimelineEvent>({
    table: 'timeline_events',
    coupleId: profile?.couple_id,
    orderBy: { column: 'date', ascending: true },
  });

  const addEvent = async () => {
    if (!profile?.couple_id || !title || !date) return;
    setSaving(true);
    let imageUrl: string | null = null;
    try {
      if (file) {
        setUploading(true);
        const ext = file.name.split('.').pop();
        const path = `timeline/${profile.couple_id}/${Date.now()}.${ext}`;
        const { error } = await supabase.storage.from('couple-uploads').upload(path, file, { upsert: false });
        if (!error) {
          const { data } = supabase.storage.from('couple-uploads').getPublicUrl(path);
          imageUrl = data.publicUrl + `?v=${Date.now()}`;
        } else {
          console.error('Timeline image upload error', error);
        }
      }
    } finally {
      setUploading(false);
    }

    await insert({
      title,
      description: desc || null,
      date,
      image_url: imageUrl,
    });
    setTitle(''); setDesc(''); setDate(''); setShowAdd(false);
    setFile(null); setPreview(null);
    setSaving(false);
  };

  const handleFileChange = (f: File | null) => {
    setFile(f);
    if (f) {
      const reader = new FileReader();
      reader.onload = (e) => setPreview(e.target?.result as string);
      reader.readAsDataURL(f);
    } else {
      setPreview(null);
    }
  };

  const deleteEvent = async (id: string) => {
    if (!profile?.couple_id) return;
    // Find image_url before deleting to clean up storage
    const event = events.find(e => e.id === id);
    const imageUrl = event?.image_url;

    const success = await remove(id);
    if (!success) {
      alert('Gagal menghapus momen');
      return;
    }

    // Best-effort storage cleanup
    try {
      if (imageUrl && imageUrl.includes('/couple-uploads/')) {
        const idx = imageUrl.indexOf('/couple-uploads/');
        const path = imageUrl.substring(idx + '/couple-uploads/'.length).split('?')[0];
        if (path) await supabase.storage.from('couple-uploads').remove([path]);
      }
    } catch (e) {
      console.debug('Failed to remove timeline image from storage', e);
    }
  };

  // long-press helper
  const useLongPress = (onLong: () => void, ms = 600) => {
    let t: number | null = null;
    return {
      onPointerDown: () => { t = window.setTimeout(() => { onLong(); t = null; }, ms); },
      onPointerUp: () => { if (t) { clearTimeout(t); t = null; } },
      onPointerLeave: () => { if (t) { clearTimeout(t); t = null; } },
    } as any;
  };

  return (
    <div className="px-5 py-6 max-w-lg mx-auto pb-24">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="font-script text-2xl text-gradient-love">Love Timeline</h1>
          <p className="text-[10px] text-muted-foreground mt-0.5">Perjalanan cinta kalian 💕</p>
        </div>
        <motion.button whileTap={{ scale: 0.9 }} onClick={() => setShowAdd(true)} className="p-2.5 rounded-2xl bg-primary text-primary-foreground shadow-lg">
          <Plus size={18} />
        </motion.button>
      </div>

      {/* Add Event Dialog */}
      <Dialog open={showAdd} onOpenChange={setShowAdd}>
        <DialogContent className="glass-card border-border/50 max-w-sm">
          <DialogHeader>
            <DialogTitle className="font-script text-xl text-gradient-love">Tambah Momen 💝</DialogTitle>
            <DialogDescription>Catat momen penting kalian</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <input type="text" placeholder="Judul momen (cth: First Date)" value={title} onChange={(e) => setTitle(e.target.value)} className="w-full px-4 py-3 rounded-xl bg-secondary/50 border border-border text-sm outline-none text-foreground placeholder:text-muted-foreground focus:ring-2 focus:ring-primary" />
            <textarea placeholder="Deskripsi (opsional)..." value={desc} onChange={(e) => setDesc(e.target.value)} className="w-full px-4 py-3 rounded-xl bg-secondary/50 border border-border text-sm outline-none text-foreground placeholder:text-muted-foreground resize-none h-20 focus:ring-2 focus:ring-primary" />
            <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="w-full px-4 py-3 rounded-xl bg-secondary/50 border border-border text-sm outline-none text-foreground focus:ring-2 focus:ring-primary" />

            <label className="flex flex-col items-center gap-2 p-4 rounded-2xl border-2 border-dashed border-primary/30 cursor-pointer hover:bg-primary/5 transition-colors">
              {preview ? (
                <img src={preview} className="w-full h-36 object-cover rounded-xl" />
              ) : (
                <>
                  <div className="p-3 rounded-full bg-primary/10">📸</div>
                  <span className="text-xs text-muted-foreground font-medium">Tap untuk pilih foto (opsional)</span>
                </>
              )}
              <input type="file" accept="image/*" className="hidden" onChange={(e) => handleFileChange(e.target.files?.[0] ?? null)} />
            </label>

            <motion.button whileTap={{ scale: 0.98 }} onClick={addEvent} disabled={saving || uploading || !title || !date} className="w-full py-3 rounded-xl bg-primary text-primary-foreground font-bold text-sm disabled:opacity-50 shadow-lg">
              {uploading ? 'Mengunggah foto...' : saving ? 'Menyimpan...' : 'Simpan Momen 💕'}
            </motion.button>
          </div>
        </DialogContent>
      </Dialog>

      {events.length === 0 ? (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center py-20">
          <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
            <Calendar size={32} className="text-primary" />
          </div>
          <p className="text-foreground font-semibold text-sm">Belum ada momen</p>
          <p className="text-muted-foreground text-xs mt-1">Tambahkan momen pertama kalian 💝</p>
        </motion.div>
      ) : (
        <div className="relative">
          {/* Vertical Line */}
          <div className="absolute left-5 top-0 bottom-0 w-0.5 bg-gradient-to-b from-primary via-primary/50 to-primary/10" />

          <div className="space-y-1">
            {events.map((event, i) => {
              const isHighlight = i === 0; // latest event highlighted
              const lp = useLongPress(() => {
                setFavorites(prev => ({ ...prev, [event.id]: !prev[event.id] }));
              }, 700);

              return (
                <motion.div
                  key={event.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.06, duration: 0.3, ease: 'easeOut' }}
                  className={`flex gap-4 relative group ${isHighlight ? 'mb-6' : 'mb-4'}`}
                >
                {/* Timeline Dot */}
                <div className="relative z-10 flex-shrink-0">
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ delay: i * 0.1 + 0.2, type: 'spring', bounce: 0.5 }}
                    className="w-10 h-10 rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center shadow-lg"
                  >
                    <span className="text-sm">{ICONS[i % ICONS.length]}</span>
                  </motion.div>
                </div>

                {/* Content */}
                <div
                  {...lp}
                  onClick={() => { if (event.image_url) setZoomSrc(event.image_url); }}
                  className={`glass-card p-4 flex-1 relative overflow-hidden ${isHighlight ? 'rounded-[24px] shadow-2xl' : 'rounded-3xl shadow-md hover:shadow-xl transition-shadow'}`}
                  style={{ cursor: event.image_url ? 'zoom-in' : 'default' }}
                >
                  <div className="absolute -left-2 top-3 w-3 h-3 rotate-45 bg-card/70 border-l border-b border-border/50" />
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <p className="text-[10px] text-primary uppercase tracking-wider mb-1 opacity-70">
                        {format(new Date(event.date), 'dd MMMM yyyy', { locale: localeId })}
                      </p>
                      <h3 className="font-extrabold text-foreground text-sm">{event.title}</h3>
                      {event.description && (
                        <p className="text-xs text-muted-foreground mt-1.5 leading-relaxed line-clamp-2">{event.description}</p>
                      )}
                    </div>
                    <motion.button
                      whileTap={{ scale: 0.98 }}
                      onClick={() => deleteEvent(event.id)}
                      title="Hapus kenangan"
                      className="opacity-50 group-hover:opacity-100 p-1.5 rounded-lg transition-all transform hover:scale-105 text-pink-400 hover:text-pink-600"
                    >
                      <Trash2 size={12} />
                    </motion.button>
                  </div>
                  {event.image_url && (
                    <div className={`w-full ${isHighlight ? 'aspect-[4/3]' : 'aspect-square'} mt-3 overflow-hidden p-4 relative`}>
                      <img src={event.image_url} alt="" className={`w-full h-full object-cover object-center block ${isHighlight ? 'rounded-xl' : 'rounded-2xl'}`} />

                      {/* floating date badge (top-left) */}
                      <div className="absolute left-4 top-4 bg-white/90 text-xs text-foreground px-2 py-1 rounded-full shadow-sm">{format(new Date(event.date), 'dd MMM yyyy')}</div>

                      {/* subtle dark gradient at bottom to anchor text if needed */}
                      <div className="absolute left-0 right-0 bottom-0 h-20 pointer-events-none" style={{ background: 'linear-gradient(180deg, rgba(0,0,0,0) 0%, rgba(0,0,0,0.35) 100%)' }} />

                      {/* subtle grain */}
                      <div className="absolute inset-0 pointer-events-none" style={{ backgroundImage: 'radial-gradient(rgba(255,255,255,0.02) 1px, rgba(0,0,0,0.02) 1px)', backgroundSize: '4px 4px', mixBlendMode: 'overlay', opacity: 0.06 }} />

                      {/* favorite heart overlay */}
                      {favorites[event.id] && (
                        <div className="absolute right-4 top-4 bg-white/80 rounded-full p-1 shadow-md">
                          <span className="text-pink-500">💖</span>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </motion.div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

export default TimelinePage;
