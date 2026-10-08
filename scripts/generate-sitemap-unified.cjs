/**
 * Sitemaps du site : sitemap-index.xml → sitemap-pages.xml + sitemap-songs.xml.
 *
 * Source des chansons : `content/songs.json`, le fichier écrit par le prebuild
 * (export-songs-from-supabase.cjs) et lu par generate-stubs.cjs. Les adresses du
 * sitemap sont donc exactement celles des pages générées — un slug recalculé ici à
 * partir du titre avait mis une adresse en 404 dans le sitemap.
 *
 * `lastmod` ne ment jamais :
 * - chanson : sa date de sortie, ou la dernière VRAIE modification de son contenu
 *   (`content_updated_at`, tenue par un trigger qui ignore les mises à jour
 *   techniques) si elle est plus récente. Jamais `updated_at`, jamais la date du jour ;
 * - pages de liste (accueil, /musica, catégorie, archive…) : la sortie de la chanson
 *   la plus récente qu'elles affichent ;
 * - autres pages : pas de `lastmod` (la balise est facultative ; mieux vaut l'omettre
 *   que d'écrire une date sans rapport avec le contenu).
 *
 * Contrôle au build : chaque adresse doit correspondre à une page générée dans dist/.
 * Sinon le script échoue, et le déploiement avec lui.
 */

const fs = require('fs-extra');
const path = require('path');

const cfg = require('./seo.config.json');

// Pages statiques.
// ✅ /playlist removed - redirects to /musica (single source of truth)
const staticPages = [
  { path: '/', priority: 1.0, changefreq: 'daily' },
  { path: '/musica', priority: 0.9, changefreq: 'weekly' },
  { path: '/roda', priority: 0.8, changefreq: 'weekly' },
  { path: '/karaoke', priority: 0.8, changefreq: 'weekly' },
  { path: '/calendar', priority: 0.8, changefreq: 'weekly' },
  // ✅ /blog retiré : contenu dupliqué de /musica/[slug], désormais noindex,follow
  { path: '/sobre', priority: 0.7, changefreq: 'monthly' },
  { path: '/guia', priority: 0.8, changefreq: 'monthly' },
  { path: '/tv', priority: 0.7, changefreq: 'monthly' },
  { path: '/adventcalendar', priority: 0.8, changefreq: 'weekly' },
  { path: '/apprendre', priority: 0.7, changefreq: 'monthly' },
  // Category pages — only include categories with ≥2 songs (thin pages excluded)
  // tecnologia and saude excluded until they have songs again
  { path: '/categoria/politica', priority: 0.75, changefreq: 'weekly' },
  { path: '/categoria/internacional', priority: 0.75, changefreq: 'weekly' },
  { path: '/categoria/cultura', priority: 0.75, changefreq: 'weekly' },
  { path: '/categoria/policia', priority: 0.75, changefreq: 'weekly' },
  { path: '/categoria/midia', priority: 0.75, changefreq: 'weekly' },
  { path: '/categoria/esporte', priority: 0.7, changefreq: 'weekly' },
  { path: '/categoria/cidades', priority: 0.7, changefreq: 'weekly' },
  { path: '/categoria/economia', priority: 0.7, changefreq: 'weekly' },
  { path: '/categoria/seguranca', priority: 0.65, changefreq: 'monthly' },
  { path: '/categoria/gastronomia', priority: 0.65, changefreq: 'monthly' },
  { path: '/categoria/outros', priority: 0.6, changefreq: 'monthly' },
];

// Pages qui affichent des chansons : leur lastmod est la sortie de la plus récente.
const LIST_PAGES = new Set(['/', '/musica', '/roda', '/karaoke', '/calendar']);
const day = (value) => (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}/.test(value) ? value.slice(0, 10) : null);
const latest = (dates) => dates.filter(Boolean).sort().pop() || null;

/** Date réelle de dernière modification d'une chanson (AAAA-MM-JJ), ou null. */
function songLastmod(song, today = new Date().toISOString().slice(0, 10)) {
  const released = day(song.datePublished || song.release_date);
  const edited = day(song.content_updated_at);
  // Une date dans le futur (programmation, horloge) n'est pas une modification passée.
  return latest([released, edited].filter((date) => date && date <= today));
}

function buildSongUrls(songs, today) {
  const byDate = [...songs].sort((a, b) => String(b.datePublished || '').localeCompare(String(a.datePublished || '')));
  const rank = new Map(byDate.map((song, index) => [song.slug, index]));
  return songs.filter((song) => song.slug).map((song) => {
    const position = rank.get(song.slug);
    return {
      loc: `${cfg.siteUrl}/musica/${song.slug}/`,
      lastmod: songLastmod(song, today),
      changefreq: 'weekly',
      // 10 plus récentes → 0.9, 15 suivantes → 0.8, le reste → 0.7
      priority: position < 10 ? 0.9 : position < 25 ? 0.8 : 0.7,
    };
  });
}

