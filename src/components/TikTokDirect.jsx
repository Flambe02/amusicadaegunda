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
  const timeoutRef = useRef(null);

  // Reset complet quand postId change
  useEffect(() => {
    if (!postId) return;
    
    console.log(`🔄 TikTok: Chargement de la vidéo ${postId}`);
    
    // Reset states
    setIsLoading(true);
    setError(null);
    setRetryCount(0);
    setIframeKey(prev => prev + 1);
    
    // Nettoyer le timeout précédent
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    
    // Timeout de sécurité
    timeoutRef.current = setTimeout(() => {
      console.warn('TikTok: Timeout de sécurité atteint');
      setIsLoading(false);
      setError('Timeout: La vidéo a pris trop de temps à charger');
    }, 15000); // 15 secondes
    
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [postId]);

  const handleLoadSuccess = () => {
    console.log('✅ TikTok iframe chargé avec succès');
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    setIsLoading(false);
    setError(null);
  };

  const handleLoadError = () => {
    console.error('❌ TikTok iframe échec de chargement');
    
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    
    if (retryCount < maxRetries) {
      console.log(`🔄 Tentative de retry ${retryCount + 1}/${maxRetries}`);
      setRetryCount(prev => prev + 1);
      setIframeKey(prev => prev + 1);
      setIsLoading(true);
      setError(null);
      
      // Nouveau timeout pour cette tentative
      timeoutRef.current = setTimeout(() => {
        console.warn(`TikTok: Timeout sur tentative ${retryCount + 1}`);
        handleLoadError();
      }, 15000);
    } else {
      console.error('❌ Nombre maximum de tentatives atteint');
      setIsLoading(false);
      setError('Erro ao carregar vídeo TikTok após várias tentativas');
    }
  };

  const handleRetry = () => {
    console.log('🔄 Tentative manuelle de rechargement');
    setRetryCount(0);
    setIframeKey(prev => prev + 1);
    setIsLoading(true);
    setError(null);
    
    // Nouveau timeout
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    timeoutRef.current = setTimeout(() => {
      console.warn('TikTok: Timeout sur tentative manuelle');
      handleLoadError();
    }, 15000);
  };

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
      {/* Container avec format 9:16 parfait */}
      <div className="relative w-full" style={{ aspectRatio: '9/16' }}>
        {/* Iframe TikTok */}
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
        
        {/* Overlay de chargement - seulement si isLoading est true */}
        {isLoading && (
          <div className="absolute inset-0 bg-black bg-opacity-90 flex items-center justify-center">
            <div className="text-center text-white">
              <RotateCcw className="w-12 h-12 animate-spin mx-auto mb-4 text-pink-500" />
              <p className="text-lg font-medium">Carregando TikTok...</p>
              {retryCount > 0 && (
                <p className="text-sm text-gray-300 mt-2">
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
