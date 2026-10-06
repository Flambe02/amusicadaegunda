import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

const api = vi.hoisted(() => ({ getFull: vi.fn() }));
vi.mock('@/api/entities', () => ({ Song: api }));

import LyricsDialog from '../LyricsDialog';

const SUMMARY = { id: 7, title: 'Sem Ficha Nenhuma', slug: 'sem-ficha-nenhuma', __summary: true };

function renderDialog(song = SUMMARY) {
  return render(
    <MemoryRouter>
      <LyricsDialog open onOpenChange={vi.fn()} song={song} />
    </MemoryRouter>
  );
}

beforeEach(() => {
  api.getFull.mockReset();
});

describe('LyricsDialog — chanson complète chargée à l’ouverture', () => {
  it('shows the lyrics once the full song arrives', async () => {
    api.getFull.mockResolvedValue({ ...SUMMARY, lyrics: 'Primeira linha\nSegunda linha' });
    renderDialog();
    expect(screen.getByRole('status')).toHaveTextContent('Carregando a letra');
    expect(await screen.findByText(/Primeira linha/)).toBeInTheDocument();
  });

  it('a failed load is an error with « Tentar novamente », never « Letras não disponíveis »', async () => {
    api.getFull.mockRejectedValueOnce(new Error('Failed to fetch'));
    renderDialog();
    expect(await screen.findByRole('alert')).toHaveTextContent('Não foi possível carregar a letra');
    expect(screen.queryByText(/Letras não disponíveis/)).toBeNull();

    api.getFull.mockResolvedValue({ ...SUMMARY, lyrics: 'Agora sim' });
    fireEvent.click(screen.getByRole('button', { name: 'Tentar novamente' }));
    expect(await screen.findByText('Agora sim')).toBeInTheDocument();
    expect(screen.queryByRole('alert')).toBeNull();
    expect(api.getFull).toHaveBeenCalledTimes(2);
  });

  it('a song that really has no lyrics still says so', async () => {
    api.getFull.mockResolvedValue({ ...SUMMARY, lyrics: '' });
    renderDialog();
    expect(await screen.findByText(/Letras não disponíveis/)).toBeInTheDocument();
    expect(screen.queryByRole('alert')).toBeNull();
  });
});
