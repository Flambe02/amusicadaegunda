import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';

const renderVerseImage = vi.fn(async () => new Blob(['x'], { type: 'image/jpeg' }));
const shareVerseImage = vi.fn(async () => 'shared');
vi.mock('@/lib/verseImage', async (importOriginal) => ({
  ...(await importOriginal()),
  renderVerseImage: (...args) => renderVerseImage(...args),
  shareVerseImage: (...args) => shareVerseImage(...args),
}));

import VerseShareLyrics from '../VerseShareLyrics';

const LYRICS = 'Em mil oitocentos e oitenta e nove\nDeodoro veio mudar minha sorte\n\nFizeram feriado da minha demissão!';
const SONG = { title: '15 de Novembro', youtube_music_url: 'https://www.youtube.com/shorts/Po7ukRmaj58' };

describe('VerseShareLyrics', () => {
  beforeEach(() => { renderVerseImage.mockClear(); shareVerseImage.mockClear(); });

  it('every non-empty line is a button; no share bar until a line is chosen', () => {
    render(<VerseShareLyrics lyricsText={LYRICS} song={SONG} slug="15-de-novembro" />);
    expect(screen.getAllByRole('button')).toHaveLength(3);
    expect(screen.queryByRole('button', { name: /compartilhar como imagem/i })).toBeNull();
  });

  it('prepares the image as soon as lines are chosen, then shares it with the song link', async () => {
    render(<VerseShareLyrics lyricsText={LYRICS} song={SONG} slug="15-de-novembro" />);
    fireEvent.click(screen.getByRole('button', { name: /oitenta e nove/ }));
    fireEvent.click(screen.getByRole('button', { name: /mudar minha sorte/ }));
    expect(screen.getByRole('button', { name: /mudar minha sorte/ })).toHaveAttribute('aria-pressed', 'true');

    const share = await screen.findByRole('button', { name: /compartilhar como imagem/i });
    await waitFor(() => expect(share).not.toBeDisabled());
    const { verses, title, backgrounds } = renderVerseImage.mock.calls.at(-1)[0];
    expect(verses).toEqual(['Em mil oitocentos e oitenta e nove', 'Deodoro veio mudar minha sorte']);
    expect(title).toBe('15 de Novembro');
    expect(backgrounds[0]).toBe('https://i.ytimg.com/vi/Po7ukRmaj58/oar2.jpg');

    fireEvent.click(share);
    await waitFor(() => expect(shareVerseImage).toHaveBeenCalledTimes(1));
    expect(shareVerseImage.mock.calls[0][1]).toEqual({
      fileName: '15-de-novembro.jpg',
      text: '15 de Novembro — https://www.amusicadasegunda.com/musica/15-de-novembro/',
    });
  });
});
