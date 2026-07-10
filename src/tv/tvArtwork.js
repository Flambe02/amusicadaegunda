import { useEffect, useState } from 'react';
import { BRAND_SQUARE_LARGE } from '@/lib/imageAssets';

/**
 * Manifeste d'affiches TV (16:9) générées par scripts/generate-tv-artwork.mjs à
 * partir des miniatures verticales (9:16) réelles des clips. Chargé une seule
 * fois (promesse mémoïsée) et ne bloque JAMAIS l'app : absent, invalide ou
 * chanson non listée → les helpers retombent sur `getThumb`/`cover_image`/marque.
 */
const MANIFEST_URL = '/tv-artwork/manifest.json';

let manifestCache = null;
let manifestPromise = null;

function fetchManifest() {
  if (!manifestPromise) {
    manifestPromise = fetch(MANIFEST_URL, { cache: 'no-store' })
      .then((res) => (res.ok ? res.json() : {}))
      .catch(() => ({}))
      .then((data) => {
        manifestCache = (data && typeof data === 'object') ? data : {};
        return manifestCache;
      });
  }
  return manifestPromise;
}

/** Hook : renvoie le manifeste (objet) une fois chargé, `null` tant qu'il ne l'est pas. */
export function useTvArtworkManifest() {
  const [manifest, setManifest] = useState(manifestCache);
  useEffect(() => {
    if (manifestCache) { setManifest(manifestCache); return undefined; }
    let alive = true;
    fetchManifest().then((m) => { if (alive) setManifest(m); });
    return () => { alive = false; };
  }, []);
  return manifest;
}

function entryFor(song, manifest) {
  if (!song?.slug || !manifest) return null;
  return manifest[song.slug] || null;
}

/**
 * Affiche HERO (1920x1080) pour une chanson.
 * Ordre : hero custom/generated (manifest) → card (manifest) → fallback fourni par l'appelant.
 */
export function getTvHeroArtwork(song, manifest, fallback = null) {
  const entry = entryFor(song, manifest);
  return entry?.hero || entry?.card || fallback || BRAND_SQUARE_LARGE;
}

/**
 * Affiche CARD (640x360) pour une chanson.
 * Ordre : card (manifest) → hero (manifest) → fallback fourni par l'appelant.
 */
export function getTvCardArtwork(song, manifest, fallback = null) {
  const entry = entryFor(song, manifest);
  return entry?.card || entry?.hero || fallback || BRAND_SQUARE_LARGE;
}
