import { useState } from 'react';
import { motion } from 'framer-motion';
import { useAuth } from '@/contexts/AuthContext';
import HeartParticles from '@/components/HeartParticles';

const USERS = [
  { name: 'Fawwaz', email: 'fawwaz@ourjourney.app', emoji: '👨' },
  { name: 'Anggun', email: 'anggun@ourjourney.app', emoji: '👩' },
];

const LoginPage = () => {
  const { signIn } = useAuth();
  const [selected, setSelected] = useState<number | null>(null);
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [shake, setShake] = useState(false);

  const handleLogin = async () => {
    if (!password || selected === null) return;
    setLoading(true);
    setError('');
    const { error: err } = await signIn(USERS[selected].email, password);
    if (err) {
      setError('Password salah 😢');
      setShake(true);
      setTimeout(() => setShake(false), 500);
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen romantic-gradient grain-overlay flex items-center justify-center p-6 relative overflow-hidden">
      <div className="hero-glow fixed inset-0 pointer-events-none" />
      <HeartParticles />
      
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5 }}
        className="glass-card p-8 w-full max-w-sm relative z-10"
      >
        <motion.div 
          className="text-center mb-8"
          initial={{ y: -20 }}
          animate={{ y: 0 }}
        >
          <motion.div 
            className="text-5xl mb-3"
            animate={{ scale: [1, 1.1, 1] }}
            transition={{ duration: 1.5, repeat: Infinity }}
          >
            💕
          </motion.div>
          <h1 className="font-script text-4xl text-gradient-love mb-2">Our Journey</h1>
          <p className="text-muted-foreground text-sm font-medium">Masuk sebagai siapa?</p>
        </motion.div>

        <div className="grid grid-cols-2 gap-3 mb-6">
          {USERS.map((u, i) => (
            <motion.button
              key={u.name}
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
              onClick={() => { setSelected(i); setError(''); }}
              className={`glass-card p-4 flex flex-col items-center gap-2 transition-all ${
                selected === i
                  ? 'ring-2 ring-primary shadow-lg'
                  : 'hover:shadow-md'
              }`}
            >
              <span className="text-3xl">{u.emoji}</span>
              <span className="font-semibold text-foreground">{u.name}</span>
            </motion.button>
          ))}
        </div>

        {selected !== null && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            className="space-y-4"
          >
            <div className={shake ? 'animate-shake' : ''}>
              <input
                type="password"
                placeholder="Masukkan password..."
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleLogin()}
                className="w-full px-4 py-3 rounded-xl bg-background/50 border border-border focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all text-foreground placeholder:text-muted-foreground"
              />
            </div>

            {error && (
              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="text-destructive text-sm text-center font-medium"
              >
                {error}
              </motion.p>
            )}

            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={handleLogin}
              disabled={loading || !password}
              className="w-full py-3 rounded-xl bg-primary text-primary-foreground font-semibold disabled:opacity-50 transition-all shadow-lg"
            >
              {loading ? (
                <motion.span
                  animate={{ rotate: 360 }}
                  transition={{ duration: 1, repeat: Infinity }}
                  className="inline-block"
                >
                  💕
                </motion.span>
              ) : (
                `Masuk sebagai ${USERS[selected].name}`
              )}
            </motion.button>
          </motion.div>
        )}
      </motion.div>
    </div>
  );
};

export default LoginPage;
