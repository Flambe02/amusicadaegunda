import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  ArrowLeft, ChevronLeft, ChevronRight, Play, Pause, Repeat, RotateCcw,
  Undo2, Redo2, Check, Upload, Music, Crosshair, Wand2, Volume2, VolumeX,
  ZoomIn, ZoomOut, Maximize, Monitor, Eye, AlertTriangle, Trash2,
} from 'lucide-react';
import { distributeWords } from '@/lib/wordDistribution';
import {
  normalizeWords, setWordStart, nudgeWordStart, validateLineWords,
} from '@/lib/ballMotion';
import BallSyncPreview from '@/components/karaoke/ball-sync/BallSyncPreview';
import WaveformCanvas from '@/components/karaoke/ball-sync/WaveformCanvas';
import '@/styles/karaoke.css';

const RATES = [1, 0.75, 0.5, 0.25];
const INTENSITY_KEY = 'karaoke-ball-intensity';

const wordsSignature = (ws) => (ws || []).map((w) => `${w.text}@${w.start.toFixed(3)}`).join('|');
const fmt = (s) => {
  if (!Number.isFinite(s)) return '0:00.0';
  const m = Math.floor(s / 60);
  const r = (s - m * 60).toFixed(1).padStart(4, '0');
  return `${m}:${r}`;
};

/**
 * KaraokeBallSyncStudio — mode focalisé « Afinar palavras e bola ».
 *
 * Édite UNE ligne à la fois. Réutilise la MÊME forme de mot ({id,text,start,end}) et
 * les composants de rendu partagés (KaraokeWordLine). N'écrit rien en base : au
 * « Concluir », renvoie les mots au parent via `onCommit` (un seul pas d'historique) ;
 * la sauvegarde durable reste le « Guardar » du parent. L'audio local n'est JAMAIS envoyé.
 */
