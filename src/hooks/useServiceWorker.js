import { useCallback, useEffect, useRef, useState } from 'react';

const isDev = typeof import.meta !== 'undefined' && import.meta.env?.DEV;

const swLog = (...args) => isDev && console.log(...args);

function getNavigatorOnlineState() {
  return typeof navigator === 'undefined' ? true : navigator.onLine;
}

export default function useServiceWorker() {
  const [isRegistered, setIsRegistered] = useState(false);
  const [isOnline, setIsOnline] = useState(getNavigatorOnlineState);
  const [cacheInfo, setCacheInfo] = useState({});
  const [syncQueue] = useState([]);
  const [isSyncing, setIsSyncing] = useState(false);

  const swRegistration = useRef(null);
  const isSupported = typeof window !== 'undefined' && 'serviceWorker' in navigator && 'caches' in window;

  const refreshRegistration = useCallback(async () => {
    if (!isSupported) return null;

    const registration = await navigator.serviceWorker.getRegistration('/');
    swRegistration.current = registration || null;
    setIsRegistered(Boolean(registration));
    return registration || null;
  }, [isSupported]);

  const registerServiceWorker = useCallback(async () => {
    if (!isSupported) return false;
    if (typeof import.meta !== 'undefined' && !import.meta.env?.PROD) return false;

    try {
      const existing = await navigator.serviceWorker.getRegistration('/');
      if (existing) {
        swRegistration.current = existing;
        setIsRegistered(true);
        return true;
      }

      const registration = await navigator.serviceWorker.register('/sw.js', {
        scope: '/',
        updateViaCache: 'none',
      });

      swRegistration.current = registration;
      setIsRegistered(true);
      swLog('Service Worker enregistre');
      return true;
    } catch (error) {
      console.error('Erreur lors de l’enregistrement du Service Worker', error);
      return false;
    }
  }, [isSupported]);

  const getCacheInfo = useCallback(async () => {
    if (!isSupported) return false;

    try {
      const names = await caches.keys();
      const entries = await Promise.all(
        names.map(async (name) => {
          const cache = await caches.open(name);
          const requests = await cache.keys();
          return [name, requests.length];
        })
      );

      setCacheInfo(Object.fromEntries(entries));
      return true;
    } catch (error) {
      console.error('Erreur lors de la lecture du cache', error);
      return false;
    }
  }, [isSupported]);

  const clearCache = useCallback(async () => {
    if (!isSupported) return false;

    try {
      setIsSyncing(true);
      const names = await caches.keys();
      await Promise.all(names.map((name) => caches.delete(name)));
      await getCacheInfo();
      return true;
    } catch (error) {
      console.error('Erreur lors du nettoyage du cache', error);
      return false;
    } finally {
      setIsSyncing(false);
    }
  }, [getCacheInfo, isSupported]);

  const requestTikTokSync = useCallback(async () => {
    swLog('Background Sync non implemente dans le Service Worker actuel.');
    return false;
  }, []);

  const forceUpdate = useCallback(async () => {
    const registration = swRegistration.current || (await refreshRegistration());
    if (!registration) return false;

    try {
      await registration.update();
      registration.waiting?.postMessage({ type: 'SKIP_WAITING' });
      return true;
    } catch (error) {
      console.error('Erreur lors de la mise a jour forcee', error);
      return false;
    }
  }, [refreshRegistration]);

  const getPerformanceStats = useCallback(() => ({
    isRegistered,
    isOnline,
    cacheSize: Object.values(cacheInfo).reduce((sum, count) => sum + count, 0),
    syncQueueSize: syncQueue.length,
    isSyncing,
  }), [cacheInfo, isOnline, isRegistered, isSyncing, syncQueue.length]);

  useEffect(() => {
    if (!isSupported) return undefined;

    registerServiceWorker().then(() => {
      getCacheInfo();
    });

    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [getCacheInfo, isSupported, registerServiceWorker]);

  return {
    isSupported,
    isRegistered,
    isOnline,
    cacheInfo,
    syncQueue,
    isSyncing,
    registerServiceWorker,
    clearCache,
    getCacheInfo,
    requestTikTokSync,
    forceUpdate,
    getPerformanceStats,
    swRegistration: swRegistration.current,
  };
}
