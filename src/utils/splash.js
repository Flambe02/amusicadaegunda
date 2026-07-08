/**
 * Masquage du splash screen natif (Capacitor).
 *
 * ⚠️ On masque le splash quand l'app a RÉELLEMENT peint son premier contenu
 * (appelé depuis un effet React après paint), pas sur un timer fixe. Sinon, au
 * cold start via deep link (widget → /musica/:slug lazy + fetch), le splash
 * disparaissait avant que le contenu soit prêt → écran noir de la WebView.
 *
 * `SplashScreen.hide()` est idempotent : on n'utilise PAS de garde bloquante,
 * pour que le filet de sécurité (main.jsx) puisse toujours réessayer si le
 * masquage lié au paint (App.jsx) n'a pas abouti. No-op hors plateforme native.
 */
export async function hideNativeSplash({ minShowMs = 0 } = {}) {
  try {
    const { Capacitor } = await import('@capacitor/core');
    if (!Capacitor.isNativePlatform?.()) return;
    const { SplashScreen } = await import('@capacitor/splash-screen');
    if (minShowMs > 0) {
      await new Promise((resolve) => setTimeout(resolve, minShowMs));
    }
    await SplashScreen.hide({ fadeOutDuration: 250 });
  } catch {
    // Plugin absent (web) ou erreur : ignoré.
  }
}
