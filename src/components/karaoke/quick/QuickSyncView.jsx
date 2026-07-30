import { useCallback, useEffect, useRef, useState } from 'react';
import { ArrowLeft, Play, Pause, SlidersHorizontal, Undo2, RotateCcw, ChevronLeft, ChevronRight, AlertTriangle } from 'lucide-react';
import {
  QS, QS_LABELS, quickInitial, quickReduce, canCapture, instructionFor,
  captureButtonLabel, quickProgress, isLineComplete,
} from '@/lib/quickSync';

const fmt = (s) => {
  if (!Number.isFinite(s)) return '0:00';
  const m = Math.floor(Math.max(0, s) / 60);
  return `${m}:${String(Math.floor(Math.max(0, s) - m * 60)).padStart(2, '0')}`;
};

/**
 * QuickSyncView — présentation FOCALISÉE de la capture des frases (« un maintien = une
 * frase »), montée par KaraokeSyncTool quand le mode de présentation est « quick ».
 *
 * Elle ne détient AUCUN timing : elle appelle les callbacks du parent, qui écrivent dans
 * le brouillon EXISTANT via beginCapture/completeCapture et l'horloge canonique. Le clavier
 * et le pointeur partagent la MÊME machine à états (`quickReduce`), et l'identité de la
 * ligne est gelée à l'appui.
 */
