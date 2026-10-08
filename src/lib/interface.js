import { Capacitor } from '@capacitor/core';
import { detectInterface } from './interfaceRule';

/**
 * Quelle interface pour cet appareil : `mobile` (feed vertical) ou `bigscreen`
 * (TV + ordinateur), et avec quelle entrée (`touch`, `dpad`, `pointer`).
 *
 * La règle elle-même est dans `interfaceRule.js`, partagée avec `index.html`. Ici on
 * lui donne seulement la plateforme native telle que Capacitor la rapporte.
 *
 * @returns {{ kind: 'mobile'|'bigscreen', input: 'touch'|'dpad'|'pointer', tv: boolean }}
 */
export function getInterface() {
  if (typeof window === 'undefined') return detectInterface(null);
  let nativeAndroid = false;
  try { nativeAndroid = Capacitor.getPlatform?.() === 'android'; } catch { /* web */ }
  return detectInterface(window, nativeAndroid);
}

/**
 * Sur le web, l'accueil et la fiche chanson montent-ils l'interface grand écran ?
 *
 * Oui par défaut sur un ordinateur (un pointeur fin disponible, fenêtre d'au moins 900 px).
 * `?ui=legacy` garde l'ancien desktop (mémorisé), `?ui=bigscreen` force le grand écran,
 * `?ui=auto` revient au défaut. La règle est dans `interfaceRule.js` (`webBigScreen`),
 * la même qu'index.html. Sans effet sur un téléphone ni sur la TV.
 */
export function isBigScreenUiEnabled() {
  return getInterface().webBigScreen === true;
}
