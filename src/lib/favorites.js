/**
 * « Minhas favoritas » — favoris gardés sur l'appareil seulement (aucun compte).
 *
 * Stockage : `amds-favorites-v1` = tableau d'identifiants de chansons (chaînes), le
 * plus récent en premier, au plus FAVORITES_MAX entrées. Chaque changement émet
 * l'événement `amds-favorites-change` sur `window` (les autres onglets reçoivent
 * l'événement natif `storage`).
 *
 * Stockage indisponible (navigation privée, quota, WebView bridée) : les favoris
 * vivent en mémoire le temps de la session, sans jamais faire planter la page.
 */

export const FAVORITES_KEY = 'amds-favorites-v1';
export const FAVORITES_EVENT = 'amds-favorites-change';
export const FAVORITES_MAX = 500;

const EMPTY = Object.freeze([]);

// Repli mémoire : utilisé dès qu'une lecture ou une écriture du stockage échoue.
let memoryRaw = null;
let useMemory = false;
// Dernière lecture : même chaîne → même tableau (instantané stable pour React).
let cache = { raw: undefined, ids: EMPTY };

function readRaw() {
  if (useMemory) return memoryRaw;
  try {
    return window.localStorage.getItem(FAVORITES_KEY);
  } catch {
    useMemory = true;
    return memoryRaw;
  }
}

function writeRaw(raw) {
  memoryRaw = raw;
  if (useMemory) return;
  try {
    window.localStorage.setItem(FAVORITES_KEY, raw);
  } catch {
    useMemory = true; // la session continue en mémoire
  }
}

function parse(raw) {
  if (!raw) return EMPTY;
  try {
    const list = JSON.parse(raw);
    if (!Array.isArray(list)) return EMPTY;
    const seen = new Set();
    const ids = [];
    for (const item of list) {
      if (item == null || item === '') continue;
      const id = String(item);
      if (seen.has(id)) continue;
      seen.add(id);
      ids.push(id);
    }
    return Object.freeze(ids.slice(0, FAVORITES_MAX));
  } catch {
    return EMPTY;
  }
}

/** Identifiants favoris, le plus récent en premier (tableau figé, stable tant que rien ne change). */
export function readFavorites() {
  const raw = readRaw() ?? null;
  if (raw !== cache.raw) cache = { raw, ids: parse(raw) };
  return cache.ids;
}

function normalizeId(id) {
  if (id == null) return null;
  const value = String(id).trim();
  return value ? value : null;
}

export function isFavorite(id) {
  const key = normalizeId(id);
  return key ? readFavorites().includes(key) : false;
}

function notify() {
  try {
    window.dispatchEvent(new CustomEvent(FAVORITES_EVENT));
  } catch {
    /* environnement sans CustomEvent : rien à prévenir */
  }
}

/** Ajoute ou retire une chanson ; renvoie le nouvel état (true = favorite). */
export function toggleFavorite(id) {
  const key = normalizeId(id);
  if (!key) return false;
  const current = readFavorites();
  const wasFavorite = current.includes(key);
  const next = wasFavorite
    ? current.filter((item) => item !== key)
    : [key, ...current].slice(0, FAVORITES_MAX);
  writeRaw(JSON.stringify(next));
  notify();
  return !wasFavorite;
}

/** Abonnement pour useSyncExternalStore : cet onglet (événement maison) et les autres (`storage`). */
export function subscribeFavorites(callback) {
  if (typeof window === 'undefined') return () => {};
  const onStorage = (event) => {
    if (event.key === FAVORITES_KEY || event.key === null) callback();
  };
  window.addEventListener(FAVORITES_EVENT, callback);
  window.addEventListener('storage', onStorage);
  return () => {
    window.removeEventListener(FAVORITES_EVENT, callback);
    window.removeEventListener('storage', onStorage);
  };
}

/** Tests uniquement : oublie le repli mémoire et l'instantané. */
export function __resetFavoritesForTests() {
  memoryRaw = null;
  useMemory = false;
  cache = { raw: undefined, ids: EMPTY };
}
