import { useRef } from 'react';
import { Search as SearchIcon, X } from 'lucide-react';

/**
 * Champ de recherche du catalogue Karaokê — élément fonctionnel principal.
 * Filtrage local (pas de debounce), accent-insensible côté hook.
 */
export default function KaraokeSearch({ value, onChange, resultCount }) {
  const inputRef = useRef(null);

  const handleKeyDown = (e) => {
    if (e.key === 'Escape' && value) {
      e.preventDefault();
      e.stopPropagation();
      onChange('');
    }
  };

  return (
    <div className="karaoke-search">
      <SearchIcon className="karaoke-search-icon" aria-hidden="true" />
      <input
        ref={inputRef}
        type="search"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder="Buscar música, tema ou mês..."
        aria-label="Buscar música, tema ou mês"
        aria-describedby="karaoke-search-count"
        className="karaoke-search-input"
        autoComplete="off"
        enterKeyHint="search"
      />
      <span id="karaoke-search-count" className="sr-only" aria-live="polite">
        {resultCount} resultado{resultCount === 1 ? '' : 's'}
      </span>
      {value && (
        <button
          type="button"
          className="karaoke-search-clear"
          onClick={() => { onChange(''); inputRef.current?.focus(); }}
          aria-label="Limpar busca"
        >
          <X className="h-4 w-4" aria-hidden="true" />
        </button>
      )}
    </div>
  );
}
