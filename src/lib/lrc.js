/**
 * Utilitaires LRC — synchronisation paroles ↔ temps de lecture.
 *
 * Format LRC standard, une ligne par entrée :
 *   [00:12.50]Première ligne des paroles
 *   [01:04.20]Deuxième ligne
 *
 * Extension NON standard (propre à cet outil) : un tag de FIN optionnel après le
 * texte, pour une ligne dont la fin exacte a été captée (geste Espace maintenu) :
 *   [00:12.50]Première ligne des paroles[00:14.90]
 * Rétrocompatible : une ligne sans tag de fin garde son comportement historique
 * (surbrillance jusqu'au début de la ligne suivante, via activeLineIndex).
 *
 * La source brute des paroles est la colonne `songs.lyrics` (une ligne = une entrée).
 */

const LRC_LINE_RE = /^\s*((?:\[\d{1,2}:\d{1,2}(?:[.:]\d{1,3})?\]\s*)+)(.*?)(\[\d{1,2}:\d{1,2}(?:[.:]\d{1,3})?\])?\s*$/;
const LRC_TAG_RE = /\[(\d{1,2}):(\d{1,2})(?:[.:](\d{1,3}))?\]/g;
const LRC_SINGLE_TAG_RE = /\[(\d{1,2}):(\d{1,2})(?:[.:](\d{1,3}))?\]/;
// Tag de chanteur optionnel — extension ADDITIVE propre à cet outil (Modo Dueto TV) :
// `{A}`, `{B}` ou `{AB}` en tout début de texte, ex. `[00:12.50]{A}Eu sou Ronaldo`.
// Une ligne sans ce tag garde `singer: null` (comportement historique inchangé).
const SINGER_TAG_RE = /^\{(A|B|AB)\}\s*/i;

/**
 * Découpe des paroles brutes en lignes exploitables.
 * - normalise les fins de ligne
 * - retire les lignes vides (mais garde l'ordre)
 * @param {string} raw
 * @returns {string[]}
 */
export function splitLyricsLines(raw) {
  if (!raw || typeof raw !== 'string') return [];
  return raw
    .replace(/\r\n?/g, '\n')
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line.length > 0);
}

/**
 * Formate un temps (secondes) au format LRC `mm:ss.xx` (centièmes).
 * @param {number} seconds
 * @returns {string}
 */
export function formatTimestamp(seconds) {
  const safe = Number.isFinite(seconds) && seconds > 0 ? seconds : 0;
  const totalCentis = Math.round(safe * 100);
  const mm = Math.floor(totalCentis / 6000);
  const ss = Math.floor((totalCentis % 6000) / 100);
  const cc = totalCentis % 100;
  const pad = (n, len = 2) => String(n).padStart(len, '0');
  return `${pad(mm)}:${pad(ss)}.${pad(cc)}`;
}

// Parse un tag isolé "[mm:ss.xx]" → secondes. Renvoie null si invalide.
function parseTagSeconds(tagStr) {
  if (!tagStr) return null;
  const m = tagStr.match(LRC_SINGLE_TAG_RE);
  if (!m) return null;
  const mm = parseInt(m[1], 10) || 0;
  const ss = parseInt(m[2], 10) || 0;
  const fracRaw = m[3] || '0';
  const frac = parseInt(fracRaw, 10) / Math.pow(10, fracRaw.length);
  return mm * 60 + ss + frac;
}

/**
 * Construit une string LRC à partir de lignes { time:number(sec)|null, text:string, endTime?:number|null }.
 * Les lignes sans temps de départ (null) sont ignorées (non encore synchronisées).
 * Si `endTime` est renseigné (> time), un second tag de fin est ajouté après le texte.
 * Les lignes sont triées par temps croissant pour un LRC valide.
 * @param {{ time: number|null, text: string, endTime?: number|null }[]} lines
 * @returns {string}
 */
