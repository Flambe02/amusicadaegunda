import {
  Play, Pause, Repeat, RotateCcw, Music, Upload, AlertTriangle, Type, AudioLines,
} from 'lucide-react';
import { formatOffsetSeconds, durationMismatch } from '@/lib/audioClock';
import { EDITING_MODE, SEEK_STEP_SEC } from '@/lib/karaokeWorkshop';

const fmt = (s) => {
  if (!Number.isFinite(s)) return '—';
  const m = Math.floor(Math.max(0, s) / 60);
  const r = (Math.max(0, s) - m * 60).toFixed(1).padStart(4, '0');
  return `${m}:${r}`;
};

/**
 * KaraokeWorkshopBar — barre de l'ateliê : source audio locale + calibration, transport
 * de l'AUDIO LOCAL (revisão), et bascule explicite frase ↔ palavra.
 *
 * Rôles des deux horloges, rendus explicites à l'écran :
 *   • l'horloge CANONIQUE (vidéo YouTube) reste celle de la CAPTURE de frases ;
 *   • l'audio local sert à RÉÉCOUTER et inspecter — c'est un outil d'édition.
 * Les deux temps sont affichés côte à côte ; le temps canonique reste « — » tant que la
 * piste n'est pas calibrée (jamais de valeur devinée).
 *
 * Ce composant ne calcule aucun timing : il reçoit des callbacks et affiche l'état.
 */
