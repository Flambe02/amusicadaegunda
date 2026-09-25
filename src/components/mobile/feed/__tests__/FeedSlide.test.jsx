import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import FeedSlide from '../FeedSlide';
import MobileFeed from '../MobileFeed';
import { FALLBACK_DELAY_MS, REVEAL_DELAY_MS } from '../useShortPlayer';

// ── Faux lecteur YouTube : on pilote ses événements à la main ─────────────────────────
let players = [];
class FakePlayer {
  constructor(target, options) {
    this.options = options;
    this.muted = true;
    this.state = -1;
    this.calls = [];
    this.iframe = document.createElement('iframe');
    target.replaceWith(this.iframe);
    players.push(this);
  }
  // API appelée par le hook
  mute() { this.calls.push('mute'); this.muted = true; }
  unMute() { this.calls.push('unMute'); this.muted = false; }
  setVolume() {}
  unloadModule(name) { this.calls.push('unload:' + name); }
  isMuted() { return this.muted; }
  playVideo() { this.calls.push('playVideo'); }
  pauseVideo() { this.calls.push('pauseVideo'); }
  seekTo() {}
  getPlayerState() { return this.state; }
  getCurrentTime() { return 0; }
  getDuration() { return 60; }
  getIframe() { return this.iframe; }
  destroy() { this.calls.push('destroy'); }
  // Pilotage depuis le test
  ready() { this.options.events.onReady({ target: this }); }
  play() { this.state = 1; this.options.events.onStateChange({ target: this, data: 1 }); }
}

vi.mock('@/hooks/useYouTubeIframeApi', () => ({
  loadYouTubeIframeApi: () => Promise.resolve({ Player: FakePlayer }),
}));

const SHORT_SONG = {
  title: 'Tá Chovendo de Novo',
  youtube_music_url: 'https://www.youtube.com/shorts/AbCdEfGhIjK',
  youtube_url: 'https://music.youtube.com/watch?v=ZZZZZZZZZZZ',
};
const NO_SHORT_SONG = {
  title: 'Sem Short',
  youtube_music_url: null,
  youtube_url: 'https://music.youtube.com/watch?v=ZZZZZZZZZZZ',
};

const flush = () => act(async () => { await Promise.resolve(); await Promise.resolve(); });
const posterOf = (container) => container.querySelector('img');
const section = (container) => container.querySelector('section');

async function renderWithLoadedPoster(song = SHORT_SONG) {
  const utils = render(<FeedSlide song={song} />);
  const img = posterOf(utils.container);
  Object.defineProperty(img, 'naturalWidth', { value: 576, configurable: true });
  fireEvent.load(img);
  await flush();
  return utils;
}

beforeEach(() => {
  players = [];
  vi.useFakeTimers({ shouldAdvanceTime: true });
});
afterEach(() => {
  vi.useRealTimers();
});

