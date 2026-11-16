import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import {
  FAVORITES_EVENT,
  FAVORITES_KEY,
  FAVORITES_MAX,
  __resetFavoritesForTests,
  isFavorite,
  readFavorites,
  subscribeFavorites,
  toggleFavorite,
} from '../favorites';
import { useFavorites } from '@/hooks/useFavorites';

beforeEach(() => {
  localStorage.clear();
  __resetFavoritesForTests();
});
afterEach(() => {
  vi.restoreAllMocks();
  delete window.gtag;
});

describe('favorites — stockage sur l’appareil', () => {
  it('toggles a song on and off, most recent first, ids as strings', () => {
    expect(readFavorites()).toEqual([]);
    expect(toggleFavorite(7)).toBe(true);
    expect(toggleFavorite('12')).toBe(true);
    expect(readFavorites()).toEqual(['12', '7']);
    expect(isFavorite(7)).toBe(true);
    expect(isFavorite('7')).toBe(true);
    expect(toggleFavorite(7)).toBe(false);
    expect(readFavorites()).toEqual(['12']);
    expect(isFavorite(7)).toBe(false);
  });

  it('persists in localStorage under amds-favorites-v1 and reads it back', () => {
    toggleFavorite(3);
    expect(JSON.parse(localStorage.getItem(FAVORITES_KEY))).toEqual(['3']);
    __resetFavoritesForTests();
    localStorage.setItem(FAVORITES_KEY, JSON.stringify([5, '5', 9, null, '']));
    expect(readFavorites()).toEqual(['5', '9']); // dédoublonné, valeurs vides ignorées
  });

  it('returns the same array while nothing changes (stable snapshot), and ignores garbage', () => {
    toggleFavorite(1);
    expect(readFavorites()).toBe(readFavorites());
    localStorage.setItem(FAVORITES_KEY, '{oops');
    expect(readFavorites()).toEqual([]);
    expect(toggleFavorite(null)).toBe(false);
    expect(toggleFavorite('  ')).toBe(false);
  });

  it(`keeps at most ${FAVORITES_MAX} entries`, () => {
    localStorage.setItem(FAVORITES_KEY, JSON.stringify(Array.from({ length: FAVORITES_MAX }, (_, i) => i)));
    toggleFavorite('new');
    const list = readFavorites();
    expect(list).toHaveLength(FAVORITES_MAX);
    expect(list[0]).toBe('new');
  });

  it('dispatches amds-favorites-change on window at each toggle', () => {
    const listener = vi.fn();
    window.addEventListener(FAVORITES_EVENT, listener);
    toggleFavorite(4);
    toggleFavorite(4);
    expect(listener).toHaveBeenCalledTimes(2);
    window.removeEventListener(FAVORITES_EVENT, listener);
  });

  it('subscribers hear this tab and other tabs (storage event on the same key only)', () => {
    const callback = vi.fn();
    const unsubscribe = subscribeFavorites(callback);
    toggleFavorite(1);
    window.dispatchEvent(new StorageEvent('storage', { key: FAVORITES_KEY }));
    window.dispatchEvent(new StorageEvent('storage', { key: 'other-key' }));
    expect(callback).toHaveBeenCalledTimes(2);
    unsubscribe();
    toggleFavorite(1);
    expect(callback).toHaveBeenCalledTimes(2);
  });

  it('never crashes when storage is unavailable: favourites live in memory for the session', () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => { throw new Error('SecurityError'); });
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw new Error('QuotaExceededError'); });
    expect(readFavorites()).toEqual([]);
    expect(toggleFavorite(8)).toBe(true);
    expect(isFavorite(8)).toBe(true);
    expect(toggleFavorite(8)).toBe(false);
    expect(readFavorites()).toEqual([]);
  });
});

describe('useFavorites', () => {
  it('shares the state live, accepts a song or an id, and reports favorite_add / favorite_remove', () => {
    window.gtag = vi.fn();
    const song = { id: 21, slug: 'pix-do-pao', title: 'Pix do Pão' };
    const first = renderHook(() => useFavorites());
    const second = renderHook(() => useFavorites());
    expect(first.result.current.isFavorite(song)).toBe(false);

    act(() => { first.result.current.toggle(song); });
    expect(first.result.current.isFavorite(song)).toBe(true);
    expect(second.result.current.isFavorite(21)).toBe(true); // autre composant, même appareil
    expect(second.result.current.ids.has('21')).toBe(true);
    expect(window.gtag).toHaveBeenCalledWith('event', 'favorite_add', { item_id: 'pix-do-pao' });

    act(() => { second.result.current.toggle(21); });
    expect(first.result.current.isFavorite(song)).toBe(false);
    expect(window.gtag).toHaveBeenLastCalledWith('event', 'favorite_remove', { item_id: '21' });
  });
});

describe('favoriteKey (useFavorites)', () => {
  it('refuses songs without a stable id (offline fallback static-N)', async () => {
    const { favoriteKey } = await import('@/hooks/useFavorites');
    expect(favoriteKey({ id: 92 })).toBe('92');
    expect(favoriteKey('15')).toBe('15');
    expect(favoriteKey({ id: 'static-3' })).toBeNull();
    expect(favoriteKey({})).toBeNull();
    expect(favoriteKey(null)).toBeNull();
  });
});
