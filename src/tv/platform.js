import { Capacitor } from '@capacitor/core';

// Marqueurs d'agents utilisateur « 10-foot » (Android TV, Google TV, Fire TV,
// Tizen, webOS, etc.). Volontairement large — un faux positif tablette est
// acceptable (l'UI TV reste cliquable au doigt), cf. décision produit.
const TV_UA = /(SmartTV|Smart-TV|GoogleTV|Google TV|Android ?TV|AFT[A-Z]|BRAVIA|AQUOS|Web0S|WebOS|Tizen|HbbTV|NetCast|VIDAA|Roku|CrKey|\bTV\b)/i;

// Override manuel pour tester au navigateur / à l'émulateur : ?tv=1 (ou ?tv=0).
function tvOverride() {
  try {
    const p = new URLSearchParams(window.location.search);
    if (p.get('tv') === '1') { localStorage.setItem('force-tv', '1'); return true; }
    if (p.get('tv') === '0') { localStorage.removeItem('force-tv'); return false; }
    return localStorage.getItem('force-tv') === '1';
  } catch { return false; }
}

/**
 * Détecte un environnement « 10-foot » (télécommande, salon).
 * Priorité : override → UA TV → Android natif sans tactile ET écran large-paysage.
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
  if (tvOverride()) return true;

  const ua = navigator.userAgent || '';
  if (TV_UA.test(ua)) return true;

  // Filet de sécurité pour les boîtiers Android TV sans marqueur UA explicite :
  // natif Android + aucun tactile + écran large ET paysage (aucun téléphone/tablette
  // ne peut réunir ces 3 conditions ; un vrai téléphone reste < 960px même en paysage).
  let nativeAndroid = false;
  try { nativeAndroid = Capacitor.getPlatform?.() === 'android'; } catch { /* web */ }
  const noTouch = (navigator.maxTouchPoints || 0) === 0 && !('ontouchstart' in window);
  const wideLandscape = window.innerWidth >= 960 && window.innerWidth > window.innerHeight;
  if (nativeAndroid && noTouch && wideLandscape) return true;

  return false;
}

/** Pose (ou retire) html[data-device="tv"] — active le focus renforcé (a11y.css + tv.css). */
export function applyTvFlag(on) {
  try {
    if (on) document.documentElement.setAttribute('data-device', 'tv');
    else document.documentElement.removeAttribute('data-device');
  } catch { /* ignore */ }
}
