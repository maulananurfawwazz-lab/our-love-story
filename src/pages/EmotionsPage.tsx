import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';

const EMOTIONS = [
  { type: 'Bahagia', emoji: '😊' },
  { type: 'Sayang', emoji: '🥰' },
  { type: 'Cemburu', emoji: '😤' },
  { type: 'Ngambek', emoji: '😠' },
  { type: 'Marah', emoji: '😡' },
];

interface EmotionLog {
  id: string;
  user_id: string;
  emotion_type: string;
  date: string;
}

const EmotionsPage = () => {
  const { user, profile } = useAuth();
  const [logs, setLogs] = useState<EmotionLog[]>([]);
  const [todayMood, setTodayMood] = useState<string | null>(null);

  const today = new Date().toISOString().split('T')[0];

  useEffect(() => {
    if (!profile?.couple_id) return;
    const fetch = async () => {
      const { data } = await supabase
        .from('emotions')
        .select('*')
        .eq('couple_id', profile.couple_id)
        .order('created_at', { ascending: false })
        .limit(30);
      if (data) {
        setLogs(data);
        const myToday = data.find(e => e.user_id === user?.id && e.date === today);
        if (myToday) setTodayMood(myToday.emotion_type);
      }
    };
    fetch();

    // Realtime
    const channel = supabase
      .channel('emotions-realtime')
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'emotions',
        filter: `couple_id=eq.${profile.couple_id}`,
      }, (payload) => {
        setLogs(prev => [payload.new as EmotionLog, ...prev]);
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [profile?.couple_id, user?.id]);

  const logEmotion = async (type: string) => {
    if (!profile?.couple_id || !user || todayMood) return;
    await supabase.from('emotions').insert({
      couple_id: profile.couple_id,
      user_id: user.id,
      emotion_type: type,
      date: today,
    });
    setTodayMood(type);
  };

  // Weekly count
  const weekCounts = EMOTIONS.map(e => ({
    ...e,
    count: logs.filter(l => l.emotion_type === e.type).length,
  }));

  return (
    <div className="px-5 py-6 max-w-lg mx-auto space-y-6">
      <h1 className="font-script text-2xl text-gradient-love">Mood Tracker 💝</h1>

      <div className="glass-card p-5">
        <p className="text-sm font-semibold text-foreground mb-3">
          {todayMood ? 'Mood kamu hari ini:' : 'Bagaimana perasaanmu hari ini?'}
        </p>
        <div className="grid grid-cols-5 gap-2">
          {EMOTIONS.map(({ type, emoji }) => (
            <motion.button
              key={type}
              whileTap={{ scale: 0.9 }}
              onClick={() => logEmotion(type)}
              disabled={!!todayMood}
              className={`flex flex-col items-center gap-1 p-3 rounded-xl transition-all ${
                todayMood === type
                  ? 'bg-primary/20 ring-2 ring-primary'
                  : todayMood
                  ? 'opacity-40'
                  : 'hover:bg-secondary'
              }`}
            >
              <span className="text-2xl">{emoji}</span>
              <span className="text-[10px] font-medium text-foreground">{type}</span>
            </motion.button>
          ))}
        </div>
      </div>

      {/* Weekly recap */}
      <div className="glass-card p-5">
        <p className="text-sm font-semibold text-foreground mb-4">Rekap Mood</p>
        <div className="space-y-3">
          {weekCounts.map(({ type, emoji, count }) => (
            <div key={type} className="flex items-center gap-3">
              <span className="text-lg">{emoji}</span>
              <span className="text-xs font-medium text-foreground w-16">{type}</span>
              <div className="flex-1 h-3 rounded-full bg-secondary overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${Math.min((count / Math.max(...weekCounts.map(w => w.count), 1)) * 100, 100)}%` }}
                  transition={{ duration: 0.8, delay: 0.1 }}
                  className="h-full rounded-full bg-primary"
                />
              </div>
              <span className="text-xs text-muted-foreground w-6 text-right">{count}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Recent logs */}
      <div className="glass-card p-5">
        <p className="text-sm font-semibold text-foreground mb-3">Log Terbaru</p>
        <div className="space-y-2">
          {logs.slice(0, 10).map((log) => {
            const em = EMOTIONS.find(e => e.type === log.emotion_type);
            return (
              <div key={log.id} className="flex items-center gap-3 text-sm">
                <span>{em?.emoji}</span>
                <span className="text-foreground font-medium">{log.emotion_type}</span>
                <span className="text-muted-foreground text-xs ml-auto">{log.date}</span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default EmotionsPage;
