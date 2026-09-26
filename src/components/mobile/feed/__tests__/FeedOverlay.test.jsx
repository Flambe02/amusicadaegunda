import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import FeedOverlay from '../FeedOverlay';
import { isReleasedThisWeek, getPublicSlug } from '../feedMedia';

const dismiss = vi.fn();
const toast = vi.fn(() => ({ dismiss }));
vi.mock('@/components/ui/use-toast', () => ({ useToast: () => ({ toast }), toast: (...args) => toast(...args) }));

const LRC = '[00:01.00]Olá\n[00:03.00]Mundo';
// Lundi 21/09/2026 ; « maintenant » = jeudi 24/09/2026 midi, heure de São Paulo.
const NOW = new Date('2026-09-24T15:00:00Z');
const SONG = {
  title: 'Tá Chovendo de Novo',
  slug: 'ta-chovendo-de-novo',
  release_date: '2026-09-21',
  lrc_content: LRC,
  karaoke_published: true,
};

const idlePlayer = { phase: 'playing', isPlaying: true, isMuted: true, isSoundOn: false, getCurrentTime: () => 0, getDuration: () => 60 };
const soundPlayer = { ...idlePlayer, isMuted: false, isSoundOn: true };

function renderOverlay(props = {}) {
  return render(
    <MemoryRouter>
      <FeedOverlay song={SONG} player={idlePlayer} onShowLyrics={vi.fn()} {...props} />
    </MemoryRouter>
  );
}

beforeEach(() => {
  vi.useFakeTimers({ shouldAdvanceTime: true, now: NOW });
  toast.mockClear();
  window.matchMedia = vi.fn().mockImplementation((query) => ({
    matches: false, media: query, addEventListener: vi.fn(), removeEventListener: vi.fn(),
  }));
});
afterEach(() => {
  vi.useRealTimers();
  delete navigator.share;
});

describe('feedMedia — semaine et slug', () => {
  it('knows whether a song came out this week (Mon→Sun, São Paulo)', () => {
    expect(isReleasedThisWeek({ release_date: '2026-09-21' }, NOW)).toBe(true);
    expect(isReleasedThisWeek({ release_date: '2026-09-14' }, NOW)).toBe(false);
    // Dimanche 27/09 23h à São Paulo = lundi 28/09 02h UTC : toujours la même semaine.
    expect(isReleasedThisWeek({ release_date: '2026-09-21' }, new Date('2026-09-28T02:00:00Z'))).toBe(true);
    expect(isReleasedThisWeek({ release_date: null }, NOW)).toBe(false);
  });

  it('uses the slug column for public URLs, the title otherwise', () => {
    expect(getPublicSlug({ slug: 'facebook-166-bilhoes', title: 'Facebook 16,6 bilhões' })).toBe('facebook-166-bilhoes');
    expect(getPublicSlug({ slug: '', title: 'Tá Chovendo de Novo' })).toBe('ta-chovendo-de-novo');
  });
});