export default function QuickSyncView({
  songTitle, lines, activeIndex, block, sourceLabel, captureSource,
  isPlaying, currentTime, duration, canUndo,
  onBack, onOpenAdvanced, onTogglePlay, onSeekBy,
  onSelectLine, onStartCapture, onFinishCapture, onCancelCapture, onUndo, onSave, onPrepareAudio,
}) {
  const [state, setState] = useState(() => quickInitial({ blocked: block.blocked }));
  const stateRef = useRef(state); stateRef.current = state;
  const touch = typeof window !== 'undefined' && window.matchMedia?.('(hover: none)')?.matches;
  const progress = quickProgress(lines, activeIndex);
  const eligible = canCapture({ status: state.status, blocked: block.blocked, source: captureSource, activeIndex });

  const dispatch = useCallback((event) => setState((s) => quickReduce(s, event)), []);

  useEffect(() => {
    if (block.blocked) { dispatch({ type: 'block' }); return; }
    if (progress.complete) dispatch({ type: 'complete' }); else dispatch({ type: 'ready' });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [block.blocked, progress.complete]);

  /** Début : gèle la ligne et demande au parent d'écrire le début canonique. */
  const press = useCallback((pointerId) => {
    if (!eligible) return;
    const started = onStartCapture(activeIndex);
    if (!started) return;
    dispatch({ type: 'press', index: activeIndex, pointerId });
  }, [eligible, onStartCapture, activeIndex, dispatch]);

  /** Fin : clôture la ligne GELÉE, jamais celle sélectionnée entre-temps. */
  const release = useCallback((pointerId) => {
    const s = stateRef.current;
    if (s.status !== QS.CAPTURING) return;
    const want = s.pointerId ?? null;
    if (want !== (pointerId ?? null)) return;
    dispatch({ type: 'release', pointerId });
    const ok = onFinishCapture(s.owner.index);
    dispatch({ type: 'commit', ok: Boolean(ok) });
  }, [dispatch, onFinishCapture]);

  const cancel = useCallback(() => {
    if (stateRef.current.status !== QS.CAPTURING) return;
    onCancelCapture();
    dispatch({ type: 'cancel' });
  }, [onCancelCapture, dispatch]);

  // ── Clavier — une seule machine, mêmes règles que le pointeur ──
  useEffect(() => {
    if (block.blocked) return undefined;
    const editable = (el) => {
      if (!el) return false;
      const tag = el.tagName;
      return tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || el.isContentEditable
        || el.closest?.('[role="menu"]');
    };
    const onKeyDown = (e) => {
      if (editable(e.target)) return;
      if (e.key === ' ' || e.code === 'Space') {
        e.preventDefault();          // Quick Sync gère légitimement Espaço ici
        if (e.repeat) return;        // auto-repeat ignoré
        press(null);
        return;
      }
      if (e.key === 'Escape') { e.preventDefault(); cancel(); return; }
      if (stateRef.current.status === QS.CAPTURING) return; // pas de navigation en capture
      if (e.key === 'Backspace') { e.preventDefault(); onUndo(); return; }
      if (e.key === 'ArrowLeft') { e.preventDefault(); onSelectLine(activeIndex - 1); return; }
      if (e.key === 'ArrowRight') { e.preventDefault(); onSelectLine(activeIndex + 1); return; }
      if (e.key === 'p' || e.key === 'P') { e.preventDefault(); onTogglePlay(); }
    };
    const onKeyUp = (e) => {
      if (editable(e.target)) return;
      if (e.key === ' ' || e.code === 'Space') { e.preventDefault(); release(null); }
    };
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
    };
  }, [block.blocked, press, release, cancel, onUndo, onSelectLine, onTogglePlay, activeIndex]);

  // Démontage pendant une capture : on ANNULE, jamais de fin fabriquée.
  useEffect(() => () => { if (stateRef.current.status === QS.CAPTURING) onCancelCapture(); },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []);

  // ── État bloqué (letra absente, mots déjà synchronisés, source indisponible) ──
  if (block.blocked) {
    return (
      <div className="flex min-h-0 flex-1 flex-col items-center justify-center gap-3 px-6 text-center">
        <AlertTriangle size={28} className="text-amber-300" />
        <h2 className="max-w-lg text-lg font-bold text-white">{block.title}</h2>
        {block.detail && <p className="max-w-md text-sm text-gray-400">{block.detail}</p>}
        <div className="mt-1 flex flex-wrap justify-center gap-2">
          <button
            type="button"
            onClick={block.primary === QS_LABELS.prepareAudio ? onPrepareAudio : onOpenAdvanced}
            className="karaoke-focusable min-h-[44px] rounded-xl bg-purple-600 px-4 py-2 text-sm font-bold text-white hover:bg-purple-700"
          >
            {block.primary}
          </button>
          <button type="button" onClick={onBack}
            className="karaoke-focusable min-h-[44px] rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm font-semibold hover:bg-white/10">
            {block.secondary}
          </button>
        </div>
      </div>
    );
  }

  const prev = activeIndex > 0 ? lines[activeIndex - 1] : null;
  const active = lines[activeIndex] || null;
  const next = activeIndex + 1 < lines.length ? lines[activeIndex + 1] : null;
  const capturing = state.status === QS.CAPTURING || state.status === QS.COMMITTING;

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      {/* ══ Cabeçalho ══ */}
      <header className="flex shrink-0 flex-wrap items-center gap-2 border-b border-white/10 bg-black/40 px-3 py-2">
        <button type="button" onClick={onBack}
          className="karaoke-focusable inline-flex min-h-[36px] items-center gap-1.5 rounded-lg bg-white/5 px-3 text-sm font-semibold hover:bg-white/10">
          <ArrowLeft size={15} /> {QS_LABELS.back}
        </button>
        <div className="min-w-0">
          <p className="truncate text-sm font-bold text-white">{songTitle}</p>
          <p className="text-[11px] text-gray-400">{progress.label}</p>
        </div>
        <span className="mx-auto rounded-full bg-app-yellow/15 px-2.5 py-1 text-[11px] font-black tracking-wide text-app-yellow">
          {QS_LABELS.feature}
        </span>
        <button type="button" onClick={onOpenAdvanced}
          className="karaoke-focusable inline-flex min-h-[36px] items-center gap-1.5 rounded-lg border border-white/10 bg-white/5 px-3 text-xs font-semibold hover:bg-white/10">
          <SlidersHorizontal size={14} /> {QS_LABELS.advanced}
        </button>
      </header>

      {/* ══ Áudio ══ */}
      <div className="flex shrink-0 flex-wrap items-center gap-2 border-b border-white/10 bg-black/20 px-3 py-2 text-[11px]">
        <button type="button" onClick={() => onSeekBy(-3)} aria-label={QS_LABELS.back3}
          className="karaoke-focusable min-h-[36px] rounded-lg border border-white/10 bg-white/5 px-2.5 font-bold hover:bg-white/10">−3 s</button>
        <button type="button" onClick={onTogglePlay} aria-label={isPlaying ? QS_LABELS.pause : QS_LABELS.play}
          className="karaoke-focusable inline-flex h-9 w-11 items-center justify-center rounded-lg bg-purple-600 text-white hover:bg-purple-700">
          {isPlaying ? <Pause size={15} /> : <Play size={15} className="ml-0.5 fill-current" />}
        </button>
        <button type="button" onClick={() => onSeekBy(3)} aria-label={QS_LABELS.fwd3}
          className="karaoke-focusable min-h-[36px] rounded-lg border border-white/10 bg-white/5 px-2.5 font-bold hover:bg-white/10">+3 s</button>
        <span className="tabular-nums text-gray-400">
          {fmt(currentTime)}{Number.isFinite(duration) && duration > 0 ? ` / ${fmt(duration)}` : ''}
        </span>
        <span className="ml-auto rounded-full bg-white/10 px-2 py-0.5 font-semibold text-gray-300">
          Sincronização com: {sourceLabel}
        </span>
      </div>

      {/* ══ Foco na letra ══ */}
      <div className="flex min-h-0 flex-1 flex-col items-center justify-center gap-2 px-5 text-center">
        <p className="max-w-2xl truncate text-sm text-white/30">{prev?.text || ''}</p>
        <p
          aria-live="polite"
          className={`max-w-4xl text-2xl font-black uppercase leading-tight transition-colors sm:text-3xl md:text-4xl ${
            capturing ? 'text-app-yellow' : 'text-white'
          }`}
        >
          {active?.text || '—'}
        </p>
        <p className="max-w-2xl truncate text-sm text-white/30">{next?.text || ''}</p>

        {active && isLineComplete(active) && (
          <p className="text-[11px] text-emerald-300/80">
            {active.time.toFixed(2)}s → {active.endTime.toFixed(2)}s
          </p>
        )}
        <p aria-live="polite" className={`mt-1 text-xs font-semibold ${state.error ? 'text-red-300' : 'text-gray-400'}`}>
          {instructionFor({ status: state.status, isPlaying, message: state.message, error: state.error })}
        </p>
      </div>

      {/* ══ Controle principal de captura ══ */}
      <div className="shrink-0 space-y-2 border-t border-white/10 bg-black/40 px-3 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
        <button
          type="button"
          disabled={!eligible && !capturing}
          aria-pressed={capturing}
          onPointerDown={(e) => { e.preventDefault(); e.currentTarget.setPointerCapture?.(e.pointerId); press(e.pointerId); }}
          onPointerUp={(e) => release(e.pointerId)}
          onPointerCancel={cancel}
          onLostPointerCapture={cancel}
          className={`karaoke-focusable w-full select-none rounded-2xl px-4 py-5 text-sm font-black tracking-wide transition-colors disabled:opacity-40 ${
            capturing ? 'bg-app-yellow text-black' : 'bg-purple-600 text-white hover:bg-purple-700'
          }`}
          style={{ touchAction: 'none' }}
        >
          {captureButtonLabel({ status: state.status, touch })}
        </button>

        <div className="flex flex-wrap items-center justify-center gap-1.5 text-[11px]">
          <button type="button" onClick={onUndo} disabled={!canUndo}
            className="karaoke-focusable inline-flex min-h-[36px] items-center gap-1 rounded-lg border border-white/10 bg-white/5 px-2.5 font-semibold hover:bg-white/10 disabled:opacity-30">
            <Undo2 size={13} /> {QS_LABELS.undo}
          </button>
          <button type="button" onClick={() => onSelectLine(activeIndex)}
            className="karaoke-focusable inline-flex min-h-[36px] items-center gap-1 rounded-lg border border-white/10 bg-white/5 px-2.5 font-semibold hover:bg-white/10">
            <RotateCcw size={13} /> {QS_LABELS.repeat}
          </button>
          <button type="button" onClick={() => onSelectLine(activeIndex - 1)} disabled={activeIndex <= 0}
            className="karaoke-focusable inline-flex min-h-[36px] items-center gap-1 rounded-lg border border-white/10 bg-white/5 px-2.5 font-semibold hover:bg-white/10 disabled:opacity-30">
            <ChevronLeft size={13} /> {QS_LABELS.previous}
          </button>
          <button type="button" onClick={() => onSelectLine(activeIndex + 1)} disabled={activeIndex >= lines.length - 1}
            aria-label="Próxima linha"
            className="karaoke-focusable inline-flex min-h-[36px] items-center rounded-lg border border-white/10 bg-white/5 px-2.5 font-semibold hover:bg-white/10 disabled:opacity-30">
            <ChevronRight size={13} />
          </button>
        </div>

        {progress.complete && (
          <div className="rounded-xl border border-emerald-500/40 bg-emerald-600/10 p-2.5 text-center">
            <p className="text-sm font-bold text-emerald-200">{QS_LABELS.completedTitle}</p>
            <p className="mt-0.5 text-[11px] text-gray-400">{QS_LABELS.completedBody}</p>
            <div className="mt-1.5 flex flex-wrap justify-center gap-1.5">
              <button type="button" onClick={() => onSelectLine(0)}
                className="karaoke-focusable min-h-[36px] rounded-lg bg-emerald-600 px-3 text-xs font-bold text-white hover:bg-emerald-700">
                {QS_LABELS.review}
              </button>
              <button type="button" onClick={onSave}
                className="karaoke-focusable min-h-[36px] rounded-lg border border-white/10 bg-white/5 px-3 text-xs font-semibold hover:bg-white/10">
                {QS_LABELS.save}
              </button>
              <button type="button" onClick={onOpenAdvanced}
                className="karaoke-focusable min-h-[36px] rounded-lg border border-white/10 bg-white/5 px-3 text-xs font-semibold hover:bg-white/10">
                {QS_LABELS.advanced}
              </button>
            </div>
          </div>
        )}

        <ul className="flex flex-wrap justify-center gap-x-3 gap-y-0.5 text-[10px] text-gray-600">
          {QS_LABELS.help.map((h) => <li key={h}>{h}</li>)}
        </ul>
      </div>
    </div>
  );
}
