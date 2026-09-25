import { lazy } from 'react';
import MobileRedirect from '@/components/mobile/MobileRedirect';

// Pages desktop chargées seulement si elles s'affichent (au-dessus de 768 px).
const SearchPage = lazy(() => import('./Search'));
const RodaDaSegunda = lazy(() => import('./RodaDaSegunda'));

/**
 * Navigation mobile à 4 onglets (addendum catálogo, étape 8) : Pesquisa et Roda ne
 * sont plus des onglets, leurs fonctions vivent dans Catálogo. Sous 768 px, leurs
 * routes mènent donc à /catalogo ; au-dessus, les pages desktop restent identiques.
 */
export function SearchRoute() {
  return (
    <MobileRedirect to="/catalogo">
      <SearchPage />
    </MobileRedirect>
  );
}

export function RodaRoute() {
  return (
    <MobileRedirect to="/catalogo">
      <RodaDaSegunda />
    </MobileRedirect>
  );
}
