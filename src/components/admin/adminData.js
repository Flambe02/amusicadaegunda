// Shared admin data helpers — categories, Supabase write plumbing, grouping,
// and the normalized song view model used across the redesigned admin.
//
// This module intentionally holds the *logic* extracted from the old
// monolithic Admin.jsx so behaviour (schema fallback, RLS error messages,
// year/month grouping, auto-publish) is preserved verbatim.

import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { supabase } from '@/lib/supabase';

// ─── Categories ───────────────────────────────────────────────────────────────

export const DEFAULT_CATEGORIES = [
  { value: 'politica',      label: 'Política',       emoji: '🏛️', color: 'bg-blue-500/20 text-blue-300 border-blue-500/30' },
  { value: 'economia',      label: 'Economia',       emoji: '💰', color: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30' },
  { value: 'policia',       label: 'Polícia',        emoji: '👮', color: 'bg-red-500/20 text-red-300 border-red-500/30' },
  { value: 'midia',         label: 'Mídia',          emoji: '📺', color: 'bg-purple-500/20 text-purple-300 border-purple-500/30' },
  { value: 'internacional', label: 'Internacional',  emoji: '🌍', color: 'bg-indigo-500/20 text-indigo-300 border-indigo-500/30' },
  { value: 'energia',       label: 'Energia',        emoji: '⚡', color: 'bg-yellow-500/20 text-yellow-300 border-yellow-500/30' },
  { value: 'saude',         label: 'Saúde',          emoji: '🏥', color: 'bg-rose-500/20 text-rose-300 border-rose-500/30' },
  { value: 'esporte',       label: 'Esporte',        emoji: '⚽', color: 'bg-green-500/20 text-green-300 border-green-500/30' },
  { value: 'tecnologia',    label: 'Tecnologia',     emoji: '💻', color: 'bg-cyan-500/20 text-cyan-300 border-cyan-500/30' },
  { value: 'seguranca',     label: 'Segurança',      emoji: '🚔', color: 'bg-orange-500/20 text-orange-300 border-orange-500/30' },
  { value: 'cultura',       label: 'Cultura',        emoji: '🎭', color: 'bg-violet-500/20 text-violet-300 border-violet-500/30' },
  { value: 'gastronomia',   label: 'Gastronomia',    emoji: '🍽️', color: 'bg-amber-500/20 text-amber-300 border-amber-500/30' },
  { value: 'outros',        label: 'Outros',         emoji: '❓', color: 'bg-gray-500/20 text-gray-400 border-gray-500/30' },
];

const STORAGE_KEY = 'admin-categories-v1';

export function loadCategories() {
  try {
    const s = localStorage.getItem(STORAGE_KEY);
    if (s) return JSON.parse(s);
  } catch {
    /* ignore malformed localStorage */
  }
  return DEFAULT_CATEGORIES;
}

export function persistCategories(cats) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(cats));
}

export function findCategory(categories, value) {
  if (!value) return null;
  return (categories || DEFAULT_CATEGORIES).find((c) => c.value === value) || null;
}

// Human label for a category value, without the coloured pill styling.
export function categoryLabel(categories, value) {
  const cat = findCategory(categories, value);
  return cat ? cat.label : (value || null);
}

// ─── Grouping (year → month) ────────────────────────────────────────────────

// Items are expected pre-sorted by release date desc. `getDate` reads the
// release date from an item (defaults to raw song shape); this lets the same
// grouping work on both raw songs and normalized view models.
export function groupByYearMonth(items, getDate = (s) => s.release_date) {
  const groups = {};
  for (const song of items) {
    const releaseDate = getDate(song);
    if (!releaseDate) {
      groups['Sem data'] = groups['Sem data'] || {};
      groups['Sem data']['—'] = groups['Sem data']['—'] || [];
      groups['Sem data']['—'].push(song);
      continue;
    }
    const d = parseISO(releaseDate);
    const year = d.getFullYear().toString();
    const month = format(d, 'MMMM', { locale: ptBR });
    groups[year] = groups[year] || {};
    groups[year][month] = groups[year][month] || [];
    groups[year][month].push(song);
  }
  return Object.entries(groups)
    .sort(([a], [b]) => b.localeCompare(a))
    .map(([year, months]) => ({
      year,
      total: Object.values(months).reduce((n, items) => n + items.length, 0),
      months: Object.entries(months).map(([month, items]) => ({ month, items })),
    }));
}

// ─── Normalized song view model ─────────────────────────────────────────────

