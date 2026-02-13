import { NavLink, useLocation } from 'react-router-dom';
import { Home, Camera, MessageCircle, Heart, User } from 'lucide-react';
import { motion } from 'framer-motion';

const tabs = [
  { to: '/', icon: Home, label: 'Beranda', emoji: '🏠' },
  { to: '/gallery', icon: Camera, label: 'Galeri', emoji: '📸' },
  { to: '/chat', icon: MessageCircle, label: 'Chat', emoji: '💌' },
  { to: '/emotions', icon: Heart, label: 'Mood', emoji: '💕' },
  { to: '/profile', icon: User, label: 'Profil', emoji: '👤' },
];

const BottomNav = () => {
  const location = useLocation();

  return (
    <nav className="ios-bottom-nav">
      <div className="flex items-center justify-around py-1.5 px-2 max-w-lg mx-auto">
        {tabs.map(({ to, icon: Icon, label }) => {
          const active = location.pathname === to;
          return (
            <NavLink
              key={to}
              to={to}
              className="flex flex-col items-center gap-0.5 relative px-3 py-1.5"
            >
              <div className="relative">
                {active && (
                  <motion.div
                    layoutId="nav-glow"
                    className="absolute -inset-2.5 rounded-2xl"
                    style={{
                      background: 'radial-gradient(circle, hsl(340 70% 65% / 0.12) 0%, transparent 70%)',
                    }}
                    transition={{ type: 'spring', bounce: 0.2, duration: 0.5 }}
                  />
                )}
                <motion.div
                  animate={active ? { scale: [1, 1.15, 1] } : {}}
                  transition={{ duration: 0.3 }}
                >
                  <Icon
                    size={21}
                    className={`relative z-10 transition-colors duration-200 ${
                      active 
                        ? 'text-rose-500' 
                        : 'text-muted-foreground/60'
                    }`}
                    fill={active ? 'currentColor' : 'none'}
                    strokeWidth={active ? 1.5 : 1.8}
                  />
                </motion.div>
              </div>
              <span className={`text-[9px] font-semibold transition-colors duration-200 ${
                active ? 'text-rose-500' : 'text-muted-foreground/50'
              }`}>
                {label}
              </span>
            </NavLink>
          );
        })}
      </div>
    </nav>
  );
};

export default BottomNav;
