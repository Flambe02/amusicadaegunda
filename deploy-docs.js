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
    
    // Créer des stubs de routes pour GitHub Pages avec HTML indexable (SEO-friendly)
    const routes = {
      'home': {
        title: 'A Música da Segunda — Nova música toda segunda',
        description: 'Paródias musicais inteligentes sobre as notícias do Brasil. Uma nova música toda segunda-feira.',
        hashPath: 'home'
      },
      'calendar': {
        title: 'Calendário — A Música da Segunda',
        description: 'Veja todas as músicas lançadas por mês. Calendário completo das paródias musicais.',
        hashPath: 'calendar'
      },
      'adventcalendar': {
        title: 'Calendário do Advento — A Música da Segunda',
        description: 'Uma surpresa musical por dia, em dezembro.',
        hashPath: 'adventcalendar'
      },
      'chansons': {
        title: 'Todas as Chansons — A Música da Segunda',
        description: 'Lista completa de todas as paródias musicais lançadas.',
        hashPath: 'chansons'
      },
      'playlist': {
        title: 'Playlist — A Música da Segunda',
        description: 'Ouça todas as músicas da segunda, organize por tema e descubra novas faixas.',
        hashPath: 'playlist'
      },
      'blog': {
        title: 'Blog — A Música da Segunda',
        description: 'Bastidores, letras, making-of e novidades do projeto.',
        hashPath: 'blog'
      },
      'sobre': {
        title: 'Sobre — A Música da Segunda',
        description: 'Quem somos, como fazemos e onde ouvir.',
        hashPath: 'sobre'
      }
    };

    const makeIndexableHtml = (routeInfo) => {
      const siteUrl = 'https://www.amusicadasegunda.com';
      const url = `${siteUrl}/${routeInfo.hashPath}`;
      const image = `${siteUrl}/icons/icon-512x512.png`;
      
      return `<!doctype html>
<html lang="pt-BR">
<head>
<meta charset="utf-8"/>
<meta name="viewport" content="width=device-width,initial-scale=1"/>
<title>${routeInfo.title}</title>
<meta name="description" content="${routeInfo.description}"/>
<link rel="canonical" href="${url}"/>

<!-- Open Graph -->
<meta property="og:title" content="${routeInfo.title}"/>
<meta property="og:description" content="${routeInfo.description}"/>
<meta property="og:type" content="website"/>
<meta property="og:url" content="${url}"/>
<meta property="og:image" content="${image}"/>

<!-- Twitter -->
<meta name="twitter:card" content="summary_large_image"/>
<meta name="twitter:title" content="${routeInfo.title}"/>
<meta name="twitter:description" content="${routeInfo.description}"/>
<meta name="twitter:image" content="${image}"/>

<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@type": "WebPage",
  "name": "${routeInfo.title}",
  "description": "${routeInfo.description}",
  "url": "${url}",
  "publisher": {
    "@type": "Organization",
    "name": "A Música da Segunda",
    "url": "${siteUrl}",
    "logo": "${image}"
  }
}
</script>

</head>
<body>
<div id="root"></div>
<noscript>Este site requer JavaScript para interação total.</noscript>
<p>${routeInfo.description}</p>
<p><a href="${url}">Acessar página completa</a></p>
<script>
// Redirection uniquement pour les navigateurs (pas pour les bots)
if (!/bot|crawler|spider|crawling|Googlebot|bingbot/i.test(navigator.userAgent)) {
  window.location.replace('/#/${routeInfo.hashPath}');
}
</script>
</body>
</html>`;
    };

    for (const [route, routeInfo] of Object.entries(routes)) {
      const routeDir = path.join(docsPath, route);
      const target = path.join(routeDir, 'index.html');
      // Ne PAS écraser les stubs enrichis copiés depuis dist/ (JSON-LD, OG, etc.)
      if (!fs.existsSync(target)) {
        await fs.mkdirp(routeDir);
        await fs.writeFile(target, makeIndexableHtml(routeInfo));
      }
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
