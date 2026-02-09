import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Plus, Trash2, Calendar, MapPin } from 'lucide-react';
import { format } from 'date-fns';
import { id as localeId } from 'date-fns/locale';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from '@/components/ui/dialog';

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
  const [events, setEvents] = useState<TimelineEvent[]>([]);
  const [showAdd, setShowAdd] = useState(false);
  const [title, setTitle] = useState('');
  const [desc, setDesc] = useState('');
  const [date, setDate] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!profile?.couple_id) return;
    supabase
      .from('timeline_events')
      .select('*')
      .eq('couple_id', profile.couple_id)
      .order('date', { ascending: true })
      .then(({ data }) => { if (data) setEvents(data); });
  }, [profile?.couple_id]);

  const addEvent = async () => {
    if (!profile?.couple_id || !title || !date) return;
    setSaving(true);
    await supabase.from('timeline_events').insert({
      couple_id: profile.couple_id,
      title,
      description: desc || null,
      date,
    });
    setTitle(''); setDesc(''); setDate(''); setShowAdd(false);
    const { data } = await supabase.from('timeline_events').select('*').eq('couple_id', profile.couple_id).order('date', { ascending: true });
    if (data) setEvents(data);
    setSaving(false);
  };

  const deleteEvent = async (id: string) => {
    await supabase.from('timeline_events').delete().eq('id', id);
    setEvents(prev => prev.filter(e => e.id !== id));
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
            <motion.button whileTap={{ scale: 0.98 }} onClick={addEvent} disabled={saving || !title || !date} className="w-full py-3 rounded-xl bg-primary text-primary-foreground font-bold text-sm disabled:opacity-50 shadow-lg">
              {saving ? 'Menyimpan...' : 'Simpan Momen 💕'}
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
            {events.map((event, i) => (
              <motion.div
                key={event.id}
                initial={{ opacity: 0, x: -30 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.1, type: 'spring', bounce: 0.3 }}
                className="flex gap-4 relative group"
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
                <div className="glass-card p-4 flex-1 mb-4 relative">
                  <div className="absolute -left-2 top-3 w-3 h-3 rotate-45 bg-card/70 border-l border-b border-border/50" />
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <p className="text-[10px] text-primary font-bold uppercase tracking-wider mb-1">
                        {format(new Date(event.date), 'dd MMMM yyyy', { locale: localeId })}
                      </p>
                      <h3 className="font-bold text-foreground text-sm">{event.title}</h3>
                      {event.description && (
                        <p className="text-xs text-muted-foreground mt-1.5 leading-relaxed">{event.description}</p>
                      )}
                    </div>
                    <motion.button
                      whileTap={{ scale: 0.8 }}
                      onClick={() => deleteEvent(event.id)}
                      className="opacity-0 group-hover:opacity-100 p-1.5 rounded-lg hover:bg-destructive/10 text-destructive transition-all"
                    >
                      <Trash2 size={12} />
                    </motion.button>
                  </div>
                  {event.image_url && (
                    <img src={event.image_url} alt="" className="w-full h-32 object-cover rounded-xl mt-3" />
                  )}
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default TimelinePage;
