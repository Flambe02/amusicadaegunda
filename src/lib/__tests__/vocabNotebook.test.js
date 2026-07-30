import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  addEntry, listEntries, markKnown, markToReview, readEntries, VOCAB_NOTEBOOK_KEY,
} from '@/lib/vocabNotebook';

const ENTRY = {
  expressionId: 'jeitinho',
  term: 'jeitinho brasileiro',
  meaningFr: "L'art de contourner une règle avec charme et débrouille.",
  register: 'courant',
  songSlug: 'camarada-quer-cpf',
  songTitle: 'Camarada Quer CPF',
};

beforeEach(() => {
  localStorage.clear();
});

describe('addEntry', () => {
  it('écrit une nouvelle entrée avec la pile de révision par défaut', () => {
    const wrote = addEntry(ENTRY);
    expect(wrote).toBe(true);
    const entries = readEntries();
    expect(entries).toHaveLength(1);
    expect(entries[0]).toMatchObject({
      expressionId: 'jeitinho',
      term: 'jeitinho brasileiro',
      songSlug: 'camarada-quer-cpf',
      review: 'to_review',
    });
  });

  it('est idempotent pour la même expression sur la même chanson', () => {
    addEntry(ENTRY);
    const wroteAgain = addEntry(ENTRY);
    expect(wroteAgain).toBe(false);
    expect(readEntries()).toHaveLength(1);
  });

  it('distingue la même expression collectée depuis deux chansons différentes', () => {
    addEntry(ENTRY);
    const wrote = addEntry({ ...ENTRY, songSlug: 'eu-sou-um-ovo', songTitle: 'Eu Sou um Ovo' });
    expect(wrote).toBe(true);
    expect(readEntries()).toHaveLength(2);
  });

  it("refuse silencieusement une entrée incomplète, sans lever d'exception", () => {
    expect(addEntry({ term: 'x', songSlug: 'y' })).toBe(false); // pas d'expressionId
    expect(addEntry({ expressionId: 'x', songSlug: 'y' })).toBe(false); // pas de term
    expect(addEntry({ expressionId: 'x', term: 'y' })).toBe(false); // pas de songSlug
    expect(addEntry(null)).toBe(false);
    expect(readEntries()).toHaveLength(0);
  });

  it('se dégrade en silence quand localStorage est indisponible', () => {
    const spy = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new DOMException('QuotaExceededError');
    });
    expect(() => addEntry(ENTRY)).not.toThrow();
    expect(addEntry(ENTRY)).toBe(false);
    spy.mockRestore();
  });
});

describe('readEntries', () => {
  it('renvoie un tableau vide si la clé est absente', () => {
    expect(readEntries()).toEqual([]);
  });

  it('renvoie un tableau vide si le contenu stocké est corrompu', () => {
    localStorage.setItem(VOCAB_NOTEBOOK_KEY, '{not json');
    expect(readEntries()).toEqual([]);
  });

  it('renvoie un tableau vide si le contenu stocké n\'est pas un tableau', () => {
    localStorage.setItem(VOCAB_NOTEBOOK_KEY, JSON.stringify({ oops: true }));
    expect(readEntries()).toEqual([]);
  });
});

describe('listEntries', () => {
  const OVO_ENTRY = { ...ENTRY, expressionId: 'cade', term: 'cadê', songSlug: 'eu-sou-um-ovo', songTitle: 'Eu Sou um Ovo' };

  it('renvoie les entrées les plus récentes en premier', () => {
    addEntry(ENTRY);
    addEntry(OVO_ENTRY);
    const entries = listEntries();
    expect(entries.map((e) => e.expressionId)).toEqual(['cade', 'jeitinho']);
  });

  it('filtre par pile de révision', () => {
    addEntry(ENTRY);
    addEntry(OVO_ENTRY);
    markKnown(ENTRY.expressionId, ENTRY.songSlug);
    expect(listEntries({ review: 'known' }).map((e) => e.expressionId)).toEqual(['jeitinho']);
    expect(listEntries({ review: 'to_review' }).map((e) => e.expressionId)).toEqual(['cade']);
  });

  it('renvoie un tableau vide sans filtre correspondant', () => {
    addEntry(ENTRY);
    expect(listEntries({ review: 'known' })).toEqual([]);
  });
});

describe('markKnown / markToReview', () => {
  it('classe une entrée existante « je sais »', () => {
    addEntry(ENTRY);
    const ok = markKnown(ENTRY.expressionId, ENTRY.songSlug);
    expect(ok).toBe(true);
    expect(readEntries()[0].review).toBe('known');
  });

  it('reclasse une entrée « je sais » vers « à revoir »', () => {
    addEntry(ENTRY);
    markKnown(ENTRY.expressionId, ENTRY.songSlug);
    const ok = markToReview(ENTRY.expressionId, ENTRY.songSlug);
    expect(ok).toBe(true);
    expect(readEntries()[0].review).toBe('to_review');
  });

  it('ne crée jamais d\'entrée pour une expression inconnue', () => {
    expect(markKnown('inexistant', 'camarada-quer-cpf')).toBe(false);
    expect(readEntries()).toHaveLength(0);
  });

  it('ne modifie pas les autres champs de l\'entrée', () => {
    addEntry(ENTRY);
    markKnown(ENTRY.expressionId, ENTRY.songSlug);
    expect(readEntries()[0]).toMatchObject({
      term: 'jeitinho brasileiro',
      meaningFr: "L'art de contourner une règle avec charme et débrouille.",
      register: 'courant',
      songTitle: 'Camarada Quer CPF',
    });
  });

  it('se dégrade en silence quand localStorage est indisponible', () => {
    addEntry(ENTRY);
    const spy = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new DOMException('QuotaExceededError');
    });
    expect(() => markKnown(ENTRY.expressionId, ENTRY.songSlug)).not.toThrow();
    expect(markKnown(ENTRY.expressionId, ENTRY.songSlug)).toBe(false);
    spy.mockRestore();
  });
});
