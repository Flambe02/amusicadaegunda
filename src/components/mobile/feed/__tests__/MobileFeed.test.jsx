import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import MobileFeed from '../MobileFeed';
import { FALLBACK_DELAY_MS, REVEAL_DELAY_MS } from '../useShortPlayer';

vi.mock('@/components/ui/use-toast', () => ({ useToast: () => ({ toast: vi.fn() }), toast: vi.fn(() => ({ dismiss: vi.fn() })) }));

// Plateforme : « web » par défaut ; un test simule l'app Android.
const platformMock = vi.hoisted(() => ({ value: 'web' }));
vi.mock('@/native', () => ({ getPlatform: () => platformMock.value }));

// jsdom n'a pas de PointerEvent : version minimale pour piloter le glissement.
if (typeof window.PointerEvent === 'undefined') {
  class PointerEventPolyfill extends MouseEvent {
    constructor(type, init = {}) {
      super(type, init);
      this.pointerId = init.pointerId ?? 1;
      this.pointerType = init.pointerType ?? 'touch';
    }
  }
  window.PointerEvent = PointerEventPolyfill;
}

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
  mute() { this.calls.push('mute'); this.muted = true; }
  unMute() { this.calls.push('unMute'); this.muted = false; }
  setVolume() {}
  unloadModule(name) { this.calls.push('unload:' + name); }
  isMuted() { return this.muted; }
  playVideo() { this.calls.push('playVideo'); if (this.state === 2) this.state = 1; }
  pauseVideo() { this.calls.push('pauseVideo'); this.state = 2; }
  stopVideo() { this.calls.push('stopVideo'); this.state = 5; }
  loadVideoById(id) { this.calls.push('loadVideoById:' + id); this.state = -1; this.time = 0; }
  seekTo(seconds) { this.calls.push('seekTo:' + seconds); this.time = seconds; }
  getPlayerState() { return this.state; }
  getCurrentTime() { return this.time ?? 0; }
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

const song = (id, title, shortId, extra = {}) => ({
  id,
  title,
  slug: title.toLowerCase().replace(/[^a-z]+/g, '-'),
  release_date: '2026-09-21',
  youtube_music_url: shortId ? `https://www.youtube.com/shorts/${shortId}` : null,
  youtube_url: 'https://music.youtube.com/watch?v=ZZZZZZZZZZZ',
  ...extra,
});
const WEEK = song(3, 'Semana Tres', 'AAAAAAAAAAA');
const PREV = song(2, 'Semana Dois', 'BBBBBBBBBBB', { release_date: '2026-09-14' });
const OLDEST = song(1, 'Semana Um', null, { release_date: '2026-09-07' });
const SONGS = [WEEK, PREV, OLDEST];

const flush = () => act(async () => { await Promise.resolve(); await Promise.resolve(); });
const stage = (container) => container.querySelector('section[data-feed-index]');
const currentIndex = (container) => Number(stage(container).dataset.feedIndex);

let reduceMotion = false;

function renderFeed(songs = SONGS) {
  return render(
    <MemoryRouter>
      <MobileFeed songs={songs} onShowLyrics={vi.fn()} />
    </MemoryRouter>
  );
}

/** Rend le feed et termine le chargement de la première miniature (→ lecteur créé). */
async function renderLoaded(songs = SONGS) {
  const utils = renderFeed(songs);
  const img = stage(utils.container).querySelector(':scope > div > div:last-child img');
  Object.defineProperty(img, 'naturalWidth', { value: 576, configurable: true });
  fireEvent.load(img);
  await flush();
  return utils;
}

function swipe(container, dy, { height = 800, dx = 0, durationMs = 0 } = {}) {
  const el = stage(container);
  Object.defineProperty(el, 'clientHeight', { value: height, configurable: true });
  el.setPointerCapture = () => {};
  fireEvent.pointerDown(el, { pointerId: 7, clientX: 200, clientY: 400 });
  fireEvent.pointerMove(el, { pointerId: 7, clientX: 200 + dx / 2, clientY: 400 + dy / 2 });
  fireEvent.pointerMove(el, { pointerId: 7, clientX: 200 + dx, clientY: 400 + dy });
  // Geste lent : on laisse passer du temps entre le début et la fin (vitesse faible).
  if (durationMs) act(() => { vi.advanceTimersByTime(durationMs); });
  fireEvent.pointerUp(el, { pointerId: 7, clientX: 200 + dx, clientY: 400 + dy });
  act(() => { vi.advanceTimersByTime(500); }); // fin de l'animation de glissement
}

