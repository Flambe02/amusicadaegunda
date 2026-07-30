import { lazy, Suspense, useEffect, useMemo, useState } from 'react';
import { BookOpen, Loader2, Sparkles } from 'lucide-react';
import { resolveSongTiming } from '@/lib/timingModel';
import { buildLearnIndex, loadLearnContent } from '@/lib/learnContent';

// Le carnet ne s'ouvre que sur un tap explicite : import dynamique, pour ne pas
// alourdir le premier rendu du mode lecture avec un composant qu'on n'ouvrira peut-être
// jamais dans cette session.
const VocabNotebookSheet = lazy(() => import('@/components/learn/VocabNotebookSheet'));

/**
 * Modo Aprender — lecture active (bêta, 2 chansons).
 *
 * Chaque PLAGE de lignes LRC est une entrée tappable, sans traduction visible au
 * départ ; au tap, la traduction FR apparaît dessous et la ligne RESTE ouverte
 * (pas de refermeture automatique — §6.2 de la spec).
 *
 * Le découpage affiché est celui du LRC, pas celui de la fiche : les lignes d'une
 * même plage sont rendues telles quelles, l'une sous l'autre, avec une seule
 * traduction pour le groupe. C'est ce qui garantit que le mode lecture et le mode
 * karaoké racontent exactement la même chose.
 *
 * Ce composant est monté uniquement à l'intérieur de l'overlay des paroles, et
 * chargé en import dynamique : il n'existe pas dans le bundle des autres pages.
 */
export default function LearnPanel({ song, slug }) {
  const [entry, setEntry] = useState(undefined); // undefined = en cours, null = absent
  const [revealed, setRevealed] = useState(() => new Set());
  const [showNotebook, setShowNotebook] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setEntry(undefined);
    setRevealed(new Set());
    loadLearnContent(slug).then((data) => {
      if (!cancelled) setEntry(data);
    });
    return () => { cancelled = true; };
  }, [slug]);

  // Lignes issues du moteur de timing partagé : `timing_data` structuré quand il
  // existe, sinon `lrc_content`. Les deux sont alignés index pour index, donc les
  // plages de la fiche restent valides quelle que soit la source retenue.
  const lines = useMemo(() => resolveSongTiming(song).lines, [song]);
  const index = useMemo(() => buildLearnIndex(entry, lines), [entry, lines]);

  const toggle = (segmentIndex) => {
    setRevealed((prev) => {
      const next = new Set(prev);
      if (next.has(segmentIndex)) next.delete(segmentIndex);
      else next.add(segmentIndex);
      return next;
    });
  };

  if (entry === undefined) {
    return (
      <div className="flex items-center justify-center gap-2 py-12 text-sm text-white/50">
        <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
        Chargement du mode Aprender…
      </div>
    );
  }

  // Fiche absente, illisible, ou désalignée des paroles actuelles (resynchronisation
  // depuis sa rédaction) : on le dit, plutôt que d'afficher des traductions décalées.
  if (!index) {
    return (
      <div className="flex flex-col items-center py-12 text-center">
        <BookOpen className="mb-4 h-10 w-10 text-white/20" aria-hidden="true" />
        <p className="font-semibold text-white/60">Mode Aprender indisponible</p>
        <p className="mt-1 max-w-xs text-sm text-white/38">
          La fiche de cette chanson n&apos;est pas alignée avec les paroles synchronisées.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-3">
        <p className="text-xs leading-5 text-white/45">
          Touchez une ligne pour afficher sa traduction. Les lignes marquées d&apos;une étincelle
          contiennent une expression à connaître.
        </p>
        {/* Les expressions se collectent pendant le karaoké (§6.3) — ce bouton ne fait
            que CONSULTER ce qui a déjà été rangé, depuis le mode lecture. */}
        <button
          type="button"
          onClick={() => setShowNotebook(true)}
          className="flex flex-shrink-0 items-center gap-1.5 rounded-full border border-white/12 bg-white/[0.04] px-3 py-1.5 text-[11px] font-bold text-white/70 transition hover:border-white/24 hover:text-white"
        >
          <BookOpen className="h-3.5 w-3.5" aria-hidden="true" />
          Meu caderno
        </button>
      </div>

      <ol className="space-y-1.5">
        {index.segments.map((seg, segIdx) => {
          const isOpen = revealed.has(segIdx);
          return (
            <li key={`${seg.from}-${seg.to}`}>
              <button
                type="button"
                onClick={() => toggle(segIdx)}
                aria-expanded={isOpen}
                className={`w-full rounded-xl border px-3.5 py-2.5 text-left transition ${
                  isOpen
                    ? 'border-[#FDE047]/30 bg-[#FDE047]/[0.07]'
                    : 'border-white/8 bg-white/[0.03] hover:border-white/16 hover:bg-white/[0.06]'
                }`}
              >
                <span className="flex items-start gap-2">
                  <span className="min-w-0 flex-1">
                    {seg.texts.map((text, i) => (
                      <span key={i} className="block text-sm leading-6 text-white/85">
                        {text}
                      </span>
                    ))}
                  </span>
                  {seg.expressionId && (
                    <Sparkles
                      className="mt-1 h-3.5 w-3.5 flex-shrink-0 text-[#FDE047]/70"
                      aria-label="Contient une expression à connaître"
                    />
                  )}
                </span>
                {isOpen && (
                  <span className="mt-2 block border-t border-white/8 pt-2 text-sm leading-6 text-[#FDE047]/90">
                    {seg.fr}
                  </span>
                )}
              </button>
            </li>
          );
        })}
      </ol>

      {index.expressions.length > 0 && (
        <section aria-labelledby="learn-expressions-title" className="space-y-3">
          <h3 id="learn-expressions-title" className="text-[11px] uppercase tracking-[0.24em] text-white/38">
            Les expressions de la semaine
          </h3>
          <dl className="space-y-3">
            {index.expressions.map((expr) => (
              <div key={expr.id} className="rounded-xl border border-white/8 bg-white/[0.03] px-3.5 py-3">
                <dt className="flex flex-wrap items-baseline gap-2">
                  <span className="text-sm font-bold text-[#FDE047]">{expr.term}</span>
                  {expr.register && (
                    <span className="text-[10px] uppercase tracking-[0.18em] text-white/35">
                      {expr.register}
                    </span>
                  )}
                </dt>
                <dd className="mt-1.5 text-sm leading-6 text-white/70">{expr.meaning_fr}</dd>
              </div>
            ))}
          </dl>
        </section>
      )}

      {index.culturalContextFr && (
        <section aria-labelledby="learn-context-title" className="space-y-2">
          <h3 id="learn-context-title" className="text-[11px] uppercase tracking-[0.24em] text-white/38">
            Contexte culturel
          </h3>
          <p className="text-sm leading-6 text-white/70">{index.culturalContextFr}</p>
        </section>
      )}

      {showNotebook && (
        <Suspense fallback={null}>
          <VocabNotebookSheet onClose={() => setShowNotebook(false)} />
        </Suspense>
      )}
    </div>
  );
}
