import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import KaraokeGameResults from '../KaraokeGameResults';

const row = (id, name, score, extra = {}) => ({ id, name, score, stars: 3, color: '#FDE047', rank: null, personalBest: false, ...extra });

describe('Fim da partida — vencedor, estrelas, recordes', () => {
  it('duel: names the winner, the best first, a new record is shown', () => {
    render(
      <KaraokeGameResults
        mode="duel"
        rows={[row(0, 'Florent', 4100), row(1, 'Ana', 5200, { rank: 1 })]}
        top={[{ id: 'x', name: 'Ana', score: 5200, mode: 'duel' }]}
        onReplay={vi.fn()}
        onClose={vi.fn()}
      />,
    );
    expect(screen.getByRole('heading', { name: /Ana venceu o duelo!/ })).toBeTruthy();
    const names = screen.getAllByText(/^(Ana|Florent)$/).map((el) => el.textContent);
    expect(names[0]).toBe('Ana');
    expect(screen.getByText('Novo recorde!')).toBeTruthy();
    expect(screen.getByText('Recordes desta música')).toBeTruthy();
  });

  it('a tie says so; coop shows the team; buttons replay and leave', () => {
    const onReplay = vi.fn();
    const onClose = vi.fn();
    const { unmount } = render(<KaraokeGameResults mode="duel" rows={[row(0, 'A', 100), row(1, 'B', 100)]} onReplay={onReplay} onClose={onClose} />);
    expect(screen.getByRole('heading', { name: /Empate!/ })).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: /Cantar de novo/ }));
    fireEvent.click(screen.getByRole('button', { name: /Sair/ }));
    expect(onReplay).toHaveBeenCalled();
    expect(onClose).toHaveBeenCalled();
    unmount();
    render(<KaraokeGameResults mode="coop" rows={[row('team', 'A · B', 9000)]} onReplay={vi.fn()} onClose={vi.fn()} />);
    expect(screen.getByRole('heading', { name: /Nota da equipe/ })).toBeTruthy();
    expect(screen.getByText('Equipe')).toBeTruthy();
  });
});
