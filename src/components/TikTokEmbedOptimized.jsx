import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Volume2, VolumeX, RotateCcw, AlertCircle, RefreshCw, ExternalLink, Play } from 'lucide-react';

/**
 * TikTokEmbedOptimized - Composant TikTok ultra-optimisé selon les best practices
 * 
 * Best Practices implémentées :
 * - Timeout 15s + 3 retries (vs 6s + 1 retry)
 * - Autoplay muted + overlay "Tap pour activer le son"
 * - Layout 9:16 exact sans scroll parasite
 * - Lazy loading avec IntersectionObserver
 * - Preconnect TikTok dans index.html
 * - Gestion iOS Safari autoplay restrictions
 * - Fallback vidéo robuste
 */
export default function TikTokEmbedOptimized({ postId, className = "", song = null }) {
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [retryCount, setRetryCount] = useState(0);
  const [iframeKey, setIframeKey] = useState(0);
  const [isVisible, setIsVisible] = useState(false);
  const [isMuted, setIsMuted] = useState(true);
  const [showUnmuteOverlay, setShowUnmuteOverlay] = useState(true);
  const [isPlaying, setIsPlaying] = useState(false);
  
  const iframeRef = useRef(null);
  const containerRef = useRef(null);
  const timeoutRef = useRef(null);
  const observerRef = useRef(null);
  
  // Configuration optimisée selon les best practices
  const maxRetries = 3; // Augmenté de 1 à 3
  const loadTimeout = 15000; // Augmenté de 6s à 15s
  const retryDelay = 1000; // Délai entre retries

  // Fonction de nettoyage des timeouts
  const clearTimeout = useCallback(() => {
    if (timeoutRef.current) {
      window.clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
  }, []);

  // Lazy loading avec IntersectionObserver
  useEffect(() => {
    if (!containerRef.current) return;

    observerRef.current = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          observerRef.current?.disconnect();
        }
      },
      { threshold: 0.1, rootMargin: '50px' }
    );

    observerRef.current.observe(containerRef.current);

    return () => {
      observerRef.current?.disconnect();
    };
  }, []);

  // Reset complet quand postId change
  useEffect(() => {
    if (!postId || !isVisible) return;
    
    console.log(`🚀 TikTok Optimisé: Chargement de la vidéo ${postId}`);
    
    setIsLoading(true);
    setError(null);
    setRetryCount(0);
    setIframeKey(prev => prev + 1);
    setIsMuted(true);
    setShowUnmuteOverlay(true);
    setIsPlaying(false);
    
    clearTimeout();
    
    // Timeout optimisé selon les best practices
    timeoutRef.current = window.setTimeout(() => {
      console.warn('⏰ TikTok Optimisé: Timeout de chargement atteint (15s)');
      handleLoadError('Timeout: Chargement trop lent');
    }, loadTimeout);
    
    return clearTimeout;
  }, [postId, isVisible, clearTimeout]);

  const handleLoadSuccess = useCallback(() => {
    console.log('✅ TikTok Optimisé: Vidéo chargée avec succès');
    clearTimeout();
    setIsLoading(false);
    setError(null);
    
    // Démarrer en mode muted (best practice iOS)
    setIsMuted(true);
    setShowUnmuteOverlay(true);
  }, [clearTimeout]);

  const handleLoadError = useCallback((errorMessage = 'Erro ao carregar vídeo TikTok') => {
    console.error('❌ TikTok Optimisé: Échec de chargement');
    clearTimeout();
    
    if (retryCount < maxRetries) {
      console.log(`🔄 Tentative de retry ${retryCount + 1}/${maxRetries}`);
      
      // Retry avec délai selon les best practices
      setTimeout(() => {
        setRetryCount(prev => prev + 1);
        setIframeKey(prev => prev + 1);
        setIsLoading(true);
        setError(null);
        
        timeoutRef.current = window.setTimeout(() => {
          handleLoadError('Timeout sur retry');
        }, loadTimeout);
      }, retryDelay);
    } else {
      console.error('❌ Nombre maximum de tentatives atteint');
      setIsLoading(false);
      setError(errorMessage);
    }
  }, [retryCount, maxRetries, retryDelay, loadTimeout, clearTimeout]);

  const handleRetry = useCallback(() => {
    console.log('🔄 TikTok Optimisé: Tentative manuelle de retry');
    setError(null);
    setRetryCount(0);
    setIframeKey(prev => prev + 1);
    setIsLoading(true);
    
    timeoutRef.current = window.setTimeout(() => {
      handleLoadError('Timeout sur retry manuel');
    }, loadTimeout);
  }, [loadTimeout, handleLoadError]);

  const handleIframeError = useCallback(() => {
    handleLoadError('Erro interno do iframe TikTok');
  }, [handleLoadError]);

  // Gestion du son selon les best practices iOS
  const handleUnmute = useCallback(() => {
    console.log('🔊 TikTok Optimisé: Activation du son');
    setShowUnmuteOverlay(false);
    setIsMuted(false);
    
    // Focus sur l'iframe pour déclencher l'interaction
    if (iframeRef.current) {
      iframeRef.current.focus();
      
      // Tentative de play/unmute via postMessage (si supporté)
      try {
        iframeRef.current.contentWindow?.postMessage({
          type: 'unmute',
          action: 'unmute'
        }, 'https://www.tiktok.com');
      } catch (e) {
        console.log('PostMessage non supporté, fallback sur UI TikTok');
      }
    }
  }, []);

  // Nettoyage au démontage
  useEffect(() => {
    return () => {
      clearTimeout();
      observerRef.current?.disconnect();
    };
  }, [clearTimeout]);

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

  // Skeleton de chargement si pas encore visible
  if (!isVisible) {
    return (
      <div 
        ref={containerRef}
        className={`bg-gray-200 rounded-2xl overflow-hidden ${className}`}
        style={{
          width: '100%',
          aspectRatio: '9/16',
          position: 'relative'
        }}
      >
        <div className="animate-pulse bg-gray-300 w-full h-full flex items-center justify-center">
          <div className="text-center text-gray-500">
            <Play className="w-16 h-16 mx-auto mb-4" />
            <p>Carregando...</p>
          </div>
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
      {/* Container principal avec ratio 9:16 exact selon les best practices */}
      <div 
        className="tiktok-shell"
        style={{
          position: 'relative',
          width: '100%',
          aspectRatio: '9/16', // Ratio exact TikTok
          overflow: 'hidden' // Pas de scroll parasite
        }}
      >
        {/* Iframe TikTok ultra-optimisé selon les best practices */}
        <iframe
          key={iframeKey}
          ref={iframeRef}
          src={`https://www.tiktok.com/embed/${postId}?autoplay=1&muted=1&loop=1&controls=1&rel=0&modestbranding=1&playsinline=1&allowfullscreen=1`}
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
            zIndex: 1
          }}
          allow="autoplay; fullscreen; picture-in-picture; encrypted-media; microphone; camera; geolocation; gyroscope; accelerometer"
          allowFullScreen
          playsInline // Important sur iOS
          onLoad={handleLoadSuccess}
          onError={handleIframeError}
          sandbox="allow-scripts allow-same-origin allow-presentation allow-popups allow-popups-to-escape-sandbox allow-forms"
          referrerPolicy="strict-origin-when-cross-origin"
          loading="lazy"
        />
        
        {/* Overlay de chargement optimisé */}
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

        {/* Overlay "Tap pour activer le son" selon les best practices */}
        {!isLoading && showUnmuteOverlay && (
          <div 
            className="tiktok-unmute-overlay"
            style={{
              position: 'absolute',
              top: '0',
              left: '0',
              right: '0',
              bottom: '0',
              backgroundColor: 'rgba(0, 0, 0, 0.8)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              zIndex: 3,
              borderRadius: '16px',
              cursor: 'pointer'
            }}
            onClick={handleUnmute}
            role="button"
            aria-label="Cliquez pour activer le son"
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                handleUnmute();
              }
            }}
          >
            <div className="text-center text-white">
              <div className="bg-white bg-opacity-20 rounded-full p-6 mb-4 inline-block">
                <VolumeX className="w-16 h-16 text-white" />
              </div>
              <h3 className="text-xl font-bold mb-2">Cliquez pour activer le son</h3>
              <p className="text-lg text-gray-200">
                La vidéo est en cours de lecture (sans son)
              </p>
              <div className="mt-4 bg-white bg-opacity-20 rounded-lg px-4 py-2 inline-block">
                <span className="text-sm">🔊 Tap to unmute</span>
              </div>
            </div>
          </div>
        )}

        {/* Indicateur de statut accessible */}
        <div 
          className="sr-only"
          aria-live="polite"
          aria-atomic="true"
        >
          {isLoading && 'Chargement de la vidéo TikTok en cours...'}
          {!isLoading && showUnmuteOverlay && 'Vidéo en cours de lecture, cliquez pour activer le son'}
          {!isLoading && !showUnmuteOverlay && 'Vidéo en cours de lecture avec son activé'}
        </div>
      </div>
    </div>
  );
}
