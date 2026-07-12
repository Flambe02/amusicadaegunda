import { useEffect, useRef } from 'react';

/**
 * Coquille de dialogue accessible pour le catalogue Karaokê (mobile + desktop).
 *
 * - bottom-sheet plein largeur sur mobile, carte centrée sur desktop (CSS) ;
 * - piège le focus, ferme sur Escape, verrouille le scroll de fond ;
 * - rend le focus à l'élément déclencheur à la fermeture ;
 * - gère le bouton retour matériel Android (Capacitor) → ferme au lieu de quitter.
 *
 * N'a AUCUN lien avec le shell TV : composant purement web/PWA/Android mobile.
 */
export default function KaraokeModal({ open, onClose, labelledBy, children, className = '' }) {
  const panelRef = useRef(null);
  const triggerRef = useRef(null);

  useEffect(() => {
    if (!open) return undefined;

    triggerRef.current = document.activeElement;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    // Focus initial dans le panneau (premier élément focusable, sinon le panneau).
    const focusFirst = () => {
      const panel = panelRef.current;
      if (!panel) return;
      const focusable = panel.querySelector(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
      );
      (focusable || panel).focus();
    };
    const raf = requestAnimationFrame(focusFirst);

    const onKeyDown = (e) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        onClose();
        return;
      }
      if (e.key === 'Tab') {
        const panel = panelRef.current;
        if (!panel) return;
        const nodes = panel.querySelectorAll(
          'button:not([disabled]), [href], input:not([disabled]), select, textarea, [tabindex]:not([tabindex="-1"])',
        );
        if (nodes.length === 0) return;
        const first = nodes[0];
        const last = nodes[nodes.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };
    document.addEventListener('keydown', onKeyDown, true);

    // Bouton retour matériel Android (Capacitor) → ferme le dialogue.
    let removeBackListener = null;
    import('@capacitor/app')
      .then(({ App }) => App.addListener('backButton', () => onClose()))
      .then((handle) => { removeBackListener = () => handle.remove(); })
      .catch(() => { /* pas de Capacitor (web/PWA pur) : Escape + bouton suffisent */ });

    return () => {
      cancelAnimationFrame(raf);
      document.removeEventListener('keydown', onKeyDown, true);
      document.body.style.overflow = previousOverflow;
      if (removeBackListener) removeBackListener();
      const trigger = triggerRef.current;
      if (trigger && typeof trigger.focus === 'function') trigger.focus();
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="karaoke-modal-overlay"
      role="presentation"
      onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={labelledBy}
        tabIndex={-1}
        className={`karaoke-modal-panel ${className}`}
      >
        {children}
      </div>
    </div>
  );
}
