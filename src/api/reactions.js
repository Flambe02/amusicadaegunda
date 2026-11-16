import { supabase } from '@/lib/supabase';

/**
 * « Nota da semana » — fonctions SQL de
 * supabase/migrations/20261115120000_create_song_reactions.sql (aucun accès direct à
 * la table). Chaque appel rejette en cas d'erreur : l'appelant masque alors le widget.
 */

const toCount = (value) => {
  const n = Number(value);
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : 0;
};

export function normalizeCounts(data) {
  const source = data && typeof data === 'object' ? data : {};
  return { fogo: toCount(source.fogo), risada: toCount(source.risada), meh: toCount(source.meh) };
}

// Une seule requête à la fois par chanson (la fiche monte ses versions mobile et desktop).
const countsInFlight = new Map();

/** Totaux d'une chanson : { fogo, risada, meh }. */
export function fetchReactionCounts(songId) {
  const key = String(songId);
  if (!countsInFlight.has(key)) {
    const request = (async () => {
      const { data, error } = await supabase.rpc('song_reaction_counts', { p_song_id: Number(songId) });
      if (error) throw error;
      return normalizeCounts(data);
    })().finally(() => countsInFlight.delete(key));
    countsInFlight.set(key, request);
  }
  return countsInFlight.get(key);
}

/** Vote (ou change le vote) de l'appareil ; renvoie les nouveaux totaux. */
export async function voteReaction(songId, deviceId, reaction) {
  const { data, error } = await supabase.rpc('vote_song_reaction', {
    p_song_id: Number(songId),
    p_device_id: deviceId,
    p_reaction: reaction,
  });
  if (error) throw error;
  return normalizeCounts(data);
}

/** Admin : une ligne par chanson ayant reçu au moins un vote. */
export async function fetchReactionTotals() {
  const { data, error } = await supabase.rpc('song_reaction_totals');
  if (error) throw error;
  return (Array.isArray(data) ? data : []).map((row) => ({
    songId: row.song_id,
    title: row.title || '—',
    fogo: toCount(row.fogo),
    risada: toCount(row.risada),
    meh: toCount(row.meh),
    total: toCount(row.total),
  }));
}
