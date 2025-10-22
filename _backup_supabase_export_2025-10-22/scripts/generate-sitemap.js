const fg = require('fast-glob');
const fs = require('fs-extra');
const path = require('path');
const { SitemapStream, streamToPromise } = require('sitemap');
const { formatISO } = require('date-fns');

const cfg = require('./seo.config.json');
const songsPath = path.resolve('content', 'songs.json');
const songs = fs.existsSync(songsPath) ? JSON.parse(fs.readFileSync(songsPath, 'utf8')) : [];

(async () => {
  const dist = path.resolve('dist');
  await fs.ensureDir(dist);

  // Collect existing stubs
  const files = await fg(['**/index.html', '!index.html'], { cwd: dist, dot: false });
  const urlSet = new Set(['/']);
  for (const f of files) {
    const p = '/' + path.dirname(f).replace(/\\/g, '/');
    if (p !== '/.' && p !== '/') urlSet.add(p);
  }

  // Add songs explicitly
  for (const s of songs) {
    urlSet.add(`/chansons/${s.slug}`);
  }

  const sm = new SitemapStream({ hostname: cfg.siteUrl });
  const now = formatISO(new Date());

  for (const u of urlSet) {
    let lastmod = now;
    if (u.startsWith('/chansons/')) {
      const slug = u.split('/').pop();
      const s = songs.find(x => x.slug === slug);
      if (s?.datePublished) lastmod = formatISO(new Date(s.datePublished));
    }
    sm.write({ url: u === '/' ? '/' : u, changefreq: 'weekly', priority: u === '/' ? 0.8 : 0.6, lastmod });
  }

  sm.end();
  const xml = (await streamToPromise(sm)).toString();
  await fs.writeFile(path.join(dist, 'sitemap.xml'), xml, 'utf8');
  console.log('✅ sitemap.xml atualizado com músicas.');
})();


