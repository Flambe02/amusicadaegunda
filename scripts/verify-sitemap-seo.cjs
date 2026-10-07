/**
 * SEO Sitemap Verification Script
 * 
 * Validates that all generated sitemaps are SEO-compliant:
 * - No hash URLs (#)
 * - No duplicate <loc> entries
 * - sitemap-index references existing sitemaps
 * - All <loc> are absolute URLs starting with https://www.amusicadasegunda.com/
 * - /playlist must not appear in sitemaps (redirects to /musica)
 * - robots.txt must not allow /playlist
 */

const fs = require('fs-extra');
const path = require('path');

const SITE_URL = 'https://www.amusicadasegunda.com';
const EXPECTED_INDEX = 'sitemap-index.xml';
const EXPECTED_SITEMAPS = ['sitemap-pages.xml', 'sitemap-songs.xml'];

/**
 * Simple XML parser using regex (fallback if fast-xml-parser not available)
 */
function parseXMLSimple(xml) {
  const urls = [];
  const locRegex = /<loc>(.*?)<\/loc>/g;
  let match;
  while ((match = locRegex.exec(xml)) !== null) {
    urls.push(match[1]);
  }
  return urls;
}

/**
 * Parse XML and extract <loc> entries
 * Uses regex parsing (no external dependencies)
 */
function extractLocEntries(xml) {
  return parseXMLSimple(xml);
}

/**
 * Verify a single sitemap file
 */
function verifySitemap(filePath, isIndex = false) {
  const errors = [];
  const warnings = [];
  
  if (!fs.existsSync(filePath)) {
    errors.push(`❌ File not found: ${filePath}`);
    return { errors, warnings };
  }
  
  const xml = fs.readFileSync(filePath, 'utf8');
  const locs = extractLocEntries(xml);
  
  // Check for hash URLs
  const hashUrls = locs.filter(loc => loc.includes('#'));
  if (hashUrls.length > 0) {
    errors.push(`❌ Found ${hashUrls.length} URL(s) with hash fragments:`);
    hashUrls.forEach(url => errors.push(`   - ${url}`));
  }
  
  // Check for duplicates
  const duplicates = [];
  const seen = new Set();
  locs.forEach(loc => {
    const normalized = loc.replace(/\/$/, ''); // Remove trailing slash for comparison
    if (seen.has(normalized)) {
      duplicates.push(loc);
    } else {
      seen.add(normalized);
    }
  });
  
  if (duplicates.length > 0) {
    errors.push(`❌ Found ${duplicates.length} duplicate URL(s):`);
    duplicates.forEach(url => errors.push(`   - ${url}`));
  }
  
  // Check URL format
  const invalidUrls = locs.filter(loc => {
    if (isIndex) {
      // Index can reference sitemaps
      return !loc.startsWith(SITE_URL) && !loc.startsWith('http');
    }
    return !loc.startsWith(SITE_URL);
  });
  
  if (invalidUrls.length > 0) {
    errors.push(`❌ Found ${invalidUrls.length} URL(s) not starting with ${SITE_URL}:`);
    invalidUrls.forEach(url => errors.push(`   - ${url}`));
  }
  
  // Check for relative URLs
  const relativeUrls = locs.filter(loc => loc.startsWith('/') && !loc.startsWith(SITE_URL));
  if (relativeUrls.length > 0) {
    errors.push(`❌ Found ${relativeUrls.length} relative URL(s):`);
    relativeUrls.forEach(url => errors.push(`   - ${url}`));
  }
  
  return { errors, warnings, locs };
}

/**
 * Main verification function
 */