// Field-name reality (see project memory):
//   youtube_url        → the distributed *YouTube Music* link (music.youtube.com)
//   youtube_music_url  → the public YouTube *video* / Short (youtube.com/shorts)
// The drawer therefore maps them to "YouTube Music" and "YouTube vídeo".
export function toSongAdminView(song, categories) {
  const hasLyrics = Boolean(song.lyrics?.trim());
  const isSynced = Boolean(song.lrc_content) || Boolean(song.timing_data);
  return {
    id: song.id,
    title: song.title || 'Sem título',
    releaseDate: song.release_date || null,
    coverImage: song.cover_image || null,
    category: song.category || null,
    categoryLabel: categoryLabel(categories, song.category),
    status: song.status === 'published' ? 'published' : 'draft',
    publishAt: song.publish_at || null,
    slug: song.slug || null,
    hasLyrics,
    isSynced,
    karaokeState: !hasLyrics ? 'unconfigured' : isSynced ? 'active' : 'pending',
    platforms: {
      spotifyUrl: song.spotify_url || null,
      appleMusicUrl: song.apple_music_url || null,
      youtubeMusicUrl: song.youtube_url || null,
      youtubeVideoUrl: song.youtube_music_url || null,
    },
    raw: song,
  };
}

// Safe URL check for platform links — never open a malformed URL.
export function isValidHttpUrl(value) {
  if (!value || typeof value !== 'string') return false;
  try {
    const u = new URL(value.trim());
    return u.protocol === 'http:' || u.protocol === 'https:';
  } catch {
    return false;
  }
}

// Public song URL for "Ver no site".
export function publicSongUrl(view) {
  return view.slug ? `/musica/${view.slug}` : '/musica';
}

// ─── Formatting ──────────────────────────────────────────────────────────────

export function formatShortDate(dateStr) {
  if (!dateStr) return '—';
  try {
    return format(parseISO(dateStr), 'dd MMM yyyy', { locale: ptBR });
  } catch {
    return '—';
  }
}

export function formatDayMonth(dateStr) {
  if (!dateStr) return '—';
  try {
    return format(parseISO(dateStr), 'dd MMM', { locale: ptBR });
  } catch {
    return '—';
  }
}

// ─── Supabase write plumbing (preserved from the old admin) ──────────────────

function parseMissingColumn(error) {
  const message = error?.message || error?.details || '';
  const patterns = [
    /Could not find the '([^']+)' column of 'songs' in the schema cache/i,
    /column ['"]?([^'".\s]+)['"]? does not exist/i,
  ];
  for (const pattern of patterns) {
    const match = message.match(pattern);
    if (match?.[1]) return match[1];
  }
  return null;
}

// Translate raw Supabase/Postgres write errors into actionable messages.
export function describeWriteError(error) {
  if (!error) return null;
  const code = error.code;
  const msg = error.message || '';

  if (code === '42501' || /row-level security|permission denied/i.test(msg)) {
    return 'Direitos insuficientes ou sessão expirada. Reconecte-se (Sair e login) e tente de novo.';
  }
  if (code === 'PGRST116') {
    return 'Nenhuma linha registada (sessão expirada ou direitos RLS insuficientes). Reconecte-se e tente de novo.';
  }
  if (code === '23505' || /duplicate key/i.test(msg)) {
    const field = msg.match(/Key \(([^)]+)\)/)?.[1] || '';
    if (field.includes('slug')) return 'Já existe uma música com este título (slug duplicado). Altere o título.';
    if (field.includes('youtube')) return 'Este URL do YouTube já é usado por outra música.';
    return 'Uma restrição de unicidade impede o registo (título ou URL duplicado).';
  }
  return msg || null;
}

// Verify there's a live session before a write so we surface a clear message
// instead of a silent 0-row update when the access token has expired.
export async function ensureWritableSession() {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) {
    throw new Error('Sessão expirada. Reconecte-se para publicar (Sair e login).');
  }
  return session;
}

export function normalizeSongPayload(formData) {
  const payload = Object.fromEntries(
    Object.entries(formData).filter(([, value]) => value !== '' && !(Array.isArray(value) && value.length === 0))
  );
  if (payload.youtube_music_url && !payload.youtube_url) {
    payload.youtube_url = payload.youtube_music_url;
  }
  return payload;
}

// Insert (panel === 'new') or update, retrying while dropping columns that the
// live schema does not have (keeps the admin working against older schemas).
export async function persistSongWithSchemaFallback({ panel, payload }) {
  let nextPayload = { ...payload };
  const removedColumns = [];

  for (let attempt = 0; attempt < 8; attempt += 1) {
    const { data, error } = await (
      panel === 'new'
        ? supabase.from('songs').insert([nextPayload]).select().single()
        : supabase.from('songs').update(nextPayload).eq('id', panel.id).select().single()
    );

    if (!error) return { data, removedColumns };

    const missingColumn = parseMissingColumn(error);
    if (!missingColumn || !(missingColumn in nextPayload)) {
      const friendly = describeWriteError(error);
      if (friendly && friendly !== error.message) {
        const wrapped = new Error(friendly);
        wrapped.cause = error;
        throw wrapped;
      }
      throw error;
    }

    if (missingColumn === 'youtube_music_url' && !nextPayload.youtube_url && payload.youtube_music_url) {
      nextPayload.youtube_url = payload.youtube_music_url;
    }

    delete nextPayload[missingColumn];
    removedColumns.push(missingColumn);
  }

  throw new Error('Impossível guardar a música: demasiadas colunas em falta na tabela songs.');
}
