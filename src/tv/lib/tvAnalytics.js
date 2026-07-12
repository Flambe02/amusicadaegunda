// Émission d'événements GA4 pour l'accueil TV — même convention que le reste du
// site (window.gtag direct, cf. src/pages/index.jsx), gardée derrière un typeof
// pour ne jamais planter si GA4 n'est pas encore chargé (boot TV, offline…).
export function trackTv(event, params = {}) {
  if (typeof window === 'undefined' || typeof window.gtag !== 'function') return;
  window.gtag('event', event, params);
}
