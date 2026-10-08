// L'indice télécommande de l'accueil ne s'affiche qu'aux premiers lancements de l'app
// TV. Fichier séparé du composant, comme catalogHintPref.js.
const STORAGE_KEY = 'tv-home-hint-shown';
export const HOME_HINT_LAUNCHES = 3;

/** Compte ce lancement et dit si l'indice doit encore s'afficher. */
export function shouldShowHomeHint() {
  try {
    const shown = Number(localStorage.getItem(STORAGE_KEY) || '0');
    if (shown >= HOME_HINT_LAUNCHES) return false;
    localStorage.setItem(STORAGE_KEY, String(shown + 1));
    return true;
  } catch { return false; }
}
