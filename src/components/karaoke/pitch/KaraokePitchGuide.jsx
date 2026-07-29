import { useEffect, useRef } from 'react';
import { Mic } from 'lucide-react';
import { visibleNotes, verticalRange } from '@/lib/pitchReference';
import { PITCH_WINDOW, PITCH_SCALE } from '@/lib/pitch/pitchConfig';
import { statusMeta } from './pitchStatusMeta';

const YELLOW = '#FDE047';

/**
 * Guia de tom compacto (§10) — cabeçalho + timeline de notas em <canvas>.
 *
 * Desenho IMPERATIVO num canvas via rAF, lendo o `guideRef` mutável e o tempo de
 * mídia — zero re-render por frame (§35). Mostra:
 *  - barras das notas esperadas (janela deslizante);
 *  - playhead vertical amarelo fixo (~45%);
 *  - ponto brilhante do pitch detetado (interpolado, some sem voz).
 *
 * Nenhuma imagem/capa. Nenhuma pontuação. Só móvel/web (nunca montado em TV).
 */
export default function KaraokePitchGuide({ status, guideRef, notes, getMediaTimeMs, isPlaying, active = false, compact = false }) {
  const canvasRef = useRef(null);
  const wrapRef = useRef(null);
  const rangeRef = useRef(null);      // [minMidi, maxMidi] suavizado
  const dotYRef = useRef(null);       // y interpolado do ponto (px)
  const dotAlphaRef = useRef(0);      // opacidade interpolada do ponto
  const isPlayingRef = useRef(isPlaying); isPlayingRef.current = isPlaying;
  const meta = statusMeta(status);

  useEffect(() => {
    const canvas = canvasRef.current;
    const wrap = wrapRef.current;
    if (!canvas || !wrap) return undefined;
    const ctx = canvas.getContext('2d');
    const reduce = typeof window !== 'undefined'
      && window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches;

    let raf;
    let W = 0; let H = 0; let dpr = 1;

    const resize = () => {
      dpr = Math.min(2, window.devicePixelRatio || 1);
      W = wrap.clientWidth;
      H = wrap.clientHeight;
      canvas.width = Math.max(1, Math.round(W * dpr));
      canvas.height = Math.max(1, Math.round(H * dpr));
      canvas.style.width = `${W}px`;
      canvas.style.height = `${H}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();
    const ro = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(resize) : null;
    ro?.observe(wrap);

    const draw = () => {
      const g = guideRef.current;
      const mediaMs = getMediaTimeMs();
      const windowStart = mediaMs - PITCH_WINDOW.beforeMs;
      const windowEnd = mediaMs + PITCH_WINDOW.afterMs;
      const windowDur = windowEnd - windowStart;
      const playheadX = W * PITCH_WINDOW.playheadRatio;

      const vis = visibleNotes(notes, windowStart, windowEnd);
      // Escala vertical alvo + suavização (evita saltos bruscos §24).
      const detMidi = g.detectedMidi;
      const target = verticalRange(vis, detMidi, {
        minRange: PITCH_SCALE.minRangeSemitones,
        padding: PITCH_SCALE.paddingSemitones,
      });
      if (!rangeRef.current) rangeRef.current = target;
      else {
        const a = PITCH_SCALE.scaleEaseAlpha;
        rangeRef.current = [
          rangeRef.current[0] + a * (target[0] - rangeRef.current[0]),
          rangeRef.current[1] + a * (target[1] - rangeRef.current[1]),
        ];
      }
      const [minMidi, maxMidi] = rangeRef.current;
      const span = Math.max(1, maxMidi - minMidi);
      const padY = 10;
      const midiToY = (m) => padY + (1 - (m - minMidi) / span) * (H - 2 * padY);
      const msToX = (ms) => ((ms - windowStart) / windowDur) * W;

      ctx.clearRect(0, 0, W, H);

      // Linhas de referência ténues (§10) a cada 4 semitons.
      ctx.strokeStyle = 'rgba(255,255,255,0.05)';
      ctx.lineWidth = 1;
      const startNote = Math.ceil(minMidi);
      for (let m = startNote; m <= maxMidi; m += 4) {
        const y = midiToY(m);
        ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke();
      }

      // Barras das notas esperadas.
      const barH = Math.max(5, Math.min(11, (H - 2 * padY) / span));
      for (const n of vis) {
        const x1 = msToX(n.startMs);
        const x2 = msToX(n.endMs);
        const w = Math.max(PITCH_WINDOW.minNoteWidthPx, x2 - x1);
        const y = midiToY(n.midi) - barH / 2;
        const isPast = n.endMs < mediaMs;
        const isCurrent = mediaMs >= n.startMs && mediaMs < n.endMs;
        ctx.fillStyle = isCurrent
          ? 'rgba(253,224,71,0.55)'
          : isPast ? 'rgba(255,255,255,0.14)' : 'rgba(255,255,255,0.32)';
        roundRect(ctx, x1, y, w, barH, barH / 2);
        ctx.fill();
      }

      // Playhead.
      ctx.strokeStyle = 'rgba(253,224,71,0.85)';
      ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(playheadX, 4); ctx.lineTo(playheadX, H - 4); ctx.stroke();

      // Ponto do pitch detetado (interpolado, some sem voz / stale).
      const fresh = detMidi != null && (performance.now() - g.updatedAt) < 400 && isPlayingRef.current !== false;
      const targetAlpha = fresh ? 1 : 0;
      const alphaEase = reduce ? 1 : 0.2;
      dotAlphaRef.current += alphaEase * (targetAlpha - dotAlphaRef.current);
      if (detMidi != null) {
        const targetY = midiToY(clamp(detMidi, minMidi, maxMidi));
        if (dotYRef.current == null || reduce) dotYRef.current = targetY;
        else dotYRef.current += 0.3 * (targetY - dotYRef.current);
      }
      if (dotAlphaRef.current > 0.02 && dotYRef.current != null) {
        const dx = playheadX;
        const dy = dotYRef.current;
        const good = g.status === 'inTune';
        ctx.globalAlpha = dotAlphaRef.current;
        // Halo.
        const grad = ctx.createRadialGradient(dx, dy, 0, dx, dy, 22);
        grad.addColorStop(0, good ? 'rgba(253,224,71,0.55)' : 'rgba(253,224,71,0.32)');
        grad.addColorStop(1, 'rgba(253,224,71,0)');
        ctx.fillStyle = grad;
        ctx.beginPath(); ctx.arc(dx, dy, 22, 0, Math.PI * 2); ctx.fill();
        // Núcleo.
        ctx.fillStyle = YELLOW;
        ctx.beginPath(); ctx.arc(dx, dy, good ? 7 : 5.5, 0, Math.PI * 2); ctx.fill();
        ctx.globalAlpha = 1;
      }

      raf = requestAnimationFrame(draw);
    };
    raf = requestAnimationFrame(draw);

    return () => { cancelAnimationFrame(raf); ro?.disconnect(); };
    // notes/getMediaTimeMs/guideRef são estáveis por música; isPlaying lido via closure ref abaixo.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [notes]);

  const toneClass = meta.tone === 'good' ? 'is-good' : meta.tone === 'off' ? 'is-off' : 'is-neutral';
  const StatusIcon = meta.Icon;

  return (
    <div className={`km-pitch ${compact ? 'km-pitch--compact' : ''}`}>
      <div className="km-pitch-head">
        <span className="km-pitch-title">
          <Mic className="h-3.5 w-3.5" /> Guia de tom <span className="km-pitch-beta">Beta</span>
          {active && <span className="km-pitch-live" title="Microfone ativo" aria-label="Microfone ativo" />}
        </span>
        <span className={`km-pitch-state ${toneClass}`} aria-live="polite">
          <StatusIcon className={`h-3.5 w-3.5 ${meta.spin ? 'animate-spin' : ''}`} />
          {meta.label}
        </span>
      </div>
      <div ref={wrapRef} className="km-pitch-canvas-wrap">
        <canvas ref={canvasRef} aria-hidden="true" />
      </div>
    </div>
  );
}

function roundRect(ctx, x, y, w, h, r) {
  const rr = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + rr, y);
  ctx.arcTo(x + w, y, x + w, y + h, rr);
  ctx.arcTo(x + w, y + h, x, y + h, rr);
  ctx.arcTo(x, y + h, x, y, rr);
  ctx.arcTo(x, y, x + w, y, rr);
  ctx.closePath();
}
function clamp(v, lo, hi) { return Math.max(lo, Math.min(hi, v)); }
