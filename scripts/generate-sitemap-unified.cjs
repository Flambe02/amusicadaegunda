/**
 * Unified Sitemap Generator
 * 
 * Generates clean, deduplicated sitemaps for SEO:
 * - sitemap-index.xml (references sitemap-pages.xml and sitemap-songs.xml)
 * - sitemap-pages.xml (static pages)
 * - sitemap-songs.xml (songs from Supabase)
 * 
 * Rules:
 * - NO hash URLs (#)
 * - NO duplicates
 * - All URLs use /musica/ (not /chansons/)
 * - All URLs are absolute (https://www.amusicadasegunda.com/...)
 */

const { createClient } = require('@supabase/supabase-js');
const fs = require('fs-extra');
const path = require('path');
const { formatISO } = require('date-fns');
require('dotenv').config({ path: path.resolve(process.cwd(), '.env') });

const cfg = require('./seo.config.json');

// Configuration Supabase — same legacy-JWT fallback as src/lib/supabase.js
const PUBLISHABLE_KEY_FALLBACK = 'sb_publishable_qQqLLFjAv4sk3z2eQW0-sA_59XCpAKF';
const SUPABASE_URL_FALLBACK = 'https://efnzmpzkzeuktqkghwfa.supabase.co';

const envUrl = process.env.VITE_SUPABASE_URL;
const envKey = process.env.VITE_SUPABASE_ANON_KEY;

const supabaseUrl = envUrl || SUPABASE_URL_FALLBACK;
const supabaseAnonKey = (envKey && !envKey.startsWith('eyJ'))
  ? envKey
  : PUBLISHABLE_KEY_FALLBACK;

const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Static pages configuration
// ✅ /playlist removed - redirects to /musica (single source of truth)
const staticPages = [
  { path: '/', priority: 1.0, changefreq: 'daily' },
  { path: '/musica', priority: 0.9, changefreq: 'weekly' },
  { path: '/roda', priority: 0.8, changefreq: 'weekly' },
  { path: '/calendar', priority: 0.8, changefreq: 'weekly' },
  // ✅ /blog retiré : contenu dupliqué de /musica/[slug], désormais noindex,follow
  { path: '/sobre', priority: 0.7, changefreq: 'monthly' },
  { path: '/guia', priority: 0.8, changefreq: 'monthly' },
  { path: '/adventcalendar', priority: 0.8, changefreq: 'weekly' },
  // Category pages — only include categories with ≥2 songs (thin pages excluded)
  // Managed dynamically: categories with 1 song (outros, seguranca, gastronomia) get lower priority
  // tecnologia and saude excluded until they have songs again
  { path: '/categoria/politica', priority: 0.75, changefreq: 'weekly' },
  { path: '/categoria/internacional', priority: 0.75, changefreq: 'weekly' },
  { path: '/categoria/cultura', priority: 0.75, changefreq: 'weekly' },
  { path: '/categoria/policia', priority: 0.75, changefreq: 'weekly' },
  { path: '/categoria/midia', priority: 0.75, changefreq: 'weekly' },
  { path: '/categoria/esporte', priority: 0.7, changefreq: 'weekly' },
  { path: '/categoria/energia', priority: 0.7, changefreq: 'weekly' },
  { path: '/categoria/economia', priority: 0.7, changefreq: 'weekly' },
  { path: '/categoria/seguranca', priority: 0.65, changefreq: 'monthly' },
  { path: '/categoria/gastronomia', priority: 0.65, changefreq: 'monthly' },
  { path: '/categoria/outros', priority: 0.6, changefreq: 'monthly' },
];

/**
 * Deduplicate URLs by canonical loc, keeping the latest lastmod
 */
function deduplicateUrls(urls) {
  const urlMap = new Map();
  
  for (const url of urls) {
    // ✅ SEO FIX: Normalize URL for comparison (add trailing slash if missing)
    let canonical = url.loc;
    if (!canonical.endsWith('/')) {
      canonical = canonical + '/';
    }
    const existing = urlMap.get(canonical);
    
    if (!existing) {
      urlMap.set(canonical, url);
    } else {
      // Keep the one with the latest lastmod
      const existingDate = new Date(existing.lastmod);
      const currentDate = new Date(url.lastmod);
      if (currentDate > existingDate) {
        urlMap.set(canonical, url);
      }
    }
  }
  
  return Array.from(urlMap.values());
}

/**
 * Generate sitemap XML from URL array
 */
