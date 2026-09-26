import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import WeekRibbon, { RIBBON_VISIBLE_MS } from '../WeekRibbon';
import { ribbonLabel, ribbonSpokenDate } from '../feedMedia';

// Jeudi 24/09/2026 midi à São Paulo ; la chanson de la semaine est sortie le lundi 21.
const NOW = new Date('2026-09-24T15:00:00Z');
const WEEK = { id: 1, title: 'Tá Chovendo de Novo', release_date: '2026-09-21' };
const OLD = { id: 2, title: 'Europa Deu Vácuo no Boi', release_date: '2026-08-31' };

const ribbon = () => document.querySelector('[data-ribbon]');

beforeEach(() => { vi.useFakeTimers({ shouldAdvanceTime: true, now: NOW }); });
afterEach(() => { vi.useRealTimers(); });

describe('WeekRibbon — ruban éphémère de la semaine', () => {
  it('labels: « Nova · esta semana » for the week song, month and year otherwise (caps by CSS)', () => {
    expect(ribbonLabel(WEEK, NOW)).toBe('Nova · esta semana');
    expect(ribbonLabel(OLD, NOW)).toBe('agosto 2026');
    expect(ribbonLabel({ release_date: null }, NOW)).toBeNull();
  });

  it('always keeps the date for screen readers, visually hidden', () => {
    expect(ribbonSpokenDate(OLD, NOW)).toBe('Publicada em 31 de agosto de 2026');
    expect(ribbonSpokenDate(WEEK, NOW)).toBe('Música desta semana. Publicada em 21 de setembro de 2026');
    const { container } = render(<WeekRibbon song={OLD} phase="loading" />);
    const spoken = screen.getByText('Publicada em 31 de agosto de 2026');
    expect(spoken).toHaveClass('sr-only');
    expect(container.querySelector('[data-ribbon]')).toHaveAttribute('aria-hidden', 'true');
  });

  it('waits off-screen until the video appears, then shows for 2.5 s, then fades out', () => {
    const { rerender } = render(<WeekRibbon song={WEEK} phase="loading" />);
    expect(ribbon()).toHaveAttribute('data-ribbon', 'waiting');
    expect(ribbon().firstChild.className).toContain('-translate-x-full');
    rerender(<WeekRibbon song={WEEK} phase="playing" />);
    expect(ribbon()).toHaveAttribute('data-ribbon', 'shown');
    expect(ribbon().firstChild.className).toContain('translate-x-0');
    act(() => { vi.advanceTimersByTime(RIBBON_VISIBLE_MS - 100); });
    expect(ribbon()).toHaveAttribute('data-ribbon', 'shown');
    act(() => { vi.advanceTimersByTime(110); });
    expect(ribbon()).toHaveAttribute('data-ribbon', 'gone');
    expect(ribbon().firstChild.className).toContain('opacity-0');
  });

  it('comes back for every new song (swipe), only once per song', () => {
    const { rerender } = render(<WeekRibbon song={WEEK} phase="playing" />);
    act(() => { vi.advanceTimersByTime(RIBBON_VISIBLE_MS + 10); });
    expect(ribbon()).toHaveAttribute('data-ribbon', 'gone');
    rerender(<WeekRibbon song={OLD} phase="loading" />); // glissement
    expect(ribbon()).toHaveAttribute('data-ribbon', 'waiting');
    expect(ribbon()).toHaveTextContent('agosto 2026');
    rerender(<WeekRibbon song={OLD} phase="playing" />);
    expect(ribbon()).toHaveAttribute('data-ribbon', 'shown');
    act(() => { vi.advanceTimersByTime(RIBBON_VISIBLE_MS + 10); });
    rerender(<WeekRibbon song={OLD} phase="playing" />); // même chanson : pas de retour
    expect(ribbon()).toHaveAttribute('data-ribbon', 'gone');
  });

  it('shown over the thumbnail during a fallback, it shows once more when the video finally arrives', () => {
    const { rerender } = render(<WeekRibbon song={WEEK} phase="fallback" />);
    expect(ribbon()).toHaveAttribute('data-ribbon', 'shown');
    act(() => { vi.advanceTimersByTime(RIBBON_VISIBLE_MS + 10); });
    expect(ribbon()).toHaveAttribute('data-ribbon', 'gone');
    rerender(<WeekRibbon song={WEEK} phase="playing" />);
    expect(ribbon()).toHaveAttribute('data-ribbon', 'shown');
    act(() => { vi.advanceTimersByTime(RIBBON_VISIBLE_MS + 10); });
    rerender(<WeekRibbon song={WEEK} phase="fallback" />);
    expect(ribbon()).toHaveAttribute('data-ribbon', 'gone'); // plus jamais après la vidéo
  });

  it('shows on arrival when the song has no video (no Short, or fallback)', () => {
    render(<WeekRibbon song={OLD} phase="none" />);
    expect(ribbon()).toHaveAttribute('data-ribbon', 'shown');
  });

  it('is discreet: translucent black, white eyebrow text, never yellow; no slide under reduced motion', () => {
    render(<WeekRibbon song={WEEK} phase="playing" />);
    const cls = ribbon().firstChild.className;
    expect(cls).toContain('bg-black/55');
    expect(cls).toContain('text-white');
    expect(cls).toContain('uppercase');
    expect(cls).toContain('tracking-[0.28em]');
    expect(cls).not.toMatch(/yellow/);
    expect(cls).toContain('motion-reduce:transition-opacity'); // pas de glissement
  });
});
