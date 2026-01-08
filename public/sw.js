/**
 * Service Worker Optimisé - Música da Segunda
 * PATCH 3: Versioning des assets + Stratégies de cache intelligentes + Background sync
 * 
 * Stratégies implémentées :
 * - Cache-first pour assets statiques (CSS, JS, images, icônes)
 * - Network-first pour API et TikTok (avec fallback cache)
 * - Stale-while-revalidate pour HTML
 * - Background sync pour TikTok
 * - Versioning automatique des assets
 */

// ⚠️ DEV MODE: Désactiver complètement le Service Worker sur localhost
// Le script s'arrête ici sans faire de throw (qui causerait une erreur d'évaluation)
if (self.location.hostname === 'localhost' || self.location.hostname === '127.0.0.1') {
  console.log('🧹 DEV mode: Service Worker désactivé - pas de cache en développement');
  // Ne rien faire - le SW s'enregistre mais ne fait rien
  self.addEventListener('install', (event) => {
    console.log('🧹 DEV: SW install - skipWaiting');
    self.skipWaiting();
  });
  self.addEventListener('activate', (event) => {
    console.log('🧹 DEV: SW activate - claim clients');
    event.waitUntil(self.clients.claim());
  });
  self.addEventListener('fetch', (event) => {
    // Laisser passer toutes les requêtes sans interception
    return;
  });
} else {
// ✅ PRODUCTION: Code normal du Service Worker

const CACHE_NAME = 'musica-da-segunda-v5.2.9';
const STATIC_CACHE = 'static-v5.2.9';
const DYNAMIC_CACHE = 'dynamic-v5.2.9';
const API_CACHE = 'api-v5.2.9';

// Assets statiques critiques (cache-first)
// Note: index.html est maintenant géré avec network-first pour éviter les problèmes de cache
const STATIC_ASSETS = [
  // '/', // Retiré - géré avec network-first
  // '/index.html', // Retiré - géré avec network-first
  '/manifest.json',
  '/favicon.ico',
  '/pwa-install.js',
  // Icônes PWA
  '/icons/pwa/icon-192x192.png',
  '/icons/pwa/icon-512x512.png',
  '/icons/apple/apple-touch-icon-180x180.png'
  // ✅ Images principales retirées du pré-cache (chargées à la demande)
  // '/images/Logo.png', '/images/LogoMusica.png' peuvent ne pas exister
];

// ✅ PERFORMANCE: Assets dynamiques corrigés - chemins après build uniquement
// Les fichiers /src/... n'existent plus après build (tout est dans /assets/)
const DYNAMIC_ASSETS = [
  // Après build Vite, les assets JS/CSS sont dans /assets/ avec des hashes
  // Le SW va les intercepter automatiquement via les stratégies de fetch
  // Pas besoin de les lister ici
];

// API et TikTok (network-first) - EXCLURE SUPABASE
const API_ENDPOINTS = [
  'https://www.tiktok.com',
  'https://v16m.tiktokcdn.com',
  'https://v19.tiktokcdn.com',
  'https://open.spotify.com',
  'https://music.apple.com'
];

// URLs à NE JAMAIS intercepter (Supabase)
const EXCLUDED_URLS = [
  'efnzmpzkzeuktqkghwfa.supabase.co',
  'efnzmpzkzeuktqkghwfa.functions.supabase.co'
];

// Configuration des stratégies
const CACHE_STRATEGIES = {
  STATIC: 'cache-first',
  DYNAMIC: 'stale-while-revalidate',
  API: 'network-first',
  TIKTOK: 'network-first'
};

/**
 * Installation du Service Worker
 * - Création des caches
 * - Pré-cache des assets critiques
 */
self.addEventListener('install', (event) => {
  console.log('🚀 Service Worker: Installation en cours...', CACHE_NAME);
  
  event.waitUntil(
    Promise.all([
      // Créer les caches
      caches.open(STATIC_CACHE),
      caches.open(DYNAMIC_CACHE),
      caches.open(API_CACHE)
    ]).then(([staticCache, dynamicCache, apiCache]) => {
      console.log('✅ Service Worker: Caches créés');
      
      // Pré-cache des assets statiques critiques
      return staticCache.addAll(STATIC_ASSETS);
    }).then(() => {
      console.log('✅ Service Worker: Assets statiques pré-cachés');
      // Forcer l'activation immédiate du nouveau Service Worker
      return self.skipWaiting();
    }).catch((error) => {
      console.error('❌ Service Worker: Erreur lors de l\'installation', error);
    })
  );
});

/**
 * Activation du Service Worker
 * - Nettoyage des anciens caches
 * - Prise de contrôle immédiate
 */
self.addEventListener('activate', (event) => {
  console.log('🔄 Service Worker: Activation en cours...');
  
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          // Supprimer les anciens caches
          if (cacheName !== STATIC_CACHE && 
              cacheName !== DYNAMIC_CACHE && 
              cacheName !== API_CACHE &&
              cacheName.startsWith('musica-da-segunda-')) {
            console.log('🗑️ Service Worker: Suppression ancien cache', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => {
      console.log('✅ Service Worker: Anciens caches nettoyés');
      // Forcer la prise de contrôle immédiate de tous les clients
      return self.clients.claim();
    }).catch((error) => {
      console.error('❌ Service Worker: Erreur lors de l\'activation', error);
    })
  );
});

/**
 * Interception des requêtes
 * - Application des stratégies de cache
 * - Gestion des erreurs et fallbacks
 */
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);
  
  // Ignorer les requêtes non-GET
  if (request.method !== 'GET') {
    return;
  }
  
  // EXCLURE SUPABASE - ne jamais intercepter
  if (EXCLUDED_URLS.some(excluded => url.hostname.includes(excluded))) {
    console.log('🚫 Service Worker: URL Supabase exclue du cache', url.hostname);
    return; // Laisser passer sans interception
  }
  
  // Stratégie selon le type de ressource
  // IMPORTANT: Ne PAS intercepter les fichiers JS - laisser le navigateur les gérer
  if (isJavaScriptFile(request)) {
    // Ne pas intercepter les JS - laisser passer directement
    // Cela évite les problèmes de page blanche lors du lazy loading
    return; // Laisser le navigateur gérer directement
  } else if (isHtmlFile(request)) {
    // HTML : network-first pour toujours avoir la dernière version
    // Évite les problèmes de cache avec les nouveaux hash d'assets
    event.respondWith(handleNetworkFirst(request));
  } else if (isStaticAsset(request)) {
    event.respondWith(handleStaticAsset(request));
  } else if (isApiRequest(request)) {
    event.respondWith(handleApiRequest(request));
  } else if (isDynamicAsset(request)) {
    event.respondWith(handleDynamicAsset(request));
  } else {
    // Stratégie par défaut : network-first
    event.respondWith(handleNetworkFirst(request));
  }
});

