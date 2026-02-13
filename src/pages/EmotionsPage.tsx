import { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { useAuth } from '@/contexts/AuthContext';
import { TrendingUp } from 'lucide-react';
import { notifyPartner, NotificationTemplates } from '@/lib/notifications';
import { useRealtimeTable } from '@/hooks/useRealtimeTable';

const EMOTIONS = [
  { type: 'Bahagia', emoji: '😊', color: 'from-yellow-400 to-amber-500' },
  { type: 'Sayang', emoji: '🥰', color: 'from-pink-400 to-rose-500' },
  { type: 'Cemburu', emoji: '😤', color: 'from-orange-400 to-red-400' },
  { type: 'Ngambek', emoji: '😠', color: 'from-amber-500 to-orange-500' },
  { type: 'Marah', emoji: '😡', color: 'from-red-500 to-rose-600' },
];

interface EmotionLog {
  id: string;
  user_id: string;
  emotion_type: string;
  date: string;
}

const EmotionsPage = () => {
  const { user, profile, partner } = useAuth();
  const today = new Date().toISOString().split('T')[0];

  const { data: logs, insert } = useRealtimeTable<EmotionLog>({
    table: 'emotions',
    coupleId: profile?.couple_id,
    orderBy: { column: 'created_at', ascending: false },
    limit: 50,
  });

  // Derive todayMood from realtime data
  const todayMood = useMemo(() => {
    const myToday = logs.find(e => e.user_id === user?.id && e.date === today);
    return myToday?.emotion_type ?? null;
  }, [logs, user?.id, today]);

  const logEmotion = async (type: string) => {
    if (!profile?.couple_id || !user || todayMood) return;
    await insert({ user_id: user.id, emotion_type: type, date: today });

    // Fire-and-forget push notification to partner
    notifyPartner(NotificationTemplates.emotion(profile?.name || 'Pasanganmu', type));
  };

  const getName = (userId: string) => {
    if (userId === user?.id) return profile?.name || 'Kamu';
    return partner?.name || 'Partner';
  };

  const getAvatar = (userId: string) => {
    if (userId === user?.id) return profile?.avatar_url;
    return partner?.avatar_url;
  };

  const getInitial = (userId: string) => {
    return getName(userId)?.[0] || '?';
  };

  // Stats per user per emotion
  const myLogs = logs.filter(l => l.user_id === user?.id);
  const partnerLogs = logs.filter(l => l.user_id !== user?.id);

  const weekCounts = EMOTIONS.map(e => ({
    ...e,
    myCount: myLogs.filter(l => l.emotion_type === e.type).length,
    partnerCount: partnerLogs.filter(l => l.emotion_type === e.type).length,
    total: logs.filter(l => l.emotion_type === e.type).length,
  }));

  const maxCount = Math.max(...weekCounts.map(w => w.total), 1);

  // Who's most emotional
  const myTotal = myLogs.length;
  const partnerTotal = partnerLogs.length;

  return (
    <div className="px-5 py-6 max-w-lg mx-auto space-y-5 pb-24">
      <div>
        <h1 className="font-script text-2xl text-gradient-love">Mood Tracker</h1>
        <p className="text-[10px] text-muted-foreground mt-0.5">Catat perasaan kalian setiap hari 💝</p>
      </div>

      {/* Today's Mood Selector */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="glass-card p-5">
        <p className="text-xs font-bold text-foreground mb-3 uppercase tracking-wider">
          {todayMood ? '✅ Mood kamu hari ini' : 'Bagaimana perasaanmu?'}
        </p>
        <div className="grid grid-cols-5 gap-2">
          {EMOTIONS.map(({ type, emoji, color }) => (
            <motion.button
              key={type}
              whileTap={{ scale: 0.85 }}
              whileHover={{ scale: 1.05 }}
              onClick={() => logEmotion(type)}
              disabled={!!todayMood}
              className={`flex flex-col items-center gap-1.5 p-3 rounded-2xl transition-all ${
                todayMood === type
                  ? 'ring-2 ring-primary shadow-lg bg-primary/15'
                  : todayMood
                  ? 'opacity-30 grayscale'
                  : 'hover:bg-secondary/80 active:bg-secondary'
              }`}
            >
              <motion.span 
                className="text-3xl" 
                animate={todayMood === type ? { scale: [1, 1.2, 1] } : {}}
                transition={{ repeat: Infinity, duration: 2 }}
              >
                {emoji}
              </motion.span>
              <span className="text-[9px] font-bold text-foreground tracking-wide">{type}</span>
            </motion.button>
          ))}
        </div>
      </motion.div>

      {/* Comparison Card */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="glass-card p-5">
        <div className="flex items-center gap-2 mb-4">
          <TrendingUp size={14} className="text-primary" />
          <p className="text-xs font-bold text-foreground uppercase tracking-wider">Perbandingan Mood</p>
        </div>

        {/* User Stats Header */}
        <div className="flex items-center justify-between mb-4 p-3 rounded-2xl bg-secondary/50">
          <div className="flex items-center gap-2">
            {profile?.avatar_url ? (
              <img src={profile.avatar_url} className="w-8 h-8 rounded-full object-cover border-2 border-primary/30" />
            ) : (
              <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-xs font-bold text-primary">{profile?.name?.[0]}</div>
            )}
            <div>
              <p className="text-xs font-bold text-foreground">{profile?.name}</p>
              <p className="text-[10px] text-muted-foreground">{myTotal} mood</p>
            </div>
          </div>
          <div className="text-lg">vs</div>
          <div className="flex items-center gap-2">
            <div className="text-right">
              <p className="text-xs font-bold text-foreground">{partner?.name || 'Partner'}</p>
              <p className="text-[10px] text-muted-foreground">{partnerTotal} mood</p>
            </div>
            {partner?.avatar_url ? (
              <img src={partner.avatar_url} className="w-8 h-8 rounded-full object-cover border-2 border-accent/30" />
            ) : (
              <div className="w-8 h-8 rounded-full bg-accent/20 flex items-center justify-center text-xs font-bold text-accent">{partner?.name?.[0] || '?'}</div>
            )}
          </div>
        </div>

        {/* Emotion Bars */}
        <div className="space-y-3">
          {weekCounts.map(({ type, emoji, color, myCount, partnerCount, total }) => (
            <div key={type} className="space-y-1">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-base">{emoji}</span>
                  <span className="text-[11px] font-bold text-foreground">{type}</span>
                </div>
                <span className="text-[10px] text-muted-foreground">{total}x</span>
              </div>
              <div className="flex gap-1">
                <div className="flex-1">
                  <div className="h-2.5 rounded-full bg-secondary overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${(myCount / maxCount) * 100}%` }}
                      transition={{ duration: 0.8, delay: 0.1 }}
                      className="h-full rounded-full bg-primary"
                    />
                  </div>
                  <p className="text-[9px] text-muted-foreground mt-0.5">{profile?.name}: {myCount}</p>
                </div>
                <div className="flex-1">
                  <div className="h-2.5 rounded-full bg-secondary overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${(partnerCount / maxCount) * 100}%` }}
                      transition={{ duration: 0.8, delay: 0.2 }}
                      className="h-full rounded-full bg-accent"
                    />
                  </div>
                  <p className="text-[9px] text-muted-foreground mt-0.5">{partner?.name || 'Partner'}: {partnerCount}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </motion.div>

      {/* Recent Logs with user info */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="glass-card p-5">
        <p className="text-xs font-bold text-foreground mb-4 uppercase tracking-wider">Log Terbaru</p>
        <div className="space-y-2.5">
          {logs.slice(0, 12).map((log) => {
            const em = EMOTIONS.find(e => e.type === log.emotion_type);
            const avatar = getAvatar(log.user_id);
            return (
              <motion.div key={log.id} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} className="flex items-center gap-3 p-2.5 rounded-xl bg-secondary/30 hover:bg-secondary/50 transition-colors">
                {avatar ? (
                  <img src={avatar} className="w-7 h-7 rounded-full object-cover" />
                ) : (
                  <div className="w-7 h-7 rounded-full bg-primary/15 flex items-center justify-center text-[10px] font-bold text-primary">{getInitial(log.user_id)}</div>
                )}
                <span className="text-lg">{em?.emoji}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-bold text-foreground">{getName(log.user_id)}</p>
                  <p className="text-[10px] text-muted-foreground">{log.emotion_type}</p>
                </div>
                <span className="text-[10px] text-muted-foreground font-medium">{log.date}</span>
              </motion.div>
            );
          })}
        </div>
      </motion.div>
    </div>
  );
};

export default EmotionsPage;
