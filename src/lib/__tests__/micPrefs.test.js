import { describe, it, expect } from 'vitest';
import { audioConstraints, loadMicPrefs, micDisplayName, micStatus, rmsOfBytes, saveMicPrefs } from '../micPrefs';
import { cleanName, loadPlayerNames, playersFor, savePlayerNames } from '../karaokePlayers';

const memory = () => {
  const map = new Map();
  return { getItem: (k) => (map.has(k) ? map.get(k) : null), setItem: (k, v) => map.set(k, String(v)), removeItem: (k) => map.delete(k) };
};

describe('Microfone do karaokê — escolha guardada no aparelho', () => {
  it('nothing saved, « sem microfone », or a tested device', () => {
    const s = memory();
    expect(loadMicPrefs(s)).toBeNull();
    saveMicPrefs({ source: 'none' }, s);
    expect(loadMicPrefs(s)).toEqual({ source: 'none' });
    saveMicPrefs({ source: 'device', deviceId: 'abc', label: 'Shure MV6', testedAt: 1 }, s);
    expect(loadMicPrefs(s)).toMatchObject({ source: 'device', deviceId: 'abc', label: 'Shure MV6' });
    s.setItem('amds-mic-v1', '{broken');
    expect(loadMicPrefs(s)).toBeNull();
  });

  it('asks for the chosen mic without failing if it is gone, and never mutes the voice', () => {
    expect(audioConstraints({ source: 'device', deviceId: 'abc' }).deviceId).toEqual({ ideal: 'abc' });
    expect(audioConstraints(null).deviceId).toBeUndefined();
    expect(audioConstraints({ source: 'device', deviceId: 'default' }).deviceId).toBeUndefined();
    expect(audioConstraints(null).autoGainControl).toBe(false);
  });

  it('shows a readable mic name and status', () => {
    expect(micDisplayName('Par défaut - Microphone Shure (3- Shure MV6) (14ed:1026)')).toBe('Microphone Shure (3- Shure MV6)');
    expect(micStatus(null).kind).toBe('unset');
    expect(micStatus({ source: 'none' }).text).toBe('Sem microfone · só a letra');
    expect(micStatus({ source: 'device', label: '' }).text).toBe('Microfone');
  });

  it('measures the level of a buffer', () => {
    expect(rmsOfBytes(new Uint8Array([128, 128, 128]))).toBe(0);
    expect(rmsOfBytes(new Uint8Array([255, 1, 255, 1]))).toBeGreaterThan(0.9);
  });
});

describe('Quem canta — prénoms gardés sur l\'appareil', () => {
  it('defaults, cleaning and saving', () => {
    const s = memory();
    expect(loadPlayerNames(s).slice(0, 2)).toEqual(['Cantor 1', 'Cantor 2']);
    savePlayerNames(['  Florent  ', '', 'Ana'], s);
    expect(loadPlayerNames(s).slice(0, 3)).toEqual(['Florent', 'Cantor 2', 'Ana']);
    expect(cleanName('Um nome muito comprido demais')).toHaveLength(16);
  });

  it('one singer in solo, two with their colours in dueto', () => {
    expect(playersFor('solo', ['Florent'])).toHaveLength(1);
    const duet = playersFor('duet', ['Florent', 'Ana']);
    expect(duet.map((p) => p.name)).toEqual(['Florent', 'Ana']);
    expect(duet[0].color).not.toBe(duet[1].color);
  });
});
