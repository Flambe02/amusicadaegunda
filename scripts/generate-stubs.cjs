const fs = require('fs-extra');
const path = require('path');
const { baseHtml, orgJsonLd, websiteJsonLd, playlistJsonLd, musicRecordingJsonLd, breadcrumbsJsonLd } = require('./seo-templates.cjs');

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

  // ✅ STUB pour /musica (Playlist principale)
  const playlistDir = path.join(OUT, 'musica');
  const playlistFile = path.join(playlistDir, 'index.html');
  await fs.ensureDir(playlistDir);
  
  const playlistUrl = `${siteUrl}/musica/`;
  const playlistTitle = 'Playlist Completa - Todas as Músicas | A Música da Segunda';
  const playlistDesc = 'Playlist completa com todas as paródias musicais inteligentes sobre as notícias do Brasil. Ouça no Spotify, Apple Music e YouTube Music.';
  
  const playlistHtml = baseHtml({
    lang: cfg.defaultLocale,
    title: playlistTitle,
    desc: playlistDesc,
    url: playlistUrl,
    image: `${siteUrl}${IMAGE}`,
    jsonld: [
      org,
      website,
      playlistJsonLd({
        name: 'A Música da Segunda - Todas as Músicas',
        url: playlistUrl,
        tracks: songs.map(s => ({
          name: s.name,
          url: `${siteUrl}/musica/${s.slug}/`,
          byArtist: s.byArtist || 'A Música da Segunda'
        }))
      })
    ]
  });
  
  const playlistVersionComment = `<!-- build:${new Date().toISOString()} -->\n`;
  await fs.writeFile(playlistFile, playlistVersionComment + playlistHtml, { encoding: 'utf8' });
  console.log(`✅ Stub /musica créé avec MusicPlaylist JSON-LD (${songs.length} tracks)`);

  // Song pages
  for (const s of songs) {
    const route = `/musica/${s.slug}`;
    const dir = path.join(OUT, 'musica', s.slug);
    const file = path.join(dir, 'index.html');
    await fs.ensureDir(dir);
    const url = `${siteUrl}${route}/`;
    const title = `${s.name} — A Música da Segunda`;
    const desc = `Letra, áudio e história de "${s.name}" — nova música da segunda.`;

    const html = baseHtml({
      lang: s.inLanguage || cfg.defaultLocale,
      title,
      desc,
      url,
      image: s.image ? `${siteUrl}${s.image.startsWith('/') ? s.image : '/' + s.image}` : `${siteUrl}${IMAGE}`,
      jsonld: [
        org,
        website,
        musicRecordingJsonLd({
          name: s.name,
          url,
          datePublished: s.datePublished,
          audioUrl: s.audioUrl,
          image: s.image ? `${siteUrl}${s.image.startsWith('/') ? s.image : '/' + s.image}` : `${siteUrl}${IMAGE}`,
          duration: s.duration,
          inLanguage: s.inLanguage,
          byArtist: s.byArtist,
          description: desc
        }),
        breadcrumbsJsonLd({
          songName: s.name,
          songUrl: url
        })
      ]
    });
    const versionComment = `<!-- build:${new Date().toISOString()} -->\n`;
    const htmlWithVersion = versionComment + html;
    await fs.writeFile(file, htmlWithVersion, { encoding: 'utf8' });

    // Créer aussi un fichier pour l'URL sans trailing slash (redirection)
    const fileNoSlash = path.join(OUT, 'musica', s.slug + '.html');
    const htmlNoSlash = baseHtml({
      lang: s.inLanguage || cfg.defaultLocale,
      title,
      desc,
      url: `${siteUrl}${route}/`, // URL canonique avec trailing slash
      image: s.image ? `${siteUrl}${s.image.startsWith('/') ? s.image : '/' + s.image}` : `${siteUrl}${IMAGE}`,
      jsonld: [
        org,
        website,
        musicRecordingJsonLd({
          name: s.name,
          url: `${siteUrl}${route}/`,
          datePublished: s.datePublished,
          audioUrl: s.audioUrl,
          image: s.image ? `${siteUrl}${s.image.startsWith('/') ? s.image : '/' + s.image}` : `${siteUrl}${IMAGE}`,
          duration: s.duration,
          inLanguage: s.inLanguage,
          byArtist: s.byArtist,
          description: desc
        }),
        breadcrumbsJsonLd({
          songName: s.name,
          songUrl: `${siteUrl}${route}/`
        })
      ]
    });
    const versionCommentNoSlash = `<!-- build:${new Date().toISOString()} -->\n`;
    const htmlWithVersionNoSlash = versionCommentNoSlash + htmlNoSlash;
    await fs.writeFile(fileNoSlash, htmlWithVersionNoSlash, { encoding: 'utf8' });
  }

  console.log(`✅ Stubs enriquecidos em ${OUT} (static + songs JSON-LD).`);
})();

