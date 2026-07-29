/**
 * Régression — CAPTURE MANUELLE DES FRASES et enchaînement automatique.
 *
 * Problèmes constatés dans l'éditeur avant cette étape :
 *
 *  1. Le grand aperçu était dérivé de `currentTime` via `activeLineIndex()`, qui renvoie
 *     -1 dès qu'un `endTime` capté est dépassé (silence entre deux frases). Or
 *     `nextLine = lines[activeIdx + 1]` valait alors `lines[0]` : à CHAQUE trou, et donc
 *     juste après chaque relâchement d'Espaço, l'aperçu affichait la ligne 0 et la
 *     ligne 1 au lieu de la frase courante.
 *  2. `finishHold()` clôturait `cursorRef.current` — la ligne SÉLECTIONNÉE au
 *     relâchement — alors que le début avait été posé sur la ligne sélectionnée à
 *     l'appui. Le suivi automatique de lecture pouvant déplacer le curseur entre les
 *     deux, le relâchement pouvait clôturer une AUTRE ligne. Il n'existait aucun
 *     « propriétaire de capture » stable.
 *  3. La perte de focus de la fenêtre (le player YouTube prend le focus au clic)
 *     appelait `finishHold()`, ce qui écrivait une fin calculée sur une horloge qui
 *     continuait de tourner ET avançait le curseur.
 *  4. Le filtre « não sincronizadas » retirait la ligne de la liste à l'instant même
 *     où elle recevait son temps.
 *
 * Tout est testé sur des transitions d'état PURES (`@/lib/phraseCapture`) — pas de
 * rendu de KaraokeSyncTool (YouTube IFrame + Supabase + IndexedDB), qui serait fragile
 * sans rien prouver de plus sur ces transitions-là.
 */
import { describe, it, expect } from 'vitest';
import {
  initialSelectedIndex, beginCapture, completeCapture, cancelCapture,
  lyricContext, previewIndex, captureStatus, visibleWithSelected, shouldFollowPlayback,
} from '@/lib/phraseCapture';
import { isParentKeyboardActive } from '@/lib/karaokeSyncContract';

// 5 lignes : 0 et 1 déjà marquées (0 avec une fin captée → trou après elle), 2-4 vierges.
const LINES = () => ([
  { text: 'linha um', time: 5, endTime: 7 },
  { text: 'linha dois', time: 10, endTime: null },
  { text: 'linha três', time: null, endTime: null },
  { text: 'linha quatro', time: null, endTime: null },
  { text: 'linha cinco', time: null, endTime: null },
]);
const texts = (lines) => lines.map((l) => l.text);
const timings = (lines) => lines.map((l) => ({ time: l.time, endTime: l.endTime }));

// ═════════════════════════ A. SÉLECTION EXPLICITE ═════════════════════════
describe('A. la sélection est explicite, jamais vidée par un trou de lecture', () => {
  it('dans un trou entre deux frases, l’aperçu suit la ligne SÉLECTIONNÉE', () => {
    // activeLineIndex() renvoie -1 dans le silence après un endTime capté.
    expect(previewIndex({ mode: 'capture-lines', selectedIndex: 3, playbackActiveIndex: -1, lineCount: 5 })).toBe(3);
    // L'ancien code faisait lines[activeIdx + 1] = lines[0] → il montrait la ligne 0.
    expect(previewIndex({ mode: 'capture-lines', selectedIndex: 3, playbackActiveIndex: -1, lineCount: 5 })).not.toBe(0);
  });

  it('l’écran de capture n’est jamais vide tant qu’il y a des paroles', () => {
    for (const playbackActiveIndex of [-1, 0, 4]) {
      for (const mode of ['capture-lines', 'review']) {
        const idx = previewIndex({ mode, selectedIndex: 2, playbackActiveIndex, lineCount: 5 });
        expect(idx).toBeGreaterThanOrEqual(0);
        expect(idx).toBeLessThan(5);
      }
    }
    expect(previewIndex({ mode: 'capture-lines', selectedIndex: 0, playbackActiveIndex: -1, lineCount: 0 })).toBe(-1);
  });

  it('en mode revisão, la lecture pilote l’aperçu — mais retombe sur la sélection dans un trou', () => {
    expect(previewIndex({ mode: 'review', selectedIndex: 2, playbackActiveIndex: 4, lineCount: 5 })).toBe(4);
    expect(previewIndex({ mode: 'review', selectedIndex: 2, playbackActiveIndex: -1, lineCount: 5 })).toBe(2);
  });

  it('sélection initiale = 1re ligne non marquée, sinon la dernière', () => {
    expect(initialSelectedIndex(LINES())).toBe(2);
    expect(initialSelectedIndex(LINES().map((l) => ({ ...l, time: 1 })))).toBe(4);
    expect(initialSelectedIndex([])).toBe(0);
  });
});

