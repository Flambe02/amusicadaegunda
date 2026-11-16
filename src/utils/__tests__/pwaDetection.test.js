import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { shouldShowTutorial } from '@/utils/pwaDetection';

// Tutoriel iOS « Adicionar à tela inicial » : même règle que la bannière d'installation
// (jamais à la première visite).
describe('shouldShowTutorial', () => {
  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
    vi.spyOn(navigator, 'userAgent', 'get').mockReturnValue(
      'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1'
    );
    window.matchMedia = window.matchMedia || (() => ({ matches: false }));
  });
  afterEach(() => vi.restoreAllMocks());

  it('stays hidden on the first visit, shows from the second', () => {
    expect(shouldShowTutorial()).toBe(false);
    sessionStorage.clear(); // nouvelle session = deuxième visite
    expect(shouldShowTutorial()).toBe(true);
  });

  it('stays hidden once seen', () => {
    localStorage.setItem('amds-visits', '5');
    localStorage.setItem('ios-tutorial-seen', 'true');
    expect(shouldShowTutorial()).toBe(false);
  });

  it('is never shown off iOS', () => {
    vi.spyOn(navigator, 'userAgent', 'get').mockReturnValue('Mozilla/5.0 (Linux; Android 14) Chrome/120 Mobile');
    localStorage.setItem('amds-visits', '5');
    expect(shouldShowTutorial()).toBe(false);
  });
});
