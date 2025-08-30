import React, { useState, useEffect } from 'react';
import { 
  AlertTriangle, 
  CheckCircle, 
  X, 
  Info, 
  TrendingUp, 
  TrendingDown,
  Lightbulb,
  Settings,
  Bell,
  BellOff
} from 'lucide-react';

/**
 * PerformanceAlerts - Composant d'alertes de performance proactives
 * 
 * Implémente :
 * - Affichage des alertes en temps réel
 * - Notifications toast
 * - Recommandations d'amélioration
 * - Gestion des seuils
 * - Historique des alertes
 */

// Recommandations pour chaque type de métrique
const RECOMMENDATIONS = {
  LCP: {
    GOOD: "Excellent ! Votre page se charge rapidement.",
    NEEDS_IMPROVEMENT: "Optimisez le chargement des images et du contenu principal.",
    POOR: "Critique ! Optimisez le serveur, la compression et le lazy loading."
  },
  FID: {
    GOOD: "Parfait ! L'interface répond immédiatement aux interactions.",
    NEEDS_IMPROVEMENT: "Réduisez le JavaScript bloquant et optimisez le parsing.",
    POOR: "Urgent ! Divisez le JavaScript en chunks et optimisez le bundle."
  },
  CLS: {
    GOOD: "Excellent ! La page est visuellement stable.",
    NEEDS_IMPROVEMENT: "Définissez des dimensions pour les images et éléments dynamiques.",
    POOR: "Critique ! Fixez les dimensions et évitez les éléments qui se déplacent."
  }
};

// Actions recommandées
const ACTIONS = {
  LCP: [
    "Optimiser les images (WebP, compression)",
    "Implémenter le lazy loading",
    "Utiliser un CDN",
    "Minifier CSS/JS",
    "Activer la compression gzip"
  ],
  FID: [
    "Diviser le JavaScript en chunks",
    "Utiliser l'async/await",
    "Optimiser le parsing",
    "Réduire le bundle principal",
    "Implémenter le code splitting"
  ],
  CLS: [
    "Définir width/height pour les images",
    "Utiliser aspect-ratio CSS",
    "Éviter les éléments qui se déplacent",
    "Précharger les ressources critiques",
    "Utiliser des placeholders"
  ]
};

