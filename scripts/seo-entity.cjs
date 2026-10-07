/**
 * Identité de « A Música da Segunda » pour les moteurs de recherche et de réponse.
 *
 * Une seule source : `scripts/seo.config.json` (bloc `brand`). Ce module en tire le
 * JSON-LD de l'entité, lu par les pages statiques (seo-templates.cjs, generate-stubs.cjs),
 * par l'accueil (`index.html`, via le plugin `amds-seo` de vite.config.js) et par
 * `llms.txt` (generate-llms.cjs). Aucun fait n'est écrit ailleurs.
 *
 * `@id` unique : toutes les pages décrivent la MÊME entité, et les chansons y renvoient
 * par `byArtist: { "@id": … }`.
 */
const cfg = require('./seo.config.json');

const SITE_URL = cfg.siteUrl;
const ENTITY_ID = `${SITE_URL}/#organization`;

/** Profils officiels (identité) : la liste `sameAs`, plus la chaîne WhatsApp une fois renseignée. */
function sameAsUrls(brand = cfg.brand) {
  const urls = [...(brand.sameAs || [])];
  const whatsapp = brand.links?.whatsappChannel;
  if (whatsapp) urls.push(whatsapp);
  return [...new Set(urls.filter((url) => typeof url === 'string' && /^https:\/\//.test(url)))];
}

/** JSON-LD de l'entité : un groupe musical, avec son créateur et ses profils officiels. */
function entityJsonLd(brand = cfg.brand) {
  const entity = {
    '@context': 'https://schema.org',
    '@type': 'MusicGroup',
    '@id': ENTITY_ID,
    name: brand.name,
    alternateName: brand.alternateName,
    description: brand.description,
    url: `${SITE_URL}/`,
    logo: { '@type': 'ImageObject', url: `${SITE_URL}${brand.logo}`, width: 341, height: 340 },
    image: `${SITE_URL}${brand.logo}`,
    foundingDate: brand.foundingDate,
    foundingLocation: brand.country ? { '@type': 'Country', name: brand.country } : undefined,
    founder: brand.founder ? { '@type': 'Person', name: brand.founder } : undefined,
    genre: brand.genre,
    // `inLanguage` n'existe que pour les œuvres ; pour une organisation, c'est `knowsLanguage`.
    knowsLanguage: cfg.defaultLocale,
    knowsAbout: brand.knowsAbout,
    sameAs: sameAsUrls(brand),
  };
  for (const key of Object.keys(entity)) {
    const value = entity[key];
    if (value === undefined || value === null || value === '' || (Array.isArray(value) && value.length === 0)) delete entity[key];
  }
  return entity;
}

/** Site web, relié à l'entité qui le publie. */
function websiteEntityJsonLd(brand = cfg.brand) {
  return {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    '@id': `${SITE_URL}/#website`,
    name: brand.name,
    alternateName: (brand.alternateName || [])[0],
    url: `${SITE_URL}/`,
    description: brand.siteDescription,
    inLanguage: cfg.defaultLocale,
    publisher: { '@id': ENTITY_ID },
  };
}

/**
 * Balises de vérification des outils pour webmasters. Vide tant que `verification`
 * ne contient pas de code dans seo.config.json : rien n'est inventé.
 */
function verificationMetaTags(verification = cfg.verification || {}) {
  const tags = [];
  const clean = (value) => String(value).replace(/[^A-Za-z0-9_-]/g, '');
  if (verification.google) tags.push(`<meta name="google-site-verification" content="${clean(verification.google)}" />`);
  if (verification.bing) tags.push(`<meta name="msvalidate.01" content="${clean(verification.bing)}" />`);
  return tags.join('\n');
}

/** Adresse sans paramètre de suivi (`si` de Spotify et YouTube, `utm_*`). */
function cleanPlatformUrl(value) {
  try {
    const url = new URL(String(value).trim());
    if (url.protocol !== 'https:') return null;
    for (const key of [...url.searchParams.keys()]) if (key === 'si' || key.startsWith('utm_')) url.searchParams.delete(key);
    return url.toString();
  } catch { return null; }
}

/** Liens d'UNE chanson sur les plateformes (Spotify, Apple Music, YouTube), sans doublon. */
function songSameAs(song) {
  const apple = /^https:\/\/music\.apple\.com\//.test(song.apple_music_url || '') ? song.apple_music_url : null;
  return [...new Set([song.spotify_url, apple, song.youtube_url, song.youtube_music_url]
    .filter(Boolean).map(cleanPlatformUrl).filter(Boolean))];
}

module.exports = { SITE_URL, ENTITY_ID, entityJsonLd, websiteEntityJsonLd, verificationMetaTags, sameAsUrls, songSameAs, cleanPlatformUrl };
