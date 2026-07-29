/**
 * ballMotion — logique PURE (aucune IA, aucun réseau, aucun DOM) partagée par le
 * studio « Afinar palavras e bola ».
 *
 * Deux responsabilités :
 *  1. Édition simplifiée du timing par mot d'UNE ligne — modèle inchangé
 *     ({ id, text, start, end }) : on n'édite en pratique que les DÉBUTS, la fin de
 *     chaque mot est dérivée (= début du mot suivant ; dernier mot = fin de frase).
 *     Ordre chronologique et bornes de frase toujours garantis.
 *  2. Mathématiques de la boule rebondissante (arc parabolique entre deux mots).
 *
 * Ce module ne remplace PAS wordDistribution.js (qui reste le point de départ
 * déterministe) ni timingModel.js (persistance). Il opère sur la même forme de mot.
 */

export const MIN_WORD_GAP = 0.03; // s — écart minimal entre deux débuts de mots

/** Recalcule les fins à partir des débuts : end[i] = start[i+1], dernier = phraseEnd. */
export function normalizeEnds(words, phraseEnd) {
  const n = words.length;
  return words.map((w, i) => {
    const end = i < n - 1 ? words[i + 1].start : phraseEnd;
    return { ...w, end: Math.max(w.start, end) };
  });
}

/**
 * Normalise entièrement une liste de mots : débuts monotones croissants, bornés dans
 * [phraseStart, phraseEnd], puis fins dérivées. Jamais d'exception, jamais d'ordre cassé.
 */
export function normalizeWords(words, phraseStart, phraseEnd) {
  if (!Array.isArray(words) || words.length === 0) return [];
  const n = words.length;
  const out = words.map((w) => ({ ...w }));
  let floor = phraseStart;
  for (let i = 0; i < n; i += 1) {
    let s = Number.isFinite(out[i].start) ? out[i].start : floor;
    s = Math.max(s, floor);
    // laisse la place aux mots restants avant la fin de frase
    s = Math.min(s, phraseEnd - MIN_WORD_GAP * (n - i));
    out[i].start = s;
    floor = s + MIN_WORD_GAP;
  }
  return normalizeEnds(out, phraseEnd);
}

// Tolérance d'arrondi partagée avec validateLineWords() (bords de mots).
const WORD_EPS = 1e-3;

/**
 * true si `words` est déjà exploitable tel quel dans [phraseStart, phraseEnd] :
 * temps finis, ordre croissant, fin ≥ début, et bornes respectées. `phraseEnd` peut
 * être `null`/`Infinity` quand la frase n'a PAS de fin explicite (on ne contrôle alors
 * que l'ordre et la borne de début).
 *
 * Sert de garde-fou d'IDEMPOTENCE au chargement du studio : des mots déjà valides ne
 * doivent JAMAIS être re-normalisés (sinon `normalizeEnds` colle la fin du dernier mot
 * sur la borne de frase — inférée depuis la ligne suivante quand `endTime` est null —
 * et rouvrir l'éditeur modifie des données que l'utilisateur n'a pas touchées).
 * @returns {boolean}
 */
export function wordsAreValid(words, phraseStart, phraseEnd) {
  if (!Array.isArray(words) || words.length === 0) return false;
  const lo = Number.isFinite(phraseStart) ? phraseStart : -Infinity;
  const hi = Number.isFinite(phraseEnd) ? phraseEnd : Infinity;
  let prevStart = -Infinity;
  for (const w of words) {
    if (!w || !Number.isFinite(w.start) || !Number.isFinite(w.end)) return false;
    if (w.end < w.start - WORD_EPS) return false;
    if (w.start < lo - WORD_EPS) return false;
    if (w.end > hi + WORD_EPS) return false;
    if (w.start < prevStart - WORD_EPS) return false;
    prevStart = w.start;
  }
  return true;
}

