import { useEffect, useMemo, useState } from 'react';
import { FocusContext, useFocusable, SpatialNavigation } from '@noriginmedia/norigin-spatial-navigation';
import { Check } from 'lucide-react';
import FocusableButton from './FocusableButton';
import { countAdvancedSelections } from '../lib/tvCatalogFilters';

function OptionChip({ dimId, option, active, onToggle }) {
  const { ref, focused } = useFocusable({
    focusKey: `CAT_ADV_${dimId}_${option.id}`,
    onEnterPress: onToggle,
    onFocus: () => ref.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' }),
  });
  return (
    <button
      ref={ref}
      type="button"
      onClick={onToggle}
      aria-pressed={active}
      className={`tvc-adv-chip ${active ? 'is-active' : ''} ${focused ? 'is-focused' : ''}`}
    >
      {active && <Check size={16} />} {option.label}
    </button>
  );
}

/**
 * Overlay de filtres avancés — grandes sections TV (Dificuldade / Modo / Energia /
 * Tema / Descoberta / Aprendizado). Travaille sur un BROUILLON local : rien n'est
 * appliqué au catálogo tant que « Aplicar filtros » n'est pas pressé, et « Voltar »
 * ferme sans rien changer (ni la position ni les filtres précédents du catálogo).
 * Le nombre de résultats du brouillon est affiché en direct (« Ver N músicas »).
 */
export default function TvAdvancedFiltersOverlay({
  dimensions, initial, countFor, onApply, onClose, backInterceptorRef,
}) {
  const [draft, setDraft] = useState(initial);

  const { ref, focusKey } = useFocusable({
    focusKey: 'CAT_ADV', trackChildren: true, saveLastFocusedChild: true,
  });

  useEffect(() => {
    const t = setTimeout(() => { try { SpatialNavigation.setFocus('CAT_ADV'); } catch { /* ignore */ } }, 0);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    if (!backInterceptorRef) return undefined;
    backInterceptorRef.current = () => { onClose(); return true; };
    return () => { if (backInterceptorRef) backInterceptorRef.current = null; };
  }, [backInterceptorRef, onClose]);

  const toggle = (dimId, optId) => {
    setDraft((prev) => {
      const cur = prev[dimId] || [];
      const next = cur.includes(optId) ? cur.filter((x) => x !== optId) : [...cur, optId];
      return { ...prev, [dimId]: next };
    });
  };

  const clearAll = () => setDraft((prev) => {
    const cleared = {};
    Object.keys(prev).forEach((k) => { cleared[k] = []; });
    return cleared;
  });

  const count = useMemo(() => countFor(draft), [countFor, draft]);
  const selectionCount = countAdvancedSelections(draft);

  return (
    <div className="tvc-overlay tvc-adv-overlay">
      <FocusContext.Provider value={focusKey}>
        <div ref={ref} className="tvc-adv-box">
          <div className="tvc-adv-head">
            <h2 className="tvc-adv-title">Mais filtros</h2>
            <span className="tvc-adv-count">{count} {count === 1 ? 'música' : 'músicas'}</span>
          </div>

          <div className="tvc-adv-sections">
            {dimensions.filter((d) => d.options.length).map((dim) => (
              <section key={dim.id} className="tvc-adv-section">
                <h3 className="tvc-adv-section-h">{dim.label}</h3>
                <div className="tvc-adv-options">
                  {dim.options.map((opt) => (
                    <OptionChip
                      key={opt.id}
                      dimId={dim.id}
                      option={opt}
                      active={(draft[dim.id] || []).includes(opt.id)}
                      onToggle={() => toggle(dim.id, opt.id)}
                    />
                  ))}
                </div>
              </section>
            ))}
          </div>

          <div className="tvc-adv-actions">
            <FocusableButton
              focusKey="CAT_ADV_APPLY"
              className="tvc-adv-btn is-primary"
              ariaLabel={`Aplicar filtros e ver ${count} músicas`}
              onPress={() => onApply(draft)}
            >
              Ver {count} {count === 1 ? 'música' : 'músicas'}
            </FocusableButton>
            <FocusableButton
              focusKey="CAT_ADV_CLEAR"
              className="tvc-adv-btn"
              ariaLabel="Limpar todos os filtros"
              onPress={clearAll}
            >
              Limpar tudo{selectionCount ? ` (${selectionCount})` : ''}
            </FocusableButton>
          </div>
        </div>
      </FocusContext.Provider>
    </div>
  );
}
