/**
 * Service Worker - Música da Segunda
 * VERSION 6.0.0 : Service Worker minimal et stable
 * 
 * Ce SW est volontairement minimal pour éviter les problèmes de cache
 * tout en permettant l'installation PWA.
 */

const CACHE_VERSION = 'v6.0.0';
const CACHE_NAME = `musica-da-segunda-${CACHE_VERSION}`;

console.log(`✅ Service Worker ${CACHE_VERSION}: Mode minimal stable`);

// Installation - Ne pré-cache RIEN pour éviter les erreurs
self.addEventListener('install', (event) => {
  console.log(`📦 SW ${CACHE_VERSION}: Installation`);
  // Skip waiting pour activation immédiate
  self.skipWaiting();
});

// Activation - Nettoyer les anciens caches
self.addEventListener('activate', (event) => {
  console.log(`✅ SW ${CACHE_VERSION}: Activation`);
  
  event.waitUntil(
    Promise.all([
      // Supprimer tous les anciens caches
      caches.keys().then(cacheNames => {
        return Promise.all(
          cacheNames
            .filter(cacheName => cacheName !== CACHE_NAME)
            .map(cacheName => {
              console.log(`🗑️ Suppression cache obsolète: ${cacheName}`);
              return caches.delete(cacheName);
            })
        );
      }),
      // Prendre le contrôle immédiatement
      self.clients.claim()
    ])
  );
});

// Fetch - Stratégie Network-First (toujours essayer le réseau en premier)
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);
  
  // Ignorer les requêtes non-GET et les requêtes vers d'autres domaines
  if (request.method !== 'GET' || url.origin !== self.location.origin) {
    return;
  }
  
  event.respondWith(
    fetch(request)
      .then(response => {
        // Si la réponse réseau est OK, la retourner directement
        if (response && response.status === 200) {
          // Optionnel : mettre en cache pour utilisation offline future
          const responseToCache = response.clone();
          caches.open(CACHE_NAME).then(cache => {
            cache.put(request, responseToCache);
          });
        }
        return response;
      })
      .catch(() => {
        // En cas d'échec réseau, essayer le cache
        return caches.match(request).then(cachedResponse => {
          if (cachedResponse) {
            console.log(`📦 Serving from cache: ${url.pathname}`);
            return cachedResponse;
          }
          // Si pas de cache, retourner une réponse d'erreur basique
          return new Response('Offline - Page not available', {
            status: 503,
            statusText: 'Service Unavailable',
            headers: new Headers({
              'Content-Type': 'text/plain'
            })
          });
        });
      })
  );
});

console.log('✅ Service Worker minimal chargé - Network-First strategy');
