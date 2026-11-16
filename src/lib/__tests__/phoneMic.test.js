import { describe, it, expect, vi } from 'vitest';

vi.mock('../supabase', () => ({ supabase: {} }));
const {
  BUCKET_MS, BUCKETS_PER_PACKET, createLevelPacker, createLevelPlayback, generateMicCode,
  normalizeMicCode, packLevels, phoneMicUrl, unpackLevels,
} = await import('../phoneMic');
const { loadMicPrefs, micStatus, hasScoringMic } = await import('../micPrefs');

describe('Celular como microfone — código e link', () => {
  it('codes are short, readable, without 0/O/1/I/L', () => {
    const code = generateMicCode();
    expect(code).toMatch(/^[A-HJKMNP-Z2-9]{5}$/);
    expect(normalizeMicCode(' ab-c2d ')).toBe('ABC2D');
    expect(normalizeMicCode('x')).toBeNull();
  });

  it('the QR opens the public site, also from the Android app', () => {
    expect(phoneMicUrl('ABCDE', 'https://www.amusicadasegunda.com')).toBe('https://www.amusicadasegunda.com/festa?mic=ABCDE');
    expect(phoneMicUrl('ABCDE', 'http://localhost:4173')).toBe('http://localhost:4173/festa?mic=ABCDE');
    expect(phoneMicUrl('ABCDE', 'https://localhost')).toBe('https://www.amusicadasegunda.com/festa?mic=ABCDE');
  });
});

describe('Celular como microfone — só números, nunca o som', () => {
  it('packs levels in buckets (the loudest of each) and round-trips', () => {
    const packer = createLevelPacker();
    const packets = [];
    for (let t = 0; t <= BUCKET_MS * BUCKETS_PER_PACKET * 2 + 5; t += 10) {
      const p = packer.push(t % 30 === 10 ? 0.2 : 0.01, t);
      if (p) packets.push(p);
    }
    expect(packets.length).toBeGreaterThanOrEqual(1);
    expect(packets[0]).toHaveLength(BUCKETS_PER_PACKET);
    expect(Math.max(...packets[0])).toBeCloseTo(0.2);
    expect(unpackLevels(packLevels([0.2, 0, 2]))).toEqual([0.2, 0, 1]);
  });

  it('the TV replays each level in its place, then falls silent', () => {
    const pb = createLevelPlayback();
    pb.receive([0.1, 0.2, 0.3, 0.4], 1000);
    expect(pb.valueAt(1000)).toBe(0.1);
    expect(pb.valueAt(1000 + BUCKET_MS * 2)).toBe(0.3);
    expect(pb.valueAt(1000 + BUCKET_MS * 3 + 1)).toBe(0.4);
    expect(pb.valueAt(2000)).toBe(0);
  });
});

describe('Preferência do microfone: celular', () => {
  it('is remembered and counts as a scoring mic', () => {
    const storage = { getItem: () => JSON.stringify({ source: 'phone', code: 'ABCDE' }) };
    const prefs = loadMicPrefs(storage);
    expect(prefs).toEqual({ source: 'phone', code: 'ABCDE' });
    expect(micStatus(prefs).kind).toBe('phone');
    expect(hasScoringMic(prefs)).toBe(true);
    expect(hasScoringMic({ source: 'none' })).toBe(false);
  });
});
