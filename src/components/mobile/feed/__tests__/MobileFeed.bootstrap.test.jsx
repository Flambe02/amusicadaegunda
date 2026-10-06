import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, fireEvent, act } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import MobileFeed from '../MobileFeed';
import { FALLBACK_DELAY_MS, REVEAL_DELAY_MS } from '../useShortPlayer';
import { resetWarmUpForTests } from '../playerBootstrap';

vi.mock('@/components/ui/use-toast', () => ({ useToast: () => ({ toast: vi.fn() }), toast: vi.fn(() => ({ dismiss: vi.fn() })) }));
vi.mock('@/native', () => ({ getPlatform: () => 'web' }));

// Faux lecteur YouTube, et chargement de l'IFrame API compté.
let players = [];
class FakePlayer {
  constructor(target, options) {
    this.options = options;
    this.muted = true;
    this.state = -1;
    this.iframe = document.createElement('iframe');
    target.replaceWith(this.iframe);
    players.push(this);
  }
  mute() { this.muted = true; }
  unMute() { this.muted = false; }
  setVolume() {}
  unloadModule() {}
  isMuted() { return this.muted; }
  playVideo() {}
  pauseVideo() {}
  stopVideo() {}
  loadVideoById() {}
  seekTo() {}
  getPlayerState() { return this.state; }
  getCurrentTime() { return 0; }
  getDuration() { return 60; }
  getIframe() { return this.iframe; }
  destroy() {}
  ready() { this.options.events.onReady({ target: this }); }
  play() { this.state = 1; this.options.events.onStateChange({ target: this, data: 1 }); }
}
const apiLoads = vi.hoisted(() => ({ count: 0 }));
vi.mock('@/hooks/useYouTubeIframeApi', () => ({
  loadYouTubeIframeApi: () => { apiLoads.count += 1; return Promise.resolve({ Player: FakePlayer }); },
}));

const song = (id, title, shortId) => ({
  id,
  title,
  slug: title.toLowerCase().replace(/[^a-z]+/g, '-'),
  release_date: '2026-09-21',
  youtube_music_url: shortId ? `https://www.youtube.com/shorts/${shortId}` : null,
  youtube_url: 'https://music.youtube.com/watch?v=ZZZZZZZZZZZ',
});
const SONGS = [song(3, 'Semana Tres', 'AAAAAAAAAAA'), song(2, 'Semana Dois', 'BBBBBBBBBBB'), song(1, 'Semana Um', 'CCCCCCCCCCC')];

const flush = () => act(async () => { await Promise.resolve(); await Promise.resolve(); });
const stage = (container) => container.querySelector('section[data-feed-index]');
const posterOf = (container) => stage(container).querySelector(':scope > div > div:last-child img');
const preconnects = () => [...document.head.querySelectorAll('link[rel="preconnect"]')].map((link) => link.getAttribute('href'));

function renderFeed(props = {}) {
  return render(
    <MemoryRouter>
      <MobileFeed songs={SONGS} onShowLyrics={vi.fn()} {...props} />
    </MemoryRouter>
  );
}

async function settlePoster(container) {
  const img = posterOf(container);
  Object.defineProperty(img, 'naturalWidth', { value: 576, configurable: true });
  fireEvent.load(img);
  await flush();
}

function setConnection(connection) {
  Object.defineProperty(window.navigator, 'connection', { value: connection, configurable: true });
}

beforeEach(() => {
  players = [];
  apiLoads.count = 0;
  resetWarmUpForTests();
  document.head.querySelectorAll('link[rel="preconnect"]').forEach((link) => link.remove());
  setConnection(undefined);
  vi.useFakeTimers({ shouldAdvanceTime: true });
  localStorage.clear();
  window.matchMedia = vi.fn().mockImplementation((query) => ({
    matches: false, media: query, addEventListener: vi.fn(), removeEventListener: vi.fn(),
  }));
});
afterEach(() => {
  vi.useRealTimers();
  setConnection(undefined);
});

