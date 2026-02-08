const escape = (s = '') => {
  if (!s) return '';
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
};

const json = (obj) => JSON.stringify(obj, null, 2);

function baseHtml({ lang = 'pt-BR', title, desc, url, image, body = '', jsonld = [], scripts = { js: '', css: '', pwa: '' } }) {
  return `<!doctype html>
<html lang="${lang}">
<head>
<meta charset="utf-8"/>
<meta name="viewport" content="width=device-width,initial-scale=1"/>
<title>${escape(title)}</title>
<meta name="description" content="${escape(desc)}"/>
<link rel="canonical" href="${url}"/>
<meta name="robots" content="index, follow, max-video-preview:0" />

<!-- Open Graph -->
<meta property="og:title" content="${escape(title)}"/>
<meta property="og:description" content="${escape(desc)}"/>
<meta property="og:type" content="website"/>
<meta property="og:url" content="${url}"/>
${image ? `<meta property="og:image" content="${image}"/>` : ''}

<!-- Twitter -->
<meta name="twitter:card" content="summary_large_image"/>
<meta name="twitter:title" content="${escape(title)}"/>
<meta name="twitter:description" content="${escape(desc)}"/>
${image ? `<meta name="twitter:image" content="${image}"/>` : ''}

${jsonld.map(obj => `<script type="application/ld+json">\n${json(obj)}\n</script>`).join('\n')}

${scripts.css ? scripts.css : ''}
${scripts.js ? scripts.js : ''}
</head>
<body>
<div id="root">${body ? body : ''}</div>
<noscript>Este site requer JavaScript para interação total.</noscript>
${scripts.pwa ? scripts.pwa : ''}
</body>
</html>`;
}

// JSON-LD factories
function orgJsonLd({ name, url, logo }) {
  return { "@context": "https://schema.org", "@type": "Organization", "name": name, "url": url, "logo": logo };
}

function websiteJsonLd({ url, search }) {
  const obj = { "@context": "https://schema.org", "@type": "WebSite", "url": url, "name": "A Música da Segunda" };
  if (search?.enabled) {
    obj.potentialAction = {
      "@type": "SearchAction",
      "target": `${url}${search.target}?${search.param}={search_term_string}`,
      "query-input": "required name=search_term_string"
    };
  }
  return obj;
}

function playlistJsonLd({ name, url, image, tracks = [] }) {
  const schema = {
    "@context": "https://schema.org",
    "@type": "MusicPlaylist",
    "name": name,
    "url": url,
    "description": "Playlist completa com todas as paródias musicais inteligentes sobre as notícias do Brasil.",
    "author": {
      "@type": "MusicGroup",
      "name": "A Música da Segunda",
      "url": "https://www.amusicadasegunda.com"
    },
    "genre": ["Comedy", "Music", "Música Brasileira", "Paródia"],
    "inLanguage": "pt-BR",
    "numTracks": tracks.length
  };
  
  if (image) schema.image = image;
  
  if (tracks.length > 0) {
    schema.track = tracks.map(track => ({
      "@type": "MusicRecording",
      "name": track.name,
      "url": track.url,
      "byArtist": {
        "@type": "MusicGroup",
        "name": track.byArtist || "A Música da Segunda"
      }
    }));
  }
  
  return schema;
}

function musicRecordingJsonLd({ name, url, datePublished, audioUrl, image, duration, inLanguage, byArtist, description }) {
  const obj = {
    "@context": "https://schema.org",
    "@type": "MusicRecording",
    "name": name,
    "url": url,
    "genre": ["Comedy", "Music", "Música Brasileira", "Paródia"],
    "inLanguage": inLanguage || "pt-BR"
  };
  
  if (datePublished) obj.datePublished = datePublished;
  if (description) obj.description = description;
  if (image) obj.image = image;
  if (duration) obj.duration = duration;
  
  if (byArtist) {
    obj.byArtist = { "@type": "MusicGroup", "name": byArtist.name, "url": byArtist.url };
  }
  
  // ✅ potentialAction avec ListenAction pour Spotify/YouTube
  if (audioUrl) {
    obj.audio = audioUrl;
    obj.potentialAction = {
      "@type": "ListenAction",
      "target": {
        "@type": "EntryPoint",
        "urlTemplate": audioUrl,
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
    };
  }
  
  return obj;
}

function breadcrumbsJsonLd({ songName, songUrl }) {
  // ✅ Normaliser le slug en nom lisible si songName est manquant
  // Extrait le slug depuis l'URL si nécessaire
  const normalizeSlugToName = (url) => {
    if (!url) return 'Música';
    const slugMatch = url.match(/\/musica\/([^\/]+)/);
    if (slugMatch) {
      const slug = slugMatch[1].replace(/\/$/, ''); // Enlever trailing slash
      return slug
        .split('-')
        .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
        .join(' ');
    }
    return 'Música';
  };

  // ✅ Fallback robuste : songName → slug normalisé depuis URL → "Música" par défaut
  // Garantit que "name" n'est JAMAIS vide ou undefined
  const itemName = songName || normalizeSlugToName(songUrl) || 'Música';

  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    "itemListElement": [
      {
        "@type": "ListItem",
        "position": 1,
        "name": "Início",
        "item": "https://www.amusicadasegunda.com/"
      },
      {
        "@type": "ListItem",
        "position": 2,
        "name": "Músicas",
        "item": "https://www.amusicadasegunda.com/musica/"
      },
      {
        "@type": "ListItem",
        "position": 3,
        "name": itemName,
        "item": songUrl
      }
    ]
  };
}

/**
 * Extract YouTube video ID from various URL formats
 * @param {string} url - YouTube URL or video ID
 * @returns {string|null} - YouTube video ID or null if not found
 */
function extractYouTubeId(url) {
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
function buildYouTubeUrls(videoId) {
  if (!videoId || typeof videoId !== 'string') return null;
  
  // Validate video ID format (11 characters)
  if (!/^[A-Za-z0-9_-]{11}$/.test(videoId)) return null;
  
  return {
    contentUrl: `https://www.youtube.com/watch?v=${videoId}`, // Direct URL (required by Google)
    embedUrl: `https://www.youtube-nocookie.com/embed/${videoId}`, // Embed URL
    thumbnailUrl: `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg` // HD thumbnail
  };
}

// ❌ videoObjectJsonLd SUPPRIMÉ — erreur GSC "Video isn't on a watch page"

module.exports = { baseHtml, orgJsonLd, websiteJsonLd, playlistJsonLd, musicRecordingJsonLd, breadcrumbsJsonLd, extractYouTubeId, buildYouTubeUrls };
