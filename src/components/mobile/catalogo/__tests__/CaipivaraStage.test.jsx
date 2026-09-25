import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import CaipivaraStage from '../CaipivaraStage';
import { ANIMATIONS, getSongAudioId, pickAnimation, pickSong } from '../stageDraw';

// Le moteur YouTube (useShortPlayer) est testé avec le feed ; ici on vérifie ce que la
// scène lui demande, et quand.
const player = {};
const hookCalls = [];
function resetPlayer() {
  Object.assign(player, {
    phase: 'playing', isPlaying: false, isMuted: true, isPaused: false, isEnded: false, isSoundOn: false,
    play: vi.fn(), pause: vi.fn(), seekTo: vi.fn(), unmute: vi.fn(), mute: vi.fn(),
    loadNow: vi.fn(() => true), toggleSound: vi.fn(), togglePause: vi.fn(),
    getCurrentTime: () => 30, getDuration: () => 120,
  });
  hookCalls.length = 0;
}
vi.mock('@/components/mobile/feed/useShortPlayer', () => ({
  useShortPlayer: (options) => { hookCalls.push(options); return player; },
}));

const SONGS = [
  { id: 1, title: 'Tá Chovendo de Novo', slug: 'ta-chovendo-de-novo', status: 'published', release_date: '2026-08-31', youtube_url: 'https://music.youtube.com/watch?v=AAAAAAAAAA1', description: 'Chove em São Paulo.' },
  { id: 2, title: 'Europa Deu Vácuo no Boi', slug: 'europa-deu-vacuo-no-boi', status: 'published', release_date: '2026-07-06', youtube_url: 'https://youtu.be/BBBBBBBBBB2' },
  { id: 3, title: 'Combo Master', slug: 'combo-master', status: 'published', release_date: '2026-06-01', youtube_url: 'https://www.youtube.com/watch?v=CCCCCCCCCC3' },
  { id: 4, title: 'Rascunho', slug: 'rascunho', status: 'draft', youtube_url: 'https://youtu.be/DDDDDDDDDD4' },
  { id: 5, title: 'Sem Link', slug: 'sem-link', status: 'published', youtube_url: '' },
];

let reduceMotion = false;
beforeEach(() => {
  reduceMotion = false;
  resetPlayer();
  localStorage.clear();
  vi.useFakeTimers({ shouldAdvanceTime: true });
  window.matchMedia = vi.fn().mockImplementation((query) => ({
    matches: query.includes('reduce') ? reduceMotion : false, media: query,
    addEventListener: vi.fn(), removeEventListener: vi.fn(), addListener: vi.fn(), removeListener: vi.fn(),
  }));
  window.HTMLMediaElement.prototype.play = vi.fn();
  window.HTMLMediaElement.prototype.pause = vi.fn();
});
afterEach(() => { vi.useRealTimers(); });

const renderStage = (songs = SONGS) => render(
  <MemoryRouter>
    <CaipivaraStage songs={songs} />
  </MemoryRouter>
);
const caipivara = () => screen.getByRole('button', { name: /toque na caipivara/i });
const visibleAnimation = (container) =>
  [...container.querySelectorAll('video[data-clip]')].find(
    (v) => v.className.includes('opacity-100') && ANIMATIONS.some((a) => a.key === v.dataset.clip)
  );
const lastVideoId = () => hookCalls[hookCalls.length - 1].videoId;
const songOfVideo = (videoId) => SONGS.find((s) => getSongAudioId(s) === videoId);

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

  it('draws among published songs with a playable link only, never the previous one', () => {
    let last = null;
    for (let i = 0; i < 60; i++) {
      const song = pickSong(SONGS, last);
      expect(song.status).toBe('published');
      expect(getSongAudioId(song)).toMatch(/^[A-Za-z0-9_-]{11}$/);
      expect(song.id).not.toBe(last?.id);
      last = song;
    }
    expect(pickSong([], null)).toBeNull();
    expect(pickSong([SONGS[4]], null)).toBeNull(); // jamais une chanson muette
  });

  it('takes the music from youtube_url (the Roda source), not from the Short', () => {
    expect(getSongAudioId({ youtube_url: 'https://music.youtube.com/watch?v=AAAAAAAAAA1', youtube_music_url: 'https://youtube.com/shorts/ZZZZZZZZZZ9' })).toBe('AAAAAAAAAA1');
  });
});

