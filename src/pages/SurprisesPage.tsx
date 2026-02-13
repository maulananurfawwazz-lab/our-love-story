import { useState, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '@/contexts/AuthContext';
import { Plus, X, ChevronDown, ChevronUp, Gift, Heart, Sparkles } from 'lucide-react';
import { isBefore, isToday, formatDistanceToNow, format } from 'date-fns';
import { id as idLocale } from 'date-fns/locale';
import { notifyPartner, NotificationTemplates } from '@/lib/notifications';
import { useRealtimeTable } from '@/hooks/useRealtimeTable';

// ═══════════════════════════════════════════════════
// Types
// ═══════════════════════════════════════════════════
interface SurpriseRow {
  id: string;
  couple_id: string;
  created_by: string;
  title: string | null;
  message: string;
  mood: string;
  category: string | null;
  open_date: string | null;
  is_locked: boolean;
  is_opened: boolean;
  opened_at: string | null;
  reaction: string | null;
  created_at: string;
}

type SurpriseState = 'locked' | 'unlockable' | 'opened';
type ViewMode = 'surprises' | 'memories';

const CATEGORIES = [
  { value: 'sad', label: 'Saat sedih', emoji: '😢' },
  { value: 'miss', label: 'Saat kangen', emoji: '🥺' },
  { value: 'anniversary', label: 'Anniversary', emoji: '🎉' },
  { value: 'general', label: 'Kapan saja', emoji: '💌' },
];

const MOODS = ['💌', '🎁', '💕', '🌹', '✨', '🧸', '🍫', '💝', '🎀', '🦋'];
const REACTIONS = ['❤️', '🥺', '😭', '🥰', '💕', '✨'];

// ═══════════════════════════════════════════════════
// Helpers
// ═══════════════════════════════════════════════════
function getSurpriseState(s: SurpriseRow, userId: string | undefined): SurpriseState {
  if (s.is_opened) return 'opened';
  if (s.created_by === userId) return 'locked'; // Can't open your own
  if (!s.open_date) return 'unlockable';
  const target = new Date(s.open_date);
  if (isToday(target) || isBefore(target, new Date())) return 'unlockable';
  return 'locked';
}

function formatOpenDate(dateStr: string): string {
  const d = new Date(dateStr);
  if (isToday(d)) return 'Hari ini! ✨';
  if (isBefore(d, new Date())) return 'Sudah lewat';
  return formatDistanceToNow(d, { addSuffix: true, locale: idLocale });
}

// ═══════════════════════════════════════════════════
// Main Component
// ═══════════════════════════════════════════════════
const SurprisesPage = () => {
  const { user, profile, partner } = useAuth();

  const { data: surprises, insert, update, loading } = useRealtimeTable<SurpriseRow>({
    table: 'surprises',
    coupleId: profile?.couple_id,
    orderBy: { column: 'created_at', ascending: false },
  });

  // UI state
  const [showCreate, setShowCreate] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>('surprises');
  const [openingId, setOpeningId] = useState<string | null>(null); // envelope animation
  const [revealedId, setRevealedId] = useState<string | null>(null); // content shown
  const [previewId, setPreviewId] = useState<string | null>(null); // locked preview
  const [reactingId, setReactingId] = useState<string | null>(null);

  // Create form
  const [formTitle, setFormTitle] = useState('');
  const [formMessage, setFormMessage] = useState('');
  const [formCategory, setFormCategory] = useState('general');
  const [formMood, setFormMood] = useState('💌');
  const [formOpenDate, setFormOpenDate] = useState('');
  const [showMoodPicker, setShowMoodPicker] = useState(false);

  // ── Categorize ──
  const { unopened, unlockableCount, memories } = useMemo(() => {
    const unopened: SurpriseRow[] = [];
    const memories: SurpriseRow[] = [];
    let unlockableCount = 0;

    for (const s of surprises) {
      if (s.is_opened) {
        memories.push(s);
      } else {
        unopened.push(s);
        if (getSurpriseState(s, user?.id) === 'unlockable') unlockableCount++;
      }
    }
    return { unopened, unlockableCount, memories };
  }, [surprises, user?.id]);

  // ── Handlers ──
  const resetForm = () => {
    setFormTitle('');
    setFormMessage('');
    setFormCategory('general');
    setFormMood('💌');
    setFormOpenDate('');
    setShowCreate(false);
    setShowMoodPicker(false);
  };

  const handleCreate = async () => {
    if (!formMessage.trim() || !profile?.couple_id || !user) return;
    await insert({
      created_by: user.id,
      couple_id: profile.couple_id,
      title: formTitle.trim() || null,
      message: formMessage.trim(),
      category: formCategory,
      mood: formMood,
      open_date: formOpenDate || null,
      is_locked: true,
      is_opened: false,
    });
    resetForm();
    notifyPartner(NotificationTemplates.surprise(profile?.name || 'Pasanganmu'));
  };

  const handleOpen = useCallback(async (s: SurpriseRow) => {
    setOpeningId(s.id);
    // Envelope animation plays for 800ms before reveal
    setTimeout(async () => {
      await update(s.id, {
        is_opened: true,
        is_locked: false,
        opened_at: new Date().toISOString(),
      });
      setOpeningId(null);
      setRevealedId(s.id);
      notifyPartner(NotificationTemplates.surpriseOpened(profile?.name || 'Pasanganmu'));
    }, 800);
  }, [update, profile?.name]);

  const handleReact = async (surpriseId: string, reaction: string) => {
    await update(surpriseId, { reaction });
    setReactingId(null);
    setRevealedId(null);
    notifyPartner(NotificationTemplates.surpriseReaction(profile?.name || 'Pasanganmu', reaction));
  };

  // ═══════════════════════════════════════════════════
  // Render
  // ═══════════════════════════════════════════════════
  return (
    <div className="px-4 py-5 max-w-lg mx-auto space-y-5 pb-28">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-script text-2xl text-gradient-love">Kejutan 🎁</h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Surat cinta digital untuk pasanganmu
          </p>
        </div>
        <motion.button
          whileTap={{ scale: 0.9 }}
          onClick={() => { resetForm(); setShowCreate(!showCreate); }}
          className="p-2.5 rounded-xl bg-primary text-primary-foreground shadow-lg shadow-primary/25"
        >
          <Plus size={18} />
        </motion.button>
      </div>

      {/* Unlockable banner */}
      <AnimatePresence>
        {unlockableCount > 0 && viewMode === 'surprises' && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="p-3 rounded-xl bg-gradient-to-r from-amber-500/15 to-orange-500/15 border border-amber-500/25 flex items-center gap-3"
          >
            <motion.span
              animate={{ scale: [1, 1.15, 1] }}
              transition={{ duration: 2, repeat: Infinity }}
              className="text-2xl"
            >
              ✨
            </motion.span>
            <div className="flex-1">
              <p className="text-sm font-semibold text-foreground">
                {unlockableCount} kejutan siap dibuka!
              </p>
              <p className="text-xs text-muted-foreground">Ketuk untuk membuka surat cintamu</p>
            </div>
            <Sparkles size={16} className="text-amber-400" />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Create Form */}
      <AnimatePresence>
        {showCreate && (
          <motion.div
            initial={{ opacity: 0, y: -15, height: 0 }}
            animate={{ opacity: 1, y: 0, height: 'auto' }}
            exit={{ opacity: 0, y: -15, height: 0 }}
            className="glass-card p-4 space-y-3 border border-primary/20"
          >
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-foreground">
                ✨ Buat Kejutan untuk {partner?.name?.split(' ')[0] || '...'}
              </h3>
              <button onClick={resetForm} className="p-1 text-muted-foreground">
                <X size={16} />
              </button>
            </div>

            {/* Mood picker */}
            <div>
              <button
                onClick={() => setShowMoodPicker(!showMoodPicker)}
                className="flex items-center gap-2 text-sm text-muted-foreground"
              >
                <span className="text-2xl">{formMood}</span>
                <span className="text-xs">Pilih mood</span>
                {showMoodPicker ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
              </button>
              <AnimatePresence>
                {showMoodPicker && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="flex flex-wrap gap-2 mt-2"
                  >
                    {MOODS.map((m) => (
                      <button
                        key={m}
                        onClick={() => { setFormMood(m); setShowMoodPicker(false); }}
                        className={`text-xl p-1.5 rounded-lg transition-all ${
                          formMood === m ? 'bg-primary/20 scale-110' : 'hover:bg-secondary'
                        }`}
                      >
                        {m}
                      </button>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Title */}
            <input
              value={formTitle}
              onChange={(e) => setFormTitle(e.target.value)}
              placeholder="Judul kejutan (opsional)..."
              maxLength={60}
              className="w-full px-3 py-2.5 rounded-xl bg-background/50 border border-border text-sm outline-none text-foreground placeholder:text-muted-foreground"
              style={{ fontSize: '16px' }}
            />

            {/* Message */}
            <textarea
              value={formMessage}
              onChange={(e) => setFormMessage(e.target.value)}
              placeholder="Tulis pesan kejutan... ✍️"
              className="w-full px-3 py-2 rounded-xl bg-background/50 border border-border text-sm outline-none resize-none h-24 text-foreground placeholder:text-muted-foreground"
              style={{ fontSize: '16px' }}
            />

            {/* Category */}
            <div className="flex flex-wrap gap-2">
              {CATEGORIES.map(c => (
                <button
                  key={c.value}
                  onClick={() => setFormCategory(c.value)}
                  className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
                    formCategory === c.value
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-secondary text-secondary-foreground'
                  }`}
                >
                  {c.emoji} {c.label}
                </button>
              ))}
            </div>

            {/* Open date */}
            <div>
              <label className="text-xs text-muted-foreground block mb-1">
                Bisa dibuka pada: (kosongkan = kapan saja)
              </label>
              <input
                type="date"
                value={formOpenDate}
                onChange={(e) => setFormOpenDate(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-background/50 border border-border text-sm outline-none text-foreground"
                style={{ fontSize: '16px' }}
              />
            </div>

            <motion.button
              whileTap={{ scale: 0.97 }}
              onClick={handleCreate}
              disabled={!formMessage.trim()}
              className="w-full py-2.5 rounded-xl bg-gradient-to-r from-primary to-pink-500 text-white text-sm font-semibold shadow-lg shadow-primary/25 disabled:opacity-40 flex items-center justify-center gap-2"
            >
              <Gift size={15} />
              Kirim Kejutan 💌
            </motion.button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* View Toggle */}
      <div className="flex gap-1 p-1 rounded-xl bg-secondary/50 backdrop-blur-sm">
        <button
          onClick={() => setViewMode('surprises')}
          className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-medium transition-all ${
            viewMode === 'surprises'
              ? 'bg-primary text-primary-foreground shadow-md'
              : 'text-muted-foreground'
          }`}
        >
          <Gift size={14} />
          Kejutan
          {unopened.length > 0 && (
            <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-bold ${
              viewMode === 'surprises' ? 'bg-white/20 text-white' : 'bg-primary/15 text-primary'
            }`}>{unopened.length}</span>
          )}
        </button>
        <button
          onClick={() => setViewMode('memories')}
          className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-medium transition-all ${
            viewMode === 'memories'
              ? 'bg-primary text-primary-foreground shadow-md'
              : 'text-muted-foreground'
          }`}
        >
          <Heart size={14} />
          Kenangan
          {memories.length > 0 && (
            <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-bold ${
              viewMode === 'memories' ? 'bg-white/20 text-white' : 'bg-primary/15 text-primary'
            }`}>{memories.length}</span>
          )}
        </button>
      </div>

      {/* Loading */}
      {loading && (
        <div className="text-center py-10">
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ repeat: Infinity, duration: 1.5, ease: 'linear' }}
            className="inline-block text-2xl"
          >
            🎁
          </motion.div>
        </div>
      )}

      {/* ═══ SURPRISES VIEW ═══ */}
      {!loading && viewMode === 'surprises' && (
        <div className="space-y-3">
          {unopened.length === 0 ? (
            <EmptyState
              emoji="🎁"
              title="Belum ada kejutan..."
              subtitle="tapi itu berarti kejutan berikutnya bakal lebih spesial 💝"
            />
          ) : (
            unopened.map((s, i) => {
              const state = getSurpriseState(s, user?.id);
              return (
                <SurpriseCard
                  key={s.id}
                  surprise={s}
                  state={state}
                  index={i}
                  isOpening={openingId === s.id}
                  isMine={s.created_by === user?.id}
                  partnerName={partner?.name || 'Pasanganmu'}
                  onTap={() => {
                    if (state === 'unlockable') handleOpen(s);
                    else if (state === 'locked') setPreviewId(s.id);
                  }}
                />
              );
            })
          )}
        </div>
      )}

      {/* ═══ MEMORIES VIEW ═══ */}
      {!loading && viewMode === 'memories' && (
        <div className="space-y-3">
          {memories.length === 0 ? (
            <EmptyState
              emoji="💖"
              title="Belum ada kenangan"
              subtitle="Buka kejutan untuk mengubahnya jadi kenangan indah"
            />
          ) : (
            memories.map((s, i) => (
              <MemoryCard
                key={s.id}
                surprise={s}
                index={i}
                isMine={s.created_by === user?.id}
                partnerName={partner?.name || 'Pasanganmu'}
                onTap={() => setRevealedId(s.id)}
              />
            ))
          )}
        </div>
      )}

      {/* ═══ LOCKED PREVIEW MODAL ═══ */}
      <AnimatePresence>
        {previewId && (
          <LockedPreviewModal
            surprise={surprises.find(s => s.id === previewId)!}
            partnerName={partner?.name || 'Pasanganmu'}
            isMine={surprises.find(s => s.id === previewId)?.created_by === user?.id}
            onClose={() => setPreviewId(null)}
          />
        )}
      </AnimatePresence>

      {/* ═══ REVEAL MODAL ═══ */}
      <AnimatePresence>
        {revealedId && (
          <RevealModal
            surprise={surprises.find(s => s.id === revealedId)!}
            isMine={surprises.find(s => s.id === revealedId)?.created_by === user?.id}
            partnerName={partner?.name || 'Pasanganmu'}
            reactingId={reactingId}
            onStartReact={() => setReactingId(revealedId)}
            onReact={(r) => handleReact(revealedId!, r)}
            onClose={() => { setRevealedId(null); setReactingId(null); }}
          />
        )}
      </AnimatePresence>
    </div>
  );
};

// ═══════════════════════════════════════════════════
// Sub-components
// ═══════════════════════════════════════════════════

const EmptyState = ({ emoji, title, subtitle }: { emoji: string; title: string; subtitle: string }) => (
  <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center py-14">
    <p className="text-4xl mb-3">{emoji}</p>
    <p className="text-sm font-medium text-foreground">{title}</p>
    <p className="text-xs text-muted-foreground mt-1">{subtitle}</p>
  </motion.div>
);

// ── Surprise Card (Locked / Unlockable) ──
const SurpriseCard = ({
  surprise: s, state, index, isOpening, isMine, partnerName, onTap,
}: {
  surprise: SurpriseRow; state: SurpriseState; index: number;
  isOpening: boolean; isMine: boolean; partnerName: string;
  onTap: () => void;
}) => {
  const isUnlockable = state === 'unlockable';
  const catInfo = CATEGORIES.find(c => c.value === s.category);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05 }}
      onClick={onTap}
      className="cursor-pointer active:scale-[0.98] transition-transform"
    >
      <motion.div
        animate={isOpening ? {
          scale: [1, 1.03, 0.97, 1.05, 0],
          rotateY: [0, 0, 0, 180, 180],
          opacity: [1, 1, 1, 1, 0],
        } : isUnlockable ? {
          boxShadow: [
            '0 4px 20px rgba(236,72,153,0.15)',
            '0 4px 30px rgba(236,72,153,0.3)',
            '0 4px 20px rgba(236,72,153,0.15)',
          ],
        } : {}}
        transition={isOpening ? { duration: 0.8, ease: 'easeInOut' } : { duration: 3, repeat: Infinity }}
        className={`relative overflow-hidden rounded-[20px] p-5 ${
          isUnlockable
            ? 'bg-gradient-to-br from-primary/10 via-pink-500/8 to-amber-500/10 border border-primary/25 shadow-xl shadow-primary/10'
            : 'bg-gradient-to-br from-secondary/80 to-secondary/40 border border-border/50 shadow-lg'
        }`}
      >
        {/* Shimmer overlay for locked */}
        {state === 'locked' && (
          <motion.div
            animate={{ x: ['-100%', '200%'] }}
            transition={{ duration: 3, repeat: Infinity, repeatDelay: 2 }}
            className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent skew-x-12"
          />
        )}

        {/* Glow overlay for unlockable */}
        {isUnlockable && (
          <motion.div
            animate={{ opacity: [0.3, 0.6, 0.3] }}
            transition={{ duration: 2.5, repeat: Infinity }}
            className="absolute inset-0 bg-gradient-to-br from-primary/5 to-pink-500/5 rounded-[20px]"
          />
        )}

        <div className="flex items-start gap-4 relative">
          {/* Envelope icon */}
          <div className={`w-12 h-12 rounded-2xl flex items-center justify-center text-2xl shrink-0 ${
            isUnlockable
              ? 'bg-gradient-to-br from-primary/20 to-pink-500/20'
              : 'bg-secondary/60'
          }`}>
            <motion.span
              animate={isUnlockable ? { scale: [1, 1.1, 1], rotate: [0, -3, 3, 0] } : {}}
              transition={{ duration: 2, repeat: Infinity }}
            >
              {state === 'locked' ? '🔒' : '✉️'}
            </motion.span>
          </div>

          <div className="flex-1 min-w-0">
            {/* Title / Category */}
            <div className="flex items-center gap-2">
              <p className="text-sm font-bold text-foreground truncate">
                {s.title || catInfo?.label || 'Kejutan'}
              </p>
              <span className="text-sm">{s.mood || '💌'}</span>
            </div>

            {/* Meta info */}
            <p className="text-[11px] text-muted-foreground mt-1">
              {isMine ? `Untukmu → ${partnerName}` : `Dari ${partnerName}`}
              {catInfo && ` • ${catInfo.emoji} ${catInfo.label}`}
            </p>

            {/* Status badge */}
            <div className="mt-2">
              {isUnlockable ? (
                <motion.span
                  animate={{ scale: [1, 1.05, 1] }}
                  transition={{ duration: 1.5, repeat: Infinity }}
                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-gradient-to-r from-primary/20 to-pink-500/20 text-[10px] font-bold text-primary"
                >
                  <Sparkles size={10} /> Siap Dibuka ✨
                </motion.span>
              ) : s.open_date ? (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-secondary text-[10px] font-medium text-muted-foreground">
                  🔒 Buka {formatOpenDate(s.open_date)}
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-secondary text-[10px] font-medium text-muted-foreground">
                  {isMine ? '📤 Sudah dikirim' : '🔒 Menunggu...'}
                </span>
              )}
            </div>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
};

// ── Memory Card (Opened) ──
const MemoryCard = ({
  surprise: s, index, isMine, partnerName, onTap,
}: {
  surprise: SurpriseRow; index: number; isMine: boolean;
  partnerName: string; onTap: () => void;
}) => {
  const openedDate = s.opened_at
    ? format(new Date(s.opened_at), 'd MMM yyyy', { locale: idLocale })
    : null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.04 }}
      onClick={onTap}
      className="cursor-pointer active:scale-[0.98] transition-transform"
    >
      <div className="relative overflow-hidden rounded-[18px] p-4 bg-gradient-to-br from-rose-500/5 via-background to-pink-500/5 border border-primary/10 shadow-md">
        {/* Decorative */}
        <div className="absolute top-0 right-0 w-14 h-14 bg-gradient-to-bl from-primary/8 to-transparent rounded-bl-3xl" />

        <div className="flex items-start gap-3 relative">
          <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-lg shrink-0">
            💌
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <p className="text-sm font-semibold text-foreground truncate">
                {s.title || 'Kejutan Spesial'}
              </p>
              {s.reaction && <span className="text-sm">{s.reaction}</span>}
            </div>
            <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{s.message}</p>
            <div className="flex items-center gap-2 mt-2 flex-wrap">
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-primary/10 text-[10px] font-semibold text-primary">
                Kenangan 💖
              </span>
              <span className="text-[10px] text-muted-foreground">
                {isMine ? `Olehmu` : `Dari ${partnerName}`}
              </span>
              {openedDate && (
                <span className="text-[10px] text-muted-foreground/60">• {openedDate}</span>
              )}
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
};

// ── Locked Preview Modal ──
const LockedPreviewModal = ({
  surprise: s, partnerName, isMine, onClose,
}: {
  surprise: SurpriseRow; partnerName: string; isMine: boolean;
  onClose: () => void;
}) => {
  if (!s) return null;
  const catInfo = CATEGORIES.find(c => c.value === s.category);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={onClose}
      className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-6"
    >
      <motion.div
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.8, opacity: 0 }}
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-sm rounded-3xl p-6 bg-gradient-to-br from-background via-background to-secondary/30 border border-border shadow-2xl text-center space-y-4"
      >
        <motion.div
          animate={{ scale: [1, 1.1, 1], rotate: [0, -5, 5, 0] }}
          transition={{ duration: 2, repeat: Infinity }}
          className="text-5xl"
        >
          🔒
        </motion.div>
        <h3 className="font-script text-xl text-foreground">
          {s.title || catInfo?.label || 'Kejutan Rahasia'}
        </h3>
        <p className="text-sm text-muted-foreground">
          {isMine
            ? `Kamu sudah mengirim kejutan ini untuk ${partnerName}`
            : s.open_date
              ? `Bisa dibuka ${formatOpenDate(s.open_date)}`
              : 'Kejutan ini belum bisa dibuka sekarang'
          }
        </p>
        <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground/60">
          <span>{s.mood || '💌'}</span>
          <span>•</span>
          <span>{catInfo?.emoji} {catInfo?.label || 'Kejutan'}</span>
        </div>
        <button
          onClick={onClose}
          className="w-full py-2.5 rounded-xl bg-secondary text-foreground text-sm font-medium mt-2"
        >
          Tutup
        </button>
      </motion.div>
    </motion.div>
  );
};

// ── Reveal Modal ──
const RevealModal = ({
  surprise: s, isMine, partnerName, reactingId, onStartReact, onReact, onClose,
}: {
  surprise: SurpriseRow; isMine: boolean; partnerName: string;
  reactingId: string | null;
  onStartReact: () => void;
  onReact: (r: string) => void;
  onClose: () => void;
}) => {
  if (!s) return null;
  const openedDate = s.opened_at
    ? format(new Date(s.opened_at), 'd MMMM yyyy, HH:mm', { locale: idLocale })
    : null;
  const catInfo = CATEGORIES.find(c => c.value === s.category);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={onClose}
      className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-6"
    >
      <motion.div
        initial={{ scale: 0.7, opacity: 0, rotateY: 90 }}
        animate={{ scale: 1, opacity: 1, rotateY: 0 }}
        exit={{ scale: 0.8, opacity: 0 }}
        transition={{ type: 'spring', damping: 20, stiffness: 200 }}
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-sm rounded-3xl overflow-hidden bg-gradient-to-br from-background to-rose-500/5 border border-primary/15 shadow-2xl"
      >
        {/* Header gradient */}
        <div className="h-20 bg-gradient-to-r from-primary/20 via-pink-500/15 to-rose-500/20 flex items-center justify-center relative">
          <motion.span
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.3, type: 'spring' }}
            className="text-4xl"
          >
            💌
          </motion.span>
          {/* Floating particles */}
          {['💕', '✨', '🌹'].map((e, i) => (
            <motion.span
              key={i}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: [0, 1, 0], y: [-10, -30] }}
              transition={{ delay: 0.5 + i * 0.2, duration: 1.5 }}
              className="absolute text-sm"
              style={{ left: `${25 + i * 25}%` }}
            >
              {e}
            </motion.span>
          ))}
        </div>

        <div className="p-5 space-y-4">
          {/* Title */}
          <motion.h3
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="font-script text-xl text-foreground text-center"
          >
            {s.title || catInfo?.label || 'Kejutan Spesial'} {s.mood || ''}
          </motion.h3>

          {/* Message */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="p-4 rounded-2xl bg-primary/5 border border-primary/10"
          >
            <p className="text-sm text-foreground leading-relaxed whitespace-pre-wrap">
              {s.message}
            </p>
          </motion.div>

          {/* Meta */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.6 }}
            className="text-center space-y-1"
          >
            <p className="text-xs text-muted-foreground">
              {isMine ? `Kamu mengirim ini` : `Dari ${partnerName}`}
              {catInfo && ` • ${catInfo.emoji} ${catInfo.label}`}
            </p>
            {openedDate && (
              <p className="text-[10px] text-muted-foreground/50">Dibuka: {openedDate}</p>
            )}
          </motion.div>

          {/* Reaction */}
          {s.reaction ? (
            <div className="text-center">
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-primary/10 text-sm">
                <span>{s.reaction}</span>
                <span className="text-xs text-muted-foreground">reaksimu</span>
              </span>
            </div>
          ) : !isMine && reactingId === s.id ? (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              className="space-y-2"
            >
              <p className="text-xs text-center text-muted-foreground">Apa yang kamu rasakan?</p>
              <div className="flex justify-center gap-3">
                {REACTIONS.map((r) => (
                  <motion.button
                    key={r}
                    whileTap={{ scale: 0.85 }}
                    whileHover={{ scale: 1.2 }}
                    onClick={() => onReact(r)}
                    className="text-2xl p-1"
                  >
                    {r}
                  </motion.button>
                ))}
              </div>
            </motion.div>
          ) : !isMine ? (
            <motion.button
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.8 }}
              whileTap={{ scale: 0.97 }}
              onClick={onStartReact}
              className="w-full py-2.5 rounded-xl bg-gradient-to-r from-primary to-pink-500 text-white text-sm font-semibold flex items-center justify-center gap-1.5"
            >
              <Heart size={14} /> Beri Reaksi 💕
            </motion.button>
          ) : null}

          <button
            onClick={onClose}
            className="w-full py-2 rounded-xl bg-secondary text-foreground text-sm font-medium"
          >
            Tutup
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
};

export default SurprisesPage;