function buildPageUrls(songs, today) {
  const dated = songs.map((song) => ({ category: song.category, date: songLastmod({ datePublished: song.datePublished }, today) }));
  const newest = latest(dated.map((song) => song.date));
  const categoryOf = (page) => (page.path.startsWith('/categoria/') ? page.path.split('/')[2] : null);
  // Une catégorie sans chanson n'a pas de page (seulement une redirection) : hors sitemap.
  const listed = staticPages.filter((page) => !categoryOf(page) || dated.some((song) => song.category === categoryOf(page)));
  const urls = listed.map((page) => {
    const category = categoryOf(page);
    let lastmod = null;
    if (LIST_PAGES.has(page.path)) lastmod = newest;
    else if (category) lastmod = latest(dated.filter((song) => song.category === category).map((song) => song.date));
    return { loc: `${cfg.siteUrl}${page.path === '/' ? '/' : `${page.path}/`}`, lastmod, changefreq: page.changefreq, priority: page.priority };
  });
  const currentYear = today.slice(0, 4);
  const years = [...new Set(dated.map((song) => (song.date || '').slice(0, 4)).filter((year) => /^\d{4}$/.test(year)))];
  for (const year of years) {
    urls.push({
      loc: `${cfg.siteUrl}/arquivo/${year}/`,
      lastmod: latest(dated.filter((song) => (song.date || '').startsWith(year)).map((song) => song.date)),
      changefreq: year === currentYear ? 'monthly' : 'yearly',
      priority: 0.65,
    });
  }
  return urls;
}

function toSitemapXml(urls) {
  const seen = new Set();
  const lines = ['<?xml version="1.0" encoding="UTF-8"?>', '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">'];
  for (const url of [...urls].sort((a, b) => a.loc.localeCompare(b.loc))) {
    if (seen.has(url.loc) || url.loc.includes('#')) continue;
    seen.add(url.loc);
    lines.push('  <url>', `    <loc>${url.loc}</loc>`);
    if (url.lastmod) lines.push(`    <lastmod>${url.lastmod}</lastmod>`);
    lines.push(`    <changefreq>${url.changefreq || 'weekly'}</changefreq>`, `    <priority>${url.priority || 0.6}</priority>`, '  </url>');
  }
  lines.push('</urlset>', '');
  return lines.join('\n');
}

function toSitemapIndexXml(files) {
  const lines = ['<?xml version="1.0" encoding="UTF-8"?>', '<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">'];
  for (const file of files) {
    lines.push('  <sitemap>', `    <loc>${cfg.siteUrl}/${file.name}</loc>`);
    if (file.lastmod) lines.push(`    <lastmod>${file.lastmod}</lastmod>`);
    lines.push('  </sitemap>');
  }
  lines.push('</sitemapindex>', '');
  return lines.join('\n');
}

/** Adresses du sitemap sans page générée dans `distDir` (chemin/index.html). */
function urlsWithoutPage(urls, distDir) {
  return urls.map((url) => url.loc).filter((loc) => {
    const pathname = loc.slice(cfg.siteUrl.length).replace(/^\/+|\/+$/g, '');
    return !fs.existsSync(path.join(distDir, pathname, 'index.html'));
  });
}

function loadSongs() {
  const file = path.join(process.cwd(), 'content', 'songs.json');
  if (!fs.existsSync(file)) throw new Error('content/songs.json introuvable : lancer `npm run export:songs` (ou le build complet).');
  const songs = JSON.parse(fs.readFileSync(file, 'utf8'));
  if (!Array.isArray(songs) || songs.length === 0) throw new Error('content/songs.json ne contient aucune chanson.');
  return songs;
}

async function main() {
  try {
    const today = new Date().toISOString().slice(0, 10);
    const songs = loadSongs();
    const songUrls = buildSongUrls(songs, today);
    const pageUrls = buildPageUrls(songs, today);
    const distDir = path.join(process.cwd(), 'dist');

    // Contrôle : aucune adresse sans page. Sans dist/ (script lancé seul), rien à comparer.
    if (fs.existsSync(path.join(distDir, 'index.html'))) {
      const missing = urlsWithoutPage([...pageUrls, ...songUrls], distDir);
      if (missing.length > 0) {
        throw new Error(`${missing.length} adresse(s) du sitemap sans page générée dans dist/ :\n  ${missing.join('\n  ')}`);
      }
      console.log(`✅ Sitemap : ${pageUrls.length + songUrls.length} adresses, chacune a sa page dans dist/`);
    } else {
      console.warn('⚠️  dist/ absent : adresses du sitemap non contrôlées (lancer le build complet).');
    }

    const files = {
      'sitemap-pages.xml': toSitemapXml(pageUrls),
      'sitemap-songs.xml': toSitemapXml(songUrls),
    };
    files['sitemap-index.xml'] = toSitemapIndexXml([
      { name: 'sitemap-pages.xml', lastmod: latest(pageUrls.map((url) => url.lastmod)) },
      { name: 'sitemap-songs.xml', lastmod: latest(songUrls.map((url) => url.lastmod)) },
    ]);
    // public/ (source suivie) et dist/ (ce que la CI publie).
    for (const dir of ['public', 'dist']) {
      const target = path.join(process.cwd(), dir);
      if (dir !== 'public' && !fs.existsSync(target)) continue;
      for (const [name, xml] of Object.entries(files)) await fs.outputFile(path.join(target, name), xml, 'utf8');
    }
    console.log(`✅ Sitemaps générés : ${pageUrls.length} pages, ${songUrls.length} chansons`);
  } catch (error) {
    console.error(`\n❌ Sitemap : ${error.message}`);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

module.exports = { main, songLastmod, buildSongUrls, buildPageUrls, toSitemapXml, toSitemapIndexXml, urlsWithoutPage, staticPages };
