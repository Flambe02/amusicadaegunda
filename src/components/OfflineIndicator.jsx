import React, { useState, useEffect } from 'react';

export default function OfflineIndicator() {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [showOfflineMessage, setShowOfflineMessage] = useState(false);

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      setShowOfflineMessage(false);
      console.log('🌐 Connexion restaurée');
    };

    const handleOffline = () => {
      setIsOnline(false);
      setShowOfflineMessage(true);
      console.log('📱 Mode hors ligne détecté');
      
      // Masquer le message après 5 secondes
      setTimeout(() => setShowOfflineMessage(false), 5000);
    };

    // Écouter les changements de statut de connexion
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Vérifier le statut initial
    if (!navigator.onLine) {
      setIsOnline(false);
    }

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Ne rien afficher si en ligne
  if (isOnline) return null;

  return (
    <div className="fixed top-4 left-1/2 transform -translate-x-1/2 z-50" style={{ paddingTop: 'env(safe-area-inset-top, 0px)' }}>
      {showOfflineMessage && (
        <div className="bg-yellow-500 text-white px-4 py-2 rounded-lg shadow-lg flex items-center gap-2 animate-bounce">
          <span>📱</span>
          <span className="text-sm font-medium">
            Modo offline — App disponível sem internet
          </span>
        </div>
      )}
      
      <div className="bg-gray-800 text-white px-3 py-1 rounded-full text-xs flex items-center gap-1">
        <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></div>
        <span>Offline</span>
      </div>
    </div>
  );
}
