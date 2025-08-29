import React, { useState, useEffect, useRef } from 'react';
import { RotateCcw, AlertCircle, RefreshCw, ExternalLink } from 'lucide-react';

/**
 * TikTokEmbedOptimized - Composant TikTok ultra-optimisé pour résoudre les problèmes de chargement
 * Spécialement conçu pour la vidéo "Confissões Bancárias" et autres vidéos problématiques
 */
export default function TikTokEmbedOptimized({ postId, className = "", song = null }) {
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [retryCount, setRetryCount] = useState(0);
  const [iframeKey, setIframeKey] = useState(0);
  
  const iframeRef = useRef(null);
  const containerRef = useRef(null);
  const timeoutRef = useRef(null);
  
  const maxRetries = 1;
  const loadTimeout = 6000; // Timeout ultra-court de 6 secondes

  // Fonction de nettoyage des timeouts
  const clearTimeout = () => {
    if (timeoutRef.current) {
      window.clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
  };

  // Reset complet quand postId change
  useEffect(() => {
    if (!postId) return;
    
    console.log(`🚀 TikTok Optimisé: Chargement de la vidéo ${postId}`);
    
    setIsLoading(true);
    setError(null);
    setRetryCount(0);
    setIframeKey(prev => prev + 1);
    
    clearTimeout();
    
    // Timeout ultra-court pour une détection rapide des problèmes
    timeoutRef.current = window.setTimeout(() => {
      console.warn('⏰ TikTok Optimisé: Timeout de chargement atteint');
      handleLoadError('Timeout: Chargement trop lent');
    }, loadTimeout);
    
    return clearTimeout;
  }, [postId]);

  const handleLoadSuccess = () => {
    console.log('✅ TikTok Optimisé: Vidéo chargée avec succès');
    clearTimeout();
    setIsLoading(false);
    setError(null);
  };

  const handleLoadError = (errorMessage = 'Erro ao carregar vídeo TikTok') => {
    console.error('❌ TikTok Optimisé: Échec de chargement');
    clearTimeout();
    
    if (retryCount < maxRetries) {
      console.log(`🔄 Tentative de retry ${retryCount + 1}/${maxRetries}`);
      
      // Retry ultra-rapide (300ms)
      setTimeout(() => {
        setRetryCount(prev => prev + 1);
        setIframeKey(prev => prev + 1);
        setIsLoading(true);
        setError(null);
        
        timeoutRef.current = window.setTimeout(() => {
          handleLoadError('Timeout sur retry');
        }, loadTimeout);
      }, 300);
    } else {
      console.error('❌ Nombre maximum de tentatives atteint');
      setIsLoading(false);
      setError(errorMessage);
    }
  };

  const handleRetry = () => {
    console.log('🔄 TikTok Optimisé: Tentative manuelle de retry');
    setError(null);
    setRetryCount(0);
    setIframeKey(prev => prev + 1);
    setIsLoading(true);
    
    timeoutRef.current = window.setTimeout(() => {
      handleLoadError('Timeout sur retry manuel');
    }, loadTimeout);
  };

  const handleIframeError = () => {
    handleLoadError('Erro interno do iframe TikTok');
  };

  // Nettoyage au démontage
  useEffect(() => {
    return clearTimeout;
  }, []);

  if (!postId) {
    return (
      <div className={`bg-gray-100 rounded-lg p-8 text-center ${className}`}>
        <p className="text-gray-500">ID TikTok manquant</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`bg-red-50 border border-red-200 rounded-2xl p-6 text-center ${className}`}>
        <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
        <h3 className="text-lg font-semibold text-red-800 mb-2">Erro ao carregar</h3>
        <p className="text-red-600 mb-4">{error}</p>
        <div className="flex gap-2 justify-center flex-wrap">
          <button
            onClick={handleRetry}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
          >
            <RefreshCw className="w-4 h-4" />
            Tentar Novamente
          </button>
          {song && song.tiktok_url && (
            <a
              href={song.tiktok_url}
              target="_blank"
              rel="noopener noreferrer"
              className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition-colors flex items-center gap-2"
            >
              <ExternalLink className="w-4 h-4" />
              Abrir no TikTok
            </a>
          )}
        </div>
      </div>
    );
  }

  return (
    <div 
      ref={containerRef}
      className={`tiktok-video-container-optimized ${className}`}
      style={{
        width: '100%',
        maxWidth: '100%',
        position: 'relative',
        backgroundColor: '#000',
        borderRadius: '16px',
        boxShadow: '0 10px 25px rgba(0, 0, 0, 0.15)',
        overflow: 'hidden'
      }}
    >
      {/* Container principal avec dimensions dynamiques pour TikTok */}
      <div 
        className="tiktok-iframe-wrapper-optimized"
        style={{
          width: '100%',
          height: '0',
          paddingBottom: '177.78%', // Ratio 9:16 exact pour TikTok
          position: 'relative',
          overflow: 'hidden',
          borderRadius: '16px'
        }}
      >
        {/* Iframe TikTok ultra-optimisé */}
        <iframe
          key={iframeKey}
          ref={iframeRef}
          src={`https://www.tiktok.com/embed/${postId}?autoplay=0&muted=0&loop=1&controls=1&rel=0&modestbranding=1&playsinline=1&allowfullscreen=1`}
          title={`Vídeo TikTok ${postId}`}
          className="tiktok-iframe-optimized"
          style={{
            position: 'absolute',
            top: '0',
            left: '0',
            width: '100%',
            height: '100%',
            border: 'none',
            borderRadius: '16px',
            backgroundColor: '#000',
            overflow: 'hidden',
            display: 'block',
            zIndex: 1,
            scrolling: 'no',
            allowTransparency: 'true',
            frameBorder: '0'
          }}
          allow="autoplay; fullscreen; picture-in-picture; encrypted-media; microphone; camera; geolocation; gyroscope; accelerometer"
          allowFullScreen
          // Pas de loading lazy pour un chargement immédiat
          onLoad={handleLoadSuccess}
          onError={handleIframeError}
          sandbox="allow-scripts allow-same-origin allow-presentation allow-popups allow-popups-to-escape-sandbox allow-forms allow-top-navigation"
          scrolling="no"
          seamless
        />
        
        {/* Overlay de chargement ultra-rapide */}
        {isLoading && (
          <div 
            className="tiktok-loading-overlay-optimized"
            style={{
              position: 'absolute',
              top: '0',
              left: '0',
              right: '0',
              bottom: '0',
              backgroundColor: 'rgba(0, 0, 0, 0.95)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              zIndex: 2,
              borderRadius: '16px'
            }}
          >
            <div className="text-center text-white">
              <div className="loading-spinner-optimized mb-4">
                <RotateCcw className="w-12 h-12 animate-spin mx-auto text-pink-500" />
              </div>
              <p className="text-lg font-medium mb-2">Carregando TikTok...</p>
              {retryCount > 0 && (
                <p className="text-sm text-gray-300">
                  Tentativa {retryCount + 1}/{maxRetries + 1}
                </p>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