beforeEach(() => {
  players = [];
  reduceMotion = false;
  vi.useFakeTimers({ shouldAdvanceTime: true });
  localStorage.clear();
  window.matchMedia = vi.fn().mockImplementation((query) => ({
    matches: query.includes('reduce') ? reduceMotion : false,
    media: query, addEventListener: vi.fn(), removeEventListener: vi.fn(),
  }));
});
afterEach(() => {
  vi.useRealTimers();
});

// ── Étape 3 : lecteur du Short ────────────────────────────────────────────────────────
describe('MobileFeed — Short de la semaine (étape 3)', () => {
  it('shows the vertical Short thumbnail first, with high fetch priority, and no player yet', () => {
    const { container } = renderFeed();
    const img = stage(container).querySelector(':scope > div > div:last-child img');
    expect(img.getAttribute('src')).toBe('https://i.ytimg.com/vi/AAAAAAAAAAA/oar2.jpg');
    expect(img.getAttribute('fetchpriority')).toBe('high');
    expect(players).toHaveLength(0);
  });

  it('creates the player only after the thumbnail has loaded, with the spec params', async () => {
    await renderLoaded();
    expect(players).toHaveLength(1);
    const { host, videoId, playerVars } = players[0].options;
    expect(host).toBe('https://www.youtube-nocookie.com');
    expect(videoId).toBe('AAAAAAAAAAA');
    expect(playerVars).toMatchObject({ autoplay: 1, mute: 1, playsinline: 1, controls: 0 });
    // Pas de boucle native (elle figeait la boucle sur la 1re vidéo) : voir le test de boucle.
    expect(playerVars.loop).toBeUndefined();
    expect(playerVars.playlist).toBeUndefined();
  });

  it('fades the video in after PLAYING, once YouTube has hidden its start-up chrome', async () => {
    const { container } = await renderLoaded();
    expect(stage(container)).toHaveAttribute('data-feed-phase', 'loading');
    act(() => { players[0].ready(); players[0].play(); });
    expect(stage(container)).toHaveAttribute('data-feed-phase', 'loading');
    act(() => { vi.advanceTimersByTime(REVEAL_DELAY_MS + 10); });
    expect(stage(container)).toHaveAttribute('data-feed-phase', 'playing');
  });

  it('falls back to the thumbnail + the central play cue when PLAYING does not come within 3 s', async () => {
    const { container } = await renderLoaded();
    act(() => { vi.advanceTimersByTime(FALLBACK_DELAY_MS + 10); });
    expect(stage(container)).toHaveAttribute('data-feed-phase', 'fallback');
    expect(container.querySelector('[data-play-cue]')).not.toBeNull();
    expect(screen.getByRole('button', { name: 'Ativar o som' })).toBeInTheDocument();
  });

  it('play cue: a ~72 px translucent white ▶ at the centre from arrival until the first gesture, never yellow', async () => {
    const { container } = await renderLoaded();
    const cue = () => container.querySelector('[data-play-cue]');
    expect(cue()).not.toBeNull(); // dès l'arrivée, miniature comprise
    expect(cue().className).toMatch(/h-\[72px\] w-\[72px\]/);
    expect(cue().className).toMatch(/bg-white\/20/);
    expect(stage(container).innerHTML).not.toMatch(/bg-app-yellow/);
    expect(cue().closest('button')).toHaveAttribute('aria-label', 'Ouvir com som');
    act(() => { players[0].ready(); players[0].play(); });
    act(() => { vi.advanceTimersByTime(REVEAL_DELAY_MS + 5000); });
    expect(cue()).not.toBeNull(); // reste jusqu'au premier geste
    fireEvent.click(screen.getByRole('button', { name: 'Ouvir com som' }));
    expect(cue()).toBeNull();
  });

  it('after the first gesture the cue never returns — even when the user mutes — but the muted speaker does', async () => {
    const { container } = await renderLoaded();
    const player = players[0];
    act(() => { player.ready(); player.play(); });
    fireEvent.click(screen.getByRole('button', { name: 'Ouvir com som' }));
    act(() => { player.play(); vi.advanceTimersByTime(1000); });
    fireEvent.click(screen.getByRole('button', { name: 'Silenciar' }));
    act(() => { vi.advanceTimersByTime(1000); });
    expect(container.querySelector('[data-play-cue]')).toBeNull();
    const speaker = screen.getByRole('button', { name: 'Ativar o som' });
    expect(speaker).toHaveAttribute('data-sound-toggle', 'muted');
    player.calls.length = 0;
    fireEvent.click(speaker);
    expect(player.calls).toContain('unMute');
  });

  it('toggles sound: first tap unMute (+ playVideo in fallback), second tap mute', async () => {
    await renderLoaded();
    const player = players[0];
    act(() => { player.ready(); });
    act(() => { vi.advanceTimersByTime(FALLBACK_DELAY_MS + 10); });
    player.calls.length = 0;
    fireEvent.click(screen.getByRole('button', { name: 'Ouvir com som' }));
    expect(player.calls).toEqual(['unMute', 'playVideo']);
    act(() => { player.play(); });
    player.calls.length = 0;
    fireEvent.click(screen.getByRole('button', { name: 'Silenciar' }));
    expect(player.calls).toEqual(['mute']);
  });

  it('takes the sound state from the player, not from the click', async () => {
    await renderLoaded();
    const player = players[0];
    act(() => { player.ready(); player.play(); });
    act(() => { player.muted = false; vi.advanceTimersByTime(300); });
    expect(screen.getByRole('button', { name: 'Silenciar' })).toBeInTheDocument();
    act(() => { player.muted = true; vi.advanceTimersByTime(300); });
    expect(screen.getByRole('button', { name: 'Ouvir com som' })).toBeInTheDocument();
  });

  it('queues a tap made before the player is ready and applies it on ready', async () => {
    await renderLoaded();
    fireEvent.click(screen.getByRole('button', { name: 'Ouvir com som' }));
    act(() => { players[0].ready(); });
    expect(players[0].calls).toContain('unMute');
    expect(players[0].calls).not.toContain('mute');
  });

  it('loops by itself: back to 0 just before the end, never reaching the YouTube end screen', async () => {
    await renderLoaded();
    const player = players[0];
    act(() => { player.ready(); player.play(); });
    act(() => { player.time = 59.8; vi.advanceTimersByTime(300); }); // durée 60 s
    expect(player.calls).toContain('seekTo:0');
  });

  it('unloads YouTube auto-captions', async () => {
    await renderLoaded();
    act(() => { players[0].ready(); });
    expect(players[0].calls).toContain('unload:captions');
  });

  it('destroys the player on unmount', async () => {
    const { unmount } = await renderLoaded();
    const player = players[0];
    unmount();
    expect(player.calls).toContain('destroy');
  });

  it('phone turned to landscape (« Gire o celular »): pauses the playing player, resumes it back in portrait', async () => {
    await renderLoaded();
    const player = players[0];
    act(() => { player.ready(); player.play(); });
    player.calls.length = 0;
    act(() => { window.dispatchEvent(new CustomEvent('amds:orientation-block', { detail: { blocked: true } })); });
    expect(player.calls).toContain('pauseVideo');
    act(() => { window.dispatchEvent(new CustomEvent('amds:orientation-block', { detail: { blocked: false } })); });
    expect(player.calls).toContain('playVideo');
  });

  it('Android app (not TV): starts with the sound, no play cue; web keeps the muted start', async () => {
    platformMock.value = 'android';
    try {
      const { container } = await renderLoaded();
      expect(container.querySelector('[data-play-cue]')).toBeNull();
      const player = players[0];
      act(() => { player.ready(); });
      expect(player.calls).toContain('unMute'); // sans aucun geste
      expect(player.calls).not.toContain('mute');
    } finally {
      platformMock.value = 'web';
    }
  });

  it('web: muted start and the play cue (no sound without a gesture)', async () => {
    const { container } = await renderLoaded();
    expect(container.querySelector('[data-play-cue]')).not.toBeNull();
    act(() => { players[0].ready(); });
    expect(players[0].calls).toContain('mute');
    expect(players[0].calls).not.toContain('unMute');
  });

  it('never renders an empty screen or a « nenhuma música » message', () => {
    const { container } = renderFeed([]);
    expect(container.querySelector('img')).toHaveAttribute('src', '/images/caipivara-3d-960.webp');
    expect(container.textContent).not.toMatch(/nenhuma|não disponível/i);
  });
});

