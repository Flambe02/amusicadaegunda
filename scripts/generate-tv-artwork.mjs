/**
 * Génère les affiches TV 16:9 (hero 1920x1080 + card 640x360) à partir des
 * miniatures verticales (9:16) réelles des clips — jamais l'inverse : on ne
 * déforme ni ne recadre agressivement une vidéo verticale, on compose un fond
 * flouté agrandi + le sujet net superposé.
 *
 * Source canonique des chansons : content/songs.json (mêmes champs que
 * l'export Supabase utilisé pour les stubs SEO — slug, youtube_music_url
 * (Short), youtube_url, image).
 *
 * Usage : node scripts/generate-tv-artwork.mjs [--force]
 *   --force : régénère même les entrées marquées source:"custom" du manifest
 *             (à utiliser uniquement volontairement — écrase l'asset custom).
 */
import fs from 'node:fs/promises';
import fssync from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';
import { extractYouTubeId } from '../src/lib/utils.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const SONGS_JSON = path.join(ROOT, 'content', 'songs.json');
const OUT_DIR = path.join(ROOT, 'public', 'tv-artwork');
const MANIFEST_PATH = path.join(OUT_DIR, 'manifest.json');

const HERO_W = 1920;
const HERO_H = 1080;
const CARD_W = 640;
const CARD_H = 360;

const log = (...a) => console.log('[tv-artwork]', ...a);

async function loadSongs() {
  const raw = await fs.readFile(SONGS_JSON, 'utf8');
  const data = JSON.parse(raw);
  return Array.isArray(data) ? data : [];
}

async function loadManifest() {
  try {
    return JSON.parse(await fs.readFile(MANIFEST_PATH, 'utf8'));
  } catch {
    return {};
  }
}

function ytThumbUrl(url, quality = 'maxresdefault') {
  const id = extractYouTubeId(url);
  return id ? `https://img.youtube.com/vi/${id}/${quality}.jpg` : null;
}

async function fetchBuffer(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const buf = Buffer.from(await res.arrayBuffer());
  // YouTube renvoie une image "no thumbnail" grise (120x90) quand maxresdefault
  // n'existe pas pour cette vidéo → poids ~1-2 Ko, on la rejette et on retente
  // en qualité inférieure côté appelant.
  if (buf.length < 2000) throw new Error('miniature indisponible (placeholder)');
  return buf;
}

/** YouTube pillarboxe ses miniatures classiques (hqdefault/mqdefault/sddefault)
 * pour les Shorts verticaux : canvas ~4:3 avec le sujet vertical net centré +
 * un remplissage flouté agrandi sur les côtés — remplissage qui contient déjà
 * une copie DÉFORMÉE ET COUPÉE du texte du sujet. Si on compose notre propre
 * flou par-dessus cette image telle quelle (composeHero/composeCard), ce texte
 * coupé de YouTube se retrouve visible DANS la carte finale (cf. bug « Julho
 * 2026 » : « ndependência »/« cia » tronqués). maxresdefault, quand il existe
 * pour un Short, est en revanche parfois déjà la vraie image verticale (sans
 * pillarbox) — d'où le test sur l'aspect réellement reçu, pas sur l'URL seule.
 */
async function stripShortsPillarbox(buf) {
  const meta = await sharp(buf).metadata();
  if (!meta.width || !meta.height || meta.height > meta.width) return buf; // déjà vertical : rien à recadrer
  const cropW = Math.round(meta.height * 9 / 16);
  const left = Math.round((meta.width - cropW) / 2);
  if (cropW <= 0 || cropW > meta.width || left < 0) return buf;
  return sharp(buf).extract({ left, top: 0, width: cropW, height: meta.height }).toBuffer();
}

/** Ordre des sources visuelles : miniature du Short (youtube_music_url) → miniature
 * de youtube_url → image locale déjà associée (song.image) → aucune. */
