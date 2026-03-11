const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

function createIcoFromPngBuffer(pngBuffer) {
  const header = Buffer.alloc(6);
  header.writeUInt16LE(0, 0);
  header.writeUInt16LE(1, 2);
  header.writeUInt16LE(1, 4);

  const directoryEntry = Buffer.alloc(16);
  directoryEntry.writeUInt8(48, 0);
  directoryEntry.writeUInt8(48, 1);
  directoryEntry.writeUInt8(0, 2);
  directoryEntry.writeUInt8(0, 3);
  directoryEntry.writeUInt16LE(1, 4);
  directoryEntry.writeUInt16LE(32, 6);
  directoryEntry.writeUInt32LE(pngBuffer.length, 8);
  directoryEntry.writeUInt32LE(header.length + directoryEntry.length, 12);

  return Buffer.concat([header, directoryEntry, pngBuffer]);
}

// Configuration des icônes à générer
const ICON_SIZES = {
  // iOS App Store et App Icons
  ios: [
    { size: 20, scale: 1, filename: 'Icon-App-20x20@1x.png' },
    { size: 20, scale: 2, filename: 'Icon-App-20x20@2x.png' },
    { size: 20, scale: 3, filename: 'Icon-App-20x20@3x.png' },
    { size: 29, scale: 1, filename: 'Icon-App-29x29@1x.png' },
    { size: 29, scale: 2, filename: 'Icon-App-29x29@2x.png' },
    { size: 29, scale: 3, filename: 'Icon-App-29x29@3x.png' },
    { size: 40, scale: 1, filename: 'Icon-App-40x40@1x.png' },
    { size: 40, scale: 2, filename: 'Icon-App-40x40@2x.png' },
    { size: 40, scale: 3, filename: 'Icon-App-40x40@3x.png' },
    { size: 60, scale: 2, filename: 'Icon-App-60x60@2x.png' },
    { size: 60, scale: 3, filename: 'Icon-App-60x60@3x.png' },
    { size: 76, scale: 1, filename: 'Icon-App-76x76@1x.png' },
    { size: 76, scale: 2, filename: 'Icon-App-76x76@2x.png' },
    { size: 83.5, scale: 2, filename: 'Icon-App-83.5x83.5@2x.png' },
    { size: 1024, scale: 1, filename: 'ItunesArtwork@2x.png' }
  ],
  
  // Android
  android: [
    { size: 36, filename: 'ic_launcher_36.png' },
    { size: 48, filename: 'ic_launcher_48.png' },
    { size: 72, filename: 'ic_launcher_72.png' },
    { size: 96, filename: 'ic_launcher_96.png' },
    { size: 144, filename: 'ic_launcher_144.png' },
    { size: 192, filename: 'ic_launcher_192.png' },
    { size: 512, filename: 'ic_launcher_512.png' }
  ],
  
  // PWA et Web
  pwa: [
    { size: 16, filename: 'favicon-16x16.png' },
    { size: 32, filename: 'favicon-32x32.png' },
    { size: 48, filename: 'favicon-48x48.png' },
    { size: 64, filename: 'favicon-64x64.png' },
    { size: 72, filename: 'icon-72x72.png' },
    { size: 96, filename: 'icon-96x96.png' },
    { size: 128, filename: 'icon-128x128.png' },
    { size: 144, filename: 'icon-144x144.png' },
    { size: 152, filename: 'icon-152x152.png' },
    { size: 180, filename: 'icon-180x180.png' },
    { size: 192, filename: 'icon-192x192.png' },
    { size: 256, filename: 'icon-256x256.png' },
    { size: 384, filename: 'icon-384x384.png' },
    { size: 512, filename: 'icon-512x512.png' }
  ],
  
  // Apple Touch Icons (carrés)
  apple: [
    { size: 57, filename: 'apple-touch-icon-57x57.png' },
    { size: 60, filename: 'apple-touch-icon-60x60.png' },
    { size: 72, filename: 'apple-touch-icon-72x72.png' },
    { size: 76, filename: 'apple-touch-icon-76x76.png' },
    { size: 114, filename: 'apple-touch-icon-114x114.png' },
    { size: 120, filename: 'apple-touch-icon-120x120.png' },
    { size: 144, filename: 'apple-touch-icon-144x144.png' },
    { size: 152, filename: 'apple-touch-icon-152x152.png' },
    { size: 180, filename: 'apple-touch-icon-180x180.png' }
  ]
};

