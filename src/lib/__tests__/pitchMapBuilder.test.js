import { describe, it, expect } from 'vitest';
import { buildPitchMap, computePitchMapStats, midiToName } from '@/lib/pitch/pitchMapBuilder';
import { detectVocalSegments } from '@/lib/pitch/vocalSegments';
import { preAlignLines } from '@/lib/pitch/preAlign';
import { midiToFrequency } from '@/lib/pitch/yin';

// Gera uma sequência de tons (com silêncios opcionais entre eles).
function toneSequence(sr, entries) {
  // entries: [{ freq, durSec, silenceSec }]
  const total = entries.reduce((n, e) => n + Math.round((e.durSec + (e.silenceSec || 0)) * sr), 0);
  const out = new Float32Array(total);
  let idx = 0;
  for (const e of entries) {
    const nTone = Math.round(e.durSec * sr);
    for (let i = 0; i < nTone; i += 1) { out[idx] = Math.sin((2 * Math.PI * e.freq * i) / sr) * 0.7; idx += 1; }
    idx += Math.round((e.silenceSec || 0) * sr); // silêncio (zeros)
  }
  return out;
}

describe('buildPitchMap', () => {
  it('extrai as notas de uma sequência Do-Mi-Sol', () => {
    const sr = 44100;
    const samples = toneSequence(sr, [
      { freq: midiToFrequency(60), durSec: 0.5 },
      { freq: midiToFrequency(64), durSec: 0.5 },
      { freq: midiToFrequency(67), durSec: 0.5 },
    ]);
    const map = buildPitchMap(samples, sr, { source: 'test' });
    expect(map.version).toBe(1);
    expect(map.notes.map((n) => n.midi)).toEqual([60, 64, 67]);
    expect(map.stats.noteCount).toBe(3);
    expect(map.stats.rangeLabel).toBe('C4–G4');
  });

  it('reporta progresso e aplica offset', () => {
    const sr = 22050;
    const samples = toneSequence(sr, [{ freq: 220, durSec: 0.6 }]);
    let sawProgress = false;
    const map = buildPitchMap(samples, sr, { offsetMs: 1000 }, () => { sawProgress = true; });
    expect(sawProgress).toBe(true);
    expect(map.notes[0].startMs).toBeGreaterThanOrEqual(1000);
  });

  it('midiToName nomeia corretamente', () => {
    expect(midiToName(69)).toBe('A4');
    expect(midiToName(60)).toBe('C4');
  });

  it('computePitchMapStats calcula cobertura', () => {
    const stats = computePitchMapStats([{ startMs: 0, endMs: 500, midi: 60 }], 1);
    expect(stats.coveragePct).toBe(50);
  });
});

describe('detectVocalSegments', () => {
  it('separa duas frases com silêncio no meio', () => {
    const sr = 44100;
    const samples = toneSequence(sr, [
      { freq: midiToFrequency(62), durSec: 0.6, silenceSec: 0.4 },
      { freq: midiToFrequency(65), durSec: 0.6 },
    ]);
    const segs = detectVocalSegments(samples, sr, {});
    expect(segs.length).toBe(2);
    expect(segs[0].endMs).toBeLessThan(segs[1].startMs);
  });
});

describe('preAlignLines', () => {
  const segments = [
    { startMs: 0, endMs: 500 },
    { startMs: 1000, endMs: 1500 },
  ];

  it('atribui 1:1 quando as contagens batem', () => {
    const lines = [{ text: 'a' }, { text: 'b' }];
    const r = preAlignLines(segments, lines);
    expect(r.mode).toBe('assign');
    expect(r.lines[0].time).toBe(0);
    expect(r.lines[1].time).toBe(1);
    expect(r.lines[1].endTime).toBe(1.5);
  });

  it('faz snap dos marcadores existentes quando as contagens diferem', () => {
    const lines = [
      { text: 'a', time: 0.05 },   // perto do segmento 0
      { text: 'b', time: 1.02 },   // perto do segmento 1
      { text: 'c' },               // sem tempo → intacto
    ];
    const r = preAlignLines(segments, lines);
    expect(r.mode).toBe('snap');
    expect(r.matched).toBe(2);
    expect(r.lines[0].time).toBe(0);
    expect(r.lines[1].time).toBe(1);
    expect(r.lines[2].time).toBeUndefined();
  });

  it('não faz snap para além da tolerância', () => {
    const lines = [{ text: 'a', time: 5 }]; // longe de qualquer segmento
    const r = preAlignLines(segments, lines, { snapToleranceMs: 350 });
    expect(r.matched).toBe(0);
    expect(r.lines[0].time).toBe(5);
  });
});
