import { useState } from 'react';
import { motion } from 'framer-motion';
import { useAuth } from '@/contexts/AuthContext';
import { Plus } from 'lucide-react';
import { useRealtimeTable } from '@/hooks/useRealtimeTable';

interface Goal {
  id: string;
  type: string;
  title: string;
  description: string | null;
  target_date: string | null;
  image_url: string | null;
}

const TYPES = [
  { value: 'honeymoon', label: 'Honeymoon', emoji: '✈️' },
  { value: 'wedding', label: 'Wedding', emoji: '💒' },
  { value: 'finance', label: 'Financial', emoji: '💎' },
  { value: 'house', label: 'Dream House', emoji: '🏡' },
];

const GoalsPage = () => {
  const { profile } = useAuth();
  const [showAdd, setShowAdd] = useState(false);
  const [title, setTitle] = useState('');
  const [desc, setDesc] = useState('');
  const [type, setType] = useState('honeymoon');
  const [targetDate, setTargetDate] = useState('');

  const { data: goals, insert } = useRealtimeTable<Goal>({
    table: 'future_goals',
    coupleId: profile?.couple_id,
    orderBy: { column: 'created_at', ascending: false },
  });

  const addGoal = async () => {
    if (!title.trim() || !profile?.couple_id) return;
    await insert({
      type,
      title: title.trim(),
      description: desc || null,
      target_date: targetDate || null,
    });
    setTitle('');
    setDesc('');
    setShowAdd(false);
  };

  return (
    <div className="px-5 py-6 max-w-lg mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="font-script text-2xl text-gradient-love">Masa Depan Kita 🏡</h1>
        <motion.button whileTap={{ scale: 0.9 }} onClick={() => setShowAdd(!showAdd)} className="p-2.5 rounded-xl bg-primary text-primary-foreground">
          <Plus size={18} />
        </motion.button>
      </div>

      {showAdd && (
        <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} className="glass-card p-4 space-y-3">
          <div className="flex flex-wrap gap-2">
            {TYPES.map(t => (
              <button key={t.value} onClick={() => setType(t.value)} className={`px-3 py-1.5 rounded-full text-xs font-medium ${type === t.value ? 'bg-primary text-primary-foreground' : 'bg-secondary text-secondary-foreground'}`}>
                {t.emoji} {t.label}
              </button>
            ))}
          </div>
          <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Judul impian..." className="w-full px-3 py-2 rounded-xl bg-background/50 border border-border text-sm outline-none text-foreground placeholder:text-muted-foreground" />
          <textarea value={desc} onChange={(e) => setDesc(e.target.value)} placeholder="Deskripsi..." className="w-full px-3 py-2 rounded-xl bg-background/50 border border-border text-sm outline-none resize-none h-16 text-foreground placeholder:text-muted-foreground" />
          <input type="date" value={targetDate} onChange={(e) => setTargetDate(e.target.value)} className="w-full px-3 py-2 rounded-xl bg-background/50 border border-border text-sm outline-none text-foreground" />
          <motion.button whileTap={{ scale: 0.98 }} onClick={addGoal} className="w-full py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-semibold">
            Simpan Impian 💕
          </motion.button>
        </motion.div>
      )}

      <div className="grid grid-cols-2 gap-3">
        {goals.map((g, i) => {
          const t = TYPES.find(t => t.value === g.type);
          return (
            <motion.div key={g.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }} className="glass-card p-4">
              <span className="text-2xl mb-2 block">{t?.emoji}</span>
              <h3 className="text-sm font-bold text-foreground">{g.title}</h3>
              {g.description && <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{g.description}</p>}
              {g.target_date && <p className="text-[10px] text-primary font-medium mt-2">Target: {g.target_date}</p>}
            </motion.div>
          );
        })}
      </div>

      {goals.length === 0 && !showAdd && (
        <div className="text-center py-16">
          <p className="text-4xl mb-3">🌟</p>
          <p className="text-muted-foreground text-sm">Belum ada impian. Yuk rencanakan!</p>
        </div>
      )}
    </div>
  );
};

export default GoalsPage;
