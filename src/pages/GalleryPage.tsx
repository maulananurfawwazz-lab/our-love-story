import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Plus, Image as ImageIcon, Trash2, ChevronLeft, ChevronRight, Camera } from 'lucide-react';
import { format } from 'date-fns';
import { id as localeId } from 'date-fns/locale';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from '@/components/ui/dialog';

interface Memory {
  id: string;
  image_url: string | null;
  description: string | null;
  date: string;
  created_at: string;
  created_by: string;
}

const GalleryPage = () => {
  const { user, profile } = useAuth();
  const [memories, setMemories] = useState<Memory[]>([]);
  const [showAdd, setShowAdd] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [desc, setDesc] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [selectedMemory, setSelectedMemory] = useState<Memory | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);

  useEffect(() => {
    if (!profile?.couple_id) return;
    supabase
      .from('memories')
      .select('*')
      .eq('couple_id', profile.couple_id)
      .order('date', { ascending: false })
      .then(({ data }) => { if (data) setMemories(data); });
  }, [profile?.couple_id]);

  const handleFileChange = (f: File | null) => {
    setFile(f);
    if (f) {
      const reader = new FileReader();
      reader.onload = (e) => setPreview(e.target?.result as string);
      reader.readAsDataURL(f);
    } else {
      setPreview(null);
    }
  };

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
    await supabase.from('memories').insert({ couple_id: profile.couple_id, created_by: user.id, image_url: imageUrl, description: desc || null, date });
    setShowAdd(false); setDesc(''); setFile(null); setPreview(null);
    const { data } = await supabase.from('memories').select('*').eq('couple_id', profile.couple_id).order('date', { ascending: false });
    if (data) setMemories(data);
    setUploading(false);
  };

  const handleDelete = async (id: string) => {
    await supabase.from('memories').delete().eq('id', id);
    setMemories(prev => prev.filter(m => m.id !== id));
    setConfirmDelete(null);
    setSelectedMemory(null);
  };

  const selectedIdx = memories.findIndex(m => m.id === selectedMemory?.id);
  const goNext = () => { if (selectedIdx < memories.length - 1) setSelectedMemory(memories[selectedIdx + 1]); };
  const goPrev = () => { if (selectedIdx > 0) setSelectedMemory(memories[selectedIdx - 1]); };

  return (
    <div className="px-5 py-6 max-w-lg mx-auto pb-24">
      <div className="flex items-center justify-between mb-5">
        <div>
          <h1 className="font-script text-2xl text-gradient-love">Kenangan Kita</h1>
          <p className="text-[10px] text-muted-foreground mt-0.5">{memories.length} kenangan tersimpan 📸</p>
        </div>
        <motion.button whileTap={{ scale: 0.9 }} onClick={() => setShowAdd(!showAdd)} className="p-2.5 rounded-2xl bg-primary text-primary-foreground shadow-lg">
          <Plus size={18} />
        </motion.button>
      </div>

      {/* Add Form */}
      <AnimatePresence>
        {showAdd && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="glass-card p-4 mb-5 space-y-3 overflow-hidden">
            <label className="flex flex-col items-center gap-2 p-4 rounded-2xl border-2 border-dashed border-primary/30 cursor-pointer hover:bg-primary/5 transition-colors">
              {preview ? (
                <img src={preview} className="w-full h-36 object-cover rounded-xl" />
              ) : (
                <>
                  <div className="p-3 rounded-full bg-primary/10"><ImageIcon size={24} className="text-primary" /></div>
                  <span className="text-xs text-muted-foreground font-medium">Tap untuk pilih foto</span>
                </>
              )}
              <input type="file" accept="image/*" className="hidden" onChange={(e) => handleFileChange(e.target.files?.[0] ?? null)} />
            </label>
            <textarea placeholder="Ceritakan kenangan ini... 💕" value={desc} onChange={(e) => setDesc(e.target.value)} className="w-full px-4 py-3 rounded-xl bg-secondary/50 border border-border text-sm outline-none resize-none h-20 text-foreground placeholder:text-muted-foreground focus:ring-2 focus:ring-primary" />
            <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="w-full px-4 py-3 rounded-xl bg-secondary/50 border border-border text-sm outline-none text-foreground focus:ring-2 focus:ring-primary" />
            <motion.button whileTap={{ scale: 0.98 }} onClick={handleUpload} disabled={uploading} className="w-full py-3 rounded-xl bg-primary text-primary-foreground text-sm font-bold disabled:opacity-50 shadow-lg">
              {uploading ? 'Mengunggah...' : 'Simpan Kenangan 💕'}
            </motion.button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Gallery Grid */}
      <div className="grid grid-cols-2 gap-3">
        {memories.map((m, i) => (
          <motion.div
            key={m.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.04 }}
            className="glass-card overflow-hidden group cursor-pointer"
            onClick={() => setSelectedMemory(m)}
          >
            {m.image_url ? (
              <div className="relative overflow-hidden">
                <img src={m.image_url} alt="" className="w-full h-36 object-cover transition-transform duration-500 group-hover:scale-110" />
                <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
              </div>
            ) : (
              <div className="w-full h-36 bg-gradient-to-br from-primary/10 to-accent/10 flex items-center justify-center">
                <ImageIcon size={28} className="text-muted-foreground/50" />
              </div>
            )}
            <div className="p-3">
              {m.description && <p className="text-xs text-foreground line-clamp-2 font-medium mb-1">{m.description}</p>}
              <p className="text-[10px] text-muted-foreground font-medium">{format(new Date(m.date), 'dd MMM yyyy', { locale: localeId })}</p>
            </div>
          </motion.div>
        ))}
      </div>

      {memories.length === 0 && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center py-20">
          <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
            <Camera size={32} className="text-primary" />
          </div>
          <p className="text-foreground font-semibold text-sm">Belum ada kenangan</p>
          <p className="text-muted-foreground text-xs mt-1">Yuk mulai abadikan momen bersama 💕</p>
        </motion.div>
      )}

      {/* Memory Detail Popup */}
      <Dialog open={!!selectedMemory} onOpenChange={() => { setSelectedMemory(null); setConfirmDelete(null); }}>
        <DialogContent className="p-0 overflow-hidden max-w-md border-0 bg-card rounded-3xl">
          <DialogHeader className="sr-only">
            <DialogTitle>Detail Kenangan</DialogTitle>
            <DialogDescription>Lihat detail kenangan</DialogDescription>
          </DialogHeader>
          {selectedMemory && (
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ type: 'spring', bounce: 0.2 }}>
              {selectedMemory.image_url && (
                <div className="relative">
                  <img src={selectedMemory.image_url} alt="" className="w-full h-64 object-cover" />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-black/20" />
                  {selectedIdx > 0 && (
                    <button onClick={(e) => { e.stopPropagation(); goPrev(); }} className="absolute left-2 top-1/2 -translate-y-1/2 p-2 rounded-full bg-black/40 text-white backdrop-blur-sm">
                      <ChevronLeft size={20} />
                    </button>
                  )}
                  {selectedIdx < memories.length - 1 && (
                    <button onClick={(e) => { e.stopPropagation(); goNext(); }} className="absolute right-2 top-1/2 -translate-y-1/2 p-2 rounded-full bg-black/40 text-white backdrop-blur-sm">
                      <ChevronRight size={20} />
                    </button>
                  )}
                </div>
              )}
              <div className="p-5 space-y-3">
                <p className="text-xs text-muted-foreground font-medium">
                  {format(new Date(selectedMemory.date), 'EEEE, dd MMMM yyyy', { locale: localeId })}
                </p>
                {selectedMemory.description && (
                  <p className="text-sm text-foreground leading-relaxed">{selectedMemory.description}</p>
                )}
                {selectedMemory.created_by === user?.id && (
                  <div className="pt-2">
                    {confirmDelete === selectedMemory.id ? (
                      <div className="flex gap-2">
                        <motion.button whileTap={{ scale: 0.95 }} onClick={() => handleDelete(selectedMemory.id)} className="flex-1 py-2.5 rounded-xl bg-destructive text-destructive-foreground text-xs font-bold">
                          Ya, Hapus
                        </motion.button>
                        <motion.button whileTap={{ scale: 0.95 }} onClick={() => setConfirmDelete(null)} className="flex-1 py-2.5 rounded-xl bg-secondary text-foreground text-xs font-bold">
                          Batal
                        </motion.button>
                      </div>
                    ) : (
                      <motion.button
                        whileTap={{ scale: 0.95 }}
                        onClick={() => setConfirmDelete(selectedMemory.id)}
                        className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-destructive/10 text-destructive text-xs font-bold w-full justify-center"
                      >
                        <Trash2 size={14} /> Hapus Kenangan
                      </motion.button>
                    )}
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default GalleryPage;
