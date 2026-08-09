import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Sparkles, X } from 'lucide-react';
import '@/styles/karaoke.css';

const MOMENT_LABEL = {
  base: { emoji: '🟢', title: 'BASE' },
  vivo: { emoji: '🇧🇷', title: 'PORTUGUÊS AO VIVO' },
  culture: { emoji: '💛', title: 'CULTURA BRASILEIRA' },
};

/**
 * Micro-carte d'une découverte — Modo Aprender simplifié (« chanson + karaokê + 3
 * découvertes »). S'ouvre au tap sur la pastille du karaokê en `learningMode`,
 * jamais comme une page séparée : quelques secondes de lecture/jeu, puis retour
 * immédiat à la chanson.
 *
 * Réutilise le squelette déjà éprouvé de `VocabNotebookSheet` (overlay, poignée,
 * Escape, bouton « retour » Android, piège de focus) plutôt que d'inventer un
 * nouveau système de bottom-sheet.
 *
 * Aucun score, aucune mauvaise réponse : la mini-interaction (type `base`
 * uniquement) n'a pas de « bonne » option — n'importe quel choix complète la
 * phrase et affiche un encouragement.
 */
export default function LearningMomentSheet({ moment, onClose, onInteractionComplete }) {
  const panelRef = useRef(null);
  const [picked, setPicked] = useState(null);

  useEffect(() => {
    const previousActive = document.activeElement;
    const raf = requestAnimationFrame(() => {
      const panel = panelRef.current;
      const focusable = panel?.querySelector('button, [tabindex]:not([tabindex="-1"])');
      (focusable || panel)?.focus?.();
    });

    const onKeyDown = (e) => {
      if (e.key === 'Escape') { e.stopPropagation(); e.preventDefault(); onClose(); return; }
      if (e.key === 'Tab') {
        const panel = panelRef.current;
        if (!panel) return;
        const nodes = panel.querySelectorAll('button:not([disabled]), [tabindex]:not([tabindex="-1"])');
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

  if (!moment) return null;
  const label = MOMENT_LABEL[moment.momentType] || MOMENT_LABEL.vivo;

  const pickOption = (option) => {
    setPicked(option);
    onInteractionComplete?.();
  };

  return createPortal(
    <div
      className="km-sheet-overlay"
      style={{ zIndex: 10060 }}
      role="presentation"
      onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div ref={panelRef} role="dialog" aria-modal="true" aria-label="Descoberta" tabIndex={-1} className="km-sheet">
        <div className="km-sheet-handle-zone"><span className="km-sheet-handle" aria-hidden="true" /></div>

        <div className="km-sheet-head">
          <h2 className="km-sheet-title">{label.emoji} {label.title}</h2>
          <button type="button" className="km-icon-btn" onClick={onClose} aria-label="Fechar">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="km-sheet-body vocab-review" style={{ paddingBottom: '1.5rem' }}>
          <p style={{ fontSize: '1.25rem', fontWeight: 900, color: '#FDE047' }}>
            {moment.term.toUpperCase()}
            {moment.momentType === 'base' && ` = ${moment.meaningFr.toUpperCase()}`}
          </p>
          {moment.momentType !== 'base' && (
            <p style={{ marginTop: '0.5rem', fontSize: '0.9rem', lineHeight: 1.5, color: 'rgba(255,255,255,0.75)' }}>
              {moment.meaningFr}
            </p>
          )}

          {moment.examples.length > 0 && (
            <ul style={{ marginTop: '1rem', display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
              {moment.examples.map((ex) => (
                <li key={ex} style={{ fontSize: '0.9rem', color: 'rgba(255,255,255,0.7)' }}>{ex}</li>
              ))}
            </ul>
          )}

          {moment.note && (
            <p style={{ marginTop: '0.9rem', fontSize: '0.8rem', fontStyle: 'italic', color: 'rgba(255,255,255,0.5)' }}>
              {moment.note}
            </p>
          )}

          {moment.miniInteraction && (
            <div style={{ marginTop: '1.25rem' }}>
              <p className="km-help" style={{ marginBottom: '0.5rem' }}>À toi :</p>
              <p style={{ fontSize: '1rem', fontWeight: 700, color: 'white' }}>
                {moment.miniInteraction.prompt}
                {picked ? ` ${picked}` : ''}
              </p>
              {!picked ? (
                <div style={{ marginTop: '0.75rem', display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                  {moment.miniInteraction.options.map((option) => (
                    <button
                      key={option}
                      type="button"
                      onClick={() => pickOption(option)}
                      className="vocab-action"
                    >
                      {option}
                    </button>
                  ))}
                </div>
              ) : (
                <p style={{ marginTop: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.4rem', color: '#34d399', fontWeight: 700 }}>
                  <Sparkles className="h-4 w-4" aria-hidden="true" /> Muito bem!
                </p>
              )}
            </div>
          )}
        </div>
      </div>
    </div>,
    document.body,
  );
}
