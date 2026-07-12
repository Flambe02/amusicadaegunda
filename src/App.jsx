import Pages from "@/pages/index.jsx"
import { Toaster } from "@/components/ui/toaster"
// ✅ PERFORMANCE: HelmetProvider supprimé ici (déjà dans main.jsx)
// Garder un seul HelmetProvider à la racine évite la duplication de contextes
import OfflineIndicator from "@/components/OfflineIndicator"
import ErrorBoundary from "@/components/ErrorBoundary"
import { lazy, Suspense, useEffect, useState } from 'react';
import { hideNativeSplash } from '@/utils/splash';
import { isTV } from '@/tv/platform';

const PushCTA = lazy(() => import('@/components/PushCTA'));
const InstallAppBanner = lazy(() => import('@/components/InstallAppBanner'));
// Le bundle TV est chargé à la demande UNIQUEMENT sur TV → aucun coût pour mobile/web.
const TvApp = lazy(() => import('@/tv/TvApp'));
// Écran d'erreur TV (sortie de secours navigable au D-pad) — remplace le fallback
// web générique quand le crash survient dans le bundle TV.
const TvErrorFallback = lazy(() => import('@/tv/TvErrorFallback'));

function App() {
  const [deferredUiReady, setDeferredUiReady] = useState(false);
  // Décision figée au montage (une TV ne devient pas un mobile en cours de session).
  const [tvMode] = useState(() => { try { return isTV(); } catch { return false; } });

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

  // ── Mode TV : app dédiée « 10-foot », isolée du shell mobile/web (pas de Layout,
  // pas de bannières PWA/push). Le reste de l'app n'est jamais monté. ──
  if (tvMode) {
    return (
      // ErrorBoundary DÉDIÉ TV (imbriqué sous celui de main.jsx, il capte donc en
      // premier) : un crash affiche une sortie de secours à la télécommande
      // (compte à rebours + Sair) au lieu du fallback web non navigable au D-pad.
      <ErrorBoundary
        fallback={(
          <Suspense fallback={<div style={{ position: 'fixed', inset: 0, background: '#0a0a0a' }} />}>
            <TvErrorFallback />
          </Suspense>
        )}
      >
        <Suspense fallback={<div style={{ position: 'fixed', inset: 0, background: '#05070c' }} />}>
          <TvApp />
          <Toaster />
        </Suspense>
      </ErrorBoundary>
    );
  }

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
