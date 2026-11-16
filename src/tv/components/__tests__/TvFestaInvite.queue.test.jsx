import { describe, it, expect, beforeAll, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { init } from '@noriginmedia/norigin-spatial-navigation';
import TvFestaInvite from '../TvFestaInvite';

beforeAll(() => { init({ debug: false, visualDebug: false }); });

const invite = (props) => render(
  <TvFestaInvite code="TESTE1" joinUrl="https://example.test/festa?c=TESTE1" presentNames={['Florent']} onContinue={vi.fn()} onBack={vi.fn()} onEnd={vi.fn()} {...props} />
);

describe('Festa — a sala de espera mostra o que vai tocar', () => {
  it('no song yet: the three steps, and the button says to pick the first song', () => {
    invite();
    expect(screen.getByText('Aponte a câmera para o código')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Escolher a primeira música' })).toBeTruthy();
  });

  it('with a queue: the songs and who chose them replace the steps, the button names the first one', () => {
    invite({
      queuedCount: 4,
      queue: [
        { qid: 'a', id: 1, title: 'Mister Veto', singer: 'Florent' },
        { qid: 'b', id: 2, title: '13 Presidente', singer: 'Florent' },
        { qid: 'c', id: 3, title: 'Urna', singer: 'Ana' },
        { qid: 'd', id: 4, title: 'Bets Bets Bets', singer: 'TV' },
      ],
    });
    expect(screen.queryByText('Aponte a câmera para o código')).toBeNull();
    expect(screen.getByText('Mister Veto')).toBeTruthy();
    expect(screen.getByText('Ana')).toBeTruthy();
    expect(screen.getByText('e mais 1')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Começar a cantar: Mister Veto' })).toBeTruthy();
  });
});
