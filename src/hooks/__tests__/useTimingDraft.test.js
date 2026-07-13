import { describe, it, expect, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useTimingDraft, linesSignature } from '../useTimingDraft';

const A = [{ text: 'Olá', time: 1, endTime: 2 }, { text: 'Mundo', time: 3, endTime: null }];
const B = [{ text: 'Olá', time: 1.5, endTime: 2 }, { text: 'Mundo', time: 3, endTime: null }];

beforeEach(() => localStorage.clear());

describe('linesSignature', () => {
  it('is stable for identical timing and text', () => {
    expect(linesSignature(A)).toBe(linesSignature(A.map((l) => ({ ...l }))));
  });
  it('changes when a time changes', () => {
    expect(linesSignature(A)).not.toBe(linesSignature(B));
  });
  it('changes when text changes', () => {
    const edited = A.map((l, i) => (i === 0 ? { ...l, text: 'Oi' } : l));
    expect(linesSignature(A)).not.toBe(linesSignature(edited));
  });

  // Régression : éditer/distribuer/capturer des mots (Stage 2) ne change ni le
  // time/endTime/text de la ligne — sans ce cas, la signature restait identique et
  // « Alterações não salvas » / l'autosave ne se déclenchaient jamais pour ces edits.
  it('changes when word-level timing changes but line time/text stay identical', () => {
    const withWords = [{ text: 'Olá mundo', time: 1, endTime: 3, words: [
      { text: 'Olá', start: 1, end: 1.8 }, { text: 'mundo', start: 1.8, end: 3 },
    ] }];
    const wordEdited = [{ text: 'Olá mundo', time: 1, endTime: 3, words: [
      { text: 'Olá', start: 1, end: 2.1 }, { text: 'mundo', start: 2.1, end: 3 },
    ] }];
    expect(linesSignature(withWords)).not.toBe(linesSignature(wordEdited));
  });

  it('is stable when word arrays are equal (no false positive)', () => {
    const withWords = [{ text: 'Olá mundo', time: 1, endTime: 3, words: [
      { text: 'Olá', start: 1, end: 1.8 }, { text: 'mundo', start: 1.8, end: 3 },
    ] }];
    expect(linesSignature(withWords)).toBe(linesSignature(withWords.map((l) => ({ ...l, words: l.words.map((w) => ({ ...w })) }))));
  });
});

describe('useTimingDraft', () => {
  it('has no initial draft when storage is empty', () => {
    const { result } = renderHook(() => useTimingDraft('song-1'));
    expect(result.current.initialDraft).toBeNull();
  });

  it('persists a draft that a fresh mount recovers (survives refresh)', () => {
    const first = renderHook(() => useTimingDraft('song-1'));
    act(() => { first.result.current.saveDraft(A, 'base'); });

    // Simule un refresh : nouvelle instance du hook, même songId.
    const second = renderHook(() => useTimingDraft('song-1'));
    expect(second.result.current.initialDraft?.lines).toEqual(A);
    expect(second.result.current.initialDraft?.baseSignature).toBe('base');
    expect(second.result.current.initialDraft?.savedAt).toBeTruthy();
  });

  it('keeps drafts isolated per song id', () => {
    const s1 = renderHook(() => useTimingDraft('song-1'));
    act(() => { s1.result.current.saveDraft(A, 'base'); });
    const s2 = renderHook(() => useTimingDraft('song-2'));
    expect(s2.result.current.initialDraft).toBeNull();
  });

  it('clearDraft removes the persisted draft (confirmed save path)', () => {
    const first = renderHook(() => useTimingDraft('song-1'));
    act(() => { first.result.current.saveDraft(A, 'base'); });
    act(() => { first.result.current.clearDraft(); });
    const second = renderHook(() => useTimingDraft('song-1'));
    expect(second.result.current.initialDraft).toBeNull();
  });

  it('detects a draft newer/different than the server version via signatures', () => {
    const first = renderHook(() => useTimingDraft('song-1'));
    act(() => { first.result.current.saveDraft(B, linesSignature(A)); });
    const second = renderHook(() => useTimingDraft('song-1'));
    const draft = second.result.current.initialDraft;
    // Le brouillon (B) diffère de l'état serveur (A) → doit être proposé à la récupération.
    expect(linesSignature(draft.lines)).not.toBe(linesSignature(A));
  });
});
