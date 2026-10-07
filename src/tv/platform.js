import { getInterface } from '@/lib/interface';

// La règle (agents utilisateur « 10-foot », choix manuel `?tv=1` / `?tv=0` / `?tv=auto`,
// filet Android sans tactile) vit dans src/lib/interfaceRule.js : `index.html` l'applique
// lui aussi, avant React, et les deux doivent toujours être d'accord. Le marqueur est
// volontairement large — un faux positif tablette est acceptable (l'UI TV reste
// cliquable au doigt), cf. décision produit ; `?tv=0` permet désormais d'en sortir.

/**
 * Détecte un environnement « 10-foot » (télécommande, salon).
 * Priorité : choix manuel → UA TV → Android natif sans tactile ET écran large-paysage.
 * (Le signal FIABLE est le tag UA « AndroidTV » posé nativement par MainActivity. Le
 * filet ne teste PAS `ontouchstart` : présent dans la WebView Android même sur une TV.)
 *
 * ⚠️ GARDE-FOU CRITIQUE : ce flag bascule TOUTE l'app (mobile/desktop publiés inclus)
 * vers l'écran TV — un faux positif sur un vrai téléphone remplacerait l'app par un
 * écran D-pad inadapté. `maxTouchPoints === 0` SEUL est insuffisant : certaines
 * WebView Android peuvent le rapporter transitoirement à 0 au tout premier rendu
 * (bug connu), ce qu'aucun vrai téléphone ne peut faire est d'avoir un écran large
 * ET en paysage — donc on exige les DEUX signaux ensemble, jamais un seul.
 */
export function isTV() {
  if (typeof window === 'undefined') return false;
  return getInterface().tv;
}

/** Pose (ou retire) html[data-device="tv"] — active le focus renforcé (a11y.css + tv.css). */
export function applyTvFlag(on) {
  try {
    if (on) document.documentElement.setAttribute('data-device', 'tv');
    else document.documentElement.removeAttribute('data-device');
  } catch { /* ignore */ }
}
