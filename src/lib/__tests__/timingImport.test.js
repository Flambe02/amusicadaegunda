import { describe, it, expect } from 'vitest';
import {
  IMPORT_FORMAT, IMPORT_MODE,
  detectImportFormat, normalizeMatchToken, normalizeLineText, isSectionMarker,
  parseWordList, sanitizeImportedWords, alignWordsToLines, groupWordsIntoLines,
  planTextTimingImport, mergeAlignedLines, buildImportPlan,
} from '../timingImport';
import { wordsAreValid } from '../ballMotion';
import { buildTimingPayload } from '../karaokeSyncContract';

// ── Extrait RÉEL du JSON d'alignement de « Churrasco no trilho » (whisperX) ──
// Conservé tel quel, y compris les mots de durée nulle (« e ») et les `score`.
const CHURRASCO_WORDS = [
  { start: 12.04, end: 12.24, text: 'Cinco', score: -12.93 },
  { start: 12.28, end: 12.28, text: 'e', score: 0 },
  { start: 12.4, end: 12.96, text: 'quarenta', score: -35.31 },
  { start: 13.22, end: 13.46, text: 'Café', score: -0.2 },
  { start: 13.56, end: 14.3, text: 'requentado', score: -1.69 },
  { start: 14.56, end: 14.98, text: 'Marmita', score: -0.6 },
  { start: 15.06, end: 15.12, text: 'no', score: -0.08 },
  { start: 15.24, end: 15.62, text: 'colo', score: -0.19 },
  { start: 15.72, end: 16.2, text: 'Sapato', score: -0.49 },
  { start: 16.34, end: 17.02, text: 'apertado', score: -0.2 },
];

const CHURRASCO_LINES = [
  '[INTRO]',
  'Cinco e quarenta',
  'Café requentado',
  'Marmita no colo',
  'Sapato apertado',
];

const editorLines = (texts) => texts.map((text) => ({ text, time: null, endTime: null }));

describe('normalizeMatchToken', () => {
  it('strips case, accents and punctuation', () => {
    expect(normalizeMatchToken('Café,')).toBe('cafe');
    expect(normalizeMatchToken('CHURRASCO!')).toBe('churrasco');
    expect(normalizeMatchToken('Brás')).toBe('bras');
  });
  it('returns an empty key for punctuation-only tokens', () => {
    expect(normalizeMatchToken('—')).toBe('');
    expect(normalizeMatchToken('')).toBe('');
    expect(normalizeMatchToken(null)).toBe('');
  });
  it('normalizeLineText compares two spellings of the same line', () => {
    expect(normalizeLineText('Café requentado')).toBe(normalizeLineText('cafe  Requentado!'));
  });
});

describe('isSectionMarker', () => {
  it.each(['[INTRO]', '[Refrão]', '(refrão)', '  [PONTE]  '])('treats %s as a marker', (t) => {
    expect(isSectionMarker(t)).toBe(true);
  });
  it.each(['Cinco e quarenta', 'Churrasco no trilho'])('treats %s as sung text', (t) => {
    expect(isSectionMarker(t)).toBe(false);
  });
});

describe('detectImportFormat', () => {
  it('detects LRC even though it also starts with "["', () => {
    expect(detectImportFormat('song.lrc', '[00:12.04]Cinco e quarenta')).toBe(IMPORT_FORMAT.LRC);
  });
  it('detects a flat word-alignment JSON', () => {
    expect(detectImportFormat('churrasco.json', JSON.stringify({ words: CHURRASCO_WORDS }))).toBe(IMPORT_FORMAT.WORDS_JSON);
    expect(detectImportFormat('x.json', JSON.stringify(CHURRASCO_WORDS))).toBe(IMPORT_FORMAT.WORDS_JSON);
  });
  it('detects our own timing_data export', () => {
    const model = { schemaVersion: 1, timingMode: 'line', lines: [{ id: 'l1', text: 'a', start: 1, end: 2 }] };
    expect(detectImportFormat('t.json', JSON.stringify(model))).toBe(IMPORT_FORMAT.TIMING_JSON);
  });
  it('returns null on empty or unusable content', () => {
    expect(detectImportFormat('a.txt', '')).toBeNull();
    expect(detectImportFormat('a.txt', 'Cinco e quarenta\nCafé requentado')).toBeNull();
  });
});

