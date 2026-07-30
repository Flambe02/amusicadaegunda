/**
 * Difficulté de chant pour le catalogue karaokê PUBLIC (/karaoke, web/PWA/app).
 *
 * Réutilise la colonne déjà existante `songs.difficulty` (migration
 * `20260712120000_add_difficulty_to_songs.sql` — clés canoniques 'easy'|'medium'|'hard',
 * NULL = pas de valeur explicite). C'est la MÊME colonne que l'admin (`SongForm.jsx`,
 * champ « Dificuldade ») et que la TV (`src/tv/lib/songMeta.js#getDifficulty`) — aucune
 * nouvelle colonne, aucune nouvelle migration.
 *
 * Volontairement un module INDÉPENDANT de `src/tv/lib/songMeta.js` (pas d'import
 * croisé entre le bundle web et le bundle TV — cf. commentaire d'en-tête de
 * `karaoke-catalog.css` : « AUCUN style TV ici »). Le repli par densité de mots
 * reprend les MÊMES seuils calibrés (165/280 mots) pour rester cohérent à l'œil
 * entre TV et web, mais les deux modules peuvent évoluer sans se marcher dessus.
 *
 * Différence assumée avec la TV : ce module renvoie `null` (« inconnue ») quand il
 * n'y a aucune parole à mesurer, plutôt que de retomber sur « Médio » — l'énoncé de
 * cette page interdit explicitement d'inventer une difficulté. En pratique, une
 * chanson éligible au karaokê a toujours des paroles (condition de
 * `isKaraokePublished`), donc ce cas ne devrait jamais se présenter pour une carte
 * réellement affichée.
 *
 * Priorité : valeur MANUELLE (`song.difficulty`, normalisée) > estimation.
 */
import { resolveLyricsText } from '@/lib/lrc';

export const DIFFICULTY_KEY = { EASY: 'easy', MEDIUM: 'medium', HARD: 'hard' };

// Labels demandés pour CET écran (accord féminin avec « dificuldade », cf. maquette) —
// distinct du « Médio » utilisé par l'admin/la TV, un choix de copy assumé par écran,
// pas une incohérence : les trois surfaces restent libres d'évoluer séparément.
export const DIFFICULTY_LABEL = {
  [DIFFICULTY_KEY.EASY]: 'Fácil',
  [DIFFICULTY_KEY.MEDIUM]: 'Média',
  [DIFFICULTY_KEY.HARD]: 'Difícil',
};

// Alias acceptés en normalisation : clés canoniques, variantes anglaises/portugaises,
// avec ou sans accent — au cas où une valeur non canonique se serait glissée en base
// avant la contrainte CHECK, ou via un import/export manuel.
const DIFFICULTY_ALIASES = {
  easy: DIFFICULTY_KEY.EASY, facil: DIFFICULTY_KEY.EASY, 'fácil': DIFFICULTY_KEY.EASY,
  medium: DIFFICULTY_KEY.MEDIUM, media: DIFFICULTY_KEY.MEDIUM, 'média': DIFFICULTY_KEY.MEDIUM,
  medio: DIFFICULTY_KEY.MEDIUM, 'médio': DIFFICULTY_KEY.MEDIUM,
  hard: DIFFICULTY_KEY.HARD, dificil: DIFFICULTY_KEY.HARD, 'difícil': DIFFICULTY_KEY.HARD,
};

// Seuils calibrés sur la distribution réelle du catalogue (quartiles ~p25=165,
// p75=280 mots) — mêmes valeurs que `src/tv/lib/songMeta.js#getDifficulty`, pour une
// estimation cohérente à l'œil entre les deux surfaces sans dépendance de code.
const WORD_COUNT_EASY_MAX = 165;
const WORD_COUNT_MEDIUM_MAX = 280;

/** Minuscules, sans accents — comparaison de clé uniquement (le label reste intact). */
function foldKey(value) {
  return String(value)
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, ''); // accents combinants (NFD), en \uXXXX pour survivre a tout re-encodage
}

/**
 * Normalise une valeur brute de difficulté vers une clé canonique, ou `null` si la
 * valeur est absente/vide/non reconnue — jamais une exception.
 * @param {unknown} raw
 * @returns {'easy'|'medium'|'hard'|null}
 */
export function normalizeDifficulty(raw) {
  if (raw == null || raw === '') return null;
  return DIFFICULTY_ALIASES[foldKey(raw)] || null;
}

function plainWordCount(text) {
  const t = String(text || '').replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim();
  return t ? t.split(' ').length : 0;
}

/**
 * Estimation par densité de paroles — SEULEMENT un repli quand aucune valeur
 * manuelle n'existe. Renvoie `null` (jamais une valeur inventée) s'il n'y a aucune
 * parole à mesurer.
 * @param {string} lyricsText
 * @returns {'easy'|'medium'|'hard'|null}
 */
export function estimateDifficultyFromLyrics(lyricsText) {
  const n = plainWordCount(lyricsText);
  if (!n) return null;
  if (n < WORD_COUNT_EASY_MAX) return DIFFICULTY_KEY.EASY;
  if (n < WORD_COUNT_MEDIUM_MAX) return DIFFICULTY_KEY.MEDIUM;
  return DIFFICULTY_KEY.HARD;
}

/**
 * Clé de difficulté d'une chanson : `song.difficulty` (normalisée) si présente,
 * sinon estimation par densité de paroles. `null` = réellement inconnue — la carte
 * doit alors omettre le badge ou afficher « Não definida », jamais deviner.
 * @param {{ difficulty?: unknown, lyrics?: string|null, lyrics_karaoke?: string|null }} song
 * @returns {'easy'|'medium'|'hard'|null}
 */
export function getSongDifficultyKey(song) {
  const manual = normalizeDifficulty(song?.difficulty);
  if (manual) return manual;
  return estimateDifficultyFromLyrics(resolveLyricsText(song));
}

/**
 * Label pt-BR affichable, ou `null` si inconnue.
 * @param {object} song
 * @returns {string|null}
 */
export function getSongDifficultyLabel(song) {
  const key = getSongDifficultyKey(song);
  return key ? DIFFICULTY_LABEL[key] : null;
}

/**
 * Forme prête à l'affichage (badge de carte, filtre) : `null` si inconnue — le
 * composant décide alors d'omettre le badge ou de montrer « Não definida ».
 * @param {object} song
 * @returns {{ key:string, label:string }|null}
 */
export function getDifficultyBadge(song) {
  const key = getSongDifficultyKey(song);
  return key ? { key, label: DIFFICULTY_LABEL[key] } : null;
}

/** Options du filtre « Todas / Fácil / Média / Difícil » (`value:null` = pas de filtre). */
export const DIFFICULTY_FILTER_OPTIONS = [
  { value: null, label: 'Todas' },
  { value: DIFFICULTY_KEY.EASY, label: DIFFICULTY_LABEL[DIFFICULTY_KEY.EASY] },
  { value: DIFFICULTY_KEY.MEDIUM, label: DIFFICULTY_LABEL[DIFFICULTY_KEY.MEDIUM] },
  { value: DIFFICULTY_KEY.HARD, label: DIFFICULTY_LABEL[DIFFICULTY_KEY.HARD] },
];
