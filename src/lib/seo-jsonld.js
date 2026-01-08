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
 * @param {string} [params.description] - Song description
 * @param {string[]} [params.streamingUrls] - Array of URLs for streaming platforms
 * @returns {Object} JSON-LD schema object
 */
export function musicRecordingJsonLd({ 
  title, 
  slug, 
  datePublished, 
  image, 
  byArtist = 'A Música da Segunda',
  description,
  streamingUrls = []
}) {
  const url = `${CANONICAL_HOST}/musica/${slug}`;
  
  const schema = {
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
    "genre": ["Comedy", "Music", "Música Brasileira", "Paródia"],
    ...(image ? { "image": image } : {}),
    ...(description ? { "description": description } : {})
  };

  // Ajoute les liens sameAs s'ils existent
  const validUrls = streamingUrls.filter(u => u && typeof u === 'string');
  if (validUrls.length > 0) {
    schema.sameAs = validUrls;
  }

  // ✅ Ajoute potentialAction avec ListenAction pour chaque plateforme de streaming
  if (validUrls.length > 0) {
    schema.potentialAction = validUrls.map(streamUrl => ({
      "@type": "ListenAction",
      "target": {
        "@type": "EntryPoint",
        "urlTemplate": streamUrl,
        "actionPlatform": [
          "http://schema.org/DesktopWebPlatform",
          "http://schema.org/MobileWebPlatform",
          "http://schema.org/IOSPlatform",
          "http://schema.org/AndroidPlatform"
        ]
      },
      "expectsAcceptanceOf": {
        "@type": "Offer",
        "category": "free",
        "availabilityStarts": datePublished || new Date().toISOString().slice(0, 10)
      }
    }));
  }

  return schema;
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
        "name": "Músicas", 
        "item": `${CANONICAL_HOST}/musica` 
      },
      { 
        "@type": "ListItem", 
        "position": 3, 
        "name": title || slug, 
        "item": `${CANONICAL_HOST}/musica/${slug}` 
      }
    ]
  };
}

/**
 * Generate MusicPlaylist JSON-LD schema for playlist pages
 * @param {Object} params
 * @param {Array} params.tracks - Array of track objects {title, slug, artist, datePublished}
 * @param {string} [params.playlistName] - Name of the playlist
 * @param {string} [params.description] - Playlist description
 * @returns {Object} JSON-LD schema object
 */
export function musicPlaylistJsonLd({ 
  tracks = [],
  playlistName = 'A Música da Segunda - Todas as Músicas',
  description = 'Playlist completa com todas as paródias musicais de A Música da Segunda. Nova música toda segunda-feira.'
}) {
  const url = `${CANONICAL_HOST}/musica`;
  
  return {
    "@context": "https://schema.org",
    "@type": "MusicPlaylist",
    "name": playlistName,
    "description": description,
    "url": url,
    "author": {
      "@type": "MusicGroup",
      "name": "A Música da Segunda",
      "url": CANONICAL_HOST
    },
    "genre": ["Comedy", "Music", "Música Brasileira", "Paródia"],
    "inLanguage": "pt-BR",
    "numTracks": tracks.length,
    "track": tracks.map((track, index) => ({
      "@type": "MusicRecording",
      "position": index + 1,
      "name": track.title,
      "url": `${CANONICAL_HOST}/musica/${track.slug}`,
      "byArtist": {
        "@type": "MusicGroup",
        "name": track.artist || "A Música da Segunda"
      },
      ...(track.datePublished ? { "datePublished": track.datePublished } : {})
    }))
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
