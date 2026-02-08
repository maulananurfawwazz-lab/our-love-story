import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Edit2, Save } from 'lucide-react';

const ProfilePage = () => {
  const { user, profile, signOut } = useAuth();
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(profile?.name ?? '');
  const [bio, setBio] = useState(profile?.bio ?? '');
  const [saving, setSaving] = useState(false);
  const [avatarUrl, setAvatarUrl] = useState(profile?.avatar_url ?? '');

  useEffect(() => {
    if (profile) {
      setName(profile.name);
      setBio(profile.bio ?? '');
      setAvatarUrl(profile.avatar_url ?? '');
    }
  }, [profile]);

  const handleSave = async () => {
    if (!user) return;
    setSaving(true);
    await supabase
      .from('profiles')
      .update({ name, bio, avatar_url: avatarUrl || null })
      .eq('user_id', user.id);
    setSaving(false);
    setEditing(false);
  };

  const handleAvatarUpload = async (file: File) => {
    const ext = file.name.split('.').pop();
    const path = `avatars/${user?.id}.${ext}`;
    const { error } = await supabase.storage.from('couple-uploads').upload(path, file, { upsert: true });
    if (!error) {
      const { data } = supabase.storage.from('couple-uploads').getPublicUrl(path);
      setAvatarUrl(data.publicUrl);
    }
  };

  return (
    <div className="px-5 py-6 max-w-lg mx-auto space-y-6">
      <h1 className="font-script text-2xl text-gradient-love text-center">Profil 💕</h1>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="glass-card p-6 flex flex-col items-center"
      >
        {/* Avatar */}
        <label className="relative cursor-pointer mb-4">
          <div className="w-24 h-24 rounded-full overflow-hidden border-4 border-primary/30 avatar-glow">
            {avatarUrl ? (
              <img src={avatarUrl} alt="Avatar" className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full bg-secondary flex items-center justify-center text-3xl">
                {profile?.name?.[0] ?? '💕'}
              </div>
            )}
          </div>
          <input
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => e.target.files?.[0] && handleAvatarUpload(e.target.files[0])}
          />
          <div className="absolute bottom-0 right-0 p-1.5 rounded-full bg-primary text-primary-foreground">
            <Edit2 size={12} />
          </div>
        </label>

        {editing ? (
          <div className="w-full space-y-3">
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3 py-2 rounded-xl bg-background/50 border border-border text-sm outline-none text-center text-foreground"
              placeholder="Nama"
            />
            <textarea
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              className="w-full px-3 py-2 rounded-xl bg-background/50 border border-border text-sm outline-none resize-none h-20 text-foreground"
              placeholder="Bio..."
            />
            <motion.button
              whileTap={{ scale: 0.98 }}
              onClick={handleSave}
              disabled={saving}
              className="w-full py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-semibold flex items-center justify-center gap-2"
            >
              <Save size={14} />
              {saving ? 'Menyimpan...' : 'Simpan'}
            </motion.button>
          </div>
        ) : (
          <>
            <h2 className="text-xl font-semibold text-foreground">{profile?.name}</h2>
            <p className="text-sm text-muted-foreground mt-1">{bio || 'Belum ada bio'}</p>
            <motion.button
              whileTap={{ scale: 0.98 }}
              onClick={() => setEditing(true)}
              className="mt-4 px-4 py-2 rounded-xl bg-secondary text-secondary-foreground text-sm font-medium flex items-center gap-2"
            >
              <Edit2 size={14} />
              Edit Profil
            </motion.button>
          </>
        )}
      </motion.div>

      <motion.button
        whileTap={{ scale: 0.98 }}
        onClick={signOut}
        className="w-full py-3 rounded-xl border border-destructive text-destructive text-sm font-semibold"
      >
        Keluar 👋
      </motion.button>
    </div>
  );
};

export default ProfilePage;
