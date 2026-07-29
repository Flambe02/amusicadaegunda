import { Mic, Wand2, WifiOff } from 'lucide-react';

/**
 * États vides du catalogue :
 * - `variant="no-results"` : filtres/recherche trop restrictifs (actions de reset) ;
 * - `variant="empty"` : aucune chanson karaokê disponible du tout ;
 * - `variant="error"` : le catalogue n'a PAS pu être chargé (Supabase injoignable
 *   ou requête avortée) — ne jamais faire passer ce cas pour « aucune música »,
 *   les chansons existent, c'est le chargement qui a échoué.
 */
export default function KaraokeEmptyState({ variant, onClear, onSurprise, canSurprise, onRetry }) {
  if (variant === 'error') {
    return (
      <div className="karaoke-empty">
        <WifiOff className="karaoke-empty-icon" aria-hidden="true" />
        <p className="karaoke-empty-title">Não foi possível carregar o karaokê</p>
        <p className="karaoke-empty-body">Verifique a sua ligação e tente de novo.</p>
        {onRetry && (
          <div className="karaoke-empty-actions">
            <button type="button" className="karaoke-btn-primary" onClick={onRetry}>
              Tentar de novo
            </button>
          </div>
        )}
      </div>
    );
  }

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
