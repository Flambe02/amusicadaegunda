import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Suspense } from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';

const getFull = vi.fn();
vi.mock('@/api/entities', () => ({ Song: { getFull: (...args) => getFull(...args) } }));
// Le lecteur réel (YouTube, micro) n'est pas l'objet du test : on regarde ce qu'il reçoit.
vi.mock('@/components/karaoke/KaraokePlayer', () => ({
  default: ({ song }) => <div data-testid="player">{song.lrc_content ? 'lrc' : 'sem-lrc'}</div>,
}));

import TvKaraokeScreen from '../TvKaraokeScreen';

const SUMMARY = { id: 7, title: 'Resumo', __summary: true };
const FULL = { id: 7, title: 'Resumo', lrc_content: '[00:01.00]a', timing_data: [] };
const show = (props) => render(<Suspense fallback={null}><TvKaraokeScreen onClose={() => {}} {...props} /></Suspense>);

beforeEach(() => { getFull.mockReset(); });

describe('TvKaraokeScreen — la chanson complète avant le lecteur', () => {
  it('a summary: the player is mounted only with the full song (LRC, word timing)', async () => {
    let resolve;
    getFull.mockReturnValue(new Promise((done) => { resolve = done; }));
    show({ song: SUMMARY });
    expect(screen.queryByTestId('player')).toBeNull();
    expect(screen.getByRole('status')).toBeTruthy();
    resolve(FULL);
    expect((await screen.findByTestId('player')).textContent).toBe('lrc');
  });

  it('the wait cue is the delayed one (nothing before 400 ms, CSS only)', () => {
    getFull.mockReturnValue(new Promise(() => {}));
    show({ song: SUMMARY });
    expect(screen.getByRole('status').className).toContain('tv-wait');
  });

  it('a failed load says so and retries — it is not shown as a song without karaoke', async () => {
    getFull.mockRejectedValueOnce(new Error('offline')).mockResolvedValueOnce(FULL);
    show({ song: SUMMARY });
    const retry = await screen.findByRole('button', { name: 'Tentar novamente' });
    expect(screen.getByRole('alert').textContent).toContain('Não foi possível carregar o karaokê');
    expect(screen.queryByTestId('player')).toBeNull();
    await waitFor(() => expect(document.activeElement).toBe(retry));
    fireEvent.click(retry);
    expect((await screen.findByTestId('player')).textContent).toBe('lrc');
  });

  it('a song that is already complete goes straight to the player, without a request for it', async () => {
    show({ song: FULL });
    expect((await screen.findByTestId('player')).textContent).toBe('lrc');
    expect(getFull).not.toHaveBeenCalled();
  });

  it('the next song of the queue is asked for in advance', async () => {
    getFull.mockResolvedValue(FULL);
    const next = { id: 8, title: 'Seguinte', __summary: true };
    show({ song: FULL, nextSong: next });
    await screen.findByTestId('player');
    expect(getFull).toHaveBeenCalledWith(next);
  });
});