/**
 * Stratégie Cache-First pour assets statiques
 * - Priorité au cache pour performance
 * - Fallback réseau si pas en cache
 */
async function handleStaticAsset(request) {
  try {
    const cache = await caches.open(STATIC_CACHE);
    const cachedResponse = await cache.match(request);
    
    if (cachedResponse) {
      console.log('📦 Service Worker: Asset statique depuis le cache', request.url);
      return cachedResponse;
    }
    
    // Pas en cache, récupérer depuis le réseau
    const networkResponse = await fetch(request);
    
    if (networkResponse.ok) {
      // Mettre en cache pour la prochaine fois
      cache.put(request, networkResponse.clone());
      console.log('💾 Service Worker: Asset statique mis en cache', request.url);
    }
    
    return networkResponse;
  } catch (error) {
    console.error('❌ Service Worker: Erreur asset statique', request.url, error);
    
    // Fallback : essayer de récupérer depuis le cache même si pas optimal
    const cache = await caches.open(STATIC_CACHE);
    const cachedResponse = await cache.match(request);
    
    if (cachedResponse) {
      return cachedResponse;
    }
    
    // Dernier recours : page d'erreur
    return new Response('Erreur de chargement', { status: 500 });
  }
}

/**
 * Stratégie Network-First pour API et TikTok
 * - Priorité au réseau pour données fraîches
 * - Fallback cache si réseau indisponible
 */
