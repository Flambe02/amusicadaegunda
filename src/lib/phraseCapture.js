/**
 * Capture manuelle des frases — transitions d'état PURES.
 *
 * Extrait le strict minimum de `KaraokeSyncTool.jsx` pour rendre testable le geste
 * central de la synchronisation (« Espaço maintenu = début → fin, puis on passe à la
 * frase suivante ») et l'affichage du contexte de paroles autour de lui.
 *
 * Deux notions, DISTINCTES et à ne jamais confondre :
 *   • le CURSEUR D'ÉDITION (`selectedIndex`) — explicite, déplacé seulement par
 *     l'utilisateur (clic, flèches) ou par la fin d'une capture réussie ;
 *   • la LIGNE ACTIVE DE LECTURE (`playbackActiveIndex`) — dérivée de `currentTime`,
 *     purement indicative. `activeLineIndex()` renvoie -1 dans le silence entre deux
 *     frases : elle ne peut donc PAS servir de source de vérité à l'écran de capture.
 *
 * Contrat de timing inchangé : secondes, `time`/`endTime` absolus, `endTime` peut
 * rester null, aucune borne de frase recalculée depuis les mots.
 */
import { wordsAreValid } from '@/lib/ballMotion';

/**
 * Sélection initiale déterministe : la 1re ligne encore sans temps (on reprend là où le
 * travail s'est arrêté), sinon la dernière ligne (tout est déjà marqué), sinon 0.
 */
export function initialSelectedIndex(lines) {
  if (!Array.isArray(lines) || lines.length === 0) return 0;
  const firstUntimed = lines.findIndex((l) => l?.time == null);
  return firstUntimed === -1 ? lines.length - 1 : firstUntimed;
}

/**
 * Index de la ligne à AFFICHER en grand dans l'écran de capture.
 *
 * En capture, c'est toujours la ligne sélectionnée : l'écran ne doit jamais se vider ni
 * sauter ailleurs parce que la lecture se trouve dans un trou. En revisão, la lecture
 * pilote l'aperçu (utile pour écouter/ajuster), mais on retombe sur la sélection dès
 * que la lecture n'a pas de ligne active. Renvoie -1 seulement s'il n'y a aucune parole.
 */
export function previewIndex({ mode, selectedIndex, playbackActiveIndex, lineCount }) {
  if (!Number.isFinite(lineCount) || lineCount <= 0) return -1;
  const clamp = (i) => Math.max(0, Math.min(lineCount - 1, i));
  if (mode !== 'capture-lines' && Number.isFinite(playbackActiveIndex) && playbackActiveIndex >= 0) {
    return clamp(playbackActiveIndex);
  }
  return clamp(Number.isFinite(selectedIndex) ? selectedIndex : 0);
}

/**
 * Le suivi automatique de lecture peut-il déplacer le curseur d'édition ?
 * Jamais pendant une session de capture manuelle (mode capture-lines) ni pendant un
 * maintien d'Espaço — sinon la lecture « vole » la sélection en pleine passe de
 * marquage, et le relâchement clôturait une autre ligne que celle commencée.
 */
export function shouldFollowPlayback({ mode, isCapturing }) {
  if (isCapturing) return false;
  return mode !== 'capture-lines';
}

/**
 * Démarre la capture de la ligne `index` : pose son début et efface une fin devenue
 * caduque. Mémorise un PROPRIÉTAIRE de capture (index + timing précédent) — c'est lui,
 * et pas l'état courant, qui sera clôturé au relâchement. Le curseur ne bouge pas
 * encore. Renvoie null si l'index est hors bornes (aucun effet de bord).
 *
 * @returns {null | { owner: object, lines: Array, selectedIndex: number }}
 */
export function beginCapture(lines, index, startTime) {
  if (!Array.isArray(lines) || !Number.isInteger(index) || index < 0 || index >= lines.length) return null;
  if (!Number.isFinite(startTime) || startTime < 0) return null;
  const line = lines[index];
  const owner = {
    index,
    start: startTime,
    prevTime: line?.time ?? null,
    prevEndTime: line?.endTime ?? null,
    prevWords: line?.words,
  };
  const next = lines.slice();
  next[index] = { ...line, time: startTime, endTime: null };
  return { owner, lines: next, selectedIndex: index };
}