// ═════════════════════════ B. APPUI (KEYDOWN) ═════════════════════════
describe('B. le keydown démarre la capture une seule fois', () => {
  it('pose le début sur la ligne sélectionnée et ne bouge PAS le curseur', () => {
    const lines = LINES();
    const r = beginCapture(lines, 2, 21.5);
    expect(r.owner).toEqual({ index: 2, start: 21.5, prevTime: null, prevEndTime: null, prevWords: undefined });
    expect(r.lines[2].time).toBe(21.5);
    expect(r.lines[2].endTime).toBe(null);
    expect(r.selectedIndex).toBe(2); // le curseur n'avance qu'au relâchement
  });

  it('ne modifie AUCUNE autre ligne', () => {
    const lines = LINES();
    const r = beginCapture(lines, 2, 21.5);
    expect(timings(r.lines).filter((_, i) => i !== 2)).toEqual(timings(lines).filter((_, i) => i !== 2));
    expect(texts(r.lines)).toEqual(texts(lines));
  });

  it('refuse un index hors bornes sans rien casser', () => {
    expect(beginCapture(LINES(), -1, 5)).toBeNull();
    expect(beginCapture(LINES(), 9, 5)).toBeNull();
    expect(beginCapture([], 0, 5)).toBeNull();
  });

  it('mémorise l’ancien timing pour pouvoir annuler une capture avortée', () => {
    const r = beginCapture(LINES(), 0, 30); // la ligne 0 était déjà marquée 5 → 7
    expect(r.owner.prevTime).toBe(5);
    expect(r.owner.prevEndTime).toBe(7);
  });
});

// ═════════════════════════ C. RELÂCHEMENT (KEYUP) ═════════════════════════
describe('C. le keyup clôture une fois et avance d’un cran', () => {
  it('la MÊME ligne reçoit début et fin, et le curseur avance exactement une fois', () => {
    const begun = beginCapture(LINES(), 2, 21.5);
    const done = completeCapture(begun.lines, begun.owner, 24);
    expect(done.lines[2]).toMatchObject({ time: 21.5, endTime: 24 });
    expect(done.selectedIndex).toBe(3);
    expect(done.completed).toBe(true);
  });

  it('les lignes non concernées restent identiques au bit près', () => {
    const base = LINES();
    const begun = beginCapture(base, 2, 21.5);
    const done = completeCapture(begun.lines, begun.owner, 24);
    [0, 1, 3, 4].forEach((i) => expect(done.lines[i]).toEqual(base[i]));
  });

  it('un second keyup ne modifie plus rien (propriétaire déjà consommé)', () => {
    const begun = beginCapture(LINES(), 2, 21.5);
    const first = completeCapture(begun.lines, begun.owner, 24);
    const second = completeCapture(first.lines, null, 25);
    expect(second.lines).toBe(first.lines);
    expect(second.completed).toBe(false);
    expect(second.selectedIndex).toBe(null);
  });

  it('une fin ≤ début laisse endTime à null mais avance quand même (toque très bref)', () => {
    const begun = beginCapture(LINES(), 2, 21.5);
    const done = completeCapture(begun.lines, begun.owner, 21.5);
    expect(done.lines[2].time).toBe(21.5);
    expect(done.lines[2].endTime).toBe(null);
    expect(done.selectedIndex).toBe(3);
  });
});

// ═════════════════ D. PROPRIÉTAIRE DE CAPTURE STABLE ═════════════════
describe('D. protection contre un index périmé entre keydown et keyup', () => {
  it('clôture la ligne qui possédait la capture, PAS celle sélectionnée après rerender', () => {
    const begun = beginCapture(LINES(), 2, 21.5);
    // Entre-temps, le suivi automatique de lecture déplace la sélection sur la ligne 0.
    const done = completeCapture(begun.lines, begun.owner, 24);
    expect(done.lines[2].endTime).toBe(24);
    expect(done.lines[0]).toEqual(LINES()[0]); // la ligne 0 est intacte
    expect(done.selectedIndex).toBe(3);        // on repart de la ligne CAPTURÉE + 1
  });

  it('le propriétaire porte son propre index — il ne relit aucun état courant', () => {
    const begun = beginCapture(LINES(), 1, 12);
    expect(begun.owner.index).toBe(1);
    const done = completeCapture(begun.lines, begun.owner, 15);
    expect(done.lines[1].endTime).toBe(15);
    expect(done.selectedIndex).toBe(2);
  });
});

