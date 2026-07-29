/**
 * Deteção de segmentos cantados a partir de amostras PCM mono — PURO (Módulo B-v1).
 *
 * Ao contrário do pitch-map (que interessa a melodia nota a nota), aqui só
 * interessa QUANDO há voz: fronteiras início/fim de cada frase cantada. Usa
 * energia (RMS) + presença de pitch (frame « sonoro ») — é análise de SINAL, não
 * de texto, por isso não sofre do problema de alinhamento do Whisper (retirado).
 *
 * Usado para pré-alinhar a sincronização das letras (ver preAlign.js): NUNCA
 * grava nada, só assiste o admin no editor manual existente.
 */
import { detectPitch } from './yin.js';

export const DEFAULT_SEGMENT_OPTS = {
  windowSize: 2048,
  hop: 512,
  minConfidence: 0.6,   // frame considerado « voz » se pitch fiável…
  minRms: 0.02,         // …e com energia suficiente
  minSilenceMs: 220,    // silêncio mínimo para separar duas frases
  minSegmentMs: 180,    // segmento demasiado curto = descartado (ruído)
  padStartMs: 60,       // pequena antecipação do início (ataque da voz)
};

/**
 * @param {Float32Array} samples  PCM mono
 * @param {number} sampleRate
 * @param {object} [options]
 * @param {(fraction:number)=>void} [onProgress]
 * @returns {Array<{ startMs:number, endMs:number }>}
 */
export function detectVocalSegments(samples, sampleRate, options = {}, onProgress) {
  const opts = { ...DEFAULT_SEGMENT_OPTS, ...options };
  const { windowSize: win, hop } = opts;
  const buf = new Float32Array(win);
  const hopMs = (hop / sampleRate) * 1000;
  const voiced = []; // { ms, on:boolean }
  const totalStarts = Math.max(1, Math.floor((samples.length - win) / hop) + 1);
  let done = 0;
  let last = 0;

  for (let start = 0; start + win <= samples.length; start += hop) {
    buf.set(samples.subarray(start, start + win));
    const { frequencyHz, probability, rms } = detectPitch(buf, sampleRate, {
      threshold: 0.15, minFrequencyHz: 70, maxFrequencyHz: 1100,
    });
    const on = frequencyHz > 0 && probability >= opts.minConfidence && rms >= opts.minRms;
    voiced.push({ ms: (start / sampleRate) * 1000, on });
    done += 1;
    if (onProgress) { const p = done / totalStarts; if (p - last >= 0.02) { last = p; onProgress(p * 0.95); } }
  }

  // Agrupa frames « on » consecutivos, tolerando silêncios curtos.
  const segments = [];
  let cur = null;
  const minSilenceHops = opts.minSilenceMs / hopMs;
  let silenceRun = 0;
  for (const v of voiced) {
    if (v.on) {
      if (!cur) cur = { startMs: v.ms, endMs: v.ms + hopMs };
      else cur.endMs = v.ms + hopMs;
      silenceRun = 0;
    } else if (cur) {
      silenceRun += 1;
      if (silenceRun >= minSilenceHops) { segments.push(cur); cur = null; silenceRun = 0; }
      else cur.endMs = v.ms + hopMs; // silêncio curto ainda pertence à frase
    }
  }
  if (cur) segments.push(cur);

  // Limpeza: descarta curtos, aplica pequena antecipação, garante ordem.
  const out = [];
  for (const s of segments) {
    if (s.endMs - s.startMs < opts.minSegmentMs) continue;
    out.push({ startMs: Math.max(0, Math.round(s.startMs - opts.padStartMs)), endMs: Math.round(s.endMs) });
  }
  if (onProgress) onProgress(1);
  return out;
}
