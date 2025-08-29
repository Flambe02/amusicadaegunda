import fs from 'fs-extra';
import path from 'path';
import { fileURLToPath } from 'url';

async function deployToDocs() {
  try {
    const __filename = fileURLToPath(import.meta.url);
    const __dirname = path.dirname(__filename);
    const distPath = path.join(__dirname, 'dist');
    const docsPath = path.join(__dirname, 'docs');
    
    // Supprimer le dossier docs existant
    if (fs.existsSync(docsPath)) {
      await fs.remove(docsPath);
    }
    
    // Copier le contenu de dist vers docs
    await fs.copy(distPath, docsPath);
    
    console.log('✅ Build copié vers docs/ avec succès !');
    console.log('📁 Dossier docs/ prêt pour GitHub Pages');
    
  } catch (error) {
    console.error('❌ Erreur lors de la copie:', error);
    process.exit(1);
  }
}

deployToDocs();
