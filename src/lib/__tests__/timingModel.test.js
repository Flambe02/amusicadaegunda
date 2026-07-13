import { describe, it, expect } from 'vitest';
import {
  parseTimingModel, buildTimingModel, timingModelToEditorLines, resolveSongTiming,
} from '../timingModel';

describe('parseTimingModel', () => {
  it('returns null for absent/invalid input', () => {
    expect(parseTimingModel(null)).toBeNull();
    expect(parseTimingModel(undefined)).toBeNull();
    expect(parseTimingModel({})).toBeNull();
    expect(parseTimingModel({ lines: [] })).toBeNull();
    expect(parseTimingModel('not json')).toBeNull();
  });

  it('parses a well-formed line-only model', () => {
    const model = parseTimingModel({
      schemaVersion: 1, timingMode: 'line',
      lines: [{ id: 'l1', text: 'A', start: 1, end: 2 }],
    });
    expect(model.lines).toHaveLength(1);
    expect(model.lines[0].timingMode).toBe('line');
    expect(model.lines[0].words).toBeUndefined();
  });

  it('parses word-level lines and infers timingMode from presence of words', () => {
    const model = parseTimingModel({
      schemaVersion: 1, timingMode: 'hybrid',
      lines: [
        { id: 'l1', text: 'A', start: 1, end: 2 },
        {
          id: 'l2', text: 'B C', start: 2, end: 4,
          words: [{ id: 'w1', text: 'B', start: 2, end: 3 }, { id: 'w2', text: 'C', start: 3, end: 4 }],
        },
      ],
    });
    expect(model.lines[0].timingMode).toBe('line');
    expect(model.lines[1].timingMode).toBe('word');
    expect(model.lines[1].words).toHaveLength(2);
  });

  it('drops malformed lines (missing text/start) without throwing', () => {
    const model = parseTimingModel({
      schemaVersion: 1,
      lines: [{ text: 'ok', start: 1 }, { start: 2 }, { text: 'no-start' }],
    });
    expect(model.lines).toHaveLength(1);
  });

  it('sorts lines by start time', () => {
    const model = parseTimingModel({
      lines: [{ text: 'B', start: 5 }, { text: 'A', start: 1 }],
    });
    expect(model.lines.map((l) => l.text)).toEqual(['A', 'B']);
  });

  it('accepts a JSON string as input (defensive)', () => {
    const model = parseTimingModel(JSON.stringify({ lines: [{ text: 'A', start: 1 }] }));
    expect(model.lines).toHaveLength(1);
  });
});

describe('buildTimingModel', () => {
  it('ignores unsynced lines (time null), like buildLrc', () => {
    const model = buildTimingModel([
      { text: 'A', time: 1, endTime: 2 },
      { text: 'not yet', time: null, endTime: null },
    ]);
    expect(model.lines).toHaveLength(1);
    expect(model.timingMode).toBe('line');
  });

  it('returns null when nothing is synced', () => {
    expect(buildTimingModel([{ text: 'A', time: null }])).toBeNull();
  });

  it('detects hybrid mode when some lines have words and others do not', () => {
    const model = buildTimingModel([
      { text: 'A', time: 1, endTime: 2 },
      { text: 'B C', time: 2, endTime: 4, words: [{ text: 'B', start: 2, end: 3 }, { text: 'C', start: 3, end: 4 }] },
    ]);
    expect(model.timingMode).toBe('hybrid');
    expect(model.lines[0].timingMode).toBe('line');
    expect(model.lines[1].timingMode).toBe('word');
  });

  it('detects word mode when ALL synced lines have words', () => {
    const model = buildTimingModel([
      { text: 'A', time: 1, endTime: 2, words: [{ text: 'A', start: 1, end: 2 }] },
    ]);
    expect(model.timingMode).toBe('word');
  });
});

describe('timingModelToEditorLines / round-trip', () => {
  it('round-trips line + word data through build → editor lines', () => {
    const editorLines = [
      { text: 'A', time: 1, endTime: 2 },
      { text: 'B C', time: 2, endTime: 4, words: [{ text: 'B', start: 2, end: 3 }, { text: 'C', start: 3, end: 4 }] },
    ];
    const model = buildTimingModel(editorLines);
    const back = timingModelToEditorLines(model);
    expect(back[0]).toMatchObject({ text: 'A', time: 1, endTime: 2 });
    expect(back[1].words).toEqual([
      { id: 'w1', text: 'B', start: 2, end: 3 },
      { id: 'w2', text: 'C', start: 3, end: 4 },
    ]);
  });
});

describe('resolveSongTiming — player/preview fallback priority', () => {
  it('uses lrc_content when timing_data is absent (existing songs unchanged)', () => {
    const { lines, source } = resolveSongTiming({ lrc_content: '[00:01.00]A\n[00:02.00]B', timing_data: null });
    expect(source).toBe('lrc');
    expect(lines).toHaveLength(2);
  });

  it('prefers structured timing_data when valid', () => {
    const song = {
      lrc_content: '[00:09.00]Old fallback text',
      timing_data: { lines: [{ text: 'New', start: 1, end: 2 }] },
    };
    const { lines, source } = resolveSongTiming(song);
    expect(source).toBe('structured');
    expect(lines[0].text).toBe('New');
  });

  it('falls back safely to lrc_content when timing_data is invalid/corrupt', () => {
    const song = { lrc_content: '[00:01.00]Safe', timing_data: { garbage: true } };
    const { lines, source } = resolveSongTiming(song);
    expect(source).toBe('lrc');
    expect(lines[0].text).toBe('Safe');
  });

  it('never crashes when both fields are absent', () => {
    expect(() => resolveSongTiming({})).not.toThrow();
    expect(resolveSongTiming({}).lines).toEqual([]);
  });

  it('exposes words on the resolved line shape when present', () => {
    const song = {
      timing_data: {
        lines: [{ text: 'B C', start: 2, end: 4, words: [{ text: 'B', start: 2, end: 3 }, { text: 'C', start: 3, end: 4 }] }],
      },
    };
    const { lines } = resolveSongTiming(song);
    expect(lines[0].words).toHaveLength(2);
  });
});
