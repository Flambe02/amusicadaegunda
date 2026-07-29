import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Song } from '@/api/entities';
import { isKaraokePublished } from '@/lib/lrc';
import {
  buildSearchIndex,
  deriveThemes,
  deriveMonths,
  filterAndSortSongs,
  pickRandomSong,
} from '@/lib/karaokeCatalog';

const RECENT_KEY = 'karaoke-surprise-recent-v1';
const RECENT_MAX = 3;

function readRecent() {
  try {
    const raw = localStorage.getItem(RECENT_KEY);
    const arr = raw ? JSON.parse(raw) : [];
    return Array.isArray(arr) ? arr.map(String) : [];
  } catch {
    return [];
  }
}

function writeRecent(ids) {
  try {
    localStorage.setItem(RECENT_KEY, JSON.stringify(ids.slice(-RECENT_MAX)));
  } catch {
    /* storage indisponible (mode privé) → on ignore, l'anti-répétition dégrade juste */
  }
}

const DEFAULT_FILTERS = { query: '', theme: null, month: null, sort: 'newest' };

/**
 * Contrôleur d'état partagé du catalogue Karaokê (mobile + desktop).
 *
 * - charge les chansons éligibles (lrc_content), les indexe pour la recherche ;
 * - expose filtres (query/theme/month/sort) + dérivés (thèmes, mois, résultats) ;
 * - fournit un tirage aléatoire respectant les filtres actifs et l'anti-répétition.
 *
 * Aucune navigation ici : la page décide quoi faire de la chanson choisie
 * (ouvrir le lecteur), pour réutiliser le même chemin que le clic sur une carte.
 */
export function useKaraokeCatalog() {
  const [songs, setSongs] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filters, setFilters] = useState(DEFAULT_FILTERS);
  const recentRef = useRef(readRecent());

  const load = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const rows = (await Song.list('-release_date')) || [];
      const eligible = rows
        .filter((s) => isKaraokePublished(s))
        // pré-calcule l'index de recherche une seule fois par chanson
        .map((s) => ({ ...s, __searchIndex: buildSearchIndex(s) }));

      // `Song.list` avale ses erreurs : en cas de panne il retombe sur le catalogue
      // statique (`__staticFallback`, sans `lrc_content`) ou renvoie []. Dans les
      // deux cas on obtient 0 éligible. Sans ce test, une panne réseau s'afficherait
      // comme « Nenhuma música disponível para karaokê » — un mensonge, puisque les
      // karaokês existent. On remonte donc une erreur pour proposer « tentar de novo ».
      const reachedSupabase = rows.some((s) => s && !s.__staticFallback);
      if (eligible.length === 0 && !reachedSupabase) {
        throw new Error('Catálogo karaokê indisponível (falha ao carregar as músicas)');
      }

      setSongs(eligible);
    } catch (err) {
      setError(err);
      setSongs([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      await load();
      if (cancelled) return;
    })();
    return () => { cancelled = true; };
  }, [load]);

  const themes = useMemo(() => deriveThemes(songs), [songs]);
  const months = useMemo(() => deriveMonths(songs), [songs]);

  // Résultats filtrés + triés (une seule passe mémoïsée).
  const results = useMemo(
    () => filterAndSortSongs(songs, filters),
    [songs, filters],
  );

  const hasActiveFilters =
    !!filters.query.trim() || filters.theme !== null || filters.month !== null;

  // ── Mutateurs de filtres ──
  const setQuery = useCallback((query) => setFilters((f) => ({ ...f, query })), []);
  const setTheme = useCallback((theme) => setFilters((f) => ({ ...f, theme })), []);
  const setMonth = useCallback((month) => setFilters((f) => ({ ...f, month })), []);
  const setSort = useCallback((sort) => setFilters((f) => ({ ...f, sort })), []);
  const clearFilters = useCallback(
    () => setFilters((f) => ({ ...DEFAULT_FILTERS, sort: f.sort })),
    [],
  );

  /**
   * Tire une chanson au hasard parmi les résultats courants (respecte donc
   * recherche + filtres). Évite les derniers tirages. Renvoie la chanson ou null.
   */
  const pickSurprise = useCallback((rng = Math.random) => {
    const chosen = pickRandomSong(results, { recentIds: recentRef.current, rng });
    if (chosen) {
      const next = [...recentRef.current.filter((id) => id !== String(chosen.id)), String(chosen.id)];
      recentRef.current = next.slice(-RECENT_MAX);
      writeRecent(recentRef.current);
    }
    return chosen;
  }, [results]);

  return {
    // données
    songs,
    results,
    totalEligible: songs.length,
    isLoading,
    error,
    // dérivés pour l'UI
    themes,
    months,
    // état filtres
    filters,
    hasActiveFilters,
    // actions
    setQuery,
    setTheme,
    setMonth,
    setSort,
    clearFilters,
    pickSurprise,
    reload: load,
  };
}
