/**
 * Régression — INVARIANTS de l'éditeur de synchronisation karaokê.
 *
 * Couvre les trois causes racines confirmées par l'audit :
 *   1. propriété EXCLUSIVE du clavier quand le studio de mots est ouvert ;
 *   2. `timing_data` périmé qui continue d'écraser un `lrc_content` corrigé ;
 *   3. commit du studio de mots qui touche aux bornes de frase.
 *
 * Tout est testé sur des fonctions PURES (`@/lib/karaokeSyncContract`) — pas de rendu
 * de KaraokeSyncTool (3468 lignes, YouTube IFrame + Supabase + IndexedDB), qui serait
 * fragile sans rien prouver de plus sur ces invariants-là.
 */
import { describe, it, expect } from 'vitest';
import {
  PHRASE_ONLY_TIMING_MODE,
  isParentKeyboardActive,
  buildTimingPayload,
  buildRestoreTimingPayload,
  applyWordEditorResult,
} from '@/lib/karaokeSyncContract';
import { capInferredLastEnd, wordsAreValid } from '@/lib/ballMotion';
import { resolveSongTiming } from '@/lib/timingModel';

// ── Échantillon anonymisé : 3 frases, la 1re sans `endTime` explicite ──
const editorLines = () => ([
  { text: 'aaa bbb ccc', time: 10, endTime: null },
  { text: 'ddd eee', time: 13, endTime: 15.5 },
  { text: 'fff ggg', time: 20, endTime: 22 },
]);
const WORDS = Object.freeze([
  { id: 'w1', text: 'aaa', start: 10, end: 10.8 },
  { id: 'w2', text: 'bbb', start: 10.8, end: 11.6 },
  { id: 'w3', text: 'ccc', start: 11.6, end: 12 },
]);

// ═══════════════════════ A. PROPRIÉTÉ DU CLAVIER ═══════════════════════
describe('A. propriété exclusive du clavier', () => {
  const base = { step: 'sync', wordStudioOpen: false, isCalibrating: false };

  it('le parent écoute pendant la synchronisation normale', () => {
    expect(isParentKeyboardActive(base)).toBe(true);
  });

  it("le parent N'écoute PAS tant que le studio de mots est ouvert", () => {
    // Un seul point de décision : si le parent n'enregistre aucun écouteur, alors
    // Espaço (markLineStart/markLineEnd), Backspace/Ctrl+Z (undo), Escape (fermeture
    // de l'éditeur complet) et les raccourcis de lecture (k/p/s/←) sont TOUS
    // structurellement inactifs — il n'existe aucun autre chemin vers eux.
    expect(isParentKeyboardActive({ ...base, wordStudioOpen: true })).toBe(false);
  });

  it('le parent n’écoute pas pendant la calibration de latence', () => {
    expect(isParentKeyboardActive({ ...base, isCalibrating: true })).toBe(false);
  });

  it("le parent n'écoute pas avant l'étape de synchronisation", () => {
    expect(isParentKeyboardActive({ ...base, step: 'lyrics' })).toBe(false);
  });

  it('le studio l’emporte sur tout autre état', () => {
    for (const step of ['sync', 'lyrics']) {
      for (const isCalibrating of [true, false]) {
        expect(isParentKeyboardActive({ step, wordStudioOpen: true, isCalibrating })).toBe(false);
      }
    }
  });

  it('rend la main dès que le studio se referme (aucun état collant)', () => {
    expect(isParentKeyboardActive({ ...base, wordStudioOpen: true })).toBe(false);
    expect(isParentKeyboardActive({ ...base, wordStudioOpen: false })).toBe(true);
  });

  it('tolère un argument absent ou partiel sans réactiver le parent par accident', () => {
    expect(isParentKeyboardActive()).toBe(false);
    expect(isParentKeyboardActive({})).toBe(false);
  });
});

