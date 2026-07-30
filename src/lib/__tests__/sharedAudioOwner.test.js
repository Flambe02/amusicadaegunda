/**
 * Régression — le fichier audio local NE DOIT PAS suivre d'une chanson à l'autre.
 *
 * Signalé le 2026-07-29 : « quand j'essaye de basculer sur une autre chanson, le
 * fichier local audio reste uploadé ». Le scénario exact (fermer A puis ouvrir B)
 * est reproduit plus bas comme séquence complète.
 */
import { describe, it, expect } from 'vitest';
import { SHARED_AUDIO_ACTION, sharedAudioAction } from '../sharedAudioOwner';

const act = (state) => sharedAudioAction(state).action;

describe('sharedAudioAction', () => {
  it('garde l’audio de la chanson ouverte', () => {
    expect(act({ ownerId: 'A', activeId: 'A', hasAudio: true })).toBe(SHARED_AUDIO_ACTION.KEEP);
  });

  it('attribue un fichier qui vient d’arriver à la chanson ouverte', () => {
    expect(act({ ownerId: null, activeId: 'A', hasAudio: true })).toBe(SHARED_AUDIO_ACTION.CLAIM);
  });

  it('VIDE l’audio quand on passe à une autre chanson', () => {
    expect(act({ ownerId: 'A', activeId: 'B', hasAudio: true })).toBe(SHARED_AUDIO_ACTION.CLEAR);
  });

  it('VIDE l’audio à la fermeture de l’éditeur — le bug d’origine', () => {
    // L'ancienne version remettait juste le propriétaire à null ici, sans vider :
    // la chanson suivante héritait alors du fichier.
    expect(act({ ownerId: 'A', activeId: null, hasAudio: true })).toBe(SHARED_AUDIO_ACTION.CLEAR);
  });

  it('vide aussi un audio orphelin (chargé alors que plus rien n’est ouvert)', () => {
    expect(act({ ownerId: null, activeId: null, hasAudio: true })).toBe(SHARED_AUDIO_ACTION.CLEAR);
  });

  it('libère un propriétaire périmé quand il n’y a plus d’audio', () => {
    expect(act({ ownerId: 'A', activeId: 'A', hasAudio: false })).toBe(SHARED_AUDIO_ACTION.RELEASE);
    expect(act({ ownerId: null, activeId: 'A', hasAudio: false })).toBe(SHARED_AUDIO_ACTION.KEEP);
  });

  it('ne vide pas la chanson courante sur une simple différence de type d’id', () => {
    // openKaraoke peut passer 7 là où le précédent était '7'.
    expect(act({ ownerId: 7, activeId: '7', hasAudio: true })).toBe(SHARED_AUDIO_ACTION.KEEP);
    expect(act({ ownerId: '7', activeId: 7, hasAudio: true })).toBe(SHARED_AUDIO_ACTION.KEEP);
  });

  it('ne suppose rien d’un état vide', () => {
    expect(act({})).toBe(SHARED_AUDIO_ACTION.KEEP);
    expect(act()).toBe(SHARED_AUDIO_ACTION.KEEP);
  });
});

describe('séquence réelle — fermer A, ouvrir B, importer un JSON', () => {
  /** Petit modèle du propriétaire + de la session, piloté uniquement par la fonction pure. */
  function makeStore() {
    const s = { ownerId: null, hasAudio: false, clears: 0 };
    s.step = (activeId) => {
      const action = sharedAudioAction({ ownerId: s.ownerId, activeId, hasAudio: s.hasAudio }).action;
      if (action === SHARED_AUDIO_ACTION.CLEAR) { s.hasAudio = false; s.ownerId = null; s.clears += 1; }
      else if (action === SHARED_AUDIO_ACTION.CLAIM) s.ownerId = activeId;
      else if (action === SHARED_AUDIO_ACTION.RELEASE) s.ownerId = null;
      return action;
    };
    return s;
  }

  it('la chanson B n’hérite jamais du .wav de la chanson A', () => {
    const s = makeStore();

    s.step('A');                       // on ouvre A
    s.hasAudio = true;                 // l'admin choisit « Churrasco no Trilho.wav »
    expect(s.step('A')).toBe(SHARED_AUDIO_ACTION.CLAIM);
    expect(s.ownerId).toBe('A');

    expect(s.step(null)).toBe(SHARED_AUDIO_ACTION.CLEAR); // « Voltar » ferme l'éditeur
    expect(s.hasAudio).toBe(false);                        // ← le fichier est bien libéré

    expect(s.step('B')).toBe(SHARED_AUDIO_ACTION.KEEP);    // on ouvre B
    expect(s.hasAudio).toBe(false);                        // B démarre SANS audio hérité
    expect(s.clears).toBe(1);
  });

  it('rouvrir la MÊME chanson ne déclenche aucun nettoyage inutile', () => {
    const s = makeStore();
    s.hasAudio = true;
    s.step('A');
    expect(s.ownerId).toBe('A');
    expect(s.step('A')).toBe(SHARED_AUDIO_ACTION.KEEP);
    expect(s.step('A')).toBe(SHARED_AUDIO_ACTION.KEEP);
    expect(s.clears).toBe(0);
  });

  it('passer du karaokê au Guia de tom de la même chanson garde le fichier', () => {
    // Les deux modales remontent le MÊME activeId — c'est tout l'intérêt du partage.
    const s = makeStore();
    s.hasAudio = true;
    s.step('A');
    expect(s.step('A')).toBe(SHARED_AUDIO_ACTION.KEEP);
    expect(s.hasAudio).toBe(true);
  });
});
