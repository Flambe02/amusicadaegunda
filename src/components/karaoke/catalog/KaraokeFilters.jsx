import { CalendarDays, Clock, Music } from 'lucide-react';
import KaraokeSelect from './KaraokeSelect';
import { SORT_OPTIONS } from '@/lib/karaokeCatalog';

/**
 * Barre de filtres : chips de thème (sélection unique) + Mês + Ordenar +
 * compteur de résultats + « Limpar filtros » quand un filtre est actif.
 */
export default function KaraokeFilters({
  themes,
  months,
  filters,
  resultCount,
  hasActiveFilters,
  onThemeChange,
  onMonthChange,
  onSortChange,
  onClear,
}) {
  const activeThemeLabel = filters.theme
    ? themes.find((t) => t.value === filters.theme)?.label
    : null;

  return (
    <section className="karaoke-filters" aria-label="Filtros do catálogo">
      <div className="karaoke-chips" role="group" aria-label="Filtrar por tema">
        {themes.map((theme) => {
          const active = filters.theme === theme.value;
          return (
            <button
              key={String(theme.value)}
              type="button"
              className={`karaoke-chip${active ? ' is-active' : ''}`}
              aria-pressed={active}
              onClick={() => onThemeChange(theme.value)}
            >
              {theme.label}
            </button>
          );
        })}
      </div>

      <div className="karaoke-filters-row">
        <div className="karaoke-filters-controls">
          <KaraokeSelect
            icon={CalendarDays}
            label="Mês"
            ariaLabel="Filtrar por mês"
            value={filters.month}
            options={months}
            onChange={onMonthChange}
          />
          <KaraokeSelect
            icon={Clock}
            label="Ordenar"
            ariaLabel="Ordenar"
            value={filters.sort}
            options={SORT_OPTIONS}
            onChange={onSortChange}
          />
        </div>

        <div className="karaoke-filters-meta">
          <span className="karaoke-result-count">
            <Music className="h-4 w-4" aria-hidden="true" />
            {activeThemeLabel ? `${activeThemeLabel} · ` : ''}
            {resultCount} música{resultCount === 1 ? '' : 's'}
          </span>
          {hasActiveFilters && (
            <button type="button" className="karaoke-clear" onClick={onClear}>
              Limpar filtros
            </button>
          )}
        </div>
      </div>
    </section>
  );
}