// Fonction pour créer une icône
async function createIcon(sourcePath, outputPath, size, options = {}) {
  try {
    const { padding = 0, background = 'transparent', borderRadius = 0 } = options;
    
    // Créer un fond carré avec le logo qui remplit 100% de l'espace
    await sharp(sourcePath)
      .resize(size, size, { 
        fit: 'cover', // Remplit tout l'espace carré
        position: 'center'
      })
      .extend({
        top: 0,
        bottom: 0,
        left: 0,
        right: 0,
        background: { r: 0, g: 0, b: 0, alpha: 0 } // Transparent
      })
      .png()
      .toFile(outputPath);
    
    console.log(`✅ Généré: ${outputPath} (${size}x${size}) - Logo 100% remplissage`);
  } catch (error) {
    console.error(`❌ Erreur lors de la génération de ${outputPath}:`, error.message);
  }
}

async function createFaviconIco(sourcePath, outputPath) {
  try {
    const pngBuffer = await sharp(sourcePath)
      .resize(48, 48, {
        fit: 'cover',
        position: 'center'
      })
      .png()
      .toBuffer();

    fs.writeFileSync(outputPath, createIcoFromPngBuffer(pngBuffer));
    console.log(`✅ Généré: ${outputPath} (48x48 ICO)`);
  } catch (error) {
    console.error(`❌ Erreur lors de la génération de ${outputPath}:`, error.message);
  }
}

// Fonction principale
async function generateAllIcons() {
  console.log('🎨 Début de la génération des icônes...\n');
  
  const sourcePath = path.join(__dirname, '../public/images/Caipivara_square.png');
  
  // Vérifier que le fichier source existe
  if (!fs.existsSync(sourcePath)) {
    console.error('❌ Fichier source introuvable:', sourcePath);
    return;
  }
  
  // Créer les dossiers de sortie
  const outputDirs = {
    ios: path.join(__dirname, '../public/icons/ios/AppIcon.appiconset'),
    android: path.join(__dirname, '../public/icons/android'),
    pwa: path.join(__dirname, '../public/icons/pwa'),
    apple: path.join(__dirname, '../public/icons/apple')
  };
  
  Object.values(outputDirs).forEach(dir => {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  });
  
  // Générer les icônes iOS
  console.log('📱 Génération des icônes iOS...');
  for (const icon of ICON_SIZES.ios) {
    const actualSize = icon.size * icon.scale;
    const outputPath = path.join(outputDirs.ios, icon.filename);
    await createIcon(sourcePath, outputPath, actualSize, { 
      padding: 0, // Pas de padding pour 100% remplissage
      background: 'transparent'
    });
  }
  
  // Générer les icônes Android
  console.log('\n🤖 Génération des icônes Android...');
  for (const icon of ICON_SIZES.android) {
    const outputPath = path.join(outputDirs.android, icon.filename);
    await createIcon(sourcePath, outputPath, icon.size, { 
      padding: Math.floor(icon.size * 0.1),
      background: '#32a2dc'
    });
  }
  
  // Générer les icônes PWA
  console.log('\n🌐 Génération des icônes PWA...');
  for (const icon of ICON_SIZES.pwa) {
    const outputPath = path.join(outputDirs.pwa, icon.filename);
    await createIcon(sourcePath, outputPath, icon.size, { 
      padding: Math.floor(icon.size * 0.1),
      background: '#32a2dc'
    });
  }

  // Générer favicon.ico sans dépendance externe
  console.log('\n⭐ Génération du favicon ICO...');
  await createFaviconIco(sourcePath, path.join(__dirname, '../public/favicon.ico'));
  
  // Générer les icônes Apple Touch (carrées)
  console.log('\n🍎 Génération des icônes Apple Touch...');
  for (const icon of ICON_SIZES.apple) {
    const outputPath = path.join(outputDirs.apple, icon.filename);
    await createIcon(sourcePath, outputPath, icon.size, { 
      padding: 0, // Pas de padding pour 100% remplissage
      background: 'transparent'
    });
  }
  
  console.log('\n🎉 Génération des icônes terminée !');
  console.log('\n📁 Icônes générées dans:');
  console.log('  - iOS: public/icons/ios/AppIcon.appiconset/');
  console.log('  - Android: public/icons/android/');
  console.log('  - PWA: public/icons/pwa/');
  console.log('  - Apple Touch: public/icons/apple/');
}

// Exécuter le script
generateAllIcons().catch(console.error);
