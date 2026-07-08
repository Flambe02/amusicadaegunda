import Pages from "@/pages/index.jsx"
import { Toaster } from "@/components/ui/toaster"
// ✅ PERFORMANCE: HelmetProvider supprimé ici (déjà dans main.jsx)
// Garder un seul HelmetProvider à la racine évite la duplication de contextes
import OfflineIndicator from "@/components/OfflineIndicator"
import { lazy, Suspense, useEffect, useState } from 'react';
import { hideNativeSplash } from '@/utils/splash';

const PushCTA = lazy(() => import('@/components/PushCTA'));
const InstallAppBanner = lazy(() => import('@/components/InstallAppBanner'));

function App() {
  const [deferredUiReady, setDeferredUiReady] = useState(false);

  // Masque le splash natif dès que le 1er contenu a peint (double rAF = au moins
  // une frame rendue). Évite l'écran noir de la WebView au cold start via widget/
  // deep link, où /musica/:slug (lazy + fetch) mettait > 1500ms à s'afficher.
  // minShowMs = 500 pour ne pas faire flasher le splash sur un démarrage rapide.
  useEffect(() => {
    const raf = requestAnimationFrame(() => {
      requestAnimationFrame(() => { hideNativeSplash({ minShowMs: 500 }); });
    });
    return () => cancelAnimationFrame(raf);
  }, []);

  useEffect(() => {
    let timeoutId = null;
    let idleId = null;

    const revealDeferredUi = () => setDeferredUiReady(true);

    if ('requestIdleCallback' in window) {
      idleId = window.requestIdleCallback(revealDeferredUi, { timeout: 2000 });
    } else {
      timeoutId = window.setTimeout(revealDeferredUi, 1200);
    }

    return () => {
      if (timeoutId !== null) window.clearTimeout(timeoutId);
      if (idleId !== null && 'cancelIdleCallback' in window) {
        window.cancelIdleCallback(idleId);
      }
    };
  }, []);

  return (
    <>
      <OfflineIndicator />
      <Pages />
      <Toaster />
      {deferredUiReady ? (
        <Suspense fallback={null}>
          <InstallAppBanner />
          <PushCTA />
        </Suspense>
      ) : null}
    </>
  )
}

export default App 
