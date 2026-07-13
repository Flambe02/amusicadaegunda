import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

/**
 * WaveformCanvas — onde audio LOCALE (canvas, haute performance) + marqueurs de mots
 * déplaçables. Tout l'axe X est en temps AUDIO (le studio applique l'offset audio↔vidéo
 * avant de passer les temps ici, et le reconvertit au retour). Aucun élément DOM par
 * échantillon : colonnes pré-échantillonnées (useMemo) + un seul canvas redessiné en rAF
 * pendant la lecture, sinon à la demande.
 *
 * Interactions : clic = seek, glisser (zone vide) = scrub, glisser un marqueur = change
 * le début du mot (un seul pas d'historique, commité par le studio au relâchement).
 */
const MARKER_HIT_PX = 10;

export default function WaveformCanvas({
  peaks, duration,
  viewStart, viewEnd,
  regionStart, regionEnd, // frase mappée en temps audio
  preRoll = 0, postRoll = 0,
  markers = [], // [{ time, text }] en temps audio
  selectedIndex = -1,
  currentTimeRef, isPlayingRef,
  onSeek, onMarkerDragStart, onMarkerDrag, onMarkerDragEnd, onSelectMarker,
  onRegionDragStart, onRegionDrag, onRegionDragEnd,
  height = 150,
}) {
  const canvasRef = useRef(null);
  const wrapRef = useRef(null);
  const [width, setWidth] = useState(800);
  const dragRef = useRef(null);

  const span = Math.max(1e-3, viewEnd - viewStart);
  const timeToX = useCallback((t) => ((t - viewStart) / span) * width, [viewStart, span, width]);
  const xToTime = useCallback((x) => viewStart + (x / Math.max(1, width)) * span, [viewStart, span, width]);

  // Mesure de largeur responsive.
  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return undefined;
    const ro = new ResizeObserver((entries) => {
      const w = Math.max(200, Math.floor(entries[0].contentRect.width));
      setWidth(w);
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // Colonnes pré-échantillonnées pour la fenêtre visible (recalculées seulement quand
  // l'onde, le zoom ou la largeur changent — jamais à chaque frame de lecture).
  const columns = useMemo(() => {
    if (!peaks || !duration) return null;
    const { min, max, buckets } = peaks;
    const cols = new Array(width);
    for (let x = 0; x < width; x += 1) {
      const t0 = viewStart + (x / width) * span;
      const t1 = viewStart + ((x + 1) / width) * span;
      const b0 = Math.max(0, Math.min(buckets - 1, Math.floor((t0 / duration) * buckets)));
      const b1 = Math.max(b0, Math.min(buckets - 1, Math.floor((t1 / duration) * buckets)));
      let lo = 1;
      let hi = -1;
      for (let b = b0; b <= b1; b += 1) { if (min[b] < lo) lo = min[b]; if (max[b] > hi) hi = max[b]; }
      if (hi < lo) { lo = 0; hi = 0; }
      cols[x] = [lo, hi];
    }
    return cols;
  }, [peaks, duration, viewStart, span, width]);

  const draw = useCallback((playhead) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const dpr = window.devicePixelRatio || 1;
    if (canvas.width !== width * dpr || canvas.height !== height * dpr) {
      canvas.width = width * dpr;
      canvas.height = height * dpr;
    }
    const ctx = canvas.getContext('2d');
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, width, height);
    const mid = height / 2;

    // Zone hors frase (assombrie) + frase mise en valeur.
    ctx.fillStyle = 'rgba(0,0,0,0.35)';
    ctx.fillRect(0, 0, width, height);
    if (Number.isFinite(regionStart) && Number.isFinite(regionEnd)) {
      const rx0 = timeToX(regionStart - preRoll);
      const rx1 = timeToX(regionEnd + postRoll);
      ctx.fillStyle = 'rgba(147,51,234,0.10)'; // pré/post-roll
      ctx.fillRect(rx0, 0, rx1 - rx0, height);
      const px0 = timeToX(regionStart);
      const px1 = timeToX(regionEnd);
      ctx.fillStyle = 'rgba(253,224,71,0.10)'; // frase
      ctx.fillRect(px0, 0, px1 - px0, height);
    }

    // Onde.
    if (columns) {
      ctx.strokeStyle = 'rgba(196,181,253,0.85)';
      ctx.beginPath();
      for (let x = 0; x < width; x += 1) {
        const [lo, hi] = columns[x];
        const y0 = mid - hi * (mid - 6);
        const y1 = mid - lo * (mid - 6);
        ctx.moveTo(x + 0.5, y0);
        ctx.lineTo(x + 0.5, Math.max(y1, y0 + 0.5));
      }
      ctx.stroke();
    } else {
      ctx.fillStyle = 'rgba(255,255,255,0.35)';
      ctx.font = '12px sans-serif';
      ctx.fillText('Sem forma de onda — carregue um áudio local para a ver.', 12, mid);
    }

    // Marqueurs de mots — ligne + PASTILLE de préhension (déplaçable) + rótulo centré.
    markers.forEach((m, i) => {
      const x = timeToX(m.time);
      if (x < -20 || x > width + 20) return;
      const sel = i === selectedIndex;
      // ligne verticale (sous la bande des bornes de frase pour ne pas les gêner)
      ctx.strokeStyle = sel ? '#fde047' : 'rgba(196,181,253,0.9)';
      ctx.lineWidth = sel ? 2.5 : 1.5;
      ctx.beginPath(); ctx.moveTo(x + 0.5, 20); ctx.lineTo(x + 0.5, height - 22); ctx.stroke();
      // pastille de préhension (juste au-dessus du rótulo) — indique clairement le drag
      const hy = height - 27;
      ctx.fillStyle = sel ? '#fde047' : 'rgba(196,181,253,0.98)';
      ctx.beginPath(); ctx.arc(x, hy, sel ? 7 : 6, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = 'rgba(13,10,18,0.85)'; ctx.lineWidth = 1.5; ctx.stroke();
      // deux petites barres « ⇔ » dans la pastille (affordance de glissement)
      ctx.strokeStyle = sel ? 'rgba(13,10,18,0.8)' : 'rgba(13,10,18,0.55)';
      ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(x - 2.5, hy - 2.5); ctx.lineTo(x - 2.5, hy + 2.5); ctx.moveTo(x + 2.5, hy - 2.5); ctx.lineTo(x + 2.5, hy + 2.5); ctx.stroke();
      // rótulo centré
      ctx.fillStyle = sel ? '#fde047' : 'rgba(226,232,240,0.9)';
      ctx.font = `${sel ? 'bold ' : ''}11px sans-serif`;
      const label = m.text.length > 12 ? `${m.text.slice(0, 11)}…` : m.text;
      ctx.textAlign = 'center';
      ctx.fillText(label, x, height - 6);
      ctx.textAlign = 'left';
    });

    // Bornes de frase (poignées jaunes déplaçables) — dessinées PAR-DESSUS l'onde.
    if (Number.isFinite(regionStart) && Number.isFinite(regionEnd)) {
      [['início', timeToX(regionStart)], ['fim', timeToX(regionEnd)]].forEach(([lbl, x]) => {
        ctx.strokeStyle = 'rgba(253,224,71,0.95)';
        ctx.lineWidth = 2;
        ctx.beginPath(); ctx.moveTo(x + 0.5, 0); ctx.lineTo(x + 0.5, height); ctx.stroke();
        ctx.fillStyle = '#fde047'; // drapeau triangulaire (zone de préhension en haut)
        ctx.beginPath(); ctx.moveTo(x - 7, 0); ctx.lineTo(x + 7, 0); ctx.lineTo(x, 12); ctx.closePath(); ctx.fill();
        ctx.fillStyle = 'rgba(253,224,71,0.95)';
        ctx.font = 'bold 9px sans-serif';
        ctx.fillText(lbl, x + 6, 11);
      });
    }

    // Playhead.
    if (Number.isFinite(playhead)) {
      const x = timeToX(playhead);
      ctx.strokeStyle = '#ef4444';
      ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, height); ctx.stroke();
    }
  }, [width, height, columns, markers, selectedIndex, timeToX, regionStart, regionEnd, preRoll, postRoll]);

  // Redessin à la demande (déps) + boucle rAF continue qui ne PEINT que pendant la
  // lecture (coût négligeable au repos, pas de désync après pause/play).
  useEffect(() => { draw(currentTimeRef?.current ?? 0); }, [draw, currentTimeRef]);
  useEffect(() => {
    let raf = 0;
    const tick = () => {
      if (isPlayingRef?.current) draw(currentTimeRef?.current ?? 0);
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [draw, isPlayingRef, currentTimeRef]);

  // ── Interactions pointeur ──
  const hitMarker = useCallback((x) => {
    for (let i = 0; i < markers.length; i += 1) {
      if (Math.abs(timeToX(markers[i].time) - x) <= MARKER_HIT_PX) return i;
    }
    return -1;
  }, [markers, timeToX]);

  // Curseur au survol : ↔ sur un marqueur ou une borne de frase, croix ailleurs.
  const hoverCursor = useCallback((x, y) => {
    if (y < 20 && Number.isFinite(regionStart) && Number.isFinite(regionEnd)) {
      if (Math.abs(timeToX(regionStart) - x) <= 9 || Math.abs(timeToX(regionEnd) - x) <= 9) return 'ew-resize';
    }
    if (hitMarker(x) >= 0) return 'ew-resize';
    return 'crosshair';
  }, [regionStart, regionEnd, timeToX, hitMarker]);

  const onPointerDown = (e) => {
    const rect = canvasRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    // Bande supérieure (0–20px) = poignées de bornes de frase (drapeaux jaunes).
    if (y < 20 && Number.isFinite(regionStart) && Number.isFinite(regionEnd)) {
      const dStart = Math.abs(timeToX(regionStart) - x);
      const dEnd = Math.abs(timeToX(regionEnd) - x);
      if (dStart <= 9 && dStart <= dEnd) { dragRef.current = { type: 'regionStart' }; onRegionDragStart?.(); e.currentTarget.setPointerCapture?.(e.pointerId); return; }
      if (dEnd <= 9) { dragRef.current = { type: 'regionEnd' }; onRegionDragStart?.(); e.currentTarget.setPointerCapture?.(e.pointerId); return; }
    }
    const idx = hitMarker(x);
    if (idx >= 0) {
      onSelectMarker?.(idx);
      onMarkerDragStart?.(idx);
      dragRef.current = { type: 'marker', idx };
    } else {
      dragRef.current = { type: 'scrub' };
      onSeek?.(Math.max(0, Math.min(duration || Infinity, xToTime(x))));
    }
    e.currentTarget.setPointerCapture?.(e.pointerId);
  };
  const onPointerMove = (e) => {
    const rect = canvasRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const d = dragRef.current;
    if (!d) { canvasRef.current.style.cursor = hoverCursor(x, e.clientY - rect.top); return; }
    const t = Math.max(0, Math.min(duration || Infinity, xToTime(x)));
    if (d.type === 'marker') onMarkerDrag?.(d.idx, t);
    else if (d.type === 'regionStart') onRegionDrag?.('start', t);
    else if (d.type === 'regionEnd') onRegionDrag?.('end', t);
    else onSeek?.(t);
  };
  const onPointerUp = () => {
    const d = dragRef.current;
    dragRef.current = null;
    if (d?.type === 'marker') onMarkerDragEnd?.(d.idx);
    else if (d?.type === 'regionStart' || d?.type === 'regionEnd') onRegionDragEnd?.();
  };

  return (
    <div ref={wrapRef} className="w-full">
      <canvas
        ref={canvasRef}
        style={{ width: '100%', height, display: 'block', touchAction: 'none', cursor: 'crosshair', borderRadius: 8 }}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
      />
    </div>
  );
}
