import { useMemo } from 'react';
import { Check, X } from 'lucide-react';
import { normalizeAnswer } from '@/lib/learnContent';

// Mélange une seule fois par exercice (au rendu, pas dans buildStudySheet — voir sa
// docstring : ça garde la fonction de validation pure/testable avec une égalité exacte).
function shuffle(arr) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function trueFalseLabel(text) {
  return text === 'true' ? 'Verdadeiro' : 'Falso';
}

/**
 * Rendu d'un exercice de fiche d'étude — moteur partagé entre `StudySheetPanel`
 * (onglet Ficha de la page chanson) et l'étape Exercices de la leçon guidée
 * (`ApprenderLesson`), pour ne pas dupliquer la logique de correction (§9 : réutiliser
 * l'existant plutôt que le reconstruire).
 *
 * Trois types gérés : `multiple_choice`, `fill_blank` (champ libre ou à choix selon
 * la présence de `choices`), `true_false`.
 *
 * @param {{
 *   exercise: object, index: number, value: string|undefined,
 *   onChange: (value:string) => void, corrected: boolean, isCorrect: boolean,
 * }} props
 */
export default function ExerciseItem({ exercise, index, value, onChange, corrected, isCorrect }) {
  // Toujours appelé (règle des Hooks) — ne calcule un mélange que pour un fill_blank
  // À CHOIX ; renvoie null sinon, ignoré par la branche qui ne s'en sert pas.
  const shuffledChoices = useMemo(
    () => (exercise.type === 'fill_blank' && exercise.choices ? shuffle(exercise.choices) : null),
    [exercise],
  );

  const isChoiceBased = exercise.type === 'multiple_choice'
    || exercise.type === 'true_false'
    || (exercise.type === 'fill_blank' && exercise.choices);

  if (isChoiceBased) {
    // Réponse attendue à comparer pour savoir quel choix est LE bon (indépendamment
    // de celui sélectionné) — utile pour révéler la bonne réponse quand c'est faux.
    const choiceIsCorrect = (text) => {
      if (exercise.type === 'multiple_choice') {
        return exercise.options.find((o) => o.text === text)?.correct === true;
      }
      if (exercise.type === 'true_false') {
        return text === String(exercise.answer);
      }
      return normalizeAnswer(text) === normalizeAnswer(exercise.answer);
    };

    const options = exercise.type === 'multiple_choice'
      ? exercise.options.map((o) => o.text)
      : exercise.type === 'true_false'
        ? ['true', 'false']
        : shuffledChoices;

    const optionLabel = (text) => (exercise.type === 'true_false' ? trueFalseLabel(text) : text);

    return (
      <div>
        <p className="mb-2 text-sm font-semibold text-white/85">{exercise.prompt}</p>
        <div className="flex flex-wrap gap-2" role="group" aria-label={exercise.prompt}>
          {options.map((text) => {
            const selected = value === text;
            const showCorrect = corrected && choiceIsCorrect(text);
            const showWrong = corrected && selected && !choiceIsCorrect(text);
            return (
              <button
                key={text}
                type="button"
                onClick={() => onChange(text)}
                aria-pressed={selected}
                className={`rounded-full border px-3.5 py-1.5 text-sm font-semibold transition ${
                  showCorrect
                    ? 'border-emerald-400/60 bg-emerald-400/15 text-emerald-300'
                    : showWrong
                      ? 'border-red-400/60 bg-red-400/15 text-red-300'
                      : selected
                        ? 'border-[#FDE047]/50 bg-[#FDE047]/10 text-[#FDE047]'
                        : 'border-white/12 bg-white/[0.04] text-white/75 hover:border-white/24'
                }`}
              >
                {optionLabel(text)}
              </button>
            );
          })}
        </div>
        {corrected && (isCorrect
          ? <p className="mt-1.5 flex items-center gap-1 text-xs font-semibold text-emerald-400"><Check className="h-3.5 w-3.5" aria-hidden="true" /> Certo!</p>
          : <p className="mt-1.5 flex items-center gap-1 text-xs font-semibold text-red-400"><X className="h-3.5 w-3.5" aria-hidden="true" /> Errado.</p>)}
      </div>
    );
  }

  // fill_blank sans distractors → champ libre, comparaison normalisée (accents/casse/espaces).
  return (
    <div>
      <label htmlFor={`study-ex-${index}`} className="mb-2 block text-sm font-semibold text-white/85">
        {exercise.prompt}
      </label>
      <input
        id={`study-ex-${index}`}
        type="text"
        value={value || ''}
        onChange={(e) => onChange(e.target.value)}
        className={`w-full rounded-xl border bg-white/[0.04] px-3.5 py-2.5 text-sm text-white outline-none transition ${
          corrected
            ? isCorrect ? 'border-emerald-400/60' : 'border-red-400/60'
            : 'border-white/12 focus:border-[#FDE047]/50'
        }`}
      />
      {corrected && (isCorrect
        ? <p className="mt-1.5 flex items-center gap-1 text-xs font-semibold text-emerald-400"><Check className="h-3.5 w-3.5" aria-hidden="true" /> Certo!</p>
        : <p className="mt-1.5 flex items-center gap-1 text-xs font-semibold text-red-400"><X className="h-3.5 w-3.5" aria-hidden="true" /> Resposta certa: {exercise.answer}</p>)}
    </div>
  );
}

/**
 * Vérifie si une réponse donnée est correcte pour un exercice — même logique que
 * `choiceIsCorrect`/la comparaison `fill_blank` libre ci-dessus, exposée pour les
 * appelants qui ont besoin du verdict AVANT le rendu (ex. calcul de score).
 * @param {object} exercise
 * @param {string|undefined} given
 * @returns {boolean}
 */
export function isExerciseAnswerCorrect(exercise, given) {
  if (given == null || given === '') return false;
  if (exercise.type === 'multiple_choice') {
    return exercise.options.find((o) => o.text === given)?.correct === true;
  }
  if (exercise.type === 'true_false') {
    return given === String(exercise.answer);
  }
  return normalizeAnswer(given) === normalizeAnswer(exercise.answer);
}
