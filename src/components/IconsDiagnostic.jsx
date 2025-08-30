import React, { useState, useEffect } from 'react';

export default function IconsDiagnostic() {
  const [iconStatus, setIconStatus] = useState({});
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    // Afficher seulement en mode développement
    setIsVisible(import.meta.env.DEV);
    
    if (import.meta.env.DEV) {
      checkIcons();
    }
  }, []);

  const checkIcons = async () => {
    const icons = [
      { size: '180x180', path: '/icons/apple/apple-touch-icon-180x180.png' },
      { size: '152x152', path: '/icons/apple/apple-touch-icon-152x152.png' },
      { size: '144x144', path: '/icons/apple/apple-touch-icon-144x144.png' },
      { size: '120x120', path: '/icons/apple/apple-touch-icon-120x120.png' },
      { size: '114x114', path: '/icons/apple/apple-touch-icon-114x114.png' },
      { size: '76x76', path: '/icons/apple/apple-touch-icon-76x76.png' },
      { size: '72x72', path: '/icons/apple/apple-touch-icon-72x72.png' },
      { size: '60x60', path: '/icons/apple/apple-touch-icon-60x60.png' },
      { size: '57x57', path: '/icons/apple/apple-touch-icon-57x57.png' }
    ];

    const status = {};
    
    for (const icon of icons) {
      try {
        const response = await fetch(icon.path);
        status[icon.size] = response.ok ? '✅' : '❌';
      } catch (error) {
        status[icon.size] = '❌';
      }
    }
    
    setIconStatus(status);
  };

  if (!isVisible) return null;

  return (
    <div className="fixed bottom-4 right-4 z-50 max-w-xs">
      <div className="bg-purple-800 text-white p-3 rounded-lg shadow-lg text-xs">
        <h3 className="font-bold mb-2">🎨 Diagnostic Icônes iOS (DEV)</h3>
        
        <div className="space-y-1 mb-2">
          {Object.entries(iconStatus).map(([size, status]) => (
            <div key={size} className="flex justify-between">
              <span>{size}:</span>
              <span>{status}</span>
            </div>
          ))}
        </div>
        
        <div className="pt-2 border-t border-purple-600">
          <div className="text-xs opacity-75">
            <div>📱 Icônes iOS: {Object.values(iconStatus).filter(s => s === '✅').length}/{Object.keys(iconStatus).length}</div>
            <div>🎯 Utilise: /icons/apple/ (pas Logo.png)</div>
          </div>
        </div>
        
        <button
          onClick={checkIcons}
          className="mt-2 w-full px-2 py-1 bg-purple-700 text-white text-xs rounded hover:bg-purple-600"
        >
          🔄 Vérifier
        </button>
      </div>
    </div>
  );
}
