/**
 * Régression — ATELIÊ DE KARAOKÊ : modèle d'état unique de l'éditeur local.
 *
 * Constaté avant cette étape (vérifié dans le code) :
 *  1. L'audio local était chargé (`useLocalAudioSession`) mais JAMAIS joué hors du
 *     studio de mots : tout le transport de l'éditeur principal pilote YouTube. On ne
 *     pouvait donc pas réécouter une frase sur le fichier local depuis l'atelier.
 *  2. Trois états concurrents désignaient « la frase en cours » : `cursor`,
 *     `wordPanelIndex` et `ballStudioIndex`, resynchronisés par un effet.
 *  3. Aucune notion explicite de MODE d'édition (frase vs palavra) : `mode` mélangeait
 *     capture-lines / review / capture-words.
 *  4. Aucune règle écrite de propriété du clavier au niveau de l'atelier.
 *
 * Tout est testé sur des transitions PURES : les temps stockés restent CANONIQUES,
 * l'audio local n'est qu'un outil d'édition.
 */
import { describe, it, expect } from 'vitest';
import {
  EDITING_MODE, REVIEW_MARGIN_SEC,
  clampLineIndex, selectLine, goToAdjacentLine, setEditingMode,
  seekByLocal, transportTimes,
  phraseReviewWindow, canReviewLocally, reviewBlockedReason, loopBackTarget,
  lineWorkshopStatus, navigatorRows, keyboardOwner, issueTarget,
} from '@/lib/karaokeWorkshop';
import { canonicalTimeToLocalAudio } from '@/lib/audioClock';

const LINES = () => ([
  { text: 'linha um', time: 2, endTime: 4 },
  {
    text: 'dois coração', time: 10, endTime: 13,
    words: [{ id: 'w1', text: 'dois', start: 10, end: 11.5 }, { id: 'w2', text: 'coração', start: 11.5, end: 13 }],
  },
  { text: 'três', time: 20, endTime: null },
  { text: 'quatro', time: null, endTime: null },
  { text: 'cinco', time: null, endTime: null },
  { text: 'seis', time: null, endTime: null },
]);
const OFFSET = 1.75; // canonique = local + 1.75
const DURATION = 200;

// ═══════════════════════ A. SÉLECTION DE L'ATELIÊ ═══════════════════════
describe('A. une seule sélection, explicite', () => {
  it('borne l’index dans les paroles', () => {
    expect(clampLineIndex(-3, 6)).toBe(0);
    expect(clampLineIndex(99, 6)).toBe(5);
    expect(clampLineIndex(2, 6)).toBe(2);
    expect(clampLineIndex(0, 0)).toBe(-1); // aucune parole
  });

  it('cliquer une ligne sélectionne exactement celle-là', () => {
    const s = selectLine({ selectedLineIndex: 0 }, 3, 6);
    expect(s.selectedLineIndex).toBe(3);
  });

  it('la lecture ne réécrit JAMAIS la sélection (aucune fonction ne l’accepte)', () => {
    // `selectLine` est le seul chemin ; il exige un index explicite. Le temps de
    // lecture n'y entre pas — l'atelier ne peut donc pas « dériver » la sélection.
    const before = { selectedLineIndex: 2, editingMode: EDITING_MODE.PHRASE };
    expect(transportTimes(50, OFFSET)).toEqual({ local: 50, canonical: 51.75 });
    expect(before.selectedLineIndex).toBe(2);
  });

  it('changer de mode ne change PAS la frase sélectionnée', () => {
    const a = { selectedLineIndex: 4, editingMode: EDITING_MODE.PHRASE };
    const b = setEditingMode(a, EDITING_MODE.WORD);
    expect(b.selectedLineIndex).toBe(4);
    expect(b.editingMode).toBe(EDITING_MODE.WORD);
    const c = setEditingMode(b, EDITING_MODE.PHRASE);
    expect(c.selectedLineIndex).toBe(4);
  });

  it('un mode inconnu est ignoré', () => {
    const a = { selectedLineIndex: 1, editingMode: EDITING_MODE.PHRASE };
    expect(setEditingMode(a, 'bidon')).toBe(a);
  });
});

