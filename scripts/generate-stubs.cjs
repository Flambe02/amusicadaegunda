require('dotenv').config();
const fs = require('fs-extra');
const path = require('path');
const { baseHtml, orgJsonLd, websiteJsonLd, playlistJsonLd, musicRecordingJsonLd, breadcrumbsJsonLd, extractYouTubeId, buildYouTubeUrls } = require('./seo-templates.cjs');
// Note: videoObjectJsonLd removed - Google error "Video isn't on a watch page"

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
  
  // ✅ SEO: Contenu statique visible pour les crawlers sans JavaScript
  const songListHtml = songs.map(s =>
    `    <li style="margin-bottom: 0.5rem;"><a href="${siteUrl}/musica/${s.slug}/" style="color: #2563eb; text-decoration: none;">${s.name}</a>${s.byArtist?.name ? ` — ${s.byArtist.name}` : ''}</li>`
  ).join('\n');

  const playlistBody = `
<div style="max-width: 1200px; margin: 0 auto; padding: 1rem 1rem 2rem;">
  <h1 style="font-size: 2rem; font-weight: bold; margin-bottom: 0.5rem; color: #111;">Todas as Músicas</h1>
  <p style="font-size: 1.125rem; color: #666; margin-bottom: 1.5rem;">${playlistDesc}</p>
  <nav aria-label="Lista de músicas">
    <ol style="list-style: decimal; padding-left: 1.5rem;">
${songListHtml}
    </ol>
  </nav>
  <p style="margin-top: 1.5rem;"><a href="${siteUrl}/" style="color: #2563eb;">← Voltar ao início</a></p>
</div>`;

  const playlistHtml = baseHtml({
    lang: cfg.defaultLocale,
    title: playlistTitle,
    desc: playlistDesc,
    url: playlistUrl,
    image: `${siteUrl}${IMAGE}`,
    body: playlistBody,
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

  // ✅ SEO: Stub pour /home avec redirection 301 vers /
  const homeDir = path.join(OUT, 'home');
  const homeFile = path.join(homeDir, 'index.html');
  await fs.ensureDir(homeDir);
  const homeRedirectHtml = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="utf-8">
  <meta http-equiv="refresh" content="0; url=${siteUrl}/">
  <link rel="canonical" href="${siteUrl}/">
  <meta name="robots" content="noindex, follow">
  <title>Redirection - A Música da Segunda</title>
  <script>
    // Redirection JavaScript pour GitHub Pages (fallback)
    window.location.replace('${siteUrl}/');
  </script>
</head>
<body>
  <p>Redirection en cours vers <a href="${siteUrl}/">la page d'accueil</a>...</p>
</body>
</html>`;
  await fs.writeFile(homeFile, homeRedirectHtml, { encoding: 'utf8' });
  console.log(`✅ Stub /home créé avec redirection 301 vers /`);

  // ✅ SEO: Stub pour /playlist avec redirection 301 vers /musica (single source of truth)
  const playlistRedirectDir = path.join(OUT, 'playlist');
  const playlistRedirectFile = path.join(playlistRedirectDir, 'index.html');
  await fs.ensureDir(playlistRedirectDir);
  const playlistRedirectHtml = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="utf-8">
  <meta http-equiv="refresh" content="0; url=${siteUrl}/musica/">
  <link rel="canonical" href="${siteUrl}/musica/">
  <meta name="robots" content="noindex, follow">
  <title>Redirection - A Música da Segunda</title>
  <script>
    // Redirection JavaScript pour GitHub Pages (fallback)
    window.location.replace('${siteUrl}/musica/');
  </script>
</head>
<body>
  <p>Redirection en cours vers <a href="${siteUrl}/musica/">la playlist</a>...</p>
</body>
</html>`;
  await fs.writeFile(playlistRedirectFile, playlistRedirectHtml, { encoding: 'utf8' });
  console.log(`✅ Stub /playlist créé avec redirection 301 vers /musica/`);

  // ✅ SEO: Stubs pour les anciennes URLs /chansons/ avec redirection 301 vers /musica/
  const chansonsDir = path.join(OUT, 'chansons');
  await fs.ensureDir(chansonsDir);
  
  // Stub pour /chansons (liste)
  const chansonsListFile = path.join(chansonsDir, 'index.html');
  const chansonsListRedirectHtml = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="utf-8">
  <meta http-equiv="refresh" content="0; url=${siteUrl}/musica/">
  <link rel="canonical" href="${siteUrl}/musica/">
  <meta name="robots" content="noindex, follow">
  <title>Redirection - A Música da Segunda</title>
  <script>
    // Redirection JavaScript pour GitHub Pages (fallback)
    window.location.replace('${siteUrl}/musica/');
  </script>
</head>
<body>
  <p>Redirection en cours vers <a href="${siteUrl}/musica/">la playlist</a>...</p>
</body>
</html>`;
  await fs.writeFile(chansonsListFile, chansonsListRedirectHtml, { encoding: 'utf8' });
  console.log(`✅ Stub /chansons créé avec redirection 301 vers /musica/`);

  // Stubs pour chaque chanson /chansons/[slug] avec redirection vers /musica/[slug]
  for (const s of songs) {
    const legacyRoute = `/chansons/${s.slug}`;
    const legacyDir = path.join(OUT, 'chansons', s.slug);
    const legacyFile = path.join(legacyDir, 'index.html');
    await fs.ensureDir(legacyDir);
    const targetUrl = `${siteUrl}/musica/${s.slug}/`;
    const legacyRedirectHtml = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="utf-8">
  <meta http-equiv="refresh" content="0; url=${targetUrl}">
  <link rel="canonical" href="${targetUrl}">
  <meta name="robots" content="noindex, follow">
  <title>Redirection - ${s.name} | A Música da Segunda</title>
  <script>
    // Redirection JavaScript pour GitHub Pages (fallback)
    window.location.replace('${targetUrl}');
  </script>
</head>
<body>
  <p>Redirection en cours vers <a href="${targetUrl}">${s.name}</a>...</p>
</body>
</html>`;
    await fs.writeFile(legacyFile, legacyRedirectHtml, { encoding: 'utf8' });
  }
  console.log(`✅ Stubs /chansons/[slug] créés avec redirection 301 vers /musica/[slug] (${songs.length} chansons)`);

  // Song pages
  for (const s of songs) {
    const route = `/musica/${s.slug}`;
    const dir = path.join(OUT, 'musica', s.slug);
    const file = path.join(dir, 'index.html');
    await fs.ensureDir(dir);
    const url = `${siteUrl}${route}/`;
    const title = `${s.name} — A Música da Segunda`;
    const desc = `Letra, áudio e história de "${s.name}" — nova música da segunda.`;

    // ✅ Extraire videoId pour iframe YouTube statique (requis pour "watch page" Google)
    const youtubeUrl = s.youtube_url || s.youtube_music_url;
    let videoId = null;
    let embedSrc = null;
    if (youtubeUrl) {
      videoId = extractYouTubeId(youtubeUrl);
      if (videoId) {
        embedSrc = `https://www.youtube-nocookie.com/embed/${videoId}?rel=0&modestbranding=1&playsinline=1&controls=1`;
      }
    }

    // Contenu HTML statique visible avant le chargement React
    // ✅ Inclure iframe YouTube si disponible (requis pour Google "watch page")
    // ✅ LCP FIX: loading="eager" et fetchpriority="high" car c'est l'élément LCP principal
    const videoEmbedHtml = embedSrc ? `
  <div style="margin: 2rem 0;">
    <div style="position: relative; padding-bottom: 56.25%; height: 0; overflow: hidden; max-width: 100%; border-radius: 0.5rem; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
      <iframe
        style="position: absolute; top: 0; left: 0; width: 100%; height: 100%;"
        src="${embedSrc}"
        title="${s.name} - A Música da Segunda"
        frameborder="0"
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
        allowfullscreen
        loading="eager"
        fetchpriority="high"
      ></iframe>
    </div>
  </div>` : `
  <div style="text-align: center; padding: 2rem;">
    <p style="color: #888;">Carregando conteúdo...</p>
  </div>`;

    const staticBody = `
<div class="container mx-auto px-4 py-8" style="max-width: 1200px;">
  <h1 style="font-size: 2.5rem; font-weight: bold; margin-bottom: 1rem; color: #111;">${s.name}</h1>
  <p style="font-size: 1.125rem; color: #666; margin-bottom: 2rem;">${desc}</p>
  ${videoEmbedHtml}
</div>`;

    // ✅ VideoObject JSON-LD si YouTube URL disponible
    const jsonldSchemas = [
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
    ];

    // ❌ VideoObject REMOVED - Google error "Video isn't on a watch page"
    // Ces pages sont des MusicRecording, pas des pages dédiées aux vidéos.
    // Google refuse d'indexer les VideoObject sur des pages mixtes (musique + vidéo + texte).
    // Le MusicRecording est suffisant pour le SEO. Les vidéos YouTube sont découvertes via les iframes.
    // Voir: https://developers.google.com/search/docs/appearance/video

    const html = baseHtml({
      lang: s.inLanguage || cfg.defaultLocale,
      title,
      desc,
      url,
      image: s.image ? `${siteUrl}${s.image.startsWith('/') ? s.image : '/' + s.image}` : `${siteUrl}${IMAGE}`,
      body: staticBody,
      jsonld: jsonldSchemas,
      scripts
    });
    const versionComment = `<!-- build:${new Date().toISOString()} -->\n`;
    const htmlWithVersion = versionComment + html;
    await fs.writeFile(file, htmlWithVersion, { encoding: 'utf8' });

    // Créer aussi un fichier pour l'URL sans trailing slash (redirection)
    const fileNoSlash = path.join(OUT, 'musica', s.slug + '.html');
    const jsonldSchemasNoSlash = [
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
    ];

    // ❌ VideoObject REMOVED - Same reason as above (not a watch page)

    const htmlNoSlash = baseHtml({
      lang: s.inLanguage || cfg.defaultLocale,
      title,
      desc,
      url: `${siteUrl}${route}/`, // URL canonique avec trailing slash
      image: s.image ? `${siteUrl}${s.image.startsWith('/') ? s.image : '/' + s.image}` : `${siteUrl}${IMAGE}`,
      body: staticBody,
      jsonld: jsonldSchemasNoSlash,
      scripts
    });
    const versionCommentNoSlash = `<!-- build:${new Date().toISOString()} -->\n`;
    const htmlWithVersionNoSlash = versionCommentNoSlash + htmlNoSlash;
    await fs.writeFile(fileNoSlash, htmlWithVersionNoSlash, { encoding: 'utf8' });
  }

  // ✅ LCP FIX: Injecter le preload de la thumbnail YouTube dans dist/index.html
  // La homepage dépend de JS→React→API pour connaître l'URL de la thumbnail.
  // En injectant le preload au build-time, le navigateur commence à télécharger
  // la thumbnail dès le parsing HTML, sans attendre JavaScript.
  const indexHtmlPath = path.resolve('dist', 'index.html');
  if (songs.length > 0 && fs.existsSync(indexHtmlPath)) {
    // Trouver la chanson la plus récente (triée par datePublished desc)
    const sortedSongs = [...songs].sort((a, b) =>
      new Date(b.datePublished) - new Date(a.datePublished)
    );
    const currentSong = sortedSongs[0];
    const youtubeUrl = currentSong.youtube_music_url || currentSong.youtube_url;
    const videoId = youtubeUrl ? extractYouTubeId(youtubeUrl) : null;

    if (videoId) {
      const thumbnailUrl = `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`;
      let indexHtml = fs.readFileSync(indexHtmlPath, 'utf8');

      // Injecter le preload de la thumbnail YouTube après le preload du logo
      const preloadTag = `\n    <!-- ✅ LCP FIX: Preload de la thumbnail YouTube de la chanson actuelle (build-time) -->\n    <link rel="preload" href="${thumbnailUrl}" as="image" fetchpriority="high" crossorigin>`;
      indexHtml = indexHtml.replace(
        /(<link rel="preconnect" href="https:\/\/img\.youtube\.com">)/,
        `$1${preloadTag}`
      );

      // Injecter la thumbnail dans le contenu statique du <div id="root">
      // pour que le navigateur la rende immédiatement sans attendre JS
      const staticThumbnail = `\n        <div style="margin: 1rem auto; max-width: 480px; aspect-ratio: 16/9; border-radius: 0.5rem; overflow: hidden; position: relative;">\n          <img src="${thumbnailUrl}" alt="${currentSong.name} - A Música da Segunda" style="width: 100%; height: 100%; object-fit: cover;" fetchpriority="high" crossorigin>\n          <div style="position: absolute; inset: 0; display: flex; align-items: center; justify-content: center;">\n            <div style="width: 64px; height: 64px; background: rgba(220,38,38,0.9); border-radius: 50%; display: flex; align-items: center; justify-content: center;">\n              <svg viewBox="0 0 24 24" width="32" height="32" fill="white"><path d="M8 5v14l11-7z"/></svg>\n            </div>\n          </div>\n        </div>`;
      indexHtml = indexHtml.replace(
        /(<nav aria-label="Navegação principal">)/,
        `${staticThumbnail}\n        $1`
      );

      fs.writeFileSync(indexHtmlPath, indexHtml, 'utf8');
      console.log(`✅ Preload thumbnail YouTube injecté dans index.html (${currentSong.name}, video: ${videoId})`);
    }
  }

  console.log(`✅ Stubs enriquecidos em ${OUT} (static + songs JSON-LD).`);
})();

