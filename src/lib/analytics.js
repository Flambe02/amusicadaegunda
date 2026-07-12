/**
 * Fine abstraction analytics : envoie un événement via le GA4 déjà chargé
 * (`window.gtag`) sans introduire de nouveau provider. No-op si gtag absent
 * (SSR, offline, bloqueur de pub…). Ne jette jamais.
 */
export function trackEvent(name, params = {}) {
  try {
    if (typeof window !== 'undefined' && typeof window.gtag === 'function') {
      window.gtag('event', name, params);
    }
  } catch {
    /* analytics ne doit jamais casser l'UI */
  }
}
