/**
 * Panneau de recherche mobile (addendum catálogo §B « Recherche », G.5, H.8) —
 * fonctions pures, testables sans React.
 *
 * - La recherche porte sur le titre, les paroles et `subtitle` (G.5) ; `subtitle` n'est
 *   jamais affiché.
 * - Une recherche tapée porte sur TOUT le catalogue : les filtres mois / thème sont
 *   ignorés tant qu'il y a du texte (H.8.3).
 * - Sans texte, les filtres mois et thème se combinent (H.8.2).
 * - Aucun nombre en dur : tout est calculé sur la liste reçue.
 */
import { extractYouTubeId } from '@/lib/utils';
import { getFullTrackUrl } from '@/lib/homeSongMedia';
import { resolveLyricsText } from '@/lib/lrc';
import {
  deriveThemes,
  monthKey,
  monthKeyLabel,
  normalizeText,
  publishedTimestamp,
} from '@/lib/karaokeCatalog';
import { getShortVideoId } from '@/components/mobile/feed/feedMedia';

/** Chansons récentes proposées sous une recherche sans résultat (deux rangées). */
export const RECENT_SUGGESTIONS = 6;

export function isPublished(song) {
  return Boolean(song) && (!song.status || song.status === 'published');
}

/** Chansons publiées, de la plus récente à la plus ancienne. */
export function publishedNewestFirst(songs) {
  return (songs || [])
    .filter(isPublished)
    .sort((a, b) => publishedTimestamp(b) - publishedTimestamp(a));
}

/** Texte normalisé (casse et accents) sur lequel porte la recherche. */
export function buildSearchText(song) {
  return normalizeText([song?.title, song?.subtitle, resolveLyricsText(song)].filter(Boolean).join(' '));
}

/** Tous les mots tapés doivent se retrouver (dans n'importe quel ordre). */
export function matchesQuery(searchText, query) {
  const words = normalizeText(query).split(/\s+/).filter(Boolean);
  return words.length > 0 && words.every((word) => searchText.includes(word));
}

/** Les seuls mois qui ont des chansons, du plus récent au plus ancien (clés « AAAA-MM »). */
export function monthOptions(songs) {
  const keys = new Set();
  for (const song of songs || []) {
    const key = monthKey(song);
    if (key) keys.add(key);
  }
  return [...keys].sort().reverse();
}

/** Libellé d'une pastille de mois : « Setembro », avec l'année si elle diffère de `currentYear`. */
export function monthChipLabel(key, currentYear) {
  const full = monthKeyLabel(key); // « Setembro 2026 »
  const [year] = String(key).split('-');
  return year === String(currentYear) ? full.replace(/\s+\d{4}$/, '') : full;
}

/** Les catégories réelles du catalogue, sans l'entrée « Todos ». */
export function themeOptions(songs) {
  return deriveThemes(songs || []).filter((theme) => theme.value !== null);
}

/**
 * Résultat affiché par la grille.
 * `entries` : [{ song, searchText }] déjà publiées et triées (plus récentes d'abord).
 */
export function filterEntries(entries, { query = '', month = null, theme = null } = {}) {
  const typed = normalizeText(query);
  if (typed) {
    return entries.filter((entry) => matchesQuery(entry.searchText, typed)).map((entry) => entry.song);
  }
  return entries
    .filter(({ song }) => (!month || monthKey(song) === month) && (!theme || song.category === theme))
    .map((entry) => entry.song);
}

/**
 * Images candidates d'une vignette 9:16, dans l'ordre d'essai (décision H.8.1) :
 * miniature du Short (verticale, puis 4:3) → miniature YouTube de la chanson complète
 * (`youtube_url`, recadrée en 9:16) → pochette. Si tout échoue, la vignette reste sombre
 * avec le titre : jamais de case vide.
 */
export function getTileCandidates(song) {
  const shortId = getShortVideoId(song);
  const fullId = extractYouTubeId(getFullTrackUrl(song));
  const candidates = [
    shortId && `https://i.ytimg.com/vi/${shortId}/oar2.jpg`,
    shortId && `https://i.ytimg.com/vi/${shortId}/hqdefault.jpg`,
    fullId && fullId !== shortId && `https://i.ytimg.com/vi/${fullId}/hqdefault.jpg`,
    song?.cover_image,
    song?.cover_image_url,
    song?.image_url,
  ];
  return [...new Set(candidates.filter(Boolean))];
}
