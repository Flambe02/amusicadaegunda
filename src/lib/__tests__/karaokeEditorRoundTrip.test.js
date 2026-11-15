import { describe, it, expect } from 'vitest';
import { buildLrc, parseLrc, splitSingerTag, withSingerTag, hasDuetTags } from '../lrc';
import { buildTimingModel, parseTimingModel } from '../timingModel';
import { tokenizeWords, retextWords } from '../wordDistribution';
import { buildEditorLines, buildTimingPayload, restoreUntimedLines } from '../karaokeSyncContract';
import { draftStatus, linesSignature } from '../../hooks/useTimingDraft';

// Régressions de l'audit du 2026-11-15 : ouvrir puis guardar sans rien toucher doit
// rendre exactement ce qui était en base (tags de duo, lignes non synchronisées).

describe('tags de duo {A}/{B}/{AB}', () => {
  it('splitSingerTag / withSingerTag', () => {
    expect(splitSingerTag('{a} Eu sou')).toEqual({ singer: 'A', text: 'Eu sou' });
    expect(splitSingerTag('Sem tag')).toEqual({ singer: null, text: 'Sem tag' });
    expect(withSingerTag('Eu sou', 'B')).toBe('{B}Eu sou');
    expect(withSingerTag('{A}Eu sou', null)).toBe('{A}Eu sou');
    expect(withSingerTag('{A}Eu sou', 'A')).toBe('{A}Eu sou'); // jamais en double
  });

  it('LRC : ouvrir puis guardar garde les tags', () => {
    const lrc = '[00:01.00]{A}Eu sou Ronaldo\n[00:03.00]{B}Eu sou Messi\n[00:05.00]{AB}Juntos';
    const lines = buildEditorLines({ lrc_content: lrc });
    expect(lines.map((l) => l.text)).toEqual(['{A}Eu sou Ronaldo', '{B}Eu sou Messi', '{AB}Juntos']);
    const payload = buildTimingPayload(lines);
    expect(payload.lrc_content).toBe(lrc);
    expect(hasDuetTags(payload.lrc_content)).toBe(true);
  });

  it('timing_data : AB accepté, tag rangé dans singer, texte sans tag', () => {
    const model = buildTimingModel([{ text: '{AB}Juntos agora', time: 1, endTime: 2 }, { text: 'Solo', time: 3, singer: 'B' }]);
    expect(model.lines[0]).toMatchObject({ text: 'Juntos agora', singer: 'AB' });
    expect(model.lines[1]).toMatchObject({ text: 'Solo', singer: 'B' });
    const reopened = buildEditorLines({ timing_data: model });
    expect(reopened.map((l) => l.text)).toEqual(['{AB}Juntos agora', '{B}Solo']);
    expect(parseTimingModel({ lines: [{ text: 'x', start: 0, singer: 'AB' }] }).lines[0].singer).toBe('AB');
  });

  it('parseLrc retire toujours le tag du texte affiché', () => {
    expect(parseLrc('[00:01.00]{B}Oi')[0]).toMatchObject({ text: 'Oi', singer: 'B' });
    expect(buildLrc([{ text: 'Oi', time: 1, singer: 'A' }])).toBe('[00:01.00]{A}Oi');
  });

  it('le tag n\'est pas un mot chanté', () => {
    expect(tokenizeWords('{A}Eu sou')).toEqual(['Eu', 'sou']);
  });
});

describe('correction du texte d\'une ligne synchronisée par mot', () => {
  const words = [{ id: 'w1', text: 'Olá', start: 1, end: 1.5 }, { id: 'w2', text: 'mundu', start: 1.5, end: 2.4 }];

  it('même nombre de mots : les temps restent, le texte change', () => {
    expect(retextWords(words, 'Olá mundo')).toEqual([{ id: 'w1', text: 'Olá', start: 1, end: 1.5 }, { id: 'w2', text: 'mundo', start: 1.5, end: 2.4 }]);
  });

  it('nombre différent : redistribution sur la même plage', () => {
    const out = retextWords(words, 'Olá meu mundo');
    expect(out.map((w) => w.text)).toEqual(['Olá', 'meu', 'mundo']);
    expect(out[0].start).toBe(1);
    expect(out[2].end).toBe(2.4);
  });

  it('texte vidé : plus de mots', () => {
    expect(retextWords(words, '   ')).toBeUndefined();
  });
});

describe('sauvegarde partielle : la fin des paroles revient à la réouverture', () => {
  const lyrics = 'Linha um\nLinha dois\nLinha três\nLinha quatro';

  it('lignes non marquées réinsérées à leur place', () => {
    const song = { lrc_content: '[00:01.00]Linha um\n[00:03.00]Linha três', lyrics_karaoke: lyrics };
    expect(buildEditorLines(song)).toEqual([
      { text: 'Linha um', time: 1, endTime: null },
      { text: 'Linha dois', time: null, endTime: null },
      { text: 'Linha três', time: 3, endTime: null },
      { text: 'Linha quatro', time: null, endTime: null },
    ]);
  });

  it('tags et espaces ignorés pour la comparaison', () => {
    const timed = [{ text: '{A}Linha  um', time: 1, endTime: null }];
    expect(restoreUntimedLines(timed, ['Linha um', 'Linha dois']).map((l) => l.text)).toEqual(['{A}Linha  um', 'Linha dois']);
  });

  it('letra différente des lignes synchronisées : rien n\'est mélangé', () => {
    const song = { lrc_content: '[00:01.00]Outra coisa', lyrics_karaoke: lyrics };
    expect(buildEditorLines(song)).toEqual([{ text: 'Outra coisa', time: 1, endTime: null }]);
  });

  it('chanson sans synchro : la letra brute', () => {
    expect(buildEditorLines({ lyrics: 'A\nB' }).map((l) => l.time)).toEqual([null, null]);
  });
});

describe('brouillon local face à une version guardada plus récente', () => {
  const base = [{ text: 'Oi', time: 1, endTime: null }];
  const draftLines = [{ text: 'Oi', time: 1.4, endTime: null }];
  const otherDevice = [{ text: 'Oi', time: 2, endTime: null }];

  it('pas de brouillon ou identique : none', () => {
    expect(draftStatus(null, base)).toBe('none');
    expect(draftStatus({ lines: base, baseSignature: linesSignature(base) }, base)).toBe('none');
  });

  it('brouillon parti de la version actuelle : newer', () => {
    expect(draftStatus({ lines: draftLines, baseSignature: linesSignature(base) }, base)).toBe('newer');
  });

  it('version guardada changée depuis : conflict', () => {
    expect(draftStatus({ lines: draftLines, baseSignature: linesSignature(base) }, otherDevice)).toBe('conflict');
  });

  it('guardado ailleurs après le brouillon (karaoke_synced_at) : conflict', () => {
    const draft = { lines: draftLines, savedAt: '2026-11-15T10:00:00Z' };
    expect(draftStatus(draft, base, '2026-11-15T11:00:00Z')).toBe('conflict');
    expect(draftStatus(draft, base, '2026-11-15T09:00:00Z')).toBe('newer');
  });
});
