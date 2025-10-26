const sharp = require('sharp');
const path = require('path');

async function generateMissingIcons() {
  console.log('🔧 Génération des icônes manquantes...\n');
  
  const sourcePath = path.join(__dirname, '../public/images/IOS Logo.png');
  
  // Icônes manquantes
  const missingIcons = [
    { size: 256, filename: 'icon-256x256.png', outputDir: 'pwa' },
    { size: 256, filename: 'favicon-256x256.png', outputDir: 'pwa' }
  ];
  
  for (const icon of missingIcons) {
    try {
      const outputPath = path.join(__dirname, `../public/icons/${icon.outputDir}/${icon.filename}`);
      
      // Créer l'icône avec padding
      const padding = Math.floor(icon.size * 0.1);
      const finalSize = icon.size + (padding * 2);
      
      // Créer le fond carré
      const backgroundImage = await sharp({
        create: {
          width: finalSize,
          height: finalSize,
          channels: 4,
          background: '#32a2dc'
        }
      }).png().toBuffer();
      
      // Superposer l'icône
      const iconBuffer = await sharp(sourcePath)
        .resize(icon.size, icon.size, { 
          fit: 'contain',
          background: { r: 0, g: 0, b: 0, alpha: 0 }
        })
        .png()
        .toBuffer();
      
      await sharp(backgroundImage)
        .composite([{ input: iconBuffer }])
        .png()
        .toFile(outputPath);
      
      console.log(`✅ Généré: ${icon.filename} (${finalSize}x${finalSize})`);
    } catch (error) {
      console.error(`❌ Erreur lors de la génération de ${icon.filename}:`, error.message);
    }
  }
  
  console.log('\n🎉 Icônes manquantes générées !');
}

generateMissingIcons().catch(console.error);
