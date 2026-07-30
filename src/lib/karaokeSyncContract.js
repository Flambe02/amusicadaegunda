/**
 * Invariants de l'éditeur de synchronisation karaokê — fonctions PURES.
 *
 * Extrait le strict minimum de `KaraokeSyncTool.jsx` (3468 lignes) pour rendre
 * testables les trois règles dont la violation corrompait des timings de frase
 * valides (audit du 2026-07-29) :
 *
 *   1. PROPRIÉTÉ DU CLAVIER — `isParentKeyboardActive()`
 *      Le studio « Afinar palavras e bola » est monté en portail DEPUIS
 *      KaraokeSyncTool : les deux posaient un écouteur `window` non capturant, donc
 *      chaque touche déclenchait les DEUX. Espaço capturait un mot ET réécrivait le
 *      début/fin de la frase sélectionnée (puis avançait le curseur), Backspace/Ctrl+Z
 *      annulaient l'état du parent, Escape fermait tout l'éditeur.
 *
 *   2. PAYLOAD DE SAUVEGARDE — `buildTimingPayload()` / `buildRestoreTimingPayload()`
 *      `timing_data` n'était écrit QUE s'il y avait du timing par mot, et jamais remis
 *      à NULL. Une chanson repassée en frase seule gardait donc en base un
 *      `timing_data` périmé que `resolveSongTiming()` continue de préférer à
 *      `lrc_content` — les corrections de frase semblaient sans effet.
 *
 *   3. COMMIT DU STUDIO — `applyWordEditorResult()`
 *      Le résultat du studio ne doit enrichir que `words`. Les bornes de frase ne
 *      changent que sur édition EXPLICITE (`startEdited`/`endEdited`) et valide, et
 *      ne sont JAMAIS recalculées depuis les mots.
 *
 * Contrat de timing inchangé : secondes, temps absolus (ligne ET mot), `timing_data`
 * prioritaire sur `lrc_content` quand il existe, `endTime` peut rester null.
 */
import { buildLrc, parseLrc } from '@/lib/lrc';
import { buildTimingModel, parseTimingModel, timingModelToEditorLines } from '@/lib/timingModel';
import { wordsAreValid } from '@/lib/ballMotion';

/**
 * Valeur de `songs.timing_mode` pour une chanson SANS timing par mot.
 * Fixée par la migration `20260712170000_add_hybrid_timing.sql` :
 * `timing_mode text NOT NULL DEFAULT 'line'` (valeurs documentées : line | word | hybrid,
 * aucune contrainte CHECK). La colonne est NOT NULL → on écrit 'line', jamais null.
 */
export const PHRASE_ONLY_TIMING_MODE = 'line';

/**
 * Le clavier GLOBAL de KaraokeSyncTool doit-il être actif ?
 *
 * Point de décision UNIQUE : quand ceci renvoie false, le parent n'enregistre aucun
 * écouteur — Espaço (markLineStart/markLineEnd + avance du curseur), Backspace/Ctrl+Z
 * (undo), Escape (fermeture de l'éditeur) et les raccourcis de lecture (k/p/s/←) sont
 * donc TOUS inactifs par construction, sans dépendre de `stopPropagation()` ni de
 * `isEditable(event.target)` (le studio fait `blur()` : les touches arrivent depuis
 * `<body>`, que ce test laisse passer).
 *
 * @param {{ step?: string, wordStudioOpen?: boolean, isCalibrating?: boolean }} [state]
 * @returns {boolean}
 */
export function isParentKeyboardActive(state) {
  if (!state) return false;
  if (state.wordStudioOpen) return false;   // le studio de mots possède le clavier
  if (state.quickMode) return false;        // Quick Sync possède le clavier (Espaço, Esc…)
  if (state.importOpen) return false;       // dialogue d'import : Esc doit le fermer, pas l'éditeur
  if (state.isCalibrating) return false;    // le test de réaction capture Espaço
  return state.step === 'sync';
}

