import { useCallback, useEffect, useState } from 'react';
import { Song } from '@/api/entities';

/**
 * La chanson complète d'un résumé (`__summary`), chargée seulement quand `enabled`
 * devient vrai (letra ouverte, karaokê affiché…). Une chanson déjà complète est rendue
 * telle quelle, sans requête.
 *
 * `song`      la complète dès qu'elle est là, sinon le résumé reçu.
 * `isLoading` vrai tant que la complète est attendue — pour ne pas afficher « sans
 *             letra » pendant le chargement.
 * `error`     le chargement a échoué : ce n'est PAS « pas de letra ». L'appelant le dit
 *             et propose `retry`, qui refait la requête.
 */
export function useFullSong(song, enabled = true) {
  const needsFull = Boolean(enabled && song?.__summary);
  const [state, setState] = useState(null);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    if (!needsFull) return undefined;
    let active = true;
    Song.getFull(song).then(
      (full) => { if (active) setState({ source: song, attempt, full, error: null }); },
      (error) => { if (active) setState({ source: song, attempt, full: null, error: error || new Error('load-failed') }); }
    );
    return () => { active = false; };
  }, [needsFull, song, attempt]);

  const retry = useCallback(() => setAttempt((count) => count + 1), []);

  if (!needsFull) return { song, isLoading: false, error: null, retry };
  const current = state && state.source === song && state.attempt === attempt ? state : null;
  return {
    song: current?.full || song,
    isLoading: !current,
    error: current?.error || null,
    retry,
  };
}
