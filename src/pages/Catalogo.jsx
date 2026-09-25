import { lazy } from 'react';
import MobileRedirect from '@/components/mobile/MobileRedirect';
import { useSEO } from '@/hooks/useSEO';

// Étape 8 : le contenu mobile de Catálogo est provisoirement la recherche existante,
// pour que l'onglet mène à une page qui fonctionne. L'étape 9 la remplace par la scène
// de la Caipivara (et l'étape 10 par le panneau de recherche).
const SearchPage = lazy(() => import('./Search'));

/**
 * /catalogo — onglet Catálogo de la nav mobile.
 * Desktop (≥ 768 px) : redirection vers /musica, la page indexée (addendum §G.2).
 * Toujours `noindex` : pas de stub, pas d'entrée de sitemap.
 */
export default function Catalogo() {
  useSEO({
    title: 'Catálogo — A Música da Segunda',
    description: 'Todas as paródias de A Música da Segunda.',
    url: '/catalogo',
    robots: 'noindex, follow',
  });

  return (
    <MobileRedirect to="/musica" when="desktop">
      <SearchPage />
    </MobileRedirect>
  );
}
