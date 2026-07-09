import { forwardRef, useCallback, useEffect, useImperativeHandle, useRef } from 'react';

/**
 * Ligne karaoké à balayage continu (« wipe ») + balle qui glisse au-dessus.
 *
 * Le texte se colore progressivement de gauche à droite (jaune → blanc) selon un
 * progrès 0..1, comme les karaokés professionnels. Comme le balayage est continu
 * sur la largeur rendue du texte, les mots longs prennent naturellement plus de
 * temps — pas besoin de timing par mot : l'interpolation entre le début et la fin
 * de la ligne suffit visuellement.
 *
 * Deux modes de pilotage :
 *  - Impératif (lecteur public) : `ref.setProgress(p)` appelé à chaque frame rAF —
 *    mutation DOM directe, zéro re-render React à 60 fps.
 *  - Prop `progress` (aperçu de l'outil de sync) : appliqué via effet à chaque
 *    render (~10 Hz du poll), suffisant pour une prévisualisation.
 *
 * Technique : dégradé deux couleurs à arrêt net + `background-clip: text` (le texte
 * devient le masque du dégradé). La balle est positionnée en `left: p%` du bloc.
 */
const KaraokeWipeLine = forwardRef(function KaraokeWipeLine(
  { text, progress, showBall = true, color = '#FDE047', className = '' },
  ref,
) {
  const wipeRef = useRef(null);
  const ballRef = useRef(null);
  const colorRef = useRef(color);
  colorRef.current = color;

  const setProgress = useCallback((p) => {
    const pct = Math.max(0, Math.min(100, (Number.isFinite(p) ? p : 0) * 100));
    const c = colorRef.current;
    if (wipeRef.current) {
      wipeRef.current.style.backgroundImage =
        `linear-gradient(90deg, ${c} ${pct}%, rgba(255,255,255,0.92) ${pct}%)`;
    }
    if (ballRef.current) {
      ballRef.current.style.left = `${pct}%`;
      ballRef.current.style.background = c;
      ballRef.current.style.opacity = pct > 0 && pct < 100 ? '1' : '0';
    }
  }, []);

  useImperativeHandle(ref, () => ({ setProgress }), [setProgress]);

  // Mode prop (aperçu) OU changement de couleur : ré-applique à chaque render.
  useEffect(() => {
    if (progress != null) setProgress(progress);
  });

  return (
    <span className={`karaoke-wipe-wrap ${className}`}>
      {showBall && <span ref={ballRef} className="karaoke-ball" aria-hidden="true" />}
      <span
        ref={wipeRef}
        className="karaoke-wipe"
        style={{ backgroundImage: `linear-gradient(90deg, ${color} 0%, rgba(255,255,255,0.92) 0%)` }}
      >
        {text}
      </span>
    </span>
  );
});

export default KaraokeWipeLine;
