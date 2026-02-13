// ═══════════════════════════════════════════════════════════════
// Service Worker – Our Journey PWA
// Handles: push notifications, notification clicks, caching
// ═══════════════════════════════════════════════════════════════

const SW_VERSION = '1.0.0';

// ─── Push Event ────────────────────────────────────────────────
self.addEventListener('push', (event) => {
  if (!event.data) return;

  let payload;
  try {
    payload = event.data.json();
  } catch {
    payload = {
      title: 'Our Journey 💕',
      body: event.data.text(),
      url: '/',
    };
  }

  const { title, body, url, tag, icon, badge } = payload;

  const options = {
    body: body || '',
    icon: icon || '/icon-192x192.png',
    badge: badge || '/icon-96x96.png',
    tag: tag || `our-journey-${Date.now()}`,
    renotify: true,
    vibrate: [100, 50, 100, 50, 200],
    data: {
      url: url || '/',
      dateOfArrival: Date.now(),
    },
    actions: [],
    // Silent when possible on Android for intimate feel
    silent: false,
  };

  event.waitUntil(
    self.registration.showNotification(title || 'Our Journey 💕', options)
  );
});

// ─── Notification Click ────────────────────────────────────────
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  const targetUrl = event.notification.data?.url || '/';

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      // If app is already open, navigate to the right page
      for (const client of clientList) {
        if (client.url.includes(self.location.origin)) {
          client.focus();
          client.navigate(targetUrl);
          return;
        }
      }
      // Otherwise open a new window
      return self.clients.openWindow(targetUrl);
    })
  );
});

// ─── Install & Activate ───────────────────────────────────────
self.addEventListener('install', (event) => {
  console.log(`[SW] Installing v${SW_VERSION}`);
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  console.log(`[SW] Activated v${SW_VERSION}`);
  event.waitUntil(self.clients.claim());
});

// ─── Background Fetch (future-proof) ──────────────────────────
self.addEventListener('fetch', (event) => {
  // Network-first strategy – let Vercel handle caching
  // We only need the SW for push notifications
});
