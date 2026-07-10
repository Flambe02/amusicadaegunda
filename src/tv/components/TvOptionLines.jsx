import { useFocusable } from '@noriginmedia/norigin-spatial-navigation';

/**
 * Lignes d'options réutilisables (D-pad) — partagées entre KaraokeTvOptions
 * (panneau pendant la lecture) et TvSettingsPanel (accueil). Une ligne à choix
 * multiple = UN focusable ; ←/→ cycle la valeur, Haut/Bas change de ligne.
 */
export function OptChoiceLine({ focusKey, label, icon: Icon, options, value, onChange, wrap }) {
  const idx = options.findIndex((o) => o.value === value);
  const { ref, focused } = useFocusable({
    focusKey,
    onArrowPress: (dir) => {
      if (dir === 'left' || dir === 'right') {
        const delta = dir === 'right' ? 1 : -1;
        let next = idx + delta;
        next = wrap
          ? (next + options.length) % options.length
          : Math.max(0, Math.min(options.length - 1, next));
        if (next !== idx && next >= 0) onChange(options[next].value);
        return false; // ne pas déplacer le focus
      }
      return true; // haut/bas → ligne suivante/précédente
    },
  });
  return (
    <div ref={ref} className={`tv-opt-line ${focused ? 'is-focused' : ''}`}>
      <span className="tv-opt-label">{Icon && <Icon size={17} />}{label}</span>
      <span className="tv-opt-choices">
        {options.map((o) => (
          // Tap direct sur une pastille (tablette/téléphone détecté comme TV, cf.
          // platform.js) — jusqu'ici SEUL le D-pad (←/→ via onArrowPress ci-dessus)
          // pouvait changer la valeur ; au toucher, rien ne se passait.
          <span
            key={o.label}
            role="button"
            tabIndex={-1}
            onClick={() => onChange(o.value)}
            className={`tv-opt-chip ${o.value === value ? 'is-sel' : ''}`}
          >
            {o.label}
          </span>
        ))}
      </span>
    </div>
  );
}

/** Toggle = UN focusable. OK bascule on/off. */
export function OptToggleLine({ focusKey, label, icon: Icon, on, onToggle }) {
  const { ref, focused } = useFocusable({ focusKey, onEnterPress: onToggle });
  return (
    <div ref={ref} onClick={onToggle} className={`tv-opt-line ${focused ? 'is-focused' : ''}`}>
      <span className="tv-opt-label">{Icon && <Icon size={17} />}{label}</span>
      <span className={`tv-opt-switch ${on ? 'is-on' : ''}`}><span /></span>
    </div>
  );
}

/** Ligne d'action (pas de valeur) — ex. « Recomeçar música », « Sair do karaokê ». */
export function OptActionLine({ focusKey, label, icon: Icon, onPress, danger }) {
  const { ref, focused } = useFocusable({ focusKey, onEnterPress: onPress });
  return (
    <div
      ref={ref}
      onClick={onPress}
      className={`tv-opt-line tv-opt-action ${danger ? 'is-danger' : ''} ${focused ? 'is-focused' : ''}`}
    >
      <span className="tv-opt-label">{Icon && <Icon size={17} />}{label}</span>
    </div>
  );
}
