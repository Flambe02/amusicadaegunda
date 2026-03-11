const fs = require('fs');
const path = require('path');

const rootDir = path.join(__dirname, '..');
const distDir = path.join(rootDir, 'dist');
const publicDir = path.join(rootDir, 'public');

const OUTPUT_NAME = 'sw-assets.json';
const STATIC_ENTRIES = [
  '/',
  '/index.html',
  '/offline.html',
  '/manifest.json',
  '/build-info.json',
  '/content/songs.json',
  '/images/Caipivara_transp-removebg-preview.png',
  '/icons/pwa/icon-192x192.png',
  '/icons/pwa/icon-512x512.png',
];

function collectFromIndex(html) {
  const assets = new Set();
  const assetRegex = /(?:href|src)="([^"]+\.(?:js|css|woff2?|png|jpg|jpeg|webp|svg|ico))"/g;
  let match;

  while ((match = assetRegex.exec(html)) !== null) {
    const raw = match[1];
    if (!raw.startsWith('/')) continue;
    if (raw.startsWith('http')) continue;
    assets.add(raw);
  }

  return assets;
}

function writeShellManifest(targetDir, assets) {
  fs.writeFileSync(
    path.join(targetDir, OUTPUT_NAME),
    JSON.stringify({ assets }, null, 2),
    'utf8'
  );
}

if (!fs.existsSync(distDir)) {
  console.error('dist/ est introuvable. Lancez vite build avant ce script.');
  process.exit(1);
}

const indexPath = path.join(distDir, 'index.html');
const html = fs.readFileSync(indexPath, 'utf8');
const assets = [...new Set([...STATIC_ENTRIES, ...collectFromIndex(html)])].sort();

writeShellManifest(distDir, assets);
writeShellManifest(publicDir, assets);

console.log(`✅ ${OUTPUT_NAME} généré avec ${assets.length} entrées shell.`);
