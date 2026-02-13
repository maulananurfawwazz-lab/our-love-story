// ═══════════════════════════════════════════════════════════════
// ChatPage – WhatsApp-like chat for iOS PWA
// ═══════════════════════════════════════════════════════════════
// Key iOS fixes:
//   1. VisualViewport API for keyboard height detection
//   2. Fixed input bar that sticks above keyboard
//   3. Message area dynamically resized to fill remaining space
//   4. Smart auto-scroll (only when near bottom)
//   5. BottomNav hidden when keyboard is open
//   6. No ghost padding, no layout jump
// ═══════════════════════════════════════════════════════════════

import { useState, useEffect, useRef, useCallback } from 'react';
import { motion } from 'framer-motion';
import { useAuth } from '@/contexts/AuthContext';
import { Send } from 'lucide-react';
import { format } from 'date-fns';
import { notifyPartner, NotificationTemplates } from '@/lib/notifications';
import { useRealtimeTable } from '@/hooks/useRealtimeTable';
import { useIOSKeyboard } from '@/hooks/useIOSKeyboard';

interface ChatMsg {
  id: string;
  sender_id: string;
  message: string;
  created_at: string;
}

// ─── Constants ─────────────────────────────────────────────────
const BOTTOM_NAV_HEIGHT = 68; // px – matches ios-bottom-nav approx height
const SCROLL_NEAR_BOTTOM_THRESHOLD = 150; // px – how close to bottom counts as "at bottom"
const INPUT_BAR_HEIGHT = 60;

