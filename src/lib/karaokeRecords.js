/**
 * Recordes do karaokê — guardados no aparelho (grand écran, 2026-11-16).
 * Par música, les meilleurs scores (prénom, mode, étoiles, date). Rien n'est envoyé.
 */

export const RECORDS_KEY = 'amds-records-v1';
const KEEP_PER_SONG = 20;
let seq = 0;

function readAll(storage) {
  try {
    const value = JSON.parse(storage?.getItem(RECORDS_KEY) || '{}');
    return value && typeof value === 'object' && !Array.isArray(value) ? value : {};
  } catch {
    return {};
  }
}

/** Meilleurs scores d'une música, du plus haut au plus bas. */
export function topForSong(songId, limit = 5, storage = globalThis.localStorage) {
  const list = readAll(storage)[String(songId)]?.entries || [];
  return list.slice(0, limit);
}

/** Tous les recordes de l'appareil, toutes músicas confondues. */
export function topOverall(limit = 10, storage = globalThis.localStorage) {
  const all = readAll(storage);
  return Object.entries(all)
    .flatMap(([songId, v]) => (v.entries || []).map((e) => ({ ...e, songId, songTitle: v.title })))
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);
}

/**
 * Ajoute les scores d'une partie. Renvoie, pour chaque entrée, son rang dans la música
 * (1 = recorde) et si c'est le meilleur score personnel de ce prénom.
 */
export function addRecords(songId, title, entries, storage = globalThis.localStorage) {
  const all = readAll(storage);
  const key = String(songId);
  const before = all[key]?.entries || [];
  const at = Date.now();
  const added = entries
    .filter((e) => e && e.score > 0)
    .map((e) => { seq += 1; return { name: e.name, score: e.score, stars: e.stars || 0, mode: e.mode, at, id: `${at}-${seq}-${Math.random().toString(36).slice(2, 7)}` }; });
  const merged = [...before, ...added].sort((a, b) => b.score - a.score || a.at - b.at).slice(0, KEEP_PER_SONG);
  all[key] = { title, entries: merged };
  try { storage?.setItem(RECORDS_KEY, JSON.stringify(all)); } catch { /* stockage plein */ }
  return added.map((e) => {
    const rank = merged.findIndex((m) => m.id === e.id) + 1;
    const personalBest = !before.some((b) => b.name === e.name && b.score >= e.score);
    return { ...e, rank: rank > 0 ? rank : null, personalBest };
  });
}
