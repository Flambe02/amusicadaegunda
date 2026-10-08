/**
 * Entrées directes de l'interface grand écran sur le web.
 *
 * Le grand écran n'a d'adresse que pour l'accueil et la fiche d'une chanson. Pour que la
 * barre du haut des autres pages (Sobre, Guia…) ouvre le catálogo, la recherche, la Festa
 * ou les réglages, on arrive sur `/?abrir=<écran>` : l'app ouvre l'écran demandé puis
 * retire le paramètre de l'adresse (la page reste `/`, canonical inchangé).
 */
export const BIG_SCREEN_ENTRIES = ['catalogo', 'buscar', 'festa', 'ajustes'];
const PARAM = 'abrir';

export function bigScreenEntryUrl(entry) {
  return `/?${PARAM}=${entry}`;
}

/** L'écran demandé par l'adresse d'arrivée, ou null. */
export function readBigScreenEntry(search = typeof window !== 'undefined' ? window.location.search : '') {
  const asked = new RegExp(`[?&]${PARAM}=([^&#]*)`).exec(search || '');
  return asked && BIG_SCREEN_ENTRIES.includes(asked[1]) ? asked[1] : null;
}
