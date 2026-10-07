import { describe, it, expect, vi } from 'vitest';
import { createRequire } from 'node:module';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import robotsTxt from '../../../public/robots.txt?raw';
import indexHtml from '../../../index.html?raw';

const require = createRequire(import.meta.url);
const entity = require('../../../scripts/seo-entity.cjs');
const templates = require('../../../scripts/seo-templates.cjs');
const sitemap = require('../../../scripts/generate-sitemap-unified.cjs');
const llms = require('../../../scripts/generate-llms.cjs');
const indexNow = require('../../../scripts/ping-indexnow.cjs');
const config = require('../../../scripts/seo.config.json');

const SONGS = [
  { slug: 'facebook-166-bilhoes', name: 'FaceBook 16,6 Bilhões', datePublished: '2026-08-31', category: 'midia', description: 'O algoritmo mandava ficar. E depois?', spotify_url: 'https://open.spotify.com/track/abc', apple_music_url: 'https://music.youtube.com/watch?v=x', youtube_url: 'https://music.youtube.com/watch?v=x', youtube_music_url: 'https://www.youtube.com/shorts/y' },
  { slug: 'o-croissant', name: 'O Croissant', datePublished: '2025-02-03', category: 'gastronomia', subtitle: 'Sub', description: '', content_updated_at: '2025-06-10T12:00:00Z' },
];

