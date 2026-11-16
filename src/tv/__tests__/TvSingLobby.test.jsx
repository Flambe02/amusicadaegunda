import { describe, it, expect, beforeAll, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { init } from '@noriginmedia/norigin-spatial-navigation';

vi.mock('../lib/tvSongRepository', () => ({
  toTvSong: (song) => ({
    id: song.id, title: song.title, difficultyLabel: 'Médio',
    recommendedModes: song.duet ? ['solo', 'duet'] : ['solo'],
  }),
}));
vi.mock('../components/BsPoster', () => ({ default: () => <div data-testid="poster" /> }));

const { default: TvSingLobby } = await import('../TvSingLobby');

beforeAll(() => { init({ debug: false, visualDebug: false }); });
beforeEach(() => { localStorage.clear(); });

const lobby = (props) => render(
  <TvSingLobby song={{ id: 7, title: 'Urna' }} onSing={vi.fn()} onOpenMicSetup={vi.fn()} onBack={vi.fn()} {...props} />
);

describe('Antes de cantar — um só ecrã entre « Cantar agora » e o karaokê', () => {
  it('solo song: one mode, one singer, mic not set up yet, « Cantar » sings solo without the mic score', () => {
    const onSing = vi.fn();
    lobby({ onSing });
    expect(screen.queryByRole('button', { name: /Modo Dueto/ })).toBeNull();
    expect(screen.getByText('Microfone ainda não configurado')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Cantar Urna' }));
    expect(onSing).toHaveBeenCalledWith(expect.objectContaining({ mode: 'solo', withMic: false }));
    expect(onSing.mock.calls[0][0].players).toHaveLength(1);
  });

  it('duet song: Dueto adds a second singer with another colour', () => {
    const onSing = vi.fn();
    lobby({ song: { id: 8, title: 'Dueto', duet: true }, onSing });
    fireEvent.click(screen.getByRole('button', { name: /Modo Dueto/ }));
    expect(screen.getByRole('button', { name: 'Mudar o nome de Cantor 2' })).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Cantar Dueto' }));
    expect(onSing.mock.calls[0][0].mode).toBe('duet');
    expect(onSing.mock.calls[0][0].players).toHaveLength(2);
  });

  it('a configured mic is named and turns the score on', () => {
    const onSing = vi.fn();
    lobby({ micPrefs: { source: 'device', deviceId: 'x', label: 'Default - Shure MV6' }, onSing });
    expect(screen.getByText('Shure MV6')).toBeTruthy();
    expect(screen.getByRole('button', { name: /Trocar/ })).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Cantar Urna' }));
    expect(onSing.mock.calls[0][0].withMic).toBe(true);
  });

  it('the singer name is typed once and kept on the device', () => {
    lobby();
    fireEvent.click(screen.getByRole('button', { name: 'Mudar o nome de Cantor 1' }));
    const input = screen.getByRole('textbox', { name: /Nome de quem canta/ });
    fireEvent.change(input, { target: { value: 'Florent' } });
    fireEvent.keyDown(input, { key: 'Enter' });
    expect(screen.getByRole('button', { name: 'Mudar o nome de Florent' })).toBeTruthy();
    expect(JSON.parse(localStorage.getItem('amds-players-v1'))[0]).toBe('Florent');
  });

  it('every song offers Duelo, Cooperação and Passa o microfone; without a mic they ask for one', () => {
    const onSing = vi.fn();
    const onOpenMicSetup = vi.fn();
    lobby({ onSing, onOpenMicSetup });
    fireEvent.click(screen.getByRole('button', { name: /Modo Duelo/ }));
    expect(screen.getByText(/Verso a verso/)).toBeTruthy();
    expect(screen.getByText(/precisa de um microfone/)).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: /Configurar microfone/ }));
    expect(onOpenMicSetup).toHaveBeenCalled();
    expect(onSing).not.toHaveBeenCalled();
  });

  it('Cooperação takes 2 to 4 singers, and the choice is remembered', () => {
    const onSing = vi.fn();
    lobby({ micPrefs: { source: 'device', deviceId: 'x', label: 'Mic' }, onSing });
    fireEvent.click(screen.getByRole('button', { name: /Modo Cooperação/ }));
    fireEvent.click(screen.getByRole('button', { name: 'Mais uma pessoa' }));
    fireEvent.click(screen.getByRole('button', { name: 'Mais uma pessoa' }));
    expect(screen.queryByRole('button', { name: 'Mais uma pessoa' })).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Cantar Urna' }));
    expect(onSing.mock.calls[0][0]).toMatchObject({ mode: 'coop', withMic: true });
    expect(onSing.mock.calls[0][0].players).toHaveLength(4);
    expect(JSON.parse(localStorage.getItem('amds-lobby-v1'))).toEqual({ mode: 'coop', count: 4 });
  });

  it('shows the records of this song on this device', () => {
    localStorage.setItem('amds-records-v1', JSON.stringify({ 7: { title: 'Urna', entries: [{ name: 'Bia', score: 8200, mode: 'duel', at: 1, id: 'a' }] } }));
    lobby();
    expect(screen.getByText('Bia')).toBeTruthy();
    expect(screen.getByText('8.200')).toBeTruthy();
  });

  it('during a Festa, the song can go to the Festa queue instead', () => {
    const onAddToFesta = vi.fn(() => ({ added: true, position: 2, festa: true }));
    lobby({ festaActive: true, onAddToFesta });
    fireEvent.click(screen.getByRole('button', { name: /Adicionar à fila da Festa/ }));
    expect(onAddToFesta).toHaveBeenCalled();
    expect(screen.getByText('Adicionada à fila da Festa · posição 2')).toBeTruthy();
  });
});
