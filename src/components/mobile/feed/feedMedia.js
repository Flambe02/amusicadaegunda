/**
 * Images du feed mobile. La lecture des colonnes YouTube passe par `homeSongMedia`
 * (`youtube_music_url` = le Short, `youtube_url` = la chanson complète) : aucune
 * lecture directe des colonnes ici.
 */
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { extractYouTubeId } from '@/lib/utils';
import { getShortsUrl, getHeroImage } from '@/lib/homeSongMedia';
import { deriveSongSlug } from '@/lib/learnContent';

export const CAIPIVARA_STAGE_IMAGE = '/images/caipivara-3d-960.webp';

/** Id YouTube du Short de la chanson, ou null (pas de Short → pas de lecteur). */
export function getShortVideoId(song) {
  return extractYouTubeId(getShortsUrl(song)) || null;
}

/**
 * Miniatures candidates, dans l'ordre d'essai.
 *
 * Short : `oar2` est la miniature VERTICALE native (9:16, jusqu'à 576×1024) — elle
 * existe pour les Shorts récents alors que `oardefault` renvoie souvent 404. Repli
 * `hqdefault` (4:3, toujours présente). Sans Short : image de la chanson complète via
 * `getHeroImage`. En dernier recours, la Caipivara : jamais d'écran vide.
 */
export function getPosterCandidates(song, buildArtwork) {
  const shortId = getShortVideoId(song);
  const candidates = shortId
    ? [`https://i.ytimg.com/vi/${shortId}/oar2.jpg`, `https://i.ytimg.com/vi/${shortId}/hqdefault.jpg`]
    : [getHeroImage(song, buildArtwork)];
  candidates.push(CAIPIVARA_STAGE_IMAGE);
  return [...new Set(candidates.filter(Boolean))];
}

/**
 * YouTube répond 200 avec une vignette grise de 120×90 quand une qualité n'existe
 * pas : `onError` ne suffit pas, on rejette aussi toute image trop petite.
 */
export const YT_PLACEHOLDER_MAX_WIDTH = 200;

// ── Semaine de sortie ───────────────────────────────────────────────────────────────
const SAO_PAULO_DAY = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Sao_Paulo' });

/** Lundi (AAAA-MM-JJ) de la semaine lundi→dimanche qui contient la date donnée. */
function mondayOf(isoDay) {
  const [y, m, d] = isoDay.split('-').map(Number);
  const date = new Date(Date.UTC(y, m - 1, d));
  date.setUTCDate(date.getUTCDate() - ((date.getUTCDay() + 6) % 7));
  return date.toISOString().slice(0, 10);
}

/**
 * La chanson est-elle sortie CETTE semaine (lundi→dimanche, heure de São Paulo) ?
 * Sert à ne jamais afficher un faux « Esta semana » quand aucune chanson n'est sortie
 * ce lundi-ci.
 */
export function isReleasedThisWeek(song, now = new Date()) {
  const release = String(song?.release_date || '').slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(release)) return false;
  return mondayOf(release) === mondayOf(SAO_PAULO_DAY.format(now));
}

/** Slug de l'URL publique /musica/<slug>/ : la colonne `slug` (source des stubs), sinon dérivé du titre. */
export function getPublicSlug(song) {
  const slug = typeof song?.slug === 'string' ? song.slug.trim() : '';
  return slug || deriveSongSlug(song);
}

/** 0:42 · 2:10 */
export function formatTime(seconds) {
  const total = Math.max(0, Math.floor(Number(seconds) || 0));
  return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, '0')}`;
}

// ── Ruban de la semaine (WeekRibbon) ───────────────────────────────────────────────
function releaseDate(song) {
  const value = String(song?.release_date || '').slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const date = parseISO(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

/** « NOVA · ESTA SEMANA » ou « SETEMBRO 2026 » (majuscules par CSS). */
export function ribbonLabel(song, now = new Date()) {
  if (isReleasedThisWeek(song, now)) return 'Nova · esta semana';
  const date = releaseDate(song);
  return date ? format(date, 'MMMM yyyy', { locale: ptBR }) : null;
}

/** Texte pour les lecteurs d'écran, toujours présent : « Publicada em 21 de setembro de 2026 ». */
export function ribbonSpokenDate(song, now = new Date()) {
  const date = releaseDate(song);
  if (!date) return null;
  const spoken = `Publicada em ${format(date, "d 'de' MMMM 'de' yyyy", { locale: ptBR })}`;
  return isReleasedThisWeek(song, now) ? `Música desta semana. ${spoken}` : spoken;
}
