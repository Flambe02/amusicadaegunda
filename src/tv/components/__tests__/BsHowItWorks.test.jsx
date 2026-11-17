import { describe, it, expect, beforeAll, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { init } from '@noriginmedia/norigin-spatial-navigation';
import BsHowItWorks from '../BsHowItWorks';

beforeAll(() => { init({ debug: false, visualDebug: false }); });
beforeEach(() => { localStorage.clear(); });

describe('« Como funciona » — première visite (audit D2)', () => {
  it('shows three steps until « Entendi », then never again on this device', () => {
    const onDone = vi.fn();
    const { unmount } = render(<BsHowItWorks onDone={onDone} />);
    expect(screen.getByText('Assista')).toBeTruthy();
    expect(screen.getByText('Entenda')).toBeTruthy();
    expect(screen.getByText('Cante')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: /Entendi/ }));
    expect(onDone).toHaveBeenCalled();
    expect(screen.queryByText('Assista')).toBeNull();
    unmount();
    render(<BsHowItWorks />);
    expect(screen.queryByText('Assista')).toBeNull();
  });
});
