import { describe, it, expect } from 'vitest';
import {
  buildSearchText,
  filterEntries,
  getTileCandidates,
  matchesQuery,
  monthChipLabel,
  monthOptions,
  publishedNewestFirst,
  themeOptions,
} from '../searchCatalog';

const song = (id, title, date, extra = {}) => ({ id, title, release_date: date, status: 'published', ...extra });

const A = song(1, 'Tá Chovendo de Novo', '2026-09-21', { category: 'politica', lyrics: 'a chuva cai no Planalto' });
const B = song(2, 'Pix do Pão', '2026-09-07', { category: 'economia', subtitle: 'O preço do café' });
const C = song(3, 'Réveillon', '2025-12-29', { category: 'politica', lyrics_karaoke: 'fogos na praia', lyrics: 'antiga' });
const DRAFT = song(4, 'Rascunho', '2026-09-14', { status: 'draft' });

const entries = (songs) => publishedNewestFirst(songs).map((s) => ({ song: s, searchText: buildSearchText(s) }));

describe('searchCatalog', () => {
  it('keeps only published songs, newest first', () => {
    expect(publishedNewestFirst([C, DRAFT, B, A]).map((s) => s.id)).toEqual([1, 2, 3]);
  });

  it('searches title, lyrics (the public text) and subtitle — case and accents ignored, every word must match', () => {
    expect(matchesQuery(buildSearchText(A), 'ta chovendo')).toBe(true);
    expect(matchesQuery(buildSearchText(A), 'PLANALTO chuva')).toBe(true);
    expect(matchesQuery(buildSearchText(B), 'cafe')).toBe(true); // subtitle
    expect(matchesQuery(buildSearchText(C), 'fogos')).toBe(true); // lyrics_karaoke prioritaire
    expect(matchesQuery(buildSearchText(C), 'antiga')).toBe(false);
    expect(matchesQuery(buildSearchText(A), 'chuva neve')).toBe(false);
  });

  it('offers only the months that have songs, most recent first', () => {
    expect(monthOptions([A, B, C])).toEqual(['2026-09', '2025-12']);
  });

  it('labels a month chip with its year only when it differs from the latest year', () => {
    expect(monthChipLabel('2026-09', '2026')).toBe('Setembro');
    expect(monthChipLabel('2025-12', '2026')).toBe('Dezembro 2025');
  });

  it('offers the real categories, without « Todos »', () => {
    expect(themeOptions([A, B, C]).map((t) => t.value)).toEqual(['politica', 'economia']);
  });

  it('combines month and theme when nothing is typed', () => {
    const list = entries([A, B, C]);
    expect(filterEntries(list, { month: '2026-09' }).map((s) => s.id)).toEqual([1, 2]);
    expect(filterEntries(list, { month: '2026-09', theme: 'politica' }).map((s) => s.id)).toEqual([1]);
    expect(filterEntries(list, { theme: 'politica' }).map((s) => s.id)).toEqual([1, 3]);
    expect(filterEntries(list, { month: '2025-12', theme: 'economia' })).toEqual([]);
  });

  it('a typed search covers the whole catalogue, ignoring month and theme', () => {
    const list = entries([A, B, C]);
    expect(filterEntries(list, { query: 'fogos', month: '2026-09', theme: 'economia' }).map((s) => s.id)).toEqual([3]);
  });

  it('tile images: Short first, then the full track thumbnail, then the cover', () => {
    const withShort = { youtube_music_url: 'https://www.youtube.com/shorts/AAAAAAAAAAA', youtube_url: 'https://music.youtube.com/watch?v=BBBBBBBBBBB', cover_image: '/c.jpg' };
    expect(getTileCandidates(withShort)).toEqual([
      'https://i.ytimg.com/vi/AAAAAAAAAAA/oar2.jpg',
      'https://i.ytimg.com/vi/AAAAAAAAAAA/hqdefault.jpg',
      'https://i.ytimg.com/vi/BBBBBBBBBBB/hqdefault.jpg',
      '/c.jpg',
    ]);
    const noShort = { youtube_music_url: null, youtube_url: 'https://music.youtube.com/watch?v=BBBBBBBBBBB' };
    expect(getTileCandidates(noShort)).toEqual(['https://i.ytimg.com/vi/BBBBBBBBBBB/hqdefault.jpg']);
    expect(getTileCandidates({ title: 'Sem nada' })).toEqual([]); // → case sombre avec le titre
  });
});
