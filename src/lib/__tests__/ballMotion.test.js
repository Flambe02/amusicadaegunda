import { describe, it, expect } from 'vitest';
import {
  normalizeWords, normalizeEnds, setWordStart, nudgeWordStart,
  activeWordAt, validateLineWords, arcAmplitude, ballAt, BALL_INTENSITY,
} from '@/lib/ballMotion';

const mk = (starts) => starts.map((s, i) => ({ id: `w${i}`, text: `w${i}`, start: s, end: s }));

describe('normalizeEnds', () => {
  it('sets each end to the next start and the last end to phraseEnd', () => {
    const out = normalizeEnds(mk([1, 2, 3]), 5);
    expect(out.map((w) => w.end)).toEqual([2, 3, 5]);
  });
});

describe('normalizeWords', () => {
  it('clamps starts into the phrase and keeps them chronological', () => {
    const out = normalizeWords(mk([0.5, 0.4, 10]), 1, 4); // désordonné + hors bornes
    const starts = out.map((w) => w.start);
    for (let i = 1; i < starts.length; i += 1) expect(starts[i]).toBeGreaterThan(starts[i - 1]);
    expect(starts[0]).toBeGreaterThanOrEqual(1);
    expect(out[out.length - 1].end).toBeCloseTo(4);
  });
});

describe('setWordStart', () => {
  it('moves a word start and pulls the previous word end to the same instant', () => {
    const out = setWordStart(mk([1, 2, 3]), 1, 2.5, 0, 5);
    expect(out[1].start).toBeCloseTo(2.5);
    expect(out[0].end).toBeCloseTo(2.5); // frontière nette
  });
  it('never lets a word cross its neighbours', () => {
    const out = setWordStart(mk([1, 2, 3]), 1, 99, 0, 5); // tente de dépasser le mot suivant
    expect(out[1].start).toBeLessThan(out[2].start);
    expect(out[1].start).toBeGreaterThan(out[0].start);
  });
  it('keeps the first word at or after phraseStart', () => {
    const out = setWordStart(mk([1, 2, 3]), 0, -5, 0.7, 5);
    expect(out[0].start).toBeGreaterThanOrEqual(0.7);
  });
});

describe('nudgeWordStart', () => {
  it('shifts by a delta in seconds', () => {
    const out = nudgeWordStart(mk([1, 2, 3]), 1, 0.1, 0, 5);
    expect(out[1].start).toBeCloseTo(2.1);
  });
});

describe('activeWordAt', () => {
  it('returns the last word whose start is <= t, or -1 before the first', () => {
    const w = mk([1, 2, 3]);
    expect(activeWordAt(w, 0.5)).toBe(-1);
    expect(activeWordAt(w, 1)).toBe(0);
    expect(activeWordAt(w, 2.5)).toBe(1);
    expect(activeWordAt(w, 9)).toBe(2);
  });
});

describe('validateLineWords', () => {
  it('flags a word that starts before the phrase', () => {
    const issues = validateLineWords([{ text: 'x', start: -1, end: 1 }], 0, 5);
    expect(issues.some((i) => i.level === 'error')).toBe(true);
  });
  it('passes clean chronological words', () => {
    const words = normalizeEnds(mk([1, 2, 3]), 5);
    expect(validateLineWords(words, 0, 5).filter((i) => i.level === 'error')).toHaveLength(0);
  });
});

describe('ball motion', () => {
  it('amplitude grows with intensity and is capped', () => {
    expect(arcAmplitude(0, 1, 'suave')).toBeLessThan(arcAmplitude(0, 1, 'marcada'));
    expect(arcAmplitude(99999, 1, 'marcada')).toBeLessThanOrEqual(BALL_INTENSITY.marcada.max);
  });
  it('ball lands exactly on a word center at that word start time', () => {
    const centers = [{ x: 0, y: 0 }, { x: 100, y: 0 }, { x: 240, y: 0 }];
    const starts = [1, 2, 3];
    const at2 = ballAt(2, centers, starts, 5, { intensity: 'classica' });
    expect(at2.x).toBeCloseTo(100); // pile sur le 2e mot
    expect(at2.y).toBeCloseTo(0);   // posé (arc = 0 à p=0)
  });
  it('reaches its highest point mid-interval (arc up = negative y offset)', () => {
    const centers = [{ x: 0, y: 0 }, { x: 100, y: 0 }];
    const mid = ballAt(1.5, centers, [1, 2], 5, { intensity: 'marcada' });
    expect(mid.y).toBeLessThan(0); // au-dessus de la ligne de repos
  });
  it('respects reduced motion (no vertical arc)', () => {
    const centers = [{ x: 0, y: 0 }, { x: 100, y: 0 }];
    const mid = ballAt(1.5, centers, [1, 2], 5, { intensity: 'marcada', reducedMotion: true });
    expect(mid.y).toBeCloseTo(0);
  });
});