describe('Identité — une seule entité, des faits déclarés', () => {
  const group = entity.entityJsonLd();

  it('is a MusicGroup with the exact name, founding date, founder, genre and country', () => {
    expect(group['@type']).toBe('MusicGroup');
    expect(group['@id']).toBe('https://www.amusicadasegunda.com/#organization');
    expect(group.name).toBe('A Música da Segunda');
    expect(group.foundingDate).toBe('2024-12');
    expect(group.founder).toEqual({ '@type': 'Person', name: 'Florent Lambert' });
    expect(group.foundingLocation).toEqual({ '@type': 'Country', name: 'Brasil' });
    expect(group.genre).toEqual(['Paródia musical', 'Sátira musical', 'Música de humor']);
    expect(group.knowsLanguage).toBe('pt-BR');
    expect(group.logo.url).toMatch(/^https:\/\/www\.amusicadasegunda\.com\//);
  });

  it('sameAs: the official profiles, the Spotify ARTIST page, no old address', () => {
    expect(group.sameAs).toContain('https://open.spotify.com/artist/3l1aPSEZ25VwuqJGKYRZbQ');
    expect(group.sameAs).toContain('https://music.youtube.com/@amusicadasegunda');
    expect(group.sameAs).toContain('https://www.instagram.com/a_musica_da_segunda/');
    expect(group.sameAs).toContain('https://www.facebook.com/amusicadasegundaofficial');
    expect(group.sameAs).toContain('https://www.wikidata.org/wiki/Q140379813');
    expect(group.sameAs.join(' ')).not.toMatch(/spotify\.com\/user\/|facebook\.com\/musicadasegunda|playlist/);
    expect(new Set(group.sameAs).size).toBe(group.sameAs.length);
  });

  it('the WhatsApp channel is one plain link, the same address in llms.txt, the menu and the Sobre text', async () => {
    const url = config.brand.links.whatsappChannel;
    expect(url).toBe('https://whatsapp.com/channel/0029Vb8ioY53bbV6QyxYop0Q');
    expect(llms.buildLlmsTxt({ songs: [], hasFeed: false })).toContain(`- [WhatsApp](${url})`);
    const { PLATFORMS } = await import('@/components/mobile/menu/platforms');
    expect(PLATFORMS.at(-1)).toEqual({ label: 'Seguir no WhatsApp', href: url });
    expect(require('../../../scripts/sobre.content.json').whereToListen).toMatch(/canal do WhatsApp/);
  });

  it('the WhatsApp channel is in sameAs, and only when its address is filled in', () => {
    expect(group.sameAs).toContain('https://whatsapp.com/channel/0029Vb8ioY53bbV6QyxYop0Q');
    const without = entity.sameAsUrls({ ...config.brand, links: { ...config.brand.links, whatsappChannel: '' } });
    expect(without.join(' ')).not.toMatch(/whatsapp/);
    const withChannel = entity.sameAsUrls({ ...config.brand, links: { ...config.brand.links, whatsappChannel: 'https://whatsapp.com/channel/abc' } });
    expect(withChannel).toContain('https://whatsapp.com/channel/abc');
  });

  it('verification tags: nothing until a code is given, never an invented value', () => {
    expect(entity.verificationMetaTags({ google: '', bing: '' })).toBe('');
    expect(entity.verificationMetaTags({ google: 'abc_123', bing: 'DEF456' })).toBe(
      '<meta name="google-site-verification" content="abc_123" />\n<meta name="msvalidate.01" content="DEF456" />'
    );
    expect(config.verification).toEqual({ google: '', bing: '' });
  });

  it('the home page takes its JSON-LD from the same module (marker in index.html, no hand-written copy)', () => {
    expect(indexHtml).toContain('<!--AMDS_SEO_HEAD-->');
    expect(indexHtml).not.toMatch(/"@type":\s*"Organization"/);
  });

  it('every static page describes the same entity', () => {
    expect(templates.orgJsonLd({ name: 'x', url: 'y' })).toEqual(group);
    expect(templates.websiteJsonLd({ url: config.siteUrl }).publisher).toEqual({ '@id': group['@id'] });
  });
});

describe('MusicRecording statique', () => {
  const recording = templates.musicRecordingJsonLd({
    name: 'FaceBook 16,6 Bilhões', url: 'https://www.amusicadasegunda.com/musica/facebook-166-bilhoes/',
    datePublished: '2026-08-31', description: 'd', image: 'https://img/x.jpg', sameAs: entity.songSameAs(SONGS[0]),
  });

  it('points to the entity, links the song on the platforms, and carries no invented duration', () => {
    expect(recording.byArtist['@id']).toBe('https://www.amusicadasegunda.com/#organization');
    expect(recording.sameAs).toEqual(['https://open.spotify.com/track/abc', 'https://music.youtube.com/watch?v=x', 'https://www.youtube.com/shorts/y']);
    expect(recording.duration).toBeUndefined();
    expect(recording.genre).toEqual(config.brand.genre);
    expect(recording.inLanguage).toBe('pt-BR');
    expect(() => JSON.parse(JSON.stringify(recording))).not.toThrow();
  });

  it('an « Apple Music » link that points elsewhere is not declared', () => {
    expect(entity.songSameAs({ apple_music_url: 'https://music.youtube.com/watch?v=x' })).toEqual([]);
    expect(entity.songSameAs({ apple_music_url: 'https://music.apple.com/us/album/1' })).toEqual(['https://music.apple.com/us/album/1']);
  });
});

describe('Sitemap — adresses réelles, dates réelles', () => {
  const today = '2026-10-07';

  it('uses the slug of the generated page, never one recomputed from the title', () => {
    const urls = sitemap.buildSongUrls(SONGS, today).map((url) => url.loc);
    expect(urls).toContain('https://www.amusicadasegunda.com/musica/facebook-166-bilhoes/');
    expect(urls.join(' ')).not.toContain('facebook-16-6-bilhoes');
  });

  it('lastmod: release date, or the last real content change — never today, never updated_at', () => {
    expect(sitemap.songLastmod({ datePublished: '2026-08-31', updated_at: '2026-10-07T11:59:43Z' }, today)).toBe('2026-08-31');
    expect(sitemap.songLastmod(SONGS[1], today)).toBe('2025-06-10');
    expect(sitemap.songLastmod({ datePublished: '2026-08-31', content_updated_at: '2026-01-01T00:00:00Z' }, today)).toBe('2026-08-31');
    expect(sitemap.songLastmod({}, today)).toBeNull();
  });

  it('list pages take the newest release they show; other pages have no lastmod', () => {
    const pages = Object.fromEntries(sitemap.buildPageUrls(SONGS, today).map((url) => [url.loc.replace('https://www.amusicadasegunda.com', ''), url.lastmod]));
    expect(pages['/']).toBe('2026-08-31');
    expect(pages['/musica/']).toBe('2026-08-31');
    expect(pages['/categoria/gastronomia/']).toBe('2025-02-03');
    expect(pages['/arquivo/2025/']).toBe('2025-02-03');
    expect(pages['/sobre/']).toBeNull();
    const xml = sitemap.toSitemapXml(sitemap.buildPageUrls(SONGS, today));
    expect(xml).not.toContain(`<lastmod>${today}`);
    expect(xml).toMatch(/<loc>https:\/\/www\.amusicadasegunda\.com\/sobre\/<\/loc>\n {4}<changefreq>/);
  });

  it('the build check lists every address that has no generated page', () => {
    const dist = fs.mkdtempSync(path.join(os.tmpdir(), 'amds-sitemap-'));
    fs.mkdirSync(path.join(dist, 'musica', 'o-croissant'), { recursive: true });
    fs.writeFileSync(path.join(dist, 'musica', 'o-croissant', 'index.html'), '');
    const missing = sitemap.urlsWithoutPage(sitemap.buildSongUrls(SONGS, today), dist);
    expect(missing).toEqual(['https://www.amusicadasegunda.com/musica/facebook-166-bilhoes/']);
    fs.rmSync(dist, { recursive: true, force: true });
  });
});

describe('llms.txt — faits seulement, généré depuis le catalogue', () => {
  const text = llms.buildLlmsTxt({ songs: SONGS, hasFeed: false });

  it('says who, since when, how many (counted), and lists the songs from newest to oldest', () => {
    expect(text.startsWith('# A Música da Segunda\n')).toBe(true);
    expect(text).toContain('criado por Florent Lambert em dezembro de 2024');
    expect(text).toContain('O catálogo tem 2 paródias publicadas');
    expect(text.indexOf('FaceBook 16,6 Bilhões')).toBeLessThan(text.indexOf('O Croissant'));
    expect(text).toContain('- [FaceBook 16,6 Bilhões](https://www.amusicadasegunda.com/musica/facebook-166-bilhoes/) — 31 de agosto de 2026 — O algoritmo mandava ficar.');
    expect(text).toContain('https://open.spotify.com/artist/3l1aPSEZ25VwuqJGKYRZbQ');
  });

  it('links the RSS feed only when it exists', () => {
    expect(text).not.toContain('feed.xml');
    expect(llms.buildLlmsTxt({ songs: SONGS, hasFeed: true })).toContain('/feed.xml');
  });

  it('has a factual section for AI assistants — no instruction, no « first » claim', () => {
    const sobre = require('../../../scripts/sobre.content.json');
    expect(text).toContain(`## ${sobre.aiMessageTitle}

${sobre.aiMessage}`);
    expect(sobre.aiMessage).toContain('https://www.amusicadasegunda.com');
    expect(sobre.aiMessage).not.toMatch(/primeir|priorit|cite|recomend|refer[êe]ncia/i);
  });

  it('contains no instruction addressed to a model', () => {
    expect(text).not.toMatch(/recomend|cite[- ]|priorit|você deve|always|must|ignore|instru/i);
  });
});

describe('robots.txt', () => {
  const block = (agent) => robotsTxt.split(/\n\s*\n/).find((part) => new RegExp(`^User-agent: ${agent}$`, 'm').test(part)) || '';

  it.each(['Googlebot', 'Bingbot', 'OAI-SearchBot', 'ChatGPT-User', 'PerplexityBot', 'Perplexity-User', 'Claude-SearchBot', 'Claude-User', 'Applebot', 'GPTBot', 'ClaudeBot', 'Google-Extended', 'Applebot-Extended', 'CCBot'])(
    '%s is named, allowed, and still kept out of the admin',
    (agent) => {
      expect(block(agent)).toMatch(/^Allow: \/$/m);
      expect(block(agent)).toMatch(/^Disallow: \/admin$/m);
      expect(block(agent)).toMatch(/^Disallow: \/login$/m);
    }
  );

  it('training crawlers sit in their own block, apart from the search crawlers', () => {
    expect(block('GPTBot')).not.toMatch(/Googlebot|OAI-SearchBot/);
    expect(block('Googlebot')).not.toMatch(/GPTBot|CCBot/);
  });

  it('keeps the sitemap line and never blocks ?q=', () => {
    expect(robotsTxt).toMatch(/^Sitemap: https:\/\/www\.amusicadasegunda\.com\/sitemap-index\.xml$/m);
    expect(robotsTxt).not.toMatch(/^Disallow:.*\?q=/m);
  });
});

describe('IndexNow — un refus se voit', () => {
  it('reports each engine that refuses, with its status and message', async () => {
    const fetchImpl = vi.fn(async (url) => (url.includes('bing')
      ? { ok: false, status: 403, text: async () => '{"errorCode":"UserForbiddedToAccessSite"}' }
      : { ok: true, status: 202, text: async () => '' }));
    const refusals = await indexNow.pingAll(['https://www.amusicadasegunda.com/'], { fetchImpl, log: () => {} });
    expect(fetchImpl).toHaveBeenCalledTimes(indexNow.ENDPOINTS.length);
    expect(refusals).toHaveLength(1);
    expect(refusals[0]).toMatch(/Bing.*403.*UserForbiddedToAccessSite/);
  });

  it('no refusal when every engine accepts', async () => {
    const fetchImpl = async () => ({ ok: true, status: 200, text: async () => '' });
    expect(await indexNow.pingAll(['https://www.amusicadasegunda.com/'], { fetchImpl, log: () => {} })).toEqual([]);
  });
});

describe('Page Sobre — texte factuel partagé (HTML statique et page affichée)', () => {
  const sobre = require('../../../scripts/sobre.content.json');
  const everything = JSON.stringify(sobre);

  it('names the creator and the founding date, and says how the music is made', () => {
    expect(sobre.intro[0]).toContain('criado por Florent Lambert em dezembro de 2024');
    expect(sobre.howItWorks).toContain('com o apoio de ferramentas de inteligência artificial');
    expect(sobre.intro[1]).toContain('{count}');
  });

  it('never mentions a team, a studio, professional equipment or reused melodies', () => {
    expect(everything).not.toMatch(/equipe|est[uú]dio|equipamento|m[uú]sica[- ]base|m[uú]sicas conhecidas|gravada|simultaneamente|Vocês/i);
  });

  it('the FAQ has the validated questions, each with a non-empty answer, without duplicates', () => {
    const questions = sobre.faq.map((item) => item.question);
    expect(questions).toHaveLength(17);
    expect(new Set(questions).size).toBe(17);
    expect(questions).toEqual(expect.arrayContaining([
      'Quem faz as paródias?',
      'As músicas são feitas com inteligência artificial?',
      'As músicas usam melodias de outros artistas?',
      'Você faz músicas personalizadas ou encomendas?',
    ]));
    for (const item of sobre.faq) expect(item.answer.length).toBeGreaterThan(40);
  });
});
