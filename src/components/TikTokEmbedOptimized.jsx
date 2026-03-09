import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Volume2, VolumeX, RotateCcw, AlertCircle, RefreshCw, ExternalLink, Play, Music, Video } from 'lucide-react';
import '../styles/tiktok-global.css';

const isDev = typeof import.meta !== 'undefined' && import.meta.env?.DEV;

/**
 * TikTokEmbedOptimized V2.0.0 - Composant TikTok unifié et ultra-optimisé
 * 
 * Fonctionnalités :
 * - Embed TikTok avec fallback vidéo natif intégré
 * - Gestion d'erreurs robuste avec 3 retries
 * - Lazy loading avec IntersectionObserver
 * - Monitoring des performances
 * - Fallback automatique en cas d'échec TikTok
 * - Support iOS Safari optimisé
 */
export default function TikTokEmbedOptimized({ postId, className = "", song = null, fallbackVideoUrl = null }) {
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [retryCount, setRetryCount] = useState(0);
  const [iframeKey, setIframeKey] = useState(0);
  const [isVisible, setIsVisible] = useState(false);
  const [isMuted, setIsMuted] = useState(true);
  const [showUnmuteOverlay, setShowUnmuteOverlay] = useState(true);
  const [isPlaying, setIsPlaying] = useState(false);
  const [useFallback, setUseFallback] = useState(false);
  const [performanceMetrics, setPerformanceMetrics] = useState({
    startTime: null,
    tiktokLoadTime: null,
    fallbackActivated: false,
    totalLoadTime: null
  });
  
  const iframeRef = useRef(null);
  const containerRef = useRef(null);
  const timeoutRef = useRef(null);
  const observerRef = useRef(null);
  const fallbackVideoRef = useRef(null);
  
  // Configuration optimisée selon les best practices
  const maxRetries = 3;
  const loadTimeout = 15000; // 15 secondes
  const retryDelay = 1000; // 1 seconde entre retries

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

  // Monitoring des performances
  useEffect(() => {
    if (!postId || !isVisible) return;
    
    const startTime = performance.now();
    setPerformanceMetrics(prev => ({
      ...prev,
      startTime,
      tiktokLoadTime: null,
      fallbackActivated: false,
      totalLoadTime: null
    }));
    
    isDev && console.log(`🚀 TikTok V2.0.0: Chargement de la vidéo ${postId}`);
    
    setIsLoading(true);
    setError(null);
    setRetryCount(0);
    setIframeKey(prev => prev + 1);
    setIsMuted(true);
    setShowUnmuteOverlay(true);
    setIsPlaying(false);
    setUseFallback(false);
    
    clearTimeout();
    
    // Timeout optimisé selon les best practices
    timeoutRef.current = window.setTimeout(() => {
      isDev && console.warn('⏰ TikTok V2.0.0: Timeout de chargement atteint (15s)');
      handleLoadError('Timeout: Chargement trop lent');
    }, loadTimeout);
    
    return clearTimeout;
  }, [postId, isVisible, clearTimeout]);

  const handleLoadSuccess = useCallback(() => {
    const tiktokLoadTime = performance.now() - (performanceMetrics.startTime || 0);
    
    isDev && console.log('✅ TikTok V2.0.0: Vidéo chargée avec succès');
    clearTimeout();
    setIsLoading(false);
    setError(null);
    
    // Démarrer en mode muted (best practice iOS)
    setIsMuted(true);
    setShowUnmuteOverlay(true);
    
    // Mettre à jour les métriques
    setPerformanceMetrics(prev => ({
      ...prev,
      tiktokLoadTime,
      totalLoadTime: tiktokLoadTime
    }));
    
    isDev && console.log(`📊 TikTok V2.0.0: Temps de chargement: ${tiktokLoadTime.toFixed(2)}ms`);
  }, [clearTimeout, performanceMetrics.startTime]);

  const handleLoadError = useCallback((errorMessage = 'Erro ao carregar vídeo TikTok') => {
    console.error('❌ TikTok V2.0.0: Échec de chargement', errorMessage);
    clearTimeout();
    
    if (retryCount < maxRetries) {
      isDev && console.log(`🔄 Tentative de retry ${retryCount + 1}/${maxRetries}`);
      
      setTimeout(() => {
        setRetryCount(prev => prev + 1);
        setIframeKey(prev => prev + 1);
        setIsLoading(true);
        setError(null);
        
        // Nouveau timeout pour le retry
        timeoutRef.current = window.setTimeout(() => {
          handleLoadError('Timeout: Retry échoué');
        }, loadTimeout);
      }, retryDelay);
    } else {
      // Tous les retries échoués, activer le fallback
      isDev && console.log('🔄 TikTok V2.0.0: Tous les retries échoués, activation du fallback');
      setUseFallback(true);
      setError('TikTok indisponível - usando fallback');
      setIsLoading(false);
      
      // Mettre à jour les métriques
      const totalLoadTime = performance.now() - (performanceMetrics.startTime || 0);
      setPerformanceMetrics(prev => ({
        ...prev,
        fallbackActivated: true,
        totalLoadTime
      }));
      
      isDev && console.log(`📊 TikTok V2.0.0: Fallback activé après ${totalLoadTime.toFixed(2)}ms`);
    }
  }, [retryCount, maxRetries, retryDelay, loadTimeout, clearTimeout, performanceMetrics.startTime]);

  const handleRetry = useCallback(() => {
    isDev && console.log('🔄 TikTok V2.0.0: Retry manuel');
    setRetryCount(0);
    setError(null);
    setUseFallback(false);
    setIframeKey(prev => prev + 1);
    setIsLoading(true);
    
    // Nouveau timeout
    timeoutRef.current = window.setTimeout(() => {
      handleLoadError('Timeout: Retry manuel échoué');
    }, loadTimeout);
  }, [handleLoadError, loadTimeout]);

  const handleFallbackPlay = useCallback(() => {
    if (fallbackVideoRef.current) {
      if (fallbackVideoRef.current.paused) {
        fallbackVideoRef.current.play();
        setIsPlaying(true);
      } else {
        fallbackVideoRef.current.pause();
        setIsPlaying(false);
      }
    }
  }, []);

  const handleUnmute = useCallback(() => {
    setIsMuted(false);
    setShowUnmuteOverlay(false);
  }, []);

  const handleExternalLink = useCallback(() => {
    if (song?.tiktok_url) {
      window.open(song.tiktok_url, '_blank');
    }
  }, [song]);

  // Nettoyage à la destruction du composant
  useEffect(() => {
    return () => {
      clearTimeout();
      if (observerRef.current) {
        observerRef.current.disconnect();
      }
    };
  }, [clearTimeout]);

  // Si le composant n'est pas visible, ne rien afficher
  if (!isVisible) {
    return (
      <div ref={containerRef} className={`${className} bg-gray-100 rounded-lg flex items-center justify-center`} style={{ aspectRatio: '9/16' }}>
        <div className="text-center text-gray-500">
          <Video className="w-8 h-8 mx-auto mb-2" />
          <p className="text-sm">Carregando...</p>
        </div>
      </div>
    );
  }

  // Fallback vidéo natif
  if (useFallback) {
    return (
      <div className={`${className} bg-black rounded-lg overflow-hidden`} style={{ aspectRatio: '9/16' }}>
        <div className="relative w-full h-full">
          {/* Fallback vidéo avec overlay */}
          <video
            ref={fallbackVideoRef}
            className="w-full h-full object-cover"
            controls
            preload="metadata"
            poster={song?.cover_image || undefined}
            onPlay={() => setIsPlaying(true)}
            onPause={() => setIsPlaying(false)}
          >
            {fallbackVideoUrl && <source src={fallbackVideoUrl} type="video/mp4" />}
            <source src="/videos/fallback-video.mp4" type="video/mp4" />
            <p>Vídeo não suportado pelo navegador</p>
          </video>
          
          {/* Overlay d'information */}
          <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-4">
            <div className="text-white text-center">
              <p className="text-sm font-medium mb-2">🎬 Fallback Vídeo</p>
              <p className="text-xs opacity-80">{song?.title || 'Vídeo musical'}</p>
            </div>
          </div>
          
          {/* Bouton de retry TikTok */}
          <button
            onClick={handleRetry}
            className="absolute top-2 right-2 bg-black/70 hover:bg-black/90 text-white p-2 rounded-full transition-colors"
            title="Tentar TikTok novamente"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
        </div>
      </div>
    );
  }

  return (
    <div 
      ref={containerRef} 
      className={`${className} bg-black rounded-lg overflow-hidden tiktok-container`} 
      data-tiktok-component="true"
      style={{ 
        aspectRatio: '9/16',
        overflow: 'hidden',
        position: 'relative'
      }}
    >
      <div className="relative w-full h-full" style={{ overflow: 'hidden' }}>
        {/* Loading state */}
        {isLoading && (
          <div className="absolute inset-0 bg-black flex items-center justify-center z-10">
            <div className="text-center text-white">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4"></div>
              <p className="text-sm">Carregando TikTok...</p>
              {retryCount > 0 && (
                <p className="text-xs opacity-70 mt-1">Tentativa {retryCount + 1}/{maxRetries + 1}</p>
              )}
            </div>
          </div>
        )}

        {/* Error state */}
        {error && !isLoading && (
          <div className="absolute inset-0 bg-red-900 flex items-center justify-center z-10">
            <div className="text-center text-white p-4">
              <AlertCircle className="w-12 h-12 mx-auto mb-4 text-red-300" />
              <p className="text-sm font-medium mb-2">Erro ao carregar</p>
              <p className="text-xs opacity-80 mb-4">{error}</p>
              <button
                onClick={handleRetry}
                className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg text-sm transition-colors"
              >
                Tentar novamente
              </button>
            </div>
          </div>
        )}

        {/* TikTok iframe */}
        <iframe
          key={iframeKey}
          ref={iframeRef}
          src={`https://www.tiktok.com/embed/${postId}`}
          className="w-full h-full border-0"
          allowFullScreen
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          onLoad={handleLoadSuccess}
          onError={() => handleLoadError('Erro de carregamento do iframe')}
          style={{ 
            display: isLoading || error ? 'none' : 'block',
            overflow: 'hidden',
            scrolling: 'no'
          }}
          scrolling="no"
        />

        {/* Overlay de contrôle pour iOS */}
        {!isLoading && !error && showUnmuteOverlay && (
          <div className="absolute inset-0 bg-black/50 flex items-center justify-center z-20">
            <div className="text-center text-white p-6">
              <VolumeX className="w-16 h-16 mx-auto mb-4 text-white/80" />
              <p className="text-lg font-medium mb-2">Vídeo em modo silencioso</p>
              <p className="text-sm opacity-80 mb-4">Toque para ativar o som</p>
              <button
                onClick={handleUnmute}
                className="bg-white text-black px-6 py-3 rounded-full font-medium hover:bg-gray-100 transition-colors"
              >
                Ativar Som
              </button>
            </div>
          </div>
        )}

        {/* Boutons de contrôle */}
        {!isLoading && !error && (
          <div className="absolute top-2 right-2 flex gap-2">
            {/* Bouton de retry */}
            <button
              onClick={handleRetry}
              className="bg-black/70 hover:bg-black/90 text-white p-2 rounded-full transition-colors"
              title="Recarregar vídeo"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
            
            {/* Bouton de lien externe */}
            {song?.tiktok_url && (
              <button
                onClick={handleExternalLink}
                className="bg-black/70 hover:bg-black/90 text-white p-2 rounded-full transition-colors"
                title="Ver no TikTok"
              >
                <ExternalLink className="w-4 h-4" />
              </button>
            )}
          </div>
        )}

        {/* Indicateur de performance supprimé pour la production */}
      </div>
    </div>
  );
}
