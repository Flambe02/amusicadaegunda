import { useEffect } from 'react';
import { useFocusable } from '@noriginmedia/norigin-spatial-navigation';

/**
 * Bouton navigable au D-pad. `onPress` est déclenché par OK (Enter) et par clic
 * (fallback tactile pour le cas « tablette détectée comme TV »).
 */
export default function FocusableButton({
  onPress, children, className = '', focusKey, autoFocus = false, ariaLabel, style,
}) {
  // Au focus, on ramène le bouton dans la zone visible du conteneur qui défile.
  // Sans ça, sur l'accueil/les landings (nav + hero + rangées plus hauts que
  // l'écran), descendre dans une rangée fait défiler la page vers le bas, mais
  // remonter sur le hero/la nav ne la faisait PAS remonter (ces boutons ne
  // scrollaient pas) → on restait bloqué en bas. Les cartes de rangée le font déjà
  // (RailCard/TvCard) ; on aligne le même comportement ici.
  const { ref, focused, focusSelf } = useFocusable({
    onEnterPress: onPress,
    focusKey,
    onFocus: () => {
      try {
        ref.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'nearest' });
      } catch { /* ignore */ }
    },
  });

  useEffect(() => {
    if (autoFocus) focusSelf();
  }, [autoFocus, focusSelf]);

  return (
    <button
      ref={ref}
      type="button"
      onClick={onPress}
      aria-label={ariaLabel}
      style={style}
      className={`tv-focusable ${focused ? 'is-focused' : ''} ${className}`}
    >
      {children}
    </button>
  );
}
