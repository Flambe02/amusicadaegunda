import { Suspense, lazy } from 'react';
import { Loader2 } from 'lucide-react';

// Réutilise tel quel le mode lecture déjà en production dans LyricsDialog (§4.4
// « Compréhension » — pas de nouveau composant de traduction ligne à ligne).
const LearnPanel = lazy(() => import('@/components/learn/LearnPanel'));

/**
 * Étape 3 de la leçon guidée — compréhension ligne à ligne. Enveloppe `LearnPanel`
 * (déjà utilisé dans l'onglet « Aprender » de la page chanson) d'un bouton
 * « Continuer », sans dupliquer sa logique de révélation des traductions.
 */
export default function UnderstandingStep({ song, slug, onComplete }) {
  return (
    <div className="space-y-6">
      <Suspense
        fallback={(
          <div className="flex items-center justify-center gap-2 py-12 text-sm text-white/50">
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
            Chargement…
          </div>
        )}
      >
        <LearnPanel song={song} slug={slug} />
      </Suspense>

      <button
        type="button"
        onClick={onComplete}
        className="w-full rounded-full bg-[#FDE047] py-3 text-sm font-black text-black transition hover:brightness-95 active:scale-[0.98]"
      >
        Continuar para os exercícios
      </button>
    </div>
  );
}
