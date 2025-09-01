const fs = require('fs');
const path = require('path');

const BASE_URL = 'https://www.amusicadasegunda.com';

const staticPages = [
  { loc: '/',            changefreq: 'weekly', priority: 1.0 },
  { loc: '/chansons',    changefreq: 'weekly', priority: 0.8 },
  { loc: '/apropos',     changefreq: 'yearly', priority: 0.5 },
  { loc: '/contact',     changefreq: 'yearly', priority: 0.4 }
];

const songsJsonPath = path.resolve(process.cwd(), 'data', 'songs.json');
let songs = [];
if (fs.existsSync(songsJsonPath)) {
  try {
    const raw = fs.readFileSync(songsJsonPath, 'utf8');
    const arr = JSON.parse(raw);
    if (Array.isArray(arr)) songs = arr.filter(Boolean).map(String);
    else console.warn('⚠️ data/songs.json is not an array; ignored.');
  } catch (e) {
    console.warn('⚠️ Could not parse data/songs.json; ignored.', e.message);
  }
} else {
  console.warn('ℹ️ data/songs.json not found. Generating static-only sitemap.');
}

const urls = [];
const addUrl = (loc, changefreq='weekly', priority=0.5) => {
  const url = new URL(loc.replace(/^\//, ''), BASE_URL + '/').href;
  urls.push({ loc: url, changefreq, priority });
};

staticPages.forEach(p => addUrl(p.loc, p.changefreq, p.priority));
songs.forEach(slug => addUrl(`/chansons/${encodeURIComponent(slug)}`, 'weekly', 0.7));

const escapeXml = s => String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
const nowISO = new Date().toISOString();

const xml =
  `<?xml version="1.0" encoding="UTF-8"?>\n` +
  `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n` +
  urls.map(u =>
    `  <url>\n` +
    `    <loc>${escapeXml(u.loc)}</loc>\n` +
    `    <lastmod>${nowISO}</lastmod>\n` +
    `    <changefreq>${u.changefreq}</changefreq>\n` +
    `    <priority>${(u.priority ?? 0.5).toFixed(1)}</priority>\n` +
    `  </url>`
  ).join('\n') +
  `\n</urlset>\n`;

const outDir = path.resolve(process.cwd(), 'docs');
fs.mkdirSync(outDir, { recursive: true });
const outFile = path.join(outDir, 'sitemap.xml');
fs.writeFileSync(outFile, xml, 'utf8');

console.log(`✅ Generated ${outFile} with ${urls.length} URLs.`);
