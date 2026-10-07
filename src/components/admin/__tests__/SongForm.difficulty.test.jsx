import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import SongForm from '../SongForm';

const words = (count) => Array.from({ length: count }, (_, index) => `palavra${index}`).join(' ');
const base = { id: 1, title: 'Teste', status: 'draft', release_date: '2026-10-12' };

function save(initial, act = () => {}) {
  const onSave = vi.fn();
  render(<SongForm initial={initial} onSave={onSave} onCancel={() => {}} isSaving={false} songId={initial?.id} />);
  act();
  fireEvent.click(screen.getByRole('button', { name: /Salvar/ }));
  expect(onSave).toHaveBeenCalledTimes(1);
  return onSave.mock.calls[0][0];
}
const pressed = (name) => screen.getByRole('button', { name }).getAttribute('aria-pressed');

describe('SongForm — campo Dificuldade', () => {
  it('a new song is on « Automática » and saves the difficulty computed from its lyrics', () => {
    const saved = save({ ...base, lyrics: words(300) }, () => {
      expect(pressed(/Automática/)).toBe('true');
    });
    expect(saved.difficulty).toBe('hard');
    expect(saved.difficulty_manual).toBe(false);
  });

  it('« Automática »: editing the lyrics changes the saved difficulty, without any other action', () => {
    const saved = save({ ...base, lyrics: words(300), difficulty: 'hard', difficulty_manual: false }, () => {
      fireEvent.change(screen.getByDisplayValue(words(300)), { target: { value: words(100) } });
    });
    expect(saved.difficulty).toBe('easy');
    expect(saved.difficulty_manual).toBe(false);
  });

  it('a value chosen by hand is never replaced by the computation', () => {
    const saved = save({ ...base, lyrics: words(600), difficulty: 'medium', difficulty_manual: true }, () => {
      expect(pressed(/Médio/)).toBe('true');
      fireEvent.change(screen.getByDisplayValue(words(600)), { target: { value: words(50) } });
    });
    expect(saved.difficulty).toBe('medium');
    expect(saved.difficulty_manual).toBe(true);
  });

  it('choosing a value makes it manual; going back to « Automática » recomputes', () => {
    const manual = save({ ...base, lyrics: words(100), difficulty: 'easy', difficulty_manual: false }, () => {
      fireEvent.click(screen.getByRole('button', { name: /Difícil/ }));
    });
    expect(manual).toMatchObject({ difficulty: 'hard', difficulty_manual: true });
  });

  it('back to « Automática » from a manual value: recomputed from the lyrics', () => {
    const auto = save({ ...base, lyrics: words(100), difficulty: 'hard', difficulty_manual: true }, () => {
      fireEvent.click(screen.getByRole('button', { name: /Automática/ }));
    });
    expect(auto).toMatchObject({ difficulty: 'easy', difficulty_manual: false });
  });
});
