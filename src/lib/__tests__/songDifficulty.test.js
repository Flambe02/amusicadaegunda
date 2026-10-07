import { describe, it, expect } from 'vitest';
import { countLyricsWords, estimateDifficultyKey } from '../songDifficulty';
import { DIFFICULTY, getDifficulty } from '@/tv/lib/songMeta';

const words = (count) => Array.from({ length: count }, (_, index) => `palavra${index}`).join(' ');

describe('songDifficulty — la règle unique (nombre de mots de la letra)', () => {
  it.each([
    [1, 'easy'], [164, 'easy'], [165, 'medium'], [279, 'medium'], [280, 'hard'], [700, 'hard'],
  ])('%i words → %s', (count, key) => {
    expect(estimateDifficultyKey(words(count))).toBe(key);
  });

  it('no lyrics: nothing to count, no key', () => {
    for (const empty of [null, undefined, '', '   ', '<p> </p>']) expect(estimateDifficultyKey(empty)).toBeNull();
  });

  it('HTML tags and line breaks are not words', () => {
    expect(countLyricsWords('<p>um  dois</p>' + String.fromCharCode(10, 10) + '<br/>três')).toBe(3);
  });

  it('the TV label is the same rule: column first, then the estimate, « Médio » without lyrics', () => {
    expect(getDifficulty({ lyrics: words(100) })).toBe(DIFFICULTY.EASY);
    expect(getDifficulty({ lyrics: words(200) })).toBe(DIFFICULTY.MEDIUM);
    expect(getDifficulty({ lyrics: words(300) })).toBe(DIFFICULTY.HARD);
    expect(getDifficulty({ lyrics: '' })).toBe(DIFFICULTY.MEDIUM);
    expect(getDifficulty({ difficulty: 'hard', lyrics: words(10) })).toBe(DIFFICULTY.HARD);
  });

  it('writing the estimate in the column never changes a TV label', () => {
    for (const count of [1, 164, 165, 279, 280, 600]) {
      const lyrics = words(count);
      expect(getDifficulty({ difficulty: estimateDifficultyKey(lyrics) })).toBe(getDifficulty({ lyrics }));
    }
  });
});
