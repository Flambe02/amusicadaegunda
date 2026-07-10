import { extractYouTubeId } from '@/lib/utils';
import { MONTHS_PT } from '../tvMonths';

// Même vocabulaire que TvApp.jsx (CATEGORY_LABELS) — dupliqué ici pour garder ce
// module indépendant de React (pas d'import d'un fichier écran). Toute nouvelle
// catégorie Supabase absente de cette table retombe sur une capitalisation simple.
const CATEGORY_LABELS = {
  internacional: 'Internacional', midia: 'Mídia', energia: 'Energia', esporte: 'Esporte',
  cultura: 'Cultura', outros: 'Outros', saude: 'Saúde', policia: 'Polícia',
  politica: 'Política', seguranca: 'Segurança', tecnologia: 'Tecnologia',
  gastronomia: 'Gastronomia', economia: 'Economia',
};

const FALLBACK_THEME = { key: 'outros', label: 'Outros' };

/** Chanson avec un clip visuel jouable — même définition que hasPlayableVideo
 * (TvApp.jsx/TvHome.jsx) : youtube_music_url (Short) OU youtube_url (YouTube
 * Music) doit contenir un ID YouTube extractible. Ne PAS diverger de cette
 * définition ailleurs dans l'app — c'est la même source de vérité pour « Clipes ». */
export function hasValidClip(song) {
  return Boolean(extractYouTubeId(song?.youtube_music_url) || extractYouTubeId(song?.youtube_url));
}

export function getSongReleaseDate(song) {
  if (!song?.release_date) return null;
  const d = new Date(song.release_date);
  return Number.isNaN(d.getTime()) ? null : d;
}

export function getSongMonth(song) {
  const d = getSongReleaseDate(song);
  return d ? d.getMonth() : null;
}

export function getSongYear(song) {
  const d = getSongReleaseDate(song);
  return d ? d.getFullYear() : null;
}

/** Thème normalisé (clé stable minuscule + libellé lisible). Catégorie absente
 * ou vide → thème « Outros » (groupe de repli, toujours placé en dernier). */
export function getSongTheme(song) {
  const raw = (song?.category || '').toString().trim().toLowerCase();
  if (!raw) return FALLBACK_THEME;
  const label = CATEGORY_LABELS[raw] || (raw.charAt(0).toUpperCase() + raw.slice(1));
  return { key: raw, label };
}

export function getSongKey(song) {
  return song?.id ?? song?.slug ?? song?.title ?? null;
}

function sortNewestFirst(songs) {
  return [...songs].sort((a, b) => {
    const da = getSongReleaseDate(a);
    const db = getSongReleaseDate(b);
    if (da && db) return db.getTime() - da.getTime();
    if (da) return -1;
    if (db) return 1;
    return 0;
  });
}

/** Rangées « Mês » — groupées par année+mois, triées de la plus récente à la
 * plus ancienne. Chansons sans date valide → groupe « Sem data », en dernier. */
export function groupClipsByMonth(songs) {
  const buckets = new Map();
  songs.forEach((song) => {
    const year = getSongYear(song);
    const month = getSongMonth(song);
    const key = (year != null && month != null) ? `${year}-${month}` : 'sem-data';
    if (!buckets.has(key)) {
      buckets.set(key, {
        key,
        label: key === 'sem-data' ? 'Sem data' : `${MONTHS_PT[month]} ${year}`,
        year,
        month,
        songs: [],
      });
    }
    buckets.get(key).songs.push(song);
  });

  const groups = Array.from(buckets.values());
  groups.forEach((g) => { g.songs = sortNewestFirst(g.songs); });
  groups.sort((a, b) => {
    if (a.key === 'sem-data') return 1;
    if (b.key === 'sem-data') return -1;
    if (a.year !== b.year) return b.year - a.year;
    return b.month - a.month;
  });
  return groups;
}

/** Rangées « Ano » — groupées par année, triées de la plus récente à la plus
 * ancienne. Chansons sans année valide → groupe « Sem ano », en dernier. */
export function groupClipsByYear(songs) {
  const buckets = new Map();
  songs.forEach((song) => {
    const year = getSongYear(song);
    const key = year != null ? String(year) : 'sem-ano';
    if (!buckets.has(key)) {
      buckets.set(key, { key, label: year != null ? String(year) : 'Sem ano', year, songs: [] });
    }
    buckets.get(key).songs.push(song);
  });

  const groups = Array.from(buckets.values());
  groups.forEach((g) => { g.songs = sortNewestFirst(g.songs); });
  groups.sort((a, b) => {
    if (a.key === 'sem-ano') return 1;
    if (b.key === 'sem-ano') return -1;
    return b.year - a.year;
  });
  return groups;
}

/** Rangées « Tema » — groupées par catégorie normalisée, triées par activité la
 * plus récente (date du clip le plus récent du groupe) décroissante. « Outros »
 * (catégorie absente/inconnue) toujours en dernier, quelle que soit son activité. */
export function groupClipsByTheme(songs) {
  const buckets = new Map();
  songs.forEach((song) => {
    const theme = getSongTheme(song);
    if (!buckets.has(theme.key)) {
      buckets.set(theme.key, { key: theme.key, label: theme.label, songs: [], latest: null });
    }
    buckets.get(theme.key).songs.push(song);
  });

  const groups = Array.from(buckets.values());
  groups.forEach((g) => {
    g.songs = sortNewestFirst(g.songs);
    g.latest = getSongReleaseDate(g.songs[0]);
  });
  groups.sort((a, b) => {
    if (a.key === 'outros') return 1;
    if (b.key === 'outros') return -1;
    const at = a.latest ? a.latest.getTime() : -Infinity;
    const bt = b.latest ? b.latest.getTime() : -Infinity;
    return bt - at;
  });
  return groups;
}

/** Ensemble des IDs « NOVA » — les `count` clipes valides les plus récents,
 * toutes rangées confondues (même logique quel que soit le mode d'organisation). */
export function getNewClipIds(songs, count = 5) {
  const sorted = sortNewestFirst(songs.filter(hasValidClip));
  return new Set(sorted.slice(0, count).map(getSongKey));
}