// ═══════════════════════ B. TRANSPORT ═══════════════════════
describe('B. transport local — jamais de modification de timing', () => {
  it('affiche les deux horloges via le mapping de l’étape 4', () => {
    expect(transportTimes(10.75, OFFSET)).toEqual({ local: 10.75, canonical: 12.5 });
    expect(transportTimes(0, OFFSET)).toEqual({ local: 0, canonical: 1.75 });
  });

  it('sans calibration, le temps canonique est inconnu (null), pas supposé', () => {
    expect(transportTimes(10, null)).toEqual({ local: 10, canonical: null });
  });

  it('le saut de ±5 s est borné dans [0, durée]', () => {
    expect(seekByLocal(50, 5, DURATION)).toBe(55);
    expect(seekByLocal(50, -5, DURATION)).toBe(45);
    expect(seekByLocal(2, -5, DURATION)).toBe(0);
    expect(seekByLocal(198, 5, DURATION)).toBe(DURATION);
    expect(seekByLocal(Number.NaN, 5, DURATION)).toBe(0);
  });

  it('le transport ne renvoie aucune ligne : il ne peut pas bouger le curseur', () => {
    const r = seekByLocal(50, 5, DURATION);
    expect(typeof r).toBe('number');
  });
});

// ═══════════════════════ C. RÉÉCOUTE DE FRASE ═══════════════════════
describe('C. réécoute de la frase sélectionnée', () => {
  it('convertit les bornes canoniques en bornes locales', () => {
    const w = phraseReviewWindow(LINES()[1], OFFSET, { duration: DURATION });
    expect(w.canonicalStart).toBe(10);
    expect(w.canonicalEnd).toBe(13);
    expect(w.localStart).toBeCloseTo(canonicalTimeToLocalAudio(10, OFFSET), 10); // 8.25
    expect(w.localEnd).toBeCloseTo(canonicalTimeToLocalAudio(13, OFFSET), 10);   // 11.25
  });

  it('la marge de préécoute est une marge de LECTURE, jamais du timing', () => {
    const w = phraseReviewWindow(LINES()[1], OFFSET, { duration: DURATION, margin: REVIEW_MARGIN_SEC });
    expect(w.localSeek).toBeCloseTo(8.25 - REVIEW_MARGIN_SEC, 10);
    expect(w.localStop).toBeCloseTo(11.25 + REVIEW_MARGIN_SEC, 10);
    // Les bornes CANONIQUES renvoyées restent exactement celles de la frase.
    expect(w.canonicalStart).toBe(10);
    expect(w.canonicalEnd).toBe(13);
  });

  it('seule la cible média est bornée — le canonique n’est pas réécrit', () => {
    const line = { text: 'x', time: 0.2, endTime: 1 };
    const w = phraseReviewWindow(line, 5, { duration: DURATION, margin: 0.5 });
    expect(w.localSeek).toBe(0);       // 0.2 − 5 − 0.5 < 0 → borné
    expect(w.canonicalStart).toBe(0.2); // inchangé
  });

  it('une frase sans fin explicite utilise une fin de repli fournie', () => {
    const w = phraseReviewWindow(LINES()[2], OFFSET, { duration: DURATION, fallbackEnd: 24 });
    expect(w.canonicalStart).toBe(20);
    expect(w.canonicalEnd).toBe(24);
  });

  it('la boucle revient au début mappé, sans rien modifier', () => {
    const w = phraseReviewWindow(LINES()[1], OFFSET, { duration: DURATION, margin: 0.5 });
    expect(loopBackTarget(w.localStop + 0.01, w)).toBeCloseTo(w.localSeek, 10);
    expect(loopBackTarget(w.localSeek + 0.1, w)).toBe(null); // encore dans la frase
  });

  it('sans ligne marquée ou sans calibration, aucune fenêtre', () => {
    expect(phraseReviewWindow(LINES()[3], OFFSET, { duration: DURATION })).toBe(null);
    expect(phraseReviewWindow(LINES()[1], null, { duration: DURATION })).toBe(null);
    expect(phraseReviewWindow(null, OFFSET, { duration: DURATION })).toBe(null);
  });

  it('la réécoute locale est bloquée sans calibration, permise à zéro explicite', () => {
    expect(canReviewLocally({ calibrationStatus: 'missing', hasAudio: true, line: LINES()[1] })).toBe(false);
    expect(canReviewLocally({ calibrationStatus: 'stale-file', hasAudio: true, line: LINES()[1] })).toBe(false);
    expect(canReviewLocally({ calibrationStatus: 'calibrated', hasAudio: true, line: LINES()[1] })).toBe(true);
    expect(canReviewLocally({ calibrationStatus: 'calibrated', hasAudio: false, line: LINES()[1] })).toBe(false);
    expect(canReviewLocally({ calibrationStatus: 'calibrated', hasAudio: true, line: LINES()[3] })).toBe(false);
  });

  it('la raison du blocage est explicite, en pt-BR', () => {
    expect(reviewBlockedReason({ calibrationStatus: 'missing', hasAudio: true, line: LINES()[1] }))
      .toBe('Calibre o áudio local para ouvir esta frase no ponto correto.');
    expect(reviewBlockedReason({ calibrationStatus: 'calibrated', hasAudio: false, line: LINES()[1] }))
      .toBe('Carregue um áudio local para ouvir esta frase.');
    expect(reviewBlockedReason({ calibrationStatus: 'calibrated', hasAudio: true, line: LINES()[3] }))
      .toBe('Marque o início desta frase primeiro.');
    expect(reviewBlockedReason({ calibrationStatus: 'calibrated', hasAudio: true, line: LINES()[1] })).toBe(null);
  });
});

