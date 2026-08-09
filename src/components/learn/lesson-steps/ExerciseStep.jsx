import { useState } from 'react';
import ExerciseItem, { isExerciseAnswerCorrect } from '@/components/learn/ExerciseItem';
import { trackEvent } from '@/lib/analytics';

/**
 * Étape 4 de la leçon guidée — exercices. Réutilise le même moteur de correction que
 * `StudySheetPanel` (`ExerciseItem`/`buildStudySheet`), sans dupliquer la logique de
 * validation — seule la coquille (progression, analytics, bouton Continuer) diffère.
 */
export default function ExerciseStep({ slug, sheet, onExerciseAnswered, onComplete }) {
  const [answers, setAnswers] = useState({});
  const [corrected, setCorrected] = useState(false);

  const setAnswer = (index, value) => {
    setAnswers((prev) => ({ ...prev, [index]: value }));
    setCorrected(false);
  };

  const handleCorrect = () => {
    setCorrected(true);
    sheet.exercises.forEach((exercise, index) => {
      const correct = isExerciseAnswerCorrect(exercise, answers[index]);
      onExerciseAnswered(`exercise-${index}`, correct);
      trackEvent('exercise_answered', {
        lesson_slug: slug,
        exercise_index: index,
        exercise_type: exercise.type,
        correct,
      });
    });
  };

  return (
    <div className="space-y-6">
      <p className="text-sm leading-6 text-white/70">
        Responda aos exercícios abaixo com o que você acabou de aprender. Depois de corrigir, você pode mudar suas respostas quantas vezes quiser.
      </p>

      <ol className="space-y-4">
        {sheet.exercises.map((exercise, index) => (
          <li key={index}>
            <ExerciseItem
              exercise={exercise}
              index={index}
              value={answers[index]}
              onChange={(value) => setAnswer(index, value)}
              corrected={corrected}
              isCorrect={isExerciseAnswerCorrect(exercise, answers[index])}
            />
          </li>
        ))}
      </ol>

      {!corrected ? (
        <button
          type="button"
          onClick={handleCorrect}
          className="w-full rounded-full bg-[#FDE047] py-3 text-sm font-black text-black transition hover:brightness-95 active:scale-[0.98]"
        >
          Corrigir
        </button>
      ) : (
        <button
          type="button"
          onClick={onComplete}
          className="w-full rounded-full bg-[#FDE047] py-3 text-sm font-black text-black transition hover:brightness-95 active:scale-[0.98]"
        >
          Continuar
        </button>
      )}
    </div>
  );
}
