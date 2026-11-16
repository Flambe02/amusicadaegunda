import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, act } from '@testing-library/react';
import TvReactionBurst from '../TvReactionBurst';

afterEach(() => { vi.useRealTimers(); });

const layer = () => document.querySelector('[data-testid="tv-reactions"]');

describe('Festa — 👏 et 🍅 de la plateia en direct sur le karaokê', () => {
  it('votes already counted when the song starts show nothing', () => {
    render(<TvReactionBurst applause={4} tomato={2} />);
    expect(layer()).toBeNull();
  });

  it('a new applause sends a wave of hands, then it goes away', () => {
    vi.useFakeTimers();
    const { rerender } = render(<TvReactionBurst applause={0} tomato={0} />);
    rerender(<TvReactionBurst applause={1} tomato={0} />);
    expect(layer().querySelectorAll('.bs-react-hand').length).toBe(9);
    act(() => { vi.advanceTimersByTime(4000); });
    expect(layer()).toBeNull();
  });

  it('a new tomato throws one and splats it over the screen', () => {
    const { rerender } = render(<TvReactionBurst applause={0} tomato={0} />);
    rerender(<TvReactionBurst applause={0} tomato={1} />);
    expect(layer().querySelector('.bs-react-tomato-fly').textContent).toBe('🍅');
    expect(layer().querySelector('.bs-react-splat svg')).toBeTruthy();
  });

  it('a flood of tomatoes is capped, the TV never freezes', () => {
    const { rerender } = render(<TvReactionBurst applause={0} tomato={0} />);
    rerender(<TvReactionBurst applause={0} tomato={40} />);
    expect(layer().querySelectorAll('.bs-react-tomato').length).toBe(3);
  });
});
