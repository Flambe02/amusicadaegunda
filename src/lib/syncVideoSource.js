/**
 * Quelle vidéo peut servir d'HORLOGE à la synchronisation karaokê — fonction PURE.
 *
 * Rappel des colonnes `songs` (noms trompeurs, documentés dans README/mémoire projet) :
 *   `youtube_url`       → lien YouTube **Music** (`music.youtube.com/watch?v=…` ou playlist)
 *                         = la CHANSON COMPLÈTE
 *   `youtube_music_url` → lien YouTube **Shorts** (`youtube.com/shorts/…`)
 *                         = un EXTRAIT vertical de ~60 s, utilisé pour l'embed public
 *
 * Bug constaté le 2026-07-29 sur « Vini, outro CPF » : l'éditeur prenait
 * `extractYouTubeId(youtube_url) || extractYouTubeId(youtube_music_url)`. Quand le lien
 * de la chanson complète ne donne pas d'id (playlist YouTube Music, lien vide/cassé), il
 * retombait donc sur le SHORT. Or un Short est un autre média, plus court et souvent
 * recadré : son horloge n'a aucun rapport avec les temps enregistrés. Toute la
 * synchronisation se faisait alors sur le mauvais référentiel, silencieusement.
 *
 * Règle : un Short n'est JAMAIS une horloge de synchronisation. Mieux vaut aucune vidéo
 * (l'éditeur sait basculer sur l'audio local calibré, voir `masterClockSource`) qu'une
 * vidéo qui ment.
 */
import { extractYouTubeId } from '@/lib/utils';

export const SYNC_VIDEO_REASON = {
  OK: 'ok',                    // une vidéo de chanson complète est utilisable
  SHORTS_ONLY: 'shorts-only',  // seul un Short existe → refusé comme horloge
  MISSING: 'missing',          // aucun lien exploitable
};

const SHORTS_RE = /youtube\.com\/shorts\//i;

/** true si l'URL désigne un Short (extrait), pas la vidéo complète. */
export function isShortsUrl(url) {
  return typeof url === 'string' && SHORTS_RE.test(url);
}

/**
 * Vidéo à utiliser comme horloge de synchronisation.
 *
 * @param {{ youtube_url?:string|null, youtube_music_url?:string|null }} song
 * @returns {{ videoId: string|null, field: string|null, reason: string }}
 */
export function resolveSyncVideo(song) {
  const candidates = [
    ['youtube_url', song?.youtube_url],
    ['youtube_music_url', song?.youtube_music_url],
  ];

  let sawShort = false;
  for (const [field, url] of candidates) {
    if (!url) continue;
    if (isShortsUrl(url)) { sawShort = true; continue; } // extrait : jamais une horloge
    const videoId = extractYouTubeId(url);
    if (videoId) return { videoId, field, reason: SYNC_VIDEO_REASON.OK };
  }

  return {
    videoId: null,
    field: null,
    reason: sawShort ? SYNC_VIDEO_REASON.SHORTS_ONLY : SYNC_VIDEO_REASON.MISSING,
  };
}

/** Phrase d'explication (pt-BR) du refus, ou null quand tout va bien. */
export function syncVideoProblem(reason) {
  if (reason === SYNC_VIDEO_REASON.SHORTS_ONLY) {
    return 'O único vídeo desta música é um Short (excerto de ~60 s). A sincronização precisa da música completa — um Short tem outro relógio.';
  }
  if (reason === SYNC_VIDEO_REASON.MISSING) {
    return 'Esta música não tem um link de vídeo completo utilizável.';
  }
  return null;
}
