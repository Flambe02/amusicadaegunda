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

function baseHtml({ lang = 'pt-BR', title, desc, url, image, body = '', jsonld = [] }) {
  return `<!doctype html>
<html lang="${lang}">
<head>
<meta charset="utf-8"/>
<meta name="viewport" content="width=device-width,initial-scale=1"/>
<title>${escape(title)}</title>
<meta name="description" content="${escape(desc)}"/>
<link rel="canonical" href="${url}"/>

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

</head>
<body>
<div id="root"></div>
<noscript>Este site requer JavaScript para interação total.</noscript>
<script>
// Redirection vers la SPA SEULEMENT pour les utilisateurs (pas les bots)
(function() {
  const ua = navigator.userAgent.toLowerCase();
  const isBot = /bot|crawler|spider|crawling|google|baidu|bing|msn|duckduckbot|teoma|slurp|yandex/i.test(ua);
  
  if (!isBot) {
    // Utilisateur humain : charger la SPA avec le bon routing
    const currentPath = window.location.pathname;
    window.location.replace('/#' + currentPath);
  }
})();
</script>
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
        "name": songName,
        "item": songUrl
      }
    ]
  };
}

module.exports = { baseHtml, orgJsonLd, websiteJsonLd, playlistJsonLd, musicRecordingJsonLd, breadcrumbsJsonLd };
