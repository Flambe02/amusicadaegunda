const escape = (s = '') => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;').replace(/ç/g, 'ç').replace(/ã/g, 'ã').replace(/é/g, 'é').replace(/ê/g, 'ê').replace(/í/g, 'í').replace(/ó/g, 'ó').replace(/ô/g, 'ô').replace(/ú/g, 'ú');
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
<div id="app"></div>
<noscript>Este site requer JavaScript para interação total.</noscript>
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

function playlistJsonLd({ name, url, image }) {
  return { "@context": "https://schema.org", "@type": "MusicPlaylist", "name": name, "url": url, "image": image };
}

function musicRecordingJsonLd({ name, url, datePublished, audioUrl, image, duration, inLanguage, byArtist }) {
  const obj = { "@context": "https://schema.org", "@type": "MusicRecording", "name": name, "url": url };
  if (datePublished) obj.datePublished = datePublished;
  if (audioUrl) obj.audio = audioUrl;
  if (image) obj.image = image;
  if (duration) obj.duration = duration;
  if (inLanguage) obj.inLanguage = inLanguage;
  if (byArtist) obj.byArtist = { "@type": "MusicGroup", "name": byArtist.name, "url": byArtist.url };
  return obj;
}

module.exports = { baseHtml, orgJsonLd, websiteJsonLd, playlistJsonLd, musicRecordingJsonLd };


