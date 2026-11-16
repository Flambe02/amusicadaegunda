import { describe, it, expect } from 'vitest';
import { foldMidi, gameNotes, intoRange, laneRange, onPitch, voiceMidi } from '../karaokePitch';
import { createScorer, lineOwners, wordWindows } from '../karaokeGame';
import { createLevelPacker, createLevelPlayback, packPitches, unpackPitches } from '../phoneMic';

const LINES = [
  { time: 10, text: 'um dois tres' },
  { time: 13, text: '' },
  { time: 16, text: 'quatro cinco seis' },
  { time: 19, text: 'sete oito nove' },
];
// Melodia : 2 notes par seconde pendant les paroles, plus du bruit sur l'intro.
const NOTES = [
  { startMs: 700, endMs: 1700, midi: 40, confidence: 0.97 }, // intro instrumentale : ignorée
  ...Array.from({ length: 12 }, (_, i) => ({ startMs: 10000 + i * 500, endMs: 10450 + i * 500, midi: 60 + (i % 3), confidence: 0.95 })),
  ...Array.from({ length: 12 }, (_, i) => ({ startMs: 16000 + i * 500, endMs: 16450 + i * 500, midi: 62, confidence: 0.95 })),
];

describe('Karaokê — a altura das notas (K5)', () => {
  it('compares at the octave (a deep voice sings the same tune an octave lower)', () => {
    expect(foldMidi(48, 60)).toBe(60);
    expect(onPitch(49, 60)).toBe(true);
    expect(onPitch(63, 60)).toBe(false);
    expect(onPitch(null, 60)).toBe(false);
  });

  it('keeps only notes sung during the lyrics (no bar on the instrumental intro)', () => {
    const windows = LINES.map((l, i) => wordWindows(l, LINES[i + 1]?.time));
    const notes = gameNotes(NOTES, windows, lineOwners(LINES, 'solo', 1));
    expect(notes.every((n) => n.start >= 9.8)).toBe(true);
    expect(notes[0].line).toBe(0);
    expect(gameNotes(NOTES.slice(0, 5), windows, lineOwners(LINES, 'solo', 1))).toEqual([]); // trop maigre
  });

  it('a note between two words (a synth bip) is not one to sing', () => {
    const lines = [{ time: 0, text: 'a b', words: [{ start: 0, end: 0.5 }, { start: 3, end: 3.5 }] }, { time: 6, text: '' }];
    const windows = lines.map((l, i) => wordWindows(l, lines[i + 1]?.time));
    const many = (from) => Array.from({ length: 12 }, (_, i) => ({ startMs: from + i * 30, endMs: from + i * 30 + 25, midi: 60 }));
    expect(gameNotes(many(1500), windows, lineOwners(lines, 'solo', 1))).toEqual([]);
    expect(gameNotes(many(3000), windows, lineOwners(lines, 'solo', 1)).length).toBe(12);
  });

  it('the lane spans the tune, stray notes are folded in', () => {
    const range = laneRange([{ midi: 60 }, { midi: 62 }, { midi: 64 }]);
    expect(range.max - range.min).toBeGreaterThanOrEqual(12);
    const m = intoRange(84, range);
    expect(m).toBeLessThanOrEqual(range.max);
    expect(m).toBeGreaterThanOrEqual(range.min);
  });

  it('finds the pitch of a sung tone', () => {
    const sr = 48000; const buf = new Float32Array(2048);
    for (let i = 0; i < buf.length; i += 1) buf[i] = 0.3 * Math.sin((2 * Math.PI * 220 * i) / sr);
    expect(voiceMidi(buf, sr)).toBeCloseTo(57, 0); // A3
    expect(voiceMidi(new Float32Array(2048), sr)).toBeNull();
  });

  it('in tune scores more than out of tune; results tell the afinação', () => {
    const run = (midiAt) => {
      const scorer = createScorer({ lines: LINES, mode: 'solo', pitchNotes: NOTES });
      expect(scorer.notes.length).toBeGreaterThan(0);
      for (let t = 9; t <= 23; t += 0.05) {
        const n = scorer.notes.find((x) => t >= x.start && t < x.end);
        scorer.update({ t, rms: 0.2, midi: midiAt(n), dtMs: 50 });
      }
      return scorer.finish()[0];
    };
    const tuned = run((n) => (n ? n.midi - 12 : null)); // une octave plus bas : juste
    const off = run((n) => (n ? n.midi + 4 : null));
    expect(tuned.pitch).toBeGreaterThan(80);
    expect(off.pitch).toBe(0);
    expect(tuned.score).toBeGreaterThan(off.score);
    expect(off.score).toBeGreaterThan(0); // chanter au bon moment compte quand même
  });

  it('songs without a melody keep the old score (no afinação)', () => {
    const scorer = createScorer({ lines: LINES, mode: 'solo' });
    for (let t = 9; t <= 23; t += 0.05) scorer.update({ t, rms: 0.2, dtMs: 50 });
    expect(scorer.finish()[0].pitch).toBeNull();
  });

  it('the phone sends the pitch with each level', () => {
    expect(unpackPitches(packPitches([57.04, null, 0]))).toEqual([57, null, null]);
    const packer = createLevelPacker(); let packet = null;
    for (let t = 0; !packet; t += 10) packet = packer.push(0.1, t, 60);
    expect(packet.midis.every((m) => m === 60)).toBe(true);
    const pb = createLevelPlayback();
    pb.receive([0.1, 0.2], 0, [60, null]);
    pb.valueAt(0);
    expect(pb.midi).toBe(60);
  });
});
