/**
 * SEO JSON-LD helpers for Música da Segunda
 * Provides structured data for songs and navigation
 */

const CANONICAL_HOST = 'https://www.amusicadasegunda.com';

/**
 * Generate MusicRecording JSON-LD schema for individual songs
 * @param {Object} params
 * @param {string} params.title - Song title
 * @param {string} params.slug - Song slug
 * @param {string} [params.datePublished] - Publication date (ISO format)
 * @param {string} [params.image] - Song image URL
 * @param {string} [params.byArtist] - Artist name
 * @returns {Object} JSON-LD schema object
 */
export function musicRecordingJsonLd({ 
  title, 
  slug, 
  datePublished, 
  image, 
  byArtist = 'A Música da Segunda' 
}) {
  const url = `${CANONICAL_HOST}/chansons/${slug}`;
  
  return {
    "@context": "https://schema.org",
    "@type": "MusicRecording",
    "name": title || slug,
    "byArtist": { 
      "@type": "MusicGroup", 
      "name": byArtist 
    },
    "datePublished": datePublished || new Date().toISOString().slice(0, 10),
    "inLanguage": "pt-BR",
    "url": url,
    "genre": ["Indie", "Música Brasileira", "Pop"],
    ...(image ? { "image": image } : {})
  };
}

/**
 * Generate BreadcrumbList JSON-LD schema for song pages
 * @param {Object} params
 * @param {string} params.title - Song title
 * @param {string} params.slug - Song slug
 * @returns {Object} JSON-LD schema object
 */
export function breadcrumbsJsonLd({ title, slug }) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    "itemListElement": [
      { 
        "@type": "ListItem", 
        "position": 1, 
        "name": "Início", 
        "item": `${CANONICAL_HOST}/` 
      },
      { 
        "@type": "ListItem", 
        "position": 2, 
        "name": "Canções", 
        "item": `${CANONICAL_HOST}/chansons` 
      },
      { 
        "@type": "ListItem", 
        "position": 3, 
        "name": title || slug, 
        "item": `${CANONICAL_HOST}/chansons/${slug}` 
      }
    ]
  };
}

/**
 * Generate VideoObject JSON-LD schema for song videos (optional)
 * @param {Object} params
 * @param {string} params.title - Video title
 * @param {string} params.thumbnailUrl - Video thumbnail URL
 * @param {string} params.embedUrl - Video embed URL
 * @param {string} [params.uploadDate] - Upload date (ISO format)
 * @returns {Object} JSON-LD schema object
 */
export function videoObjectJsonLd({ 
  title, 
  thumbnailUrl, 
  embedUrl, 
  uploadDate 
}) {
  return {
    "@context": "https://schema.org",
    "@type": "VideoObject",
    "name": title,
    "thumbnailUrl": thumbnailUrl,
    "embedUrl": embedUrl,
    "uploadDate": uploadDate || new Date().toISOString(),
    "inLanguage": "pt-BR",
    "genre": "Music",
    "familyFriendly": true
  };
}

/**
 * Helper to inject JSON-LD script tags into document head
 * @param {Object} schema - JSON-LD schema object
 * @param {string} [id] - Optional script ID for removal
 */
export function injectJsonLd(schema, id = null) {
  if (typeof document === 'undefined') return;
  
  try {
    // Remove existing script with same ID if provided
    if (id) {
      const existing = document.getElementById(id);
      if (existing) existing.remove();
    }
    
    const script = document.createElement('script');
    script.type = 'application/ld+json';
    script.textContent = JSON.stringify(schema, null, 2);
    if (id) script.id = id;
    
    document.head.appendChild(script);
  } catch (error) {
    console.error('Error injecting JSON-LD:', error);
  }
}

/**
 * Remove JSON-LD script by ID
 * @param {string} id - Script ID to remove
 */
export function removeJsonLd(id) {
  if (typeof document === 'undefined') return;
  
  try {
    const script = document.getElementById(id);
    if (script) script.remove();
  } catch (error) {
    console.error('Error removing JSON-LD:', error);
  }
}
