import { motion } from 'framer-motion';

const HeartParticles = () => {
  const hearts = Array.from({ length: 8 }, (_, i) => i);

  return (
    <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
      {hearts.map((i) => (
        <motion.div
          key={i}
          className="absolute text-primary/20"
          initial={{
            x: Math.random() * (typeof window !== 'undefined' ? window.innerWidth : 400),
            y: (typeof window !== 'undefined' ? window.innerHeight : 800) + 20,
            scale: 0.5 + Math.random() * 0.5,
          }}
          animate={{
            y: -50,
            rotate: [0, 15, -15, 0],
          }}
          transition={{
            duration: 8 + Math.random() * 6,
            repeat: Infinity,
            delay: Math.random() * 8,
            ease: 'linear',
          }}
          style={{ fontSize: 12 + Math.random() * 16 }}
        >
          ♥
        </motion.div>
      ))}
    </div>
  );
};

export default HeartParticles;
