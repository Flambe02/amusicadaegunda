// Onglets de la barre mobile (addendum catálogo §A, révisé le 2026-09-25) : inicio,
// karaoke, catalogo (pastille centrale), buscar, menu. « Buscar » n'est jamais actif
// (il ouvre un panneau, pas une page). Tout ce qui parcourt les musiques (le catalogue, les fiches /musica/…, les
// catégories, l'arquivo) allume « Catálogo » ; les pages atteintes depuis la feuille
// « Menu » allument « Menu ».
export function getMobileActiveTab(rawPathname, search = '') {
  // Les pages publiques ont une adresse canonique avec « / » final (/karaoke/) :
  // même onglet qu'avec l'adresse courte.
  const pathname = rawPathname.length > 1 ? rawPathname.replace(/\/+$/, '') : rawPathname;
  // Calque « Ouvir » du feed (/?ouvir=<slug>) : c'est le Catálogo qui est à l'écran.
  if (pathname === '/') return new URLSearchParams(search).has('ouvir') ? 'catalogo' : 'inicio';
  if (pathname === '/karaoke') return 'karaoke';
  if (
    pathname === '/catalogo' ||
    pathname === '/search' ||
    pathname === '/roda' ||
    pathname === '/musica' ||
    pathname.startsWith('/musica/') ||
    pathname === '/playlist' ||
    pathname.startsWith('/chansons') ||
    pathname.startsWith('/categoria/') ||
    pathname.startsWith('/arquivo/')
  ) {
    return 'catalogo';
  }
  if (
    pathname === '/blog' ||
    pathname === '/sobre' ||
    pathname === '/tv' ||
    pathname === '/festa' ||
    pathname.startsWith('/apprendre')
  ) {
    return 'menu';
  }
  return 'inicio';
}
