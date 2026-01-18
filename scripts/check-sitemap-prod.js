const SITE = "https://www.amusicadasegunda.com";
const NEED = [
  `${SITE}/`,
  `${SITE}/musica`,
  `${SITE}/musica/maduro` // Example song URL
];

/**
 * Fetch and parse sitemap index, then check all referenced sitemaps
 */
async function fetchSitemap(url) {
  const res = await fetch(`${url}?ts=${Date.now()}`, {
    redirect: 'follow',
    headers: {
      'cache-control': 'no-cache, no-store, max-age=0',
      'pragma': 'no-cache'
    }
  });
  if (!res.ok) {
    throw new Error(`HTTP ${res.status}`);
  }
  return await res.text();
}

/**
 * Extract <loc> entries from XML
 */
function extractLocEntries(xml) {
  const locs = [];
  const locRegex = /<loc>(.*?)<\/loc>/g;
  let match;
  while ((match = locRegex.exec(xml)) !== null) {
    locs.push(match[1]);
  }
  return locs;
}

(async () => {
  try {
    // 1. Fetch sitemap index
    console.log('📑 Fetching sitemap-index.xml...');
    const indexXml = await fetchSitemap(`${SITE}/sitemap-index.xml`);
    const indexLocs = extractLocEntries(indexXml);
    console.log(`✅ Found ${indexLocs.length} sitemap(s) in index`);
    
    // 2. Fetch all referenced sitemaps
    let allUrls = new Set();
    for (const sitemapUrl of indexLocs) {
      console.log(`📄 Fetching ${sitemapUrl}...`);
      const sitemapXml = await fetchSitemap(sitemapUrl);
      const urls = extractLocEntries(sitemapXml);
      urls.forEach(url => allUrls.add(url));
      console.log(`   ✅ Found ${urls.length} URLs`);
    }
    
    // 3. Check for required URLs
    const allUrlsArray = Array.from(allUrls);
    const missing = NEED.filter(u => {
      // Check both with and without trailing slash
      const normalized = u.replace(/\/$/, '');
      return !allUrlsArray.some(url => 
        url === u || url === normalized || url === `${u}/` || url === `${normalized}/`
      );
    });
    
    console.log(`\n📊 Total URLs found: ${allUrlsArray.length}`);
    if (missing.length) {
      console.error('❌ Missing URLs in sitemap:\n- ' + missing.join('\n- '));
      process.exit(1);
    } else {
      console.log('✅ sitemap contains all key URLs');
    }
  } catch (error) {
    console.error(`❌ Error checking sitemap: ${error.message}`);
    process.exit(1);
  }
})();


