import { useEffect, useRef } from 'react';
import { SpatialNavigation } from '@noriginmedia/norigin-spatial-navigation';
import { X } from 'lucide-react';

const SCROLL_STEP = 200;

/**
 * Overlay « Ver letra completa » — paroles complètes, défilables. Un seul élément
 * interactif (Fechar) → nav spatiale en PAUSE tant que l'overlay est monté
 * (même pattern que TvContextOverlay) : Haut/Bas défilent, OK/Espace ferme. Le
 * Retour est géré par le backInterceptor du parent (fiche).
 */
export default function TvFullLyricsOverlay({ title, lyrics, onClose }) {
  const bodyRef = useRef(null);

  useEffect(() => {
    SpatialNavigation.pause();
    const onKey = (e) => {
      if (e.key === 'ArrowUp') { e.preventDefault(); bodyRef.current?.scrollBy({ top: -SCROLL_STEP, behavior: 'smooth' }); }
      else if (e.key === 'ArrowDown') { e.preventDefault(); bodyRef.current?.scrollBy({ top: SCROLL_STEP, behavior: 'smooth' }); }
      else if (e.key === 'Enter' || e.key === ' ' || e.key === 'k') { e.preventDefault(); onClose(); }
    };
    window.addEventListener('keydown', onKey);
    return () => { window.removeEventListener('keydown', onKey); SpatialNavigation.resume(); };
  }, [onClose]);

  const lines = (lyrics || '').replace(/\r/g, '').split('\n');

  return (
    <div className="tvd-overlay tvd-lyrics-overlay">
      <div className="tvd-lyrics-panel">
        <h2 className="tvd-lyrics-title">{title}</h2>
        <div ref={bodyRef} className="tvd-lyrics-body">
          {lines.map((line, i) => (
            line.trim()
              ? <p key={i} className="tvd-lyrics-line">{line}</p>
              : <p key={i} className="tvd-lyrics-line tvd-lyrics-gap">&nbsp;</p>
          ))}
        </div>
        <button type="button" onClick={onClose} aria-label="Fechar letra" className="tvd-lyrics-close is-focused">
          <X size={18} /> Fechar
        </button>
      </div>
    </div>
  );
}
