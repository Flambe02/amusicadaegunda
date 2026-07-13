/**
 * Validation de timing NON destructive (zéro audio, zéro API, pur).
 *
 * Fonctionne sur la forme de travail de l'éditeur :
 *   lines: { text:string, time:number|null, endTime:number|null,
 *            words?: { text:string, start:number, end:number }[] }[]
 *
 * Ne « corrige » jamais rien tout seul — renvoie seulement une liste d'anomalies.
 * Trois niveaux : 'error' (bloque la publication), 'warning' (visible, non bloquant),
 * 'info' (indicatif). Chaque anomalie pointe la ligne (et le mot) concernés + un
 * timestamp exploitable pour aller la sélectionner dans l'éditeur.
 *
 * @typedef {Object} TimingIssue
 * @property {'error'|'warning'|'info'} level
 * @property {string} code
 * @property {string} message   (pt-BR, prêt pour l'UI)
 * @property {number} lineIndex
 * @property {number|null} wordIndex
 * @property {number|null} time
 */

// Tolérances (secondes).
const EPS = 0.02;              // marge d'arrondi (bords de mots dans la ligne, chevauchement)
const ZERO_DUR = 0.12;         // en dessous = durée quasi nulle
const BIG_GAP = 8;             // silence « anormalement long » entre deux frases

/**
 * Valide un tableau de lignes de timing.
 * @param {Array} lines
 * @param {{ duration?: number }} [opts]  duration = durée vidéo connue (0/undefined = inconnue)
 * @returns {{ issues: TimingIssue[], errors: number, warnings: number, infos: number,
 *             byLine: Map<number, TimingIssue[]>, blocking: boolean }}
 */
export function validateTiming(lines, opts = {}) {
  const issues = [];
  const duration = Number.isFinite(opts.duration) && opts.duration > 0 ? opts.duration : null;
  const list = Array.isArray(lines) ? lines : [];

  const push = (level, code, message, lineIndex, time = null, wordIndex = null) => {
    issues.push({ level, code, message, lineIndex, wordIndex, time });
  };

  // Sous-liste des lignes marquées, dans l'ordre du temps (pour ordre/silences).
  const timed = list
    .map((l, i) => ({ i, time: l.time, endTime: l.endTime }))
    .filter((l) => l.time != null)
    .sort((a, b) => a.time - b.time);

  list.forEach((line, i) => {
    const hasTime = line.time != null;

    // ── Ligne ──────────────────────────────────────────────────────────────
    if (hasTime && line.time < 0) {
      push('error', 'line-negative-start', `Linha ${i + 1}: início negativo.`, i, line.time);
    }
    if (line.endTime != null && line.endTime < 0) {
      push('error', 'line-negative-end', `Linha ${i + 1}: fim negativo.`, i, line.endTime);
    }
    if (hasTime && line.endTime != null && line.endTime <= line.time) {
      push('error', 'line-end-before-start', `Linha ${i + 1}: fim antes (ou igual) do início.`, i, line.time);
    }
    if (hasTime && line.endTime != null && line.endTime > line.time
        && line.endTime - line.time < ZERO_DUR) {
      push('warning', 'line-zero-duration', `Linha ${i + 1}: duração quase nula.`, i, line.time);
    }
    if (hasTime && (!line.text || !line.text.trim())) {
      push('warning', 'line-empty-text', `Linha ${i + 1}: marcada mas sem texto.`, i, line.time);
    }
    if (!hasTime && line.text && line.text.trim()) {
      // Ligne avec texte mais sans temps : seulement signalée si elle est ENTRE deux
      // lignes marquées (oubli), sinon c'est juste « pas encore synchronisée ».
      const before = list.slice(0, i).some((l) => l.time != null);
      const after = list.slice(i + 1).some((l) => l.time != null);
      if (before && after) {
        push('warning', 'line-missing-timing', `Linha ${i + 1}: sem tempo entre linhas marcadas.`, i, null);
      }
    }
    if (hasTime && duration && line.time > duration + EPS) {
      push('warning', 'line-after-video', `Linha ${i + 1}: início depois do fim do vídeo.`, i, line.time);
    }

    // ── Mots (Stage 2) ──────────────────────────────────────────────────────
    const words = Array.isArray(line.words) ? line.words : null;
    if (words && words.length > 0) {
      const lineStart = hasTime ? line.time : null;
      const lineEnd = line.endTime != null ? line.endTime : null;
      let prevEnd = null;
      let prevStart = null;
      words.forEach((w, wi) => {
        const ws = w?.start;
        const we = w?.end;
        if (!Number.isFinite(ws) || !Number.isFinite(we)) {
          push('error', 'word-missing-timing', `Linha ${i + 1}, palavra ${wi + 1}: tempo em falta.`, i, hasTime ? line.time : null, wi);
          return;
        }
        if (we <= ws) {
          push('error', 'word-end-before-start', `Linha ${i + 1}, palavra ${wi + 1}: fim antes do início.`, i, ws, wi);
        }
        if (lineStart != null && ws < lineStart - EPS) {
          push('error', 'word-before-line', `Linha ${i + 1}, palavra ${wi + 1}: começa antes da linha.`, i, ws, wi);
        }
        if (lineEnd != null && we > lineEnd + EPS) {
          push('error', 'word-after-line', `Linha ${i + 1}, palavra ${wi + 1}: termina depois da linha.`, i, we, wi);
        }
        if (prevStart != null && ws < prevStart - EPS) {
          push('error', 'word-out-of-order', `Linha ${i + 1}, palavra ${wi + 1}: fora de ordem.`, i, ws, wi);
        }
        if (prevEnd != null && ws < prevEnd - EPS) {
          push('warning', 'word-overlap', `Linha ${i + 1}, palavra ${wi + 1}: sobrepõe a anterior.`, i, ws, wi);
        }
        prevEnd = we;
        prevStart = ws;
      });
    } else if (line.timingMode === 'word') {
      push('warning', 'line-word-mode-empty', `Linha ${i + 1}: modo palavra sem palavras.`, i, hasTime ? line.time : null);
    }
  });

  // ── Silences anormalement longs entre frases consécutives (ordre du temps) ──
  for (let k = 1; k < timed.length; k += 1) {
    const prev = timed[k - 1];
    const cur = timed[k];
    const prevEnd = prev.endTime != null ? prev.endTime : prev.time;
    const gap = cur.time - prevEnd;
    if (gap > BIG_GAP) {
      push('info', 'big-gap', `Silêncio de ${gap.toFixed(1)}s antes da linha ${cur.i + 1}.`, cur.i, cur.time);
    }
  }

  const errors = issues.filter((x) => x.level === 'error').length;
  const warnings = issues.filter((x) => x.level === 'warning').length;
  const infos = issues.filter((x) => x.level === 'info').length;

  const byLine = new Map();
  for (const issue of issues) {
    if (!byLine.has(issue.lineIndex)) byLine.set(issue.lineIndex, []);
    byLine.get(issue.lineIndex).push(issue);
  }

  return { issues, errors, warnings, infos, byLine, blocking: errors > 0 };
}
