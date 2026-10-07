import { describe, it, expect } from 'vitest';
import { DIFFICULTY_AUTO, difficultyChoiceOf, resolveDifficultyFields } from '../songDifficulty';

const words = (count) => Array.from({ length: count }, (_, index) => `palavra${index}`).join(' ');

describe('Dificuldade no admin — « Automática » ou escolhida à mão', () => {
  it('a new song starts on « Automática »', () => {
    expect(difficultyChoiceOf(undefined)).toBe(DIFFICULTY_AUTO);
    expect(difficultyChoiceOf({ difficulty: null, difficulty_manual: false })).toBe(DIFFICULTY_AUTO);
  });

  it('a backfilled song (value, not manual) is « Automática »', () => {
    expect(difficultyChoiceOf({ difficulty: 'medium', difficulty_manual: false })).toBe(DIFFICULTY_AUTO);
  });

  it('a value chosen by hand is shown as chosen', () => {
    expect(difficultyChoiceOf({ difficulty: 'hard', difficulty_manual: true })).toBe('hard');
  });

  it('before the difficulty_manual column exists, a value can only be a manual choice: never overwritten', () => {
    expect(difficultyChoiceOf({ difficulty: 'medium' })).toBe('medium');
  });

  it('« Automática »: the difficulty is recomputed from the saved lyrics, every time', () => {
    expect(resolveDifficultyFields({ choice: DIFFICULTY_AUTO, lyrics: words(100) })).toEqual({ difficulty: 'easy', difficulty_manual: false });
    expect(resolveDifficultyFields({ choice: DIFFICULTY_AUTO, lyrics: words(300) })).toEqual({ difficulty: 'hard', difficulty_manual: false });
  });

  it('« Automática » without lyrics: nothing to count, the column stays empty', () => {
    expect(resolveDifficultyFields({ choice: DIFFICULTY_AUTO, lyrics: '' })).toEqual({ difficulty: null, difficulty_manual: false });
  });

  it('a manual choice is written as is, whatever the lyrics', () => {
    expect(resolveDifficultyFields({ choice: 'medium', lyrics: words(600) })).toEqual({ difficulty: 'medium', difficulty_manual: true });
  });
});
