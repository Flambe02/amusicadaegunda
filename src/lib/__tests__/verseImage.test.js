import { describe, it, expect } from 'vitest';
import { nextVerseSelection, wrapText, songPageUrl } from '../verseImage';

describe('nextVerseSelection — 1 à 3 phrases consécutives', () => {
  it('starts with the tapped line, then grows with neighbours up to 3', () => {
    let s = nextVerseSelection(null, 4);
    expect(s).toEqual({ start: 4, end: 4 });
    s = nextVerseSelection(s, 5);
    expect(s).toEqual({ start: 4, end: 5 });
    s = nextVerseSelection(s, 3);
    expect(s).toEqual({ start: 3, end: 5 });
    // Déjà 3 : une voisine de plus recommence une nouvelle sélection.
    expect(nextVerseSelection(s, 6)).toEqual({ start: 6, end: 6 });
  });

  it('a far line starts over; tapping an end removes it; the middle keeps only it', () => {
    expect(nextVerseSelection({ start: 2, end: 3 }, 9)).toEqual({ start: 9, end: 9 });
    expect(nextVerseSelection({ start: 2, end: 4 }, 2)).toEqual({ start: 3, end: 4 });
    expect(nextVerseSelection({ start: 2, end: 4 }, 4)).toEqual({ start: 2, end: 3 });
    expect(nextVerseSelection({ start: 2, end: 4 }, 3)).toEqual({ start: 3, end: 3 });
    expect(nextVerseSelection({ start: 2, end: 2 }, 2)).toBeNull();
  });
});

describe('wrapText', () => {
  const measure = (t) => t.length * 10; // 10 px par caractère
  it('breaks on words within the width, never splitting a word', () => {
    expect(wrapText('Fizeram feriado da minha demissão', 160, measure)).toEqual(['Fizeram feriado', 'da minha', 'demissão']);
    expect(wrapText('Supercalifragilístico', 50, measure)).toEqual(['Supercalifragilístico']);
    expect(wrapText('', 100, measure)).toEqual([]);
  });
});

describe('songPageUrl', () => {
  it('links to the song page, or the home page without slug', () => {
    expect(songPageUrl('15-de-novembro')).toBe('https://www.amusicadasegunda.com/musica/15-de-novembro/');
    expect(songPageUrl(null)).toBe('https://www.amusicadasegunda.com/');
  });
});
