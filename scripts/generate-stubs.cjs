const fs = require('fs-extra');
const path = require('path');
const { baseHtml, orgJsonLd, websiteJsonLd, playlistJsonLd, musicRecordingJsonLd } = require('./seo-templates.cjs');

const cfg = require('./seo.config.json');
const songsPath = path.resolve('content', 'songs.json');
const songs = fs.existsSync(songsPath) ? JSON.parse(fs.readFileSync(songsPath, 'utf8')) : [];

const OUT = path.resolve('dist');
const IMAGE = cfg.brand.logo || '/images/og-default.jpg';
const siteUrl = cfg.siteUrl;

(async () => {
  await fs.ensureDir(OUT);

  const org = orgJsonLd({ name: cfg.brand.name, url: siteUrl, logo: `${siteUrl}${IMAGE}` });
  const website = websiteJsonLd({ url: siteUrl, search: cfg.search });

  // Static pages
  for (const r of cfg.routes.static) {
    const dir = path.join(OUT, r.path === '/' ? '' : r.path.replace(/^\//, ''));
    const file = path.join(dir, 'index.html');
    await fs.ensureDir(dir);
    const url = `${siteUrl}${r.path === '/' ? '' : r.path}`;
    const jsonld = [org, website];

    if (r.path === '/playlist') {
      jsonld.push(playlistJsonLd({ name: 'Playlist — A Música da Segunda', url, image: `${siteUrl}${IMAGE}` }));
    }

    const html = baseHtml({
      lang: cfg.defaultLocale,
      title: r.title,
      desc: r.description,
      url,
      image: `${siteUrl}${IMAGE}`,
      jsonld
    });
    await fs.writeFile(file, html, 'utf8');
  }

  // Song pages
  for (const s of songs) {
    const route = `/chansons/${s.slug}`;
    const dir = path.join(OUT, 'chansons', s.slug);
    const file = path.join(dir, 'index.html');
    await fs.ensureDir(dir);
    const url = `${siteUrl}${route}`;
    const title = `${s.name} — A Música da Segunda`;
    const desc = `Letra, áudio e história de “${s.name}” — nova música da segunda.`;

    const html = baseHtml({
      lang: s.inLanguage || cfg.defaultLocale,
      title,
      desc,
      url,
      image: s.image ? `${siteUrl}${s.image.replace(/^\/?/, '')}` : `${siteUrl}${IMAGE.replace(/^\/?/, '')}`,
      jsonld: [
        org,
        website,
        musicRecordingJsonLd({
          name: s.name,
          url,
          datePublished: s.datePublished,
          audioUrl: s.audioUrl,
          image: s.image ? `${siteUrl}${s.image}` : `${siteUrl}${IMAGE}`,
          duration: s.duration,
          inLanguage: s.inLanguage,
          byArtist: s.byArtist
        })
      ]
    });
    await fs.writeFile(file, html, 'utf8');
  }

  console.log(`✅ Stubs enriquecidos em ${OUT} (static + songs JSON-LD).`);
})();

