// Préférence locale « familiarité » avec le catálogo : après N ouvertures, l'indice
// télécommande ne s'affiche plus. Fichier séparé du composant (pas de mélange
// export composant / export fonction → évite l'avertissement react-refresh).
const STORAGE_KEY = 'tv-catalog-opens';
export const HINT_HIDE_AFTER = 3;

export function bumpCatalogOpenCount() {
  try {
    const n = Number(localStorage.getItem(STORAGE_KEY) || '0') + 1;
    localStorage.setItem(STORAGE_KEY, String(n));
    return n;
  } catch { return 0; }
}

export function catalogOpenCount() {
  try { return Number(localStorage.getItem(STORAGE_KEY) || '0'); } catch { return 0; }
}
