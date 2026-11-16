import { useEffect, useState } from 'react';
import { Song } from '@/api/entities';

// Une lecture gardée au plus WEEK_SONG_TTL_MS : assez pour ne pas la refaire à chaque
// fiche, assez court pour qu'une PWA restée ouverte un lundi voie la nouvelle chanson.
// Une réponse inutilisable (repli hors ligne `static-N`, rien, erreur) n'est jamais
// gardée : nouvel essai à la fiche suivante.
const WEEK_SONG_TTL_MS = 10 * 60 * 1000;
let weekSongIdPromise = null;
let weekSongIdAt = 0;

function loadWeekSongId() {
  if (weekSongIdPromise && Date.now() - weekSongIdAt > WEEK_SONG_TTL_MS) weekSongIdPromise = null;
  if (!weekSongIdPromise) {
    weekSongIdAt = Date.now();
    const pending = Promise.resolve()
      .then(() => Song.getCurrentLite())
      .then((song) => {
        const id = song?.id != null ? String(song.id) : null;
        if (!id || !/^\d+$/.test(id)) {
          if (weekSongIdPromise === pending) weekSongIdPromise = null;
          return null;
        }
        return id;
      })
      .catch(() => {
        if (weekSongIdPromise === pending) weekSongIdPromise = null;
        return null;
      });
    weekSongIdPromise = pending;
  }
  return weekSongIdPromise;
}

/**
 * La chanson est-elle LA chanson de la semaine (celle que renvoie
 * `Song.getCurrentLite()`, même notion que le feed de l'Início) ? `false` tant que la
 * réponse n'est pas là, ou si elle échoue.
 */
export function useIsWeekSong(song) {
  const id = song?.id != null ? String(song.id) : null;
  const [weekId, setWeekId] = useState(null);

  useEffect(() => {
    if (!id) return undefined;
    let alive = true;
    loadWeekSongId().then((value) => { if (alive) setWeekId(value); });
    return () => { alive = false; };
  }, [id]);

  return Boolean(id) && weekId === id;
}

/** Tests uniquement. */
export function __resetWeekSongForTests() {
  weekSongIdPromise = null;
  weekSongIdAt = 0;
}
