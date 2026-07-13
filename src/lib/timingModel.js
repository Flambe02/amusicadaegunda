/**
 * Modèle de timing structuré (Stage 2 — hybride frase/palavra).
 *
 * ADDITIF : ne remplace pas `lrc.js`. `lrc_content` reste la source de compatibilité ;
 * ce module gère uniquement la colonne optionnelle `songs.timing_data` (JSON) et la
 * conversion vers/depuis la forme de travail de l'éditeur ({text,time,endTime,words?}).
 *
 * Règle de priorité au lecteur/aperçu (voir `resolveSongTiming`) :
 *   1. timing_data structuré et valide → l'utiliser (ligne ET mot, quand présents)
 *   2. sinon → parseLrc(lrc_content) (comportement historique inchangé)
 *
 * Format persisté (schemaVersion 1) :
 *   {
 *     schemaVersion: 1,
 *     timingMode: 'line' | 'word' | 'hybrid',
 *     lines: [{
 *       id, text, start, end, singer: 'A'|'B'|null,
 *       timingMode: 'line'|'word',
 *       words?: [{ id, text, start, end }]
 *     }]
 *   }
 */
import { parseLrc } from '@/lib/lrc';

const SCHEMA_VERSION = 1;

/**
 * Parse et valide un `timing_data` brut (déjà objet JS — Supabase renvoie du jsonb
 * déjà parsé — ou une string JSON par prudence). Renvoie null si absent/invalide,
 * jamais une exception : c'est le signal pour retomber sur lrc_content.
 * @param {unknown} raw
 * @returns {null | { schemaVersion:number, timingMode:string, lines: Array }}
 */
export function parseTimingModel(raw) {
  if (raw == null) return null;
  let obj = raw;
  if (typeof raw === 'string') {
    try { obj = JSON.parse(raw); } catch { return null; }
  }
  if (!obj || typeof obj !== 'object' || !Array.isArray(obj.lines)) return null;
  if (obj.lines.length === 0) return null;

  const lines = [];
  for (const l of obj.lines) {
    if (!l || typeof l.text !== 'string' || !Number.isFinite(l.start)) continue;
    const end = Number.isFinite(l.end) ? l.end : null;
    const words = Array.isArray(l.words)
      ? l.words.filter((w) => w && typeof w.text === 'string' && Number.isFinite(w.start) && Number.isFinite(w.end))
      : undefined;
    lines.push({
      id: l.id || null,
      text: l.text,
      start: l.start,
      end,
      singer: l.singer === 'A' || l.singer === 'B' ? l.singer : null,
      timingMode: words && words.length > 0 ? 'word' : 'line',
      words: words && words.length > 0 ? words : undefined,
    });
  }
  if (lines.length === 0) return null;
  lines.sort((a, b) => a.start - b.start);

  return {
    schemaVersion: Number.isFinite(obj.schemaVersion) ? obj.schemaVersion : SCHEMA_VERSION,
    timingMode: obj.timingMode === 'word' || obj.timingMode === 'hybrid' ? obj.timingMode : 'line',
    lines,
  };
}

/**
 * Construit le JSON structuré à partir des lignes de l'éditeur
 * ({text, time, endTime, words?}). Ignore les lignes non marquées (time null),
 * cohérent avec buildLrc(). `words` (quand présent) sont copiés tels quels.
 * @param {Array} editorLines
 * @returns {{schemaVersion:number, timingMode:string, lines:Array}|null}
 */
export function buildTimingModel(editorLines) {
  if (!Array.isArray(editorLines)) return null;
  const timed = editorLines.filter((l) => l && Number.isFinite(l.time) && l.time >= 0);
  if (timed.length === 0) return null;

  const sorted = timed.slice().sort((a, b) => a.time - b.time);
  let anyWord = false;
  let allWord = true;

  const lines = sorted.map((l, i) => {
    const hasWords = Array.isArray(l.words) && l.words.length > 0;
    if (hasWords) anyWord = true; else allWord = false;
    return {
      id: l.id || `l${i + 1}`,
      text: l.text ?? '',
      start: l.time,
      end: Number.isFinite(l.endTime) ? l.endTime : null,
      singer: l.singer === 'A' || l.singer === 'B' ? l.singer : null,
      timingMode: hasWords ? 'word' : 'line',
      ...(hasWords ? { words: l.words.map((w, wi) => ({ id: w.id || `w${wi + 1}`, text: w.text, start: w.start, end: w.end })) } : {}),
    };
  });

  const timingMode = !anyWord ? 'line' : allWord ? 'word' : 'hybrid';
  return { schemaVersion: SCHEMA_VERSION, timingMode, lines };
}

/**
 * Convertit un modèle structuré vers la forme de travail de l'éditeur
 * ({text, time, endTime, words?}) — utilisé pour CHARGER une chanson en mode
 * structuré dans KaraokeSyncTool.
 * @param {{lines:Array}} model
 * @returns {Array<{text:string,time:number,endTime:number|null,singer:string|null,words?:Array}>}
 */
export function timingModelToEditorLines(model) {
  if (!model || !Array.isArray(model.lines)) return [];
  return model.lines.map((l) => ({
    text: l.text,
    time: l.start,
    endTime: l.end ?? null,
    singer: l.singer ?? null,
    ...(l.words && l.words.length > 0 ? { words: l.words.map((w) => ({ ...w })) } : {}),
  }));
}

/**
 * Forme unifiée consommée par le lecteur public ET l'aperçu admin : un tableau de
 * lignes { time, text, endTime, singer, words? } triées par temps — EXACTEMENT la
 * forme que `parseLrc()` renvoie déjà, avec `words` en plus quand disponible. Aucun
 * appelant existant n'a besoin de changer sa logique d'affichage de ligne.
 *
 * Priorité : timing_data structuré valide > lrc_content (comportement historique).
 * @param {{ lrc_content?: string|null, timing_data?: unknown }} song
 * @returns {{ lines: Array, source: 'structured'|'lrc' }}
 */
export function resolveSongTiming(song) {
  const model = parseTimingModel(song?.timing_data);
  if (model) {
    const lines = model.lines.map((l) => ({
      time: l.start,
      text: l.text,
      endTime: l.end,
      singer: l.singer,
      ...(l.words && l.words.length > 0 ? { words: l.words } : {}),
    }));
    return { lines, source: 'structured' };
  }
  return { lines: parseLrc(song?.lrc_content), source: 'lrc' };
}
