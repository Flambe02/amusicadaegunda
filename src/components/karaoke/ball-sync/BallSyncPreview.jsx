import { useEffect, useLayoutEffect, useRef } from 'react';
import KaraokeWordLine from '@/components/karaoke/KaraokeWordLine';
import { ballAt, activeWordAt } from '@/lib/ballMotion';

/**
 * BallSyncPreview — aperçu du karaoké dans le studio, avec la BOULE REBONDISSANTE
 * remasterisée (arc parabolique piloté par les timestamps, intensité Suave/Clássica/
 * Marcada) dans LES DEUX modes :
 *
 *  • 'tecnica' : rendu maison (un <span> par mot, cliquable pour « posicionar »),
 *    + overlays techniques (arc du segment courant).
 *  • 'tv' : texte via KaraokeWordLine (rendu public partagé, ball native désactivée)
 *    AVEC la même boule rebondissante en overlay → l'intensité choisie est visible ici
 *    aussi (avant : la boule native de KaraokeWordLine ignorait l'intensité).
 *
 * Une seule boucle rAF lit `currentTimeRef.current` (temps VIDÉO). Les centres des mots
 * sont mesurés au DOM (getBoundingClientRect, robuste quel que soit le mode/nesting) et
 * recalculés via ResizeObserver + fonts.ready.
 */
const clamp01 = (v) => Math.max(0, Math.min(1, v));

export default function BallSyncPreview({
  words, phraseEnd, currentTimeRef,
  mode = 'tecnica', intensity = 'classica', reducedMotion = false,
  onWordClick,
}) {
  const layerRef = useRef(null);      // conteneur position:relative qui porte la boule
  const wordRefs = useRef([]);        // spans du mode technique
  const ballRef = useRef(null);
  const arcRef = useRef(null);
  const wordLineRef = useRef(null);   // KaraokeWordLine (mode TV)
  const centersRef = useRef([]);
  const lastActiveRef = useRef(-1);

  wordRefs.current.length = words.length;
  const starts = words.map((w) => w.start);

  // Mesure des centres RENDUS des mots (relatifs au conteneur de la boule).
  const measure = () => {
    const container = layerRef.current;
    if (!container) return;
    const crect = container.getBoundingClientRect();
    const els = mode === 'tv'
      ? Array.from(container.querySelectorAll('.karaoke-wipe-word'))
      : wordRefs.current;
    const centers = [];
    for (let i = 0; i < words.length; i += 1) {
      const el = els[i];
      if (!el) { centers.push({ x: 0, y: 0 }); continue; }
      const r = el.getBoundingClientRect();
      centers.push({ x: (r.left - crect.left) + r.width / 2, y: (r.top - crect.top) - r.height * 0.32 });
    }
    centersRef.current = centers;
  };

  useLayoutEffect(() => {
    measure();
    const container = layerRef.current;
    const ro = new ResizeObserver(() => measure());
    if (container) ro.observe(container);
    if (document.fonts?.ready) document.fonts.ready.then(measure).catch(() => {});
    return () => ro.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [words, mode]);

  useEffect(() => {
    let raf = 0;
    const paintWord = (el, pct) => {
      if (el) el.style.backgroundImage = `linear-gradient(90deg, #FDE047 ${pct}%, rgba(255,255,255,0.92) ${pct}%)`;
    };
    const frame = () => {
      const t = currentTimeRef?.current ?? 0;
      const idx = activeWordAt(words, t);
      let prog = 0;
      if (idx >= 0) {
        const w = words[idx];
        const end = Number.isFinite(w.end) ? w.end : phraseEnd;
        prog = end > w.start ? clamp01((t - w.start) / (end - w.start)) : 1;
      }

      // Remplissage du texte.
      if (mode === 'tv') {
        wordLineRef.current?.setActive(idx, prog);
      } else {
        for (let i = 0; i < words.length; i += 1) {
          const el = wordRefs.current[i];
          if (!el) continue;
          paintWord(el, i < idx ? 100 : i === idx ? prog * 100 : 0);
        }
      }

      // Boule rebondissante (les deux modes).
      const centers = centersRef.current;
      if (ballRef.current && centers.length === words.length && centers.length > 0) {
        const b = ballAt(t, centers, starts, phraseEnd, { intensity, reducedMotion });
        const ball = ballRef.current;
        ball.style.opacity = b.hidden ? '0' : '1';
        ball.style.left = `${b.x}px`;
        ball.style.top = `${b.y}px`;

        if (b.activeIndex !== lastActiveRef.current) {
          lastActiveRef.current = b.activeIndex;
          if (!reducedMotion) {
            if (mode === 'tecnica') {
              const el = wordRefs.current[b.activeIndex];
              if (el) { el.classList.remove('ball-sync-land'); void el.offsetWidth; el.classList.add('ball-sync-land'); }
            }
            ball.classList.remove('ball-sync-ball--land');
            void ball.offsetWidth;
            ball.classList.add('ball-sync-ball--land');
          }
        }

        if (arcRef.current) {
          const i2 = b.activeIndex;
          if (mode === 'tecnica' && i2 >= 0 && i2 < centers.length - 1 && !reducedMotion) {
            const from = centers[i2];
            const to = centers[i2 + 1];
            const midX = (from.x + to.x) / 2;
            const peakY = Math.min(from.y, to.y) - Math.abs(to.x - from.x) * 0.18 - 20;
            arcRef.current.setAttribute('d', `M ${from.x} ${from.y} Q ${midX} ${peakY} ${to.x} ${to.y}`);
            arcRef.current.style.opacity = '0.5';
          } else {
            arcRef.current.style.opacity = '0';
          }
        }
      }
      raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(raf);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [words, mode, intensity, reducedMotion, phraseEnd]);

  if (mode === 'tv') {
    return (
      <div className="flex h-full w-full items-center justify-center px-6">
        <div ref={layerRef} className="relative text-center text-3xl font-black leading-tight text-white sm:text-4xl md:text-5xl" style={{ maxWidth: '90%' }}>
          <span ref={ballRef} className="ball-sync-ball" aria-hidden="true" />
          <KaraokeWordLine ref={wordLineRef} words={words} showBall={false} />
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full w-full items-center justify-center px-6">
      <div ref={layerRef} className="relative text-center text-3xl font-black leading-tight sm:text-4xl md:text-5xl" style={{ maxWidth: '90%' }}>
        <svg className="pointer-events-none absolute inset-0 h-full w-full overflow-visible" aria-hidden="true">
          <path ref={arcRef} d="" fill="none" stroke="rgba(253,224,71,0.7)" strokeWidth="2" strokeDasharray="4 4" style={{ opacity: 0 }} />
        </svg>
        <span ref={ballRef} className="ball-sync-ball" aria-hidden="true" />
        {words.map((w, i) => (
          <span key={w.id || i}>
            <button
              type="button"
              ref={(el) => { wordRefs.current[i] = el; }}
              onClick={() => onWordClick?.(i)}
              className="ball-sync-word karaoke-wipe-word"
              style={{ backgroundImage: 'linear-gradient(90deg, #FDE047 0%, rgba(255,255,255,0.92) 0%)' }}
              title="Posicionar bola aqui agora (no tempo atual)"
            >
              {w.text}
            </button>
            {i < words.length - 1 ? ' ' : null}
          </span>
        ))}
      </div>
    </div>
  );
}
