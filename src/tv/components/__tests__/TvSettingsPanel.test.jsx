import { describe, it, expect, beforeAll, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { init } from '@noriginmedia/norigin-spatial-navigation';
import TvSettingsPanel from '../TvSettingsPanel';

beforeAll(() => { init({ debug: false, visualDebug: false }); });

const opts = { fontScale: 1, showBall: true, dueto: false, energy: false, translate: 'off', rate: 1 };

describe('Ajustes — ordinateur ≠ télécommande (audit grand écran, étape 4)', () => {
  it('computer: Fechar button and backdrop click close it; no app exit, no TV mic', () => {
    const onClose = vi.fn();
    const { container } = render(<TvSettingsPanel opts={opts} setOpts={() => {}} onClose={onClose} onExitApp={() => {}} web />);
    expect(screen.getByRole('heading', { name: 'Ajustes' })).toBeTruthy();
    expect(screen.queryByText('Sair do aplicativo')).toBeNull();
    expect(screen.queryByText(/microfone da TV/)).toBeNull();
    expect(screen.getByText(/Esc ou clique fora/)).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Fechar os ajustes' }));
    fireEvent.click(container.querySelector('.tv2-settings-overlay'));
    expect(onClose).toHaveBeenCalledTimes(2);
    // Un clic DANS le panneau ne ferme pas.
    fireEvent.click(container.querySelector('.tv2-settings-panel'));
    expect(onClose).toHaveBeenCalledTimes(2);
  });

  it('TV: keeps Sair do aplicativo and the TV mic option, no Fechar button', () => {
    render(<TvSettingsPanel opts={opts} setOpts={() => {}} onClose={() => {}} onExitApp={() => {}} />);
    expect(screen.getByText('Sair do aplicativo')).toBeTruthy();
    expect(screen.getByText(/microfone da TV/)).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Fechar os ajustes' })).toBeNull();
    expect(screen.getByText('Voltar para fechar')).toBeTruthy();
  });

  it('toggles are switches with their state and a help sentence', () => {
    const setOpts = vi.fn();
    render(<TvSettingsPanel opts={opts} setOpts={setOpts} web />);
    const ball = screen.getByRole('switch', { name: 'Bolinha' });
    expect(ball.getAttribute('aria-checked')).toBe('true');
    expect(screen.getByRole('switch', { name: /Modo dueto/ }).getAttribute('aria-checked')).toBe('false');
    expect(screen.getByText(/marca o ritmo/)).toBeTruthy();
    fireEvent.click(ball);
    expect(setOpts).toHaveBeenCalled();
  });
});
