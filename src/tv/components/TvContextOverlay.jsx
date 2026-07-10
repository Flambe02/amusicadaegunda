import { useEffect, useRef } from 'react';
import { SpatialNavigation } from '@noriginmedia/norigin-spatial-navigation';
import { X } from 'lucide-react';

const SCROLL_STEP = 160;

/**
 * Overlay plein écran « Ver explicação completa » — affiche le paragraphe long
 * (`description`) jamais tronqué. Un seul élément interactif (Fechar), donc la nav
 * spatiale est mise en PAUSE tant que l'overlay est monté (même pattern que la
 * lecture vidéo/karaoké TV ailleurs dans l'app) : Haut/Bas font défiler le texte,
 * OK/Espace ferme. Le Retour est géré par le backInterceptor du parent (TvSongDetail),
 * qui appelle `onClose` et restitue le focus — cet overlay ne gère pas le Retour lui-même.
 */
export default function TvContextOverlay({ title, text, onClose }) {
  const bodyRef = useRef(null);

  useEffect(() => {
    SpatialNavigation.pause();
    const onKey = (e) => {
      if (e.key === 'ArrowUp') {
        e.preventDefault();
        bodyRef.current?.scrollBy({ top: -SCROLL_STEP, behavior: 'smooth' });
      } else if (e.key === 'ArrowDown') {
        e.preventDefault();
        bodyRef.current?.scrollBy({ top: SCROLL_STEP, behavior: 'smooth' });
      } else if (e.key === 'Enter' || e.key === ' ' || e.key === 'k') {
        e.preventDefault();
        onClose();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => { window.removeEventListener('keydown', onKey); SpatialNavigation.resume(); };
  }, [onClose]);

  return (
    <div className="tv-context-overlay">
      <div className="tv-context-panel">
        <h2 className="tv-context-title">{title}</h2>
        <div ref={bodyRef} className="tv-context-body">
          <p>{text}</p>
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="Fechar explicação"
          className="tv-context-close is-focused"
        >
          <X size={18} /> Fechar
        </button>
      </div>
    </div>
  );
}
