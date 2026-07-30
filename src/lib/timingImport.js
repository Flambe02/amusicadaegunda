/**
 * Import d'un timing DÉJÀ existant dans l'éditeur karaokê — fonctions PURES.
 *
 * Trois formats acceptés, tous ramenés à la MÊME forme de travail que le reste de
 * l'éditeur ({ text, time, endTime, words? }) — aucun système de timing parallèle :
 *
 *   1. LRC          — `[00:12.50]Texte` (+ tag de fin optionnel, extension maison).
 *   2. timing_data  — le JSON structuré exporté par cet outil ({schemaVersion, lines}).
 *   3. mots alignés — sortie d'un aligneur forcé (whisperX & co) : une liste PLATE de
 *                     mots { start, end, text|word } sans découpage en frases.
 *
 * Le cas 3 est le seul non trivial : la liste de mots ne connaît pas les frases. On
 * ALIGNE donc la séquence de mots sur les lignes de paroles DÉJÀ présentes dans
 * l'éditeur (le texte de l'admin reste la référence d'affichage — casse, ponctuation
 * et découpage inchangés) :
 *
 *   - ancrage du DÉBUT  : 1er mot dont le token normalisé == 1er token de la ligne,
 *     cherché vers l'avant dans une fenêtre (tolère des mots parasites de l'aligneur) ;
 *   - ancrage de la FIN : dernier token de la ligne, cherché autour de la position
 *     attendue (tolère ±quelques mots d'écart) ;
 *   - les timings de MOT ne sont repris tels quels que si le nombre de mots alignés
 *     est exactement celui de la ligne ; sinon on retombe sur `distributeWords()`
 *     (déterministe, déjà utilisée par l'éditeur) DANS les bornes réelles de la frase.
 *
 * Invariants voulus :
 *   - une ligne que l'on n'arrive pas à aligner garde son timing existant (un import
 *     n'efface JAMAIS du travail manuel qu'il n'a pas su remplacer) ;
 *   - les marqueurs de section (`[INTRO]`, `(refrão)`) ne consomment aucun mot ;
 *   - les `words` produits respectent `wordsAreValid()` : croissants et dans [start,end].
 */
import { parseLrc } from '@/lib/lrc';
import { parseTimingModel, timingModelToEditorLines } from '@/lib/timingModel';
import { tokenizeWords, distributeWords } from '@/lib/wordDistribution';

export const IMPORT_FORMAT = {
  LRC: 'lrc',
  TIMING_JSON: 'timing-json',
  WORDS_JSON: 'words-json',
};

/** Comment les lignes de l'éditeur ont été obtenues (sert au récapitulatif affiché). */
export const IMPORT_MODE = {
  APPLY: 'apply',      // mêmes textes → on pose seulement les temps sur les lignes actuelles
  REPLACE: 'replace',  // textes différents → les lignes du fichier remplacent les lignes actuelles
  ALIGN: 'align',      // liste de mots alignée sur les paroles actuelles
  GROUP: 'group',      // liste de mots découpée en frases par les silences (aucune parole en cours)
};

/** Libellés affichés (pt-BR) — dans le module pur pour rester testables. */
export const IMPORT_FORMAT_LABEL = {
  [IMPORT_FORMAT.LRC]: 'Ficheiro LRC',
  [IMPORT_FORMAT.TIMING_JSON]: 'JSON de timing (desta ferramenta)',
  [IMPORT_FORMAT.WORDS_JSON]: 'JSON de alinhamento por palavra',
};

export const IMPORT_MODE_COPY = {
  [IMPORT_MODE.APPLY]: {
    title: 'Só os tempos entram',
    detail: 'A letra do ficheiro é a mesma que está no editor: o teu texto fica exatamente como está.',
  },
  [IMPORT_MODE.REPLACE]: {
    title: 'As linhas vão ser substituídas',
    detail: 'A letra do ficheiro é diferente da atual: as linhas do ficheiro (texto + tempos) passam a ser as do editor.',
  },
  [IMPORT_MODE.ALIGN]: {
    title: 'Palavras alinhadas com a letra atual',
    detail: 'Cada frase recebe início, fim e tempos por palavra. O teu texto (maiúsculas, pontuação, cortes) não muda.',
  },
  [IMPORT_MODE.GROUP]: {
    title: 'Frases criadas a partir dos silêncios',
    detail: 'O editor não tem letra para alinhar, então as frases foram cortadas nos silêncios — revê os cortes depois.',
  },
};

