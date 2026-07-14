import { forwardRef, useCallback, useEffect, useImperativeHandle, useRef } from 'react';
import { arcAmplitude } from '@/lib/ballMotion';

// easing horizontal doux (même courbe que ballAt() du studio admin).
function easeInOut(p) {
  return p < 0.5 ? 2 * p * p : 1 - Math.pow(-2 * p + 2, 2) / 2;
}

/**
 * Ligne karaoké à balayage MOT PAR MOT — sœur de KaraokeWipeLine (même technique de
 * dégradé + background-clip:text), utilisée par le lecteur public ET l'aperçu admin
 * dès qu'une ligne a un timing structuré par mot (Stage 2 — hybride frase/palavra).
 *
 * Mots COMPLETS = pleinement colorés ; mot ACTIF = dégradé progressif (comme la ligne
 * classique, mais borné au mot) ; mots FUTURS = couleur "non chantée".
 *
 * Pilotage impératif uniquement (`ref.setActive(activeIndex, progress)`), appelé à
 * chaque frame rAF par le lecteur (ou ~10 Hz par l'aperçu admin) — zéro re-render React.
 * Ne recolore TOUTES les portées qu'au changement de mot actif (rare), jamais à chaque
 * frame : seul le mot actif est repeint en continu.
 */
const KaraokeWordLine = forwardRef(function KaraokeWordLine(
  {
    words, progress, activeIndex: activeIndexProp, showBall = true, color = '#FDE047',
    unsungColor = 'rgba(255,255,255,0.92)', className = '',
    // arcBall : boule rebondissante « clássica » du studio admin (arc parabolique entre
    // les centres des mots + squash à l'atterrissage). Défaut false → TV et aperçus
    // admin gardent la boule glissante historique, rien ne change pour eux.
    arcBall = false,
  },
  ref,
) {
  const spanRefs = useRef([]);
  const ballRef = useRef(null);
  const lastIdxRef = useRef(-1);
  const lastLandIdxRef = useRef(-1);
  const colorRef = useRef(color); colorRef.current = color;
  const unsungRef = useRef(unsungColor); unsungRef.current = unsungColor;
  const reducedRef = useRef(
    typeof window !== 'undefined' && !!window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches,
  );

  const paintWord = useCallback((i, pct) => {
    const el = spanRefs.current[i];
    if (!el) return;
    const c = colorRef.current;
    const u = unsungRef.current;
    el.style.backgroundImage = `linear-gradient(90deg, ${c} ${pct}%, ${u} ${pct}%)`;
  }, []);

  // Centre rendu d'un mot (x = milieu, y = ligne de repos de la boule juste au-dessus).
  const wordCenter = useCallback((i) => {
    const el = spanRefs.current[i];
    if (!el) return null;
    const fontSizePx = parseFloat(getComputedStyle(el).fontSize) || 16;
    return { x: el.offsetLeft + (el.offsetWidth || 1) / 2, y: el.offsetTop - fontSizePx * 0.42 };
  }, []);

  const setActive = useCallback((activeIndex, prog, spanSec) => {
    const pct = Math.max(0, Math.min(100, (Number.isFinite(prog) ? prog : 0) * 100));
    if (lastIdxRef.current !== activeIndex) {
      // Recolore les mots AVANT/APRÈS une seule fois par changement de mot actif
      // (pas à chaque frame) — le mot actif lui-même est peint juste après, ci-dessous.
      const words_ = spanRefs.current;
      for (let i = 0; i < words_.length; i += 1) {
        if (i === activeIndex) continue;
        paintWord(i, i < activeIndex ? 100 : 0);
      }
      lastIdxRef.current = activeIndex;
    }
    if (activeIndex >= 0) paintWord(activeIndex, pct);
    if (ballRef.current && arcBall) {
      // ── Boule rebondissante « clássica » (même math que ballAt() du studio) ──
      const ball = ballRef.current;
      const n = spanRefs.current.length;
      const i = Math.max(0, Math.min(n - 1, activeIndex));
      const from = wordCenter(i);
      if (!from) { ball.style.opacity = '0'; return; }
      const p = Math.max(0, Math.min(1, Number.isFinite(prog) ? prog : 0));
      let x = from.x; let y = from.y;
      if (i < n - 1) {
        const to = wordCenter(i + 1) || from;
        x = from.x + (to.x - from.x) * easeInOut(p);
        y = from.y + (to.y - from.y) * p; // suit un retour à la ligne éventuel
        if (!reducedRef.current) {
          const amp = arcAmplitude(to.x - from.x, spanSec, 'classica');
          y -= amp * 4 * p * (1 - p); // parabole : 0 aux extrémités, max au milieu
        }
      }
      ball.style.left = `${x}px`;
      ball.style.top = `${y}px`;
      ball.style.opacity = '1';
      // Squash à l'atterrissage (au changement de mot actif), comme le studio.
      if (lastLandIdxRef.current !== i) {
        lastLandIdxRef.current = i;
        if (!reducedRef.current) {
          ball.classList.remove('karaoke-ball--land');
          void ball.offsetWidth; // reflow → relance l'animation
          ball.classList.add('karaoke-ball--land');
        }
      }
      return;
    }
    if (ballRef.current) {
      const el = activeIndex >= 0 ? spanRefs.current[activeIndex] : null;
      if (el) {
        // offsetLeft/offsetWidth du mot SEUL (l'espace inter-mots est un nœud texte à
        // part, hors du <span> mesuré — sinon un mot court comme « O » se voit gonflé
        // par la largeur de l'espace qui le suit, et la boule dépasse le mot avant
        // même la fin réelle de la syllabe).
        const wordLeft = el.offsetLeft;
        const wordWidth = el.offsetWidth || 1;
        ballRef.current.style.left = `${wordLeft + (pct / 100) * wordWidth}px`;
        // Suit aussi la ligne verticalement (offsetTop) — au cas où le texte fait un
        // retour à la ligne, la boule reste au-dessus du bon mot plutôt que figée sur
        // la 1ère ligne. Décalage au-dessus du mot proportionnel à sa taille de police
        // (remplace le `top:-0.42em` CSS, qui ne suit pas un offsetTop dynamique).
        const fontSizePx = parseFloat(getComputedStyle(el).fontSize) || 16;
        ballRef.current.style.top = `${el.offsetTop - fontSizePx * 0.42}px`;
        ballRef.current.style.opacity = pct > 0 && pct < 100 ? '1' : '0';
      } else {
        ballRef.current.style.opacity = '0';
      }
    }
  }, [paintWord, arcBall, wordCenter]);

  useImperativeHandle(ref, () => ({ setActive }), [setActive]);

  // Mode prop (aperçu admin, piloté par render plutôt que par rAF).
  useEffect(() => {
    if (activeIndexProp != null) setActive(activeIndexProp, progress);
  });

  return (
    <span className={`karaoke-wipe-wrap ${className}`}>
      {showBall && (
        <span
          ref={ballRef}
          className={`karaoke-ball ${arcBall ? 'karaoke-ball--arc' : ''}`}
          aria-hidden="true"
          style={{ background: color, boxShadow: `0 0 12px ${color}` }}
        />
      )}
      {words.flatMap((w, i) => {
        // L'espace inter-mots est un nœud texte SÉPARÉ, hors du <span> mesuré — sinon
        // sa largeur fausse le % du mot (voir le commentaire dans setActive()).
        const wordSpan = (
          <span
            key={w.id || i}
            ref={(el) => { spanRefs.current[i] = el; }}
            className="karaoke-wipe-word"
            style={{ backgroundImage: `linear-gradient(90deg, ${color} 0%, ${unsungColor} 0%)` }}
          >
            {w.text}
          </span>
        );
        return i < words.length - 1 ? [wordSpan, ' '] : [wordSpan];
      })}
    </span>
  );
});

export default KaraokeWordLine;
