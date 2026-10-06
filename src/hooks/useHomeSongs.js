import { useCallback, useEffect, useMemo, useState } from 'react';
import { Song } from '@/api/entities';
import { logger } from '@/lib/logger';
import { saveLastSongSnapshot } from '@/lib/offlineSongStore';
import { onFirstScreenSettled } from '@/lib/firstScreen';
import { getSongArtwork } from '@/pages/home/homeArtwork';

const LOAD_ERROR = 'Erro ao carregar a música da semana. Tente novamente.';
// La réponse lancée par index.html n'est reprise que pendant le chargement de la page.
const BOOT_MAX_AGE_MS = 15000;
const BOOT_WAIT_MS = 4000;

/**
 * Chanson de la semaine demandée par `index.html` avant le JavaScript de l'app (voir
 * `amds-boot` dans index.html). `null` si elle n'existe pas, est trop ancienne (retour
 * sur l'accueil plus tard dans la session) ou a échoué — l'appelant refait la requête.
 */
const asBootSong = (song) => (song && song.id != null && song.title ? { ...song, __summary: true } : null);

function freshBoot() {
  const boot = typeof window !== 'undefined' ? window.__AMDS_BOOT__ : null;
  return boot && Date.now() - boot.t <= BOOT_MAX_AGE_MS ? boot : null;
}

/** La même chanson, si sa réponse est DÉJÀ là au montage : pas d'écran d'attente. */
function readBootCurrentSong() {
  return asBootSong(freshBoot()?.song);
}

function takeBootCurrentSong() {
  const boot = freshBoot();
  if (!boot?.current) return null;
  // Une réponse qui tarde ne retient pas l'accueil : il refait alors la requête.
  const tooLate = new Promise((resolve) => { setTimeout(() => resolve(null), BOOT_WAIT_MS); });
  return Promise.race([boot.current, tooLate])
    .then(asBootSong)
    .catch(() => null);
}

function getLatestPublishedByCreatedAt(songs) {
  if (!Array.isArray(songs) || songs.length === 0) return null;
  return songs.reduce((latest, song) => {
    if (!latest) return song;
    const latestDate = latest?.created_at ? new Date(latest.created_at).getTime() : 0;
    const songDate = song?.created_at ? new Date(song.created_at).getTime() : 0;
    return songDate > latestDate ? song : latest;
  }, null);
}

function snapshot(song) {
  saveLastSongSnapshot({
    title: song.title,
    artist: song.artist,
    slug: song.slug,
    thumbnail: getSongArtwork(song) || null,
  });
}

/**
 * Données de l'accueil, dans l'ordre où l'écran en a besoin :
 *
 *   1. la chanson de la semaine en résumé (≈ 1 Ko) → le premier écran s'affiche ;
 *   2. le catalogue en résumé, sans description (≈ 6 Ko) → glissement, navigation ;
 *   3. les descriptions (≈ 43 Ko, bouton « História ») → tout de suite sur desktop,
 *      une fois le premier écran en place sur mobile (`deferDescriptions`).
 *
 * Ni paroles ni karaokê ici : `Song.getFull` les charge à l'ouverture (useFullSong).
 */
export function useHomeSongs({ deferDescriptions = false } = {}) {
  const [currentSong, setCurrentSong] = useState(readBootCurrentSong);
  const [feedSongs, setFeedSongs] = useState([]);
  const [descriptions, setDescriptions] = useState(null);
  const [isLoading, setIsLoading] = useState(() => !readBootCurrentSong());
  const [error, setError] = useState(null);

  const load = useCallback(async ({ keepScreen = false } = {}) => {
    if (!keepScreen) setIsLoading(true);
    setError(null);

    try {
      const currentPromise = (takeBootCurrentSong() || Promise.resolve(null))
        .then((bootSong) => bootSong || Song.getCurrentLite());
      const feedPromise = Song.listHomeFeed();
      const fetchedCurrentSong = await currentPromise;

      if (fetchedCurrentSong) {
        // Même chanson que celle déjà à l'écran : on garde son objet (rien ne se remonte).
        setCurrentSong((previousSong) =>
          previousSong && previousSong.id === fetchedCurrentSong.id ? previousSong : fetchedCurrentSong
        );
        setIsLoading(false);
        snapshot(fetchedCurrentSong);
      }

      const feed = await feedPromise;
      const publishedSongs = (Array.isArray(feed) ? feed : [])
        .filter((song) => !song?.status || song.status === 'published');
      setFeedSongs(publishedSongs);

      const resolvedCurrentSong = fetchedCurrentSong || getLatestPublishedByCreatedAt(publishedSongs);
      if (resolvedCurrentSong) {
        setCurrentSong((previousSong) => previousSong || resolvedCurrentSong);
        if (!fetchedCurrentSong) snapshot(resolvedCurrentSong);
      } else {
        setError(LOAD_ERROR);
      }
    } catch (err) {
      logger.error('Erro ao carregar musicas:', err);
      setError(LOAD_ERROR);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    load({ keepScreen: Boolean(readBootCurrentSong()) });
  }, [load]);

  // Descriptions : seulement si le catalogue vient en résumé (le repli statique et la
  // lecture complète les portent déjà).
  const needsDescriptions = feedSongs.some((song) => song.__summary && song.description === undefined);
  useEffect(() => {
    if (!needsDescriptions || descriptions) return undefined;
    let active = true;
    const fetchDescriptions = () => {
      Song.listHomeDescriptions().then((rows) => {
        if (!active) return;
        setDescriptions(new Map((rows || []).map((row) => [row.id, row.description ?? null])));
      });
    };
    if (!deferDescriptions) {
      fetchDescriptions();
      return () => { active = false; };
    }
    const unsubscribe = onFirstScreenSettled(fetchDescriptions);
    return () => {
      active = false;
      unsubscribe();
    };
  }, [needsDescriptions, descriptions, deferDescriptions]);

  const allSongs = useMemo(() => {
    if (!descriptions) return feedSongs;
    return feedSongs.map((song) =>
      song.description === undefined && descriptions.has(song.id)
        ? { ...song, description: descriptions.get(song.id) }
        : song
    );
  }, [feedSongs, descriptions]);

  const reload = useCallback(() => load(), [load]);

  return { currentSong, allSongs, isLoading, error, reload };
}
