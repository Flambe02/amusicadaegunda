import { useEffect } from 'react';

/**
 * Hook SEO simple pour mettre à jour les meta tags dynamiquement
 * Optimisé pour Música da Segunda
 */
export function useSEO({
  title,
  description,
  keywords,
  image,
  url,
  type = 'website',
  enabled = true
}) {
  const siteName = 'A Música da Segunda';
  const siteUrl = 'https://www.amusicadasegunda.com';
  // Harmonisé avec index.html pour cohérence SEO
  const defaultImage = `${siteUrl}/icons/icon-512x512.png`;

  // ✅ SEO: Si le title contient déjà un pipe, ne pas ajouter le siteName (évite répétition)
  const fullTitle = title 
    ? (title.includes('|') ? title : `${title} | ${siteName}`)
    : siteName;
  const fullDescription = description || 'Descubra uma nova música incrível toda segunda-feira. Sua dose semanal de descobertas musicais.';
  const fullKeywords = keywords || 'música, segunda-feira, descobertas musicais, nova música, playlist semanal, música brasileira, indie music';
  const fullImage = image || defaultImage;
  const fullUrl = url ? `${siteUrl}${url}` : siteUrl;

  useEffect(() => {
    // Vérifier que le DOM est prêt et que le hook est activé
    if (typeof document === 'undefined' || !enabled) return;

    try {
      // Mise à jour du titre de la page
      document.title = fullTitle;

      // Fonction pour mettre à jour ou créer un meta tag
      const updateMetaTag = (attribute, value, content) => {
        let meta = document.querySelector(`meta[${attribute}="${value}"]`);
        if (!meta) {
          meta = document.createElement('meta');
          meta.setAttribute(attribute, value);
          document.head.appendChild(meta);
        }
        meta.setAttribute('content', content);
      };

      // Fonction pour mettre à jour le lien canonique
      const updateCanonicalLink = (url) => {
        let canonical = document.querySelector('link[rel="canonical"]');
        if (!canonical) {
          canonical = document.createElement('link');
          canonical.setAttribute('rel', 'canonical');
          document.head.appendChild(canonical);
        }
        canonical.setAttribute('href', url);
      };

      // Mise à jour des métadonnées de base
      updateMetaTag('name', 'description', fullDescription);
      updateMetaTag('name', 'keywords', fullKeywords);

      // Mise à jour des métadonnées Open Graph
      updateMetaTag('property', 'og:title', fullTitle);
      updateMetaTag('property', 'og:description', fullDescription);
      updateMetaTag('property', 'og:url', fullUrl);
      updateMetaTag('property', 'og:image', fullImage);
      updateMetaTag('property', 'og:type', type);
      updateMetaTag('property', 'og:site_name', siteName);
      updateMetaTag('property', 'og:locale', 'pt_BR');

      // Mise à jour des métadonnées Twitter
      updateMetaTag('name', 'twitter:card', 'summary_large_image');
      updateMetaTag('name', 'twitter:site', '@amusicadasegunda');
      updateMetaTag('name', 'twitter:title', fullTitle);
      updateMetaTag('name', 'twitter:description', fullDescription);
      updateMetaTag('name', 'twitter:image', fullImage);

      // Mise à jour du lien canonique
      updateCanonicalLink(fullUrl);

      // Données structurées Schema.org
      const structuredData = {
        "@context": "https://schema.org",
        "@type": type === 'article' ? 'Article' : 'WebPage',
        "headline": fullTitle,
        "description": fullDescription,
        "image": fullImage,
        "url": fullUrl,
        "publisher": {
          "@type": "Organization",
          "name": siteName,
          "url": siteUrl,
          "logo": {
            "@type": "ImageObject",
            "url": defaultImage,
            "width": 512,
            "height": 512
          },
          "sameAs": [
            "https://www.tiktok.com/@amusicadasegunda",
            "https://open.spotify.com/user/amusicadasegunda"
          ]
        },
        "mainEntityOfPage": {
          "@type": "WebPage",
          "@id": fullUrl
        }
      };

      // ✅ Ajouter l'auteur pour les articles (requis par Google)
      if (type === 'article') {
        structuredData.author = {
          "@type": "Person",
          "name": "Pimentão rouge",
          "url": siteUrl // URL de l'auteur
        };
      }

      // ✅ SEO: Gérer intelligemment le JSON-LD avec un ID unique
      // Ne pas supprimer les scripts statiques (WebSite, Organization)
      // Remplacer uniquement le script dynamique de la page courante
      const dynamicScriptId = 'dynamic-page-jsonld';
      let script = document.getElementById(dynamicScriptId);

      if (!script) {
        // Créer le script s'il n'existe pas
        script = document.createElement('script');
        script.type = 'application/ld+json';
        script.id = dynamicScriptId;
        document.head.appendChild(script);
      }

      // Mettre à jour le contenu
      script.textContent = JSON.stringify(structuredData);

    } catch (error) {
      console.error('Erro ao atualizar SEO:', error);
    }
  }, [fullTitle, fullDescription, fullKeywords, fullImage, fullUrl, type, defaultImage]);
}
