import { NavLink, useLocation } from 'react-router-dom';
import { Home, Camera, MessageCircle, Heart, User } from 'lucide-react';
import { motion } from 'framer-motion';

const tabs = [
  { to: '/', icon: Home, label: 'Home' },
  { to: '/gallery', icon: Camera, label: 'Galeri' },
  { to: '/chat', icon: MessageCircle, label: 'Chat' },
  { to: '/emotions', icon: Heart, label: 'Mood' },
  { to: '/profile', icon: User, label: 'Profil' },
];

const BottomNav = () => {
  const location = useLocation();

  return (
    <nav className="ios-bottom-nav">
      <div className="flex items-center justify-around py-2 px-4 max-w-lg mx-auto">
        {tabs.map(({ to, icon: Icon, label }) => {
          const active = location.pathname === to;
          return (
            <NavLink
              key={to}
              to={to}
              className="flex flex-col items-center gap-0.5 relative px-3 py-1"
            >
              <div className="relative">
                {active && (
                  <motion.div
                    layoutId="nav-indicator"
                    className="absolute -inset-2 rounded-xl bg-primary/10"
                    transition={{ type: 'spring', bounce: 0.25, duration: 0.4 }}
                  />
                )}
                <Icon
                  size={22}
                  className={active ? 'text-primary relative z-10' : 'text-muted-foreground relative z-10'}
                />
              </div>
              <span className={`text-[10px] font-medium ${active ? 'text-primary' : 'text-muted-foreground'}`}>
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
