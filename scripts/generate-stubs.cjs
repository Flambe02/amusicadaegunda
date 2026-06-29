require('dotenv').config();
const fs = require('fs-extra');
const path = require('path');
const {
  baseHtml,
  orgJsonLd,
  websiteJsonLd,
  playlistJsonLd,
  musicRecordingJsonLd,
  breadcrumbsJsonLd,
  extractYouTubeId,
  buildYouTubeUrls
} = require('./seo-templates.cjs');

const cfg = require('./seo.config.json');
const songsPath = path.resolve('content', 'songs.json');
const songs = fs.existsSync(songsPath) ? JSON.parse(fs.readFileSync(songsPath, 'utf8')) : [];

const OUT = path.resolve('dist');
const IMAGE = cfg.brand.logo || '/images/og-default.jpg';
const siteUrl = cfg.siteUrl;

// ✅ SEO: Image sociale dédiée 1200x630 (vs logo transparent inadapté pour OG/Twitter).
// Utilisée comme og:image par défaut pour toutes les pages sans miniature propre.
const OG_IMAGE = '/images/og-social-1200x630.jpg';
const OG_IMAGE_W = 1200;
const OG_IMAGE_H = 630;

// ✅ Source unique des libellés/descriptions de catégories (inclut "economia").
// Hoistée au niveau module pour être disponible dès la boucle des chansons.
const CATEGORY_LABELS = {
  internacional: 'Internacional',
  midia: 'Mídia',
  energia: 'Energia',
  esporte: 'Esporte',
  cultura: 'Cultura',
  outros: 'Outros',
  saude: 'Saúde',
  policia: 'Polícia',
  politica: 'Política',
  seguranca: 'Segurança',
  tecnologia: 'Tecnologia',
  gastronomia: 'Gastronomia',
  economia: 'Economia',
};

const CATEGORY_DESCRIPTIONS = {
  internacional: 'Paródias sobre geopolítica, diplomacia e eventos fora do Brasil.',
  midia: 'Sátiras sobre jornalismo, redes sociais e comunicação.',
  energia: 'Músicas sobre crises energéticas, apagões e infraestrutura elétrica.',
  esporte: 'Paródias do universo do esporte brasileiro e internacional.',
  cultura: 'Sátiras sobre carnaval, entretenimento e vida cultural brasileira.',
  outros: 'Músicas sobre temas variados do cotidiano.',
  saude: 'Paródias sobre saúde pública, medicina e bem-estar.',
  policia: 'Sátiras sobre segurança pública e casos policiais.',
  politica: 'Músicas sobre política brasileira, eleições e mandatos.',
  seguranca: 'Paródias sobre violência urbana e segurança pública.',
  tecnologia: 'Sátiras sobre startups, inteligência artificial e inovação.',
  gastronomia: 'Músicas sobre gastronomia, culinária e cultura alimentar.',
  economia: 'Paródias sobre economia, inflação, preços, mercado e finanças do Brasil.',
};

