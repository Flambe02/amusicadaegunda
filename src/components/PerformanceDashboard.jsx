import React, { useState, useMemo } from 'react';
import { 
  TrendingUp, 
  TrendingDown, 
  AlertTriangle, 
  CheckCircle, 
  Clock, 
  Download, 
  Trash2, 
  RefreshCw,
  Activity,
  Zap,
  Shield,
  BarChart3
} from 'lucide-react';
import useCoreWebVitals from '@/hooks/useCoreWebVitals';

/**
 * PerformanceDashboard - Dashboard de monitoring des performances
 * 
 * Implémente :
 * - Affichage des Core Web Vitals en temps réel
 * - Graphiques de tendances
 * - Alertes automatiques
 * - Historique des métriques
 * - Export des données
 */
export default function PerformanceDashboard({ className = "" }) {
  const [activeTab, setActiveTab] = useState('overview');
  const [showDetails, setShowDetails] = useState(false);
  
  const {
    metrics,
    history,
    alerts,
    isMonitoring,
    startMonitoring,
    stopMonitoring,
    clearHistory,
    clearAlerts,
    exportData,
    formatMetric,
    getPerformanceSummary
  } = useCoreWebVitals({
    enableAlerts: true,
    alertThreshold: 'NEEDS_IMPROVEMENT',
    onAlert: (alert) => {
      console.log('🚨 Alerte reçue:', alert);
      // Ici vous pourriez envoyer une notification push ou autre
    }
  });

  // Calculer les tendances
  const trends = useMemo(() => {
    if (history.length < 2) return {};

    const trends = {};
    ['LCP', 'FID', 'CLS'].forEach(metric => {
      const metricHistory = history
        .filter(h => h.metricName === metric)
        .slice(0, 5); // Dernières 5 mesures

      if (metricHistory.length >= 2) {
        const latest = metricHistory[0].value;
        const previous = metricHistory[1].value;
        const change = ((latest - previous) / previous) * 100;
        
        trends[metric] = {
          change: change.toFixed(1),
          direction: change > 0 ? 'up' : 'down',
          improving: change < 0
        };
      }
    });

    return trends;
  }, [history]);

  // Calculer le score global de performance
  const performanceScore = useMemo(() => {
    let score = 0;
    let totalMetrics = 0;

    Object.entries(metrics).forEach(([metric, value]) => {
      if (value !== null) {
        totalMetrics++;
        // Logique de scoring basée sur les seuils
        if (metric === 'LCP') {
          if (value <= 2500) score += 100;
          else if (value <= 4000) score += 60;
          else score += 20;
        } else if (metric === 'FID') {
          if (value <= 100) score += 100;
          else if (value <= 300) score += 60;
          else score += 20;
        } else if (metric === 'CLS') {
          if (value <= 0.1) score += 100;
          else if (value <= 0.25) score += 60;
          else score += 20;
        }
      }
    });

    return totalMetrics > 0 ? Math.round(score / totalMetrics) : 0;
  }, [metrics]);

  // Obtenir la couleur du score
  const getScoreColor = (score) => {
    if (score >= 80) return 'text-green-600';
    if (score >= 60) return 'text-yellow-600';
    return 'text-red-600';
  };

  // Obtenir l'icône de tendance
  const getTrendIcon = (metric) => {
    const trend = trends[metric];
    if (!trend) return null;

    return trend.improving ? (
      <TrendingDown className="w-4 h-4 text-green-600" />
    ) : (
      <TrendingUp className="w-4 h-4 text-red-600" />
    );
  };

  // Formater la tendance
  const formatTrend = (metric) => {
    const trend = trends[metric];
    if (!trend) return 'N/A';

    return `${trend.direction === 'up' ? '+' : ''}${trend.change}%`;
  };

  // Obtenir la qualité d'une métrique
  const getMetricQuality = (metricName, value) => {
    if (value === null) return 'UNKNOWN';
    
    const thresholds = {
      LCP: { GOOD: 2500, NEEDS_IMPROVEMENT: 4000 },
      FID: { GOOD: 100, NEEDS_IMPROVEMENT: 300 },
      CLS: { GOOD: 0.1, NEEDS_IMPROVEMENT: 0.25 }
    };

    const metricThresholds = thresholds[metricName];
    if (!metricThresholds) return 'UNKNOWN';

    if (value <= metricThresholds.GOOD) return 'GOOD';
    if (value <= metricThresholds.NEEDS_IMPROVEMENT) return 'NEEDS_IMPROVEMENT';
    return 'POOR';
  };

  // Obtenir la couleur de qualité
  const getQualityColor = (quality) => {
    switch (quality) {
      case 'GOOD': return 'text-green-600 bg-green-100';
      case 'NEEDS_IMPROVEMENT': return 'text-yellow-600 bg-yellow-100';
      case 'POOR': return 'text-red-600 bg-red-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  // Obtenir l'icône de qualité
  const getQualityIcon = (quality) => {
    switch (quality) {
      case 'GOOD': return <CheckCircle className="w-4 h-4" />;
      case 'NEEDS_IMPROVEMENT': return <AlertTriangle className="w-4 h-4" />;
      case 'POOR': return <AlertTriangle className="w-4 h-4" />;
      default: return <Clock className="w-4 h-4" />;
    }
  };

  return (
    <div className={`bg-white border border-gray-200 rounded-lg shadow-sm ${className}`}>
      {/* Header */}
      <div className="px-4 py-3 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-purple-600" />
            <h3 className="font-semibold text-gray-900">Dashboard de Performance</h3>
          </div>
          
          <div className="flex items-center gap-2">
            {/* Score global */}
            <div className={`px-3 py-1 rounded-full text-sm font-bold ${getScoreColor(performanceScore)}`}>
              Score: {performanceScore}/100
            </div>
            
            {/* Statut monitoring */}
            <div className={`flex items-center gap-1 px-2 py-1 rounded-full text-xs ${
              isMonitoring 
                ? 'bg-green-100 text-green-800' 
                : 'bg-red-100 text-red-800'
            }`}>
              <Activity className="w-3 h-3" />
              {isMonitoring ? 'Ativo' : 'Inativo'}
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-gray-200">
        {['overview', 'metrics', 'alerts', 'history'].map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2 text-sm font-medium transition-colors ${
              activeTab === tab
                ? 'text-purple-600 border-b-2 border-purple-600'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            {tab === 'overview' && 'Visão Geral'}
            {tab === 'metrics' && 'Métricas'}
            {tab === 'alerts' && `Alertas (${alerts.length})`}
            {tab === 'history' && `Histórico (${history.length})`}
          </button>
        ))}
      </div>

      {/* Contenu des tabs */}
      <div className="p-4">
        {/* Vue d'ensemble */}
        {activeTab === 'overview' && (
          <div className="space-y-6">
            {/* Score global */}
            <div className="text-center">
              <div className={`text-4xl font-bold mb-2 ${getScoreColor(performanceScore)}`}>
                {performanceScore}/100
              </div>
              <p className="text-gray-600">Pontuação de performance global</p>
            </div>

            {/* Core Web Vitals */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {['LCP', 'FID', 'CLS'].map((metric) => {
                const value = metrics[metric];
                const quality = getMetricQuality(metric, value);
                
                return (
                  <div key={metric} className="bg-gray-50 rounded-lg p-4">
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="font-medium text-gray-900">{metric}</h4>
                      <div className={`flex items-center gap-1 px-2 py-1 rounded-full text-xs ${getQualityColor(quality)}`}>
                        {getQualityIcon(quality)}
                        {quality.replace('_', ' ')}
                      </div>
                    </div>
                    
                    <div className="text-2xl font-bold text-gray-900 mb-2">
                      {formatMetric(metric, value)}
                    </div>
                    
                    {trends[metric] && (
                      <div className="flex items-center gap-2 text-sm">
                        {getTrendIcon(metric)}
                        <span className={trends[metric].improving ? 'text-green-600' : 'text-red-600'}>
                          {formatTrend(metric)}
                        </span>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Actions rapides */}
            <div className="flex flex-wrap gap-2 justify-center">
              <button
                onClick={isMonitoring ? stopMonitoring : startMonitoring}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors ${
                  isMonitoring
                    ? 'bg-red-600 text-white hover:bg-red-700'
                    : 'bg-green-600 text-white hover:bg-green-700'
                }`}
              >
                                    {isMonitoring ? (
                      <>
                        <Activity className="w-4 h-4" />
                        Parar
                      </>
                    ) : (
                      <>
                        <Zap className="w-4 h-4" />
                        Iniciar
                      </>
                    )}
              </button>
              
              <button
                onClick={exportData}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                <Download className="w-4 h-4" />
                Exportar
              </button>
            </div>
          </div>
        )}

        {/* Métriques détaillées */}
        {activeTab === 'metrics' && (
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {Object.entries(metrics).map(([metric, value]) => {
                const quality = getMetricQuality(metric, value);
                
                return (
                  <div key={metric} className="bg-gray-50 rounded-lg p-4">
                    <div className="flex items-center justify-between mb-3">
                      <h4 className="font-medium text-gray-900">{metric}</h4>
                      <div className={`flex items-center gap-1 px-2 py-1 rounded-full text-xs ${getQualityColor(quality)}`}>
                        {getQualityIcon(quality)}
                        {quality.replace('_', ' ')}
                      </div>
                    </div>
                    
                    <div className="text-3xl font-bold text-gray-900 mb-2">
                      {formatMetric(metric, value)}
                    </div>
                    
                    <div className="text-sm text-gray-600">
                      {metric === 'LCP' && 'Largest Contentful Paint - Tempo de carregamento do conteúdo principal'}
                      {metric === 'FID' && 'First Input Delay - Atraso de resposta à primeira interação'}
                      {metric === 'CLS' && 'Cumulative Layout Shift - Estabilidade visual da página'}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Alertes */}
        {activeTab === 'alerts' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="font-medium text-gray-900">Alertas de performance</h4>
              <button
                onClick={clearAlerts}
                className="flex items-center gap-2 px-3 py-1 text-sm text-red-600 hover:text-red-800 hover:bg-red-50 rounded-lg transition-colors"
              >
                <Trash2 className="w-4 h-4" />
                Limpar
              </button>
            </div>
            
            {alerts.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <Shield className="w-12 h-12 mx-auto mb-2 text-green-400" />
                <p>Nenhum alerta de performance</p>
              </div>
            ) : (
              <div className="space-y-3">
                {alerts.map((alert) => (
                  <div key={alert.id} className={`p-3 rounded-lg border ${
                    alert.severity === 'high' ? 'border-red-200 bg-red-50' :
                    alert.severity === 'medium' ? 'border-yellow-200 bg-yellow-50' :
                    'border-blue-200 bg-blue-50'
                  }`}>
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <AlertTriangle className={`w-4 h-4 ${
                            alert.severity === 'high' ? 'text-red-600' :
                            alert.severity === 'medium' ? 'text-yellow-600' :
                            'text-blue-600'
                          }`} />
                          <span className="font-medium text-gray-900">{alert.metricName}</span>
                          <span className={`px-2 py-1 rounded-full text-xs ${
                            alert.severity === 'high' ? 'bg-red-200 text-red-800' :
                            alert.severity === 'medium' ? 'bg-yellow-200 text-yellow-800' :
                            'bg-blue-200 text-blue-800'
                          }`}>
                            {alert.severity === 'high' ? 'Crítico' :
                             alert.severity === 'medium' ? 'Médio' : 'Info'}
                          </span>
                        </div>
                        <p className="text-sm text-gray-700">{alert.message}</p>
                        <p className="text-xs text-gray-500 mt-1">
                          {new Date(alert.timestamp).toLocaleString()}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Historique */}
        {activeTab === 'history' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="font-medium text-gray-900">Histórico das métricas</h4>
              <button
                onClick={clearHistory}
                className="flex items-center gap-2 px-3 py-1 text-sm text-red-600 hover:text-red-800 hover:bg-red-50 rounded-lg transition-colors"
              >
                <Trash2 className="w-4 h-4" />
                Limpar
              </button>
            </div>
            
            {history.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <Clock className="w-12 h-12 mx-auto mb-2 text-gray-400" />
                <p>Nenhuma métrica registrada</p>
              </div>
            ) : (
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {history.map((entry) => (
                  <div key={entry.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-center gap-3">
                      <div className={`w-3 h-3 rounded-full ${
                        entry.quality === 'GOOD' ? 'bg-green-400' :
                        entry.quality === 'NEEDS_IMPROVEMENT' ? 'bg-yellow-400' :
                        entry.quality === 'POOR' ? 'bg-red-400' : 'bg-gray-400'
                      }`} />
                      <span className="font-medium text-gray-900">{entry.metricName}</span>
                      <span className="text-gray-600">{entry.value}</span>
                    </div>
                    <div className="text-sm text-gray-500">
                      {new Date(entry.timestamp).toLocaleTimeString()}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
