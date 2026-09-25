import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { MemoryRouter, useLocation } from 'react-router-dom';

const SONGS = [
  { id: 1, slug: 'chuva', title: 'Chuva', release_date: '2026-09-21', category: 'politica', status: 'published', lyrics: 'água no planalto', youtube_music_url: 'https://www.youtube.com/shorts/AAAAAAAAAAA' },
  { id: 2, slug: 'pix', title: 'Pix', release_date: '2026-09-07', category: 'economia', status: 'published', subtitle: 'preço do café' },
  { id: 3, slug: 'fogos', title: 'Fogos', release_date: '2026-08-10', category: 'politica', status: 'published' },
  { id: 4, slug: 'rascunho', title: 'Rascunho', release_date: '2026-09-14', status: 'draft' },
];

vi.mock('@/api/entities', () => ({ Song: { list: vi.fn(() => Promise.resolve(SONGS)) } }));

// vaul lit matchMedia et quelques API absentes de jsdom.
beforeEach(() => {
  window.matchMedia = window.matchMedia || ((query) => ({
    matches: false, media: query, addListener() {}, removeListener() {}, addEventListener() {}, removeEventListener() {},
  }));
});

const { default: SearchSheet } = await import('../SearchSheet');

let lastPath = '';
function Where() {
  const location = useLocation();
  lastPath = location.pathname + location.search;
  return null;
}

async function renderOpen(onOpenChange = vi.fn()) {
  render(
    <MemoryRouter initialEntries={['/karaoke']}>
      <Where />
      <SearchSheet open onOpenChange={onOpenChange} />
    </MemoryRouter>
  );
  await act(async () => { await Promise.resolve(); await Promise.resolve(); });
  return onOpenChange;
}

const tiles = () => screen.getAllByRole('link').filter((a) => a.getAttribute('href')?.startsWith('/?musica='));
const tileTitles = () => tiles().map((a) => a.textContent);

describe('SearchSheet (étape 10)', () => {
  it('opens with the most recent month selected; only published songs; months with songs only', async () => {
    await renderOpen();
    const month = screen.getByRole('button', { name: 'Setembro' });
    expect(month).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('button', { name: 'Agosto' })).toHaveAttribute('aria-pressed', 'false');
    expect(screen.queryByRole('button', { name: /julho/i })).toBeNull();
    expect(screen.getByText('Por mês · 2026')).toBeInTheDocument();
    expect(tileTitles()).toEqual(['Chuva', 'Pix']);
  });

  it('month and theme combine; a filter with no result shows a sentence + recent songs, never an empty grid', async () => {
    await renderOpen();
    fireEvent.click(screen.getByRole('button', { name: 'Política' }));
    expect(tileTitles()).toEqual(['Chuva']);
    fireEvent.click(screen.getByRole('button', { name: 'Economia' }));
    fireEvent.click(screen.getByRole('button', { name: 'Agosto' }));
    expect(screen.getByText(/nada com esse filtro/i)).toBeInTheDocument();
    expect(tileTitles()).toEqual(['Chuva', 'Pix', 'Fogos']);
  });

  it('typing searches the whole catalogue (title, lyrics, subtitle) and hides the filters until cleared', async () => {
    await renderOpen();
    const field = screen.getByRole('searchbox');
    fireEvent.change(field, { target: { value: 'cafe' } });
    expect(tileTitles()).toEqual(['Pix']);
    expect(screen.queryByText(/por mês/i)).toBeNull();
    expect(screen.queryByText(/por tema/i)).toBeNull();
    fireEvent.change(field, { target: { value: 'fogos' } }); // août : hors du mois par défaut
    expect(tileTitles()).toEqual(['Fogos']);
    fireEvent.change(field, { target: { value: 'zzz' } });
    expect(screen.getByText(/nada com essas palavras/i)).toBeInTheDocument();
    expect(tiles().length).toBeGreaterThan(0);
    fireEvent.click(screen.getByRole('button', { name: 'Limpar a busca' }));
    expect(screen.getByText('Por mês · 2026')).toBeInTheDocument();
  });

  it('a tile opens the feed on that song and closes the panel', async () => {
    const onOpenChange = await renderOpen();
    fireEvent.click(tiles()[0]);
    expect(lastPath).toBe('/?musica=chuva');
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  it('Cancelar closes; « Ver todas as músicas » leads to /musica', async () => {
    const onOpenChange = await renderOpen();
    expect(screen.getByRole('link', { name: 'Ver todas as músicas' })).toHaveAttribute('href', '/musica');
    fireEvent.click(screen.getByRole('button', { name: 'Cancelar' }));
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  it('uses no yellow (the only yellow of the screen stays the nav pill)', async () => {
    await renderOpen();
    const sheet = document.querySelector('[data-search-sheet]');
    expect(sheet.innerHTML).not.toMatch(/yellow|FDE047/i);
  });
});
