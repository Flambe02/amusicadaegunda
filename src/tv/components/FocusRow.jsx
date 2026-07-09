import { FocusContext, useFocusable } from '@noriginmedia/norigin-spatial-navigation';

/**
 * Conteneur générique = un contexte de focus norigin (mémorise la dernière cible).
 * Sert aux rangées non-cartes : sidebar, tiles catégorie, pills de mois.
 */
export default function FocusRow({ className = '', children, focusKey }) {
  const { ref, focusKey: fk } = useFocusable({
    focusKey,
    trackChildren: true,
    saveLastFocusedChild: true,
  });
  return (
    <FocusContext.Provider value={fk}>
      <div ref={ref} className={className}>{children}</div>
    </FocusContext.Provider>
  );
}
