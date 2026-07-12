import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { HelmetProvider } from 'react-helmet-async';

// ── Mocks ──
const LRC = '[00:01.00]Olá\n[00:03.00]Mundo';

const SONGS = [
  { id: '1', title: 'Camarada Quer CPF', subtitle: 'Espião russo', category: 'internacional', release_date: '2026-07-06', lrc_content: LRC },
  { id: '2', title: 'Independência ou Gol', subtitle: 'Brasil x Noruega', category: 'esporte', release_date: '2026-07-01', lrc_content: LRC },
  { id: '3', title: 'Messi é o Melhor', subtitle: 'Ronaldo na roda', category: 'esporte', release_date: '2026-06-15', lrc_content: LRC },
  // Non éligible : pas de LRC → ne doit jamais apparaître.
  { id: '99', title: 'Sem Karaoke', subtitle: 'Sem letra', category: 'outros', release_date: '2026-05-01', lrc_content: null },
];

vi.mock('@/api/entities', () => ({
  Song: { list: vi.fn(() => Promise.resolve(SONGS)) },
}));

// Lecteur plein écran : stub léger (évite l'API YouTube).
vi.mock('@/components/karaoke/KaraokePlayer', () => ({
  default: ({ song }) => <div data-testid="karaoke-player">A cantar: {song.title}</div>,
}));

// Capacitor absent en test : le stub renvoie une promesse rejetée (comme le web pur).
vi.mock('@capacitor/app', () => ({ App: { addListener: () => Promise.reject(new Error('no native')) } }));

import KaraokePage from '../Karaoke';

function renderPage() {
  return render(
    <HelmetProvider>
      <KaraokePage />
    </HelmetProvider>,
  );
}

beforeEach(() => {
  localStorage.clear();
});

describe('KaraokePage', () => {
  it('renders and shows only karaoke-eligible songs', async () => {
    renderPage();
    expect(await screen.findByText('Camarada Quer CPF')).toBeInTheDocument();
    expect(screen.getByText('Independência ou Gol')).toBeInTheDocument();
    expect(screen.queryByText('Sem Karaoke')).not.toBeInTheDocument();
    // compteur dynamique = 3 éligibles
    expect(screen.getByText(/3 músicas prontas para cantar/i)).toBeInTheDocument();
  });

  it('searches by title (accent-insensitive)', async () => {
    const user = userEvent.setup();
    renderPage();
    await screen.findByText('Camarada Quer CPF');
    const input = screen.getByLabelText(/buscar música/i);
    await user.type(input, 'independencia');
    expect(screen.getByText('Independência ou Gol')).toBeInTheDocument();
    expect(screen.queryByText('Camarada Quer CPF')).not.toBeInTheDocument();
  });

  it('filters by theme chip', async () => {
    const user = userEvent.setup();
    renderPage();
    await screen.findByText('Camarada Quer CPF');
    await user.click(screen.getByRole('button', { name: 'Esporte' }));
    expect(screen.getByText('Independência ou Gol')).toBeInTheDocument();
    expect(screen.getByText('Messi é o Melhor')).toBeInTheDocument();
    expect(screen.queryByText('Camarada Quer CPF')).not.toBeInTheDocument();
  });

  it('clears filters', async () => {
    const user = userEvent.setup();
    renderPage();
    await screen.findByText('Camarada Quer CPF');
    await user.click(screen.getByRole('button', { name: 'Esporte' }));
    expect(screen.queryByText('Camarada Quer CPF')).not.toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /limpar filtros/i }));
    expect(screen.getByText('Camarada Quer CPF')).toBeInTheDocument();
  });

  it('opens the player when a card is selected', async () => {
    const user = userEvent.setup();
    renderPage();
    await screen.findByText('Camarada Quer CPF');
    await user.click(screen.getByRole('button', { name: 'Cantar Camarada Quer CPF' }));
    expect(await screen.findByTestId('karaoke-player')).toHaveTextContent('Camarada Quer CPF');
  });

  it('opens the surprise modal and can close it', async () => {
    const user = userEvent.setup();
    renderPage();
    await screen.findByText('Camarada Quer CPF');
    await user.click(screen.getByRole('button', { name: /me surpreenda/i }));
    const dialog = await screen.findByRole('dialog');
    expect(within(dialog).getByText(/sua surpresa/i)).toBeInTheDocument();
    await user.click(within(dialog).getByRole('button', { name: 'Fechar' }));
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
  });

  it('surprise "Cantar agora" opens the player via the same path as a card', async () => {
    const user = userEvent.setup();
    renderPage();
    await screen.findByText('Camarada Quer CPF');
    await user.click(screen.getByRole('button', { name: /me surpreenda/i }));
    const dialog = await screen.findByRole('dialog');
    await user.click(within(dialog).getByRole('button', { name: /cantar agora/i }));
    expect(await screen.findByTestId('karaoke-player')).toBeInTheDocument();
  });
});
