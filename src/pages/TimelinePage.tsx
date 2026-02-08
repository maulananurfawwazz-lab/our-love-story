import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';

interface TimelineEvent {
  id: string;
  title: string;
  description: string | null;
  date: string;
  image_url: string | null;
}

const TimelinePage = () => {
  const { profile } = useAuth();
  const [events, setEvents] = useState<TimelineEvent[]>([]);

  useEffect(() => {
    if (!profile?.couple_id) return;
    supabase
      .from('timeline_events')
      .select('*')
      .eq('couple_id', profile.couple_id)
      .order('date', { ascending: true })
      .then(({ data }) => { if (data) setEvents(data); });
  }, [profile?.couple_id]);

  return (
    <div className="px-5 py-6 max-w-lg mx-auto">
      <h1 className="font-script text-2xl text-gradient-love mb-6">Love Timeline 💕</h1>

      {events.length === 0 ? (
        <div className="text-center py-16">
          <p className="text-4xl mb-3">📅</p>
          <p className="text-muted-foreground text-sm">Belum ada momen di timeline</p>
        </div>
      ) : (
        <div className="relative">
          {/* Vertical line */}
          <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-primary/20" />
          
          <div className="space-y-6">
            {events.map((event, i) => (
              <motion.div
                key={event.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.1 }}
                className="flex gap-4"
              >
                <div className="relative z-10 mt-1">
                  <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center">
                    <span className="text-primary-foreground text-xs">💝</span>
                  </div>
                </div>
                <div className="glass-card p-4 flex-1">
                  <p className="text-xs text-muted-foreground mb-1">{event.date}</p>
                  <h3 className="font-semibold text-foreground text-sm">{event.title}</h3>
                  {event.description && (
                    <p className="text-xs text-muted-foreground mt-1">{event.description}</p>
                  )}
                  {event.image_url && (
                    <img src={event.image_url} alt="" className="w-full h-32 object-cover rounded-lg mt-2" />
                  )}
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default TimelinePage;
