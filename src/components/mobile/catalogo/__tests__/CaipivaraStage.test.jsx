import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import CaipivaraStage from '../CaipivaraStage';
import { ANIMATIONS, pickAnimation, pickSong } from '../stageDraw';

const SONGS = [
  { id: 1, title: 'Tá Chovendo de Novo', slug: 'ta-chovendo-de-novo', status: 'published' },
  { id: 2, title: 'Europa Deu Vácuo no Boi', slug: 'europa-deu-vacuo-no-boi', status: 'published' },
  { id: 3, title: 'Combo Master', slug: 'combo-master', status: 'published' },
  { id: 4, title: 'Rascunho', slug: 'rascunho', status: 'draft' },
];

let reduceMotion = false;
beforeEach(() => {
  reduceMotion = false;
  vi.useFakeTimers({ shouldAdvanceTime: true });
  window.matchMedia = vi.fn().mockImplementation((query) => ({
    matches: query.includes('reduce') ? reduceMotion : false, media: query,
    addEventListener: vi.fn(), removeEventListener: vi.fn(),
  }));
  window.HTMLMediaElement.prototype.play = vi.fn();
});
afterEach(() => { vi.useRealTimers(); });

const renderStage = (songs = SONGS) => render(
  <MemoryRouter>
    <CaipivaraStage songs={songs} />
  </MemoryRouter>
);
const caipivara = () => screen.getByRole('button', { name: /toque na caipivara/i });
const endAnimation = (container) => {
  const playing = [...container.querySelectorAll('video[data-clip]')].find((v) => v.className.includes('opacity-100') && v.dataset.clip !== 'idle');
  fireEvent.ended(playing);
};

describe('stageDraw — tirages', () => {
  it('never draws the same animation twice in a row', () => {
    let last = null;
    for (let i = 0; i < 60; i++) {
      const next = pickAnimation(last);
      expect(next.key).not.toBe(last);
      last = next.key;
    }
    expect(ANIMATIONS.map((a) => a.key)).toEqual(['hat', 'flip', 'samba']);
  });

  it('draws among published songs only, never the one just proposed', () => {
    let last = null;
    for (let i = 0; i < 60; i++) {
      const song = pickSong(SONGS, last);
      expect(song.status).toBe('published');
      expect(song.id).not.toBe(last?.id);
      last = song;
    }
    expect(pickSong([], null)).toBeNull();
  });
});

