// ═══════════════════════════════════════════════════════════════
// IOSInstallPrompt – Shows install instructions on iOS Safari
// Only appears when:
//   1. Running on iOS Safari (not in PWA standalone mode)
//   2. User hasn't dismissed it before
// ═══════════════════════════════════════════════════════════════

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Share, Plus } from 'lucide-react';

const DISMISS_KEY = 'ios-install-prompt-dismissed';

export default function IOSInstallPrompt() {
  const [show, setShow] = useState(false);

  useEffect(() => {
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
    const isStandalone =
      window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as any).standalone === true;
    const dismissed = localStorage.getItem(DISMISS_KEY);

    if (isIOS && !isStandalone && !dismissed) {
      // Show after a short delay so it doesn't flash during splash
      const timer = setTimeout(() => setShow(true), 3000);
      return () => clearTimeout(timer);
    }
  }, []);

  const dismiss = () => {
    setShow(false);
    localStorage.setItem(DISMISS_KEY, 'true');
  };

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ opacity: 0, y: 80 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 80 }}
          transition={{ type: 'spring', bounce: 0.3 }}
          className="fixed bottom-20 left-4 right-4 z-[60] max-w-sm mx-auto"
        >
          <div className="relative glass-card p-5 rounded-2xl border border-primary/20 shadow-xl shadow-primary/10">
            {/* Close button */}
            <button
              onClick={dismiss}
              className="absolute top-3 right-3 p-1.5 rounded-full bg-secondary/80 text-muted-foreground hover:text-foreground"
            >
              <X size={14} />
            </button>

            {/* Content */}
            <div className="pr-6">
              <p className="font-script text-lg text-gradient-love">
                Install Our Journey 💕
              </p>
              <p className="text-[11px] text-muted-foreground mt-1.5 leading-relaxed">
                Tambahkan ke Home Screen untuk pengalaman terbaik dan notifikasi push dari pasanganmu!
              </p>
            </div>

            {/* Steps */}
            <div className="mt-4 space-y-2.5">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-blue-500/10 flex items-center justify-center flex-shrink-0">
                  <Share size={14} className="text-blue-500" />
                </div>
                <p className="text-xs text-foreground">
                  Tap tombol{' '}
                  <span className="inline-flex items-center gap-0.5 text-blue-500 font-medium">
                    Share <Share size={10} />
                  </span>{' '}
                  di bawah Safari
                </p>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                  <Plus size={14} className="text-primary" />
                </div>
                <p className="text-xs text-foreground">
                  Pilih{' '}
                  <span className="font-medium text-primary">
                    "Add to Home Screen"
                  </span>
                </p>
              </div>
            </div>

            {/* Tiny triangle pointing down (speech bubble style) */}
            <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 w-4 h-4 rotate-45 bg-card border-r border-b border-primary/20" />
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
