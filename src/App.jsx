import Pages from "@/pages/index.jsx"
import { Toaster } from "@/components/ui/toaster"
// ✅ PERFORMANCE: HelmetProvider supprimé ici (déjà dans main.jsx)
// Garder un seul HelmetProvider à la racine évite la duplication de contextes
import OfflineIndicator from "@/components/OfflineIndicator"
import ErrorBoundary from "@/components/ErrorBoundary"
import { lazy, Suspense, useEffect, useState } from 'react';
import { Loader2 } from 'lucide-react';
import { hideNativeSplash } from '@/utils/splash';
import { isTV } from '@/tv/platform';
import { useAppUpdate } from '@/hooks/useAppUpdate';

// Invite « Activer les notifications » retirée (2026-09-26) : la table Supabase
// `push_subscriptions` et la fonction d'envoi `push` ne sont pas en place en ligne,
// l'abonnement échouait toujours. Voir TODO-apres-refonte.md §18 pour la réactiver.
const InstallAppBanner = lazy(() => import('@/components/InstallAppBanner'));
// Le bundle TV est chargé à la demande UNIQUEMENT sur TV → aucun coût pour mobile/web.
const TvApp = lazy(() => import('@/tv/TvApp'));
// Écran d'erreur TV (sortie de secours navigable au D-pad) — remplace le fallback
// web générique quand le crash survient dans le bundle TV.
const TvErrorFallback = lazy(() => import('@/tv/TvErrorFallback'));
// Contrôle de version distant — écrans « required » (bloquant) par plateforme,
// chargés à la demande (status === 'required' est rare). Le dialogue
// « recommended » TV vit DANS TvApp (cf. src/tv/TvApp.jsx) pour partager son
// Retour matériel ; sur mobile il est monté ci-dessous à côté de <Pages/>.
const TvRequiredUpdateScreen = lazy(() => import('@/tv/TvRequiredUpdateScreen'));
const RequiredUpdateScreen = lazy(() => import('@/components/AppUpdate/RequiredUpdateScreen'));
const RecommendedUpdateDialog = lazy(() => import('@/components/AppUpdate/RecommendedUpdateDialog'));

// Écran de transition pour status === 'checking' (1er lancement natif SANS
// cache local, borné par le timeout réseau Supabase ~7s, cf. useAppUpdate.jsx).
// Un simple fond noir sans retour visuel avait l'air figé sur un réseau lent —
// ce spinner comble ce trou, sans jamais afficher l'accueil avant la décision.
function AppUpdateCheckingScreen({ background }) {
  return (
    <div style={{
      position: 'fixed', inset: 0, background, display: 'flex', alignItems: 'center', justifyContent: 'center',
    }}
    >
      <Loader2 className="h-8 w-8 animate-spin text-white/40" aria-hidden="true" />
    </div>
  );
}

function App() {
  const [deferredUiReady, setDeferredUiReady] = useState(false);
  // Décision figée au montage (une TV ne devient pas un mobile en cours de session).
  const [tvMode] = useState(() => { try { return isTV(); } catch { return false; } });
  const { status: updateStatus } = useAppUpdate();

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
          {updateStatus === 'checking' ? (
            <AppUpdateCheckingScreen background="#0a0a0a" />
          ) : updateStatus === 'required' ? (
            <TvRequiredUpdateScreen />
          ) : (
            <>
              <TvApp />
              <Toaster />
            </>
          )}
        </Suspense>
      </ErrorBoundary>
    );
  }

  // Version bloquante (mobile natif uniquement — useAppUpdate reste 'none' sur
  // web/PWA/desktop, cf. src/hooks/useAppUpdate.jsx) : ni l'accueil, ni le
  // routeur, ni l'historique du navigateur ne sont jamais montés en dessous.
  if (updateStatus === 'checking') {
    return <AppUpdateCheckingScreen background="#050505" />;
  }
  if (updateStatus === 'required') {
    return (
      <Suspense fallback={<div style={{ position: 'fixed', inset: 0, background: '#050505' }} />}>
        <RequiredUpdateScreen />
      </Suspense>
    );
  }

  return (
    <>
      <OfflineIndicator />
      <Pages />
      <Toaster />
      <Suspense fallback={null}>
        <RecommendedUpdateDialog />
      </Suspense>
      {deferredUiReady ? (
        <Suspense fallback={null}>
          <InstallAppBanner />
        </Suspense>
      ) : null}
    </>
  )
}

export default App 
