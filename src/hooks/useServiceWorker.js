import { useState, useEffect, useCallback, useRef } from 'react';

/**
 * useServiceWorker - Hook pour gérer le Service Worker
 * 
 * Implémente :
 * - Enregistrement et gestion du Service Worker
 * - Communication bidirectionnelle
 * - Gestion du cache (nettoyage, informations)
 * - Background sync TikTok
 * - Monitoring des performances
 */
export default function useServiceWorker() {
  const [isRegistered, setIsRegistered] = useState(false);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [cacheInfo, setCacheInfo] = useState({});
  const [syncQueue, setSyncQueue] = useState([]);
  const [isSyncing, setIsSyncing] = useState(false);
  
  const swRegistration = useRef(null);
  const messageChannel = useRef(null);

  // Vérifier si le Service Worker est supporté
  const isSupported = 'serviceWorker' in navigator && 'caches' in window;

  /**
   * Enregistrer le Service Worker
   */
  const registerServiceWorker = useCallback(async () => {
    if (!isSupported) {
      console.warn('⚠️ Service Worker non supporté par ce navigateur');
      return false;
    }

    // Enregistrer uniquement en production
    if (!import.meta.env.PROD) {
      console.log('🔧 DEV mode: Service Worker désactivé pour éviter les conflits HMR');
      return false;
    }

    try {
      console.log('🚀 Enregistrement du Service Worker...');
      
      const registration = await navigator.serviceWorker.register('/sw.js', {
        scope: '/',
        updateViaCache: 'none' // Toujours vérifier les mises à jour
      });

      swRegistration.current = registration;
      setIsRegistered(true);

      // Écouter les mises à jour
      registration.addEventListener('updatefound', () => {
        console.log('🔄 Service Worker: Mise à jour disponible');
        
        const newWorker = registration.installing;
        newWorker.addEventListener('statechange', () => {
          if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
            console.log('📱 Service Worker: Nouvelle version installée, rechargement recommandé');
            // Ici vous pourriez afficher une notification à l'utilisateur
          }
        });
      });

      // Écouter les changements d'état
      registration.addEventListener('statechange', (event) => {
        const worker = event.target;
        console.log('🔄 Service Worker: Changement d\'état', worker.state);
        
        if (worker.state === 'activated') {
          console.log('✅ Service Worker: Activé et prêt');
          setupMessageChannel();
        }
      });

      console.log('✅ Service Worker enregistré avec succès');
      return true;

    } catch (error) {
      console.error('❌ Erreur lors de l\'enregistrement du Service Worker', error);
      return false;
    }
  }, [isSupported]);

  /**
   * Configurer le canal de communication
   */
  const setupMessageChannel = useCallback(() => {
    if (!swRegistration.current) return;

    try {
      // Créer un canal de communication
      messageChannel.current = new MessageChannel();
      
      // Écouter les messages du Service Worker
      messageChannel.current.port1.onmessage = (event) => {
        const { type, data, message, error } = event.data;
        
        switch (type) {
          case 'CACHE_CLEAR_SUCCESS':
            console.log('✅ Cache nettoyé:', message);
            getCacheInfo(); // Rafraîchir les infos
            break;
            
          case 'CACHE_CLEAR_ERROR':
            console.error('❌ Erreur nettoyage cache:', error);
            break;
            
          case 'TIKTOK_SYNC_REQUEST_SUCCESS':
            console.log('📱 Sync TikTok planifiée:', message);
            break;
            
          case 'TIKTOK_SYNC_REQUEST_ERROR':
            console.error('❌ Erreur sync TikTok:', error);
            break;
            
          case 'CACHE_INFO':
            setCacheInfo(data);
            break;
            
          case 'CACHE_INFO_ERROR':
            console.error('❌ Erreur récupération info cache:', error);
            break;
            
          default:
            console.log('📨 Message Service Worker:', type, event.data);
        }
      };

      // Connecter le canal au Service Worker
      if (swRegistration.current.active) {
        swRegistration.current.active.postMessage(
          { type: 'CONNECT_CHANNEL' },
          [messageChannel.current.port2]
        );
      }

      console.log('📡 Canal de communication Service Worker configuré');

    } catch (error) {
      console.error('❌ Erreur configuration canal de communication', error);
    }
  }, []);

  /**
   * Nettoyer le cache
   */
  const clearCache = useCallback(async () => {
    if (!messageChannel.current) {
      console.warn('⚠️ Canal de communication non configuré');
      return false;
    }

    try {
      setIsSyncing(true);
      
      // Envoyer la demande de nettoyage
      messageChannel.current.port1.postMessage({ type: 'CACHE_CLEAR' });
      
      console.log('🗑️ Demande de nettoyage du cache envoyée');
      return true;

    } catch (error) {
      console.error('❌ Erreur lors de la demande de nettoyage du cache', error);
      return false;
    } finally {
      setIsSyncing(false);
    }
  }, []);

  /**
   * Obtenir les informations du cache
   */
  const getCacheInfo = useCallback(async () => {
    if (!messageChannel.current) {
      console.warn('⚠️ Canal de communication non configuré');
      return false;
    }

    try {
      // Envoyer la demande d'information
      messageChannel.current.port1.postMessage({ type: 'GET_CACHE_INFO' });
      
      console.log('📊 Demande d\'information cache envoyée');
      return true;

    } catch (error) {
      console.error('❌ Erreur lors de la demande d\'information cache', error);
      return false;
    }
  }, []);

  /**
   * Demander une synchronisation TikTok
   */
  const requestTikTokSync = useCallback(async (videoData) => {
    if (!messageChannel.current) {
      console.warn('⚠️ Canal de communication non configuré');
      return false;
    }

    try {
      setIsSyncing(true);
      
      // Envoyer la demande de sync
      messageChannel.current.port1.postMessage({ 
        type: 'TIKTOK_SYNC_REQUEST',
        payload: videoData
      });
      
      // Ajouter à la queue locale
      setSyncQueue(prev => [...prev, {
        id: videoData.id,
        postId: videoData.postId,
        timestamp: Date.now(),
        status: 'pending'
      }]);
      
      console.log('📱 Demande de sync TikTok envoyée:', videoData.id);
      return true;

    } catch (error) {
      console.error('❌ Erreur lors de la demande de sync TikTok', error);
      return false;
    } finally {
      setIsSyncing(false);
    }
  }, []);

  /**
   * Vérifier la connectivité
   */
  const checkConnectivity = useCallback(() => {
    const online = navigator.onLine;
    setIsOnline(online);
    
    if (online) {
      console.log('🌐 Connexion réseau rétablie');
    } else {
      console.log('📡 Connexion réseau perdue');
    }
  }, []);

  /**
   * Forcer la mise à jour du Service Worker
   */
  const forceUpdate = useCallback(async () => {
    if (!swRegistration.current) return false;

    try {
      console.log('🔄 Forçage de la mise à jour du Service Worker...');
      
      await swRegistration.current.update();
      console.log('✅ Mise à jour Service Worker demandée');
      return true;

    } catch (error) {
      console.error('❌ Erreur lors de la mise à jour forcée', error);
      return false;
    }
  }, []);

  /**
   * Obtenir les statistiques de performance
   */
  const getPerformanceStats = useCallback(() => {
    if (!swRegistration.current) return null;

    const stats = {
      isRegistered: true,
      isOnline,
      cacheSize: Object.values(cacheInfo).reduce((sum, count) => sum + count, 0),
      syncQueueSize: syncQueue.length,
      isSyncing,
      lastUpdate: swRegistration.current.updateTime || 'N/A'
    };

    console.log('📊 Statistiques Service Worker:', stats);
    return stats;
  }, [isOnline, cacheInfo, syncQueue.length, isSyncing]);

  // Effets
  useEffect(() => {
    // Enregistrer le Service Worker au montage
    registerServiceWorker();

    // Écouter les changements de connectivité
    window.addEventListener('online', checkConnectivity);
    window.addEventListener('offline', checkConnectivity);

    // Nettoyage
    return () => {
      window.removeEventListener('online', checkConnectivity);
      window.removeEventListener('offline', checkConnectivity);
      
      if (messageChannel.current) {
        messageChannel.current.port1.close();
      }
    };
  }, [registerServiceWorker, checkConnectivity]);

  // Récupérer les infos du cache après l'enregistrement
  useEffect(() => {
    if (isRegistered) {
      // Attendre un peu que le Service Worker soit prêt
      const timer = setTimeout(() => {
        getCacheInfo();
      }, 1000);

      return () => clearTimeout(timer);
    }
  }, [isRegistered, getCacheInfo]);

  return {
    // État
    isSupported,
    isRegistered,
    isOnline,
    cacheInfo,
    syncQueue,
    isSyncing,
    
    // Actions
    registerServiceWorker,
    clearCache,
    getCacheInfo,
    requestTikTokSync,
    forceUpdate,
    getPerformanceStats,
    
    // Utilitaires
    swRegistration: swRegistration.current
  };
}
