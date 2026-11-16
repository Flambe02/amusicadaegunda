import { useCallback, useMemo, useSyncExternalStore } from 'react';
import { readFavorites, subscribeFavorites, toggleFavorite } from '@/lib/favorites';
import { getPublicSlug } from '@/components/mobile/feed/feedMedia';

const EMPTY = Object.freeze([]);
const serverSnapshot = () => EMPTY;

/**
 * Clé de favori d'une chanson, ou null si elle n'en a pas de stable : les chansons du
 * repli hors ligne (content/songs.json sans id, `static-N`) ne correspondraient plus à
 * rien une fois Supabase revenu — pas de cœur pour elles.
 */
export function favoriteKey(songOrId) {
  const id = songOrId && typeof songOrId === 'object' ? songOrId.id : songOrId;
  if (id == null) return null;
  const key = String(id).trim();
  if (!key || key.startsWith('static-')) return null;
  return key;
}
const keyOf = favoriteKey;

function slugOf(songOrId, key) {
  if (songOrId && typeof songOrId === 'object') return getPublicSlug(songOrId) || key;
  return key;
}

/**
 * Favoris de l'appareil (voir src/lib/favorites.js), partagés en direct entre tous les
 * cœurs de la page et les autres onglets. `isFavorite` et `toggle` acceptent une
 * chanson ou son identifiant.
 */
export function useFavorites() {
  const list = useSyncExternalStore(subscribeFavorites, readFavorites, serverSnapshot);
  const ids = useMemo(() => new Set(list), [list]);

  const isFavorite = useCallback((songOrId) => {
    const key = keyOf(songOrId);
    return key ? ids.has(key) : false;
  }, [ids]);

  const toggle = useCallback((songOrId) => {
    const key = keyOf(songOrId);
    if (!key) return false;
    const on = toggleFavorite(key);
    try {
      window.gtag?.('event', on ? 'favorite_add' : 'favorite_remove', { item_id: slugOf(songOrId, key) });
    } catch {
      /* analytics indisponible : sans effet */
    }
    return on;
  }, []);

  return { ids, isFavorite, toggle };
}
