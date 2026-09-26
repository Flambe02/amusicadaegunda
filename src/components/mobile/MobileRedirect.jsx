import { Navigate, useLocation } from 'react-router-dom';
import { useShell } from './ShellContext';

const MOBILE_QUERY = '(max-width: 767px)';

function isMobileViewport() {
  return typeof window !== 'undefined' && typeof window.matchMedia === 'function'
    ? window.matchMedia(MOBILE_QUERY).matches
    : false;
}

/**
 * Redirection côté client qui ne s'applique qu'à UN des deux formats.
 *
 * `when="mobile"` : sous 768 px, on part vers `to` ; au-dessus, `children` s'affiche
 * normalement (routes desktop, stubs et sitemap inchangés — addendum §G.1).
 * `when="desktop"` : l'inverse (ex. /catalogo → /musica sur desktop, §G.2).
 *
 * Layout rend la page deux fois (coquille mobile + coquille desktop) : seule la copie
 * qui correspond au viewport navigue. Rien n'est rendu entre-temps (pas d'écran
 * intermédiaire). <Navigate> et non navigate() dans un effet de mise en page :
 * React Router ignore un navigate() appelé pendant le premier rendu.
 */
export default function MobileRedirect({ to, when = 'mobile', children }) {
  const shell = useShell();
  const location = useLocation();
  const mobile = isMobileViewport();
  const redirecting = when === 'mobile' ? mobile : !mobile;
  const myShell = mobile ? 'mobile' : 'desktop';

  if (!redirecting) return children;
  if (shell && shell !== myShell) return null; // l'autre copie s'en charge
  return <Navigate to={to} replace state={{ redirectedFrom: location.pathname }} />;
}
