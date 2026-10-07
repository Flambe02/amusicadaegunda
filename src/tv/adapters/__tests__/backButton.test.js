import { describe, it, expect, vi, afterEach } from 'vitest';
import { onBackPress } from '../backButton';

vi.mock('@capacitor/core', () => ({ Capacitor: { isNativePlatform: () => false } }));

const press = (key) => window.dispatchEvent(new KeyboardEvent('keydown', { key, cancelable: true }));

describe('onBackPress — touches Retour', () => {
  let stop = null;
  afterEach(() => { stop?.(); stop = null; });

  it('Escape and Backspace go back by default (TV box, remote)', () => {
    const handler = vi.fn();
    stop = onBackPress(handler);
    press('Escape');
    press('Backspace');
    expect(handler).toHaveBeenCalledTimes(2);
  });

  it('backspace: false — only Escape goes back (computer browser)', () => {
    const handler = vi.fn();
    stop = onBackPress(handler, { backspace: false });
    press('Backspace');
    expect(handler).not.toHaveBeenCalled();
    press('Escape');
    expect(handler).toHaveBeenCalledTimes(1);
  });

  it('ignoreKey — the Escape that leaves full screen does not also go back one screen', () => {
    const handler = vi.fn();
    let fullscreen = true;
    stop = onBackPress(handler, { backspace: false, ignoreKey: (event) => event.key === 'Escape' && fullscreen });
    press('Escape');
    expect(handler).not.toHaveBeenCalled();
    fullscreen = false;
    press('Escape');
    expect(handler).toHaveBeenCalledTimes(1);
  });
});
