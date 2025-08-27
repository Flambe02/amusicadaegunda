import React, { useState, useEffect } from 'react';
import { Play, RotateCcw, AlertCircle } from 'lucide-react';

/**
 * TikTokDirect - Embed TikTok direct sans API
 */
export default function TikTokDirect({ postId, className = "" }) {
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!postId) return;
    
    // Reset states
    setIsLoading(true);
    setError(null);
    
    // Simuler un chargement pour l'iframe
    const timer = setTimeout(() => {
      setIsLoading(false);
    }, 1000);
    
    return () => clearTimeout(timer);
  }, [postId]);

  if (!postId) {
    return (
      <div className={`bg-gray-100 rounded-lg p-8 text-center ${className}`}>
        <p className="text-gray-500">ID TikTok manquant</p>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className={`bg-black rounded-2xl overflow-hidden flex items-center justify-center ${className}`} style={{ aspectRatio: '9/16' }}>
        <div className="text-center text-white">
          <RotateCcw className="w-12 h-12 animate-spin mx-auto mb-4 text-pink-500" />
          <p>Carregando TikTok...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`bg-red-50 border border-red-200 rounded-2xl p-6 text-center ${className}`}>
        <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
        <h3 className="text-lg font-semibold text-red-800 mb-2">Erro ao carregar</h3>
        <p className="text-red-600 mb-4">{error}</p>
        <button
          onClick={() => window.open(`https://www.tiktok.com/@user/video/${postId}`, '_blank')}
          className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition-colors"
        >
          Abrir no TikTok
        </button>
      </div>
    );
  }

  return (
    <div className={`bg-black rounded-2xl overflow-hidden ${className}`}>
      {/* Container avec format 9:16 parfait */}
      <div className="relative w-full" style={{ aspectRatio: '9/16' }}>
        {/* Iframe TikTok direct */}
        <iframe
          src={`https://www.tiktok.com/embed/${postId}`}
          title="TikTok Video"
          className="w-full h-full border-0 rounded-2xl"
          allowFullScreen
          allow="autoplay; fullscreen; picture-in-picture"
          style={{
            background: '#000',
            overflow: 'hidden'
          }}
          onLoad={() => setIsLoading(false)}
          onError={() => setError('Erro ao carregar vídeo')}
        />
        
        {/* Overlay de chargement */}
        {isLoading && (
          <div className="absolute inset-0 bg-black bg-opacity-75 flex items-center justify-center">
            <div className="text-center text-white">
              <RotateCcw className="w-12 h-12 animate-spin mx-auto mb-4 text-pink-500" />
              <p>Carregando...</p>
            </div>
          </div>
        )}
      </div>
      

    </div>
  );
}
