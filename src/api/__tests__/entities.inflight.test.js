import { describe, it, expect, vi, beforeEach } from 'vitest';

// Faux service Supabase : une requête = un appel compté, résolue à la main.
const calls = { list: 0, current: 0 };
let resolveList;
vi.mock('../supabaseService', () => ({
  supabaseSongService: {
    list: vi.fn(() => { calls.list += 1; return new Promise((resolve) => { resolveList = resolve; }); }),
    getCurrent: vi.fn(() => { calls.current += 1; return Promise.resolve({ id: 1, title: 'Semana' }); }),
  },
}));
vi.mock('@/lib/supabase', () => ({ checkConnection: vi.fn(() => Promise.resolve(true)) }));

import { Song } from '../entities';

beforeEach(() => { calls.list = 0; calls.current = 0; });

describe('Song — requêtes identiques en cours partagées (les deux coquilles de Layout)', () => {
  it('two simultaneous identical list calls make one request; each caller gets its own array', async () => {
    const a = Song.list('-release_date', 120);
    const b = Song.list('-release_date', 120);
    expect(calls.list).toBe(1);
    resolveList([{ id: 2 }, { id: 1 }]);
    const [ra, rb] = await Promise.all([a, b]);
    expect(ra).toEqual([{ id: 2 }, { id: 1 }]);
    expect(ra).not.toBe(rb);
    ra.reverse();
    expect(rb[0].id).toBe(2); // un tri sur place ne touche pas l'autre appelant
  });

  it('never caches after the answer: a later call makes a new request (no stale data)', async () => {
    const first = Song.list('-release_date', 5);
    resolveList([{ id: 1 }]);
    await first;
    const second = Song.list('-release_date', 5);
    expect(calls.list).toBe(2);
    resolveList([{ id: 1 }, { id: 3 }]);
    expect(await second).toHaveLength(2);
  });

  it('different arguments are separate requests; getCurrent is shared the same way', async () => {
    Song.list('-release_date', 5);
    Song.list('title', 5);
    expect(calls.list).toBe(2);
    resolveList([{ id: 9 }]);
    const [c1, c2] = await Promise.all([Song.getCurrent(), Song.getCurrent()]);
    expect(calls.current).toBe(1);
    expect(c1).toEqual(c2);
  });
});
