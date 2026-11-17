// Carte « Como funciona » de l'accueil grand écran (audit D2) : jusqu'à ce qu'on
// appuie sur « Entendi ». Fichier séparé du composant, comme homeHintPref.js.
const STORAGE_KEY = 'amds-bs-howto-seen';

export function shouldShowHowItWorks() {
  try { return localStorage.getItem(STORAGE_KEY) !== '1'; } catch { return false; }
}

export function markHowItWorksSeen() {
  try { localStorage.setItem(STORAGE_KEY, '1'); } catch { /* stockage indisponible : la carte reviendra */ }
}
