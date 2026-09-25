import { useCallback, useEffect, useRef, useState } from 'react';
import { loadYouTubeIframeApi } from '@/hooks/useYouTubeIframeApi';

/**
 * UN SEUL lecteur YouTube pour tout le feed mobile (spec mobile §4.1, étapes 3 et 4b).
 *
 * Chargement en deux temps : l'appelant affiche d'abord la miniature (élément LCP) et
 * passe `canLoad = true` une fois qu'elle a fini de charger ; alors seulement on charge
 * la YouTube IFrame API et on crée le lecteur (youtube-nocookie, muet, en boucle, sans
 * contrôles). Quand `videoId` change (glissement vers une autre semaine), le MÊME
 * lecteur charge la nouvelle vidéo : jamais un second lecteur, et l'état du son est
 * conservé (YouTube garde muet/non muet d'une vidéo à l'autre). Il n'est détruit
 * qu'au démontage du feed.
 *
 * Toutes les valeurs exposées (lecture, son) viennent du LECTEUR, jamais du clic.
 *
 * Phases (pour la vidéo courante) :
 *   'poster'   miniature seule, lecteur pas encore demandé
 *   'loading'  vidéo en cours de chargement, miniature toujours visible
 *   'playing'  la vidéo est affichée (fondu), REVEAL_DELAY_MS après le premier PLAYING
 *              — juste le temps d'éviter l'image noire du démarrage —, son coupé ou non.
 *              L'interface de démarrage de YouTube (titre en haut, logo « Shorts » en bas
 *              à droite) reste alors visible ~3 s : accepté (décision du 2026-09-25).
 *   'fallback' PLAYING pas reçu en 3 s (économie d'énergie/données, YouTube lent ou
 *              bloqué) → la miniature reste, « Toque para ouvir » relance au tap
 *   'none'     pas de Short pour cette chanson : le lecteur est arrêté et masqué
 */

export const FALLBACK_DELAY_MS = 3000;
// Décision du 2026-09-25 (test iPhone : une image figée pendant ~3 s avec la musique
// qui joue, c'est pire que l'interface YouTube) : ~0,3 s, au premier chargement comme
// après chaque glissement, son coupé ou non.
export const REVEAL_DELAY_MS = 300;
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

/**
 * La boucle est gérée ici, pas par YouTube : juste avant la fin, on revient au début.
 * Le lecteur n'atteint donc jamais son écran de fin, et `loadVideoById` peut changer
 * de vidéo sans liste de lecture native (`loop=1&playlist=<id>` figeait la boucle sur
 * la première vidéo et faisait échouer le premier changement de chanson).
 */
const LOOP_LEAD_S = 0.4; // > intervalle de sondage (250 ms) : la fin n'est jamais atteinte

