import { motion, AnimatePresence } from 'framer-motion';
import { Outlet } from 'react-router-dom';
import BottomNav from './BottomNav';
import HeartParticles from './HeartParticles';

const AppLayout = () => {
  return (
    <div className="min-h-screen romantic-gradient grain-overlay relative">
      <div className="hero-glow fixed inset-0 pointer-events-none z-0" />
      <HeartParticles />
      <main className="relative z-10 pb-20 safe-top">
        <AnimatePresence mode="wait">
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.25 }}
          >
            <Outlet />
          </motion.div>
        </AnimatePresence>
      </main>
      <BottomNav />
    </div>
  );
};

export default AppLayout;
