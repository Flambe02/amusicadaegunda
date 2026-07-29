/**
 * Régression — CHARGEMENT DU STUDIO « Afinar palavras e bola » (finding d'audit nº3).
 *
 * Le studio recevait `phraseEnd = effectiveEnd(index)`, c'est-à-dire le DÉBUT DE LA
 * LIGNE SUIVANTE quand la ligne n'a pas de `endTime` explicite, puis passait les mots
 * déjà stockés dans `normalizeWords()`. `normalizeEnds()` force `dernierMot.end =
 * phraseEnd` → à chaque ouverture, le dernier mot était étiré jusqu'à la ligne
 * suivante (silence instrumental inclus), et re-commité tel quel.
 *
 * Ouvrir puis fermer l'éditeur de mots SANS rien modifier ne doit RIEN changer.
 *
 * Ces tests portent sur les modules purs existants (aucun rendu React) : ils décrivent
 * le contrat de chargement, pas l'implémentation du composant.
 */
import { describe, it, expect } from 'vitest';
import { normalizeWords, wordsAreValid, loadStudioWords } from '@/lib/ballMotion';

// Ligne déjà synchronisée mot-à-mot, VALIDE, sans `endTime` explicite (cas le plus
// courant : marquage à Enter / toque bref). La frase se termine réellement à 12.0 s ;
// la ligne suivante ne commence qu'à 20.0 s (silence instrumental de 8 s).
const STORED_WORDS = Object.freeze([
  { id: 'w1', text: 'aaa', start: 10, end: 10.8 },
  { id: 'w2', text: 'bbb', start: 10.8, end: 11.6 },
  { id: 'w3', text: 'ccc', start: 11.6, end: 12 },
]);
const PHRASE_START = 10;
const INFERRED_END = 20; // = début de la ligne suivante (effectiveEnd), PAS une borne persistée

describe('chargement du studio de mots — idempotence', () => {
  it('des mots stockés valides sont reconnus comme valides face à une fin INFÉRÉE', () => {
    expect(wordsAreValid(STORED_WORDS, PHRASE_START, INFERRED_END)).toBe(true);
  });

  it('ne réécrit PAS des mots stockés valides quand la fin de frase est seulement inférée', () => {
    // Chargement historique du studio (le bug) : normalizeWords(stored, start, effectiveEnd)
    // colle la fin du dernier mot sur le début de la ligne suivante.
    expect(normalizeWords(STORED_WORDS, PHRASE_START, INFERRED_END)[2].end).toBe(INFERRED_END);

    // Chargement corrigé : les mots valides passent intacts, sans même être recopiés.
    const loaded = loadStudioWords(STORED_WORDS, PHRASE_START, INFERRED_END);
    expect(loaded.repaired).toBe(false);
    expect(loaded.words).toBe(STORED_WORDS);
    expect(loaded.words[2].end).toBe(12);
  });

  it('loadStudioWords répare quand même les données héritées cassées', () => {
    const broken = [{ id: 'w1', text: 'a', start: 5, end: 4 }, { id: 'w2', text: 'b', start: 4, end: 4 }];
    const loaded = loadStudioWords(broken, PHRASE_START, 13);
    expect(loaded.repaired).toBe(true);
    expect(wordsAreValid(loaded.words, PHRASE_START, 13)).toBe(true);
  });

  it('loadStudioWords est idempotente (recharger ne change plus rien)', () => {
    const once = loadStudioWords([{ id: 'w1', text: 'a', start: 5, end: 4 }], PHRASE_START, 13);
    const twice = loadStudioWords(once.words, PHRASE_START, 13);
    expect(twice.repaired).toBe(false);
    expect(twice.words).toBe(once.words);
  });

  it('normalizeWords est idempotente (normalize∘normalize === normalize)', () => {
    const once = normalizeWords(STORED_WORDS, PHRASE_START, INFERRED_END);
    const twice = normalizeWords(once, PHRASE_START, INFERRED_END);
    expect(twice).toEqual(once);
  });

  it('normalizeWords reste idempotente sur des données héritées INVALIDES', () => {
    const broken = [
      { id: 'w1', text: 'aaa', start: 11.9, end: 12 },  // hors ordre
      { id: 'w2', text: 'bbb', start: 10.4, end: 10.2 }, // fin avant début
      { id: 'w3', text: 'ccc', start: 9, end: 30 },      // hors des bornes
    ];
    const once = normalizeWords(broken, PHRASE_START, 13);
    const twice = normalizeWords(once, PHRASE_START, 13);
    expect(twice).toEqual(once);
    expect(wordsAreValid(once, PHRASE_START, 13)).toBe(true);
  });

  it('répare bien les données invalides (la normalisation reste utile)', () => {
    const broken = [{ id: 'w1', text: 'a', start: 5, end: 4 }, { id: 'w2', text: 'b', start: 4, end: 4 }];
    expect(wordsAreValid(broken, PHRASE_START, 13)).toBe(false);
    expect(wordsAreValid(normalizeWords(broken, PHRASE_START, 13), PHRASE_START, 13)).toBe(true);
  });
});
