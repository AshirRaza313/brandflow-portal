// ── Valtriox Service Worker v2 ──
// Handles push notifications, offline caching, background sync, and app shell precaching.

const CACHE_NAME = 'valtriox-v2';
const STATIC_CACHE = 'valtriox-static-v2';
const API_CACHE = 'valtriox-api-v2';

// ── App Shell: critical pages and assets to precache ──
const APP_SHELL = [
  '/',
  '/manifest.json',
  '/valtriox-logo.png',
  '/valtriox-icon-192.png',
  '/valtriox-icon-512.png',
  '/apple-touch-icon.png',
];

// ── API routes that should be cached with network-first ──
const API_CACHE_PATTERNS = [
  /\/api\/dashboard\/stats/,
  /\/api\/products/,
  /\/api\/orders/,
  /\/api\/customers/,
];

// ── Cache size limits ──
const MAX_API_CACHE_ENTRIES = 50;
const MAX_STATIC_CACHE_ENTRIES = 100;

// ── Install: precache app shell ──
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(STATIC_CACHE).then((cache) => {
      console.log('[SW] Pre-caching app shell');
      return cache.addAll(APP_SHELL);
    })
  );
  self.skipWaiting();
});

// ── Activate: clean up old caches ──
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((k) => k !== STATIC_CACHE && k !== API_CACHE)
          .map((k) => {
            console.log('[SW] Deleting old cache:', k);
            return caches.delete(k);
          })
      )
    )
  );
  self.clients.claim();
});

// ── Push: show notification when server sends a push message ──
self.addEventListener('push', (event) => {
  let data = {
    title: 'Valtriox',
    body: 'You have a new notification',
    icon: '/valtriox-icon-192.png',
    badge: '/valtriox-icon-32.png',
    url: '/',
  };

  if (event.data) {
    try {
      data = { ...data, ...event.data.json() };
    } catch {
      data.body = event.data.text();
    }
  }

  event.waitUntil(
    self.registration.showNotification(data.title, {
      body: data.body,
      icon: data.icon,
      badge: data.badge,
      data: { url: data.url || '/' },
      vibrate: [100, 50, 100],
      tag: 'valtriox-notification',
      renotify: true,
      actions: [
        { action: 'open', title: 'Open App' },
        { action: 'dismiss', title: 'Dismiss' },
      ],
    })
  );
});

// ── Notification Click: focus or open the app ──
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  if (event.action === 'dismiss') return;

  const url = event.notification.data?.url || '/';

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clients) => {
      for (const client of clients) {
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          return client.focus();
        }
      }
      return self.clients.openWindow(url);
    })
  );
});

// ── Helper: limit cache entries ──
async function trimCache(cacheName, maxEntries) {
  const cache = await caches.open(cacheName);
  const keys = await cache.keys();
  if (keys.length > maxEntries) {
    await cache.delete(keys[0]);
  }
}

// ── Fetch: strategy router ──
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET requests
  if (request.method !== 'GET') return;

  // Skip chrome-extension and other non-http(s) requests
  if (!url.protocol.startsWith('http')) return;

  // Strategy 1: API routes — Network First with API cache fallback
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(networkFirstWithApiCache(request));
    return;
  }

  // Strategy 2: Static assets (JS, CSS, images, fonts) — Stale While Revalidate
  if (
    url.pathname.match(/\.(js|css|png|jpg|jpeg|svg|gif|ico|woff2?|ttf|eot)$/) ||
    url.pathname.includes('/_next/static/') ||
    url.pathname.includes('/_next/image/')
  ) {
    event.respondWith(staleWhileRevalidate(request));
    return;
  }

  // Strategy 3: App Shell pages — Cache First
  if (APP_SHELL.some((path) => url.pathname === path)) {
    event.respondWith(cacheFirst(request));
    return;
  }

  // Strategy 4: Everything else — Network with cache fallback
  event.respondWith(networkFirst(request));
});

// ── Cache First: serve from cache, fallback to network ──
async function cacheFirst(request) {
  const cached = await caches.match(request);
  if (cached) return cached;

  try {
    const response = await fetch(request);
    if (response && response.status === 200) {
      const cache = await caches.open(STATIC_CACHE);
      cache.put(request, response.clone());
    }
    return response;
  } catch {
    return new Response('Offline', { status: 503, statusText: 'Service Unavailable' });
  }
}

// ── Network First: try network, fallback to cache ──
async function networkFirst(request) {
  try {
    const response = await fetch(request);
    if (response && response.status === 200) {
      const cache = await caches.open(STATIC_CACHE);
      cache.put(request, response.clone());
    }
    return response;
  } catch {
    const cached = await caches.match(request);
    if (cached) return cached;
    return new Response('Offline', { status: 503, statusText: 'Service Unavailable' });
  }
}

// ── Network First with API Cache: for API routes ──
async function networkFirstWithApiCache(request) {
  try {
    const response = await fetch(request);
    if (response && response.status === 200) {
      const cache = await caches.open(API_CACHE);
      cache.put(request, response.clone());
      trimCache(API_CACHE, MAX_API_CACHE_ENTRIES);
    }
    return response;
  } catch {
    const cached = await caches.match(request);
    if (cached) return cached;
    return new Response(
      JSON.stringify({ error: 'You are offline. Please check your connection.' }),
      {
        status: 503,
        statusText: 'Service Unavailable',
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }
}

// ── Stale While Revalidate: serve cache immediately, update in background ──
async function staleWhileRevalidate(request) {
  const cache = await caches.open(STATIC_CACHE);
  const cached = await cache.match(request);

  const fetchPromise = fetch(request)
    .then((response) => {
      if (response && response.status === 200) {
        cache.put(request, response.clone());
        trimCache(STATIC_CACHE, MAX_STATIC_CACHE_ENTRIES);
      }
      return response;
    })
    .catch(() => cached);

  return cached || fetchPromise;
}

// ── Background Sync: sync pending requests when back online ──
self.addEventListener('sync', (event) => {
  if (event.tag === 'valtriox-sync') {
    console.log('[SW] Background sync triggered');
    // Can be extended to replay failed API calls
  }
});
