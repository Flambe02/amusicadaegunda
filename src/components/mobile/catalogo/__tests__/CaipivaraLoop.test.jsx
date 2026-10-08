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

// Costume de la chanson (catalogue public/mascot/) : le poster tout de suite, la vidéo
// seulement quand la Caipivara danse, jamais sur une diapositive voisine.
describe('CaipivaraLoop — costume de la chanson', () => {
  const costume = { key: 'remote:croissant-dance', costume: 'croissant', mp4: '/mascot/caipivara-croissant-dance.mp4', poster: '/mascot/caipivara-croissant-dance-poster.webp' };

  it('shows the costume poster and none of the built-in idle or dance clips', () => {
    const { container } = render(<CaipivaraLoop costume={costume} costumeVideo={false} />);
    const loop = container.querySelector('[data-caipivara-loop]');
    expect(loop).toHaveAttribute('data-costume', 'remote:croissant-dance');
    expect(loop.querySelector('[data-costume-poster]').getAttribute('src')).toBe(costume.poster);
    expect(loop.querySelector('[data-clip="idle"]')).toBeNull();
    expect(loop.querySelector('[data-clip="dance"]')).toBeNull();
  });

  it('a neighbouring slide gets the poster only: no video element, nothing to download', () => {
    const { container } = render(<CaipivaraLoop costume={costume} costumeVideo={false} dancing />);
    expect(container.querySelector('video')).toBeNull();
  });

  it('without a costume, the built-in clips are unchanged', () => {
    const { container } = render(<CaipivaraLoop />);
    expect(container.querySelector('[data-clip="idle"]')).not.toBeNull();
    expect(container.querySelector('[data-costume-poster]')).toBeNull();
  });
});
