import { motion } from 'framer-motion';

const HeartParticles = () => {
  const particles = Array.from({ length: 12 }, (_, i) => i);
  const symbols = ['♥', '✦', '·', '♥', '✧', '♥', '·', '✦', '♥', '✧', '·', '♥'];

  return (
    <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
      {particles.map((i) => {
        const size = 8 + Math.random() * 14;
        const startX = Math.random() * (typeof window !== 'undefined' ? window.innerWidth : 400);
        const duration = 10 + Math.random() * 10;
        const delay = Math.random() * 12;
        const drift = (Math.random() - 0.5) * 60;

        return (
          <motion.div
            key={i}
            className="absolute text-rose-300/15"
            initial={{
              x: startX,
              y: (typeof window !== 'undefined' ? window.innerHeight : 800) + 20,
              scale: 0.3 + Math.random() * 0.7,
              opacity: 0,
            }}
            animate={{
              y: -60,
              x: startX + drift,
              rotate: [0, 180, 360],
              opacity: [0, 0.6, 0.4, 0],
            }}
            transition={{
              duration,
              repeat: Infinity,
              delay,
              ease: 'linear',
            }}
            style={{ fontSize: size }}
          >
            {symbols[i]}
          </motion.div>
        );
      })}
    </div>
  );
};

export default HeartParticles;