describe('CaipivaraStage — la musique se lance au tap', () => {
  it('prepares one song in advance on the hidden player, without a loop, and shows nothing of it yet', () => {
    const { container } = renderStage();
    const options = hookCalls[hookCalls.length - 1];
    expect(options.loop).toBe(false);
    expect(options.canLoad).toBe(true);
    expect(songOfVideo(options.videoId)).toBeTruthy();
    expect(container.querySelector('[data-audio-player]')).toHaveAttribute('aria-hidden', 'true');
    expect(screen.getByText('Toque em mim e eu escolho uma música pra você.')).toBeInTheDocument();
    expect(screen.queryByRole('progressbar')).toBeNull();
  });

  it('first tap: restarts the prepared song and turns the sound on inside the gesture', () => {
    renderStage();
    const prepared = songOfVideo(lastVideoId());
    fireEvent.click(caipivara());
    // Appels synchrones, dans le gestionnaire du tap (contrainte iOS).
    expect(player.play).toHaveBeenCalled();
    expect(player.seekTo).toHaveBeenCalledWith(0);
    expect(player.unmute).toHaveBeenCalled();
    expect(player.loadNow).not.toHaveBeenCalled();
    expect(screen.getByText(prepared.title)).toBeInTheDocument();
  });

  it('plays an animation at the tap; no « Que tal / Ouvir / Outra » step', () => {
    const { container } = renderStage();
    fireEvent.click(caipivara());
    expect(caipivara()).toHaveAttribute('data-stage', 'animating');
    expect(visibleAnimation(container)).toBeTruthy();
    expect(screen.queryByText(/que tal/i)).toBeNull();
    expect(screen.queryByRole('link', { name: 'Ouvir' })).toBeNull();
    expect(screen.queryByRole('button', { name: 'Outra' })).toBeNull();
  });

  it('bottom keeps only title, progress bar, play/pause and « Outra » (no month/year line)', () => {
    renderStage([SONGS[0]]);
    fireEvent.click(caipivara());
    expect(screen.getByText(SONGS[0].title)).toBeInTheDocument();
    expect(screen.getByRole('progressbar', { name: 'Progresso da música' })).toHaveAttribute('aria-valuetext', '0:30 de 2:00');
    expect(screen.getByRole('button', { name: 'Tocar' })).toBeInTheDocument(); // son pas encore confirmé par le lecteur
    expect(screen.getByRole('button', { name: 'Outra música' })).toHaveTextContent('Outra');
    // Le mois n'apparaît plus que dans le ruban éphémère.
    const outsideRibbon = screen.queryAllByText(/agosto 2026/i).filter((el) => !el.closest('[data-ribbon]'));
    expect(outsideRibbon).toHaveLength(0);
    expect(document.querySelector('[data-ribbon]')).toHaveTextContent(/agosto 2026/i);
  });

  it('« Outra » plays an animation and loads another song inside the gesture', () => {
    const { container } = renderStage();
    fireEvent.click(caipivara());
    const firstSong = songOfVideo(lastVideoId());
    fireEvent.ended(visibleAnimation(container));
    fireEvent.click(screen.getByRole('button', { name: 'Outra música' }));
    expect(visibleAnimation(container)).toBeTruthy();
    expect(player.loadNow).toHaveBeenCalledTimes(1);
    expect(songOfVideo(player.loadNow.mock.calls[0][0]).id).not.toBe(firstSong.id);
  });

  it('« Ou toque em mim » shows after the first song until the Caipivara is tapped again, then never on this device', () => {
    const { container, unmount } = renderStage();
    expect(screen.queryByText('Ou toque em mim')).toBeNull();
    fireEvent.click(caipivara());
    expect(screen.getByText('Ou toque em mim')).toBeInTheDocument();
    fireEvent.ended(visibleAnimation(container));
    fireEvent.click(screen.getByRole('button', { name: 'Outra música' })); // Outra ne compte pas
    fireEvent.ended(visibleAnimation(container));
    expect(screen.getByText('Ou toque em mim')).toBeInTheDocument();
    fireEvent.click(caipivara());
    expect(screen.queryByText('Ou toque em mim')).toBeNull();
    expect(localStorage.getItem('amds-catalogo-retap')).toBe('1');
    unmount();
    renderStage();
    fireEvent.click(caipivara());
    expect(screen.queryByText('Ou toque em mim')).toBeNull();
  });

  it('a new tap: another animation and another song, loaded inside the gesture', () => {
    const { container, rerender } = renderStage();
    fireEvent.click(caipivara());
    const firstClip = visibleAnimation(container).dataset.clip;
    const firstSong = songOfVideo(lastVideoId());
    fireEvent.ended(visibleAnimation(container));

    fireEvent.click(caipivara());
    expect(visibleAnimation(container).dataset.clip).not.toBe(firstClip);
    expect(player.loadNow).toHaveBeenCalledTimes(1);
    const nextId = player.loadNow.mock.calls[0][0];
    expect(songOfVideo(nextId).id).not.toBe(firstSong.id);
    rerender(<MemoryRouter><CaipivaraStage songs={SONGS} /></MemoryRouter>);
    expect(lastVideoId()).toBe(nextId);
  });

  it('ignores repeated taps during an animation', () => {
    renderStage();
    fireEvent.click(caipivara());
    fireEvent.click(caipivara());
    fireEvent.click(caipivara());
    expect(HTMLMediaElement.prototype.play).toHaveBeenCalledTimes(1);
    expect(player.loadNow).not.toHaveBeenCalled();
  });

  it('dances while the music plays with sound; back to the idle loop on pause or at the end', () => {
    const { container, rerender } = renderStage();
    fireEvent.click(caipivara());
    fireEvent.ended(visibleAnimation(container));
    const rerenderWith = (state) => {
      Object.assign(player, state);
      rerender(<MemoryRouter><CaipivaraStage songs={SONGS} /></MemoryRouter>);
    };
    rerenderWith({ isPlaying: true, isMuted: false, isSoundOn: true });
    expect(caipivara()).toHaveAttribute('data-stage', 'dancing');
    expect(container.querySelector('video[data-clip="dance"]').className).toContain('opacity-100');

    fireEvent.click(screen.getByRole('button', { name: 'Pausar' }));
    expect(player.pause).toHaveBeenCalled();
    rerenderWith({ isPlaying: false, isPaused: true, isSoundOn: false });
    expect(caipivara()).toHaveAttribute('data-stage', 'idle');

    rerenderWith({ isPlaying: false, isPaused: false, isEnded: true, isSoundOn: false });
    expect(caipivara()).toHaveAttribute('data-stage', 'idle');
    fireEvent.click(screen.getByRole('button', { name: 'Tocar' }));
    expect(player.play).toHaveBeenCalled();
    expect(player.unmute).toHaveBeenCalled();
  });

  it('gives the hand back if an animation never ends', () => {
    renderStage();
    fireEvent.click(caipivara());
    act(() => { vi.advanceTimersByTime(7100); });
    expect(caipivara()).toHaveAttribute('data-stage', 'idle');
  });

  it('Ouvir layer: borrows the feed player, starts on the given song, reports each song change', () => {
    const external = {
      ...player, isSoundOn: true, isMuted: false, isPlaying: true,
      loadNow: vi.fn(() => true), play: vi.fn(), unmute: vi.fn(),
    };
    const onSongChange = vi.fn();
    const { container } = render(
      <MemoryRouter>
        <CaipivaraStage songs={SONGS} player={external} initialSong={SONGS[0]} onSongChange={onSongChange} />
      </MemoryRouter>
    );
    // Son propre lecteur reste inerte : aucun videoId, rien à charger, pas de conteneur.
    expect(hookCalls.every((call) => call.videoId === null && call.canLoad === false)).toBe(true);
    expect(container.querySelector('[data-audio-player]')).toBeNull();
    expect(screen.getByText(SONGS[0].title)).toBeInTheDocument();
    expect(caipivara()).toHaveAttribute('data-stage', 'dancing');
    expect(onSongChange).toHaveBeenLastCalledWith(SONGS[0]);
    expect(screen.queryByRole('heading', { level: 1 })).toBeNull(); // le h1 reste celui du feed

    fireEvent.click(screen.getByRole('button', { name: 'Outra música' }));
    expect(external.loadNow).toHaveBeenCalledTimes(1);
    const next = songOfVideo(external.loadNow.mock.calls[0][0]);
    expect(next.id).not.toBe(SONGS[0].id);
    expect(onSongChange).toHaveBeenLastCalledWith(next);
  });

  it('Ouvir layer: « Toque para ouvir » (the only yellow) when the sound could not start', () => {
    const external = { ...player, isMuted: true, isSoundOn: false, play: vi.fn(), unmute: vi.fn() };
    render(
      <MemoryRouter>
        <CaipivaraStage songs={SONGS} player={external} initialSong={SONGS[0]} onSongChange={vi.fn()} />
      </MemoryRouter>
    );
    const toque = screen.getByRole('button', { name: /toque para ouvir/i });
    expect(toque.className).toContain('bg-app-yellow');
    fireEvent.click(toque);
    expect(external.play).toHaveBeenCalled();
    expect(external.unmute).toHaveBeenCalled();
  });

  it('right rail like the feed: Letra, História, Cantar (if published), Compartilhar, Clipe → feed', () => {
    const karaoke = { ...SONGS[0], lrc_content: '[00:01.00]Chove', karaoke_published: true };
    renderStage([karaoke]);
    expect(document.querySelector('[data-rail]')).toBeNull(); // rien avant le premier tap
    fireEvent.click(caipivara());
    const rail = document.querySelector('[data-rail]');
    expect([...rail.children].map((el) => el.textContent)).toEqual(['Letra', 'História', 'Cantar', 'Compartilhar', 'Clipe']);
    expect(screen.getByRole('link', { name: /ver o clipe/i })).toHaveAttribute('href', '/?musica=ta-chovendo-de-novo');
    expect(screen.getByRole('link', { name: /cantar/i })).toHaveAttribute('href', '/karaoke?musica=ta-chovendo-de-novo');
    // Plus de liens « História » / « Ver o clipe » en bas de l'écran.
    expect(screen.queryByText('Ver o clipe')).toBeNull();
  });

  it('« História » only when the song has a description; no Cantar without published karaoke', () => {
    const { rerender } = renderStage([SONGS[0]]);
    fireEvent.click(caipivara());
    expect(screen.getByRole('button', { name: /história/i })).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: /cantar/i })).toBeNull();
    rerender(<MemoryRouter><CaipivaraStage songs={[SONGS[1]]} /></MemoryRouter>);
    fireEvent.ended(document.querySelector('video.opacity-100[data-clip="hat"], video.opacity-100[data-clip="flip"], video.opacity-100[data-clip="samba"]'));
    fireEvent.click(caipivara());
    expect(screen.getByText(SONGS[1].title)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /história/i })).toBeNull();
  });

  it('a tap before the catalogue has loaded still animates, and the music starts as soon as it arrives', () => {
    const { rerender } = renderStage([]);
    fireEvent.click(caipivara());
    expect(caipivara()).toHaveAttribute('data-stage', 'animating');
    rerender(<MemoryRouter><CaipivaraStage songs={SONGS} /></MemoryRouter>);
    expect(player.unmute.mock.calls.length + player.loadNow.mock.calls.length).toBeGreaterThan(0);
    expect(screen.getByRole('progressbar')).toBeInTheDocument();
  });

  it('under reduced motion: still image, no video, the music starts at once', () => {
    reduceMotion = true;
    const { container } = renderStage();
    expect(container.querySelector('video')).toBeNull();
    expect(container.querySelector('img[src*="caipivara-idle-poster"]')).not.toBeNull();
    fireEvent.click(caipivara());
    expect(player.unmute).toHaveBeenCalled();
    expect(screen.getByRole('progressbar')).toBeInTheDocument();
  });

  it('fades flip and samba back over 400 ms (hat stays at 150 ms)', () => {
    const { container } = renderStage();
    expect(container.querySelector('video[data-clip="hat"]').className).toContain('duration-150');
    expect(container.querySelector('video[data-clip="flip"]').className).toContain('duration-[400ms]');
    expect(container.querySelector('video[data-clip="samba"]').className).toContain('duration-[400ms]');
  });

  it('blends the video edges into the page (radial mask), and never writes a song count', () => {
    const { container } = renderStage();
    const mask = container.querySelector('video[data-clip="idle"]').parentElement;
    expect(mask.style.maskImage || mask.style.webkitMaskImage).toMatch(/radial-gradient/);
    expect(container.textContent).not.toMatch(/\d+\s*(músicas|paródias|canções)/i);
  });
});
