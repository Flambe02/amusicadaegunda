const fs = require('fs-extra');
const path = require('path');

/**
 * Script pour optimiser les images et générer des versions WebP
 * Note: Nécessite sharp pour la conversion WebP
 * Installation: npm install --save-dev sharp
 */

const IMAGES_DIR = path.join(__dirname, '../public/images');
const OUTPUT_DIR = IMAGES_DIR;

async function optimizeImages() {
  try {
    console.log('📸 Optimisation des images...');
    
    // Vérifier si sharp est installé
    let sharp;
    try {
      sharp = require('sharp');
    } catch (error) {
      console.warn('⚠️ Sharp n\'est pas installé. Installation recommandée: npm install --save-dev sharp');
      console.warn('⚠️ Pour l\'instant, le script ne fera que lister les images.');
      return listImages();
    }

    // Lire les images
    const files = await fs.readdir(IMAGES_DIR);
    const imageFiles = files.filter(file => 
      /\.(jpg|jpeg|png)$/i.test(file)
    );

    console.log(`📁 ${imageFiles.length} images trouvées`);

    for (const file of imageFiles) {
      const inputPath = path.join(IMAGES_DIR, file);
      const outputPath = path.join(OUTPUT_DIR, file.replace(/\.(jpg|jpeg|png)$/i, '.webp'));
      
      // Vérifier si le WebP existe déjà
      if (await fs.pathExists(outputPath)) {
        console.log(`⏭️  ${file} → WebP déjà existant`);
        continue;
      }

      try {
        await sharp(inputPath)
          .webp({ quality: 85 })
          .toFile(outputPath);
        
        console.log(`✅ ${file} → ${path.basename(outputPath)}`);
      } catch (error) {
        console.error(`❌ Erreur conversion ${file}:`, error.message);
      }
    }

    console.log('✨ Optimisation terminée!');
  } catch (error) {
    console.error('❌ Erreur:', error);
  }
}

async function listImages() {
  try {
    const files = await fs.readdir(IMAGES_DIR);
    const imageFiles = files.filter(file => 
      /\.(jpg|jpeg|png|webp)$/i.test(file)
    );

    console.log('\n📋 Images disponibles:');
    imageFiles.forEach(file => {
      const stats = fs.statSync(path.join(IMAGES_DIR, file));
      const sizeKB = (stats.size / 1024).toFixed(2);
      console.log(`  - ${file} (${sizeKB} KB)`);
    });
  } catch (error) {
    console.error('❌ Erreur:', error);
  }
}

optimizeImages();

