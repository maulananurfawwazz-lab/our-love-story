import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Plus, Lock, Heart } from 'lucide-react';
import { notifyPartner, NotificationTemplates } from '@/lib/notifications';

interface Promise {
  id: string;
  content: string;
  is_private: boolean;
  created_by: string;
}

const PromisesPage = () => {
  const { user, profile } = useAuth();
  const [promises, setPromises] = useState<Promise[]>([]);
  const [showAdd, setShowAdd] = useState(false);
  const [content, setContent] = useState('');
  const [isPrivate, setIsPrivate] = useState(false);

  useEffect(() => {
    if (!profile?.couple_id) return;
    supabase
      .from('promises')
      .select('*')
      .eq('couple_id', profile.couple_id)
      .order('created_at', { ascending: false })
      .then(({ data }) => { if (data) setPromises(data); });
  }, [profile?.couple_id]);

  const addPromise = async () => {
    if (!content.trim() || !profile?.couple_id || !user) return;
    await supabase.from('promises').insert({
      couple_id: profile.couple_id,
      created_by: user.id,
      content: content.trim(),
      is_private: isPrivate,
    });
    setContent('');
    setShowAdd(false);

    // Fire-and-forget push notification to partner
    if (!isPrivate) {
      notifyPartner(NotificationTemplates.promise(profile?.name || 'Pasanganmu'));
    }
    
    const { data } = await supabase
      .from('promises')
      .select('*')
      .eq('couple_id', profile.couple_id)
      .order('created_at', { ascending: false });
    if (data) setPromises(data);
  };

  return (
    <div className="px-5 py-6 max-w-lg mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="font-script text-2xl text-gradient-love">Janji Kita 🤞</h1>
        <motion.button whileTap={{ scale: 0.9 }} onClick={() => setShowAdd(!showAdd)} className="p-2.5 rounded-xl bg-primary text-primary-foreground">
          <Plus size={18} />
        </motion.button>
      </div>

      {showAdd && (
        <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} className="glass-card p-4 space-y-3">
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="Tulis janji..."
            className="w-full px-3 py-2 rounded-xl bg-background/50 border border-border text-sm outline-none resize-none h-20 text-foreground placeholder:text-muted-foreground"
          />
          <div className="flex items-center gap-3">
            <button
              onClick={() => setIsPrivate(false)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium ${!isPrivate ? 'bg-primary text-primary-foreground' : 'bg-secondary text-secondary-foreground'}`}
            >
              <Heart size={12} /> Shared
            </button>
            <button
              onClick={() => setIsPrivate(true)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium ${isPrivate ? 'bg-primary text-primary-foreground' : 'bg-secondary text-secondary-foreground'}`}
            >
              <Lock size={12} /> Private
            </button>
          </div>
          <motion.button whileTap={{ scale: 0.98 }} onClick={addPromise} className="w-full py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-semibold">
            Simpan Janji 💕
          </motion.button>
        </motion.div>
      )}

      <div className="space-y-3">
        {promises.map((p, i) => (
          <motion.div
            key={p.id}
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05 }}
            className="glass-card p-4"
          >
            <div className="flex items-start justify-between">
              <p className="text-sm text-foreground flex-1">{p.content}</p>
              <span className="text-xs ml-2">
                {p.is_private ? '🔒' : '💞'}
              </span>
            </div>
          </motion.div>
        ))}
      </div>

      {promises.length === 0 && !showAdd && (
        <div className="text-center py-16">
          <p className="text-4xl mb-3">🤞</p>
          <p className="text-muted-foreground text-sm">Belum ada janji. Buat yang pertama!</p>
        </div>
      )}
    </div>
  );
};

export default PromisesPage;