// ═══════════════════════ B. INVARIANCE DES FRASES ═══════════════════════
describe('B. invariance du timing de frase', () => {
  it('ouvrir puis refermer sans modification ne change RIEN (même référence)', () => {
    const line = { ...editorLines()[0], words: [...WORDS] };
    const out = applyWordEditorResult(line, {
      changed: false, words: [...WORDS], phraseStart: 10, phraseEnd: 20,
      startEdited: false, endEdited: false,
    });
    expect(out).toBe(line); // identité → l'éditeur ne devient pas « sale »
  });

  it('un commit sans changement de bornes préserve start/end au bit près', () => {
    const line = { ...editorLines()[0], words: [...WORDS] };
    const moved = WORDS.map((w, i) => (i === 1 ? { ...w, start: 10.9, end: 11.6 } : w));
    const out = applyWordEditorResult(line, {
      changed: true, words: moved, phraseStart: 10, phraseEnd: 20,
      startEdited: false, endEdited: false,
    });
    expect(out.time).toBe(10);
    expect(out.endTime).toBe(null);
    expect(out.words).toEqual(moved);
  });

  it('préserve l’ordre des lignes et des mots', () => {
    // Mots cohérents avec la ligne 1 (13 → 15.5), sinon ils seraient — à raison — rejetés.
    const words = [
      { id: 'w1', text: 'ddd', start: 13, end: 14.2 },
      { id: 'w2', text: 'eee', start: 14.2, end: 15.5 },
    ];
    const line = { ...editorLines()[1], words };
    const out = applyWordEditorResult(line, {
      changed: true, words, phraseStart: 13, phraseEnd: 15.5,
      startEdited: false, endEdited: false,
    });
    expect(out.words.map((w) => w.text)).toEqual(['ddd', 'eee']);
    expect(out.text).toBe('ddd eee');
  });
});

// ═══════════════════════ C. MISE À JOUR MOTS SEULS ═══════════════════════
describe('C. mise à jour des mots uniquement', () => {
  it('n’applique le début de frase que si startEdited === true', () => {
    const line = { ...editorLines()[1], words: [...WORDS] };
    expect(applyWordEditorResult(line, {
      changed: true, words: [...WORDS], phraseStart: 99, phraseEnd: 15.5, startEdited: false, endEdited: false,
    }).time).toBe(13);
    expect(applyWordEditorResult(line, {
      changed: true, words: [...WORDS], phraseStart: 12.5, phraseEnd: 15.5, startEdited: true, endEdited: false,
    }).time).toBe(12.5);
  });

  it('n’applique la fin de frase que si endEdited === true', () => {
    const line = { ...editorLines()[1], words: [...WORDS] };
    expect(applyWordEditorResult(line, {
      changed: true, words: [...WORDS], phraseStart: 13, phraseEnd: 99, startEdited: false, endEdited: false,
    }).endTime).toBe(15.5);
    expect(applyWordEditorResult(line, {
      changed: true, words: [...WORDS], phraseStart: 13, phraseEnd: 16.25, startEdited: false, endEdited: true,
    }).endTime).toBe(16.25);
  });

  it('ne recalcule JAMAIS les bornes de frase à partir des mots', () => {
    const line = { text: 'aaa bbb ccc', time: 10, endTime: 12.5, words: [...WORDS] };
    // Mots resserrés bien à l'intérieur de la frase : la frase ne doit pas rétrécir.
    const tight = [
      { id: 'w1', text: 'aaa', start: 10.5, end: 10.9 },
      { id: 'w2', text: 'bbb', start: 10.9, end: 11.2 },
      { id: 'w3', text: 'ccc', start: 11.2, end: 11.4 },
    ];
    const out = applyWordEditorResult(line, {
      changed: true, words: tight, phraseStart: 10, phraseEnd: 12.5, startEdited: false, endEdited: false,
    });
    expect(out.time).toBe(10);
    expect(out.endTime).toBe(12.5);
  });

  it('rejette une borne éditée invalide plutôt que de corrompre la frase', () => {
    const line = { ...editorLines()[1], words: [...WORDS] };
    // fin ≤ début → refusée
    expect(applyWordEditorResult(line, {
      changed: true, words: [...WORDS], phraseStart: 13, phraseEnd: 12, startEdited: false, endEdited: true,
    }).endTime).toBe(15.5);
    // début négatif / non fini → refusé
    expect(applyWordEditorResult(line, {
      changed: true, words: [...WORDS], phraseStart: Number.NaN, phraseEnd: 15.5, startEdited: true, endEdited: false,
    }).time).toBe(13);
    expect(applyWordEditorResult(line, {
      changed: true, words: [...WORDS], phraseStart: -3, phraseEnd: 15.5, startEdited: true, endEdited: false,
    }).time).toBe(13);
  });

  it('omet des mots invalides sans toucher à la frase (reste jouable en mode frase)', () => {
    const line = { text: 'ddd eee', time: 13, endTime: 15.5 };
    const out = applyWordEditorResult(line, {
      changed: true,
      words: [{ id: 'w1', text: 'ddd', start: Number.NaN, end: 14 }, { id: 'w2', text: 'eee', start: 14, end: 15 }],
      phraseStart: 13, phraseEnd: 15.5, startEdited: false, endEdited: false,
    });
    expect(out.words).toBeUndefined();
    expect(out.time).toBe(13);
    expect(out.endTime).toBe(15.5);
  });

  it('un tableau de mots vide retire le mode mot sans abîmer la frase', () => {
    const line = { text: 'ddd eee', time: 13, endTime: 15.5, words: [...WORDS] };
    const out = applyWordEditorResult(line, {
      changed: true, words: [], phraseStart: 13, phraseEnd: 15.5, startEdited: false, endEdited: false,
    });
    expect(out.words).toBeUndefined();
    expect(out.time).toBe(13);
    expect(out.endTime).toBe(15.5);
  });
});

