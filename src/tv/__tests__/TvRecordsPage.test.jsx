import { describe, it, expect, beforeAll, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { init } from '@noriginmedia/norigin-spatial-navigation';

vi.mock('../components/TvTopNavigation', () => ({ default: () => <nav /> }));
const { default: TvRecordsPage } = await import('../TvRecordsPage');

beforeAll(() => { init({ debug: false, visualDebug: false }); });
beforeEach(() => {
  localStorage.clear();
});

const seed = () => localStorage.setItem('amds-records-v1', JSON.stringify({
  1: { title: 'Urna', entries: [{ name: 'Ana', score: 9000, stars: 4, mode: 'duel', at: 1, id: 'a' }, { name: 'Florent', score: 7000, stars: 3, mode: 'solo', at: 2, id: 'b' }] },
  2: { title: 'Bets', entries: [{ name: 'Bia', score: 9500, stars: 5, mode: 'coop', at: 3, id: 'c' }] },
}));

describe('Recordes — os melhores pontos deste aparelho, todas as músicas', () => {
  it('nothing yet: says how to get on the board', () => {
    render(<TvRecordsPage songs={[]} />);
    expect(screen.getByText(/Ainda não há recordes/)).toBeTruthy();
  });

  it('lists all songs from the best score down, filters by mode, a row opens the song', () => {
    seed();
    const onOpenLobby = vi.fn();
    render(<TvRecordsPage songs={[{ id: 1, title: 'Urna' }, { id: 2, title: 'Bets' }]} onOpenLobby={onOpenLobby} />);
    const rows = screen.getAllByRole('button', { name: /Cantar esta música/ });
    expect(rows.map((r) => r.getAttribute('aria-label').split(',')[0])).toEqual(['1º Bia', '2º Ana', '3º Florent']);
    fireEvent.click(screen.getByRole('button', { name: 'Filtrar: Solo' }));
    expect(screen.getAllByRole('button', { name: /Cantar esta música/ })).toHaveLength(1);
    fireEvent.click(screen.getByRole('button', { name: /Florent/ }));
    expect(onOpenLobby).toHaveBeenCalledWith({ id: 1, title: 'Urna' });
  });
});