describe('parseWordList', () => {
  it('reads { words: [...] } with the "text" key', () => {
    expect(parseWordList({ words: CHURRASCO_WORDS })).toHaveLength(10);
  });
  it('reads the whisperX "word" key and nested segments', () => {
    const raw = { segments: [{ words: [{ word: 'Cinco', start: 1, end: 1.2 }, { word: 'e', start: 1.3, end: 1.4 }] }] };
    expect(parseWordList(raw)).toEqual([
      { text: 'Cinco', start: 1, end: 1.2 },
      { text: 'e', start: 1.3, end: 1.4 },
    ]);
  });
  it('accepts a JSON string as well as an object', () => {
    expect(parseWordList(JSON.stringify({ words: CHURRASCO_WORDS }))).toHaveLength(10);
  });
  it('drops entries without usable text or start', () => {
    const raw = { words: [{ text: '', start: 1, end: 2 }, { text: 'ok', start: 'x' }, { text: 'ok', start: 3, end: 4 }] };
    expect(parseWordList(raw)).toEqual([{ text: 'ok', start: 3, end: 4 }]);
  });
  it('never throws on garbage', () => {
    expect(parseWordList('not json')).toEqual([]);
    expect(parseWordList(null)).toEqual([]);
  });
});

describe('sanitizeImportedWords', () => {
  it('gives zero-duration words a floor without overlapping the next one', () => {
    const out = sanitizeImportedWords([
      { text: 'e', start: 12.28, end: 12.28 },
      { text: 'quarenta', start: 12.3, end: 12.96 },
    ]);
    expect(out[0].end).toBeGreaterThan(out[0].start);
    expect(out[0].end).toBeLessThanOrEqual(out[1].start);
  });
  it('never lets a floor push a word past a same-instant neighbour', () => {
    const out = sanitizeImportedWords([
      { text: 'a', start: 5, end: 5 },
      { text: 'b', start: 5, end: 5.4 },
    ]);
    expect(out[0].end).toBe(5);
  });
  it('sorts by start and repairs end < start', () => {
    const out = sanitizeImportedWords([
      { text: 'b', start: 2, end: 1 },
      { text: 'a', start: 1, end: 1.5 },
    ]);
    expect(out.map((w) => w.text)).toEqual(['a', 'b']);
    expect(out[1].end).toBeGreaterThanOrEqual(out[1].start);
  });
});

describe('alignWordsToLines — Churrasco no trilho', () => {
  const result = alignWordsToLines(CHURRASCO_LINES, CHURRASCO_WORDS);

  it('never consumes a word for a [INTRO] marker', () => {
    expect(result.lines[0]).toMatchObject({ text: '[INTRO]', time: null, matched: false });
    expect(result.stats.markerLines).toBe(1);
    // La 1re frase chantée garde bien le PREMIER mot du JSON.
    expect(result.lines[1].time).toBeCloseTo(12.04, 5);
  });

  it('dates every sung line from the real alignment', () => {
    expect(result.stats.matchedLines).toBe(4);
    expect(result.stats.unmatched).toEqual([]);
    expect(result.lines[1]).toMatchObject({ time: 12.04, endTime: 12.96 });
    expect(result.lines[2]).toMatchObject({ time: 13.22, endTime: 14.3 });
    expect(result.lines[3]).toMatchObject({ time: 14.56, endTime: 15.62 });
    expect(result.lines[4]).toMatchObject({ time: 15.72, endTime: 17.02 });
  });

  it('consumes each word exactly once', () => {
    expect(result.stats.usedWords).toBe(10);
    expect(result.stats.skippedWords).toBe(0);
    expect(result.stats.totalWords).toBe(10);
  });

  it('keeps the admin spelling for word texts, not the aligner one', () => {
    expect(result.lines[2].words.map((w) => w.text)).toEqual(['Café', 'requentado']);
  });

  it('produces words that satisfy wordsAreValid (the editor contract)', () => {
    result.lines.filter((l) => l.words).forEach((l) => {
      expect(wordsAreValid(l.words, l.time, l.endTime)).toBe(true);
    });
  });

  it('feeds buildTimingPayload as word-level timing', () => {
    const payload = buildTimingPayload(result.lines);
    expect(payload.timing_mode).toBe('word');
    expect(payload.timing_data).not.toBeNull();
    expect(payload.lrc_content).toContain('[00:12.04]Cinco e quarenta[00:12.96]');
  });
});

