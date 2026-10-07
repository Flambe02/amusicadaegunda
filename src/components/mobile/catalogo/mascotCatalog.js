/**
 * Animations de la mascotte « à la demande » : hébergées sur le site (public/mascot/),
 * absentes de l'APK (scripts/strip-remote-mascot.cjs), téléchargées quand elles sont
 * jouées puis gardées sur l'appareil.
 *
 * Deux niveaux :
 * - les cinq animations de base (stageDraw.js) restent embarquées, disponibles hors connexion ;
 * - celles du catalogue `mascot/catalog.json`, lu sur le site : en ajouter une ne demande
 *   aucun changement de code, et une app déjà installée la reçoit.
 *
 * Cache : le Cache Storage du navigateur, utilisé directement par la page (pas de
 * dépendance au Service Worker) — même fonctionnement sur le web et dans la WebView
 * Capacitor. Le cache HTTP ne suffit pas : GitHub Pages impose 10 minutes.
 */
import { Capacitor } from '@capacitor/core';

const SITE_URL = 'https://www.amusicadasegunda.com';
const CACHE_NAME = 'amds-mascot-v1';
const TYPES = new Set(['dance', 'sing', 'idle']);

/** Dossier des animations à la demande : le site lui-même, ou son adresse depuis l'app installée. */
export function mascotBaseUrl() {
  let native = false;
  try { native = Boolean(Capacitor?.isNativePlatform?.()); } catch { /* web */ }
  return `${native ? SITE_URL : ''}/mascot/`;
}

const fileName = (value) => (typeof value === 'string' && /^[\w.-]+\.(mp4|webp|jpg|png)$/i.test(value) ? value : null);

/** Entrées valides du catalogue, avec leurs adresses complètes. Tout le reste est ignoré. */
export function normalizeCatalog(raw, base = mascotBaseUrl()) {
  const list = Array.isArray(raw) ? raw : Array.isArray(raw?.animations) ? raw.animations : [];
  const seen = new Set();
  const out = [];
  for (const item of list) {
    const id = typeof item?.id === 'string' && /^[\w-]+$/.test(item.id) ? item.id : null;
    const video = fileName(item?.video);
    const poster = fileName(item?.poster);
    if (!id || !video || !poster || !TYPES.has(item.type) || seen.has(id)) continue;
    seen.add(id);
    out.push({
      key: `remote:${id}`,
      id,
      type: item.type,
      costume: typeof item.costume === 'string' && item.costume ? item.costume : null,
      song: typeof item.song === 'string' && item.song ? item.song : null,
      category: typeof item.category === 'string' && item.category ? item.category : null,
      loop: item.loop !== false,
      remote: true,
      mp4: `${base}${video}`,
      poster: `${base}${poster}`,
    });
  }
  return out;
}

let catalogPromise = null;
/** Catalogue des animations à la demande. Injoignable ou invalide : liste vide, jamais d'erreur. */
export function loadMascotCatalog(fetchImpl = typeof fetch === 'function' ? fetch : null) {
  if (!catalogPromise) {
    catalogPromise = (fetchImpl
      ? fetchImpl(`${mascotBaseUrl()}catalog.json`, { cache: 'no-cache' }).then((response) => (response.ok ? response.json() : []))
      : Promise.resolve([])
    ).then((raw) => normalizeCatalog(raw), () => []);
  }
  return catalogPromise;
}
export function resetMascotCatalogForTests() { catalogPromise = null; }

/** Le costume de la chanson : la colonne `mascot_costume` l'emporte, sinon le catalogue nomme la chanson. */
export function findCostumeClip(catalog, song) {
  if (!song || !Array.isArray(catalog)) return null;
  const costumes = catalog.filter((entry) => entry.costume);
  if (song.mascot_costume) {
    const byColumn = costumes.find((entry) => entry.costume === song.mascot_costume);
    if (byColumn) return byColumn;
  }
  return (song.slug && costumes.find((entry) => entry.song === song.slug)) || null;
}

/** Danses à la demande (sans costume) : elles rejoignent le tirage des danses de base. */
export function remoteDances(catalog) {
  return (catalog || []).filter((entry) => entry.type === 'dance' && !entry.costume);
}

/** Économie de données demandée par l'appareil : on n'y télécharge aucune vidéo. */
export function isDataSaver() {
  const connection = typeof navigator !== 'undefined' ? navigator.connection : null;
  return Boolean(connection && (connection.saveData || /(^|-)2g$/.test(connection.effectiveType || '')));
}

const objectUrls = new Map();
/**
 * Adresse lisible de la vidéo : depuis le cache de l'appareil si elle y est, sinon
 * téléchargée, rangée, puis lue. Si le cache n'est pas disponible (navigation privée,
 * ancien navigateur), l'adresse du site est rendue telle quelle.
 */
export function getClipUrl(entry) {
  if (!entry?.mp4) return Promise.resolve(null);
  if (!objectUrls.has(entry.mp4)) {
    const load = (async () => {
      if (typeof caches === 'undefined' || typeof fetch !== 'function' || typeof URL?.createObjectURL !== 'function') return entry.mp4;
      const cache = await caches.open(CACHE_NAME);
      let response = await cache.match(entry.mp4);
      if (!response) {
        const fetched = await fetch(entry.mp4, { mode: 'cors' });
        if (!fetched.ok) throw new Error(`mascot ${fetched.status}`);
        await cache.put(entry.mp4, fetched.clone());
        response = fetched;
      }
      return URL.createObjectURL(await response.blob());
    })().catch(() => entry.mp4);
    objectUrls.set(entry.mp4, load);
  }
  return objectUrls.get(entry.mp4);
}
