import { describe, it, expect } from 'vitest';
import {
  DIFFICULTY_KEY, DIFFICULTY_LABEL, DIFFICULTY_FILTER_OPTIONS,
  normalizeDifficulty, estimateDifficultyFromLyrics,
  getSongDifficultyKey, getSongDifficultyLabel, getDifficultyBadge,
} from '../karaokeDifficulty';

describe('normalizeDifficulty', () => {
  it('accepts the canonical keys', () => {
    expect(normalizeDifficulty('easy')).toBe('easy');
    expect(normalizeDifficulty('medium')).toBe('medium');
    expect(normalizeDifficulty('hard')).toBe('hard');
  });

  it('accepts Portuguese spellings, with or without accent, any case', () => {
    expect(normalizeDifficulty('facil')).toBe('easy');
    expect(normalizeDifficulty('Fácil')).toBe('easy');
    expect(normalizeDifficulty('FÁCIL')).toBe('easy');
    expect(normalizeDifficulty('media')).toBe('medium');
    expect(normalizeDifficulty('média')).toBe('medium');
    expect(normalizeDifficulty('medio')).toBe('medium');
    expect(normalizeDifficulty('médio')).toBe('medium');
    expect(normalizeDifficulty('dificil')).toBe('hard');
    expect(normalizeDifficulty('difícil')).toBe('hard');
  });

  it('returns null for absent, empty or unrecognized values — never throws', () => {
    expect(normalizeDifficulty(null)).toBeNull();
    expect(normalizeDifficulty(undefined)).toBeNull();
    expect(normalizeDifficulty('')).toBeNull();
    expect(normalizeDifficulty('   ')).toBeNull();
    expect(normalizeDifficulty('legendary')).toBeNull();
    expect(normalizeDifficulty(42)).toBeNull();
  });
});

describe('estimateDifficultyFromLyrics', () => {
  const words = (n) => Array.from({ length: n }, (_, i) => `palavra${i}`).join(' ');

  it('never invents a difficulty when there is nothing to measure', () => {
    expect(estimateDifficultyFromLyrics('')).toBeNull();
    expect(estimateDifficultyFromLyrics(null)).toBeNull();
    expect(estimateDifficultyFromLyrics('   ')).toBeNull();
  });

  it('classifies by word-count thresholds (165 / 280)', () => {
    expect(estimateDifficultyFromLyrics(words(50))).toBe('easy');
    expect(estimateDifficultyFromLyrics(words(164))).toBe('easy');
    expect(estimateDifficultyFromLyrics(words(165))).toBe('medium');
    expect(estimateDifficultyFromLyrics(words(279))).toBe('medium');
    expect(estimateDifficultyFromLyrics(words(280))).toBe('hard');
    expect(estimateDifficultyFromLyrics(words(400))).toBe('hard');
  });

  it('strips HTML tags before counting', () => {
    expect(estimateDifficultyFromLyrics(`<p>${words(50)}</p>`)).toBe('easy');
  });
});

describe('getSongDifficultyKey — manual value always wins', () => {
  it('prefers song.difficulty over the estimate, even when it would classify differently', () => {
    const song = { difficulty: 'hard', lyrics: 'uma frase curtinha' }; // estimation seria "easy"
    expect(getSongDifficultyKey(song)).toBe('hard');
  });

  it('normalizes a legacy free-text value before using it', () => {
    expect(getSongDifficultyKey({ difficulty: 'Difícil', lyrics: 'x' })).toBe('hard');
  });

  it('falls back to the lyrics estimate when there is no manual value', () => {
    const words = Array.from({ length: 200 }, (_, i) => `w${i}`).join(' ');
    expect(getSongDifficultyKey({ difficulty: null, lyrics: words })).toBe('medium');
  });

  it('prefers lyrics_karaoke over lyrics for the estimate (resolveLyricsText contract)', () => {
    const song = {
      difficulty: null,
      lyrics: Array.from({ length: 400 }, (_, i) => `w${i}`).join(' '), // hard
      lyrics_karaoke: Array.from({ length: 50 }, (_, i) => `w${i}`).join(' '), // easy
    };
    expect(getSongDifficultyKey(song)).toBe('easy');
  });

  it('is UNKNOWN (null) rather than invented when there is no manual value and no lyrics', () => {
    expect(getSongDifficultyKey({ difficulty: null, lyrics: '' })).toBeNull();
    expect(getSongDifficultyKey({})).toBeNull();
  });
});

describe('getSongDifficultyLabel / getDifficultyBadge', () => {
  it('returns the pt-BR labels required for this screen (Fácil / Média / Difícil)', () => {
    expect(getSongDifficultyLabel({ difficulty: 'easy' })).toBe('Fácil');
    expect(getSongDifficultyLabel({ difficulty: 'medium' })).toBe('Média');
    expect(getSongDifficultyLabel({ difficulty: 'hard' })).toBe('Difícil');
  });

  it('returns null rather than a fabricated label when unknown', () => {
    expect(getSongDifficultyLabel({ difficulty: null, lyrics: '' })).toBeNull();
  });

  it('getDifficultyBadge pairs the key with its label, or null', () => {
    expect(getDifficultyBadge({ difficulty: 'medium' })).toEqual({ key: 'medium', label: 'Média' });
    expect(getDifficultyBadge({ difficulty: null, lyrics: '' })).toBeNull();
  });
});

describe('DIFFICULTY_FILTER_OPTIONS', () => {
  it('starts with Todas (no filter) followed by the three levels', () => {
    expect(DIFFICULTY_FILTER_OPTIONS).toEqual([
      { value: null, label: 'Todas' },
      { value: 'easy', label: 'Fácil' },
      { value: 'medium', label: 'Média' },
      { value: 'hard', label: 'Difícil' },
    ]);
  });
});

describe('DIFFICULTY_KEY / DIFFICULTY_LABEL', () => {
  it('are consistent with each other', () => {
    for (const key of Object.values(DIFFICULTY_KEY)) {
      expect(typeof DIFFICULTY_LABEL[key]).toBe('string');
    }
  });
});
