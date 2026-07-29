import { useEffect, useRef } from 'react';

/**
 * Prévia « piano-roll » do pitch-map (admin) — todas as notas ao longo da música
 * + playhead sincronizado com o <audio> local. Controlo visual imediato de que a
 * extração está correta (nº de notas, extensão, densidade).
 *
 * Desenho imperativo em canvas (rAF), sem re-render. Só admin.
 */
export default function PitchMapPreview({ notes, audioRef, durationSec }) {
  const canvasRef = useRef(null);
  const wrapRef = useRef(null);
  const notesRef = useRef(notes); notesRef.current = notes;
  const durRef = useRef(durationSec); durRef.current = durationSec;

  useEffect(() => {
    const canvas = canvasRef.current;
    const wrap = wrapRef.current;
    if (!canvas || !wrap) return undefined;
    const ctx = canvas.getContext('2d');
    let raf; let W = 0; let H = 0;

    const resize = () => {
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      W = wrap.clientWidth; H = wrap.clientHeight;
      canvas.width = Math.max(1, Math.round(W * dpr));
      canvas.height = Math.max(1, Math.round(H * dpr));
      canvas.style.width = `${W}px`; canvas.style.height = `${H}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();
    const ro = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(resize) : null;
    ro?.observe(wrap);

    const draw = () => {
      const ns = notesRef.current || [];
      const totalMs = (durRef.current || 0) * 1000
        || (ns.length ? ns[ns.length - 1].endMs : 1000);
      let minMidi = Infinity; let maxMidi = -Infinity;
      for (const n of ns) { if (n.midi < minMidi) minMidi = n.midi; if (n.midi > maxMidi) maxMidi = n.midi; }
      if (!Number.isFinite(minMidi)) { minMidi = 55; maxMidi = 67; }
      // Amplitude mínima + padding.
      if (maxMidi - minMidi < 10) { const c = (minMidi + maxMidi) / 2; minMidi = c - 5; maxMidi = c + 5; }
      minMidi -= 1; maxMidi += 1;
      const span = Math.max(1, maxMidi - minMidi);
      const padY = 6;
      const midiToY = (m) => padY + (1 - (m - minMidi) / span) * (H - 2 * padY);
      const msToX = (ms) => (ms / totalMs) * W;

      ctx.clearRect(0, 0, W, H);
      // Fundo.
      ctx.fillStyle = 'rgba(255,255,255,0.02)';
      ctx.fillRect(0, 0, W, H);

      // Notas.
      const barH = Math.max(3, Math.min(9, (H - 2 * padY) / span));
      for (const n of ns) {
        const x1 = msToX(n.startMs);
        const w = Math.max(2, msToX(n.endMs) - x1);
        const y = midiToY(n.midi) - barH / 2;
        ctx.fillStyle = 'rgba(253,224,71,0.72)';
        ctx.fillRect(x1, y, w, barH);
      }

      // Playhead.
      const t = audioRef?.current?.currentTime || 0;
      const px = msToX(t * 1000);
      ctx.strokeStyle = 'rgba(255,255,255,0.75)';
      ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.moveTo(px, 0); ctx.lineTo(px, H); ctx.stroke();

      raf = requestAnimationFrame(draw);
    };
    raf = requestAnimationFrame(draw);
    return () => { cancelAnimationFrame(raf); ro?.disconnect(); };
  }, [audioRef]);

  return (
    <div ref={wrapRef} className="h-28 w-full overflow-hidden rounded-lg border border-white/10 bg-black/40">
      <canvas ref={canvasRef} aria-hidden="true" />
    </div>
  );
}