/**
 * Récapitulatif chiffré d'un import, prêt à afficher.
 * @param {{ totalLines:number, matchedLines:number, wordLines:number, markerLines:number, skippedWords:number }} stats
 * @returns {{ key:string, label:string, tone:'good'|'warn'|'bad'|'info'|'muted' }[]}
 */
export function importSummaryChips(stats) {
  if (!stats) return [];
  const sung = Math.max(0, (stats.totalLines || 0) - (stats.markerLines || 0));
  const chips = [{
    key: 'lines',
    label: `${stats.matchedLines} de ${sung} frase(s) com tempo`,
    tone: stats.matchedLines === 0 ? 'bad' : stats.matchedLines < sung ? 'warn' : 'good',
  }];
  if (stats.wordLines > 0) chips.push({ key: 'words', label: `${stats.wordLines} por palavra`, tone: 'info' });
  if (stats.markerLines > 0) chips.push({ key: 'markers', label: `${stats.markerLines} marcador(es) ignorado(s)`, tone: 'muted' });
  if (stats.skippedWords > 0) chips.push({ key: 'skipped', label: `${stats.skippedWords} palavra(s) não usada(s)`, tone: 'muted' });
  return chips;
}

const LRC_TAG_PROBE = /\[\d{1,2}:\d{1,2}(?:[.:]\d{1,3})?\]/;
const SECTION_MARKER_RE = /^\s*[[(<{][^\])>}]*[\])>}]\s*$/;
const DEFAULT_LOOKAHEAD = 24;   // mots parasites tolérés avant le début d'une frase
const END_WINDOW = 3;           // écart toléré sur la position du dernier mot
const MIN_TOKEN_SCORE = 0.5;    // sous ce taux de tokens identiques, l'ancrage est refusé
const MIN_WORD_SEC = 0.08;      // durée plancher d'un mot de durée nulle (aligneurs)
const TEXT_MATCH_RATIO = 0.8;   // au-dessus : mêmes paroles → APPLY plutôt que REPLACE
const DEFAULT_GAP_SEC = 0.7;    // silence qui coupe une frase (mode GROUP)
const DEFAULT_GROUP_MAX = 9;    // mots max par frase (mode GROUP)

/**
 * Token comparable : minuscules, sans accents, sans ponctuation. Utilisé UNIQUEMENT
 * pour la comparaison — le texte affiché reste toujours celui de l'admin.
 * @param {string} token
 * @returns {string}
 */
export function normalizeMatchToken(token) {
  if (!token || typeof token !== 'string') return '';
  return token
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // accents combinants (NFD), en \uXXXX pour survivre a tout re-encodage
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '');
}

/** Texte de ligne réduit à ses tokens comparables (pour comparer deux découpages). */
export function normalizeLineText(text) {
  return tokenizeWords(text).map(normalizeMatchToken).filter(Boolean).join(' ');
}

/**
 * Ligne de structure (`[INTRO]`, `(refrão)`) : à afficher mais JAMAIS chantée, donc
 * elle ne doit consommer aucun mot de l'aligneur (sinon tout le reste se décale).
 * @param {string} text
 */
export function isSectionMarker(text) {
  return typeof text === 'string' && SECTION_MARKER_RE.test(text);
}

/**
 * Devine le format d'un contenu importé. L'ordre compte : un LRC commence par `[`,
 * comme un tableau JSON — on cherche donc d'abord un vrai tag `[mm:ss]`.
 * @param {string} fileName
 * @param {string} text
 * @returns {string|null} une valeur de IMPORT_FORMAT, ou null si indéterminable
 */
