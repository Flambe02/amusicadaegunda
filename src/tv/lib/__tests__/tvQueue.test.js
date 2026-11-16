import { describe, it, expect } from 'vitest';
import { festaPlaying, festaRows, festaWaiting, planFestaAdd, queueToastMessage } from '../tvQueue';

const q = (id, songId, status, addedAt, singer = 'Ana') => ({
  id, song_id: songId, status, added_at: addedAt, singer_name: singer,
});
const FESTA = [
  q('c', 30, 'waiting', '2026-11-16T20:03:00Z', 'Bia'),
  q('a', 10, 'done', '2026-11-16T20:00:00Z'),
  q('b', 20, 'waiting', '2026-11-16T20:01:00Z'),
  q('p', 40, 'playing', '2026-11-16T19:59:00Z', 'Caio'),
  q('s', 50, 'skipped', '2026-11-16T20:02:00Z'),
];

describe('Fila do grand écran — règles', () => {
  it('lists only waiting entries, in order of arrival, and finds the one playing', () => {
    expect(festaWaiting(FESTA).map((e) => e.id)).toEqual(['b', 'c']);
    expect(festaPlaying(FESTA).id).toBe('p');
    expect(festaPlaying([])).toBeNull();
  });

  it('adding from the TV during a Festa: new song goes last, a waiting one is not duplicated', () => {
    expect(planFestaAdd(FESTA, new Set(), 99)).toEqual({ added: true, position: 3 });
    expect(planFestaAdd(FESTA, new Set(), 30)).toEqual({ added: false, position: 2 });
    // Déjà jouée ou retirée : on peut la remettre.
    expect(planFestaAdd(FESTA, new Set(), 10).added).toBe(true);
    // Ajout encore en vol (double appui) : pas de doublon.
    expect(planFestaAdd(FESTA, new Set([99]), 99).added).toBe(false);
  });

  it('rows carry the title from the catalogue and the singer name', () => {
    const rows = festaRows(festaWaiting(FESTA), [{ id: 20, title: 'Urna' }]);
    expect(rows[0]).toMatchObject({ qid: 'b', id: 20, title: 'Urna', singer: 'Ana' });
    expect(rows[1].title).toBe('Música');
  });

  it('says which queue the song went to', () => {
    expect(queueToastMessage({ added: true, position: 3 }, true)).toBe('Adicionada à fila da Festa · posição 3');
    expect(queueToastMessage({ added: false, position: 1 })).toBe('Já está na fila · posição 1');
  });
});
