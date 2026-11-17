import { NOTA_OPTIONS } from '@/lib/reactionDevice';
import { useNotaDaSemana, votesLabel } from '@/hooks/useNotaDaSemana';
import { TEXT_SHADOW } from '@/components/mobile/feed/feedStyles';

/**
 * « Nota da semana » : 🔥 / 😂 / 😐 sur la chanson de la semaine (à l'appelant de ne
 * le monter que pour elle). Un vote par appareil, modifiable ; les pourcentages ne
 * s'affichent qu'après avoir voté (directement si l'appareil a déjà voté).
 *
 * Panne (fonction SQL absente, réseau) : le widget disparaît, sans message d'erreur.
 * Logique partagée avec le grand écran : src/hooks/useNotaDaSemana.js.
 *
 * `variant` : `page` (fiche de la chanson) ou `feed` (pastilles posées sur la vidéo
 * du feed : seuls les boutons captent les taps, aucun jaune sur la vidéo).
 */
export default function NotaDaSemana({ song, variant = 'page', className = '' }) {
  const { status, own, pending, vote, total, share, visible, showResults } = useNotaDaSemana(song);
  if (!visible) return null;

  if (variant === 'feed') {
    return (
      <div data-nota-semana={status} className={`pointer-events-none mb-2 ${className}`}>
        <p className={`text-xs font-semibold leading-none text-white/90 ${TEXT_SHADOW}`}>
          {showResults ? `Nota da semana · ${votesLabel(total)}` : 'Nota da semana?'}
        </p>
        <div role="group" aria-label="Nota da semana" className="mt-1.5 flex items-center gap-1.5">
          {NOTA_OPTIONS.map((option) => {
            const chosen = own === option.key;
            return (
              <button
                key={option.key}
                type="button"
                onClick={() => vote(option.key)}
                aria-pressed={chosen}
                aria-label={showResults ? `${option.label}: ${share[option.key]}%` : option.label}
                disabled={pending}
                className={`pointer-events-auto flex h-10 min-w-[44px] touch-manipulation items-center justify-center gap-1 rounded-full border px-2.5 text-sm font-bold active:opacity-70 ${
                  chosen ? 'border-white bg-white text-black' : 'border-white/25 bg-black/35 text-white'
                }`}
              >
                <span aria-hidden="true" className="text-lg leading-none">{option.emoji}</span>
                {showResults ? <span aria-hidden="true">{share[option.key]}%</span> : null}
              </button>
            );
          })}
        </div>
      </div>
    );
  }

  return (
    <section
      data-nota-semana={status}
      aria-label="Nota da semana"
      className={`rounded-[18px] border border-white/10 bg-white/[0.045] px-4 py-3 ${className}`}
    >
      <p className="text-[11px] font-black uppercase tracking-[0.22em] text-app-yellow">Nota da semana</p>
      <p className="mt-0.5 text-xs font-medium text-white/60">
        {showResults ? `${votesLabel(total)} · toque em outro para mudar` : 'O que achou da música da semana?'}
      </p>
      <div role="group" aria-label="Nota da semana" className="mt-3 grid grid-cols-3 gap-2">
        {NOTA_OPTIONS.map((option) => {
          const chosen = own === option.key;
          return (
            <button
              key={option.key}
              type="button"
              onClick={() => vote(option.key)}
              aria-pressed={chosen}
              aria-label={showResults ? `${option.label}: ${share[option.key]}%` : option.label}
              disabled={pending}
              className={`inline-flex min-h-[52px] items-center justify-center gap-2 rounded-full border px-3 text-sm font-black transition active:scale-[0.98] disabled:opacity-60 ${
                chosen
                  ? 'border-app-yellow/50 bg-app-yellow/12 text-app-yellow'
                  : 'border-white/12 bg-white/6 text-white/80 hover:bg-white/10'
              }`}
            >
              <span aria-hidden="true" className="text-2xl leading-none">{option.emoji}</span>
              {showResults ? <span aria-hidden="true">{share[option.key]}%</span> : null}
            </button>
          );
        })}
      </div>
      <p className="sr-only" aria-live="polite">{showResults ? `Voto registrado. ${votesLabel(total)}.` : ''}</p>
    </section>
  );
}
