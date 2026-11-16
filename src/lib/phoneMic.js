/**
 * Le téléphone comme microfone du karaokê grand écran (K3, 2026-11-16).
 *
 * Les TV n'ont presque jamais de micro : un téléphone ouvre /festa?mic=CODE (QR affiché
 * par la TV), mesure le niveau de la voix LOCALEMENT et n'envoie que des nombres (jamais
 * l'audio) sur un canal Realtime « broadcast » `mic:CODE` — ni table, ni RLS, rien de
 * stocké. La TV rejoue ces niveaux dans le même détecteur de voix que le micro local.
 *
 * Débit : le client Realtime limite à ~10 messages/s → le téléphone regroupe ses mesures
 * en paquets (toutes les PACKET_MS, BUCKETS_PER_PACKET niveaux de BUCKET_MS chacun) ; la
 * TV étale chaque paquet sur la durée qu'il représente. Le retard total (paquet + réseau)
 * est compensé dans le score par PHONE_LATENCY_SEC.
 */
import { supabase } from './supabase';

export const BUCKET_MS = 30;
export const BUCKETS_PER_PACKET = 4;
export const PACKET_MS = BUCKET_MS * BUCKETS_PER_PACKET; // 120 ms → ~8 messages/s
export const PHONE_LATENCY_SEC = 0.25;
// Plus rien reçu depuis… → le niveau retombe à 0 / le téléphone est considéré parti.
const SILENT_AFTER_MS = 600;
export const CONNECTED_WITHIN_MS = 4000;
const LEVEL_SCALE = 10000;

// Sans 0/O, 1/I/L : un code lisible à voix haute et sur une TV.
const ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';

export function generateMicCode(length = 5, random = defaultRandom) {
  let out = '';
  for (let i = 0; i < length; i += 1) out += ALPHABET[Math.floor(random() * ALPHABET.length) % ALPHABET.length];
  return out;
}

function defaultRandom() {
  try {
    const a = new Uint32Array(1);
    globalThis.crypto.getRandomValues(a);
    return a[0] / 2 ** 32;
  } catch {
    return Math.random();
  }
}