// ═══════════ Bornes inférées jamais persistées comme fin de mot ═══════════
describe('capInferredLastEnd — la fin INFÉRÉE ne devient pas une donnée', () => {
  it('ramène le dernier mot à sa fin stockée quand la frase n’a pas de fin explicite', () => {
    const stretched = [...WORDS.slice(0, 2), { ...WORDS[2], end: 20 }];
    expect(capInferredLastEnd(stretched, 12)[2].end).toBe(12);
  });
  it('laisse passer une fin légitimement plus courte', () => {
    const shorter = [...WORDS.slice(0, 2), { ...WORDS[2], end: 11.8 }];
    expect(capInferredLastEnd(shorter, 12)[2].end).toBe(11.8);
  });
  it('ne descend jamais sous le début du mot', () => {
    const moved = [...WORDS.slice(0, 2), { ...WORDS[2], start: 12.4, end: 20 }];
    expect(capInferredLastEnd(moved, 12)[2].end).toBeGreaterThan(12.4);
  });
  it('sans repère stocké, ne touche à rien', () => {
    expect(capInferredLastEnd(WORDS, null)).toBe(WORDS);
    expect(capInferredLastEnd([], 12)).toEqual([]);
  });
});

// ═══════════════════ D. RETRAIT DU TIMING PAR MOT ═══════════════════
describe('D. le passage en frase seule efface timing_data', () => {
  it('écrit timing_data + timing_mode quand des mots existent', () => {
    const lines = editorLines();
    lines[0].words = [...WORDS];
    const p = buildTimingPayload(lines);
    expect(p.timing_data).not.toBeNull();
    expect(p.timing_mode).toBe('hybrid');
    expect(p.lrc_content).toContain('[00:10.00]aaa bbb ccc');
  });

  it('écrit EXPLICITEMENT timing_data: null quand le dernier timing par mot est retiré', () => {
    const p = buildTimingPayload(editorLines()); // aucune ligne n'a de `words`
    expect(p).toHaveProperty('timing_data');     // la clé DOIT être présente dans le payload
    expect(p.timing_data).toBeNull();
    expect(p.timing_mode).toBe(PHRASE_ONLY_TIMING_MODE);
    expect(PHRASE_ONLY_TIMING_MODE).toBe('line'); // valeur du schéma (migration 20260712170000)
  });

  it('après un enregistrement en frase seule, lrc_content redevient la source', () => {
    const hybrid = editorLines();
    hybrid[0].words = [...WORDS];
    const saved = buildTimingPayload(hybrid);

    // L'admin retire le timing par mot puis corrige la frase, et ré-enregistre.
    const corrected = editorLines();
    corrected[0].time = 10.75;
    const p = buildTimingPayload(corrected);

    // La ligne en base part de l'état hybride ; le nouveau payload l'écrase.
    const rowBefore = { lrc_content: saved.lrc_content, timing_data: saved.timing_data };
    const rowAfter = { ...rowBefore, ...p };

    expect(resolveSongTiming(rowBefore).source).toBe('structured');
    expect(resolveSongTiming(rowAfter).source).toBe('lrc');
    expect(resolveSongTiming(rowAfter).lines[0].time).toBeCloseTo(10.75, 5);
  });

  it('un timing par mot conservé reste prioritaire', () => {
    const lines = editorLines();
    lines[0].words = [...WORDS];
    const p = buildTimingPayload(lines);
    expect(resolveSongTiming({ lrc_content: p.lrc_content, timing_data: p.timing_data }).source).toBe('structured');
  });
});

