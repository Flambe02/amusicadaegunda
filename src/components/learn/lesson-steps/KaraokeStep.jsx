import { lazy, Suspense, useState } from 'react';
import { Loader2, Mic2 } from 'lucide-react';
import { isKaraokePublished } from '@/lib/lrc';
import { trackEvent } from '@/lib/analytics';

// Le moteur de karaoké existant, tel quel — pas de nouveau lecteur (§4.4 « Karaoké »:
// « Réutilise le moteur de karaoké existant. Évite de dupliquer le lecteur »).
const KaraokePlayer = lazy(() => import('@/components/karaoke/KaraokePlayer'));

/**
 * Étape 6 de la leçon guidée — karaoké. Monte `KaraokePlayer` exactement comme
 * `Song.jsx` le fait sur la page chanson (même prop `song`, même garde `isKaraokePublished`).
 */
export default function KaraokeStep({ song, slug, onComplete }) {
  const [open, setOpen] = useState(false);
  const available = isKaraokePublished(song);

  const handleOpen = () => {
    setOpen(true);
    trackEvent('karaoke_started', { lesson_slug: slug, song_slug: slug });
  };

  return (
    <div className="space-y-6">
      <p className="text-sm leading-6 text-white/70">
        Chegou a hora de cantar! Abra o karaokê e cante a música inteira com a letra sincronizada.
      </p>

      {available ? (
        <button
          type="button"
          onClick={handleOpen}
          className="flex w-full items-center justify-center gap-2 rounded-full bg-[#FDE047] py-3 text-sm font-black text-black transition hover:brightness-95 active:scale-[0.98]"
        >
          <Mic2 className="h-4 w-4" aria-hidden="true" /> Abrir o karaokê
        </button>
      ) : (
        <div className="rounded-xl border border-white/8 bg-white/[0.03] px-3.5 py-3 text-center text-sm text-white/50">
          Karaokê indisponível para esta música no momento.
        </div>
      )}

      {open && available && (
        <Suspense fallback={(
          <div className="flex items-center justify-center gap-2 py-6 text-sm text-white/50">
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> Carregando karaokê…
          </div>
        )}
        >
          <KaraokePlayer song={song} onClose={() => setOpen(false)} />
        </Suspense>
      )}

      <button
        type="button"
        onClick={onComplete}
        className="w-full rounded-full border border-white/12 bg-white/[0.04] py-3 text-sm font-bold text-white/80 transition hover:border-white/24"
      >
        Ver o resultado
      </button>
    </div>
  );
}
