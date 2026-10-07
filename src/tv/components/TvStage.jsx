import { createContext, useContext, useEffect, useState } from 'react';
import { Capacitor } from '@capacitor/core';
import '@/styles/tv.css'; // .tv-viewport/.tv-stage/.tv-debug — le stage doit être stylable seul (cf. TvErrorFallback)

/**
 * Scène de l'interface grand écran, explicitement mise à l'échelle — architecture
 * retenue pour l'UI TV (décision 2026-07-13) : plutôt que de dépendre du comportement
 * implicite du wide viewport de la WebView, on pose la mise à l'échelle nous-mêmes.
 *
 * Depuis le 2026-10-07 (phase 4 du grand écran) : HAUTEUR logique fixe de 1080,
 * LARGEUR logique variable. L'échelle se calcule sur la hauteur, et la scène prend
 * toute la largeur de l'écran : plus de bandes sur un écran 16:10 ou 21:9, les
 * rangées s'étirent. Sur un écran 16:9 la largeur logique vaut exactement 1920 —
 * rien ne change pour une box ou une télévision 16:9 :
 *
 *   960×540  (WebView 1080p densité 2×) → échelle 0,5    largeur 1920
 *   1920×1080                           → échelle 1      largeur 1920
 *   3840×2160                           → échelle 2      largeur 1920
 *   1280×800  (ordinateur 16:10)        → échelle 0,741  largeur 1728
 *   2560×1080 (écran 21:9)              → échelle 1      largeur 2560
 *
 * Sous TV_STAGE_MIN_WIDTH (fenêtre étroite ou haute), la mise en page ne tiendrait
 * plus : l'échelle se calcule alors sur la largeur, avec des bandes en haut et en bas.
 *
 * ⚠️ RÈGLE : tout élément TV (overlays, panneaux, lecteurs, toasts) doit être
 * rendu À L'INTÉRIEUR du stage. Un portal React vers document.body échapperait à
 * l'échelle et redeviendrait 2× trop grand — utiliser getTvPortalRoot() à la
 * place (KaraokePlayer s'en sert en tvMode). `transform` fait aussi du stage le
 * containing block des `position: fixed` internes : ils restent dans le canvas.
 */
export const TV_STAGE_WIDTH = 1920;
export const TV_STAGE_HEIGHT = 1080;
/** Largeur logique minimale : en dessous, la mise en page 3 colonnes ne tient plus. */
export const TV_STAGE_MIN_WIDTH = 1600;

/** Largeur logique courante de la scène (1920 en 16:9) — pour remplir les rangées. */
const StageWidthContext = createContext(TV_STAGE_WIDTH);
export function useTvStageWidth() {
  return useContext(StageWidthContext);
}

const PORTAL_ROOT_ID = 'tv-portal-root';

/** Cible de portal INTERNE au stage (modales/overlays TV) — jamais document.body. */
export function getTvPortalRoot() {
  return document.getElementById(PORTAL_ROOT_ID) || document.body;
}

/**
 * Échelle ET translation de centrage calculées ENSEMBLE, de façon déterministe.
 *
 * ⚠️ Ne JAMAIS s'appuyer sur le centrage CSS (grid/flex `place-items:center`)
 * d'un canvas plus grand que son conteneur : sur la vraie WebView Android TV
 * (Samsung), le viewport rapporté et le comportement de débordement d'un élément
 * surdimensionné divergent de Chromium desktop → le canvas partait en bas-à-droite
 * et devenait « pannable » à la télécommande (bug « rien n'est centré »). Ici on
 * ancre le canvas en HAUT-GAUCHE (`transform-origin: 0 0`) puis on le translate
 * explicitement pour le centrer (letterbox symétrique si la dalle n'est pas 16:9).
 */
export function computeTransform(
  w = window.visualViewport?.width ?? window.innerWidth ?? TV_STAGE_WIDTH,
  h = window.visualViewport?.height ?? window.innerHeight ?? TV_STAGE_HEIGHT,
) {
  if (!w || !h) return { scale: 1, offsetX: 0, offsetY: 0, width: TV_STAGE_WIDTH };
  // Échelle sur la hauteur ; la scène prend la largeur disponible.
  let scale = h / TV_STAGE_HEIGHT;
  let width = Math.round(w / scale);
  if (width < TV_STAGE_MIN_WIDTH) {
    // Trop étroit : échelle sur la largeur, bandes en haut et en bas.
    width = TV_STAGE_MIN_WIDTH;
    scale = w / TV_STAGE_MIN_WIDTH;
  }
  // Translation en px ÉCRAN : dans `transform: translate() scale()`, la
  // translate() s'applique DANS l'espace écran (après le scale au niveau de la
  // matrice) → pas de division par l'échelle. Centre ce qui reste.
  const offsetX = (w - width * scale) / 2;
  const offsetY = (h - TV_STAGE_HEIGHT * scale) / 2;
  return { scale, offsetX, offsetY, width };
}

