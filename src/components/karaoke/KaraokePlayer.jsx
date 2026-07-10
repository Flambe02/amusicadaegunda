import { useCallback, useEffect, useMemo, useRef, useState, lazy, Suspense } from 'react';
import { createPortal } from 'react-dom';
import {
  ArrowLeft, Play, Pause, Music, Loader2, Settings2, Mic,
  SkipBack, SkipForward, Square, RotateCcw, Users, Flame, Globe, X,
} from 'lucide-react';
import { useYouTubeIframeApi } from '@/hooks/useYouTubeIframeApi';
import { extractYouTubeId, getYouTubeThumbnailUrl } from '@/lib/utils';
import { parseLrc, hasDuetTags } from '@/lib/lrc';
import { FONT_SCALES, PLAYBACK_RATES, TRANSLATION_LANGS, loadKaraokeOptions, saveKaraokeOptions } from '@/lib/karaokeOptions';
import KaraokeWipeLine from '@/components/karaoke/KaraokeWipeLine';
import TvKaraokeLyricsWindow from '@/tv/components/TvKaraokeLyricsWindow';
import TvDuetLyricsView from '@/tv/components/TvDuetLyricsView';
import { formatTvTime } from '@/tv/lib/tvLyricsWindow';
import { BRAND_SQUARE_SMALL } from '@/lib/imageAssets';
import { SING_THRESHOLD, LOUDNESS_TARGET, gradeFor } from '@/lib/energyGrade';
import '@/styles/karaoke.css';

// Panneau d'options TV (D-pad) — lazy → chargé seulement en tvMode, hors bundle mobile.
const KaraokeTvOptions = lazy(() => import('@/tv/KaraokeTvOptions'));

const FALLBACK_LINE_DURATION_SEC = 4;
// Couleurs des parties en modo dueto (P1 / P2).
const DUET_COLORS = ['#38bdf8', '#f472b6'];
const YELLOW = '#FDE047';
// SING_THRESHOLD/LOUDNESS_TARGET/gradeFor : voir src/lib/energyGrade.js (formule
// partagée avec le médiateur d'énergie à distance du Modo Festa — la TV n'a pas de
// micro, cf. src/components/festa/FestaEnergyMic.jsx).

// Traduction via l'endpoint public (non officiel) de Google Translate — « outil Google
// simple », sans clé API. sl=pt → tl=cible. Réponse = tableaux imbriqués.
async function translateText(text, target) {
  const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=pt&tl=${target}&dt=t&q=${encodeURIComponent(text)}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error('translate failed');
  const data = await res.json();
  return (data?.[0] || []).map((seg) => seg?.[0] || '').join('');
}

/**
 * Lecteur karaoké public — overlay plein écran (TV / mobile / desktop).
 *
 * Props :
 *  - song      : { title, artist, youtube_url, youtube_music_url, lrc_content, cover_image }
 *  - onClose   : () => void
 *  - queueInfo     : { index, total, nextTitle } | null   (modo festa)
 *  - onNext        : () => void   (passer à la chanson suivante de la fila)
 *  - onEnded       : () => void   (la chanson s'est terminée naturellement)
 *  - handoff       : bool         (afficher « passa o micro » sur l'intro, pour un relais de fila)
 *  - applauseScore : number|null  (fila por telefone : aplausos reçus pour la chanson QUI VIENT
 *                                  DE FINIR — snapshot pris au moment du relais, affiché sur l'intro)
 *  - tomatoScore   : number|null  (idem, "tomates" — réaction négative/moquerie)
 *  - remoteEnergyLevel : number|null  (0..1, LIVE — la TV n'a pas de micro, un téléphone
 *                                       peut lui envoyer un niveau d'énergie mesuré localement
 *                                       via Realtime broadcast, cf. FestaEnergyMic.jsx)
 *  - remoteEnergyGrade : {score,grade,emoji}|null  (nota finale équivalente, pour la chanson
 *                                                    QUI VIENT DE FINIR, affichée sur l'intro)
 *
 * Continuité : le texte ne disparaît JAMAIS. La ligne « affichée » est toujours la
 * dernière ligne démarrée ; le balayage se complète (100%) à la fin captée et la ligne
 * reste visible jusqu'à la suivante.
 */
