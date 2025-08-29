import React, { useEffect } from 'react';
import { Helmet } from 'react-helmet-async';

export default function SEO({ 
  title, 
  description, 
  keywords, 
  image, 
  url, 
  type = 'website',
  publishedTime,
  modifiedTime,
  author,
  section,
  tags = []
}) {
  const siteName = 'Música da Segunda';
  const siteUrl = 'https://amusicadaegunda.com';
  const defaultImage = `${siteUrl}/images/Logo.png`;
  
  const fullTitle = title ? `${title} | ${siteName}` : siteName;
  const fullDescription = description || 'Descubra uma nova música incrível toda segunda-feira. Sua dose semanal de descobertas musicais.';
  const fullKeywords = keywords || 'música, segunda-feira, descobertas musicais, nova música, playlist semanal, música brasileira, indie music';
  const fullImage = image || defaultImage;
  const fullUrl = url ? `${siteUrl}${url}` : siteUrl;

  useEffect(() => {
    // Mise à jour dynamique du titre de la page
    document.title = fullTitle;
    
    // Mise à jour des métadonnées Open Graph
    updateMetaTag('property', 'og:title', fullTitle);
    updateMetaTag('property', 'og:description', fullDescription);
    updateMetaTag('property', 'og:url', fullUrl);
    updateMetaTag('property', 'og:image', fullImage);
    
    // Mise à jour des métadonnées Twitter
    updateMetaTag('name', 'twitter:title', fullTitle);
    updateMetaTag('name', 'twitter:description', fullDescription);
    updateMetaTag('name', 'twitter:image', fullImage);
    
    // Mise à jour de la description
    updateMetaTag('name', 'description', fullDescription);
    updateMetaTag('name', 'keywords', fullKeywords);
    
    // Mise à jour du lien canonique
    updateCanonicalLink(fullUrl);
  }, [fullTitle, fullDescription, fullKeywords, fullImage, fullUrl]);

  const updateMetaTag = (attribute, value, content) => {
    let meta = document.querySelector(`meta[${attribute}="${value}"]`);
    if (!meta) {
      meta = document.createElement('meta');
      meta.setAttribute(attribute, value);
      document.head.appendChild(meta);
    }
    meta.setAttribute('content', content);
  };

  const updateCanonicalLink = (url) => {
    let canonical = document.querySelector('link[rel="canonical"]');
    if (!canonical) {
      canonical = document.createElement('link');
      canonical.setAttribute('rel', 'canonical');
      document.head.appendChild(canonical);
    }
    canonical.setAttribute('href', url);
  };

  return (
    <Helmet>
      {/* Métadonnées de base */}
      <title>{fullTitle}</title>
      <meta name="description" content={fullDescription} />
      <meta name="keywords" content={fullKeywords} />
      
      {/* Open Graph */}
      <meta property="og:title" content={fullTitle} />
      <meta property="og:description" content={fullDescription} />
      <meta property="og:url" content={fullUrl} />
      <meta property="og:image" content={fullImage} />
      <meta property="og:type" content={type} />
      <meta property="og:site_name" content={siteName} />
      
      {/* Twitter */}
      <meta name="twitter:title" content={fullTitle} />
      <meta name="twitter:description" content={fullDescription} />
      <meta name="twitter:image" content={fullImage} />
      
      {/* Métadonnées avancées */}
      {publishedTime && <meta property="article:published_time" content={publishedTime} />}
      {modifiedTime && <meta property="article:modified_time" content={modifiedTime} />}
      {author && <meta property="article:author" content={author} />}
      {section && <meta property="article:section" content={section} />}
      
      {/* Tags pour les articles */}
      {tags.map((tag, index) => (
        <meta key={index} property="article:tag" content={tag} />
      ))}
      
      {/* Données structurées Schema.org */}
      <script type="application/ld+json">
        {JSON.stringify({
          "@context": "https://schema.org",
          "@type": type === 'article' ? 'Article' : 'WebPage',
          "headline": fullTitle,
          "description": fullDescription,
          "image": fullImage,
          "url": fullUrl,
          "publisher": {
            "@type": "Organization",
            "name": siteName,
            "logo": {
              "@type": "ImageObject",
              "url": defaultImage,
              "width": 512,
              "height": 512
            }
          },
          "mainEntityOfPage": {
            "@type": "WebPage",
            "@id": fullUrl
          },
          ...(type === 'article' && {
            "datePublished": publishedTime,
            "dateModified": modifiedTime,
            "author": {
              "@type": "Person",
              "name": author || siteName
            },
            "articleSection": section,
            "keywords": tags.join(', ')
          })
        })}
      </script>
    </Helmet>
  );
}
