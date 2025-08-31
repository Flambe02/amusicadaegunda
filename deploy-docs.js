import fs from 'fs-extra';
import path from 'path';
import { fileURLToPath } from 'url';

async function deployToDocs() {
  try {
    const __filename = fileURLToPath(import.meta.url);
    const __dirname = path.dirname(__filename);
    const distPath = path.join(__dirname, 'dist');
    const docsPath = path.join(__dirname, 'docs');
    
    // PROTECTION DU CNAME - Sauvegarder avant suppression
    let cnameContent = null;
    const cnamePath = path.join(docsPath, 'CNAME');
    if (fs.existsSync(cnamePath)) {
      cnameContent = await fs.readFile(cnamePath, 'utf8');
      console.log('🔒 CNAME sauvegardé:', cnameContent.trim());
    }
    
    // Supprimer le dossier docs existant
    if (fs.existsSync(docsPath)) {
      await fs.remove(docsPath);
    }
    
    // Copier le contenu de dist vers docs
    await fs.copy(distPath, docsPath);
    
    // RESTAURATION DU CNAME - Remettre après copie
    if (cnameContent) {
      await fs.writeFile(cnamePath, cnameContent);
      console.log('🔒 CNAME restauré:', cnameContent.trim());
    } else {
      // Si pas de CNAME existant, créer avec le custom domain
      const defaultCname = 'www.amusicadasegunda.com';
      await fs.writeFile(cnamePath, defaultCname);
      console.log('🔒 CNAME créé par défaut:', defaultCname);
    }
    
    console.log('✅ Build copié vers docs/ avec succès !');
    console.log('📁 Dossier docs/ prêt pour GitHub Pages');
    console.log('🔒 Custom domain www.amusicadasegunda.com PROTÉGÉ !');
    
  } catch (error) {
    console.error('❌ Erreur lors de la copie:', error);
    process.exit(1);
  }
}

deployToDocs();
