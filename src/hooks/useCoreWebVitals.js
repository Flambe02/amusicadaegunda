import { useState, useEffect, useCallback, useRef } from 'react';

/**
 * useCoreWebVitals - Hook pour mesurer les Core Web Vitals
 * 
 * Implémente :
 * - Largest Contentful Paint (LCP)
 * - First Input Delay (FID)
 * - Cumulative Layout Shift (CLS)
 * - Alertes automatiques pour dégradations
 * - Historique des métriques
 * - Seuils configurables
 */

// Seuils recommandés par Google (en millisecondes)
const THRESHOLDS = {
  LCP: {
    GOOD: 2500,      // < 2.5s = Bon
    NEEDS_IMPROVEMENT: 4000,  // 2.5s - 4s = À améliorer
    POOR: 4000       // > 4s = Mauvais
  },
  FID: {
    GOOD: 100,       // < 100ms = Bon
    NEEDS_IMPROVEMENT: 300,   // 100ms - 300ms = À améliorer
    POOR: 300        // > 300ms = Mauvais
  },
  CLS: {
    GOOD: 0.1,       // < 0.1 = Bon
    NEEDS_IMPROVEMENT: 0.25,  // 0.1 - 0.25 = À améliorer
    POOR: 0.25       // > 0.25 = Mauvais
  }
};

