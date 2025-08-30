import { useState, useEffect, useCallback, useRef } from 'react';

/**
 * useTikTokPerformance - Hook pour monitorer les performances TikTok
 * 
 * Implémente les best practices :
 * - Monitoring en temps réel des performances
 * - Détection automatique des problèmes
 * - Métriques de performance détaillées
 * - Rapports de performance automatisés
 * - Historique des performances
 */
export default function useTikTokPerformance(postId, options = {}) {
  const {
    enableMonitoring = true,
    reportToAnalytics = false,
    performanceThreshold = 10000, // 10s
    retryThreshold = 2,
    onPerformanceAlert = null
  } = options;

  const [metrics, setMetrics] = useState({
    startTime: null,
    tiktokLoadTime: null,
    fallbackActivated: false,
    totalLoadTime: null,
    retryCount: 0,
    errorCount: 0,
    successCount: 0,
    performanceScore: 100
  });

  const [history, setHistory] = useState([]);
  const [alerts, setAlerts] = useState([]);
  
  const startTimeRef = useRef(null);
  const retryCountRef = useRef(0);
  const errorCountRef = useRef(0);

  // Initialiser le monitoring
  useEffect(() => {
    if (!postId || !enableMonitoring) return;

    const startTime = performance.now();
    startTimeRef.current = startTime;
    retryCountRef.current = 0;
    errorCountRef.current = 0;

    setMetrics(prev => ({
      ...prev,
      startTime,
      tiktokLoadTime: null,
      fallbackActivated: false,
      totalLoadTime: null,
      retryCount: 0,
      errorCount: 0,
      successCount: 0,
      performanceScore: 100
    }));

    console.log('📊 useTikTokPerformance: Début du monitoring', { postId, startTime });
  }, [postId, enableMonitoring]);

  // Calculer le score de performance
  const calculatePerformanceScore = useCallback((loadTime, retryCount, errorCount) => {
    let score = 100;
    
    // Pénalité pour le temps de chargement
    if (loadTime > performanceThreshold) {
      score -= Math.min(30, Math.floor((loadTime - performanceThreshold) / 1000) * 5);
    }
    
    // Pénalité pour les retries
    score -= retryCount * 10;
    
    // Pénalité pour les erreurs
    score -= errorCount * 15;
    
    return Math.max(0, score);
  }, [performanceThreshold]);

  // Enregistrer un succès
  const recordSuccess = useCallback((loadTime) => {
    const currentTime = performance.now();
    const totalTime = currentTime - (startTimeRef.current || currentTime);
    
    setMetrics(prev => {
      const newMetrics = {
        ...prev,
        tiktokLoadTime: loadTime,
        totalLoadTime: totalTime,
        successCount: prev.successCount + 1,
        performanceScore: calculatePerformanceScore(loadTime, retryCountRef.current, errorCountRef.current)
      };
      
      // Ajouter à l'historique
      setHistory(prevHistory => [
        ...prevHistory,
        {
          timestamp: new Date().toISOString(),
          postId,
          type: 'success',
          metrics: newMetrics
        }
      ]);
      
      return newMetrics;
    });

    console.log('✅ useTikTokPerformance: Succès enregistré', { loadTime, totalTime });
  }, [postId, calculatePerformanceScore]);

  // Enregistrer un échec
  const recordFailure = useCallback((error, retryCount) => {
    retryCountRef.current = retryCount;
    errorCountRef.current += 1;
    
    setMetrics(prev => {
      const newMetrics = {
        ...prev,
        retryCount,
        errorCount: errorCountRef.current,
        performanceScore: calculatePerformanceScore(prev.tiktokLoadTime || 0, retryCount, errorCountRef.current)
      };
      
      // Ajouter à l'historique
      setHistory(prevHistory => [
        ...prevHistory,
        {
          timestamp: new Date().toISOString(),
          postId,
          type: 'failure',
          error,
          retryCount,
          metrics: newMetrics
        }
      ]);
      
      return newMetrics;
    });

    console.warn('❌ useTikTokPerformance: Échec enregistré', { error, retryCount });
  }, [postId, calculatePerformanceScore]);

  // Enregistrer l'activation du fallback
  const recordFallback = useCallback((reason) => {
    const currentTime = performance.now();
    const totalTime = currentTime - (startTimeRef.current || currentTime);
    
    setMetrics(prev => {
      const newMetrics = {
        ...prev,
        fallbackActivated: true,
        totalLoadTime: totalTime,
        performanceScore: calculatePerformanceScore(prev.tiktokLoadTime || 0, retryCountRef.current, errorCountRef.current)
      };
      
      // Ajouter à l'historique
      setHistory(prevHistory => [
        ...prevHistory,
        {
          timestamp: new Date().toISOString(),
          postId,
          type: 'fallback',
          reason,
          metrics: newMetrics
        }
      ]);
      
      return newMetrics;
    });

    console.log('🔄 useTikTokPerformance: Fallback enregistré', { reason, totalTime });
  }, [postId, calculatePerformanceScore]);

  // Générer des alertes de performance
  useEffect(() => {
    if (!enableMonitoring) return;

    const currentMetrics = metrics;
    const newAlerts = [];

    // Alerte pour performance faible
    if (currentMetrics.performanceScore < 50) {
      newAlerts.push({
        type: 'performance',
        severity: 'high',
        message: `Performance TikTok faible: ${currentMetrics.performanceScore}/100`,
        timestamp: new Date().toISOString(),
        metrics: currentMetrics
      });
    }

    // Alerte pour trop de retries
    if (currentMetrics.retryCount >= retryThreshold) {
      newAlerts.push({
        type: 'retry',
        severity: 'medium',
        message: `Trop de tentatives: ${currentMetrics.retryCount}/${retryThreshold}`,
        timestamp: new Date().toISOString(),
        metrics: currentMetrics
      });
    }

    // Alerte pour temps de chargement élevé
    if (currentMetrics.tiktokLoadTime && currentMetrics.tiktokLoadTime > performanceThreshold) {
      newAlerts.push({
        type: 'timeout',
        severity: 'medium',
        message: `Chargement lent: ${Math.round(currentMetrics.tiktokLoadTime)}ms`,
        timestamp: new Date().toISOString(),
        metrics: currentMetrics
      });
    }

    // Ajouter les nouvelles alertes
    if (newAlerts.length > 0) {
      setAlerts(prev => [...prev, ...newAlerts]);
      
      // Notifier les alertes si callback fourni
      newAlerts.forEach(alert => {
        if (onPerformanceAlert) {
          onPerformanceAlert(alert);
        }
      });
    }
  }, [metrics, enableMonitoring, retryThreshold, performanceThreshold, onPerformanceAlert]);

  // Rapporter les performances aux analytics si activé
  useEffect(() => {
    if (!reportToAnalytics || !metrics.totalLoadTime) return;

    // Simuler l'envoi aux analytics
    console.log('📊 useTikTokPerformance: Rapport aux analytics', {
      postId,
      metrics,
      timestamp: new Date().toISOString()
    });

    // Ici vous pourriez envoyer à Google Analytics, Mixpanel, etc.
  }, [metrics.totalLoadTime, reportToAnalytics, postId]);

  // Nettoyer l'historique (garder seulement les 100 derniers)
  useEffect(() => {
    if (history.length > 100) {
      setHistory(prev => prev.slice(-100));
    }
  }, [history]);

  return {
    metrics,
    history,
    alerts,
    recordSuccess,
    recordFailure,
    recordFallback,
    clearHistory: () => setHistory([]),
    clearAlerts: () => setAlerts([])
  };
}
