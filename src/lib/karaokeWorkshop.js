/**
 * karaokeWorkshop — modèle d'état de l'ATELIÊ DE KARAOKÊ. Fonctions PURES.
 *
 * L'atelier ORCHESTRE les contrats existants, il ne les remplace pas :
 *   • le timing de frase et de mot reste CANONIQUE (secondes absolues de la chanson,
 *     horloge YouTube) — cf. `@/lib/audioClock` ;
 *   • la capture de frase reste celle de `@/lib/phraseCapture` ;
 *   • la sauvegarde reste celle de `@/lib/karaokeSyncContract` ;
 *   • le brouillon reste `useTimingDraft`.
 *
 * L'audio local n'est QU'UN OUTIL D'ÉDITION : rien de ce qui est enregistré n'en dépend.
 *
 * ═══ UNE SEULE SÉLECTION ═══
 * `selectedLineIndex` est la frase en cours d'édition. Elle ne bouge que sur action
 * explicite (clic, précédent/suivant, clic sur un problème de validation) ou à la fin
 * d'une capture réussie. Elle n'est JAMAIS dérivée du temps de lecture : `transportTimes`
 * ne renvoie que des temps, et aucune fonction de ce module n'accepte un temps pour
 * produire une sélection.
 */
import { canonicalTimeToLocalAudio, clampLocalSeek } from '@/lib/audioClock';

/** Les deux modes d'édition. Changer de mode ne change JAMAIS la frase sélectionnée. */
export const EDITING_MODE = { PHRASE: 'phrase', WORD: 'word' };

/** Marge de PRÉÉCOUTE autour de la frase — comportement de lecture, jamais du timing. */
export const REVIEW_MARGIN_SEC = 0.5;

/** Pas de navigation du transport (secondes). */
export const SEEK_STEP_SEC = 5;

// ───────────────────────────── Sélection ─────────────────────────────

/** Borne un index dans les paroles. -1 quand il n'y a aucune parole. */
export function clampLineIndex(index, lineCount) {
  if (!Number.isFinite(lineCount) || lineCount <= 0) return -1;
  if (!Number.isFinite(index)) return 0;
  return Math.max(0, Math.min(lineCount - 1, Math.trunc(index)));
}

/** Sélectionne une frase — seul chemin de changement de sélection. */
export function selectLine(state, index, lineCount) {
  const next = clampLineIndex(index, lineCount);
  if (next === state?.selectedLineIndex) return state;
  return { ...state, selectedLineIndex: next };
}

/** Frase précédente (dir -1) ou suivante (dir +1), dans l'ordre ORIGINAL du texte. */
export function goToAdjacentLine(state, dir, lineCount) {
  const d = dir > 0 ? 1 : -1;
  return selectLine(state, (state?.selectedLineIndex ?? 0) + d, lineCount);
}

/** Bascule frase ↔ palavra SANS toucher à la sélection. */
export function setEditingMode(state, mode) {
  if (mode !== EDITING_MODE.PHRASE && mode !== EDITING_MODE.WORD) return state;
  if (state?.editingMode === mode) return state;
  return { ...state, editingMode: mode };
}

// ───────────────────────────── Transport ─────────────────────────────

/**
 * Les deux horloges à afficher. `canonical` vaut null tant que la piste n'est pas
 * calibrée : on n'affiche jamais un temps de chanson deviné.
 */
export function transportTimes(localTime, offsetSeconds) {
  const local = Number.isFinite(localTime) ? localTime : 0;
  const canonical = Number.isFinite(offsetSeconds) ? local + offsetSeconds : null;
  return { local, canonical };
}

/**
 * Saut RELATIF borné dans [0, durée] — cible MÉDIA uniquement.
 * Position courante inconnue → on retombe au début plutôt que d'inventer une position
 * (un saut relatif depuis un point inconnu n'a pas de sens).
 */
export function seekByLocal(localTime, deltaSec, duration) {
  if (!Number.isFinite(localTime)) return 0;
  const delta = Number.isFinite(deltaSec) ? deltaSec : 0;
  return clampLocalSeek(localTime + delta, duration);
}

// ─────────────────────── Réécoute de la frase ───────────────────────

/**
 * Fenêtre de réécoute LOCALE de la frase sélectionnée.
 *
 * Renvoie les bornes CANONIQUES telles quelles (elles ne sont jamais modifiées) et les
 * bornes LOCALES correspondantes, plus une cible de navigation `localSeek` / d'arrêt
 * `localStop` incluant la marge de préécoute. Seules les cibles média sont bornées.
 *
 * null si la frase n'a pas de début, ou si la piste n'est pas calibrée (offset null).
 *
 * @param {{time:number|null, endTime:number|null}} line
 * @param {number|null} offsetSeconds
 * @param {{ duration?:number, margin?:number, fallbackEnd?:number }} opts
 */
export function phraseReviewWindow(line, offsetSeconds, opts = {}) {
  if (!line || !Number.isFinite(line.time)) return null;
  if (!Number.isFinite(offsetSeconds)) return null;
  const margin = Number.isFinite(opts.margin) ? Math.max(0, opts.margin) : 0;
  const duration = opts.duration;

  const canonicalStart = line.time;
  const canonicalEnd = Number.isFinite(line.endTime) && line.endTime > line.time
    ? line.endTime
    : (Number.isFinite(opts.fallbackEnd) && opts.fallbackEnd > line.time ? opts.fallbackEnd : null);
  if (canonicalEnd === null) return null;

  const localStart = canonicalTimeToLocalAudio(canonicalStart, offsetSeconds);
  const localEnd = canonicalTimeToLocalAudio(canonicalEnd, offsetSeconds);
  return {
    canonicalStart,
    canonicalEnd,
    localStart,
    localEnd,
    localSeek: clampLocalSeek(localStart - margin, duration),
    localStop: clampLocalSeek(localEnd + margin, duration),
  };
}

