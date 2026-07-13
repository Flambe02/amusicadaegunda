import { useEffect } from 'react';

/**
 * Avertit avant de quitter la page (refresh, fermeture d'onglet, navigation
 * navigateur) TANT QU'il y a des modifications non sauvegardées. Se retire
 * automatiquement dès que tout est sauvegardé → aucun nag intempestif.
 *
 * La navigation INTERNE à l'app (fermer l'éditeur, ouvrir une autre chanson) n'est
 * PAS couverte ici — c'est géré par une confirmation explicite côté composant
 * (beforeunload ne se déclenche que pour une vraie sortie du document).
 *
 * @param {boolean} isDirty
 */
export function useUnsavedGuard(isDirty) {
  useEffect(() => {
    if (!isDirty) return undefined;
    const handler = (e) => {
      e.preventDefault();
      // Requis par certains navigateurs pour afficher le dialogue natif.
      e.returnValue = '';
      return '';
    };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [isDirty]);
}