export function detectImportFormat(fileName, text) {
  const body = typeof text === 'string' ? text.trim() : '';
  if (!body) return null;
  if (LRC_TAG_PROBE.test(body)) return IMPORT_FORMAT.LRC;

  let parsed;
  try { parsed = JSON.parse(body); } catch { return null; }
  if (!parsed || typeof parsed !== 'object') return null;
  if (Array.isArray(parsed)) return IMPORT_FORMAT.WORDS_JSON;
  if (Array.isArray(parsed.lines)) return IMPORT_FORMAT.TIMING_JSON;
  if (Array.isArray(parsed.words) || Array.isArray(parsed.segments)) return IMPORT_FORMAT.WORDS_JSON;
  // Extension inconnue mais nom de fichier explicite : on tente quand même.
  return typeof fileName === 'string' && /\.lrc$/i.test(fileName) ? IMPORT_FORMAT.LRC : null;
}

/**
 * Extrait une liste PLATE de mots { text, start, end } d'une sortie d'aligneur.
 * Accepte `{words:[…]}`, un tableau nu, `{segments:[{words:[…]}]}`, et les deux
 * conventions de clé de texte (`text` — whisperX récent — ou `word`).
 * @param {unknown} raw  objet déjà parsé OU string JSON
 * @returns {{ text:string, start:number, end:number }[]}
 */
export function parseWordList(raw) {
  let obj = raw;
  if (typeof raw === 'string') {
    try { obj = JSON.parse(raw); } catch { return []; }
  }
  if (!obj || typeof obj !== 'object') return [];

  let flat = [];
  if (Array.isArray(obj)) flat = obj;
  else if (Array.isArray(obj.words)) flat = obj.words;
  else if (Array.isArray(obj.segments)) {
    flat = obj.segments.flatMap((s) => (Array.isArray(s?.words) ? s.words : []));
  }

  return flat
    .map((w) => {
      if (!w || typeof w !== 'object') return null;
      const text = typeof w.text === 'string' ? w.text : typeof w.word === 'string' ? w.word : '';
      const start = Number(w.start);
      const end = Number(w.end);
      if (!text.trim() || !Number.isFinite(start)) return null;
      return { text: text.trim(), start, end: Number.isFinite(end) ? end : start };
    })
    .filter(Boolean);
}

/**
 * Rend une liste de mots exploitable : ordre croissant, fin ≥ début, et une durée
 * plancher pour les mots de durée nulle (fréquents sur les monosyllabes — « e »,
 * « o » — dans les sorties d'aligneur) SANS jamais empiéter sur le mot suivant.
 * @param {{text:string,start:number,end:number}[]} words
 */
export function sanitizeImportedWords(words) {
  if (!Array.isArray(words)) return [];
  const list = words
    .filter((w) => w && typeof w.text === 'string' && Number.isFinite(w.start))
    .map((w) => ({ text: w.text, start: w.start, end: Number.isFinite(w.end) ? Math.max(w.end, w.start) : w.start }))
    .sort((a, b) => a.start - b.start);

  for (let i = 0; i < list.length; i += 1) {
    if (list[i].end > list[i].start) continue;
    const nextStart = i + 1 < list.length ? list[i + 1].start : Infinity;
    const room = nextStart - list[i].start;
    list[i].end = list[i].start + Math.max(0, Math.min(MIN_WORD_SEC, room));
  }
  return list;
}

/**
 * Combien de tokens de la ligne se retrouvent, DANS L'ORDRE, dans la tranche de mots
 * [from, to] de l'aligneur. Sous-suite commune gloutonne (et non comparaison position
 * par position) : un mot manquant ou en trop au milieu d'une frase décalerait toutes
 * les positions suivantes et ferait échouer un ancrage pourtant correct.
 */
function orderedOverlap(keys, from, to, keyed) {
  let cursor = from;
  let same = 0;
  for (let i = 0; i < keyed.length; i += 1) {
    for (let p = cursor; p <= to; p += 1) {
      if (keys[p] === keyed[i].key) { same += 1; cursor = p + 1; break; }
    }
  }
  return same;
}

// Mots d'une frase construits À PARTIR DES TOKENS DE L'ADMIN, avec les temps de
// l'aligneur, bornés par [start, end] pour satisfaire wordsAreValid().
function wordsFromAligned(keyed, slice, start, end) {
  let prevStart = start;
  return keyed.map((k, i) => {
    const w = slice[i];
    const wStart = Math.min(Math.max(w.start, prevStart), end);
    const wEnd = Math.min(Math.max(w.end, wStart), end);
    prevStart = wStart;
    return { id: `w${i + 1}`, text: k.text, start: wStart, end: wEnd };
  });
}