describe('alignWordsToLines — robustness', () => {
  it('skips aligner noise before a line start (lookahead re-anchoring)', () => {
    const words = [
      { text: 'aah', start: 1, end: 1.2 },
      { text: 'uuh', start: 1.3, end: 1.5 },
      { text: 'Cinco', start: 2, end: 2.2 },
      { text: 'e', start: 2.3, end: 2.4 },
      { text: 'quarenta', start: 2.5, end: 3 },
    ];
    const out = alignWordsToLines(['Cinco e quarenta'], words);
    expect(out.lines[0]).toMatchObject({ time: 2, endTime: 3, matched: true });
    expect(out.stats.skippedWords).toBe(2);
  });

  it('still dates the phrase when the aligner has one word too few, via distributeWords', () => {
    // L'aligneur a raté « no » : 2 mots pour 3 tokens.
    const words = [
      { text: 'Marmita', start: 10, end: 10.4 },
      { text: 'colo', start: 10.6, end: 11 },
    ];
    const out = alignWordsToLines(['Marmita no colo'], words);
    expect(out.lines[0]).toMatchObject({ time: 10, endTime: 11, matched: true });
    expect(out.lines[0].words).toHaveLength(3); // reparti sur les 3 tokens de l'admin
    expect(wordsAreValid(out.lines[0].words, 10, 11)).toBe(true);
  });

  it('leaves a line unmatched rather than dating it wrongly', () => {
    const words = [{ text: 'Sapato', start: 20, end: 20.5 }];
    const out = alignWordsToLines(['Linha que nao existe no audio'], words);
    expect(out.lines[0]).toMatchObject({ time: null, matched: false });
    expect(out.stats.unmatched).toEqual([0]);
  });

  it('refuses an anchor found only on a very common word', () => {
    // « o » existe, mais aucun autre token de la ligne ne suit → score trop bas.
    const words = [
      { text: 'o', start: 5, end: 5.1 },
      { text: 'zzz', start: 5.2, end: 5.3 },
      { text: 'yyy', start: 5.4, end: 5.5 },
      { text: 'www', start: 5.6, end: 5.7 },
    ];
    const out = alignWordsToLines(['O trem saiu do Brás'], words);
    expect(out.lines[0].matched).toBe(false);
  });

  it('handles an empty input without throwing', () => {
    expect(alignWordsToLines([], []).lines).toEqual([]);
    expect(alignWordsToLines(['Cinco'], []).stats.matchedLines).toBe(0);
  });
});

describe('groupWordsIntoLines', () => {
  it('cuts phrases on silences when there are no lyrics to align on', () => {
    const words = [
      { text: 'Cinco', start: 12.04, end: 12.24 },
      { text: 'quarenta', start: 12.4, end: 12.96 },
      { text: 'Café', start: 13.9, end: 14.1 }, // silence > 0.7 s avant
    ];
    const out = groupWordsIntoLines(words);
    expect(out).toHaveLength(2);
    expect(out[0]).toMatchObject({ text: 'Cinco quarenta', time: 12.04, endTime: 12.96 });
    expect(out[1].text).toBe('Café');
  });
  it('caps a phrase length even without any silence', () => {
    const words = Array.from({ length: 20 }, (_, i) => ({ text: `w${i}`, start: i * 0.2, end: i * 0.2 + 0.1 }));
    expect(groupWordsIntoLines(words, { maxWords: 5 })).toHaveLength(4);
  });
});

describe('planTextTimingImport', () => {
  const imported = [
    { text: 'Cinco e quarenta', time: 12.04, endTime: 12.96 },
    { text: 'Café requentado', time: 13.22, endTime: 14.3 },
  ];

  it('APPLIES times onto the current lines when the lyrics match', () => {
    const current = [
      { text: 'Cinco e quarenta', time: null, endTime: null },
      { text: 'café  Requentado', time: null, endTime: null }, // même texte, autre casse
    ];
    const plan = planTextTimingImport(current, imported);
    expect(plan.mode).toBe(IMPORT_MODE.APPLY);
    expect(plan.lines[1].text).toBe('café  Requentado'); // le texte de l'admin est préservé
    expect(plan.lines[1].time).toBe(13.22);
  });

  it('REPLACES the lines when the lyrics are different', () => {
    const plan = planTextTimingImport([{ text: 'Outra musica', time: 1, endTime: 2 }], imported);
    expect(plan.mode).toBe(IMPORT_MODE.REPLACE);
    expect(plan.lines).toHaveLength(2);
    expect(plan.lines[0].text).toBe('Cinco e quarenta');
  });

  it('REPLACES when the editor has no lyrics at all', () => {
    expect(planTextTimingImport([], imported).mode).toBe(IMPORT_MODE.REPLACE);
  });

  it('clears a stale words[] when the imported line has none', () => {
    const current = [{ text: 'Cinco e quarenta', time: 1, endTime: 2, words: [{ text: 'Cinco', start: 1, end: 2 }] }];
    const plan = planTextTimingImport(current, [imported[0]]);
    expect(plan.lines[0].words).toBeUndefined();
  });
});