describe('MobileFeed — démarrage du lecteur YouTube', () => {
  it('prepares YouTube while the thumbnail loads (connections + IFrame API) without creating the player', async () => {
    const { container } = renderFeed();
    await flush();
    expect(apiLoads.count).toBe(1);
    expect(preconnects()).toEqual(['https://www.youtube.com', 'https://www.youtube-nocookie.com']);
    expect(players).toHaveLength(0);
    expect(stage(container)).toHaveAttribute('data-feed-phase', 'poster');
    expect(stage(container).querySelector('iframe')).toBeNull();
  });

  it('creates ONE player once the thumbnail is in, and never a second one', async () => {
    const { container } = renderFeed();
    await settlePoster(container);
    expect(players).toHaveLength(1);
    act(() => { players[0].ready(); players[0].play(); vi.advanceTimersByTime(REVEAL_DELAY_MS + 10); });
    await flush();
    expect(players).toHaveLength(1);
    expect(stage(container).querySelectorAll('iframe')).toHaveLength(1);
  });

  it('keeps the thumbnail on screen through poster and loading, until the video really plays', async () => {
    const { container } = renderFeed();
    const videoLayer = () => stage(container).querySelector('iframe')?.parentElement.parentElement;
    expect(posterOf(container)).not.toBeNull();

    await settlePoster(container);
    expect(stage(container)).toHaveAttribute('data-feed-phase', 'loading');
    expect(posterOf(container)).not.toBeNull();
    // Cachée par opacité + découpe, jamais par `visibility: hidden` (Chrome briderait
    // l'iframe : la lecture démarrait plusieurs secondes plus tard).
    expect(videoLayer().className).toContain('opacity-0');
    expect(videoLayer().className).toContain('clip-path');
    expect(videoLayer().className).not.toContain('invisible');

    // PLAYING reçu : la vidéo reste cachée encore REVEAL_DELAY_MS (image noire du démarrage).
    act(() => { players[0].ready(); players[0].play(); });
    expect(videoLayer().className).toContain('opacity-0');

    act(() => { vi.advanceTimersByTime(REVEAL_DELAY_MS + 10); });
    expect(videoLayer().className).toContain('opacity-100');
    // La miniature n'est jamais retirée : la vidéo se fond PAR-DESSUS (aucun trou noir).
    expect(posterOf(container)).not.toBeNull();
  });

  it('the neighbouring thumbnails wait for the first one (they never compete with it)', async () => {
    const { container } = renderFeed();
    const sources = () => [...stage(container).querySelectorAll('img')].map((img) => img.getAttribute('src'));
    expect(sources().some((src) => src.includes('BBBBBBBBBBB'))).toBe(false);
    await settlePoster(container);
    expect(sources().some((src) => src.includes('BBBBBBBBBBB'))).toBe(true);
  });

  it.each([
    ['Save-Data', { saveData: true, effectiveType: '4g' }],
    ['2G', { saveData: false, effectiveType: '2g' }],
  ])('%s: nothing from YouTube is loaded before the user asks for it', async (_label, connection) => {
    setConnection(connection);
    const { container } = renderFeed();
    await settlePoster(container);
    expect(apiLoads.count).toBe(0);
    expect(preconnects()).toEqual([]);
    expect(players).toHaveLength(0);
    expect(stage(container)).toHaveAttribute('data-feed-phase', 'fallback');
    expect(posterOf(container)).not.toBeNull();

    // Le tap sur la vidéo la demande : le lecteur est alors créé.
    fireEvent.click(stage(container).querySelector('button[aria-label="Ouvir com som"]'));
    await flush();
    expect(players).toHaveLength(1);
  });

  it('signals « first screen settled » when the video plays — not on a slow-network fallback', async () => {
    const onFirstScreenSettled = vi.fn();
    const { container } = renderFeed({ onFirstScreenSettled });
    await settlePoster(container);
    act(() => { vi.advanceTimersByTime(FALLBACK_DELAY_MS + 10); });
    expect(stage(container)).toHaveAttribute('data-feed-phase', 'fallback');
    expect(onFirstScreenSettled).not.toHaveBeenCalled();

    act(() => { players[0].ready(); players[0].play(); vi.advanceTimersByTime(REVEAL_DELAY_MS + 10); });
    expect(stage(container)).toHaveAttribute('data-feed-phase', 'playing');
    expect(onFirstScreenSettled).toHaveBeenCalled();
  });

  it('a feed with no video at all is settled at once', async () => {
    const onFirstScreenSettled = vi.fn();
    renderFeed({ songs: [{ id: 9, title: 'Sem Video', slug: 'sem-video', release_date: '2026-09-21' }], onFirstScreenSettled });
    await flush();
    expect(onFirstScreenSettled).toHaveBeenCalled();
    expect(apiLoads.count).toBe(0);
  });
});