export default function KaraokeBallSyncStudio({
  song, lineIndex, totalLines, line,
  phraseStart: phraseStartProp, phraseEnd: phraseEndProp,
  videoDuration = 0, onCommit, onNavigate, canPrev, canNext, onClose,
  audioSession, offsetMs = 0, onOffsetChange,
  onPickAudio, onReopenAudio, onRemoveAudio, pendingAudioName,
}) {
  const reducedMotion = useMemo(
    () => typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches,
    [],
  );
  // Session audio locale FOURNIE PAR LE PARENT (persiste entre les lignes et à la
  // fermeture du studio — l'élément <audio> et l'onde décodée ne sont jamais recréés).
  const audio = audioSession;
  const audioEl = audio.audioRef.current;

  // ── Bornes de frase (début/fin) — éditables dans le studio (poignées jaunes sur
  // l'onde + champs numériques). Initialisées depuis le parent ; renvoyées au
  // « Concluir » SEULEMENT si modifiées (sinon `line.time`/`line.endTime` inchangés). ──
  const [phraseStart, setPhraseStart] = useState(phraseStartProp);
  const [phraseEnd, setPhraseEnd] = useState(phraseEndProp);
  const phraseStartRef = useRef(phraseStart); phraseStartRef.current = phraseStart;
  const phraseEndRef = useRef(phraseEnd); phraseEndRef.current = phraseEnd;
  const startEdited = phraseStart !== phraseStartProp;
  const endEdited = phraseEnd !== phraseEndProp;

  // ── Mots de travail (copie locale) ──
  const [words, setWords] = useState(() => (
    Array.isArray(line.words) && line.words.length > 0
      ? normalizeWords(line.words, phraseStartProp, phraseEndProp)
      : distributeWords(line.text, phraseStartProp, phraseEndProp)
  ));
  const wordsRef = useRef(words); wordsRef.current = words;
  const autoDistributed = !(Array.isArray(line.words) && line.words.length > 0);
  const initialSig = useRef(wordsSignature(words));
  const dirty = wordsSignature(words) !== initialSig.current || startEdited || endEdited;

  const [selectedWord, setSelectedWord] = useState(0);
  const selectedWordRef = useRef(0); selectedWordRef.current = selectedWord;

  // ── Historique local (mots + bornes de frase) ──
  const pastRef = useRef([]);
  const futureRef = useRef([]);
  const [canUndo, setCanUndo] = useState(false);
  const [canRedo, setCanRedo] = useState(false);
  const snapshot = useCallback(() => ({ words: wordsRef.current, phraseStart: phraseStartRef.current, phraseEnd: phraseEndRef.current }), []);
  const restore = useCallback((snap) => { setWords(snap.words); setPhraseStart(snap.phraseStart); setPhraseEnd(snap.phraseEnd); }, []);
  const pushHistory = useCallback(() => {
    pastRef.current.push(snapshot());
    if (pastRef.current.length > 100) pastRef.current.shift();
    futureRef.current = [];
    setCanUndo(true); setCanRedo(false);
  }, [snapshot]);
  const commitWords = useCallback((next) => { pushHistory(); setWords(next); }, [pushHistory]);
  const undo = useCallback(() => {
    if (!pastRef.current.length) return;
    futureRef.current.push(snapshot());
    restore(pastRef.current.pop());
    setCanUndo(pastRef.current.length > 0); setCanRedo(true);
  }, [snapshot, restore]);
  const redo = useCallback(() => {
    if (!futureRef.current.length) return;
    pastRef.current.push(snapshot());
    restore(futureRef.current.pop());
    setCanRedo(futureRef.current.length > 0); setCanUndo(true);
  }, [snapshot, restore]);

  // ── Offset audio local ↔ vidéo — contrôlé par le parent (persiste + partagé avec
  // l'aperçu d'onde de l'écran principal). Le parent le persiste en localStorage.
  const setOffsetMs = onOffsetChange;
  const offsetSec = offsetMs / 1000;

  // ── Intensité de la boule ──
  const [intensity, setIntensity] = useState(() => localStorage.getItem(INTENSITY_KEY) || 'classica');
  useEffect(() => { try { localStorage.setItem(INTENSITY_KEY, intensity); } catch { /* noop */ } }, [intensity]);

  // ── Horloge : refs haute fréquence (video = audio + offset) ──
  const audioTimeRef = useRef(Math.max(0, phraseStart - offsetSec));
  const videoTimeRef = useRef(phraseStart);
  const isPlayingRef = useRef(false);
  const [scrubTime, setScrubTime] = useState(phraseStart); // temps VIDÉO affiché
  const lastDispRef = useRef(0);

  const [isPlaying, setIsPlaying] = useState(false);
  const [rate, setRate] = useState(1);
  const [loop, setLoop] = useState(true);
  const [preRoll] = useState(2); // pré-roll par défaut (§20) — fixe dans cette version
  const [postRoll] = useState(1);
  const [volume] = useState(1);
  const [muted, setMuted] = useState(false);
  const [previewMode, setPreviewMode] = useState('tecnica');
  const [captureActive, setCaptureActive] = useState(false);
  const captureActiveRef = useRef(false); captureActiveRef.current = captureActive;
  const captureIdxRef = useRef(0);

  const audioPhraseStart = phraseStart - offsetSec;
  const audioPhraseEnd = phraseEnd - offsetSec;
  const loopStart = Math.max(0, audioPhraseStart - preRoll);
  const loopEnd = audio.duration ? Math.min(audio.duration, audioPhraseEnd + postRoll) : audioPhraseEnd + postRoll;

  useEffect(() => { isPlayingRef.current = isPlaying; }, [isPlaying]);

  const seekAudio = useCallback((tAudio) => {
    const t = Math.max(0, tAudio);
    if (audioEl && audio.ready) { try { audioEl.currentTime = t; } catch { /* noop */ } }
    audioTimeRef.current = t;
    videoTimeRef.current = t + offsetSec;
    setScrubTime(t + offsetSec);
  }, [audioEl, audio.ready, offsetSec]);

  const play = useCallback(() => {
    if (!audio.ready || !audioEl) return;
    if (audioEl.currentTime < loopStart - 0.01 || audioEl.currentTime > loopEnd) {
      try { audioEl.currentTime = loopStart; } catch { /* noop */ }
    }
    audioEl.playbackRate = rate;
    audioEl.muted = muted;
    audioEl.volume = volume;
    audioEl.play().then(() => setIsPlaying(true)).catch(() => {});
  }, [audio.ready, audioEl, loopStart, loopEnd, rate, muted, volume]);
  const pause = useCallback(() => { audioEl?.pause(); setIsPlaying(false); }, [audioEl]);
  const togglePlay = useCallback(() => { if (isPlayingRef.current) pause(); else play(); }, [play, pause]);
  const restartPhrase = useCallback(() => { seekAudio(loopStart); }, [seekAudio, loopStart]);

  // Au montage / changement de ligne : place la tête de lecture au début de la frase
  // (l'audio persistant du parent peut être resté à la position d'une autre ligne).
  const didInitRef = useRef(false);
  useEffect(() => {
    if (didInitRef.current || !audio.ready) return;
    didInitRef.current = true;
    seekAudio(loopStart);
  }, [audio.ready, loopStart, seekAudio]);

  useEffect(() => { if (audioEl) audioEl.playbackRate = rate; }, [rate, audioEl]);
  useEffect(() => { if (audioEl) { audioEl.volume = volume; audioEl.muted = muted; } }, [volume, muted, audioEl]);

  // Master rAF pendant la lecture : met à jour les refs + gère loop/arrêt post-roll.
  useEffect(() => {
    if (!isPlaying) return undefined;
    let raf = 0;
    const tick = () => {
      const a = audioEl ? audioEl.currentTime : 0;
      audioTimeRef.current = a;
      videoTimeRef.current = a + offsetSec;
      if (a >= loopEnd) {
        if (loop) { try { audioEl.currentTime = loopStart; } catch { /* noop */ } }
        else { audioEl?.pause(); setIsPlaying(false); return; }
      }
      const now = performance.now();
      if (now - lastDispRef.current > 90) { lastDispRef.current = now; setScrubTime(a + offsetSec); }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [isPlaying, loop, loopStart, loopEnd, offsetSec, audioEl]);

  // Hors lecture : le scrubber pilote l'aperçu.
  useEffect(() => {
    if (isPlaying) return;
    videoTimeRef.current = scrubTime;
    audioTimeRef.current = scrubTime - offsetSec;
  }, [scrubTime, offsetSec, isPlaying]);

  // ── Capture par toque (Espaço) ──
  const captureNext = useCallback(() => {
    const i = captureIdxRef.current;
    const cur = wordsRef.current;
    if (i >= cur.length) { setCaptureActive(false); return; }
    commitWords(setWordStart(cur, i, videoTimeRef.current, phraseStart, phraseEnd));
    const next = i + 1;
    captureIdxRef.current = next;
    setSelectedWord(Math.min(next, cur.length - 1));
    if (next >= cur.length) { setCaptureActive(false); restartPhrase(); if (audio.ready) play(); }
  }, [commitWords, phraseStart, phraseEnd, restartPhrase, play, audio.ready]);

  const startCapture = useCallback(() => {
    if (!audio.ready) return;
    captureIdxRef.current = 0;
    setSelectedWord(0);
    seekAudio(loopStart);
    setCaptureActive(true);
    if (typeof document !== 'undefined') document.activeElement?.blur?.();
    play();
  }, [audio.ready, seekAudio, loopStart, play]);
  const stopCapture = useCallback(() => setCaptureActive(false), []);

  // ── Édition de mots ──
  const placeWordAtNow = useCallback((i) => {
    commitWords(setWordStart(wordsRef.current, i, videoTimeRef.current, phraseStart, phraseEnd));
    setSelectedWord(i);
  }, [commitWords, phraseStart, phraseEnd]);
  const nudge = useCallback((ms) => {
    commitWords(nudgeWordStart(wordsRef.current, selectedWordRef.current, ms / 1000, phraseStart, phraseEnd));
  }, [commitWords, phraseStart, phraseEnd]);
  const redistribute = useCallback(() => {
    commitWords(distributeWords(line.text, phraseStart, phraseEnd));
    setSelectedWord(0);
  }, [commitWords, line.text, phraseStart, phraseEnd]);

  // Revisar palavra : ~500ms avant → mot → ~500ms après.
  const reviewWord = useCallback(() => {
    const w = wordsRef.current[selectedWordRef.current];
    if (!w || !audio.ready) return;
    seekAudio(Math.max(0, w.start - offsetSec - 0.5));
    play();
  }, [audio.ready, seekAudio, offsetSec, play]);

  // ── Waveform : glisser un marqueur de mot ──
  const onMarkerDragStart = useCallback(() => { pushHistory(); }, [pushHistory]);
  const onMarkerDrag = useCallback((idx, tAudio) => {
    setWords((w) => setWordStart(w, idx, tAudio + offsetSec, phraseStartRef.current, phraseEndRef.current));
  }, [offsetSec]);

  // ── Bornes de frase : glisser les poignées jaunes (início/fim) sur l'onde ──
  const onRegionDragStart = useCallback(() => { pushHistory(); }, [pushHistory]);
  const onRegionDrag = useCallback((edge, tAudio) => {
    const tVideo = tAudio + offsetSec;
    if (edge === 'start') {
      const ns = Math.max(0, Math.min(tVideo, phraseEndRef.current - 0.1));
      setPhraseStart(ns);
      setWords((w) => normalizeWords(w, ns, phraseEndRef.current));
    } else {
      const ne = Math.max(phraseStartRef.current + 0.1, tVideo);
      setPhraseEnd(ne);
      setWords((w) => normalizeWords(w, phraseStartRef.current, ne));
    }
  }, [offsetSec]);
  // Édition numérique d'une borne (un pas d'historique).
  const setPhraseBound = useCallback((edge, tVideo) => {
    if (!Number.isFinite(tVideo)) return;
    pushHistory();
    if (edge === 'start') {
      const ns = Math.max(0, Math.min(tVideo, phraseEndRef.current - 0.1));
      setPhraseStart(ns);
      setWords((w) => normalizeWords(w, ns, phraseEndRef.current));
    } else {
      const ne = Math.max(phraseStartRef.current + 0.1, tVideo);
      setPhraseEnd(ne);
      setWords((w) => normalizeWords(w, phraseStartRef.current, ne));
    }
  }, [pushHistory]);

  // ── Vue de l'onde (zoom/pan) ──
  const [view, setView] = useState({ start: 0, end: 0 });
  useEffect(() => {
    // Ajuste la vue par défaut une fois l'onde disponible / la région connue.
    if (view.end > view.start) return;
    const pad = 0.6;
    const s = Math.max(0, loopStart - pad);
    const e = (audio.duration ? Math.min(audio.duration, loopEnd + pad) : loopEnd + pad);
    if (e > s) setView({ start: s, end: e });
  }, [audio.duration, loopStart, loopEnd, view.start, view.end]);
  const zoom = (factor) => setView((v) => {
    const c = (audioTimeRef.current);
    const span = (v.end - v.start) * factor;
    let s = c - span / 2; let e = c + span / 2;
    if (s < 0) { e -= s; s = 0; }
    if (audio.duration && e > audio.duration) { s -= (e - audio.duration); e = audio.duration; s = Math.max(0, s); }
    return { start: s, end: Math.max(s + 0.2, e) };
  });
  const fitView = () => setView(() => {
    const pad = 0.6;
    const s = Math.max(0, loopStart - pad);
    const e = (audio.duration ? Math.min(audio.duration, loopEnd + pad) : loopEnd + pad);
    return { start: s, end: Math.max(s + 0.2, e) };
  });

  // ── Sortie (définie avant le clavier global qui l'utilise) ──
  const handleClose = useCallback(() => {
    if (dirty && !window.confirm('Descartar os ajustes desta linha?')) return;
    pause();
    onClose?.();
  }, [dirty, pause, onClose]);

  // ── Clavier global ──
  useEffect(() => {
    const onKey = (e) => {
      const t = e.target;
      const tag = (t?.tagName || '').toLowerCase();
      if (t?.isContentEditable || tag === 'input' || tag === 'textarea' || tag === 'select') return;

      if (e.code === 'Space') {
        e.preventDefault();
        if (captureActiveRef.current) { if (!e.repeat) captureNext(); }
        else togglePlay();
        return;
      }
      if (e.key === 'Escape') { if (captureActiveRef.current) stopCapture(); else handleClose(); return; }
      if (e.key === 'k' || e.key === 'K') { e.preventDefault(); togglePlay(); return; }
      if (e.key === 'r' || e.key === 'R') { restartPhrase(); return; }
      if (e.key === 'l' || e.key === 'L') { setLoop((v) => !v); return; }
      if ((e.ctrlKey || e.metaKey) && (e.key === 'z' || e.key === 'Z')) { e.preventDefault(); if (e.shiftKey) redo(); else undo(); return; }
      if ((e.ctrlKey || e.metaKey) && (e.key === 'y' || e.key === 'Y')) { e.preventDefault(); redo(); return; }
      if (e.key === 'Backspace') { e.preventDefault(); undo(); return; }
      if (e.key === 'ArrowLeft') {
        if (e.altKey) { e.preventDefault(); nudge(e.shiftKey ? -100 : -25); }
        else setSelectedWord((i) => Math.max(0, i - 1));
        return;
      }
      if (e.key === 'ArrowRight') {
        if (e.altKey) { e.preventDefault(); nudge(e.shiftKey ? 100 : 25); }
        else setSelectedWord((i) => Math.min(wordsRef.current.length - 1, i + 1));
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [captureNext, togglePlay, restartPhrase, undo, redo, nudge, stopCapture, handleClose]);

  // ── Sortie ──
  const buildResult = useCallback(() => ({
    words: normalizeWords(wordsRef.current, phraseStartRef.current, phraseEndRef.current),
    phraseStart: phraseStartRef.current,
    phraseEnd: phraseEndRef.current,
    startEdited: phraseStartRef.current !== phraseStartProp,
    endEdited: phraseEndRef.current !== phraseEndProp,
  }), [phraseStartProp, phraseEndProp]);
  const handleConcluir = useCallback(() => {
    pause();
    onCommit?.(buildResult());
  }, [pause, onCommit, buildResult]);
  // Prev/Next : commite la ligne courante SEULEMENT si modifiée (pas de perte silencieuse),
  // puis le parent bascule sur la ligne voisine (le studio est remonté à neuf via `key`).
  const navigate = useCallback((dir) => {
    pause();
    onNavigate?.(dir, dirty ? buildResult() : null);
  }, [pause, onNavigate, dirty, buildResult]);

  // ── Dérivés d'affichage ──
  const markers = useMemo(() => words.map((w) => ({ time: w.start - offsetSec, text: w.text })), [words, offsetSec]);
  const issues = useMemo(() => validateLineWords(words, phraseStart, phraseEnd), [words, phraseStart, phraseEnd]);
  const errorCount = issues.filter((i) => i.level === 'error').length;
  const durMismatch = audio.duration && videoDuration
    && (Math.abs(audio.duration - videoDuration) > 2 || Math.abs(audio.duration - videoDuration) / videoDuration > 0.015);
  const selected = words[selectedWord];

  const stateLabel = captureActive ? 'Capturando' : isPlaying ? 'Reproduzindo' : dirty ? 'Alterações não salvas' : 'Pronto';

  const pickAudio = () => onPickAudio?.();

  return createPortal(
    <div className="fixed inset-0 z-[10000] flex flex-col bg-[#0d0a12] text-white" role="dialog" aria-label="Afinar palavras e bola">
      {/* ══════════ HEADER ══════════ */}
      <header className="flex shrink-0 items-center gap-3 border-b border-white/10 bg-black/40 px-4 py-2">
        <button onClick={handleClose} className="karaoke-focusable inline-flex items-center gap-1.5 rounded-lg bg-white/5 px-3 py-1.5 text-sm font-semibold hover:bg-white/10">
          <ArrowLeft size={16} /> Voltar
        </button>
        <div className="min-w-0">
          <p className="truncate text-sm font-bold">{song?.title || 'Karaokê'}</p>
          <p className="text-[11px] text-gray-400">Linha {lineIndex + 1} de {totalLines}</p>
        </div>
        <div className="mx-auto flex items-center gap-2">
          <span className="text-sm font-black text-app-yellow">Afinar palavras e bola</span>
          <span aria-live="polite" className={`rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${captureActive ? 'bg-red-500/20 text-red-200' : isPlaying ? 'bg-purple-500/20 text-purple-200' : dirty ? 'bg-amber-500/20 text-amber-200' : 'bg-white/10 text-gray-300'}`}>
            {stateLabel}
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          <IconBtn onClick={() => navigate(-1)} disabled={!canPrev} label="Linha anterior (guarda e recua)"><ChevronLeft size={16} /></IconBtn>
          <IconBtn onClick={undo} disabled={!canUndo} label="Anular (Ctrl+Z)"><Undo2 size={16} /></IconBtn>
          <IconBtn onClick={redo} disabled={!canRedo} label="Refazer (Ctrl+Shift+Z)"><Redo2 size={16} /></IconBtn>
          {/* Secundário : aplica e FECHA (volta ao editor). */}
          <button onClick={handleConcluir} disabled={errorCount > 0} title={errorCount > 0 ? 'Corrija os erros antes de concluir' : 'Aplicar e voltar ao editor'} className="karaoke-focusable inline-flex items-center gap-1.5 rounded-lg border border-emerald-500/50 bg-emerald-600/15 px-3 py-1.5 text-sm font-semibold text-emerald-200 hover:bg-emerald-600/25 disabled:opacity-40">
            <Check size={16} /> Concluir e sair
          </button>
          {/* Principal : aplica e vai à PRÓXIMA linha SEM sair do estúdio. */}
          <button onClick={() => navigate(1)} disabled={errorCount > 0 || !canNext} title={!canNext ? 'Não há próxima linha sincronizada' : 'Guarda esta linha e continua na próxima, sem sair'} className="karaoke-focusable inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3.5 py-1.5 text-sm font-bold text-white hover:bg-emerald-700 disabled:opacity-40">
            Salvar e próxima <ChevronRight size={16} />
          </button>
        </div>
      </header>

      {/* ══════════ APERÇU (35–45%) ══════════ */}
      <section className="relative flex min-h-0 flex-[1.1] items-center justify-center overflow-hidden bg-gradient-to-b from-[#17111f] to-[#0d0a12]">
        <div className="absolute left-3 top-3 flex items-center gap-1 rounded-lg bg-black/40 p-0.5">
          {[['tecnica', 'Preview técnica', Eye], ['tv', 'Preview TV', Monitor]].map(([key, lbl, Ico]) => (
            <button key={key} onClick={() => setPreviewMode(key)} aria-pressed={previewMode === key} className={`inline-flex items-center gap-1 rounded-md px-2.5 py-1 text-[11px] font-semibold ${previewMode === key ? 'bg-purple-600 text-white' : 'text-gray-400 hover:bg-white/10'}`}>
              <Ico size={13} /> {lbl}
            </button>
          ))}
        </div>
        {autoDistributed && !dirty && (
          <div className="absolute right-3 top-3 rounded-lg bg-violet-500/15 px-2.5 py-1 text-[11px] text-violet-200">
            Distribuição inicial. Ajuste ouvindo a música.
          </div>
        )}
        <BallSyncPreview
          words={words}
          phraseStart={phraseStart}
          phraseEnd={phraseEnd}
          currentTimeRef={videoTimeRef}
          mode={previewMode}
          intensity={intensity}
          reducedMotion={reducedMotion}
          onWordClick={placeWordAtNow}
        />
        {previewMode === 'tecnica' && (
          <p className="absolute bottom-2 left-1/2 -translate-x-1/2 text-[11px] text-gray-500">Clique numa palavra para posicionar a bola no tempo atual.</p>
        )}
      </section>

      {/* ══════════ ONDA + MARCADORES (30–40%) ══════════ */}
      <section className="shrink-0 border-y border-white/10 bg-black/30 px-4 py-2">
        {!audio.fileName ? (
          <LocalAudioLoader onPick={pickAudio} onReopen={onReopenAudio} pendingAudioName={pendingAudioName} loading={audio.loading} />
        ) : (
          <>
            <div className="mb-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-gray-400">
              <span className="inline-flex items-center gap-1 font-semibold text-gray-200"><Music size={12} /> {audio.fileName}</span>
              <span>{fmt(audio.duration)}</span>
              <span className="text-emerald-300/80">Este áudio permanece neste computador e não é enviado ao servidor.</span>
              <button onClick={pickAudio} className="karaoke-focusable ml-auto inline-flex items-center gap-1 rounded bg-white/5 px-2 py-0.5 hover:bg-white/10">
                <Upload size={11} /> Trocar áudio
              </button>
              <button onClick={() => onRemoveAudio?.()} className="karaoke-focusable inline-flex items-center gap-1 rounded bg-white/5 px-2 py-0.5 hover:bg-white/10"><Trash2 size={11} /> Remover áudio</button>
              <IconBtn onClick={() => zoom(0.7)} label="Zoom +"><ZoomIn size={14} /></IconBtn>
              <IconBtn onClick={() => zoom(1.4)} label="Zoom −"><ZoomOut size={14} /></IconBtn>
              <IconBtn onClick={fitView} label="Ajustar à frase"><Maximize size={14} /></IconBtn>
            </div>
            {durMismatch && (
              <p className="mb-1.5 inline-flex items-center gap-1.5 rounded bg-amber-500/10 px-2 py-1 text-[11px] text-amber-200">
                <AlertTriangle size={12} /> O áudio local tem {fmt(audio.duration)} e o vídeo tem {fmt(videoDuration)}. Verifique se é a mesma versão.
              </p>
            )}
            <WaveformCanvas
              peaks={audio.peaks}
              duration={audio.duration}
              viewStart={view.start}
              viewEnd={view.end}
              regionStart={audioPhraseStart}
              regionEnd={audioPhraseEnd}
              preRoll={preRoll}
              postRoll={postRoll}
              markers={markers}
              selectedIndex={selectedWord}
              currentTimeRef={audioTimeRef}
              isPlayingRef={isPlayingRef}
              onSeek={(ta) => seekAudio(ta)}
              onMarkerDragStart={onMarkerDragStart}
              onMarkerDrag={onMarkerDrag}
              onSelectMarker={setSelectedWord}
              onRegionDragStart={onRegionDragStart}
              onRegionDrag={onRegionDrag}
              height={130}
            />
            <p className="mt-1 text-[11px] text-gray-500">
              Arraste as <span className="text-violet-300">pastilhas ◕</span> para mover cada palavra · as pegas <span className="text-app-yellow">▼ início / fim</span> (topo) ajustam a frase · clique para navegar.
            </p>
          </>
        )}
      </section>

      {/* ══════════ CONTROLES ══════════ */}
      <section className="flex shrink-0 flex-wrap items-start gap-x-5 gap-y-2 bg-black/40 px-4 py-2.5">
        {/* Reprodução */}
        <ControlGroup label="Reprodução">
          <IconBtn onClick={restartPhrase} disabled={!audio.ready} label="Reiniciar frase (R)"><RotateCcw size={15} /></IconBtn>
          <button onClick={togglePlay} disabled={!audio.ready} aria-label={isPlaying ? 'Pausar' : 'Tocar'} className="karaoke-focusable inline-flex h-9 w-11 items-center justify-center rounded-lg bg-purple-600 hover:bg-purple-700 disabled:opacity-40">
            {isPlaying ? <Pause size={16} /> : <Play size={16} className="ml-0.5 fill-current" />}
          </button>
          <IconBtn onClick={() => setLoop((v) => !v)} active={loop} label="Repetir frase (L)"><Repeat size={15} /></IconBtn>
          <select value={rate} onChange={(e) => setRate(parseFloat(e.target.value))} aria-label="Velocidade" className="rounded-lg border border-white/10 bg-white/5 px-1.5 py-1.5 text-[11px] font-semibold outline-none">
            {RATES.map((r) => <option key={r} value={r} className="bg-[#1a1420]">{r}×</option>)}
          </select>
          <IconBtn onClick={() => setMuted((m) => !m)} active={muted} label={muted ? 'Reativar som' : 'Silenciar'}>{muted ? <VolumeX size={15} /> : <Volume2 size={15} />}</IconBtn>
        </ControlGroup>

        {/* Captura */}
        <ControlGroup label="Palavras">
          <button
            onClick={captureActive ? stopCapture : startCapture}
            disabled={!audio.ready}
            aria-pressed={captureActive}
            className={`karaoke-focusable inline-flex items-center gap-1.5 rounded-lg border px-3 py-2 text-xs font-bold transition-colors disabled:opacity-40 ${captureActive ? 'animate-pulse border-red-400/60 bg-red-500/20 text-red-200' : 'border-purple-500/40 bg-purple-600/20 text-purple-200 hover:bg-purple-600/30'}`}
          >
            <Crosshair size={14} /> {captureActive ? 'Capturando… (Esc)' : 'Capturar palavras'}
          </button>
          <button onClick={redistribute} title="Recalcular distribuição automática" className="karaoke-focusable inline-flex items-center gap-1 rounded-lg border border-white/10 bg-white/5 px-2.5 py-2 text-xs font-semibold hover:bg-white/10"><Wand2 size={13} /> Distribuir</button>
          <button onClick={reviewWord} disabled={!audio.ready} className="karaoke-focusable inline-flex items-center gap-1 rounded-lg border border-white/10 bg-white/5 px-2.5 py-2 text-xs font-semibold hover:bg-white/10 disabled:opacity-40"><Eye size={13} /> Revisar palavra</button>
        </ControlGroup>

        {/* Ajuste fino do mot sélectionné */}
        <ControlGroup label={selected ? `Palavra: « ${selected.text} »` : 'Palavra'}>
          <IconBtn onClick={() => setSelectedWord((i) => Math.max(0, i - 1))} label="Palavra anterior (←)"><ChevronLeft size={15} /></IconBtn>
          <div className="flex items-center gap-0.5 rounded-lg border border-white/10 bg-white/5 p-0.5">
            {[-100, -25, -10, 10, 25, 100].map((ms) => (
              <button key={ms} onClick={() => nudge(ms)} disabled={!selected} className="karaoke-focusable rounded px-1.5 py-1 text-[10px] font-semibold text-gray-300 hover:bg-white/10 hover:text-white disabled:opacity-30">{ms > 0 ? '+' : ''}{ms}</button>
            ))}
          </div>
          <IconBtn onClick={() => setSelectedWord((i) => Math.min(words.length - 1, i + 1))} label="Próxima palavra (→)"><ChevronRight size={15} /></IconBtn>
          {selected && (
            <label className="flex items-center gap-1 text-[11px] text-gray-400">
              início
              <input
                type="number" step="0.01" value={selected.start.toFixed(2)}
                onChange={(e) => { const v = parseFloat(e.target.value); if (Number.isFinite(v)) commitWords(setWordStart(wordsRef.current, selectedWord, v, phraseStart, phraseEnd)); }}
                className="w-16 rounded border border-white/10 bg-white/5 px-1 py-0.5 text-[11px] outline-none"
              />s
            </label>
          )}
        </ControlGroup>

        {/* Bornes de frase (início / fim) */}
        <ControlGroup label="Frase (início / fim)">
          <label className="flex items-center gap-1 text-[11px] text-app-yellow">
            início
            <input
              type="number" step="0.01" value={phraseStart.toFixed(2)}
              onChange={(e) => setPhraseBound('start', parseFloat(e.target.value))}
              className="w-16 rounded border border-app-yellow/40 bg-white/5 px-1 py-0.5 text-[11px] text-app-yellow outline-none"
            />s
          </label>
          <label className="flex items-center gap-1 text-[11px] text-app-yellow">
            fim
            <input
              type="number" step="0.01" value={phraseEnd.toFixed(2)}
              onChange={(e) => setPhraseBound('end', parseFloat(e.target.value))}
              className="w-16 rounded border border-app-yellow/40 bg-white/5 px-1 py-0.5 text-[11px] text-app-yellow outline-none"
            />s
          </label>
          <div className="flex items-center gap-0.5 rounded-lg border border-white/10 bg-white/5 p-0.5" title="Ajustar o fim da frase">
            {[-100, -25, 25, 100].map((ms) => (
              <button key={ms} onClick={() => setPhraseBound('end', phraseEndRef.current + ms / 1000)} className="karaoke-focusable rounded px-1.5 py-1 text-[10px] font-semibold text-gray-300 hover:bg-white/10 hover:text-white">{ms > 0 ? '+' : ''}{ms}</button>
            ))}
            <span className="px-1 text-[9px] text-white/40">fim</span>
          </div>
        </ControlGroup>

        {/* Intensidade da bola */}
        <ControlGroup label="Intensidade da bola">
          <div className="flex items-center gap-0.5 rounded-lg border border-white/10 bg-white/5 p-0.5">
            {[['suave', 'Suave'], ['classica', 'Clássica'], ['marcada', 'Marcada']].map(([key, lbl]) => (
              <button key={key} onClick={() => setIntensity(key)} aria-pressed={intensity === key} className={`rounded px-2 py-1 text-[10px] font-semibold ${intensity === key ? 'bg-app-yellow text-black' : 'text-gray-300 hover:bg-white/10'}`}>{lbl}</button>
            ))}
          </div>
        </ControlGroup>

        {/* Offset áudio / vídeo */}
        <ControlGroup label="Offset áudio / vídeo">
          <div className="flex items-center gap-0.5 rounded-lg border border-white/10 bg-white/5 p-0.5">
            {[-100, -25, 25, 100].map((ms) => (
              <button key={ms} onClick={() => setOffsetMs((o) => o + ms)} className="karaoke-focusable rounded px-1.5 py-1 text-[10px] font-semibold text-gray-300 hover:bg-white/10 hover:text-white">{ms > 0 ? '+' : ''}{ms}</button>
            ))}
          </div>
          <input type="number" step="5" value={offsetMs} onChange={(e) => { const v = parseInt(e.target.value, 10); setOffsetMs(Number.isFinite(v) ? v : 0); }} className="w-16 rounded border border-white/10 bg-white/5 px-1 py-0.5 text-[11px] outline-none" aria-label="Offset em ms" />
          <span className="text-[11px] text-gray-500">ms</span>
          <IconBtn onClick={() => setOffsetMs(0)} label="Repor offset (0)"><RotateCcw size={13} /></IconBtn>
        </ControlGroup>
      </section>

      {/* Barra inferior : scrubber + estado de captura + validação */}
      <div className="flex shrink-0 items-center gap-3 border-t border-white/10 bg-black/50 px-4 py-1.5 text-[11px]">
        <span className="tabular-nums text-gray-400">{fmt(scrubTime)} <span className="text-gray-600">/ {fmt(phraseEnd)}</span></span>
        <input
          type="range" min={Math.max(0, phraseStart - preRoll)} max={phraseEnd + postRoll} step={0.01} value={Math.min(Math.max(scrubTime, phraseStart - preRoll), phraseEnd + postRoll)}
          onChange={(e) => { const v = parseFloat(e.target.value); setScrubTime(v); if (audio.ready) seekAudio(v - offsetSec); }}
          className="h-1.5 flex-1 accent-purple-500" aria-label="Posição na frase"
        />
        {captureActive && (
          <span aria-live="assertive" className="inline-flex items-center gap-1.5 rounded bg-red-500/15 px-2 py-0.5 font-semibold text-red-200">
            <Crosshair size={12} className="animate-pulse" /> {Math.min(captureIdxRef.current, words.length)} / {words.length} palavras — toque Espaço · Esc sai
          </span>
        )}
        {errorCount > 0
          ? <span className="inline-flex items-center gap-1 font-semibold text-red-300"><AlertTriangle size={12} /> {errorCount} erro(s) de timing</span>
          : <span className="text-emerald-300/70">Timing válido</span>}
      </div>
    </div>,
    document.body,
  );
}

function IconBtn({ onClick, disabled, active, label, children }) {
  return (
    <button
      onClick={onClick} disabled={disabled} title={label} aria-label={label} aria-pressed={active || undefined}
      className={`karaoke-focusable inline-flex h-9 w-9 items-center justify-center rounded-lg border text-gray-200 transition-colors disabled:opacity-30 ${active ? 'border-app-yellow/50 bg-app-yellow/15 text-app-yellow' : 'border-white/10 bg-white/5 hover:bg-white/10'}`}
    >
      {children}
    </button>
  );
}

function ControlGroup({ label, children }) {
  return (
    <div className="flex flex-col gap-1">
      <span className="text-[9px] font-bold uppercase tracking-wider text-white/35">{label}</span>
      <div className="flex flex-wrap items-center gap-1.5">{children}</div>
    </div>
  );
}

function LocalAudioLoader({ onPick, onReopen, pendingAudioName, loading }) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 py-6 text-center">
      <Music size={26} className="text-violet-300/60" />
      {pendingAudioName ? (
        <div className="flex flex-wrap items-center justify-center gap-2">
          <button onClick={() => onReopen?.()} className="karaoke-focusable inline-flex items-center gap-2 rounded-lg bg-app-yellow px-4 py-2 text-sm font-bold text-black hover:brightness-110">
            <Upload size={16} /> Reabrir áudio: {pendingAudioName}
          </button>
          <button onClick={() => onPick?.()} className="karaoke-focusable inline-flex items-center gap-2 rounded-lg border border-white/15 bg-white/5 px-3 py-2 text-sm font-semibold hover:bg-white/10">Escolher outro</button>
        </div>
      ) : (
        <button onClick={() => onPick?.()} className="karaoke-focusable inline-flex items-center gap-2 rounded-lg bg-purple-600 px-4 py-2 text-sm font-bold hover:bg-purple-700">
          <Upload size={16} /> {loading ? 'A carregar…' : 'Carregar áudio local'}
        </button>
      )}
      <p className="max-w-md text-[11px] text-emerald-300/80">Este áudio permanece neste computador e não é enviado ao servidor.</p>
      <p className="max-w-md text-[11px] text-gray-500">O áudio é memorizado neste aparelho — ao reabrir a música, basta um clique. Formatos: MP3, WAV, M4A, AAC, OGG (conforme o navegador).</p>
    </div>
  );
}
