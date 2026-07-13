/**
 * adminSongLinks — validation, normalisation et persistance des 4 liens plateforme.
 * Réutilise les colonnes existantes de `songs` (aucune migration).
 *
 *   Spotify        → spotify_url
 *   Apple Music    → apple_music_url
 *   YouTube Music  → youtube_url          (lien music.youtube.com distribué)
 *   YouTube vídeo  → youtube_music_url    (vidéo/Short public)
 */
import { supabase } from '@/lib/supabase';

export const LINK_PLATFORMS = [
  { key: 'spotifyUrl',      column: 'spotify_url',       label: 'Spotify',       hosts: ['open.spotify.com', 'spotify.link'] },
  { key: 'appleMusicUrl',   column: 'apple_music_url',   label: 'Apple Music',   hosts: ['music.apple.com'] },
  { key: 'youtubeMusicUrl', column: 'youtube_url',       label: 'YouTube Music', hosts: ['music.youtube.com'] },
  { key: 'youtubeVideoUrl', column: 'youtube_music_url', label: 'YouTube vídeo', hosts: ['youtube.com', 'www.youtube.com', 'youtu.be', 'm.youtube.com'] },
];

const BY_KEY = Object.fromEntries(LINK_PLATFORMS.map((p) => [p.key, p]));

// Map a raw song row → normalized links view (frontend adapter).
export function toSongLinks(song) {
  return {
    spotifyUrl: song.spotify_url || null,
    appleMusicUrl: song.apple_music_url || null,
    youtubeMusicUrl: song.youtube_url || null,
    youtubeVideoUrl: song.youtube_music_url || null,
  };
}

export function isValidHttpUrl(value) {
  if (!value || typeof value !== 'string') return false;
  try {
    const u = new URL(value.trim());
    return u.protocol === 'http:' || u.protocol === 'https:';
  } catch { return false; }
}

// 'empty' | 'valid' | 'invalid' | 'foreign' (valid URL but not an expected host)
export function linkState(key, value) {
  if (!value || !value.trim()) return 'empty';
  if (!isValidHttpUrl(value)) return 'invalid';
  const platform = BY_KEY[key];
  try {
    const host = new URL(value.trim()).hostname.toLowerCase();
    const ok = platform.hosts.some((h) => host === h || host.endsWith(`.${h}`));
    return ok ? 'valid' : 'foreign';
  } catch { return 'invalid'; }
}

// Light normalization: trim only. We deliberately keep query params (video id,
// playlist) intact — never strip meaningful parameters.
export function normalizeUrl(value) {
  return typeof value === 'string' ? value.trim() : value;
}

export function linksComplete(links) {
  return LINK_PLATFORMS.every((p) => Boolean(links[p.key]));
}
export function missingCount(links) {
  return LINK_PLATFORMS.reduce((n, p) => n + (links[p.key] ? 0 : 1), 0);
}

/**
 * Persist only the changed link columns for a song.
 * @param patch object keyed by view-model keys (spotifyUrl, appleMusicUrl, ...);
 *   value '' or null clears the column, undefined leaves it untouched.
 * @returns { data } updated row
 */
export async function saveSongLinks(songId, patch) {
  const update = {};
  for (const p of LINK_PLATFORMS) {
    if (!(p.key in patch)) continue;
    const raw = patch[p.key];
    update[p.column] = raw == null || raw === '' ? null : normalizeUrl(raw);
  }
  if (Object.keys(update).length === 0) return { data: null, unchanged: true };

  const { data, error } = await supabase.from('songs').update(update).eq('id', songId).select().single();
  if (error) throw error;
  return { data };
}

// CSV export of missing/existing links for the given rows.
export function linksToCsv(rows) {
  const header = ['Song ID', 'Song title', 'Spotify URL', 'Apple Music URL', 'YouTube Music URL', 'YouTube video URL'];
  const esc = (v) => {
    const s = v == null ? '' : String(v);
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const lines = [header.join(',')];
  for (const r of rows) {
    const l = toSongLinks(r);
    lines.push([r.id, r.title, l.spotifyUrl, l.appleMusicUrl, l.youtubeMusicUrl, l.youtubeVideoUrl].map(esc).join(','));
  }
  return lines.join('\n');
}
