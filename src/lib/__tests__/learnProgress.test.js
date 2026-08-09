import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  LEARN_PROGRESS_KEY,
  advanceStep,
  completeLesson,
  computeExerciseScore,
  getLessonProgress,
  markExpressionRepeated,
  recordExerciseAnswer,
  resetLesson,
  startLesson,
} from '@/lib/learnProgress';

beforeEach(() => {
  localStorage.clear();
});

describe('startLesson', () => {
  it('crée une entrée in_progress à la première étape', () => {
    const entry = startLesson('eu-sou-um-ovo', 'intro');
    expect(entry.status).toBe('in_progress');
    expect(entry.currentStepId).toBe('intro');
    expect(entry.completedStepIds).toEqual([]);
    expect(entry.completedAt).toBeNull();
  });

  it('est idempotent — un second appel ne réinitialise pas une progression existante', () => {
    startLesson('eu-sou-um-ovo', 'intro');
    advanceStep('eu-sou-um-ovo', 'intro', 'listening');
    const again = startLesson('eu-sou-um-ovo', 'intro');
    expect(again.currentStepId).toBe('listening');
  });

  it('renvoie null sans slug ou étape', () => {
    expect(startLesson(null, 'intro')).toBeNull();
    expect(startLesson('eu-sou-um-ovo', null)).toBeNull();
  });
});

describe('advanceStep', () => {
  it('avance l\'étape courante et marque la précédente comme terminée', () => {
    startLesson('eu-sou-um-ovo', 'intro');
    advanceStep('eu-sou-um-ovo', 'intro', 'listening');
    const progress = getLessonProgress('eu-sou-um-ovo');
    expect(progress.currentStepId).toBe('listening');
    expect(progress.completedStepIds).toEqual(['intro']);
  });

  it('ne duplique pas une étape déjà marquée terminée', () => {
    startLesson('eu-sou-um-ovo', 'intro');
    advanceStep('eu-sou-um-ovo', 'intro', 'listening');
    advanceStep('eu-sou-um-ovo', 'intro', 'listening');
    expect(getLessonProgress('eu-sou-um-ovo').completedStepIds).toEqual(['intro']);
  });

  it('échoue silencieusement (false) sur une leçon jamais commencée', () => {
    expect(advanceStep('jamais-commencee', 'intro', 'listening')).toBe(false);
  });
});

describe('recordExerciseAnswer / markExpressionRepeated', () => {
  it('enregistre le résultat d\'un exercice, utilisable par computeExerciseScore', () => {
    startLesson('eu-sou-um-ovo', 'exercises');
    recordExerciseAnswer('eu-sou-um-ovo', 'exercise-0', true);
    recordExerciseAnswer('eu-sou-um-ovo', 'exercise-1', false);
    const progress = getLessonProgress('eu-sou-um-ovo');
    expect(computeExerciseScore(progress)).toEqual({ correct: 1, total: 2 });
  });

  it('marque une expression comme répétée, sans doublon', () => {
    startLesson('eu-sou-um-ovo', 'repetition');
    markExpressionRepeated('eu-sou-um-ovo', 'cade');
    markExpressionRepeated('eu-sou-um-ovo', 'cade');
    expect(getLessonProgress('eu-sou-um-ovo').repeatedExpressionIds).toEqual(['cade']);
  });
});

describe('completeLesson', () => {
  it('marque la leçon terminée avec une date de complétion', () => {
    startLesson('eu-sou-um-ovo', 'result');
    completeLesson('eu-sou-um-ovo');
    const progress = getLessonProgress('eu-sou-um-ovo');
    expect(progress.status).toBe('completed');
    expect(progress.completedAt).not.toBeNull();
  });
});

describe('resetLesson', () => {
  it('repart de zéro sans affecter les autres leçons enregistrées', () => {
    startLesson('eu-sou-um-ovo', 'intro');
    advanceStep('eu-sou-um-ovo', 'intro', 'exercises');
    startLesson('camarada-quer-cpf', 'intro');

    resetLesson('eu-sou-um-ovo', 'intro');

    expect(getLessonProgress('eu-sou-um-ovo').currentStepId).toBe('intro');
    expect(getLessonProgress('eu-sou-um-ovo').completedStepIds).toEqual([]);
    expect(getLessonProgress('camarada-quer-cpf')).not.toBeNull();
  });
});

describe('computeExerciseScore', () => {
  it('renvoie 0/0 sans progression', () => {
    expect(computeExerciseScore(null)).toEqual({ correct: 0, total: 0 });
  });
});

describe('dégradation silencieuse (storage indisponible)', () => {
  it('ne lève jamais quand localStorage.setItem échoue', () => {
    const spy = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('QuotaExceededError');
    });
    expect(() => startLesson('eu-sou-um-ovo', 'intro')).not.toThrow();
    expect(() => advanceStep('eu-sou-um-ovo', 'intro', 'listening')).not.toThrow();
    spy.mockRestore();
  });

  it('ne lève jamais quand localStorage.getItem échoue, et renvoie un état vide', () => {
    const spy = vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('SecurityError');
    });
    expect(getLessonProgress('eu-sou-um-ovo')).toBeNull();
    spy.mockRestore();
  });
});

describe('LEARN_PROGRESS_KEY', () => {
  it('est versionnée pour permettre une migration future', () => {
    expect(LEARN_PROGRESS_KEY).toMatch(/-v\d+$/);
  });
});
