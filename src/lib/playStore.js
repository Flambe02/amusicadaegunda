/**
 * Lien Google Play — ajoute le paramètre `hl` (langue d'affichage de la fiche)
 * selon la langue du navigateur du visiteur, avec repli sur pt_BR (public
 * majoritairement brésilien du projet).
 */
const PLAY_STORE_APP_ID = 'com.amusicadasegunda.app';

export function getPlayStoreUrl() {
  let hl = 'pt_BR';
  try {
    const lang = navigator.language || navigator.languages?.[0];
    if (lang) hl = lang.replace('-', '_');
  } catch { /* ignore */ }
  return `https://play.google.com/store/apps/details?id=${PLAY_STORE_APP_ID}&hl=${hl}`;
}