describe('FeedOverlay (étape 4)', () => {
  it('no longer shows a permanent week chip (replaced by the ephemeral ribbon)', () => {
    renderOverlay();
    expect(screen.queryByText('Esta semana')).toBeNull();
    expect(document.querySelector('[data-ribbon]')).not.toBeNull();
  });

  it('renders the song title as the page h1 on the first slide, h2 otherwise', () => {
    const { unmount } = renderOverlay();
    expect(screen.getByRole('heading', { level: 1, name: SONG.title })).toBeInTheDocument();
    unmount();
    renderOverlay({ isFirst: false });
    expect(screen.queryByRole('heading', { level: 1 })).toBeNull();
    expect(screen.getByRole('heading', { level: 2, name: SONG.title })).toBeInTheDocument();
  });

  it('shows Cantar only when the karaoke is published, linking to /karaoke?musica=slug', () => {
    const { unmount } = renderOverlay();
    expect(screen.getByRole('link', { name: /cantar/i })).toHaveAttribute('href', '/karaoke?musica=ta-chovendo-de-novo');
    unmount();
    renderOverlay({ song: { ...SONG, karaoke_published: false } });
    expect(screen.queryByRole('link', { name: /cantar/i })).toBeNull();
    expect(screen.queryByText('Cantar')).toBeNull(); // aucune mention
  });

  it('opens the lyrics through the callback', () => {
    const onShowLyrics = vi.fn();
    renderOverlay({ onShowLyrics });
    fireEvent.click(screen.getByRole('button', { name: /ver a letra/i }));
    expect(onShowLyrics).toHaveBeenCalledTimes(1);
  });

  it('shares with the Web Share API, on the song page URL', async () => {
    navigator.share = vi.fn(() => Promise.resolve());
    renderOverlay();
    await act(async () => { fireEvent.click(screen.getByRole('button', { name: /compartilhar/i })); });
    expect(navigator.share).toHaveBeenCalledWith(
      expect.objectContaining({ url: 'https://www.amusicadasegunda.com/musica/ta-chovendo-de-novo/' })
    );
  });

  it('falls back to copying the link when Web Share is missing', async () => {
    const writeText = vi.fn(() => Promise.resolve());
    Object.defineProperty(navigator, 'clipboard', { value: { writeText }, configurable: true });
    renderOverlay();
    await act(async () => { fireEvent.click(screen.getByRole('button', { name: /compartilhar/i })); });
    expect(writeText).toHaveBeenCalledWith('https://www.amusicadasegunda.com/musica/ta-chovendo-de-novo/');
    expect(toast).toHaveBeenCalledWith(expect.objectContaining({ title: 'Link copiado' }));
  });

  it('one « Link copiado » at a time: a new copy replaces the previous toast, which closes after 3 s', async () => {
    const writeText = vi.fn(() => Promise.resolve());
    Object.defineProperty(navigator, 'clipboard', { value: { writeText }, configurable: true });
    renderOverlay();
    toast.mockClear();
    dismiss.mockClear();
    await act(async () => { fireEvent.click(screen.getByRole('button', { name: /compartilhar/i })); });
    const afterFirst = dismiss.mock.calls.length; // un toast d'un test précédent a pu être remplacé
    await act(async () => { fireEvent.click(screen.getByRole('button', { name: /compartilhar/i })); });
    expect(toast).toHaveBeenCalledTimes(2);
    expect(dismiss).toHaveBeenCalledTimes(afterFirst + 1); // le premier est remplacé
    act(() => { vi.advanceTimersByTime(3100); });
    expect(dismiss).toHaveBeenCalledTimes(afterFirst + 2); // le second se ferme seul
  });

  it('when copying fails: no error toast, a small panel with the link selected and ready to copy', async () => {
    Object.defineProperty(navigator, 'clipboard', { value: undefined, configurable: true });
    renderOverlay();
    toast.mockClear();
    await act(async () => { fireEvent.click(screen.getByRole('button', { name: /compartilhar/i })); });
    expect(toast).not.toHaveBeenCalled();
    const field = await screen.findByRole('textbox', { name: 'Link da música' });
    expect(field).toHaveValue('https://www.amusicadasegunda.com/musica/ta-chovendo-de-novo/');
    expect(field).toHaveAttribute('readonly');
    expect(screen.getByRole('button', { name: 'Copiar' })).toBeInTheDocument();
    expect(screen.queryByText('Não deu para copiar')).toBeNull();
  });

  it('has no Caipivara avatar, no bubble and no video loop on the feed', () => {
    const { container } = renderOverlay({ player: soundPlayer });
    expect(screen.queryByText(/Psiu/)).toBeNull();
    expect(container.querySelector('video')).toBeNull();
    expect(container.querySelector('[src*="caipivara"], source[src*="caipivara"]')).toBeNull();
    const rail = ['Ver a letra', 'Cantar', 'Compartilhar'];
    for (const name of rail) expect(screen.getByRole(name === 'Cantar' ? 'link' : 'button', { name: new RegExp(name, 'i') })).toBeInTheDocument();
  });

  it('title: full size with the sound off, one discreet line with the sound on — same h1 element', () => {
    const { rerender } = renderOverlay();
    const h1 = screen.getByRole('heading', { level: 1 });
    expect(h1).toHaveAttribute('data-compact', 'false');
    expect(h1.className).toContain('text-[28px]');
    expect(h1.className).toMatch(/line-clamp-2/);

    rerender(
      <MemoryRouter>
        <FeedOverlay song={SONG} player={soundPlayer} onShowLyrics={vi.fn()} />
      </MemoryRouter>
    );
    const same = screen.getByRole('heading', { level: 1 });
    expect(same).toBe(h1); // même élément, seul le style change
    expect(same).toHaveAttribute('data-compact', 'true');
    expect(same.className).toContain('text-[15px]');
    expect(same.className).toMatch(/truncate/);
    // Lisibilité sur miniature claire : opacité pleine, ombre plus dense.
    expect(same.className).not.toMatch(/opacity-\d/);
    expect(same.className).toContain('rgba(0,0,0,0.85)');
  });

  it('the title transition is disabled under reduced motion', () => {
    renderOverlay();
    expect(screen.getByRole('heading', { level: 1 }).className).toMatch(/motion-reduce:transition-none/);
  });

  it('puts no gradient or veil on the video; text and icons get a soft shadow instead', () => {
    const { container } = renderOverlay({ player: soundPlayer });
    expect(container.querySelector('[class*="bg-gradient"]')).toBeNull();
    const h1 = screen.getByRole('heading', { level: 1 });
    expect(h1.className).toContain('[text-shadow:0_1px_2px_rgba(0,0,0,0.85)'); // titre compact : ombre dense
    const letra = screen.getByRole('button', { name: /ver a letra/i });
    expect(letra.querySelector('svg').getAttribute('class')).toContain('drop-shadow');
    expect(letra.querySelector('span[aria-hidden]:last-child').className).toContain('[text-shadow:');
  });

  it('Som is a small speaker at the top right (not in the rail), only once the sound is on', () => {
    const mute = vi.fn();
    const { unmount } = renderOverlay({ player: { ...soundPlayer, mute } });
    const som = screen.getByRole('button', { name: 'Silenciar' });
    expect(som).toHaveAttribute('data-sound-toggle');
    expect(som.closest('[data-rail]')).toBeNull();
    expect(som.className).toMatch(/right-3/);
    expect(som.className).toMatch(/top-\[calc\(max\(env\(safe-area-inset-top\)/);
    fireEvent.click(som);
    expect(mute).toHaveBeenCalledTimes(1);
    expect([...document.querySelector('[data-rail]').children].map((el) => el.textContent)).toEqual(['Letra', 'Cantar', 'Compartilhar']);
    unmount();
    renderOverlay(); // son coupé : haut-parleur barré à la même place
    expect(screen.queryByRole('button', { name: 'Silenciar' })).toBeNull();
    expect(screen.getByRole('button', { name: 'Ativar o som' })).toHaveAttribute('data-sound-toggle', 'muted');
  });

  it('never writes a news headline line (no manchete source yet)', () => {
    renderOverlay({ song: { ...SONG, subtitle: 'O mês já virou o setembro mais chuvoso' } });
    expect(screen.queryByText(/setembro mais chuvoso/)).toBeNull();
  });
});
