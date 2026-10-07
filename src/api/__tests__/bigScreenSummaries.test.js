import { describe, it, expect, vi, beforeEach } from 'vitest';
import { DUET_LRC_FILTER, SONG_BIGSCREEN_COLUMNS, mergeSongLyrics } from '../songColumns';

// Faux client Supabase : enregistre chaque requête et répond selon ce qu'elle demande.
const queries = [];
let respond = () => ({ data: [], error: null });
vi.mock('@/lib/supabase', () => {
  const builder = (query) => {
    const chain = {
      select: (columns) => { query.select = columns; return chain; },
      eq: (column, value) => { query.eq.push([column, value]); return chain; },
      not: () => chain,
      filter: (column, operator, value) => { query.filter = [column, operator, value]; return chain; },
      order: () => chain,
      limit: () => chain,
      single: () => Promise.resolve(respond(query)),
      then: (resolve, reject) => Promise.resolve(respond(query)).then(resolve, reject),
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
import { hasDuetTags } from '@/lib/lrc';
import { getDifficulty, getMode, isDuetReady } from '@/tv/lib/songMeta';

const LYRICS = Array.from({ length: 300 }, (_, index) => `palavra${index}`).join(' ');
const ROWS = [
  { id: 1, title: 'Um', status: 'published', youtube_url: 'https://music.youtube.com/watch?v=aaaaaaaaaaa', karaoke_synced_at: '2026-09-01', karaoke_published: true, difficulty: 'hard' },
  { id: 2, title: 'Dois', status: 'published', youtube_url: 'https://music.youtube.com/watch?v=bbbbbbbbbbb', karaoke_synced_at: '2026-09-02', karaoke_published: true, difficulty: 'easy' },
];

beforeEach(() => {
  queries.length = 0;
  respond = (query) => (query.filter ? { data: [{ id: 2 }], error: null } : { data: ROWS, error: null });
});

describe('Interface grand écran — résumés au démarrage (jamais select *)', () => {
  it('the start-up columns leave out the lyrics, the LRC, the word timing, the pitch map and the description', () => {
    for (const heavy of ['lyrics', 'lyrics_karaoke', 'lrc_content', 'timing_data', 'pitch_map', 'karaoke_ai_raw_transcript', 'description']) {
      expect(SONG_BIGSCREEN_COLUMNS).not.toContain(heavy);
    }
    // Ce que les cartes affichent : la difficulté vient de la colonne, plus de la letra.
    expect(SONG_BIGSCREEN_COLUMNS).toEqual(expect.arrayContaining(['difficulty', 'hashtags', 'karaoke_synced_at']));
  });

  it('Song.listBigScreen asks for those columns only, plus the ids of the duet songs', async () => {
    const songs = await Song.listBigScreen();
    expect(queries.map((query) => query.select)).toEqual([SONG_BIGSCREEN_COLUMNS.join(','), 'id']);
    expect(queries.every((query) => query.select !== '*')).toBe(true);
    expect(queries[1].filter).toEqual(['lrc_content', 'imatch', DUET_LRC_FILTER]);
    expect(songs.map((song) => [song.id, song.__summary, song.__duet])).toEqual([[1, true, false], [2, true, true]]);
  });

  it('the cards read the same labels from a summary as from the full song', async () => {
    const [one, two] = await Song.listBigScreen();
    // La colonne (remplie pour toutes les chansons) donne l'étiquette que la letra donnait.
    expect(getDifficulty(one)).toBe(getDifficulty({ lyrics: LYRICS }));
    expect(getDifficulty(two)).toBe(getDifficulty(ROWS[1]));
    expect(getMode(one)).toBe(getMode({ ...ROWS[0], lrc_content: '[00:01.00]a' }));
    expect(getMode(two)).toBe(getMode({ ...ROWS[1], lrc_content: '[00:01.00]{A}a\n[00:02.00]{B}b' }));
    expect(isDuetReady(two)).toBe(true);
    expect(isDuetReady(one)).toBe(false);
  });

  it('a failed duet request never blocks the catalogue: songs are offered solo', async () => {
    respond = (query) => (query.filter ? { data: null, error: new Error('timeout') } : { data: ROWS, error: null });
    const songs = await Song.listBigScreen();
    expect(songs).toHaveLength(2);
    expect(songs.every((song) => song.__duet === false)).toBe(true);
  });

  it('the full song (loaded by the karaoke) decides by its own LRC, not by the summary flag', () => {
    const full = { ...ROWS[0], __duet: false, lrc_content: '[00:01.00]{A}a\n[00:02.00]{B}b' };
    expect(isDuetReady(full)).toBe(true);
  });
});

describe('DUET_LRC_FILTER — même réponse que hasDuetTags', () => {
  // PostgREST `imatch` = expression régulière insensible à la casse.
  const server = (lrc) => new RegExp(DUET_LRC_FILTER, 'i').test(lrc);
  it.each([
    ['[00:12.50]{A}Eu sou Ronaldo\n[00:15.00]{B}E eu não', true],
    ['[00:12.50] {a}Eu sou\n[00:15.00]tudo junto', true],
    ['[00:12.50]{AB}Todos juntos', false],
    ['[00:12.50]Sem marcador {A} no meio', false],
    ['[00:12.50]Letra simples\n[00:15.00]Outra linha', false],
  ])('%j → %s', (lrc, expected) => {
    expect(hasDuetTags(lrc)).toBe(expected);
    expect(server(lrc)).toBe(expected);
  });
});

describe('mergeSongLyrics — la letra arrive après le premier écran', () => {
  it('fills the lyrics of the summaries, and keeps a song that already has its own', () => {
    const summary = { id: 1, title: 'Um', __summary: true };
    const full = { id: 2, title: 'Dois', lyrics: 'a letra completa', lyrics_karaoke: null };
    const merged = mergeSongLyrics([summary, full], [
      { id: 1, lyrics: 'primeira linha', lyrics_karaoke: 'primeira  linha' },
      { id: 2, lyrics: 'outra', lyrics_karaoke: 'outra' },
    ]);
    expect(merged[0]).toEqual({ ...summary, lyrics: 'primeira linha', lyrics_karaoke: 'primeira  linha' });
    expect(merged[1]).toBe(full);
  });

  it('no row (failed request): the list is returned untouched', () => {
    const songs = [{ id: 1 }];
    expect(mergeSongLyrics(songs, [])).toBe(songs);
  });
});
