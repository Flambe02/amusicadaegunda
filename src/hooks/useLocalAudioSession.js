import { useCallback, useEffect, useRef, useState } from 'react';
import { computePeaks } from '@/lib/waveformPeaks';

/**
 * useLocalAudioSession — charge un fichier audio LOCAL (File API) comme horloge de
 * lecture précise et source d'onde pour le studio « Afinar palavras e bola ».
 *
 * GARANTIE DE CONFIDENTIALITÉ : le fichier n'est JAMAIS envoyé au réseau. On crée
 * seulement un object URL local pour un <audio> et on décode en mémoire pour l'onde.
 * Aucun octet audio ne quitte l'appareil ; seuls les timings de paroles sont sauvés.
 *
 * Nettoyage complet (remplacement / démontage) : pause, src retiré, object URL révoqué,
 * AudioContext fermé, crêtes libérées, listeners retirés — pas de fuite mémoire.
 */
export function useLocalAudioSession() {
  const audioRef = useRef(null);
  if (audioRef.current == null && typeof Audio !== 'undefined') {
    audioRef.current = new Audio();
    audioRef.current.preload = 'auto';
  }
  const urlRef = useRef(null);

  const [fileName, setFileName] = useState(null);
  const [duration, setDuration] = useState(0);
  const [peaks, setPeaks] = useState(null);
  const [ready, setReady] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const releaseUrl = useCallback(() => {
    if (urlRef.current) {
      URL.revokeObjectURL(urlRef.current);
      urlRef.current = null;
    }
  }, []);

  const clear = useCallback(() => {
    const el = audioRef.current;
    if (el) {
      try { el.pause(); } catch { /* noop */ }
      el.removeAttribute('src');
      el.load();
    }
    releaseUrl();
    setFileName(null);
    setDuration(0);
    setPeaks(null);
    setReady(false);
    setError(null);
  }, [releaseUrl]);

  const load = useCallback(async (file) => {
    if (!file) return;
    const el = audioRef.current;
    if (!el) { setError('Áudio não suportado neste navegador.'); return; }

    // Nettoie une éventuelle session précédente avant de charger la nouvelle.
    try { el.pause(); } catch { /* noop */ }
    releaseUrl();
    setError(null);
    setReady(false);
    setPeaks(null);
    setLoading(true);
    setFileName(file.name || 'áudio local');

    // 1) Lecture : object URL local (toujours, même si le décodage d'onde échoue).
    const url = URL.createObjectURL(file);
    urlRef.current = url;
    el.src = url;
    el.load();

    // 2) Onde : décodage en mémoire → crêtes compactes, puis on ferme le contexte.
    let ctx = null;
    try {
      const arrayBuffer = await file.arrayBuffer();
      const AC = window.AudioContext || window.webkitAudioContext;
      ctx = new AC();
      const buffer = await ctx.decodeAudioData(arrayBuffer.slice(0));
      setDuration(buffer.duration);
      setPeaks(computePeaks(buffer, 6000));
      setReady(true);
    } catch {
      // Le décodage peut échouer (certains m4a/aac) : la lecture reste possible sans onde.
      setError('Não foi possível gerar a forma de onda deste ficheiro. A reprodução continua disponível.');
      setReady(true);
    } finally {
      if (ctx) { try { await ctx.close(); } catch { /* noop */ } }
      setLoading(false);
    }
  }, [releaseUrl]);

  // Duration de secours via les métadonnées de l'élément (si le décodage n'a pas fixé la durée).
  useEffect(() => {
    const el = audioRef.current;
    if (!el) return undefined;
    const onMeta = () => { if (Number.isFinite(el.duration) && el.duration > 0) setDuration((d) => d || el.duration); };
    el.addEventListener('loadedmetadata', onMeta);
    return () => el.removeEventListener('loadedmetadata', onMeta);
  }, []);

  // Nettoyage au démontage.
  useEffect(() => () => {
    const el = audioRef.current;
    if (el) { try { el.pause(); } catch { /* noop */ } el.removeAttribute('src'); }
    releaseUrl();
  }, [releaseUrl]);

  return { audioRef, fileName, duration, peaks, ready, loading, error, load, clear };
}
