import { useEffect, useRef } from 'react';

/**
 * TimelineWaveform — couche d'onde en ARRIÈRE-PLAN de la frise temporelle de l'éditeur
 * principal, alignée sur le même axe (temps VIDÉO → px = t * pxPerSecond). Les crêtes
 * sont en temps AUDIO ; on applique l'offset audio↔vidéo pour les placer correctement.
 * Purement décoratif (pointer-events:none) — la frise gère les clics.
 */
export default function TimelineWaveform({ peaks, audioDuration, offsetSec = 0, pxPerSecond, width, height = 150 }) {
  const ref = useRef(null);
  useEffect(() => {
    const canvas = ref.current;
    if (!canvas || !peaks || !audioDuration || !width) return;
    const dpr = window.devicePixelRatio || 1;
    const w = Math.max(1, Math.floor(width));
    canvas.width = Math.floor(w * dpr);
    canvas.height = Math.floor(height * dpr);
    const ctx = canvas.getContext('2d');
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, w, height);
    const { min, max, buckets } = peaks;
    const mid = height / 2;
    ctx.strokeStyle = 'rgba(129,140,248,0.22)';
    ctx.beginPath();
    for (let x = 0; x < w; x += 1) {
      const t = x / pxPerSecond;      // temps vidéo
      const ta = t - offsetSec;       // temps audio
      if (ta < 0 || ta > audioDuration) continue;
      const b = Math.min(buckets - 1, Math.max(0, Math.floor((ta / audioDuration) * buckets)));
      const y0 = mid - max[b] * (mid - 4);
      const y1 = mid - min[b] * (mid - 4);
      ctx.moveTo(x + 0.5, y0);
      ctx.lineTo(x + 0.5, Math.max(y1, y0 + 0.5));
    }
    ctx.stroke();
  }, [peaks, audioDuration, offsetSec, pxPerSecond, width, height]);

  return <canvas ref={ref} aria-hidden="true" style={{ position: 'absolute', left: 0, top: 0, width, height, pointerEvents: 'none' }} />;
}
