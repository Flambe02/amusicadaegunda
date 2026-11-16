import { describe, it, expect, beforeAll, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { init } from '@noriginmedia/norigin-spatial-navigation';

const listen = vi.fn();
vi.mock('@/lib/phoneMic', async (orig) => ({
  ...(await orig()),
  listenPhoneMic: (code, rmsRef, opts) => { listen(code); opts?.onConnectedChange?.(true); return () => {}; },
}));
vi.mock('react-qr-code', () => ({ default: ({ value }) => <svg data-testid="qr" data-value={value} /> }));
const { default: TvMicSetup } = await import('../TvMicSetup');

beforeAll(() => { init({ debug: false, visualDebug: false }); });
beforeEach(() => { localStorage.clear(); listen.mockClear(); });

describe('Configurar microfone — o celular como microfone (TV sem micro)', () => {
  it('on a TV the phone comes first; the QR opens /festa?mic=CODE and the choice is saved', () => {
    const onDone = vi.fn();
    render(<TvMicSetup tv onDone={onDone} />);
    const buttons = screen.getAllByRole('button').map((b) => b.textContent.trim());
    expect(buttons[0]).toMatch(/Usar o celular/);
    act(() => { fireEvent.click(screen.getByRole('button', { name: /Usar o celular/ })); });
    const code = listen.mock.calls[0][0];
    expect(code).toMatch(/^[A-Z2-9]{5}$/);
    expect(screen.getByTestId('qr').getAttribute('data-value').endsWith(`/festa?mic=${code}`)).toBe(true);
    expect(screen.getByText(/Conectado/)).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: /Usar mesmo assim|Usar o celular/ }));
    expect(onDone).toHaveBeenCalledWith({ source: 'phone', code });
    expect(JSON.parse(localStorage.getItem('amds-mic-v1'))).toEqual({ source: 'phone', code });
  });

  it('keeps the same code next time (the phone page left open reconnects)', () => {
    localStorage.setItem('amds-mic-v1', JSON.stringify({ source: 'phone', code: 'ABCDE' }));
    render(<TvMicSetup tv />);
    act(() => { fireEvent.click(screen.getByRole('button', { name: /Usar o celular/ })); });
    expect(listen).toHaveBeenCalledWith('ABCDE');
  });
});
