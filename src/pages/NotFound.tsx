import { useLocation, useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { motion } from "framer-motion";

// Known valid routes — if user lands on a 404, check if it's close to one
const VALID_ROUTES: Record<string, string> = {
  '/chat': '/chat',
  '/gallery': '/gallery',
  '/emotions': '/emotions',
  '/profile': '/profile',
  '/timeline': '/timeline',
  '/promises': '/promises',
  '/surprises': '/surprises',
  '/finances': '/finances',
  '/goals': '/goals',
  '/playlist': '/playlist',
};

const NotFound = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [redirecting, setRedirecting] = useState(false);

  useEffect(() => {
    const path = location.pathname.toLowerCase();

    // Auto-redirect: if the path starts with a known route, go there
    // This handles cases like /surprises/123 → /surprises
    for (const [prefix, route] of Object.entries(VALID_ROUTES)) {
      if (path.startsWith(prefix)) {
        setRedirecting(true);
        navigate(route, { replace: true });
        return;
      }
    }

    console.warn("[404] Route not found:", location.pathname);
  }, [location.pathname, navigate]);

  if (redirecting) {
    return (
      <div className="min-h-screen romantic-gradient flex items-center justify-center">
        <motion.div
          animate={{ scale: [0.9, 1.1, 0.9] }}
          transition={{ duration: 1.5, repeat: Infinity }}
          className="text-4xl"
        >
          💕
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen romantic-gradient flex items-center justify-center px-6">
      <div className="text-center space-y-4">
        <motion.div
          animate={{ rotate: [0, -10, 10, 0] }}
          transition={{ duration: 2, repeat: Infinity }}
          className="text-5xl"
        >
          💌
        </motion.div>
        <h1 className="font-script text-2xl text-gradient-love">
          Halaman tidak ditemukan
        </h1>
        <p className="text-sm text-muted-foreground max-w-xs mx-auto">
          Sepertinya kamu tersesat… tapi jangan khawatir, cerita kita masih ada di sini 💕
        </p>
        <motion.button
          whileTap={{ scale: 0.95 }}
          onClick={() => navigate('/', { replace: true })}
          className="px-6 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-semibold"
        >
          Kembali ke Beranda
        </motion.button>
      </div>
    </div>
  );
};

export default NotFound;
