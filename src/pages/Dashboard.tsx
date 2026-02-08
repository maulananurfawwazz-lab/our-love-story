import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Camera, Heart, MessageCircle, Plus, Calendar, LogOut } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { differenceInDays } from 'date-fns';

const COUPLE_START = new Date('2024-01-01'); // Adjust this date

const Dashboard = () => {
  const { profile, signOut } = useAuth();
  const navigate = useNavigate();
  const [daysTogether, setDaysTogether] = useState(0);
  const [todayEmotions, setTodayEmotions] = useState<string[]>([]);
  const [latestMemory, setLatestMemory] = useState<{ description: string; image_url: string | null } | null>(null);

  useEffect(() => {
    setDaysTogether(differenceInDays(new Date(), COUPLE_START));
  }, []);

  useEffect(() => {
    if (!profile?.couple_id) return;

    const fetchData = async () => {
      const today = new Date().toISOString().split('T')[0];
      
      const [emotionsRes, memoryRes] = await Promise.all([
        supabase
          .from('emotions')
          .select('emotion_type')
          .eq('couple_id', profile.couple_id)
          .eq('date', today),
        supabase
          .from('memories')
          .select('description, image_url')
          .eq('couple_id', profile.couple_id)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle(),
      ]);

      if (emotionsRes.data) setTodayEmotions(emotionsRes.data.map(e => e.emotion_type));
      if (memoryRes.data) setLatestMemory(memoryRes.data);
    };

    fetchData();
  }, [profile?.couple_id]);

  const quickActions = [
    { icon: Camera, label: 'Kenangan', to: '/gallery', color: 'bg-primary/10 text-primary' },
    { icon: Heart, label: 'Mood', to: '/emotions', color: 'bg-accent/10 text-accent' },
    { icon: MessageCircle, label: 'Chat', to: '/chat', color: 'bg-primary/10 text-primary' },
    { icon: Calendar, label: 'Timeline', to: '/timeline', color: 'bg-accent/10 text-accent' },
  ];

  return (
    <div className="px-5 py-6 max-w-lg mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-muted-foreground text-sm font-medium">Halo,</p>
          <h1 className="font-script text-2xl text-gradient-love">{profile?.name} 💕</h1>
        </div>
        <button onClick={signOut} className="p-2 rounded-xl hover:bg-secondary transition-colors">
          <LogOut size={18} className="text-muted-foreground" />
        </button>
      </div>

      {/* Days Counter */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="glass-card p-6 text-center"
      >
        <p className="text-muted-foreground text-sm mb-1 font-medium">Hari Bersama</p>
        <motion.div className="flex items-center justify-center gap-1">
          {String(daysTogether).split('').map((digit, i) => (
            <motion.span
              key={i}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1 }}
              className="font-script text-5xl text-gradient-love"
            >
              {digit}
            </motion.span>
          ))}
        </motion.div>
        <p className="text-muted-foreground text-xs mt-2">Anggun & Fawwaz</p>
        <motion.span
          className="inline-block mt-2 text-2xl"
          animate={{ scale: [1, 1.2, 1] }}
          transition={{ duration: 1.5, repeat: Infinity }}
        >
          💝
        </motion.span>
      </motion.div>

      {/* Today's Mood */}
      {todayEmotions.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="glass-card p-4"
        >
          <p className="text-sm font-semibold text-foreground mb-2">Mood Hari Ini</p>
          <div className="flex gap-2 flex-wrap">
            {todayEmotions.map((e, i) => (
              <span key={i} className="px-3 py-1 rounded-full bg-primary/10 text-primary text-sm font-medium">
                {e}
              </span>
            ))}
          </div>
        </motion.div>
      )}

      {/* Latest Memory */}
      {latestMemory && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="glass-card overflow-hidden cursor-pointer"
          onClick={() => navigate('/gallery')}
        >
          {latestMemory.image_url && (
            <img
              src={latestMemory.image_url}
              alt="Memory"
              className="w-full h-40 object-cover"
            />
          )}
          <div className="p-4">
            <p className="text-xs text-muted-foreground font-medium mb-1">Kenangan Terbaru</p>
            <p className="text-sm text-foreground">{latestMemory.description}</p>
          </div>
        </motion.div>
      )}

      {/* Quick Actions */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
      >
        <p className="text-sm font-semibold text-foreground mb-3">Menu Cepat</p>
        <div className="grid grid-cols-4 gap-3">
          {quickActions.map(({ icon: Icon, label, to, color }) => (
            <motion.button
              key={to}
              whileTap={{ scale: 0.95 }}
              onClick={() => navigate(to)}
              className="glass-card p-3 flex flex-col items-center gap-2"
            >
              <div className={`p-2 rounded-xl ${color}`}>
                <Icon size={18} />
              </div>
              <span className="text-xs font-medium text-foreground">{label}</span>
            </motion.button>
          ))}
        </div>
      </motion.div>

      {/* More Features */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
        className="grid grid-cols-2 gap-3"
      >
        {[
          { label: 'Janji Kita', to: '/promises', emoji: '🤞' },
          { label: 'Kejutan', to: '/surprises', emoji: '🎁' },
          { label: 'Keuangan', to: '/finances', emoji: '💰' },
          { label: 'Masa Depan', to: '/goals', emoji: '🏡' },
          { label: 'Playlist', to: '/playlist', emoji: '🎵' },
        ].map(({ label, to, emoji }) => (
          <motion.button
            key={to}
            whileTap={{ scale: 0.97 }}
            onClick={() => navigate(to)}
            className="glass-card p-4 flex items-center gap-3 text-left"
          >
            <span className="text-2xl">{emoji}</span>
            <span className="text-sm font-semibold text-foreground">{label}</span>
          </motion.button>
        ))}
      </motion.div>
    </div>
  );
};

export default Dashboard;
