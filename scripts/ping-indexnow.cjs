/**
 * IndexNow — prévient les moteurs de recherche que des pages ont changé.
 *
 * Lancé par la CI APRÈS le déploiement (étape « IndexNow » de .github/workflows/main.yml),
 * plus par le build : les adresses annoncées sont alors réellement en ligne, et un
 * build local ne prévient plus personne.
 *
 * Chaque moteur est prévenu séparément et son refus est DIT : le script affiche la
 * réponse, pose une annotation d'erreur GitHub et sort en échec. L'ancien script
 * affichait « ping terminé » même quand Bing répondait 403.
 *
 * 403 « UserForbiddedToAccessSite » chez Bing alors que la clé est en ligne : le site
 * n'est pas (ou plus) vérifié dans Bing Webmaster Tools. La clé elle-même est bonne —
 * Yandex l'accepte. À corriger côté Bing, pas ici.
 */
const fs = require('fs-extra');
const path = require('path');

const HOST = 'www.amusicadasegunda.com';
const KEY = '1e485b1ec532463ba5ac658bc52e977b';
const KEY_LOCATION = `https://${HOST}/${KEY}.txt`;
const ENDPOINTS = [
  { name: 'Bing', url: 'https://www.bing.com/indexnow' },
  { name: 'Yandex', url: 'https://yandex.com/indexnow' },
];
const BATCH_SIZE = 100; // limite IndexNow par requête

function extractUrls(xml) {
  return (xml.match(/<loc>([^<]+)<\/loc>/g) || [])
    .map((match) => match.replace(/<\/?loc>/g, '').trim())
    .filter((url) => url.startsWith(`https://${HOST}`));
}

async function pingBatch(endpoint, urls, fetchImpl = fetch) {
  const response = await fetchImpl(endpoint.url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json; charset=utf-8' },
    body: JSON.stringify({ host: HOST, key: KEY, keyLocation: KEY_LOCATION, urlList: urls }),
  });
  const body = response.ok ? '' : (await response.text().catch(() => '')).slice(0, 300);
  return { status: response.status, ok: response.ok, body };
}

/** Prévient chaque moteur ; renvoie la liste des refus (vide = tout est accepté). */
async function pingAll(urls, { fetchImpl = fetch, log = console.log } = {}) {
  const refusals = [];
  for (const endpoint of ENDPOINTS) {
    for (let i = 0; i < urls.length; i += BATCH_SIZE) {
      const batch = urls.slice(i, i + BATCH_SIZE);
      try {
        const result = await pingBatch(endpoint, batch, fetchImpl);
        if (result.ok) log(`  ✅ ${endpoint.name} : ${batch.length} adresses acceptées (HTTP ${result.status})`);
        else refusals.push(`${endpoint.name} a refusé ${batch.length} adresses : HTTP ${result.status} ${result.body}`.trim());
      } catch (error) {
        refusals.push(`${endpoint.name} injoignable : ${error.message}`);
      }
    }
  }
  return refusals;
}

async function main() {
  const urls = [];
  for (const file of ['sitemap-songs.xml', 'sitemap-pages.xml']) {
    const filePath = path.join(process.cwd(), 'public', file);
    if (await fs.pathExists(filePath)) urls.push(...extractUrls(await fs.readFile(filePath, 'utf8')));
  }
  const unique = [...new Set(urls)];
  if (unique.length === 0) {
    console.error('::error title=IndexNow::Aucune adresse dans les sitemaps : rien à annoncer.');
    process.exit(1);
  }
  console.log(`📡 IndexNow : ${unique.length} adresses à annoncer`);
  const refusals = await pingAll(unique);
  if (refusals.length > 0) {
    for (const refusal of refusals) console.error(`::error title=IndexNow::${refusal}`);
    console.error(`\n❌ IndexNow : ${refusals.length} refus. Les pages sont en ligne, mais ces moteurs ne sont pas prévenus.`);
    process.exit(1);
  }
  console.log('✅ IndexNow : tous les moteurs ont accepté.');
}

if (require.main === module) {
  main();
}

module.exports = { extractUrls, pingAll, ENDPOINTS };