/**
 * Aligne une liste plate de mots sur des textes de lignes déjà découpés.
 *
 * @param {string[]} lineTexts
 * @param {{text:string,start:number,end:number}[]} rawWords
 * @param {{ lookahead?:number, minTokenScore?:number }} [opts]
 * @returns {{ lines: Array<{text:string,time:number|null,endTime:number|null,words?:Array,matched:boolean}>,
 *            stats: { totalLines:number, matchedLines:number, wordLines:number, markerLines:number,
 *                     unmatched:number[], totalWords:number, usedWords:number, skippedWords:number } }}
 */
export function alignWordsToLines(lineTexts, rawWords, opts = {}) {
  const lookahead = Number.isFinite(opts.lookahead) ? opts.lookahead : DEFAULT_LOOKAHEAD;
  const minScore = Number.isFinite(opts.minTokenScore) ? opts.minTokenScore : MIN_TOKEN_SCORE;
  const words = sanitizeImportedWords(rawWords);
  const keys = words.map((w) => normalizeMatchToken(w.text));
  const texts = Array.isArray(lineTexts) ? lineTexts : [];

  const lines = [];
  const unmatched = [];
  let cursor = 0;
  let usedWords = 0;
  let skippedWords = 0;
  let matchedLines = 0;
  let wordLines = 0;
  let markerLines = 0;

  texts.forEach((text, index) => {
    const keyed = tokenizeWords(text)
      .map((t) => ({ text: t, key: normalizeMatchToken(t) }))
      .filter((k) => k.key);

    if (isSectionMarker(text) || keyed.length === 0) {
      markerLines += 1;
      lines.push({ text, time: null, endTime: null, matched: false });
      return;
    }

    // ── Ancrage du début : premier mot identique au premier token de la ligne.
    let from = -1;
    const limit = Math.min(words.length - 1, cursor + lookahead);
    for (let p = cursor; p <= limit; p += 1) {
      if (keys[p] === keyed[0].key) { from = p; break; }
    }
    if (from === -1) {
      unmatched.push(index);
      lines.push({ text, time: null, endTime: null, matched: false });
      return;
    }

    // ── Ancrage de la fin : dernier token, cherché autour de la position attendue.
    const expected = from + keyed.length - 1;
    let to = -1;
    if (keyed.length === 1) {
      to = from;
    } else {
      const lastKey = keyed[keyed.length - 1].key;
      let best = -1;
      const lo = Math.max(from + 1, expected - END_WINDOW);
      const hi = Math.min(words.length - 1, expected + END_WINDOW);
      for (let q = lo; q <= hi; q += 1) {
        if (keys[q] !== lastKey) continue;
        if (best === -1 || Math.abs(q - expected) < Math.abs(best - expected)) best = q;
      }
      to = best !== -1 ? best : Math.min(expected, words.length - 1);
    }
    if (to < from) to = from;

    // ── Contrôle de vraisemblance : un ancrage isolé sur un mot très courant
    // (« o », « e ») ne doit pas dater une frase au mauvais endroit.
    const span = to - from + 1;
    const same = orderedOverlap(keys, from, to, keyed);
    if (keyed.length > 1 && same / keyed.length < minScore) {
      unmatched.push(index);
      lines.push({ text, time: null, endTime: null, matched: false });
      return;
    }

    const start = words[from].start;
    const rawEnd = words[to].end;
    const end = rawEnd > start ? rawEnd : null;

    const line = { text, time: start, endTime: end, matched: true };
    if (end != null) {
      line.words = span === keyed.length
        ? wordsFromAligned(keyed, words.slice(from, to + 1), start, end)
        : distributeWords(text, start, end);
      wordLines += 1;
    }
    lines.push(line);

    matchedLines += 1;
    skippedWords += from - cursor;
    usedWords += span;
    cursor = to + 1;
  });

  return {
    lines,
    stats: {
      totalLines: texts.length,
      matchedLines,
      wordLines,
      markerLines,
      unmatched,
      totalWords: words.length,
      usedWords,
      skippedWords: skippedWords + Math.max(0, words.length - cursor),
    },
  };
}

