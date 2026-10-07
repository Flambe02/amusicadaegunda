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
