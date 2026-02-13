import { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Plus, Image as ImageIcon, Trash2, ChevronLeft, ChevronRight, Camera, Heart, X, Pencil } from 'lucide-react';
import { notifyPartner, NotificationTemplates } from '@/lib/notifications';
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

/* ── subtle between-section whispers ─────────── */
const whispers = [
  'Kenangan ini cuma milik kita 🤍',
  'Hari-hari kecil yang berarti',
  'Disimpan dengan penuh rasa',
  'Setiap momen, hanya kita yang tahu',
  'Cinta dalam hal-hal sederhana ✨',
];

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
  const [favorites, setFavorites] = useState<Record<string, boolean>>({});
  const longPressTimer = useRef<number | null>(null);
  const [longPressTarget, setLongPressTarget] = useState<string | null>(null);

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
    const tempId = `temp-${Date.now()}`;
    const tempMemory: Memory = {
      id: tempId,
      image_url: preview,
      description: desc || null,
      date,
      created_at: new Date().toISOString(),
      created_by: user.id,
    };
    setMemories(prev => [tempMemory, ...prev]);

    try {
      if (file) {
        const ext = file.name.split('.').pop();
        const path = `memories/${Date.now()}.${ext}`;
        const { error } = await supabase.storage.from('couple-uploads').upload(path, file);
        if (!error) {
          const { data: urlData } = supabase.storage.from('couple-uploads').getPublicUrl(path);
          imageUrl = urlData.publicUrl;
        }
      }

      await supabase.from('memories').insert({ couple_id: profile.couple_id, created_by: user.id, image_url: imageUrl, description: desc || null, date }).select('*').maybeSingle();
      const { data } = await supabase.from('memories').select('*').eq('couple_id', profile.couple_id).order('date', { ascending: false });
      if (data) setMemories(data);

      // Fire-and-forget push notification to partner
      notifyPartner(NotificationTemplates.memory(profile?.name || 'Pasanganmu'));

      setShowAdd(false);
      setDesc('');
      setFile(null);
      setPreview(null);
    } catch (err) {
      setMemories(prev => prev.filter(m => m.id !== tempId));
      console.error('Upload memory failed', err);
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (id: string) => {
    await supabase.from('memories').delete().eq('id', id);
    setMemories(prev => prev.filter(m => m.id !== id));
    setConfirmDelete(null);
    setSelectedMemory(null);
  };

  const toggleFavorite = useCallback((id: string) => {
    setFavorites(prev => ({ ...prev, [id]: !prev[id] }));
  }, []);

  const startLongPress = (id: string) => {
    longPressTimer.current = window.setTimeout(() => {
      setLongPressTarget(id);
      longPressTimer.current = null;
    }, 600);
  };
  const cancelLongPress = () => {
    if (longPressTimer.current) { clearTimeout(longPressTimer.current); longPressTimer.current = null; }
  };

  const selectedIdx = memories.findIndex(m => m.id === selectedMemory?.id);
  const goNext = () => { if (selectedIdx < memories.length - 1) setSelectedMemory(memories[selectedIdx + 1]); };
  const goPrev = () => { if (selectedIdx > 0) setSelectedMemory(memories[selectedIdx - 1]); };

  const heroMemory = memories[0];
  const restMemories = memories.slice(1);

  return (
    <div className="min-h-screen pb-28">
      {/* ═══════ PAGE HEADER ═══════ */}
      <div className="px-6 pt-8 pb-2 max-w-lg mx-auto">
        <div className="flex items-start justify-between">
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <h1 className="font-script text-[32px] text-gradient-love leading-tight">
              Kenangan Kita
            </h1>
            <p className="text-muted-foreground/70 text-[11px] font-medium mt-0.5 tracking-wide">
              Disimpan dengan cinta 🤍
            </p>
            <p className="text-muted-foreground/50 text-[10px] mt-1 font-body">
              {memories.length} kenangan tersimpan
            </p>
          </motion.div>

          {/* Floating add button */}
          <motion.button
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.2, type: 'spring', bounce: 0.5 }}
            whileTap={{ scale: 0.85 }}
            onClick={() => setShowAdd(!showAdd)}
            className="relative mt-1"
          >
            <motion.div
              animate={{ scale: [1, 1.15, 1] }}
              transition={{ duration: 2.5, repeat: Infinity, ease: 'easeInOut' }}
              className="absolute inset-0 rounded-full bg-gradient-to-br from-rose-400 to-pink-500 blur-md opacity-40"
            />
            <div className="relative w-12 h-12 rounded-full bg-gradient-to-br from-rose-400 to-pink-500 flex items-center justify-center shadow-lg shadow-rose-300/30">
              <Plus size={20} className="text-white" strokeWidth={2.5} />
            </div>
          </motion.button>
        </div>
      </div>

      {/* ═══════ ADD FORM ═══════ */}
      <AnimatePresence>
        {showAdd && (
          <motion.div
            initial={{ opacity: 0, y: -20, height: 0 }}
            animate={{ opacity: 1, y: 0, height: 'auto' }}
            exit={{ opacity: 0, y: -20, height: 0 }}
            className="px-6 max-w-lg mx-auto overflow-hidden"
          >
            <div className="scrapbook-card p-5 mb-5 space-y-4">
              <p className="font-script text-lg text-gradient-love">Kenangan Baru ✨</p>

              {/* Photo upload */}
              <label className="block cursor-pointer">
                <div className="relative overflow-hidden rounded-[20px] bg-gradient-to-br from-rose-50 to-pink-50 border-2 border-dashed border-rose-200/50 transition-colors hover:border-rose-300/60">
                  {preview ? (
                    <div className="relative">
                      <img src={preview} className="w-full h-44 object-cover rounded-[18px]" />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent rounded-[18px]" />
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center py-10 gap-2">
                      <motion.div
                        animate={{ y: [-2, 2, -2] }}
                        transition={{ duration: 3, repeat: Infinity }}
                        className="w-14 h-14 rounded-full bg-rose-100/80 flex items-center justify-center"
                      >
                        <Camera size={22} className="text-rose-400" />
                      </motion.div>
                      <p className="text-[12px] text-rose-400/70 font-medium">Pilih foto kenangan</p>
                    </div>
                  )}
                </div>
                <input type="file" accept="image/*" className="hidden" onChange={(e) => handleFileChange(e.target.files?.[0] ?? null)} />
              </label>

              {/* Caption */}
              <textarea
                placeholder="Ceritakan momen ini... 💕"
                value={desc}
                onChange={(e) => setDesc(e.target.value)}
                className="w-full px-4 py-3 rounded-2xl bg-rose-50/40 border border-rose-100/50 text-[13px] outline-none resize-none h-20 text-foreground placeholder:text-muted-foreground/50 focus:ring-2 focus:ring-rose-200/50 transition-all font-body"
              />

              {/* Date */}
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full px-4 py-3 rounded-2xl bg-rose-50/40 border border-rose-100/50 text-[13px] outline-none text-foreground focus:ring-2 focus:ring-rose-200/50 transition-all font-body"
              />

              {/* Submit */}
              <motion.button
                whileTap={{ scale: 0.97 }}
                onClick={handleUpload}
                disabled={uploading}
                className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-rose-400 to-pink-500 text-white text-[13px] font-bold disabled:opacity-50 shadow-lg shadow-rose-300/25"
              >
                {uploading ? 'Menyimpan kenangan...' : 'Simpan Kenangan 💕'}
              </motion.button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ═══════ HERO MEMORY ═══════ */}
      {heroMemory && (
        <div className="px-5 max-w-lg mx-auto mt-2">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="memory-photo-card cursor-pointer group"
            onClick={() => setSelectedMemory(heroMemory)}
            onPointerDown={() => startLongPress(heroMemory.id)}
            onPointerUp={cancelLongPress}
            onPointerLeave={cancelLongPress}
          >
            {heroMemory.image_url ? (
              <div className="relative overflow-hidden rounded-[24px]">
                <img
                  src={heroMemory.image_url}
                  alt=""
                  className="w-full h-[320px] object-cover transition-transform duration-700 group-hover:scale-[1.03]"
                />
                {/* Dream overlay */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/55 via-black/5 to-transparent" />

                {/* Scrapbook tape decoration */}
                <div className="absolute -top-1 left-10 w-14 h-4 bg-amber-100/50 rotate-[-2deg] rounded-sm" />
                <div className="absolute -top-1 right-10 w-14 h-4 bg-rose-100/50 rotate-[3deg] rounded-sm" />

                {/* Floating date pill */}
                <motion.div
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.3 }}
                  className="absolute top-5 left-5 px-3 py-1.5 rounded-full bg-white/85 backdrop-blur-sm shadow-sm"
                >
                  <p className="text-[10px] font-semibold text-foreground/80 font-body">
                    {format(new Date(heroMemory.date), 'dd MMMM yyyy', { locale: localeId })}
                  </p>
                </motion.div>

                {/* Favorite heart */}
                {favorites[heroMemory.id] && (
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    className="absolute top-5 right-5 w-8 h-8 rounded-full bg-white/80 backdrop-blur-sm flex items-center justify-center shadow-sm"
                  >
                    <Heart size={14} className="text-rose-500 fill-rose-500" />
                  </motion.div>
                )}

                {/* Bottom caption area */}
                <div className="absolute bottom-0 left-0 right-0 p-6">
                  {heroMemory.description && (
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.4 }}
                    >
                      <p className="font-script text-white text-2xl leading-snug drop-shadow-lg mb-1">
                        {heroMemory.description.split('.')[0] || heroMemory.description}
                      </p>
                      {heroMemory.description.includes('.') && (
                        <p className="text-white/70 text-[12px] font-body leading-relaxed line-clamp-2">
                          {heroMemory.description.split('.').slice(1).join('.').trim()}
                        </p>
                      )}
                    </motion.div>
                  )}
                </div>
              </div>
            ) : (
              <div className="h-[280px] rounded-[24px] bg-gradient-to-br from-rose-100/50 to-pink-100/50 flex items-center justify-center">
                <ImageIcon size={40} className="text-rose-300/50" />
              </div>
            )}
          </motion.div>
        </div>
      )}

      {/* ═══════ WHISPER TEXT ═══════ */}
      {memories.length > 0 && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="text-center my-6 px-6 max-w-lg mx-auto"
        >
          <p className="font-handwritten text-[17px] text-rose-300/60 italic">
            {whispers[0]}
          </p>
        </motion.div>
      )}

      {/* ═══════ MEMORY FLOW — scrapbook scattered cards ═══════ */}
      <div className="px-5 max-w-lg mx-auto space-y-4">
        {restMemories.map((m, idx) => {
          // Asymmetrical layout patterns
          const pattern = idx % 5;
          const isWide = pattern === 0 || pattern === 3;
          const isCompact = pattern === 2 || pattern === 4;
          const tiltDeg = (idx % 2 === 0 ? 0.5 : -0.5);

          // Show a whisper between some cards
          const showWhisper = idx > 0 && idx % 3 === 0;
          const whisperIdx = Math.floor(idx / 3) % whispers.length;

          return (
            <div key={m.id}>
              {/* Inter-card whisper text */}
              {showWhisper && (
                <motion.div
                  initial={{ opacity: 0 }}
                  whileInView={{ opacity: 1 }}
                  viewport={{ once: true }}
                  className="text-center py-4"
                >
                  <p className="font-handwritten text-[15px] text-rose-300/50 italic">
                    {whispers[whisperIdx]}
                  </p>
                </motion.div>
              )}

              {/* Memory card */}
              <motion.div
                initial={{ opacity: 0, y: 25, rotate: tiltDeg }}
                whileInView={{ opacity: 1, y: 0, rotate: 0 }}
                viewport={{ once: true, margin: '-30px' }}
                transition={{ duration: 0.5, ease: [0.25, 0.1, 0.25, 1] }}
                className={`
                  scrapbook-card overflow-hidden cursor-pointer group
                  ${isWide ? '' : isCompact ? 'ml-6 mr-2' : 'mr-6 ml-2'}
                `}
                style={{ transform: `rotate(${tiltDeg}deg)` }}
                onClick={() => setSelectedMemory(m)}
                onPointerDown={() => startLongPress(m.id)}
                onPointerUp={cancelLongPress}
                onPointerLeave={cancelLongPress}
              >
                {m.image_url ? (
                  <div className={`relative overflow-hidden rounded-t-[22px] ${isWide ? 'h-52' : isCompact ? 'h-36' : 'h-44'}`}>
                    <img
                      src={m.image_url}
                      alt=""
                      className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-[1.04]"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/30 via-transparent to-transparent" />

                    {/* Date pill */}
                    <div className="absolute top-3 left-3.5 px-2.5 py-1 rounded-full bg-white/80 backdrop-blur-sm shadow-sm">
                      <p className="text-[9px] font-semibold text-foreground/70 font-body">
                        {format(new Date(m.date), 'dd MMM yyyy', { locale: localeId })}
                      </p>
                    </div>

                    {/* Favorite indicator */}
                    {favorites[m.id] && (
                      <div className="absolute top-3 right-3.5 w-7 h-7 rounded-full bg-white/80 backdrop-blur-sm flex items-center justify-center">
                        <Heart size={12} className="text-rose-500 fill-rose-500" />
                      </div>
                    )}
                  </div>
                ) : (
                  <div className={`w-full ${isWide ? 'h-44' : 'h-32'} rounded-t-[22px] bg-gradient-to-br from-rose-50 to-pink-50 flex items-center justify-center`}>
                    <ImageIcon size={28} className="text-rose-200" />
                  </div>
                )}

                {/* Caption area */}
                <div className="p-4">
                  {m.description && (
                    <p className="text-[13px] text-foreground font-semibold leading-snug line-clamp-2 mb-1.5 font-body">
                      {m.description}
                    </p>
                  )}
                  <p className="font-handwritten text-[14px] text-muted-foreground/50">
                    {format(new Date(m.date), 'EEEE, dd MMMM', { locale: localeId })}
                  </p>
                </div>
              </motion.div>
            </div>
          );
        })}
      </div>

      {/* ═══════ EMPTY STATE ═══════ */}
      {memories.length === 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center px-8 pt-16 pb-8 max-w-lg mx-auto"
        >
          <motion.div
            animate={{ y: [-4, 4, -4], rotate: [-2, 2, -2] }}
            transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
            className="text-6xl mb-5"
          >
            📷
          </motion.div>
          <p className="font-script text-2xl text-gradient-love mb-2">Mulai cerita kita</p>
          <p className="text-muted-foreground/60 text-[12px] font-body leading-relaxed max-w-[240px] mx-auto">
            Setiap momen bersama layak dikenang. Tap tombol + untuk menyimpan kenangan pertama kita.
          </p>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
            className="mt-6"
          >
            <p className="font-handwritten text-[15px] text-rose-300/50 italic">
              "Kenangan terbaik belum ditulis..."
            </p>
          </motion.div>
        </motion.div>
      )}

      {/* ═══════ BOTTOM WHISPER ═══════ */}
      {memories.length > 2 && (
        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          className="text-center py-8 px-6 max-w-lg mx-auto"
        >
          <p className="font-handwritten text-[16px] text-rose-300/40 italic">
            ...dan masih banyak cerita yang akan kita tulis bersama 💕
          </p>
        </motion.div>
      )}

      {/* ═══════ LONG PRESS OPTIONS ═══════ */}
      <AnimatePresence>
        {longPressTarget && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-end justify-center"
            onClick={() => setLongPressTarget(null)}
          >
            <motion.div
              initial={{ y: 100 }}
              animate={{ y: 0 }}
              exit={{ y: 100 }}
              transition={{ type: 'spring', bounce: 0.2 }}
              className="w-full max-w-lg bg-white rounded-t-[28px] p-6 space-y-2 safe-bottom"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="w-10 h-1 rounded-full bg-gray-200 mx-auto mb-4" />
              <p className="font-script text-lg text-gradient-love mb-3 text-center">Opsi Kenangan</p>

              <button
                onClick={() => { toggleFavorite(longPressTarget); setLongPressTarget(null); }}
                className="w-full flex items-center gap-3 px-4 py-3 rounded-2xl hover:bg-rose-50/50 transition-colors"
              >
                <Heart size={18} className={favorites[longPressTarget] ? 'text-rose-500 fill-rose-500' : 'text-rose-400'} />
                <span className="text-[13px] font-semibold text-foreground font-body">
                  {favorites[longPressTarget] ? 'Hapus dari Favorit' : 'Tandai Favorit 💕'}
                </span>
              </button>

              <button
                onClick={() => {
                  const mem = memories.find(m => m.id === longPressTarget);
                  if (mem) setSelectedMemory(mem);
                  setLongPressTarget(null);
                }}
                className="w-full flex items-center gap-3 px-4 py-3 rounded-2xl hover:bg-rose-50/50 transition-colors"
              >
                <Pencil size={18} className="text-muted-foreground" />
                <span className="text-[13px] font-semibold text-foreground font-body">Lihat Detail</span>
              </button>

              {memories.find(m => m.id === longPressTarget)?.created_by === user?.id && (
                <button
                  onClick={() => {
                    setConfirmDelete(longPressTarget);
                    setLongPressTarget(null);
                  }}
                  className="w-full flex items-center gap-3 px-4 py-3 rounded-2xl hover:bg-red-50/50 transition-colors"
                >
                  <Trash2 size={18} className="text-red-400" />
                  <span className="text-[13px] font-semibold text-red-400 font-body">Hapus Kenangan</span>
                </button>
              )}

              <button
                onClick={() => setLongPressTarget(null)}
                className="w-full py-3 rounded-2xl bg-rose-50/50 text-[13px] font-semibold text-muted-foreground font-body mt-2"
              >
                Batal
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ═══════ MEMORY DETAIL VIEWER ═══════ */}
      <AnimatePresence>
        {selectedMemory && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/60 backdrop-blur-md flex items-center justify-center p-5"
            onClick={() => { setSelectedMemory(null); setConfirmDelete(null); }}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              transition={{ type: 'spring', bounce: 0.2 }}
              className="w-full max-w-md bg-white rounded-[28px] overflow-hidden shadow-2xl max-h-[85vh] overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Close button */}
              <button
                onClick={() => { setSelectedMemory(null); setConfirmDelete(null); }}
                className="absolute top-4 right-4 z-20 w-8 h-8 rounded-full bg-black/30 backdrop-blur-sm flex items-center justify-center"
              >
                <X size={16} className="text-white" />
              </button>

              {/* Photo */}
              {selectedMemory.image_url && (
                <div className="relative">
                  <img
                    src={selectedMemory.image_url}
                    alt=""
                    className="w-full h-72 object-cover"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-black/10" />

                  {/* Navigation arrows */}
                  {selectedIdx > 0 && (
                    <button
                      onClick={(e) => { e.stopPropagation(); goPrev(); }}
                      className="absolute left-3 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-white/20 backdrop-blur-md flex items-center justify-center"
                    >
                      <ChevronLeft size={18} className="text-white" />
                    </button>
                  )}
                  {selectedIdx < memories.length - 1 && (
                    <button
                      onClick={(e) => { e.stopPropagation(); goNext(); }}
                      className="absolute right-3 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-white/20 backdrop-blur-md flex items-center justify-center"
                    >
                      <ChevronRight size={18} className="text-white" />
                    </button>
                  )}

                  {/* Scrapbook corner decorations */}
                  <div className="absolute top-2 left-6 w-10 h-3 bg-amber-100/40 rotate-[-3deg] rounded-sm" />
                  <div className="absolute top-2 right-6 w-10 h-3 bg-rose-100/40 rotate-[2deg] rounded-sm" />
                </div>
              )}

              {/* Details */}
              <div className="p-6 space-y-3">
                {/* Date */}
                <div className="flex items-center gap-2">
                  <div className="px-3 py-1 rounded-full bg-rose-50">
                    <p className="text-[10px] font-semibold text-rose-400 font-body">
                      {format(new Date(selectedMemory.date), 'EEEE, dd MMMM yyyy', { locale: localeId })}
                    </p>
                  </div>
                  {favorites[selectedMemory.id] && (
                    <Heart size={14} className="text-rose-500 fill-rose-500" />
                  )}
                </div>

                {/* Caption */}
                {selectedMemory.description && (
                  <div>
                    <p className="font-script text-xl text-foreground leading-snug mb-1">
                      {selectedMemory.description.split('.')[0]}
                    </p>
                    {selectedMemory.description.includes('.') && (
                      <p className="text-[13px] text-muted-foreground font-body leading-relaxed">
                        {selectedMemory.description.split('.').slice(1).join('.').trim()}
                      </p>
                    )}
                  </div>
                )}

                {/* Actions */}
                <div className="flex gap-2 pt-2">
                  <button
                    onClick={() => toggleFavorite(selectedMemory.id)}
                    className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-2xl bg-rose-50/80 transition-colors hover:bg-rose-100/60"
                  >
                    <Heart
                      size={15}
                      className={favorites[selectedMemory.id] ? 'text-rose-500 fill-rose-500' : 'text-rose-400'}
                    />
                    <span className="text-[11px] font-semibold text-rose-400 font-body">
                      {favorites[selectedMemory.id] ? 'Favorit' : 'Favoritkan'}
                    </span>
                  </button>

                  {selectedMemory.created_by === user?.id && (
                    <>
                      {confirmDelete === selectedMemory.id ? (
                        <div className="flex-1 flex gap-1.5">
                          <motion.button
                            whileTap={{ scale: 0.95 }}
                            onClick={() => handleDelete(selectedMemory.id)}
                            className="flex-1 py-2.5 rounded-2xl bg-red-100/80 text-red-500 text-[11px] font-bold font-body"
                          >
                            Hapus
                          </motion.button>
                          <motion.button
                            whileTap={{ scale: 0.95 }}
                            onClick={() => setConfirmDelete(null)}
                            className="flex-1 py-2.5 rounded-2xl bg-gray-100/80 text-foreground text-[11px] font-bold font-body"
                          >
                            Batal
                          </motion.button>
                        </div>
                      ) : (
                        <button
                          onClick={() => setConfirmDelete(selectedMemory.id)}
                          className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-2xl bg-red-50/60 transition-colors hover:bg-red-100/50"
                        >
                          <Trash2 size={14} className="text-red-400/70" />
                          <span className="text-[11px] font-semibold text-red-400/70 font-body">Hapus</span>
                        </button>
                      )}
                    </>
                  )}
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ═══════ DELETE CONFIRMATION (standalone) ═══════ */}
      <Dialog open={!!confirmDelete && !selectedMemory} onOpenChange={() => setConfirmDelete(null)}>
        <DialogContent className="scrapbook-card border-rose-100/30 max-w-sm rounded-[24px]">
          <DialogHeader>
            <DialogTitle className="font-script text-xl text-gradient-love">Hapus Kenangan? 💔</DialogTitle>
            <DialogDescription className="text-[13px] text-muted-foreground font-body">
              Kenangan ini akan hilang selamanya...
            </DialogDescription>
          </DialogHeader>
          <div className="flex gap-2 mt-2">
            <motion.button
              whileTap={{ scale: 0.95 }}
              onClick={() => confirmDelete && handleDelete(confirmDelete)}
              className="flex-1 py-3 rounded-2xl bg-red-100/80 text-red-500 text-[13px] font-bold font-body"
            >
              Ya, Hapus 💔
            </motion.button>
            <motion.button
              whileTap={{ scale: 0.95 }}
              onClick={() => setConfirmDelete(null)}
              className="flex-1 py-3 rounded-2xl bg-rose-50/80 text-foreground text-[13px] font-bold font-body"
            >
              Simpan 🤍
            </motion.button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default GalleryPage;
