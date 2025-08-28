import React, { useState, useEffect, useRef } from 'react';
import { Play, RotateCcw, AlertCircle, RefreshCw } from 'lucide-react';

/**
 * TikTokDirect - Embed TikTok direct avec gestion d'erreur robuste
 */
export default function TikTokDirect({ postId, className = "" }) {
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [retryCount, setRetryCount] = useState(0);
  const [iframeKey, setIframeKey] = useState(0);
  const iframeRef = useRef(null);
  const maxRetries = 3;

  useEffect(() => {
    if (!postId) return;
    
    // Reset states
    setIsLoading(true);
    setError(null);
    setRetryCount(0);
    
    // Timeout de sécurité pour éviter l'attente infinie
    const safetyTimer = setTimeout(() => {
      if (isLoading) {
        console.warn('TikTok: Timeout de sécurité atteint');
        handleLoadError();
      }
    }, 10000); // 10 secondes max
    
    return () => clearTimeout(safetyTimer);
  }, [postId]);

  const handleLoadSuccess = () => {
    console.log('✅ TikTok iframe chargé avec succès');
    setIsLoading(false);
    setError(null);
  };

  const handleLoadError = () => {
    console.error('❌ TikTok iframe échec de chargement');
    
    if (retryCount < maxRetries) {
      console.log(`🔄 Tentative de retry ${retryCount + 1}/${maxRetries}`);
      setRetryCount(prev => prev + 1);
      setIframeKey(prev => prev + 1); // Force re-render de l'iframe
      setIsLoading(true);
      setError(null);
    } else {
      console.error('❌ Nombre maximum de tentatives atteint');
      setIsLoading(false);
      setError('Erro ao carregar vídeo TikTok após várias tentativas');
    }
  };

  const handleRetry = () => {
    setRetryCount(0);
    setIframeKey(prev => prev + 1);
    setIsLoading(true);
    setError(null);
  };

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
          {retryCount > 0 && (
            <p className="text-xs text-gray-400 mt-2">Tentativa {retryCount + 1}/{maxRetries + 1}</p>
          )}
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
        <div className="flex gap-2 justify-center">
          <button
            onClick={handleRetry}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
          >
            <RefreshCw className="w-4 h-4" />
            Tentar Novamente
          </button>
          <button
            onClick={() => window.open(`https://www.tiktok.com/@user/video/${postId}`, '_blank')}
            className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition-colors"
          >
            Abrir no TikTok
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={`bg-black rounded-2xl overflow-hidden ${className}`}>
      {/* Container avec format 9:16 parfait, sans marges ni padding */}
      <div className="relative w-full m-0 p-0" style={{ aspectRatio: '9/16' }}>
        {/* Iframe TikTok direct avec key pour forcer le re-render */}
        <iframe
          key={iframeKey}
          ref={iframeRef}
          src={`https://www.tiktok.com/embed/${postId}`}
          title="TikTok Video"
          className="w-full h-full border-0 rounded-none block"
          allowFullScreen
          allow="autoplay; fullscreen; picture-in-picture"
          style={{
            background: '#000',
            overflow: 'hidden',
            display: 'block'
          }}
          onLoad={handleLoadSuccess}
          onError={handleLoadError}
        />
        
        {/* Overlay de chargement */}
        {isLoading && (
          <div className="absolute inset-0 bg-black bg-opacity-75 flex items-center justify-center">
            <div className="text-center text-white">
              <RotateCcw className="w-12 h-12 animate-spin mx-auto mb-4 text-pink-500" />
              <p>Carregando...</p>
              {retryCount > 0 && (
                <p className="text-xs text-gray-400 mt-2">Tentativa {retryCount + 1}/{maxRetries + 1}</p>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