describe('mergeAlignedLines', () => {
  it('keeps the existing timing of a line the import could not match', () => {
    const current = [
      { text: 'Cinco e quarenta', time: 99, endTime: 100 },
      { text: 'Café requentado', time: 101, endTime: 102 },
    ];
    const aligned = [
      { time: 12.04, endTime: 12.96, matched: true },
      { time: null, endTime: null, matched: false },
    ];
    const out = mergeAlignedLines(current, aligned);
    expect(out[0]).toMatchObject({ time: 12.04, endTime: 12.96 });
    expect(out[1]).toMatchObject({ time: 101, endTime: 102 }); // travail manuel intact
  });
  it('preserves fields the import does not own (singer)', () => {
    const out = mergeAlignedLines([{ text: 'a', time: null, endTime: null, singer: 'B' }], [{ time: 1, endTime: 2, matched: true }]);
    expect(out[0].singer).toBe('B');
  });
});

describe('buildImportPlan', () => {
  it('imports the Churrasco JSON onto the existing lyrics', () => {
    const plan = buildImportPlan({
      fileName: 'churrasco.json',
      text: JSON.stringify({ words: CHURRASCO_WORDS }),
      currentLines: editorLines(CHURRASCO_LINES),
    });
    expect(plan.ok).toBe(true);
    expect(plan.format).toBe(IMPORT_FORMAT.WORDS_JSON);
    expect(plan.mode).toBe(IMPORT_MODE.ALIGN);
    expect(plan.stats.matchedLines).toBe(4);
    expect(plan.overwritten).toBe(0);
    expect(plan.lines[1].time).toBeCloseTo(12.04, 5);
  });

  it('reports how many manual timings an import would overwrite', () => {
    const current = editorLines(CHURRASCO_LINES);
    current[1] = { ...current[1], time: 50, endTime: 51 };
    const plan = buildImportPlan({ fileName: 'c.json', text: JSON.stringify({ words: CHURRASCO_WORDS }), currentLines: current });
    expect(plan.overwritten).toBe(1);
  });

  it('groups a words JSON into phrases when the editor has no lyrics', () => {
    const plan = buildImportPlan({ fileName: 'c.json', text: JSON.stringify({ words: CHURRASCO_WORDS }), currentLines: [] });
    expect(plan.mode).toBe(IMPORT_MODE.GROUP);
    expect(plan.lines.length).toBeGreaterThan(0);
    expect(plan.lines.every((l) => Number.isFinite(l.time))).toBe(true);
  });

  it('imports a plain LRC file', () => {
    const lrc = '[00:12.04]Cinco e quarenta[00:12.96]\n[00:13.22]Café requentado';
    const plan = buildImportPlan({ fileName: 'x.lrc', text: lrc, currentLines: [] });
    expect(plan.ok).toBe(true);
    expect(plan.format).toBe(IMPORT_FORMAT.LRC);
    expect(plan.lines[0]).toMatchObject({ time: 12.04, endTime: 12.96, text: 'Cinco e quarenta' });
    expect(plan.lines[1].endTime).toBeNull();
  });

  it('imports our own timing_data export, words included', () => {
    const model = {
      schemaVersion: 1,
      timingMode: 'word',
      lines: [{ id: 'l1', text: 'Cinco e quarenta', start: 12.04, end: 12.96, words: [{ id: 'w1', text: 'Cinco', start: 12.04, end: 12.24 }] }],
    };
    const plan = buildImportPlan({ fileName: 't.json', text: JSON.stringify(model), currentLines: [] });
    expect(plan.format).toBe(IMPORT_FORMAT.TIMING_JSON);
    expect(plan.lines[0].words).toHaveLength(1);
  });

  it('explains itself instead of throwing on an unusable file', () => {
    expect(buildImportPlan({ fileName: 'a.txt', text: 'juste des paroles' })).toMatchObject({ ok: false });
    expect(buildImportPlan({ fileName: 'a.json', text: '{"words":[]}' }).ok).toBe(false);
    expect(buildImportPlan({ text: '' }).ok).toBe(false);
    expect(buildImportPlan({}).ok).toBe(false);
  });
});
