/**
 * Distribution déterministe de mots dans une ligne (Stage 2 — sync mot-à-mot).
 *
 * Aucune IA, aucun appel réseau : fonction pure. C'est un POINT DE DÉPART pour
 * l'administrateur, pas une synchronisation exacte — le résultat reste toujours
 * modifiable à la main dans l'éditeur (drag/resize/valeurs numériques).
 *
 * Algorithme (2 passes) :
 *   1. plancher `minWordDuration` par mot, SI la ligne a assez de place pour tous ;
 *      sinon purement proportionnel (ligne trop courte / trop de mots).
 *   2. le temps restant est réparti au poids (longueur de lettres/chiffres du mot,
 *      + bonus si le mot se termine par une ponctuation qui suggère une pause,
 *      + bonus optionnel sur le dernier mot — tenue de note fréquente en fin de phrase).
 *
 * Début et fin de la ligne sont TOUJOURS préservés exactement ; les mots ne se
 * chevauchent jamais et restent dans l'ordre du texte.
 */

const DEFAULT_MIN_WORD_DURATION = 0.12; // secondes
const DEFAULT_LAST_WORD_BOOST = 1.15;   // le dernier mot reçoit ~15% de poids en plus
const PAUSE_PUNCTUATION_RE = /[.,!?;:…]+$/;
const LETTERS_RE = /[\p{L}\p{N}]/gu;

/**
 * Découpe un texte de ligne en tokens de mots (espaces = séparateur, ponctuation
 * conservée collée au mot — cohérent avec l'affichage).
 * @param {string} text
 * @returns {string[]}
 */
export function tokenizeWords(text) {
  if (!text || typeof text !== 'string') return [];
  return text.trim().split(/\s+/).filter(Boolean);
}

function wordWeight(token, isLast, lastWordBoost) {
  const letters = (token.match(LETTERS_RE) || []).length || 1;
  const pauseBonus = PAUSE_PUNCTUATION_RE.test(token) ? 1.4 : 1;
  const boost = isLast ? lastWordBoost : 1;
  return letters * pauseBonus * boost;
}

/**
 * Distribue automatiquement les mots d'une ligne entre `lineStart` et `lineEnd`.
 * @param {string} text
 * @param {number} lineStart
 * @param {number} lineEnd
 * @param {{ minWordDuration?: number, lastWordBoost?: number }} [opts]
 * @returns {{ id:string, text:string, start:number, end:number }[]}
 */
export function distributeWords(text, lineStart, lineEnd, opts = {}) {
  const minWordDuration = Number.isFinite(opts.minWordDuration) ? opts.minWordDuration : DEFAULT_MIN_WORD_DURATION;
  const lastWordBoost = Number.isFinite(opts.lastWordBoost) ? opts.lastWordBoost : DEFAULT_LAST_WORD_BOOST;

  const tokens = tokenizeWords(text);
  const n = tokens.length;
  if (n === 0) return [];

  const start = Number.isFinite(lineStart) ? lineStart : 0;
  const end = Number.isFinite(lineEnd) && lineEnd > start ? lineEnd : start;
  const totalDuration = Math.max(0, end - start);

  if (totalDuration === 0) {
    return tokens.map((t, i) => ({ id: `w${i + 1}`, text: t, start, end: start }));
  }

  const weights = tokens.map((t, i) => wordWeight(t, i === n - 1, lastWordBoost));
  const totalWeight = weights.reduce((a, b) => a + b, 0);

  const flooredTotal = minWordDuration * n;
  const durations = flooredTotal >= totalDuration
    // Pas assez de place pour garantir le plancher partout → purement proportionnel.
    ? weights.map((w) => (w / totalWeight) * totalDuration)
    : (() => {
      const remaining = totalDuration - flooredTotal;
      return weights.map((w) => minWordDuration + (w / totalWeight) * remaining);
    })();

  const words = [];
  let cursor = start;
  tokens.forEach((t, i) => {
    const isLast = i === n - 1;
    const wStart = cursor;
    // Le dernier mot est forcé exactement sur `end` (évite une dérive d'arrondi flottant).
    const wEnd = isLast ? end : cursor + durations[i];
    words.push({ id: `w${i + 1}`, text: t, start: wStart, end: wEnd });
    cursor = wEnd;
  });
  return words;
}