/**
 * Clôture LA LIGNE DU PROPRIÉTAIRE (jamais « la ligne actuellement sélectionnée ») puis
 * avance le curseur d'exactement un cran, borné à la dernière ligne.
 *
 * - `endTime` n'est écrit que s'il est postérieur au début ; un toque trop bref laisse
 *   `endTime` à null (comportement historique : surbrillance jusqu'à la ligne suivante).
 * - Les mots existants ne sont CONSERVÉS que s'ils restent cohérents avec les nouvelles
 *   bornes. Sinon ils sont retirés (la frase reste jouable en mode frase) — jamais
 *   décalés en bloc, jamais laissés hors des bornes.
 * - Sans propriétaire (second keyup, keyup après annulation), c'est un no-op strict :
 *   le tableau d'origine est renvoyé par référence.
 *
 * @returns {{ lines: Array, selectedIndex: number|null, completed: boolean,
 *             atEnd: boolean, allTimed: boolean, wordsDropped: boolean }}
 */
export function completeCapture(lines, owner, endTime) {
  const noop = {
    lines, selectedIndex: null, completed: false, atEnd: false, allTimed: false, wordsDropped: false,
  };
  if (!Array.isArray(lines) || !owner || !Number.isInteger(owner.index)) return noop;
  if (owner.index < 0 || owner.index >= lines.length) return noop;

  const line = lines[owner.index];
  const start = Number.isFinite(line?.time) ? line.time : owner.start;
  const end = Number.isFinite(endTime) && endTime > start ? endTime : null;

  const keepWords = Array.isArray(line?.words) && line.words.length > 0
    && wordsAreValid(line.words, start, end ?? Infinity);
  const wordsDropped = Array.isArray(line?.words) && line.words.length > 0 && !keepWords;

  const updated = { ...line, time: start, endTime: end };
  if (!keepWords) delete updated.words;

  const next = lines.slice();
  next[owner.index] = updated;

  return {
    lines: next,
    selectedIndex: Math.min(owner.index + 1, next.length - 1),
    completed: true,
    atEnd: owner.index >= next.length - 1,
    allTimed: next.every((l) => l?.time != null),
    wordsDropped,
  };
}

/**
 * Annule une capture avortée (keyup jamais reçu : perte de focus de la fenêtre, le
 * player YouTube prend le focus au clic…) en RESTAURANT exactement le timing précédent
 * de la ligne, sans avancer le curseur.
 *
 * Choix délibéré : la durée du maintien est mesurée sur une horloge murale qui continue
 * de tourner pendant la perte de focus — finaliser écrirait une durée fantaisiste. Une
 * frase déjà valide ne doit jamais être abîmée par un relâchement manquant ; l'admin
 * refait le geste, ce qui coûte deux secondes.
 *
 * @returns {{ lines: Array, selectedIndex: number|null }}
 */
export function cancelCapture(lines, owner) {
  if (!Array.isArray(lines) || !owner || !Number.isInteger(owner.index)) {
    return { lines, selectedIndex: null };
  }
  if (owner.index < 0 || owner.index >= lines.length) return { lines, selectedIndex: null };
  const restored = { ...lines[owner.index], time: owner.prevTime, endTime: owner.prevEndTime };
  if (owner.prevWords === undefined) delete restored.words; else restored.words = owner.prevWords;
  const next = lines.slice();
  next[owner.index] = restored;
  return { lines: next, selectedIndex: owner.index };
}

/**
 * Contexte de paroles autour du curseur, dans l'ORDRE DU TEXTE (jamais depuis une liste
 * filtrée : une ligne ne doit pas disparaître de l'écran au moment même où elle reçoit
 * son temps). `prev`/`next` valent null aux extrémités.
 */
export function lyricContext(lines, selectedIndex) {
  const list = Array.isArray(lines) ? lines : [];
  const i = Number.isFinite(selectedIndex) ? selectedIndex : -1;
  const at = (k) => (k >= 0 && k < list.length ? list[k] : null);
  const current = at(i);
  return {
    prevIndex: current && i - 1 >= 0 ? i - 1 : -1,
    currentIndex: current ? i : -1,
    nextIndex: current && i + 1 < list.length ? i + 1 : -1,
    prev: current ? at(i - 1) : null,
    current,
    next: current ? at(i + 1) : null,
  };
}

/**
 * Garantit que la ligne sélectionnée reste dans la liste affichée, quel que soit le
 * filtre actif (« não sincronizadas » la retirait à l'instant où elle était marquée).
 */
export function visibleWithSelected(indexes, selectedIndex) {
  const list = Array.isArray(indexes) ? indexes : [];
  if (!Number.isInteger(selectedIndex) || selectedIndex < 0 || list.includes(selectedIndex)) return list;
  return [...list, selectedIndex].sort((a, b) => a - b);
}

/** Étiquette d'état (pt-BR) de l'écran de capture. */
export function captureStatus({ mode, isCapturing, allTimed }) {
  if (mode === 'capture-words') return 'Captura de palavras ativa';
  if (mode !== 'capture-lines') return 'Modo revisão';
  if (isCapturing) return 'Marcando frase…';
  if (allTimed) return 'Sincronização concluída';
  return 'Pronto para marcar';
}
