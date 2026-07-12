import { describe, it, expect } from 'vitest';
import {
  normalizeText,
  themeLabel,
  monthKey,
  monthKeyLabel,
  buildSearchIndex,
  deriveThemes,
  deriveMonths,
  filterAndSortSongs,
  groupByMonth,
  pickRandomSong,
} from '../karaokeCatalog';

const SONGS = [
  { id: '1', title: 'Camarada Quer CPF', subtitle: 'Espião russo', category: 'internacional', release_date: '2026-07-06', hashtags: ['Rússia'] },
  { id: '2', title: 'Independência ou Gol', subtitle: 'Brasil x Noruega', category: 'esporte', release_date: '2026-07-01' },
  { id: '3', title: 'Messi é o Melhor', subtitle: 'Ronaldo entrou na roda', category: 'esporte', release_date: '2026-06-15' },
  { id: '4', title: 'Como é Grande', subtitle: 'Zelle', category: 'politica', release_date: '2026-06-01' },
];

describe('normalizeText', () => {
  it('is case- and accent-insensitive and trims', () => {
    expect(normalizeText('  POLÍTICA ')).toBe('politica');
    expect(normalizeText('Rússia')).toBe('russia');
  });
});

describe('themeLabel / monthKey', () => {
  it('maps known categories', () => {
    expect(themeLabel('politica')).toBe('Política');
    expect(themeLabel('esporte')).toBe('Esporte');
  });
  it('builds month keys and labels', () => {
    expect(monthKey({ release_date: '2026-07-06' })).toBe('2026-07');
    expect(monthKeyLabel('2026-07')).toBe('Julho 2026');
  });
});

describe('buildSearchIndex', () => {
  it('includes title, theme, month, year and tags (normalized)', () => {
    const idx = buildSearchIndex(SONGS[0]);
    expect(idx).toContain('camarada');
    expect(idx).toContain('internacional');
    expect(idx).toContain('julho');
    expect(idx).toContain('2026');
    expect(idx).toContain('russia'); // accent-stripped tag
  });
});

describe('deriveThemes / deriveMonths', () => {
  it('derives themes from real data, Todos first, preferred order', () => {
    const themes = deriveThemes(SONGS);
    expect(themes[0]).toEqual({ value: null, label: 'Todos' });
    const values = themes.map((t) => t.value);
    expect(values).toContain('politica');
    expect(values).toContain('esporte');
    expect(values).toContain('internacional');
    // esporte (préféré) avant les non listés — internacional est aussi préféré
    expect(values.indexOf('politica')).toBeLessThan(values.indexOf('internacional'));
  });
  it('derives months descending with Todos first', () => {
    const months = deriveMonths(SONGS);
    expect(months[0].value).toBeNull();
    expect(months[1].value).toBe('2026-07');
    expect(months[2].value).toBe('2026-06');
  });
});

describe('filterAndSortSongs', () => {
  it('filters by accent-insensitive search across fields', () => {
    expect(filterAndSortSongs(SONGS, { query: 'cpf' }).map((s) => s.id)).toEqual(['1']);
    expect(filterAndSortSongs(SONGS, { query: 'política' }).map((s) => s.id)).toEqual(['4']);
    expect(filterAndSortSongs(SONGS, { query: 'politica' }).map((s) => s.id)).toEqual(['4']);
    expect(filterAndSortSongs(SONGS, { query: 'julho' }).map((s) => s.id).sort()).toEqual(['1', '2']);
  });
  it('filters by theme and by month', () => {
    expect(filterAndSortSongs(SONGS, { theme: 'esporte' }).map((s) => s.id).sort()).toEqual(['2', '3']);
    expect(filterAndSortSongs(SONGS, { month: '2026-06' }).map((s) => s.id).sort()).toEqual(['3', '4']);
  });
  it('sorts newest, oldest and A-Z', () => {
    expect(filterAndSortSongs(SONGS, { sort: 'newest' }).map((s) => s.id)).toEqual(['1', '2', '3', '4']);
    expect(filterAndSortSongs(SONGS, { sort: 'oldest' }).map((s) => s.id)).toEqual(['4', '3', '2', '1']);
    expect(filterAndSortSongs(SONGS, { sort: 'az' })[0].title).toBe('Camarada Quer CPF');
  });
  it('does not mutate the input array', () => {
    const copy = [...SONGS];
    filterAndSortSongs(SONGS, { sort: 'az' });
    expect(SONGS).toEqual(copy);
  });
});

describe('groupByMonth', () => {
  it('groups sorted songs by month without empty groups', () => {
    const sorted = filterAndSortSongs(SONGS, { sort: 'newest' });
    const groups = groupByMonth(sorted);
    expect(groups.map((g) => g.label)).toEqual(['Julho 2026', 'Junho 2026']);
    expect(groups[0].songs).toHaveLength(2);
    expect(groups[1].songs).toHaveLength(2);
  });
});

describe('pickRandomSong', () => {
  it('returns the only song when a single one is eligible', () => {
    expect(pickRandomSong([SONGS[0]])).toBe(SONGS[0]);
  });
  it('returns null on empty input', () => {
    expect(pickRandomSong([])).toBeNull();
  });
  it('avoids recent ids when possible', () => {
    const chosen = pickRandomSong(SONGS, { recentIds: ['1', '2', '3'], rng: () => 0 });
    expect(chosen.id).toBe('4'); // seul non récent
  });
  it('uses stable ids, not indexes (rng=0 picks first of pool)', () => {
    const chosen = pickRandomSong(SONGS, { recentIds: [], rng: () => 0 });
    expect(chosen.id).toBe('1');
  });
});
