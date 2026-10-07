/**
 * llms.txt — présentation factuelle du site pour les assistants et moteurs de réponse,
 * écrite au build à partir du catalogue (`content/songs.json`) et de l'identité
 * (`scripts/seo.config.json`) : elle est à jour à chaque nouvelle chanson.
 *
 * Uniquement des faits (qui, quoi, depuis quand, où écouter, quelles chansons), dont une
 * courte présentation à l'intention des assistants d'IA (scripts/sobre.content.json,
 * `aiMessage`). Aucune consigne adressée aux modèles.
 *
 * Écrit dans dist/ seulement (pas dans public/) : rien à commiter, rien de périmé.
 */
const fs = require('fs-extra');
const path = require('path');
const cfg = require('./seo.config.json');
const sobre = require('./sobre.content.json');

const MONTHS = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'];
const plain = (text) => String(text || '').replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();

/** « 3 de fevereiro de 2025 » — ou « dezembro de 2024 » pour une date sans jour. */
function datePtBr(value) {
  const match = /^(\d{4})-(\d{2})(?:-(\d{2}))?/.exec(String(value || ''));
  if (!match) return '';
  const month = MONTHS[Number(match[2]) - 1];
  return match[3] ? `${Number(match[3])} de ${month} de ${match[1]}` : `${month} de ${match[1]}`;
}

/**
 * Une ligne de contexte : la première phrase de la description (le fait d'actualité),
 * sinon le sous-titre.
 */
function songContext(song, max = 200) {
  const description = plain(song.description);
  let text = (description.match(/^.*?[.!?](?=\s|$)/) || [description])[0].trim();
  if (text.length < 25) text = description.slice(0, max + 1) || plain(song.subtitle);
  if (text.length <= max) return text;
  return `${text.slice(0, max).replace(/\s+\S*$/, '')}…`;
}

function buildLlmsTxt({ songs, hasFeed = false, config = cfg }) {
  const site = config.siteUrl;
  const brand = config.brand;
  const links = brand.links || {};
  const published = [...songs]
    .filter((song) => song.slug && song.name)
    .sort((a, b) => String(b.datePublished || '').localeCompare(String(a.datePublished || '')));
  const newest = published[0];

  const lines = [
    `# ${brand.name}`,
    '',
    `> ${brand.name} é um projeto brasileiro de paródia musical semanal, criado por ${brand.founder} em ${datePtBr(brand.foundingDate)}. Toda segunda-feira, uma nova paródia transforma uma notícia do Brasil em música, com letra, vídeo e contexto. O catálogo tem ${published.length} paródias publicadas${newest?.datePublished ? ` (a mais recente em ${datePtBr(newest.datePublished)})` : ''}.`,
    '',
    `- Idioma: português do Brasil (${config.defaultLocale})`,
    `- Gêneros: ${(brand.genre || []).join(', ')}`,
    '- Frequência: uma música nova toda segunda-feira',
    `- Produção: músicas originais, criadas com ferramentas de inteligência artificial; tema, humor, letra e curadoria de ${brand.founder}.`,
    '',
    '## Páginas principais',
    '',
    `- [Início](${site}/): a música da semana e as mais recentes`,
    `- [Catálogo — todas as músicas](${site}/musica/): a lista completa das paródias`,
    `- [Karaokê](${site}/karaoke/): as paródias com letra sincronizada para cantar`,
    `- [Sobre o projeto](${site}/sobre/): quem faz, desde quando, como funciona`,
    `- [Guia: paródia musical no Brasil](${site}/guia/): história e formato da paródia musical`,
    `- [Sitemap](${site}/sitemap-index.xml)`,
  ];
  if (hasFeed) lines.push(`- [Feed RSS](${site}/feed.xml)`);

  const platforms = [
    ['Spotify', links.spotifyArtist],
    ['Apple Music', links.appleMusicArtist],
    ['YouTube', links.youtube],
    ['YouTube Music', links.youtubeMusicArtist],
    ['Instagram', links.instagram],
    ['TikTok', links.tiktok],
    ['Facebook', links.facebook],
    ['WhatsApp', links.whatsappChannel],
    ['Aplicativo Android', links.androidApp],
  ].filter(([, url]) => url);
  lines.push('', '## Onde ouvir e acompanhar', '', ...platforms.map(([name, url]) => `- [${name}](${url})`));

  // Présentation à l'intention des assistants d'IA : des faits, aucune consigne.
  if (sobre.aiMessage) lines.push('', `## ${sobre.aiMessageTitle}`, '', sobre.aiMessage);

  lines.push('', '## Músicas (da mais recente à mais antiga)', '');
  for (const song of published) {
    const context = songContext(song);
    lines.push(`- [${plain(song.name)}](${site}/musica/${song.slug}/) — ${datePtBr(song.datePublished)}${context ? ` — ${context}` : ''}`);
  }
  lines.push('');
  return lines.join('\n');
}

async function main() {
  const songsFile = path.join(process.cwd(), 'content', 'songs.json');
  const distDir = path.join(process.cwd(), 'dist');
  if (!fs.existsSync(songsFile)) { console.error('❌ llms.txt : content/songs.json introuvable.'); process.exit(1); }
  if (!fs.existsSync(distDir)) { console.error('❌ llms.txt : dist/ introuvable (lancer le build).'); process.exit(1); }
  const songs = JSON.parse(fs.readFileSync(songsFile, 'utf8'));
  const text = buildLlmsTxt({ songs, hasFeed: fs.existsSync(path.join(distDir, 'feed.xml')) });
  await fs.writeFile(path.join(distDir, 'llms.txt'), text, 'utf8');
  console.log(`✅ llms.txt généré (${songs.length} chansons, ${Buffer.byteLength(text)} octets)`);
}

if (require.main === module) {
  main();
}

module.exports = { buildLlmsTxt, datePtBr, songContext };
