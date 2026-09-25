import { useCallback, useEffect, useRef, useState } from 'react';
import { loadYouTubeIframeApi } from '@/hooks/useYouTubeIframeApi';

/**
 * Lecteur du Short de la semaine sur le feed mobile (spec mobile §4.1, étape 3).
 *
 * Chargement en deux temps : l'appelant affiche d'abord la miniature (élément LCP) et
 * passe `canLoad = true` une fois qu'elle a fini de charger ; alors seulement on charge
 * la YouTube IFrame API et on crée le lecteur (youtube-nocookie, muet, en boucle, sans
 * contrôles). Une seule iframe à la fois : le lecteur est détruit au démontage ou au
 * changement de vidéo.
 *
 * Toutes les valeurs exposées (lecture, son) viennent du LECTEUR, jamais du clic : le
 * tap demande `unMute()`/`mute()`, puis l'état est relu sur le lecteur. La danse de la
 * Caipivara (étape 4) et la ligne de karaokê (étape 5) s'appuieront dessus.
 *
 * Phases :
 *   'poster'   miniature seule, lecteur pas encore demandé
 *   'loading'  lecteur en cours de création, miniature toujours visible
 *   'playing'  la vidéo est affichée (fondu). On attend REVEAL_DELAY_MS après le premier
 *              PLAYING : YouTube superpose au démarrage son titre, son logo et un bouton,
 *              même avec controls=0, puis les masque. La miniature couvre ce moment.
 *              Si l'utilisateur active le son avant, la vidéo apparaît tout de suite.
 *   'fallback' PLAYING pas reçu en 3 s (économie d'énergie/données, YouTube lent ou
 *              bloqué) → la miniature reste, « Toque para ouvir » relance au tap
 *   'none'     pas de Short : aucun lecteur n'est jamais chargé
 */

export const FALLBACK_DELAY_MS = 3000;
// Mesuré (Chromium, 390 px) : titre, logo et bouton YouTube restent ~5 s après le début
// de la lecture muette, puis disparaissent. Un tap « son » les fait disparaître aussitôt.
export const REVEAL_DELAY_MS = 6000;
const POLL_MS = 250;
const YT_STATE = { ENDED: 0, PLAYING: 1 };

// Sous-titres automatiques : YouTube les active souvent quand la vidéo est muette. Le
// module se décharge par l'API ; sans effet si la vidéo n'en a pas.
function hideCaptions(player) {
  try {
    player.unloadModule?.('captions');
    player.unloadModule?.('cc');
  } catch {
    /* module absent */
  }
}

function prefersSaveData() {
  if (typeof navigator === 'undefined') return false;
  return Boolean(navigator.connection?.saveData);
}

