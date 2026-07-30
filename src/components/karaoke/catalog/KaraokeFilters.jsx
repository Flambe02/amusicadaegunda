import { Tag, Clock } from 'lucide-react';
import KaraokeSelect from './KaraokeSelect';
import { SORT_OPTIONS } from '@/lib/karaokeCatalog';
import { DIFFICULTY_FILTER_OPTIONS } from '@/lib/karaokeDifficulty';

/**
 * Barra de filtros do redesign 2026-07-30 :
 *   - DIFICULDADE em destaque (chips « Todas / Fácil / Média / Difícil ») — filtro
 *     primário, jamais escondido num menu ;
 *   - Tema e Ordenar em dropdowns secundários (mesmo componente `KaraokeSelect` de
 *     antes) ;
 *   - o filtro por MÊS e o agrupamento mensal foram removidos com o redesign (grade
 *     plana) — ver `karaokeCatalog.js`.
 *   - o contador de resultados vive agora numa única linha acima da grade
 *     (`Karaoke.jsx`), não aqui, para não duplicar a contagem.
 */
export default function KaraokeFilters({
  themes,
  filters,
  hasActiveFilters,
  onDifficultyChange,
  onThemeChange,
  onSortChange,
  onClear,
}) {
  return (
    <section className="karaoke-filters" aria-label="Filtros do catálogo">
      <div className="karaoke-chips" role="group" aria-label="Filtrar por dificuldade">
        {DIFFICULTY_FILTER_OPTIONS.map((opt) => {
          const active = filters.difficulty === opt.value;
          return (
            <button
              key={String(opt.value)}
              type="button"
              className={`karaoke-chip${active ? ' is-active' : ''}`}
              aria-pressed={active}
              onClick={() => onDifficultyChange(opt.value)}
            >
              {opt.label}
            </button>
          );
        })}
      </div>

      <div className="karaoke-filters-row">
        <div className="karaoke-filters-controls">
          <KaraokeSelect
            icon={Tag}
            label="Tema"
            ariaLabel="Filtrar por tema"
            value={filters.theme}
            options={themes}
            onChange={onThemeChange}
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

        {hasActiveFilters && (
          <button type="button" className="karaoke-clear" onClick={onClear}>
            Limpar filtros
          </button>
        )}
      </div>
    </section>
  );
}
