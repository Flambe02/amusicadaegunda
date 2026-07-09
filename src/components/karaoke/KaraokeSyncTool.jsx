import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  ChevronRight, ChevronLeft, ChevronsLeft, ChevronsRight, Play, Pause,
  Plus, Copy, Trash2, Undo2, Redo2, Crosshair, Save, Loader2, Music, Minus, FileText,
  RotateCcw, History, ClipboardPaste, ArrowLeft, Gauge, X, Sparkles, AlertTriangle,
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/components/ui/use-toast';
import { useYouTubeIframeApi } from '@/hooks/useYouTubeIframeApi';
import { extractYouTubeId } from '@/lib/utils';
import { splitLyricsLines, parseLrc, buildLrc, formatTimestamp, activeLineIndex } from '@/lib/lrc';
import KaraokeWipeLine from '@/components/karaoke/KaraokeWipeLine';
import '@/styles/karaoke.css';

const REWIND_SECONDS = 3;
const MIN_PX_PER_SEC = 20;
const MAX_PX_PER_SEC = 300;
const DEFAULT_PX_PER_SEC = 80;
const DEFAULT_LINE_WIDTH_SEC = 2; // largeur visuelle par défaut d'un bloc (fixe, pas dynamique)
const PLAYBACK_RATES = [1, 0.75, 0.5, 0.25];
const MAX_HISTORY = 100;

// Calibration de latence : la latence de réaction (voir + taper Espace) est propre
// à la personne + à l'appareil, pas à la chanson → persistée en localStorage.
const LATENCY_KEY = 'karaoke-latency-ms';
const CAL_FLASHES = 5;        // nombre de flashs du test de réaction
const CAL_MIN_GAP = 1100;     // délai min (ms) avant un flash (aléatoire → pas d'anticipation)
const CAL_MAX_GAP = 2200;     // délai max (ms) avant un flash
const MAX_LATENCY = 600;      // borne haute raisonnable (ms)

/**
 * Éditeur / synchroniseur de karaoké (admin, Partie A).
 *
 * Écran unique façon « Manual Sync » : liste des lignes à gauche, aperçu vidéo +
 * overlay karaoké à droite, barre d'outils, et une frise temporelle en bas où
 * chaque ligne est un bloc qu'on peut glisser pour affiner son timing.
 *
 * Toujours ligne par ligne (pas mot-par-mot). Chaque ligne a un temps de DÉPART
 * (toujours) et, optionnellement, un temps de FIN capturé via le geste Espace
 * maintenu/relâché — sans fin captée, la fin reste implicite (= début de la ligne
 * suivante), comme avant. Le lecteur karaoké public respecte les deux cas
 * (via activeLineIndex, partagé avec cet outil).
 */