describe('FeedSlide — Short de la semaine (étape 3)', () => {
  it('shows the vertical Short thumbnail first, with high fetch priority', () => {
    const { container } = render(<FeedSlide song={SHORT_SONG} />);
    const img = posterOf(container);
    expect(img.getAttribute('src')).toBe('https://i.ytimg.com/vi/AbCdEfGhIjK/oar2.jpg');
    expect(img.getAttribute('fetchpriority')).toBe('high');
    expect(players).toHaveLength(0); // aucun lecteur avant la miniature
  });

  it('creates the player only after the thumbnail has loaded, with the spec params', async () => {
    await renderWithLoadedPoster();
    expect(players).toHaveLength(1);
    const { host, videoId, playerVars } = players[0].options;
    expect(host).toBe('https://www.youtube-nocookie.com');
    expect(videoId).toBe('AbCdEfGhIjK');
    expect(playerVars).toMatchObject({
      autoplay: 1, mute: 1, playsinline: 1, loop: 1, playlist: 'AbCdEfGhIjK', controls: 0,
    });
  });

  it('keeps a single iframe in the slide', async () => {
    const { container } = await renderWithLoadedPoster();
    expect(container.querySelectorAll('iframe')).toHaveLength(1);
  });

  it('fades the video in after PLAYING, once YouTube has hidden its start-up chrome', async () => {
    const { container } = await renderWithLoadedPoster();
    expect(section(container)).toHaveAttribute('data-feed-phase', 'loading');
    act(() => { players[0].ready(); players[0].play(); });
    expect(section(container)).toHaveAttribute('data-feed-phase', 'loading'); // miniature encore
    act(() => { vi.advanceTimersByTime(REVEAL_DELAY_MS + 10); });
    expect(section(container)).toHaveAttribute('data-feed-phase', 'playing');
  });

  it('does not fall back once PLAYING has arrived, even before the video is revealed', async () => {
    const { container } = await renderWithLoadedPoster();
    act(() => { players[0].ready(); vi.advanceTimersByTime(1000); players[0].play(); });
    act(() => { vi.advanceTimersByTime(FALLBACK_DELAY_MS); });
    expect(section(container)).not.toHaveAttribute('data-feed-phase', 'fallback');
  });

  it('reveals the video at once when the user turns the sound on during the wait', async () => {
    const { container } = await renderWithLoadedPoster();
    const player = players[0];
    act(() => { player.ready(); player.play(); });
    expect(section(container)).toHaveAttribute('data-feed-phase', 'loading');
    fireEvent.click(screen.getByRole('button', { name: 'Ouvir com som' }));
    expect(section(container)).toHaveAttribute('data-feed-phase', 'playing');
  });

  it('unloads YouTube auto-captions', async () => {
    await renderWithLoadedPoster();
    act(() => { players[0].ready(); });
    expect(players[0].calls).toContain('unload:captions');
  });

  it('falls back to the thumbnail + « Toque para ouvir » when PLAYING does not come within 3 s', async () => {
    const { container } = await renderWithLoadedPoster();
    act(() => { vi.advanceTimersByTime(FALLBACK_DELAY_MS + 10); });
    expect(section(container)).toHaveAttribute('data-feed-phase', 'fallback');
    expect(screen.getByText('Toque para ouvir')).toBeInTheDocument();
    expect(posterOf(container)).toBeInTheDocument();
  });

  it('toggles sound: first tap unMute (+ playVideo in fallback), second tap mute', async () => {
    await renderWithLoadedPoster();
    const player = players[0];
    act(() => { player.ready(); });
    act(() => { vi.advanceTimersByTime(FALLBACK_DELAY_MS + 10); }); // repli : pas de PLAYING

    const button = screen.getByRole('button', { name: 'Ouvir com som' });
    player.calls.length = 0;
    fireEvent.click(button);
    expect(player.calls).toEqual(['unMute', 'playVideo']);

    act(() => { player.play(); });
    const muteButton = screen.getByRole('button', { name: 'Silenciar' });
    expect(screen.queryByText('Toque para ouvir')).toBeNull();
    player.calls.length = 0;
    fireEvent.click(muteButton);
    expect(player.calls).toEqual(['mute']);
    expect(screen.getByRole('button', { name: 'Ouvir com som' })).toBeInTheDocument();
  });

  it('takes the sound state from the player, not from the click', async () => {
    await renderWithLoadedPoster();
    const player = players[0];
    act(() => { player.ready(); player.play(); });
    // Le navigateur remute tout seul (ex. politique d'autoplay) : l'UI doit le refléter.
    act(() => { player.muted = false; vi.advanceTimersByTime(300); });
    expect(screen.getByRole('button', { name: 'Silenciar' })).toBeInTheDocument();
    act(() => { player.muted = true; vi.advanceTimersByTime(300); });
    expect(screen.getByRole('button', { name: 'Ouvir com som' })).toBeInTheDocument();
  });

  it('queues a tap made before the player is ready and applies it on ready', async () => {
    await renderWithLoadedPoster();
    fireEvent.click(screen.getByRole('button', { name: 'Ouvir com som' }));
    const player = players[0];
    act(() => { player.ready(); });
    expect(player.calls).toContain('unMute');
    expect(player.calls).not.toContain('mute');
  });

  it('never loads a player when the song has no Short, and shows its artwork', async () => {
    const { container } = await renderWithLoadedPoster(NO_SHORT_SONG);
    expect(players).toHaveLength(0);
    expect(section(container)).toHaveAttribute('data-feed-phase', 'none');
    expect(container.querySelector('iframe')).toBeNull();
    expect(screen.queryByRole('button')).toBeNull();
    expect(posterOf(container).getAttribute('src')).toBe('https://img.youtube.com/vi/ZZZZZZZZZZZ/hqdefault.jpg');
  });

  it('skips YouTube 120-px grey placeholders to the next thumbnail', () => {
    const { container } = render(<FeedSlide song={SHORT_SONG} />);
    const img = posterOf(container);
    Object.defineProperty(img, 'naturalWidth', { value: 120, configurable: true });
    fireEvent.load(img);
    expect(posterOf(container).getAttribute('src')).toBe('https://i.ytimg.com/vi/AbCdEfGhIjK/hqdefault.jpg');
  });

  it('destroys the player on unmount', async () => {
    const { unmount } = await renderWithLoadedPoster();
    const player = players[0];
    unmount();
    expect(player.calls).toContain('destroy');
  });
});

describe('MobileFeed', () => {
  it('renders the first song of the list', () => {
    const { container } = render(<MobileFeed songs={[SHORT_SONG, NO_SHORT_SONG]} />);
    expect(container.querySelectorAll('section')).toHaveLength(1);
    expect(section(container)).toHaveAttribute('aria-label', SHORT_SONG.title);
  });

  it('never renders an empty screen or a « nenhuma música » message', () => {
    const { container } = render(<MobileFeed songs={[]} />);
    expect(container.querySelector('img')).toHaveAttribute('src', '/images/caipivara-3d-960.webp');
    expect(container.textContent).not.toMatch(/nenhuma|não disponível/i);
  });
});
