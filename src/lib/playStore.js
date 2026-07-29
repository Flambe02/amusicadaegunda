/**
 * Lien Google Play — ajoute le paramètre `hl` (langue d'affichage de la fiche)
 * selon la langue du navigateur du visiteur, avec repli sur pt_BR (public
 * majoritairement brésilien du projet).
 *
 * Source unique de vérité pour l'applicationId Android publié (identique à
 * `capacitor.config.json#appId` et `android/app/build.gradle#applicationId`) —
 * ne JAMAIS le redupliquer ailleurs (cf. src/services/appUpdateService.ts).
 */
export const PLAY_STORE_APP_ID = 'com.amusicadasegunda.app';

export function getPlayStoreUrl() {
  let hl = 'pt_BR';
  try {
    const lang = navigator.language || navigator.languages?.[0];
    if (lang) hl = lang.replace('-', '_');
  } catch { /* ignore */ }
  return `https://play.google.com/store/apps/details?id=${PLAY_STORE_APP_ID}&hl=${hl}`;
}

/** URI `market://` — ouvre directement l'appli Google Play (natif Android) quand elle est installée. */
export function getPlayStoreMarketUri() {
  return `market://details?id=${PLAY_STORE_APP_ID}`;
}