/**
 * Découpe une liste de mots en frases par les SILENCES — utilisé seulement quand
 * l'éditeur n'a aucune parole sur laquelle s'aligner. Résultat volontairement
 * approximatif : c'est un point de départ éditable, pas une vérité.
 * @param {{text:string,start:number,end:number}[]} rawWords
 * @param {{ gapSec?:number, maxWords?:number }} [opts]
 */
export function groupWordsIntoLines(rawWords, opts = {}) {
  const gapSec = Number.isFinite(opts.gapSec) ? opts.gapSec : DEFAULT_GAP_SEC;
  const maxWords = Number.isFinite(opts.maxWords) ? opts.maxWords : DEFAULT_GROUP_MAX;
  const words = sanitizeImportedWords(rawWords);
  if (words.length === 0) return [];

  const groups = [];
  let current = [];
  words.forEach((w) => {
    const prev = current[current.length - 1];
    const cut = prev && (w.start - prev.end > gapSec || current.length >= maxWords);
    if (cut) { groups.push(current); current = []; }
    current.push(w);
  });
  if (current.length > 0) groups.push(current);

  return groups.map((g) => {
    const start = g[0].start;
    const end = g[g.length - 1].end;
    const text = g.map((w) => w.text).join(' ');
    const line = { text, time: start, endTime: end > start ? end : null, matched: true };
    if (line.endTime != null) {
      line.words = g.map((w, i) => ({ id: `w${i + 1}`, text: w.text, start: w.start, end: Math.min(w.end, end) }));
    }
    return line;
  });
}

/**
 * Import d'un format qui porte DÉJÀ son texte (LRC, timing_data) : selon que ce texte
 * correspond ou non aux paroles en cours, on pose seulement les temps (APPLY, le texte
 * de l'admin est préservé) ou on remplace les lignes (REPLACE).
 * @param {Array<{text:string}>} currentLines
 * @param {Array<{text:string,time:number|null,endTime?:number|null,words?:Array}>} importedLines
 */
export function planTextTimingImport(currentLines, importedLines) {
  const current = Array.isArray(currentLines) ? currentLines : [];
  const imported = Array.isArray(importedLines) ? importedLines : [];
  const sameCount = current.length > 0 && current.length === imported.length;
  const identical = sameCount
    ? current.filter((l, i) => normalizeLineText(l?.text) === normalizeLineText(imported[i]?.text)).length
    : 0;
  const apply = sameCount && identical / current.length >= TEXT_MATCH_RATIO;

  const lines = apply
    ? current.map((l, i) => {
      const src = imported[i];
      const next = { ...l, time: Number.isFinite(src.time) ? src.time : null, endTime: Number.isFinite(src.endTime) ? src.endTime : null };
      if (Array.isArray(src.words) && src.words.length > 0) next.words = src.words.map((w) => ({ ...w }));
      else delete next.words;
      return next;
    })
    : imported.map((l) => ({
      text: l.text ?? '',
      time: Number.isFinite(l.time) ? l.time : null,
      endTime: Number.isFinite(l.endTime) ? l.endTime : null,
      singer: l.singer ?? null,
      ...(Array.isArray(l.words) && l.words.length > 0 ? { words: l.words.map((w) => ({ ...w })) } : {}),
    }));

  return {
    mode: apply ? IMPORT_MODE.APPLY : IMPORT_MODE.REPLACE,
    lines,
    stats: {
      totalLines: lines.length,
      matchedLines: lines.filter((l) => Number.isFinite(l.time)).length,
      wordLines: lines.filter((l) => Array.isArray(l.words) && l.words.length > 0).length,
      markerLines: 0,
      unmatched: lines.map((l, i) => (Number.isFinite(l.time) ? -1 : i)).filter((i) => i !== -1),
      totalWords: 0,
      usedWords: 0,
      skippedWords: 0,
    },
  };
}

