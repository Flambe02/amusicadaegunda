/**
 * Helpers purs pour le catalogue Karaokê (page publique /karaoke).
 *
 * Aucune dépendance React ici → 100% testable en isolation.
 * Utilisés par `useKaraokeCatalog` et les composants de `components/karaoke/catalog`.
 */
import { getYouTubeThumbnailUrl } from '@/lib/utils';
import { BRAND_SQUARE_MEDIUM } from '@/lib/imageAssets';

export const CATEGORY_LABELS = {
  internacional: 'Internacional', midia: 'Mídia', energia: 'Energia', esporte: 'Esporte',
  cultura: 'Cultura', outros: 'Outros', saude: 'Saúde', policia: 'Polícia',
  politica: 'Política', seguranca: 'Segurança', tecnologia: 'Tecnologia',
  gastronomia: 'Gastronomia', economia: 'Economia',
};

// Ordre d'affichage préféré des chips de thème (les autres sont ajoutés après,
// dans l'ordre d'apparition). Reflète la référence visuelle du redesign.
const PREFERRED_THEME_ORDER = ['politica', 'esporte', 'internacional', 'outros'];

const MONTH_NAMES_PT = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro',
];

/** Normalise un texte pour une recherche insensible à la casse ET aux accents. */
export function normalizeText(value) {
  return String(value || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .trim();
}

/** Libellé lisible d'une catégorie/thème. */
export function themeLabel(category) {
  if (!category) return '';
  return CATEGORY_LABELS[category] || category;
}

/** Parse une date ISO (ou `YYYY-MM-DD`) en Date locale midi, ou null. */
export function parseDate(value) {
  if (!value) return null;
  const str = /^\d{4}-\d{2}-\d{2}$/.test(value) ? `${value}T12:00:00` : value;
  const d = new Date(str);
  return Number.isNaN(d.getTime()) ? null : d;
}

/** Timestamp de publication (ms), 0 si inconnu — utile pour trier de façon stable. */
export function publishedTimestamp(song) {
  const d = parseDate(song?.release_date);
  return d ? d.getTime() : 0;
}

/** Date courte « 12 de jul. de 2026 » façon pt-BR (badge de carte). */
export function formatShortDate(value) {
  const d = parseDate(value);
  if (!d) return '';
  return d.toLocaleDateString('pt-BR', { day: 'numeric', month: 'short', year: 'numeric' });
}

/** Clé de mois « YYYY-MM » stable pour regrouper/filtrer, ou null. */
export function monthKey(song) {
  const d = parseDate(song?.release_date);
  if (!d) return null;
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

/** Libellé d'un mois « Julho 2026 » à partir d'une clé « YYYY-MM ». */
export function monthKeyLabel(key) {
  if (!key) return '';
  const [year, month] = key.split('-');
  const idx = Number(month) - 1;
  const name = MONTH_NAMES_PT[idx] || '';
  return name ? `${name} ${year}` : year;
}

/**
 * Résout la cover d'une chanson pour la carte : cover_image dédiée > thumbnail
 * YouTube (youtube_url puis youtube_music_url) > fallback marque.
 * Les vraies covers ne sont jamais générées en code.
 */
export function getSongCover(song) {
  return (
    song?.cover_image ||
    song?.cover_image_url ||
    song?.image_url ||
    getYouTubeThumbnailUrl(song?.youtube_url, 'hqdefault') ||
    getYouTubeThumbnailUrl(song?.youtube_music_url, 'hqdefault') ||
    BRAND_SQUARE_MEDIUM
  );
}

/** Résumé court (subtitle sinon description tronquée), ~2 lignes. */
export function shortSummary(song, max = 130) {
  const raw = String(song?.subtitle || song?.description || '').replace(/\s+/g, ' ').trim();
  if (raw.length <= max) return raw;
  return `${raw.slice(0, max - 1).trimEnd()}…`;
}

/** Texte pré-normalisé sur lequel porte la recherche (titre, thème, mois, tags…). */
export function buildSearchIndex(song) {
  const key = monthKey(song);
  const parts = [
    song?.title,
    song?.subtitle,
    song?.description,
    song?.artist,
    themeLabel(song?.category),
    song?.category,
    key ? monthKeyLabel(key) : '',
    key ? key.split('-')[0] : '', // année seule
    ...(Array.isArray(song?.hashtags) ? song.hashtags : []),
  ];
  return normalizeText(parts.filter(Boolean).join(' '));
}

/**
 * Liste ordonnée des thèmes présents dans le catalogue, sous forme
 * `{ value, label }`, précédée de « Todos ». `value === null` = pas de filtre.
 */
export function deriveThemes(songs) {
  const present = new Set();
  for (const s of songs) {
    if (s?.category) present.add(s.category);
  }
  const ordered = [];
  for (const value of PREFERRED_THEME_ORDER) {
    if (present.has(value)) { ordered.push(value); present.delete(value); }
  }
  for (const value of present) ordered.push(value);
  return [
    { value: null, label: 'Todos' },
    ...ordered.map((value) => ({ value, label: themeLabel(value) })),
  ];
}

/**
 * Liste ordonnée (récent → ancien) des mois présents, `{ value, label }`,
 * précédée de « Todos » (`value === null`).
 */
export function deriveMonths(songs) {
  const keys = new Set();
  for (const s of songs) {
    const key = monthKey(s);
    if (key) keys.add(key);
  }
  const ordered = [...keys].sort().reverse();
  return [
    { value: null, label: 'Todos' },
    ...ordered.map((value) => ({ value, label: monthKeyLabel(value) })),
  ];
}

export const SORT_OPTIONS = [
  { value: 'newest', label: 'Mais recentes' },
  { value: 'oldest', label: 'Mais antigas' },
  { value: 'az', label: 'A-Z' },
];

/**
 * Applique recherche + thème + mois puis tri. Fonction pure : mêmes entrées →
 * même sortie, sans muter `songs`.
 */
export function filterAndSortSongs(songs, { query = '', theme = null, month = null, sort = 'newest' } = {}) {
  const q = normalizeText(query);
  let out = songs.filter((song) => {
    if (theme && song.category !== theme) return false;
    if (month && monthKey(song) !== month) return false;
    if (q && !(song.__searchIndex ?? buildSearchIndex(song)).includes(q)) return false;
    return true;
  });

  out = [...out];
  if (sort === 'az') {
    out.sort((a, b) => String(a.title || '').localeCompare(String(b.title || ''), 'pt-BR'));
  } else {
    const factor = sort === 'oldest' ? 1 : -1;
    out.sort((a, b) => (publishedTimestamp(a) - publishedTimestamp(b)) * factor);
  }
  return out;
}

/**
 * Regroupe des chansons (déjà triées) par mois pour l'affichage desktop.
 * Renvoie `[{ key, label, songs }]` dans l'ordre reçu (pas de groupe vide).
 */
export function groupByMonth(songs) {
  const groups = [];
  const index = new Map();
  for (const song of songs) {
    const key = monthKey(song) || 'sem-data';
    if (!index.has(key)) {
      const group = { key, label: key === 'sem-data' ? 'Sem data' : monthKeyLabel(key), songs: [] };
      index.set(key, group);
      groups.push(group);
    }
    index.get(key).songs.push(song);
  }
  return groups;
}

/**
 * Choisit un index aléatoire dans `[0, length)` en évitant si possible les IDs
 * récents et l'ID courant. Prend un `rng` injectable (tests déterministes).
 */
export function pickRandomSong(songs, { recentIds = [], rng = Math.random } = {}) {
  if (!songs || songs.length === 0) return null;
  if (songs.length === 1) return songs[0];

  const recent = new Set(recentIds.map(String));
  let pool = songs.filter((s) => !recent.has(String(s.id)));
  // Si tout est « récent », on autorise tout sauf le tout dernier tiré.
  if (pool.length === 0) {
    const lastId = recentIds.length ? String(recentIds[recentIds.length - 1]) : null;
    pool = songs.filter((s) => String(s.id) !== lastId);
    if (pool.length === 0) pool = songs;
  }
  return pool[Math.floor(rng() * pool.length)] || pool[0];
}