export default function KaraokeSyncTool({ song, onClose, onSaved }) {
  const { toast } = useToast();
  const { YT, ready: apiReady, error: apiError } = useYouTubeIframeApi();

  const hostRef = useRef(null);
  const playerRef = useRef(null);
  const pollRef = useRef(null);

  const [playerReady, setPlayerReady] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isSaving, setIsSaving] = useState(false);
  const [syncLyricsToo, setSyncLyricsToo] = useState(true);
  const [pxPerSecond, setPxPerSecond] = useState(DEFAULT_PX_PER_SEC);
  const [isHolding, setIsHolding] = useState(false); // Espace maintenu = en train de marquer la ligne
  const [playbackRate, setPlaybackRateState] = useState(1);
  const [shiftAllMode, setShiftAllMode] = useState(true); // ±100ms : toutes les lignes (true) ou juste la sélectionnée (false)

  // Latence de réaction mesurée (ms) : retranchée automatiquement à chaque marquage
  // Espace/Enter (voir markLineStart) → la frise affiche déjà la bonne position, ce
  // qui rend la passe « Shift All » globale inutile. Réglage fin ±100ms toujours dispo.
  const [latencyMs, setLatencyMs] = useState(() => {
    try { const v = parseInt(localStorage.getItem(LATENCY_KEY), 10); return Number.isFinite(v) ? v : 0; } catch { return 0; }
  });
  const [isCalibrating, setIsCalibrating] = useState(false);

  // Recharge la chanson DIRECTEMENT depuis Supabase à l'ouverture (garde-fou
  // supplémentaire contre toute donnée obsolète côté client — le prop `song` vient de
  // l'état local de l'admin, cette requête garantit lyrics/lrc_content/youtube_url à jour).
  const [freshSong, setFreshSong] = useState(null);
  const effectiveSong = freshSong || song;
  const userEditedLyricsRef = useRef(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data } = await supabase
        .from('songs')
        .select('id, title, lyrics, lrc_content, youtube_url, youtube_music_url')
        .eq('id', song.id)
        .maybeSingle();
      if (!cancelled && data) setFreshSong(data);
    })();
    return () => { cancelled = true; };
  }, [song?.id]);

  const videoId = useMemo(
    () => extractYouTubeId(effectiveSong?.youtube_url) || extractYouTubeId(effectiveSong?.youtube_music_url),
    [effectiveSong?.youtube_url, effectiveSong?.youtube_music_url]
  );

  // Lignes : { text, time:number|null }. Init depuis LRC existant, sinon paroles brutes.
  // (nouvelle instance à chaque changement de `song` grâce à key={song.id} côté Admin.jsx)
  const [lines, setLines] = useState(() => buildInitialLines(song));
  const [cursor, setCursor] = useState(() => {
    const init = buildInitialLines(song);
    const firstNull = init.findIndex((l) => l.time == null);
    return firstNull === -1 ? Math.max(0, init.length - 1) : firstNull;
  });

  // ── Étape « Letra » : confirmer/corriger le texte AVANT de synchroniser ──
  // Sert aussi de garde-fou visuel : le titre + la letra affichés doivent correspondre
  // à la chanson ouverte — si jamais ce n'était pas le cas, c'est visible ici tout de suite.
  const [step, setStep] = useState('lyrics'); // 'lyrics' | 'sync'
  const [lyricsDraft, setLyricsDraft] = useState(() => lines.map((l) => l.text).join('\n'));

  // Dès que la donnée FRAÎCHE de Supabase arrive, si l'utilisateur n'a encore rien
  // corrigé manuellement et qu'on est toujours à l'étape « Letra », on aligne le
  // brouillon dessus (sécurité : le prop `song` initial pourrait être obsolète).
  useEffect(() => {
    if (!freshSong || step !== 'lyrics' || userEditedLyricsRef.current) return;
    const fresh = buildInitialLines(freshSong);
    const currentTexts = lines.map((l) => l.text).join('\n');
    const freshTexts = fresh.map((l) => l.text).join('\n');
    if (freshTexts && freshTexts !== currentTexts) {
      setLines(fresh);
      setLyricsDraft(freshTexts);
      setCursor(0);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [freshSong, step]);

  // Instantané des lignes au moment d'entrer en sync — sert de filet de sécurité
  // (« Restaurar versão inicial ») pour annuler TOUTE la session de sync en une fois.
  const initialSyncLinesRef = useRef(null);

  const proceedToSync = useCallback(() => {
    const newTexts = splitLyricsLines(lyricsDraft);
    if (newTexts.length === 0) return;
    const unchanged = newTexts.length === lines.length && newTexts.every((t, i) => t === lines[i].text);
    const finalLines = unchanged ? lines : newTexts.map((text) => ({ text, time: null, endTime: null }));
    if (!unchanged) {
      // Le texte a changé (ajout/suppression/correction) → les anciens temps ne
      // correspondent plus forcément à l'ordre des lignes, on repart à zéro.
      setLines(finalLines);
      setCursor(0);
    }
    initialSyncLinesRef.current = finalLines.map((l) => ({ ...l }));
    setStep('sync');
  }, [lyricsDraft, lines]);

  // Colle le contenu du presse-papiers directement dans le textarea des paroles.
  const handlePasteLyrics = useCallback(async () => {
    try {
      const text = await navigator.clipboard.readText();
      if (text) { userEditedLyricsRef.current = true; setLyricsDraft(text); }
    } catch {
      toast({ title: 'Não foi possível aceder à área de transferência', description: 'Cola manualmente com Ctrl+V no campo.', variant: 'destructive' });
    }
  }, [toast]);

  const listItemRefs = useRef({});
  const activeBlockRef = useRef(null);
  const timelineTrackRef = useRef(null);
  const dragRef = useRef(null);

  // ── Historique Undo/Redo générique — toute action « discrète » (marquer, ajouter,
  // supprimer, dupliquer, insérer, réinitialiser, décaler) passe par commitLines()
  // pour être annulable. Le drag de bloc ne pousse qu'UNE entrée au début du geste
  // (pas à chaque pixel) ; la frappe libre dans les champs texte/temps n'est pas
  // historisée (undo natif du navigateur dans le champ suffit pour ce cas).
  const historyPast = useRef([]);
  const historyFuture = useRef([]);
  const [canUndo, setCanUndo] = useState(false);
  const [canRedo, setCanRedo] = useState(false);

  const commitLines = useCallback((updater) => {
    setLines((prev) => {
      const next = typeof updater === 'function' ? updater(prev) : updater;
      if (next === prev) return prev;
      historyPast.current.push(prev);
      if (historyPast.current.length > MAX_HISTORY) historyPast.current.shift();
      historyFuture.current = [];
      setCanUndo(true);
      setCanRedo(false);
      return next;
    });
  }, []);

  const undo = useCallback(() => {
    setLines((prev) => {
      if (historyPast.current.length === 0) return prev;
      const previous = historyPast.current.pop();
      historyFuture.current.push(prev);
      setCanUndo(historyPast.current.length > 0);
      setCanRedo(true);
      return previous;
    });
  }, []);

  const redo = useCallback(() => {
    setLines((prev) => {
      if (historyFuture.current.length === 0) return prev;
      const nextState = historyFuture.current.pop();
      historyPast.current.push(prev);
      setCanUndo(true);
      setCanRedo(historyFuture.current.length > 0);
      return nextState;
    });
  }, []);

  // ── Player (monté seulement une fois l'étape « Sincronizar » atteinte) ──
  useEffect(() => {
    if (step !== 'sync' || !apiReady || !YT || !videoId || !hostRef.current) return undefined;
    let destroyed = false;
    const origin = typeof window !== 'undefined' ? window.location.origin : undefined;

    const player = new YT.Player(hostRef.current, {
      videoId,
      host: 'https://www.youtube-nocookie.com',
      playerVars: { rel: 0, modestbranding: 1, playsinline: 1, controls: 1, ...(origin ? { origin } : {}) },
      events: {
        onReady: (e) => {
          if (destroyed) return;
          setPlayerReady(true);
          try { setDuration(e.target.getDuration() || 0); } catch { /* ignore */ }
        },
        onStateChange: (e) => {
          if (destroyed) return;
          if (e.data === 1) setIsPlaying(true);
          else if (e.data === 2 || e.data === 0) setIsPlaying(false);
        },
      },
    });
    playerRef.current = player;

    return () => {
      destroyed = true;
      if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null; }
      try { player.destroy(); } catch { /* ignore */ }
      playerRef.current = null;
    };
  }, [step, apiReady, YT, videoId]);

  // ── Poll temps courant ──
  useEffect(() => {
    if (!playerReady) return undefined;
    pollRef.current = setInterval(() => {
      const p = playerRef.current;
      if (p && typeof p.getCurrentTime === 'function') setCurrentTime(p.getCurrentTime() || 0);
    }, 100);
    return () => { if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null; } };
  }, [playerReady]);

  const getTime = () => {
    const p = playerRef.current;
    return p && typeof p.getCurrentTime === 'function' ? p.getCurrentTime() : 0;
  };
  const seekTo = useCallback((t) => {
    const p = playerRef.current;
    if (p && typeof p.seekTo === 'function') p.seekTo(Math.max(0, t), true);
  }, []);
  const togglePlay = useCallback(() => {
    const p = playerRef.current;
    if (!p) return;
    if (isPlaying) p.pauseVideo(); else p.playVideo();
  }, [isPlaying]);
  const rewind = useCallback(() => seekTo(getTime() - REWIND_SECONDS), [seekTo]);

  // ── Vitesse de lecture (aide au calage des passages rapides) ──
  const applyPlaybackRate = useCallback((rate) => {
    const p = playerRef.current;
    if (p && typeof p.setPlaybackRate === 'function') p.setPlaybackRate(rate);
    setPlaybackRateState(rate);
  }, []);
  const cyclePlaybackRate = useCallback(() => {
    setPlaybackRateState((prevRate) => {
      const idx = PLAYBACK_RATES.indexOf(prevRate);
      const next = PLAYBACK_RATES[(idx + 1) % PLAYBACK_RATES.length];
      const p = playerRef.current;
      if (p && typeof p.setPlaybackRate === 'function') p.setPlaybackRate(next);
      return next;
    });
  }, []);

  // ── Édition des lignes (toutes les actions agissent sur la ligne sélectionnée = cursor) ──
  // Horloge réelle du navigateur au moment de l'appui — sert à calculer la durée de
  // maintien indépendamment de getCurrentTime() de YouTube, dont la granularité
  // interne (mise à jour par à-coups, ~250ms) rend un appui/relâchement rapide
  // souvent indiscernable (même valeur au press et au release).
  const holdStartWallClockRef = useRef(null);

  // Marque le DÉPART d'une ligne (efface un éventuel ancien temps de fin, devenu
  // caduc puisqu'il était lié à l'ancien départ).
  const markLineStart = useCallback((index) => {
    // On retranche la latence de réaction mesurée. Elle est en temps RÉEL ; convertie
    // en temps vidéo selon la vitesse de lecture (à 0.5×, 200ms réels = 100ms vidéo),
    // cohérent avec le calcul de la durée dans markLineEnd.
    const t = Math.max(0, getTime() - (latencyMs / 1000) * playbackRate);
    holdStartWallClockRef.current = performance.now();
    commitLines((prev) => prev.map((l, i) => (i === index ? { ...l, time: t, endTime: null } : l)));
  }, [commitLines, latencyMs, playbackRate]);

  // Marque la FIN d'une ligne (relâchement d'Espace) — durée = temps RÉEL écoulé
  // depuis l'appui (converti en temps vidéo selon la vitesse de lecture), pas
  // getCurrentTime() au relâchement. Fusionnée dans le même pas d'historique que
  // le départ (setLines direct, pas de nouveau commitLines) pour qu'un seul
  // Anular annule tout le geste maintenu.
  const markLineEnd = useCallback((index) => {
    const startedAt = holdStartWallClockRef.current;
    const elapsedRealSec = startedAt != null ? Math.max(0, (performance.now() - startedAt) / 1000) : 0;
    const elapsedVideoSec = elapsedRealSec * playbackRate;
    holdStartWallClockRef.current = null;
    setLines((prev) => prev.map((l, i) => {
      if (i !== index || l.time == null || elapsedVideoSec <= 0.03) return l;
      return { ...l, endTime: l.time + elapsedVideoSec };
    }));
  }, [playbackRate]);

  const markCursor = useCallback(() => {
    if (cursor < 0 || cursor >= lines.length) return;
    markLineStart(cursor);
    setCursor((c) => Math.min(c + 1, lines.length - 1));
  }, [cursor, lines.length, markLineStart]);

  const setLineText = useCallback((index, text) => {
    setLines((prev) => prev.map((l, i) => (i === index ? { ...l, text } : l)));
  }, []);

  // Édition directe d'un temps (début `time` ou fin `endTime`) en secondes, depuis
  // la liste de gauche ou le panneau du bas. Vide = null (temps non défini).
  const setLineTimeField = useCallback((index, field, raw) => {
    const num = raw === '' ? null : parseFloat(raw);
    const value = (num == null || Number.isNaN(num)) ? null : Math.max(0, num);
    setLines((prev) => prev.map((l, i) => (i === index ? { ...l, [field]: value } : l)));
  }, []);

  const addLineAfter = useCallback((index) => {
    commitLines((prev) => {
      const next = prev.slice();
      next.splice(index + 1, 0, { text: '', time: null, endTime: null });
      return next;
    });
    setCursor(index + 1);
  }, [commitLines]);

  const deleteLine = useCallback((index) => {
    commitLines((prev) => prev.filter((_, i) => i !== index));
    setCursor((c) => Math.max(0, c > index ? c - 1 : c));
  }, [commitLines]);

  // Duplique la ligne sélectionnée (même texte, sans temps) — pour un refrão répété.
  const duplicateLine = useCallback((index) => {
    commitLines((prev) => {
      const next = prev.slice();
      const src = next[index];
      if (!src) return prev;
      next.splice(index + 1, 0, { text: src.text, time: null, endTime: null });
      return next;
    });
    setCursor(index + 1);
  }, [commitLines]);

  // Insère une ligne vide au temps courant (pause auto), pour une parole oubliée.
  const insertAtPlayhead = useCallback(() => {
    try { playerRef.current?.pauseVideo?.(); } catch { /* ignore */ }
    const t = getTime();
    commitLines((prev) => {
      const next = prev.slice();
      let idx = next.length;
      for (let i = 0; i < next.length; i += 1) {
        if (next[i].time != null && next[i].time <= t) idx = i + 1;
      }
      next.splice(idx, 0, { text: '', time: t, endTime: null });
      return next;
    });
  }, [commitLines]);

  // « Reset From Current » : efface seulement les temps à partir de la ligne sélectionnée
  // (préserve le travail déjà fait avant) — vs « Reset All » qui efface tout.
  const resetFromCursor = useCallback(() => {
    commitLines((prev) => prev.map((l, i) => (i >= cursor ? { ...l, time: null, endTime: null } : l)));
  }, [cursor, commitLines]);

  const resetAll = useCallback(() => {
    commitLines((prev) => prev.map((l) => ({ ...l, time: null, endTime: null })));
    setCursor(0);
    seekTo(0);
  }, [commitLines, seekTo]);

  // Filet de sécurité : revient à l'état des lignes tel qu'il était à l'ouverture
  // de l'étape de sync (avant toute correction faite pendant cette session).
  const restoreInitial = useCallback(() => {
    if (!initialSyncLinesRef.current) return;
    commitLines(() => initialSyncLinesRef.current.map((l) => ({ ...l })));
    setCursor(0);
  }, [commitLines]);

  // Décale TOUTES les lignes déjà marquées d'un coup (ex. la chanson entière est
  // légèrement en avance/retard) — évite de refaire chaque ligne une par une.
  const shiftAll = useCallback((deltaMs) => {
    const delta = deltaMs / 1000;
    commitLines((prev) => prev.map((l) => (l.time != null ? { ...l, time: Math.max(0, l.time + delta) } : l)));
  }, [commitLines]);

  // Décale seulement la ligne SÉLECTIONNÉE (quand « Shift All » est désactivé).
  const nudgeCursorTime = useCallback((deltaMs) => {
    const delta = deltaMs / 1000;
    commitLines((prev) => prev.map((l, i) => (i === cursor && l.time != null ? { ...l, time: Math.max(0, l.time + delta) } : l)));
  }, [cursor, commitLines]);

  // Bouton ±100ms : agit sur TOUTES les lignes si shiftAllMode est actif (par défaut),
  // sinon uniquement sur la ligne actuellement sélectionnée.
  const applyShiftButton = useCallback((deltaMs) => {
    if (shiftAllMode) shiftAll(deltaMs); else nudgeCursorTime(deltaMs);
  }, [shiftAllMode, shiftAll, nudgeCursorTime]);

  // Applique une latence fraîchement mesurée. Si des lignes ont déjà été marquées avec
  // l'ancienne latence, on les recale par la DIFFÉRENCE (ex. avant 0ms, maintenant 120ms
  // → on avance de 120ms les lignes déjà posées). Persistée par appareil.
  const applyCalibration = useCallback((newLatency) => {
    const deltaMs = newLatency - latencyMs;
    const hasTimed = lines.some((l) => l.time != null);
    if (deltaMs !== 0 && hasTimed) shiftAll(-deltaMs);
    setLatencyMs(newLatency);
    try { localStorage.setItem(LATENCY_KEY, String(newLatency)); } catch { /* ignore */ }
    setIsCalibrating(false);
    toast({ title: `🎯 Calibrado: ${newLatency} ms`, description: 'As marcações Espaço/Enter vão compensar o teu tempo de reação automaticamente.' });
  }, [latencyMs, lines, shiftAll, toast]);

  const handleClose = useCallback(() => {
    try { playerRef.current?.pauseVideo?.(); } catch { /* ignore */ }
    onClose?.();
  }, [onClose]);

  // ── Clavier (désactivé pendant l'édition d'un champ texte) ──
  // Espace = maintenir/relâcher comme un chrono : on appuie quand la phrase COMMENCE
  // (capture le temps de départ de la ligne sélectionnée) et on relâche quand la
  // phrase SE TERMINE (avance à la ligne suivante). Enter reste un marquage instantané
  // (appui bref) pour les lignes très courtes/rapprochées.
  useEffect(() => {
    const onKeyDown = (e) => {
      if (isCalibrating) return; // la calibration capture Espace pour son propre test
      const tag = e.target?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA') return;

      if (e.key === ' ') {
        e.preventDefault();
        if (e.repeat) return; // ignore la répétition auto du navigateur pendant le maintien
        markLineStart(cursor);
        setIsHolding(true);
        return;
      }
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') {
        e.preventDefault();
        if (e.shiftKey) redo(); else undo();
        return;
      }
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'y') {
        e.preventDefault();
        redo();
        return;
      }
      if (e.key === 'Enter') {
        e.preventDefault();
        markCursor();
      } else if (e.key === 'Backspace') {
        e.preventDefault();
        undo();
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        rewind();
      } else if (e.key === 'p' || e.key === 'k') {
        e.preventDefault();
        togglePlay();
      } else if (e.key === 's') {
        e.preventDefault();
        cyclePlaybackRate();
      } else if (e.key === 'Escape') {
        e.preventDefault();
        handleClose();
      }
    };

    const onKeyUp = (e) => {
      if (isCalibrating) return;
      const tag = e.target?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA') return;
      if (e.key === ' ') {
        e.preventDefault();
        markLineEnd(cursor);
        setIsHolding(false);
        setCursor((c) => Math.min(c + 1, lines.length - 1));
      }
    };

    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
    };
  }, [cursor, lines.length, markLineStart, markLineEnd, markCursor, undo, redo, rewind, togglePlay, handleClose, cyclePlaybackRate, isCalibrating]);

  // ── Auto-scroll liste + frise vers la ligne sélectionnée ──
  useEffect(() => {
    listItemRefs.current[cursor]?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    activeBlockRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
  }, [cursor]);

  // ── Auto-scroll de la frise pour suivre la position de lecture (naviguer sans
  // perdre le curseur de vue), que la vidéo soit en lecture ou en pause après un seek.
  // Ne recentre QUE si le curseur sort de la zone visible (pas à chaque frame), pour
  // ne pas gêner un défilement manuel.
  useEffect(() => {
    const track = timelineTrackRef.current;
    if (!track) return;
    const playheadPx = currentTime * pxPerSecond;
    const viewLeft = track.scrollLeft;
    const viewWidth = track.clientWidth;
    const margin = viewWidth * 0.12;
    if (playheadPx < viewLeft + margin || playheadPx > viewLeft + viewWidth - margin) {
      track.scrollLeft = Math.max(0, playheadPx - viewWidth * 0.3);
    }
  }, [currentTime, pxPerSecond]);

  // Ligne active pour l'overlay — même logique gap-aware que le lecteur public
  // (endTime dépassé = aucune ligne active), MAIS on ne peut pas passer `lines` tel
  // quel à activeLineIndex() : celle-ci suppose un tableau déjà TRIÉ par temps et SANS
  // lignes non marquées (vrai pour un LRC parsé, faux ici — `lines` reste dans l'ordre
  // du texte, avec des `time: null` mélangés pendant la sync). En JS, `null <= t` vaut
  // `true` (coercion à 0), donc une ligne non marquée serait sinon prise pour la ligne
  // active. On construit donc d'abord la sous-liste triée des lignes déjà marquées.
  const { activeIdx, activeProgress } = useMemo(() => {
    const timed = lines
      .map((l, i) => ({ i, time: l.time, endTime: l.endTime }))
      .filter((l) => l.time != null)
      .sort((a, b) => a.time - b.time);
    const pos = activeLineIndex(timed, currentTime);
    if (pos === -1) return { activeIdx: -1, activeProgress: 0 };
    const cur = timed[pos];
    // Fin = endTime capté, sinon début de la ligne suivante (dans l'ordre du temps).
    const end = cur.endTime ?? timed[pos + 1]?.time ?? cur.time + 4;
    const progress = (currentTime - cur.time) / Math.max(0.2, end - cur.time);
    return { activeIdx: cur.i, activeProgress: progress };
  }, [lines, currentTime]);

  const syncedCount = lines.filter((l) => l.time != null).length;

  // ── Suivi automatique de la lecture ──
  // Quand la vidéo joue, la ligne ACTIVE devient la ligne SÉLECTIONNÉE (cursor) → les
  // champs Tempo/Fim, le bloc surligné et l'auto-scroll suivent la musique, pour
  // ajuster instantanément la ligne en cours (nudge ±100ms, re-marquage, drag après
  // pause). Garde-fous : on ne suit pas la « frontière de marquage » de la passe 1 (si
  // la ligne juste après l'active n'a pas encore de temps), ni pendant un geste Espace
  // maintenu, ni si un champ de saisie est focalisé (pour ne pas casser une frappe).
  useEffect(() => {
    if (!isPlaying || isHolding || activeIdx < 0) return;
    const ae = document.activeElement;
    if (ae && (ae.tagName === 'INPUT' || ae.tagName === 'TEXTAREA')) return;
    const aheadSynced = activeIdx >= lines.length - 1 || lines[activeIdx + 1]?.time != null;
    if (!aheadSynced) return;
    setCursor((c) => (c === activeIdx ? c : activeIdx));
  }, [isPlaying, isHolding, activeIdx, lines]);

  // ── Frise temporelle : zoom + drag pour ajuster le temps d'une ligne ──
  const zoomIn = () => setPxPerSecond((v) => Math.min(MAX_PX_PER_SEC, Math.round(v * 1.4)));
  const zoomOut = () => setPxPerSecond((v) => Math.max(MIN_PX_PER_SEC, Math.round(v / 1.4)));

  const totalSeconds = Math.max(duration || 0, (lines[lines.length - 1]?.time || 0) + 15, 30);
  const timelineWidth = totalSeconds * pxPerSecond;

  // Début de la ligne CHRONOLOGIQUEMENT suivante (plus petit temps strictement
  // supérieur à `startTime`) — robuste au chevauchement (l'ordre du texte peut ne
  // plus suivre l'ordre du temps une fois qu'on autorise les blocs à se superposer).
  const nextChronoStart = useCallback((startTime, selfIndex) => {
    let best = null;
    for (let i = 0; i < lines.length; i += 1) {
      if (i === selfIndex) continue;
      const tt = lines[i].time;
      if (tt != null && tt > startTime && (best == null || tt < best)) best = tt;
    }
    return best;
  }, [lines]);

  // Fin EFFECTIVE d'une ligne : le endTime manuel s'il existe (peut raccourcir OU
  // chevaucher la ligne suivante), sinon on s'aligne automatiquement sur le début du
  // bloc suivant (plus de cap fixe à 2s), sinon largeur par défaut si c'est la dernière.
  const effectiveEnd = useCallback((index) => {
    const line = lines[index];
    if (line?.time == null) return null;
    if (line.endTime != null && line.endTime > line.time) return line.endTime;
    const nextStart = nextChronoStart(line.time, index);
    return nextStart != null ? nextStart : line.time + DEFAULT_LINE_WIDTH_SEC;
  }, [lines, nextChronoStart]);

  const blockWidthFor = (index) => {
    const line = lines[index];
    if (line?.time == null) return 0;
    const end = effectiveEnd(index);
    const widthSec = Math.max(0.05, end - line.time);
    return Math.max(6, widthSec * pxPerSecond - 2);
  };

  // ── Contrôle qualité heuristique (zéro audio / zéro API) ──────────────────────
  // Lignes « suspectes », recalculées en direct : un trou au milieu (ligne sans
  // temps encadrée par deux lignes marquées = oubli de la passe 1), une durée trop
  // courte pour le texte (toque raté) ou beaucoup trop longue (ligne suivante non
  // marquée). Les lignes pas encore atteintes (sans ancre après) NE sont PAS signalées
  // → reste silencieux pendant le calage normal, s'allume seulement pour un vrai souci.
  const { warnSet, warnReason } = useMemo(() => {
    const set = new Set();
    const reason = {};
    const hasBefore = (idx) => { for (let k = idx - 1; k >= 0; k -= 1) if (lines[k].time != null) return true; return false; };
    const hasAfter = (idx) => { for (let k = idx + 1; k < lines.length; k += 1) if (lines[k].time != null) return true; return false; };
    lines.forEach((l, i) => {
      if (l.time == null) {
        if (hasBefore(i) && hasAfter(i)) { set.add(i); reason[i] = 'Sem tempo entre duas linhas marcadas — «Afinar auto» interpola'; }
        return;
      }
      const syl = countSyllables(l.text);
      const dur = effectiveEnd(i) - l.time;
      if (syl >= 3 && dur < 0.35) { set.add(i); reason[i] = 'Muito curta para o texto — provável toque errado'; }
      else if (syl <= 6 && dur > 12) { set.add(i); reason[i] = 'Muito longa — talvez falte marcar a linha seguinte'; }
    });
    return { warnSet: set, warnReason: reason };
  }, [lines, effectiveEnd]);

  // « Afinar auto » : correction structurelle en UN seul pas d'historique (donc
  // annulable d'un Ctrl+Z / Backspace, ou via « Restaurar versão inicial »).
  //  1) Interpole les lignes sans temps entre deux ancres, proportionnellement au
  //     nombre de syllabes (chant à débit ~constant sur une phrase → bonne approx).
  //  2) Répare l'ordre des débuts cassé par un glissement (chevauchement autorisé
  //     sur les FINS, mais les DÉBUTS doivent rester croissants dans l'ordre du texte).
  //  3) Nettoie les fins invalides (fin ≤ début → fin auto).
  const autoTune = useCallback(() => {
    const next = lines.map((l) => ({ ...l }));
    let interpolated = 0; let ordered = 0; let cleanedEnds = 0;

    let anchor = -1;
    for (let i = 0; i < next.length; i += 1) {
      if (next[i].time != null) {
        if (anchor !== -1 && i - anchor > 1) {
          const Sa = next[anchor].time;
          const Sb = next[i].time;
          if (Sb > Sa) {
            const weights = [];
            let total = 0;
            for (let k = anchor; k < i; k += 1) { const w = countSyllables(next[k].text); weights.push(w); total += w; }
            let acc = 0;
            for (let k = anchor; k < i; k += 1) {
              if (k > anchor && next[k].time == null) {
                next[k] = { ...next[k], time: Sa + (acc / total) * (Sb - Sa), endTime: null };
                interpolated += 1;
              }
              acc += weights[k - anchor];
            }
          }
        }
        anchor = i;
      }
    }

    for (let i = 1; i < next.length; i += 1) {
      if (next[i].time != null && next[i - 1].time != null && next[i].time < next[i - 1].time) {
        next[i] = { ...next[i], time: next[i - 1].time + 0.05 };
        ordered += 1;
      }
    }

    for (let i = 0; i < next.length; i += 1) {
      if (next[i].endTime != null && next[i].time != null && next[i].endTime <= next[i].time) {
        next[i] = { ...next[i], endTime: null };
        cleanedEnds += 1;
      }
    }

    if (interpolated + ordered + cleanedEnds === 0) {
      const stillNull = next.filter((l) => l.time == null).length;
      if (stillNull > 0) {
        toast({
          title: 'Nada para interpolar',
          description: `${stillNull} linha(s) sem tempo estão nas pontas (antes da 1ª ou depois da última marcada) — marca-as à mão com Espaço.`,
        });
      } else {
        toast({ title: 'Já está afinado ✅', description: 'Todas as linhas têm tempo e estão em ordem — nada a corrigir.' });
      }
      return;
    }
    commitLines(() => next);
    const parts = [];
    if (interpolated) parts.push(`${interpolated} linha(s) interpolada(s)`);
    if (ordered) parts.push(`${ordered} ordem corrigida`);
    if (cleanedEnds) parts.push(`${cleanedEnds} fim limpo`);
    toast({ title: '✨ Afinado', description: `${parts.join(' · ')}. Anula com Ctrl+Z ou «Restaurar versão inicial».` });
  }, [lines, commitLines, toast]);

  const handleBlockPointerDown = (index, e) => {
    e.preventDefault();
    e.stopPropagation();
    const line = lines[index];
    if (line.time == null) return;
    setCursor(index);
    // Une seule entrée d'historique pour tout le geste de glissement (pas une par pixel).
    historyPast.current.push(lines);
    if (historyPast.current.length > MAX_HISTORY) historyPast.current.shift();
    historyFuture.current = [];
    setCanUndo(true);
    setCanRedo(false);
    // Plus de clamp entre voisins : les blocs peuvent désormais se chevaucher
    // librement (une phrase peut rester affichée pendant que la suivante démarre).
    // Si la ligne a une fin manuelle, on déplace le bloc ENTIER (début ET fin) pour
    // préserver sa durée ; sinon seul le début bouge (la fin auto suit le bloc suivant).
    dragRef.current = {
      index,
      startX: e.clientX,
      startTime: line.time,
      startEnd: line.endTime,
      duration: line.endTime != null && line.endTime > line.time ? line.endTime - line.time : null,
    };
    const onMove = (ev) => {
      const d = dragRef.current;
      if (!d) return;
      const deltaSec = (ev.clientX - d.startX) / pxPerSecond;
      const t = Math.max(0, d.startTime + deltaSec);
      setLines((prev) => prev.map((l, i) => (
        i === d.index
          ? { ...l, time: t, endTime: d.duration != null ? t + d.duration : l.endTime }
          : l
      )));
    };
    const onUp = () => {
      dragRef.current = null;
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
    };
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
  };

  // Redimensionnement manuel du bloc par son bord droit : fixe un endTime explicite.
  // Permet de RACCOURCIR un bloc (fin avant le bloc suivant → petit silence) ou de le
  // prolonger au-delà (chevauchement volontaire avec la ligne suivante).
  const handleBlockResizePointerDown = (index, e) => {
    e.preventDefault();
    e.stopPropagation();
    const line = lines[index];
    if (line.time == null) return;
    setCursor(index);
    historyPast.current.push(lines);
    if (historyPast.current.length > MAX_HISTORY) historyPast.current.shift();
    historyFuture.current = [];
    setCanUndo(true);
    setCanRedo(false);
    const startX = e.clientX;
    const baseEnd = effectiveEnd(index); // point de départ = bord droit visible actuel
    const onMove = (ev) => {
      const deltaSec = (ev.clientX - startX) / pxPerSecond;
      const end = Math.max(line.time + 0.05, baseEnd + deltaSec);
      setLines((prev) => prev.map((l, i) => (i === index ? { ...l, endTime: end } : l)));
    };
    const onUp = () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
    };
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
  };

  // Clic sur une zone VIDE de la frise (pas sur un bloc — ceux-ci stoppent déjà la
  // propagation) : par défaut, NAVIGUE simplement jusqu'à cet instant (comme un vrai
  // curseur de lecture, que la vidéo joue ou soit en pause). Shift+clic garde l'ancien
  // comportement : insérer une ligne manquante exactement à cet instant.
  const handleTrackClick = (e) => {
    const track = timelineTrackRef.current;
    if (!track) return;
    const rect = track.getBoundingClientRect();
    const x = e.clientX - rect.left + track.scrollLeft;
    const t = Math.max(0, x / pxPerSecond);

    if (!e.shiftKey) {
      seekTo(t);
      return;
    }

    let insertIdx = lines.length;
    for (let i = 0; i < lines.length; i += 1) {
      if (lines[i].time != null && lines[i].time <= t) insertIdx = i + 1;
    }
    commitLines((prev) => {
      const next = prev.slice();
      next.splice(insertIdx, 0, { text: '', time: t, endTime: null });
      return next;
    });
    setCursor(insertIdx);
  };

  // Marques de règle (toutes les 1s, 2s ou 5s selon le zoom pour rester lisible).
  const tickStep = pxPerSecond >= 60 ? 1 : pxPerSecond >= 25 ? 2 : 5;
  const ticks = [];
  for (let s = 0; s <= totalSeconds; s += tickStep) ticks.push(s);

  const currentLine = activeIdx >= 0 ? lines[activeIdx] : null;
  const nextLine = activeIdx + 1 < lines.length ? lines[activeIdx + 1] : null;

  // ── Sauvegarde ──
  const handleSave = async () => {
    const lrc = buildLrc(lines);
    if (!lrc) {
      toast({ title: 'Nada para guardar', description: 'Marca pelo menos uma linha antes de guardar.', variant: 'destructive' });
      return;
    }
    setIsSaving(true);
    try {
      try { await supabase.auth.refreshSession(); } catch { /* pas de session → diagnostic plus bas */ }

      const payload = { lrc_content: lrc, karaoke_synced_at: new Date().toISOString() };
      if (syncLyricsToo) {
        const joined = lines.map((l) => l.text.trim()).filter(Boolean).join('\n');
        if (joined) payload.lyrics = joined;
      }

      const { data, error } = await supabase
        .from('songs')
        .update(payload)
        .eq('id', song.id)
        .select();

      if (error) throw new Error(describeSaveError(error));
      if (!data || data.length === 0) {
        throw new Error(await diagnoseZeroRows());
      }

      toast({ title: '✅ Karaokê sincronizado!', description: `${syncedCount} linhas guardadas. Podes continuar a afinar ou voltar quando quiseres.` });
      onSaved?.(data[0]);
      // Le point de sauvegarde devient la nouvelle référence pour « Restaurar versão inicial ».
      initialSyncLinesRef.current = lines.map((l) => ({ ...l }));
    } catch (err) {
      toast({ title: 'Erro ao guardar', description: err.message, variant: 'destructive' });
    } finally {
      setIsSaving(false);
    }
  };

  const noVideo = !videoId;

  return createPortal(
    <div className="fixed inset-0 z-[9999] flex flex-col bg-[#0b0710] text-white">
      {/* Header — breadcrumb + Cancelar/Guardar */}
      <header className="flex items-center justify-between border-b border-white/10 px-4 py-2.5">
        <div className="flex min-w-0 items-center gap-1.5 text-sm text-white/50">
          <button
            onClick={handleClose}
            title="Voltar à lista de músicas"
            className="karaoke-focusable mr-2 flex shrink-0 items-center gap-1.5 rounded-lg border border-white/10 bg-white/5 px-2.5 py-1.5 text-xs font-semibold text-gray-300 hover:bg-white/10 hover:text-white"
          >
            <ArrowLeft size={14} /> Voltar
          </button>
          <Music size={15} className="mr-1 shrink-0 text-purple-400" />
          <span className="hidden sm:inline">Karaokê</span>
          <ChevronRight size={13} className="hidden shrink-0 sm:inline" />
          <span className="truncate font-semibold text-white">{effectiveSong?.title}</span>
          <ChevronRight size={13} className="shrink-0" />
          <span className="shrink-0 text-purple-300">{step === 'lyrics' ? 'Letra' : 'Sincronizar'}</span>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <button onClick={handleClose} className="rounded-lg px-3 py-1.5 text-sm text-gray-300 hover:bg-white/10">
            Cancelar
          </button>
          {step === 'sync' && (
            <button
              onClick={handleSave}
              disabled={isSaving || syncedCount === 0}
              className="karaoke-focusable inline-flex items-center gap-2 rounded-lg bg-purple-600 px-4 py-1.5 text-sm font-semibold hover:bg-purple-700 disabled:opacity-40"
            >
              {isSaving ? <Loader2 size={15} className="animate-spin" /> : <Save size={15} />}
              Guardar
            </button>
          )}
        </div>
      </header>

      {step === 'lyrics' ? (
        <div className="flex flex-1 items-center justify-center overflow-y-auto px-4 py-8">
          <div className="w-full max-w-2xl space-y-4">
            {/* En-tête */}
            <div className="flex items-center gap-3 px-1">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-purple-600/20 text-purple-300">
                <Music size={19} />
              </div>
              <div>
                <h1 className="text-lg font-bold text-white">Sincronizar karaokê</h1>
                <p className="text-xs text-gray-500">Mantém o vídeo original e sincroniza a letra</p>
              </div>
            </div>

            {/* Étape 1 — título (confirmação) */}
            <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
              <div className="mb-3 flex items-center gap-3">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-purple-600 text-xs font-bold text-white">1</span>
                <div>
                  <h2 className="text-sm font-bold text-white">Título da música</h2>
                  <p className="text-xs text-gray-500">Confirma que é a música certa antes de continuar</p>
                </div>
              </div>
              <div className="rounded-xl border border-white/10 bg-black/30 px-4 py-2.5 text-sm font-semibold text-white">
                {effectiveSong?.title}
              </div>
            </div>

            {/* Étape 2 — letra */}
            <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
              <div className="mb-3 flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-purple-600 text-xs font-bold text-white">2</span>
                  <div>
                    <h2 className="text-sm font-bold text-white">Letra da música</h2>
                    <p className="text-xs text-gray-500">Uma linha por frase cantada, na ordem da música (repete o refrão se for 2×)</p>
                  </div>
                </div>
                <button
                  onClick={handlePasteLyrics}
                  className="karaoke-focusable inline-flex shrink-0 items-center gap-1.5 rounded-lg border border-white/10 bg-white/5 px-2.5 py-1.5 text-xs font-semibold text-gray-300 hover:bg-white/10"
                >
                  <ClipboardPaste size={13} /> Paste
                </button>
              </div>
              <textarea
                value={lyricsDraft}
                onChange={(e) => { userEditedLyricsRef.current = true; setLyricsDraft(e.target.value); }}
                rows={12}
                placeholder="Cola ou escreve a letra aqui, uma linha por linha…"
                className="w-full resize-y rounded-xl border border-white/10 bg-black/30 px-4 py-3 font-mono text-sm text-white outline-none focus:border-purple-400/50"
              />
              <div className="mt-3 flex items-center justify-between">
                <span className="flex items-center gap-1.5 text-xs text-gray-500">
                  <FileText size={12} /> {splitLyricsLines(lyricsDraft).length} linha(s)
                </span>
                <button
                  onClick={proceedToSync}
                  disabled={splitLyricsLines(lyricsDraft).length === 0}
                  className="karaoke-focusable inline-flex items-center gap-2 rounded-lg bg-purple-600 px-5 py-2 text-sm font-semibold hover:bg-purple-700 disabled:opacity-40"
                >
                  Sincronizar <ChevronRight size={16} />
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : noVideo ? (
        <div className="flex flex-1 flex-col items-center justify-center gap-3 px-6 text-center text-gray-400">
          <Music className="h-10 w-10 text-gray-600" />
          <p className="max-w-md text-sm">
            Esta música não tem um link YouTube válido em <code className="text-purple-300">youtube_url</code> (vídeo único).
            Adiciona um link antes de sincronizar.
          </p>
        </div>
      ) : (
        <>
          <div className="flex min-h-0 flex-1 overflow-hidden">
            {/* Liste des lignes */}
            <div className="w-[300px] shrink-0 overflow-y-auto border-r border-white/10 sm:w-[360px]">
              <div className="sticky top-0 z-10 flex items-center gap-2 border-b border-white/10 bg-[#0b0710]/95 px-3 py-1.5 text-[9px] font-bold uppercase tracking-wider text-white/35 backdrop-blur">
                <span className="w-[52px] shrink-0 text-center text-app-yellow/60">Início</span>
                <span className="w-[52px] shrink-0 text-center text-emerald-300/60">Fim</span>
                <span className="flex-1">Letra (s = segundos)</span>
              </div>
              <InterRowAddButton onClick={() => addLineAfter(-1)} />
              {lines.map((line, i) => {
                const isCursor = i === cursor;
                const isSynced = line.time != null;
                return (
                  <div key={i}>
                    <div
                      ref={(el) => { listItemRefs.current[i] = el; }}
                      onClick={() => { setCursor(i); if (line.time != null) seekTo(line.time); }}
                      className={`group flex cursor-pointer items-center gap-2 px-3 py-1.5 text-sm transition-colors ${
                        isCursor && isHolding ? 'bg-red-500/20 ring-1 ring-inset ring-red-400/60'
                          : isCursor ? 'bg-purple-500/15'
                          : i === activeIdx ? 'bg-emerald-500/10'
                          : 'hover:bg-white/5'
                      }`}
                    >
                      {isCursor && isHolding && (
                        <span className="h-2 w-2 shrink-0 animate-pulse rounded-full bg-red-500" title="A gravar…" />
                      )}
                      {/* Início (s) éditable */}
                      <input
                        type="number" step="0.1" min="0" inputMode="decimal"
                        value={line.time != null ? round2(line.time) : ''}
                        onChange={(e) => setLineTimeField(i, 'time', e.target.value)}
                        onFocus={() => setCursor(i)}
                        onClick={(e) => e.stopPropagation()}
                        placeholder="—"
                        title="Início (segundos) — editável"
                        className="w-[52px] shrink-0 rounded bg-white/5 px-1 py-0.5 text-center font-mono text-[11px] text-app-yellow/90 outline-none focus:bg-white/10 focus:ring-1 focus:ring-app-yellow/40"
                      />
                      {/* Fim (s) éditable */}
                      <input
                        type="number" step="0.1" min="0" inputMode="decimal"
                        value={line.endTime != null ? round2(line.endTime) : ''}
                        onChange={(e) => setLineTimeField(i, 'endTime', e.target.value)}
                        onFocus={() => setCursor(i)}
                        onClick={(e) => e.stopPropagation()}
                        placeholder="···"
                        title="Fim (segundos) — editável, vazio = usa o início da linha seguinte"
                        className="w-[52px] shrink-0 rounded bg-white/5 px-1 py-0.5 text-center font-mono text-[11px] text-emerald-300/90 outline-none focus:bg-white/10 focus:ring-1 focus:ring-emerald-400/40"
                      />
                      <input
                        value={line.text}
                        onChange={(e) => setLineText(i, e.target.value)}
                        onFocus={() => setCursor(i)}
                        onClick={(e) => e.stopPropagation()}
                        placeholder="(texto)"
                        className={`min-w-0 flex-1 rounded bg-transparent px-1.5 py-1 outline-none focus:bg-white/5 ${
                          isCursor
                            ? 'ring-1 ring-purple-400/60 rounded-md text-white'
                            : 'text-gray-300'
                        }`}
                      />
                      {warnSet.has(i) && (
                        <AlertTriangle
                          size={13}
                          className="shrink-0 text-amber-400"
                          title={warnReason[i] || 'Verifica esta linha'}
                        />
                      )}
                      {isSynced && (
                        <button
                          onClick={(e) => { e.stopPropagation(); commitLines((prev) => prev.map((l, li) => (li === i ? { ...l, time: null, endTime: null } : l))); }}
                          title="Limpar o tempo desta linha (para a re-marcar)"
                          className="shrink-0 rounded p-1 text-gray-600 opacity-0 transition hover:bg-white/10 hover:text-amber-300 group-hover:opacity-100"
                        >
                          <RotateCcw size={12} />
                        </button>
                      )}
                      <button
                        onClick={(e) => { e.stopPropagation(); deleteLine(i); }}
                        title="Apagar esta linha"
                        className="shrink-0 rounded p-1 text-gray-600 opacity-0 transition hover:bg-red-500/20 hover:text-red-400 group-hover:opacity-100"
                      >
                        <Trash2 size={12} />
                      </button>
                    </div>
                    <InterRowAddButton onClick={() => addLineAfter(i)} />
                  </div>
                );
              })}
              {lines.length === 0 && (
                <p className="px-4 py-8 text-center text-sm text-gray-500">
                  Sem letra. Preenche o campo « letra » no formulário antes de sincronizar.
                </p>
              )}
              <button
                onClick={() => addLineAfter(lines.length - 1)}
                className="karaoke-focusable flex w-full items-center justify-center gap-1.5 py-3 text-xs text-gray-500 hover:text-purple-300"
              >
                <Plus size={13} /> Adicionar linha
              </button>
            </div>

            {/* Vidéo + overlay karaoké */}
            <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
              <div className="relative w-full shrink-0 bg-black" style={{ aspectRatio: '16/9', maxHeight: '38vh' }}>
                {(!apiReady || !playerReady) && !apiError && (
                  <div className="absolute inset-0 z-10 flex items-center justify-center gap-2 text-white/60">
                    <Loader2 className="h-6 w-6 animate-spin" /> A carregar o leitor…
                  </div>
                )}
                {apiError && (
                  <div className="absolute inset-0 z-10 flex items-center justify-center px-4 text-center text-sm text-white/60">
                    Não foi possível carregar a YouTube API (verifica o CSP / rede).
                  </div>
                )}
                <div ref={hostRef} className="h-full w-full" />
              </div>

              {/* Overlay façon lecteur public (avec balayage + balle, comme le public verra) */}
              <div className="karaoke-lyrics relative flex min-h-0 flex-1 flex-col items-center justify-center gap-3 overflow-hidden bg-[radial-gradient(circle_at_50%_30%,rgba(147,51,234,0.18),transparent_60%)] px-6 py-6 text-center">
                <p className="max-w-2xl text-2xl font-black leading-tight sm:text-3xl">
                  {currentLine
                    ? <KaraokeWipeLine text={currentLine.text || '♪'} progress={activeProgress} />
                    : <span className="text-app-yellow">{activeIdx < 0 ? '♪' : ''}</span>}
                </p>
                {nextLine && (
                  <p className="max-w-2xl text-base font-semibold text-white/40 sm:text-lg">
                    {nextLine.text || '♪'}
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Barre d'outils */}
          <div className="flex flex-wrap items-center justify-center gap-1.5 border-t border-white/10 bg-black/40 px-3 py-2">
            <button onClick={togglePlay} disabled={!playerReady} title={isPlaying ? 'Pausar (P)' : 'Tocar (P)'}
              className="karaoke-focusable inline-flex h-9 w-9 items-center justify-center rounded-lg bg-purple-600 hover:bg-purple-700 disabled:opacity-40">
              {isPlaying ? <Pause size={16} /> : <Play size={16} className="ml-0.5 fill-current" />}
            </button>
            <ToolButton
              onClick={markCursor}
              disabled={!playerReady || cursor < 0 || cursor >= lines.length}
              title="Marcar linha atual — mantém Espaço do início ao fim da frase (grava início E fim), ou Enter para marcar já sem fim"
              active
              recording={isHolding}
            >
              <Crosshair size={15} />
            </ToolButton>
            <ToolButton onClick={insertAtPlayhead} disabled={!playerReady} title="Inserir linha em falta neste instante">
              <Plus size={15} />
            </ToolButton>
            <ToolButton onClick={() => duplicateLine(cursor)} title="Duplicar linha (refrão)">
              <Copy size={15} />
            </ToolButton>
            <ToolButton onClick={() => deleteLine(cursor)} title="Apagar linha">
              <Trash2 size={15} />
            </ToolButton>
            <ToolButton onClick={undo} disabled={!canUndo} title="Anular (Backspace / Ctrl+Z)">
              <Undo2 size={15} />
            </ToolButton>
            <ToolButton onClick={redo} disabled={!canRedo} title="Refazer (Ctrl+Shift+Z)">
              <Redo2 size={15} />
            </ToolButton>
            <div className="mx-1 h-6 w-px bg-white/10" />
            <ToolButton onClick={() => seekTo(0)} title="Ir para o início">
              <ChevronsLeft size={15} />
            </ToolButton>
            <ToolButton onClick={() => setCursor((c) => Math.max(0, c - 1))} disabled={cursor <= 0} title="Linha anterior">
              <ChevronLeft size={15} />
            </ToolButton>
            <ToolButton onClick={() => setCursor((c) => Math.min(lines.length - 1, c + 1))} disabled={cursor >= lines.length - 1} title="Próxima linha">
              <ChevronRight size={15} />
            </ToolButton>
            <ToolButton onClick={() => seekTo(duration || getTime())} title="Ir para o fim">
              <ChevronsRight size={15} />
            </ToolButton>
            <span className="ml-2 font-mono text-xs text-gray-400">{formatTimestamp(currentTime)}</span>
            <label className="ml-auto flex cursor-pointer items-center gap-1.5 text-[11px] text-gray-500">
              <input type="checkbox" checked={syncLyricsToo} onChange={(e) => setSyncLyricsToo(e.target.checked)} className="accent-purple-600" />
              Atualizar letra também
            </label>
          </div>

          {/* Barre d'outils 2 : vitesse de lecture + resets + décalage global */}
          <div className="flex flex-wrap items-center justify-center gap-1.5 border-t border-white/5 bg-black/25 px-3 py-1.5">
            <span className="text-[11px] text-gray-500">Velocidade</span>
            <div className="flex items-center gap-0.5 rounded-lg border border-white/10 bg-white/5 p-0.5">
              {PLAYBACK_RATES.map((rate) => (
                <button
                  key={rate}
                  onClick={() => applyPlaybackRate(rate)}
                  title={rate === 1 ? 'Velocidade normal (S para alternar)' : `${rate}× — mais lento para passagens rápidas`}
                  className={`karaoke-focusable rounded px-2 py-1 text-[11px] font-semibold transition-colors ${
                    playbackRate === rate ? 'bg-purple-600 text-white' : 'text-gray-400 hover:bg-white/10 hover:text-white'
                  }`}
                >
                  {rate}×
                </button>
              ))}
            </div>

            <div className="mx-1 h-5 w-px bg-white/10" />

            <button onClick={resetFromCursor} title="Reset From Current — apaga os tempos a partir da linha selecionada, preserva o resto"
              className="karaoke-focusable inline-flex items-center gap-1 rounded-lg border border-amber-500/30 bg-amber-500/10 px-2 py-1 text-[11px] font-semibold text-amber-300 hover:bg-amber-500/20">
              <History size={12} /> Reset From Current
            </button>
            <button onClick={resetAll} title="Reset All — apaga todos os tempos"
              className="karaoke-focusable inline-flex items-center gap-1 rounded-lg border border-red-500/30 bg-red-500/10 px-2 py-1 text-[11px] font-semibold text-red-300 hover:bg-red-500/20">
              <RotateCcw size={12} /> Reset All
            </button>
            <button onClick={restoreInitial} disabled={!initialSyncLinesRef.current} title="Restaurar a versão de quando abriste esta sincronização"
              className="karaoke-focusable inline-flex items-center gap-1 rounded-lg border border-white/10 bg-white/5 px-2 py-1 text-[11px] font-semibold text-gray-300 hover:bg-white/10 disabled:opacity-30">
              Restaurar versão inicial
            </button>

            <div className="mx-1 h-5 w-px bg-white/10" />

            <label className="flex cursor-pointer items-center gap-1.5 text-[11px] text-gray-400" title="Ativado: os botões ±100ms afetam TODAS as linhas. Desativado: afetam só a linha selecionada.">
              <input type="checkbox" checked={shiftAllMode} onChange={(e) => setShiftAllMode(e.target.checked)} className="accent-purple-600" />
              Shift All
            </label>
            <button
              onClick={() => applyShiftButton(-100)}
              title={shiftAllMode ? 'Adiantar TODAS as linhas 100ms' : 'Adiantar a linha selecionada 100ms'}
              className="karaoke-focusable rounded-lg border border-white/10 bg-white/5 px-2 py-1 text-[11px] font-semibold text-gray-300 hover:bg-white/10"
            >
              −100ms
            </button>
            <button
              onClick={() => applyShiftButton(100)}
              title={shiftAllMode ? 'Atrasar TODAS as linhas 100ms' : 'Atrasar a linha selecionada 100ms'}
              className="karaoke-focusable rounded-lg border border-white/10 bg-white/5 px-2 py-1 text-[11px] font-semibold text-gray-300 hover:bg-white/10"
            >
              +100ms
            </button>

            <div className="mx-1 h-5 w-px bg-white/10" />

            <button
              onClick={() => setIsCalibrating(true)}
              title="Calibrar o teu tempo de reação: carrega Espaço quando o círculo acender. As marcações passam a compensá-lo sozinhas — dispensa o ajuste ±100ms."
              className={`karaoke-focusable inline-flex items-center gap-1 rounded-lg border px-2 py-1 text-[11px] font-semibold transition-colors ${
                latencyMs > 0
                  ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300 hover:bg-emerald-500/20'
                  : 'border-white/10 bg-white/5 text-gray-300 hover:bg-white/10'
              }`}
            >
              <Gauge size={12} /> Calibrar{latencyMs > 0 ? ` · ${latencyMs}ms` : ''}
            </button>

            <div className="mx-1 h-5 w-px bg-white/10" />

            <button
              onClick={autoTune}
              title="Afinar automaticamente (sem áudio): interpola linhas em falta proporcional ao texto, corrige a ordem e limpa fins inválidos. Totalmente reversível (Ctrl+Z ou «Restaurar versão inicial»)."
              className="karaoke-focusable inline-flex items-center gap-1 rounded-lg border border-violet-400/40 bg-violet-500/15 px-2.5 py-1 text-[11px] font-semibold text-violet-200 hover:bg-violet-500/25"
            >
              <Sparkles size={12} /> Afinar auto
              {warnSet.size > 0 && (
                <span className="ml-0.5 rounded-full bg-amber-500/80 px-1.5 text-[9px] font-bold text-black">{warnSet.size}</span>
              )}
            </button>
          </div>

          {/* Édition directe de la ligne sélectionnée : texte + temps en segundos tapáveis */}
          <div className="flex items-center gap-2 border-t border-white/5 bg-black/30 px-3 py-2">
            <span className="shrink-0 text-[11px] font-semibold uppercase tracking-wide text-gray-500">Linha {cursor + 1}/{lines.length}</span>
            <input
              value={lines[cursor]?.text ?? ''}
              onChange={(e) => setLineText(cursor, e.target.value)}
              disabled={cursor < 0 || cursor >= lines.length}
              placeholder="Texto da linha selecionada…"
              className="min-w-0 flex-1 rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-sm text-white outline-none focus:border-purple-400/50 disabled:opacity-40"
            />
            <label className="flex shrink-0 items-center gap-1.5 text-xs text-gray-400">
              Tempo (s)
              <input
                type="number"
                step="0.01"
                min="0"
                value={lines[cursor]?.time != null ? lines[cursor].time.toFixed(2) : ''}
                onChange={(e) => {
                  const val = e.target.value;
                  const num = val === '' ? null : parseFloat(val);
                  setLines((prev) => prev.map((l, i) => (i === cursor ? { ...l, time: num == null || Number.isNaN(num) ? null : Math.max(0, num) } : l)));
                }}
                disabled={cursor < 0 || cursor >= lines.length}
                placeholder="--"
                className="w-20 rounded-lg border border-white/10 bg-white/5 px-2 py-1.5 text-center font-mono text-sm text-app-yellow outline-none focus:border-app-yellow/50 disabled:opacity-40"
              />
            </label>
            <label className="flex shrink-0 items-center gap-1.5 text-xs text-gray-400" title="Fim real da frase (Espaço maintido/relâchement) — deixa vazio para usar o início da linha seguinte">
              Fim (s)
              <input
                type="number"
                step="0.01"
                min="0"
                value={lines[cursor]?.endTime != null ? lines[cursor].endTime.toFixed(2) : ''}
                onChange={(e) => {
                  const val = e.target.value;
                  const num = val === '' ? null : parseFloat(val);
                  setLines((prev) => prev.map((l, i) => (i === cursor ? { ...l, endTime: num == null || Number.isNaN(num) ? null : Math.max(0, num) } : l)));
                }}
                disabled={cursor < 0 || cursor >= lines.length}
                placeholder={
                  lines[cursor]?.time != null && lines[cursor]?.endTime == null
                    ? `≈${round2(effectiveEnd(cursor))}`
                    : '—'
                }
                title="Vazio = fim automático, alinhado ao início da linha seguinte (valor ≈ mostrado). Escreve um número para encurtar ou sobrepor."
                className="w-20 rounded-lg border border-white/10 bg-white/5 px-2 py-1.5 text-center font-mono text-sm text-emerald-300 outline-none focus:border-emerald-400/50 placeholder:text-emerald-300/30 disabled:opacity-40"
              />
            </label>
          </div>

          {/* Frise temporelle */}
          <div className="shrink-0 border-t border-white/10 bg-black/60">
            <div
              ref={timelineTrackRef}
              onClick={handleTrackClick}
              title="Clica para navegar até este instante · Shift+clique para adicionar uma linha aqui"
              className="relative h-[74px] cursor-pointer overflow-x-auto overflow-y-hidden select-none"
            >
              <div className="relative h-full" style={{ width: timelineWidth }}>
                {/* Règle */}
                <div className="absolute inset-x-0 top-0 h-5 border-b border-white/10">
                  {ticks.map((s) => (
                    <span
                      key={s}
                      className="absolute top-0 border-l border-white/10 pl-1 text-[9px] text-white/30"
                      style={{ left: s * pxPerSecond, height: '100%' }}
                    >
                      {formatShort(s)}
                    </span>
                  ))}
                </div>

                {/* Blocs de lignes */}
                {lines.map((line, i) => {
                  if (line.time == null) return null;
                  const isCursor = i === cursor;
                  return (
                    <div
                      key={i}
                      ref={isCursor ? activeBlockRef : null}
                      onPointerDown={(e) => handleBlockPointerDown(i, e)}
                      onClick={(e) => { e.stopPropagation(); setCursor(i); seekTo(line.time); }}
                      title={line.endTime != null ? `${line.text} (fim manual) — arrasta o corpo para mover, o bordo direito para ajustar o fim` : `${line.text} — fim alinhado à linha seguinte · arrasta o bordo direito para encurtar/sobrepor`}
                      className={`group/block absolute top-6 flex h-10 cursor-grab items-center overflow-hidden rounded pl-1.5 pr-2 text-[10px] font-semibold active:cursor-grabbing ${
                        line.endTime == null ? 'border-dashed' : ''
                      } ${warnSet.has(i) ? 'ring-1 ring-amber-400/70' : ''} ${
                        isCursor
                          ? 'z-10 border-2 border-app-yellow bg-app-yellow/20 text-app-yellow'
                          : i === activeIdx
                          ? 'border border-emerald-400/50 bg-emerald-500/15 text-emerald-300'
                          : 'border border-white/15 bg-white/10 text-white/70'
                      }`}
                      style={{ left: line.time * pxPerSecond, width: blockWidthFor(i) }}
                    >
                      <span className="truncate">{line.text || '♪'}</span>
                      {/* Poignée de redimensionnement (bord droit) : fixe/ajuste le endTime */}
                      <span
                        onPointerDown={(e) => handleBlockResizePointerDown(i, e)}
                        onClick={(e) => e.stopPropagation()}
                        title="Arrastar para ajustar o fim (encurtar ou sobrepor a linha seguinte)"
                        className="absolute right-0 top-0 h-full w-2 cursor-ew-resize rounded-r bg-white/10 opacity-0 transition group-hover/block:opacity-100 hover:!bg-app-yellow/70"
                      />
                    </div>
                  );
                })}

                {/* Playhead */}
                <div
                  className="pointer-events-none absolute top-0 h-full w-px bg-red-500"
                  style={{ left: currentTime * pxPerSecond }}
                >
                  <div className="absolute -left-[3px] -top-0.5 h-1.5 w-1.5 rounded-full bg-red-500" />
                </div>
              </div>
            </div>
            <div className="flex items-center justify-center gap-2 border-t border-white/5 py-1">
              <button onClick={zoomOut} className="karaoke-focusable rounded p-1 text-gray-400 hover:bg-white/10 hover:text-white">
                <Minus size={13} />
              </button>
              <span className="w-10 text-center text-[10px] text-gray-500">{pxPerSecond}px/s</span>
              <button onClick={zoomIn} className="karaoke-focusable rounded p-1 text-gray-400 hover:bg-white/10 hover:text-white">
                <Plus size={13} />
              </button>
            </div>
          </div>

          {isCalibrating && (
            <LatencyCalibration
              currentLatency={latencyMs}
              onApply={applyCalibration}
              onCancel={() => setIsCalibrating(false)}
            />
          )}
        </>
      )}
    </div>,
    document.body
  );
}

// Zone fine entre deux lignes de la liste : affiche un « + » au survol pour
// insérer une ligne manquante exactement à cet endroit du texte (sans temps).
function InterRowAddButton({ onClick }) {
  return (
    <div className="group flex h-2 items-center justify-center">
      <button
        onClick={onClick}
        title="Adicionar linha aqui"
        className="karaoke-focusable flex h-4 w-4 items-center justify-center rounded-full bg-white/10 text-gray-500 opacity-0 transition group-hover:opacity-100 hover:bg-purple-600 hover:text-white"
      >
        <Plus size={11} />
      </button>
    </div>
  );
}

/**
 * Test de réaction pour mesurer la latence « voir/entendre → taper Espace » de
 * l'utilisateur. Une série de flashs (+ bips) apparaît à des instants aléatoires ;
 * on mesure l'écart entre l'allumage réel (relevé dans un rAF, = paint effectif) et
 * l'appui. Médiane des mesures (1er flash ignoré = échauffement) → latence appliquée
 * automatiquement à chaque marquage, ce qui rend la passe « Shift All » inutile.
 */
function LatencyCalibration({ currentLatency, onApply, onCancel }) {
  const [done, setDone] = useState(0);        // nombre de flashs déjà réagis
  const [lit, setLit] = useState(false);      // le cercle est allumé maintenant
  const [tooEarly, setTooEarly] = useState(false);
  const [result, setResult] = useState(null); // latence médiane (ms) une fois terminé

  const litAtRef = useRef(null);
  const samplesRef = useRef([]);
  const timeoutRef = useRef(null);
  const audioCtxRef = useRef(null);
  const finishedRef = useRef(false);

  const beep = useCallback(() => {
    try {
      let ctx = audioCtxRef.current;
      if (!ctx) { ctx = new (window.AudioContext || window.webkitAudioContext)(); audioCtxRef.current = ctx; }
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.frequency.value = 880;
      gain.gain.setValueAtTime(0.0001, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.25, ctx.currentTime + 0.01);
      gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.12);
      osc.connect(gain); gain.connect(ctx.destination);
      osc.start(); osc.stop(ctx.currentTime + 0.13);
    } catch { /* áudio indisponível — o flash visual chega */ }
  }, []);

  const scheduleFlash = useCallback(() => {
    const gap = CAL_MIN_GAP + Math.random() * (CAL_MAX_GAP - CAL_MIN_GAP);
    timeoutRef.current = setTimeout(() => {
      setLit(true);
      // On relève l'instant d'allumage APRÈS le paint (rAF) pour qu'il corresponde à
      // ce que l'œil voit et à l'instant du bip, pas à l'appel setState.
      requestAnimationFrame(() => { litAtRef.current = performance.now(); beep(); });
    }, gap);
  }, [beep]);

  const finish = useCallback(() => {
    finishedRef.current = true;
    const s = samplesRef.current;
    const useful = s.length > 1 ? s.slice(1) : s; // ignore le 1er (échauffement)
    const sorted = useful.slice().sort((a, b) => a - b);
    const mid = Math.floor(sorted.length / 2);
    const median = sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
    setResult(Math.max(0, Math.min(MAX_LATENCY, Math.round(median))));
  }, []);

  const retry = useCallback(() => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    samplesRef.current = [];
    finishedRef.current = false;
    setDone(0); setResult(null); setLit(false); setTooEarly(false);
    scheduleFlash();
  }, [scheduleFlash]);

  // Démarrage + nettoyage.
  useEffect(() => {
    scheduleFlash();
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      try { audioCtxRef.current?.close(); } catch { /* ignore */ }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Capture d'Espace (phase capture → passe avant le listener principal, doublé du
  // garde isCalibrating côté parent).
  useEffect(() => {
    const onKey = (e) => {
      if (e.key !== ' ' && e.code !== 'Space') return;
      e.preventDefault();
      e.stopPropagation();
      if (e.repeat || finishedRef.current || result != null) return;
      if (!lit) { // appui anticipé : on ignore et on signale
        setTooEarly(true);
        setTimeout(() => setTooEarly(false), 500);
        return;
      }
      const delta = performance.now() - (litAtRef.current || performance.now());
      samplesRef.current.push(delta);
      setLit(false);
      const n = samplesRef.current.length;
      setDone(n);
      if (n >= CAL_FLASHES) finish(); else scheduleFlash();
    };
    window.addEventListener('keydown', onKey, true);
    return () => window.removeEventListener('keydown', onKey, true);
  }, [lit, result, finish, scheduleFlash]);

  return (
    <div className="absolute inset-0 z-[60] flex items-center justify-center bg-black/85 backdrop-blur-sm">
      <button
        onClick={onCancel}
        title="Fechar"
        className="karaoke-focusable absolute right-4 top-4 rounded-lg p-2 text-gray-400 hover:bg-white/10 hover:text-white"
      >
        <X size={18} />
      </button>

      {result == null ? (
        <div className="flex w-full max-w-md flex-col items-center gap-6 px-6 text-center">
          <div>
            <h2 className="text-xl font-black text-white">Calibrar tempo de reação</h2>
            <p className="mt-1 text-sm text-gray-400">
              Carrega <kbd className="rounded bg-white/10 px-1.5 py-0.5 font-mono text-xs">Espaço</kbd> assim que o círculo acender (e apitar).
            </p>
          </div>

          <div
            className={`flex h-40 w-40 items-center justify-center rounded-full text-lg font-bold transition-all duration-75 ${
              lit
                ? 'scale-105 bg-app-yellow text-black shadow-[0_0_60px_20px_rgba(250,204,21,0.55)]'
                : tooEarly
                ? 'bg-red-500/20 text-red-300 ring-2 ring-red-400/60'
                : 'bg-white/5 text-gray-500 ring-1 ring-white/10'
            }`}
          >
            {lit ? 'JÁ!' : tooEarly ? 'Cedo demais' : 'Espera…'}
          </div>

          <div className="flex items-center gap-2">
            {Array.from({ length: CAL_FLASHES }).map((_, i) => (
              <span
                key={i}
                className={`h-2.5 w-2.5 rounded-full ${i < done ? 'bg-emerald-400' : 'bg-white/15'}`}
              />
            ))}
          </div>
          <p className="text-xs text-gray-500">{done}/{CAL_FLASHES} — o 1º é só para aquecer</p>
        </div>
      ) : (
        <div className="flex w-full max-w-md flex-col items-center gap-5 px-6 text-center">
          <Gauge size={40} className="text-emerald-300" />
          <div>
            <h2 className="text-xl font-black text-white">O teu tempo de reação</h2>
            <p className="mt-2 text-5xl font-black text-app-yellow">{result}<span className="text-2xl text-gray-400"> ms</span></p>
            <p className="mt-2 text-sm text-gray-400">
              Vai ser retirado a cada marcação Espaço/Enter — assim não precisas do ajuste ±100ms.
            </p>
          </div>
          <div className="flex flex-wrap items-center justify-center gap-2">
            <button
              onClick={() => onApply(result)}
              className="karaoke-focusable inline-flex items-center gap-2 rounded-lg bg-purple-600 px-5 py-2 text-sm font-semibold hover:bg-purple-700"
            >
              Aplicar {currentLatency > 0 ? `(era ${currentLatency}ms)` : ''}
            </button>
            <button
              onClick={retry}
              className="karaoke-focusable inline-flex items-center gap-2 rounded-lg border border-white/10 bg-white/5 px-4 py-2 text-sm font-semibold text-gray-300 hover:bg-white/10"
            >
              <RotateCcw size={14} /> Repetir
            </button>
            <button
              onClick={onCancel}
              className="karaoke-focusable rounded-lg px-4 py-2 text-sm text-gray-400 hover:bg-white/10"
            >
              Cancelar
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// Bouton compact de la barre d'outils.
function ToolButton({ onClick, disabled, title, active, recording, children }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      title={title}
      className={`karaoke-focusable inline-flex h-9 w-9 items-center justify-center rounded-lg border transition-colors disabled:opacity-30 ${
        recording
          ? 'animate-pulse border-red-400/70 bg-red-500/20 text-red-300'
          : active
          ? 'border-app-yellow/50 bg-app-yellow/15 text-app-yellow hover:bg-app-yellow/25'
          : 'border-white/10 bg-white/5 text-gray-300 hover:bg-white/10 hover:text-white'
      }`}
    >
      {children}
    </button>
  );
}

// Format court "m:ss" pour la règle de la frise (vs formatTimestamp mm:ss.xx).
function formatShort(seconds) {
  const t = Math.max(0, seconds || 0);
  const m = Math.floor(t / 60);
  const s = Math.floor(t % 60);
  return `${m}:${String(s).padStart(2, '0')}`;
}

// Arrondi à 2 décimales pour l'affichage des champs de temps éditables (secondes).
function round2(seconds) {
  return Math.round((seconds || 0) * 100) / 100;
}

// Compte approximatif de syllabes (groupes de voyelles, pt/fr) — sert de POIDS
// relatif pour répartir le temps entre lignes, pas de valeur absolue. Min 1.
function countSyllables(text) {
  if (!text) return 1;
  const groups = text.toLowerCase().match(/[aeiouyáàâãäéèêëíìîïóòôõöúùûü]+/g);
  return groups ? groups.length : 1;
}

// Quand l'UPDATE renvoie 0 ligne (RLS), trouve la vraie raison pour un message clair.
async function diagnoseZeroRows() {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      return 'Não estás autenticado. Abre /login e entra com a conta admin, depois reabre o karaokê para guardar.';
    }
    const { data: adminRow } = await supabase
      .from('admins').select('user_id').eq('user_id', session.user.id).maybeSingle();
    if (!adminRow) {
      return `A conta ${session.user.email || ''} não está na lista de admins → o RLS bloqueia a gravação. Entra com a conta admin.`;
    }
    return 'Gravação bloqueada (0 linhas) apesar da sessão admin. Verifica as políticas RLS de UPDATE da tabela songs.';
  } catch {
    return 'Não foi possível guardar (0 linhas). Reconecta-te como admin e tenta de novo.';
  }
}

// Traduit les erreurs d'écriture Supabase en message actionnable.
function describeSaveError(error) {
  if (!error) return 'Erro desconhecido ao guardar.';
  const code = error.code;
  const msg = error.message || '';
  if (code === '42501' || /row-level security|permission denied/i.test(msg)) {
    return 'Direitos insuficientes ou sessão expirada. Faz Sair e volta a entrar, depois tenta de novo.';
  }
  if (code === '42703' || /column .*(lrc_content|karaoke_synced_at).* does not exist/i.test(msg)) {
    return 'A coluna lrc_content/karaoke_synced_at ainda não existe. Aplica a migração Supabase 20260708120000_add_karaoke_to_songs.sql.';
  }
  return msg || 'Erro ao guardar.';
}

// Construit les lignes initiales : privilégie le LRC existant, sinon les paroles brutes.
function buildInitialLines(song) {
  const parsed = parseLrc(song?.lrc_content);
  if (parsed.length > 0) return parsed.map((l) => ({ text: l.text, time: l.time, endTime: l.endTime ?? null }));
  return splitLyricsLines(song?.lyrics).map((text) => ({ text, time: null, endTime: null }));
}