async function handleApiRequest(request) {
  try {
    // Essayer d'abord le réseau
    const networkResponse = await fetch(request);
    
    if (networkResponse.ok) {
      // Mettre en cache pour fallback
      const cache = await caches.open(API_CACHE);
      cache.put(request, networkResponse.clone());
      console.log('🌐 Service Worker: API depuis le réseau', request.url);
      return networkResponse;
    }
    
    throw new Error('Réponse réseau non-OK');
  } catch (error) {
    console.log('📡 Service Worker: Réseau indisponible, fallback cache', request.url);
    
    // Fallback : essayer le cache
    const cache = await caches.open(API_CACHE);
    const cachedResponse = await cache.match(request);
    
    if (cachedResponse) {
      console.log('📦 Service Worker: API depuis le cache (fallback)', request.url);
      return cachedResponse;
    }
    
    // Pas de cache, retourner une erreur
    return new Response('Service temporairement indisponible', { 
      status: 503,
      headers: { 'Content-Type': 'text/plain' }
    });
  }
}

/**
 * Stratégie Stale-While-Revalidate pour assets dynamiques
 * - Retourner le cache immédiatement
 * - Mettre à jour le cache en arrière-plan
 */
async function handleDynamicAsset(request) {
  try {
    const cache = await caches.open(DYNAMIC_CACHE);
    const cachedResponse = await cache.match(request);
    
    // Retourner immédiatement le cache s'il existe
    if (cachedResponse) {
      console.log('📦 Service Worker: Asset dynamique depuis le cache', request.url);
      
      // Mettre à jour le cache en arrière-plan
      fetch(request).then((networkResponse) => {
        if (networkResponse.ok) {
          cache.put(request, networkResponse);
          console.log('🔄 Service Worker: Cache dynamique mis à jour', request.url);
        }
      }).catch((error) => {
        console.warn('⚠️ Service Worker: Échec mise à jour cache dynamique', request.url, error);
      });
      
      return cachedResponse;
    }
    
    // Pas en cache, récupérer depuis le réseau
    const networkResponse = await fetch(request);
    
    if (networkResponse.ok) {
      cache.put(request, networkResponse.clone());
      console.log('💾 Service Worker: Asset dynamique mis en cache', request.url);
    }
    
    return networkResponse;
  } catch (error) {
    console.error('❌ Service Worker: Erreur asset dynamique', request.url, error);
    
    // Fallback : essayer le cache
    const cache = await caches.open(DYNAMIC_CACHE);
    const cachedResponse = await cache.match(request);
    
    if (cachedResponse) {
      return cachedResponse;
    }
    
    return new Response('Erreur de chargement', { status: 500 });
  }
}

/**
 * Stratégie Network-First par défaut
 * - Essayer le réseau d'abord
 * - Fallback cache si échec
 */
async function handleNetworkFirst(request) {
  try {
    const url = new URL(request.url);
    const isJS = isJavaScriptFile(request);
    
    // Pour les fichiers JS, forcer une requête fraîche avec cache-busting
    if (isJS) {
      url.searchParams.set('_sw', CACHE_NAME);
    }
    
    const networkResponse = await fetch(url.toString(), {
      cache: isJS ? 'no-store' : 'default', // Forcer le rechargement pour les JS
      headers: isJS ? {
        'Cache-Control': 'no-cache'
      } : {}
    });
    
    if (networkResponse.ok) {
      // Pour les fichiers JS, ne PAS mettre en cache pour éviter les problèmes
      if (!isJS) {
        const cache = await caches.open(DYNAMIC_CACHE);
        cache.put(request, networkResponse.clone());
      }
      return networkResponse;
    }
    
    throw new Error('Réponse réseau non-OK');
  } catch (error) {
    console.log('📡 Service Worker: Fallback cache pour', request.url);
    
    const isJS = isJavaScriptFile(request);
    
    // Pour les fichiers JS, ne pas utiliser le cache en fallback
    if (isJS) {
      console.error('❌ Service Worker: Impossible de charger le fichier JS', request.url);
      return new Response('Service temporairement indisponible', { status: 503 });
    }
    
    // Fallback : essayer le cache (pour les autres fichiers)
    const cache = await caches.open(DYNAMIC_CACHE);
    const cachedResponse = await cache.match(request);
    
    if (cachedResponse) {
      return cachedResponse;
    }
    
    return new Response('Service temporairement indisponible', { status: 503 });
  }
}

