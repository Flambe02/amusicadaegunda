import { Suspense, lazy, useState } from 'react';
import { Link } from 'react-router-dom';
import { BookOpen, PartyPopper, RotateCcw } from 'lucide-react';

const VocabNotebookSheet = lazy(() => import('@/components/learn/VocabNotebookSheet'));

/**
 * Étape 7 de la leçon guidée — résultat (§4.4 « Résultat ») : score des exercices,
 * expressions découvertes, actions de suite.
 */
export default function ResultStep({ score, expressionsCount, durationSeconds, onRestart, onGoToKaraoke }) {
  const [showNotebook, setShowNotebook] = useState(false);
  const minutes = Math.max(1, Math.round(durationSeconds / 60));

  return (
    <div className="space-y-6 text-center">
      <div className="flex flex-col items-center gap-2">
        <PartyPopper className="h-10 w-10 text-[#FDE047]" aria-hidden="true" />
        <p className="text-lg font-black text-white">Aula concluída!</p>
        <p className="text-sm text-white/60">Você levou cerca de {minutes} min.</p>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-xl border border-white/8 bg-white/[0.03] px-3 py-4">
          <p className="text-2xl font-black text-[#FDE047]">{score.correct}/{score.total}</p>
          <p className="mt-1 text-[11px] uppercase tracking-[0.18em] text-white/45">Exercícios certos</p>
        </div>
        <div className="rounded-xl border border-white/8 bg-white/[0.03] px-3 py-4">
          <p className="text-2xl font-black text-[#FDE047]">{expressionsCount}</p>
          <p className="mt-1 text-[11px] uppercase tracking-[0.18em] text-white/45">Expressões guardadas</p>
        </div>
      </div>

      <div className="flex flex-col gap-2.5">
        <button
          type="button"
          onClick={() => setShowNotebook(true)}
          className="flex items-center justify-center gap-2 rounded-full bg-[#FDE047] py-3 text-sm font-black text-black transition hover:brightness-95 active:scale-[0.98]"
        >
          <BookOpen className="h-4 w-4" aria-hidden="true" /> Rever meu caderno
        </button>
        <button
          type="button"
          onClick={onGoToKaraoke}
          className="rounded-full border border-white/12 bg-white/[0.04] py-3 text-sm font-bold text-white/80 transition hover:border-white/24"
        >
          Cantar de novo no karaokê
        </button>
        <button
          type="button"
          onClick={onRestart}
          className="flex items-center justify-center gap-2 rounded-full border border-white/12 bg-white/[0.04] py-3 text-sm font-bold text-white/80 transition hover:border-white/24"
        >
          <RotateCcw className="h-4 w-4" aria-hidden="true" /> Refazer a aula
        </button>
        <Link
          to="/apprendre"
          className="rounded-full py-3 text-sm font-bold text-white/50 transition hover:text-white/80"
        >
          Voltar às aulas
        </Link>
      </div>

      {showNotebook && (
        <Suspense fallback={null}>
          <VocabNotebookSheet onClose={() => setShowNotebook(false)} />
        </Suspense>
      )}
    </div>
  );
}
