import { describe, it, expect } from 'vitest';
import { createRequire } from 'node:module';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  CATEGORY_DESCRIPTIONS, CATEGORY_REDIRECTS, DESCRIPTION_MAX, TITLE_MAX, categorySeoTitle, songSeoDescription, songSeoTitle, splitSentences, withSiteName,
} from '../seoText';
import { pageSeo } from '../pageSeo';

const require = createRequire(import.meta.url);
const pages = require('../../../scripts/seo.pages.json');
const guia = require('../../../scripts/guia.examples.json');
const catalog = require('../../../content/songs.json');
const { checkSeoText, songTitleProblems } = require('../../../scripts/check-seo-text.cjs');
const SONGS = Array.isArray(catalog) ? catalog : catalog.songs;
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');

describe('titres des chansons — 60 caractères au plus', () => {
  it('« Título — paródia sobre tema », with the site name only when it fits', () => {
    expect(songSeoTitle({ title: 'Ypê Ypê', category: 'midia' })).toBe('Ypê Ypê — paródia sobre mídia | A Música da Segunda');
    expect(songSeoTitle({ title: 'Banco Master', category: 'policia' })).toBe('Banco Master — paródia sobre casos de polícia');
  });

  it('no theme for « Outros » or a missing category', () => {
    expect(songSeoTitle({ title: 'Europa Deu Vácuo no Boi', category: null })).toBe('Europa Deu Vácuo no Boi — paródia musical');
    expect(songSeoTitle({ title: 'Bets Bets Bets', category: 'outros' })).toBe('Bets Bets Bets — paródia musical | A Música da Segunda');
  });

  it('shortens a long title step by step, never in the middle of a word', () => {
    expect(songSeoTitle({ title: 'O casal da traição no show de Coldplay', category: 'cultura' })).toBe('O casal da traição no show de Coldplay — paródia musical');
    expect(songSeoTitle({ title: 'Uma música com um título realmente comprido demais (edição especial)', category: 'politica' }))
      .toBe('Uma música com um título realmente comprido demais — paródia');
    const cut = songSeoTitle({ title: 'Palavra '.repeat(12).trim(), category: 'politica' });
    expect(cut.length).toBeLessThanOrEqual(TITLE_MAX);
    expect(cut).toMatch(/Palavra — paródia$/);
  });

  it('cleans stray spaces from the title', () => {
    expect(songSeoTitle({ title: ' Já é Natal  ', category: 'cultura' })).toBe('Já é Natal — paródia sobre cultura | A Música da Segunda');
  });

  it('every song of the catalogue gets a title of 60 characters at most', () => {
    for (const song of SONGS) {
      expect(songSeoTitle({ title: song.name, category: song.category }).length, song.slug).toBeLessThanOrEqual(TITLE_MAX);
    }
  });

  it('« cidades » : o caos urbano ; « energia », retirée, renvoie vers elle', () => {
    expect(songSeoTitle({ title: 'Tá Chovendo de Novo', category: 'cidades' })).toBe('Tá Chovendo de Novo — paródia sobre o caos urbano');
    expect(categorySeoTitle('cidades', 'Cidades')).toBe('Paródias sobre o caos urbano | A Música da Segunda');
    expect(CATEGORY_DESCRIPTIONS.cidades).toBeTruthy();
    expect(CATEGORY_DESCRIPTIONS.energia).toBeUndefined();
    expect(CATEGORY_REDIRECTS).toEqual({ energia: 'cidades' });
  });

  it('category pages: « Paródias sobre tema »', () => {
    expect(categorySeoTitle('politica', 'Política')).toBe('Paródias sobre política | A Música da Segunda');
    expect(categorySeoTitle('outros', 'Outros')).toBe('Outros — paródias musicais | A Música da Segunda');
    expect(withSiteName('x'.repeat(39))).toBe('x'.repeat(39));
  });
});

describe('descriptions des chansons — jamais de phrase coupée', () => {
  const news = 'Em novembro de 2025, o Banco Master foi alvo de uma operação da Polícia Federal e teve sua liquidação extrajudicial decretada. O banco é acusado de movimentar cerca de R$ 12 bilhões em carteiras de crédito fraudulentas, gerando prejuízos massivos para clientes e investidores.';

  it('whole sentences from the start, then « Letra, contexto e karaokê. »', () => {
    expect(songSeoDescription({ title: 'Banco Master', description: news, karaoke: true }))
      .toBe('Em novembro de 2025, o Banco Master foi alvo de uma operação da Polícia Federal e teve sua liquidação extrajudicial decretada. Letra, contexto e karaokê.');
  });

  it('no karaoke published: « Letra e contexto. »', () => {
    expect(songSeoDescription({ title: 'Banco Master', description: news, karaoke: false })).toMatch(/decretada\. Letra e contexto\.$/);
  });

  it('context_short, when filled, replaces the description', () => {
    expect(songSeoDescription({ title: 'X', description: news, context_short: 'O CDB vira conto de fadas tóxico', karaoke: true }))
      .toBe('O CDB vira conto de fadas tóxico. Letra, contexto e karaokê.');
  });

  it('first sentence too long: the first shorter sentence that names the song, else a short description', () => {
    const long = `${'Uma frase muito comprida que não cabe de jeito nenhum no espaço previsto, '.repeat(3)}fim. Em “Gelo Gelo”, quem narra é um bloco de gelo. Depois vem outra coisa.`;
    expect(songSeoDescription({ title: 'Gelo Gelo', description: long, karaoke: true })).toBe('Em “Gelo Gelo”, quem narra é um bloco de gelo. Letra, contexto e karaokê.');
    const none = `${'Uma frase muito comprida que não cabe de jeito nenhum no espaço previsto, '.repeat(3)}fim.`;
    expect(songSeoDescription({ title: 'Gelo Gelo', description: none, karaoke: true })).toBe('“Gelo Gelo”, paródia musical de A Música da Segunda. Letra, contexto e karaokê.');
  });

  it('never ends on an ellipsis, never keeps a sentence that has one', () => {
    const text = 'Desta vez, o aumento da gasolina não vem só do posto da esquina. Ele vem… da geopolítica. E mais uma frase.';
    expect(songSeoDescription({ title: 'Tá Caro', description: text, karaoke: false })).toBe('Desta vez, o aumento da gasolina não vem só do posto da esquina. Letra e contexto.');
  });

  it('does not split on an abbreviation or a number', () => {
    expect(splitSentences('Vini Jr. foi a Goiânia com 75,94% dos votos. Outra frase.')).toEqual(['Vini Jr. foi a Goiânia com 75,94% dos votos.', 'Outra frase.']);
  });

  it('every song of the catalogue: 160 characters at most, no ellipsis, the closing words at the end', () => {
    for (const song of SONGS) {
      const text = songSeoDescription({ title: song.name, description: song.description, context_short: song.context_short, karaoke: Boolean(song.karaoke) });
      expect(text.length, song.slug).toBeLessThanOrEqual(DESCRIPTION_MAX);
      expect(text, song.slug).not.toMatch(/…|\.\.\. Letra/);
      expect(text, song.slug).toMatch(/ (Letra, contexto e karaokê|Letra e contexto)\.$/);
    }
  });
});

