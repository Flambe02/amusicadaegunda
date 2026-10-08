import { describe, it, expect } from 'vitest';
import { BIG_SCREEN_ENTRIES, bigScreenEntryUrl, readBigScreenEntry } from '../bigScreenEntry';

describe('Entrées directes du grand écran — /?abrir=…', () => {
  it('builds and reads the four entries of the top bar', () => {
    expect(BIG_SCREEN_ENTRIES).toEqual(['catalogo', 'buscar', 'festa', 'ajustes']);
    for (const entry of BIG_SCREEN_ENTRIES) expect(readBigScreenEntry(bigScreenEntryUrl(entry).slice(1))).toBe(entry);
    expect(readBigScreenEntry('?utm=x&abrir=festa')).toBe('festa');
  });

  it('ignores anything else', () => {
    expect(readBigScreenEntry('')).toBeNull();
    expect(readBigScreenEntry('?abrir=admin')).toBeNull();
    expect(readBigScreenEntry('?abrir=')).toBeNull();
  });
});