/**
 * Background Sync pour TikTok
 * - Synchronisation en arrière-plan
 * - Retry automatique des échecs
 */
self.addEventListener('sync', (event) => {
  if (event.tag === 'tiktok-sync') {
    console.log('🔄 Service Worker: Background sync TikTok démarré');
    
    event.waitUntil(
      handleTikTokBackgroundSync()
    );
  }
});

/**
 * Gestion de la synchronisation TikTok en arrière-plan
 */
async function handleTikTokBackgroundSync() {
  try {
    // Récupérer les données de sync depuis IndexedDB
    const syncData = await getTikTokSyncData();
    
    if (syncData && syncData.length > 0) {
      console.log('📱 Service Worker: Synchronisation de', syncData.length, 'videos TikTok');
      
      // Traiter chaque vidéo en attente
      for (const video of syncData) {
        try {
          await processTikTokVideo(video);
          await removeTikTokSyncData(video.id);
          console.log('✅ Service Worker: Vidéo TikTok synchronisée', video.id);
        } catch (error) {
          console.error('❌ Service Worker: Échec sync vidéo TikTok', video.id, error);
        }
      }
    }
  } catch (error) {
    console.error('❌ Service Worker: Erreur background sync TikTok', error);
  }
}

/**
 * Gestion des messages du client
 * - Communication bidirectionnelle
 * - Commandes de cache et sync
 */
self.addEventListener('message', (event) => {
  const { type, payload } = event.data;
  
  switch (type) {
    case 'CACHE_CLEAR':
      handleCacheClear(event);
      break;
    case 'TIKTOK_SYNC_REQUEST':
      handleTikTokSyncRequest(event, payload);
      break;
    case 'GET_CACHE_INFO':
      handleGetCacheInfo(event);
      break;
    default:
      console.log('❓ Service Worker: Message inconnu', type);
  }
});

/**
 * Nettoyage du cache
 */
async function handleCacheClear(event) {
  try {
    await caches.delete(STATIC_CACHE);
    await caches.delete(DYNAMIC_CACHE);
    await caches.delete(API_CACHE);
    
    console.log('🗑️ Service Worker: Tous les caches nettoyés');
    
    event.ports[0].postMessage({ 
      type: 'CACHE_CLEAR_SUCCESS',
      message: 'Caches nettoyés avec succès'
    });
  } catch (error) {
    console.error('❌ Service Worker: Erreur nettoyage cache', error);
    
    event.ports[0].postMessage({ 
      type: 'CACHE_CLEAR_ERROR',
      error: error.message
    });
  }
}

/**
 * Demande de synchronisation TikTok
 */
async function handleTikTokSyncRequest(event, payload) {
  try {
    // Enregistrer la demande de sync
    await saveTikTokSyncData(payload);
    
    // Demander une synchronisation en arrière-plan
    await self.registration.sync.register('tiktok-sync');
    
    console.log('📱 Service Worker: Demande de sync TikTok enregistrée', payload.id);
    
    event.ports[0].postMessage({ 
      type: 'TIKTOK_SYNC_REQUEST_SUCCESS',
      message: 'Synchronisation TikTok planifiée'
    });
  } catch (error) {
    console.error('❌ Service Worker: Erreur demande sync TikTok', error);
    
    event.ports[0].postMessage({ 
      type: 'TIKTOK_SYNC_REQUEST_ERROR',
      error: error.message
    });
  }
}

/**
 * Informations sur le cache
 */
async function handleGetCacheInfo(event) {
  try {
    const cacheNames = await caches.keys();
    const cacheInfo = {};
    
    for (const cacheName of cacheNames) {
      const cache = await caches.open(cacheName);
      const keys = await cache.keys();
      cacheInfo[cacheName] = keys.length;
    }
    
    event.ports[0].postMessage({ 
      type: 'CACHE_INFO',
      data: cacheInfo
    });
  } catch (error) {
    console.error('❌ Service Worker: Erreur récupération info cache', error);
    
    event.ports[0].postMessage({ 
      type: 'CACHE_INFO_ERROR',
      error: error.message
    });
  }
}