export default function PerformanceAlerts({ 
  alerts = [], 
  onDismiss, 
  onClearAll,
  className = "" 
}) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [showNotifications, setShowNotifications] = useState(true);
  const [dismissedAlerts, setDismissedAlerts] = useState(new Set());

  // Filtrer les alertes non rejetées
  const activeAlerts = alerts.filter(alert => !dismissedAlerts.has(alert.id));

  // Grouper les alertes par sévérité
  const groupedAlerts = activeAlerts.reduce((groups, alert) => {
    const severity = alert.severity;
    if (!groups[severity]) groups[severity] = [];
    groups[severity].push(alert);
    return groups;
  }, {});

  // Obtenir la couleur de sévérité
  const getSeverityColor = (severity) => {
    switch (severity) {
      case 'high': return 'text-red-600 bg-red-50 border-red-200';
      case 'medium': return 'text-yellow-600 bg-yellow-50 border-yellow-200';
      case 'low': return 'text-blue-600 bg-blue-50 border-blue-200';
      default: return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  // Obtenir l'icône de sévérité
  const getSeverityIcon = (severity) => {
    switch (severity) {
      case 'high': return <AlertTriangle className="w-5 h-5 text-red-600" />;
      case 'medium': return <AlertTriangle className="w-5 h-5 text-yellow-600" />;
      case 'low': return <Info className="w-5 h-5 text-blue-600" />;
      default: return <Info className="w-5 h-5 text-gray-600" />;
    }
  };

  // Obtenir le texte de sévérité
  const getSeverityText = (severity) => {
    switch (severity) {
      case 'high': return 'Critique';
      case 'medium': return 'Moyen';
      case 'low': return 'Info';
      default: return 'Inconnu';
    }
  };

  // Gérer le rejet d'une alerte
  const handleDismiss = (alertId) => {
    setDismissedAlerts(prev => new Set([...prev, alertId]));
    if (onDismiss) {
      onDismiss(alertId);
    }
  };

  // Gérer le rejet de toutes les alertes
  const handleClearAll = () => {
    setDismissedAlerts(new Set(activeAlerts.map(alert => alert.id)));
    if (onClearAll) {
      onClearAll();
    }
  };

  // Obtenir les recommandations pour une alerte
  const getRecommendations = (alert) => {
    const metric = alert.metricName;
    const quality = alert.quality;
    
    return {
      description: RECOMMENDATIONS[metric]?.[quality] || "Aucune recommandation disponible.",
      actions: ACTIONS[metric] || []
    };
  };

  // Si aucune alerte active
  if (activeAlerts.length === 0) {
    return (
      <div className={`bg-green-50 border border-green-200 rounded-lg p-4 ${className}`}>
        <div className="flex items-center gap-2 text-green-800">
          <CheckCircle className="w-5 h-5" />
          <span className="font-medium">Aucune alerte de performance</span>
        </div>
        <p className="text-green-600 text-sm mt-1">
          Toutes les métriques sont dans les normes recommandées.
        </p>
      </div>
    );
  }

  return (
    <div className={`bg-white border border-gray-200 rounded-lg shadow-sm ${className}`}>
      {/* Header */}
      <div className="px-4 py-3 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Bell className="w-5 h-5 text-orange-600" />
            <h3 className="font-semibold text-gray-900">Alertes de Performance</h3>
            <span className="px-2 py-1 bg-orange-100 text-orange-800 text-xs font-medium rounded-full">
              {activeAlerts.length}
            </span>
          </div>
          
          <div className="flex items-center gap-2">
            {/* Toggle notifications */}
            <button
              onClick={() => setShowNotifications(!showNotifications)}
              className={`p-2 rounded-lg transition-colors ${
                showNotifications 
                  ? 'bg-green-100 text-green-600 hover:bg-green-200' 
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
              title={showNotifications ? 'Désactiver notifications' : 'Activer notifications'}
            >
              {showNotifications ? <Bell className="w-4 h-4" /> : <BellOff className="w-4 h-4" />}
            </button>
            
            {/* Toggle expansion */}
            <button
              onClick={() => setIsExpanded(!isExpanded)}
              className="p-2 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition-colors"
              title={isExpanded ? 'Réduire' : 'Développer'}
            >
              <Settings className={`w-4 h-4 transition-transform ${isExpanded ? 'rotate-90' : ''}`} />
            </button>
          </div>
        </div>
      </div>

      {/* Contenu */}
      <div className="p-4">
        {/* Alertes groupées par sévérité */}
        {Object.entries(groupedAlerts).map(([severity, severityAlerts]) => (
          <div key={severity} className="mb-6 last:mb-0">
            <h4 className={`text-sm font-medium mb-3 ${getSeverityColor(severity).split(' ')[0]}`}>
              {getSeverityText(severity)} ({severityAlerts.length})
            </h4>
            
            <div className="space-y-3">
              {severityAlerts.map((alert) => (
                <div key={alert.id} className={`p-4 rounded-lg border ${getSeverityColor(severity)}`}>
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-2">
                      {getSeverityIcon(severity)}
                      <span className="font-medium">{alert.metricName}</span>
                      <span className="text-xs opacity-75">
                        {new Date(alert.timestamp).toLocaleTimeString()}
                      </span>
                    </div>
                    
                    <button
                      onClick={() => handleDismiss(alert.id)}
                      className="p-1 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded transition-colors"
                      title="Rejeter cette alerte"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                  
                  <p className="text-sm mb-3">{alert.message}</p>
                  
                  {/* Détails de la dégradation */}
                  {alert.previousValue && (
                    <div className="flex items-center gap-2 text-xs mb-3">
                      <TrendingUp className="w-3 h-3 text-red-500" />
                      <span className="text-gray-600">
                        Dégradation: {alert.previousValue} → {alert.currentValue}
                      </span>
                    </div>
                  )}
                  
                  {/* Recommandations */}
                  {isExpanded && (
                    <div className="mt-4 pt-3 border-t border-current border-opacity-20">
                      <div className="flex items-center gap-2 mb-2">
                        <Lightbulb className="w-4 h-4 text-yellow-600" />
                        <span className="text-sm font-medium">Recommandations</span>
                      </div>
                      
                      {(() => {
                        const recommendations = getRecommendations(alert);
                        return (
                          <div>
                            <p className="text-sm mb-2">{recommendations.description}</p>
                            
                            {recommendations.actions.length > 0 && (
                              <ul className="text-xs space-y-1">
                                {recommendations.actions.map((action, index) => (
                                  <li key={index} className="flex items-center gap-2">
                                    <div className="w-1.5 h-1.5 bg-current rounded-full opacity-60" />
                                    {action}
                                  </li>
                                ))}
                              </ul>
                            )}
                          </div>
                        );
                      })()}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        ))}
        
        {/* Actions globales */}
        <div className="flex items-center justify-between pt-4 border-t border-gray-200">
          <div className="text-sm text-gray-500">
            {showNotifications ? 'Notifications activées' : 'Notifications désactivées'}
          </div>
          
          <button
            onClick={handleClearAll}
            className="flex items-center gap-2 px-3 py-2 text-sm text-red-600 hover:text-red-800 hover:bg-red-50 rounded-lg transition-colors"
          >
            <X className="w-4 h-4" />
            Rejeter toutes les alertes
          </button>
        </div>
      </div>
    </div>
  );
}
