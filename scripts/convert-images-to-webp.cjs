/**
 * Script de conversion des images en WebP
 * Optimise les images pour réduire leur taille de ~70%
 * 
 * Usage: node scripts/convert-images-to-webp.cjs
 * 
 * Note: Nécessite sharp (npm install sharp --save-dev)
 */

const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

// Configuration
const QUALITY = 85; // Qualité WebP (0-100)
const EFFORT = 6; // Effort de compression (0-6, 6 = max)

// Dossiers à traiter
const DIRECTORIES = [
  path.join(__dirname, '../public/images'),
  path.join(__dirname, '../public/icons/pwa'),
];

/**
 * Convertir une image en WebP
 */
async function convertToWebP(inputPath) {
  try {
    const ext = path.extname(inputPath).toLowerCase();
    
    // Ne traiter que les images PNG et JPEG
    if (!['.png', '.jpg', '.jpeg'].includes(ext)) {
      return null;
    }
    
    const outputPath = inputPath.replace(/\.(png|jpg|jpeg)$/i, '.webp');
    
    // Ne pas reconvertir si le WebP existe déjà et est plus récent
    if (fs.existsSync(outputPath)) {
      const inputStats = fs.statSync(inputPath);
      const outputStats = fs.statSync(outputPath);
      
      if (outputStats.mtime > inputStats.mtime) {
        console.log(`⏭️  Déjà converti (à jour): ${path.basename(outputPath)}`);
        return null;
      }
    }
    
    // Conversion
    const info = await sharp(inputPath)
      .webp({ 
        quality: QUALITY, 
        effort: EFFORT,
        lossless: false, // Compression avec perte (meilleure compression)
      })
      .toFile(outputPath);
    
    const originalSize = fs.statSync(inputPath).size;
    const newSize = info.size;
    const savings = Math.round((1 - newSize / originalSize) * 100);
    
    console.log(`✅ ${path.basename(inputPath)} → ${path.basename(outputPath)}`);
    console.log(`   ${formatBytes(originalSize)} → ${formatBytes(newSize)} (${savings}% économisé)`);
    
    return { originalSize, newSize, savings };
  } catch (error) {
    console.error(`❌ Erreur lors de la conversion de ${inputPath}:`, error.message);
    return null;
  }
}

/**
 * Formater les octets en format lisible
 */
function formatBytes(bytes) {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(2) + ' KB';
  return (bytes / (1024 * 1024)).toFixed(2) + ' MB';
}

/**
 * Traiter un dossier récursivement
 */
async function processDirectory(dirPath) {
  if (!fs.existsSync(dirPath)) {
    console.log(`⚠️  Dossier introuvable: ${dirPath}`);
    return [];
  }
  
  const results = [];
  const files = fs.readdirSync(dirPath);
  
  for (const file of files) {
    const filePath = path.join(dirPath, file);
    const stats = fs.statSync(filePath);
    
    if (stats.isDirectory()) {
      // Traiter les sous-dossiers récursivement
      const subResults = await processDirectory(filePath);
      results.push(...subResults);
    } else {
      // Convertir le fichier
      const result = await convertToWebP(filePath);
      if (result) {
        results.push(result);
      }
    }
  }
  
  return results;
}

/**
 * Main
 */
async function main() {
  console.log('🚀 Conversion des images en WebP...\n');
  
  let totalOriginal = 0;
  let totalNew = 0;
  let totalFiles = 0;
  
  for (const directory of DIRECTORIES) {
    console.log(`📁 Traitement: ${directory}\n`);
    
    const results = await processDirectory(directory);
    
    for (const result of results) {
      totalOriginal += result.originalSize;
      totalNew += result.newSize;
      totalFiles++;
    }
    
    console.log(''); // Ligne vide entre les dossiers
  }
  
  // Résumé
  console.log('═══════════════════════════════════════════════');
  console.log('📊 RÉSUMÉ');
  console.log('═══════════════════════════════════════════════');
  console.log(`✅ ${totalFiles} fichier(s) converti(s)`);
  console.log(`📦 Taille originale: ${formatBytes(totalOriginal)}`);
  console.log(`📦 Taille WebP: ${formatBytes(totalNew)}`);
  console.log(`💾 Économie: ${formatBytes(totalOriginal - totalNew)} (${Math.round((1 - totalNew / totalOriginal) * 100)}%)`);
  console.log('═══════════════════════════════════════════════');
  
  if (totalFiles === 0) {
    console.log('\nℹ️  Aucune image à convertir (déjà à jour ou aucune image PNG/JPEG trouvée)');
  }
}

// Vérifier si sharp est installé
try {
  require.resolve('sharp');
} catch (e) {
  console.error('❌ Sharp n\'est pas installé.');
  console.error('   Installez-le avec: npm install sharp --save-dev');
  process.exit(1);
}

// Exécution
main().catch(error => {
  console.error('❌ Erreur fatale:', error);
  process.exit(1);
});

