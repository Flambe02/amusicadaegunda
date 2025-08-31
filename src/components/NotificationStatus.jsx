import React from 'react';

export default function NotificationStatus() {
  // Afficher seulement en mode développement
  if (!import.meta.env.DEV) return null;

  return (
    <div className="fixed top-4 right-4 z-50">
      <div className="bg-red-800 text-white p-3 rounded-lg shadow-lg text-xs max-w-xs">
        <h3 className="font-bold mb-2">🚫 Notifications V2.0.0</h3>
        
        <div className="space-y-1">
          <div className="flex justify-between">
            <span>🔔 Push CTA:</span>
            <span className="text-red-300">SUPPRIMÉ</span>
          </div>
          
          <div className="flex justify-between">
            <span>📱 Mobile:</span>
            <span className="text-red-300">DÉSACTIVÉ</span>
          </div>
          
          <div className="flex justify-between">
            <span>🖥️ Desktop:</span>
            <span className="text-red-300">DÉSACTIVÉ</span>
          </div>
        </div>
        
        <div className="mt-2 pt-2 border-t border-red-600">
          <div className="text-xs opacity-75">
            ✅ Bouton &quot;Avise-me das novas músicas&quot; complètement supprimé
          </div>
        </div>
      </div>
    </div>
  );
}