export function useShortPlayer({ videoId, canLoad, mountRef }) {
  const [phase, setPhase] = useState(videoId ? 'poster' : 'none');
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(true);
  // Pause demandée par l'utilisateur (pas un simple chargement ou une mise en mémoire).
  const [isPaused, setIsPaused] = useState(false);

  const playerRef = useRef(null);
  const readyRef = useRef(false);
  const creatingRef = useRef(false);
  const everPlayedRef = useRef(false);
  const pendingSoundRef = useRef(false);
  const fallbackTimerRef = useRef(null);
  const revealTimerRef = useRef(null);
  const videoIdRef = useRef(videoId);
  const loadedIdRef = useRef(null);

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

  const armFallbackTimer = () => {
    clearFallbackTimer();
    fallbackTimerRef.current = setTimeout(() => {
      if (!everPlayedRef.current) setPhase('fallback');
    }, FALLBACK_DELAY_MS);
  };

  const syncFromPlayer = useCallback(() => {
    const player = playerRef.current;
    if (!player || !readyRef.current) return;
    try {
      const muted = player.isMuted();
      const playing = player.getPlayerState() === YT_STATE.PLAYING;
      if (playing) {
        const duration = player.getDuration?.() || 0;
        if (duration > 1 && player.getCurrentTime() >= duration - LOOP_LEAD_S) player.seekTo(0, true);
      }
      setIsMuted((previous) => (previous === muted ? previous : muted));
      setIsPlaying((previous) => (previous === playing ? previous : playing));
    } catch {
      /* lecteur en cours de destruction */
    }
  }, []);

  const createPlayer = useCallback(() => {
    const initialId = videoIdRef.current;
    if (!initialId || creatingRef.current || playerRef.current) return;
    if (!mountRef.current) return;
    creatingRef.current = true;
    setPhase((current) => (current === 'playing' || current === 'fallback' ? current : 'loading'));
    armFallbackTimer();

    loadYouTubeIframeApi()
      .then((YT) => {
        if (!mountRef.current) return;
        // YT.Player remplace l'élément cible par l'iframe : on lui donne un nœud créé à
        // la main, pour que React ne le réconcilie jamais.
        const target = document.createElement('div');
        mountRef.current.replaceChildren(target);
        loadedIdRef.current = initialId;

        playerRef.current = new YT.Player(target, {
          host: 'https://www.youtube-nocookie.com',
          videoId: initialId,
          width: '100%',
          height: '100%',
          playerVars: {
            autoplay: 1,
            mute: 1,
            playsinline: 1,
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
                iframe.setAttribute('title', 'Vídeo da música');
              }
              if (pendingSoundRef.current) {
                pendingSoundRef.current = false;
                player.unMute();
                player.setVolume(100);
              } else {
                player.mute();
              }
              hideCaptions(player);
              // La chanson a pu changer pendant la création du lecteur.
              const wanted = videoIdRef.current;
              if (!wanted) {
                player.stopVideo?.();
              } else if (wanted !== loadedIdRef.current) {
                loadedIdRef.current = wanted;
                player.loadVideoById(wanted);
              } else {
                player.playVideo();
              }
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
              // Filet de sécurité de la boucle, si le sondage a raté la fin.
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
    // armFallbackTimer / clear*Timer ne touchent que des refs et setPhase (stables).
  }, [mountRef, syncFromPlayer]); // eslint-disable-line react-hooks/exhaustive-deps

  // Changement de chanson : le même lecteur charge la nouvelle vidéo (ou s'arrête si
  // la chanson n'a pas de Short). Le son reste dans l'état où il était.
  useEffect(() => {
    videoIdRef.current = videoId;
    everPlayedRef.current = false;
    clearRevealTimer();
    clearFallbackTimer();
    setIsPlaying(false);
    setIsPaused(false); // une nouvelle chanson démarre toujours en lecture

    const player = playerRef.current;
    if (!videoId) {
      if (player && readyRef.current) player.stopVideo?.();
      // Arrêté : au retour sur une chanson avec Short, il faudra recharger sa vidéo.
      loadedIdRef.current = null;
      setPhase('none');
      return;
    }
    if (player && readyRef.current) {
      if (loadedIdRef.current !== videoId) {
        loadedIdRef.current = videoId;
        setPhase('loading');
        armFallbackTimer();
        player.loadVideoById(videoId);
      }
      return;
    }
    // Pas encore de lecteur (ou en cours de création) : la création s'en charge.
    if (!creatingRef.current) setPhase('poster');
  }, [videoId]); // eslint-disable-line react-hooks/exhaustive-deps

  // Création du lecteur une fois la première miniature affichée. En économie de
  // données, on n'en charge aucun tant que l'utilisateur ne l'a pas demandé.
  useEffect(() => {
    if (!videoId || !canLoad || playerRef.current || creatingRef.current) return;
    if (prefersSaveData()) {
      setPhase('fallback');
      return;
    }
    createPlayer();
  }, [videoId, canLoad, createPlayer]);

  // Destruction au démontage du feed seulement.
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
  }, []);

  // L'état affiché suit le lecteur (le navigateur peut remuter, mettre en pause…).
  useEffect(() => {
    const id = setInterval(syncFromPlayer, POLL_MS);
    return () => clearInterval(id);
  }, [syncFromPlayer]);

  // Onglet masqué → pause (batterie) ; retour → reprise si la vidéo tournait.
  useEffect(() => {
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
  }, []);

  /** Tap : son coupé → son (et lecture si en repli) ; son actif → silence. */
  const toggleSound = useCallback(() => {
    if (!videoIdRef.current) return;
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
  }, [createPlayer, syncFromPlayer]);

  const ready = () => Boolean(playerRef.current && readyRef.current);

  /** Pause / lecture (taps suivants, Espace). Sans effet tant que le lecteur n'est pas prêt. */
  const pause = useCallback(() => {
    if (!ready()) return;
    playerRef.current.pauseVideo();
    setIsPaused(true);
  }, []);

  const play = useCallback(() => {
    if (!ready()) return;
    playerRef.current.playVideo();
    setIsPaused(false);
  }, []);

  const togglePause = useCallback(() => {
    if (isPaused) play();
    else pause();
  }, [isPaused, play, pause]);

  /** Icône haut-parleur : couper / rétablir le son sans toucher à la lecture. */
  const mute = useCallback(() => {
    if (!ready()) return;
    playerRef.current.mute();
    syncFromPlayer();
  }, [syncFromPlayer]);

  const unmute = useCallback(() => {
    if (!videoIdRef.current) return;
    if (!ready()) {
      pendingSoundRef.current = true;
      createPlayer();
      return;
    }
    const player = playerRef.current;
    player.unMute();
    player.setVolume(100);
    if (!isPaused && player.getPlayerState() !== YT_STATE.PLAYING) player.playVideo();
    syncFromPlayer();
  }, [isPaused, createPlayer, syncFromPlayer]);

  /** Barre de progression et flèches : position en secondes, bornée à la durée. */
  const seekTo = useCallback((seconds, allowSeekAhead = true) => {
    if (!ready()) return;
    const duration = playerRef.current.getDuration?.() || 0;
    const target = Math.max(0, duration ? Math.min(seconds, duration - 0.5) : seconds);
    playerRef.current.seekTo(target, allowSeekAhead);
  }, []);

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
    isPaused,
    /** Son réellement audible : lecteur en lecture ET non muet. */
    isSoundOn: isPlaying && !isMuted,
    toggleSound,
    pause,
    play,
    togglePause,
    mute,
    unmute,
    seekTo,
    getCurrentTime,
    getDuration,
  };
}