async function resolveSourceBuffer(song) {
  const candidates = [
    { url: ytThumbUrl(song.youtube_music_url, 'maxresdefault'), isShorts: true },
    { url: ytThumbUrl(song.youtube_music_url, 'hqdefault'), isShorts: true },
    { url: ytThumbUrl(song.youtube_url, 'maxresdefault'), isShorts: false },
    { url: ytThumbUrl(song.youtube_url, 'hqdefault'), isShorts: false },
  ].filter((c) => c.url);

  for (const { url, isShorts } of candidates) {
    try {
      const buf = await fetchBuffer(url);
      return isShorts ? await stripShortsPillarbox(buf) : buf;
    } catch (e) { log(`  ⚠ miniature indisponible (${url}): ${e.message}`); }
  }

  if (song.image && !/^https?:\/\//.test(song.image)) {
    const local = path.join(ROOT, 'public', song.image.replace(/^\//, ''));
    if (fssync.existsSync(local)) return fs.readFile(local);
  }

  return null;
}

function leftGradientSvg(w, h) {
  return Buffer.from(`<svg width="${w}" height="${h}" xmlns="http://www.w3.org/2000/svg">
    <defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0%" stop-color="black" stop-opacity="0.92"/>
      <stop offset="52%" stop-color="black" stop-opacity="0.4"/>
      <stop offset="100%" stop-color="black" stop-opacity="0"/>
    </linearGradient></defs>
    <rect width="100%" height="100%" fill="url(#g)"/>
  </svg>`);
}

function bottomGradientSvg(w, h, stop = '68%') {
  return Buffer.from(`<svg width="${w}" height="${h}" xmlns="http://www.w3.org/2000/svg">
    <defs><linearGradient id="b" x1="0" y1="0" x2="0" y2="1">
      <stop offset="${stop}" stop-color="black" stop-opacity="0"/>
      <stop offset="100%" stop-color="black" stop-opacity="0.6"/>
    </linearGradient></defs>
    <rect width="100%" height="100%" fill="url(#b)"/>
  </svg>`);
}

/** Canvas 1920x1080 : fond flouté agrandi (assombri) + sujet vertical net à droite. */
async function composeHero(sourceBuf) {
  const bg = await sharp(sourceBuf)
    .resize(HERO_W, HERO_H, { fit: 'cover' })
    .modulate({ saturation: 1.18 })
    .blur(46)
    .linear(0.55, -15)
    .toBuffer();

  const fg = await sharp(sourceBuf).resize({ height: Math.round(HERO_H * 0.94), fit: 'inside' }).toBuffer();
  const fgMeta = await sharp(fg).metadata();
  const left = Math.round(HERO_W * 0.7 - fgMeta.width / 2);
  const top = Math.round((HERO_H - fgMeta.height) / 2);

  return sharp(bg)
    .composite([
      { input: fg, left, top },
      { input: leftGradientSvg(HERO_W, HERO_H), left: 0, top: 0 },
      { input: bottomGradientSvg(HERO_W, HERO_H, '72%'), left: 0, top: 0 },
    ])
    .webp({ quality: 82 })
    .toBuffer();
}

/** Canvas 640x360 : même logique de composition, plus compacte. */
async function composeCard(sourceBuf) {
  const bg = await sharp(sourceBuf)
    .resize(CARD_W, CARD_H, { fit: 'cover' })
    .modulate({ saturation: 1.1 })
    .blur(20)
    .linear(0.6, -12)
    .toBuffer();

  const fg = await sharp(sourceBuf).resize({ height: Math.round(CARD_H * 0.98), fit: 'inside' }).toBuffer();
  const fgMeta = await sharp(fg).metadata();
  const left = Math.round(CARD_W * 0.64 - fgMeta.width / 2);
  const top = Math.round((CARD_H - fgMeta.height) / 2);

  return sharp(bg)
    .composite([
      { input: fg, left, top },
      { input: bottomGradientSvg(CARD_W, CARD_H, '58%'), left: 0, top: 0 },
    ])
    .webp({ quality: 80 })
    .toBuffer();
}

async function main() {
  const force = process.argv.includes('--force');
  const slugArg = process.argv.find((a) => a.startsWith('--slug='));
  const onlySlug = slugArg ? slugArg.slice('--slug='.length) : null;
  const allSongs = await loadSongs();
  const songs = onlySlug ? allSongs.filter((s) => s.slug === onlySlug) : allSongs;
  const manifest = await loadManifest();
  await fs.mkdir(OUT_DIR, { recursive: true });

  let heroCount = 0;
  let cardCount = 0;
  const failed = [];
  const skippedCustom = [];

  for (const song of songs) {
    const slug = song.slug;
    if (!slug) continue;

    const existing = manifest[slug];
    if (existing?.source === 'custom' && !force) {
      skippedCustom.push(slug);
      log(`⏭  ${slug}: asset custom conservé (source="custom", non écrasé)`);
      continue;
    }

    try {
      const sourceBuf = await resolveSourceBuffer(song);
      if (!sourceBuf) {
        failed.push({ slug, reason: 'aucune source visuelle (ni miniature YouTube, ni image locale)' });
        continue;
      }

      const dir = path.join(OUT_DIR, slug);
      await fs.mkdir(dir, { recursive: true });
      const [heroBuf, cardBuf] = await Promise.all([composeHero(sourceBuf), composeCard(sourceBuf)]);
      await fs.writeFile(path.join(dir, 'hero.webp'), heroBuf);
      await fs.writeFile(path.join(dir, 'card.webp'), cardBuf);
      heroCount += 1;
      cardCount += 1;

      manifest[slug] = {
        hero: `/tv-artwork/${slug}/hero.webp`,
        card: `/tv-artwork/${slug}/card.webp`,
        source: 'generated',
      };
      log(`✔ ${slug}`);
    } catch (e) {
      failed.push({ slug, reason: e.message });
      log(`✘ ${slug}: ${e.message}`);
    }
  }

  await fs.writeFile(MANIFEST_PATH, JSON.stringify(manifest, null, 2));

  log('');
  log(`Terminé — hero générés: ${heroCount}, cards générées: ${cardCount}`);
  log(`Manifest : ${path.relative(ROOT, MANIFEST_PATH)}`);
  if (skippedCustom.length) log(`Ignorés (custom) : ${skippedCustom.join(', ')}`);
  if (failed.length) {
    log(`Échecs (${failed.length}) :`);
    failed.forEach((f) => log(`  - ${f.slug}: ${f.reason}`));
  }
}

main().catch((e) => { console.error('[tv-artwork] Erreur fatale:', e); process.exitCode = 1; });
