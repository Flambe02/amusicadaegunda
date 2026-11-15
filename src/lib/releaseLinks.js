/**
 * « Buscar links » — retrouve les liens de plateforme d'une chanson à partir de son titre
 * et de sa date de sortie.
 *
 * - Apple Music : API iTunes publique, appelée directement (CORS ouvert, sans clé).
 * - Short YouTube, Spotify, YouTube Music : Edge Function `release-links`, qui liste
 *   les dernières sorties (Spotify et YouTube Music seulement si leurs clés sont configurées).
 *
 * Rien n'est enregistré ici : le formulaire remplit ses champs, l'utilisateur vérifie et
 * clique sur Salvar. Colonnes (noms trompeurs, voir MEMORY) :
 *   youtube_music_url = Short YouTube · youtube_url = YouTube Music.
 */
import { supabase } from './supabase';

const APPLE_ARTIST_ID = '1867784335';
const FUNCTION_URL = `${import.meta.env?.VITE_SUPABASE_URL || ''}/functions/v1/release-links`;
const TIMEOUT_MS = 15000;
const MIN_SCORE = 0.8;

/** Titre comparable : sans accents, hashtags, emojis, ponctuation ni « | suite ». */
export function normalizeTitle(text) {
  if (typeof text !== 'string') return '';
  return text
    .split('|')[0]
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/#[\p{L}\p{N}_]+/gu, ' ')
    .replace(/[^\p{L}\p{N}]+/gu, ' ')
    .trim()
    .replace(/\s+/g, ' ');
}

/** Ressemblance entre le titre de la chanson et celui d'une sortie (0 à 1). */
export function titleScore(songTitle, candidateTitle) {
  const a = normalizeTitle(songTitle);
  const b = normalizeTitle(candidateTitle);
  if (!a || !b) return 0;
  if (a === b) return 1;
  if (b.startsWith(`${a} `)) return 0.9;
  if (` ${b} `.includes(` ${a} `)) return 0.85;
  const ta = new Set(a.split(' '));
  const tb = new Set(b.split(' '));
  const common = [...ta].filter((t) => tb.has(t)).length;
  return common / Math.max(ta.size, tb.size);
}

function daysBetween(a, b) {
  const da = Date.parse(a);
  const db = Date.parse(b);
  if (!Number.isFinite(da) || !Number.isFinite(db)) return null;
  return Math.abs(da - db) / 86400000;
}

/**
 * Meilleure sortie pour une chanson : titre ressemblant (≥ 0,8), puis la plus proche
 * de la date de sortie (un même titre peut revenir d'une année sur l'autre).
 * @param {{title:string,url:string,date?:string|null}[]} items
 * @param {{title:string, release_date?:string|null}} song
 */
export function pickBestMatch(items, song) {
  if (!Array.isArray(items)) return null;
  let best = null;
  let bestRank = -Infinity;
  for (const item of items) {
    if (!item?.url) continue;
    const score = titleScore(song?.title, item.title);
    if (score < MIN_SCORE) continue;
    const days = daysBetween(item.date, song?.release_date);
    if (days != null && days > 60) continue;
    const rank = score - (days ?? 30) / 1000;
    if (rank > bestRank) { best = item; bestRank = rank; }
  }
  return best;
}

/** Lien Apple Music d'une piste, au format déjà utilisé sur le site. */
export function appleSongUrl(track) {
  if (!track?.trackId) return null;
  const slug = String(track.trackViewUrl || '').match(/music\.apple\.com\/\w+\/album\/([^/]+)\//)?.[1];
  return slug ? `https://music.apple.com/br/song/${slug}/${track.trackId}` : (track.trackViewUrl || null);
}

async function withTimeout(promiseFactory) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    return await promiseFactory(controller.signal);
  } finally {
    clearTimeout(timer);
  }
}

async function fetchAppleItems() {
  const url = `https://itunes.apple.com/lookup?id=${APPLE_ARTIST_ID}&entity=song&sort=recent&limit=25&country=br`;
  const res = await withTimeout((signal) => fetch(url, { signal }));
  if (!res.ok) throw new Error(`itunes_${res.status}`);
  const data = await res.json();
  return (data?.results || [])
    .filter((r) => r.wrapperType === 'track')
    .map((r) => ({ title: r.trackName, url: appleSongUrl(r), date: r.releaseDate || null }));
}

async function fetchFunctionItems() {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.access_token) throw new Error('no_session');
  const res = await withTimeout((signal) => fetch(FUNCTION_URL, {
    method: 'POST',
    signal,
    headers: {
      Authorization: `Bearer ${session.access_token}`,
      apikey: import.meta.env?.VITE_SUPABASE_ANON_KEY || '',
      'Content-Type': 'application/json',
    },
    body: '{}',
  }));
  if (res.status === 404) throw new Error('function_not_deployed');
  if (!res.ok) throw new Error(`function_${res.status}`);
  return res.json();
}

/**
 * Cherche les quatre liens d'une chanson.
 * Chaque entrée : { status: 'found'|'not_found'|'not_configured'|'error', url?, title? }.
 * @param {{title:string, release_date?:string|null}} song
 */
export async function findReleaseLinks(song) {
  const [apple, remote] = await Promise.allSettled([fetchAppleItems(), fetchFunctionItems()]);

  const resolve = (outcome) => {
    if (outcome.status !== 'ok') return { status: outcome.status, error: outcome.error };
    const match = pickBestMatch(outcome.items, song);
    return match ? { status: 'found', url: match.url, title: match.title } : { status: 'not_found' };
  };
  const fromRemote = (key) => {
    if (remote.status !== 'fulfilled') return { status: 'error', error: remote.reason?.message };
    const part = remote.value?.[key];
    return part ? { status: part.status, items: part.items } : { status: 'error' };
  };

  return {
    apple_music_url: resolve(apple.status === 'fulfilled'
      ? { status: 'ok', items: apple.value }
      : { status: 'error', error: apple.reason?.message }),
    youtube_music_url: resolve(fromRemote('shorts')),
    spotify_url: resolve(fromRemote('spotify')),
    youtube_url: resolve(fromRemote('youtubeMusic')),
  };
}
