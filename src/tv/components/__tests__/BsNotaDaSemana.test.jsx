import { describe, it, expect, vi, beforeAll, beforeEach } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { init } from '@noriginmedia/norigin-spatial-navigation';

const api = vi.hoisted(() => ({ fetchReactionCounts: vi.fn(), voteReaction: vi.fn() }));
vi.mock('@/api/reactions', () => api);
const { default: BsNotaDaSemana } = await import('../BsNotaDaSemana');

const SONG = { id: 77, title: 'Tá Chovendo de Novo', slug: 'ta-chovendo-de-novo' };
const flush = () => act(async () => { await Promise.resolve(); await Promise.resolve(); await Promise.resolve(); });

beforeAll(() => { init({ debug: false, visualDebug: false }); });
beforeEach(() => { localStorage.clear(); api.fetchReactionCounts.mockReset(); api.voteReaction.mockReset(); });

describe('Nota da semana — grand écran (audit étape 6)', () => {
  it('three named buttons, then the percentages once this device voted', async () => {
    api.voteReaction.mockResolvedValue({ fogo: 3, risada: 1, meh: 0 });
    render(<BsNotaDaSemana song={SONG} />);
    expect(screen.getByText('O que achou da música da semana?')).toBeTruthy();
    expect(screen.getByText('Pegou fogo')).toBeTruthy();
    expect(screen.queryByText(/%/)).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Pegou fogo' }));
    await flush();
    expect(api.voteReaction).toHaveBeenCalledWith('77', expect.any(String), 'fogo');
    expect(screen.getByRole('button', { name: 'Pegou fogo: 75%' }).getAttribute('aria-pressed')).toBe('true');
    expect(screen.getByText('4 votos · escolha outra para mudar')).toBeTruthy();
  });

  it('outage: nothing is shown', async () => {
    localStorage.setItem('amds-reaction-77', 'meh');
    api.fetchReactionCounts.mockRejectedValue(new Error('down'));
    const { container } = render(<BsNotaDaSemana song={SONG} />);
    await flush();
    expect(container.innerHTML).toBe('');
  });
});