export function buildLrc(lines) {
  if (!Array.isArray(lines)) return '';
  return lines
    .filter((l) => l && Number.isFinite(l.time) && l.time >= 0)
    .slice()
    .sort((a, b) => a.time - b.time)
    .map((l) => {
      const hasEnd = Number.isFinite(l.endTime) && l.endTime > l.time;
      const endPart = hasEnd ? `[${formatTimestamp(l.endTime)}]` : '';
      return `[${formatTimestamp(l.time)}]${(l.text ?? '').trim()}${endPart}`;
    })
    .join('\n');
}

/**
 * Parse une string LRC en tableau trié { time:number, text:string, endTime:number|null }.
 * Ignore les lignes non taguées et les métadonnées ([ar:], [ti:], ...).
 * Gère les tags multiples EN DÉBUT de ligne (rare mais valide, une entrée par tag),
 * et un tag de FIN optionnel en fin de ligne (extension propre à cet outil).
 * @param {string} lrc
 * @returns {{ time: number, text: string, endTime: number|null }[]}
 */
export function parseLrc(lrc) {
  if (!lrc || typeof lrc !== 'string') return [];
  const out = [];
  const rawLines = lrc.replace(/\r\n?/g, '\n').split('\n');

  for (const rawLine of rawLines) {
    const match = rawLine.match(LRC_LINE_RE);
    if (!match) continue;
    const tags = match[1];
    let text = (match[2] || '').trim();
    const endTime = match[3] ? parseTagSeconds(match[3]) : null;

    let singer = null;
    const singerMatch = text.match(SINGER_TAG_RE);
    if (singerMatch) {
      singer = singerMatch[1].toUpperCase();
      text = text.slice(singerMatch[0].length).trim();
    }

    LRC_TAG_RE.lastIndex = 0;
    let tagMatch;
    while ((tagMatch = LRC_TAG_RE.exec(tags)) !== null) {
      const mm = parseInt(tagMatch[1], 10) || 0;
      const ss = parseInt(tagMatch[2], 10) || 0;
      const fracRaw = tagMatch[3] || '0';
      // Normalise la partie fractionnaire (2 ou 3 chiffres) en secondes décimales
      const frac = parseInt(fracRaw, 10) / Math.pow(10, fracRaw.length);
      const time = mm * 60 + ss + frac;
      out.push({ time, text, endTime, singer });
    }
  }

  return out.sort((a, b) => a.time - b.time);
}

/**
 * Détermine l'index de la ligne active pour un temps courant donné.
 * Renvoie -1 avant la première ligne synchronisée, et aussi PENDANT UNE PAUSE si
 * la ligne courante a un `endTime` explicite déjà dépassé (silence entre deux
 * phrases) — pour les lignes sans endTime, comportement historique inchangé
 * (surbrillance jusqu'au début de la ligne suivante).
 * @param {{ time:number, text:string, endTime?:number|null }[]} parsed  (trié par time croissant)
 * @param {number} currentTime  secondes
 * @returns {number}
 */
export function activeLineIndex(parsed, currentTime) {
  if (!Array.isArray(parsed) || parsed.length === 0) return -1;
  const t = Number.isFinite(currentTime) ? currentTime : 0;
  // Recherche linéaire suffisante (paroles = quelques dizaines de lignes).
  let idx = -1;
  for (let i = 0; i < parsed.length; i += 1) {
    if (parsed[i].time <= t) idx = i;
    else break;
  }
  if (idx === -1) return -1;
  const line = parsed[idx];
  if (line.endTime != null && t >= line.endTime) return -1;
  return idx;
}

/** true si la string LRC contient au moins une ligne datée exploitable. */
export function hasLrcContent(lrc) {
  return parseLrc(lrc).length > 0;
}

/**
 * true si o karaokê desta música está sincronizado E publicado ao público. Usa
 * SEMPRE isto (não `hasLrcContent` diretamente) em qualquer sítio que decide se
 * o público vê karaokê (catálogo, TV, Festa, botão « Cantar »…) — a sincronização
 * pode existir mas ficar como rascunho não publicado (alternador « Publicar
 * karaokê » no admin). `karaoke_published` ausente/null = publicado (comportamento
 * histórico antes deste alternador existir — nunca esconde karaokê já existente
 * sem ação explícita do administrador).
 * @param {{ lrc_content?: string|null, karaoke_published?: boolean|null }} song
 */
