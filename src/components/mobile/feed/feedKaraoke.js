import { isKaraokePublished } from '@/lib/lrc';
import { getPublicSlug } from './feedMedia';

/**
 * Shorts dont la ligne de karaokê a été vérifiée synchronisée sur un téléphone (slugs
 * publics). Les paroles sont calées sur la chanson complète (`youtube_url`, la vidéo
 * du lecteur karaokê) ; un Short n'en est qu'un extrait, au décalage inconnu. Tant
 * qu'un Short n'a pas été vérifié chanson par chanson, sa ligne n'est pas affichée,
 * plutôt que des paroles décalées (spec §4.1, étape 5 ; addendum H.16). Pour montrer
 * la ligne sur un Short après vérification : ajouter son slug ici.
 */
export const FEED_KARAOKE_SHORT_VERIFIED_SLUGS = new Set([]);

const VERIFY_KEY = 'amds-verificar-karaoke';

/**
 * Vérification sur téléphone, **serveur de dev seulement** (jamais en production) :
 * ouvrir le feed avec `?verificar-karaoke=1` affiche la ligne sur tous les Shorts pendant
 * la session, pour juger leur synchro chanson par chanson (`?verificar-karaoke=0` l'arrête).
 */
export function isShortsVerifyMode() {
  if (!import.meta.env.DEV || typeof window === 'undefined') return false;
  try {
    const param = new URLSearchParams(window.location.search).get('verificar-karaoke');
    if (param === '1') sessionStorage.setItem(VERIFY_KEY, '1');
    if (param === '0') sessionStorage.removeItem(VERIFY_KEY);
    return sessionStorage.getItem(VERIFY_KEY) === '1';
  } catch {
    return false;
  }
}

// Sans fin explicite ni ligne suivante, une ligne dure au plus ce temps.
const DEFAULT_LINE_S = 4;

/** Avancement 0..1 de la ligne `index` au temps `t` (lecture seule du timing). */
export function lineProgress(parsed, index, t) {
  const line = parsed[index];
  if (!line) return 0;
  const next = parsed[index + 1];
  const end = line.endTime ?? next?.time ?? line.time + DEFAULT_LINE_S;
  const span = Math.max(end - line.time, 0.001);
  return Math.max(0, Math.min(1, (t - line.time) / span));
}

/**
 * La ligne peut-elle s'afficher pour cette chanson, dans ce mode de diapositive ?
 * - `audio` (pas de Short) : le feed joue `youtube_url`, la vidéo même du lecteur
 *   karaokê — synchro identique, la ligne s'affiche ;
 * - `video` (Short) : seulement si ce Short a été vérifié ;
 * - autre (pas de lecture, calque Ouvir ouvert) : jamais.
 */
export function canShowFeedKaraoke(song, mode) {
  if (!isKaraokePublished(song)) return false;
  if (mode === 'audio') return true;
  if (mode === 'video') return FEED_KARAOKE_SHORT_VERIFIED_SLUGS.has(getPublicSlug(song)) || isShortsVerifyMode();
  return false;
}
