import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';

const api = vi.hoisted(() => ({
  getCurrentLite: vi.fn(),
  listHomeFeed: vi.fn(),
  listHomeDescriptions: vi.fn(),
}));
vi.mock('@/api/entities', () => ({ Song: api }));
vi.mock('@/lib/offlineSongStore', () => ({ saveLastSongSnapshot: vi.fn() }));

import { useHomeSongs } from '../useHomeSongs';
import { markFirstScreenSettled, resetFirstScreenForTests } from '@/lib/firstScreen';

const WEEK = { id: 3, slug: 'tres', title: 'Tres', description: 'História da semana', __summary: true };
const INDEX = [
  { id: 3, slug: 'tres', title: 'Tres', status: 'published', __summary: true },
  { id: 2, slug: 'dois', title: 'Dois', status: 'published', __summary: true },
];

function deferred() {
  let resolve;
  const promise = new Promise((done) => { resolve = done; });
  return { promise, resolve };
}

beforeEach(() => {
  resetFirstScreenForTests();
  delete window.__AMDS_BOOT__;
  api.getCurrentLite.mockReset().mockResolvedValue(WEEK);
  api.listHomeFeed.mockReset().mockResolvedValue(INDEX);
  api.listHomeDescriptions.mockReset().mockResolvedValue([{ id: 2, description: 'História dois' }]);
});
afterEach(() => {
  resetFirstScreenForTests();
});

describe('useHomeSongs — ordre de chargement de l\'accueil', () => {
  it('shows the song of the week as soon as it arrives, without waiting for the catalogue', async () => {
    const feed = deferred();
    api.listHomeFeed.mockReturnValue(feed.promise);
    const { result } = renderHook(() => useHomeSongs());

    await waitFor(() => expect(result.current.currentSong).toBe(WEEK));
    expect(result.current.isLoading).toBe(false);
    expect(result.current.allSongs).toEqual([]);

    await act(async () => { feed.resolve(INDEX); });
    expect(result.current.allSongs).toHaveLength(2);
  });

  it('mobile: descriptions wait for the first screen, then join the songs', async () => {
    const { result } = renderHook(() => useHomeSongs({ deferDescriptions: true }));
    await waitFor(() => expect(result.current.allSongs).toHaveLength(2));
    expect(api.listHomeDescriptions).not.toHaveBeenCalled();
    expect(result.current.allSongs[1].description).toBeUndefined();

    await act(async () => { markFirstScreenSettled(); });
    await waitFor(() => expect(result.current.allSongs[1].description).toBe('História dois'));
    expect(api.listHomeDescriptions).toHaveBeenCalledTimes(1);
  });

  it('desktop: descriptions are asked for right after the catalogue', async () => {
    const { result } = renderHook(() => useHomeSongs());
    await waitFor(() => expect(result.current.allSongs[1]?.description).toBe('História dois'));
  });

  it('a catalogue that already carries descriptions (static fallback) asks for nothing more', async () => {
    api.listHomeFeed.mockResolvedValue([{ id: 'static-1', title: 'Estática', description: 'x', status: 'published' }]);
    const { result } = renderHook(() => useHomeSongs());
    await waitFor(() => expect(result.current.allSongs).toHaveLength(1));
    expect(api.listHomeDescriptions).not.toHaveBeenCalled();
  });

  it('takes the song index.html already asked for, instead of asking again', async () => {
    window.__AMDS_BOOT__ = { t: Date.now(), current: Promise.resolve({ id: 9, title: 'Do HTML', youtube_music_url: null }) };
    const { result } = renderHook(() => useHomeSongs());
    await waitFor(() => expect(result.current.currentSong).toMatchObject({ id: 9, __summary: true }));
    expect(api.getCurrentLite).not.toHaveBeenCalled();
  });

  it('asks itself when the index.html request failed, or is too old to trust', async () => {
    window.__AMDS_BOOT__ = { t: Date.now(), current: Promise.resolve(null) };
    const first = renderHook(() => useHomeSongs());
    await waitFor(() => expect(first.result.current.currentSong).toBe(WEEK));
    expect(api.getCurrentLite).toHaveBeenCalledTimes(1);

    window.__AMDS_BOOT__ = { t: Date.now() - 60000, current: Promise.resolve({ id: 9, title: 'Antiga' }) };
    const second = renderHook(() => useHomeSongs());
    await waitFor(() => expect(second.result.current.currentSong).toBe(WEEK));
    expect(api.getCurrentLite).toHaveBeenCalledTimes(2);
  });

  it('without a song of the week, falls back to the most recently created published song', async () => {
    api.getCurrentLite.mockResolvedValue(null);
    api.listHomeFeed.mockResolvedValue([
      { id: 1, title: 'Velha', status: 'published', created_at: '2026-01-01' },
      { id: 2, title: 'Nova', status: 'published', created_at: '2026-09-01' },
      { id: 3, title: 'Rascunho', status: 'draft', created_at: '2026-10-01' },
    ]);
    const { result } = renderHook(() => useHomeSongs());
    await waitFor(() => expect(result.current.currentSong?.title).toBe('Nova'));
    expect(result.current.allSongs).toHaveLength(2);
    expect(result.current.error).toBeNull();
  });

  it('reports an error only when nothing at all could be loaded', async () => {
    api.getCurrentLite.mockResolvedValue(null);
    api.listHomeFeed.mockResolvedValue([]);
    const { result } = renderHook(() => useHomeSongs());
    await waitFor(() => expect(result.current.error).toBeTruthy());
    expect(result.current.isLoading).toBe(false);
  });
});
