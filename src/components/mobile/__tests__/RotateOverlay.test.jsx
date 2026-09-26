import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import RotateOverlay, { ROTATE_OVERLAY_Z } from '../RotateOverlay';
import { ORIENTATION_BLOCK_EVENT, PHONE_LANDSCAPE_QUERY } from '../orientation';

let matches = false;
let listeners = [];
beforeEach(() => {
  matches = false;
  listeners = [];
  window.matchMedia = vi.fn().mockImplementation((query) => ({
    get matches() { return query === PHONE_LANDSCAPE_QUERY ? matches : false; },
    media: query,
    addEventListener: (_type, fn) => listeners.push(fn),
    removeEventListener: (_type, fn) => { listeners = listeners.filter((l) => l !== fn); },
  }));
});

const rotate = (landscape) => act(() => {
  matches = landscape;
  listeners.forEach((fn) => fn());
});

describe('RotateOverlay — phones in landscape', () => {
  it('targets phones only: coarse pointer, landscape, phone height (tablets and desktop are taller or fine-pointed)', () => {
    expect(PHONE_LANDSCAPE_QUERY).toBe('(pointer: coarse) and (orientation: landscape) and (max-height: 500px)');
  });

  it('portrait: nothing; landscape: full black screen, still Caipivara and « Gire o celular », read by screen readers', () => {
    render(<RotateOverlay />);
    expect(document.querySelector('[data-rotate-overlay]')).toBeNull();
    rotate(true);
    const dialog = screen.getByRole('dialog', { name: 'Gire o celular' });
    expect(dialog).toHaveAttribute('aria-modal', 'true');
    expect(dialog.className).toMatch(/fixed inset-0/);
    expect(dialog.className).toMatch(/bg-black/);
    expect(dialog.querySelector('img').getAttribute('src')).toContain('caipivara');
    expect(dialog.querySelector('video')).toBeNull(); // image fixe
    expect(screen.getByText('Gire o celular')).toHaveAttribute('aria-live', 'assertive');
    rotate(false);
    expect(document.querySelector('[data-rotate-overlay]')).toBeNull();
  });

  it('broadcasts each change so the players pause and resume', () => {
    const events = [];
    const onEvent = (event) => events.push(event.detail.blocked);
    window.addEventListener(ORIENTATION_BLOCK_EVENT, onEvent);
    render(<RotateOverlay />);
    rotate(true);
    rotate(false);
    window.removeEventListener(ORIENTATION_BLOCK_EVENT, onEvent);
    expect(events).toEqual([false, true, false]);
  });

  it('stays above every overlay: a top-level layer on <body>, at the highest z-index — above the karaoke player (z-[9999])', () => {
    // Le lecteur karaokê plein écran (page chanson, Aprender) est lui aussi un portail sur <body>.
    const player = document.createElement('div');
    player.className = 'karaoke-overlay fixed inset-0 z-[9999]';
    document.body.appendChild(player);
    try {
      const { container } = render(<div className="relative z-10"><RotateOverlay /></div>);
      rotate(true);
      const overlay = document.querySelector('[data-rotate-overlay]');
      expect(overlay.parentElement).toBe(document.body); // hors de tout contexte d'empilement
      expect(container.contains(overlay)).toBe(false);
      expect(Number(overlay.style.zIndex)).toBe(ROTATE_OVERLAY_Z);
      expect(ROTATE_OVERLAY_Z).toBe(2147483647);
      expect(ROTATE_OVERLAY_Z).toBeGreaterThan(9999);
    } finally {
      player.remove();
    }
  });
});
