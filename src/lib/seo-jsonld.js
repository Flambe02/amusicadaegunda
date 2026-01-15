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
 * @param {string} [params.title] - Song title (optional, will use slug normalization if missing)
 * @param {string} params.slug - Song slug (required)
 * @returns {Object} JSON-LD schema object
 */
export function breadcrumbsJsonLd({ title, slug }) {
  // ✅ Normaliser le slug en nom lisible (ex: "mon-slug-test" → "Mon Slug Test")
  const normalizeSlugToName = (slug) => {
    if (!slug || typeof slug !== 'string') return 'Música';
    return slug
      .split('-')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(' ');
  };

  // ✅ Fallback robuste : title → slug normalisé → "Música" par défaut
  // Garantit que "name" n'est JAMAIS vide ou undefined
  const itemName = title || normalizeSlugToName(slug) || 'Música';

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
        "name": itemName, 
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
 * Generate VideoObject JSON-LD schema for song videos
 * @param {Object} params
 * @param {string} params.title - Video title
 * @param {string} params.description - Video description (obligatoire avec fallback)
 * @param {string} params.thumbnailUrl - Video thumbnail URL
 * @param {string} params.embedUrl - Video embed URL
 * @param {string} params.contentUrl - Direct YouTube URL (required by Google)
 * @param {string} [params.uploadDate] - Upload date (ISO format)
 * @param {number} [params.duration] - Video duration in seconds (optional)
 * @returns {Object} JSON-LD schema object
 */
export function videoObjectJsonLd({ 
  title, 
  description,
  thumbnailUrl, 
  embedUrl,
  contentUrl,
  uploadDate,
  duration
}) {
  return {
    "@context": "https://schema.org",
    "@type": "VideoObject",
    "name": title,
    "description": description || `Assista ao vídeo de ${title} - A Música da Segunda`,
    "thumbnailUrl": thumbnailUrl,
    "embedUrl": embedUrl,
    "contentUrl": contentUrl,
    "uploadDate": uploadDate || new Date().toISOString(),
    "inLanguage": "pt-BR",
    "familyFriendly": true,
    ...(duration ? { "duration": `PT${duration}S` } : {})
  };
}

/**
 * Extract YouTube video ID from various URL formats
 * Supports: watch?v=, shorts/, embed/, youtu.be/, music.youtube.com, and raw IDs
 * @param {string} url - YouTube URL or video ID
 * @returns {string|null} - YouTube video ID or null if not found
 */
export function extractYouTubeId(url) {
  if (!url || typeof url !== 'string') return null;
  
  try {
    // YouTube Shorts
    const shortsMatch = url.match(/(?:youtube\.com\/shorts\/)([A-Za-z0-9_-]{11})/);
    if (shortsMatch) return shortsMatch[1];
    
    // YouTube watch, embed, v/, youtu.be
    const videoMatch = url.match(/(?:youtube\.com\/(?:watch\?v=|embed\/|v\/)|youtu\.be\/)([A-Za-z0-9_-]{11})/);
    if (videoMatch) return videoMatch[1];
    
    // music.youtube.com/watch?v=
    const musicMatch = url.match(/music\.youtube\.com\/watch\?v=([A-Za-z0-9_-]{11})/);
    if (musicMatch) return musicMatch[1];
    
    // Playlist URL with video ID (list=...&v=VIDEO_ID)
    const playlistVideoMatch = url.match(/[?&]v=([A-Za-z0-9_-]{11})/);
    if (playlistVideoMatch) return playlistVideoMatch[1];
    
    // Raw video ID (11 characters)
    if (/^[A-Za-z0-9_-]{11}$/.test(url.trim())) return url.trim();
    
    return null;
  } catch {
    return null;
  }
}

/**
 * Build YouTube URLs from video ID
 * @param {string} videoId - YouTube video ID
 * @returns {Object|null} - Object with contentUrl, embedUrl, thumbnailUrl or null if invalid
 */
export function buildYouTubeUrls(videoId) {
  if (!videoId || typeof videoId !== 'string') return null;
  
  // Validate video ID format (11 characters)
  if (!/^[A-Za-z0-9_-]{11}$/.test(videoId)) return null;
  
  return {
    contentUrl: `https://www.youtube.com/watch?v=${videoId}`, // Direct URL (required by Google)
    embedUrl: `https://www.youtube-nocookie.com/embed/${videoId}`, // Embed URL
    thumbnailUrl: `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg` // HD thumbnail
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
    
    // ✅ Si on injecte un BreadcrumbList, supprimer aussi les breadcrumbs statiques sans ID
    // Cela évite que Google détecte plusieurs breadcrumbs (statique + React)
    if (schema['@type'] === 'BreadcrumbList') {
      const allScripts = document.head.querySelectorAll('script[type="application/ld+json"]');
      allScripts.forEach(script => {
        try {
          const content = script.textContent;
          if (content && content.includes('"@type":"BreadcrumbList"') && !script.id) {
            script.remove();
          }
        } catch (e) {
          // Ignore parsing errors
        }
      });
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
