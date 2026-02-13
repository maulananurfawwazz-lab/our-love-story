import { motion, AnimatePresence } from 'framer-motion';
import { Outlet, useLocation } from 'react-router-dom';
import BottomNav from './BottomNav';
import HeartParticles from './HeartParticles';
import IOSInstallPrompt from './IOSInstallPrompt';

const AppLayout = () => {
  const location = useLocation();

  return (
    <div className="min-h-screen romantic-gradient grain-overlay relative">
      {/* Ambient glow layers for dreamy feel */}
      <div className="fixed inset-0 pointer-events-none z-0">
        <div className="absolute top-0 left-1/4 w-80 h-80 bg-rose-200/20 rounded-full blur-[100px]" />
        <div className="absolute bottom-1/3 right-0 w-64 h-64 bg-pink-200/15 rounded-full blur-[80px]" />
        <div className="absolute top-1/2 left-0 w-48 h-48 bg-fuchsia-200/10 rounded-full blur-[60px]" />
      </div>
      <HeartParticles />
      <main className="relative z-10 pb-20 safe-top">
        <AnimatePresence mode="wait">
          <motion.div
            key={location.pathname}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.3, ease: [0.25, 0.1, 0.25, 1] }}
          >
            <Outlet />
          </motion.div>
        </AnimatePresence>
      </main>
      <BottomNav />
      <IOSInstallPrompt />
    </div>
  );
};

export default AppLayout;