// ✅ SEO: titre court et keyword-friendly (≤ ~60 c.) pour <title> et og:title.
// Le sous-titre long (phrase descriptive) reste dans le <h1> et la description.
function shortSongTitle(name, category) {
  const cat = CATEGORY_LABELS[category];
  return cat
    ? `${name} — Paródia ${cat} | A Música da Segunda`
    : `${name} — Paródia Musical | A Música da Segunda`;
}

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

  const org = orgJsonLd({
    name: cfg.brand.name,
    url: siteUrl,
    logo: `${siteUrl}${IMAGE}`,
    sameAs: cfg.brand.sameAs || []
  });
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
    robots: 'index, follow, max-video-preview:0',
    image: `${siteUrl}${OG_IMAGE}`,
    imageWidth: OG_IMAGE_W,
    imageHeight: OG_IMAGE_H,
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

  // ✅ SEO: Stubs statiques pour pages éditoriales (crawlers sans JS)
  const staticPages = [
    {
      path: '/sobre',
      title: 'Sobre o Projeto — A Música da Segunda | Paródia e Sátira Musical das Notícias do Brasil',
      description: 'A Música da Segunda é um projeto de sátira musical semanal. Toda segunda-feira, um acontecimento do noticiário brasileiro vira paródia musical com letra, vídeo e contexto editorial.'
    },
    {
      path: '/calendar',
      title: 'Calendário Musical - A Música da Segunda',
      description: 'Calendário completo com as músicas publicadas por mês.'
    },
    {
      path: '/blog',
      title: 'Blog - A Música da Segunda',
      description: 'Artigos e notícias sobre música, cultura e atualidades.'
    },
    {
      path: '/roda',
      title: 'A Roda de Segunda - Descubra uma Música',
      description: 'Gire a roda e descubra uma música aleatória do projeto.'
    },
    {
      path: '/adventcalendar',
      title: 'Calendário do Advento - A Música da Segunda',
      description: 'Uma surpresa musical por dia no calendário do advento.'
    },
    {
      path: '/privacy',
      title: 'Política de Privacidade — A Música da Segunda',
      description: 'Política de privacidade do A Música da Segunda: quais dados são coletados, como são protegidos e como solicitar a exclusão. Conformidade LGPD.'
    }
  ];

  // ✅ SEO: Rich static body for /sobre (crawlable without JS)
  const sobreBody = `
<div style="max-width: 800px; margin: 0 auto; padding: 1.5rem 1rem 3rem; font-family: Georgia, serif; line-height: 1.8; color: #222;">
  <h1 style="font-size: 2rem; font-weight: bold; margin-bottom: 0.25rem; color: #111;">A Música da Segunda</h1>
  <p style="font-size: 1.05rem; color: #666; font-style: italic; margin-bottom: 2rem;">Paródia e sátira musical das notícias do Brasil, publicada toda segunda-feira.</p>

  <p style="margin-bottom: 1.25rem;">A Música da Segunda é um projeto de sátira musical semanal. Toda semana, um acontecimento real do noticiário brasileiro — político, econômico, cultural ou internacional — vira o tema de uma nova paródia musical publicada às segundas-feiras.</p>

  <p style="margin-bottom: 1.25rem;">O projeto surgiu da ideia de que o humor é uma das formas mais eficazes de processar e comentar a realidade. Em vez de um artigo ou uma thread, a sátira vem em forma de música: com letra, melodia e um ponto de vista bem claro sobre o que está acontecendo no Brasil.</p>

  <h2 style="font-size: 1.4rem; font-weight: bold; margin: 2rem 0 0.75rem; color: #111;">Por que paródia musical?</h2>
  <p style="margin-bottom: 1.25rem;">A paródia musical combina duas coisas que os brasileiros adoram: música e humor político. Uma letra bem construída consegue sintetizar em três minutos o que levaria uma coluna inteira para explicar — e ainda faz rir. É crítica com melodia. É análise com ritmo.</p>

  <h2 style="font-size: 1.4rem; font-weight: bold; margin: 2rem 0 0.75rem; color: #111;">Como funciona?</h2>
  <p style="margin-bottom: 1.25rem;">A cada semana, o projeto acompanha as notícias do Brasil e do mundo. Quando um tema se destaca — um escândalo político, uma crise econômica, um momento cultural, uma polêmica internacional — ele vira o mote da nova música. A letra é escrita, a música gravada, e tudo é publicado às segundas.</p>
  <p style="margin-bottom: 1.25rem;">Cada página de música traz a letra completa, o vídeo, e o contexto da notícia que inspirou a paródia. Porque entender o que está sendo satirizado faz parte da piada.</p>

  <h2 style="font-size: 1.4rem; font-weight: bold; margin: 2rem 0 0.75rem; color: #111;">Temas</h2>
  <p style="margin-bottom: 1.25rem;">O projeto já publicou paródias sobre política brasileira, economia, energia elétrica, futebol, carnaval, geopolítica internacional, escândalos corporativos, cultura popular e muito mais. Cada semana é uma surpresa — e uma nova janela de humor sobre a realidade.</p>

  <p style="margin-top: 2rem;"><a href="${siteUrl}/musica/" style="color: #2563eb; text-decoration: underline; font-family: sans-serif;">← Ver todas as músicas</a></p>
</div>`;

  for (const page of staticPages) {
    const slug = page.path.replace(/^\//, '');
    const pageDir = path.join(OUT, slug);
    const pageFile = path.join(pageDir, 'index.html');
    await fs.ensureDir(pageDir);

    const pageUrl = `${siteUrl}${page.path}/`;
    // ✅ SEO: /sobre gets rich editorial body; other pages get minimal body
    const pageBody = page.path === '/sobre' ? sobreBody : `
<div style="max-width: 1200px; margin: 0 auto; padding: 1rem 1rem 2rem;">
  <h1 style="font-size: 2rem; font-weight: bold; margin-bottom: 0.5rem; color: #111;">${page.title}</h1>
  <p style="font-size: 1.125rem; color: #666; margin-bottom: 1.5rem;">${page.description}</p>
  <p><a href="${siteUrl}/" style="color: #2563eb;">← Voltar ao início</a></p>
</div>`;

    // ✅ SEO: /blog ré-affiche les mêmes descriptions que /musica/[slug] (contenu
    // dupliqué, rendu client-side). On le rend noindex,follow pour éviter la
    // cannibalisation, tout en gardant la page navigable pour les humains.
    const pageRobots = page.path === '/blog'
      ? 'noindex, follow'
      : 'index, follow, max-video-preview:0';

    const pageHtml = baseHtml({
      lang: cfg.defaultLocale,
      title: page.title,
      desc: page.description,
      url: pageUrl,
      robots: pageRobots,
      image: `${siteUrl}${OG_IMAGE}`,
      imageWidth: OG_IMAGE_W,
      imageHeight: OG_IMAGE_H,
      body: pageBody,
      jsonld: [org, website],
      scripts
    });

    const pageVersionComment = `<!-- build:${new Date().toISOString()} -->\n`;
    await fs.writeFile(pageFile, pageVersionComment + pageHtml, { encoding: 'utf8' });
  }
  console.log(`✅ Stubs statiques créés pour pages éditoriales (${staticPages.length})`);

  // ✅ Admin: Stub minimal pour /admin (noindex, juste charger la SPA)
  const adminDir = path.join(OUT, 'admin');
  const adminFile = path.join(adminDir, 'index.html');
  await fs.ensureDir(adminDir);
  const adminHtml = `<!-- build:${new Date().toISOString()} -->
<!doctype html>
<html lang="pt-BR">
<head>
<meta charset="utf-8"/>
<meta name="viewport" content="width=device-width,initial-scale=1"/>
<title>Admin - A Música da Segunda</title>
<meta name="robots" content="noindex, nofollow"/>
${scripts.css}
${scripts.js}
</head>
<body>
<div id="root"></div>
<noscript>Este site requer JavaScript para interação total.</noscript>
<script src="/pwa-install.js"></script>
</body>
</html>`;
  await fs.writeFile(adminFile, adminHtml, { encoding: 'utf8' });
  console.log('✅ Stub /admin créé');

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

    // Canonical video for watch-page markup and embed
    const youtubeUrl = s.youtube_url || s.youtube_music_url;
    const videoId = youtubeUrl ? extractYouTubeId(youtubeUrl) : null;
    const youtubeUrls = videoId ? buildYouTubeUrls(videoId) : null;
    const embedSrc = youtubeUrls
      ? `${youtubeUrls.embedUrl}?rel=0&modestbranding=1&playsinline=1&controls=1`
      : null;

    // ✅ SEO: Two separate descriptions
    // metaDesc (≤155 chars) → <meta name="description"> and <title>
    // fullDesc (complete)   → JSON-LD description + static body
    const fullDesc = s.description || `Letra, áudio e história de "${s.name}" — paródia musical da segunda.`;
    const metaDesc = fullDesc.length > 155 ? fullDesc.slice(0, 152).trimEnd() + '...' : fullDesc;

    // ✅ SEO: titre court (≤ ~60 c.). Le sous-titre long reste dans le <h1>/contexte.
    const pageTitle = shortSongTitle(s.name, s.category);

    // ✅ SEO: Subtitle block under H1
    const subtitleHtml = s.subtitle
      ? `\n  <p style="font-size: 1.1rem; color: #555; margin-top: 0.35rem; margin-bottom: 1.5rem; font-style: italic;">${s.subtitle}</p>`
      : '';

    // ✅ SEO: Context block — full description visible for crawlers (not truncated)
    const contextHtml = fullDesc ? `
  <div style="margin-bottom: 2rem; padding: 1.25rem 1.5rem; background: #f5f5f5; border-left: 4px solid #222; border-radius: 0.5rem;">
    <p style="font-size: 1rem; line-height: 1.8; color: #333; white-space: pre-wrap;">${fullDesc.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')}</p>
  </div>` : '';

    // ✅ LCP FIX: loading="eager" et fetchpriority="high" car c'est l'élément LCP principal
    const videoEmbedHtml = embedSrc ? `
  <div style="margin: 2rem 0;">
    <h2 style="font-size: 1.5rem; font-weight: bold; margin-bottom: 1rem; color: #111;">Assista</h2>
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

    // ✅ Escape HTML special chars in lyrics to prevent XSS in static stub
    const escapedLyrics = s.lyrics
      ? s.lyrics.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      : null;
    const lyricsHtml = escapedLyrics ? `
  <div style="margin: 2rem 0;">
    <h2 style="font-size: 1.5rem; font-weight: bold; margin-bottom: 1rem; color: #111;">A Letra</h2>
    <div style="white-space: pre-wrap; font-family: Georgia, serif; line-height: 1.8; color: #333; background: #f9f9f9; padding: 1.5rem; border-radius: 0.5rem; border-left: 4px solid #e63946;">${escapedLyrics}</div>
  </div>` : '';

    // Related songs (same category, up to 4, excluding self)
    const relatedSongs = s.category
      ? songs.filter(r => r.category === s.category && r.slug !== s.slug).slice(0, 4)
      : [];
    const relatedHtml = relatedSongs.length > 0 ? `
  <div style="margin: 2.5rem 0; padding: 1.25rem 1.5rem; background: #f0f4ff; border-radius: 0.75rem;">
    <h2 style="font-size: 1.1rem; font-weight: bold; margin-bottom: 0.75rem; color: #111;">Outras músicas sobre o mesmo tema</h2>
    <ul style="list-style: none; padding: 0; margin: 0; display: flex; flex-direction: column; gap: 0.5rem;">
      ${relatedSongs.map(r => `<li><a href="${siteUrl}/musica/${r.slug}/" style="color: #2563eb; text-decoration: none; font-weight: 600;">${r.name}</a>${r.subtitle ? ` <span style="color:#666; font-style: italic;">— ${r.subtitle}</span>` : ''}</li>`).join('\n      ')}
    </ul>
    <p style="margin-top: 0.75rem;"><a href="${siteUrl}/categoria/${s.category}/" style="color: #2563eb; font-size: 0.9rem;">Ver todas as músicas desta categoria →</a></p>
  </div>` : '';

    const staticBody = `
<div class="container mx-auto px-4 py-8" style="max-width: 1200px;">
  <h1 style="font-size: 2.5rem; font-weight: bold; margin-bottom: 0.25rem; color: #111;">${s.name}</h1>${subtitleHtml}
  ${contextHtml}
  ${videoEmbedHtml}
  ${lyricsHtml}
  ${relatedHtml}
</div>`;

    // Derive keywords from category, title, subtitle, and fixed terms
    const songKeywords = [
      s.name,
      s.subtitle ? s.subtitle.replace(/—.*$/, '').trim() : null,
      s.category || null,
      'paródia musical',
      'música da segunda',
      'brasil',
      'sátira musical',
    ].filter(Boolean);

    // ✅ SEO Fix 3 — Use YouTube thumbnail as OG/JSON-LD image when available
    // (fallback to brand logo if no videoId). Social shares previously showed
    // the generic brand image even though every song has a YouTube embed.
    let songImage, songImageW, songImageH;
    if (videoId) {
      // Miniature YouTube hqdefault = 480x360 (dimensions honnêtes, vs 1200x630 erroné avant)
      songImage = `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`;
      songImageW = 480;
      songImageH = 360;
    } else if (s.image) {
      // Dimensions inconnues → on n'émet pas de og:image:width/height (évite une fausse valeur)
      songImage = `${siteUrl}${s.image.startsWith('/') ? s.image : '/' + s.image}`;
      songImageW = null;
      songImageH = null;
    } else {
      songImage = `${siteUrl}${OG_IMAGE}`;
      songImageW = OG_IMAGE_W;
      songImageH = OG_IMAGE_H;
    }

    // Structured data for song watch page
    const jsonldSchemas = [
      org,
      website,
      musicRecordingJsonLd({
        name: s.name,
        url,
        datePublished: s.datePublished,
        audioUrl: s.audioUrl,
        image: songImage,
        duration: s.duration,
        inLanguage: s.inLanguage,
        byArtist: s.byArtist,
        description: fullDesc,
        keywords: songKeywords,
      }),
      // breadcrumbsJsonLd here is the CJS version from seo-templates.cjs,
      // whose signature is { songName, songUrl } — different from the ESM
      // src/lib/seo-jsonld.js version ({ title, slug }) used by Song.jsx.
      breadcrumbsJsonLd({
        songName: s.name,
        songUrl: url,
      }),
    ];

    const html = baseHtml({
      lang: s.inLanguage || cfg.defaultLocale,
      title: pageTitle,
      desc: metaDesc,
      url,
      robots: 'index, follow, max-video-preview:0',
      ogType: 'music.song',
      image: songImage,
      imageWidth: songImageW,
      imageHeight: songImageH,
      body: staticBody,
      jsonld: jsonldSchemas,
      scripts,
      publishedTime: s.datePublished || null,
      articleSection: s.category || null,
    });
    const versionComment = `<!-- build:${new Date().toISOString()} -->\n`;
    const htmlWithVersion = versionComment + html;
    await fs.writeFile(file, htmlWithVersion, { encoding: 'utf8' });

    // ✅ SEO Fix 1 — /musica/[slug].html no-slash variant is now a 301
    // redirect to the canonical /musica/[slug]/ instead of a duplicate full
    // page. Same pattern as /chansons/[slug] above. Keeps any old bookmark
    // or external backlink working, avoids duplicate content.
    const fileNoSlash = path.join(OUT, 'musica', s.slug + '.html');
    const noSlashRedirectHtml = `<!DOCTYPE html>
<html lang="${s.inLanguage || cfg.defaultLocale}">
<head>
  <meta charset="utf-8">
  <meta http-equiv="refresh" content="0; url=${url}">
  <link rel="canonical" href="${url}">
  <meta name="robots" content="noindex, follow">
  <title>Redirection - ${s.name} | A Música da Segunda</title>
  <script>
    window.location.replace('${url}');
  </script>
</head>
<body>
  <p>Redirection en cours vers <a href="${url}">${s.name}</a>...</p>
</body>
</html>`;
    await fs.writeFile(fileNoSlash, noSlashRedirectHtml, { encoding: 'utf8' });
  }

  // ✅ SEO: Stubs for category pages /categoria/[slug]
  // (CATEGORY_LABELS / CATEGORY_DESCRIPTIONS sont définis au niveau module, inclut "economia")

  // Collect unique categories present in songs.json
  const categoriesInUse = [...new Set(songs.map(s => s.category).filter(Boolean))];

  for (const catSlug of categoriesInUse) {
    const catLabel = CATEGORY_LABELS[catSlug] || catSlug;
    const catDesc = CATEGORY_DESCRIPTIONS[catSlug] || `Paródias musicais da categoria ${catLabel} — A Música da Segunda.`;
    const catSongs = songs.filter(s => s.category === catSlug);
    const catUrl = `${siteUrl}/categoria/${catSlug}/`;
    const catTitle = `${catLabel} — Paródias Musicais | A Música da Segunda`;

    const catSongListHtml = catSongs.map((s, i) =>
      `    <li style="margin-bottom: 0.5rem;"><a href="${siteUrl}/musica/${s.slug}/" style="color: #2563eb; text-decoration: none;">${s.name}</a>${s.subtitle ? ` — <em style="color:#555;">${s.subtitle}</em>` : ''}</li>`
    ).join('\n');

    const catBody = `
<div style="max-width: 800px; margin: 0 auto; padding: 1.5rem 1rem 3rem; font-family: sans-serif; line-height: 1.7; color: #222;">
  <p style="font-size: 0.75rem; text-transform: uppercase; letter-spacing: 0.2em; color: #888; margin-bottom: 0.5rem;">Categoria</p>
  <h1 style="font-size: 2rem; font-weight: bold; margin-bottom: 0.5rem; color: #111;">${catLabel}</h1>
  <p style="font-size: 1.05rem; color: #555; margin-bottom: 2rem;">${catDesc}</p>
  <nav aria-label="Músicas da categoria ${catLabel}">
    <ol style="list-style: decimal; padding-left: 1.5rem;">
${catSongListHtml}
    </ol>
  </nav>
  <p style="margin-top: 2rem;"><a href="${siteUrl}/musica/" style="color: #2563eb;">← Todas as músicas</a></p>
</div>`;

    const catHtml = baseHtml({
      lang: cfg.defaultLocale,
      title: catTitle,
      desc: catDesc,
      url: catUrl,
      robots: 'index, follow, max-video-preview:0',
      image: `${siteUrl}${OG_IMAGE}`,
      imageWidth: OG_IMAGE_W,
      imageHeight: OG_IMAGE_H,
      body: catBody,
      jsonld: [org, website],
      scripts
    });

    const catDir = path.join(OUT, 'categoria', catSlug);
    await fs.ensureDir(catDir);
    const catFile = path.join(catDir, 'index.html');
    await fs.writeFile(catFile, `<!-- build:${new Date().toISOString()} -->\n` + catHtml, { encoding: 'utf8' });
  }
  console.log(`✅ Stubs /categoria/[slug] créés (${categoriesInUse.length} catégories)`);

  // ✅ LCP FIX: Injecter le preload de la miniature courante dans dist/index.html.
  // On privilégie une copie same-origin générée au build pour éviter une dépendance
  // réseau immédiate vers img.youtube.com sur mobile.
  const indexHtmlPath = path.resolve('dist', 'index.html');
  if (songs.length > 0 && fs.existsSync(indexHtmlPath)) {
    // Trouver la chanson la plus récente (triée par datePublished desc)
    const sortedSongs = [...songs].sort((a, b) =>
      new Date(b.datePublished) - new Date(a.datePublished)
    );
    const currentSong = sortedSongs[0];
    const youtubeUrl = currentSong.youtube_url || currentSong.youtube_music_url;
    const videoId = youtubeUrl ? extractYouTubeId(youtubeUrl) : null;

    if (videoId) {
      const localThumbnailPath = '/images/current-song-thumb.webp';
      const localThumbnailFile = path.resolve('public', localThumbnailPath.replace(/^\//, ''));
      const thumbnailUrl = fs.existsSync(localThumbnailFile)
        ? localThumbnailPath
        : `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`;
      let indexHtml = fs.readFileSync(indexHtmlPath, 'utf8');

      const preloadTag = fs.existsSync(localThumbnailFile)
        ? `\n    <!-- ✅ LCP FIX: Preload same-origin de la miniature courante -->` +
          `\n    <link rel="preload" href="${thumbnailUrl}" as="image" fetchpriority="high">`
        : `\n    <!-- ✅ LCP FIX: Preload de secours de la thumbnail YouTube courante -->` +
          `\n    <link rel="preconnect" href="https://img.youtube.com" crossorigin>` +
          `\n    <link rel="preload" href="${thumbnailUrl}" as="image" fetchpriority="high" crossorigin>`;

      indexHtml = indexHtml.replace(
        /<\/head>/,
        `${preloadTag}\n  </head>`
      );

      fs.writeFileSync(indexHtmlPath, indexHtml, 'utf8');
      console.log(`✅ Preload miniature courante injecté dans index.html (${currentSong.name}, source: ${thumbnailUrl})`);
    }
  }

  // ✅ SEO BRAND: Enrichir le contenu statique de la homepage pour le brand SERP
  // Injecter chansons récentes + catégories dans div#root pour les crawlers sans JS
  if (songs.length > 0 && fs.existsSync(indexHtmlPath)) {
    // CATEGORY_LABELS défini au niveau module (inclut "economia")
    const recentSongs = [...songs]
      .sort((a, b) => new Date(b.datePublished || 0) - new Date(a.datePublished || 0))
      .slice(0, 8);
    const categoriesInHomepage = [...new Set(songs.map(s => s.category).filter(c => c && CATEGORY_LABELS[c]))];

    const recentSongsHtml = recentSongs.map(s =>
      `<li><a href="${siteUrl}/musica/${s.slug}/">${s.name}${s.subtitle ? ` — ${s.subtitle}` : ''}</a></li>`
    ).join('\n        ');

    const categoriesHtml = categoriesInHomepage.map(cat =>
      `<a href="${siteUrl}/categoria/${cat}/">${CATEGORY_LABELS[cat]}</a>`
    ).join(' · ');

    const richStaticBody = `<main id="main" class="app-shell-fallback">
        <h1>A Música da Segunda</h1>
        <p>Nova música toda segunda-feira. Paródias musicais inteligentes sobre as notícias do Brasil, com humor, contexto e sátira musical. Mais de ${songs.length} paródias disponíveis.</p>
        <nav aria-label="Navegar por tema">
          <p style="font-size:0.9em;font-weight:bold;margin-bottom:0.25rem">Explorar por tema:</p>
          <p>${categoriesHtml}</p>
        </nav>
        <section aria-label="Músicas recentes">
          <p style="font-size:0.9em;font-weight:bold;margin:1rem 0 0.25rem">Músicas recentes:</p>
          <ul style="list-style:disc;padding-left:1.2rem">
        ${recentSongsHtml}
          </ul>
        </section>
        <nav aria-label="Navegação principal" style="margin-top:1rem">
          <a href="${siteUrl}/musica/">Ver todas as músicas</a> ·
          <a href="${siteUrl}/sobre/">Sobre o projeto</a>
        </nav>
      </main>`;

    let indexHtml = fs.readFileSync(indexHtmlPath, 'utf8');
    indexHtml = indexHtml.replace(
      /<main id="main" class="app-shell-fallback">[\s\S]*?<\/main>/,
      richStaticBody
    );
    fs.writeFileSync(indexHtmlPath, indexHtml, 'utf8');
    console.log(`✅ Contenu statique homepage enrichi (${recentSongs.length} chansons récentes, ${categoriesInHomepage.length} catégories)`);
  }

  console.log(`✅ Stubs enriquecidos em ${OUT} (static + songs JSON-LD).`);
})();

