import React, { useState } from 'react';
import { Trash2, RefreshCw, Info, HardDrive, Wifi, WifiOff, Database } from 'lucide-react';
import useServiceWorker from '@/hooks/useServiceWorker';

/**
 * CacheManager - Composant de gestion du cache
 * 
 * Implémente :
 * - Affichage des informations du cache
 * - Contrôles de nettoyage
 * - Statut de synchronisation
 * - Statistiques de performance
 */
export default function CacheManager({ className = "" }) {
  const [showDetails, setShowDetails] = useState(false);
  const [isClearing, setIsClearing] = useState(false);
  
  const {
    isSupported,
    isRegistered,
    isOnline,
    cacheInfo,
    syncQueue,
    isSyncing,
    clearCache,
    getCacheInfo,
    forceUpdate,
    getPerformanceStats
  } = useServiceWorker();

  // Calculer la taille totale du cache
  const totalCacheSize = Object.values(cacheInfo).reduce((sum, count) => sum + count, 0);
  
  // Formatar o tamanho do cache
  const formatCacheSize = (size) => {
    if (size === 0) return '0 elementos';
    if (size < 1000) return `${size} elementos`;
    return `${(size / 1000).toFixed(1)}k elementos`;
  };

  // Gérer le nettoyage du cache
  const handleClearCache = async () => {
    if (!isSupported || !isRegistered) return;
    
    setIsClearing(true);
    try {
      await clearCache();
      // Attendre un peu puis rafraîchir les infos
      setTimeout(() => {
        getCacheInfo();
        setIsClearing(false);
      }, 1000);
    } catch (error) {
      console.error('Erro ao limpar o cache:', error);
      setIsClearing(false);
    }
  };

  // Gérer la mise à jour forcée
  const handleForceUpdate = async () => {
    if (!isSupported || !isRegistered) return;
    
    try {
      await forceUpdate();
    } catch (error) {
      console.error('Erro na atualização forçada:', error);
    }
  };

  // Si le Service Worker n'est pas supporté
  if (!isSupported) {
    return (
      <div className={`bg-yellow-50 border border-yellow-200 rounded-lg p-4 ${className}`}>
        <div className="flex items-center gap-2 text-yellow-800">
          <Info className="w-5 h-5" />
          <span className="font-medium">Service Worker não suportado</span>
        </div>
        <p className="text-yellow-600 text-sm mt-1">
          Seu navegador não suporta Service Workers. As funcionalidades de cache e sincronização não estão disponíveis.
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
            <HardDrive className="w-5 h-5 text-blue-600" />
            <h3 className="font-semibold text-gray-900">Gerenciamento do Cache</h3>
          </div>
          
          <div className="flex items-center gap-2">
            {/* Statut de connexion */}
            <div className={`flex items-center gap-1 px-2 py-1 rounded-full text-xs ${
              isOnline 
                ? 'bg-green-100 text-green-800' 
                : 'bg-red-100 text-red-800'
            }`}>
              {isOnline ? <Wifi className="w-3 h-3" /> : <WifiOff className="w-3 h-3" />}
              {isOnline ? 'Online' : 'Offline'}
            </div>
            
            {/* Statut Service Worker */}
            <div className={`flex items-center gap-1 px-2 py-1 rounded-full text-xs ${
              isRegistered 
                ? 'bg-blue-100 text-blue-800' 
                : 'bg-gray-100 text-gray-600'
            }`}>
              <Database className="w-3 h-3" />
              {isRegistered ? 'Ativo' : 'Inativo'}
            </div>
          </div>
        </div>
      </div>

      {/* Contenu principal */}
      <div className="p-4">
        {/* Statistiques rapides */}
        <div className="grid grid-cols-2 gap-4 mb-4">
          <div className="bg-blue-50 rounded-lg p-3">
            <div className="flex items-center gap-2">
              <HardDrive className="w-4 h-4 text-blue-600" />
              <span className="text-sm font-medium text-blue-800">Cache</span>
            </div>
            <p className="text-lg font-bold text-blue-900 mt-1">
              {formatCacheSize(totalCacheSize)}
            </p>
          </div>
          
          <div className="bg-green-50 rounded-lg p-3">
            <div className="flex items-center gap-2">
              <RefreshCw className={`w-4 h-4 text-green-600 ${isSyncing ? 'animate-spin' : ''}`} />
              <span className="text-sm font-medium text-green-800">Sincronização</span>
            </div>
            <p className="text-lg font-bold text-green-900 mt-1">
              {syncQueue.length} pendente
            </p>
          </div>
        </div>

        {/* Détails du cache (optionnel) */}
        {showDetails && (
          <div className="mb-4 p-3 bg-gray-50 rounded-lg">
            <h4 className="font-medium text-gray-900 mb-2">Detalhes do cache:</h4>
            <div className="space-y-2">
              {Object.entries(cacheInfo).map(([cacheName, count]) => (
                <div key={cacheName} className="flex justify-between text-sm">
                  <span className="text-gray-600">{cacheName}</span>
                  <span className="font-medium">{count} elementos</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setShowDetails(!showDetails)}
            className="flex items-center gap-2 px-3 py-2 text-sm text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <Info className="w-4 h-4" />
            {showDetails ? 'Ocultar detalhes' : 'Mostrar detalhes'}
          </button>
          
          <button
            onClick={getCacheInfo}
            className="flex items-center gap-2 px-3 py-2 text-sm text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded-lg transition-colors"
          >
            <RefreshCw className="w-4 h-4" />
            Atualizar
          </button>
          
          <button
            onClick={handleForceUpdate}
            disabled={!isRegistered}
            className="flex items-center gap-2 px-3 py-2 text-sm text-purple-600 hover:text-purple-800 hover:bg-purple-50 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <RefreshCw className="w-4 h-4" />
            Atualização
          </button>
        </div>

        {/* Bouton de nettoyage principal */}
        <div className="mt-4 pt-4 border-t border-gray-200">
          <button
            onClick={handleClearCache}
            disabled={!isRegistered || isClearing}
            className={`w-full flex items-center justify-center gap-2 px-4 py-3 rounded-lg font-medium transition-colors ${
              isClearing
                ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                : 'bg-red-600 text-white hover:bg-red-700 active:bg-red-800'
            }`}
          >
            {isClearing ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                Limpeza em andamento...
              </>
            ) : (
              <>
                <Trash2 className="w-4 h-4" />
                Limpar todo o cache
              </>
            )}
          </button>
          
          {isClearing && (
            <p className="text-sm text-gray-500 text-center mt-2">
              Esta operação pode levar alguns segundos...
            </p>
          )}
        </div>

        {/* Informations supplémentaires */}
        <div className="mt-4 pt-4 border-t border-gray-200">
          <div className="text-xs text-gray-500 space-y-1">
            <p>• O cache melhora o desempenho e permite o uso offline</p>
            <p>• A sincronização TikTok funciona em segundo plano</p>
            <p>• Limpar o cache libera espaço mas desacelera o carregamento</p>
          </div>
        </div>
      </div>
    </div>
  );
}