/**
 * Fusion finale dans le brouillon de l'éditeur : une ligne NON alignée conserve son
 * timing actuel (un import n'efface jamais du travail manuel qu'il n'a pas remplacé).
 * @param {Array} currentLines
 * @param {Array<{time:number|null,endTime:number|null,words?:Array,matched:boolean}>} alignedLines
 */
export function mergeAlignedLines(currentLines, alignedLines) {
  const current = Array.isArray(currentLines) ? currentLines : [];
  return current.map((line, i) => {
    const src = alignedLines?.[i];
    if (!src || !src.matched || !Number.isFinite(src.time)) return line;
    const next = { ...line, time: src.time, endTime: Number.isFinite(src.endTime) ? src.endTime : null };
    if (Array.isArray(src.words) && src.words.length > 0) next.words = src.words.map((w) => ({ ...w }));
    else delete next.words;
    return next;
  });
}

/**
 * Point d'entrée UNIQUE de l'import : contenu brut + lignes en cours → plan appliquable.
 *
 * Ne modifie rien : renvoie les lignes CANDIDATES et de quoi afficher un récapitulatif
 * avant confirmation.
 *
 * @param {{ fileName?:string, text:string, currentLines?:Array }} input
 * @returns {{ ok:boolean, error?:string, format?:string, mode?:string, lines?:Array,
 *             stats?:object, overwritten?:number }}
 */
export function buildImportPlan({ fileName = '', text = '', currentLines = [] } = {}) {
  const format = detectImportFormat(fileName, text);
  if (!format) {
    return { ok: false, error: 'Formato não reconhecido. Esperado um ficheiro .lrc ou um JSON de alinhamento (com "words").' };
  }

  const current = Array.isArray(currentLines) ? currentLines : [];
  let plan = null;

  if (format === IMPORT_FORMAT.LRC) {
    const parsed = parseLrc(text).map((l) => ({ text: l.text, time: l.time, endTime: l.endTime ?? null, singer: l.singer ?? null }));
    if (parsed.length === 0) return { ok: false, error: 'Nenhuma linha com tempo encontrada no ficheiro LRC.' };
    plan = planTextTimingImport(current, parsed);
  } else if (format === IMPORT_FORMAT.TIMING_JSON) {
    const model = parseTimingModel(text);
    if (!model) return { ok: false, error: 'JSON de timing inválido (esperado { schemaVersion, lines: [...] }).' };
    plan = planTextTimingImport(current, timingModelToEditorLines(model));
  } else {
    const words = parseWordList(text);
    if (words.length === 0) return { ok: false, error: 'Nenhuma palavra utilizável no JSON (esperado start, end e text/word).' };
    const hasLyrics = current.some((l) => normalizeLineText(l?.text));
    if (hasLyrics) {
      const aligned = alignWordsToLines(current.map((l) => l.text), words);
      plan = { mode: IMPORT_MODE.ALIGN, lines: mergeAlignedLines(current, aligned.lines), stats: aligned.stats };
    } else {
      const grouped = groupWordsIntoLines(words);
      plan = {
        mode: IMPORT_MODE.GROUP,
        lines: grouped.map((l) => ({
          text: l.text, time: l.time, endTime: l.endTime, singer: null,
          ...(l.words ? { words: l.words } : {}),
        })),
        stats: {
          totalLines: grouped.length,
          matchedLines: grouped.length,
          wordLines: grouped.filter((l) => l.words).length,
          markerLines: 0,
          unmatched: [],
          totalWords: words.length,
          usedWords: words.length,
          skippedWords: 0,
        },
      };
    }
  }

  // Lignes déjà synchronisées à la main dont le temps va changer : c'est LA
  // information qui manque pour confirmer un import en confiance.
  const overwritten = plan.mode === IMPORT_MODE.REPLACE || plan.mode === IMPORT_MODE.GROUP
    ? current.filter((l) => Number.isFinite(l?.time)).length
    : current.filter((l, i) => Number.isFinite(l?.time)
        && Number.isFinite(plan.lines[i]?.time)
        && Math.abs(plan.lines[i].time - l.time) > 0.001).length;

  return { ok: true, format, mode: plan.mode, lines: plan.lines, stats: plan.stats, overwritten };
}