export function normalizeMicCode(code) {
  const clean = String(code || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
  return clean.length >= 4 && clean.length <= 8 ? clean : null;
}

/** Lien ouvert par le QR : la page /festa du site, en mode microfone. */
export function phoneMicUrl(code, origin = globalThis.location?.origin || 'https://www.amusicadasegunda.com') {
  // L'app Android (Capacitor) sert depuis https://localhost (sans port) : le téléphone
  // doit ouvrir le site public. localhost AVEC port = aperçu de développement.
  const base = /^https?:\/\/(localhost|127\.0\.0\.1):\d+$/.test(origin) || /^https:\/\/[^/]*amusicadasegunda\.com$/.test(origin)
    ? origin
    : 'https://www.amusicadasegunda.com';
  return `${base}/festa?mic=${encodeURIComponent(code)}`;
}

/** Hauteurs (MIDI ou null) → entiers (dixièmes de demi-ton, 0 = pas de note). */
export function packPitches(midis) {
  return midis.map((m) => (Number.isFinite(m) && m > 0 ? Math.round(m * 10) : 0));
}

export function unpackPitches(ints) {
  return Array.isArray(ints) ? ints.slice(0, 16).map((n) => (Number(n) > 0 ? Number(n) / 10 : null)) : [];
}

/** Niveaux RMS (0..1) → entiers compacts pour le message. */
export function packLevels(levels) {
  return levels.map((v) => Math.max(0, Math.min(LEVEL_SCALE, Math.round((Number(v) || 0) * LEVEL_SCALE))));
}

export function unpackLevels(ints) {
  return Array.isArray(ints) ? ints.slice(0, 16).map((n) => Math.max(0, Number(n) || 0) / LEVEL_SCALE) : [];
}

/**
 * Côté téléphone : regroupe les mesures (une par image) en seaux de BUCKET_MS (le
 * maximum du seau : une syllabe brève compte) et rend un paquet quand il est plein.
 */
export function createLevelPacker() {
  let bucketStart = null; let bucketMax = 0; let bucketMidi = null; let buckets = []; let midis = [];
  return {
    /** `midi` : hauteur de la voix à cet instant (ou null) — gardée avec le niveau le plus fort. */
    push(rms, now, midi = null) {
      if (bucketStart == null) bucketStart = now;
      const level = Number(rms) || 0;
      if (level >= bucketMax) { bucketMax = level; if (midi != null) bucketMidi = midi; }
      if (bucketMidi == null && midi != null) bucketMidi = midi;
      if (now - bucketStart < BUCKET_MS) return null;
      buckets.push(bucketMax); midis.push(bucketMidi);
      bucketStart = now; bucketMax = 0; bucketMidi = null;
      if (buckets.length < BUCKETS_PER_PACKET) return null;
      const packet = buckets; packet.midis = midis;
      buckets = []; midis = [];
      return packet;
    },
  };
}

/**
 * Côté TV : rejoue les paquets reçus, chaque niveau à sa place dans le temps.
 * `valueAt(now)` → niveau courant (0 si le téléphone se tait depuis SILENT_AFTER_MS).
 */
export function createLevelPlayback() {
  let queue = []; // [{ at, rms, midi }]
  let lastReceived = -Infinity;
  let current = 0; let currentMidi = null;
  return {
    receive(levels, now, midis = []) {
      lastReceived = now;
      // Un paquet en retard ne doit pas s'empiler derrière l'ancien : on repart de maintenant.
      queue = queue.filter((s) => s.at <= now + PACKET_MS);
      const start = Math.max(now, queue.length ? queue[queue.length - 1].at + BUCKET_MS : now);
      levels.forEach((rms, i) => queue.push({ at: start + i * BUCKET_MS, rms, midi: midis[i] ?? null }));
    },
    valueAt(now) {
      if (now - lastReceived > SILENT_AFTER_MS) { queue = []; current = 0; currentMidi = null; return 0; }
      while (queue.length && queue[0].at <= now) { const s = queue.shift(); current = s.rms; currentMidi = s.midi; }
      return current;
    },
    /** Hauteur du dernier niveau rejoué (après `valueAt`). */
    get midi() { return currentMidi; },
    get lastReceived() { return lastReceived; },
  };
}

/**
 * Canal `mic:CODE`. Le téléphone émet `lv` (niveaux) et `hi` (je suis là) ; la TV émet
 * `tv` (j'écoute) pour que le téléphone affiche « Conectado à TV ».
 * Retourne `{ send(event, payload), unsubscribe() }`.
 */
export function joinMicChannel(code, { onLevels, onHello, onTv, onStatus } = {}) {
  const channel = supabase.channel(`mic:${code}`, { config: { broadcast: { self: false, ack: false } } });
  let ready = false;
  if (onLevels) channel.on('broadcast', { event: 'lv' }, ({ payload }) => onLevels(unpackLevels(payload?.l), unpackPitches(payload?.p)));
  if (onHello) channel.on('broadcast', { event: 'hi' }, ({ payload }) => onHello(payload || {}));
  if (onTv) channel.on('broadcast', { event: 'tv' }, ({ payload }) => onTv(payload || {}));
  channel.subscribe((status) => {
    ready = status === 'SUBSCRIBED';
    onStatus?.(status);
  });
  return {
    send(event, payload) {
      if (!ready) return;
      try { channel.send({ type: 'broadcast', event, payload }); } catch { /* réseau : le prochain paquet passera */ }
    },
    unsubscribe() { try { supabase.removeChannel(channel); } catch { /* ignore */ } },
  };
}

/**
 * Côté TV : écoute le téléphone et tient à jour `rmsRef.current` (et `pitchRef.current`,
 * la hauteur, pour la piste des notes) ; `onConnectedChange` pour l'affichage. Émet `tv`
 * toutes les 2 s.
 */
export function listenPhoneMic(code, rmsRef, { onConnectedChange, pitchRef } = {}) {
  const playback = createLevelPlayback();
  let lastHello = -Infinity; let connected = false; let raf = null; let stopped = false;
  const ch = joinMicChannel(code, {
    onLevels: (levels, midis) => playback.receive(levels, performance.now(), midis),
    onHello: () => { lastHello = performance.now(); },
  });
  const tick = () => {
    if (stopped) return;
    const now = performance.now();
    if (rmsRef) rmsRef.current = playback.valueAt(now);
    else playback.valueAt(now);
    if (pitchRef) pitchRef.current = playback.midi;
    const isOn = now - Math.max(lastHello, playback.lastReceived) < CONNECTED_WITHIN_MS;
    if (isOn !== connected) { connected = isOn; onConnectedChange?.(isOn); }
    raf = requestAnimationFrame(tick);
  };
  raf = requestAnimationFrame(tick);
  const beat = setInterval(() => ch.send('tv', { at: Date.now() }), 2000);
  ch.send('tv', { at: Date.now() });
  return () => {
    stopped = true;
    if (raf) cancelAnimationFrame(raf);
    clearInterval(beat);
    if (rmsRef) rmsRef.current = 0;
    if (pitchRef) pitchRef.current = null;
    ch.unsubscribe();
  };
}
