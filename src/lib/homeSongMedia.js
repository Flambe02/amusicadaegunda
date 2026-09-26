/**
 * Lecture UNIQUE des champs d'une chanson pour la homepage desktop.
 *
 * Pourquoi ce module existe (addendum §2) : les colonnes `songs` portent des noms
 * inversés, et la refonte de la homepage ne doit pas les corriger en base.
 *
 *   `youtube_url`       → lien YouTube **Music** = la CHANSON COMPLÈTE
 *   `youtube_music_url` → lien YouTube **Shorts** = un EXTRAIT vertical (~60 s)
 *
 * Tous les usages de la homepage passent par ici, pour que l'inversion soit traitée
 * à un seul endroit. `isShortsUrl` est réutilisé de `syncVideoSource` plutôt que
 * redéfini : la détection d'un Short doit rester une seule vérité dans le projet.
 *
 * Ce module encode aussi les REPLIS du spec §3 : chaque champ neuf est optionnel,
 * et son absence doit dégrader proprement — jamais un bloc vide, jamais un
 * placeholder, jamais un texte « non disponible ».
 */
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { extractYouTubeId } from '@/lib/utils';
import { isShortsUrl } from '@/lib/syncVideoSource';

/** Lien Short (extrait vertical) — c'est lui qui sert de vidéo publique. */
export function getShortsUrl(song) {
  const url = song?.youtube_music_url;
  return url && isShortsUrl(url) ? url : null;
}

/** Lien de la chanson complète (YouTube Music). Peut être une playlist. */
export function getFullTrackUrl(song) {
  return song?.youtube_url || null;
}

/**
 * La chanson a-t-elle une vidéo regardable ?
 * Spec §12 cas 3 : sans vidéo, « Assistir agora » devient « Ouvir agora » et la
 * durée n'est pas affichée. Une partie du catalogue est dans ce cas.
 */
export function hasWatchableVideo(song) {
  return Boolean(getShortsUrl(song));
}

/**
 * Image du hero, chaîne de repli de l'addendum §2.
 *
 *   1. `hero_image` — rempli à la main chaque semaine pour la chanson courante
 *   2. artwork généré au build, SAUF s'il dérive d'un Short (voir ci-dessous)
 *   3. vignette YouTube `hqdefault` de la chanson complète — jamais `maxresdefault`,
 *      qui renvoie une erreur sur une partie du catalogue
 *   4. `null` → l'appelant peint un aplat de la charte, sans texte ni placeholder
 *
 * ⚠️ Un Short n'est JAMAIS une source d'image de hero : son cadre 9:16 recadré en
 * 16:9 est illisible. Or `scripts/generate-current-song-artwork.cjs` dérive son
 * artwork de `youtube_music_url` EN PRIORITÉ, donc du Short quand il existe. On
 * saute l'étape 2 dans ce cas, conformément à la règle explicite de l'addendum.
 *
 * @param {object} song
 * @param {{slug?:string|null, path?:string|null}} buildArtwork CURRENT_SONG_ARTWORK
 */
export function getHeroImage(song, buildArtwork) {
  if (!song) return null;

  if (song.hero_image) return song.hero_image;

  const artworkMatchesSong =
    buildArtwork?.path && buildArtwork?.slug && buildArtwork.slug === song.slug;
  const artworkComesFromShort = Boolean(getShortsUrl(song));
  if (artworkMatchesSong && !artworkComesFromShort) return buildArtwork.path;

  const fullTrackId = extractYouTubeId(getFullTrackUrl(song));
  if (fullTrackId) return `https://img.youtube.com/vi/${fullTrackId}/hqdefault.jpg`;

  return null;
}

/**
 * Libellé de semaine. Spec §3 : dérivé de la date existante quand `week_label`
 * est absent, au format « Semana de 31 de agosto ».
 */
export function getWeekLabel(song) {
  if (song?.week_label) return song.week_label;
  if (!song?.release_date) return null;

  const parsed = parseISO(song.release_date);
  if (Number.isNaN(parsed.getTime())) return null;

  return format(parsed, "'Semana de' d 'de' MMMM", { locale: ptBR });
}

/**
 * Manchette factuelle. Spec §3 : quand elle est absente, le bandeau manchette
 * n'est pas affiché DU TOUT — on ne montre jamais un bandeau à moitié rempli.
 */
export function getNewsHeadline(song) {
  const headline = song?.news_headline;
  return typeof headline === 'string' && headline.trim() ? headline.trim() : null;
}

/**
 * Accroche. Spec §3 : à défaut de `hook_line`, les 120 premiers caractères de la
 * description, coupés sur un mot entier et SANS points de suspension.
 */
export function getHookLine(song, maxLength = 120) {
  if (song?.hook_line) return song.hook_line;

  const description = String(song?.description || '').replace(/\s+/g, ' ').trim();
  if (!description) return null;
  if (description.length <= maxLength) return description;

  const cut = description.slice(0, maxLength);
  const lastSpace = cut.lastIndexOf(' ');
  return (lastSpace > 0 ? cut.slice(0, lastSpace) : cut).trim();
}

/** Durée lisible (« dois minutos » façon mock-up). Absente → rien à afficher. */
export function getDurationLabel(song) {
  const seconds = Number(song?.duration_seconds);
  if (!Number.isFinite(seconds) || seconds <= 0) return null;

  const minutes = Math.round(seconds / 60);
  return minutes <= 1 ? '1 minuto' : `${minutes} minutos`;
}

/**
 * Plateformes d'écoute. Spec §3 : seules celles qui ont une URL sont affichées ;
 * spec §12 cas 4 : si aucune n'en a, l'appelant retire la rangée ENTIÈRE, libellé
 * compris.
 */
export function getPlatformLinks(song) {
  return [
    { key: 'spotify', label: 'Spotify', url: song?.spotify_url || null },
    { key: 'appleMusic', label: 'Apple Music', url: song?.apple_music_url || null },
    { key: 'youtubeMusic', label: 'YouTube Music', url: getFullTrackUrl(song) },
  ].filter((platform) => Boolean(platform.url));
}

/**
 * Trois phrases de contexte (étape 4). Renvoie seulement celles qui existent :
 * les trois absentes → la bande n'est pas affichée ; une ou deux présentes → seules
 * les colonnes renseignées sont réparties sur la largeur.
 */
export function getContextColumns(song) {
  return [
    { key: 'what', title: 'O que aconteceu', text: song?.context_what || null },
    { key: 'why', title: 'Por que virou música', text: song?.context_why || null },
    { key: 'how', title: 'Como virou música', text: song?.context_how || null },
  ].filter((column) => Boolean(column.text));
}