/**
 * Utilitaires de détection
 */
function isStaticAsset(request) {
  const url = request.url;
  return STATIC_ASSETS.some(asset => url.includes(asset)) ||
         url.includes('.css') ||
         url.includes('.js') ||
         url.includes('.png') ||
         url.includes('.jpg') ||
         url.includes('.ico') ||
         url.includes('.svg');
}

function isApiRequest(request) {
  const url = request.url;
  return API_ENDPOINTS.some(endpoint => url.startsWith(endpoint)) ||
         url.includes('/api/') ||
         url.includes('tiktok.com') ||
         url.includes('spotify.com');
}

function isJavaScriptFile(request) {
  const url = request.url;
  // Détecter les fichiers JavaScript (assets JS du build Vite)
  return url.endsWith('.js') || (url.includes('/assets/') && url.endsWith('.js'));
}

function isHtmlFile(request) {
  const url = new URL(request.url);
  // Détecter les fichiers HTML (index.html, routes, etc.)
  return url.pathname.endsWith('.html') || 
         url.pathname === '/' || 
         url.pathname.endsWith('/') ||
         (url.pathname.includes('/') && !url.pathname.includes('.'));
}

function isDynamicAsset(request) {
  const url = request.url;
  return DYNAMIC_ASSETS.some(asset => url.includes(asset)) ||
         url.includes('/src/') ||
         url.includes('.jsx');
}

/**
 * IndexedDB pour la synchronisation TikTok
 * - Stockage des données de sync
 * - Gestion des échecs et retries
 */
const DB_NAME = 'TikTokSyncDB';
const DB_VERSION = 1;
const STORE_NAME = 'syncQueue';

let db = null;

async function initDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    
    request.onerror = () => reject(request.error);
    request.onsuccess = () => {
      db = request.result;
      resolve(db);
    };
    
    request.onupgradeneeded = (event) => {
      const db = event.target.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'id' });
      }
    };
  });
}

async function saveTikTokSyncData(videoData) {
  if (!db) await initDB();
  
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORE_NAME], 'readwrite');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.put({
      id: videoData.id,
      postId: videoData.postId,
      timestamp: Date.now(),
      retryCount: 0,
      maxRetries: 3
    });
    
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

async function getTikTokSyncData() {
  if (!db) await initDB();
  
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORE_NAME], 'readonly');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.getAll();
    
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function removeTikTokSyncData(id) {
  if (!db) await initDB();
  
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORE_NAME], 'readwrite');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.delete(id);
    
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

async function processTikTokVideo(videoData) {
  // Simulation du traitement TikTok
  // En production, cela pourrait être une vraie API
  return new Promise((resolve) => {
    setTimeout(() => {
      console.log('🎵 Service Worker: Traitement vidéo TikTok', videoData.postId);
      resolve();
    }, 1000);
  });
}

console.log('🚀 Service Worker: Initialisé avec succès - Version', CACHE_NAME);

/* --- Web Push handlers (append-only) --- */
self.addEventListener('push', (event) => {
  let data = {};
  try { data = event.data ? event.data.json() : {}; } catch {}
  const title = data.title || 'Música da Segunda';
  const options = {
    body: data.body || 'Nova música no ar 🎶',
    icon: data.icon || '/icons/icon-192x192.png',
    badge: data.badge || '/icons/badge-72.png',
    tag: data.tag || 'nova-musica',
    data: { url: data.url || '/playlist' },
    actions: [
      { action: 'open', title: 'Ouvir agora' },
      { action: 'later', title: 'Depois' }
    ]
  };
  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const url = (event.notification.data && event.notification.data.url) || '/playlist';
  if (event.action === 'later') return;
  event.waitUntil((async () => {
    const clientsList = await clients.matchAll({ type: 'window', includeUncontrolled: true });
    for (const c of clientsList) {
      if (c.url && c.url.startsWith(self.location.origin)) {
        c.focus(); c.navigate(url); return;
      }
    }
    await clients.openWindow(url);
  })());
});

} // Fin du bloc else (production)
