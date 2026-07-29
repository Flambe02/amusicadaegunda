/**
 * Web Worker de análise de pitch (admin) — corre a extração PESADA fora da thread
 * de UI para não bloquear o React (Módulo A: pitch-map ; Módulo B: segmentos).
 *
 * Reutiliza as MESMAS funções puras da app/CLI (buildPitchMap / detectVocalSegments),
 * que por sua vez usam o detetor YIN partilhado. Nada de áudio sai daqui.
 *
 * Protocolo:
 *   ← { id, kind:'pitchMap'|'segments', samples:Float32Array, sampleRate, opts }
 *   → { id, type:'progress', value }        (0..1)
 *   → { id, type:'done', result }
 *   → { id, type:'error', message }
 */
import { buildPitchMap } from './pitchMapBuilder.js';
import { detectVocalSegments } from './vocalSegments.js';

self.onmessage = (e) => {
  const { id, kind, samples, sampleRate, opts } = e.data || {};
  const arr = samples instanceof Float32Array ? samples : new Float32Array(samples);
  const onProgress = (value) => self.postMessage({ id, type: 'progress', value });
  try {
    let result;
    if (kind === 'pitchMap') result = buildPitchMap(arr, sampleRate, opts || {}, onProgress);
    else if (kind === 'segments') result = detectVocalSegments(arr, sampleRate, opts || {}, onProgress);
    else throw new Error(`kind desconhecido: ${kind}`);
    self.postMessage({ id, type: 'done', result });
  } catch (err) {
    self.postMessage({ id, type: 'error', message: err?.message || 'erro na análise' });
  }
};