function generateSitemapXML(urls) {
  const now = formatISO(new Date(), { representation: 'date' });
  
  let xml = '<?xml version="1.0" encoding="UTF-8"?>\n';
  xml += '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n';
  
  // Sort by loc for deterministic output
  const sortedUrls = urls.sort((a, b) => a.loc.localeCompare(b.loc));
  
  for (const url of sortedUrls) {
    // Ensure absolute URL without hash
    let loc = url.loc;
    if (loc.includes('#')) {
      console.warn(`⚠️  Warning: URL contains hash, removing: ${loc}`);
      loc = loc.split('#')[0];
    }
    if (!loc.startsWith('http')) {
      loc = loc.startsWith('/') ? `${cfg.siteUrl}${loc}` : `${cfg.siteUrl}/${loc}`;
    }
    // ✅ SEO FIX: ADD trailing slash for consistency with canonicals (except root which already has one)
    // URLs should match the canonical URLs in stubs (which have trailing slashes)
    if (loc !== `${cfg.siteUrl}/` && !loc.endsWith('/')) {
      loc = loc + '/';
    }
    
    xml += '  <url>\n';
    xml += `    <loc>${loc}</loc>\n`;
    xml += `    <lastmod>${url.lastmod || now}</lastmod>\n`;
    xml += `    <changefreq>${url.changefreq || 'weekly'}</changefreq>\n`;
    xml += `    <priority>${url.priority || 0.6}</priority>\n`;
    xml += '  </url>\n';
  }
  
  xml += '</urlset>\n';
  return xml;
}

/**
 * Generate sitemap index XML
 */
function generateSitemapIndex(pagesLastmod, songsLastmod) {
  const now = formatISO(new Date(), { representation: 'date' });
  
  return `<?xml version="1.0" encoding="UTF-8"?>
<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <sitemap>
    <loc>${cfg.siteUrl}/sitemap-pages.xml</loc>
    <lastmod>${pagesLastmod || now}</lastmod>
  </sitemap>
  <sitemap>
    <loc>${cfg.siteUrl}/sitemap-songs.xml</loc>
    <lastmod>${songsLastmod || now}</lastmod>
  </sitemap>
</sitemapindex>`;
}

/**
 * Generate slug from song data
 */
function getSlug(song) {
  if (song.slug) return song.slug;
  if (song.title) {
    return song.title
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '') // Remove accents
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
  }
  return `song-${song.id}`;
}

function loadSongsFromJsonFallback() {
  const jsonPath = path.join(process.cwd(), 'content', 'songs.json');
  if (!fs.existsSync(jsonPath)) return null;
  const raw = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
  if (!Array.isArray(raw)) return null;
  return raw.map((s, idx) => ({
    id: s.id || idx,
    title: s.title || s.name,
    slug: s.slug,
    release_date: s.release_date || s.datePublished,
    updated_at: s.updated_at,
    created_at: s.created_at,
  }));
}

