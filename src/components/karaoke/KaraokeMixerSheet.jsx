import { useCallback, useEffect, useRef, useState } from 'react';
import {
  X, Volume2, Gauge, Timer, Type, Circle, Users, Flame, Globe, RotateCcw, Minus, Plus,
} from 'lucide-react';
import {
  FONT_SCALES, PLAYBACK_RATES, TRANSLATION_LANGS,
  LYRICS_OFFSET_MIN_MS, LYRICS_OFFSET_MAX_MS, LYRICS_OFFSET_STEP_MS,
} from '@/lib/karaokeOptions';

/**
 * Mixer do karaokê — bottom-sheet mobile (web / PWA / Capacitor Android+iOS).
 *
 * Abre POR CIMA do leitor sem mudar de rota; a música continua a tocar (só altera
 * `opts`, nunca toca no player). Fecha por: toque fora, gesto para baixo, botão de
 * fechar, tecla Escape e botão « voltar » físico do Android (Capacitor).
 *
 * SÓ mostra controlos realmente suportados pelo motor de áudio (YouTube IFrame) :
 *  - « Música » (volume) : suportado (`setVolume`).
 *  - « Velocidade » : suportado (`setPlaybackRate`).
 *  - « Ajuste das letras » : offset de render (não altera a sincronização guardada).
 *  - NÃO há « Guia » (não existem stems separados), nem « Tom » (o YouTube não
 *    expõe pitch shifting fiável) — omitidos de propósito.
 *
 * NÃO usado pela TV (o shell TV tem o seu próprio painel D-pad).
 */
