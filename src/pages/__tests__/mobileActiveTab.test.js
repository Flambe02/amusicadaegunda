import { describe, it, expect } from 'vitest';
import { getMobileActiveTab } from '../mobileActiveTab';

describe('getMobileActiveTab', () => {
  it('lights the same tab with or without the trailing slash', () => {
    expect(getMobileActiveTab('/karaoke/')).toBe('karaoke');
    expect(getMobileActiveTab('/karaoke')).toBe('karaoke');
    expect(getMobileActiveTab('/catalogo/')).toBe('catalogo');
    expect(getMobileActiveTab('/sobre/')).toBe('menu');
    expect(getMobileActiveTab('/musica/15-de-novembro/')).toBe('catalogo');
  });

  it('keeps the home rules', () => {
    expect(getMobileActiveTab('/')).toBe('inicio');
    expect(getMobileActiveTab('/', '?ouvir=x')).toBe('catalogo');
  });
});