const ChatPage = () => {
  const { user, profile, partner } = useAuth();
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const [inputFocused, setInputFocused] = useState(false);

  const scrollRef = useRef<HTMLDivElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const isNearBottom = useRef(true);
  const prevMessageCount = useRef(0);

  const { keyboardHeight, isOpen: kbOpen } = useIOSKeyboard();

  const { data: messages, insert } = useRealtimeTable<ChatMsg>({
    table: 'chat_messages',
    coupleId: profile?.couple_id,
    orderBy: { column: 'created_at', ascending: true },
    limit: 200,
  });

  // ─── Track scroll position ──────────────────────────────────
  const handleScroll = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    const distanceFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight;
    isNearBottom.current = distanceFromBottom < SCROLL_NEAR_BOTTOM_THRESHOLD;
  }, []);

  // ─── Smart auto-scroll ──────────────────────────────────────
  // Scroll to bottom only when:
  //   a) Initial load (count was 0)
  //   b) User sent a new message (always scroll own messages)
  //   c) New message arrived AND user was already near bottom
  useEffect(() => {
    const count = messages.length;
    const isNewMessage = count > prevMessageCount.current;
    prevMessageCount.current = count;

    if (!isNewMessage && count > 0) return;

    // Determine if the latest message is ours
    const latest = messages[messages.length - 1];
    const isMine = latest?.sender_id === user?.id;

    if (isMine || isNearBottom.current || count <= 1) {
      requestAnimationFrame(() => {
        bottomRef.current?.scrollIntoView({ behavior: count <= 1 ? 'auto' : 'smooth' });
      });
    }
  }, [messages, user?.id]);

  // ─── When keyboard opens, keep latest msg visible ───────────
  useEffect(() => {
    if (kbOpen && isNearBottom.current) {
      requestAnimationFrame(() => {
        bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
      });
    }
  }, [kbOpen, keyboardHeight]);

  // ─── Hide BottomNav when keyboard is open ───────────────────
  // Direct DOM manipulation because BottomNav lives outside this component
  useEffect(() => {
    const nav = document.querySelector('.ios-bottom-nav') as HTMLElement | null;
    if (!nav) return;

    if (inputFocused || kbOpen) {
      nav.style.transform = 'translateY(100%)';
      nav.style.transition = 'transform 0.25s ease';
      nav.style.pointerEvents = 'none';
    } else {
      nav.style.transform = 'translateY(0)';
      nav.style.transition = 'transform 0.25s ease';
      nav.style.pointerEvents = '';
    }

    return () => {
      nav.style.transform = '';
      nav.style.transition = '';
      nav.style.pointerEvents = '';
    };
  }, [inputFocused, kbOpen]);

  // ─── Send message ───────────────────────────────────────────
  const sendMessage = async () => {
    if (!text.trim() || !profile?.couple_id || !user) return;
    setSending(true);
    const msg = text.trim();
    setText('');

    // Keep input focused after send (like WhatsApp)
    requestAnimationFrame(() => inputRef.current?.focus());

    await insert({ sender_id: user.id, message: msg });

    // Push notification: "Name: message content"
    notifyPartner(NotificationTemplates.chat(profile?.name || 'Pasanganmu', msg));

    setSending(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const isMe = (senderId: string) => senderId === user?.id;

  // ─── Layout: bottom offset calculation ──────────────────────
  // Keyboard open → input sits above keyboard
  // Keyboard closed → input sits above BottomNav
  const bottomOffset = kbOpen ? keyboardHeight : BOTTOM_NAV_HEIGHT;

  return (
    <div
      className="flex flex-col max-w-lg mx-auto"
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        zIndex: kbOpen ? 40 : undefined,
        paddingTop: 'env(safe-area-inset-top, 0px)',
      }}
    >
      {/* ═══ Header ═══ */}
      <div className="flex-shrink-0 px-4 pt-3 pb-2">
        <div className="glass-card p-3 text-center">
          <h2 className="font-script text-xl text-gradient-love">Chat Kita 💬</h2>
          {partner && (
            <p className="text-[10px] text-muted-foreground mt-0.5">
              dengan {partner.name}
            </p>
          )}
        </div>
      </div>

      {/* ═══ Messages ═══ */}
      <div
        ref={scrollRef}
        onScroll={handleScroll}
        className="flex-1 overflow-y-auto px-4 py-2 space-y-1.5 no-scrollbar"
        style={{
          paddingBottom: INPUT_BAR_HEIGHT + bottomOffset + 8,
          WebkitOverflowScrolling: 'touch',
          overscrollBehavior: 'none',
        }}
      >
        {/* Date header for first message */}
        {messages.length > 0 && (
          <div className="text-center py-2">
            <span className="text-[10px] text-muted-foreground/60 bg-secondary/50 px-3 py-1 rounded-full">
              {format(new Date(messages[0].created_at), 'dd MMM yyyy')}
            </span>
          </div>
        )}

        {messages.map((msg, idx) => {
          const mine = isMe(msg.sender_id);
          const isTemp = msg.id.startsWith('temp-');

          // Show date separator when day changes
          const prevMsg = idx > 0 ? messages[idx - 1] : null;
          const showDateSep = prevMsg &&
            format(new Date(msg.created_at), 'yyyy-MM-dd') !==
            format(new Date(prevMsg.created_at), 'yyyy-MM-dd');

          return (
            <div key={msg.id}>
              {showDateSep && (
                <div className="text-center py-2 my-1">
                  <span className="text-[10px] text-muted-foreground/60 bg-secondary/50 px-3 py-1 rounded-full">
                    {format(new Date(msg.created_at), 'dd MMM yyyy')}
                  </span>
                </div>
              )}
              <motion.div
                initial={{ opacity: 0, y: 6, scale: 0.97 }}
                animate={{ opacity: isTemp ? 0.7 : 1, y: 0, scale: 1 }}
                transition={{ duration: 0.2, ease: 'easeOut' }}
                className={`flex ${mine ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[75%] px-3.5 py-2 ${
                    mine
                      ? 'bg-primary text-primary-foreground rounded-2xl rounded-br-md shadow-sm shadow-primary/20'
                      : 'glass-card rounded-2xl rounded-bl-md'
                  }`}
                >
                  <p className="text-[13px] leading-relaxed break-words whitespace-pre-wrap">
                    {msg.message}
                  </p>
                  <div className={`flex items-center gap-1 mt-0.5 ${mine ? 'justify-end' : ''}`}>
                    <p className={`text-[9px] ${
                      mine ? 'text-primary-foreground/50' : 'text-muted-foreground/60'
                    }`}>
                      {format(new Date(msg.created_at), 'HH:mm')}
                    </p>
                    {mine && !isTemp && (
                      <span className="text-[8px] text-primary-foreground/40">✓</span>
                    )}
                  </div>
                </div>
              </motion.div>
            </div>
          );
        })}

        {/* Empty state */}
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full py-20">
            <motion.div
              animate={{ y: [-3, 3, -3] }}
              transition={{ duration: 3, repeat: Infinity }}
              className="text-5xl mb-3"
            >
              💌
            </motion.div>
            <p className="font-script text-lg text-gradient-love">Mulai chat kalian</p>
            <p className="text-[11px] text-muted-foreground mt-1">
              Kirim pesan pertama... 💕
            </p>
          </div>
        )}

        <div ref={bottomRef} className="h-1" />
      </div>

      {/* ═══ Fixed Input Bar ═══ */}
      <div
        style={{
          position: 'fixed',
          left: 0,
          right: 0,
          bottom: kbOpen ? keyboardHeight : BOTTOM_NAV_HEIGHT,
          zIndex: 45,
          transition: 'bottom 0.15s ease-out',
          paddingBottom: kbOpen ? 0 : 'env(safe-area-inset-bottom, 0px)',
        }}
      >
        <div className="max-w-lg mx-auto px-3 py-2">
          <div
            className="flex items-center gap-2 px-2 py-1.5 rounded-full"
            style={{
              background: 'hsl(340 40% 97% / 0.92)',
              backdropFilter: 'blur(20px)',
              WebkitBackdropFilter: 'blur(20px)',
              border: '1px solid hsl(340 30% 90% / 0.5)',
              boxShadow: '0 -2px 20px hsl(340 40% 50% / 0.06)',
            }}
          >
            <input
              ref={inputRef}
              value={text}
              onChange={(e) => setText(e.target.value)}
              onKeyDown={handleKeyDown}
              onFocus={() => setInputFocused(true)}
              onBlur={() => setInputFocused(false)}
              placeholder="Tulis pesan..."
              enterKeyHint="send"
              autoComplete="off"
              autoCorrect="on"
              className="flex-1 bg-transparent px-3 py-2 outline-none text-foreground placeholder:text-muted-foreground/50"
              style={{
                // 16px prevents iOS auto-zoom on focus
                fontSize: '16px',
                // GPU layer for smooth keyboard animation
                transform: 'translate3d(0,0,0)',
              }}
            />
            <motion.button
              whileTap={{ scale: 0.85 }}
              onClick={sendMessage}
              disabled={sending || !text.trim()}
              className="flex-shrink-0 w-9 h-9 rounded-full bg-primary text-primary-foreground flex items-center justify-center disabled:opacity-40 transition-opacity"
            >
              <Send size={16} strokeWidth={2.5} />
            </motion.button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ChatPage;
