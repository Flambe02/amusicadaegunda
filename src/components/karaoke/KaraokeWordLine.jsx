import { forwardRef, useCallback, useEffect, useImperativeHandle, useRef } from 'react';

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
  { words, progress, activeIndex: activeIndexProp, showBall = true, color = '#FDE047', unsungColor = 'rgba(255,255,255,0.92)', className = '' },
  ref,
) {
  const spanRefs = useRef([]);
  const ballRef = useRef(null);
  const lastIdxRef = useRef(-1);
  const colorRef = useRef(color); colorRef.current = color;
  const unsungRef = useRef(unsungColor); unsungRef.current = unsungColor;

  const paintWord = useCallback((i, pct) => {
    const el = spanRefs.current[i];
    if (!el) return;
    const c = colorRef.current;
    const u = unsungRef.current;
    el.style.backgroundImage = `linear-gradient(90deg, ${c} ${pct}%, ${u} ${pct}%)`;
  }, []);

  const setActive = useCallback((activeIndex, prog) => {
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
  }, [paintWord]);

  useImperativeHandle(ref, () => ({ setActive }), [setActive]);

  // Mode prop (aperçu admin, piloté par render plutôt que par rAF).
  useEffect(() => {
    if (activeIndexProp != null) setActive(activeIndexProp, progress);
  });

  return (
    <span className={`karaoke-wipe-wrap ${className}`}>
      {showBall && <span ref={ballRef} className="karaoke-ball" aria-hidden="true" style={{ background: color, boxShadow: `0 0 12px ${color}` }} />}
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
