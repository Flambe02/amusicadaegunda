import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  SONG_INDEX_COLUMNS,
  SONG_SUMMARY_COLUMNS,
  buildCurrentSongBootUrl,
} from '../songColumns';

// Colonnes lourdes : jamais dans le chemin critique de l'accueil.
const HEAVY = ['lyrics', 'lyrics_karaoke', 'lrc_content', 'timing_data', 'pitch_map', 'karaoke_ai_raw_transcript'];

// Faux client Supabase : enregistre chaque requête (colonnes, filtres) et rend `result`.
const queries = [];
let result = { data: [], error: null };
// Réponses successives quand un test en attend plusieurs (sinon `result`).
const answers = [];
const answer = () => Promise.resolve(answers.length ? answers.shift() : result);
vi.mock('@/lib/supabase', () => {
  const builder = (query) => {
    const chain = {
      select: (columns) => { query.select = columns; return chain; },
      eq: (column, value) => { query.eq.push([column, value]); return chain; },
      order: (column, options) => { query.order = [column, options]; return chain; },
      limit: (count) => { query.limit = count; return chain; },
      single: () => answer(),
      then: (resolve, reject) => answer().then(resolve, reject),
    };
    return chain;
  };
  return {
    TABLES: { SONGS: 'songs' },
    handleSupabaseError: (error) => { throw error; },
    checkConnection: vi.fn(() => Promise.resolve(true)),
    supabase: {
      from: (table) => {
        const query = { table, eq: [] };
        queries.push(query);
        return builder(query);
      },
    },
  };
});

import { Song } from '../entities';
import { isKaraokePublished } from '@/lib/lrc';

beforeEach(() => {
  queries.length = 0;
  answers.length = 0;
  result = { data: [], error: null };
  vi.restoreAllMocks();
});

describe('Accueil — résumés des chansons (jamais select *)', () => {
  it('importing the data layer makes no request (no connection probe at boot)', () => {
    expect(queries).toHaveLength(0);
  });

  it('the summary columns carry no heavy column', () => {
    for (const column of HEAVY) {
      expect(SONG_SUMMARY_COLUMNS).not.toContain(column);
      expect(SONG_INDEX_COLUMNS).not.toContain(column);
    }
    expect(SONG_INDEX_COLUMNS).not.toContain('description');
    expect(SONG_SUMMARY_COLUMNS).toContain('description');
  });

  it('getCurrentLite asks for the published song of the week with explicit columns', async () => {
    result = { data: [{ id: 7, title: 'Semana', karaoke_synced_at: '2026-09-01T00:00:00Z' }], error: null };
    const song = await Song.getCurrentLite();
    expect(queries).toHaveLength(1);
    expect(queries[0].select).toBe(SONG_SUMMARY_COLUMNS.join(','));
    expect(queries[0].select).not.toContain('*');
    expect(queries[0].eq).toContainEqual(['status', 'published']);
    expect(queries[0].limit).toBe(1);
    expect(song).toMatchObject({ id: 7, __summary: true });
  });

  it('listHomeFeed asks for the catalogue index: explicit columns, no description, no lyrics', async () => {
    result = { data: [{ id: 2, title: 'B' }, { id: 1, title: 'A' }], error: null };
    const songs = await Song.listHomeFeed();
    expect(queries[0].select).toBe(SONG_INDEX_COLUMNS.join(','));
    expect(queries[0].select).not.toContain('*');
    expect(songs.every((song) => song.__summary)).toBe(true);
  });

  it('listHomeDescriptions asks only for id and description', async () => {
    result = { data: [{ id: 1, description: 'x' }], error: null };
    await Song.listHomeDescriptions();
    expect(queries[0].select).toBe('id,description');
  });

  it('a network failure falls back to the static catalogue (offline), not to a second Supabase request', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    result = { data: null, error: { message: 'Failed to fetch' } };
    globalThis.fetch = vi.fn(() => Promise.resolve({
      ok: true,
      json: () => Promise.resolve([{ name: 'Estática', slug: 'estatica', datePublished: '2026-09-01' }]),
    }));
    const songs = await Song.listHomeFeed();
    expect(queries).toHaveLength(1);
    expect(songs[0]).toMatchObject({ title: 'Estática', __staticFallback: true });
    expect(songs[0].__summary).toBeUndefined();
  });

  it('a missing column (older schema) retries once with the full read instead of failing', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    answers.push(
      { data: null, error: { code: '42703', message: 'column songs.subtitle does not exist' } },
      { data: [{ id: 1, title: 'A', lrc_content: null }], error: null }
    );
    const songs = await Song.listHomeFeed();
    expect(queries.map((query) => query.select)).toEqual([SONG_INDEX_COLUMNS.join(','), '*']);
    expect(songs).toEqual([{ id: 1, title: 'A', lrc_content: null }]);
  });

  it('getFull loads the whole row once per song, and gives a full song back untouched', async () => {
    const full = { id: 3, title: 'T', lyrics: 'la la' };
    expect(await Song.getFull(full)).toBe(full);
    expect(queries).toHaveLength(0);

    result = { data: { id: 3, title: 'T', lyrics: 'la la', lrc_content: '[00:01.00]la' }, error: null };
    const summary = { id: 3, title: 'T', __summary: true };
    const [a, b] = await Promise.all([Song.getFull(summary), Song.getFull(summary)]);
    expect(queries).toHaveLength(1);
    expect(queries[0].select).toBe('*');
    expect(a.lyrics).toBe('la la');
    expect(b).toBe(a);
  });

  it('getFull gives the summary back when the full read fails, and retries next time', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    const summary = { id: 44, title: 'S', __summary: true };
    result = { data: null, error: { message: 'Failed to fetch' } };
    expect(await Song.getFull(summary)).toBe(summary);
    result = { data: { id: 44, title: 'S', lyrics: 'ok' }, error: null };
    expect((await Song.getFull(summary)).lyrics).toBe('ok');
  });
});

