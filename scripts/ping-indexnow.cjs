/**
 * IndexNow ping — notifies Bing (+ Yandex) of updated URLs
 * Run automatically after build via postbuild script.
 * Reads sitemap-songs.xml + sitemap-pages.xml from public/ and pings all URLs.
 */

const fs = require('fs-extra');
const path = require('path');

const HOST = 'www.amusicadasegunda.com';
const KEY = '1e485b1ec532463ba5ac658bc52e977b';
const KEY_LOCATION = `https://${HOST}/${KEY}.txt`;
const INDEXNOW_ENDPOINT = 'https://www.bing.com/indexnow';
const BATCH_SIZE = 100; // IndexNow limit per request

function extractUrls(xml) {
  const matches = xml.match(/<loc>([^<]+)<\/loc>/g) || [];
  return matches
    .map(m => m.replace(/<\/?loc>/g, '').trim())
    .filter(u => u.startsWith(`https://${HOST}`));
}

async function pingBatch(urls) {
  const res = await fetch(INDEXNOW_ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json; charset=utf-8' },
    body: JSON.stringify({ host: HOST, key: KEY, keyLocation: KEY_LOCATION, urlList: urls })
  });
  return res.status;
}

async function main() {
  console.log('📡 IndexNow — lecture des sitemaps...');

  const publicDir = path.join(process.cwd(), 'public');
  const files = ['sitemap-songs.xml', 'sitemap-pages.xml'];
  const allUrls = [];

  for (const file of files) {
    const filePath = path.join(publicDir, file);
    if (await fs.pathExists(filePath)) {
      const xml = await fs.readFile(filePath, 'utf8');
      const urls = extractUrls(xml);
      allUrls.push(...urls);
      console.log(`  ${file}: ${urls.length} URLs`);
    }
  }

  if (allUrls.length === 0) {
    console.log('⚠️  Aucune URL trouvée — ping annulé');
    return;
  }

  // Deduplicate
  const unique = [...new Set(allUrls)];
  console.log(`\n🔔 Ping de ${unique.length} URLs vers IndexNow...`);

  // Send in batches of 100
  for (let i = 0; i < unique.length; i += BATCH_SIZE) {
    const batch = unique.slice(i, i + BATCH_SIZE);
    try {
      const status = await pingBatch(batch);
      if (status === 200 || status === 202) {
        console.log(`  ✅ Batch ${Math.floor(i / BATCH_SIZE) + 1}: ${batch.length} URLs — HTTP ${status}`);
      } else {
        console.warn(`  ⚠️  Batch ${Math.floor(i / BATCH_SIZE) + 1}: HTTP ${status}`);
      }
    } catch (err) {
      console.error(`  ❌ Batch ${Math.floor(i / BATCH_SIZE) + 1}: ${err.message}`);
    }
  }

  console.log('\n✅ IndexNow ping terminé');
}

main().catch(err => {
  console.error('❌ IndexNow ping échoué:', err.message);
  // Non-fatal — don't block the build
  process.exit(0);
});
