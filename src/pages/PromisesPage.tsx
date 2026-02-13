import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '@/contexts/AuthContext';
import {
  Plus, Send, Check, X, Clock, Shield, Sparkles, Heart,
  Trash2, Edit3, ChevronDown, ChevronUp
} from 'lucide-react';
import { notifyPartner, NotificationTemplates } from '@/lib/notifications';
import { useRealtimeTable } from '@/hooks/useRealtimeTable';

// ═══════════════════════════════════════════════════
// Types
// ═══════════════════════════════════════════════════
type PromiseStatus = 'draft' | 'pending' | 'approved' | 'rejected';

interface PromiseRow {
  id: string;
  couple_id: string;
  created_by: string;
  receiver_id: string | null;
  title: string | null;
  description: string | null;
  content: string | null;
  status: PromiseStatus;
  emoji: string;
  is_private: boolean;
  created_at: string;
  approved_at: string | null;
  rejected_at: string | null;
  rejection_reason: string | null;
}

type TabKey = 'draft' | 'pending' | 'approved';

const EMOJI_OPTIONS = ['🤞', '💕', '💍', '🏠', '✈️', '👶', '🌹', '⭐', '🔒', '💪', '🙏', '🤝'];

// ═══════════════════════════════════════════════════
// Main Component
// ═══════════════════════════════════════════════════
const PromisesPage = () => {
  const { user, profile, partner } = useAuth();

  const { data: promises, insert, update, remove, loading } = useRealtimeTable<PromiseRow>({
    table: 'promises',
    coupleId: profile?.couple_id,
    orderBy: { column: 'created_at', ascending: false },
  });

  const [activeTab, setActiveTab] = useState<TabKey>('approved');
  const [showCreate, setShowCreate] = useState(false);

  // Create form state
  const [formTitle, setFormTitle] = useState('');
  const [formDesc, setFormDesc] = useState('');
  const [formEmoji, setFormEmoji] = useState('🤞');
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  // Reject reason state
  const [rejectingId, setRejectingId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState('');

  // ── Categorize promises ──
  const categorized = useMemo(() => {
    const myDrafts: PromiseRow[] = [];
    const pendingSent: PromiseRow[] = []; // I sent, waiting for partner
    const pendingReceived: PromiseRow[] = []; // Partner sent, waiting for me
    const approved: PromiseRow[] = [];
    const rejected: PromiseRow[] = [];

    for (const p of promises) {
      switch (p.status) {
        case 'draft':
          if (p.created_by === user?.id) myDrafts.push(p);
          break;
        case 'pending':
          if (p.created_by === user?.id) pendingSent.push(p);
          else pendingReceived.push(p);
          break;
        case 'approved':
          approved.push(p);
          break;
        case 'rejected':
          rejected.push(p);
          break;
      }
    }
    return { myDrafts, pendingSent, pendingReceived, approved, rejected };
  }, [promises, user?.id]);

  const pendingIncoming = categorized.pendingReceived.length;

  // ── Handlers ──
  const resetForm = () => {
    setFormTitle('');
    setFormDesc('');
    setFormEmoji('🤞');
    setShowCreate(false);
    setEditingId(null);
    setShowEmojiPicker(false);
  };

  const handleSaveDraft = async () => {
    if (!formTitle.trim() || !profile?.couple_id || !user) return;

    if (editingId) {
      await update(editingId, {
        title: formTitle.trim(),
        description: formDesc.trim() || null,
        emoji: formEmoji,
      });
    } else {
      await insert({
        created_by: user.id,
        couple_id: profile.couple_id,
        title: formTitle.trim(),
        description: formDesc.trim() || null,
        content: formTitle.trim(),
        emoji: formEmoji,
        status: 'draft',
        is_private: false,
      });
    }
    resetForm();
    setActiveTab('draft');
  };

  const handleSendToPartner = async (promise: PromiseRow) => {
    if (!partner) return;
    await update(promise.id, {
      status: 'pending',
      receiver_id: partner.id,
    });
    notifyPartner(NotificationTemplates.promiseRequest(profile?.name || 'Pasanganmu'));
  };

  const handleApprove = async (promise: PromiseRow) => {
    await update(promise.id, {
      status: 'approved',
      approved_at: new Date().toISOString(),
    });
    notifyPartner(NotificationTemplates.promiseApproved(profile?.name || 'Pasanganmu'));
  };

  const handleReject = async (promise: PromiseRow) => {
    if (!rejectReason.trim()) return;
    await update(promise.id, {
      status: 'rejected',
      rejected_at: new Date().toISOString(),
      rejection_reason: rejectReason.trim(),
    });
    setRejectingId(null);
    setRejectReason('');
    notifyPartner(NotificationTemplates.promiseRejected(profile?.name || 'Pasanganmu'));
  };

  const handleDeleteDraft = async (id: string) => {
    await remove(id);
  };

  const handleEditDraft = (promise: PromiseRow) => {
    setFormTitle(promise.title || '');
    setFormDesc(promise.description || '');
    setFormEmoji(promise.emoji || '🤞');
    setEditingId(promise.id);
    setShowCreate(true);
  };

  const handleSendDirect = async () => {
    if (!formTitle.trim() || !profile?.couple_id || !user || !partner) return;
    await insert({
      created_by: user.id,
      couple_id: profile.couple_id,
      title: formTitle.trim(),
      description: formDesc.trim() || null,
      content: formTitle.trim(),
      emoji: formEmoji,
      status: 'pending',
      receiver_id: partner.id,
      is_private: false,
    });
    resetForm();
    setActiveTab('pending');
    notifyPartner(NotificationTemplates.promiseRequest(profile?.name || 'Pasanganmu'));
  };

  // ── Tab Config ──
  const tabs: { key: TabKey; label: string; icon: React.ReactNode; count: number }[] = [
    { key: 'draft', label: 'Draft', icon: <Edit3 size={14} />, count: categorized.myDrafts.length },
    {
      key: 'pending',
      label: 'Menunggu',
      icon: <Clock size={14} />,
      count: categorized.pendingSent.length + categorized.pendingReceived.length,
    },
    { key: 'approved', label: 'Resmi', icon: <Shield size={14} />, count: categorized.approved.length },
  ];

  // ═══════════════════════════════════════════════════
  // Render
  // ═══════════════════════════════════════════════════
  return (
    <div className="px-4 py-5 max-w-lg mx-auto space-y-5 pb-28">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-script text-2xl text-gradient-love">Janji Kita 🤞</h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Buat, kirim & setujui janji bersama
          </p>
        </div>
        <motion.button
          whileTap={{ scale: 0.9 }}
          onClick={() => {
            resetForm();
            setShowCreate(!showCreate);
          }}
          className="p-2.5 rounded-xl bg-primary text-primary-foreground shadow-lg shadow-primary/25"
        >
          <Plus size={18} />
        </motion.button>
      </div>

      {/* Incoming requests banner */}
      <AnimatePresence>
        {pendingIncoming > 0 && activeTab !== 'pending' && (
          <motion.button
            initial={{ opacity: 0, y: -10, height: 0 }}
            animate={{ opacity: 1, y: 0, height: 'auto' }}
            exit={{ opacity: 0, y: -10, height: 0 }}
            onClick={() => setActiveTab('pending')}
            className="w-full p-3 rounded-xl bg-gradient-to-r from-pink-500/20 to-rose-500/20 border border-pink-500/30 flex items-center gap-3"
          >
            <span className="relative flex h-8 w-8 items-center justify-center rounded-full bg-pink-500/20">
              <Heart size={16} className="text-pink-400" />
              <span className="absolute -top-0.5 -right-0.5 h-4 w-4 rounded-full bg-pink-500 text-[10px] text-white flex items-center justify-center font-bold">
                {pendingIncoming}
              </span>
            </span>
            <div className="text-left flex-1">
              <p className="text-sm font-semibold text-foreground">
                {partner?.name || 'Pasanganmu'} mengirim janji baru!
              </p>
              <p className="text-xs text-muted-foreground">Ketuk untuk melihat & menyetujui</p>
            </div>
            <Sparkles size={16} className="text-pink-400" />
          </motion.button>
        )}
      </AnimatePresence>

      {/* Create / Edit Form */}
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
                {editingId ? '✏️ Edit Draft' : '✨ Janji Baru'}
              </h3>
              <button onClick={resetForm} className="p-1 text-muted-foreground">
                <X size={16} />
              </button>
            </div>

            {/* Emoji picker */}
            <div>
              <button
                onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                className="flex items-center gap-2 text-sm text-muted-foreground"
              >
                <span className="text-2xl">{formEmoji}</span>
                <span className="text-xs">Pilih emoji</span>
                {showEmojiPicker ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
              </button>
              <AnimatePresence>
                {showEmojiPicker && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="flex flex-wrap gap-2 mt-2"
                  >
                    {EMOJI_OPTIONS.map((e) => (
                      <button
                        key={e}
                        onClick={() => { setFormEmoji(e); setShowEmojiPicker(false); }}
                        className={`text-xl p-1.5 rounded-lg transition-all ${
                          formEmoji === e ? 'bg-primary/20 scale-110' : 'hover:bg-secondary'
                        }`}
                      >
                        {e}
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
              placeholder="Judul janji..."
              maxLength={80}
              className="w-full px-3 py-2.5 rounded-xl bg-background/50 border border-border text-sm outline-none text-foreground placeholder:text-muted-foreground"
              style={{ fontSize: '16px' }}
            />

            {/* Description */}
            <textarea
              value={formDesc}
              onChange={(e) => setFormDesc(e.target.value)}
              placeholder="Deskripsi (opsional)..."
              className="w-full px-3 py-2 rounded-xl bg-background/50 border border-border text-sm outline-none resize-none h-20 text-foreground placeholder:text-muted-foreground"
              style={{ fontSize: '16px' }}
            />

            {/* Action buttons */}
            <div className="flex gap-2">
              <motion.button
                whileTap={{ scale: 0.97 }}
                onClick={handleSaveDraft}
                disabled={!formTitle.trim()}
                className="flex-1 py-2.5 rounded-xl bg-secondary text-secondary-foreground text-sm font-semibold flex items-center justify-center gap-1.5 disabled:opacity-40"
              >
                <Edit3 size={14} />
                {editingId ? 'Simpan' : 'Simpan Draft'}
              </motion.button>
              {!editingId && (
                <motion.button
                  whileTap={{ scale: 0.97 }}
                  onClick={handleSendDirect}
                  disabled={!formTitle.trim() || !partner}
                  className="flex-1 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-semibold flex items-center justify-center gap-1.5 disabled:opacity-40"
                >
                  <Send size={14} />
                  Kirim ke {partner?.name?.split(' ')[0] || '...'}
                </motion.button>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Tabs */}
      <div className="flex gap-1 p-1 rounded-xl bg-secondary/50 backdrop-blur-sm">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`relative flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-medium transition-all ${
              activeTab === tab.key
                ? 'bg-primary text-primary-foreground shadow-md'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            {tab.icon}
            {tab.label}
            {tab.count > 0 && (
              <span className={`ml-0.5 px-1.5 py-0.5 rounded-full text-[10px] font-bold ${
                activeTab === tab.key
                  ? 'bg-white/20 text-white'
                  : 'bg-primary/15 text-primary'
              }`}>
                {tab.count}
              </span>
            )}
            {/* Pulse dot for incoming */}
            {tab.key === 'pending' && pendingIncoming > 0 && activeTab !== 'pending' && (
              <span className="absolute top-1 right-1 h-2 w-2 rounded-full bg-pink-500 animate-pulse" />
            )}
          </button>
        ))}
      </div>

      {/* Loading */}
      {loading && (
        <div className="text-center py-10">
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ repeat: Infinity, duration: 1.5, ease: 'linear' }}
            className="inline-block text-2xl"
          >
            🤞
          </motion.div>
        </div>
      )}

      {/* ═══ DRAFTS TAB ═══ */}
      {!loading && activeTab === 'draft' && (
        <div className="space-y-3">
          {categorized.myDrafts.length === 0 ? (
            <EmptyState
              emoji="📝"
              title="Belum ada draft"
              subtitle="Buat janji baru lalu simpan sebagai draft dulu"
            />
          ) : (
            categorized.myDrafts.map((p, i) => (
              <DraftCard
                key={p.id}
                promise={p}
                index={i}
                partnerName={partner?.name?.split(' ')[0] || '...'}
                onSend={() => handleSendToPartner(p)}
                onEdit={() => handleEditDraft(p)}
                onDelete={() => handleDeleteDraft(p.id)}
              />
            ))
          )}
        </div>
      )}

      {/* ═══ PENDING TAB ═══ */}
      {!loading && activeTab === 'pending' && (
        <div className="space-y-4">
          {/* Incoming - need my approval */}
          {categorized.pendingReceived.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs font-semibold text-pink-400 uppercase tracking-wider px-1">
                💌 Perlu persetujuanmu
              </p>
              {categorized.pendingReceived.map((p, i) => (
                <IncomingCard
                  key={p.id}
                  promise={p}
                  index={i}
                  senderName={partner?.name || 'Pasanganmu'}
                  rejectingId={rejectingId}
                  rejectReason={rejectReason}
                  onRejectReasonChange={setRejectReason}
                  onStartReject={(id) => { setRejectingId(id); setRejectReason(''); }}
                  onCancelReject={() => setRejectingId(null)}
                  onApprove={() => handleApprove(p)}
                  onReject={() => handleReject(p)}
                />
              ))}
            </div>
          )}

          {/* Outgoing - waiting for partner */}
          {categorized.pendingSent.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs font-semibold text-amber-400 uppercase tracking-wider px-1">
                ⏳ Menunggu persetujuan {partner?.name?.split(' ')[0] || '...'}
              </p>
              {categorized.pendingSent.map((p, i) => (
                <PendingOutCard key={p.id} promise={p} index={i} />
              ))}
            </div>
          )}

          {categorized.pendingReceived.length === 0 && categorized.pendingSent.length === 0 && (
            <EmptyState
              emoji="📮"
              title="Tidak ada yang menunggu"
              subtitle="Kirim janji ke pasanganmu dari tab Draft"
            />
          )}
        </div>
      )}

      {/* ═══ APPROVED TAB ═══ */}
      {!loading && activeTab === 'approved' && (
        <div className="space-y-3">
          {categorized.approved.length === 0 ? (
            <EmptyState
              emoji="💞"
              title="Belum ada janji resmi"
              subtitle="Buat & kirim janji ke pasanganmu untuk disetujui"
            />
          ) : (
            categorized.approved.map((p, i) => (
              <ApprovedCard key={p.id} promise={p} index={i} userId={user?.id || ''} partnerName={partner?.name || ''} />
            ))
          )}

          {/* Show rejected at bottom if any */}
          {categorized.rejected.length > 0 && (
            <div className="space-y-2 mt-6">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider px-1">
                Ditolak
              </p>
              {categorized.rejected.map((p, i) => (
                <RejectedCard key={p.id} promise={p} index={i} />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

// ═══════════════════════════════════════════════════
// Sub-components
// ═══════════════════════════════════════════════════

const EmptyState = ({ emoji, title, subtitle }: { emoji: string; title: string; subtitle: string }) => (
  <motion.div
    initial={{ opacity: 0 }}
    animate={{ opacity: 1 }}
    className="text-center py-14"
  >
    <p className="text-4xl mb-3">{emoji}</p>
    <p className="text-sm font-medium text-foreground">{title}</p>
    <p className="text-xs text-muted-foreground mt-1">{subtitle}</p>
  </motion.div>
);

// ── Draft Card ──
const DraftCard = ({
  promise, index, partnerName, onSend, onEdit, onDelete,
}: {
  promise: PromiseRow; index: number; partnerName: string;
  onSend: () => void; onEdit: () => void; onDelete: () => void;
}) => (
  <motion.div
    initial={{ opacity: 0, y: 15 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ delay: index * 0.04 }}
    className="glass-card p-4 border border-dashed border-border/60"
  >
    <div className="flex items-start gap-3">
      <span className="text-2xl mt-0.5">{promise.emoji || '🤞'}</span>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-foreground truncate">{promise.title}</p>
        {promise.description && (
          <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{promise.description}</p>
        )}
        <p className="text-[10px] text-muted-foreground/60 mt-1.5 font-medium uppercase tracking-wider">
          Draft • belum dikirim
        </p>
      </div>
    </div>
    <div className="flex gap-2 mt-3">
      <motion.button
        whileTap={{ scale: 0.95 }}
        onClick={onEdit}
        className="flex-1 py-2 rounded-lg bg-secondary text-secondary-foreground text-xs font-medium flex items-center justify-center gap-1"
      >
        <Edit3 size={12} /> Edit
      </motion.button>
      <motion.button
        whileTap={{ scale: 0.95 }}
        onClick={onDelete}
        className="py-2 px-3 rounded-lg bg-destructive/10 text-destructive text-xs font-medium flex items-center justify-center"
      >
        <Trash2 size={12} />
      </motion.button>
      <motion.button
        whileTap={{ scale: 0.95 }}
        onClick={onSend}
        className="flex-1 py-2 rounded-lg bg-primary text-primary-foreground text-xs font-semibold flex items-center justify-center gap-1"
      >
        <Send size={12} /> Kirim ke {partnerName}
      </motion.button>
    </div>
  </motion.div>
);

// ── Incoming Request Card ──
const IncomingCard = ({
  promise, index, senderName, rejectingId, rejectReason,
  onRejectReasonChange, onStartReject, onCancelReject, onApprove, onReject,
}: {
  promise: PromiseRow; index: number; senderName: string;
  rejectingId: string | null; rejectReason: string;
  onRejectReasonChange: (v: string) => void;
  onStartReject: (id: string) => void; onCancelReject: () => void;
  onApprove: () => void; onReject: () => void;
}) => (
  <motion.div
    initial={{ opacity: 0, x: -20 }}
    animate={{ opacity: 1, x: 0 }}
    transition={{ delay: index * 0.06 }}
    className="glass-card p-4 border border-pink-500/30 bg-gradient-to-br from-pink-500/5 to-rose-500/5"
  >
    <div className="flex items-start gap-3">
      <span className="text-2xl mt-0.5">{promise.emoji || '🤞'}</span>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-foreground">{promise.title}</p>
        {promise.description && (
          <p className="text-xs text-muted-foreground mt-0.5">{promise.description}</p>
        )}
        <p className="text-[10px] text-pink-400/80 mt-1.5 font-medium">
          Dari {senderName} 💌
        </p>
      </div>
    </div>

    {rejectingId === promise.id ? (
      <motion.div
        initial={{ opacity: 0, height: 0 }}
        animate={{ opacity: 1, height: 'auto' }}
        className="mt-3 space-y-2"
      >
        <textarea
          value={rejectReason}
          onChange={(e) => onRejectReasonChange(e.target.value)}
          placeholder="Alasan menolak..."
          className="w-full px-3 py-2 rounded-lg bg-background/50 border border-border text-xs outline-none resize-none h-16 text-foreground placeholder:text-muted-foreground"
          style={{ fontSize: '16px' }}
        />
        <div className="flex gap-2">
          <button onClick={onCancelReject} className="flex-1 py-2 rounded-lg bg-secondary text-xs font-medium">
            Batal
          </button>
          <button
            onClick={onReject}
            disabled={!rejectReason.trim()}
            className="flex-1 py-2 rounded-lg bg-destructive text-destructive-foreground text-xs font-semibold disabled:opacity-40"
          >
            Tolak
          </button>
        </div>
      </motion.div>
    ) : (
      <div className="flex gap-2 mt-3">
        <motion.button
          whileTap={{ scale: 0.95 }}
          onClick={() => onStartReject(promise.id)}
          className="flex-1 py-2.5 rounded-lg bg-secondary text-secondary-foreground text-xs font-medium flex items-center justify-center gap-1"
        >
          <X size={13} /> Tolak
        </motion.button>
        <motion.button
          whileTap={{ scale: 0.95 }}
          onClick={onApprove}
          className="flex-1 py-2.5 rounded-lg bg-gradient-to-r from-pink-500 to-rose-500 text-white text-xs font-semibold flex items-center justify-center gap-1.5 shadow-lg shadow-pink-500/25"
        >
          <Check size={13} /> Setujui 💕
        </motion.button>
      </div>
    )}
  </motion.div>
);

// ── Pending Outgoing Card ──
const PendingOutCard = ({ promise, index }: { promise: PromiseRow; index: number }) => (
  <motion.div
    initial={{ opacity: 0, y: 12 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ delay: index * 0.04 }}
    className="glass-card p-4 border border-amber-500/20"
  >
    <div className="flex items-start gap-3">
      <span className="text-2xl mt-0.5">{promise.emoji || '🤞'}</span>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-foreground">{promise.title}</p>
        {promise.description && (
          <p className="text-xs text-muted-foreground mt-0.5">{promise.description}</p>
        )}
        <div className="flex items-center gap-1.5 mt-2">
          <Clock size={11} className="text-amber-400" />
          <p className="text-[10px] text-amber-400 font-medium">Menunggu persetujuan...</p>
        </div>
      </div>
    </div>
  </motion.div>
);

// ── Approved Card ──
const ApprovedCard = ({
  promise, index, userId, partnerName,
}: {
  promise: PromiseRow; index: number; userId: string; partnerName: string;
}) => {
  const isMine = promise.created_by === userId;
  const approvedDate = promise.approved_at
    ? new Date(promise.approved_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })
    : null;

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ delay: index * 0.05, type: 'spring', stiffness: 200 }}
      className="relative overflow-hidden rounded-2xl p-4 bg-gradient-to-br from-primary/10 via-pink-500/5 to-rose-500/10 border border-primary/20 backdrop-blur-sm shadow-lg shadow-primary/5"
    >
      {/* Decorative corner */}
      <div className="absolute top-0 right-0 w-16 h-16 bg-gradient-to-bl from-primary/10 to-transparent rounded-bl-3xl" />

      <div className="flex items-start gap-3 relative">
        <div className="w-10 h-10 rounded-xl bg-primary/15 flex items-center justify-center text-xl shrink-0">
          {promise.emoji || '🤞'}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-bold text-foreground">{promise.title}</p>
          {promise.description && (
            <p className="text-xs text-muted-foreground mt-1 leading-relaxed">{promise.description}</p>
          )}
          <div className="flex items-center gap-2 mt-2 flex-wrap">
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-green-500/15 text-green-400 text-[10px] font-semibold">
              <Shield size={10} /> Disetujui
            </span>
            <span className="text-[10px] text-muted-foreground">
              {isMine ? `Olehmu → ${partnerName}` : `Dari ${partnerName}`}
            </span>
          </div>
          {approvedDate && (
            <p className="text-[10px] text-muted-foreground/50 mt-1">{approvedDate}</p>
          )}
        </div>
      </div>
    </motion.div>
  );
};

// ── Rejected Card ──
const RejectedCard = ({ promise, index }: { promise: PromiseRow; index: number }) => (
  <motion.div
    initial={{ opacity: 0 }}
    animate={{ opacity: 0.6 }}
    transition={{ delay: index * 0.04 }}
    className="glass-card p-3 opacity-60"
  >
    <div className="flex items-start gap-3">
      <span className="text-xl mt-0.5 grayscale">{promise.emoji || '🤞'}</span>
      <div className="flex-1 min-w-0">
        <p className="text-xs font-medium text-foreground line-through">{promise.title}</p>
        {promise.rejection_reason && (
          <p className="text-[10px] text-destructive mt-0.5">"{promise.rejection_reason}"</p>
        )}
        <span className="inline-flex items-center gap-1 mt-1 text-[10px] text-destructive/70 font-medium">
          <X size={10} /> Ditolak
        </span>
      </div>
    </div>
  </motion.div>
);

export default PromisesPage;