export function useShortPlayer({ videoId, canLoad, mountRef }) {
  const [phase, setPhase] = useState(videoId ? 'poster' : 'none');
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(true);

  const playerRef = useRef(null);
  const readyRef = useRef(false);
  const everPlayedRef = useRef(false);
  const pendingSoundRef = useRef(false);
  const fallbackTimerRef = useRef(null);
  const revealTimerRef = useRef(null);
  const creatingRef = useRef(false);

  const clearRevealTimer = () => {
    if (revealTimerRef.current) {
      clearTimeout(revealTimerRef.current);
      revealTimerRef.current = null;
    }
  };

  const clearFallbackTimer = () => {
    if (fallbackTimerRef.current) {
      clearTimeout(fallbackTimerRef.current);
      fallbackTimerRef.current = null;
    }
  };

  const syncFromPlayer = useCallback(() => {
    const player = playerRef.current;
    if (!player || !readyRef.current) return;
    try {
      const muted = player.isMuted();
      const playing = player.getPlayerState() === YT_STATE.PLAYING;
      setIsMuted((previous) => (previous === muted ? previous : muted));
      setIsPlaying((previous) => (previous === playing ? previous : playing));
    } catch {
      /* lecteur en cours de destruction */
    }
  }, []);

  const createPlayer = useCallback(() => {
    if (!videoId || creatingRef.current || playerRef.current) return;
    const host = mountRef.current;
    if (!host) return;
    creatingRef.current = true;
    setPhase((current) => (current === 'playing' ? current : current === 'fallback' ? current : 'loading'));

    clearFallbackTimer();
    fallbackTimerRef.current = setTimeout(() => {
      if (!everPlayedRef.current) setPhase('fallback');
    }, FALLBACK_DELAY_MS);

    loadYouTubeIframeApi()
      .then((YT) => {
        if (!mountRef.current) return;
        // YT.Player remplace l'élément cible par l'iframe : on lui donne un nœud créé à
        // la main, pour que React ne le réconcilie jamais.
        const target = document.createElement('div');
        mountRef.current.replaceChildren(target);

        playerRef.current = new YT.Player(target, {
          host: 'https://www.youtube-nocookie.com',
          videoId,
          width: '100%',
          height: '100%',
          playerVars: {
            autoplay: 1,
            mute: 1,
            playsinline: 1,
            loop: 1,
            playlist: videoId,
            controls: 0,
            disablekb: 1,
            fs: 0,
            iv_load_policy: 3,
            rel: 0,
            origin: window.location.origin,
          },
          events: {
            onReady: (event) => {
              readyRef.current = true;
              const player = event.target;
              const iframe = player.getIframe?.();
              if (iframe) {
                iframe.setAttribute('tabindex', '-1');
                iframe.setAttribute('aria-hidden', 'true');
                iframe.setAttribute('title', 'Vídeo da música da semana');
              }
              if (pendingSoundRef.current) {
                pendingSoundRef.current = false;
                player.unMute();
                player.setVolume(100);
              } else {
                player.mute();
              }
              hideCaptions(player);
              player.playVideo();
              syncFromPlayer();
            },
            onStateChange: (event) => {
              if (event.data === YT_STATE.PLAYING) {
                hideCaptions(event.target);
                clearFallbackTimer();
                if (!everPlayedRef.current) {
                  everPlayedRef.current = true;
                  clearRevealTimer();
                  revealTimerRef.current = setTimeout(() => setPhase('playing'), REVEAL_DELAY_MS);
                }
              }
              // Filet de sécurité de la boucle : `loop` + `playlist` suffisent en
              // général, mais certains navigateurs s'arrêtent sur ENDED.
              if (event.data === YT_STATE.ENDED) {
                event.target.seekTo(0, true);
                event.target.playVideo();
              }
              syncFromPlayer();
            },
            onError: () => {
              clearFallbackTimer();
              if (!everPlayedRef.current) setPhase('fallback');
            },
          },
        });
      })
      .catch(() => {
        clearFallbackTimer();
        creatingRef.current = false;
        setPhase('fallback');
      });
  }, [videoId, mountRef, syncFromPlayer]);

  // Réinitialisation quand la vidéo change.
  useEffect(() => {
    everPlayedRef.current = false;
    pendingSoundRef.current = false;
    setIsPlaying(false);
    setIsMuted(true);
    setPhase(videoId ? 'poster' : 'none');
  }, [videoId]);

  // Création du lecteur une fois la miniature affichée. En économie de données, on
  // n'en charge aucun tant que l'utilisateur ne l'a pas demandé.
  useEffect(() => {
    if (!videoId || !canLoad) return;
    if (prefersSaveData()) {
      setPhase('fallback');
      return;
    }
    createPlayer();
  }, [videoId, canLoad, createPlayer]);

  // Destruction au démontage / changement de vidéo.
  useEffect(() => () => {
    clearFallbackTimer();
    clearRevealTimer();
    try {
      playerRef.current?.destroy?.();
    } catch {
      /* déjà détruit */
    }
    playerRef.current = null;
    readyRef.current = false;
    creatingRef.current = false;
  }, [videoId]);

  // L'état affiché suit le lecteur (le navigateur peut remuter, mettre en pause…).
  useEffect(() => {
    if (!videoId) return undefined;
    const id = setInterval(syncFromPlayer, POLL_MS);
    return () => clearInterval(id);
  }, [videoId, syncFromPlayer]);

  // Son activé par l'utilisateur pendant l'attente → on montre la vidéo sans attendre.
  useEffect(() => {
    if (!everPlayedRef.current || isMuted || !isPlaying) return;
    clearRevealTimer();
    setPhase('playing');
  }, [isMuted, isPlaying]);

  // Onglet masqué → pause (batterie) ; retour → reprise si la vidéo tournait.
  useEffect(() => {
    if (!videoId) return undefined;
    let resumeOnShow = false;
    const onVisibility = () => {
      const player = playerRef.current;
      if (!player || !readyRef.current) return;
      if (document.hidden) {
        resumeOnShow = player.getPlayerState() === YT_STATE.PLAYING;
        if (resumeOnShow) player.pauseVideo();
      } else if (resumeOnShow) {
        player.playVideo();
      }
    };
    document.addEventListener('visibilitychange', onVisibility);
    return () => document.removeEventListener('visibilitychange', onVisibility);
  }, [videoId]);

  /** Tap : son coupé → son (et lecture si en repli) ; son actif → silence. */
  const toggleSound = useCallback(() => {
    if (!videoId) return;
    const player = playerRef.current;

    if (!player || !readyRef.current) {
      // Lecteur pas encore prêt (ou jamais créé : économie de données) : on retient la
      // demande, elle sera appliquée dans onReady.
      pendingSoundRef.current = true;
      createPlayer();
      return;
    }

    if (player.isMuted()) {
      player.unMute();
      player.setVolume(100);
      if (player.getPlayerState() !== YT_STATE.PLAYING) player.playVideo();
    } else {
      player.mute();
    }
    syncFromPlayer();
  }, [videoId, createPlayer, syncFromPlayer]);

  const getCurrentTime = useCallback(() => {
    try {
      return readyRef.current ? playerRef.current?.getCurrentTime?.() ?? 0 : 0;
    } catch {
      return 0;
    }
  }, []);

  const getDuration = useCallback(() => {
    try {
      return readyRef.current ? playerRef.current?.getDuration?.() ?? 0 : 0;
    } catch {
      return 0;
    }
  }, []);

  return {
    phase,
    isPlaying,
    isMuted,
    /** Son réellement audible : lecteur en lecture ET non muet. */
    isSoundOn: isPlaying && !isMuted,
    toggleSound,
    getCurrentTime,
    getDuration,
  };
}