export default function KaraokePlayer({
  song, onClose, queueInfo = null, onNext, onEnded, handoff = false, tvMode = false, backInterceptorRef = null,
  applauseScore = null, tomatoScore = null, remoteEnergyLevel = null, remoteEnergyGrade = null,
  initialSessionOptions = null,
}) {
  const { YT, ready: apiReady, error: apiError } = useYouTubeIframeApi();

  const hostRef = useRef(null);
  const playerRef = useRef(null);
  const pollRef = useRef(null);
  const syncRef = useRef({ t: 0, wall: 0, playing: false, rate: 1 });
  const displayIdxRef = useRef(-1);
  const wipeApiRef = useRef(null);
  // onEnded via ref : ne doit PAS entrer dans les deps du player (sinon recréation à chaque render).
  const onEndedRef = useRef(onEnded);
  onEndedRef.current = onEnded;

  const [playerReady, setPlayerReady] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [displayIdx, setDisplayIdx] = useState(-1);
  const [entryDots, setEntryDots] = useState(0); // 0 = pas de compte à rebours d'entrée
  const [phase, setPhase] = useState('intro'); // 'intro' | 'live'
  const [countdown, setCountdown] = useState(null);

  // Override de session (ex. Dueto choisi depuis la landing karaokê TV) : fusionné
  // aux préférences sauvegardées UNE SEULE FOIS au montage, sans jamais écraser la
  // préférence globale de l'utilisateur — seul un changement EXPLICITE via le panneau
  // d'options (après ce 1er rendu) déclenche une vraie sauvegarde. Aucun caller
  // existant (mobile/desktop/TV solo) ne passe cette prop → comportement inchangé.
  const [opts, setOpts] = useState(() => (
    initialSessionOptions ? { ...loadKaraokeOptions(), ...initialSessionOptions } : loadKaraokeOptions()
  ));
  const [showOpts, setShowOpts] = useState(false);
  const showOptsRef = useRef(showOpts); showOptsRef.current = showOpts;
  const skipNextSaveRef = useRef(Boolean(initialSessionOptions));
  useEffect(() => {
    if (skipNextSaveRef.current) { skipNextSaveRef.current = false; return; }
    saveKaraokeOptions(opts);
  }, [opts]);

  // ── Couche de contrôle TV (LOT A) : commandes révélées sur interaction, masquage
  // auto après ~3,5 s en lecture, visibles indéfiniment en pause ──
  const [controlsVisible, setControlsVisible] = useState(false);
  const hideControlsTimerRef = useRef(null);
  const lastOkPressRef = useRef(0);
  const restartLockRef = useRef(false);
  const restartTimeoutRef = useRef(null);
  const revealControls = useCallback(() => {
    setControlsVisible(true);
  }, []);
  useEffect(() => () => {
    if (hideControlsTimerRef.current) clearTimeout(hideControlsTimerRef.current);
    if (restartTimeoutRef.current) clearTimeout(restartTimeoutRef.current);
  }, []);

  // Refs miroir pour lire opts/queue à jour DANS l'effet de création du player
  // (dont les deps sont volontairement figées → sinon recréation du player).
  const optsRef = useRef(opts); optsRef.current = opts;
  const queueInfoRef = useRef(queueInfo); queueInfoRef.current = queueInfo;
  const finishAndScoreRef = useRef(null);

  // Medidor de energia → note finale : stats accumulées pendant le chant.
  const energyStatsRef = useRef({ active: 0, sung: 0, sum: 0, count: 0 });
  const [scoreResult, setScoreResult] = useState(null); // { score, grade, emoji } | null

  // Traduction (bandeau bas) : texte courant + cache par (langue|texte).
  const [translation, setTranslation] = useState('');
  const transCacheRef = useRef(new Map());

  const videoId = useMemo(
    () => extractYouTubeId(song?.youtube_url) || extractYouTubeId(song?.youtube_music_url),
    [song?.youtube_url, song?.youtube_music_url]
  );
  const lines = useMemo(() => parseLrc(song?.lrc_content), [song?.lrc_content]);
  const artwork = song?.cover_image
    || getYouTubeThumbnailUrl(song?.youtube_url || song?.youtube_music_url, 'hqdefault');

  // Couleur d'une ligne selon le mode (dueto → part color, sinon jaune).
  const lineColor = useCallback((i) => (opts.dueto ? DUET_COLORS[i % 2] : YELLOW), [opts.dueto]);

  // Duet View (LOT B) : disponible seulement si la chanson a des tags {A}/{B} réels.
  // Toggle discret sur l'écran de lancement (tvMode) — non activé par défaut, ne
  // touche PAS la préférence globale « Modo dueto (P1/P2) » du panneau d'options
  // (qui reste le comportement historique en alternance par index pour les
  // chansons SANS tags).
  const duetTaggedAvailable = useMemo(() => tvMode && hasDuetTags(song?.lrc_content), [tvMode, song?.lrc_content]);
  const [duetToggleOn, setDuetToggleOn] = useState(false);

  // ── Scroll lock ──
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = prev; };
  }, []);

  // ── Wake lock ──
  useEffect(() => {
    let lock = null;
    const acquire = async () => { try { lock = await navigator.wakeLock?.request?.('screen'); } catch { /* ignore */ } };
    acquire();
    const onVis = () => { if (document.visibilityState === 'visible') acquire(); };
    document.addEventListener('visibilitychange', onVis);
    return () => { document.removeEventListener('visibilitychange', onVis); try { lock?.release?.(); } catch { /* ignore */ } };
  }, []);

  // ── Player ──
  useEffect(() => {
    if (!apiReady || !YT || !videoId || !hostRef.current) return undefined;
    let destroyed = false;
    const origin = typeof window !== 'undefined' ? window.location.origin : undefined;
    const player = new YT.Player(hostRef.current, {
      videoId,
      host: 'https://www.youtube-nocookie.com',
      playerVars: { rel: 0, modestbranding: 1, playsinline: 1, controls: 1, ...(origin ? { origin } : {}) },
      events: {
        onReady: () => { if (!destroyed) setPlayerReady(true); },
        onStateChange: (e) => {
          if (destroyed) return;
          if (e.data === 1) setIsPlaying(true);
          else if (e.data === 2) setIsPlaying(false);
          else if (e.data === 0) {
            setIsPlaying(false);
            // Panneau Opções ouvert au moment de la fin naturelle : le fermer avant
            // d'afficher l'écran de fin, jamais les deux superposés.
            if (showOptsRef.current) setShowOpts(false);
            // Fin naturelle : si le medidor de energia est actif et qu'on n'est pas en
            // mode fila, on affiche la note plutôt que d'enchaîner.
            if (optsRef.current.energy && !queueInfoRef.current) finishAndScoreRef.current?.();
            else onEndedRef.current?.();
          }
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
  }, [apiReady, YT, videoId]);

  useEffect(() => {
    if (!playerReady) return;
    try { playerRef.current?.setPlaybackRate?.(opts.rate); } catch { /* ignore */ }
  }, [playerReady, opts.rate]);

  // Auto-masquage des commandes révélées : ~3,5 s en lecture, indéfini en pause.
  useEffect(() => {
    if (!tvMode || !controlsVisible) return undefined;
    if (hideControlsTimerRef.current) { clearTimeout(hideControlsTimerRef.current); hideControlsTimerRef.current = null; }
    if (isPlaying) {
      hideControlsTimerRef.current = setTimeout(() => setControlsVisible(false), 3500);
    }
    return () => { if (hideControlsTimerRef.current) { clearTimeout(hideControlsTimerRef.current); hideControlsTimerRef.current = null; } };
  }, [tvMode, isPlaying, controlsVisible]);

  // ── Poll : temps + ligne affichée (continuité) + compte à rebours d'entrée ──
  useEffect(() => {
    if (!playerReady) return undefined;
    pollRef.current = setInterval(() => {
      const p = playerRef.current;
      if (!p || typeof p.getCurrentTime !== 'function') return;
      const t = p.getCurrentTime();
      syncRef.current = { t, wall: performance.now(), playing: p.getPlayerState?.() === 1, rate: p.getPlaybackRate?.() ?? 1 };

      // Ligne AFFICHÉE = dernière ligne démarrée (jamais -1 une fois commencé → continuité).
      let di = -1;
      for (let i = 0; i < lines.length; i += 1) {
        if (lines[i].time != null && lines[i].time <= t) di = i; else break;
      }
      displayIdxRef.current = di;
      setDisplayIdx((prev) => (prev === di ? prev : di));

      // Compte à rebours d'entrée : prochaine ligne dans ≤3s alors qu'aucune n'est en cours
      // (avant la 1re ligne, ou pendant un silence après une fin captée).
      const cur = di >= 0 ? lines[di] : null;
      const next = lines[di + 1] ?? (di === -1 ? lines[0] : null);
      const inGap = !cur || (cur.endTime != null && t >= cur.endTime);
      let dots = 0;
      if (inGap && next && next.time != null) {
        const to = next.time - t;
        if (to > 0.15 && to <= 3) dots = Math.min(3, Math.ceil(to));
      }
      setEntryDots((prev) => (prev === dots ? prev : dots));
    }, 120);
    return () => { if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null; } };
  }, [playerReady, lines]);

  // ── Balayage (rAF, sans re-render) ──
  useEffect(() => {
    if (!playerReady) return undefined;
    let raf;
    const tick = () => {
      const s = syncRef.current;
      const t = s.playing ? s.t + ((performance.now() - s.wall) / 1000) * s.rate : s.t;
      const idx = displayIdxRef.current;
      const line = idx >= 0 ? lines[idx] : null;
      if (line) {
        const end = line.endTime ?? lines[idx + 1]?.time ?? line.time + FALLBACK_LINE_DURATION_SEC;
        const dur = Math.max(0.2, end - line.time);
        wipeApiRef.current?.setProgress((t - line.time) / dur); // clamp 0..1 → reste 100% dans le gap
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [playerReady, lines]);

  // ── Energy meter (micro) ──
  const energyBarRef = useRef(null);
  useEffect(() => {
    if (!opts.energy || phase !== 'live') return undefined;
    let raf; let ctx; let stream; let stopped = false;
    (async () => {
      try {
        stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        ctx = new (window.AudioContext || window.webkitAudioContext)();
        const src = ctx.createMediaStreamSource(stream);
        const analyser = ctx.createAnalyser();
        analyser.fftSize = 512;
        src.connect(analyser);
        const buf = new Uint8Array(analyser.fftSize);
        const loop = () => {
          if (stopped) return;
          analyser.getByteTimeDomainData(buf);
          let sum = 0;
          for (let i = 0; i < buf.length; i += 1) { const v = (buf[i] - 128) / 128; sum += v * v; }
          const rms = Math.sqrt(sum / buf.length); // 0..~1
          const pct = Math.min(100, rms * 260);
          if (energyBarRef.current) energyBarRef.current.style.height = `${pct}%`;
          // Stats pour la note finale : seulement en lecture. « active » = une ligne est
          // en cours (on est censé chanter) ; « sung » = le micro dépasse le seuil.
          if (syncRef.current.playing) {
            const st = energyStatsRef.current;
            st.sum += rms; st.count += 1;
            if (displayIdxRef.current >= 0) {
              st.active += 1;
              if (rms > SING_THRESHOLD) st.sung += 1;
            }
          }
          raf = requestAnimationFrame(loop);
        };
        loop();
      } catch { setOpts((o) => ({ ...o, energy: false })); } // permission refusée
    })();
    return () => {
      stopped = true;
      if (raf) cancelAnimationFrame(raf);
      try { stream?.getTracks().forEach((tr) => tr.stop()); } catch { /* ignore */ }
      try { ctx?.close(); } catch { /* ignore */ }
    };
  }, [opts.energy, phase]);

  // ── Barre de progression + temps TV (mise à jour légère, mutation directe, sans re-render) ──
  const tvProgressRef = useRef(null);
  const tvTimeCurrentRef = useRef(null);
  const tvTimeTotalRef = useRef(null);
  useEffect(() => {
    if (!tvMode || !playerReady) return undefined;
    const id = setInterval(() => {
      const p = playerRef.current;
      if (!p) return;
      try {
        const d = p.getDuration?.() || 0;
        const t = p.getCurrentTime?.() || 0;
        if (tvProgressRef.current) tvProgressRef.current.style.width = d > 0 ? `${Math.min(100, (t / d) * 100)}%` : '0%';
        if (tvTimeCurrentRef.current) tvTimeCurrentRef.current.textContent = formatTvTime(t);
        if (tvTimeTotalRef.current) tvTimeTotalRef.current.textContent = d > 0 ? formatTvTime(d) : '--:--';
      } catch { /* ignore */ }
    }, 250);
    return () => clearInterval(id);
  }, [tvMode, playerReady]);

  // ── Contrôles ──
  const seekTo = useCallback((t) => {
    try { playerRef.current?.seekTo?.(Math.max(0, t), true); } catch { /* ignore */ }
  }, []);
  // Avance/recul relatif (±secondes) — utilisé par le D-pad en mode TV.
  const seekBy = useCallback((delta) => {
    const p = playerRef.current;
    const cur = (typeof p?.getCurrentTime === 'function' ? p.getCurrentTime() : syncRef.current.t) || 0;
    seekTo(cur + delta);
  }, [seekTo]);
  const togglePlay = useCallback(() => {
    const p = playerRef.current;
    if (!p) return;
    if (isPlaying) p.pauseVideo(); else p.playVideo();
  }, [isPlaying]);

  const handleStart = useCallback(() => {
    // Le toggle Dueto (écran de lancement) tranche pour CETTE chanson uniquement,
    // sans écraser la préférence globale « Modo dueto (P1/P2) » du panneau d'options.
    if (duetTaggedAvailable) {
      skipNextSaveRef.current = true;
      setOpts((o) => ({ ...o, dueto: duetToggleOn }));
    }
    energyStatsRef.current = { active: 0, sung: 0, sum: 0, count: 0 }; // repart à zéro
    setScoreResult(null);
    try { playerRef.current?.playVideo?.(); } catch { /* ignore */ }
    setPhase('live');
    setCountdown(3);
  }, [duetTaggedAvailable, duetToggleOn]);

  // Calcule et affiche la note d'énergie. coverage = part du temps « à chanter » où le
  // micro a capté du son ; loudness = volume moyen normalisé. Pondération 70/30.
  const finishAndScore = useCallback(() => {
    try { playerRef.current?.pauseVideo?.(); } catch { /* ignore */ }
    const s = energyStatsRef.current;
    const coverage = s.active > 0 ? s.sung / s.active : 0;
    const loudness = s.count > 0 ? Math.min(1, (s.sum / s.count) / LOUDNESS_TARGET) : 0;
    const score = Math.round(Math.min(100, (0.7 * coverage + 0.3 * loudness) * 100));
    setScoreResult({ score, ...gradeFor(score) });
  }, []);
  finishAndScoreRef.current = finishAndScore;

  // Rejouer depuis la note (recommence proprement au début).
  const restartFromScore = useCallback(() => {
    setScoreResult(null);
    energyStatsRef.current = { active: 0, sung: 0, sum: 0, count: 0 };
    try { playerRef.current?.seekTo?.(0, true); } catch { /* ignore */ }
    try { playerRef.current?.playVideo?.(); } catch { /* ignore */ }
    setPhase('live');
    setCountdown(3);
  }, []);

  useEffect(() => {
    if (countdown == null) return undefined;
    const timer = setTimeout(() => setCountdown((c) => (c > 0 ? c - 1 : null)), countdown > 0 ? 700 : 600);
    return () => clearTimeout(timer);
  }, [countdown]);

  // Reverse = revenir au début de la ligne précédente (ou celle en cours si on est dedans).
  const handleReverse = useCallback(() => {
    const di = displayIdxRef.current;
    const t = syncRef.current.t;
    const cur = di >= 0 ? lines[di] : null;
    // Si on est >1.5s dans la ligne courante, on la reprend ; sinon on va à la précédente.
    if (cur && t - cur.time > 1.5) { seekTo(cur.time); return; }
    const prev = di > 0 ? lines[di - 1] : cur;
    if (prev) seekTo(prev.time);
  }, [lines, seekTo]);

  // Recomeçar (barre de commandes TV + panneau Opções) : pause, seekTo(0), reset de
  // la ligne LRC active et des stats d'énergie de LA TENTATIVE en cours (aucune
  // donnée persistée de session/fila touchée), puis reprise automatique. Verrou
  // simple contre un double déclenchement (double appui rapproché).
  const handleRestartControl = useCallback(() => {
    if (restartLockRef.current) return;
    restartLockRef.current = true;
    try { playerRef.current?.pauseVideo?.(); } catch { /* ignore */ }
    seekTo(0);
    displayIdxRef.current = -1;
    setDisplayIdx(-1);
    setEntryDots(0);
    energyStatsRef.current = { active: 0, sung: 0, sum: 0, count: 0 };
    setScoreResult(null);
    revealControls();
    if (restartTimeoutRef.current) clearTimeout(restartTimeoutRef.current);
    restartTimeoutRef.current = setTimeout(() => {
      try { playerRef.current?.playVideo?.(); } catch { /* ignore */ }
      restartLockRef.current = false;
    }, 300);
  }, [seekTo, revealControls]);

  // Retry = recommencer la ligne en cours.
  const handleRetry = useCallback(() => {
    const di = displayIdxRef.current;
    const cur = di >= 0 ? lines[di] : lines[0];
    if (cur?.time != null) seekTo(cur.time);
  }, [lines, seekTo]);

  // Stop = pause + retour à l'écran d'ouverture. Si le medidor de energia est actif et
  // qu'on a assez de données, on montre la note (« terminar e ver a nota ») au lieu de
  // revenir directement à l'intro.
  const handleStop = useCallback(() => {
    if (optsRef.current.energy && energyStatsRef.current.count > 30) {
      finishAndScore();
      return;
    }
    try { playerRef.current?.pauseVideo?.(); playerRef.current?.seekTo?.(0, true); } catch { /* ignore */ }
    setCountdown(null);
    setPhase('intro');
  }, [finishAndScore]);

  const handleClose = useCallback(() => {
    try { playerRef.current?.pauseVideo?.(); } catch { /* ignore */ }
    onClose?.();
  }, [onClose]);

  // ── Clavier / D-pad ──
  useEffect(() => {
    const onKey = (e) => {
      // Panneau d'options ouvert (TV) : la nav spatiale gère les touches → on n'intercepte rien.
      if (tvMode && showOpts) return;
      // En mode TV, le Retour (Escape/back matériel) est géré par TvApp (adaptateur) →
      // on ne double PAS la fermeture ici. En mobile/web, Escape ferme comme avant.
      if (e.key === 'Escape') { if (!tvMode) { e.preventDefault(); handleClose(); } }
      else if (e.key === ' ' || e.key === 'k' || e.key === 'Enter') {
        if (e.key === 'Enter' && e.target?.tagName === 'BUTTON') return;
        e.preventDefault();
        if (phase === 'intro') { if (playerReady) handleStart(); } else if (tvMode) {
          // Débounce : ignore un second OK trop rapproché (évite une double bascule).
          const now = Date.now();
          if (now - lastOkPressRef.current < 300) return;
          lastOkPressRef.current = now;
          togglePlay();
          revealControls();
        } else togglePlay();
      } else if (tvMode && phase === 'live' && e.key === 'ArrowUp') {
        e.preventDefault();
        setControlsVisible(false); // le panneau masque les commandes révélées
        setShowOpts(true); // ▲ ouvre directement le panneau d'options (un seul appui)
      } else if (phase === 'live' && e.key === 'ArrowLeft') {
        e.preventDefault();
        if (tvMode) { seekBy(-10); revealControls(); } else handleReverse();
      } else if (phase === 'live' && e.key === 'ArrowRight') {
        e.preventDefault();
        if (tvMode) { seekBy(10); revealControls(); } else if (queueInfo && onNext) onNext();
      } else if (tvMode && phase === 'live' && e.key === 'ArrowDown') {
        e.preventDefault();
        revealControls(); // révèle sans action de lecture (déplacement de focus non implémenté — cf. limites connues)
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [handleClose, togglePlay, phase, playerReady, handleStart, handleReverse, queueInfo, onNext, tvMode, seekBy, showOpts, revealControls]);

  // Intercepteur de Back (TV) — cascade stricte : panneau ouvert → le fermer ;
  // sinon commandes révélées → les masquer ; sinon laisse TvApp fermer le karaoké.
  useEffect(() => {
    if (!tvMode || !backInterceptorRef) return undefined;
    backInterceptorRef.current = () => {
      if (showOpts) { setShowOpts(false); return true; }
      if (controlsVisible) {
        setControlsVisible(false);
        if (hideControlsTimerRef.current) { clearTimeout(hideControlsTimerRef.current); hideControlsTimerRef.current = null; }
        return true;
      }
      return false;
    };
    return () => { if (backInterceptorRef) backInterceptorRef.current = null; };
  }, [tvMode, backInterceptorRef, showOpts, controlsVisible]);

  // ── Auto-scroll (mobile/desktop uniquement — la fenêtre TV utilise des ancres fixes) ──
  const activeLineRef = useRef(null);
  useEffect(() => {
    if (tvMode) return;
    activeLineRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }, [displayIdx, tvMode]);

  // ── Traduction de la ligne courante (bandeau bas), avec cache ──
  useEffect(() => {
    const lang = opts.translate;
    if (lang === 'off') { setTranslation(''); return undefined; }
    const line = displayIdx >= 0 ? lines[displayIdx] : null;
    const text = line?.text?.trim();
    if (!text) { setTranslation(''); return undefined; }
    const key = `${lang}|${text}`;
    const cached = transCacheRef.current.get(key);
    if (cached != null) { setTranslation(cached); return undefined; }
    let cancelled = false;
    translateText(text, lang)
      .then((out) => { if (!cancelled) { transCacheRef.current.set(key, out); setTranslation(out); } })
      .catch(() => { if (!cancelled) setTranslation(''); });
    return () => { cancelled = true; };
  }, [displayIdx, opts.translate, lines]);

  // ── Préchargement des traductions (supprime le délai) ──
  // Dès qu'une langue est choisie, on traduit TOUTES les lignes en tâche de fond
  // (séquentiel → pas de rate-limit), en commençant par la ligne courante. Quand une
  // ligne devient active, sa traduction est déjà en cache → affichage instantané.
  useEffect(() => {
    const lang = opts.translate;
    if (lang === 'off' || lines.length === 0) return undefined;
    let cancelled = false;
    (async () => {
      const start = Math.max(0, displayIdxRef.current);
      const order = [];
      for (let i = start; i < lines.length; i += 1) order.push(i);
      for (let i = 0; i < start; i += 1) order.push(i);
      for (let j = 0; j < order.length; j += 1) {
        if (cancelled) return;
        const text = lines[order[j]]?.text?.trim();
        if (!text) continue;
        const key = `${lang}|${text}`;
        if (transCacheRef.current.has(key)) continue;
        try {
          const out = await translateText(text, lang);
          if (cancelled) return;
          transCacheRef.current.set(key, out);
          if (displayIdxRef.current === order[j]) setTranslation(out);
        } catch { /* ligne ignorée, on continue */ }
      }
    })();
    return () => { cancelled = true; };
  }, [opts.translate, lines]);

  const hasLines = lines.length > 0;
  const scale = opts.fontScale;
  const hasNext = queueInfo && queueInfo.index < queueInfo.total - 1;

  return createPortal(
    <div className="karaoke-overlay fixed inset-0 z-[9999] flex flex-col bg-[#050505] text-white">
      {/* Player YT invisible — toujours monté */}
      <div className="pointer-events-none absolute left-0 top-0 h-px w-px overflow-hidden opacity-0">
        <div ref={hostRef} />
      </div>

      {/* Barre supérieure — padding haut = safe-area (sinon passe sous l'encoche/barre d'état) */}
      <header className="relative z-30 flex items-center gap-3 px-4 pb-3 pt-[max(env(safe-area-inset-top),0.75rem)] md:px-6 md:pb-4 md:pt-[max(env(safe-area-inset-top),1rem)]">
        {tvMode ? (
          /* TV : chrome minimal — avatar mascotte + titre, pas de bouton Voltar (Retour télécommande). */
          <img src={BRAND_SQUARE_SMALL} alt="" className="h-9 w-9 shrink-0 rounded-full border border-white/15 object-cover" />
        ) : (
          <button type="button" onClick={handleClose}
            className="karaoke-focusable flex h-11 items-center gap-2 rounded-full border border-white/15 bg-white/5 px-4 text-sm font-semibold text-white/85 transition hover:bg-white/10"
            aria-label="Voltar">
            <ArrowLeft className="h-5 w-5" /><span className="hidden sm:inline">Voltar</span>
          </button>
        )}
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-bold text-white md:text-base">{song?.title}</p>
          <p className="truncate text-xs text-white/50">
            {song?.artist || 'A Música da Segunda'}
            {queueInfo && <span className="ml-2 text-app-yellow/70">· Fila {queueInfo.index + 1}/{queueInfo.total}</span>}
          </p>
        </div>
        {tvMode && phase === 'live' && !showOpts && (
          <button type="button"
            onClick={() => { setControlsVisible(false); setShowOpts(true); }}
            aria-label="Abrir opções do karaokê"
            className="flex shrink-0 items-center gap-1.5 rounded-full border border-white/15 bg-white/5 px-3 py-1.5 text-xs font-semibold text-white/70 transition hover:bg-white/10">
            <Settings2 className="h-4 w-4" /> ▲ Opções
          </button>
        )}
        {phase === 'live' && !tvMode && (
          <div className="relative">
            <button type="button" onClick={() => setShowOpts((v) => !v)}
              className={`karaoke-focusable flex h-11 w-11 items-center justify-center rounded-full border transition ${
                showOpts ? 'border-app-yellow/50 bg-app-yellow/15 text-app-yellow' : 'border-white/15 bg-white/5 text-white/85 hover:bg-white/10'}`}
              aria-label="Opções">
              <Settings2 className="h-5 w-5" />
            </button>
            {showOpts && (
              <div className="absolute right-0 top-full z-40 mt-2 max-h-[min(32rem,calc(100vh-6rem))] w-72 space-y-4 overflow-y-auto rounded-2xl border border-white/12 bg-black/92 p-4 text-left shadow-2xl backdrop-blur-xl">
                <div>
                  <p className="mb-2 text-[11px] font-bold uppercase tracking-widest text-white/45">Tamanho da letra</p>
                  <div className="flex gap-1 rounded-xl border border-white/10 bg-white/5 p-1">
                    {FONT_SCALES.map((f) => (
                      <button key={f.label} onClick={() => setOpts((o) => ({ ...o, fontScale: f.value }))}
                        className={`karaoke-focusable flex-1 rounded-lg py-1.5 text-sm font-bold transition ${opts.fontScale === f.value ? 'bg-app-yellow text-black' : 'text-white/60 hover:bg-white/10'}`}>
                        {f.label}
                      </button>
                    ))}
                  </div>
                </div>
                <ToggleRow label="Bolinha" on={opts.showBall} onClick={() => setOpts((o) => ({ ...o, showBall: !o.showBall }))} />
                <ToggleRow label="Modo dueto (P1 / P2)" icon={Users} on={opts.dueto} onClick={() => setOpts((o) => ({ ...o, dueto: !o.dueto }))} />
                <ToggleRow label="Medidor de energia 🔥 (micro)" icon={Flame} on={opts.energy} onClick={() => setOpts((o) => ({ ...o, energy: !o.energy }))} />
                <div>
                  <p className="mb-2 flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-widest text-white/45">
                    <Globe className="h-3.5 w-3.5" /> Tradução <span className="font-medium normal-case text-white/35">(rodapé)</span>
                  </p>
                  <div className="flex gap-1 rounded-xl border border-white/10 bg-white/5 p-1">
                    {TRANSLATION_LANGS.map((l) => (
                      <button key={l.value} onClick={() => setOpts((o) => ({ ...o, translate: l.value }))}
                        className={`karaoke-focusable flex-1 rounded-lg py-1.5 text-sm font-bold transition ${opts.translate === l.value ? 'bg-app-yellow text-black' : 'text-white/60 hover:bg-white/10'}`}>
                        {l.label}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <p className="mb-2 text-[11px] font-bold uppercase tracking-widest text-white/45">Velocidade <span className="font-medium normal-case text-white/35">(treino)</span></p>
                  <div className="flex gap-1 rounded-xl border border-white/10 bg-white/5 p-1">
                    {PLAYBACK_RATES.map((r) => (
                      <button key={r.value} onClick={() => setOpts((o) => ({ ...o, rate: r.value }))}
                        className={`karaoke-focusable flex-1 rounded-lg py-1.5 text-sm font-bold transition ${opts.rate === r.value ? 'bg-app-yellow text-black' : 'text-white/60 hover:bg-white/10'}`}>
                        {r.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </header>

      {phase === 'intro' ? (
        <div className="relative flex flex-1 flex-col items-center justify-center gap-5 overflow-hidden px-6 text-center">
          <div className="karaoke-spotlights" aria-hidden="true" />
          {apiError ? (
            <>
              <Music className="h-10 w-10 text-white/30" />
              <p className="max-w-sm text-sm text-white/70">Não foi possível carregar o leitor. Tenta recarregar a página.</p>
            </>
          ) : (
            <>
              {handoff && (
                <p className="karaoke-focusable relative inline-flex items-center gap-2 rounded-full border border-app-yellow/30 bg-app-yellow/10 px-4 py-1.5 text-sm font-black text-app-yellow">
                  <Mic className="h-4 w-4" /> Passa o micro! Próxima na fila
                </p>
              )}
              {handoff && ((applauseScore ?? 0) > 0 || (tomatoScore ?? 0) > 0) && (
                <p className="karaoke-focusable relative inline-flex items-center gap-3 rounded-full border border-white/15 bg-white/5 px-4 py-1.5 text-sm font-bold text-white/80">
                  {(applauseScore ?? 0) > 0 && <span>👏 Aplausos da plateia: {applauseScore}</span>}
                  {(tomatoScore ?? 0) > 0 && <span>🍅 Tomates: {tomatoScore}</span>}
                </p>
              )}
              {handoff && remoteEnergyGrade && (
                <p className="karaoke-focusable relative inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-4 py-1.5 text-sm font-bold text-white/80">
                  {remoteEnergyGrade.emoji} {remoteEnergyGrade.grade} <span className="text-white/45">(microfone do celular)</span>
                </p>
              )}
              {artwork && (
                <img src={artwork} alt="" className="relative h-28 w-28 rounded-3xl border border-white/15 object-cover shadow-[0_0_70px_rgba(253,224,71,0.22)] md:h-44 md:w-44" />
              )}
              <h1 className="karaoke-neon relative max-w-3xl text-4xl font-black leading-tight md:text-6xl">{song?.title}</h1>
              <p className="relative text-sm text-white/55 md:text-base">{song?.artist || 'A Música da Segunda'}</p>
              <button type="button" onClick={handleStart} disabled={!playerReady}
                className="karaoke-focusable karaoke-start-btn relative mt-2 inline-flex items-center gap-3 rounded-full bg-app-yellow px-9 py-4 text-lg font-black text-black disabled:opacity-50 md:px-12 md:py-5 md:text-xl">
                {playerReady ? (<><Play className="h-6 w-6 fill-current" /> Começar</>) : (<><Loader2 className="h-6 w-6 animate-spin" /> A preparar…</>)}
              </button>
              {duetTaggedAvailable && (
                <button type="button"
                  onClick={() => setDuetToggleOn((v) => !v)}
                  aria-pressed={duetToggleOn}
                  aria-label="Cantar em dueto"
                  className={`karaoke-focusable tv-karaoke-duet-chip ${duetToggleOn ? 'is-on' : ''}`}>
                  🎤🎤 Cantar em dueto
                </button>
              )}
              <p className="relative flex items-center gap-1.5 text-xs text-white/40"><Mic className="h-3.5 w-3.5" /> Prepara a voz — 3, 2, 1…</p>
            </>
          )}
        </div>
      ) : (
        <div className="relative flex-1 overflow-hidden">
          {/* Compte à rebours de départ 3-2-1 */}
          {countdown != null && (
            <div className="pointer-events-none absolute inset-0 z-20 flex items-center justify-center">
              <span key={countdown} className="karaoke-countdown">{countdown > 0 ? countdown : 'CANTA!'}</span>
            </div>
          )}

          {/* Compte à rebours d'entrée ●●● (pendant un silence avant une ligne) */}
          {countdown == null && entryDots > 0 && (
            <div className="pointer-events-none absolute inset-x-0 top-[16vh] z-20 flex items-center justify-center gap-3">
              {[1, 2, 3].map((n) => (
                <span key={n} className={`h-3.5 w-3.5 rounded-full transition-all duration-200 md:h-4 md:w-4 ${n <= entryDots ? 'bg-app-yellow shadow-[0_0_14px_rgba(253,224,71,0.8)]' : 'bg-white/15'}`} />
              ))}
            </div>
          )}

          {/* Energy meter */}
          {opts.energy && (
            <div className="pointer-events-none absolute right-4 top-1/2 z-20 flex h-40 w-3 -translate-y-1/2 items-end overflow-hidden rounded-full border border-white/10 bg-white/5 md:right-8 md:h-56">
              <div ref={energyBarRef} className="w-full rounded-full bg-gradient-to-t from-orange-500 via-app-yellow to-red-400 transition-[height] duration-75" style={{ height: '0%' }} />
            </div>
          )}

          {/* Energia à distance (téléphone → TV, la TV n'a pas de micro) — jauge séparée
              du medidor de energia local ci-dessus, jamais les deux en même temps en tvMode. */}
          {remoteEnergyLevel != null && (
            <div className="pointer-events-none absolute left-4 top-1/2 z-20 flex h-40 w-3 -translate-y-1/2 items-end overflow-hidden rounded-full border border-white/10 bg-white/5 md:left-8 md:h-56">
              <div
                className="w-full rounded-full bg-gradient-to-t from-orange-500 via-app-yellow to-red-400 transition-[height] duration-75"
                style={{ height: `${Math.min(100, remoteEnergyLevel * 260)}%` }}
              />
            </div>
          )}

          {/* Indicateur discret de pause (TV) */}
          {tvMode && countdown == null && !isPlaying && (
            <p className="tv-karaoke-paused-badge" aria-hidden="true">PAUSADO</p>
          )}

          {!apiError && (
            tvMode ? (
              opts.dueto && duetTaggedAvailable ? (
                <TvDuetLyricsView
                  lines={lines}
                  displayIdx={displayIdx}
                  wipeApiRef={wipeApiRef}
                  fontScale={scale}
                  showBall={opts.showBall}
                  speakerNames={null}
                />
              ) : (
                <TvKaraokeLyricsWindow
                  lines={lines}
                  displayIdx={displayIdx}
                  wipeApiRef={wipeApiRef}
                  fontScale={scale}
                  showBall={opts.showBall}
                  dueto={opts.dueto}
                  lineColor={lineColor}
                />
              )
            ) : (
              <div className="karaoke-lyrics relative z-10 h-full overflow-y-auto scroll-smooth px-6 py-[38vh] text-center md:px-12" aria-live="polite">
                {hasLines ? (
                  lines.map((line, i) => {
                    const distance = displayIdx < 0 ? i + 1 : Math.abs(i - displayIdx);
                    const isActive = i === displayIdx;
                    const duetColor = opts.dueto ? DUET_COLORS[i % 2] : null;
                    return (
                      <p key={`${i}-${line.time}`} ref={isActive ? activeLineRef : null}
                        className={['mx-auto max-w-5xl font-black leading-tight transition-all duration-300 ease-out', isActive ? '' : distance === 1 ? 'text-white/45' : 'text-white/20'].join(' ')}
                        style={{
                          fontSize: isActive ? `calc(clamp(2rem, 6vw, 5rem) * ${scale})` : distance === 1 ? `calc(clamp(1.35rem, 3.6vw, 2.6rem) * ${scale})` : `calc(clamp(1.1rem, 2.6vw, 1.9rem) * ${scale})`,
                          marginBlock: isActive ? '0.55em' : '0.4em',
                          opacity: distance > 3 ? 0.12 : undefined,
                          color: !isActive && duetColor ? `${duetColor}66` : undefined,
                        }}>
                        {isActive
                          ? <KaraokeWipeLine ref={wipeApiRef} text={line.text || '♪'} showBall={opts.showBall} color={lineColor(i)} />
                          : (line.text || '♪')}
                      </p>
                    );
                  })
                ) : (
                  <p className="mx-auto max-w-3xl text-lg text-white/50">Letra sincronizada em breve.</p>
                )}
              </div>
            )
          )}

          {apiError && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 px-6 text-center text-white/70">
              <Music className="h-10 w-10 text-white/30" />
              <p className="text-sm">Não foi possível carregar o leitor. Tenta recarregar a página.</p>
            </div>
          )}
        </div>
      )}

      {/* Bandeau de traduction (barre noire, gros texte) */}
      {phase === 'live' && opts.translate !== 'off' && translation && (
        <div className="pointer-events-none shrink-0 bg-black px-6 py-3 text-center md:py-4">
          <p className="mx-auto max-w-4xl text-lg font-semibold leading-snug text-white/90 md:text-2xl">
            {translation}
          </p>
        </div>
      )}

      {/* Couche de contrôle TV : barre de commandes révélée + progression/temps (permanents) */}
      {phase === 'live' && tvMode && (
        <div className="tv-karaoke-bottom">
          <div className={`tv-karaoke-controlbar ${controlsVisible ? 'is-visible' : ''}`} aria-hidden={!controlsVisible}>
            <button type="button" className="tv-kctrl-btn" tabIndex={controlsVisible ? 0 : -1}
              onClick={() => { seekBy(-10); revealControls(); }} aria-label="Voltar 10 segundos">
              <SkipBack className="h-6 w-6" /><span>10s</span>
            </button>
            <button type="button" className="tv-kctrl-btn" tabIndex={controlsVisible ? 0 : -1}
              onClick={handleRestartControl} aria-label="Recomeçar a música">
              <RotateCcw className="h-6 w-6" /><span>Recomeçar</span>
            </button>
            <button type="button" className="tv-kctrl-btn tv-kctrl-btn--main" tabIndex={controlsVisible ? 0 : -1}
              onClick={() => { togglePlay(); revealControls(); }}
              aria-label={isPlaying ? 'Pausar a música' : 'Continuar a música'}>
              {isPlaying ? <Pause className="h-7 w-7" /> : <Play className="h-7 w-7 fill-current" />}
              <span>{isPlaying ? 'Pausar' : 'Continuar'}</span>
            </button>
            <button type="button" className="tv-kctrl-btn" tabIndex={controlsVisible ? 0 : -1}
              onClick={() => { seekBy(10); revealControls(); }} aria-label="Avançar 10 segundos">
              <span>10s</span><SkipForward className="h-6 w-6" />
            </button>
          </div>
          <div className="tv-karaoke-progress">
            <span ref={tvTimeCurrentRef} className="tv-karaoke-time">0:00</span>
            <div className="tv-karaoke-progress-track">
              <div ref={tvProgressRef} className="tv-karaoke-progress-fill" style={{ width: '0%' }} />
            </div>
            <span ref={tvTimeTotalRef} className="tv-karaoke-time">--:--</span>
          </div>
        </div>
      )}

      {/* Contrôles bas (live) — masqués en TV (D-pad : OK=play/pause, ←/→=±10s, Retour=sair) */}
      {phase === 'live' && !tvMode && (
        <footer className="flex items-center justify-center gap-3 px-4 pt-5 pb-[max(env(safe-area-inset-bottom),1.25rem)] md:gap-4 md:pt-7 md:pb-[max(env(safe-area-inset-bottom),1.75rem)]">
          <CtrlButton onClick={handleReverse} title="Voltar (linha anterior)" aria-label="Voltar"><SkipBack className="h-5 w-5" /></CtrlButton>
          <CtrlButton onClick={handleRetry} title="Recomeçar esta linha" aria-label="Recomeçar linha"><RotateCcw className="h-5 w-5" /></CtrlButton>
          <button type="button" onClick={togglePlay} disabled={!playerReady}
            className="karaoke-focusable inline-flex h-16 w-16 items-center justify-center rounded-full bg-app-yellow text-black shadow-[0_0_40px_rgba(253,224,71,0.35)] transition hover:scale-105 disabled:opacity-40 md:h-20 md:w-20"
            aria-label={isPlaying ? 'Pausar' : 'Tocar'}>
            {isPlaying ? <Pause className="h-7 w-7 md:h-9 md:w-9" /> : <Play className="ml-1 h-7 w-7 fill-current md:h-9 md:w-9" />}
          </button>
          <CtrlButton onClick={handleStop} title="Parar e recomeçar do início" aria-label="Parar"><Square className="h-5 w-5" /></CtrlButton>
          {hasNext
            ? <CtrlButton onClick={onNext} title="Próxima da fila" aria-label="Próxima"><SkipForward className="h-5 w-5" /></CtrlButton>
            : <CtrlButton onClick={handleReverse} title="" disabled hidden><SkipForward className="h-5 w-5" /></CtrlButton>}
        </footer>
      )}

      {/* Panneau d'options TV (D-pad) — lazy, hors bundle mobile */}
      {tvMode && showOpts && phase === 'live' && (
        <Suspense fallback={null}>
          <KaraokeTvOptions
            opts={opts}
            setOpts={setOpts}
            onRestart={handleRestartControl}
            onExit={() => { setShowOpts(false); handleClose(); }}
          />
        </Suspense>
      )}

      {/* Nota final do medidor de energia */}
      {scoreResult && (
        <div className="absolute inset-0 z-40 flex flex-col items-center justify-center gap-5 bg-black/88 px-6 text-center backdrop-blur-md">
          <button type="button" onClick={handleClose} aria-label="Sair"
            className="karaoke-focusable absolute right-4 top-[max(env(safe-area-inset-top),1rem)] flex h-11 w-11 items-center justify-center rounded-full border border-white/15 bg-white/5 text-white/80 hover:bg-white/10">
            <X className="h-5 w-5" />
          </button>
          <div className="text-6xl md:text-7xl">{scoreResult.emoji}</div>
          <p className="text-sm font-bold uppercase tracking-widest text-white/50">A tua energia</p>
          <p className="karaoke-neon text-7xl font-black leading-none md:text-8xl">{scoreResult.score}</p>
          <p className="text-xl font-black text-app-yellow md:text-2xl">{scoreResult.grade}</p>
          <p className="max-w-xs text-xs text-white/40">Nota de energia/participação (não avalia a afinação).</p>
          <div className="mt-2 flex flex-wrap items-center justify-center gap-3">
            <button type="button" onClick={restartFromScore}
              className="karaoke-focusable inline-flex items-center gap-2 rounded-full bg-app-yellow px-7 py-3 text-base font-black text-black">
              <RotateCcw className="h-5 w-5" /> Cantar de novo
            </button>
            {hasNext && onNext && (
              <button type="button" onClick={onNext}
                className="karaoke-focusable inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-6 py-3 text-base font-bold text-white/85 hover:bg-white/10">
                <SkipForward className="h-5 w-5" /> Próxima
              </button>
            )}
            <button type="button" onClick={handleClose}
              className="karaoke-focusable rounded-full px-6 py-3 text-base font-semibold text-white/60 hover:text-white">
              Sair
            </button>
          </div>
        </div>
      )}
    </div>,
    document.body
  );
}

function CtrlButton({ onClick, disabled, title, hidden, children, ...rest }) {
  if (hidden) return <span className="h-12 w-12 md:h-14 md:w-14" aria-hidden="true" />;
  return (
    <button type="button" onClick={onClick} disabled={disabled} title={title} {...rest}
      className="karaoke-focusable inline-flex h-12 w-12 items-center justify-center rounded-full border border-white/15 bg-white/5 text-white/85 transition hover:bg-white/10 disabled:opacity-30 md:h-14 md:w-14">
      {children}
    </button>
  );
}

function ToggleRow({ label, icon: Icon, on, onClick }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <p className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-widest text-white/45">
        {Icon && <Icon className="h-3.5 w-3.5" />} {label}
      </p>
      <button onClick={onClick} aria-pressed={on} aria-label={label}
        className={`karaoke-focusable relative h-7 w-12 shrink-0 rounded-full transition ${on ? 'bg-app-yellow' : 'bg-white/15'}`}>
        <span className={`absolute top-1 h-5 w-5 rounded-full bg-white shadow transition-all ${on ? 'left-6' : 'left-1'}`} />
      </button>
    </div>
  );
}
