import React, { useState, useEffect } from 'react';
import migrationService from '@/lib/migration';

export default function MigrationStatus() {
  const [status, setStatus] = useState(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    // Afficher le composant seulement en mode développement
    setIsVisible(import.meta.env.DEV);
    
    if (import.meta.env.DEV) {
      updateStatus();
    }
  }, []);

  const updateStatus = () => {
    const currentStatus = migrationService.getStatus();
    setStatus(currentStatus);
  };

  const handleReset = () => {
    migrationService.reset();
    updateStatus();
  };

  const handleCleanup = () => {
    // Importer le service localStorage pour le nettoyage
    import('@/lib/localStorage').then(({ localStorageService }) => {
      const cleaned = localStorageService.cleanConfissoesBancarias();
      if (cleaned) {
        console.log('🧹 Nettoyage manuel effectué');
        updateStatus();
      }
    });
  };

  if (!isVisible) return null;

  return (
    <div className="fixed bottom-4 right-4 z-50">
      <div className="bg-gray-800 text-white p-4 rounded-lg shadow-lg max-w-sm">
        <h3 className="text-sm font-bold mb-2">🔧 Migration Status (DEV)</h3>
        
        {status && (
          <div className="text-xs space-y-1 mb-3">
            <div>✅ Completed: {status.completed ? 'Yes' : 'No'}</div>
            <div>📦 Version: {status.version}</div>
            <div>🔄 Force Supabase: {status.forceSupabase ? 'Yes' : 'No'}</div>
            {status.lastSync && (
              <div>⏰ Last Sync: {new Date(status.lastSync).toLocaleString()}</div>
            )}
          </div>
        )}
        
        <div className="flex gap-2">
          <button
            onClick={handleCleanup}
            className="px-2 py-1 bg-blue-600 text-white text-xs rounded hover:bg-blue-700"
          >
            🧹 Clean
          </button>
          <button
            onClick={handleReset}
            className="px-2 py-1 bg-red-600 text-white text-xs rounded hover:bg-red-700"
          >
            🔄 Reset
          </button>
          <button
            onClick={updateStatus}
            className="px-2 py-1 bg-gray-600 text-white text-xs rounded hover:bg-gray-700"
          >
            📊 Refresh
          </button>
        </div>
      </div>
    </div>
  );
}
