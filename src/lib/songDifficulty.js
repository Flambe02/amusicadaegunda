/**
 * Difficulté de chant ESTIMÉE sur la letra — module sans dépendance, lu par l'interface
 * grand écran (src/tv/lib/songMeta.js), par l'admin (qui l'écrit dans `songs.difficulty`
 * à l'enregistrement d'une letra) et par `scripts/backfill-difficulty.mjs`.
 *
 * Une seule règle, celle que les cartes TV affichent depuis le début : le nombre de mots
 * de la letra d'origine (`songs.lyrics`). Plus il y a de mots à enchaîner, plus c'est
 * dur. Seuils calibrés sur le catalogue (quartiles : ~p25 = 165, ~p75 = 280 mots).
 */

export const DIFFICULTY_EASY_MAX_WORDS = 165;
export const DIFFICULTY_MEDIUM_MAX_WORDS = 280;

/** Nombre de mots d'un texte, balises HTML retirées. */
export function countLyricsWords(text) {
  const plain = (text || '').replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim();
  return plain ? plain.split(/\s+/).length : 0;
}

/**
 * Clé de difficulté ('easy' | 'medium' | 'hard') d'une letra, ou `null` quand il n'y a
 * aucun mot à compter — l'appelant décide alors (la TV affiche « Médio », la base
 * garde NULL).
 * @param {string|null|undefined} lyrics
 * @returns {'easy'|'medium'|'hard'|null}
 */
export function estimateDifficultyKey(lyrics) {
  const words = countLyricsWords(lyrics);
  if (!words) return null;
  if (words < DIFFICULTY_EASY_MAX_WORDS) return 'easy';
  if (words < DIFFICULTY_MEDIUM_MAX_WORDS) return 'medium';
  return 'hard';
}

/** Choix « Automática » du champ Dificuldade de l'admin. */
export const DIFFICULTY_AUTO = 'auto';
const DIFFICULTY_KEYS = ['easy', 'medium', 'hard'];

/**
 * Ce que le champ Dificuldade de l'admin doit montrer pour une chanson : la valeur
 * choisie à la main (`difficulty_manual`), sinon « Automática ».
 *
 * Avant la colonne `difficulty_manual` (absente de la chanson), une valeur présente
 * dans `difficulty` ne pouvait venir que d'un choix manuel : elle est traitée ainsi,
 * pour ne jamais l'écraser.
 * @returns {'auto'|'easy'|'medium'|'hard'}
 */
export function difficultyChoiceOf(song) {
  const value = song?.difficulty;
  if (!DIFFICULTY_KEYS.includes(value)) return DIFFICULTY_AUTO;
  const manual = song.difficulty_manual === undefined ? true : song.difficulty_manual === true;
  return manual ? value : DIFFICULTY_AUTO;
}

/**
 * Les deux colonnes à enregistrer avec une chanson.
 * - « Automática » : la difficulté est RECALCULÉE sur la letra enregistrée (NULL sans
 *   letra), `difficulty_manual` faux ;
 * - valeur choisie à la main : écrite telle quelle, `difficulty_manual` vrai — le
 *   recalcul ne la remplace jamais.
 * @param {{ choice: string, lyrics?: string|null }} input
 * @returns {{ difficulty: 'easy'|'medium'|'hard'|null, difficulty_manual: boolean }}
 */
export function resolveDifficultyFields({ choice, lyrics }) {
  if (DIFFICULTY_KEYS.includes(choice)) return { difficulty: choice, difficulty_manual: true };
  return { difficulty: estimateDifficultyKey(lyrics), difficulty_manual: false };
}

/**
 * Publication directe (bouton « Publicar », publication programmée) : ce qu'il faut
 * écrire en plus du statut pour qu'aucune chanson n'arrive publiée sans difficulté.
 * Seulement quand la colonne est vide ET en « Automática » ; une valeur déjà présente
 * (calculée ou choisie à la main) n'est jamais touchée. Sans letra, rien à écrire.
 * @returns {{ difficulty?: 'easy'|'medium'|'hard' }}
 */
export function difficultyPatchOnPublish(song) {
  if (!song || song.difficulty || song.difficulty_manual === true) return {};
  const difficulty = estimateDifficultyKey(song.lyrics);
  return difficulty ? { difficulty } : {};
}
