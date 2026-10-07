import { describe, it, expect } from 'vitest';
import {
  formatLongDate, formatShortDate, formatWeekdayDate, getBackdropUrl, getPosterCandidates,
  getRefrain, getShortContext, titleScale,
} from '../bsSong';

describe('bsSong — dates en portugais', () => {
  it('formats the release date for the card, the song page and the week block', () => {
    expect(formatShortDate('2026-09-28')).toBe('28 set');
    expect(formatLongDate('2026-09-21')).toBe('21 de setembro de 2026');
    expect(formatWeekdayDate('2026-10-05')).toBe('segunda, 5 de outubro');
  });

  it('a date with a time stays the same civil day; an invalid one gives nothing', () => {
    expect(formatShortDate('2026-10-05T23:30:00+00:00')).toBe('5 out');
    expect(formatLongDate(null)).toBe('');
    expect(formatWeekdayDate('amanhã')).toBe('');
  });
});

describe('bsSong — contexte en deux lignes', () => {
  const description = 'O Brasil transformou as bets em uma verdadeira novela. Tudo começou em 2018, quando as apostas de quota fixa entraram na legislação brasileira. Depois vieram regulamentação, licenças, impostos, fiscalização e muito mais coisa para contar aqui.';

  it('the short context written in the admin wins', () => {
    expect(getShortContext({ context_short: 'O Tigrinho conseguiu licença.', description })).toBe('O Tigrinho conseguiu licença.');
  });

  it('otherwise the beginning of the description, whole sentences only', () => {
    const text = getShortContext({ description });
    expect(text.startsWith('O Brasil transformou as bets em uma verdadeira novela.')).toBe(true);
    expect(text.endsWith('.')).toBe(true);
    expect(text.length).toBeLessThanOrEqual(190);
  });

  it('HTML is removed; without description the subtitle is used; nothing gives an empty string', () => {
    expect(getShortContext({ description: '<p>Uma frase.</p>' })).toBe('Uma frase.');
    expect(getShortContext({ subtitle: 'Subtítulo' })).toBe('Subtítulo');
    expect(getShortContext({})).toBe('');
  });
});

describe('bsSong — refrain', () => {
  it('a marked stanza is the refrain', () => {
    const lyrics = '[Verse 1]\nLinha um\nLinha dois\n\n[Chorus]\nTá chovendo de novo\nSaí de carro, voltei de barco\n\n[Verse 2]\nOutra';
    expect(getRefrain({ lyrics })).toEqual({ kind: 'refrain', lines: ['Tá chovendo de novo', 'Saí de carro, voltei de barco'] });
  });

  it('a stanza repeated word for word is the refrain', () => {
    const lyrics = 'Primeira estrofe\ncom duas linhas\n\nBets bets bets\nPix pra cá, pix pra lá\n\nSegunda estrofe\ndiferente\n\nBets bets bets\nPix pra cá, pix pra lá';
    expect(getRefrain({ lyrics })).toEqual({ kind: 'refrain', lines: ['Bets bets bets', 'Pix pra cá, pix pra lá'] });
  });

  it('otherwise the first lines, named as an excerpt — never called a refrain', () => {
    const lyrics = '[Intro]\nUm\nDois\nTrês\nQuatro\n\nCinco';
    expect(getRefrain({ lyrics })).toEqual({ kind: 'excerpt', lines: ['Um', 'Dois', 'Três'] });
  });

  it('the revised lyrics are preferred, and no lyrics gives null', () => {
    expect(getRefrain({ lyrics: 'velha', lyrics_karaoke: 'nova linha' }).lines).toEqual(['nova linha']);
    expect(getRefrain({ lyrics: '' })).toBeNull();
    expect(getRefrain({})).toBeNull();
  });
});

describe('bsSong — affiches et fond', () => {
  const song = { youtube_music_url: 'https://youtube.com/shorts/LBQs7uKcv1k?si=x', youtube_url: 'https://music.youtube.com/watch?v=J4LAW4OAjeg' };

  it('the vertical thumbnail of the Short comes first, the brand image last', () => {
    const candidates = getPosterCandidates(song);
    expect(candidates[0]).toBe('https://i.ytimg.com/vi/LBQs7uKcv1k/oar2.jpg');
    expect(candidates).toContain('https://i.ytimg.com/vi/J4LAW4OAjeg/hqdefault.jpg');
    expect(candidates.at(-1)).toMatch(/caipivara/);
    expect(getPosterCandidates({})).toHaveLength(1);
  });

  it('the blurred backdrop uses the smallest thumbnail, or nothing', () => {
    expect(getBackdropUrl(song)).toBe('https://i.ytimg.com/vi/LBQs7uKcv1k/default.jpg');
    expect(getBackdropUrl({})).toBeNull();
  });

  it('the title size follows its length', () => {
    expect(titleScale('Bets Bets Bets')).toBe('xl');
    expect(titleScale('Tá Chovendo de Novo')).toBe('lg');
    expect(titleScale('Doze no Bolo, Trinta e Sete no Papel')).toBe('sm');
  });
});
