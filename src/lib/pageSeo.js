import pages from '../../scripts/seo.pages.json';

/**
 * Titre et description d'une page fixe, pour `useSEO` — les mêmes que dans le HTML
 * statique (scripts/seo.pages.json est lu aussi par scripts/generate-stubs.cjs).
 * `exactTitle` : le titre est écrit tel quel, sans « | A Música da Segunda » ajouté.
 */
export function pageSeo(path) {
  const page = pages[path];
  if (!page) throw new Error(`pageSeo : aucune entrée pour ${path} dans scripts/seo.pages.json`);
  return { title: page.title, description: page.description, exactTitle: true };
}
