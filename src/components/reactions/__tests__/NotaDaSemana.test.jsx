import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

const api = vi.hoisted(() => ({
  fetchReactionCounts: vi.fn(),
  voteReaction: vi.fn(),
}));
vi.mock('@/api/reactions', () => api);
vi.mock('@/components/ui/use-toast', () => ({ useToast: () => ({ toast: vi.fn() }), toast: vi.fn(() => ({ dismiss: vi.fn() })) }));

const { default: NotaDaSemana } = await import('../NotaDaSemana');
const { default: FeedOverlay } = await import('@/components/mobile/feed/FeedOverlay');
const { getDeviceId, percentages, readOwnReaction } = await import('@/lib/reactionDevice');

const SONG = { id: 77, title: 'Tá Chovendo de Novo', slug: 'ta-chovendo-de-novo', release_date: '2026-11-09' };
const flush = () => act(async () => { await Promise.resolve(); await Promise.resolve(); await Promise.resolve(); });

beforeEach(() => {
  localStorage.clear();
  api.fetchReactionCounts.mockReset();
  api.voteReaction.mockReset();
  window.gtag = vi.fn();
  window.matchMedia = vi.fn().mockImplementation((query) => ({
    matches: false, media: query, addEventListener: vi.fn(), removeEventListener: vi.fn(), addListener: vi.fn(), removeListener: vi.fn(),
  }));
});
afterEach(() => { delete window.gtag; });

describe('NotaDaSemana — avant / après le vote', () => {
  it('before voting: the prompt and three emoji buttons, no percentage, no request', () => {
    render(<NotaDaSemana song={SONG} />);
    expect(screen.getByText('O que achou da música da semana?')).toBeInTheDocument();
    for (const name of ['Pegou fogo', 'Morri de rir', 'Meh']) {
      expect(screen.getByRole('button', { name })).toHaveAttribute('aria-pressed', 'false');
    }
    expect(screen.queryByText(/%/)).toBeNull();
    expect(api.fetchReactionCounts).not.toHaveBeenCalled();
  });

  it('after voting: percentages and total, own choice highlighted, vote remembered, gtag « vote »', async () => {
    api.voteReaction.mockResolvedValue({ fogo: 3, risada: 1, meh: 0 });
    render(<NotaDaSemana song={SONG} />);
    fireEvent.click(screen.getByRole('button', { name: 'Pegou fogo' }));
    await flush();
    expect(api.voteReaction).toHaveBeenCalledWith('77', getDeviceId(), 'fogo');
    expect(screen.getByRole('button', { name: 'Pegou fogo: 75%' })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('button', { name: 'Morri de rir: 25%' })).toHaveAttribute('aria-pressed', 'false');
    expect(screen.getByRole('button', { name: 'Meh: 0%' })).toBeInTheDocument();
    expect(screen.getByText(/^4 votos/)).toBeInTheDocument();
    expect(readOwnReaction('77')).toBe('fogo');
    expect(window.gtag).toHaveBeenCalledWith('event', 'vote', { method: 'nota_da_semana', reaction: 'fogo', item_id: 'ta-chovendo-de-novo' });
  });

  it('the vote can be changed by tapping another emoji; tapping the same one does nothing', async () => {
    api.voteReaction
      .mockResolvedValueOnce({ fogo: 1, risada: 0, meh: 0 })
      .mockResolvedValueOnce({ fogo: 0, risada: 1, meh: 0 });
    render(<NotaDaSemana song={SONG} />);
    fireEvent.click(screen.getByRole('button', { name: 'Pegou fogo' }));
    await flush();
    fireEvent.click(screen.getByRole('button', { name: 'Pegou fogo: 100%' }));
    expect(api.voteReaction).toHaveBeenCalledTimes(1);
    fireEvent.click(screen.getByRole('button', { name: 'Morri de rir: 0%' }));
    await flush();
    expect(api.voteReaction).toHaveBeenLastCalledWith('77', getDeviceId(), 'risada');
    expect(screen.getByRole('button', { name: 'Morri de rir: 100%' })).toHaveAttribute('aria-pressed', 'true');
    expect(readOwnReaction('77')).toBe('risada');
  });

  it('a device that already voted sees the results directly on load', async () => {
    localStorage.setItem('amds-reaction-77', 'meh');
    api.fetchReactionCounts.mockResolvedValue({ fogo: 1, risada: 0, meh: 1 });
    render(<NotaDaSemana song={SONG} />);
    await flush();
    expect(api.fetchReactionCounts).toHaveBeenCalledWith('77');
    expect(screen.getByRole('button', { name: 'Meh: 50%' })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByText(/^2 votos/)).toBeInTheDocument();
  });

  it('hides itself entirely when the RPC fails (migration not applied, network): no error UI', async () => {
    api.voteReaction.mockRejectedValue(new Error('function vote_song_reaction does not exist'));
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const { container } = render(<NotaDaSemana song={SONG} />);
    fireEvent.click(screen.getByRole('button', { name: 'Meh' }));
    await flush();
    expect(container.querySelector('[data-nota-semana]')).toBeNull();
    expect(container.textContent).toBe('');
    expect(readOwnReaction('77')).toBeNull();
    warn.mockRestore();
  });

  it('hides itself when the counts cannot be read for a device that already voted', async () => {
    localStorage.setItem('amds-reaction-77', 'fogo');
    api.fetchReactionCounts.mockRejectedValue(new Error('offline'));
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const { container } = render(<NotaDaSemana song={SONG} />);
    await flush();
    expect(container.querySelector('[data-nota-semana]')).toBeNull();
    warn.mockRestore();
  });

  it('nothing for a song without a database id (static fallback)', () => {
    const { container } = render(<NotaDaSemana song={{ ...SONG, id: 'static-1' }} />);
    expect(container.querySelector('[data-nota-semana]')).toBeNull();
  });

  it('percentages: rounded shares, zeros without votes', () => {
    expect(percentages({ fogo: 0, risada: 0, meh: 0 })).toEqual({ total: 0, share: { fogo: 0, risada: 0, meh: 0 } });
    expect(percentages({ fogo: 2, risada: 1, meh: 0 })).toEqual({ total: 3, share: { fogo: 67, risada: 33, meh: 0 } });
  });

  it('keeps one anonymous uuid per device', () => {
    const id = getDeviceId();
    expect(id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i);
    expect(getDeviceId()).toBe(id);
    expect(localStorage.getItem('amds-device-id')).toBe(id);
  });
});