export default function useCoreWebVitals(options = {}) {
  const {
    enableMonitoring = true,
    enableAlerts = true,
    alertThreshold = 'NEEDS_IMPROVEMENT', // Seuil pour déclencher les alertes
    maxHistorySize = 50,                 // Taille maximale de l'historique
    onAlert = null                       // Callback pour les alertes
  } = options;

  const [metrics, setMetrics] = useState({
    LCP: null,
    FID: null,
    CLS: null
  });

  const [history, setHistory] = useState([]);
  const [alerts, setAlerts] = useState([]);
  const [isMonitoring, setIsMonitoring] = useState(false);

  const observersRef = useRef({});
  const performanceObserverRef = useRef(null);

  /**
   * Évaluer la qualité d'une métrique
   */
  const evaluateMetric = useCallback((metricName, value) => {
    const thresholds = THRESHOLDS[metricName];
    if (!thresholds) return 'UNKNOWN';

    if (value <= thresholds.GOOD) return 'GOOD';
    if (value <= thresholds.NEEDS_IMPROVEMENT) return 'NEEDS_IMPROVEMENT';
    return 'POOR';
  }, []);

  /**
   * Formater une métrique pour l'affichage
   */
  const formatMetric = useCallback((metricName, value) => {
    if (value === null) return 'N/A';

    switch (metricName) {
      case 'LCP':
        return `${(value / 1000).toFixed(2)}s`;
      case 'FID':
        return `${value.toFixed(0)}ms`;
      case 'CLS':
        return value.toFixed(3);
      default:
        return value.toString();
    }
  }, []);

  /**
   * Ajouter une métrique à l'historique
   */
  const addToHistory = useCallback((metricName, value, quality) => {
    const timestamp = Date.now();
    const entry = {
      id: `${metricName}_${timestamp}`,
      metricName,
      value,
      quality,
      timestamp,
      date: new Date(timestamp).toISOString()
    };

    setHistory(prev => {
      const newHistory = [entry, ...prev];
      // Limiter la taille de l'historique
      return newHistory.slice(0, maxHistorySize);
    });

    return entry;
  }, [maxHistorySize]);

  /**
   * Créer une alerte
   */
  const createAlert = useCallback((metricName, value, quality, previousValue = null) => {
    if (!enableAlerts) return;

    const threshold = THRESHOLDS[metricName][alertThreshold];
    const shouldAlert = quality === 'POOR' || 
                       (alertThreshold === 'NEEDS_IMPROVEMENT' && quality === 'NEEDS_IMPROVEMENT');

    if (!shouldAlert) return;

    const alert = {
      id: `alert_${metricName}_${Date.now()}`,
      type: 'performance',
      severity: quality === 'POOR' ? 'high' : 'medium',
      metricName,
      currentValue: value,
      previousValue,
      quality,
      message: `Performance ${metricName} dégradée: ${formatMetric(metricName, value)} (${quality})`,
      timestamp: Date.now(),
      date: new Date().toISOString()
    };

    setAlerts(prev => [alert, ...prev]);

    // Appeler le callback d'alerte si fourni
    if (onAlert) {
      onAlert(alert);
    }

    // Log de l'alerte
    console.warn(`🚨 Alerte performance ${metricName}:`, alert.message);

    return alert;
  }, [enableAlerts, alertThreshold, onAlert, formatMetric]);

  /**
   * Mesurer le LCP (Largest Contentful Paint)
   */
  const measureLCP = useCallback(() => {
    if (!('PerformanceObserver' in window)) {
      console.warn('⚠️ PerformanceObserver non supporté pour LCP');
      return;
    }

    try {
      const observer = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        const lastEntry = entries[entries.length - 1];
        
        if (lastEntry) {
          const value = lastEntry.startTime;
          const quality = evaluateMetric('LCP', value);
          
          setMetrics(prev => {
            const newMetrics = { ...prev, LCP: value };
            
            // Vérifier les dégradations
            if (prev.LCP !== null && value > prev.LCP * 1.2) { // Dégradation de 20%
              createAlert('LCP', value, quality, prev.LCP);
            }
            
            return newMetrics;
          });
          addToHistory('LCP', value, quality);
        }
      });

      observer.observe({ entryTypes: ['largest-contentful-paint'] });
      observersRef.current.LCP = observer;

    } catch (error) {
      console.error('❌ Erreur lors de la mesure LCP:', error);
    }
  }, [evaluateMetric, addToHistory, createAlert]);

  /**
   * Mesurer le FID (First Input Delay)
   */
  const measureFID = useCallback(() => {
    if (!('PerformanceObserver' in window)) {
      console.warn('⚠️ PerformanceObserver non supporté pour FID');
      return;
    }

    try {
      const observer = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        
        entries.forEach(entry => {
          const value = entry.processingStart - entry.startTime;
          const quality = evaluateMetric('FID', value);
          
          setMetrics(prev => {
            const newMetrics = { ...prev, FID: value };
            
            // Vérifier les dégradations
            if (prev.FID !== null && value > prev.FID * 1.5) { // Dégradation de 50%
              createAlert('FID', value, quality, prev.FID);
            }
            
            return newMetrics;
          });
          addToHistory('FID', value, quality);
        });
      });

      observer.observe({ entryTypes: ['first-input'] });
      observersRef.current.FID = observer;

    } catch (error) {
      console.error('❌ Erreur lors de la mesure FID:', error);
    }
  }, [evaluateMetric, addToHistory, createAlert]);

  /**
   * Mesurer le CLS (Cumulative Layout Shift)
   */
  const measureCLS = useCallback(() => {
    if (!('PerformanceObserver' in window)) {
      console.warn('⚠️ PerformanceObserver non supporté pour CLS');
      return;
    }

    try {
      let clsValue = 0;
      let clsEntries = [];

      const observer = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        
        entries.forEach(entry => {
          if (!entry.hadRecentInput) {
            clsValue += entry.value;
            clsEntries.push(entry);
          }
        });

        // Mettre à jour la métrique
        const quality = evaluateMetric('CLS', clsValue);
        setMetrics(prev => {
          const newMetrics = { ...prev, CLS: clsValue };
          
          // Vérifier les dégradations
          if (prev.CLS !== null && clsValue > prev.CLS * 1.3) { // Dégradation de 30%
            createAlert('CLS', clsValue, quality, prev.CLS);
          }
          
          return newMetrics;
        });
        addToHistory('CLS', clsValue, quality);
      });

      observer.observe({ entryTypes: ['layout-shift'] });
      observersRef.current.CLS = observer;

    } catch (error) {
      console.error('❌ Erreur lors de la mesure CLS:', error);
    }
  }, [evaluateMetric, addToHistory, createAlert]);

  /**
   * Mesurer les métriques de navigation
   */
  const measureNavigationMetrics = useCallback(() => {
    if (!('performance' in window)) return;

    try {
      const navigation = performance.getEntriesByType('navigation')[0];
      if (!navigation) return;

      const metrics = {
        DNS: navigation.domainLookupEnd - navigation.domainLookupStart,
        TCP: navigation.connectEnd - navigation.connectStart,
        TTFB: navigation.responseStart - navigation.requestStart,
        DOMContentLoaded: navigation.domContentLoadedEventEnd - navigation.navigationStart,
        Load: navigation.loadEventEnd - navigation.navigationStart
      };

      // Ajouter à l'historique
      Object.entries(metrics).forEach(([name, value]) => {
        if (value > 0) {
          addToHistory(name, value, 'INFO');
        }
      });

    } catch (error) {
      console.error('❌ Erreur lors de la mesure navigation:', error);
    }
  }, [addToHistory]);

  /**
   * Démarrer le monitoring
   */
  const startMonitoring = useCallback(() => {
    if (!enableMonitoring || isMonitoring) return;

    try {
      console.log('📊 Démarrage du monitoring Core Web Vitals...');
      
      setIsMonitoring(true);
      
      // Mesurer les métriques existantes
      measureNavigationMetrics();
      
      // Démarrer les observateurs
      measureLCP();
      measureFID();
      measureCLS();
      
      console.log('✅ Monitoring Core Web Vitals démarré');

    } catch (error) {
      console.error('❌ Erreur lors du démarrage du monitoring:', error);
      setIsMonitoring(false);
    }
  }, [enableMonitoring, isMonitoring, measureLCP, measureFID, measureCLS, measureNavigationMetrics]);

  /**
   * Arrêter le monitoring
   */
  const stopMonitoring = useCallback(() => {
    if (!isMonitoring) return;

    try {
      console.log('🛑 Arrêt du monitoring Core Web Vitals...');
      
      // Arrêter tous les observateurs
      Object.values(observersRef.current).forEach(observer => {
        if (observer && observer.disconnect) {
          observer.disconnect();
        }
      });
      
      observersRef.current = {};
      setIsMonitoring(false);
      
      console.log('✅ Monitoring Core Web Vitals arrêté');

    } catch (error) {
      console.error('❌ Erreur lors de l\'arrêt du monitoring:', error);
    }
  }, [isMonitoring]);

  /**
   * Nettoyer l'historique
   */
  const clearHistory = useCallback(() => {
    setHistory([]);
    console.log('🗑️ Historique des métriques nettoyé');
  }, []);

  /**
   * Nettoyer les alertes
   */
  const clearAlerts = useCallback(() => {
    setAlerts([]);
    console.log('🗑️ Alertes nettoyées');
  }, []);

  /**
   * Obtenir un résumé des performances
   */
  const getPerformanceSummary = useCallback(() => {
    const summary = {
      current: metrics,
      quality: {
        LCP: metrics.LCP ? evaluateMetric('LCP', metrics.LCP) : 'UNKNOWN',
        FID: metrics.FID ? evaluateMetric('FID', metrics.FID) : 'UNKNOWN',
        CLS: metrics.CLS ? evaluateMetric('CLS', metrics.CLS) : 'UNKNOWN'
      },
      history: history.length,
      alerts: alerts.length,
      isMonitoring
    };

    console.log('📊 Résumé des performances:', summary);
    return summary;
  }, [metrics, evaluateMetric, history.length, alerts.length, isMonitoring]);

  /**
   * Exporter les données pour analyse
   */
  const exportData = useCallback(() => {
    const data = {
      metrics,
      history,
      alerts,
      summary: getPerformanceSummary(),
      exportDate: new Date().toISOString()
    };

    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    
    const a = document.createElement('a');
    a.href = url;
    a.download = `performance-metrics-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    
    URL.revokeObjectURL(url);
    console.log('📁 Données de performance exportées');
  }, [metrics, history, alerts, getPerformanceSummary]);

  // Effets
  useEffect(() => {
    if (enableMonitoring) {
      startMonitoring();
    }

    return () => {
      stopMonitoring();
    };
  }, [enableMonitoring, startMonitoring, stopMonitoring]);

  // Nettoyage des observateurs au démontage
  useEffect(() => {
    return () => {
      stopMonitoring();
    };
  }, [stopMonitoring]);

  return {
    // État
    metrics,
    history,
    alerts,
    isMonitoring,
    
    // Actions
    startMonitoring,
    stopMonitoring,
    clearHistory,
    clearAlerts,
    exportData,
    
    // Utilitaires
    evaluateMetric,
    formatMetric,
    getPerformanceSummary,
    
    // Constantes
    THRESHOLDS
  };
}
