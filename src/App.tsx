import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
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

const queryClient = new QueryClient();

const ProtectedRoutes = () => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen romantic-gradient flex items-center justify-center">
        <div className="text-center">
          <div className="text-4xl animate-heartbeat mb-3">💕</div>
          <p className="text-muted-foreground font-medium">Loading...</p>
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
          <ProtectedRoutes />
        </BrowserRouter>
      </AuthProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
