/**
 * Construção do pitch-map a partir de amostras PCM mono — PURO, sem React nem DOM.
 *
 * Fonte ÚNICA da lógica de extração de melodia, partilhada por:
 *   - o Web Worker do admin (Módulo A, geração no navegador);
 *   - o script CLI `scripts/generate-pitch-map.cjs` (via import() dinâmico).
 *
 * Fluxo (§12): amostras → YIN frame a frame → remove baixa confiança → mediana →
 * funde frames estáveis consecutivos em notas (startMs, endMs, midi, confidence).
 *
 * Não faz I/O: recebe Float32Array já descodificado e devolve o objeto pitch-map.
 */
import { detectPitch, frequencyToMidi } from './yin.js';

export const DEFAULT_BUILD_OPTS = {
  windowSize: 2048,
  hop: 512,
  minConfidence: 0.8,
  minRms: 0.01,
  smoothWindow: 5,
  semitoneTolerance: 0.6,   // mesma nota se dentro de ±0.6 semitom
  maxGapFrames: 2.5,        // buracos toleráveis (em nº de hops)
  minNoteMs: 90,            // descarta notas curtas de mais
  offsetMs: 0,              // deslocamento global (alinhamento) somado a todos os tempos
};

function median(arr) {
  const s = [...arr].sort((a, b) => a - b);
  const m = s.length >> 1;
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
}

/**
 * @param {Float32Array} samples  PCM mono (−1..1)
 * @param {number} sampleRate
 * @param {object} [options]
 * @param {(fraction:number)=>void} [onProgress]  0..1 (chamado periodicamente)
 * @returns {{ version:1, source?:string, generatedAt:string, notes:Array, stats:object }}
 */
export function buildPitchMap(samples, sampleRate, options = {}, onProgress) {
  const opts = { ...DEFAULT_BUILD_OPTS, ...options };
  const { windowSize: win, hop } = opts;
  const buf = new Float32Array(win);
  const frames = [];
  const totalStarts = Math.max(1, Math.floor((samples.length - win) / hop) + 1);
  let done = 0;
  let lastProgress = 0;

  // 1) Análise frame a frame.
  for (let start = 0; start + win <= samples.length; start += hop) {
    buf.set(samples.subarray(start, start + win));
    const { frequencyHz, probability, rms } = detectPitch(buf, sampleRate, {
      threshold: 0.15, minFrequencyHz: 70, maxFrequencyHz: 1100,
    });
    const ms = ((start + win / 2) / sampleRate) * 1000;
    if (frequencyHz > 0 && probability >= opts.minConfidence && rms >= opts.minRms) {
      frames.push({ ms, midi: frequencyToMidi(frequencyHz), conf: probability });
    } else {
      frames.push({ ms, midi: null, conf: 0 });
    }
    done += 1;
    if (onProgress) {
      const p = done / totalStarts;
      if (p - lastProgress >= 0.02) { lastProgress = p; onProgress(p * 0.95); }
    }
  }

  // 2) Suavização por mediana sobre frames com pitch.
  const sw = opts.smoothWindow;
  for (let i = 0; i < frames.length; i += 1) {
    if (frames[i].midi == null) continue;
    const around = [];
    for (let k = -sw; k <= sw; k += 1) {
      const f = frames[i + k];
      if (f && f.midi != null) around.push(f.midi);
    }
    if (around.length) frames[i].smooth = median(around);
  }

  // 3) Fusão em notas.
  const hopMs = (hop / sampleRate) * 1000;
  const maxGapMs = hopMs * opts.maxGapFrames;
  const notes = [];
  let cur = null;
  const flush = () => {
    if (!cur) return;
    if (cur.endMs - cur.startMs >= opts.minNoteMs) {
      notes.push({
        startMs: Math.round(cur.startMs + opts.offsetMs),
        endMs: Math.round(cur.endMs + opts.offsetMs),
        midi: Math.round(cur.sumMidi / cur.n),
        confidence: Number((cur.sumConf / cur.n).toFixed(2)),
      });
    }
    cur = null;
  };
  const open = (f, m) => { cur = { startMs: f.ms, endMs: f.ms + hopMs, lastMs: f.ms, sumMidi: m, sumConf: f.conf, n: 1 }; };
  for (const f of frames) {
    const m = f.smooth;
    if (m == null) { if (cur && f.ms - cur.lastMs > maxGapMs) flush(); continue; }
    if (!cur) { open(f, m); continue; }
    const ref = cur.sumMidi / cur.n;
    if (Math.abs(m - ref) <= opts.semitoneTolerance && f.ms - cur.lastMs <= maxGapMs) {
      cur.sumMidi += m; cur.n += 1; cur.sumConf += f.conf; cur.lastMs = f.ms; cur.endMs = f.ms + hopMs;
    } else { flush(); open(f, m); }
  }
  flush();

  if (onProgress) onProgress(1);

  const durationSec = samples.length / sampleRate;
  return {
    version: 1,
    ...(options.source ? { source: options.source } : {}),
    generatedAt: new Date().toISOString(),
    notes,
    stats: computePitchMapStats(notes, durationSec),
  };
}

/** Nomes de nota para rotular a extensão vocal (ex.: « C3–G4 »). */
const NOTE_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
export function midiToName(midi) {
  const m = Math.round(midi);
  return `${NOTE_NAMES[((m % 12) + 12) % 12]}${Math.floor(m / 12) - 1}`;
}

/**
 * Estatísticas amigáveis (sem nota/pontuação) para a prévia do admin.
 * @param {Array} notes
 * @param {number} durationSec
 */
export function computePitchMapStats(notes, durationSec) {
  const noteCount = notes.length;
  let minMidi = Infinity;
  let maxMidi = -Infinity;
  let sungMs = 0;
  for (const n of notes) {
    if (n.midi < minMidi) minMidi = n.midi;
    if (n.midi > maxMidi) maxMidi = n.midi;
    sungMs += n.endMs - n.startMs;
  }
  const coveragePct = durationSec > 0 ? Math.round(Math.min(100, (sungMs / (durationSec * 1000)) * 100)) : 0;
  const rangeLabel = Number.isFinite(minMidi) ? `${midiToName(minMidi)}–${midiToName(maxMidi)}` : '—';
  return {
    noteCount,
    coveragePct,
    rangeLabel,
    minMidi: Number.isFinite(minMidi) ? minMidi : null,
    maxMidi: Number.isFinite(maxMidi) ? maxMidi : null,
  };
}
