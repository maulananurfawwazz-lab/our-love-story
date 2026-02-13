// ═══════════════════════════════════════════════════════════════
// Service Worker – Our Journey PWA
// Handles: push notifications, notification clicks, caching
// ═══════════════════════════════════════════════════════════════

const SW_VERSION = '2.0.0';

// Valid in-app routes — used as a safeguard
const VALID_ROUTES = [
  '/', '/chat', '/gallery', '/emotions', '/profile',
  '/timeline', '/promises', '/surprises', '/finances',
  '/goals', '/playlist',
];

/** Ensure the URL is a valid in-app route, never external or broken */
function sanitizeRoute(url) {
  if (!url || typeof url !== 'string') return '/';
  // Strip to pathname only (no origin, no query for safety)
  try {
    const parsed = new URL(url, self.location.origin);
    const pathname = parsed.pathname;
    // Check if it's one of our known routes
    if (VALID_ROUTES.includes(pathname)) return pathname;
    // Fallback: return root
    return '/';
  } catch {
    // If url is already just a path like "/chat"
    if (VALID_ROUTES.includes(url)) return url;
    return '/';
  }
}

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

  const { title, body, url, tag, icon, badge, type } = payload;
  const route = sanitizeRoute(url);

  const options = {
    body: body || '',
    icon: icon || '/icon-192x192.png',
    badge: badge || '/icon-96x96.png',
    tag: tag || `our-journey-${Date.now()}`,
    renotify: true,
    vibrate: [100, 50, 100, 50, 200],
    data: {
      url: route,
      type: type || tag || 'general',
      dateOfArrival: Date.now(),
    },
    actions: [],
    silent: false,
  };

  event.waitUntil(
    self.registration.showNotification(title || 'Our Journey 💕', options)
  );
});

// ─── Notification Click ────────────────────────────────────────
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  const route = sanitizeRoute(event.notification.data?.url);
  const notifType = event.notification.data?.type || 'general';
  // Build full URL for openWindow (must be absolute)
  const fullUrl = new URL(route, self.location.origin).href;

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      // Strategy 1: If app is already open, use postMessage for SPA navigation
      for (const client of clientList) {
        if (client.url.startsWith(self.location.origin) && 'focus' in client) {
          return client.focus().then((focusedClient) => {
            // Send message to the React app so it can use React Router
            focusedClient.postMessage({
              type: 'NOTIFICATION_CLICK',
              route: route,
              notifType: notifType,
            });
          });
        }
      }
      // Strategy 2: App is closed — open new window at the route
      // SPA fallback (vercel.json / _redirects / 200.html) ensures index.html is served
      return self.clients.openWindow(fullUrl);
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

// ─── Fetch (network-first, SW needed for push) ───────────────
self.addEventListener('fetch', (event) => {
  // Network-first — let hosting handle caching
  // SW is primarily for push notifications
});
