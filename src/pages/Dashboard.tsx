import { useEffect, useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Heart, Camera, MessageCircle, Calendar, LogOut, Settings2, Music, BookHeart, Gift, Sparkles, TrendingUp } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { differenceInDays, format } from 'date-fns';
import { id as localeId } from 'date-fns/locale';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from '@/components/ui/dialog';
import { useRealtimeTable } from '@/hooks/useRealtimeTable';

const EMOTION_MAP: Record<string, string> = {
  Bahagia: '😊', Sayang: '🥰', Cemburu: '😤', Ngambek: '😠', Marah: '😡',
};

const loveQuotes = [
  "Every love story is beautiful, but ours is my favorite.",
  "I love you more than yesterday, less than tomorrow.",
  "You are my today and all of my tomorrows.",
  "In you, I found my forever.",
  "Together is my favorite place to be.",
];

interface EmotionRow { id: string; emotion_type: string; user_id: string; date: string; }
interface MemoryRow { id: string; description: string; image_url: string | null; created_at: string; date: string; }

const Dashboard = () => {
  const { user, profile, partner, coupleInfo, signOut, refreshCoupleInfo } = useAuth();
  const navigate = useNavigate();
  const [daysTogether, setDaysTogether] = useState(0);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [startDate, setStartDate] = useState('');
  const [quote] = useState(() => loveQuotes[Math.floor(Math.random() * loveQuotes.length)]);

  const today = new Date().toISOString().split('T')[0];

  // Realtime emotions – get today's moods automatically
  const { data: allEmotions } = useRealtimeTable<EmotionRow>({
    table: 'emotions',
    coupleId: profile?.couple_id,
    orderBy: { column: 'created_at', ascending: false },
    limit: 50,
  });

  const todayEmotions = useMemo(
    () => allEmotions.filter(e => e.date === today),
    [allEmotions, today]
  );

  // Realtime memories – latest memory updates automatically
  const { data: allMemories } = useRealtimeTable<MemoryRow>({
    table: 'memories',
    coupleId: profile?.couple_id,
    orderBy: { column: 'created_at', ascending: false },
    limit: 1,
  });

  const latestMemory = allMemories[0] ?? null;

  useEffect(() => {
    if (coupleInfo?.start_date) {
      setDaysTogether(differenceInDays(new Date(), new Date(coupleInfo.start_date)));
      setStartDate(coupleInfo.start_date);
    }
  }, [coupleInfo]);

  const saveStartDate = async () => {
    if (!profile?.couple_id || !startDate) return;
    await supabase.from('couples').update({ start_date: startDate }).eq('id', profile.couple_id);
    await refreshCoupleInfo();
    setShowDatePicker(false);
  };

  const getUserName = (userId: string) => {
    if (userId === user?.id) return profile?.name;
    return partner?.name || 'Partner';
  };

  const storyCards = [
    { label: 'Janji Kita', desc: 'Kata-kata dari hati', to: '/promises', icon: BookHeart, color: 'from-rose-300/80 to-pink-400/80' },
    { label: 'Kejutan Cinta', desc: 'Sesuatu yang spesial', to: '/surprises', icon: Gift, color: 'from-amber-300/80 to-orange-300/80' },
    { label: 'Impian Kita', desc: 'Masa depan bersama', to: '/goals', icon: Sparkles, color: 'from-sky-300/80 to-blue-400/80' },
    { label: 'Playlist Kita', desc: 'Lagu-lagu kita', to: '/playlist', icon: Music, color: 'from-violet-300/80 to-purple-400/80' },
    { label: 'Keuangan', desc: 'Rencana berdua', to: '/finances', icon: TrendingUp, color: 'from-emerald-300/80 to-teal-400/80' },
  ];

  return (
    <div className="px-5 pt-8 pb-28 max-w-lg mx-auto space-y-6">
      {/* Intimate Header */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center justify-between"
      >
        <div>
          <p className="text-muted-foreground text-[11px] font-medium tracking-[0.15em] uppercase">
            {format(new Date(), 'EEEE, dd MMMM', { locale: localeId })}
          </p>
          <h1 className="font-script text-3xl text-gradient-love mt-1 leading-tight">
            Hi, {profile?.name} 💕
          </h1>
        </div>
        <div className="flex gap-1.5">
          <motion.button whileTap={{ scale: 0.9 }} onClick={() => setShowDatePicker(true)} className="p-2.5 rounded-2xl glass-morphism hover:bg-white/40 transition-colors">
            <Settings2 size={15} className="text-muted-foreground" />
          </motion.button>
          <motion.button whileTap={{ scale: 0.9 }} onClick={signOut} className="p-2.5 rounded-2xl glass-morphism hover:bg-white/40 transition-colors">
            <LogOut size={15} className="text-muted-foreground" />
          </motion.button>
        </div>
      </motion.div>

      {/* ✨ Hero: Our Love Counter — large, dreamy, emotional */}
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.05, type: 'spring', bounce: 0.3 }}
        className="relative overflow-hidden rounded-[28px] love-hero-card"
      >
        {/* Dreamy background layers */}
        <div className="absolute inset-0 bg-gradient-to-br from-rose-400 via-pink-400 to-fuchsia-400" />
        <div className="absolute inset-0 opacity-30" style={{ background: 'radial-gradient(circle at 20% 30%, rgba(255,255,255,0.5) 0%, transparent 60%)' }} />
        <div className="absolute inset-0 opacity-20" style={{ background: 'radial-gradient(circle at 80% 70%, rgba(255,200,220,0.8) 0%, transparent 50%)' }} />

        {/* Floating decorative hearts */}
        <div className="absolute inset-0 overflow-hidden">
          {[...Array(5)].map((_, i) => (
            <motion.div
              key={i}
              className="absolute text-white/10"
              style={{
                left: `${15 + i * 18}%`,
                top: `${20 + (i % 3) * 25}%`,
                fontSize: 20 + i * 8,
              }}
              animate={{
                y: [-5, 5, -5],
                rotate: [-5, 5, -5],
              }}
              transition={{
                duration: 3 + i,
                repeat: Infinity,
                ease: 'easeInOut',
                delay: i * 0.5,
              }}
            >
              ♥
            </motion.div>
          ))}
        </div>

        <div className="relative z-10 px-6 pt-7 pb-6">
          {/* Couple avatars */}
          <div className="flex items-center justify-center gap-4 mb-5">
            <div className="text-center">
              {profile?.avatar_url ? (
                <img src={profile.avatar_url} className="w-14 h-14 rounded-full border-[3px] border-white/60 object-cover shadow-lg" />
              ) : (
                <div className="w-14 h-14 rounded-full bg-white/25 backdrop-blur-sm flex items-center justify-center text-lg text-white font-bold border-[3px] border-white/40">{profile?.name?.[0]}</div>
              )}
              <p className="text-white/90 text-[11px] font-semibold mt-1.5 font-body">{profile?.name}</p>
            </div>

            <motion.div
              animate={{ scale: [1, 1.2, 1] }}
              transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
              className="relative"
            >
              <Heart className="text-white fill-white drop-shadow-lg" size={28} />
              <motion.div
                className="absolute inset-0 flex items-center justify-center"
                animate={{ scale: [1, 1.5, 1], opacity: [0.5, 0, 0.5] }}
                transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
              >
                <Heart className="text-white/40" size={28} />
              </motion.div>
            </motion.div>

            <div className="text-center">
              {partner?.avatar_url ? (
                <img src={partner.avatar_url} className="w-14 h-14 rounded-full border-[3px] border-white/60 object-cover shadow-lg" />
              ) : (
                <div className="w-14 h-14 rounded-full bg-white/25 backdrop-blur-sm flex items-center justify-center text-lg text-white font-bold border-[3px] border-white/40">{partner?.name?.[0]}</div>
              )}
              <p className="text-white/90 text-[11px] font-semibold mt-1.5 font-body">{partner?.name || '...'}</p>
            </div>
          </div>

          {/* Days counter */}
          {coupleInfo?.start_date ? (
            <div className="text-center">
              <p className="text-white/70 text-[10px] font-medium tracking-[0.2em] uppercase mb-1">Hari Bersama</p>
              <motion.div className="flex items-center justify-center gap-0.5">
                {String(daysTogether).split('').map((digit, i) => (
                  <motion.span
                    key={i}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 + i * 0.08, type: 'spring', bounce: 0.4 }}
                    className="font-script text-[56px] leading-none text-white drop-shadow-md"
                  >
                    {digit}
                  </motion.span>
                ))}
                <motion.span
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.5 }}
                  className="font-script text-2xl text-white/80 ml-2 self-end mb-2"
                >
                  hari
                </motion.span>
              </motion.div>
              <p className="text-white/60 text-[10px] mt-1 font-body">
                Sejak {format(new Date(coupleInfo.start_date), 'dd MMMM yyyy', { locale: localeId })}
              </p>
            </div>
          ) : (
            <motion.button
              whileTap={{ scale: 0.95 }}
              onClick={() => setShowDatePicker(true)}
              className="mx-auto block px-6 py-3 rounded-full bg-white/20 backdrop-blur-sm text-white text-sm font-semibold"
            >
              ✨ Atur Tanggal Jadian
            </motion.button>
          )}

          {/* Love quote */}
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.6 }}
            className="text-white/50 text-[10px] text-center mt-4 italic font-body max-w-[240px] mx-auto leading-relaxed"
          >
            "{quote}"
          </motion.p>
        </div>
      </motion.div>

      {/* 💭 Our Mood Today — emotional widget */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.15 }}
        className="scrapbook-card p-5 cursor-pointer"
        onClick={() => navigate('/emotions')}
      >
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-pink-200 to-rose-300 flex items-center justify-center">
              <Heart size={14} className="text-rose-500" />
            </div>
            <div>
              <p className="text-[13px] font-bold text-foreground">Mood Kita Hari Ini</p>
              <p className="text-[10px] text-muted-foreground">Bagaimana perasaan kita?</p>
            </div>
          </div>
          <motion.span
            animate={{ rotate: [0, 10, -10, 0] }}
            transition={{ duration: 2, repeat: Infinity, delay: 1 }}
            className="text-2xl"
          >
            💭
          </motion.span>
        </div>

        {todayEmotions.length > 0 ? (
          <div className="space-y-2">
            {todayEmotions.map((e, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.2 + i * 0.1 }}
                className="flex items-center gap-3 p-2.5 rounded-2xl bg-rose-50/60 dark:bg-rose-900/10"
              >
                <span className="text-xl">{EMOTION_MAP[e.emotion_type] || '💭'}</span>
                <div>
                  <p className="text-[12px] font-bold text-foreground">{getUserName(e.user_id)}</p>
                  <p className="text-[11px] text-muted-foreground">sedang {e.emotion_type.toLowerCase()}</p>
                </div>
              </motion.div>
            ))}
          </div>
        ) : (
          <div className="text-center py-3">
            <p className="text-[11px] text-muted-foreground italic">Belum ada mood hari ini... tap untuk ceritakan perasaanmu 💕</p>
          </div>
        )}
      </motion.div>

      {/* 📸 Today's Memory — hero photo card */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
      >
        {latestMemory?.image_url ? (
          <motion.div
            className="memory-photo-card overflow-hidden cursor-pointer group"
            whileTap={{ scale: 0.98 }}
            onClick={() => navigate('/gallery')}
          >
            <div className="relative">
              <img
                src={latestMemory.image_url}
                alt="Memory"
                className="w-full h-56 object-cover transition-transform duration-700 group-hover:scale-105"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/10 to-transparent" />
              
              {/* Scrapbook-style tape decoration */}
              <div className="absolute -top-1 left-8 w-16 h-5 bg-yellow-100/60 rotate-[-3deg] rounded-sm" />
              <div className="absolute -top-1 right-8 w-16 h-5 bg-pink-100/60 rotate-[2deg] rounded-sm" />

              <div className="absolute bottom-0 left-0 right-0 p-5">
                <p className="text-white/60 text-[10px] font-medium tracking-[0.15em] uppercase mb-1">
                  📸 Kenangan Terbaru
                </p>
                <p className="text-white text-[15px] font-semibold leading-snug line-clamp-2 font-body">
                  {latestMemory.description}
                </p>
                {latestMemory.created_at && (
                  <p className="text-white/50 text-[10px] mt-1 font-script text-lg">
                    {format(new Date(latestMemory.created_at), 'dd MMM yyyy', { locale: localeId })}
                  </p>
                )}
              </div>
            </div>
          </motion.div>
        ) : (
          <motion.div
            className="scrapbook-card p-8 text-center cursor-pointer"
            whileTap={{ scale: 0.98 }}
            onClick={() => navigate('/gallery')}
          >
            <motion.div
              animate={{ y: [-3, 3, -3] }}
              transition={{ duration: 3, repeat: Infinity }}
              className="text-4xl mb-3"
            >
              📷
            </motion.div>
            <p className="font-script text-xl text-gradient-love mb-1">Mulai cerita kita</p>
            <p className="text-[11px] text-muted-foreground">Tap untuk menambahkan kenangan pertama...</p>
          </motion.div>
        )}
      </motion.div>

      {/* 🔗 Quick access — intimate story links, not grid buttons */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.25 }}
        className="flex gap-3 overflow-x-auto no-scrollbar -mx-5 px-5"
      >
        {[
          { icon: Camera, label: 'Galeri', to: '/gallery', emoji: '📸' },
          { icon: MessageCircle, label: 'Chat', to: '/chat', emoji: '💌' },
          { icon: Calendar, label: 'Timeline', to: '/timeline', emoji: '📅' },
          { icon: Heart, label: 'Mood', to: '/emotions', emoji: '💕' },
        ].map(({ label, to, emoji }, i) => (
          <motion.button
            key={to}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 + i * 0.05 }}
            whileTap={{ scale: 0.93 }}
            onClick={() => navigate(to)}
            className="quick-link-pill flex-shrink-0"
          >
            <span className="text-base">{emoji}</span>
            <span className="text-[11px] font-semibold text-foreground whitespace-nowrap">{label}</span>
          </motion.button>
        ))}
      </motion.div>

      {/* 📖 Story Cards — varied sizes, organic layout */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="space-y-3"
      >
        <p className="font-script text-xl text-gradient-love px-1">Cerita Kita ✨</p>

        {/* Large horizontal card */}
        <motion.div
          whileTap={{ scale: 0.97 }}
          onClick={() => navigate(storyCards[0].to)}
          className="story-card-large cursor-pointer"
        >
          <div className={`absolute inset-0 bg-gradient-to-br ${storyCards[0].color} rounded-[22px]`} />
          <div className="absolute inset-0 opacity-20" style={{ background: 'radial-gradient(circle at 80% 20%, white, transparent 60%)' }} />
          <div className="relative z-10 p-5 flex items-center justify-between">
            <div>
              <p className="text-white/70 text-[10px] font-medium tracking-wider uppercase mb-1">💝</p>
              <p className="text-white text-lg font-bold font-body">{storyCards[0].label}</p>
              <p className="text-white/70 text-[11px] mt-0.5">{storyCards[0].desc}</p>
            </div>
            <motion.div
              animate={{ rotate: [0, 5, -5, 0], y: [-2, 2, -2] }}
              transition={{ duration: 4, repeat: Infinity }}
            >
              <BookHeart size={36} className="text-white/40" />
            </motion.div>
          </div>
        </motion.div>

        {/* Two medium cards side by side */}
        <div className="flex gap-3">
          {storyCards.slice(1, 3).map((card, i) => {
            const CardIcon = card.icon;
            return (
              <motion.div
                key={card.to}
                whileTap={{ scale: 0.95 }}
                onClick={() => navigate(card.to)}
                className="story-card-medium cursor-pointer flex-1"
                style={{ minHeight: i === 0 ? '140px' : '130px' }}
              >
                <div className={`absolute inset-0 bg-gradient-to-br ${card.color} rounded-[20px]`} />
                <div className="absolute inset-0 opacity-15" style={{ background: 'radial-gradient(circle at 70% 30%, white, transparent 60%)' }} />
                <div className="relative z-10 p-4 h-full flex flex-col justify-between">
                  <motion.div
                    animate={{ y: [-2, 2, -2] }}
                    transition={{ duration: 3 + i, repeat: Infinity }}
                  >
                    <CardIcon size={24} className="text-white/50" />
                  </motion.div>
                  <div>
                    <p className="text-white text-[13px] font-bold font-body">{card.label}</p>
                    <p className="text-white/60 text-[10px] mt-0.5">{card.desc}</p>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>

        {/* Two smaller horizontal cards */}
        <div className="flex gap-3">
          {storyCards.slice(3).map((card, i) => {
            const CardIcon = card.icon;
            return (
              <motion.div
                key={card.to}
                whileTap={{ scale: 0.95 }}
                onClick={() => navigate(card.to)}
                className="story-card-horizontal cursor-pointer flex-1"
              >
                <div className={`absolute inset-0 bg-gradient-to-r ${card.color} rounded-[18px]`} />
                <div className="relative z-10 p-4 flex items-center gap-3">
                  <motion.div
                    animate={{ scale: [1, 1.1, 1] }}
                    transition={{ duration: 2 + i, repeat: Infinity }}
                    className="w-10 h-10 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center flex-shrink-0"
                  >
                    <CardIcon size={18} className="text-white" />
                  </motion.div>
                  <div>
                    <p className="text-white text-[12px] font-bold font-body">{card.label}</p>
                    <p className="text-white/60 text-[10px]">{card.desc}</p>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      </motion.div>

      {/* Date Picker Dialog */}
      <Dialog open={showDatePicker} onOpenChange={setShowDatePicker}>
        <DialogContent className="glass-morphism border-white/20 max-w-sm rounded-[24px]">
          <DialogHeader>
            <DialogTitle className="font-script text-2xl text-gradient-love">Tanggal Jadian 💕</DialogTitle>
            <DialogDescription className="text-muted-foreground text-[13px]">Kapan cerita cinta kita dimulai?</DialogDescription>
          </DialogHeader>
          <input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="w-full px-4 py-3.5 rounded-2xl bg-rose-50/50 border border-rose-200/50 text-foreground text-sm outline-none focus:ring-2 focus:ring-primary/30 transition-all"
          />
          <motion.button
            whileTap={{ scale: 0.97 }}
            onClick={saveStartDate}
            className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-rose-400 to-pink-500 text-white font-semibold text-sm shadow-lg shadow-rose-300/30"
          >
            Simpan 💝
          </motion.button>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Dashboard;
