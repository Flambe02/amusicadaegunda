const fs = require('fs-extra');
const path = require('path');
const { baseHtml, orgJsonLd, websiteJsonLd, playlistJsonLd, musicRecordingJsonLd, breadcrumbsJsonLd } = require('./seo-templates.cjs');

const cfg = require('./seo.config.json');
const songsPath = path.resolve('content', 'songs.json');
const songs = fs.existsSync(songsPath) ? JSON.parse(fs.readFileSync(songsPath, 'utf8')) : [];

const OUT = path.resolve('dist');
const IMAGE = cfg.brand.logo || '/images/og-default.jpg';
const siteUrl = cfg.siteUrl;

// 🔧 Extraire les scripts React depuis dist/index.html
function extractScriptsFromIndex() {
  const indexPath = path.resolve('dist', 'index.html');
  if (!fs.existsSync(indexPath)) {
    console.warn('⚠️ dist/index.html non trouvé, stubs sans scripts React');
    return { js: '', css: '' };
  }
  
  const indexHtml = fs.readFileSync(indexPath, 'utf8');
  
  // Extraire le script JS principal
  const jsMatch = indexHtml.match(/<script type="module" crossorigin src="([^"]+)"><\/script>/);
  const jsScript = jsMatch ? `<script type="module" crossorigin src="${jsMatch[1]}"></script>` : '';
  
  // Extraire le CSS principal
  const cssMatch = indexHtml.match(/<link rel="stylesheet" crossorigin href="([^"]+)">/);
  const cssLink = cssMatch ? `<link rel="stylesheet" crossorigin href="${cssMatch[1]}">` : '';
  
  // Extraire pwa-install.js
  const pwaScript = '<script src="/pwa-install.js"></script>';
  
  return { 
    js: jsScript,
    css: cssLink,
    pwa: pwaScript
  };
}

(async () => {
  await fs.ensureDir(OUT);
  
  const scripts = extractScriptsFromIndex();

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
          byArtist: s.byArtist?.name || s.byArtist || 'A Música da Segunda'
        }))
      })
    ],
    scripts
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

    // Contenu HTML statique visible avant le chargement React
    const staticBody = `
<div class="container mx-auto px-4 py-8" style="max-width: 1200px;">
  <h1 style="font-size: 2.5rem; font-weight: bold; margin-bottom: 1rem; color: #111;">${s.name}</h1>
  <p style="font-size: 1.125rem; color: #666; margin-bottom: 2rem;">${desc}</p>
  <div style="text-align: center; padding: 2rem;">
    <p style="color: #888;">Carregando conteúdo...</p>
  </div>
</div>`;

    const html = baseHtml({
      lang: s.inLanguage || cfg.defaultLocale,
      title,
      desc,
      url,
      image: s.image ? `${siteUrl}${s.image.startsWith('/') ? s.image : '/' + s.image}` : `${siteUrl}${IMAGE}`,
      body: staticBody,
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
      ],
      scripts
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
      body: staticBody,
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
      ],
      scripts
    });
    const versionCommentNoSlash = `<!-- build:${new Date().toISOString()} -->\n`;
    const htmlWithVersionNoSlash = versionCommentNoSlash + htmlNoSlash;
    await fs.writeFile(fileNoSlash, htmlWithVersionNoSlash, { encoding: 'utf8' });
  }

  console.log(`✅ Stubs enriquecidos em ${OUT} (static + songs JSON-LD).`);
})();

