import { useEffect, useRef } from 'react';

// Taille du dessin : 32×18 pixels. Étiré par le CSS sur tout le bloc, il devient un
// fond flou — sans `filter: blur()`, trop coûteux sur une box peu puissante.
const WIDTH = 32;
const HEIGHT = 18;

/**
 * Fond flouté bon marché : la miniature de l'affiche est dessinée UNE fois dans un
 * canvas minuscule, que le navigateur agrandit. Coût : une image de ≈ 3 Ko et un dessin
 * de 576 pixels. Sans image (ou en cas d'échec), le canvas reste transparent et le fond
 * uni du bloc suffit.
 */
export default function BsBackdrop({ src, className = '' }) {
  const ref = useRef(null);
  useEffect(() => {
    const canvas = ref.current;
    const context = canvas?.getContext?.('2d');
    if (!context) return undefined;
    context.clearRect(0, 0, WIDTH, HEIGHT);
    if (!src) return undefined;
    let active = true;
    const image = new Image();
    image.decoding = 'async';
    image.onload = () => {
      if (!active) return;
      // Recadrage « cover » : on garde le centre de la miniature.
      const scale = Math.max(WIDTH / image.naturalWidth, HEIGHT / image.naturalHeight);
      const w = image.naturalWidth * scale;
      const h = image.naturalHeight * scale;
      try { context.drawImage(image, (WIDTH - w) / 2, (HEIGHT - h) / 2, w, h); } catch { /* ignore */ }
    };
    image.src = src;
    return () => { active = false; };
  }, [src]);
  return <canvas ref={ref} width={WIDTH} height={HEIGHT} className={className} aria-hidden="true" />;
}
