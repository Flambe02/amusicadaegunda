import pages from '../../scripts/seo.pages.json';

/**
 * Titre et description d'une page fixe, pour `useSEO` — les mêmes que dans le HTML
 * statique (scripts/seo.pages.json est lu aussi par scripts/generate-stubs.cjs).
 * `exactTitle` : le titre est écrit tel quel, sans « | A Música da Segunda » ajouté.
 */
// Même liste que scripts/generate-stubs.cjs (NOINDEX_PAGES) : React et HTML statique
// doivent déclarer le même meta robots, sinon useSEO écrase celui du stub à l'hydratation.
const NOINDEX_PAGES = ['/blog', '/search', '/festa', '/catalogo'];

export function pageSeo(path) {
  const page = pages[path];
  if (!page) throw new Error(`pageSeo : aucune entrée pour ${path} dans scripts/seo.pages.json`);
  return {
    title: page.title,
    description: page.description,
    exactTitle: true,
    // Canonical AVEC slash final, comme le stub (`${siteUrl}${page.path}/`). Sans `url`,
    // useSEO retombait sur l'accueil : /roda/ déclarait l'accueil comme canonical (2026-11-15).
    url: path === '/' ? '/' : `${path}/`,
    robots: NOINDEX_PAGES.includes(path) ? 'noindex, follow' : 'index, follow, max-video-preview:0',
  };
}