/** true si on peut réécouter la frase sur l'audio local. */
export function canReviewLocally({ calibrationStatus, hasAudio, line } = {}) {
  if (calibrationStatus !== 'calibrated') return false;
  if (!hasAudio) return false;
  return Boolean(line && Number.isFinite(line.time));
}

/** Raison pt-BR du blocage de la réécoute locale, ou null si elle est possible. */
export function reviewBlockedReason(ctx = {}) {
  if (!ctx.hasAudio) return 'Carregue um áudio local para ouvir esta frase.';
  if (ctx.calibrationStatus !== 'calibrated') {
    return 'Calibre o áudio local para ouvir esta frase no ponto correto.';
  }
  if (!ctx.line || !Number.isFinite(ctx.line.time)) return 'Marque o início desta frase primeiro.';
  return null;
}

/**
 * Cible de retour en boucle : `localSeek` quand la tête a dépassé `localStop`, sinon
 * null (rien à faire). Ne modifie aucun timing.
 */
export function loopBackTarget(localTime, window_) {
  if (!window_ || !Number.isFinite(localTime)) return null;
  return localTime >= window_.localStop ? window_.localSeek : null;
}

// ─────────────────────── Navigateur de paroles ───────────────────────

const STATUS = {
  error: { key: 'error', label: 'Erro de timing' },
  review: { key: 'review', label: 'Revisar' },
  words: { key: 'words', label: 'Palavras marcadas' },
  phrase: { key: 'phrase', label: 'Frase marcada' },
  unmarked: { key: 'unmarked', label: 'Sem marcação' },
};

/**
 * Statut d'une ligne pour le navigateur. `level` vient de la validation existante
 * ('error' | 'warning' | null). La clé permet de styler SANS dépendre de la couleur.
 */
export function lineWorkshopStatus(line, level) {
  if (level === 'error') return STATUS.error;
  if (level === 'warning') return STATUS.review;
  if (Array.isArray(line?.words) && line.words.length > 0) return STATUS.words;
  if (Number.isFinite(line?.time)) return STATUS.phrase;
  return STATUS.unmarked;
}

/**
 * Lignes à afficher dans le navigateur, dans l'ORDRE ORIGINAL du texte et avec leur
 * INDEX ORIGINAL. Le tableau source n'est ni trié ni réordonné : un filtre ne change que
 * la visibilité. La frase SÉLECTIONNÉE reste toujours présente, quel que soit le filtre.
 *
 * @param {Array} lines
 * @param {{ selectedLineIndex:number, filter:'all'|'incomplete'|'review', levelOf:(i:number)=>string|null }} opts
 */
export function navigatorRows(lines, { selectedLineIndex, filter = 'all', levelOf } = {}) {
  const list = Array.isArray(lines) ? lines : [];
  const level = typeof levelOf === 'function' ? levelOf : () => null;
  const out = [];
  list.forEach((line, index) => {
    const lvl = level(index);
    const keep = index === selectedLineIndex
      || filter === 'all'
      || (filter === 'incomplete' && !Number.isFinite(line?.time))
      || (filter === 'review' && Boolean(lvl));
    if (!keep) return;
    out.push({
      index,
      line,
      level: lvl,
      status: lineWorkshopStatus(line, lvl),
      selected: index === selectedLineIndex,
    });
  });
  return out;
}

// ─────────────────────── Propriété du clavier ───────────────────────

/**
 * QUI possède le clavier, en un seul point de décision. Ordre de priorité :
 *   1. 'input'          — un champ éditable a le focus (frappe, champs de calibration)
 *   2. 'modal'          — une boîte de dialogue est ouverte (raccourcis globaux inertes)
 *   3. 'word-capture'   — le studio de mots est ouvert (cf. étape 2)
 *   4. 'phrase-capture' — mode frase : capture + transport, transport inerte pendant un geste
 *   5. 'none'           — hors étape de synchronisation
 *
 * Un seul propriétaire à la fois : aucun composant ne doit réagir au même événement.
 */
// NB : `isCapturing` n'entre PAS ici — la propriété du clavier dépend du MODE, pas de
// l'état d'un geste en cours. C'est `transportShortcutsActive()` qui neutralise en plus
// les raccourcis de transport pendant un maintien.
export function keyboardOwner({
  targetEditable, modalOpen, wordStudioOpen, editingMode, step,
} = {}) {
  if (targetEditable) return 'input';
  if (step !== 'sync') return 'none';
  if (modalOpen) return 'modal';
  if (wordStudioOpen || editingMode === EDITING_MODE.WORD) return 'word-capture';
  return 'phrase-capture';
}

/** true si les raccourcis de TRANSPORT peuvent tirer (jamais pendant un geste de capture). */
export function transportShortcutsActive(ctx = {}) {
  return keyboardOwner(ctx) === 'phrase-capture' && !ctx.isCapturing;
}

// ─────────────────────── Validation → navigation ───────────────────────

/**
 * Cible de navigation d'un problème de validation : l'INDEX ORIGINAL de la ligne et,
 * si le problème en porte un, le temps CANONIQUE où se placer. N'applique aucune
 * correction et ne laisse passer aucune autre clé (pas de métadonnée de calibration).
 */
export function issueTarget(issue, lineCount) {
  return {
    selectedLineIndex: clampLineIndex(issue?.lineIndex, lineCount),
    canonicalTime: Number.isFinite(issue?.time) ? issue.time : null,
  };
}
