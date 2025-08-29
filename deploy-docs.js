import fs from 'fs-extra';
import path from 'path';
import { fileURLToPath } from 'url';

async function deployToDocs() {
  try {
    const __filename = fileURLToPath(import.meta.url);
    const __dirname = path.dirname(__filename);
    const distPath = path.join(__dirname, 'dist');
    const docsPath = path.join(__dirname, 'docs');
    
    // Sauvegarder les fichiers importants de GitHub Pages
    const importantFiles = [];
    if (fs.existsSync(docsPath)) {
      // Sauvegarder CNAME si il existe
      const cnamePath = path.join(docsPath, 'CNAME');
      if (fs.existsSync(cnamePath)) {
        const cnameContent = await fs.readFile(cnamePath, 'utf8');
        importantFiles.push({ name: 'CNAME', content: cnameContent });
        console.log('📋 CNAME sauvegardé:', cnameContent.trim());
      }
      
      // Sauvegarder d'autres fichiers de configuration si ils existent
      const configFiles = ['_redirects', '.nojekyll'];
      for (const configFile of configFiles) {
        const configPath = path.join(docsPath, configFile);
        if (fs.existsSync(configPath)) {
          const content = await fs.readFile(configPath, 'utf8');
          importantFiles.push({ name: configFile, content });
          console.log(`📋 ${configFile} sauvegardé`);
        }
      }
    }
    
    // Supprimer le dossier docs existant
    if (fs.existsSync(docsPath)) {
      await fs.remove(docsPath);
    }
    
    // Copier le contenu de dist vers docs
    await fs.copy(distPath, docsPath);
    
    // Restaurer les fichiers importants
    for (const file of importantFiles) {
      const filePath = path.join(docsPath, file.name);
      await fs.writeFile(filePath, file.content);
      console.log(`✅ ${file.name} restauré`);
    }
    
    console.log('✅ Build copié vers docs/ avec succès !');
    console.log('📁 Dossier docs/ prêt pour GitHub Pages');
    console.log('🔒 Fichiers de configuration préservés');
    
  } catch (error) {
    console.error('❌ Erreur lors de la copie:', error);
    process.exit(1);
  }
}

deployToDocs();