function verify() {
  console.log('🔍 Vérification SEO des sitemaps...\n');
  
  const publicDir = path.join(process.cwd(), 'public');
  const docsDir = path.join(process.cwd(), 'dist'); // le site publié (plus de dossier docs/)
  const allErrors = [];
  const allWarnings = [];
  
  // Verify sitemap-index.xml
  console.log('📑 Vérification de sitemap-index.xml...');
  const indexPublic = path.join(publicDir, EXPECTED_INDEX);
  const indexDocs = path.join(docsDir, EXPECTED_INDEX);
  
  const indexPublicResult = verifySitemap(indexPublic, true);
  const indexDocsResult = verifySitemap(indexDocs, true);
  
  if (indexPublicResult.errors.length > 0) {
    allErrors.push(`[public/${EXPECTED_INDEX}]`);
    allErrors.push(...indexPublicResult.errors);
  }
  if (indexDocsResult.errors.length > 0) {
    allErrors.push(`[dist/${EXPECTED_INDEX}]`);
    allErrors.push(...indexDocsResult.errors);
  }
  
  // Check if index references expected sitemaps
  if (fs.existsSync(indexPublic)) {
    const indexXml = fs.readFileSync(indexPublic, 'utf8');
    const referencedSitemaps = extractLocEntries(indexXml);
    
    for (const expected of EXPECTED_SITEMAPS) {
      const expectedUrl = `${SITE_URL}/${expected}`;
      if (!referencedSitemaps.includes(expectedUrl)) {
        allErrors.push(`❌ sitemap-index.xml does not reference ${expected}`);
      }
    }
    
    // Check if referenced sitemaps exist
    for (const refUrl of referencedSitemaps) {
      const refPath = refUrl.replace(SITE_URL, '').replace(/^\//, '');
      const publicRef = path.join(publicDir, refPath);
      const docsRef = path.join(docsDir, refPath);
      
      if (!fs.existsSync(publicRef) && !fs.existsSync(docsRef)) {
        allErrors.push(`❌ sitemap-index.xml references missing file: ${refPath}`);
      }
    }
  }
  
  // Verify individual sitemaps
  for (const sitemap of EXPECTED_SITEMAPS) {
    console.log(`📄 Vérification de ${sitemap}...`);
    const publicSitemap = path.join(publicDir, sitemap);
    const docsSitemap = path.join(docsDir, sitemap);
    
    const publicResult = verifySitemap(publicSitemap);
    const docsResult = verifySitemap(docsSitemap);
    
    if (publicResult.errors.length > 0) {
      allErrors.push(`[public/${sitemap}]`);
      allErrors.push(...publicResult.errors);
    }
    if (docsResult.errors.length > 0) {
      allErrors.push(`[dist/${sitemap}]`);
      allErrors.push(...docsResult.errors);
    }
    
    if (publicResult.warnings.length > 0) {
      allWarnings.push(`[public/${sitemap}]`);
      allWarnings.push(...publicResult.warnings);
    }
    if (docsResult.warnings.length > 0) {
      allWarnings.push(`[dist/${sitemap}]`);
      allWarnings.push(...docsResult.warnings);
    }
  }
  
  // Check for /playlist in sitemaps (should not be indexable)
  console.log('\n🔍 Vérification de /playlist (doit rediriger vers /musica)...');
  const playlistUrl = `${SITE_URL}/playlist`;
  for (const sitemap of EXPECTED_SITEMAPS) {
    const publicSitemap = path.join(publicDir, sitemap);
    const docsSitemap = path.join(docsDir, sitemap);
    
    for (const sitemapPath of [publicSitemap, docsSitemap]) {
      if (fs.existsSync(sitemapPath)) {
        const xml = fs.readFileSync(sitemapPath, 'utf8');
        if (xml.includes(playlistUrl)) {
          allErrors.push(`❌ ${sitemapPath} contient /playlist (doit rediriger vers /musica)`);
        }
      }
    }
  }
  
  // Check robots.txt for "Allow: /playlist"
  console.log('🔍 Vérification de robots.txt...');
  const robotsPublic = path.join(publicDir, 'robots.txt');
  const robotsDocs = path.join(docsDir, 'robots.txt');
  
  for (const robotsPath of [robotsPublic, robotsDocs]) {
    if (fs.existsSync(robotsPath)) {
      const robotsContent = fs.readFileSync(robotsPath, 'utf8');
      if (robotsContent.includes('Allow: /playlist')) {
        allErrors.push(`❌ ${robotsPath} contient "Allow: /playlist" (doit être supprimé)`);
      }
    }
  }
  
  // Report results
  console.log('\n📊 Résultats de la vérification:\n');
  
  if (allErrors.length === 0 && allWarnings.length === 0) {
    console.log('✅ Tous les sitemaps sont conformes SEO!');
    console.log('   - Aucune URL avec hash');
    console.log('   - Aucun doublon');
    console.log('   - Toutes les URLs sont absolues');
    console.log('   - sitemap-index.xml référence tous les sitemaps');
    console.log('   - /playlist n\'apparaît pas dans les sitemaps');
    console.log('   - robots.txt ne permet pas /playlist');
    return 0;
  }
  
  if (allErrors.length > 0) {
    console.error('❌ Erreurs trouvées:');
    allErrors.forEach(err => console.error(`   ${err}`));
  }
  
  if (allWarnings.length > 0) {
    console.warn('\n⚠️  Avertissements:');
    allWarnings.forEach(warn => console.warn(`   ${warn}`));
  }
  
  return 1;
}

// Execute
if (require.main === module) {
  const exitCode = verify();
  process.exit(exitCode);
}

module.exports = { verify };
