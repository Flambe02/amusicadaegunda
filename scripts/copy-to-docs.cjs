/**
 * Script pour copier dist/ vers docs/ après le build
 * Garantit que docs/ contient toujours la dernière version buildée
 */

const fs = require('fs');
const path = require('path');

const distDir = path.join(__dirname, '..', 'dist');
const docsDir = path.join(__dirname, '..', 'docs');

console.log('📦 Copie de dist/ vers docs/...');

// Vérifier que dist/ existe
if (!fs.existsSync(distDir)) {
  console.error('❌ Le dossier dist/ n\'existe pas. Exécutez npm run build d\'abord.');
  process.exit(1);
}

// Créer docs/ s'il n'existe pas, sinon le vider
if (fs.existsSync(docsDir)) {
  console.log('🗑️  Vidage de docs/...');
  fs.rmSync(docsDir, { recursive: true, force: true });
}

// Copier dist/ vers docs/
console.log('📋 Copie des fichiers...');
fs.cpSync(distDir, docsDir, { recursive: true });

// Expose content/songs.json at /content/songs.json so the runtime fallback in
// src/api/entities.js can hydrate when Supabase is unreachable (e.g. rotated key).
const songsSrc = path.join(__dirname, '..', 'content', 'songs.json');
if (fs.existsSync(songsSrc)) {
  for (const targetDir of [distDir, docsDir]) {
    const targetContentDir = path.join(targetDir, 'content');
    fs.mkdirSync(targetContentDir, { recursive: true });
    fs.copyFileSync(songsSrc, path.join(targetContentDir, 'songs.json'));
  }
  console.log('📋 content/songs.json copié dans dist/content/ et docs/content/ (runtime fallback)');
}

console.log('✅ Copie terminée ! docs/ est maintenant à jour.');
console.log(`📊 Fichiers copiés depuis: ${distDir}`);
console.log(`📊 Vers: ${docsDir}`);

