import { describe, it, expect } from 'vitest';
import { validateTiming } from '../timingValidation';

const codes = (r) => r.issues.map((i) => i.code);

describe('validateTiming — lines', () => {
  it('passes clean line timing with no issues', () => {
    const r = validateTiming([
      { text: 'A', time: 1, endTime: 2 },
      { text: 'B', time: 2, endTime: 3 },
    ]);
    expect(r.errors).toBe(0);
    expect(r.blocking).toBe(false);
  });

  it('flags end before start as a blocking error', () => {
    const r = validateTiming([{ text: 'A', time: 5, endTime: 4 }]);
    expect(codes(r)).toContain('line-end-before-start');
    expect(r.blocking).toBe(true);
  });

  it('flags negative start/end', () => {
    const r = validateTiming([{ text: 'A', time: -1, endTime: -2 }]);
    expect(codes(r)).toEqual(expect.arrayContaining(['line-negative-start', 'line-negative-end']));
  });

  it('warns on an unmarked line between two marked lines', () => {
    const r = validateTiming([
      { text: 'A', time: 1, endTime: null },
      { text: 'gap', time: null, endTime: null },
      { text: 'C', time: 3, endTime: null },
    ]);
    expect(codes(r)).toContain('line-missing-timing');
    expect(r.blocking).toBe(false);
  });

  it('does not warn about trailing unmarked lines', () => {
    const r = validateTiming([
      { text: 'A', time: 1, endTime: null },
      { text: 'later', time: null, endTime: null },
    ]);
    expect(codes(r)).not.toContain('line-missing-timing');
  });

  it('warns when a line starts after a known video duration', () => {
    const r = validateTiming([{ text: 'A', time: 200, endTime: null }], { duration: 120 });
    expect(codes(r)).toContain('line-after-video');
  });

  it('reports an info for unusually long silent gaps', () => {
    const r = validateTiming([
      { text: 'A', time: 1, endTime: 2 },
      { text: 'B', time: 30, endTime: null },
    ]);
    expect(codes(r)).toContain('big-gap');
    expect(r.infos).toBeGreaterThan(0);
  });
});

describe('validateTiming — words', () => {
  it('accepts well-formed word timing inside the line', () => {
    const r = validateTiming([{
      text: 'Camarada quer CPF', time: 12.4, endTime: 15.2,
      words: [
        { text: 'Camarada', start: 12.4, end: 13.2 },
        { text: 'quer', start: 13.2, end: 13.8 },
        { text: 'CPF', start: 13.8, end: 15.2 },
      ],
    }]);
    expect(r.errors).toBe(0);
  });

  it('errors when a word ends before it starts', () => {
    const r = validateTiming([{
      text: 'x', time: 1, endTime: 3,
      words: [{ text: 'x', start: 2, end: 1.5 }],
    }]);
    expect(codes(r)).toContain('word-end-before-start');
    expect(r.blocking).toBe(true);
  });

  it('errors when a word leaves the parent line bounds', () => {
    const r = validateTiming([{
      text: 'x y', time: 1, endTime: 3,
      words: [
        { text: 'x', start: 0.5, end: 1.5 },
        { text: 'y', start: 1.5, end: 4 },
      ],
    }]);
    expect(codes(r)).toEqual(expect.arrayContaining(['word-before-line', 'word-after-line']));
  });

  it('errors on out-of-order words and warns on overlap', () => {
    const outOfOrder = validateTiming([{
      text: 'a b', time: 0, endTime: 4,
      words: [
        { text: 'a', start: 2, end: 3 },
        { text: 'b', start: 1, end: 1.5 },
      ],
    }]);
    expect(codes(outOfOrder)).toContain('word-out-of-order');

    const overlap = validateTiming([{
      text: 'a b', time: 0, endTime: 4,
      words: [
        { text: 'a', start: 0, end: 2 },
        { text: 'b', start: 1.5, end: 3 },
      ],
    }]);
    expect(codes(overlap)).toContain('word-overlap');
  });

  it('warns when a line declares word mode but has no words', () => {
    const r = validateTiming([{ text: 'x', time: 1, endTime: 2, timingMode: 'word', words: [] }]);
    expect(codes(r)).toContain('line-word-mode-empty');
  });
});