export function isKaraokePublished(song) {
  return hasLrcContent(song?.lrc_content) && song?.karaoke_published !== false;
}

/**
 * A CHANSON elle-même est-elle publique ? Le catalogue public, /musica/:slug, la TV et
 * a Festa ne reçoivent que des chansons `status='published'` (filtre côté requête pour
 * getBySlug/getCurrent, et policy RLS « public read published » pour le reste).
 * @param {{ status?: string|null }} song
 */
export function isSongPublished(song) {
  return song?.status === 'published';
}

/** États affichés à l'ADMIN pour le karaokê d'une chanson (voir karaokeAdminState). */
export const KARAOKE_STATE = {
  UNCONFIGURED: 'unconfigured', // pas de letra
  PENDING: 'pending',           // letra mais pas encore synchronisée
  DRAFT: 'draft',               // synchronisée mais « Publicar karaokê » désactivé
  SONG_DRAFT: 'song-draft',     // karaokê prêt ET publié… mais la CHANSON est un rascunho
  ACTIVE: 'active',             // réellement atteignable par le public
};

/**
 * État du karaokê tel qu'il doit être MONTRÉ À L'ADMIN.
 *
 * ⚠️ N'est PAS une décision de visibilité publique — pour ça, c'est
 * `isKaraokePublished()`, et lui seul. Cette fonction existe pour dire la VÉRITÉ dans
 * l'admin : une chanson en rascunho n'est servie à personne (filtre `status='published'`
 * côté requêtes + policy RLS), donc publier son karaokê n'a AUCUN effet public tant que
 * la chanson n'est pas publiée. L'admin affichait pourtant « Karaokê » (= en ligne) dans
 * ce cas, ce qui laissait croire l'inverse.
 *
 * @param {{ status?:string|null, lyrics?:string|null, lyrics_karaoke?:string|null,
 *           lrc_content?:string|null, timing_data?:unknown, karaoke_published?:boolean|null }} song
 * @returns {string} une valeur de KARAOKE_STATE
 */
export function karaokeAdminState(song) {
  const hasLyrics = Boolean(resolveLyricsText(song)?.trim());
  const isSynced = hasLrcContent(song?.lrc_content) || song?.timing_data != null;
  if (!hasLyrics && !isSynced) return KARAOKE_STATE.UNCONFIGURED;
  if (!isSynced) return KARAOKE_STATE.PENDING;
  if (song?.karaoke_published === false) return KARAOKE_STATE.DRAFT;
  return isSongPublished(song) ? KARAOKE_STATE.ACTIVE : KARAOKE_STATE.SONG_DRAFT;
}

/**
 * Texto de letra a USAR — para leitura pública (diálogos/drawers de letra) E como
 * fonte para a sincronização karaokê (§ pedido 2026-07-16). Prefere
 * `lyrics_karaoke` (versão revista com espaçamento correto entre palavras,
 * editada a partir de « Sincronizar karaokê » → « Guardar letra ») quando
 * preenchida; senão cai para `lyrics` (o campo original, nunca escrito pelo
 * editor de karaokê a partir de agora — cada música migra para
 * `lyrics_karaoke` a primeira vez que a letra for guardada dali).
 * @param {{ lyrics?: string|null, lyrics_karaoke?: string|null }} song
 * @returns {string}
 */
export function resolveLyricsText(song) {
  const karaoke = song?.lyrics_karaoke;
  if (typeof karaoke === 'string' && karaoke.trim()) return karaoke;
  return song?.lyrics || '';
}

/**
 * true si la chanson a au moins une ligne taguée par chanteur (`{A}`/`{B}`) — condition
 * pour proposer la Duet View réelle (paroles alignées par chanteur). Une chanson sans
 * tag reste utilisable en Modo Dueto « historique » (couleurs en alternance par index),
 * mais pas en Duet View.
 */
export function hasDuetTags(lrc) {
  return parseLrc(lrc).some((line) => line.singer === 'A' || line.singer === 'B');
}
