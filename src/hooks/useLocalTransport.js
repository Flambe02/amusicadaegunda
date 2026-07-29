import { useCallback, useEffect, useRef, useState } from 'react';
import { transportTimes, seekByLocal, loopBackTarget } from '@/lib/karaokeWorkshop';
import { clampLocalSeek } from '@/lib/audioClock';

/**
 * useLocalTransport — transport de l'AUDIO LOCAL pour l'ateliê de karaokê.
 *
 * UN SEUL PROPRIÉTAIRE DE LECTURE : ce hook ne crée jamais d'élément `<audio>`, il pilote
 * celui de `useLocalAudioSession` (déjà partagé entre l'éditeur et le studio de mots).
 * Aucun second lecteur ne peut donc apparaître en ouvrant/fermant le studio.
 *
 * Ne touche JAMAIS au timing : il ne fait que lire/positionner l'élément média. Les
 * bornes de réécoute lui arrivent déjà converties (`phraseReviewWindow`), et seule la
 * cible média est bornée — un temps canonique enregistré n'est jamais réécrit.
 *
 * @param {{ session: object, offsetSeconds: number|null }} params
 *   `session` = valeur de useLocalAudioSession ; `offsetSeconds` = calibration active
 *   (null = non calibré → le temps canonique reste inconnu).
 */
export function useLocalTransport({ session, offsetSeconds } = {}) {
  const audioEl = session?.audioRef?.current ?? null;
  const ready = Boolean(session?.ready);
  const duration = Number.isFinite(session?.duration) ? session.duration : 0;

  const [isPlaying, setIsPlaying] = useState(false);
  const [localTime, setLocalTime] = useState(0);
  const [rate, setRateState] = useState(1);
  const [isLoopEnabled, setIsLoopEnabled] = useState(false);

  // Refs lues par le rAF et les écouteurs — évite les closures périmées.
  const loopRef = useRef(isLoopEnabled); loopRef.current = isLoopEnabled;
  const windowRef = useRef(null);       // fenêtre de réécoute active
  const rafRef = useRef(0);
  const mountedRef = useRef(true);
  useEffect(() => {
    mountedRef.current = true;
    return () => { mountedRef.current = false; };
  }, []);

  const stopRaf = useCallback(() => {
    if (rafRef.current) { cancelAnimationFrame(rafRef.current); rafRef.current = 0; }
  }, []);

  const pause = useCallback(() => {
    try { audioEl?.pause(); } catch { /* noop */ }
    stopRaf();
    if (mountedRef.current) setIsPlaying(false);
  }, [audioEl, stopRaf]);

  // Boucle de suivi : met à jour l'horloge affichée et applique la fin de frase / la
  // boucle. Un seul rAF, actif uniquement pendant la lecture.
  const tick = useCallback(() => {
    if (!mountedRef.current || !audioEl) return;
    const t = audioEl.currentTime;
    setLocalTime(t);
    const win = windowRef.current;
    if (win) {
      const back = loopBackTarget(t, win);
      if (back != null) {
        if (loopRef.current) {
          try { audioEl.currentTime = back; } catch { /* noop */ }
        } else {
          windowRef.current = null;
          pause();
          return;
        }
      }
    }
    rafRef.current = requestAnimationFrame(tick);
  }, [audioEl, pause]);

  const play = useCallback(() => {
    if (!ready || !audioEl) return;
    try {
      audioEl.playbackRate = rate;
      const p = audioEl.play();
      if (p && typeof p.then === 'function') p.then(() => {}).catch(() => {});
    } catch { /* noop */ }
    if (mountedRef.current) setIsPlaying(true);
    stopRaf();
    rafRef.current = requestAnimationFrame(tick);
  }, [ready, audioEl, rate, stopRaf, tick]);

  const togglePlay = useCallback(() => {
    if (isPlaying) pause(); else play();
  }, [isPlaying, pause, play]);

  /** Positionne la tête de lecture LOCALE (cible média bornée uniquement). */
  const seekTo = useCallback((tLocal) => {
    if (!audioEl) return;
    const t = clampLocalSeek(tLocal, duration);
    try { audioEl.currentTime = t; } catch { /* noop */ }
    if (mountedRef.current) setLocalTime(t);
  }, [audioEl, duration]);

  const seekBy = useCallback((deltaSec) => {
    if (!audioEl) return;
    seekTo(seekByLocal(audioEl.currentTime, deltaSec, duration));
  }, [audioEl, duration, seekTo]);

  const setRate = useCallback((r) => {
    const next = Number.isFinite(r) && r > 0 ? r : 1;
    setRateState(next);
    if (audioEl) { try { audioEl.playbackRate = next; } catch { /* noop */ } }
  }, [audioEl]);

  const setLoop = useCallback((on) => setIsLoopEnabled(Boolean(on)), []);
  const toggleLoop = useCallback(() => setIsLoopEnabled((v) => !v), []);

  /**
   * Réécoute une frase depuis sa fenêtre déjà convertie. Ne renvoie RIEN — la réécoute
   * ne peut ni modifier un timing, ni déplacer la frase sélectionnée.
   */
  const reviewWindow = useCallback((win) => {
    if (!win || !ready || !audioEl) return;
    windowRef.current = win;
    seekTo(win.localSeek);
    play();
  }, [ready, audioEl, seekTo, play]);

  const stopReview = useCallback(() => { windowRef.current = null; }, []);

  // Synchronise l'état avec l'élément (pause/ended/error/seek externes) et nettoie tout
  // au démontage OU au changement d'élément (remplacement de fichier).
  useEffect(() => {
    if (!audioEl) return undefined;
    const onPause = () => { if (mountedRef.current) setIsPlaying(false); };
    const onEnded = () => {
      windowRef.current = null;
      if (mountedRef.current) setIsPlaying(false);
    };
    const onError = () => {
      windowRef.current = null;
      if (mountedRef.current) setIsPlaying(false);
    };
    const onTime = () => { if (mountedRef.current) setLocalTime(audioEl.currentTime); };
    audioEl.addEventListener('pause', onPause);
    audioEl.addEventListener('ended', onEnded);
    audioEl.addEventListener('error', onError);
    audioEl.addEventListener('timeupdate', onTime);
    return () => {
      audioEl.removeEventListener('pause', onPause);
      audioEl.removeEventListener('ended', onEnded);
      audioEl.removeEventListener('error', onError);
      audioEl.removeEventListener('timeupdate', onTime);
      // Changement d'élément (autre fichier) ou démontage : on arrête proprement CET
      // élément-là, sans jamais toucher aux timings enregistrés.
      try { audioEl.pause(); } catch { /* noop */ }
      windowRef.current = null;
      stopRaf();
      setIsPlaying(false);
    };
  }, [audioEl, stopRaf]);

  const { canonical } = transportTimes(localTime, offsetSeconds);

  return {
    audioEl,
    isPlaying,
    localTime,
    canonicalTime: canonical,
    rate,
    isLoopEnabled,
    play,
    pause,
    togglePlay,
    seekTo,
    seekBy,
    setRate,
    setLoop,
    toggleLoop,
    reviewWindow,
    stopReview,
  };
}