/**
 * Mots à charger dans le studio « Afinar palavras e bola ».
 *
 * Règle d'IDEMPOTENCE : des mots stockés déjà valides sont renvoyés TELS QUELS (même
 * référence — ni copie, ni renormalisation, donc aucun « faux dirty »). La réparation
 * par `normalizeWords()` est réservée aux données héritées réellement cassées (ordre
 * brisé, temps non finis, mots hors frase). Sans ça, ouvrir le studio sur une ligne
 * sans `endTime` explicite collait la fin du dernier mot sur le début de la ligne
 * suivante — silence instrumental compris — et la re-commitait.
 *
 * @returns {{repaired: boolean, words: Array}}
 */
export function loadStudioWords(words, phraseStart, phraseEnd) {
  if (wordsAreValid(words, phraseStart, phraseEnd)) return { repaired: false, words };
  return { repaired: Array.isArray(words) && words.length > 0, words: normalizeWords(words, phraseStart, phraseEnd) };
}

/**
 * Empêche une borne de frase INFÉRÉE (début de la ligne suivante, quand la ligne n'a
 * pas de `endTime` persisté) de devenir une donnée : ramène la fin du DERNIER mot à
 * `storedLastEnd` (sa fin telle qu'elle était stockée) si la normalisation l'a étirée
 * au-delà. Ne raccourcit jamais sous le début du mot, ne touche à rien d'autre, et
 * renvoie le tableau d'origine quand il n'y a rien à faire (pas de « faux dirty »).
 * @param {{start:number,end:number}[]} words
 * @param {number|null} storedLastEnd  fin du dernier mot AVANT édition (null = inconnue)
 */
export function capInferredLastEnd(words, storedLastEnd) {
  if (!Array.isArray(words) || words.length === 0) return words;
  if (!Number.isFinite(storedLastEnd)) return words;
  const i = words.length - 1;
  const last = words[i];
  if (!last || !Number.isFinite(last.end) || last.end <= storedLastEnd) return words;
  const end = Math.max(last.start + MIN_WORD_GAP, storedLastEnd);
  if (end >= last.end) return words;
  const out = words.slice();
  out[i] = { ...last, end };
  return out;
}

/**
 * Fixe le début du mot `index` à `t` (drag, clic « posicionar », capture par toque).
 * Borne le mot entre ses voisins (jamais de croisement) et recalcule les fins — la
 * fin du mot précédent devient `t` automatiquement (frontière nette). Un seul résultat,
 * un seul pas d'historique côté appelant.
 */
export function setWordStart(words, index, t, phraseStart, phraseEnd) {
  if (!Array.isArray(words) || index < 0 || index >= words.length) return words;
  const out = words.map((w) => ({ ...w }));
  const lo = index > 0 ? out[index - 1].start + MIN_WORD_GAP : phraseStart;
  const hi = index < out.length - 1 ? out[index + 1].start - MIN_WORD_GAP : phraseEnd - MIN_WORD_GAP;
  out[index].start = Math.max(lo, Math.min(Math.max(lo, hi), t));
  return normalizeEnds(out, phraseEnd);
}

/** Décale le début d'un mot de `deltaSec` (boutons ±ms / flèches Alt). */
export function nudgeWordStart(words, index, deltaSec, phraseStart, phraseEnd) {
  const w = words?.[index];
  if (!w) return words;
  return setWordStart(words, index, w.start + deltaSec, phraseStart, phraseEnd);
}

/** Index du mot « actif » au temps t (dernier mot dont le début est ≤ t). -1 avant le 1er. */
export function activeWordAt(words, t) {
  if (!Array.isArray(words) || words.length === 0) return -1;
  let idx = -1;
  for (let i = 0; i < words.length; i += 1) {
    if (words[i].start <= t) idx = i; else break;
  }
  return idx;
}

/**
 * Validation NON destructive du timing d'une seule ligne (règles §13). Renvoie une
 * liste de problèmes { level:'error'|'warning', wordIndex, message }. Ne corrige rien.
 */
