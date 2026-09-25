/**
 * Images du feed mobile. La lecture des colonnes YouTube passe par `homeSongMedia`
 * (`youtube_music_url` = le Short, `youtube_url` = la chanson complète) : aucune
 * lecture directe des colonnes ici.
 */
import { extractYouTubeId } from '@/lib/utils';
import { getShortsUrl, getHeroImage } from '@/lib/homeSongMedia';

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
