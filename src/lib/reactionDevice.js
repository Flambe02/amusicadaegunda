/**
 * « Nota da semana » — identité anonyme de l'appareil et vote déjà donné.
 *
 * `amds-device-id` : uuid tiré au hasard une fois par appareil (aucun compte, rien de
 * personnel), pour qu'un appareil n'ait qu'un vote par chanson côté serveur.
 * `amds-reaction-<songId>` : le vote de cet appareil, pour montrer les résultats
 * directement à la visite suivante. Stockage indisponible : tout reste en mémoire.
 */

export const DEVICE_ID_KEY = 'amds-device-id';
export const REACTION_KEYS = ['fogo', 'risada', 'meh'];

/** Les trois notes, dans l'ordre affiché. */
export const NOTA_OPTIONS = [
  { key: 'fogo', emoji: '🔥', label: 'Pegou fogo' },
  { key: 'risada', emoji: '😂', label: 'Morri de rir' },
  { key: 'meh', emoji: '😐', label: 'Meh' },
];

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const memory = new Map();

function storageGet(key) {
  try {
    const value = window.localStorage.getItem(key);
    return value ?? memory.get(key) ?? null;
  } catch {
    return memory.get(key) ?? null;
  }
}

function storageSet(key, value) {
  try {
    window.localStorage.setItem(key, value);
    memory.delete(key);
  } catch {
    memory.set(key, value); // stockage indisponible : la valeur reste en mémoire pour la session
  }
}

function randomUuid() {
  const cryptoApi = typeof globalThis !== 'undefined' ? globalThis.crypto : undefined;
  if (typeof cryptoApi?.randomUUID === 'function') return cryptoApi.randomUUID();
  const bytes = new Uint8Array(16);
  if (typeof cryptoApi?.getRandomValues === 'function') cryptoApi.getRandomValues(bytes);
  else for (let i = 0; i < 16; i += 1) bytes[i] = Math.floor(Math.random() * 256);
  bytes[6] = (bytes[6] & 0x0f) | 0x40; // version 4
  bytes[8] = (bytes[8] & 0x3f) | 0x80; // variante RFC 4122
  const hex = [...bytes].map((b) => b.toString(16).padStart(2, '0')).join('');
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

/** Identifiant anonyme de l'appareil (créé au premier appel). */
export function getDeviceId() {
  const known = storageGet(DEVICE_ID_KEY);
  if (known && UUID_RE.test(known)) return known;
  const id = randomUuid();
  storageSet(DEVICE_ID_KEY, id);
  return id;
}

const reactionKey = (songId) => `amds-reaction-${songId}`;

/** Le vote déjà donné par cet appareil pour cette chanson, ou null. */
export function readOwnReaction(songId) {
  if (songId == null) return null;
  const value = storageGet(reactionKey(songId));
  return REACTION_KEYS.includes(value) ? value : null;
}

export function saveOwnReaction(songId, reaction) {
  if (songId == null || !REACTION_KEYS.includes(reaction)) return;
  storageSet(reactionKey(songId), reaction);
}

/** Parts arrondies de chaque note ; zéros sans vote. */
export function percentages(counts) {
  const total = NOTA_OPTIONS.reduce((sum, option) => sum + (counts[option.key] || 0), 0);
  const share = Object.fromEntries(
    NOTA_OPTIONS.map((option) => [option.key, total > 0 ? Math.round(((counts[option.key] || 0) * 100) / total) : 0])
  );
  return { total, share };
}
