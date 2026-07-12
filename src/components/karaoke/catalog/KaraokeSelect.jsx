import { useEffect, useId, useRef, useState } from 'react';
import { ChevronDown, Check } from 'lucide-react';

/**
 * Petit menu déroulant accessible (bouton + liste d'options) pour Mês / Ordenar.
 * Sélection unique appliquée immédiatement. Ferme sur clic extérieur / Escape.
 * Panneau ancré sur desktop, pleine largeur sous le bouton sur mobile (CSS).
 */
export default function KaraokeSelect({ icon: Icon, label, value, options, onChange, ariaLabel }) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef(null);
  const listId = useId();

  const current = options.find((o) => o.value === value) || options[0];
  const displayLabel = value == null ? label : current?.label;

  useEffect(() => {
    if (!open) return undefined;
    const onDocClick = (e) => {
      if (rootRef.current && !rootRef.current.contains(e.target)) setOpen(false);
    };
    const onKey = (e) => { if (e.key === 'Escape') setOpen(false); };
    document.addEventListener('mousedown', onDocClick);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDocClick);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  return (
    <div className="karaoke-select" ref={rootRef}>
      <button
        type="button"
        className={`karaoke-select-trigger${value != null ? ' is-selected' : ''}`}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={ariaLabel || label}
        onClick={() => setOpen((v) => !v)}
      >
        {Icon && <Icon className="h-4 w-4" aria-hidden="true" />}
        <span className="karaoke-select-label">{displayLabel}</span>
        <ChevronDown className={`h-4 w-4 karaoke-select-caret${open ? ' is-open' : ''}`} aria-hidden="true" />
      </button>

      {open && (
        <ul className="karaoke-select-menu" role="listbox" id={listId} aria-label={ariaLabel || label}>
          {options.map((opt) => {
            const selected = opt.value === value;
            return (
              <li key={String(opt.value)} role="option" aria-selected={selected}>
                <button
                  type="button"
                  className={`karaoke-select-option${selected ? ' is-selected' : ''}`}
                  onClick={() => { onChange(opt.value); setOpen(false); }}
                >
                  <span>{opt.label}</span>
                  {selected && <Check className="h-4 w-4" aria-hidden="true" />}
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
