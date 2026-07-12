import { FocusContext, useFocusable } from '@noriginmedia/norigin-spatial-navigation';
import { Search, SlidersHorizontal } from 'lucide-react';
import { QUICK_FILTERS } from '../lib/tvCatalogFilters';

function FilterChip({ id, label, active, focusKey, onPress, variant = 'quick' }) {
  const { ref, focused } = useFocusable({
    focusKey,
    onEnterPress: onPress,
    onFocus: () => ref.current?.scrollIntoView({ behavior: 'smooth', inline: 'nearest', block: 'nearest' }),
  });
  return (
    <button
      ref={ref}
      type="button"
      onClick={onPress}
      aria-pressed={variant === 'quick' ? active : undefined}
      aria-label={label}
      className={`tvc-chip tvc-chip-${variant} ${active ? 'is-active' : ''} ${focused ? 'is-focused' : ''}`}
    >
      {id === '__search' && <Search size={17} />}
      {id === '__more' && <SlidersHorizontal size={17} />}
      <span>{label}</span>
      {variant === 'more' && active && <span className="tvc-chip-badge" aria-hidden="true" />}
    </button>
  );
}

/**
 * Barre de filtres TV : Buscar + TODAS + jusqu'à 6 filtres à haute valeur + Mais
 * filtros. Un seul filtre rapide actif à la fois (radio) ; « Mais filtros » ouvre
 * l'overlay avancé. La recherche N'EST PAS dans la nav globale — elle vit ici.
 *
 * `advancedActive` = un filtre avancé est appliqué → « Mais filtros » se marque
 * actif (pastille) pour signaler qu'un filtrage supplémentaire est en cours.
 */
export default function TvCatalogFilters({
  activeQuickId, advancedActive, onSelectQuick, onOpenSearch, onOpenAdvanced,
}) {
  const { ref, focusKey } = useFocusable({
    focusKey: 'CAT_FILTERS', trackChildren: true, saveLastFocusedChild: true,
  });

  return (
    <FocusContext.Provider value={focusKey}>
      <div ref={ref} className="tvc-filters" role="toolbar" aria-label="Filtros do catálogo">
        <FilterChip
          id="__search"
          label="Buscar música"
          focusKey="CAT_FILTER_SEARCH"
          variant="search"
          onPress={onOpenSearch}
        />
        {QUICK_FILTERS.map((f) => (
          <FilterChip
            key={f.id}
            id={f.id}
            label={f.label}
            active={activeQuickId === f.id}
            focusKey={`CAT_FILTER_${f.id.toUpperCase()}`}
            onPress={() => onSelectQuick(f.id)}
          />
        ))}
        <FilterChip
          id="__more"
          label="Mais filtros"
          active={advancedActive}
          focusKey="CAT_FILTER_MORE"
          variant="more"
          onPress={onOpenAdvanced}
        />
      </div>
    </FocusContext.Provider>
  );
}
