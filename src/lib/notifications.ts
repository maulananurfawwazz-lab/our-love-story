// ═══════════════════════════════════════════════════════════════
// notifyPartner – Send push notification to partner
// Client-side trigger → calls Supabase Edge Function
// ═══════════════════════════════════════════════════════════════

import { supabase } from '@/integrations/supabase/client';

export interface NotificationPayload {
  type: string;        // e.g. 'memory', 'chat', 'emotion', 'playlist', 'promise', 'surprise', 'goal'
  title: string;       // notification title
  body: string;        // notification body
  url: string;         // URL to open on tap
  tag?: string;        // grouping tag (optional)
}

/**
 * Send a push notification to the current user's partner.
 * This is fire-and-forget — failures are silently logged.
 * 
 * @param payload - Notification content
 * 
 * Usage:
 *   await notifyPartner({
 *     type: 'memory',
 *     title: 'Kenangan Baru 💕',
 *     body: `${profile.name} telah membuat kenangan baru`,
 *     url: '/gallery',
 *   });
 */
export async function notifyPartner(payload: NotificationPayload): Promise<void> {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.access_token) {
      console.warn('[Notify] No active session, skipping notification');
      return;
    }

    const fnUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/send-push-notification`;

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${session.access_token}`,
      'apikey': String(import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY),
    };

    const res = await fetch(fnUrl, {
      method: 'POST',
      headers,
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      const text = await res.text().catch(() => '');
      console.warn('[Notify] Push failed:', res.status, text);
    } else {
      console.log('[Notify] Push sent:', payload.type);
    }
  } catch (err) {
    // Fire and forget — don't break the user action
    console.warn('[Notify] Error sending push:', err);
  }
}

// ═══════════════════════════════════════════════════════════════
// Pre-built notification templates for each feature
// ═══════════════════════════════════════════════════════════════

export const NotificationTemplates = {
  memory: (senderName: string) => ({
    type: 'memory',
    title: 'Kenangan Baru 💕',
    body: `${senderName} telah membuat kenangan baru`,
    url: '/gallery',
    tag: 'memory',
  }),

  emotion: (senderName: string, emotionType: string) => ({
    type: 'emotion',
    title: 'Perasaan Hari Ini 💗',
    body: `${senderName} sedang ${emotionType.toLowerCase()} hari ini`,
    url: '/emotions',
    tag: 'emotion',
  }),

  chat: (senderName: string, messagePreview: string) => ({
    type: 'chat',
    title: `${senderName} 💌`,
    body: `${senderName}: ${messagePreview.slice(0, 100)}${messagePreview.length > 100 ? '...' : ''}`,
    url: '/chat',
    tag: 'chat',
  }),

  playlist: (senderName: string, songTitle: string) => ({
    type: 'playlist',
    title: 'Lagu Baru 🎶',
    body: `${senderName} menambahkan "${songTitle}" ke playlist kalian`,
    url: '/playlist',
    tag: 'playlist',
  }),

  promise: (senderName: string) => ({
    type: 'promise',
    title: 'Janji Baru 🤞',
    body: `${senderName} membuat janji untuk kalian berdua`,
    url: '/promises',
    tag: 'promise',
  }),

  promiseRequest: (senderName: string) => ({
    type: 'promise-request',
    title: 'Permintaan Janji 💌',
    body: `${senderName} mengirim janji baru untukmu. Setujui?`,
    url: '/promises',
    tag: 'promise-request',
  }),

  promiseApproved: (senderName: string) => ({
    type: 'promise-approved',
    title: 'Janji Disetujui! 💕',
    body: `${senderName} menyetujui janjimu. Sekarang resmi!`,
    url: '/promises',
    tag: 'promise-approved',
  }),

  promiseRejected: (senderName: string) => ({
    type: 'promise-rejected',
    title: 'Janji Ditolak 😢',
    body: `${senderName} menolak janjimu`,
    url: '/promises',
    tag: 'promise-rejected',
  }),

  surprise: (senderName: string) => ({
    type: 'surprise',
    title: 'Kejutan Baru 🎁',
    body: `${senderName} menyiapkan kejutan untukmu`,
    url: '/surprises',
    tag: 'surprise',
  }),

  surpriseOpened: (senderName: string) => ({
    type: 'surprise-opened',
    title: 'Kejutan Dibuka! 💌',
    body: `${senderName} membuka kejutanmu`,
    url: '/surprises',
    tag: 'surprise-opened',
  }),

  surpriseReaction: (senderName: string, reaction: string) => ({
    type: 'surprise-reaction',
    title: `Reaksi: ${reaction}`,
    body: `${senderName} bereaksi ${reaction} terhadap kejutanmu`,
    url: '/surprises',
    tag: 'surprise-reaction',
  }),

  goal: (senderName: string) => ({
    type: 'goal',
    title: 'Impian Baru ✨',
    body: `${senderName} menambahkan impian untuk masa depan kalian`,
    url: '/goals',
    tag: 'goal',
  }),

  timeline: (senderName: string) => ({
    type: 'timeline',
    title: 'Momen Baru 📅',
    body: `${senderName} menambahkan momen ke timeline kalian`,
    url: '/timeline',
    tag: 'timeline',
  }),

  // Generic template for future features
  generic: (senderName: string, featureName: string, url: string) => ({
    type: 'generic',
    title: `${featureName} 💕`,
    body: `${senderName} menambahkan sesuatu yang baru`,
    url,
    tag: 'generic',
  }),
} as const;
