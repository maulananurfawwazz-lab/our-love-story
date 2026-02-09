import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Camera, Heart, MessageCircle, Calendar, LogOut, Sparkles, TrendingUp, Gift, Music, BookHeart, Settings2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { differenceInDays, format } from 'date-fns';
import { id as localeId } from 'date-fns/locale';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from '@/components/ui/dialog';

const EMOTION_MAP: Record<string, string> = {
  Bahagia: '😊', Sayang: '🥰', Cemburu: '😤', Ngambek: '😠', Marah: '😡',
};

const Dashboard = () => {
  const { user, profile, partner, coupleInfo, signOut, refreshCoupleInfo } = useAuth();
  const navigate = useNavigate();
  const [daysTogether, setDaysTogether] = useState(0);
  const [todayEmotions, setTodayEmotions] = useState<{ emotion_type: string; user_id: string }[]>([]);
  const [latestMemory, setLatestMemory] = useState<{ description: string; image_url: string | null } | null>(null);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [startDate, setStartDate] = useState('');

  useEffect(() => {
    if (coupleInfo?.start_date) {
      setDaysTogether(differenceInDays(new Date(), new Date(coupleInfo.start_date)));
      setStartDate(coupleInfo.start_date);
    }
  }, [coupleInfo]);

  useEffect(() => {
    if (!profile?.couple_id) return;
    const today = new Date().toISOString().split('T')[0];
    Promise.all([
      supabase.from('emotions').select('emotion_type, user_id').eq('couple_id', profile.couple_id).eq('date', today),
      supabase.from('memories').select('description, image_url').eq('couple_id', profile.couple_id).order('created_at', { ascending: false }).limit(1).maybeSingle(),
    ]).then(([emotionsRes, memoryRes]) => {
      if (emotionsRes.data) setTodayEmotions(emotionsRes.data);
      if (memoryRes.data) setLatestMemory(memoryRes.data);
    });
  }, [profile?.couple_id]);

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

  const quickActions = [
    { icon: Camera, label: 'Kenangan', to: '/gallery', gradient: 'from-pink-500 to-rose-400' },
    { icon: Heart, label: 'Mood', to: '/emotions', gradient: 'from-red-400 to-pink-500' },
    { icon: MessageCircle, label: 'Chat', to: '/chat', gradient: 'from-violet-400 to-purple-500' },
    { icon: Calendar, label: 'Timeline', to: '/timeline', gradient: 'from-amber-400 to-orange-500' },
  ];

  const features = [
    { label: 'Janji Kita', to: '/promises', icon: BookHeart, gradient: 'from-rose-400 to-pink-500' },
    { label: 'Kejutan', to: '/surprises', icon: Gift, gradient: 'from-amber-400 to-yellow-500' },
    { label: 'Keuangan', to: '/finances', icon: TrendingUp, gradient: 'from-emerald-400 to-green-500' },
    { label: 'Masa Depan', to: '/goals', icon: Sparkles, gradient: 'from-blue-400 to-indigo-500' },
    { label: 'Playlist', to: '/playlist', icon: Music, gradient: 'from-purple-400 to-violet-500' },
  ];

  return (
    <div className="px-5 py-6 max-w-lg mx-auto space-y-5 pb-24">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-muted-foreground text-xs font-medium tracking-wide uppercase">Welcome back</p>
          <h1 className="font-script text-3xl text-gradient-love mt-0.5">{profile?.name} 💕</h1>
        </div>
        <div className="flex gap-2">
          <motion.button whileTap={{ scale: 0.9 }} onClick={() => setShowDatePicker(true)} className="p-2.5 rounded-xl bg-secondary/80 hover:bg-secondary transition-colors">
            <Settings2 size={16} className="text-muted-foreground" />
          </motion.button>
          <motion.button whileTap={{ scale: 0.9 }} onClick={signOut} className="p-2.5 rounded-xl bg-secondary/80 hover:bg-secondary transition-colors">
            <LogOut size={16} className="text-muted-foreground" />
          </motion.button>
        </div>
      </div>

      {/* Hero Days Counter */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative overflow-hidden rounded-3xl p-6 text-center"
        style={{ background: 'linear-gradient(135deg, hsl(340 65% 55%), hsl(320 60% 60%), hsl(350 70% 65%))' }}
      >
        <div className="absolute inset-0 opacity-20" style={{ background: 'radial-gradient(circle at 30% 20%, white 0%, transparent 50%)' }} />
        <div className="relative z-10">
          <p className="text-white/80 text-xs font-medium tracking-widest uppercase mb-2">Hari Bersama</p>
          {coupleInfo?.start_date ? (
            <>
              <motion.div className="flex items-center justify-center gap-1">
                {String(daysTogether).split('').map((digit, i) => (
                  <motion.span
                    key={i}
                    initial={{ opacity: 0, y: 30 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.08, type: 'spring', bounce: 0.4 }}
                    className="font-script text-6xl text-white drop-shadow-lg"
                  >
                    {digit}
                  </motion.span>
                ))}
              </motion.div>
              <p className="text-white/70 text-xs mt-2">
                Sejak {format(new Date(coupleInfo.start_date), 'dd MMMM yyyy', { locale: localeId })}
              </p>
            </>
          ) : (
            <motion.button
              whileTap={{ scale: 0.95 }}
              onClick={() => setShowDatePicker(true)}
              className="px-5 py-2.5 rounded-full bg-white/20 backdrop-blur-sm text-white text-sm font-medium mt-1"
            >
              Atur Tanggal Jadian 💝
            </motion.button>
          )}
          <div className="flex items-center justify-center gap-3 mt-3">
            <div className="flex items-center gap-1.5">
              {profile?.avatar_url ? (
                <img src={profile.avatar_url} className="w-7 h-7 rounded-full border-2 border-white/50 object-cover" />
              ) : (
                <div className="w-7 h-7 rounded-full bg-white/20 flex items-center justify-center text-xs text-white font-bold">{profile?.name?.[0]}</div>
              )}
              <span className="text-white/90 text-xs font-medium">{profile?.name}</span>
            </div>
            <motion.span animate={{ scale: [1, 1.3, 1] }} transition={{ duration: 1.5, repeat: Infinity }} className="text-lg">💝</motion.span>
            <div className="flex items-center gap-1.5">
              <span className="text-white/90 text-xs font-medium">{partner?.name || '...'}</span>
              {partner?.avatar_url ? (
                <img src={partner.avatar_url} className="w-7 h-7 rounded-full border-2 border-white/50 object-cover" />
              ) : (
                <div className="w-7 h-7 rounded-full bg-white/20 flex items-center justify-center text-xs text-white font-bold">{partner?.name?.[0]}</div>
              )}
            </div>
          </div>
        </div>
      </motion.div>

      {/* Today's Mood with user names */}
      <AnimatePresence>
        {todayEmotions.length > 0 && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="glass-card p-4">
            <p className="text-xs font-semibold text-foreground mb-3 flex items-center gap-2">
              <Heart size={14} className="text-primary" /> Mood Hari Ini
            </p>
            <div className="space-y-2">
              {todayEmotions.map((e, i) => (
                <div key={i} className="flex items-center gap-2.5 p-2 rounded-xl bg-secondary/50">
                  <span className="text-lg">{EMOTION_MAP[e.emotion_type] || '💭'}</span>
                  <div>
                    <p className="text-xs font-semibold text-foreground">{e.emotion_type}</p>
                    <p className="text-[10px] text-muted-foreground">oleh {getUserName(e.user_id)}</p>
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Latest Memory */}
      {latestMemory && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="glass-card overflow-hidden cursor-pointer group"
          onClick={() => navigate('/gallery')}
        >
          {latestMemory.image_url && (
            <div className="relative overflow-hidden">
              <img src={latestMemory.image_url} alt="Memory" className="w-full h-44 object-cover transition-transform duration-500 group-hover:scale-105" />
              <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
              <div className="absolute bottom-3 left-4 right-4">
                <p className="text-white/80 text-[10px] font-medium uppercase tracking-wider">Kenangan Terbaru</p>
                <p className="text-white text-sm font-semibold mt-0.5 line-clamp-1">{latestMemory.description}</p>
              </div>
            </div>
          )}
        </motion.div>
      )}

      {/* Quick Actions */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
        <p className="text-xs font-bold text-foreground mb-3 uppercase tracking-wider">Menu Cepat</p>
        <div className="grid grid-cols-4 gap-2.5">
          {quickActions.map(({ icon: Icon, label, to, gradient }) => (
            <motion.button
              key={to}
              whileTap={{ scale: 0.92 }}
              onClick={() => navigate(to)}
              className="glass-card p-3.5 flex flex-col items-center gap-2 hover:shadow-md transition-shadow"
            >
              <div className={`p-2.5 rounded-2xl bg-gradient-to-br ${gradient} shadow-lg`}>
                <Icon size={18} className="text-white" />
              </div>
              <span className="text-[10px] font-bold text-foreground tracking-wide">{label}</span>
            </motion.button>
          ))}
        </div>
      </motion.div>

      {/* Feature Grid */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
        <p className="text-xs font-bold text-foreground mb-3 uppercase tracking-wider">Fitur Lainnya</p>
        <div className="grid grid-cols-2 gap-2.5">
          {features.map(({ label, to, icon: Icon, gradient }) => (
            <motion.button
              key={to}
              whileTap={{ scale: 0.95 }}
              onClick={() => navigate(to)}
              className="glass-card p-4 flex items-center gap-3 text-left group hover:shadow-md transition-shadow"
            >
              <div className={`p-2 rounded-xl bg-gradient-to-br ${gradient} shadow-md group-hover:shadow-lg transition-shadow`}>
                <Icon size={16} className="text-white" />
              </div>
              <span className="text-xs font-bold text-foreground">{label}</span>
            </motion.button>
          ))}
        </div>
      </motion.div>

      {/* Date Picker Dialog */}
      <Dialog open={showDatePicker} onOpenChange={setShowDatePicker}>
        <DialogContent className="glass-card border-border/50 max-w-sm">
          <DialogHeader>
            <DialogTitle className="font-script text-xl text-gradient-love">Tanggal Jadian 💕</DialogTitle>
            <DialogDescription>Kapan kalian mulai bersama?</DialogDescription>
          </DialogHeader>
          <input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="w-full px-4 py-3 rounded-xl bg-secondary/50 border border-border text-foreground text-sm outline-none focus:ring-2 focus:ring-primary"
          />
          <motion.button
            whileTap={{ scale: 0.98 }}
            onClick={saveStartDate}
            className="w-full py-3 rounded-xl bg-primary text-primary-foreground font-semibold text-sm"
          >
            Simpan 💝
          </motion.button>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Dashboard;
