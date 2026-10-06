import { loadYouTubeIframeApi } from '@/hooks/useYouTubeIframeApi';

/**
 * Préparation du lecteur YouTube du feed, AVANT sa création.
 *
 * Le lecteur lui-même n'est créé qu'une fois la miniature affichée (useShortPlayer) ;
 * mais ouvrir les connexions et télécharger la petite IFrame API ne coûte presque rien
 * et peut se faire pendant que la miniature charge. Au moment de créer le lecteur, il
 * ne reste alors plus que l'iframe à charger.
 */

const YOUTUBE_ORIGINS = ['https://www.youtube.com', 'https://www.youtube-nocookie.com'];

/**
 * Profil réseau déclaré par le navigateur (absent sur Safari : `normal`).
 *   'save-data' économie de données demandée → aucun chargement vidéo sans geste
 *   'slow'      2G → pas de préparation anticipée, la miniature d'abord
 *   'normal'    le reste
 */
export function getNetworkProfile() {
  const connection = typeof navigator !== 'undefined' ? navigator.connection : null;
  if (connection?.saveData) return 'save-data';
  if (connection?.effectiveType === 'slow-2g' || connection?.effectiveType === '2g') return 'slow';
  return 'normal';
}

function preconnect(origin) {
  if (document.head.querySelector(`link[rel="preconnect"][href="${origin}"]`)) return;
  const link = document.createElement('link');
  link.rel = 'preconnect';
  link.href = origin;
  document.head.appendChild(link);
}

let warmedUp = false;

/**
 * Ouvre les connexions YouTube et télécharge l'IFrame API. Sans effet en économie de
 * données ou en 2G, ni au deuxième appel. Ne crée JAMAIS de lecteur.
 */
export function warmUpYouTube() {
  if (warmedUp || typeof document === 'undefined') return;
  if (getNetworkProfile() !== 'normal') return;
  warmedUp = true;
  YOUTUBE_ORIGINS.forEach(preconnect);
  // Un échec ici n'est pas une erreur : useShortPlayer redemandera l'API.
  loadYouTubeIframeApi().catch(() => {});
}

/** Tests seulement. */
export function resetWarmUpForTests() {
  warmedUp = false;
}