/**
 * Construit la partie TIMING du payload d'écriture `songs`.
 *
 * `timing_data` est TOUJOURS présent dans l'objet renvoyé — avec la valeur `null`
 * quand la chanson n'a plus de timing par mot. C'est ce qui rend `lrc_content` à
 * nouveau autoritaire et empêche un ancien timing structuré de survivre.
 *
 * @param {Array<{text:string,time:number|null,endTime:number|null,words?:Array}>} editorLines
 * @returns {{ lrc_content: string, timing_data: object|null, timing_mode: string }}
 */
export function buildTimingPayload(editorLines) {
  const lrc = buildLrc(editorLines);
  const model = buildTimingModel(editorLines);
  const hasWordTiming = Boolean(model && model.timingMode !== PHRASE_ONLY_TIMING_MODE);
  return {
    lrc_content: lrc,
    timing_data: hasWordTiming ? model : null,
    timing_mode: hasWordTiming ? model.timingMode : PHRASE_ONLY_TIMING_MODE,
  };
}

/**
 * Même règle pour la RESTAURATION d'une version (`song_timing_versions`) : restaurer
 * une version en frase seule par-dessus une chanson hybride doit effacer le
 * `timing_data` devenu périmé, sinon la restauration n'a visiblement aucun effet.
 *
 * @param {{ lrc_content?: string|null, timing_data?: unknown }} version
 * @returns {{ lines: Array, lrc_content: string, timing_data: object|null, timing_mode: string }}
 */
export function buildRestoreTimingPayload(version) {
  const model = parseTimingModel(version?.timing_data);
  const lines = model
    ? timingModelToEditorLines(model)
    : parseLrc(version?.lrc_content).map((l) => ({ text: l.text, time: l.time, endTime: l.endTime ?? null }));
  const hasWordTiming = Boolean(model && model.timingMode !== PHRASE_ONLY_TIMING_MODE);
  return {
    lines,
    lrc_content: version?.lrc_content || buildLrc(lines),
    timing_data: hasWordTiming ? model : null,
    timing_mode: hasWordTiming ? model.timingMode : PHRASE_ONLY_TIMING_MODE,
  };
}

/**
 * Applique le résultat du studio de mots à UNE ligne de l'éditeur.
 *
 * Garanties :
 *  - `result.changed === false` → la ligne d'origine est renvoyée TELLE QUELLE (même
 *    référence) : fermer le studio sans rien modifier ne salit pas le brouillon ;
 *  - `time`/`endTime` ne bougent que sur `startEdited`/`endEdited` explicites ET
 *    valides (fin > début, début fini ≥ 0) — jamais recalculés depuis les mots ;
 *  - des mots invalides ou vides sont OMIS (la ligne redevient frase seule et reste
 *    parfaitement jouable) plutôt que d'écraser un timing de frase valide.
 *
 * @param {{text:string,time:number|null,endTime:number|null,words?:Array}} line
 * @param {{ changed?: boolean, words?: Array, phraseStart?: number, phraseEnd?: number,
 *           startEdited?: boolean, endEdited?: boolean }} result
 */
export function applyWordEditorResult(line, result) {
  if (!line || !result || result.changed === false) return line;

  let nextStart = line.time;
  let nextEnd = line.endTime ?? null;

  if (result.startEdited === true
      && Number.isFinite(result.phraseStart) && result.phraseStart >= 0
      && (nextEnd == null || result.phraseStart < nextEnd)) {
    nextStart = result.phraseStart;
  }
  if (result.endEdited === true
      && Number.isFinite(result.phraseEnd)
      && (nextStart == null || result.phraseEnd > nextStart)) {
    nextEnd = result.phraseEnd;
  }

  const next = { ...line, time: nextStart, endTime: nextEnd };
  // Les mots sont validés CONTRE LES BORNES RETENUES (pas contre celles proposées par
  // le studio) : une fin de frase seulement inférée ne sert jamais de référence ici.
  if (wordsAreValid(result.words, nextStart, nextEnd ?? Infinity)) {
    next.words = result.words;
  } else {
    delete next.words;
  }
  return next;
}
