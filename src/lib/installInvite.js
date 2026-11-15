/**
 * Quand proposer « Instalar o app » (pas la mise à jour, toujours montrée) :
 * - jamais à la première visite : on laisse d'abord découvrir le site ;
 * - à partir de la deuxième visite (une visite = une session de navigation) ;
 * - après « Fechar », plus rien pendant 30 jours, même après rechargement.
 * Sans stockage disponible (navigation privée stricte), l'invitation reste permise.
 */
const VISITS_KEY = 'amds-visits';
const SESSION_KEY = 'amds-visit-counted';
const DISMISS_KEY = 'amds-install-dismissed-at';
export const INSTALL_INVITE_MIN_VISITS = 2;
export const INSTALL_INVITE_SNOOZE_MS = 30 * 24 * 60 * 60 * 1000;

/** Compte la visite (une fois par session) et dit si l'invitation peut s'afficher. */
export function installInviteAllowed(now = Date.now()) {
  try {
    if (!window.sessionStorage.getItem(SESSION_KEY)) {
      const visits = Number(window.localStorage.getItem(VISITS_KEY) || 0) + 1;
      window.localStorage.setItem(VISITS_KEY, String(visits));
      window.sessionStorage.setItem(SESSION_KEY, '1');
    }
    const dismissedAt = Number(window.localStorage.getItem(DISMISS_KEY) || 0);
    if (dismissedAt && now - dismissedAt < INSTALL_INVITE_SNOOZE_MS) return false;
    return Number(window.localStorage.getItem(VISITS_KEY) || 0) >= INSTALL_INVITE_MIN_VISITS;
  } catch {
    return true;
  }
}

/** « Fechar » sur l'invitation : silence pendant 30 jours. */
export function snoozeInstallInvite(now = Date.now()) {
  try {
    window.localStorage.setItem(DISMISS_KEY, String(now));
  } catch {
    /* stockage indisponible : l'invitation reviendra à la prochaine visite */
  }
}
