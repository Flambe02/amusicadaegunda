import { useCallback, useEffect, useState } from 'react';
import { fetchReactionCounts, voteReaction } from '@/api/reactions';
import { getDeviceId, percentages, readOwnReaction, saveOwnReaction } from '@/lib/reactionDevice';
import { getPublicSlug } from '@/components/mobile/feed/feedMedia';
import { logger } from '@/lib/logger';

const EMPTY_COUNTS = { fogo: 0, risada: 0, meh: 0 };

// Seules les chansons de la base ont un identifiant numérique (le repli statique
// `content/songs.json` donne « static-1 »…) : sans lui, pas de vote possible.
export function notaVoteId(song) {
  const id = song?.id;
  return id != null && /^\d+$/.test(String(id)) ? String(id) : null;
}

export const votesLabel = (total) => `${total} ${total === 1 ? 'voto' : 'votos'}`;

/**
 * Logique de la « Nota da semana » (🔥 / 😂 / 😐), partagée par le mobile
 * (NotaDaSemana.jsx) et le grand écran (BsNotaDaSemana.jsx). Un vote par appareil,
 * modifiable ; résultats après le vote (directement si l'appareil a déjà voté).
 * Panne (fonction SQL absente, réseau) : `status = 'hidden'`, le widget disparaît.
 *
 * `analyticsMethod` distingue le point de vote dans GA4.
 */
export function useNotaDaSemana(song, { analyticsMethod = 'nota_da_semana' } = {}) {
  const songId = notaVoteId(song);
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
          window.gtag?.('event', 'vote', { method: analyticsMethod, reaction, item_id: slug });
        } catch {
          /* analytics indisponible : sans effet */
        }
      })
      .catch((error) => {
        logger.warn('Nota da semana: voto não registrado:', error);
        setStatus('hidden');
      })
      .finally(() => setPending(false));
  }, [songId, pending, own, slug, analyticsMethod]);

  const { total, share } = percentages(counts);
  return {
    songId, status, own, pending, vote, total, share,
    visible: Boolean(songId) && status !== 'hidden' && status !== 'loading',
    showResults: status === 'results',
  };
}