export default function KaraokeWorkshopBar({
  // Source locale + calibration (étape 4 — réutilisée, jamais réimplémentée)
  fileName, localDuration, canonicalDuration, calibrationStatus, offsetSeconds,
  onPickAudio, onOpenCalibration,
  // Transport local
  transport, canReview, reviewReason, onReviewPhrase,
  // Sélection / navigation
  selectedLabel, canPrev, canNext, onPrev, onNext,
  // Mode d'édition
  editingMode, onChangeMode, wordModeDisabledReason,
}) {
  const isCalibrated = calibrationStatus === 'calibrated';
  const mismatch = durationMismatch(localDuration, canonicalDuration);
  const { isPlaying, localTime, canonicalTime, rate, isLoopEnabled } = transport;

  return (
    <section
      aria-label="Ateliê de karaokê — áudio local e transporte"
      className="sticky bottom-0 z-20 flex flex-wrap items-center gap-x-4 gap-y-2 border-t border-white/10 bg-[#0d0a12]/95 px-3 py-2 backdrop-blur"
    >
      {/* ── Áudio local + calibração ─────────────────────────────────────── */}
      <div className="flex min-w-0 flex-wrap items-center gap-1.5 text-[11px]">
        <span className="text-[9px] font-bold uppercase tracking-wider text-white/35">Áudio local</span>
        {fileName ? (
          <span className="inline-flex max-w-[150px] items-center gap-1 truncate font-semibold text-gray-200">
            <Music size={11} /> {fileName}
          </span>
        ) : (
          <span className="text-gray-500">Nenhum arquivo</span>
        )}
        <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold ${
          isCalibrated ? 'bg-emerald-500/20 text-emerald-200'
            : calibrationStatus === 'stale-file' ? 'bg-amber-500/20 text-amber-200'
            : 'bg-red-500/20 text-red-200'
        }`}>
          {isCalibrated ? `Calibrado ${formatOffsetSeconds(offsetSeconds)}` : 'Não calibrado'}
        </span>
        {calibrationStatus === 'stale-file' && (
          <span className="inline-flex items-center gap-1 text-[10px] text-amber-200">
            <AlertTriangle size={11} /> O arquivo de áudio mudou. Calibre novamente.
          </span>
        )}
        {mismatch.level === 'severe' && (
          <span className="inline-flex items-center gap-1 text-[10px] text-amber-200" title="Verifique se é a mesma versão">
            <AlertTriangle size={11} /> Duração: {fmt(localDuration)} vs {fmt(canonicalDuration)}
          </span>
        )}
        <button
          type="button" onClick={onPickAudio}
          className="karaoke-focusable inline-flex items-center gap-1 rounded-lg border border-white/10 bg-white/5 px-2 py-1 font-semibold hover:bg-white/10"
        >
          <Upload size={11} /> {fileName ? 'Trocar áudio' : 'Carregar áudio'}
        </button>
        {fileName && (
          <button
            type="button" onClick={onOpenCalibration}
            className="karaoke-focusable inline-flex items-center gap-1 rounded-lg border border-white/10 bg-white/5 px-2 py-1 font-semibold hover:bg-white/10"
          >
            <RotateCcw size={11} /> {isCalibrated ? 'Refazer calibração' : 'Calibrar'}
          </button>
        )}
      </div>

      <span className="hidden h-6 w-px bg-white/10 sm:block" />

      {/* ── Transporte do áudio local (revisão) ──────────────────────────── */}
      <div className="flex flex-wrap items-center gap-1.5">
        <span className="text-[9px] font-bold uppercase tracking-wider text-white/35">Revisão</span>
        <button
          type="button" onClick={onPrev} disabled={!canPrev}
          title="Frase anterior" aria-label="Frase anterior"
          className="karaoke-focusable inline-flex h-8 items-center rounded-lg border border-white/10 bg-white/5 px-2 text-[10px] font-bold text-gray-200 hover:bg-white/10 disabled:opacity-30"
        >
          ◀ Frase
        </button>
        <button
          type="button" onClick={() => transport.seekBy(-SEEK_STEP_SEC)} disabled={!fileName}
          title={`Recuar ${SEEK_STEP_SEC} s`} aria-label={`Recuar ${SEEK_STEP_SEC} segundos`}
          className="karaoke-focusable inline-flex h-8 items-center rounded-lg border border-white/10 bg-white/5 px-2 text-[10px] font-bold text-gray-200 hover:bg-white/10 disabled:opacity-30"
        >
          −{SEEK_STEP_SEC} s
        </button>
        <button
          type="button" onClick={transport.togglePlay} disabled={!fileName}
          aria-label={isPlaying ? 'Pausar áudio local' : 'Tocar áudio local'}
          className="karaoke-focusable inline-flex h-8 w-10 items-center justify-center rounded-lg bg-purple-600 text-white hover:bg-purple-700 disabled:opacity-40"
        >
          {isPlaying ? <Pause size={14} /> : <Play size={14} className="ml-0.5 fill-current" />}
        </button>
        <button
          type="button" onClick={() => transport.seekBy(SEEK_STEP_SEC)} disabled={!fileName}
          title={`Avançar ${SEEK_STEP_SEC} s`} aria-label={`Avançar ${SEEK_STEP_SEC} segundos`}
          className="karaoke-focusable inline-flex h-8 items-center rounded-lg border border-white/10 bg-white/5 px-2 text-[10px] font-bold text-gray-200 hover:bg-white/10 disabled:opacity-30"
        >
          +{SEEK_STEP_SEC} s
        </button>
        <button
          type="button" onClick={onNext} disabled={!canNext}
          title="Próxima frase" aria-label="Próxima frase"
          className="karaoke-focusable inline-flex h-8 items-center rounded-lg border border-white/10 bg-white/5 px-2 text-[10px] font-bold text-gray-200 hover:bg-white/10 disabled:opacity-30"
        >
          Frase ▶
        </button>
        <button
          type="button" onClick={onReviewPhrase} disabled={!canReview}
          title={reviewReason || 'Repetir frase selecionada no áudio local'}
          className="karaoke-focusable inline-flex h-8 items-center gap-1 rounded-lg border border-app-yellow/40 bg-app-yellow/10 px-2 text-[10px] font-bold text-app-yellow hover:bg-app-yellow/20 disabled:opacity-30"
        >
          <AudioLines size={12} /> Repetir frase
        </button>
        <button
          type="button" onClick={transport.toggleLoop} aria-pressed={isLoopEnabled}
          title={isLoopEnabled ? 'Repetição ativa' : 'Repetir em ciclo'}
          aria-label={isLoopEnabled ? 'Repetição ativa' : 'Ativar repetição'}
          className={`karaoke-focusable inline-flex h-8 w-8 items-center justify-center rounded-lg border text-[10px] font-bold ${
            isLoopEnabled ? 'border-app-yellow/50 bg-app-yellow/15 text-app-yellow' : 'border-white/10 bg-white/5 text-gray-300 hover:bg-white/10'
          }`}
        >
          <Repeat size={13} />
        </button>
        <label className="flex items-center gap-1 text-[10px] text-gray-400">
          <span className="sr-only">Velocidade</span>
          <select
            value={rate} onChange={(e) => transport.setRate(parseFloat(e.target.value))}
            aria-label="Velocidade do áudio local"
            className="karaoke-focusable rounded-lg border border-white/10 bg-white/5 px-1 py-1 text-[10px] font-semibold text-gray-200 outline-none"
          >
            {[1, 0.75, 0.5, 0.25].map((r) => <option key={r} value={r} className="bg-[#1a1420]">{r}×</option>)}
          </select>
        </label>
        <span className="tabular-nums text-[10px] text-gray-400" aria-live="off">
          <span title="Tempo do áudio">{fmt(localTime)}</span>
          <span className="text-gray-600"> · música </span>
          <span title="Tempo da música (canônico)" className={canonicalTime == null ? 'text-gray-600' : 'text-gray-300'}>
            {canonicalTime == null ? '—' : fmt(canonicalTime)}
          </span>
        </span>
      </div>

      {!canReview && reviewReason && (
        <p className="w-full text-[10px] text-amber-200/90">{reviewReason}</p>
      )}

      <span className="hidden h-6 w-px bg-white/10 sm:block" />

      {/* ── Modo de edição (não muda a frase selecionada) ────────────────── */}
      <div className="ml-auto flex items-center gap-1.5">
        <span className="hidden text-[10px] text-gray-500 sm:inline">{selectedLabel}</span>
        <div className="flex items-center gap-0.5 rounded-lg border border-white/10 bg-white/5 p-0.5">
          <button
            type="button" onClick={() => onChangeMode(EDITING_MODE.PHRASE)}
            aria-pressed={editingMode === EDITING_MODE.PHRASE}
            className={`karaoke-focusable inline-flex items-center gap-1 rounded-md px-2 py-1 text-[10px] font-bold ${
              editingMode === EDITING_MODE.PHRASE ? 'bg-app-yellow text-black' : 'text-gray-300 hover:bg-white/10'
            }`}
          >
            <Type size={11} /> Sincronizar frase
          </button>
          <button
            type="button" onClick={() => onChangeMode(EDITING_MODE.WORD)}
            aria-pressed={editingMode === EDITING_MODE.WORD}
            disabled={Boolean(wordModeDisabledReason)}
            title={wordModeDisabledReason || 'Editar o timing por palavra desta frase'}
            className={`karaoke-focusable inline-flex items-center gap-1 rounded-md px-2 py-1 text-[10px] font-bold disabled:opacity-30 ${
              editingMode === EDITING_MODE.WORD ? 'bg-violet-500 text-white' : 'text-gray-300 hover:bg-white/10'
            }`}
          >
            <AudioLines size={11} /> Sincronizar palavras
          </button>
        </div>
      </div>
    </section>
  );
}
