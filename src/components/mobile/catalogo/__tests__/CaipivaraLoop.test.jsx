import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import CaipivaraLoop from '../CaipivaraLoop';

// Sur iPhone, une <video> dans un calque `mask-image` s'affichait parfois à sa taille
// native (gros plan) après un fondu : les bords sont fondus par un voile posé dessus.
describe('CaipivaraLoop — bords fondus sans mask-image', () => {
  it('no mask around the videos; a vignette sits on top of them', () => {
    const { container } = render(<CaipivaraLoop />);
    const loop = container.querySelector('[data-caipivara-loop]');
    expect(loop.style.maskImage || loop.style.webkitMaskImage || '').toBe('');
    expect(container.innerHTML).not.toMatch(/mask-image/i);
    const vignette = loop.querySelector('[data-edge-vignette]');
    expect(vignette).toBe(loop.lastElementChild);
    expect(vignette.className).toContain('pointer-events-none');
    expect(vignette.style.backgroundImage).toMatch(/radial-gradient/);
  });
});