export default function KaraokeMixerSheet({ opts, setOpts, onClose }) {
  const panelRef = useRef(null);
  const [dragY, setDragY] = useState(0);
  const dragRef = useRef({ active: false, startY: 0 });

  // Escape + botão « voltar » Android + foco inicial + trap de foco.
  useEffect(() => {
    const previousActive = document.activeElement;
    const raf = requestAnimationFrame(() => {
      const panel = panelRef.current;
      const focusable = panel?.querySelector('button, input, [tabindex]:not([tabindex="-1"])');
      (focusable || panel)?.focus?.();
    });

    const onKeyDown = (e) => {
      if (e.key === 'Escape') { e.stopPropagation(); e.preventDefault(); onClose(); return; }
      if (e.key === 'Tab') {
        const panel = panelRef.current;
        if (!panel) return;
        const nodes = panel.querySelectorAll('button:not([disabled]), input:not([disabled]), [tabindex]:not([tabindex="-1"])');
        if (nodes.length === 0) return;
        const first = nodes[0];
        const last = nodes[nodes.length - 1];
        if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
        else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
      }
    };
    document.addEventListener('keydown', onKeyDown, true);

    let removeBackListener = null;
    import('@capacitor/app')
      .then(({ App }) => App.addListener('backButton', () => onClose()))
      .then((handle) => { removeBackListener = () => handle.remove(); })
      .catch(() => { /* web/PWA puro : Escape + toque bastam */ });

    return () => {
      cancelAnimationFrame(raf);
      document.removeEventListener('keydown', onKeyDown, true);
      if (removeBackListener) removeBackListener();
      if (previousActive && typeof previousActive.focus === 'function') previousActive.focus();
    };
  }, [onClose]);

  // Gesto « puxar para baixo » (handle) para fechar.
  const onHandleDown = useCallback((e) => {
    dragRef.current = { active: true, startY: e.clientY };
    e.currentTarget.setPointerCapture?.(e.pointerId);
  }, []);
  const onHandleMove = useCallback((e) => {
    if (!dragRef.current.active) return;
    setDragY(Math.max(0, e.clientY - dragRef.current.startY));
  }, []);
  const onHandleUp = useCallback(() => {
    if (!dragRef.current.active) return;
    dragRef.current.active = false;
    setDragY((y) => { if (y > 110) onClose(); return 0; });
  }, [onClose]);

  const setOffset = (deltaMs) => setOpts((o) => ({
    ...o,
    lyricsOffsetMs: Math.max(LYRICS_OFFSET_MIN_MS, Math.min(LYRICS_OFFSET_MAX_MS, (o.lyricsOffsetMs || 0) + deltaMs)),
  }));
  const offsetMs = opts.lyricsOffsetMs || 0;
  const offsetLabel = `${offsetMs > 0 ? '+' : ''}${offsetMs} ms`;

  return (
    <div className="km-sheet-overlay" role="presentation" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label="Mixer do karaokê"
        tabIndex={-1}
        className="km-sheet"
        style={dragY ? { transform: `translateY(${dragY}px)`, transition: 'none' } : undefined}
      >
        <div
          className="km-sheet-handle-zone"
          onPointerDown={onHandleDown}
          onPointerMove={onHandleMove}
          onPointerUp={onHandleUp}
          onPointerCancel={onHandleUp}
        >
          <span className="km-sheet-handle" aria-hidden="true" />
        </div>

        <div className="km-sheet-head">
          <h2 className="km-sheet-title">Mixer</h2>
          <button type="button" className="km-icon-btn" onClick={onClose} aria-label="Fechar mixer">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="km-sheet-body">
          {/* ── Áudio ── */}
          <section className="km-section">
            <p className="km-section-title"><Volume2 className="h-3.5 w-3.5" /> Áudio</p>
            <label className="km-row" htmlFor="km-music-vol">
              <span className="km-row-label">Música</span>
              <span className="km-row-value">{opts.musicVolume}%</span>
            </label>
            <input
              id="km-music-vol"
              type="range" min="0" max="100" step="1"
              value={opts.musicVolume}
              onChange={(e) => setOpts((o) => ({ ...o, musicVolume: Number(e.target.value) }))}
              className="km-range"
              aria-label="Volume da música"
            />
          </section>

          {/* ── Reprodução ── */}
          <section className="km-section">
            <p className="km-section-title"><Gauge className="h-3.5 w-3.5" /> Velocidade <span className="km-section-note">(treino)</span></p>
            <div className="km-segmented">
              {PLAYBACK_RATES.map((r) => (
                <button key={r.value} type="button"
                  className={`km-seg ${opts.rate === r.value ? 'is-on' : ''}`}
                  aria-pressed={opts.rate === r.value}
                  onClick={() => setOpts((o) => ({ ...o, rate: r.value }))}>
                  {r.label}
                </button>
              ))}
            </div>
          </section>

          {/* ── Sincronização ── */}
          <section className="km-section">
            <p className="km-section-title"><Timer className="h-3.5 w-3.5" /> Ajuste das letras</p>
            <p className="km-help">Adianta (+) ou atrasa (−) a exibição das letras. Não altera a sincronização oficial.</p>
            <div className="km-stepper">
              <button type="button" className="km-step-btn" aria-label="Atrasar letras 50 ms"
                onClick={() => setOffset(-LYRICS_OFFSET_STEP_MS)} disabled={offsetMs <= LYRICS_OFFSET_MIN_MS}>
                <Minus className="h-5 w-5" />
              </button>
              <span className="km-step-value" aria-live="polite">{offsetLabel}</span>
              <button type="button" className="km-step-btn" aria-label="Adiantar letras 50 ms"
                onClick={() => setOffset(LYRICS_OFFSET_STEP_MS)} disabled={offsetMs >= LYRICS_OFFSET_MAX_MS}>
                <Plus className="h-5 w-5" />
              </button>
              <button type="button" className="km-reset" onClick={() => setOpts((o) => ({ ...o, lyricsOffsetMs: 0 }))}
                disabled={offsetMs === 0} aria-label="Reiniciar ajuste">
                <RotateCcw className="h-4 w-4" /> Reiniciar
              </button>
            </div>
          </section>

          {/* ── Exibição ── */}
          <section className="km-section">
            <p className="km-section-title"><Type className="h-3.5 w-3.5" /> Tamanho da letra</p>
            <div className="km-segmented">
              {FONT_SCALES.map((f) => (
                <button key={f.label} type="button"
                  className={`km-seg ${opts.fontScale === f.value ? 'is-on' : ''}`}
                  aria-pressed={opts.fontScale === f.value}
                  onClick={() => setOpts((o) => ({ ...o, fontScale: f.value }))}>
                  {f.label}
                </button>
              ))}
            </div>
          </section>

          <section className="km-section km-section--toggles">
            <MixerToggle label="Bolinha" icon={Circle} on={opts.showBall}
              onClick={() => setOpts((o) => ({ ...o, showBall: !o.showBall }))} />
            <MixerToggle label="Modo dueto (P1 / P2)" icon={Users} on={opts.dueto}
              onClick={() => setOpts((o) => ({ ...o, dueto: !o.dueto }))} />
            <MixerToggle label="Medidor de energia (micro)" icon={Flame} on={opts.energy}
              onClick={() => setOpts((o) => ({ ...o, energy: !o.energy }))} />
          </section>

          <section className="km-section">
            <p className="km-section-title"><Globe className="h-3.5 w-3.5" /> Tradução <span className="km-section-note">(rodapé)</span></p>
            <div className="km-segmented">
              {TRANSLATION_LANGS.map((l) => (
                <button key={l.value} type="button"
                  className={`km-seg ${opts.translate === l.value ? 'is-on' : ''}`}
                  aria-pressed={opts.translate === l.value}
                  onClick={() => setOpts((o) => ({ ...o, translate: l.value }))}>
                  {l.label}
                </button>
              ))}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}

function MixerToggle({ label, icon: Icon, on, onClick }) {
  return (
    <div className="km-toggle-row">
      <span className="km-toggle-label">{Icon && <Icon className="h-4 w-4" />} {label}</span>
      <button type="button" onClick={onClick} aria-pressed={on} aria-label={label}
        className={`km-switch ${on ? 'is-on' : ''}`}>
        <span className="km-switch-knob" />
      </button>
    </div>
  );
}
