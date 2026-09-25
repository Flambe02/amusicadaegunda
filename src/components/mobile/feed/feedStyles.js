/**
 * Lisibilité du texte posé sur la vidéo du feed, façon TikTok (décision du 2026-09-25) :
 * AUCUN dégradé ni voile sur la vidéo — ils l'assombrissaient. Une ombre noire douce
 * sur le texte et les icônes suffit. Les boutons ronds de la colonne droite gardent
 * leur fond sombre translucide.
 *
 * Chaînes de classes Tailwind complètes (le compilateur les trouve dans ce fichier).
 */

/** text-shadow: 0 1px 3px rgba(0,0,0,.6), 0 0 12px rgba(0,0,0,.35) */
export const TEXT_SHADOW = '[text-shadow:0_1px_3px_rgba(0,0,0,0.6),0_0_12px_rgba(0,0,0,0.35)]';

/** Même ombre pour les icônes, en filtre (les SVG n'ont pas de text-shadow). */
export const ICON_SHADOW =
  '[filter:drop-shadow(0_1px_3px_rgba(0,0,0,0.6))_drop-shadow(0_0_12px_rgba(0,0,0,0.35))]';
