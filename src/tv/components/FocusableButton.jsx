import { useEffect } from 'react';
import { useFocusable } from '@noriginmedia/norigin-spatial-navigation';

/**
 * Bouton navigable au D-pad. `onPress` est déclenché par OK (Enter) et par clic
 * (fallback tactile pour le cas « tablette détectée comme TV »).
 */
export default function FocusableButton({
  onPress, children, className = '', focusKey, autoFocus = false, ariaLabel, style,
}) {
  const { ref, focused, focusSelf } = useFocusable({ onEnterPress: onPress, focusKey });

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
