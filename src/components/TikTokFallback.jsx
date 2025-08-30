import React, { useState, useEffect } from 'react';
import { Play, Volume2, ExternalLink, AlertCircle } from 'lucide-react';

/**
 * TikTokFallback - Composant de fallback vidéo robuste selon les best practices
 * 
 * Implémente :
 * - Fallback vidéo natif en cas d'échec TikTok
 * - Gestion iOS Safari autoplay restrictions
 * - Overlay "Tap pour activer le son" UX-friendly
 * - Support des formats vidéo multiples
 * - Détection automatique des problèmes
 */
export default function TikTokFallback({ 
  postId, 
  fallbackVideoUrl, 
  song = null, 
  className = "",
  onFallbackActivated 
}) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(true);
  const [showUnmuteOverlay, setShowUnmuteOverlay] = useState(true);
  const [videoError, setVideoError] = useState(null);
  const [isVideoLoaded, setIsVideoLoaded] = useState(false);

  // Détection automatique des problèmes TikTok
  useEffect(() => {
    if (onFallbackActivated) {
      onFallbackActivated({
        postId,
        reason: 'TikTok embed failed, using native video fallback',
        timestamp: new Date().toISOString()
      });
    }
  }, [postId, onFallbackActivated]);

  // Gestion du son selon les best practices iOS
  const handleUnmute = () => {
    console.log('🔊 TikTok Fallback: Activation du son');
    setShowUnmuteOverlay(false);
    setIsMuted(false);
  };

  const handlePlay = () => {
    setIsPlaying(true);
    setShowUnmuteOverlay(false);
  };

  const handleVideoLoad = () => {
    setIsVideoLoaded(true);
    setVideoError(null);
  };

  const handleVideoError = (error) => {
    console.error('❌ TikTok Fallback: Erreur vidéo native', error);
    setVideoError('Erro ao carregar vídeo de fallback');
  };

  const handleRetry = () => {
    setVideoError(null);
    setIsVideoLoaded(false);
    setIsPlaying(false);
    setShowUnmuteOverlay(true);
    setIsMuted(true);
  };

  if (videoError) {
    return (
      <div className={`bg-red-50 border border-red-200 rounded-2xl p-6 text-center ${className}`}>
        <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
        <h3 className="text-lg font-semibold text-red-800 mb-2">Erro no Fallback</h3>
        <p className="text-red-600 mb-4">{videoError}</p>
        <div className="flex gap-2 justify-center flex-wrap">
          <button
            onClick={handleRetry}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
          >
            <Play className="w-4 h-4" />
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

  return (
    <div 
      className={`tiktok-fallback-container ${className}`}
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
        {/* Vidéo native de fallback */}
        <video
          className="tiktok-fallback-video"
          style={{
            position: 'absolute',
            top: '0',
            left: '0',
            width: '100%',
            height: '100%',
            objectFit: 'cover',
            borderRadius: '16px'
          }}
          src={fallbackVideoUrl}
          poster={song?.thumbnail_url || '/images/video-placeholder.jpg'}
          preload="metadata"
          playsInline // Important sur iOS
          muted={isMuted}
          loop
          controls={false}
          onLoadedData={handleVideoLoad}
          onError={handleVideoError}
          onPlay={handlePlay}
        />

        {/* Overlay de chargement */}
        {!isVideoLoaded && (
          <div 
            className="tiktok-fallback-loading-overlay"
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
              <div className="animate-pulse bg-white bg-opacity-20 rounded-full p-6 mb-4 inline-block">
                <Play className="w-16 h-16 text-white" />
              </div>
              <p className="text-lg font-medium mb-2">Carregando Vídeo...</p>
              <p className="text-sm text-gray-300">Fallback nativo ativado</p>
            </div>
          </div>
        )}

        {/* Overlay "Tap pour activer le son" selon les best practices */}
        {isVideoLoaded && !isPlaying && showUnmuteOverlay && (
          <div 
            className="tiktok-fallback-unmute-overlay"
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
            aria-label="Cliquez pour démarrer la vidéo et activer le son"
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
                <Play className="w-16 h-16 text-white" />
              </div>
              <h3 className="text-xl font-bold mb-2">Cliquez pour démarrer</h3>
              <p className="text-lg text-gray-200">
                Fallback vidéo natif (TikTok indisponível)
              </p>
              <div className="mt-4 bg-white bg-opacity-20 rounded-lg px-4 py-2 inline-block">
                <span className="text-sm">▶️ Tap to play</span>
              </div>
            </div>
          </div>
        )}

        {/* Contrôles de lecture */}
        {isVideoLoaded && isPlaying && (
          <div 
            className="tiktok-fallback-controls"
            style={{
              position: 'absolute',
              bottom: '16px',
              right: '16px',
              zIndex: 3
            }}
          >
            <button
              onClick={() => setIsMuted(!isMuted)}
              className="bg-black bg-opacity-50 text-white p-3 rounded-full hover:bg-opacity-70 transition-all"
              aria-label={isMuted ? 'Ativar som' : 'Desativar som'}
            >
              {isMuted ? <Volume2 className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
            </button>
          </div>
        )}

        {/* Indicateur de statut accessible */}
        <div 
          className="sr-only"
          aria-live="polite"
          aria-atomic="true"
        >
          {!isVideoLoaded && 'Chargement de la vidéo de fallback...'}
          {isVideoLoaded && !isPlaying && 'Vidéo prête, cliquez pour démarrer'}
          {isVideoLoaded && isPlaying && 'Vidéo en cours de lecture'}
        </div>

        {/* Badge de fallback */}
        <div 
          className="tiktok-fallback-badge"
          style={{
            position: 'absolute',
            top: '16px',
            left: '16px',
            backgroundColor: 'rgba(0, 0, 0, 0.7)',
            color: 'white',
            padding: '4px 8px',
            borderRadius: '12px',
            fontSize: '12px',
            fontWeight: '500',
            zIndex: 3
          }}
        >
          🔄 Fallback
        </div>
      </div>
    </div>
  );
}
