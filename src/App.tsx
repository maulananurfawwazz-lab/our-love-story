import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, useNavigate, useLocation } from "react-router-dom";
import { motion } from "framer-motion";
import { useEffect, useRef } from "react";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import AppLayout from "@/components/AppLayout";
import LoginPage from "@/pages/LoginPage";
import Dashboard from "@/pages/Dashboard";
import GalleryPage from "@/pages/GalleryPage";
import ChatPage from "@/pages/ChatPage";
import EmotionsPage from "@/pages/EmotionsPage";
import ProfilePage from "@/pages/ProfilePage";
import TimelinePage from "@/pages/TimelinePage";
import PromisesPage from "@/pages/PromisesPage";
import SurprisesPage from "@/pages/SurprisesPage";
import FinancesPage from "@/pages/FinancesPage";
import GoalsPage from "@/pages/GoalsPage";
import PlaylistPage from "@/pages/PlaylistPage";
import NotFound from "@/pages/NotFound";
import { toast } from "sonner";

const queryClient = new QueryClient();

// ═══════════════════════════════════════════════════════════════
// NotificationRouter – Listens for Service Worker messages
// and navigates to the correct route using React Router.
// Also handles initial deep-link when opened from a closed state.
// ═══════════════════════════════════════════════════════════════
const NOTIFICATION_LABELS: Record<string, string> = {
  chat: 'Chat 💬',
  emotion: 'Perasaan 💗',
  memory: 'Kenangan 📸',
  surprise: 'Kejutan 🎁',
  'surprise-opened': 'Kejutan 💌',
  'surprise-reaction': 'Reaksi 💕',
  promise: 'Janji 🤞',
  'promise-request': 'Janji 💌',
  'promise-approved': 'Janji 💕',
  'promise-rejected': 'Janji 😢',
  playlist: 'Playlist 🎶',
  goal: 'Impian ✨',
  timeline: 'Timeline 📅',
  finance: 'Keuangan 💰',
};

const NotificationRouter = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const handledInitial = useRef(false);

  useEffect(() => {
    // ── Handle SW postMessage (app was already open) ──
    const handleMessage = (event: MessageEvent) => {
      if (event.data?.type === 'NOTIFICATION_CLICK') {
        const route = event.data.route || '/';
        const notifType = event.data.notifType || 'general';
        // Only navigate if we're not already on that route
        if (location.pathname !== route) {
          navigate(route);
        }
        const label = NOTIFICATION_LABELS[notifType] || '';
        if (label) {
          toast(`Dibuka dari notifikasi ${label}`, { duration: 2000 });
        }
      }
    };

    navigator.serviceWorker?.addEventListener('message', handleMessage);
    return () => {
      navigator.serviceWorker?.removeEventListener('message', handleMessage);
    };
  }, [navigate, location.pathname]);

  useEffect(() => {
    // ── Handle deep-link on cold start (app was closed, SW opened new window) ──
    // If the initial URL is a known app route (not /), show a toast
    if (handledInitial.current) return;
    handledInitial.current = true;

    const path = window.location.pathname;
    if (path !== '/' && path !== '/login') {
      // The route is already correct (BrowserRouter handles it)
      // Just show a subtle transition toast
      const label = Object.entries(NOTIFICATION_LABELS).find(
        ([, ]) => true // we check the path below
      );
      if (['/chat', '/gallery', '/emotions', '/promises', '/surprises', '/playlist', '/goals', '/timeline', '/finances', '/profile'].includes(path)) {
        toast('💌 Dibuka dari notifikasi', { duration: 2000 });
      }
    }
  }, []);

  return null;
};

const ProtectedRoutes = () => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen romantic-gradient flex items-center justify-center">
        <div className="text-center">
          <motion.div
            animate={{ scale: [0.9, 1.1, 0.9], rotate: [0, 5, -5, 0] }}
            transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
            className="text-5xl mb-4"
          >
            💕
          </motion.div>
          <p className="font-script text-2xl text-gradient-love mb-1">Our Journey</p>
          <p className="text-muted-foreground text-xs font-medium tracking-wider">memuat cerita kita...</p>
        </div>
      </div>
    );
  }

  if (!user) return <LoginPage />;

  return (
    <Routes>
      <Route element={<AppLayout />}>
        <Route path="/" element={<Dashboard />} />
        <Route path="/gallery" element={<GalleryPage />} />
        <Route path="/chat" element={<ChatPage />} />
        <Route path="/emotions" element={<EmotionsPage />} />
        <Route path="/profile" element={<ProfilePage />} />
        <Route path="/timeline" element={<TimelinePage />} />
        <Route path="/promises" element={<PromisesPage />} />
        <Route path="/surprises" element={<SurprisesPage />} />
        <Route path="/finances" element={<FinancesPage />} />
        <Route path="/goals" element={<GoalsPage />} />
        <Route path="/playlist" element={<PlaylistPage />} />
      </Route>
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <AuthProvider>
        <BrowserRouter>
          <NotificationRouter />
          <ProtectedRoutes />
        </BrowserRouter>
      </AuthProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
