// Données d'affichage de la refonte grand écran (maquettes design/bigscreen/) : dates en
// portugais, contexte court, refrain, affiches verticales. Fonctions pures, sans React.
import { extractYouTubeId } from '@/lib/utils';
import { resolveLyricsText } from '@/lib/lrc';
import { BRAND_SQUARE_LARGE } from '@/lib/imageAssets';

const MONTHS = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'];
const MONTHS_SHORT = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];
const WEEKDAYS = ['domingo', 'segunda', 'terça', 'quarta', 'quinta', 'sexta', 'sábado'];

/** Date de sortie (AAAA-MM-JJ…) lue comme une date civile, sans décalage de fuseau. */
function parseDay(value) {
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(value || ''));
  if (!match) return null;
  const [year, month, day] = [Number(match[1]), Number(match[2]), Number(match[3])];
  return { year, month, day, weekday: new Date(Date.UTC(year, month - 1, day)).getUTCDay() };
}

/** « 28 set » — sous une carte. */
export function formatShortDate(value) {
  const d = parseDay(value);
  return d ? `${d.day} ${MONTHS_SHORT[d.month - 1]}` : '';
}

/** « 21 de setembro de 2026 » — fiche (« Lançada em … »). */
export function formatLongDate(value) {
  const d = parseDay(value);
  return d ? `${d.day} de ${MONTHS[d.month - 1]} de ${d.year}` : '';
}

/** « segunda, 5 de outubro » — bloc de la música da semana (« Nova desde … »). */
export function formatWeekdayDate(value) {
  const d = parseDay(value);
  return d ? `${WEEKDAYS[d.weekday]}, ${d.day} de ${MONTHS[d.month - 1]}` : '';
}

const plain = (text) => String(text || '').replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();

/**
 * Contexte en deux lignes : `context_short` (colonne facultative, écrite dans l'admin)
 * s'il existe, sinon le début de la description. La coupe à deux lignes est faite par le
 * CSS (line-clamp) ; ici on ne garde que des phrases entières tant qu'elles tiennent.
 */
export function getShortContext(song, maxChars = 190) {
  const short = plain(song?.context_short);
  if (short) return short;
  const description = plain(song?.description);
  if (!description) return plain(song?.subtitle);
  const sentences = description.match(/[^.!?…]+[.!?…]+(?=\s|$)/g) || [description];
  let text = '';
  for (const sentence of sentences) {
    const next = `${text} ${sentence.trim()}`.trim();
    if (text && next.length > maxChars) break;
    text = next;
  }
  return text || description;
}

const SECTION_MARKER = /^\s*[[(]([^\])]{2,40})[\])]\s*$/;
const REFRAIN_MARKER = /^(chorus|refr[aã]o|coro)\b/i;

/**
 * Refrain d'une chanson, pour le bloc « O refrão » de la fiche.
 * - strophe balisée ([Chorus], [Refrão]…) ou strophe répétée à l'identique → `kind: 'refrain'` ;
 * - sinon les premières lignes de la letra → `kind: 'excerpt'` (titre « Trecho da letra » :
 *   on n'appelle pas refrain ce qui n'en est pas un) ;
 * - pas de letra → null.
 * @returns {{ kind: 'refrain'|'excerpt', lines: string[] }|null}
 */
export function getRefrain(song, maxLines = 3) {
  const text = resolveLyricsText(song).replace(/\r/g, '');
  if (!text.trim()) return null;
  const stanzas = text.split(/\n\s*\n/).map((block) => block.split('\n').map((line) => line.trim()).filter(Boolean)).filter((lines) => lines.length);
  // Lignes chantées, sans les balises de section ni les répétitions immédiates d'une ligne.
  const sung = (lines) => lines
    .filter((line) => !SECTION_MARKER.test(line))
    .filter((line, index, all) => index === 0 || line.toLowerCase() !== all[index - 1].toLowerCase());

  // 1. Strophe balisée.
  for (const lines of stanzas) {
    const marker = SECTION_MARKER.exec(lines[0]);
    if (marker && REFRAIN_MARKER.test(marker[1].trim()) && sung(lines).length) {
      return { kind: 'refrain', lines: sung(lines).slice(0, maxLines) };
    }
  }
  // 2. Strophe (au moins deux lignes) répétée à l'identique.
  const seen = new Map();
  for (const lines of stanzas) {
    const body = sung(lines);
    if (body.length < 2) continue;
    const key = body.join('\n').toLowerCase();
    if (seen.has(key)) return { kind: 'refrain', lines: body.slice(0, maxLines) };
    seen.set(key, true);
  }
  // 3. Premières lignes.
  const first = sung(stanzas.flat()).slice(0, maxLines);
  return first.length ? { kind: 'excerpt', lines: first } : null;
}

/** Id YouTube du clip (Short d'abord — colonne `youtube_music_url` —, sinon la vidéo). */
export function getClipId(song) {
  return extractYouTubeId(song?.youtube_music_url) || extractYouTubeId(song?.youtube_url) || null;
}

/**
 * Affiches candidates d'une chanson, dans l'ordre d'essai : la miniature VERTICALE du
 * Short (`oar2`, 9:16), sa miniature 4:3, celle de la vidéo, puis la marque.
 */
export function getPosterCandidates(song) {
  const shortId = extractYouTubeId(song?.youtube_music_url);
  const videoId = extractYouTubeId(song?.youtube_url);
  return [...new Set([
    shortId && `https://i.ytimg.com/vi/${shortId}/oar2.jpg`,
    shortId && `https://i.ytimg.com/vi/${shortId}/hqdefault.jpg`,
    videoId && `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`,
    song?.cover_image,
    BRAND_SQUARE_LARGE,
  ].filter(Boolean))];
}

/**
 * Image du FOND flouté : la plus petite miniature (120×90, ≈ 3 Ko), que le navigateur
 * étire sur tout le bloc. L'agrandissement donne le flou — sans `filter: blur()`, trop
 * coûteux sur une box peu puissante.
 */
export function getBackdropUrl(song) {
  const id = getClipId(song);
  return id ? `https://i.ytimg.com/vi/${id}/default.jpg` : null;
}

// Largeur moyenne d'un caractère d'Archivo Black, en fraction du corps (mesurée sur les
// titres du catalogue : « Bets Bets Bets » fait 820 px à 104 px).
const TITLE_CHAR_EM = 0.6;

/**
 * Corps du grand titre pour qu'il tienne dans `width` pixels : une ligne tant que le
 * corps reste lisible, sinon deux lignes. La hauteur du bloc titre ne change jamais
 * (`boxHeight`), donc rien ne bouge autour.
 * @returns {{ fontSize: number, lines: 1|2, lineHeight: number }}
 */
export function fitTitle(title, width, { max = 104, boxHeight = 104, minOneLine = 54 } = {}) {
  const length = Math.max(1, String(title || '').trim().length);
  const oneLine = Math.floor(width / (length * TITLE_CHAR_EM));
  if (oneLine >= minOneLine) return { fontSize: Math.min(max, oneLine), lines: 1, lineHeight: boxHeight };
  const twoLines = Math.floor(width / (Math.ceil(length / 2 + 2) * TITLE_CHAR_EM));
  const fontSize = Math.max(28, Math.min(Math.floor(boxHeight / 2) - 4, twoLines));
  return { fontSize, lines: 2, lineHeight: Math.floor(boxHeight / 2) };
}