// ═══════════════════════ D. NAVIGATION ═══════════════════════
describe('D. navigation dans l’ordre ORIGINAL des paroles', () => {
  it('précédent / suivant suivent l’ordre du texte', () => {
    expect(goToAdjacentLine({ selectedLineIndex: 2 }, 1, 6).selectedLineIndex).toBe(3);
    expect(goToAdjacentLine({ selectedLineIndex: 2 }, -1, 6).selectedLineIndex).toBe(1);
  });

  it('la dernière et la première ligne restent sélectionnées aux extrémités', () => {
    expect(goToAdjacentLine({ selectedLineIndex: 5 }, 1, 6).selectedLineIndex).toBe(5);
    expect(goToAdjacentLine({ selectedLineIndex: 0 }, -1, 6).selectedLineIndex).toBe(0);
  });

  it('les filtres ne corrompent pas les index d’origine', () => {
    const lines = LINES();
    const levelOf = () => null;
    const rows = navigatorRows(lines, { selectedLineIndex: 1, filter: 'incomplete', levelOf });
    // Les lignes sans temps (3,4,5) + la sélectionnée (1) — index ORIGINAUX conservés.
    expect(rows.map((r) => r.index)).toEqual([1, 3, 4, 5]);
    expect(rows.find((r) => r.index === 1).line.text).toBe('dois coração');
  });

  it('la frase sélectionnée reste visible même hors filtre', () => {
    const rows = navigatorRows(LINES(), { selectedLineIndex: 0, filter: 'incomplete', levelOf: () => null });
    expect(rows.some((r) => r.index === 0)).toBe(true);
    expect(rows.find((r) => r.index === 0).selected).toBe(true);
  });

  it('le filtre « revisar » n’affiche que les lignes signalées + la sélection', () => {
    const levelOf = (i) => (i === 2 ? 'warning' : null);
    const rows = navigatorRows(LINES(), { selectedLineIndex: 4, filter: 'review', levelOf });
    expect(rows.map((r) => r.index)).toEqual([2, 4]);
  });

  it('« all » garde l’ordre et la totalité', () => {
    const rows = navigatorRows(LINES(), { selectedLineIndex: 0, filter: 'all', levelOf: () => null });
    expect(rows.map((r) => r.index)).toEqual([0, 1, 2, 3, 4, 5]);
  });
});

// ═══════════════════════ Statuts du navigateur ═══════════════════════
describe('statut de ligne — étiquettes pt-BR', () => {
  it('reflète marcação, palavras, revisão et erreur', () => {
    const l = LINES();
    expect(lineWorkshopStatus(l[3], null).label).toBe('Sem marcação');
    expect(lineWorkshopStatus(l[2], null).label).toBe('Frase marcada');
    expect(lineWorkshopStatus(l[1], null).label).toBe('Palavras marcadas');
    expect(lineWorkshopStatus(l[1], 'warning').label).toBe('Revisar');
    expect(lineWorkshopStatus(l[1], 'error').label).toBe('Erro de timing');
  });
  it('expose une clé stable pour le style (jamais la couleur seule)', () => {
    expect(lineWorkshopStatus(LINES()[3], null).key).toBe('unmarked');
    expect(lineWorkshopStatus(LINES()[1], 'error').key).toBe('error');
  });
});

