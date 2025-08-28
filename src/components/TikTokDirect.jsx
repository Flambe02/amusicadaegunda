import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Play, RotateCcw, AlertCircle, RefreshCw, ExternalLink } from 'lucide-react';

/**
 * TikTokDirect - Embed TikTok professionnel avec intégration parfaite
 * Utilise les meilleures pratiques pour une vidéo stable et responsive
 */
export default function TikTokDirect({ postId, className = "" }) {
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [retryCount, setRetryCount] = useState(0);
  const [iframeKey, setIframeKey] = useState(0);
  const [isMounted, setIsMounted] = useState(false);
  
  const iframeRef = useRef(null);
  const containerRef = useRef(null);
  const timeoutRef = useRef(null);
  const retryTimeoutRef = useRef(null);
  
  const maxRetries = 2; // Réduit pour éviter les boucles
  const loadTimeout = 12000; // 12 secondes max

  // Gestion du cycle de vie du composant
  useEffect(() => {
    setIsMounted(true);
    return () => {
      setIsMounted(false);
      // Nettoyage des timeouts
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      if (retryTimeoutRef.current) clearTimeout(retryTimeoutRef.current);
    };
  }, []);

  // Fonction de nettoyage des timeouts
  const clearAllTimeouts = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    if (retryTimeoutRef.current) {
      clearTimeout(retryTimeoutRef.current);
      retryTimeoutRef.current = null;
    }
  }, []);

  // Reset complet quand postId change
  useEffect(() => {
    if (!postId || !isMounted) return;
    
    console.log(`🎬 TikTok: Chargement de la vidéo ${postId}`);
    
    // Reset states
    setIsLoading(true);
    setError(null);
    setRetryCount(0);
    setIframeKey(prev => prev + 1);
    
    // Nettoyer les timeouts précédents
    clearAllTimeouts();
    
    // Timeout principal de chargement
    timeoutRef.current = setTimeout(() => {
      if (isMounted) {
        console.warn('⏰ TikTok: Timeout de chargement atteint');
        handleLoadError('Timeout: La vidéo a pris trop de temps à charger');
      }
    }, loadTimeout);
    
    return clearAllTimeouts;
  }, [postId, isMounted, clearAllTimeouts]);

  const handleLoadSuccess = useCallback(() => {
    if (!isMounted) return;
    
    console.log('✅ TikTok: Vidéo chargée avec succès');
    clearAllTimeouts();
    setIsLoading(false);
    setError(null);
    
    // Focus sur l'iframe pour l'accessibilité
    if (iframeRef.current) {
      iframeRef.current.focus();
    }
  }, [isMounted, clearAllTimeouts]);

  const handleLoadError = useCallback((errorMessage = 'Erro ao carregar vídeo TikTok') => {
    if (!isMounted) return;
    
    console.error('❌ TikTok: Échec de chargement');
    clearAllTimeouts();
    
    if (retryCount < maxRetries) {
      console.log(`🔄 Tentative de retry ${retryCount + 1}/${maxRetries}`);
      
      // Délai avant retry pour éviter la surcharge
      retryTimeoutRef.current = setTimeout(() => {
        if (isMounted) {
          setRetryCount(prev => prev + 1);
          setIframeKey(prev => prev + 1);
          setIsLoading(true);
          setError(null);
          
          // Nouveau timeout pour cette tentative
          timeoutRef.current = setTimeout(() => {
            if (isMounted) {
              handleLoadError('Timeout sur retry');
            }
          }, loadTimeout);
        }
      }, 1000); // 1 seconde de délai
    } else {
      console.error('❌ Nombre maximum de tentatives atteint');
      setIsLoading(false);
      setError(errorMessage);
    }
  }, [isMounted, retryCount, maxRetries, clearAllTimeouts]);

  const handleRetry = useCallback(() => {
    if (!isMounted) return;
    
    console.log('🔄 Tentative manuelle de rechargement');
    setRetryCount(0);
    setIframeKey(prev => prev + 1);
    setIsLoading(true);
    setError(null);
    
    // Nouveau timeout
    clearAllTimeouts();
    timeoutRef.current = setTimeout(() => {
      if (isMounted) {
        handleLoadError('Timeout sur tentative manuelle');
      }
    }, loadTimeout);
  }, [isMounted, clearAllTimeouts]);

  // Gestion des erreurs de l'iframe
  const handleIframeError = useCallback(() => {
    handleLoadError('Erro interno do iframe TikTok');
  }, [handleLoadError]);

  // Gestion des messages postMessage pour la communication avec TikTok
  useEffect(() => {
    const handleMessage = (event) => {
      // Vérifier l'origine pour la sécurité
      if (event.origin !== 'https://www.tiktok.com') return;
      
      try {
        const data = event.data;
        if (data && data.type === 'tiktok-ready') {
          handleLoadSuccess();
        }
      } catch (err) {
        console.warn('TikTok: Erro ao processar mensagem', err);
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [handleLoadSuccess]);

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
            className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition-colors flex items-center gap-2"
          >
            <ExternalLink className="w-4 h-4" />
            Abrir no TikTok
          </button>
        </div>
      </div>
    );
  }

  return (
    <div 
      ref={containerRef}
      className={`tiktok-video-container ${className}`}
      style={{
        width: '100%',
        maxWidth: '100%',
        position: 'relative',
        overflow: 'hidden',
        backgroundColor: '#000',
        borderRadius: '16px',
        boxShadow: '0 10px 25px rgba(0, 0, 0, 0.15)'
      }}
    >
      {/* Container principal avec ratio 9:16 parfait et dimensions fixes */}
      <div 
        className="tiktok-iframe-wrapper"
        style={{
          width: '100%',
          height: '0',
          paddingBottom: '177.78%', // Ratio 9:16 exact (16/9 * 100)
          position: 'relative',
          overflow: 'hidden',
          borderRadius: '16px'
        }}
      >
        {/* Iframe TikTok avec paramètres optimisés */}
        <iframe
          key={iframeKey}
          ref={iframeRef}
          src={`https://www.tiktok.com/embed/${postId}?autoplay=0&muted=1&loop=1&controls=1&rel=0&modestbranding=1`}
          title={`Vídeo TikTok ${postId}`}
          className="tiktok-iframe"
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
          allow="autoplay; fullscreen; picture-in-picture; encrypted-media"
          allowFullScreen
          loading="lazy"
          onLoad={handleLoadSuccess}
          onError={handleIframeError}
          sandbox="allow-scripts allow-same-origin allow-presentation allow-popups allow-popups-to-escape-sandbox"
        />
        
        {/* Overlay de chargement avec design professionnel */}
        {isLoading && (
          <div 
            className="tiktok-loading-overlay"
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
              <div className="loading-spinner mb-4">
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
