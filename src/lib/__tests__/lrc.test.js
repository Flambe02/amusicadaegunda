import { describe, it, expect } from 'vitest';
import {
  splitLyricsLines, formatTimestamp, buildLrc, parseLrc, activeLineIndex,
  hasLrcContent, hasDuetTags,
} from '../lrc';

// Tests de caractérisation : verrouillent le comportement ACTUEL du parser/serializer
// LRC avant toute évolution (Stage 2). Les chansons existantes en dépendent.

describe('splitLyricsLines', () => {
  it('trims, drops empty lines, normalizes CRLF', () => {
    expect(splitLyricsLines('a\r\n\n  b  \r\n')).toEqual(['a', 'b']);
    expect(splitLyricsLines('')).toEqual([]);
    expect(splitLyricsLines(null)).toEqual([]);
  });
});

describe('formatTimestamp', () => {
  it('formats mm:ss.cc with centiseconds', () => {
    expect(formatTimestamp(0)).toBe('00:00.00');
    expect(formatTimestamp(12.5)).toBe('00:12.50');
    expect(formatTimestamp(64.2)).toBe('01:04.20');
  });
  it('guards NaN / negative', () => {
    expect(formatTimestamp(-3)).toBe('00:00.00');
    expect(formatTimestamp(NaN)).toBe('00:00.00');
  });
});

describe('buildLrc / parseLrc round-trip', () => {
  it('serializes only lines with a finite time, sorted by time', () => {
    const lines = [
      { text: 'Segunda', time: 3, endTime: null },
      { text: 'Primeira', time: 1, endTime: null },
      { text: 'Sem tempo', time: null, endTime: null },
    ];
    expect(buildLrc(lines)).toBe('[00:01.00]Primeira\n[00:03.00]Segunda');
  });

  it('emits an optional end tag when endTime > time (project extension)', () => {
    const lrc = buildLrc([{ text: 'Olá', time: 1, endTime: 2.5 }]);
    expect(lrc).toBe('[00:01.00]Olá[00:02.50]');
    const parsed = parseLrc(lrc);
    expect(parsed).toEqual([{ time: 1, text: 'Olá', endTime: 2.5, singer: null }]);
  });

  it('drops an end tag that is not strictly after the start', () => {
    expect(buildLrc([{ text: 'x', time: 2, endTime: 2 }])).toBe('[00:02.00]x');
  });

  it('parses a leading singer tag {A}/{B} additively', () => {
    const parsed = parseLrc('[00:01.00]{A}Eu sou\n[00:02.00]{B}Tu és');
    expect(parsed[0]).toEqual({ time: 1, text: 'Eu sou', endTime: null, singer: 'A' });
    expect(parsed[1].singer).toBe('B');
  });

  it('round-trips a mixed document deterministically', () => {
    const lines = [
      { text: 'A', time: 1, endTime: 1.8 },
      { text: 'B', time: 2, endTime: null },
    ];
    expect(parseLrc(buildLrc(lines))).toEqual([
      { time: 1, text: 'A', endTime: 1.8, singer: null },
      { time: 2, text: 'B', endTime: null, singer: null },
    ]);
  });
});

describe('activeLineIndex', () => {
  const parsed = [
    { time: 1, text: 'A', endTime: null },
    { time: 3, text: 'B', endTime: 4 },
    { time: 6, text: 'C', endTime: null },
  ];
  it('returns -1 before the first line', () => {
    expect(activeLineIndex(parsed, 0.5)).toBe(-1);
  });
  it('holds a line until the next when no endTime', () => {
    expect(activeLineIndex(parsed, 2.9)).toBe(0);
    expect(activeLineIndex(parsed, 3.1)).toBe(1);
  });
  it('returns -1 during a gap after an explicit endTime', () => {
    expect(activeLineIndex(parsed, 4.5)).toBe(-1);
    expect(activeLineIndex(parsed, 6.2)).toBe(2);
  });
});

describe('hasLrcContent / hasDuetTags', () => {
  it('detects usable timed content', () => {
    expect(hasLrcContent('[00:01.00]x')).toBe(true);
    expect(hasLrcContent('no tags here')).toBe(false);
  });
  it('detects real duet tags', () => {
    expect(hasDuetTags('[00:01.00]{A}x\n[00:02.00]{B}y')).toBe(true);
    expect(hasDuetTags('[00:01.00]x')).toBe(false);
  });
});
