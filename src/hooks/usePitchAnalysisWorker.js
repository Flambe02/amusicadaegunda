import { useCallback, useEffect, useRef } from 'react';

/**
 * usePitchAnalysisWorker — análise de pitch/segmentos com Web Worker E repli no
 * thread principal.
 *
 * `analyze(kind, samples, sampleRate, opts, onProgress)`:
 *   - kind: 'pitchMap' | 'segments'
 *   - samples: Float32Array (COPIADO/transferido; o original continua utilizável)
 *   - resolve com o resultado ({pitch-map} ou [segmentos]).
 *
 * ROBUSTEZ (importante): em certos contextos (CSP, WebView do admin, worker
 * bloqueado) o Web Worker pode não arrancar. Nesse caso caímos automaticamente na
 * MESMA análise no thread principal (import dinâmico das funções puras) — mais
 * lento (bloqueia a UI alguns segundos) mas garante que a funcionalidade FUNCIONA.
 */
export function usePitchAnalysisWorker() {
  const workerRef = useRef(null);
  const brokenRef = useRef(false); // worker inutilizável → usar sempre o thread principal
  const triedRef = useRef(false);
  const seqRef = useRef(0);
  const pendingRef = useRef(new Map());

  const ensure = useCallback(() => {
    if (brokenRef.current) return null;
    if (workerRef.current) return workerRef.current;
    if (triedRef.current) return null;
    triedRef.current = true;
    try {
      const worker = new Worker(
        new URL('../lib/pitch/pitchAnalysis.worker.js', import.meta.url),
        { type: 'module' },
      );
      worker.onmessage = (e) => {
        const { id, type, value, result, message } = e.data || {};
        const p = pendingRef.current.get(id);
        if (!p) return;
        if (type === 'progress') p.onProgress?.(value);
        else if (type === 'done') { pendingRef.current.delete(id); p.resolve(result); }
        else if (type === 'error') { pendingRef.current.delete(id); p.reject(new Error(message)); }
      };
      worker.onerror = () => {
        // Falha fatal do worker → marca inutilizável e rejeita o que estava pendente
        // (o chamador cai no repli do thread principal).
        brokenRef.current = true;
        const e = new Error('worker-failed');
        pendingRef.current.forEach((p) => p.reject(e));
        pendingRef.current.clear();
        try { workerRef.current?.terminate(); } catch { /* ignore */ }
        workerRef.current = null;
      };
      workerRef.current = worker;
      return worker;
    } catch {
      brokenRef.current = true; // criação do worker falhou (ex.: CSP) → thread principal
      return null;
    }
  }, []);

  const runOnWorker = useCallback((worker, kind, samples, sampleRate, opts, onProgress) => {
    const id = seqRef.current + 1;
    seqRef.current = id;
    return new Promise((resolve, reject) => {
      pendingRef.current.set(id, { resolve, reject, onProgress });
      const copy = samples.slice(); // cópia transferível (mantém o original intacto)
      worker.postMessage({ id, kind, samples: copy, sampleRate, opts }, [copy.buffer]);
    });
  }, []);

  const runOnMainThread = useCallback(async (kind, samples, sampleRate, opts, onProgress) => {
    if (kind === 'pitchMap') {
      const { buildPitchMap } = await import('@/lib/pitch/pitchMapBuilder');
      return buildPitchMap(samples, sampleRate, opts || {}, onProgress);
    }
    const { detectVocalSegments } = await import('@/lib/pitch/vocalSegments');
    return detectVocalSegments(samples, sampleRate, opts || {}, onProgress);
  }, []);

  const analyze = useCallback(async (kind, samples, sampleRate, opts, onProgress) => {
    const worker = ensure();
    if (worker) {
      try {
        return await runOnWorker(worker, kind, samples, sampleRate, opts, onProgress);
      } catch {
        brokenRef.current = true; // worker rebentou → repli
      }
    }
    return runOnMainThread(kind, samples, sampleRate, opts, onProgress);
  }, [ensure, runOnWorker, runOnMainThread]);

  useEffect(() => () => {
    try { workerRef.current?.terminate(); } catch { /* ignore */ }
    workerRef.current = null;
    pendingRef.current.clear();
  }, []);

  return { analyze };
}
