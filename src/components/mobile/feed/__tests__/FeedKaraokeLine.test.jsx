import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, act } from '@testing-library/react';
import FeedKaraokeLine from '../FeedKaraokeLine';
import { FEED_KARAOKE_SHORT_VERIFIED_SLUGS, canShowFeedKaraoke, isShortsVerifyMode, lineProgress } from '../feedKaraoke';
import { parseLrc } from '@/lib/lrc';

const LRC = '[00:02.00]Primeira linha\n[00:06.00]Segunda linha\n[00:10.00]Terceira linha';
const SONG = { title: 'Chuva', slug: 'chuva', lrc_content: LRC, karaoke_published: true };

let now = 0;
let reduceMotion = false;
const player = (overrides = {}) => ({
  phase: 'playing', isMuted: false, getCurrentTime: () => now, ...overrides,
});

beforeEach(() => {
  now = 0;
  reduceMotion = false;
  vi.useFakeTimers();
  window.matchMedia = vi.fn().mockImplementation((query) => ({
    matches: query.includes('reduce') ? reduceMotion : false, media: query,
    addEventListener: vi.fn(), removeEventListener: vi.fn(),
  }));
});
afterEach(() => { vi.useRealTimers(); });

const at = (seconds) => act(() => { now = seconds; vi.advanceTimersByTime(40); });

describe('feedKaraoke — helpers (read-only LRC)', () => {
  it('only for published karaoke; full track (same video as the karaoke player) yes, a Short only once verified', () => {
    expect(canShowFeedKaraoke(SONG, 'audio')).toBe(true);
    expect(canShowFeedKaraoke({ ...SONG, karaoke_published: false }, 'audio')).toBe(false);
    expect(canShowFeedKaraoke({ ...SONG, lrc_content: '' }, 'audio')).toBe(false);
    // Short : synchro non vérifiable tant que la chanson n'est pas dans la liste.
    expect(FEED_KARAOKE_SHORT_VERIFIED_SLUGS.size).toBe(0);
    expect(canShowFeedKaraoke(SONG, 'video')).toBe(false);
    FEED_KARAOKE_SHORT_VERIFIED_SLUGS.add('chuva');
    try {
      expect(canShowFeedKaraoke(SONG, 'video')).toBe(true);
      expect(canShowFeedKaraoke({ ...SONG, karaoke_published: false }, 'video')).toBe(false);
    } finally {
      FEED_KARAOKE_SHORT_VERIFIED_SLUGS.delete('chuva');
    }
    // Rien ne joue, ou le calque Ouvir recouvre le feed : jamais.
    expect(canShowFeedKaraoke(SONG, 'none')).toBe(false);
    expect(canShowFeedKaraoke(SONG, undefined)).toBe(false);
  });

  it('dev-only verify mode: ?verificar-karaoke=1 shows the line on every Short for the session, =0 stops it', () => {
    const previous = window.location.href;
    try {
      window.history.replaceState(null, '', '/?verificar-karaoke=1');
      expect(isShortsVerifyMode()).toBe(true);
      window.history.replaceState(null, '', '/');
      expect(canShowFeedKaraoke(SONG, 'video')).toBe(true); // gardé pour la session
      expect(canShowFeedKaraoke({ ...SONG, karaoke_published: false }, 'video')).toBe(false);
      window.history.replaceState(null, '', '/?verificar-karaoke=0');
      expect(isShortsVerifyMode()).toBe(false);
      expect(canShowFeedKaraoke(SONG, 'video')).toBe(false);
    } finally {
      sessionStorage.clear();
      window.history.replaceState(null, '', previous);
    }
  });

  it('line progress runs 0 → 1 from the line start to the next line', () => {
    const parsed = parseLrc(LRC);
    expect(lineProgress(parsed, 0, 2)).toBe(0);
    expect(lineProgress(parsed, 0, 4)).toBe(0.5);
    expect(lineProgress(parsed, 0, 7)).toBe(1);
    expect(lineProgress(parsed, 2, 12)).toBe(0.5); // dernière ligne : 4 s par défaut
  });
});

describe('FeedKaraokeLine (step 5)', () => {
  it('follows the player clock: the active LRC line, filling with yellow; nothing before the first line', () => {
    const { container } = render(<FeedKaraokeLine song={SONG} player={player()} mode="audio" />);
    at(1);
    expect(container.querySelector('[data-feed-karaoke]')).toBeNull(); // pas de placeholder
    at(3); // la ligne apparaît…
    at(3); // … puis se peint à l'image suivante
    const line = container.querySelector('[data-feed-karaoke]');
    expect(line).toHaveTextContent('Primeira linha');
    expect(line.querySelector('span').style.backgroundImage).toMatch(/rgb\(253, 224, 71\) 25%/);
    at(7);
    expect(container.querySelector('[data-feed-karaoke]')).toHaveTextContent('Segunda linha');
  });

  it('only with the sound really on: muted or not playing → no line', () => {
    const { container, rerender } = render(<FeedKaraokeLine song={SONG} player={player({ isMuted: true })} mode="audio" />);
    at(3);
    expect(container.querySelector('[data-feed-karaoke]')).toBeNull();
    rerender(<FeedKaraokeLine song={SONG} player={player({ phase: 'loading' })} mode="audio" />);
    at(3);
    expect(container.querySelector('[data-feed-karaoke]')).toBeNull();
  });

  it('no line for a song without published karaoke — the zone does not exist', () => {
    const { container } = render(<FeedKaraokeLine song={{ ...SONG, karaoke_published: false }} player={player()} mode="audio" />);
    at(3);
    expect(container.querySelector('[data-feed-karaoke]')).toBeNull();
  });

  it('reduced motion: no sweep, the current line is fully yellow', () => {
    reduceMotion = true;
    const { container } = render(<FeedKaraokeLine song={SONG} player={player()} mode="audio" />);
    at(3);
    const span = container.querySelector('[data-feed-karaoke] span');
    expect(span.className).toContain('text-[#FDE047]');
    expect(span.style.backgroundImage).toBe('');
  });

  it('on a Short that has not been verified, no line at all (sync unverifiable)', () => {
    const { container, rerender } = render(<FeedKaraokeLine song={SONG} player={player()} mode="video" />);
    at(3);
    at(3);
    expect(container.querySelector('[data-feed-karaoke]')).toBeNull();
    FEED_KARAOKE_SHORT_VERIFIED_SLUGS.add('chuva');
    try {
      rerender(<FeedKaraokeLine song={{ ...SONG }} player={player()} mode="video" />);
      at(3);
      at(3);
      expect(container.querySelector('[data-feed-karaoke]')).toHaveTextContent('Primeira linha');
    } finally {
      FEED_KARAOKE_SHORT_VERIFIED_SLUGS.delete('chuva');
    }
  });

  it('reads the timing like the karaoke player: structured timing_data wins over lrc_content', () => {
    const timing = { schemaVersion: 1, timingMode: 'line', lines: [{ start: 1, end: 5, text: 'Linha estruturada' }] };
    const song = { ...SONG, timing_data: timing };
    const { container } = render(<FeedKaraokeLine song={song} player={player()} mode="audio" />);
    at(2);
    at(2);
    const line = container.querySelector('[data-feed-karaoke]');
    expect(line).toHaveTextContent('Linha estruturada');
  });
});
