import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';

vi.mock('@/lib/releaseLinks', () => ({
  findReleaseLinks: vi.fn(async () => ({
    youtube_music_url: { status: 'found', url: 'https://www.youtube.com/shorts/NEW', title: 'Mister Veto' },
    youtube_url: { status: 'not_configured' },
    spotify_url: { status: 'found', url: 'https://open.spotify.com/track/NEW', title: 'Mister Veto' },
    apple_music_url: { status: 'not_found' },
  })),
}));

import ReleaseLinksFinder from '../ReleaseLinksFinder';

describe('ReleaseLinksFinder', () => {
  it('fills empty fields only and offers « Usar este » for a different existing link', async () => {
    const onApply = vi.fn();
    const values = { youtube_music_url: '', youtube_url: '', spotify_url: 'https://open.spotify.com/track/OLD', apple_music_url: '' };
    render(<ReleaseLinksFinder title="Mister Veto" releaseDate="2026-11-10" values={values} onApply={onApply} />);

    fireEvent.click(screen.getByRole('button', { name: /buscar links/i }));
    await waitFor(() => expect(screen.getByText(/diferente do link atual/)).toBeTruthy());

    expect(onApply).toHaveBeenCalledTimes(1);
    expect(onApply).toHaveBeenCalledWith('youtube_music_url', 'https://www.youtube.com/shorts/NEW');
    expect(screen.getByText(/ainda não configurado/)).toBeTruthy();

    fireEvent.click(screen.getByRole('button', { name: /usar este/i }));
    expect(onApply).toHaveBeenLastCalledWith('spotify_url', 'https://open.spotify.com/track/NEW');
  });
});
