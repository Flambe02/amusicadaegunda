import { useEffect, useMemo, useState } from 'react';

const IOS_STANDALONE_KEY = 'ios-install-banner-dismissed';

function isBrowser() {
  return typeof window !== 'undefined';
}

function isIOS() {
  if (!isBrowser()) return false;
  return /iPad|iPhone|iPod/.test(window.navigator.userAgent) ||
    (window.navigator.platform === 'MacIntel' && window.navigator.maxTouchPoints > 1);
}

function isStandalone() {
  if (!isBrowser()) return false;
  return window.matchMedia?.('(display-mode: standalone)')?.matches === true ||
    window.navigator.standalone === true;
}

function isLocalDev() {
  if (!isBrowser()) return false;
  return (
    window.location.hostname === 'localhost' ||
    window.location.hostname === '127.0.0.1'
  );
}

export default function usePWAInstall() {
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [isInstalled, setIsInstalled] = useState(() => isStandalone());
  const [showIOSHint, setShowIOSHint] = useState(() => {
    if (!isBrowser()) return false;
    if (!isIOS() || isStandalone()) return false;
    return localStorage.getItem(IOS_STANDALONE_KEY) !== 'true';
  });
  const [updateAvailable, setUpdateAvailable] = useState(false);
  const [registration, setRegistration] = useState(null);

  useEffect(() => {
    if (!isBrowser()) return undefined;
    if (isLocalDev()) return undefined;
    if (!('serviceWorker' in navigator)) return undefined;

    let refreshing = false;

    navigator.serviceWorker.register('/sw.js', {
      scope: '/',
      updateViaCache: 'none',
    }).then((reg) => {
      setRegistration(reg);

      const onUpdateFound = () => {
        const installing = reg.installing;
        if (!installing) return;

        installing.addEventListener('statechange', () => {
          if (installing.state === 'installed' && navigator.serviceWorker.controller) {
            setUpdateAvailable(true);
          }
        });
      };

      reg.addEventListener('updatefound', onUpdateFound);
    }).catch(() => {});

    const onControllerChange = () => {
      if (refreshing) return;
      refreshing = true;
      window.location.reload();
    };

    navigator.serviceWorker.addEventListener('controllerchange', onControllerChange);

    return () => {
      navigator.serviceWorker.removeEventListener('controllerchange', onControllerChange);
    };
  }, []);

  useEffect(() => {
    if (!isBrowser()) return undefined;

    const handleBeforeInstallPrompt = (event) => {
      event.preventDefault();
      setDeferredPrompt(event);
    };

    const handleInstalled = () => {
      setIsInstalled(true);
      setDeferredPrompt(null);
      setShowIOSHint(false);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleInstalled);
    };
  }, []);

  const canInstall = useMemo(
    () => Boolean(deferredPrompt) && !isInstalled,
    [deferredPrompt, isInstalled]
  );

  const dismissIOSHint = () => {
    setShowIOSHint(false);
    if (isBrowser()) {
      localStorage.setItem(IOS_STANDALONE_KEY, 'true');
    }
  };

  const promptInstall = async () => {
    if (!deferredPrompt) return false;
    deferredPrompt.prompt();
    const choice = await deferredPrompt.userChoice;
    setDeferredPrompt(null);
    if (choice.outcome === 'accepted') {
      setIsInstalled(true);
      return true;
    }
    return false;
  };

  const applyUpdate = () => {
    registration?.waiting?.postMessage({ type: 'SKIP_WAITING' });
  };

  return {
    canInstall,
    isInstalled,
    isIOS: isIOS(),
    showIOSHint,
    updateAvailable,
    promptInstall,
    dismissIOSHint,
    applyUpdate,
  };
}