describe('isKaraokePublished — résumé sans lrc_content', () => {
  it('a summary relies on karaoke_synced_at; karaoke_published=false always hides', () => {
    expect(isKaraokePublished({ __summary: true, karaoke_synced_at: '2026-09-01T00:00:00Z' })).toBe(true);
    expect(isKaraokePublished({ __summary: true, karaoke_synced_at: null })).toBe(false);
    expect(isKaraokePublished({ __summary: true, karaoke_synced_at: '2026-09-01T00:00:00Z', karaoke_published: false })).toBe(false);
  });

  it('a full song still requires real LRC content (karaoke_synced_at alone is not enough)', () => {
    expect(isKaraokePublished({ lrc_content: '[00:01.00]la', karaoke_published: null })).toBe(true);
    expect(isKaraokePublished({ lrc_content: null, karaoke_synced_at: '2026-09-01T00:00:00Z' })).toBe(false);
    expect(isKaraokePublished({ __summary: true, lrc_content: '', karaoke_synced_at: '2026-09-01T00:00:00Z' })).toBe(false);
  });
});

describe('index.html — requête de démarrage', () => {
  it('is a simple request: the key travels in the URL, with the summary columns and the same filter', () => {
    const url = new URL(buildCurrentSongBootUrl('https://x.supabase.co/', 'sb_publishable_test'));
    expect(url.origin + url.pathname).toBe('https://x.supabase.co/rest/v1/songs');
    expect(url.searchParams.get('apikey')).toBe('sb_publishable_test');
    expect(url.searchParams.get('select')).toBe(SONG_SUMMARY_COLUMNS.join(','));
    expect(url.searchParams.get('status')).toBe('eq.published');
    expect(url.searchParams.get('order')).toBe('release_date.desc');
    expect(url.searchParams.get('limit')).toBe('1');
  });
});
