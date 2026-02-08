import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Plus, Image as ImageIcon } from 'lucide-react';
import { format } from 'date-fns';
import { id as localeId } from 'date-fns/locale';

interface Memory {
  id: string;
  image_url: string | null;
  description: string | null;
  date: string;
  created_at: string;
}

const GalleryPage = () => {
  const { user, profile } = useAuth();
  const [memories, setMemories] = useState<Memory[]>([]);
  const [showAdd, setShowAdd] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [desc, setDesc] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [file, setFile] = useState<File | null>(null);

  useEffect(() => {
    if (!profile?.couple_id) return;
    const fetch = async () => {
      const { data } = await supabase
        .from('memories')
        .select('*')
        .eq('couple_id', profile.couple_id)
        .order('date', { ascending: false });
      if (data) setMemories(data);
    };
    fetch();
  }, [profile?.couple_id]);

  const handleUpload = async () => {
    if (!profile?.couple_id || !user) return;
    setUploading(true);

    let imageUrl: string | null = null;
    if (file) {
      const ext = file.name.split('.').pop();
      const path = `memories/${Date.now()}.${ext}`;
      const { error } = await supabase.storage.from('couple-uploads').upload(path, file);
      if (!error) {
        const { data: urlData } = supabase.storage.from('couple-uploads').getPublicUrl(path);
        imageUrl = urlData.publicUrl;
      }
    }

    await supabase.from('memories').insert({
      couple_id: profile.couple_id,
      created_by: user.id,
      image_url: imageUrl,
      description: desc || null,
      date,
    });

    setShowAdd(false);
    setDesc('');
    setFile(null);
    
    // Refresh
    const { data } = await supabase
      .from('memories')
      .select('*')
      .eq('couple_id', profile.couple_id)
      .order('date', { ascending: false });
    if (data) setMemories(data);
    setUploading(false);
  };

  return (
    <div className="px-5 py-6 max-w-lg mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h1 className="font-script text-2xl text-gradient-love">Kenangan Kita 📸</h1>
        <motion.button
          whileTap={{ scale: 0.9 }}
          onClick={() => setShowAdd(!showAdd)}
          className="p-2.5 rounded-xl bg-primary text-primary-foreground"
        >
          <Plus size={18} />
        </motion.button>
      </div>

      {showAdd && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          className="glass-card p-4 mb-6 space-y-3"
        >
          <label className="flex items-center gap-3 p-3 rounded-xl border border-dashed border-border cursor-pointer hover:bg-secondary/50 transition-colors">
            <ImageIcon size={20} className="text-muted-foreground" />
            <span className="text-sm text-muted-foreground">
              {file ? file.name : 'Pilih foto...'}
            </span>
            <input
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            />
          </label>
          <textarea
            placeholder="Ceritakan kenangan ini..."
            value={desc}
            onChange={(e) => setDesc(e.target.value)}
            className="w-full px-3 py-2 rounded-xl bg-background/50 border border-border text-sm outline-none resize-none h-20 text-foreground placeholder:text-muted-foreground"
          />
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="w-full px-3 py-2 rounded-xl bg-background/50 border border-border text-sm outline-none text-foreground"
          />
          <motion.button
            whileTap={{ scale: 0.98 }}
            onClick={handleUpload}
            disabled={uploading}
            className="w-full py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-semibold disabled:opacity-50"
          >
            {uploading ? 'Mengunggah...' : 'Simpan Kenangan 💕'}
          </motion.button>
        </motion.div>
      )}

      <div className="grid grid-cols-2 gap-3">
        {memories.map((m, i) => (
          <motion.div
            key={m.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05 }}
            className="glass-card overflow-hidden"
          >
            {m.image_url ? (
              <img src={m.image_url} alt="" className="w-full h-32 object-cover" />
            ) : (
              <div className="w-full h-32 bg-secondary/50 flex items-center justify-center">
                <ImageIcon size={24} className="text-muted-foreground" />
              </div>
            )}
            <div className="p-3">
              {m.description && (
                <p className="text-xs text-foreground line-clamp-2 mb-1">{m.description}</p>
              )}
              <p className="text-[10px] text-muted-foreground">
                {format(new Date(m.date), 'dd MMM yyyy', { locale: localeId })}
              </p>
            </div>
          </motion.div>
        ))}
      </div>

      {memories.length === 0 && (
        <div className="text-center py-16">
          <p className="text-4xl mb-3">📷</p>
          <p className="text-muted-foreground text-sm">Belum ada kenangan. Yuk tambah!</p>
        </div>
      )}
    </div>
  );
};

export default GalleryPage;