// ═════════════════════════ E. CONTEXTE 3 LIGNES ═════════════════════════
describe('E. contexte précédent / courant / suivant', () => {
  it('au milieu, le contexte suit l’ordre des paroles', () => {
    const c = lyricContext(LINES(), 2);
    expect([c.prevIndex, c.currentIndex, c.nextIndex]).toEqual([1, 2, 3]);
    expect(c.current.text).toBe('linha três');
  });

  it('après une capture, la ligne finie devient « précédente » et la suivante « courante »', () => {
    const begun = beginCapture(LINES(), 2, 21.5);
    const done = completeCapture(begun.lines, begun.owner, 24);
    const c = lyricContext(done.lines, done.selectedIndex);
    expect(c.prev.text).toBe('linha três');   // celle qu'on vient de marquer
    expect(c.current.text).toBe('linha quatro');
    expect(c.next.text).toBe('linha cinco');
    expect(c.prev.time).toBe(21.5);           // elle garde son timing, elle n'a pas disparu
  });

  it('le contexte NE dépend PAS d’une liste filtrée sur les lignes non marquées', () => {
    // Toutes marquées : le contexte reste exact (l'ancienne liste filtrée « não
    // sincronizadas » se vidait et faisait disparaître la ligne juste capturée).
    const allTimed = LINES().map((l, i) => ({ ...l, time: i * 5 + 1, endTime: i * 5 + 3 }));
    const c = lyricContext(allTimed, 2);
    expect([c.prevIndex, c.currentIndex, c.nextIndex]).toEqual([1, 2, 3]);
  });

  it('la ligne sélectionnée reste visible quel que soit le filtre', () => {
    expect(visibleWithSelected([0, 1], 4)).toEqual([0, 1, 4]);
    expect(visibleWithSelected([0, 4], 4)).toEqual([0, 4]); // pas de doublon
    expect(visibleWithSelected([], -1)).toEqual([]);
  });
});

// ═════════════════════ F. PREMIÈRE ET DERNIÈRE LIGNE ═════════════════════
describe('F. bords de la liste', () => {
  it('sur la 1re ligne, « précédent » est absent mais courant/suivant existent', () => {
    const c = lyricContext(LINES(), 0);
    expect(c.prev).toBe(null);
    expect(c.prevIndex).toBe(-1);
    expect(c.current.text).toBe('linha um');
    expect(c.next.text).toBe('linha dois');
  });

  it('sur la DERNIÈRE ligne : timing posé, curseur borné, état « terminé »', () => {
    const lines = LINES().map((l, i) => (i < 4 ? { ...l, time: i + 1, endTime: i + 1.5 } : l));
    const begun = beginCapture(lines, 4, 30);
    const done = completeCapture(begun.lines, begun.owner, 33);
    expect(done.lines[4]).toMatchObject({ time: 30, endTime: 33 });
    expect(done.selectedIndex).toBe(4);   // reste dans les bornes, ne dépasse pas
    expect(done.atEnd).toBe(true);
    expect(done.allTimed).toBe(true);
    const c = lyricContext(done.lines, done.selectedIndex);
    expect(c.next).toBe(null);            // pas de ligne suivante inventée
    expect(c.current.text).toBe('linha cinco');
  });

  it('un contexte hors bornes ne jette pas d’exception', () => {
    expect(() => lyricContext(LINES(), 99)).not.toThrow();
    expect(lyricContext(LINES(), 99).current).toBe(null);
    expect(lyricContext([], 0).current).toBe(null);
  });

  it('l’étiquette d’état reflète les quatre situations', () => {
    expect(captureStatus({ mode: 'capture-lines', isCapturing: false, allTimed: false })).toBe('Pronto para marcar');
    expect(captureStatus({ mode: 'capture-lines', isCapturing: true, allTimed: false })).toBe('Marcando frase…');
    expect(captureStatus({ mode: 'capture-lines', isCapturing: false, allTimed: true })).toBe('Sincronização concluída');
    expect(captureStatus({ mode: 'review', isCapturing: false, allTimed: false })).toBe('Modo revisão');
  });
});

// ═════════════════════ G. INDÉPENDANCE DE LA LECTURE ═════════════════════
describe('G. lecture et curseur d’édition sont deux notions séparées', () => {
  it('faire varier currentTime ne change pas la sélection en mode capture', () => {
    const selectedIndex = 2;
    for (const playbackActiveIndex of [-1, 0, 1, 3, 4]) {
      expect(previewIndex({ mode: 'capture-lines', selectedIndex, playbackActiveIndex, lineCount: 5 })).toBe(selectedIndex);
    }
  });

  it('le suivi automatique est neutralisé pendant une session de capture manuelle', () => {
    expect(shouldFollowPlayback({ mode: 'capture-lines', isCapturing: false })).toBe(false);
    expect(shouldFollowPlayback({ mode: 'capture-lines', isCapturing: true })).toBe(false);
    expect(shouldFollowPlayback({ mode: 'review', isCapturing: false })).toBe(true);
    expect(shouldFollowPlayback({ mode: 'review', isCapturing: true })).toBe(false);
  });
});