async function main() {
  console.log('🗺️  Génération unifiée des sitemaps SEO...\n');

  try {
    let songs = null;

    // Fetch songs from Supabase (with fallback to content/songs.json)
    console.log('📡 Récupération des chansons depuis Supabase...');
    try {
      const { data, error } = await supabase
        .from('songs')
        .select('id, title, release_date, updated_at, created_at')
        .order('release_date', { ascending: false });
      if (error) throw new Error(error.message);
      songs = data;
    } catch (err) {
      console.warn(`⚠️  Supabase indisponible (${err.message}). Fallback sur content/songs.json...`);
      songs = loadSongsFromJsonFallback();
      if (!songs) {
        throw new Error('Aucun fallback songs.json disponible');
      }
      console.log(`✅ Fallback: ${songs.length} chanson(s) chargée(s) depuis content/songs.json`);
    }

    if (!songs || songs.length === 0) {
      console.warn('⚠️  Aucune chanson trouvée');
      songs = [];
    } else {
      console.log(`✅ ${songs.length} chanson(s) récupérée(s)`);
    }
    
    const now = formatISO(new Date(), { representation: 'date' });
    
    // 1. Generate static pages sitemap
    console.log('\n📄 Génération du sitemap des pages statiques...');
    const staticUrls = staticPages.map(page => ({
      loc: `${cfg.siteUrl}${page.path}`,
      lastmod: now,
      changefreq: page.changefreq,
      priority: page.priority
    }));

    // ✅ AEO #13: Add /arquivo/[year]/ archive pages dynamically from songs
    const currentYear = new Date().getFullYear().toString();
    const yearsInData = [...new Set(
      songs.map(s => (s.release_date || s.datePublished || '').slice(0, 4)).filter(y => /^\d{4}$/.test(y))
    )];
    for (const year of yearsInData) {
      staticUrls.push({
        loc: `${cfg.siteUrl}/arquivo/${year}`,
        lastmod: now,
        changefreq: year === currentYear ? 'monthly' : 'yearly',
        priority: 0.65
      });
    }

    // Deduplicate (shouldn't be needed for static, but safe)
    const deduplicatedStatic = deduplicateUrls(staticUrls);
    const staticXml = generateSitemapXML(deduplicatedStatic);
    const staticFile = path.join(process.cwd(), 'public', 'sitemap-pages.xml');
    await fs.writeFile(staticFile, staticXml, 'utf8');
    console.log(`✅ ${staticFile} généré (${deduplicatedStatic.length} pages statiques, dont ${yearsInData.length} archives /arquivo/)`);
    
    // 2. Generate songs sitemap
    console.log('\n🎵 Génération du sitemap des chansons...');
    // Sort songs by release_date descending to compute priority gradient
    const sortedByDate = [...songs].sort((a, b) => {
      const da = new Date(a.release_date || a.created_at || 0);
      const db = new Date(b.release_date || b.created_at || 0);
      return db - da;
    });
    const priorityBySlug = {};
    sortedByDate.forEach((song, i) => {
      const slug = getSlug(song);
      // Recent 10 → 0.9, next 15 → 0.8, rest → 0.7
      if (i < 10) priorityBySlug[slug] = 0.9;
      else if (i < 25) priorityBySlug[slug] = 0.8;
      else priorityBySlug[slug] = 0.7;
    });

    const songUrls = songs.map(song => {
      let lastmod = now;
      if (song.updated_at) {
        lastmod = formatISO(new Date(song.updated_at), { representation: 'date' });
      } else if (song.release_date) {
        lastmod = formatISO(new Date(song.release_date), { representation: 'date' });
      } else if (song.created_at) {
        lastmod = formatISO(new Date(song.created_at), { representation: 'date' });
      }

      const slug = getSlug(song);

      return {
        loc: `${cfg.siteUrl}/musica/${slug}`, // ✅ Use /musica/ not /chansons/
        lastmod,
        changefreq: 'weekly',
        priority: priorityBySlug[slug] || 0.7
      };
    });
    
    // Deduplicate songs
    const deduplicatedSongs = deduplicateUrls(songUrls);
    const songsXml = generateSitemapXML(deduplicatedSongs);
    const songsFile = path.join(process.cwd(), 'public', 'sitemap-songs.xml');
    await fs.writeFile(songsFile, songsXml, 'utf8');
    console.log(`✅ ${songsFile} généré (${deduplicatedSongs.length} chansons, ${songUrls.length - deduplicatedSongs.length} doublons supprimés)`);
    
    // 3. Generate sitemap index
    console.log('\n📑 Génération du sitemap index...');
    const pagesLastmod = deduplicatedStatic.length > 0 
      ? deduplicatedStatic[0].lastmod 
      : now;
    const songsLastmod = deduplicatedSongs.length > 0
      ? deduplicatedSongs.reduce((latest, url) => {
          const urlDate = new Date(url.lastmod);
          const latestDate = new Date(latest);
          return urlDate > latestDate ? url.lastmod : latest;
        }, deduplicatedSongs[0].lastmod)
      : now;
    
    const indexXml = generateSitemapIndex(pagesLastmod, songsLastmod);
    const indexFile = path.join(process.cwd(), 'public', 'sitemap-index.xml');
    await fs.writeFile(indexFile, indexXml, 'utf8');
    console.log(`✅ ${indexFile} généré (sitemap index)`);
    
    // 4. Copy to dist/ for build process
    console.log('\n📋 Copie vers dist/ pour le build...');
    const distDir = path.join(process.cwd(), 'dist');
    await fs.ensureDir(distDir);
    
    await fs.copy(staticFile, path.join(distDir, 'sitemap-pages.xml'));
    await fs.copy(songsFile, path.join(distDir, 'sitemap-songs.xml'));
    await fs.copy(indexFile, path.join(distDir, 'sitemap-index.xml'));
    console.log('✅ Sitemaps copiés dans dist/');
    
    // 5. Copy to docs/ for GitHub Pages deployment
    console.log('\n📋 Copie vers docs/ pour le déploiement...');
    const docsDir = path.join(process.cwd(), 'docs');
    await fs.ensureDir(docsDir);
    
    await fs.copy(staticFile, path.join(docsDir, 'sitemap-pages.xml'));
    await fs.copy(songsFile, path.join(docsDir, 'sitemap-songs.xml'));
    await fs.copy(indexFile, path.join(docsDir, 'sitemap-index.xml'));
    console.log('✅ Sitemaps copiés dans docs/');
    
    // Summary
    console.log('\n📊 Résumé:');
    console.log(`   - Pages statiques: ${deduplicatedStatic.length}`);
    console.log(`   - Chansons: ${deduplicatedSongs.length}`);
    console.log(`   - Total URLs: ${deduplicatedStatic.length + deduplicatedSongs.length}`);
    console.log(`   - Fichiers générés: public/sitemap-index.xml, public/sitemap-pages.xml, public/sitemap-songs.xml`);
    console.log(`   - Fichiers copiés: dist/ et docs/ (sitemap-index.xml, sitemap-pages.xml, sitemap-songs.xml)`);
    console.log('\n✅ Génération terminée avec succès!');
    
  } catch (error) {
    console.error('\n❌ Erreur lors de la génération des sitemaps:');
    console.error(error.message);
    if (error.stack) {
      console.error(error.stack);
    }
    process.exit(1);
  }
}

// Execute
if (require.main === module) {
  main();
}

module.exports = { main };
