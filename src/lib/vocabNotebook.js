/**
 * Carnet de vocabulaire — Modo Aprender (bêta, 2 chansons).
 *
 * Stockage `localStorage`, pas de compte, pas de synchronisation multi-appareil (§6.4
 * de la spec). Deux piles de révision (`to_review` / `known`), SANS algorithme de
 * répétition espacée pour cette version — un classement manuel simple, comme conçu.
 * Pas de limite de taille en bêta (deux chansons, six expressions maximum).
 *
 * Identité d'une entrée = (`expressionId`, `songSlug`) — la même paire que celle
 * utilisée par `addEntry` pour dédupliquer à l'écriture. `markKnown`/`markToReview`
 * s'appuient dessus pour cibler une entrée précise, sans introduire d'id séparé.
 *
 * Dégradation silencieuse en navigation privée / storage plein (§7) : toute écriture
 * qui échoue est avalée, jamais remontée comme erreur visible.
 */

export const VOCAB_NOTEBOOK_KEY = 'vocab-notebook-v1';

/**
 * Lit le carnet actuel. Ne lève jamais — un contenu corrompu ou un storage
 * indisponible renvoie un tableau vide plutôt que de casser l'appelant.
 * @returns {Array<object>}
 */
export function readEntries() {
  try {
    const raw = JSON.parse(localStorage.getItem(VOCAB_NOTEBOOK_KEY) || '[]');
    return Array.isArray(raw) ? raw : [];
  } catch {
    return [];
  }
}

/**
 * Ajoute une expression collectée. Idempotent : une expression déjà présente pour la
 * même chanson (même `expressionId` + `songSlug`) n'est pas dupliquée — le tap répété
 * sur une même ligne pendant le karaoké ne doit pas créer plusieurs entrées.
 *
 * @param {{ expressionId:string, term:string, meaningFr:string, register?:string,
 *           songSlug:string, songTitle?:string }} entry
 * @returns {boolean} true si une nouvelle entrée a été écrite, false si déjà présente
 *   ou si le storage est indisponible (dégradation silencieuse — pas une erreur).
 */
export function addEntry(entry) {
  if (!entry?.expressionId || !entry?.term || !entry?.songSlug) return false;
  try {
    const entries = readEntries();
    const exists = entries.some(
      (e) => e.expressionId === entry.expressionId && e.songSlug === entry.songSlug,
    );
    if (exists) return false;
    entries.push({
      expressionId: entry.expressionId,
      term: entry.term,
      meaningFr: entry.meaningFr || '',
      register: entry.register || null,
      songSlug: entry.songSlug,
      songTitle: entry.songTitle || null,
      // Pile de révision (étape c) : toute nouvelle entrée démarre « à revoir ».
      review: 'to_review',
    });
    localStorage.setItem(VOCAB_NOTEBOOK_KEY, JSON.stringify(entries));
    return true;
  } catch {
    return false; // storage plein / navigation privée : dégradation silencieuse
  }
}

/**
 * Liste les entrées du carnet, plus récentes en premier (ordre d'ajout inversé —
 * l'écran liste montre naturellement ce qu'on vient de collecter en haut).
 * @param {{ review?: 'to_review'|'known' }} [filter] filtre optionnel par pile
 * @returns {Array<object>}
 */
export function listEntries(filter = {}) {
  const entries = readEntries().slice().reverse();
  return filter.review ? entries.filter((e) => e.review === filter.review) : entries;
}

// Change la pile de révision d'une entrée existante. Ne crée jamais d'entrée : une
// expression doit d'abord passer par addEntry() pendant le karaoké ou la lecture.
function setReview(expressionId, songSlug, review) {
  if (!expressionId || !songSlug) return false;
  try {
    const entries = readEntries();
    const idx = entries.findIndex((e) => e.expressionId === expressionId && e.songSlug === songSlug);
    if (idx === -1) return false;
    entries[idx] = { ...entries[idx], review };
    localStorage.setItem(VOCAB_NOTEBOOK_KEY, JSON.stringify(entries));
    return true;
  } catch {
    return false; // dégradation silencieuse, comme addEntry
  }
}

/** Classe une entrée « je sais » (écran révision). @returns {boolean} succès */
export function markKnown(expressionId, songSlug) {
  return setReview(expressionId, songSlug, 'known');
}

/** Classe une entrée « à revoir » (écran révision — y compris pour y remettre une
 * entrée déjà connue). @returns {boolean} succès */
export function markToReview(expressionId, songSlug) {
  return setReview(expressionId, songSlug, 'to_review');
}
