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
    urlSet.add(`/musica/${s.slug}/`);
  }

  const now = formatISO(new Date());

  // Créer le sitemap index
  const smIndex = new SitemapStream({ hostname: cfg.siteUrl });
  
  // 1. Sitemap principal (avec # pour HashRouter)
  const sm = new SitemapStream({ hostname: cfg.siteUrl });
  for (const u of urlSet) {
    let lastmod = now;
    let url = u === '/' ? '/' : u.endsWith('/') ? u : u + '/';
    
    // Ajouter le # pour les routes SPA avec HashRouter
    if (u.startsWith('/musica/')) {
      url = `#${url}`;
      const slug = u.split('/').pop();
      const s = songs.find(x => x.slug === slug);
      if (s?.datePublished) lastmod = formatISO(new Date(s.datePublished));
    }
    
    sm.write({ url, changefreq: 'weekly', priority: u === '/' ? 0.8 : 0.6, lastmod });
  }
  sm.end();
  const xml = (await streamToPromise(sm)).toString();
  await fs.writeFile(path.join(dist, 'sitemap.xml'), xml, 'utf8');
  console.log('✅ sitemap.xml atualizado com músicas (com #).');

  // 2. Sitemap pour Google (sans #)
  const smGoogle = new SitemapStream({ hostname: cfg.siteUrl });
  for (const u of urlSet) {
    let lastmod = now;
    let url = u === '/' ? '/' : u.endsWith('/') ? u : u + '/';
    
    // SANS # pour Google SEO
    if (u.startsWith('/musica/')) {
      const slug = u.split('/').pop();
      const s = songs.find(x => x.slug === slug);
      if (s?.datePublished) lastmod = formatISO(new Date(s.datePublished));
    }
    
    smGoogle.write({ url, changefreq: 'weekly', priority: u === '/' ? 0.8 : 0.6, lastmod });
  }
  smGoogle.end();
  const xmlGoogle = (await streamToPromise(smGoogle)).toString();
  await fs.writeFile(path.join(dist, 'sitemap-google.xml'), xmlGoogle, 'utf8');
  console.log('✅ sitemap-google.xml atualizado sem #');

  // Créer le sitemap index qui référence les 2 sitemaps
  const indexXml = `<?xml version="1.0" encoding="UTF-8"?>
<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <sitemap>
    <loc>${cfg.siteUrl}/sitemap.xml</loc>
    <lastmod>${now}</lastmod>
  </sitemap>
  <sitemap>
    <loc>${cfg.siteUrl}/sitemap-google.xml</loc>
    <lastmod>${now}</lastmod>
  </sitemap>
</sitemapindex>`;
  
  await fs.writeFile(path.join(dist, 'sitemap-index.xml'), indexXml, 'utf8');
  console.log('✅ sitemap-index.xml créé');
})();


