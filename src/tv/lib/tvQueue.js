/**
 * Fila do grand écran — règles pures (audit 2026-11-16, étape 2 « fila honnête »).
 *
 * Deux filas existent :
 *   - la fila LOCALE de la TV (en mémoire, hors Festa) ;
 *   - la fila FESTA (Supabase `festa_queue`), alimentée par les téléphones ET, pendant
 *     une Festa, par la TV elle-même (« Adicionar à fila » y écrit, prénom `TV_SINGER`).
 * Le compteur « Fila · N » et l'overlay listent exactement les mêmes entrées.
 */

/** Prénom affiché pour une música ajoutée depuis la TV pendant une Festa. */
export const TV_SINGER = 'TV';

const byAddedAt = (a, b) => new Date(a.added_at) - new Date(b.added_at);

/** Entrées en attente de la fila Festa, dans l'ordre de passage. */
export function festaWaiting(festaQueue) {
  return (festaQueue || []).filter((q) => q.status === 'waiting').sort(byAddedAt);
}

/** Entrée en cours de la fila Festa (« Cantando agora »), ou null. */
export function festaPlaying(festaQueue) {
  return (festaQueue || []).find((q) => q.status === 'playing') || null;
}

/**
 * Ajout d'une música à la fila Festa depuis la TV : déjà en attente (ou ajout en vol,
 * `pendingIds`) → pas de doublon, on donne sa position ; sinon position = fin de fila.
 * @returns {{ added: boolean, position: number }}
 */
export function planFestaAdd(festaQueue, pendingIds, songId) {
  const waiting = festaWaiting(festaQueue);
  const index = waiting.findIndex((q) => q.song_id === songId);
  if (index >= 0) return { added: false, position: index + 1 };
  if (pendingIds && pendingIds.has(songId)) return { added: false, position: waiting.length + 1 };
  return { added: true, position: waiting.length + 1 };
}

/**
 * Lignes de la fila Festa pour l'overlay : { qid, id, title, singer } — titre lu dans le
 * catalogue (une música inconnue garde une ligne lisible).
 */
export function festaRows(entries, songs) {
  return (entries || []).map((q) => {
    const song = (songs || []).find((s) => s.id === q.song_id);
    return { qid: q.id, id: q.song_id, title: song?.title || 'Música', singer: q.singer_name || null, raw: song || null };
  });
}

/** Message du toast après un ajout. */
export function queueToastMessage({ added, position }, festa = false) {
  const where = festa ? 'fila da Festa' : 'fila';
  return added ? `Adicionada à ${where} · posição ${position}` : `Já está na ${where} · posição ${position}`;
}
