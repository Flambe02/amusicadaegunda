/**
 * Constantes partagées entre TvKaraokeLyricsWindow (solo / dueto historique) et
 * TvDuetLyricsView (dueto tagué par chanteur) — évite de dupliquer les ancres de
 * position et les seuils de taille adaptative entre les deux rendus TV.
 */

// Ancres verticales fixes (% de la hauteur) — la ligne active reste à 47%, les
// autres lignes gardent une position stable d'une frame à l'autre (pas de reflow).
export const TV_LINE_ROLES = [
  { role: 'prev', offset: -1, top: '26%' },
  { role: 'active', offset: 0, top: '47%' },
  { role: 'next', offset: 1, top: '66%' },
  { role: 'next2', offset: 2, top: '82%' },
];

// Taille adaptative de la ligne active selon sa longueur. Valeurs en px FIXES
// pour le canvas TvStage 1920×1080 (1vw ≡ 19.2px) : les unités viewport se
// calculaient sur la FENÊTRE, pas sur le stage → tailles fausses hors 16:9 exact.
export function tvActiveFontSize(text) {
  const len = (text || '').length;
  if (len <= 20) return '76px';
  if (len <= 40) return '68px';
  return '58px';
}

export function formatTvTime(seconds) {
  const s = Math.max(0, Math.floor(seconds || 0));
  const m = Math.floor(s / 60);
  const r = s % 60;
  return `${m}:${String(r).padStart(2, '0')}`;
}