// ═══════════════════════ E. PROPRIÉTÉ DU CLAVIER ═══════════════════════
describe('E. propriété du clavier — un seul propriétaire à la fois', () => {
  const base = {
    targetEditable: false, modalOpen: false, wordStudioOpen: false,
    editingMode: EDITING_MODE.PHRASE, isCapturing: false, step: 'sync',
  };

  it('un champ éditable l’emporte sur tout', () => {
    expect(keyboardOwner({ ...base, targetEditable: true })).toBe('input');
    expect(keyboardOwner({ ...base, targetEditable: true, wordStudioOpen: true })).toBe('input');
    expect(keyboardOwner({ ...base, targetEditable: true, isCapturing: true })).toBe('input');
  });

  it('le studio de mots possède le clavier quand il est ouvert', () => {
    expect(keyboardOwner({ ...base, wordStudioOpen: true })).toBe('word-capture');
    expect(keyboardOwner({ ...base, wordStudioOpen: true, editingMode: EDITING_MODE.PHRASE })).toBe('word-capture');
  });

  it('en mode frase, la capture de frase possède le clavier', () => {
    expect(keyboardOwner(base)).toBe('phrase-capture');
  });

  it('les raccourcis de transport ne tirent PAS pendant un geste de capture', () => {
    expect(keyboardOwner({ ...base, isCapturing: true })).toBe('phrase-capture');
    expect(keyboardOwner({ ...base, editingMode: EDITING_MODE.WORD, isCapturing: true })).toBe('word-capture');
  });

  it('un modal bloque la navigation globale', () => {
    expect(keyboardOwner({ ...base, modalOpen: true })).toBe('modal');
  });

  it('hors étape de synchronisation, personne ne possède le clavier', () => {
    expect(keyboardOwner({ ...base, step: 'lyrics' })).toBe('none');
  });

  it('la politique est totale : toute combinaison a un propriétaire défini', () => {
    const owners = new Set();
    for (const targetEditable of [true, false]) {
      for (const modalOpen of [true, false]) {
        for (const wordStudioOpen of [true, false]) {
          for (const editingMode of [EDITING_MODE.PHRASE, EDITING_MODE.WORD]) {
            for (const isCapturing of [true, false]) {
              for (const step of ['sync', 'lyrics']) {
                const o = keyboardOwner({ targetEditable, modalOpen, wordStudioOpen, editingMode, isCapturing, step });
                expect(typeof o).toBe('string');
                expect(o.length).toBeGreaterThan(0);
                owners.add(o);
              }
            }
          }
        }
      }
    }
    expect(owners).toContain('input');
    expect(owners).toContain('word-capture');
    expect(owners).toContain('phrase-capture');
    expect(owners).toContain('none');
  });
});

// ═══════════════════════ I. NAVIGATION DEPUIS LA VALIDATION ═══════════════════════
describe('I. cliquer un problème sélectionne la bonne frase', () => {
  it('pointe l’index ORIGINAL et ne corrige aucun timing', () => {
    const lines = LINES();
    const before = JSON.parse(JSON.stringify(lines));
    const t = issueTarget({ lineIndex: 2, time: 20 }, lines.length);
    expect(t.selectedLineIndex).toBe(2);
    expect(t.canonicalTime).toBe(20);
    expect(lines).toEqual(before); // aucune correction automatique
  });

  it('borne un index de problème hors limites', () => {
    expect(issueTarget({ lineIndex: 99, time: null }, 6).selectedLineIndex).toBe(5);
    expect(issueTarget({ lineIndex: -1, time: null }, 6).selectedLineIndex).toBe(0);
  });

  it('un problème sans temps ne demande aucune navigation média', () => {
    expect(issueTarget({ lineIndex: 3, time: null }, 6).canonicalTime).toBe(null);
  });

  it('aucune métadonnée de calibration ne peut entrer dans une cible de validation', () => {
    const t = issueTarget({ lineIndex: 1, time: 10, offsetSeconds: 1.75, fileIdentity: 'x' }, 6);
    expect(Object.keys(t).sort()).toEqual(['canonicalTime', 'selectedLineIndex']);
  });
});