describe('pages fixes — une seule source (scripts/seo.pages.json)', () => {
  const entries = Object.entries(pages).filter(([key]) => key !== '//');

  it('every title has 60 characters at most, every description 160 at most, all with accents', () => {
    for (const [route, page] of entries) {
      expect(page.title.length, route).toBeLessThanOrEqual(TITLE_MAX);
      expect(page.description.length, route).toBeLessThanOrEqual(DESCRIPTION_MAX);
      expect(`${page.title} ${page.description}`, route).not.toMatch(/\b(Musica|Parodias?|noticias|Karaoke)\b/);
    }
    expect(new Set(entries.map(([, page]) => page.title)).size).toBe(entries.length);
    expect(new Set(entries.map(([, page]) => page.description)).size).toBe(entries.length);
  });

  it('the guide targets « O que é paródia musical? » at the start of its title', () => {
    expect(pages['/guia'].title).toMatch(/^O que é paródia musical\? /);
    expect(pages['/'].title).toBe('A Música da Segunda — paródias das notícias do Brasil');
  });

  it('pageSeo hands the exact title to useSEO', () => {
    expect(pageSeo('/sobre')).toEqual({ ...pages['/sobre'], exactTitle: true });
    expect(() => pageSeo('/nada')).toThrow();
  });

  it('index.html carries the home title and description in title, og: and twitter:', () => {
    const html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
    const { title, description } = pages['/'];
    expect(html).toContain(`<title>${title}</title>`);
    expect(html).toContain(`<meta name="description" content="${description}" />`);
    expect(html).toContain(`<meta property="og:title" content="${title}" />`);
    expect(html).toContain(`<meta property="og:description" content="${description}" />`);
    expect(html).toContain(`<meta name="twitter:title" content="${title}" />`);
    expect(html).toContain(`<meta name="twitter:description" content="${description}" />`);
  });

  it('the guide examples all point to a song page that exists', () => {
    expect(guia.items.length).toBeGreaterThanOrEqual(4);
    for (const item of guia.items) expect(SONGS.some((song) => song.slug === item.slug), item.slug).toBe(true);
  });
});

describe('contrôle du build — scripts/check-seo-text.cjs', () => {
  const page = ({ title = 'Um título', description = 'Uma descrição.', ogTitle = title, ogDescription = description, robots = 'index, follow' }) =>
    `<html><head><title>${title}</title>${description === null ? '' : `<meta name="description" content="${description}"/>`}<meta name="robots" content="${robots}"/><meta property="og:title" content="${ogTitle}"/><meta property="og:description" content="${ogDescription ?? ''}"/></head></html>`;

  it('says nothing about a page within the limits', () => {
    expect(checkSeoText(page({}))).toEqual([]);
  });

  it('warns about a long title, a missing or long description, and og: tags that differ', () => {
    expect(checkSeoText(page({ title: 'x'.repeat(61) }))[0]).toMatch(/titre de 61 caractères/);
    expect(checkSeoText(page({ description: null }))).toContain('description absente');
    expect(checkSeoText(page({ description: 'x'.repeat(161) }))[0]).toMatch(/description de 161 caractères/);
    expect(checkSeoText(page({ ogTitle: 'Outro' }))[0]).toMatch(/og:title différent/);
    expect(checkSeoText(page({ ogDescription: 'Outra' }))).toContain('og:description différente de la description');
  });

  it('warns about a song title with spaces at the start, at the end or doubled', () => {
    const problems = songTitleProblems([{ name: ' Já é Natal ', slug: 'ja-e-natal' }, { name: 'Dark Horse  do Brasil', slug: 'dark' }, { name: 'Ypê Ypê', slug: 'ype-ype' }]);
    expect(problems).toHaveLength(2);
    expect(problems[0]).toMatch(/ja-e-natal/);
    expect(songTitleProblems(undefined)).toEqual([]);
  });

  it('skips noindex pages and counts an escaped character once', () => {
    expect(checkSeoText(page({ title: 'x'.repeat(80), robots: 'noindex, follow' }))).toBeNull();
    expect(checkSeoText(page({ title: `${'x'.repeat(58)}&amp;` }))).toEqual([]);
  });
});
