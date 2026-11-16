import { describe, it, expect, beforeEach } from 'vitest';
import { createScorer, createVoiceDetector, lineOwners, nextTurn, starsFor, TEAM, wordWindows } from '../karaokeGame';
import { addRecords, topForSong, topOverall } from '../karaokeRecords';

const LINES = [
  { time: 0, text: 'um dois' },
  { time: 2, text: '' },
  { time: 4, text: 'tres quatro' },
  { time: 6, text: 'cinco seis' },
  { time: 8, text: 'sete oito' },
  { time: 10, text: 'nove dez' },
  { time: 12, text: 'onze doze' },
];

/** Simule une chanson : `voice(t)` → RMS du micro à l'instant t. */
function play(scorer, voice, until = 14) {
  const events = [];
  for (let t = 0; t <= until; t += 0.05) {
    const e = scorer.update({ t, rms: voice(t), dtMs: 50 });
    if (e) events.push(e);
  }
  return { events, results: scorer.finish() };
}

describe('Karaokê — quem canta cada linha', () => {
  it('solo, duel, coop, pass the mic; empty lines belong to nobody', () => {
    expect(lineOwners(LINES, 'solo', 1)).toEqual([0, null, 0, 0, 0, 0, 0]);
    expect(lineOwners(LINES, 'duel', 2)).toEqual([0, null, 1, 0, 1, 0, 1]);
    expect(lineOwners(LINES, 'coop', 3)).toEqual([TEAM, null, TEAM, TEAM, TEAM, TEAM, TEAM]);
    expect(lineOwners(LINES, 'pass', 2, { passEvery: 2 })).toEqual([0, null, 0, 1, 1, 0, 0]);
  });

  it('dueto follows the {A}/{B} parts of the song', () => {
    const duet = [{ time: 0, text: '{A}eu' }, { time: 2, text: '{B}você' }, { time: 4, text: '{AB}nós' }, { time: 6, text: 'sem tag', singer: 'B' }];
    expect(lineOwners(duet, 'duet', 2)).toEqual([0, 1, TEAM, 1]);
  });

  it('announces who sings next', () => {
    const owners = lineOwners(LINES, 'duel', 2);
    expect(nextTurn(owners, 0)).toEqual({ line: 2, owner: 1 });
  });

  it('word windows come from word timing, or are spread over the line', () => {
    expect(wordWindows({ time: 0, text: 'a b', words: [{ start: 0, end: 1 }, { start: 1, end: 2 }] }, 3)).toHaveLength(2);
    const spread = wordWindows({ time: 4, text: 'tres quatro' }, 6);
    expect(spread[0].start).toBe(4);
    expect(spread[spread.length - 1].end).toBeLessThanOrEqual(6.01);
  });

  it('stale word timing from an older sync is moved onto its line (no bar on the intro)', () => {
    const line = { time: 8.6, text: 'a b', words: [{ start: 1.6, end: 2.2 }, { start: 2.2, end: 3 }] };
    const w = wordWindows(line, 12);
    expect(w[0].start).toBeCloseTo(8.6);
    expect(w[1].end).toBeCloseTo(10);
    // Trop longs pour tenir avant la ligne suivante : répartis sur la ligne.
    const spread = wordWindows({ ...line, words: [{ start: 1, end: 9 }] }, 10);
    expect(spread[0].start).toBe(8.6);
  });
});

describe('Karaokê — pontuação « cantar no tempo »', () => {
  it('singing all the time scores high with « Perfeito! », silence scores nothing', () => {
    const loud = play(createScorer({ lines: LINES, mode: 'solo' }), () => 0.2);
    expect(loud.results[0].score).toBeGreaterThan(5000);
    expect(loud.results[0].stars).toBe(5);
    expect(loud.events.some((e) => e.label === 'Perfeito!')).toBe(true);
    const silent = play(createScorer({ lines: LINES, mode: 'solo' }), () => 0);
    expect(silent.results[0].score).toBe(0);
    expect(silent.results[0].stars).toBe(0);
  });

  it('duel: the one who sings their lines wins', () => {
    const owners = lineOwners(LINES, 'duel', 2);
    const scorer = createScorer({ lines: LINES, mode: 'duel', playerCount: 2 });
    // Seul le joueur 0 chante (sur ses lignes).
    const { results } = play(scorer, (t) => (owners[scorer.lineAt(t)] === 0 ? 0.2 : 0));
    expect(results[0].score).toBeGreaterThan(results[1].score);
    expect(results[1].score).toBe(0);
  });

  it('coop gives one team score; a combo raises the points', () => {
    const { results } = play(createScorer({ lines: LINES, mode: 'coop', playerCount: 3 }), () => 0.2);
    expect(results).toHaveLength(1);
    expect(results[0].id).toBe(TEAM);
    expect(results[0].bestCombo).toBe(6);
    expect(results[0].score).toBeGreaterThan(6 * 1000);
  });

  it('stars follow the average', () => {
    expect(starsFor(0)).toBe(0);
    expect(starsFor(0.5)).toBe(3);
    expect(starsFor(1)).toBe(5);
  });
});

describe('Karaokê — ouvir a voz', () => {
  it('a soft voice on a mic without auto gain counts (the old fixed threshold gave 0)', () => {
    const d = createVoiceDetector();
    let voiced = 0;
    for (let i = 0; i < 400; i += 1) {
      const singing = (i % 25) < 18; // syllabes, avec de courtes pauses
      if (d.update(singing ? 0.015 : 0.0008, 16) && singing) voiced += 1;
    }
    expect(voiced).toBeGreaterThan(250);
  });

  it('music heard before the first verse is learned in ~2 s (it does not light the track)', () => {
    const d = createVoiceDetector();
    for (let i = 0; i < 125; i += 1) d.update(0.02, 16, { expectingVoice: false }); // 2 s d'intro
    expect(d.update(0.02, 16)).toBe(false);
    expect(d.update(0.09, 16)).toBe(true);
  });

  it('steady background music does not count as singing, a voice on top does', () => {
    const d = createVoiceDetector();
    for (let i = 0; i < 2000; i += 1) d.update(0.02, 16); // musique qui revient dans le micro
    expect(d.update(0.02, 16)).toBe(false);
    expect(d.update(0.09, 16)).toBe(true);
  });
});

describe('Recordes do aparelho', () => {
  beforeEach(() => localStorage.clear());

  it('keeps the best scores per song and tells a new record', () => {
    addRecords(7, 'Urna', [{ name: 'Ana', score: 4000, mode: 'solo', stars: 3 }]);
    const [florent] = addRecords(7, 'Urna', [{ name: 'Florent', score: 5200, mode: 'solo', stars: 4 }]);
    expect(florent.rank).toBe(1);
    expect(florent.personalBest).toBe(true);
    expect(topForSong(7).map((e) => e.name)).toEqual(['Florent', 'Ana']);
    const [again] = addRecords(7, 'Urna', [{ name: 'Florent', score: 3000, mode: 'solo' }]);
    expect(again.personalBest).toBe(false);
    expect(again.rank).toBe(3);
    addRecords(8, 'Bets', [{ name: 'Bia', score: 9000, mode: 'duel' }]);
    expect(topOverall(1)[0]).toMatchObject({ name: 'Bia', songTitle: 'Bets' });
  });

  it('a zero score is not a record', () => {
    expect(addRecords(7, 'Urna', [{ name: 'Ana', score: 0 }])).toEqual([]);
    expect(topForSong(7)).toEqual([]);
  });
});
