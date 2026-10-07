/**
 * Après le build : expose `content/songs.json` à l'adresse /content/songs.json du site.
 * C'est le catalogue de secours que l'app lit quand Supabase ne répond pas
 * (src/api/entities.js).
 *
 * Ce script remplace l'ancien `copy-to-docs.cjs`, qui recopiait aussi tout `dist/` dans
 * `docs/`. Le site est publié par la CI à partir de `dist/` (GitHub Pages, source
 * « GitHub Actions ») : il n'y a plus de dossier `docs/`, ni à produire ni à commiter.
 */
const fs = require('fs');
const path = require('path');

const distDir = path.join(__dirname, '..', 'dist');
const source = path.join(__dirname, '..', 'content', 'songs.json');

if (!fs.existsSync(distDir)) {
  console.error('❌ dist/ introuvable : lancer le build d\'abord.');
  process.exit(1);
}
if (!fs.existsSync(source)) {
  console.error('❌ content/songs.json introuvable : le catalogue de secours manquerait en ligne.');
  process.exit(1);
}
fs.mkdirSync(path.join(distDir, 'content'), { recursive: true });
fs.copyFileSync(source, path.join(distDir, 'content', 'songs.json'));
console.log('✅ content/songs.json copié dans dist/content/ (catalogue de secours)');
