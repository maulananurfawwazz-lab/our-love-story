import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { User } from '@supabase/supabase-js';

interface Profile {
  id: string;
  name: string;
  couple_id: string;
  avatar_url: string | null;
  bio: string | null;
}

interface CoupleInfo {
  start_date: string | null;
}

interface AuthContextType {
  user: User | null;
  profile: Profile | null;
  partner: Profile | null;
  coupleInfo: CoupleInfo | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: string | null }>;
  signOut: () => Promise<void>;
  refreshCoupleInfo: () => Promise<void>;
  refreshProfile: () => Promise<void>;
  updateLocalProfile: (patch: Partial<Profile>) => void;
}

const AuthContext = createContext<AuthContextType | null>(null);

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [partner, setPartner] = useState<Profile | null>(null);
  const [coupleInfo, setCoupleInfo] = useState<CoupleInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [profileChannel, setProfileChannel] = useState<any | null>(null);

  const fetchProfile = async (userId: string) => {
    try {
      const { data } = await supabase
        .from('profiles')
        .select('id, name, couple_id, avatar_url, bio')
        .eq('user_id', userId)
        .maybeSingle();
      setProfile(data);

      if (data?.couple_id) {
        // Fetch partner (best-effort)
        try {
          const { data: partnerData } = await supabase
            .from('profiles')
            .select('id, name, couple_id, avatar_url, bio')
            .eq('couple_id', data.couple_id)
            .neq('user_id', userId)
            .maybeSingle();
          setPartner(partnerData);
        } catch (e) {
          console.error('Failed to fetch partner profile', e);
        }

        // Fetch couple info (best-effort)
        try {
          await fetchCoupleInfo(data.couple_id);
        } catch (e) {
          console.error('Failed to fetch couple info', e);
        }
      }
    } catch (e) {
      console.error('Failed to fetch profile', e);
    }
  };

  const fetchCoupleInfo = async (coupleId: string) => {
    const { data } = await supabase
      .from('couples')
      .select('start_date')
      .eq('id', coupleId)
      .maybeSingle();
    setCoupleInfo(data);
  };

  const refreshCoupleInfo = async () => {
    if (profile?.couple_id) await fetchCoupleInfo(profile.couple_id);
  };

  const refreshProfile = async () => {
    if (user) await fetchProfile(user.id);
  };

  const updateLocalProfile = (patch: Partial<Profile>) => {
    setProfile(prev => {
      if (!prev) return (patch as Profile) ?? null;
      return { ...prev, ...patch };
    });
  };

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_, session) => {
      const u = session?.user ?? null;
      setUser(u);
      if (u) {
        // fetch profile in background — don't block rendering
        fetchProfile(u.id).catch((e) => console.error('fetchProfile error', e));
      } else {
        setProfile(null);
        setPartner(null);
        setCoupleInfo(null);
      }
      // mark loading false immediately so UI can render; profile will hydrate when ready
      setLoading(false);
    });

    supabase.auth.getSession().then(({ data: { session } }) => {
      const u = session?.user ?? null;
      setUser(u);
      if (u) {
        // hydrate profile but don't block
        fetchProfile(u.id).catch((e) => console.error('fetchProfile error', e));
        setLoading(false);
      } else {
        setLoading(false);
      }
    }).catch((e) => {
      console.error('getSession error', e);
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  // subscribe to profile changes for the couple so partner sees updates in realtime
  useEffect(() => {
    if (!profile?.couple_id || !user) return;

    // clean up previous channel
    if (profileChannel) {
      try { profileChannel.unsubscribe(); } catch (e) { /* ignore */ }
    }

    const channel = supabase
      .channel(`profiles:couple=${profile.couple_id}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'profiles', filter: `couple_id=eq.${profile.couple_id}` }, async () => {
        // refresh both profiles when any change occurs
        if (user) await fetchProfile(user.id);
      })
      .subscribe();

    setProfileChannel(channel);

    return () => {
      try { channel.unsubscribe(); } catch (e) { /* ignore */ }
    };
  }, [profile?.couple_id, user]);

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return { error: error?.message ?? null };
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setProfile(null);
    setPartner(null);
    setCoupleInfo(null);
  };

  return (
    <AuthContext.Provider value={{ user, profile, partner, coupleInfo, loading, signIn, signOut, refreshCoupleInfo, refreshProfile, updateLocalProfile }}>
      {children}
    </AuthContext.Provider>
  );
};
