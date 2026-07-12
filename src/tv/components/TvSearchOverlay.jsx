import { useEffect } from 'react';
import { FocusContext, useFocusable, SpatialNavigation } from '@noriginmedia/norigin-spatial-navigation';
import { Search, Delete } from 'lucide-react';

// Clavier alphabétique (plus simple à balayer au D-pad qu'un AZERTY/QWERTY sur TV).
const KEY_ROWS = [
  ['A', 'B', 'C', 'D', 'E', 'F', 'G'],
  ['H', 'I', 'J', 'K', 'L', 'M', 'N'],
  ['O', 'P', 'Q', 'R', 'S', 'T', 'U'],
  ['V', 'W', 'X', 'Y', 'Z', 'Ç', '-'],
  ['0', '1', '2', '3', '4', '5', '6'],
  ['7', '8', '9', "'", '.', '!', '?'],
];

function Key({ label, focusKey, className = '', onPress, children }) {
  const { ref, focused } = useFocusable({
    focusKey,
    onEnterPress: onPress,
    onFocus: () => ref.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' }),
  });
  return (
    <button
      ref={ref}
      type="button"
      onClick={onPress}
      aria-label={label}
      className={`tvc-key ${className} ${focused ? 'is-focused' : ''}`}
    >
      {children ?? label}
    </button>
  );
}

/**
 * Overlay de recherche — clavier à l'écran (D-pad) qui pilote en direct la requête
 * du catálogo (`onQueryChange`). Le nombre de résultats se met à jour à chaque
 * frappe (« Ver N músicas »). Fermer (OK sur « Ver N » ou Voltar) applique la
 * requête à la grille principale, qui garde EXACTEMENT la même mise en page
 * carte + panneau. Recherche par titre, thème, contexto, personnes, palavras da
 * letra, catégorie, mês/ano (cf. tvCatalogFilters.matchesSearch).
 */
export default function TvSearchOverlay({ query, resultCount, onQueryChange, onClose, backInterceptorRef }) {
  const { ref, focusKey } = useFocusable({
    focusKey: 'CAT_SEARCH', trackChildren: true, saveLastFocusedChild: true,
  });

  useEffect(() => {
    const t = setTimeout(() => { try { SpatialNavigation.setFocus('CAT_SEARCH_KEY_A'); } catch { /* ignore */ } }, 0);
    return () => clearTimeout(t);
  }, []);

  // Back ferme l'overlay (TvApp appelle cet intercepteur avant son pop/exit).
  useEffect(() => {
    if (!backInterceptorRef) return undefined;
    backInterceptorRef.current = () => { onClose(); return true; };
    return () => { if (backInterceptorRef) backInterceptorRef.current = null; };
  }, [backInterceptorRef, onClose]);

  const append = (ch) => onQueryChange(query + ch);
  const backspace = () => onQueryChange(query.slice(0, -1));
  const clear = () => onQueryChange('');

  return (
    <div className="tvc-overlay tvc-search-overlay">
      <FocusContext.Provider value={focusKey}>
        <div ref={ref} className="tvc-search-box">
          <div className="tvc-search-field">
            <Search size={22} />
            <span className="tvc-search-query">
              {query || <span className="tvc-search-ph">Buscar por música, tema, personagem, letra…</span>}
              <span className="tvc-search-caret" aria-hidden="true" />
            </span>
          </div>

          <div className="tvc-keyboard">
            {KEY_ROWS.map((row, r) => (
              <div key={r} className="tvc-key-row">
                {row.map((ch) => (
                  <Key key={ch} label={ch} focusKey={`CAT_SEARCH_KEY_${ch}`} onPress={() => append(ch)} />
                ))}
              </div>
            ))}
            <div className="tvc-key-row tvc-key-actions">
              <Key label="Espaço" focusKey="CAT_SEARCH_SPACE" className="tvc-key-wide" onPress={() => append(' ')}>
                Espaço
              </Key>
              <Key label="Apagar" focusKey="CAT_SEARCH_DEL" className="tvc-key-wide" onPress={backspace}>
                <Delete size={20} /> Apagar
              </Key>
              <Key label="Limpar" focusKey="CAT_SEARCH_CLEAR" className="tvc-key-wide" onPress={clear}>
                Limpar
              </Key>
              <Key
                label={`Ver ${resultCount} músicas`}
                focusKey="CAT_SEARCH_CONFIRM"
                className="tvc-key-confirm"
                onPress={onClose}
              >
                Ver {resultCount} {resultCount === 1 ? 'música' : 'músicas'}
              </Key>
            </div>
          </div>
        </div>
      </FocusContext.Provider>
    </div>
  );
}