describe('CaipivaraStage — la scène (étape 9)', () => {
  it('only the Caipivara moves: the idle loop plays, no list is shown, the h1 is visually hidden', () => {
    const { container } = renderStage();
    expect(container.querySelector('video[data-clip="idle"]')).toHaveAttribute('loop');
    expect(container.querySelector('ul, ol')).toBeNull();
    expect(screen.getByRole('heading', { level: 1, name: 'Catálogo de músicas' })).toHaveClass('sr-only');
    expect(screen.getByText('Toque em mim e eu escolho uma música pra você.')).toBeInTheDocument();
  });

  it('loads the three animations lightly (metadata) until the first tap', () => {
    const { container } = renderStage();
    for (const key of ['hat', 'flip', 'samba']) {
      expect(container.querySelector(`video[data-clip="${key}"]`)).toHaveAttribute('preload', 'metadata');
    }
    fireEvent.click(caipivara());
    expect(container.querySelector('video[data-clip="hat"]')).toHaveAttribute('preload', 'auto');
  });

  it('a tap plays one animation with its line, then proposes a song with Ouvir and Outra', () => {
    const { container } = renderStage();
    fireEvent.click(caipivara());
    expect(caipivara()).toHaveAttribute('data-stage', 'animating');
    const lines = ANIMATIONS.map((a) => a.line);
    expect(lines.some((line) => screen.queryByText(line))).toBe(true);
    endAnimation(container);
    expect(caipivara()).toHaveAttribute('data-stage', 'result');
    expect(screen.getByText(/^Que tal “.+”\?$/)).toBeInTheDocument();
    const ouvir = screen.getByRole('link', { name: 'Ouvir' });
    expect(ouvir.getAttribute('href')).toMatch(/^\/\?musica=/);
    expect(ouvir.className).toContain('bg-app-yellow');
    expect(screen.getByRole('button', { name: 'Outra' }).className).not.toMatch(/yellow/);
  });

  it('ignores repeated taps during an animation', () => {
    const { container } = renderStage();
    fireEvent.click(caipivara());
    const playingBefore = container.querySelectorAll('video.opacity-100[data-clip]:not([data-clip="idle"])');
    fireEvent.click(caipivara());
    fireEvent.click(caipivara());
    expect(HTMLMediaElement.prototype.play).toHaveBeenCalledTimes(1);
    expect(container.querySelectorAll('video.opacity-100[data-clip]:not([data-clip="idle"])')).toHaveLength(playingBefore.length);
  });

  it('« Outra » draws again: another animation and another song than the previous ones', () => {
    const { container } = renderStage();
    fireEvent.click(caipivara());
    const firstClip = [...container.querySelectorAll('video.opacity-100[data-clip]')].find((v) => v.dataset.clip !== 'idle').dataset.clip;
    endAnimation(container);
    const firstTitle = screen.getByText(/^Que tal/).textContent;
    fireEvent.click(screen.getByRole('button', { name: 'Outra' }));
    const secondClip = [...container.querySelectorAll('video.opacity-100[data-clip]')].find((v) => v.dataset.clip !== 'idle').dataset.clip;
    expect(secondClip).not.toBe(firstClip);
    endAnimation(container);
    expect(screen.getByText(/^Que tal/).textContent).not.toBe(firstTitle);
  });

  it('shows the result even if an animation never ends (playback refused)', () => {
    renderStage();
    fireEvent.click(caipivara());
    act(() => { vi.advanceTimersByTime(7100); });
    expect(caipivara()).toHaveAttribute('data-stage', 'result');
  });

  it('a tap made before the catalogue has loaded still starts, and the song is drawn at the end', () => {
    const { container, rerender } = renderStage([]);
    fireEvent.click(caipivara());
    expect(caipivara()).toHaveAttribute('data-stage', 'animating');
    rerender(
      <MemoryRouter>
        <CaipivaraStage songs={SONGS} />
      </MemoryRouter>
    );
    endAnimation(container);
    expect(caipivara()).toHaveAttribute('data-stage', 'result');
    expect(screen.getByRole('link', { name: 'Ouvir' })).toBeInTheDocument();
  });

  it('goes back to the invitation if the catalogue is still unavailable at the end', () => {
    const { container } = renderStage([]);
    fireEvent.click(caipivara());
    endAnimation(container);
    expect(caipivara()).toHaveAttribute('data-stage', 'idle');
    expect(screen.getByText('Toque em mim e eu escolho uma música pra você.')).toBeInTheDocument();
  });

  it('under reduced motion: still image, no animation, the result shows at once', () => {
    reduceMotion = true;
    const { container } = renderStage();
    expect(container.querySelector('video')).toBeNull();
    expect(container.querySelector('img[src*="caipivara-idle-poster"]')).not.toBeNull();
    fireEvent.click(caipivara());
    expect(caipivara()).toHaveAttribute('data-stage', 'result');
    expect(screen.getByRole('link', { name: 'Ouvir' })).toBeInTheDocument();
  });

  it('blends the video edges into the page (radial mask), no rectangle', () => {
    const { container } = renderStage();
    const mask = container.querySelector('video[data-clip="idle"]').parentElement;
    expect(mask.style.maskImage || mask.style.webkitMaskImage).toMatch(/radial-gradient/);
  });

  it('never writes a song count', () => {
    const { container } = renderStage();
    expect(container.textContent).not.toMatch(/\d+\s*(músicas|paródias|canções)/i);
  });
});
