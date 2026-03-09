const CACHE_VERSION = 'v9.0.0';
const CACHE_NAME = `musica-da-segunda-${CACHE_VERSION}`;
const SHELL_MANIFEST_URL = '/sw-assets.json';

const CORE_URLS = [
  '/',
  '/index.html',
  '/offline.html',
  '/manifest.json',
  '/sw-assets.json',
  '/content/songs.json',
  '/images/Caipivara_transp-removebg-preview.png',
  '/icons/pwa/icon-192x192.png',
  '/icons/pwa/icon-512x512.png'
];

function normalizeUrl(url) {
  try {
    const parsed = new URL(url, self.location.origin);
    return parsed.origin === self.location.origin ? parsed.pathname : null;
  } catch {
    return null;
  }
}

async function loadShellAssetsManifest() {
  try {
    const response = await fetch(SHELL_MANIFEST_URL, { cache: 'no-store' });
    if (!response.ok) return [];

    const payload = await response.json();
    if (!Array.isArray(payload?.assets)) return [];

    return payload.assets.map((asset) => normalizeUrl(asset)).filter(Boolean);
  } catch {
    return [];
  }
}

async function precacheShell() {
  const cache = await caches.open(CACHE_NAME);
  const shellAssets = await loadShellAssetsManifest();
  const urlsToCache = [...new Set([...CORE_URLS, ...shellAssets])];

  await Promise.all(
    urlsToCache.map(async (url) => {
      try {
        await cache.add(url);
      } catch {
        // Keep install resilient if one asset fails.
      }
    })
  );
}

self.addEventListener('install', (event) => {
  event.waitUntil(precacheShell().then(() => self.skipWaiting()));
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    Promise.all([
      caches.keys().then((cacheNames) =>
        Promise.all(
          cacheNames
            .filter((cacheName) => cacheName !== CACHE_NAME)
            .map((cacheName) => caches.delete(cacheName))
        )
      ),
      self.registration.navigationPreload?.enable?.().catch(() => undefined),
      self.clients.claim()
    ])
  );
});

self.addEventListener('message', (event) => {
  if (event.data?.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

self.addEventListener('fetch', (event) => {
  const { request } = event;

  if (request.method !== 'GET') return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  const pathname = url.pathname;
  const isStaticAsset = /\.(?:css|js|woff2?|png|jpg|jpeg|webp|svg|ico)$/i.test(pathname);
  const isContentPayload = pathname.startsWith('/content/') || pathname.includes('/api/');
  const isImageRequest = request.destination === 'image';

  // HTML navigation: network-first with offline page fallback.
  if (request.mode === 'navigate') {
    event.respondWith(
      (async () => {
        try {
          const preloadResponse = await event.preloadResponse;
          if (preloadResponse) {
            const copy = preloadResponse.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(request, copy));
            return preloadResponse;
          }
        } catch {
          // Ignore preload failures.
        }

        return fetch(request)
          .then((response) => {
            if (response && response.ok) {
              const copy = response.clone();
              caches.open(CACHE_NAME).then((cache) => cache.put(request, copy));
            }
            return response;
          })
          .catch(async () => {
            const cache = await caches.open(CACHE_NAME);
            return (
              (await cache.match(request)) ||
              (await cache.match('/offline.html')) ||
              new Response('<h1>Offline</h1>', {
                status: 503,
                headers: { 'Content-Type': 'text/html; charset=utf-8' }
              })
            );
          });
      })()
    );
    return;
  }

  // Images and cover assets: cache-first to keep the weekly experience visible offline.
  if (isImageRequest) {
    event.respondWith(
      caches.match(request).then(async (cached) => {
        if (cached) return cached;
        try {
          const response = await fetch(request);
          if (response && response.ok) {
            const copy = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(request, copy));
          }
          return response;
        } catch {
          return new Response('', { status: 503 });
        }
      })
    );
    return;
  }

  // Song metadata and shell assets: stale-while-revalidate for a snappier PWA shell.
  if (isStaticAsset || isContentPayload) {
    event.respondWith(
      caches.match(request).then(async (cached) => {
        const networkFetch = fetch(request)
          .then((response) => {
            if (response && response.ok) {
              const copy = response.clone();
              caches.open(CACHE_NAME).then((cache) => cache.put(request, copy));
            }
            return response;
          })
          .catch(() => cached || new Response('', { status: 503 }));

        return cached || networkFetch;
      })
    );
    return;
  }

  // Other same-origin GET requests: network-first with cache fallback.
  event.respondWith(
    fetch(request)
      .then((response) => {
        if (response && response.ok) {
          const copy = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(request, copy));
        }
        return response;
      })
      .catch(async () => {
        const cache = await caches.open(CACHE_NAME);
        return cache.match(request) || new Response('', { status: 503 });
      })
  );
});

self.addEventListener('push', (event) => {
  const defaultTitle = 'A Musica da Segunda';
  const defaultBody = 'Nova musica disponivel. Toque para ouvir.';
  const defaultUrl = '/';

  let payload = {};
  try {
    payload = event.data ? event.data.json() : {};
  } catch {
    payload = { body: event.data?.text?.() || defaultBody };
  }

  const title = payload.title || defaultTitle;
  const body = payload.body || defaultBody;
  const url = payload.url || defaultUrl;
  const icon = payload.icon || '/icons/pwa/icon-192x192.png';
  const badge = payload.badge || '/icons/pwa/icon-72x72.png';

  event.waitUntil(
    self.registration.showNotification(title, {
      body,
      icon,
      badge,
      tag: payload.tag || 'new-song',
      renotify: true,
      data: { url }
    })
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const targetUrl = event.notification?.data?.url || '/';

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
      for (const client of windowClients) {
        if ('focus' in client && client.url.includes(self.location.origin)) {
          client.navigate(targetUrl);
          return client.focus();
        }
      }
      if (clients.openWindow) {
        return clients.openWindow(targetUrl);
      }
      return undefined;
    })
  );
});