// ═════════════════════════ H. SÉLECTION AU CLIC ═════════════════════════
describe('H. cliquer une ligne sélectionne exactement cette ligne', () => {
  it('ne change pas le timing déjà présent', () => {
    const lines = LINES();
    const c = lyricContext(lines, 0);
    expect(c.current.time).toBe(5);
    expect(c.current.endTime).toBe(7);
    expect(timings(lines)).toEqual(timings(LINES()));
  });

  it('la sélection est déterministe quel que soit l’index de lecture', () => {
    for (const playbackActiveIndex of [-1, 0, 4]) {
      expect(previewIndex({ mode: 'capture-lines', selectedIndex: 1, playbackActiveIndex, lineCount: 5 })).toBe(1);
    }
  });
});

// ═════════════════════ I. KEYUP PERDU (perte de focus) ═════════════════════
describe('I. capture avortée : on ANNULE et on restaure', () => {
  // Comportement choisi : ANNULATION. La fin est calculée sur une horloge murale qui
  // continue de tourner pendant la perte de focus (le player YouTube prend le focus au
  // moindre clic) — la finaliser écrirait une durée fantaisiste. On restaure donc
  // exactement le timing précédent et on N'AVANCE PAS : une frase déjà valide n'est
  // jamais abîmée par un keyup manquant.
  it('restaure le timing exact de la ligne et n’avance pas', () => {
    const base = LINES();
    const begun = beginCapture(base, 0, 30); // écrase temporairement 5 → 7
    expect(begun.lines[0].time).toBe(30);
    const restored = cancelCapture(begun.lines, begun.owner);
    expect(restored.lines[0]).toEqual(base[0]);
    expect(restored.selectedIndex).toBe(0);  // le curseur ne bouge pas
  });

  it('une ligne encore vierge redevient vierge', () => {
    const begun = beginCapture(LINES(), 3, 40);
    const restored = cancelCapture(begun.lines, begun.owner);
    expect(restored.lines[3]).toEqual({ text: 'linha quatro', time: null, endTime: null });
  });

  it('annuler sans propriétaire est un no-op (aucun état bloqué)', () => {
    const lines = LINES();
    const r = cancelCapture(lines, null);
    expect(r.lines).toBe(lines);
  });

  it('un keyup tardif après annulation ne clôture aucune ligne', () => {
    const begun = beginCapture(LINES(), 2, 21.5);
    const restored = cancelCapture(begun.lines, begun.owner);
    const late = completeCapture(restored.lines, null, 26);
    expect(late.completed).toBe(false);
    expect(late.lines).toBe(restored.lines);
  });
});

// ═════════════════════ J. COMPATIBILITÉ STUDIO DE MOTS ═════════════════════
describe('J. le studio de mots garde la propriété exclusive du clavier (STEP 2)', () => {
  it('aucune transition de frase du parent quand le studio est ouvert', () => {
    expect(isParentKeyboardActive({ step: 'sync', wordStudioOpen: true, isCalibrating: false })).toBe(false);
    expect(isParentKeyboardActive({ step: 'sync', wordStudioOpen: false, isCalibrating: false })).toBe(true);
  });

  it('recapturer une frase ne déplace pas silencieusement ses mots', () => {
    // Mots valides dans 10 → 13 ; la frase est recapturée sur 40 → 43 : les mots ne
    // sont plus cohérents, ils sont RETIRÉS (la frase reste jouable en mode frase)
    // plutôt que décalés en bloc ou laissés hors bornes.
    const lines = [{
      text: 'aaa bbb', time: 10, endTime: 13,
      words: [{ id: 'w1', text: 'aaa', start: 10, end: 11.5 }, { id: 'w2', text: 'bbb', start: 11.5, end: 13 }],
    }];
    const begun = beginCapture(lines, 0, 40);
    const done = completeCapture(begun.lines, begun.owner, 43);
    expect(done.lines[0].words).toBeUndefined();
    expect(done.wordsDropped).toBe(true);
    expect(done.lines[0]).toMatchObject({ time: 40, endTime: 43 });
  });

  it('recapturer autour des mêmes bornes CONSERVE des mots restés valides', () => {
    const lines = [{
      text: 'aaa bbb', time: 10, endTime: 13,
      words: [{ id: 'w1', text: 'aaa', start: 10.2, end: 11.5 }, { id: 'w2', text: 'bbb', start: 11.5, end: 12.8 }],
    }];
    const begun = beginCapture(lines, 0, 10);
    const done = completeCapture(begun.lines, begun.owner, 13);
    expect(done.lines[0].words).toEqual(lines[0].words);
    expect(done.wordsDropped).toBe(false);
  });
});