/** `tvdebug=1` / `tvdebug=0` dans une adresse : active / retire l'overlay (mémorisé). */
export function readTvDebugFlag(url) {
  try {
    const value = new URL(url, 'https://localhost').searchParams.get('tvdebug');
    if (value === '1') { localStorage.setItem('tv-debug', '1'); return true; }
    if (value === '0') { localStorage.removeItem('tv-debug'); return false; }
  } catch { /* ignore */ }
  return null;
}

/**
 * Overlay de diagnostic (activé par ?tvdebug=1, persistant ; ?tvdebug=0 le retire).
 *
 * Dans l'app installée, l'adresse de la WebView n'est pas modifiable : on lit aussi
 * l'adresse avec laquelle l'app a été OUVERTE (lien https du site, Android App Links),
 * ce qui permet de l'activer depuis un ordinateur :
 *   adb shell am start -W -a android.intent.action.VIEW \
 *     -d "https://www.amusicadasegunda.com/?tvdebug=1" com.amusicadasegunda.app
 */
function useTvDebug() {
  const [on, setOn] = useState(() => {
    const fromUrl = readTvDebugFlag(window.location.href);
    if (fromUrl !== null) return fromUrl;
    try { return localStorage.getItem('tv-debug') === '1'; } catch { return false; }
  });
  useEffect(() => {
    if (!Capacitor?.isNativePlatform?.()) return undefined;
    let active = true;
    let subscription = null;
    const apply = (url) => {
      const flag = url ? readTvDebugFlag(url) : null;
      if (active && flag !== null) setOn(flag);
    };
    import('@capacitor/app')
      .then(async ({ App }) => {
        apply((await App.getLaunchUrl())?.url);
        const handle = await App.addListener('appUrlOpen', (event) => apply(event?.url));
        if (active) subscription = handle; else handle.remove();
      })
      .catch(() => { /* plugin absent : l'overlay reste piloté par l'adresse */ });
    return () => { active = false; try { subscription?.remove?.(); } catch { /* ignore */ } };
  }, []);
  return on;
}

function TvDebugViewport({ transform }) {
  const [, force] = useState(0);
  useEffect(() => {
    const id = setInterval(() => force((n) => n + 1), 2000);
    return () => clearInterval(id);
  }, []);
  const info = {
    innerWidth: window.innerWidth,
    innerHeight: window.innerHeight,
    visualWidth: Math.round(window.visualViewport?.width ?? 0),
    visualHeight: Math.round(window.visualViewport?.height ?? 0),
    visualScale: Number((window.visualViewport?.scale ?? 1).toFixed(3)),
    screenWidth: window.screen.width,
    screenHeight: window.screen.height,
    dpr: window.devicePixelRatio,
    stageScale: Number(transform.scale.toFixed(4)),
    stageWidth: transform.width,
    offsetX: Math.round(transform.offsetX),
    offsetY: Math.round(transform.offsetY),
    // Type de pointeur déclaré par la WebView (décision « tablettes » à venir).
    pointer: ['fine', 'coarse', 'none'].find((v) => window.matchMedia?.(`(pointer: ${v})`).matches) || '?',
    anyPointer: ['fine', 'coarse', 'none'].filter((v) => window.matchMedia?.(`(any-pointer: ${v})`).matches).join('+') || '?',
    hover: ['hover', 'none'].find((v) => window.matchMedia?.(`(hover: ${v})`).matches) || '?',
    anyHover: ['hover', 'none'].filter((v) => window.matchMedia?.(`(any-hover: ${v})`).matches).join('+') || '?',
    maxTouchPoints: navigator.maxTouchPoints,
  };
  return <pre className="tv-debug">{JSON.stringify(info, null, 2)}</pre>;
}

export default function TvStage({ children }) {
  const [transform, setTransform] = useState(computeTransform);
  const debug = useTvDebug();

  useEffect(() => {
    const update = () => setTransform(computeTransform());
    update();
    window.addEventListener('resize', update);
    window.addEventListener('orientationchange', update);
    window.visualViewport?.addEventListener('resize', update);
    window.visualViewport?.addEventListener('scroll', update);
    return () => {
      window.removeEventListener('resize', update);
      window.removeEventListener('orientationchange', update);
      window.visualViewport?.removeEventListener('resize', update);
      window.visualViewport?.removeEventListener('scroll', update);
    };
  }, []);

  const stageStyle = {
    '--tv-scale': transform.scale,
    '--tv-off-x': `${transform.offsetX}px`,
    '--tv-off-y': `${transform.offsetY}px`,
    transform: `translate(var(--tv-off-x), var(--tv-off-y)) scale(var(--tv-scale))`,
    transformOrigin: '0 0',
    width: `${transform.width}px`,
  };

  return (
    <div className="tv-viewport">
      <div className="tv-stage" style={stageStyle}>
        <StageWidthContext.Provider value={transform.width}>{children}</StageWidthContext.Provider>
        {/* Cible des portals TV — TOUJOURS en dernier enfant du stage (au-dessus). */}
        <div id={PORTAL_ROOT_ID} />
        {debug && <TvDebugViewport transform={transform} />}
      </div>
    </div>
  );
}