describe('NotaDaSemana — dans le feed (chanson de la semaine)', () => {
  const muted = { phase: 'playing', isPlaying: true, isMuted: true, isSoundOn: false, getCurrentTime: () => 0, getDuration: () => 60, mute: vi.fn(), unmute: vi.fn() };
  const sound = { ...muted, isMuted: false, isSoundOn: true };
  const renderFeed = (props) => render(
    <MemoryRouter>
      <FeedOverlay song={SONG} player={muted} onShowLyrics={vi.fn()} {...props} />
    </MemoryRouter>
  );

  it('compact pills just above the title; only their buttons catch taps; no yellow on the video', () => {
    renderFeed({ weekSong: true });
    const widget = document.querySelector('[data-nota-semana]');
    expect(widget).not.toBeNull();
    expect(widget.className).toContain('pointer-events-none');
    expect(widget.nextElementSibling.tagName).toBe('H1'); // juste au-dessus du titre
    expect(widget.closest('[data-rail]')).toBeNull();
    const buttons = widget.querySelectorAll('button');
    expect(buttons).toHaveLength(3);
    for (const button of buttons) expect(button.className).toContain('pointer-events-auto');
    expect(widget.querySelector('[class*="app-yellow"]')).toBeNull();
  });

  it('hidden (kept mounted) while the title is compact — the karaoke line lives there', async () => {
    api.voteReaction.mockResolvedValue({ fogo: 1, risada: 0, meh: 0 });
    const { rerender } = renderFeed({ weekSong: true });
    fireEvent.click(screen.getByRole('button', { name: 'Pegou fogo' }));
    await flush();
    rerender(
      <MemoryRouter>
        <FeedOverlay song={SONG} player={sound} weekSong onShowLyrics={vi.fn()} />
      </MemoryRouter>
    );
    const widget = document.querySelector('[data-nota-semana]');
    expect(widget.className).toContain('hidden');
    expect(widget).toHaveAttribute('data-nota-semana', 'results'); // le vote n'est pas perdu
    expect(api.fetchReactionCounts).not.toHaveBeenCalled();
  });
});
