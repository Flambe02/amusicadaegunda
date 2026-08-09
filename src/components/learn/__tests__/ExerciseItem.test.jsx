import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ExerciseItem, { isExerciseAnswerCorrect } from '@/components/learn/ExerciseItem';

const exercise = { type: 'true_false', prompt: 'Cadê é o mesmo que onde está.', answer: true };

describe('isExerciseAnswerCorrect — true_false', () => {
  it('compare la réponse donnée (string) à answer (boolean)', () => {
    expect(isExerciseAnswerCorrect(exercise, 'true')).toBe(true);
    expect(isExerciseAnswerCorrect(exercise, 'false')).toBe(false);
    expect(isExerciseAnswerCorrect({ ...exercise, answer: false }, 'false')).toBe(true);
  });

  it('renvoie false sans réponse donnée', () => {
    expect(isExerciseAnswerCorrect(exercise, undefined)).toBe(false);
    expect(isExerciseAnswerCorrect(exercise, '')).toBe(false);
  });
});

describe('ExerciseItem — true_false', () => {
  it('affiche deux boutons Verdadeiro/Falso, pas les valeurs internes true/false', () => {
    render(
      <ExerciseItem exercise={exercise} index={0} value={undefined} onChange={() => {}} corrected={false} isCorrect={false} />,
    );
    expect(screen.getByRole('button', { name: 'Verdadeiro' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Falso' })).toBeInTheDocument();
    expect(screen.queryByText('true')).not.toBeInTheDocument();
  });

  it('sélectionne puis colore juste/faux après correction', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    const { rerender } = render(
      <ExerciseItem exercise={exercise} index={0} value={undefined} onChange={onChange} corrected={false} isCorrect={false} />,
    );

    await user.click(screen.getByRole('button', { name: 'Verdadeiro' }));
    expect(onChange).toHaveBeenCalledWith('true');

    rerender(
      <ExerciseItem exercise={exercise} index={0} value="true" onChange={onChange} corrected isCorrect />,
    );
    expect(screen.getByText('Certo!')).toBeInTheDocument();

    rerender(
      <ExerciseItem exercise={exercise} index={0} value="false" onChange={onChange} corrected isCorrect={false} />,
    );
    expect(screen.getByText('Errado.')).toBeInTheDocument();
    // La bonne réponse (Verdadeiro) reste indiquée en vert même si "Falso" a été choisi.
    expect(screen.getByRole('button', { name: 'Verdadeiro' }).className).toMatch(/emerald/);
  });
});
