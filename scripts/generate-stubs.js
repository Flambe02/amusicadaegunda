/*
 * SEO stubs generator for GitHub Pages SPA (React + Vite)
 * - Creates clean-path HTML stubs under dist/ that redirect to SPA hash routes
 * - Generates a sitemap.xml with clean paths
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DIST_DIR = path.resolve(process.cwd(), 'dist');
const BASE_URL = 'https://www.amusicadasegunda.com';

const ensureDir = (p) => fs.mkdirSync(p, { recursive: true });
const writeFile = (p, c) => fs.writeFileSync(p, c, 'utf8');

// Try to read songs data from src/data/songs.json or data/songs.json fallback
function loadSongs() {
  const candidates = [
    path.resolve(process.cwd(), 'src', 'data', 'songs.json'),
    path.resolve(process.cwd(), 'data', 'songs.json')
  ];
  for (const file of candidates) {
    if (fs.existsSync(file)) {
      try {
        const json = JSON.parse(fs.readFileSync(file, 'utf8'));
        if (Array.isArray(json)) {
          return json
            .map((item) => {
              if (!item) return null;
              if (typeof item === 'string') return { slug: item, title: item };
              if (item.slug) return item;
              return null;
            })
            .filter(Boolean);
        }
      } catch {}
    }
  }
  return [];
}

function htmlStub({ title, description, canonicalPath, ogImage, spaHashPath, jsonLd }) {
  const url = `${BASE_URL}${canonicalPath}`;
  const img = ogImage || `${BASE_URL}/images/LogoMusica.png`;
  const safeTitle = title || 'A Música da Segunda';
  const safeDesc = description || 'Descubra uma nova música incrível toda segunda-feira.';
  return `<!doctype html>
<html lang="pt-BR">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${safeTitle}</title>
  <meta name="description" content="${safeDesc}" />
  <link rel="canonical" href="${url}" />
  <meta property="og:type" content="website" />
  <meta property="og:title" content="${safeTitle}" />
  <meta property="og:description" content="${safeDesc}" />
  <meta property="og:url" content="${url}" />
  <meta property="og:image" content="${img}" />
  <meta name="twitter:card" content="summary_large_image" />
  <meta name="twitter:title" content="${safeTitle}" />
  <meta name="twitter:description" content="${safeDesc}" />
  <meta name="twitter:image" content="${img}" />
  <meta name="robots" content="index,follow" />
  ${jsonLd ? `<script type="application/ld+json">${jsonLd}</script>` : ''}
  <script>(function(){setTimeout(function(){ try{window.location.replace('${spaHashPath}')}catch(e){window.location.href='${spaHashPath}'} }, 400);})();</script>
</head>
<body>
  <main style="max-width:780px;margin:40px auto;padding:0 16px;font-family:system-ui,-apple-system,Segoe UI,Roboto,Ubuntu,Cantarell,Noto Sans,sans-serif;color:#1f2937;line-height:1.6">
    <h1 style="font-size:28px;margin:0 0 8px">${safeTitle}</h1>
    <p style="margin:0 0 16px;color:#4b5563">${safeDesc}</p>
    <p style="margin:0 0 12px"><a href="${spaHashPath}">Abrir a versão interativa</a> • <a href="${BASE_URL}/#/playlist">Ver playlist</a></p>
    <figure style="margin:16px 0">
      <img src="${img}" alt="${safeTitle}" style="max-width:100%;height:auto;border-radius:8px" />
    </figure>
    <noscript>
      <p>Você está vendo a versão estática para indexação. Use o link acima para abrir a versão interativa.</p>
    </noscript>
  </main>
</body>
</html>`;
}

function writeRouteStub(routePath, spaHash) {
  const dir = path.join(DIST_DIR, routePath.replace(/^\//, ''));
  ensureDir(dir);
  const html = htmlStub({
    title: `A Música da Segunda | ${routePath.replace(/\//g, ' ').trim()}`,
    description: 'Páginas otimizadas para indexação e redirecionamento para a SPA.',
    canonicalPath: routePath.endsWith('/') ? routePath : routePath + '/',
    spaHashPath: `/#${spaHash.startsWith('/') ? spaHash : '/' + spaHash}`,
  });
  writeFile(path.join(dir, 'index.html'), html);
}

function writeSongStub(song) {
  const slug = encodeURIComponent(song.slug);
  const dir = path.join(DIST_DIR, 'chansons', slug);
  ensureDir(dir);
  const title = song.title ? `${song.title} - ${song.artist || 'A Música da Segunda'}` : `Canção ${slug}`;
  const desc = song.description || `Ouça "${song.title || slug}" na Música da Segunda.`;
  const cover = song.cover_image ? (song.cover_image.startsWith('http') ? song.cover_image : `${BASE_URL}${song.cover_image}`) : undefined;
  const musicJsonLd = JSON.stringify({
    "@context": "https://schema.org",
    "@type": "MusicRecording",
    "name": song.title || slug,
    "byArtist": { "@type": "MusicGroup", "name": song.artist || 'A Música da Segunda' },
    "inLanguage": "pt-BR",
    ...(song.release_date ? { "datePublished": song.release_date } : {}),
    "url": `${BASE_URL}/chansons/${slug}/`,
    ...(cover ? { "image": cover } : {}),
  });
  const breadcrumbJsonLd = JSON.stringify({
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    "itemListElement": [
      { "@type": "ListItem", "position": 1, "name": "Início", "item": `${BASE_URL}/` },
      { "@type": "ListItem", "position": 2, "name": "Canções", "item": `${BASE_URL}/chansons/` },
      { "@type": "ListItem", "position": 3, "name": song.title || slug, "item": `${BASE_URL}/chansons/${slug}/` }
    ]
  });
  const jsonLdCombined = `${musicJsonLd}\n${breadcrumbJsonLd}`;
  const html = htmlStub({
    title,
    description: desc,
    canonicalPath: `/chansons/${slug}/`,
    ogImage: cover,
    spaHashPath: `/#/chansons/${slug}`,
    jsonLd: jsonLdCombined,
  });
  writeFile(path.join(dir, 'index.html'), html);
}

function generateSitemap(routes, songs) {
  const urls = [
    '/',
    '/home/',
    '/playlist/',
    '/blog/',
    '/sobre/',
    '/calendar/',
    '/adventcalendar/',
    '/chansons/'
  ].concat(songs.map(s => `/chansons/${encodeURIComponent(s.slug)}/`));

  const today = new Date().toISOString().split('T')[0];
  const xml = `<?xml version="1.0" encoding="UTF-8"?>\n` +
    `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n` +
    urls.map(u => (
      `  <url>\n` +
      `    <loc>${BASE_URL}${u}</loc>\n` +
      `    <lastmod>${today}</lastmod>\n` +
      `    <changefreq>weekly</changefreq>\n` +
      `    <priority>${u === '/' ? '1.0' : '0.8'}</priority>\n` +
      `  </url>`
    )).join('\n') +
    `\n</urlset>\n`;
  writeFile(path.join(DIST_DIR, 'sitemap.xml'), xml);
}

function main() {
  if (!fs.existsSync(DIST_DIR)) {
    console.error('dist/ not found. Run vite build first.');
    process.exit(1);
  }

  // Key routes (clean paths) with corresponding SPA hash routes
  const routes = [
    { path: '/home',            hash: '/home' },
    { path: '/playlist',        hash: '/playlist' },
    { path: '/blog',            hash: '/blog' },
    { path: '/sobre',           hash: '/sobre' },
    { path: '/calendar',        hash: '/calendar' },
    { path: '/adventcalendar',  hash: '/adventcalendar' },
    { path: '/chansons',        hash: '/chansons' },
  ];

  // Write stubs for routes
  routes.forEach(r => writeRouteStub(r.path, r.hash));

  // Write song stubs
  const songs = loadSongs();
  songs.forEach(writeSongStub);

  // Generate sitemap with clean paths
  generateSitemap(routes, songs);

  console.log(`✅ Generated ${routes.length} route stubs and ${songs.length} song stubs → dist/`);
}

try {
  await (async () => main())();
} catch (e) {
  console.error('❌ Stub generation failed:', e);
  process.exit(1);
}
