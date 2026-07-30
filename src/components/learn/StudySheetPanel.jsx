import { useEffect, useMemo, useState } from 'react';
import { Check, GraduationCap, Loader2, X } from 'lucide-react';
import { buildStudySheet, loadLearnContent, normalizeAnswer } from '@/lib/learnContent';

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

/**
 * Ficha de estudo — mode leçon structurée du Modo Aprender (bêta, 2 chansons).
 *
 * Contrairement à LearnPanel (paroles ligne à ligne), cette leçon est autonome :
 * objectif, point de grammaire, trois exercices, résumé — rien ne dépend du
 * découpage LRC. Toujours chargée/validée via `loadLearnContent`/`buildStudySheet`,
 * mêmes garde-fous fail-closed que le reste du Modo Aprender.
 *
 * Correction GLOBALE en un tap (« Corrigir ") : les trois exercices se colorent
 * d'un coup, la réponse correcte est révélée sur ceux qui sont faux, le résumé de
 * fin reste TOUJOURS visible après une correction, quel que soit le score — ce
 * n'est pas un mode évaluation qui bloque. Aucune limite de tentatives : modifier
 * une réponse après correction efface les couleurs (état obsolète) jusqu'au
 * prochain tap sur « Corrigir ». Rien n'est persisté (pas de score enregistré).
 */
export default function StudySheetPanel({ slug }) {
  const [entry, setEntry] = useState(undefined); // undefined = en cours, null = absent
  const [answers, setAnswers] = useState({}); // { [exerciseIndex]: string }
  const [corrected, setCorrected] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setEntry(undefined);
    setAnswers({});
    setCorrected(false);
    loadLearnContent(slug).then((data) => {
      if (!cancelled) setEntry(data);
    });
    return () => { cancelled = true; };
  }, [slug]);

  const sheet = useMemo(() => buildStudySheet(entry), [entry]);

  const setAnswer = (index, value) => {
    setAnswers((prev) => ({ ...prev, [index]: value }));
    // Une réponse changée après correction rend les couleurs affichées obsolètes.
    setCorrected(false);
  };

  if (entry === undefined) {
    return (
      <div className="flex items-center justify-center gap-2 py-12 text-sm text-white/50">
        <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
        Chargement da ficha…
      </div>
    );
  }

  if (!sheet) {
    return (
      <div className="flex flex-col items-center py-12 text-center">
        <GraduationCap className="mb-4 h-10 w-10 text-white/20" aria-hidden="true" />
        <p className="font-semibold text-white/60">Ficha de estudo indisponível</p>
        <p className="mt-1 max-w-xs text-sm text-white/38">
          O conteúdo desta ficha não está disponível para esta música.
        </p>
      </div>
    );
  }

  const isExerciseCorrect = (exercise, index) => {
    const given = answers[index];
    if (given == null || given === '') return false;
    if (exercise.type === 'multiple_choice') {
      return exercise.options.find((o) => o.text === given)?.correct === true;
    }
    return normalizeAnswer(given) === normalizeAnswer(exercise.answer);
  };

  return (
    <div className="space-y-6">
      <p className="text-sm leading-6 text-white/80">{sheet.objectiveFr}</p>

      <section aria-labelledby="study-grammar-title" className="rounded-xl border border-[#FDE047]/20 bg-[#FDE047]/[0.05] px-3.5 py-3">
        <h3 id="study-grammar-title" className="text-[11px] uppercase tracking-[0.24em] text-[#FDE047]/70">
          Tournure du jour
        </h3>
        <p className="mt-1.5 text-sm font-bold text-white">{sheet.grammarNote.titlePt}</p>
        <p className="mt-1 text-sm leading-6 text-white/70">{sheet.grammarNote.explanationFr}</p>
        <p className="mt-2 flex flex-wrap gap-1.5">
          {sheet.grammarNote.examples.map((ex) => (
            <span key={ex} className="rounded-full border border-white/10 bg-white/[0.04] px-2.5 py-0.5 text-[11px] font-semibold text-white/60">
              {ex}
            </span>
          ))}
        </p>
      </section>

      <ol className="space-y-4">
        {sheet.exercises.map((exercise, index) => (
          <li key={index}>
            <ExerciseItem
              exercise={exercise}
              index={index}
              value={answers[index]}
              onChange={(value) => setAnswer(index, value)}
              corrected={corrected}
              isCorrect={isExerciseCorrect(exercise, index)}
            />
          </li>
        ))}
      </ol>

      <button
        type="button"
        onClick={() => setCorrected(true)}
        className="w-full rounded-full bg-[#FDE047] py-2.5 text-sm font-black text-black transition hover:brightness-95 active:scale-[0.98]"
      >
        Corrigir
      </button>

      {corrected && (
        <section aria-labelledby="study-summary-title" className="space-y-2">
          <h3 id="study-summary-title" className="text-[11px] uppercase tracking-[0.24em] text-white/38">
            Resumo
          </h3>
          <p className="flex flex-wrap gap-1.5">
            {sheet.summaryTerms.map((term) => (
              <span key={term} className="rounded-full border border-white/10 bg-white/[0.04] px-2.5 py-0.5 text-xs font-semibold text-white/70">
                {term}
              </span>
            ))}
          </p>
        </section>
      )}
    </div>
  );
}

function ExerciseItem({ exercise, index, value, onChange, corrected, isCorrect }) {
  // Toujours appelé (règle des Hooks) — ne calcule un mélange que pour un fill_blank
  // À CHOIX ; renvoie null sinon, ignoré par la branche qui ne s'en sert pas.
  const shuffledChoices = useMemo(
    () => (exercise.type === 'fill_blank' && exercise.choices ? shuffle(exercise.choices) : null),
    [exercise],
  );

  if (exercise.type === 'multiple_choice' || (exercise.type === 'fill_blank' && exercise.choices)) {
    // Réponse attendue à comparer pour savoir quel choix est LE bon (indépendamment
    // de celui sélectionné) — utile pour révéler la bonne réponse quand c'est faux.
    const choiceIsCorrect = (text) => (exercise.type === 'multiple_choice'
      ? exercise.options.find((o) => o.text === text)?.correct === true
      : normalizeAnswer(text) === normalizeAnswer(exercise.answer));

    const options = exercise.type === 'multiple_choice'
      ? exercise.options.map((o) => o.text)
      : shuffledChoices;

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
                {text}
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
