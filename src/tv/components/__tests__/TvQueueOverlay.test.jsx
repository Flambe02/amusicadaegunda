import { describe, it, expect, beforeAll, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { init } from '@noriginmedia/norigin-spatial-navigation';
import TvQueueOverlay from '../TvQueueOverlay';
import TvFocusedSongPanel from '../TvFocusedSongPanel';

beforeAll(() => { init({ debug: false, visualDebug: false }); });

const overlay = (props) => render(
  <TvQueueOverlay queue={[]} onRemove={vi.fn()} onRemoveFesta={vi.fn()} onClear={vi.fn()} onStart={vi.fn()} onClose={vi.fn()} {...props} />
);
const local = [{ qid: 'l1', id: 1, title: 'Urna' }, { qid: 'l2', id: 2, title: 'Bets Bets Bets' }];
const festa = [{ qid: 'f1', id: 3, title: 'Mister Veto', singer: 'Ana' }, { qid: 'f2', id: 4, title: '13 Presidente', singer: 'TV' }];

describe('Fila — l\'overlay montre ce que compte « Fila · N »', () => {
  it('empty: says how to add, and offers no « Começar a cantar » that would do nothing', () => {
    overlay();
    expect(screen.getByText(/A fila está vazia/)).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Começar a cantar a fila' })).toBeNull();
    expect(screen.getByRole('button', { name: 'Fechar a fila' })).toBeTruthy();
  });

  it('outside a Festa: one numbered list, never « Tocando agora » when nothing plays', () => {
    overlay({ queue: local });
    expect(screen.queryByText('Tocando agora')).toBeNull();
    expect(screen.getByText('Na fila')).toBeTruthy();
    expect(screen.getAllByRole('button', { name: /^Remover / })).toHaveLength(2);
    expect(screen.getByRole('button', { name: 'Começar a cantar a fila' })).toBeTruthy();
  });

  it('during a Festa: the phones\' songs are listed with the singer, the one playing apart', () => {
    overlay({ festaActive: true, festaQueue: festa, festaNow: { qid: 'p', id: 9, title: 'Alô é Golpe', singer: 'Caio' } });
    expect(screen.getByText('Cantando agora')).toBeTruthy();
    expect(screen.getByText('Alô é Golpe')).toBeTruthy();
    expect(screen.getByText('Próximas na Festa')).toBeTruthy();
    expect(screen.getByText('Mister Veto')).toBeTruthy();
    expect(screen.getByText('Ana')).toBeTruthy();
    // « Limpar » ne vide jamais les choix des convidados.
    expect(screen.queryByRole('button', { name: 'Limpar fila' })).toBeNull();
  });
});

describe('Painel do catálogo — ações sempre visíveis', () => {
  const vm = {
    id: 7, title: 'Urna', type: 'Paródia', recommendedModes: ['solo'], difficultyLabel: 'Médio', energyLabel: 'Alta', isSingable: true,
  };
  it('a singable song always offers « Cantar agora » and « Adicionar à fila »', () => {
    const onAdd = vi.fn();
    render(<TvFocusedSongPanel vm={vm} onConhecer={vi.fn()} onCantar={vi.fn()} onAddToQueue={onAdd} />);
    expect(screen.getByRole('button', { name: 'Cantar Urna agora' })).toBeTruthy();
    screen.getByRole('button', { name: 'Adicionar Urna à fila' }).click();
    expect(onAdd).toHaveBeenCalledWith(vm);
  });
  it('a song without karaokê offers only « Abrir ficha »', () => {
    render(<TvFocusedSongPanel vm={{ ...vm, isSingable: false }} onConhecer={vi.fn()} onCantar={vi.fn()} onAddToQueue={vi.fn()} />);
    expect(screen.queryByRole('button', { name: /Cantar|Adicionar/ })).toBeNull();
    expect(screen.getByRole('button', { name: 'Abrir a ficha de Urna' })).toBeTruthy();
  });
});
