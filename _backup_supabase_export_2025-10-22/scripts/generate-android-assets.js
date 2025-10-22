import fs from 'fs-extra';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function generateAndroidAssets() {
  try {
    const sourceIcon = path.join(__dirname, '../resources/android/icon.png');
    const androidResPath = path.join(__dirname, '../android/app/src/main/res');
    
    console.log('🔧 Génération des assets Android...');
    
    // Vérifier que le fichier source existe
    if (!await fs.pathExists(sourceIcon)) {
      throw new Error(`Fichier source introuvable: ${sourceIcon}`);
    }
    
    // Copier l'icône vers les dossiers mipmap
    const mipmapDirs = [
      'mipmap-mdpi',
      'mipmap-hdpi', 
      'mipmap-xhdpi',
      'mipmap-xxhdpi',
      'mipmap-xxxhdpi'
    ];
    
    for (const dir of mipmapDirs) {
      const targetDir = path.join(androidResPath, dir);
      if (await fs.pathExists(targetDir)) {
        await fs.copy(sourceIcon, path.join(targetDir, 'ic_launcher.png'));
        await fs.copy(sourceIcon, path.join(targetDir, 'ic_launcher_round.png'));
        console.log(`✅ Icônes copiées vers ${dir}`);
      }
    }
    
    // Créer le fichier splash dans drawable
    const drawablePath = path.join(androidResPath, 'drawable');
    if (await fs.pathExists(drawablePath)) {
      await fs.copy(sourceIcon, path.join(drawablePath, 'splash.png'));
      console.log('✅ Splash screen copié vers drawable');
    }
    
    console.log('🎉 Assets Android générés avec succès !');
    
  } catch (error) {
    console.error('❌ Erreur lors de la génération des assets:', error.message);
    process.exit(1);
  }
}

generateAndroidAssets();