// ═══════════════════ E. RESTAURATION DE VERSION ═══════════════════
describe('E. restauration de version', () => {
  it('restaurer une version en frase seule efface le timing_data périmé', () => {
    const p = buildRestoreTimingPayload({
      lrc_content: '[00:10.00]aaa bbb ccc\n[00:13.00]ddd eee[00:15.50]',
      timing_data: null,
      timing_mode: 'line',
    });
    expect(p).toHaveProperty('timing_data');
    expect(p.timing_data).toBeNull();
    expect(p.timing_mode).toBe(PHRASE_ONLY_TIMING_MODE);
    expect(p.lines).toHaveLength(2);
    expect(p.lines[0].time).toBe(10);
  });

  it('restaurer une version avec mots réinstalle le timing structuré', () => {
    const lines = editorLines();
    lines[0].words = [...WORDS];
    const saved = buildTimingPayload(lines);
    const p = buildRestoreTimingPayload({
      lrc_content: saved.lrc_content, timing_data: saved.timing_data, timing_mode: saved.timing_mode,
    });
    expect(p.timing_data).not.toBeNull();
    expect(p.timing_mode).toBe('hybrid');
    expect(p.lines[0].words).toHaveLength(3);
  });

  it('une version corrompue retombe sur le LRC sans jeter d’exception', () => {
    const p = buildRestoreTimingPayload({ lrc_content: '[00:10.00]aaa', timing_data: { garbage: true } });
    expect(p.timing_data).toBeNull();
    expect(p.timing_mode).toBe(PHRASE_ONLY_TIMING_MODE);
    expect(p.lines[0].text).toBe('aaa');
  });
});

// ═══════════════════════ F. ALLER-RETOUR COMPLET ═══════════════════════
describe('F. aller-retour frase → mots → save → reload', () => {
  it('les timings de frase NON touchés sont identiques après le tour complet', () => {
    const before = editorLines();
    const beforeSnapshot = JSON.parse(JSON.stringify(before));

    // L'admin édite les mots de la ligne 0 (aucune borne de frase modifiée).
    const after = before.map((l, i) => (i === 0
      ? applyWordEditorResult(l, {
        changed: true, words: [...WORDS], phraseStart: 10, phraseEnd: 13,
        startEdited: false, endEdited: false,
      })
      : l));

    const payload = buildTimingPayload(after);
    const reloaded = resolveSongTiming({ lrc_content: payload.lrc_content, timing_data: payload.timing_data });

    expect(reloaded.source).toBe('structured');
    reloaded.lines.forEach((l, i) => {
      expect(l.time).toBe(beforeSnapshot[i].time);
      expect(l.endTime).toBe(beforeSnapshot[i].endTime);
      expect(l.text).toBe(beforeSnapshot[i].text);
    });
    expect(reloaded.lines[0].words).toEqual([...WORDS]);
    expect(reloaded.lines[1].words).toBeUndefined();
    expect(wordsAreValid(reloaded.lines[0].words, 10, 13)).toBe(true);
  });

  it('un aller-retour sans aucune modification est sans perte', () => {
    const lines = editorLines();
    lines[0].words = [...WORDS];
    const p1 = buildTimingPayload(lines);
    const back = resolveSongTiming({ lrc_content: p1.lrc_content, timing_data: p1.timing_data }).lines
      .map((l) => ({ text: l.text, time: l.time, endTime: l.endTime, ...(l.words ? { words: l.words } : {}) }));
    const p2 = buildTimingPayload(back);
    expect(p2.timing_data).toEqual(p1.timing_data);
    expect(p2.lrc_content).toBe(p1.lrc_content);
    expect(p2.timing_mode).toBe(p1.timing_mode);
  });
});
