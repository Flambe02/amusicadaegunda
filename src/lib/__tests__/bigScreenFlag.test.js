import { describe, it, expect, beforeEach, afterAll, vi } from 'vitest';
import { isBigScreenUiEnabled } from '../interface';
import { onBackPress } from '@/tv/adapters/backButton';

const visit = (search) => window.history.replaceState(null, '', `/${search}`);

// Fenêtre de téléphone-tablette tenue droite : ni ordinateur, ni tablette en paysage.
const { innerWidth, innerHeight } = window;
afterAll(() => Object.assign(window, { innerWidth, innerHeight }));

beforeEach(() => {
  Object.assign(window, { innerWidth: 820, innerHeight: 1180 });
  localStorage.clear();
  visit('');
});

describe('isBigScreenUiEnabled — ?ui=bigscreen', () => {
  it('is off on a tablet held upright (no fine pointer, not in landscape)', () => {
    expect(isBigScreenUiEnabled()).toBe(false);
  });

  it('?ui=bigscreen turns it on and is remembered, like ?tv=', () => {
    visit('?ui=bigscreen');
    expect(isBigScreenUiEnabled()).toBe(true);
    visit('');
    expect(isBigScreenUiEnabled()).toBe(true);
  });

  it('?ui=auto returns to the default', () => {
    visit('?foo=1&ui=bigscreen');
    expect(isBigScreenUiEnabled()).toBe(true);
    visit('?ui=auto');
    expect(isBigScreenUiEnabled()).toBe(false);
    visit('');
    expect(isBigScreenUiEnabled()).toBe(false);
  });
});

describe('onBackPress — touches Retour', () => {
  const press = (key) => window.dispatchEvent(new KeyboardEvent('keydown', { key, cancelable: true }));

  it('TV (default): Escape and Backspace both go back', () => {
    const handler = vi.fn();
    const off = onBackPress(handler);
    press('Escape');
    press('Backspace');
    off();
    expect(handler).toHaveBeenCalledTimes(2);
  });

  it('browser (backspace: false): Escape only', () => {
    const handler = vi.fn();
    const off = onBackPress(handler, { backspace: false });
    press('Backspace');
    expect(handler).not.toHaveBeenCalled();
    press('Escape');
    off();
    expect(handler).toHaveBeenCalledTimes(1);
  });
});
