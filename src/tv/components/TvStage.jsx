import { useEffect, useState } from 'react';
import '@/styles/tv.css'; // .tv-viewport/.tv-stage/.tv-debug — le stage doit être stylable seul (cf. TvErrorFallback)

/**
 * Canvas TV fixe 1920×1080 explicitement mis à l'échelle — architecture retenue
 * pour l'UI TV (décision 2026-07-13) : toute l'interface a été conçue sur une
 * grille logique 1920×1080 ; plutôt que de dépendre du comportement implicite du
 * wide viewport de la WebView, on pose la mise à l'échelle nous-mêmes.
 *
 *   960×540  (WebView 1080p densité 2×, meta viewport ignoré) → échelle 0,5
 *   1280×720                                                   → échelle 0,6667
 *   1920×1080 (meta width=1920 respecté — cas Capacitor)       → échelle 1
 *   3840×2160                                                  → échelle 2
 *
 * Fonctionne AVEC le meta viewport `width=1920` posé avant le montage React
 * (src/main.jsx) : quand il est respecté l'échelle vaut 1 (no-op), sinon le stage
 * rattrape la différence. min(w/1920, h/1080) préserve les proportions
 * (letterbox si la dalle n'est pas 16:9, jamais de déformation).
 *
 * ⚠️ RÈGLE : tout élément TV (overlays, panneaux, lecteurs, toasts) doit être
 * rendu À L'INTÉRIEUR du stage. Un portal React vers document.body échapperait à
 * l'échelle et redeviendrait 2× trop grand — utiliser getTvPortalRoot() à la
 * place (KaraokePlayer s'en sert en tvMode). `transform` fait aussi du stage le
 * containing block des `position: fixed` internes : ils restent dans le canvas.
 */
export const TV_STAGE_WIDTH = 1920;
export const TV_STAGE_HEIGHT = 1080;

const PORTAL_ROOT_ID = 'tv-portal-root';

/** Cible de portal INTERNE au stage (modales/overlays TV) — jamais document.body. */
export function getTvPortalRoot() {
  return document.getElementById(PORTAL_ROOT_ID) || document.body;
}

function computeScale() {
  const w = window.visualViewport?.width ?? window.innerWidth;
  const h = window.visualViewport?.height ?? window.innerHeight;
  if (!w || !h) return 1;
  return Math.min(w / TV_STAGE_WIDTH, h / TV_STAGE_HEIGHT);
}

/** Overlay de diagnostic (activé par ?tvdebug=1, persistant ; ?tvdebug=0 le retire). */
function useTvDebug() {
  const [on] = useState(() => {
    try {
      const p = new URLSearchParams(window.location.search);
      if (p.get('tvdebug') === '1') { localStorage.setItem('tv-debug', '1'); return true; }
      if (p.get('tvdebug') === '0') { localStorage.removeItem('tv-debug'); return false; }
      return localStorage.getItem('tv-debug') === '1';
    } catch { return false; }
  });
  return on;
}

function TvDebugViewport({ scale }) {
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
    screenWidth: window.screen.width,
    screenHeight: window.screen.height,
    dpr: window.devicePixelRatio,
    stageScale: Number(scale.toFixed(4)),
  };
  return <pre className="tv-debug">{JSON.stringify(info, null, 2)}</pre>;
}

export default function TvStage({ children }) {
  const [scale, setScale] = useState(computeScale);
  const debug = useTvDebug();

  useEffect(() => {
    const updateScale = () => setScale(computeScale());
    updateScale();
    window.addEventListener('resize', updateScale);
    window.visualViewport?.addEventListener('resize', updateScale);
    return () => {
      window.removeEventListener('resize', updateScale);
      window.visualViewport?.removeEventListener('resize', updateScale);
    };
  }, []);

  return (
    <div className="tv-viewport">
      <div className="tv-stage" style={{ '--tv-scale': scale }}>
        {children}
        {/* Cible des portals TV — TOUJOURS en dernier enfant du stage (au-dessus). */}
        <div id={PORTAL_ROOT_ID} />
        {debug && <TvDebugViewport scale={scale} />}
      </div>
    </div>
  );
}
