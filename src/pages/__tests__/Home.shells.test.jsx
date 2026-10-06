import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, act, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { HelmetProvider } from 'react-helmet-async';

const WEEK = { id: 3, slug: 'semana-tres', title: 'Semana Tres', artist: 'A Música da Segunda', release_date: '2026-09-21', description: 'História', __summary: true };
const api = vi.hoisted(() => ({
  getCurrentLite: vi.fn(),
  listHomeFeed: vi.fn(),
  listHomeDescriptions: vi.fn(),
  getFull: vi.fn((song) => Promise.resolve(song)),
}));
vi.mock('@/api/entities', () => ({ Song: api }));
vi.mock('@/lib/offlineSongStore', () => ({ saveLastSongSnapshot: vi.fn() }));
vi.mock('@/hooks/useSEO', () => ({ useSEO: vi.fn() }));
vi.mock('@/components/ui/use-toast', () => ({ useToast: () => ({ toast: vi.fn() }), toast: vi.fn() }));
// Le feed et l'accueil desktop sont remplacés par des repères : ce test ne porte que
// sur QUI est monté, dans quelle coquille et à quel moment.
vi.mock('@/components/mobile/feed/MobileFeed', () => ({
  default: ({ songs }) => <div data-testid="mobile-feed">{songs.map((song) => song.title).join(',')}</div>,
}));
vi.mock('../home/HomeDesktop', () => ({
  default: ({ currentSong }) => <div data-testid="home-desktop">{currentSong?.title}</div>,
}));

import Home from '../Home';
import { ShellContext } from '@/components/mobile/ShellContext';
import { markFirstScreenSettled, resetFirstScreenForTests } from '@/lib/firstScreen';

function setViewport(mobile) {
  window.matchMedia = vi.fn().mockImplementation((query) => ({
    matches: query.includes('max-width: 767px') ? mobile : false,
    media: query, addEventListener: vi.fn(), removeEventListener: vi.fn(),
  }));
}

function renderHome(shell) {
  return render(
    <HelmetProvider>
      <MemoryRouter>
        <ShellContext.Provider value={shell}>
          <Home />
        </ShellContext.Provider>
      </MemoryRouter>
    </HelmetProvider>
  );
}

beforeEach(() => {
  resetFirstScreenForTests();
  delete window.__AMDS_BOOT__;
  api.getCurrentLite.mockReset().mockResolvedValue(WEEK);
  api.listHomeFeed.mockReset().mockResolvedValue([{ ...WEEK, description: undefined }, { id: 2, slug: 'dois', title: 'Dois', release_date: '2026-09-14', __summary: true }]);
  api.listHomeDescriptions.mockReset().mockResolvedValue([]);
});
afterEach(() => {
  resetFirstScreenForTests();
});

describe('Home — une coquille ne monte que ce qu\'elle montre', () => {
  it('phone, mobile shell: the feed (song of the week first), never the desktop tree', async () => {
    setViewport(true);
    renderHome('mobile');
    expect(await screen.findByTestId('mobile-feed')).toHaveTextContent('Semana Tres,Dois');
    await act(async () => { markFirstScreenSettled(); });
    expect(screen.queryByTestId('home-desktop')).toBeNull();
  });

  it('phone, desktop shell (hidden): no feed, and the desktop tree only once the first screen is settled', async () => {
    setViewport(true);
    renderHome('desktop');
    await waitFor(() => expect(api.listHomeFeed).toHaveBeenCalled());
    await act(async () => { await Promise.resolve(); });
    expect(screen.queryByTestId('mobile-feed')).toBeNull();
    expect(screen.queryByTestId('home-desktop')).toBeNull();

    await act(async () => { markFirstScreenSettled(); });
    expect(await screen.findByTestId('home-desktop')).toHaveTextContent('Semana Tres');
  });

  it('desktop: the desktop tree at once in its shell, nothing in the mobile shell', async () => {
    setViewport(false);
    const desktop = renderHome('desktop');
    expect(await screen.findByTestId('home-desktop')).toHaveTextContent('Semana Tres');
    expect(screen.queryByTestId('mobile-feed')).toBeNull();
    desktop.unmount();

    renderHome('mobile');
    await waitFor(() => expect(api.listHomeFeed).toHaveBeenCalledTimes(2));
    await act(async () => { await Promise.resolve(); });
    expect(screen.queryByTestId('home-desktop')).toBeNull();
    expect(screen.queryByTestId('mobile-feed')).toBeNull();
  });

  it('with the song already answered by index.html, the feed is in the first render (no waiting screen)', () => {
    setViewport(true);
    window.__AMDS_BOOT__ = { t: Date.now(), song: { id: 3, title: 'Semana Tres', slug: 'semana-tres' }, current: Promise.resolve({ id: 3, title: 'Semana Tres', slug: 'semana-tres' }) };
    renderHome('mobile');
    expect(screen.getByTestId('mobile-feed')).toHaveTextContent('Semana Tres');
  });
});
