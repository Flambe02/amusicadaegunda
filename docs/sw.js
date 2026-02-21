const CACHE_VERSION = 'v7.0.0';
const CACHE_NAME = `musica-da-segunda-${CACHE_VERSION}`;

const CORE_URLS = [
  '/',
  '/index.html',
  '/offline.html',
  '/manifest.json',
  '/pwa-install.js',
  '/pwa-install.css'
];

function normalizeUrl(url) {
  try {
    const parsed = new URL(url, self.location.origin);
    return parsed.origin === self.location.origin ? parsed.pathname : null;
  } catch {
    return null;
  }
}

async function discoverShellAssets() {
  const assets = new Set();

  try {
    const response = await fetch('/index.html', { cache: 'no-store' });
    if (!response.ok) return assets;

    const html = await response.text();
    const assetRegex = /(?:href|src)="([^"]+\.(?:js|css))"/g;
    let match;

    while ((match = assetRegex.exec(html)) !== null) {
      const pathname = normalizeUrl(match[1]);
      if (pathname) assets.add(pathname);
    }
  } catch {
    // Best effort only.
  }

  return assets;
}

async function precacheShell() {
  const cache = await caches.open(CACHE_NAME);
  const shellAssets = await discoverShellAssets();
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
      self.clients.claim()
    ])
  );
});

self.addEventListener('fetch', (event) => {
  const { request } = event;

  if (request.method !== 'GET') return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  // HTML navigation: network-first with offline page fallback.
  if (request.mode === 'navigate') {
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
          return (
            (await cache.match(request)) ||
            (await cache.match('/offline.html')) ||
            new Response('<h1>Offline</h1>', {
              status: 503,
              headers: { 'Content-Type': 'text/html; charset=utf-8' }
            })
          );
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