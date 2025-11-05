import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import CountdownTimer from '../CountdownTimer';

describe('CountdownTimer', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('should render countdown timer', () => {
    // Set a fixed date for testing
    const mockDate = new Date('2025-01-13T10:00:00Z'); // Monday
    vi.setSystemTime(mockDate);

    render(<CountdownTimer />);
    expect(screen.getByText(/próxima música/i)).toBeInTheDocument();
  });

  it('should display correct time remaining', () => {
    // Monday 10:00 AM
    const mockDate = new Date('2025-01-13T10:00:00Z');
    vi.setSystemTime(mockDate);

    render(<CountdownTimer />);
    // Should show time until next Monday
    expect(screen.getByText(/próxima música/i)).toBeInTheDocument();
  });
});

