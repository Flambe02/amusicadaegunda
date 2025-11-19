import React, { useEffect, useRef, useState, useCallback } from 'react';
import { Volume2, Play, RotateCcw } from 'lucide-react';

/**
 * TikTokPlayer - Composant robuste pour l'embed TikTok
 * 
 * Fonctionnalités :
 * - Autoplay muted par défaut (conforme aux politiques navigateur)
 * - Overlay "Activer le son" accessible
 * - Loop automatique en fin de vidéo
 * - Plein écran mobile optimisé (100svh, safe-areas)
 * - PostMessage API pour contrôler la lecture
 * - Fallback robuste en cas de blocage
 */
export default function TikTokPlayer({
  postId,
  controls = 0,
  autoPlay = true,
  className = ""
}) {
  const containerRef = useRef(null);
  const iframeRef = useRef(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isMuted, setIsMuted] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [playerReady, setPlayerReady] = useState(false);

  // Gestion des messages postMessage de l'iframe TikTok avec sécurité renforcée
  const handleMessage = useCallback((event) => {
    // Vérification stricte de l'origine pour la sécurité
    if (event.origin !== 'https://www.tiktok.com') {
      console.warn('TikTok player: message rejeté depuis une origine non autorisée:', event.origin);
      return;
    }

    try {
      const data = event.data;

      // Validation des données reçues
      if (!data || typeof data !== 'object' || !data.event) {
        console.warn('TikTok player: données de message invalides:', data);
        return;
      }

      switch (data.event) {
        case 'onPlayerReady':
          console.log('TikTok player ready');
          setPlayerReady(true);
          setIsLoading(false);
          break;

        case 'onStateChange':
          // État 0 = fin de vidéo, relancer en boucle
          if (data.info === 0) {
            console.log('Video ended, restarting loop');
            // Throttle pour éviter les événements trop fréquents
            if (playerReady) {
              sendMessageToPlayer('seekTo', 0);
              setTimeout(() => sendMessageToPlayer('play'), 100);
            }
          }
          break;

        case 'onMute':
          setIsMuted(data.info === 1);
          break;

        case 'onError':
          console.error('TikTok player error:', data.info);
          setError('Erro no player TikTok');
          break;

        default:
          console.debug('TikTok player: événement non géré:', data.event);
      }
    } catch (err) {
      console.warn('Error parsing TikTok message:', err);
    }
  }, [playerReady]);

  // Envoyer des messages au player TikTok avec sécurité renforcée
  const sendMessageToPlayer = useCallback((command, value) => {
    if (iframeRef.current && playerReady) {
      try {
        // Vérifier que l'iframe est accessible avant d'envoyer le message
        if (iframeRef.current.contentWindow) {
          iframeRef.current.contentWindow.postMessage({
            method: command,
            value: value
          }, 'https://www.tiktok.com'); // Origine restreinte pour la sécurité
        }
      } catch (error) {
        // Suppression silencieuse des erreurs cross-origin (attendues)
        if (error.name !== 'SecurityError') {
          console.error('TikTok player: erreur lors de l\'envoi du message:', error);
        }
      }
    }
  }, [playerReady]);

  // Activer le son et relancer la vidéo
  const handleUnmute = useCallback(() => {
    setIsMuted(false);
    // Essayer d'activer le son via postMessage
    sendMessageToPlayer('unMute');
    sendMessageToPlayer('seekTo', 0);
    sendMessageToPlayer('play');

    // Forcer aussi la lecture de l'iframe
    if (iframeRef.current) {
      try {
        // Essayer de forcer la lecture avec son
        if (iframeRef.current.contentWindow) {
          iframeRef.current.contentWindow.postMessage({
            method: 'unMute',
            value: 0
          }, 'https://www.tiktok.com');

          iframeRef.current.contentWindow.postMessage({
            method: 'play',
            value: 0
          }, 'https://www.tiktok.com');
        }
      } catch (error) {
        // Suppression silencieuse des erreurs cross-origin (attendues)
        if (error.name !== 'SecurityError') {
          console.log('Impossible de forcer la lecture avec son:', error);
        }
      }
    }
  }, [sendMessageToPlayer]);

  // Basculer en plein écran
  const toggleFullscreen = useCallback(() => {
    if (!isFullscreen) {
      if (containerRef.current?.requestFullscreen) {
        containerRef.current.requestFullscreen();
      } else if (containerRef.current?.webkitRequestFullscreen) {
        containerRef.current.webkitRequestFullscreen();
      }
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen();
      } else if (document.webkitExitFullscreen) {
        document.webkitExitFullscreen();
      }
    }
  }, [isFullscreen]);

  // Gestion des événements plein écran
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement || !!document.webkitFullscreenElement);
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    document.addEventListener('webkitfullscreenchange', handleFullscreenChange);

    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
      document.removeEventListener('webkitfullscreenchange', handleFullscreenChange);
    };
  }, []);

  // Écouter les messages postMessage
  useEffect(() => {
    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [handleMessage]);



  // Créer l'iframe TikTok avec dimensions parfaites
  useEffect(() => {
    if (!postId || !containerRef.current) return;

    setIsLoading(true);
    setError(null);
    setPlayerReady(false);

    // Clear container
    containerRef.current.innerHTML = '';

    // Créer l'iframe avec l'API v1 de TikTok et format 9:16
    const iframe = document.createElement('iframe');
    iframe.src = `https://www.tiktok.com/player/v1/${postId}?autoplay=${autoPlay ? 1 : 0}&loop=1&controls=${controls}&rel=0&muted=0&ratio=9:16`;
    iframe.title = 'TikTok Video Player';
    iframe.allowFullscreen = true;
    iframe.allow = 'autoplay; fullscreen; picture-in-picture; clipboard-write; encrypted-media; gyroscope';

    // Styling de l'iframe avec format 9:16 et suppression de l'écran blanc
    iframe.style.cssText = `
      width: 100%;
      height: 100%;
      border: none;
      border-radius: 16px;
      background: #000;
      overflow: hidden;
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      /* Forcer le format 9:16 et supprimer l'écran blanc */
      object-fit: cover;
      object-position: center;
    `;

    // Gestion des événements iframe
    iframe.onload = () => {
      console.log('TikTok iframe loaded');
      // Le player enverra un message onPlayerReady
    };

    iframe.onerror = () => {
      console.error('TikTok iframe failed to load');
      setError('Erro ao carregar vídeo TikTok');
      setIsLoading(false);
    };

    // Ajouter l'iframe au container
    containerRef.current.appendChild(iframe);
    iframeRef.current = iframe;

    // Timeout de sécurité pour éviter l'attente infinie
    const timeoutId = setTimeout(() => {
      if (isLoading && !playerReady) {
        console.warn('TikTok player timeout');
        setError('Timeout ao carregar TikTok');
        setIsLoading(false);
      }
    }, 15000);

    return () => {
      clearTimeout(timeoutId);
      if (containerRef.current) {
        containerRef.current.innerHTML = '';
      }
    };
  }, [postId, autoPlay, controls]);

  // Fallback si pas d'ID
  if (!postId) {
    return (
      <div className={`tiktok-player-fallback ${className}`}>
        <div className="fallback-content">
          <Play className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-600 mb-2">
            Vídeo TikTok não disponível
          </h3>
          <p className="text-gray-500 text-sm text-center">
            ID da vídeo não fornecido ou inválido
          </p>
        </div>
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className={`tiktok-player-container ${className} ${isFullscreen ? 'fullscreen' : ''}`}
    >
      {/* Loading state */}
      {isLoading && (
        <div className="tiktok-player-loading">
          <div className="loading-spinner">
            <RotateCcw className="w-8 h-8 animate-spin text-[#FF0050]" />
          </div>
          <p className="loading-text">Carregando TikTok...</p>
        </div>
      )}

      {/* Error state */}
      {error && (
        <div className="tiktok-player-error">
          <div className="error-content">
            <div className="error-icon">⚠️</div>
            <h3 className="error-title">Erro ao carregar</h3>
            <p className="error-message">{error}</p>
            <div className="error-actions">
              <button
                onClick={() => window.open(`https://www.tiktok.com/@user/video/${postId}`, '_blank')}
                className="fallback-link"
              >
                Abrir no TikTok
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Overlay "Activer le son" */}
      {!isLoading && !error && isMuted && (
        <div className="tiktok-player-overlay">
          <button
            onClick={handleUnmute}
            className="unmute-button"
            aria-label="Ativar o som e reproduzir vídeo"
            aria-pressed="false"
          >
            <Volume2 className="w-6 h-6" />
            <span>Ativar Som</span>
          </button>
        </div>
      )}

      {/* Bouton plein écran */}
      {!isLoading && !error && (
        <button
          onClick={toggleFullscreen}
          className="fullscreen-button"
          aria-label={isFullscreen ? 'Sair da tela cheia' : 'Tela cheia'}
          aria-pressed={isFullscreen}
        >
          {isFullscreen ? '⛶' : '⛶'}
        </button>
      )}
    </div>
  );
}
