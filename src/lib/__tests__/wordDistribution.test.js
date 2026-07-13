import { describe, it, expect } from 'vitest';
import { tokenizeWords, distributeWords } from '../wordDistribution';

describe('tokenizeWords', () => {
  it('splits on whitespace and drops empties', () => {
    expect(tokenizeWords('Camarada  quer   CPF')).toEqual(['Camarada', 'quer', 'CPF']);
  });
  it('keeps punctuation attached to the word', () => {
    expect(tokenizeWords('Olá, mundo!')).toEqual(['Olá,', 'mundo!']);
  });
  it('returns [] for empty/whitespace-only text', () => {
    expect(tokenizeWords('')).toEqual([]);
    expect(tokenizeWords('   ')).toEqual([]);
    expect(tokenizeWords(null)).toEqual([]);
  });
});

describe('distributeWords', () => {
  it('is deterministic for the same input', () => {
    const a = distributeWords('Camarada quer CPF', 12.4, 15.2);
    const b = distributeWords('Camarada quer CPF', 12.4, 15.2);
    expect(a).toEqual(b);
  });

  it('preserves the exact line start and end', () => {
    const words = distributeWords('Camarada quer CPF', 12.4, 15.2);
    expect(words[0].start).toBeCloseTo(12.4, 6);
    expect(words[words.length - 1].end).toBeCloseTo(15.2, 6);
  });

  it('produces ordered, non-overlapping words', () => {
    const words = distributeWords('Um dois três quatro cinco', 0, 5);
    for (let i = 1; i < words.length; i += 1) {
      expect(words[i].start).toBeGreaterThanOrEqual(words[i - 1].end - 1e-9);
    }
  });

  it('weights longer words with more duration than shorter ones (all else equal)', () => {
    const words = distributeWords('a bbbbbbbbbb c', 0, 3);
    const durOf = (w) => w.end - w.start;
    expect(durOf(words[1])).toBeGreaterThan(durOf(words[0]));
    expect(durOf(words[1])).toBeGreaterThan(durOf(words[2]));
  });

  it('gives trailing punctuation extra weight (implies a pause)', () => {
    const withPause = distributeWords('parar, seguir', 0, 2);
    const noPause = distributeWords('parar seguir', 0, 2);
    const dur = (arr, i) => arr[i].end - arr[i].start;
    // Le premier mot ("parar,") doit occuper une part plus grande qu'un "parar" sans virgule.
    expect(dur(withPause, 0)).toBeGreaterThan(dur(noPause, 0));
  });

  it('returns zero-width words when the line has zero duration', () => {
    const words = distributeWords('a b', 5, 5);
    expect(words.every((w) => w.start === 5 && w.end === 5)).toBe(true);
  });

  it('returns [] for empty text', () => {
    expect(distributeWords('', 0, 3)).toEqual([]);
  });

  it('falls back to proportional distribution when the line is too short for the floor', () => {
    const words = distributeWords('um dois três quatro cinco seis sete oito', 0, 0.3, { minWordDuration: 0.12 });
    expect(words).toHaveLength(8);
    expect(words[words.length - 1].end).toBeCloseTo(0.3, 6);
    for (let i = 1; i < words.length; i += 1) {
      expect(words[i].start).toBeGreaterThanOrEqual(words[i - 1].end - 1e-9);
    }
  });
});
