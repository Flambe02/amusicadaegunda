import { supabase } from '@/lib/supabase';

// URL publique utilisée pour le QR code / lien partagé — toujours le domaine de
// production, jamais `window.location.origin` (la TV peut tourner dans un
// contexte Capacitor/WebView dont l'origine n'est pas la vraie URL publique).
const SITE_URL = 'https://www.amusicadasegunda.com';

// Lettres/chiffres sans caractères ambigus (pas de I/O/0/1) pour un code lisible
// à 3 mètres et sans confusion à la saisie. Jamais "CPF" ni équivalent officiel.
const CODE_LETTERS = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
const CODE_DIGITS = '23456789';
const BLOCKED_SUBSTRINGS = ['CPF', 'RG', 'SSN'];

function randomFrom(pool) {
  return pool[Math.floor(Math.random() * pool.length)];
}

/** Code court "FESTA" (4 lettres + 2 chiffres, ex. SEGA26) — jamais dérivé d'un
 * identifiant officiel brésilien (cf. amendement produit). */
export function generateFestaCode() {
  for (let attempt = 0; attempt < 20; attempt += 1) {
    const letters = Array.from({ length: 4 }, () => randomFrom(CODE_LETTERS)).join('');
    const digits = Array.from({ length: 2 }, () => randomFrom(CODE_DIGITS)).join('');
    const code = `${letters}${digits}`;
    if (!BLOCKED_SUBSTRINGS.some((bad) => code.includes(bad))) return code;
  }
  // Filet de sécurité improbable (20 tirages bloqués de suite) : ajoute un suffixe.
  return `SEGA${randomFrom(CODE_DIGITS)}${randomFrom(CODE_DIGITS)}`;
}

export function buildFestaJoinUrl(code) {
  return `${SITE_URL}/festa?c=${encodeURIComponent(code)}`;
}

/** Crée une nouvelle session festa (retente en cas de collision de code, très
 * improbable vu l'espace de ~13M combinaisons). */
export async function createFestaSession() {
  for (let attempt = 0; attempt < 5; attempt += 1) {
    const code = generateFestaCode();
    const { data, error } = await supabase
      .from('festa_sessions')
      .insert({ code })
      .select('id, code, active, current_song_id')
      .single();
    if (!error) return data;
    // 23505 = unique_violation (code déjà pris) → on retente avec un nouveau code.
    if (error.code !== '23505') throw error;
  }
  throw new Error('Não foi possível criar a sessão da festa (código já em uso repetidamente).');
}

export async function getFestaSessionByCode(code) {
  const normalized = (code || '').trim().toUpperCase();
  if (!normalized) return null;
  const { data, error } = await supabase
    .from('festa_sessions')
    .select('id, code, active, current_song_id')
    .eq('code', normalized)
    .eq('active', true)
    .maybeSingle();
  if (error) throw error;
  return data;
}

export async function endFestaSession(sessionId) {
  const { error } = await supabase.from('festa_sessions').update({ active: false }).eq('id', sessionId);
  if (error) throw error;
}

export async function updateFestaSessionCurrentSong(sessionId, songId) {
  const { error } = await supabase.from('festa_sessions').update({ current_song_id: songId }).eq('id', sessionId);
  if (error) throw error;
}

const FESTA_QUEUE_COLUMNS = 'id, session_id, song_id, singer_name, added_at, status, applause_score, tomato_score';

export async function listFestaQueue(sessionId) {
  const { data, error } = await supabase
    .from('festa_queue')
    .select(FESTA_QUEUE_COLUMNS)
    .eq('session_id', sessionId)
    .order('added_at', { ascending: true });
  if (error) throw error;
  return data || [];
}

export async function addToFestaQueue(sessionId, songId, singerName) {
  const { data, error } = await supabase
    .from('festa_queue')
    .insert({ session_id: sessionId, song_id: songId, singer_name: singerName.slice(0, 24) })
    .select(FESTA_QUEUE_COLUMNS)
    .single();
  if (error) throw error;
  return data;
}

export async function markFestaQueueStatus(queueId, status) {
  const { error } = await supabase.from('festa_queue').update({ status }).eq('id', queueId);
  if (error) throw error;
}

/** Retrait "à la demande d'un invité" — jamais une suppression physique (garde
 * l'historique de la soirée), juste un statut qui sort l'entrée de la fila. */
export async function skipFestaQueueEntry(queueId) {
  return markFestaQueueStatus(queueId, 'skipped');
}

export async function incrementApplause(queueId) {
  const { data, error } = await supabase.rpc('increment_applause', { p_queue_id: queueId });
  if (error) throw error;
  return data;
}

export async function incrementTomato(queueId) {
  const { data, error } = await supabase.rpc('increment_tomato', { p_queue_id: queueId });
  if (error) throw error;
  return data;
}

/**
 * Abonnement Realtime unique pour une session festa : changements de la fila
 * (`festa_queue`), changements de la session elle-même (`current_song_id`,
 * `active`), et présence (prénoms connectés — trackée seulement côté
 * téléphone via `guestName`, la TV se contente d'observer).
 *
 * Retourne une fonction de nettoyage (à appeler dans le cleanup d'un effect).
 */
export function subscribeFestaSession(sessionId, {
  guestName = null,
  onQueueChange,
  onSessionChange,
  onPresenceSync,
  onStatusChange,
} = {}) {
  if (!sessionId) return () => {};

  const channel = supabase.channel(`festa:${sessionId}`, {
    config: { presence: { key: guestName || `observer-${Math.random().toString(36).slice(2)}` } },
  });

  channel.on(
    'postgres_changes',
    { event: '*', schema: 'public', table: 'festa_queue', filter: `session_id=eq.${sessionId}` },
    (payload) => onQueueChange?.(payload),
  );

  channel.on(
    'postgres_changes',
    { event: 'UPDATE', schema: 'public', table: 'festa_sessions', filter: `id=eq.${sessionId}` },
    (payload) => onSessionChange?.(payload),
  );

  if (onPresenceSync) {
    channel.on('presence', { event: 'sync' }, () => onPresenceSync(channel.presenceState()));
  }

  channel.subscribe(async (status) => {
    onStatusChange?.(status);
    if (status === 'SUBSCRIBED' && guestName) {
      try { await channel.track({ name: guestName }); } catch { /* dégradation silencieuse */ }
    }
  });

  return () => { supabase.removeChannel(channel); };
}
