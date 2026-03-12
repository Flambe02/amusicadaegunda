import Pages from "@/pages/index.jsx"
import { Toaster } from "@/components/ui/toaster"
// ✅ PERFORMANCE: HelmetProvider supprimé ici (déjà dans main.jsx)
// Garder un seul HelmetProvider à la racine évite la duplication de contextes
import OfflineIndicator from "@/components/OfflineIndicator"
import { lazy, Suspense, useEffect, useState } from 'react';
import migrationService from '@/lib/migration';

const PushCTA = lazy(() => import('@/components/PushCTA'));
const InstallAppBanner = lazy(() => import('@/components/InstallAppBanner'));
// MigrationStatus supprimé pour la production

function App() {
  const [deferredUiReady, setDeferredUiReady] = useState(false);

  // Exécuter la migration au démarrage de l'app
  useEffect(() => {
    let isMounted = true;
    migrationService.execute().catch((error) => {
      if (isMounted) console.error('❌ Erreur lors de la migration:', error);
    });
    return () => { isMounted = false; };
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
