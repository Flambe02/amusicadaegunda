import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  findCostumeClip, loadMascotCatalog, normalizeCatalog, remoteDances, resetMascotCatalogForTests,
} from '../mascotCatalog';
import { ANIMATIONS, pickAnimation } from '../stageDraw';
import catalogFile from '../../../../../public/mascot/catalog.json';

const RAW = {
  animations: [
    { id: 'bets-dance', type: 'dance', costume: 'bets', song: 'bets-bets-bets', video: 'caipivara-bets-dance.mp4', poster: 'caipivara-bets-dance-poster.webp' },
    { id: 'frevo', type: 'dance', video: 'caipivara-frevo.mp4', poster: 'caipivara-frevo-poster.webp', loop: false },
    { id: 'frevo', type: 'dance', video: 'dup.mp4', poster: 'dup.webp' },
    { id: 'bad type', type: 'dance', video: 'x.mp4', poster: 'x.webp' },
    { id: 'evil', type: 'dance', video: '../../etc/passwd.mp4', poster: 'x.webp' },
    { id: 'noposter', type: 'dance', video: 'x.mp4' },
    { id: 'unknown', type: 'jump', video: 'x.mp4', poster: 'x.webp' },
  ],
};

beforeEach(() => { resetMascotCatalogForTests(); });

describe('mascotCatalog — animations à la demande', () => {
  it('keeps the valid entries only, with full addresses, and ignores the rest', () => {
    const catalog = normalizeCatalog(RAW, '/mascot/');
    expect(catalog.map((entry) => entry.id)).toEqual(['bets-dance', 'frevo']);
    expect(catalog[0]).toMatchObject({ key: 'remote:bets-dance', remote: true, loop: true, mp4: '/mascot/caipivara-bets-dance.mp4', poster: '/mascot/caipivara-bets-dance-poster.webp' });
    expect(catalog[1].loop).toBe(false);
    expect(normalizeCatalog(null)).toEqual([]);
    expect(normalizeCatalog('<html>404</html>')).toEqual([]);
  });

  it('the catalogue shipped on the site is valid and every entry has its files named', () => {
    const catalog = normalizeCatalog(catalogFile, '/mascot/');
    expect(catalog.length).toBe(catalogFile.animations.length);
    expect(catalog.find((entry) => entry.costume === 'bets' && entry.song === 'bets-bets-bets' && entry.type === 'dance')).toBeTruthy();
  });

  it('a song gets its costume from the mascot_costume column first, then from the catalogue', () => {
    const catalog = normalizeCatalog(RAW, '/mascot/');
    expect(findCostumeClip(catalog, { slug: 'outra', mascot_costume: 'bets' })?.id).toBe('bets-dance');
    expect(findCostumeClip(catalog, { slug: 'bets-bets-bets' })?.id).toBe('bets-dance');
    expect(findCostumeClip(catalog, { slug: 'querido-tse' })).toBeNull();
    expect(findCostumeClip(catalog, { slug: 'querido-tse', mascot_costume: 'desconhecido' })).toBeNull();
    expect(findCostumeClip([], { slug: 'bets-bets-bets' })).toBeNull();
    expect(findCostumeClip(catalog, null)).toBeNull();
  });

  it('new dances join the draw with the five built-in ones, never the same twice in a row', () => {
    const extra = remoteDances(normalizeCatalog(RAW, '/mascot/'));
    expect(extra.map((entry) => entry.id)).toEqual(['frevo']); // un costume n'est pas une danse
    const seen = new Set();
    let last = null;
    for (let i = 0; i < 200; i += 1) {
      const choice = pickAnimation(last, Math.random, extra);
      expect(choice.key).not.toBe(last);
      last = choice.key;
      seen.add(choice.key);
    }
    expect(seen.size).toBe(ANIMATIONS.length + 1);
    expect(seen.has('remote:frevo')).toBe(true);
  });

  it('an unreachable or broken catalogue gives an empty list — the built-in animations still work', async () => {
    expect(await loadMascotCatalog(vi.fn().mockRejectedValue(new Error('offline')))).toEqual([]);
    resetMascotCatalogForTests();
    expect(await loadMascotCatalog(vi.fn().mockResolvedValue({ ok: false, json: async () => ({}) }))).toEqual([]);
    resetMascotCatalogForTests();
    const fetchImpl = vi.fn().mockResolvedValue({ ok: true, json: async () => RAW });
    expect((await loadMascotCatalog(fetchImpl)).map((entry) => entry.id)).toEqual(['bets-dance', 'frevo']);
    expect(fetchImpl.mock.calls[0][0]).toBe('/mascot/catalog.json');
  });

  it('the built-in animations are MP4 only (no WebM copy in the app)', () => {
    for (const clip of ANIMATIONS) {
      expect(clip.mp4).toMatch(/^\/videos\/caipivara\/caipivara-[a-z]+\.mp4$/);
      expect(clip.webm).toBeUndefined();
    }
  });
});