export function validateLineWords(words, phraseStart, phraseEnd) {
  const issues = [];
  if (!Array.isArray(words) || words.length === 0) return issues;
  words.forEach((w, i) => {
    if (w.start < phraseStart - 1e-3) issues.push({ level: 'error', wordIndex: i, message: `« ${w.text} » começa antes da frase.` });
    if (w.end > phraseEnd + 1e-3) issues.push({ level: 'error', wordIndex: i, message: `« ${w.text} » termina depois da frase.` });
    if (w.end < w.start - 1e-3) issues.push({ level: 'error', wordIndex: i, message: `« ${w.text} » tem fim antes do início.` });
    if (i > 0 && w.start < words[i - 1].start - 1e-3) issues.push({ level: 'error', wordIndex: i, message: `« ${w.text} » está fora de ordem.` });
    if (w.end - w.start < 0.02) issues.push({ level: 'warning', wordIndex: i, message: `« ${w.text} » é muito curta.` });
  });
  return issues;
}

// ─────────────────────────── Boule rebondissante ───────────────────────────

/**
 * Profils d'intensité : amplitude de base (px) + gain par pixel de distance
 * horizontale + plafond. « Marcada » = rebond franc et visible (karaoké classique).
 */
export const BALL_INTENSITY = {
  suave: { base: 22, perDist: 0.09, max: 44 },
  classica: { base: 38, perDist: 0.16, max: 66 },
  marcada: { base: 50, perDist: 0.22, max: 82 },
};

/** Amplitude (px) d'un saut selon la distance horizontale et la durée de l'intervalle. */
export function arcAmplitude(distPx, intervalSec, intensity = 'classica') {
  const p = BALL_INTENSITY[intensity] || BALL_INTENSITY.classica;
  let amp = p.base + p.perDist * Math.abs(distPx || 0);
  if (Number.isFinite(intervalSec) && intervalSec < 0.18) amp *= 0.7; // saut très court → plus discret
  return Math.min(amp, p.max);
}

// easing horizontal doux (accélère puis décélère) — mouvement plus « chantant ».
function easeInOut(p) {
  return p < 0.5 ? 2 * p * p : 1 - Math.pow(-2 * p + 2, 2) / 2;
}

/**
 * Position de la boule à l'instant `time`.
 * @param {number} time  temps courant (échelle vidéo, comme les débuts de mots)
 * @param {Array<{x:number,y:number}>} centers  centres RENDUS des mots (px, relatifs au conteneur ; y = ligne de repos de la boule au-dessus du mot)
 * @param {number[]} starts  débuts des mots (s)
 * @param {number} phraseEnd  fin de frase (s)
 * @param {object} [opts]  { intensity, reducedMotion }
 * @returns {{ x:number, y:number, activeIndex:number, progress:number, landed:boolean, hidden:boolean }}
 */
export function ballAt(time, centers, starts, phraseEnd, opts = {}) {
  const intensity = opts.intensity || 'classica';
  const reduced = !!opts.reducedMotion;
  const n = centers.length;
  if (n === 0) return { x: 0, y: 0, activeIndex: -1, progress: 0, landed: false, hidden: true };

  const i = activeWordAt(starts.map((s) => ({ start: s })), time);
  if (i < 0) {
    // avant le premier mot : attend au-dessus du premier mot
    return { x: centers[0].x, y: centers[0].y, activeIndex: -1, progress: 0, landed: false, hidden: false };
  }
  if (i >= n - 1) {
    // dernier mot : pas de grand saut, reste posé (micro-bob géré par le rendu)
    return { x: centers[n - 1].x, y: centers[n - 1].y, activeIndex: n - 1, progress: 1, landed: true, hidden: false };
  }

  const t0 = starts[i];
  const t1 = starts[i + 1];
  const span = Math.max(1e-4, t1 - t0);
  const p = Math.max(0, Math.min(1, (time - t0) / span));
  const from = centers[i];
  const to = centers[i + 1];
  const x = from.x + (to.x - from.x) * easeInOut(p);
  const baseY = from.y + (to.y - from.y) * p; // suit un éventuel retour à la ligne
  if (reduced) {
    return { x, y: baseY, activeIndex: p < 1 ? i : i + 1, progress: p, landed: p >= 1, hidden: false };
  }
  const amp = arcAmplitude(to.x - from.x, span, intensity);
  const arc = amp * 4 * p * (1 - p); // parabole : 0 aux extrémités, max au milieu
  return { x, y: baseY - arc, activeIndex: p < 1 ? i : i + 1, progress: p, landed: p >= 1, hidden: false };
}
