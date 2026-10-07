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

const UI_KEY = 'force-ui';

/**
 * L'interface grand écran dérivée de la TV est-elle activée sur cet ordinateur ?
 *
 * Tant que la phase 3 n'est pas validée, l'ancien desktop reste l'interface par défaut :
 * `?ui=bigscreen` active la nouvelle (mémorisé, comme `?tv=`), `?ui=auto` revient au
 * défaut. Sans effet sur un téléphone ni sur la TV.
 */
export function isBigScreenUiEnabled() {
  if (typeof window === 'undefined') return false;
  try {
    const asked = /[?&]ui=([^&#]*)/.exec(window.location.search || '');
    if (asked?.[1] === 'bigscreen') window.localStorage.setItem(UI_KEY, 'bigscreen');
    else if (asked?.[1] === 'auto') window.localStorage.removeItem(UI_KEY);
    return window.localStorage.getItem(UI_KEY) === 'bigscreen';
  } catch {
    return false;
  }
}
