import React, { useState, useEffect, useCallback } from 'react';
import TikTokEmbedOptimized from './TikTokEmbedOptimized';
import TikTokFallback from './TikTokFallback';

/**
 * TikTokSmart - Composant TikTok intelligent avec fallback automatique
 * 
 * Implémente les best practices :
 * - Détection automatique des problèmes TikTok
 * - Fallback vidéo natif en cas d'échec
 * - Gestion intelligente des timeouts et retries
 * - Cascade de fallbacks robuste
 * - Monitoring des performances
 */
export default function TikTokSmart({ 
  postId, 
  song = null, 
  className = "",
  fallbackVideoUrl = null,
  onPerformanceReport = null
}) {
  const [useFallback, setUseFallback] = useState(false);
  const [fallbackReason, setFallbackReason] = useState(null);
  const [performanceMetrics, setPerformanceMetrics] = useState({
    startTime: null,
    tiktokLoadTime: null,
    fallbackActivated: false,
    totalLoadTime: null
  });

  // Détection automatique des problèmes TikTok
  const handleTikTokFailure = useCallback((error, retryCount) => {
    console.warn('⚠️ TikTokSmart: Échec TikTok détecté', { error, retryCount });
    
    // Activer le fallback après 2 échecs ou erreur critique
    if (retryCount >= 2 || error.includes('Timeout') || error.includes('Erro interno')) {
      console.log('🔄 TikTokSmart: Activation du fallback automatique');
      setUseFallback(true);
      setFallbackReason(`TikTok failed: ${error} (retry ${retryCount})`);
      
      // Mettre à jour les métriques
      setPerformanceMetrics(prev => ({
        ...prev,
        fallbackActivated: true,
        fallbackReason: error
      }));
    }
  }, []);

  // Gestion du fallback activé
  const handleFallbackActivated = useCallback((fallbackData) => {
    console.log('🔄 TikTokSmart: Fallback activé', fallbackData);
    
    // Mettre à jour les métriques
    setPerformanceMetrics(prev => ({
      ...prev,
      fallbackActivated: true,
      fallbackData
    }));
    
    // Rapporter les performances si callback fourni
    if (onPerformanceReport) {
      onPerformanceReport({
        ...performanceMetrics,
        fallbackActivated: true,
        fallbackData,
        timestamp: new Date().toISOString()
      });
    }
  }, [onPerformanceReport, performanceMetrics]);

  // Monitoring des performances
  useEffect(() => {
    if (!postId) return;
    
    const startTime = performance.now();
    setPerformanceMetrics(prev => ({
      ...prev,
      startTime,
      tiktokLoadTime: null,
      fallbackActivated: false,
      totalLoadTime: null
    }));
    
    console.log('📊 TikTokSmart: Début du monitoring des performances');
  }, [postId]);

  // Calcul du temps de chargement total
  useEffect(() => {
    if (performanceMetrics.startTime && (useFallback || fallbackReason)) {
      const totalLoadTime = performance.now() - performanceMetrics.startTime;
      setPerformanceMetrics(prev => ({
        ...prev,
        totalLoadTime
      }));
      
      console.log(`📊 TikTokSmart: Temps de chargement total: ${totalLoadTime.toFixed(2)}ms`);
      
      // Rapporter les performances finales
      if (onPerformanceReport) {
        onPerformanceReport({
          ...performanceMetrics,
          totalLoadTime,
          finalStatus: useFallback ? 'fallback' : 'tiktok'
        });
      }
    }
  }, [useFallback, fallbackReason, performanceMetrics, onPerformanceReport]);

  // Vérifier si on a une URL de fallback
  const hasFallback = fallbackVideoUrl || (song && song.video_url);

  // Si pas de fallback et TikTok échoue, afficher une erreur
  if (useFallback && !hasFallback) {
    return (
      <div className={`bg-yellow-50 border border-yellow-200 rounded-2xl p-6 text-center ${className}`}>
        <div className="text-yellow-600 mb-4">
          <p className="text-lg font-semibold">TikTok Indisponível</p>
          <p className="text-sm">Vídeo de fallback não configurado</p>
        </div>
        {song && song.tiktok_url && (
          <a
            href={song.tiktok_url}
            target="_blank"
            rel="noopener noreferrer"
            className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition-colors inline-flex items-center gap-2"
          >
            Abrir no TikTok
          </a>
        )}
      </div>
    );
  }

  // Afficher le fallback si activé
  if (useFallback && hasFallback) {
    return (
      <TikTokFallback
        postId={postId}
        fallbackVideoUrl={fallbackVideoUrl || song?.video_url}
        song={song}
        className={className}
        onFallbackActivated={handleFallbackActivated}
      />
    );
  }

  // Afficher TikTok avec gestion d'erreur intelligente
  return (
    <TikTokEmbedOptimized
      postId={postId}
      song={song}
      className={className}
      onError={handleTikTokFailure}
      onLoadSuccess={() => {
        const tiktokLoadTime = performance.now() - (performanceMetrics.startTime || 0);
        setPerformanceMetrics(prev => ({
          ...prev,
          tiktokLoadTime
        }));
        console.log(`📊 TikTokSmart: TikTok chargé en ${tiktokLoadTime.toFixed(2)}ms`);
      }}
    />
  );
}
