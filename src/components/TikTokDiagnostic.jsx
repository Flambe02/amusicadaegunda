import React, { useState, useEffect } from 'react';

export default function TikTokDiagnostic() {
  const [isVisible, setIsVisible] = useState(false);
  const [diagnosticData, setDiagnosticData] = useState({
    totalComponents: 0,
    tiktokEmbedOptimized: 0,
    otherComponents: 0,
    pages: [],
    issues: []
  });

  useEffect(() => {
    // Afficher seulement en mode développement
    setIsVisible(import.meta.env.DEV);
    
    if (import.meta.env.DEV) {
      performDiagnostic();
    }
  }, []);

  const performDiagnostic = () => {
    const data = {
      totalComponents: 0,
      tiktokEmbedOptimized: 0,
      otherComponents: 0,
      pages: [],
      issues: []
    };

    // Vérifier les composants dans le DOM
    const tiktokElements = document.querySelectorAll('[class*="tiktok"], [id*="tiktok"]');
    data.totalComponents = tiktokElements.length;

    // Vérifier les iframes TikTok
    const tiktokIframes = document.querySelectorAll('iframe[src*="tiktok"]');
    data.tiktokEmbedOptimized = tiktokIframes.length;

    // Vérifier les pages qui utilisent TikTok
    const currentPath = window.location.pathname;
    data.pages.push(currentPath);

    // Vérifier les composants React TikTokEmbedOptimized
    const reactComponents = document.querySelectorAll('[data-testid*="tiktok"], [class*="TikTok"]');
    data.otherComponents = reactComponents.length;

    // Détecter les problèmes potentiels
    if (data.totalComponents === 0) {
      data.issues.push('Aucun composant TikTok détecté sur cette page');
    }

    if (data.tiktokEmbedOptimized === 0 && data.totalComponents > 0) {
      data.issues.push('Composants TikTok détectés mais pas d\'iframe TikTokEmbedOptimized');
    }

    if (data.otherComponents > 0) {
      data.issues.push(`${data.otherComponents} composants TikTok alternatifs détectés`);
    }

    setDiagnosticData(data);
  };

  if (!isVisible) return null;

  return (
    <div className="fixed bottom-4 left-4 z-50 max-w-sm">
      <div className="bg-green-800 text-white p-3 rounded-lg shadow-lg text-xs">
        <h3 className="font-bold mb-2">🎬 Diagnostic TikTok V2.0.0 (DEV)</h3>
        
        <div className="space-y-1 mb-2">
          <div className="flex justify-between">
            <span>📊 Total:</span>
            <span>{diagnosticData.totalComponents}</span>
          </div>
          
          <div className="flex justify-between">
            <span>✅ TikTokEmbedOptimized:</span>
            <span className="text-green-300">{diagnosticData.tiktokEmbedOptimized}</span>
          </div>
          
          <div className="flex justify-between">
            <span>⚠️ Autres composants:</span>
            <span className="text-yellow-300">{diagnosticData.otherComponents}</span>
          </div>
        </div>
        
        <div className="pt-2 border-t border-green-600 mb-2">
          <div className="text-xs opacity-75">
            <div>📍 Page: {diagnosticData.pages.join(', ')}</div>
          </div>
        </div>
        
        {/* Problèmes détectés */}
        {diagnosticData.issues.length > 0 && (
          <div className="mb-2">
            <div className="text-xs font-medium text-yellow-300 mb-1">⚠️ Problèmes:</div>
            {diagnosticData.issues.map((issue, index) => (
              <div key={index} className="text-xs opacity-80 mb-1">• {issue}</div>
            ))}
          </div>
        )}
        
        <button
          onClick={performDiagnostic}
          className="w-full px-2 py-1 bg-green-700 text-white text-xs rounded hover:bg-green-600"
        >
          🔄 Vérifier
        </button>
        
        <div className="mt-2 text-xs text-green-200">
          ✅ TikTokEmbedOptimized unifié pour toutes les vidéos
        </div>
      </div>
    </div>
  );
}
