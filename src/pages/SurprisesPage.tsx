import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Plus, Mail, Lock, Unlock } from 'lucide-react';
import { format, isBefore } from 'date-fns';
import { notifyPartner, NotificationTemplates } from '@/lib/notifications';

interface Surprise {
  id: string;
  message: string;
  open_date: string | null;
  is_locked: boolean;
  created_by: string;
  category: string | null;
}

const CATEGORIES = [
  { value: 'sad', label: 'Buka saat sedih 😢' },
  { value: 'miss', label: 'Buka saat kangen 🥺' },
  { value: 'anniversary', label: 'Anniversary 🎉' },
  { value: 'general', label: 'Umum 💌' },
];

const SurprisesPage = () => {
  const { user, profile } = useAuth();
  const [surprises, setSurprises] = useState<Surprise[]>([]);
  const [showAdd, setShowAdd] = useState(false);
  const [message, setMessage] = useState('');
  const [category, setCategory] = useState('general');
  const [openDate, setOpenDate] = useState('');
  const [openedId, setOpenedId] = useState<string | null>(null);

  useEffect(() => {
    if (!profile?.couple_id) return;
    supabase
      .from('surprises')
      .select('*')
      .eq('couple_id', profile.couple_id)
      .order('created_at', { ascending: false })
      .then(({ data }) => { if (data) setSurprises(data); });
  }, [profile?.couple_id]);

  const addSurprise = async () => {
    if (!message.trim() || !profile?.couple_id || !user) return;
    await supabase.from('surprises').insert({
      couple_id: profile.couple_id,
      created_by: user.id,
      message: message.trim(),
      category,
      open_date: openDate || null,
      is_locked: true,
    });
    setMessage('');
    setShowAdd(false);
    setOpenDate('');

    // Fire-and-forget push notification to partner
    notifyPartner(NotificationTemplates.surprise(profile?.name || 'Pasanganmu'));
    
    const { data } = await supabase
      .from('surprises')
      .select('*')
      .eq('couple_id', profile.couple_id)
      .order('created_at', { ascending: false });
    if (data) setSurprises(data);
  };

  const canOpen = (s: Surprise) => {
    if (s.created_by === user?.id) return false; // Can't open your own
    if (!s.open_date) return true;
    return isBefore(new Date(s.open_date), new Date());
  };

  return (
    <div className="px-5 py-6 max-w-lg mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="font-script text-2xl text-gradient-love">Kejutan 🎁</h1>
        <motion.button whileTap={{ scale: 0.9 }} onClick={() => setShowAdd(!showAdd)} className="p-2.5 rounded-xl bg-primary text-primary-foreground">
          <Plus size={18} />
        </motion.button>
      </div>

      {showAdd && (
        <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} className="glass-card p-4 space-y-3">
          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Tulis pesan kejutan..."
            className="w-full px-3 py-2 rounded-xl bg-background/50 border border-border text-sm outline-none resize-none h-20 text-foreground placeholder:text-muted-foreground"
          />
          <div className="flex flex-wrap gap-2">
            {CATEGORIES.map(c => (
              <button
                key={c.value}
                onClick={() => setCategory(c.value)}
                className={`px-3 py-1.5 rounded-full text-xs font-medium ${category === c.value ? 'bg-primary text-primary-foreground' : 'bg-secondary text-secondary-foreground'}`}
              >
                {c.label}
              </button>
            ))}
          </div>
          <input
            type="date"
            value={openDate}
            onChange={(e) => setOpenDate(e.target.value)}
            className="w-full px-3 py-2 rounded-xl bg-background/50 border border-border text-sm outline-none text-foreground"
            placeholder="Tanggal buka (opsional)"
          />
          <motion.button whileTap={{ scale: 0.98 }} onClick={addSurprise} className="w-full py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-semibold">
            Kirim Kejutan 🎁
          </motion.button>
        </motion.div>
      )}

      <div className="space-y-3">
        {surprises.map((s, i) => (
          <motion.div
            key={s.id}
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05 }}
            className="glass-card p-4"
          >
            {openedId === s.id ? (
              <motion.div initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }}>
                <p className="text-sm text-foreground">{s.message}</p>
                <p className="text-xs text-muted-foreground mt-2">
                  {CATEGORIES.find(c => c.value === s.category)?.label}
                </p>
              </motion.div>
            ) : (
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <motion.div
                    animate={{ rotate: [0, -5, 5, 0] }}
                    transition={{ duration: 2, repeat: Infinity }}
                    className="text-2xl"
                  >
                    ✉️
                  </motion.div>
                  <div>
                    <p className="text-sm font-medium text-foreground">
                      {CATEGORIES.find(c => c.value === s.category)?.label ?? 'Kejutan'}
                    </p>
                    {s.open_date && (
                      <p className="text-xs text-muted-foreground">Buka: {s.open_date}</p>
                    )}
                  </div>
                </div>
                {canOpen(s) ? (
                  <motion.button
                    whileTap={{ scale: 0.9 }}
                    onClick={() => setOpenedId(s.id)}
                    className="p-2 rounded-xl bg-primary/10 text-primary"
                  >
                    <Unlock size={16} />
                  </motion.button>
                ) : (
                  <Lock size={16} className="text-muted-foreground" />
                )}
              </div>
            )}
          </motion.div>
        ))}
      </div>

      {surprises.length === 0 && !showAdd && (
        <div className="text-center py-16">
          <p className="text-4xl mb-3">🎁</p>
          <p className="text-muted-foreground text-sm">Belum ada kejutan</p>
        </div>
      )}
    </div>
  );
};

export default SurprisesPage;