// ── Étape 4b : glissement entre les semaines ──────────────────────────────────────────
describe('MobileFeed — navigation entre les semaines (étape 4b)', () => {
  it('shows the most recent song first; swipe up = previous week, swipe down = back', async () => {
    const { container } = await renderLoaded();
    expect(currentIndex(container)).toBe(0);
    expect(screen.getByRole('heading', { level: 1, name: 'Semana Tres' })).toBeInTheDocument();
    swipe(container, -300);
    expect(currentIndex(container)).toBe(1);
    expect(stage(container)).toHaveAttribute('aria-label', 'Semana Dois');
    swipe(container, +300);
    expect(currentIndex(container)).toBe(0);
  });

  it('a horizontal swipe never changes the song', async () => {
    const { container } = await renderLoaded();
    swipe(container, -40, { dx: -300 });
    expect(currentIndex(container)).toBe(0);
  });

  it('a short, slow drag snaps back', async () => {
    const { container } = await renderLoaded();
    swipe(container, -60, { durationMs: 600 }); // < 20 % de 800 px, 0,1 px/ms
    expect(currentIndex(container)).toBe(0);
  });

  it('keeps ONE player and reuses it (loadVideoById) when the song changes', async () => {
    const { container } = await renderLoaded();
    act(() => { players[0].ready(); players[0].play(); });
    swipe(container, -300);
    expect(players).toHaveLength(1);
    expect(container.querySelectorAll('iframe')).toHaveLength(1);
    expect(players[0].calls).toContain('loadVideoById:BBBBBBBBBBB');
    expect(players[0].calls).not.toContain('destroy');
  });

  it('keeps the sound on when the user had turned it on', async () => {
    const { container } = await renderLoaded();
    const player = players[0];
    act(() => { player.ready(); player.play(); });
    fireEvent.click(screen.getByRole('button', { name: 'Ouvir com som' }));
    player.calls.length = 0; // on ne regarde que ce qui suit le changement de chanson
    swipe(container, -300);
    expect(player.calls).not.toContain('mute');
    act(() => { player.play(); vi.advanceTimersByTime(300); });
    expect(screen.getByRole('button', { name: 'Silenciar' })).toBeInTheDocument();
  });

  it('the first swipe of the visit turns the sound on (TikTok model)', async () => {
    const { container } = await renderLoaded();
    const player = players[0];
    act(() => { player.ready(); player.play(); });
    expect(player.muted).toBe(true);
    swipe(container, -300);
    expect(player.calls).toContain('unMute');
    act(() => { player.play(); vi.advanceTimersByTime(300); });
    expect(screen.queryByRole('button', { name: 'Ativar o som' })).toBeNull();
  });

  it('after the user mutes with the speaker, later swipes keep it muted and the unmute button returns', async () => {
    const { container } = await renderLoaded();
    const player = players[0];
    act(() => { player.ready(); player.play(); });
    swipe(container, -300); // 1er geste : son
    act(() => { player.play(); vi.advanceTimersByTime(300); });
    fireEvent.click(screen.getByRole('button', { name: 'Silenciar' })); // haut-parleur
    act(() => { vi.advanceTimersByTime(300); });
    expect(screen.getByRole('button', { name: 'Ativar o som' })).toBeInTheDocument();
    player.calls.length = 0;
    swipe(container, +300);
    expect(player.calls).not.toContain('unMute');
    act(() => { player.play(); vi.advanceTimersByTime(300); });
    expect(screen.getByRole('button', { name: 'Ativar o som' })).toBeInTheDocument();
  });

  it('when the browser refuses the sound after a swipe (iOS), the play cue comes back and the muted speaker stays', async () => {
    const { container } = await renderLoaded();
    const player = players[0];
    act(() => { player.ready(); player.play(); });
    player.unMute = function refused() { this.calls.push('unMute'); }; // reste muet
    swipe(container, -300); // premier geste : le repère disparaît…
    expect(container.querySelector('[data-play-cue]')).toBeNull();
    act(() => { player.play(); vi.advanceTimersByTime(1000); });
    expect(container.querySelector('[data-play-cue]')).not.toBeNull(); // … et revient : son refusé
    expect(screen.getByRole('button', { name: 'Ativar o som' })).toBeInTheDocument();
  });

  it('song without a Short but with a youtube_url: the SAME hidden player plays the full track, the Caipivara scene shows', async () => {
    const { container } = await renderLoaded();
    const player = players[0];
    act(() => { player.ready(); player.play(); });
    swipe(container, -300);
    swipe(container, -300); // OLDEST : pas de Short, youtube_url présent
    expect(players).toHaveLength(1);
    expect(container.querySelectorAll('iframe')).toHaveLength(1);
    expect(player.calls).toContain('loadVideoById:ZZZZZZZZZZZ'); // la chanson complète
    const scene = container.querySelector('[data-feed-scene="audio"]');
    expect(scene).not.toBeNull();
    expect(scene.querySelector('[data-caipivara-loop]')).toHaveAttribute('data-caipivara-loop', 'idle');
    // L'iframe reste cachée (audio seul), même une fois la lecture lancée.
    act(() => { player.play(); vi.advanceTimersByTime(REVEAL_DELAY_MS + 50); });
    expect(stage(container).querySelector('[aria-hidden="true"].opacity-0 iframe, .opacity-0 > div > iframe')).not.toBeNull();
    // Mêmes règles que les Shorts : son actif → la Caipivara danse ; pas d'icône Ouvir.
    act(() => { player.muted = false; vi.advanceTimersByTime(300); });
    expect(scene.querySelector('[data-caipivara-loop]')).toHaveAttribute('data-caipivara-loop', 'dancing');
    expect(screen.queryByRole('button', { name: /ouvir a música completa/i })).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Pausar' }));
    expect(player.calls).toContain('pauseVideo');
    act(() => { vi.advanceTimersByTime(300); });
    expect(scene.querySelector('[data-caipivara-loop]')).toHaveAttribute('data-caipivara-loop', 'idle');
    // Retour à un Short : même lecteur, la vidéo revient.
    swipe(container, +300);
    expect(players).toHaveLength(1);
    expect(player.calls.filter((c) => c === 'loadVideoById:BBBBBBBBBBB')).toHaveLength(2);
  });

  it('song with neither a Short nor a youtube_url: the Caipivara at rest, no player, Letra still there — never an empty screen', async () => {
    const bare = song(9, 'Sem Links', null, { youtube_url: '', description: 'Uma história.' });
    const { container } = await renderLoaded([WEEK, bare]);
    act(() => { players[0].ready(); players[0].play(); });
    swipe(container, -300);
    expect(stage(container)).toHaveAttribute('data-feed-phase', 'none');
    expect(players[0].calls).toContain('stopVideo');
    expect(container.querySelector('[data-feed-scene="none"] [data-caipivara-loop]')).toHaveAttribute('data-caipivara-loop', 'idle');
    expect(screen.queryByRole('button', { name: /ouvir com som|silenciar|pausar/i })).toBeNull();
    expect(screen.getByRole('button', { name: /ver a letra/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /ler a história/i })).toBeInTheDocument();
  });

  it('reduced motion: the Caipivara scene is the still poster', async () => {
    reduceMotion = true;
    const bare = song(9, 'Sem Links', null, { youtube_url: '' });
    const { container } = await renderLoaded([bare]);
    const loop = container.querySelector('[data-caipivara-loop]');
    expect(loop).toHaveAttribute('data-caipivara-loop', 'still');
    expect(loop.querySelector('video')).toBeNull();
    expect(loop.querySelector('img').getAttribute('src')).toContain('caipivara-idle-poster');
  });

  it('only renders the neighbours thumbnails (previous and next), nothing beyond', async () => {
    const songs = [WEEK, PREV, OLDEST, song(0, 'Semana Zero', 'DDDDDDDDDDD', { release_date: '2026-08-31' })];
    const { container } = await renderLoaded(songs);
    const srcs = [...stage(container).querySelectorAll('img')].map((img) => img.getAttribute('src'));
    expect(srcs.some((s) => s.includes('AAAAAAAAAAA'))).toBe(true); // courante
    expect(srcs.some((s) => s.includes('BBBBBBBBBBB'))).toBe(true); // voisine
    expect(srcs.some((s) => s.includes('DDDDDDDDDDD'))).toBe(false); // au-delà : jamais
  });

  it('at the ends: no destination → gesture inert and the matching button is absent', async () => {
    const { container } = await renderLoaded();
    expect(screen.queryByRole('button', { name: 'Semana seguinte' })).toBeNull(); // déjà la plus récente
    swipe(container, +300);
    expect(currentIndex(container)).toBe(0);
    swipe(container, -300);
    swipe(container, -300); // la plus ancienne
    expect(currentIndex(container)).toBe(2);
    expect(screen.queryByRole('button', { name: 'Semana anterior' })).toBeNull();
    swipe(container, -300);
    expect(currentIndex(container)).toBe(2);
  });

  it('keyboard arrows and the two labelled buttons do the same as the swipe', async () => {
    const { container } = await renderLoaded();
    fireEvent.keyDown(window, { key: 'ArrowDown' });
    act(() => { vi.advanceTimersByTime(500); });
    expect(currentIndex(container)).toBe(1);
    fireEvent.keyDown(window, { key: 'ArrowUp' });
    act(() => { vi.advanceTimersByTime(500); });
    expect(currentIndex(container)).toBe(0);
    fireEvent.click(screen.getByRole('button', { name: 'Semana anterior' }));
    act(() => { vi.advanceTimersByTime(500); });
    expect(currentIndex(container)).toBe(1);
    fireEvent.click(screen.getByRole('button', { name: 'Semana seguinte' }));
    act(() => { vi.advanceTimersByTime(500); });
    expect(currentIndex(container)).toBe(0);
  });

  it('a drag never toggles the sound as well', async () => {
    const { container } = await renderLoaded();
    const player = players[0];
    act(() => { player.ready(); player.play(); });
    player.calls.length = 0;
    const el = stage(container);
    Object.defineProperty(el, 'clientHeight', { value: 800, configurable: true });
    el.setPointerCapture = () => {};
    const button = screen.getByRole('button', { name: 'Ouvir com som' });
    fireEvent.pointerDown(button, { pointerId: 3, clientX: 100, clientY: 400 });
    fireEvent.pointerMove(button, { pointerId: 3, clientX: 100, clientY: 380 });
    act(() => { vi.advanceTimersByTime(600); }); // lent et court : pas de changement
    fireEvent.pointerUp(button, { pointerId: 3, clientX: 100, clientY: 380 });
    fireEvent.click(button);
    expect(player.calls).not.toContain('unMute');
  });

  it('shows the hint until the first swipe, then never again', async () => {
    const { container, unmount } = await renderLoaded();
    expect(screen.getByText('Deslize para a semana anterior')).toBeInTheDocument();
    swipe(container, -300);
    expect(screen.queryByText('Deslize para a semana anterior')).toBeNull();
    unmount();
    await renderLoaded();
    expect(screen.queryByText('Deslize para a semana anterior')).toBeNull();
  });

  it('no hint when there is no previous week', async () => {
    await renderLoaded([WEEK]);
    expect(screen.queryByText('Deslize para a semana anterior')).toBeNull();
  });

  it('under reduced motion: the song changes with no scroll animation', async () => {
    reduceMotion = true;
    const { container } = await renderLoaded();
    const track = stage(container).firstElementChild;
    fireEvent.click(screen.getByRole('button', { name: 'Semana anterior' }));
    expect(currentIndex(container)).toBe(1); // immédiat, sans attendre de transition
    expect(track.style.transition).not.toMatch(/transform \d+ms/);
  });

  it('taps after the sound is on pause and resume, with a big play icon and a blurred cover', async () => {
    const { container } = await renderLoaded();
    const player = players[0];
    act(() => { player.ready(); player.play(); });
    fireEvent.click(screen.getByRole('button', { name: 'Ouvir com som' })); // 1er tap : son
    act(() => { player.play(); vi.advanceTimersByTime(300); });
    player.calls.length = 0;
    fireEvent.click(screen.getByRole('button', { name: 'Pausar' }));
    expect(player.calls).toContain('pauseVideo');
    expect(container.querySelector('[data-feed-paused]')).not.toBeNull();
    const resume = screen.getByRole('button', { name: 'Reproduzir' });
    expect(resume.querySelector('svg')).not.toBeNull();
    fireEvent.click(resume);
    expect(player.calls).toContain('playVideo');
    expect(container.querySelector('[data-feed-paused]')).toBeNull();
  });

  it('keyboard: Space = pause / play, Left / Right = -5 s / +5 s', async () => {
    await renderLoaded();
    const player = players[0];
    act(() => { player.ready(); player.play(); });
    fireEvent.click(screen.getByRole('button', { name: 'Ouvir com som' }));
    act(() => { player.play(); player.time = 20; vi.advanceTimersByTime(300); });
    player.calls.length = 0;
    fireEvent.keyDown(document.body, { key: ' ', code: 'Space' });
    expect(player.calls).toContain('pauseVideo');
    fireEvent.keyDown(document.body, { key: ' ', code: 'Space' });
    expect(player.calls).toContain('playVideo');
    fireEvent.keyDown(document.body, { key: 'ArrowRight' });
    expect(player.calls).toContain('seekTo:25');
    fireEvent.keyDown(document.body, { key: 'ArrowLeft' });
    expect(player.calls).toContain('seekTo:20');
  });

  it('the progress bar can be dragged to seek, shows the time, and never changes week', async () => {
    const { container } = await renderLoaded();
    const player = players[0];
    act(() => { player.ready(); player.play(); vi.advanceTimersByTime(REVEAL_DELAY_MS + 10); });
    const slider = screen.getByRole('slider', { name: 'Posição na música' });
    slider.getBoundingClientRect = () => ({ left: 0, width: 400, top: 758, height: 24, right: 400, bottom: 782 });
    slider.setPointerCapture = () => {};
    Object.defineProperty(stage(container), 'clientHeight', { value: 800, configurable: true });
    player.calls.length = 0;
    fireEvent.pointerDown(slider, { pointerId: 9, clientX: 100, clientY: 770 });
    fireEvent.pointerMove(slider, { pointerId: 9, clientX: 200, clientY: 470 }); // grand geste vertical
    expect(screen.getByText('0:30 / 1:00')).toBeInTheDocument();
    fireEvent.pointerUp(slider, { pointerId: 9, clientX: 200, clientY: 470 });
    act(() => { vi.advanceTimersByTime(500); });
    expect(player.calls).toContain('seekTo:30');
    expect(currentIndex(container)).toBe(0);
  });

  it('the slider exposes its value as m:ss de m:ss', async () => {
    await renderLoaded();
    const player = players[0];
    act(() => { player.ready(); player.play(); player.time = 42; vi.advanceTimersByTime(REVEAL_DELAY_MS + 1100); });
    expect(screen.getByRole('slider')).toHaveAttribute('aria-valuetext', '0:42 de 1:00');
  });

  it('the video shows ~0.3 s after playback starts, on first load and after a swipe', async () => {
    const { container } = await renderLoaded();
    expect(REVEAL_DELAY_MS).toBe(300);
    act(() => { players[0].ready(); players[0].play(); });
    act(() => { vi.advanceTimersByTime(REVEAL_DELAY_MS - 100); });
    expect(stage(container)).toHaveAttribute('data-feed-phase', 'loading'); // miniature encore
    act(() => { vi.advanceTimersByTime(110); });
    expect(stage(container)).toHaveAttribute('data-feed-phase', 'playing');
    swipe(container, -300);
    act(() => { players[0].play(); vi.advanceTimersByTime(REVEAL_DELAY_MS - 100); });
    expect(stage(container)).toHaveAttribute('data-feed-phase', 'loading');
    act(() => { vi.advanceTimersByTime(110); });
    expect(stage(container)).toHaveAttribute('data-feed-phase', 'playing');
  });

  it('shows the video after the same short delay with the sound on', async () => {
    const { container } = await renderLoaded();
    const player = players[0];
    act(() => { player.ready(); });
    fireEvent.click(screen.getByRole('button', { name: 'Ouvir com som' })); // son actif
    act(() => { player.play(); vi.advanceTimersByTime(REVEAL_DELAY_MS + 10); });
    expect(player.muted).toBe(false);
    expect(stage(container)).toHaveAttribute('data-feed-phase', 'playing');
  });

  it('has no gradient over the video, on the current slide or the neighbours', async () => {
    const { container } = await renderLoaded();
    expect(stage(container).querySelector('[class*="bg-gradient"]')).toBeNull();
  });

  it('opens on the song passed by « Ouvir » (/?musica=slug), muted, then clears the parameter', async () => {
    const onStartApplied = vi.fn();
    const { container } = render(
      <MemoryRouter>
        <MobileFeed songs={SONGS} startSlug="semana-um" onStartApplied={onStartApplied} />
      </MemoryRouter>
    );
    await flush();
    expect(currentIndex(container)).toBe(2);
    expect(stage(container)).toHaveAttribute('aria-label', 'Semana Um');
    expect(onStartApplied).toHaveBeenCalledTimes(1);
  });

  it('waits for the full list before placing the feed on the requested song', async () => {
    const onStartApplied = vi.fn();
    const { container, rerender } = render(
      <MemoryRouter>
        <MobileFeed songs={[WEEK]} startSlug="semana-dois" onStartApplied={onStartApplied} />
      </MemoryRouter>
    );
    await flush();
    expect(onStartApplied).not.toHaveBeenCalled();
    rerender(
      <MemoryRouter>
        <MobileFeed songs={SONGS} startSlug="semana-dois" onStartApplied={onStartApplied} />
      </MemoryRouter>
    );
    await flush();
    expect(currentIndex(container)).toBe(1);
    expect(onStartApplied).toHaveBeenCalledTimes(1);
  });

  it('applies a new ?musica= while already mounted (search opened from Início), even the same slug twice', async () => {
    const onStartApplied = vi.fn();
    const at = (startSlug) => (
      <MemoryRouter>
        <MobileFeed songs={SONGS} startSlug={startSlug} onStartApplied={onStartApplied} />
      </MemoryRouter>
    );
    const { container, rerender } = render(at(null));
    await flush();
    expect(currentIndex(container)).toBe(0);
    rerender(at('semana-um'));
    await flush();
    expect(currentIndex(container)).toBe(2);
    rerender(at(null)); // paramètre retiré par onStartApplied
    rerender(at('semana-dois'));
    await flush();
    expect(currentIndex(container)).toBe(1);
    rerender(at(null));
    rerender(at('semana-dois')); // même slug une seconde fois : appliqué aussi
    await flush();
    expect(onStartApplied).toHaveBeenCalledTimes(3);
  });

  describe('Ouvir — the Catálogo layer on the same player (addendum H.9)', () => {
    const renderWith = (props) => (
      <MemoryRouter>
        <MobileFeed songs={SONGS} onShowLyrics={vi.fn()} {...props} />
      </MemoryRouter>
    );

    async function loadedWith(props) {
      const utils = render(renderWith(props));
      const img = stage(utils.container).querySelector(':scope > div > div:last-child img');
      Object.defineProperty(img, 'naturalWidth', { value: 576, configurable: true });
      fireEvent.load(img);
      await flush();
      players[0].ready();
      players[0].play();
      return utils;
    }

    it('rail starts with Ouvir only when the song has a youtube_url, and never shows Clipe', async () => {
      const { rerender } = await loadedWith({ onOpenOuvir: vi.fn() });
      const rail = document.querySelector('section[data-feed-index] [data-rail]');
      expect([...rail.children].map((el) => el.textContent)).toEqual(['Ouvir', 'Letra', 'Compartilhar']);
      rerender(renderWith({ songs: [{ ...WEEK, youtube_url: '' }], onOpenOuvir: vi.fn() }));
      expect(screen.queryByRole('button', { name: /ouvir a música completa/i })).toBeNull();
    });

    it('the tap loads the full track AND unmutes inside the gesture, on the same player, then opens /?ouvir=', async () => {
      const onOpenOuvir = vi.fn();
      await loadedWith({ onOpenOuvir });
      const player = players[0];
      player.calls.length = 0;
      fireEvent.click(screen.getByRole('button', { name: /ouvir a música completa/i }));
      // Dans le même geste, avant tout rendu : chargement + son.
      expect(player.calls.slice(0, 2)).toEqual(['loadVideoById:ZZZZZZZZZZZ', 'unMute']);
      expect(onOpenOuvir).toHaveBeenCalledWith('semana-tres');
    });

    it('the layer borrows the feed player: no second iframe, no reload, feed inert; closing reloads the Short', async () => {
      const { container, rerender } = await loadedWith({ onOpenOuvir: vi.fn() });
      const player = players[0];
      fireEvent.click(screen.getByRole('button', { name: /ouvir a música completa/i }));
      rerender(renderWith({ onOpenOuvir: vi.fn(), ouvirSlug: 'semana-tres' }));
      await flush();
      expect(container.querySelector('[data-ouvir]')).not.toBeNull();
      expect(players).toHaveLength(1);
      expect(container.querySelectorAll('iframe')).toHaveLength(1);
      expect(player.calls.filter((c) => c === 'loadVideoById:ZZZZZZZZZZZ')).toHaveLength(1); // pas de rechargement
      expect(stage(container)).toHaveAttribute('inert');
      expect(container.querySelector('[data-ouvir] [data-rail]').textContent).toContain('Clipe');

      rerender(renderWith({ onOpenOuvir: vi.fn(), ouvirSlug: null })); // Retour
      await flush();
      expect(container.querySelector('[data-ouvir]')).toBeNull();
      expect(stage(container)).not.toHaveAttribute('inert');
      expect(player.calls[player.calls.length - 1]).toBe('loadVideoById:AAAAAAAAAAA');
    });
  });

  it('frames the video exactly like the thumbnail: cover, no extra zoom', () => {
    const { container } = renderFeed();
    const mount = stage(container).querySelector('[style*="100cqw"]');
    // Le navigateur normalise les espaces du calc() : on les ignore.
    expect(mount.style.width.replace(/\s/g, '').endsWith('*1)')).toBe(true);
    expect(mount.style.height.replace(/\s/g, '').endsWith('*1)')).toBe(true);
  });

  it('the first slide title is the h1; after a swipe the new song title is an h2', async () => {
    const { container } = await renderLoaded();
    swipe(container, -300);
    expect(screen.queryByRole('heading', { level: 1 })).toBeNull();
    expect(screen.getByRole('heading', { level: 2, name: 'Semana Dois' })).toBeInTheDocument();
  });
});
