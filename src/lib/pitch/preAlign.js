/**
 * Pré-alinhamento das letras a partir de segmentos vocais — PURO (Módulo B-v1).
 *
 * NÍVEL FRASE (não palavra — o mot-à-mot fica para o estúdio da bola). Recebe os
 * segmentos cantados (detectVocalSegments) + as linhas do editor e devolve novas
 * linhas com `time`/`endTime` preenchidos. NUNCA persiste: o resultado é aplicado
 * ao editor (com undo/redo) e só o « Guardar » habitual guarda.
 *
 * Duas estratégias:
 *   - 'assign' : nº de segmentos == nº de linhas → atribuição 1:1 na ordem.
 *   - 'snap'   : caso contrário, aima os marcadores EXISTENTES ao onset de
 *                segmento mais próximo (dentro da tolerância) e preenche o fim.
 *
 * Tempos das linhas em SEGUNDOS (como o editor); segmentos em MILISSEGUNDOS.
 */

export const DEFAULT_PREALIGN_OPTS = {
  snapToleranceMs: 350,
};

/**
 * @param {Array<{startMs:number,endMs:number}>} segments
 * @param {Array<{text?:string,time?:number|null,endTime?:number|null}>} lines
 * @param {object} [options]
 * @returns {{ lines:Array, mode:'assign'|'snap', matched:number, total:number, segments:number }}
 */
export function preAlignLines(segments, lines, options = {}) {
  const opts = { ...DEFAULT_PREALIGN_OPTS, ...options };
  const total = lines.length;
  const segCount = segments.length;

  // Atribuição 1:1 quando as contagens batem certo.
  if (segCount > 0 && segCount === total) {
    const out = lines.map((l, i) => ({
      ...l,
      time: segments[i].startMs / 1000,
      endTime: segments[i].endMs / 1000,
    }));
    return { lines: out, mode: 'assign', matched: total, total, segments: segCount };
  }

  // Snap dos marcadores existentes ao onset mais próximo.
  const tolSec = opts.snapToleranceMs / 1000;
  let matched = 0;
  const out = lines.map((l) => {
    if (l.time == null) return l;
    let best = null;
    let bestDist = Infinity;
    for (const s of segments) {
      const d = Math.abs(s.startMs / 1000 - l.time);
      if (d < bestDist) { bestDist = d; best = s; }
    }
    if (best && bestDist <= tolSec) {
      matched += 1;
      return { ...l, time: best.startMs / 1000, endTime: best.endMs / 1000 };
    }
    return l;
  });
  return { lines: out, mode: 'snap', matched, total, segments: segCount };
}
