import { Mic, Wand2 } from 'lucide-react';

/**
 * États vides du catalogue :
 * - `variant="no-results"` : filtres/recherche trop restrictifs (actions de reset) ;
 * - `variant="empty"` : aucune chanson karaokê disponible du tout.
 */
export default function KaraokeEmptyState({ variant, onClear, onSurprise, canSurprise }) {
  if (variant === 'empty') {
    return (
      <div className="karaoke-empty">
        <Mic className="karaoke-empty-icon" aria-hidden="true" />
        <p className="karaoke-empty-title">Nenhuma música disponível para karaokê</p>
        <p className="karaoke-empty-body">Novas músicas serão adicionadas em breve.</p>
      </div>
    );
  }

  return (
    <div className="karaoke-empty">
      <Mic className="karaoke-empty-icon" aria-hidden="true" />
      <p className="karaoke-empty-title">Nenhuma música encontrada</p>
      <p className="karaoke-empty-body">Tente outro termo ou limpe os filtros.</p>
      <div className="karaoke-empty-actions">
        <button type="button" className="karaoke-btn-ghost" onClick={onClear}>
          Limpar filtros
        </button>
        {canSurprise && (
          <button type="button" className="karaoke-btn-primary" onClick={onSurprise}>
            <Wand2 className="h-4 w-4" aria-hidden="true" /> Me surpreenda
          </button>
        )}
      </div>
    </div>
  );
}
