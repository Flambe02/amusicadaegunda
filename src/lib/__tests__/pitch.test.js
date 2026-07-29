import { describe, it, expect } from 'vitest';
import { detectPitch, frequencyToMidi, midiToFrequency, centsBetween } from '@/lib/pitch/yin';
import {
  parsePitchReference, activeNoteAt, visibleNotes, verticalRange, resolveSongPitchReference,
} from '@/lib/pitchReference';
import { PitchSmoother } from '@/lib/pitch/pitchSmoother';

function sineBuffer(freq, sampleRate, length) {
  const b = new Float32Array(length);
  for (let i = 0; i < length; i += 1) b[i] = Math.sin((2 * Math.PI * freq * i) / sampleRate) * 0.8;
  return b;
}

describe('yin detectPitch', () => {
  it('deteta uma sinusoide a 440 Hz (~MIDI 69)', () => {
    const sr = 44100;
    const { frequencyHz, probability } = detectPitch(sineBuffer(440, sr, 2048), sr, {});
    expect(frequencyHz).toBeGreaterThan(430);
    expect(frequencyHz).toBeLessThan(450);
    expect(probability).toBeGreaterThan(0.7);
    expect(Math.round(frequencyToMidi(frequencyHz))).toBe(69);
  });

  it('deteta um grave a 110 Hz', () => {
    const sr = 44100;
    const { frequencyHz } = detectPitch(sineBuffer(110, sr, 2048), sr, {});
    expect(frequencyHz).toBeGreaterThan(105);
    expect(frequencyHz).toBeLessThan(115);
  });

  it('devolve 0 em silêncio', () => {
    const { frequencyHz } = detectPitch(new Float32Array(2048), 44100, {});
    expect(frequencyHz).toBe(0);
  });

  it('midi ↔ frequência ida-e-volta', () => {
    expect(midiToFrequency(69)).toBeCloseTo(440, 3);
    expect(frequencyToMidi(440)).toBeCloseTo(69, 6);
    expect(centsBetween(440, 440)).toBeCloseTo(0, 6);
    expect(centsBetween(466.16, 440)).toBeCloseTo(100, 0); // 1 semitom = 100 cents
  });
});

describe('pitchReference', () => {
  const notes = [
    { startMs: 0, endMs: 500, midi: 60, confidence: 0.9 },
    { startMs: 600, endMs: 1000, midi: 64, confidence: 0.9 },
  ];

  it('parse valida e ordena, rejeita inválido', () => {
    expect(parsePitchReference(null)).toBeNull();
    expect(parsePitchReference({ notes: [] })).toBeNull();
    const p = parsePitchReference({ version: 1, notes: [...notes].reverse() });
    expect(p.notes).toHaveLength(2);
    expect(p.notes[0].startMs).toBe(0); // reordenado
  });

  it('parse aceita string JSON', () => {
    const p = parsePitchReference(JSON.stringify({ notes }));
    expect(p?.notes).toHaveLength(2);
  });

  it('activeNoteAt encontra a nota do instante (ou null no intervalo)', () => {
    expect(activeNoteAt(notes, 250)?.midi).toBe(60);
    expect(activeNoteAt(notes, 550)).toBeNull(); // silêncio entre notas
    expect(activeNoteAt(notes, 700)?.midi).toBe(64);
    expect(activeNoteAt(notes, 5000)).toBeNull();
  });

  it('visibleNotes recorta a janela', () => {
    expect(visibleNotes(notes, 550, 2000)).toHaveLength(1);
    expect(visibleNotes(notes, -100, 2000)).toHaveLength(2);
  });

  it('verticalRange respeita a amplitude mínima', () => {
    const [lo, hi] = verticalRange(notes, null, { minRange: 8, padding: 2 });
    expect(hi - lo).toBeGreaterThanOrEqual(8);
  });

  it('resolveSongPitchReference prefere inline sobre URL', () => {
    expect(resolveSongPitchReference({ pitch_map: { notes } })).toEqual({ notes });
    expect(resolveSongPitchReference({ pitch_reference_url: 'x.json' })).toEqual({ url: 'x.json' });
    expect(resolveSongPitchReference({})).toBeNull();
  });
});

describe('PitchSmoother', () => {
  const cfg = { medianWindow: 5, emaAlpha: 0.4, octaveTolerstandCents: 80, holdMs: 200 };

  it('estabiliza num valor e corrige oitava', () => {
    const s = new PitchSmoother(cfg);
    let v;
    for (let i = 0; i < 10; i += 1) v = s.push(midiToFrequency(60), true, i * 30);
    expect(v).toBeCloseTo(60, 0);
    // Salto de oitava isolado é puxado de volta para perto de 60.
    const jumped = s.push(midiToFrequency(72), true, 400);
    expect(jumped).toBeLessThan(64);
  });

  it('mantém o valor durante o hold e depois apaga', () => {
    const s = new PitchSmoother(cfg);
    let v;
    for (let i = 0; i < 6; i += 1) v = s.push(midiToFrequency(62), true, i * 30);
    expect(v).not.toBeNull();
    expect(s.push(0, false, 300)).not.toBeNull(); // dentro do hold (200ms desde ~150)
    expect(s.push(0, false, 1000)).toBeNull();     // além do hold → apaga
  });
});
