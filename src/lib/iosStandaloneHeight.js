// App installée sur l'écran d'accueil de l'iPhone (barre d'état translucide) : iOS y
// donne un viewport plus court que l'écran, d'environ la hauteur de la barre d'état.
// `100svh` comme `position: fixed; inset: 0` s'arrêtent alors avant le bas, et une
// bande vide reste sous la barre de navigation. On mesure l'écran réel et, s'il
// dépasse le viewport, on publie sa hauteur (--app-screen-h) pour que #root la prenne
// (voir index.css). Hors app installée iOS (Safari, Android, desktop, TV) : rien.

export const ATTR = 'data-ios-standalone';
export const VAR = '--app-screen-h';
// Au-delà, l'écart n'est pas celui de la barre d'état (~47–62 px) : on ne touche à rien.
const MAX_GAP = 120;

export function measureIosStandaloneHeight(win) {
  if (win?.navigator?.standalone !== true || !win.screen) return null;
  const { width, height } = win.screen;
  if (!width || !height) return null;
  const landscape = win.matchMedia?.('(orientation: landscape)')?.matches === true;
  const screenH = landscape ? Math.min(width, height) : Math.max(width, height);
  const screenW = landscape ? Math.max(width, height) : Math.min(width, height);
  // Fenêtre plus étroite que l'écran (iPad en Split View) : l'écran n'est pas la référence.
  if (Math.abs((win.innerWidth || 0) - screenW) > 1) return null;
  const docEl = win.document?.documentElement;
  const viewportH = Math.max(win.innerHeight || 0, docEl?.clientHeight || 0);
  const gap = screenH - viewportH;
  if (gap <= 0 || gap > MAX_GAP) return null;
  return screenH;
}

export function applyIosStandaloneHeight(win = typeof window !== 'undefined' ? window : undefined) {
  const docEl = win?.document?.documentElement;
  if (!docEl) return null;
  const h = measureIosStandaloneHeight(win);
  if (h) {
    docEl.style.setProperty(VAR, `${h}px`);
    docEl.setAttribute(ATTR, '');
  } else {
    docEl.style.removeProperty(VAR);
    docEl.removeAttribute(ATTR);
  }
  return h;
}

export function initIosStandaloneHeight(win = typeof window !== 'undefined' ? window : undefined) {
  if (win?.navigator?.standalone !== true) return;
  const update = () => applyIosStandaloneHeight(win);
  update();
  win.addEventListener('resize', update);
  win.addEventListener('orientationchange', () => setTimeout(update, 250));
}
