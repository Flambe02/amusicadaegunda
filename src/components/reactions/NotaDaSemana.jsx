import { useCallback, useEffect, useState } from 'react';
import { fetchReactionCounts, voteReaction } from '@/api/reactions';
import { NOTA_OPTIONS, getDeviceId, percentages, readOwnReaction, saveOwnReaction } from '@/lib/reactionDevice';
import { getPublicSlug } from '@/components/mobile/feed/feedMedia';
import { TEXT_SHADOW } from '@/components/mobile/feed/feedStyles';
import { logger } from '@/lib/logger';

const EMPTY_COUNTS = { fogo: 0, risada: 0, meh: 0 };

// Seules les chansons de la base ont un identifiant numérique (le repli statique
// `content/songs.json` donne « static-1 »…) : sans lui, pas de vote possible.
function voteId(song) {
  const id = song?.id;
  return id != null && /^\d+$/.test(String(id)) ? String(id) : null;
}

const votesLabel = (total) => `${total} ${total === 1 ? 'voto' : 'votos'}`;

/**
 * « Nota da semana » : 🔥 / 😂 / 😐 sur la chanson de la semaine (à l'appelant de ne
 * le monter que pour elle). Un vote par appareil, modifiable ; les pourcentages ne
 * s'affichent qu'après avoir voté (directement si l'appareil a déjà voté).
 *
 * Panne (fonction SQL absente, réseau) : le widget disparaît, sans message d'erreur.
 *
 * `variant` : `page` (fiche de la chanson) ou `feed` (pastilles posées sur la vidéo
 * du feed : seuls les boutons captent les taps, aucun jaune sur la vidéo).
 */
export default function NotaDaSemana({ song, variant = 'page', className = '' }) {
  const songId = voteId(song);
  const slug = song ? getPublicSlug(song) : null;
  const [status, setStatus] = useState('prompt'); // prompt | loading | results | hidden
  const [own, setOwn] = useState(null);
  const [counts, setCounts] = useState(EMPTY_COUNTS);
  const [pending, setPending] = useState(false);

  useEffect(() => {
    if (!songId) return undefined;
    const previous = readOwnReaction(songId);
    setOwn(previous);
    setCounts(EMPTY_COUNTS);
    setPending(false);
    if (!previous) {
      setStatus('prompt');
      return undefined;
    }
    // Déjà voté sur cet appareil : les résultats directement.
    let alive = true;
    setStatus('loading');
    fetchReactionCounts(songId)
      .then((next) => {
        if (!alive) return;
        setCounts(next);
        setStatus('results');
      })
      .catch((error) => {
        if (!alive) return;
        logger.warn('Nota da semana indisponível:', error);
        setStatus('hidden');
      });
    return () => { alive = false; };
  }, [songId]);

  const vote = useCallback((reaction) => {
    if (!songId || pending || reaction === own) return;
    setPending(true);
    voteReaction(songId, getDeviceId(), reaction)
      .then((next) => {
        saveOwnReaction(songId, reaction);
        setOwn(reaction);
        setCounts(next);
        setStatus('results');
        try {
          window.gtag?.('event', 'vote', { method: 'nota_da_semana', reaction, item_id: slug });
        } catch {
          /* analytics indisponible : sans effet */
        }
      })
      .catch((error) => {
        logger.warn('Nota da semana: voto não registrado:', error);
        setStatus('hidden');
      })
      .finally(() => setPending(false));
  }, [songId, pending, own, slug]);

  if (!songId || status === 'hidden' || status === 'loading') return null;

  const showResults = status === 'results';
  const { total, share } = percentages(counts);

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
