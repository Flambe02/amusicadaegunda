const { createClient } = require('@supabase/supabase-js');
const fs = require('fs-extra');
const path = require('path');
const { formatISO } = require('date-fns');
require('dotenv').config({ path: path.resolve(process.cwd(), '.env') });

const cfg = require('./seo.config.json');

// Configuration Supabase depuis les variables d'environnement
const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('❌ Variables d\'environnement Supabase manquantes:');
  console.error('   VITE_SUPABASE_URL et VITE_SUPABASE_ANON_KEY sont obligatoires');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Pages statiques du site
const staticPages = [
  { path: '/', priority: 1.0, changefreq: 'daily' },
  { path: '/calendar', priority: 0.8, changefreq: 'weekly' },
  { path: '/playlist', priority: 0.9, changefreq: 'weekly' },
  { path: '/blog', priority: 0.8, changefreq: 'weekly' },
  { path: '/sobre', priority: 0.7, changefreq: 'monthly' },
  { path: '/adventcalendar', priority: 0.8, changefreq: 'weekly' },
];

// Fonction pour générer le XML d'un sitemap
function generateSitemapXML(urls) {
  const now = formatISO(new Date(), { representation: 'date' });
  
  let xml = '<?xml version="1.0" encoding="UTF-8"?>\n';
  xml += '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n';
  
  for (const url of urls) {
    xml += '  <url>\n';
    xml += `    <loc>${url.loc}</loc>\n`;
    xml += `    <lastmod>${url.lastmod || now}</lastmod>\n`;
    xml += `    <changefreq>${url.changefreq || 'weekly'}</changefreq>\n`;
    xml += `    <priority>${url.priority || 0.6}</priority>\n`;
    xml += '  </url>\n';
  }
  
  xml += '</urlset>\n';
  return xml;
}

// Fonction pour générer le sitemap index
function generateSitemapIndex() {
  const now = formatISO(new Date(), { representation: 'date' });
  
  return `<?xml version="1.0" encoding="UTF-8"?>
<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <sitemap>
    <loc>${cfg.siteUrl}/sitemap-static.xml</loc>
    <lastmod>${now}</lastmod>
  </sitemap>
  <sitemap>
    <loc>${cfg.siteUrl}/sitemap-songs.xml</loc>
    <lastmod>${now}</lastmod>
  </sitemap>
</sitemapindex>`;
}

async function main() {
  console.log('🗺️  Génération des sitemaps depuis Supabase...\n');
  
  try {
    // Récupérer toutes les chansons depuis Supabase
    console.log('📡 Récupération des chansons depuis Supabase...');
    const { data: songs, error } = await supabase
      .from('songs')
      .select('id, title, release_date, updated_at, created_at')
      .order('release_date', { ascending: false });
    
    if (error) {
      throw new Error(`Erreur Supabase: ${error.message}`);
    }
    
    if (!songs || songs.length === 0) {
      console.warn('⚠️  Aucune chanson trouvée dans Supabase');
    } else {
      console.log(`✅ ${songs.length} chanson(s) récupérée(s)`);
    }
    
    // Fonction pour générer un slug depuis le titre si slug n'existe pas
    const getSlug = (song) => {
      if (song.slug) return song.slug;
      if (song.title) {
        return song.title
          .toLowerCase()
          .normalize('NFD')
          .replace(/[\u0300-\u036f]/g, '') // Supprimer les accents
          .replace(/[^a-z0-9]+/g, '-')
          .replace(/^-+|-+$/g, '');
      }
      return `song-${song.id}`;
    };
    
    const now = formatISO(new Date(), { representation: 'date' });
    
    // 1. Générer le sitemap des pages statiques
    console.log('\n📄 Génération du sitemap statique...');
    const staticUrls = staticPages.map(page => ({
      loc: `${cfg.siteUrl}${page.path}`,
      lastmod: now,
      changefreq: page.changefreq,
      priority: page.priority
    }));
    
    const staticXml = generateSitemapXML(staticUrls);
    const staticFile = path.join(process.cwd(), 'public', 'sitemap-static.xml');
    await fs.writeFile(staticFile, staticXml, 'utf8');
    console.log(`✅ ${staticFile} généré (${staticPages.length} pages statiques)`);
    
    // 2. Générer le sitemap des chansons
    console.log('\n🎵 Génération du sitemap des chansons...');
    const songUrls = songs.map(song => {
      // Utiliser updated_at si disponible, sinon release_date, sinon created_at, sinon aujourd'hui
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
        loc: `${cfg.siteUrl}/chansons/${slug}`,
        lastmod,
        changefreq: 'weekly',
        priority: 0.9
      };
    });
    
    const songsXml = generateSitemapXML(songUrls);
    const songsFile = path.join(process.cwd(), 'public', 'sitemap-songs.xml');
    await fs.writeFile(songsFile, songsXml, 'utf8');
    console.log(`✅ ${songsFile} généré (${songs.length} chansons)`);
    
    // 3. Générer le sitemap index
    console.log('\n📑 Génération du sitemap index...');
    const indexXml = generateSitemapIndex();
    const indexFile = path.join(process.cwd(), 'public', 'sitemap.xml');
    await fs.writeFile(indexFile, indexXml, 'utf8');
    console.log(`✅ ${indexFile} généré (sitemap index)`);
    
    // 4. Copier aussi dans docs/ pour le déploiement GitHub Pages
    console.log('\n📋 Copie vers docs/ pour le déploiement...');
    const docsDir = path.join(process.cwd(), 'docs');
    await fs.ensureDir(docsDir);
    
    await fs.copy(staticFile, path.join(docsDir, 'sitemap-static.xml'));
    await fs.copy(songsFile, path.join(docsDir, 'sitemap-songs.xml'));
    await fs.copy(indexFile, path.join(docsDir, 'sitemap.xml'));
    console.log('✅ Sitemaps copiés dans docs/');
    
    // Résumé
    console.log('\n📊 Résumé:');
    console.log(`   - Pages statiques: ${staticPages.length}`);
    console.log(`   - Chansons: ${songs.length}`);
    console.log(`   - Total URLs: ${staticPages.length + songs.length}`);
    console.log(`   - Fichiers générés: public/sitemap.xml, public/sitemap-static.xml, public/sitemap-songs.xml`);
    console.log(`   - Fichiers copiés: docs/sitemap.xml, docs/sitemap-static.xml, docs/sitemap-songs.xml`);
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

// Exécuter le script
if (require.main === module) {
  main();
}

module.exports = { main };

