/**
 * Quem canta no grand écran (karaokê K1, 2026-11-16) : prénoms et couleurs des
 * joueurs, gardés sur l'appareil pour « Cantar agora » la fois suivante.
 * Le prénom n'est jamais envoyé : il sert à l'écran (et aux records locaux, K2).
 */

export const PLAYERS_KEY = 'amds-players-v1';
export const PLAYER_COLORS = ['#FDE047', '#F472B6', '#38BDF8', '#4ADE80'];
export const MAX_NAME = 16;
const DEFAULT_NAMES = ['Cantor 1', 'Cantor 2', 'Cantor 3', 'Cantor 4'];

export function cleanName(name, index = 0) {
  const clean = String(name || '').replace(/\s+/g, ' ').trim().slice(0, MAX_NAME);
  return clean || DEFAULT_NAMES[index] || `Cantor ${index + 1}`;
}

export function loadPlayerNames(storage = globalThis.localStorage) {
  let saved = [];
  try {
    const value = JSON.parse(storage?.getItem(PLAYERS_KEY) || '[]');
    if (Array.isArray(value)) saved = value;
  } catch { /* défauts */ }
  return DEFAULT_NAMES.map((_, i) => cleanName(saved[i], i));
}

export function savePlayerNames(names, storage = globalThis.localStorage) {
  try {
    storage?.setItem(PLAYERS_KEY, JSON.stringify(names.slice(0, DEFAULT_NAMES.length).map((n, i) => cleanName(n, i))));
  } catch { /* stockage indisponible */ }
}

export const LOBBY_KEY = 'amds-lobby-v1';

/** Dernier mode et nombre de chanteurs choisis (« Cantar agora » reprend ce choix). */
export function loadLobbyChoice(storage = globalThis.localStorage) {
  try {
    const v = JSON.parse(storage?.getItem(LOBBY_KEY) || 'null');
    if (v && typeof v.mode === 'string') return { mode: v.mode, count: Math.min(4, Math.max(2, Number(v.count) || 2)) };
  } catch { /* défaut */ }
  return { mode: 'solo', count: 2 };
}

export function saveLobbyChoice(choice, storage = globalThis.localStorage) {
  try { storage?.setItem(LOBBY_KEY, JSON.stringify(choice)); } catch { /* stockage indisponible */ }
}

/** Joueurs du mode : 1 en solo, 2 en dueto/duelo, `count` (2 à 4) en cooperação/passa. */
export function playersFor(mode, names, count = 2) {
  let total = 2;
  if (mode === 'solo') total = 1;
  else if (mode === 'coop' || mode === 'pass') total = Math.min(4, Math.max(2, count));
  return Array.from({ length: total }, (_, i) => ({ index: i, name: cleanName(names?.[i], i), color: PLAYER_COLORS[i] }));
}
