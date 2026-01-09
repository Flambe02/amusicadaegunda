/**
 * Service Worker - Música da Segunda
 * VERSION URGENCE : Désinstallation complète du Service Worker
 * 
 * Ce SW se désinstalle lui-même pour permettre à Google de crawler le site
 * et aux utilisateurs d'accéder au site sans blocage.
 * 
 * Une fois le cache des utilisateurs effacé, nous pourrons réactiver
 * un Service Worker corrigé.
 */

const CACHE_VERSION = 'v5.3.0-emergency';

console.log(`🚨 Service Worker ${CACHE_VERSION}: Mode d'urgence - Désinstallation en cours`);

// Installation immédiate
self.addEventListener('install', (event) => {
  console.log('🚨 SW Emergency: Installation - skipWaiting immédiat');
  self.skipWaiting();
});

// Activation et nettoyage de TOUS les caches
self.addEventListener('activate', (event) => {
  console.log('🚨 SW Emergency: Activation - Suppression de tous les caches');
  event.waitUntil(
    Promise.all([
      // Supprimer TOUS les caches existants
      caches.keys().then(cacheNames => {
        return Promise.all(
          cacheNames.map(cacheName => {
            console.log(`🗑️ Suppression du cache: ${cacheName}`);
            return caches.delete(cacheName);
          })
        );
      }),
      // Prendre le contrôle immédiatement
      self.clients.claim(),
      // Se désinscrire après un court délai
      self.registration.unregister().then(() => {
        console.log('✅ Service Worker désinstallé avec succès');
        // Recharger tous les clients pour qu'ils fonctionnent sans SW
        return self.clients.matchAll().then(clients => {
          clients.forEach(client => {
            console.log('🔄 Rechargement du client:', client.url);
            client.navigate(client.url);
          });
        });
      })
    ])
  );
});

// Ne pas intercepter les requêtes fetch - laisser passer tout le trafic
self.addEventListener('fetch', (event) => {
  // Ne rien faire - laisser les requêtes passer normalement
  return;
});

console.log('✅ Service Worker en mode urgence - Aucune requête ne sera interceptée');
