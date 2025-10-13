const fs = require('fs');
const path = require('path');

const BASE_URL = 'https://www.amusicadasegunda.com';

// Static routes that exist in the codebase
const staticPages = [
  { loc: '/',               changefreq: 'daily',  priority: 1.0 },
  { loc: '/calendar',       changefreq: 'weekly', priority: 0.8 },
  { loc: '/playlist',       changefreq: 'weekly', priority: 0.9 },
  { loc: '/chansons',       changefreq: 'weekly', priority: 0.8 },
  { loc: '/blog',           changefreq: 'weekly', priority: 0.7 },
  { loc: '/adventcalendar', changefreq: 'monthly', priority: 0.6 },
  { loc: '/sobre',          changefreq: 'monthly', priority: 0.5 }
];

// Read songs data
const songsJsonPath = path.resolve(process.cwd(), 'data', 'songs.json');
let songs = [];
if (fs.existsSync(songsJsonPath)) {
  try {
    const raw = fs.readFileSync(songsJsonPath, 'utf8');
    const arr = JSON.parse(raw);
    if (Array.isArray(arr)) {
      // Handle both string slugs and object songs
      songs = arr.filter(Boolean).map(item => {
        if (typeof item === 'string') {
          return { slug: item, title: item };
        } else if (item.slug) {
          return item;
        }
        return null;
      }).filter(Boolean);
      console.log(`📊 Loaded ${songs.length} songs from data/songs.json`);
    } else {
      console.warn('⚠️ data/songs.json is not an array; ignored.');
    }
  } catch (e) {
    console.warn('⚠️ Could not parse data/songs.json; ignored.', e.message);
  }
} else {
  console.warn('ℹ️ data/songs.json not found. Generating static-only sitemap.');
}

// Helper functions
const escapeXml = s => String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
const nowISO = new Date().toISOString().split('T')[0]; // YYYY-MM-DD format

// Generate static sitemap
const generateStaticSitemap = () => {
  const xml = 
    `<?xml version="1.0" encoding="UTF-8"?>\n` +
    `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n` +
    staticPages.map(p =>
      `  <url>\n` +
      `    <loc>${BASE_URL}${p.loc}</loc>\n` +
      `    <lastmod>${nowISO}</lastmod>\n` +
      `    <changefreq>${p.changefreq}</changefreq>\n` +
      `    <priority>${p.priority.toFixed(1)}</priority>\n` +
      `  </url>`
    ).join('\n') +
    `\n</urlset>\n`;
  
  return xml;
};

// Generate songs sitemap
const generateSongsSitemap = () => {
  if (songs.length === 0) {
    return null;
  }
  
  const xml = 
    `<?xml version="1.0" encoding="UTF-8"?>\n` +
    `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n` +
    songs.map(song =>
      `  <url>\n` +
      `    <loc>${BASE_URL}/chansons/${encodeURIComponent(song.slug)}</loc>\n` +
      `    <lastmod>${nowISO}</lastmod>\n` +
      `    <changefreq>weekly</changefreq>\n` +
      `    <priority>0.9</priority>\n` +
      `  </url>`
    ).join('\n') +
    `\n</urlset>\n`;
  
  return xml;
};

// Generate sitemap index
const generateSitemapIndex = () => {
  const sitemaps = [
    { loc: `${BASE_URL}/sitemap-static.xml` },
    { loc: `${BASE_URL}/sitemap-songs.xml` }
  ];
  
  const xml = 
    `<?xml version="1.0" encoding="UTF-8"?>\n` +
    `<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n` +
    sitemaps.map(s =>
      `  <sitemap>\n` +
      `    <loc>${s.loc}</loc>\n` +
      `    <lastmod>${nowISO}</lastmod>\n` +
      `  </sitemap>`
    ).join('\n') +
    `\n</sitemapindex>\n`;
  
  return xml;
};

// Main execution
const main = () => {
  console.log('🗺️  Generating hierarchical sitemap structure...\n');
  
  const outDir = path.resolve(process.cwd(), 'public');
  fs.mkdirSync(outDir, { recursive: true });
  
  // Generate static sitemap
  const staticXml = generateStaticSitemap();
  const staticFile = path.join(outDir, 'sitemap-static.xml');
  fs.writeFileSync(staticFile, staticXml, 'utf8');
  console.log(`✅ Generated ${staticFile} with ${staticPages.length} static URLs`);
  
  // Generate songs sitemap
  const songsXml = generateSongsSitemap();
  if (songsXml) {
    const songsFile = path.join(outDir, 'sitemap-songs.xml');
    fs.writeFileSync(songsFile, songsXml, 'utf8');
    console.log(`✅ Generated ${songsFile} with ${songs.length} song URLs`);
  } else {
    console.log('⚠️  Skipped songs sitemap (no songs data)');
  }
  
  // Generate sitemap index
  const indexXml = generateSitemapIndex();
  const indexFile = path.join(outDir, 'sitemap.xml');
  fs.writeFileSync(indexFile, indexXml, 'utf8');
  console.log(`✅ Generated ${indexFile} (sitemap index)`);
  
  // Summary
  console.log(`\n📊 Sitemap Summary:`);
  console.log(`   - Static pages: ${staticPages.length}`);
  console.log(`   - Songs: ${songs.length}`);
  console.log(`   - Total URLs: ${staticPages.length + songs.length}`);
  console.log(`   - Files written: public/sitemap.xml, public/sitemap-static.xml, public/sitemap-songs.xml`);
  
  // Validation
  try {
    // Basic XML validation
    const testIndex = fs.readFileSync(indexFile, 'utf8');
    if (testIndex.includes('<sitemapindex') && testIndex.includes('</sitemapindex>')) {
      console.log('✅ XML validation passed');
    } else {
      console.warn('⚠️  XML validation warning');
    }
  } catch (e) {
    console.error('❌ XML validation failed:', e.message);
  }
};

// Run if called directly
if (require.main === module) {
  main();
}

module.exports = { generateStaticSitemap, generateSongsSitemap, generateSitemapIndex };
