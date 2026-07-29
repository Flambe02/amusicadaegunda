/**
 * Scénario de bout en bout — le cycle que la synchronisation mot-à-mot doit rendre SÛR :
 *
 *   timings de frase → ouverture de l'éditeur de mots → capture/ajustement des mots
 *   → enregistrement → fermeture → sauvegarde de la chanson → rechargement Supabase
 *   → lecture publique
 *
 * Rejoue les 13 étapes de la vérification manuelle sur les modules RÉELS (aucune donnée
 * de production, aucun accès réseau) : c'est le filet qui empêche le retour des trois
 * causes racines de l'audit du 2026-07-29.
 */
import { describe, it, expect } from 'vitest';
import { parseLrc } from '@/lib/lrc';
import { resolveSongTiming } from '@/lib/timingModel';
import {
  isParentKeyboardActive, buildTimingPayload, applyWordEditorResult,
} from '@/lib/karaokeSyncContract';
import { loadStudioWords, setWordStart, capInferredLastEnd } from '@/lib/ballMotion';
import { distributeWords } from '@/lib/wordDistribution';

// Chanson anonymisée déjà synchronisée PAR FRASE. La ligne 0 n'a pas de `endTime`
// explicite et est suivie d'un long silence instrumental — le cas qui déclenchait la
// réécriture silencieuse du dernier mot.
const LRC = [
  '[00:10.00]aaa bbb ccc',
  '[00:20.00]ddd eee[00:22.50]',
  '[00:30.00]fff ggg hhh',
].join('\n');

const loadEditorLines = (song) => {
  const { lines } = resolveSongTiming(song);
  return lines.map((l) => ({
    text: l.text, time: l.time, endTime: l.endTime ?? null, ...(l.words ? { words: l.words } : {}),
  }));
};
const phraseSnapshot = (lines) => lines.map((l) => ({ text: l.text, time: l.time, endTime: l.endTime }));

describe('scénario : frase → mots → save → reload → frase seule', () => {
  it('parcourt les 13 étapes sans jamais altérer un timing de frase', () => {
    // ── 1-2. Chanson correctement synchronisée par frase ; on fige son timing ──
    let row = { lrc_content: LRC, timing_data: null, timing_mode: 'line' };
    const lines0 = loadEditorLines(row);
    const PHRASES = phraseSnapshot(lines0);
    expect(resolveSongTiming(row).source).toBe('lrc');

    // ── 3. Ouverture de l'éditeur de mots sur la ligne 0 ──────────────────────
    // Le parent ne possède plus le clavier : markLineStart/markLineEnd, l'avance du
    // curseur, undo, Escape et les raccourcis de lecture sont tous hors circuit.
    expect(isParentKeyboardActive({ step: 'sync', wordStudioOpen: true, isCalibrating: false })).toBe(false);

    const idx = 0;
    const phraseStart = lines0[idx].time;                       // 10
    const inferredEnd = lines0[idx].endTime ?? lines0[1].time;  // 20 — INFÉRÉE, pas persistée
    const loaded = loadStudioWords(lines0[idx].words, phraseStart, inferredEnd);
    expect(loaded.repaired).toBe(false);

    // ── 4. Capture de plusieurs mots (Espaço dans le studio) ──────────────────
    // Départ = la distribution automatique proposée, exactement comme startCapture().
    let words = distributeWords(lines0[idx].text, phraseStart, inferredEnd);
    expect(words).toHaveLength(3);
    [10.0, 10.9, 11.7].forEach((t, i) => { words = setWordStart(words, i, t, phraseStart, inferredEnd); });
    expect(words.map((w) => w.start)).toEqual([10, 10.9, 11.7]);
    // Sans capInferredLastEnd, normalizeEnds aurait collé la fin du dernier mot sur la
    // borne INFÉRÉE (20 s = début de la ligne suivante), à travers tout le silence.
    expect(words[2].end).toBe(inferredEnd);
    words = capInferredLastEnd(words, 12.4);
    expect(words[2].end).toBeCloseTo(12.4, 6);

    // ── 5-6. Aucun curseur de frase n'a bougé, aucune autre frase n'a changé ───
    const committed = lines0.map((l, i) => (i === idx
      ? applyWordEditorResult(l, {
        changed: true, words, phraseStart, phraseEnd: inferredEnd, startEdited: false, endEdited: false,
      })
      : l));
    expect(phraseSnapshot(committed)).toEqual(PHRASES);

    // ── 7-8. Enregistrement de l'édition de mots puis de la chanson ───────────
    const saved = buildTimingPayload(committed);
    expect(saved.timing_mode).toBe('hybrid');
    expect(saved.timing_data).not.toBeNull();
    row = { ...row, ...saved };

    // ── 9-10. Rechargement : les timings de frase sont IDENTIQUES ─────────────
    const reloaded = loadEditorLines(row);
    expect(resolveSongTiming(row).source).toBe('structured');
    expect(phraseSnapshot(reloaded)).toEqual(PHRASES);
    expect(reloaded[idx].words).toEqual(words);

    // ── Réouverture sans rien toucher : strictement rien ne change ────────────
    const reopened = loadStudioWords(reloaded[idx].words, reloaded[idx].time, reloaded[1].time);
    expect(reopened.repaired).toBe(false);
    expect(reopened.words).toBe(reloaded[idx].words);
    expect(applyWordEditorResult(reloaded[idx], { changed: false })).toBe(reloaded[idx]);
    expect(buildTimingPayload(reloaded)).toEqual(saved);

    // ── 11. Retrait du timing par mot (« Voltar para sincronização por frase ») ─
    const phraseOnly = reloaded.map(({ words: _w, ...rest }) => rest);
    phraseOnly[idx].time = 10.4; // + une correction de frase, pour prouver qu'elle prend

    // ── 12. Sauvegarde et rechargement ───────────────────────────────────────
    const cleared = buildTimingPayload(phraseOnly);
    expect(cleared).toHaveProperty('timing_data');
    expect(cleared.timing_data).toBeNull();
    expect(cleared.timing_mode).toBe('line');
    row = { ...row, ...cleared };

    // ── 13. Le timing structuré périmé ne commande plus rien ──────────────────
    expect(row.timing_data).toBeNull();
    expect(resolveSongTiming(row).source).toBe('lrc');
    expect(resolveSongTiming(row).lines[0].time).toBeCloseTo(10.4, 5);
    expect(parseLrc(row.lrc_content)[0].time).toBeCloseTo(10.4, 5);
    // Les autres frases sont intactes tout du long.
    expect(phraseSnapshot(loadEditorLines(row)).slice(1)).toEqual(PHRASES.slice(1));
  });

  it('le parent retrouve son clavier dès la fermeture du studio', () => {
    expect(isParentKeyboardActive({ step: 'sync', wordStudioOpen: false, isCalibrating: false })).toBe(true);
  });
});
