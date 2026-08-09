import { beforeEach, describe, expect, it, vi } from 'vitest';
import { DEFAULT_LEARN_LEVEL, LEARN_LEVELS, getLearnLevel, setLearnLevel } from '@/lib/learnLevel';

beforeEach(() => {
  localStorage.clear();
});

describe('getLearnLevel', () => {
  it('renvoie le niveau par défaut (beginner) sans choix préalable', () => {
    expect(getLearnLevel()).toBe('beginner');
    expect(getLearnLevel()).toBe(DEFAULT_LEARN_LEVEL);
  });

  it('renvoie le niveau mémorisé après un setLearnLevel', () => {
    setLearnLevel('advanced');
    expect(getLearnLevel()).toBe('advanced');
  });

  it('ignore une valeur corrompue en storage et retombe sur le défaut', () => {
    localStorage.setItem('learn-level-v1', 'nonsense');
    expect(getLearnLevel()).toBe('beginner');
  });

  it('ne lève jamais quand localStorage.getItem échoue', () => {
    const spy = vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => { throw new Error('boom'); });
    expect(getLearnLevel()).toBe('beginner');
    spy.mockRestore();
  });
});

describe('setLearnLevel', () => {
  it('accepte les trois niveaux valides', () => {
    for (const level of LEARN_LEVELS) {
      expect(setLearnLevel(level)).toBe(true);
      expect(getLearnLevel()).toBe(level);
    }
  });

  it('refuse un niveau invalide sans écrire', () => {
    setLearnLevel('beginner');
    expect(setLearnLevel('expert')).toBe(false);
    expect(getLearnLevel()).toBe('beginner');
  });

  it('ne lève jamais quand localStorage.setItem échoue', () => {
    const spy = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw new Error('QuotaExceededError'); });
    expect(() => setLearnLevel('advanced')).not.toThrow();
    expect(setLearnLevel('advanced')).toBe(false);
    spy.mockRestore();
  });
});
