import { useEffect, useState } from 'react';
import { Song } from '@/api/entities';

/**
 * La chanson complète d'un résumé de l'accueil (`__summary`), chargée seulement quand
 * `enabled` devient vrai (letra ouverte, karaokê affiché…). Une chanson déjà complète
 * est rendue telle quelle, sans requête.
 *
 * `song` : la complète dès qu'elle est là, sinon le résumé reçu.
 * `isLoading` : vrai tant que la complète est attendue — pour ne pas afficher « sans
 * letra » pendant le chargement.
 */
export function useFullSong(song, enabled = true) {
  const needsFull = Boolean(enabled && song?.__summary);
  const [loaded, setLoaded] = useState(null);

  useEffect(() => {
    if (!needsFull) return undefined;
    let active = true;
    Song.getFull(song).then((full) => {
      if (active) setLoaded({ source: song, full });
    });
    return () => { active = false; };
  }, [needsFull, song]);

  if (!needsFull) return { song, isLoading: false };
  const ready = loaded?.source === song;
  return { song: ready ? loaded.full : song, isLoading: !ready };
}
