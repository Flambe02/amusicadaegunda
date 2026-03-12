const fs = require('fs-extra');
const https = require('https');
const path = require('path');
const sharp = require('sharp');
const { extractYouTubeId } = require('./seo-templates.cjs');

const SONGS_PATH = path.resolve('content', 'songs.json');
const OUTPUT_IMAGE_PATH = path.resolve('public', 'images', 'current-song-thumb.webp');
const GENERATED_MODULE_PATH = path.resolve('src', 'generated', 'currentSongArtwork.js');
const PUBLIC_PATH = '/images/current-song-thumb.webp';

function getLatestSong(songs) {
  return [...songs].sort(
    (left, right) => new Date(right.datePublished || 0) - new Date(left.datePublished || 0)
  )[0] || null;
}

function fetchBuffer(url) {
  return new Promise((resolve, reject) => {
    https
      .get(url, (response) => {
        if (response.statusCode !== 200) {
          response.resume();
          reject(new Error(`HTTP ${response.statusCode} for ${url}`));
          return;
        }

        const chunks = [];
        response.on('data', (chunk) => chunks.push(chunk));
        response.on('end', () => resolve(Buffer.concat(chunks)));
      })
      .on('error', reject);
  });
}

async function fetchBestThumbnail(videoId) {
  const qualities = ['maxresdefault', 'sddefault', 'hqdefault'];

  for (const quality of qualities) {
    const url = `https://img.youtube.com/vi/${videoId}/${quality}.jpg`;
    try {
      const buffer = await fetchBuffer(url);
      const metadata = await sharp(buffer).metadata();

      if (metadata.width && metadata.height) {
        return { buffer, quality };
      }
    } catch {
      // Try the next known thumbnail quality.
    }
  }

  return null;
}

function writeGeneratedModule(payload) {
  fs.ensureDirSync(path.dirname(GENERATED_MODULE_PATH));
  fs.writeFileSync(
    GENERATED_MODULE_PATH,
    `export const CURRENT_SONG_ARTWORK = ${JSON.stringify(payload, null, 2)};\n`,
    'utf8'
  );
}

async function writeEmptyModule() {
  writeGeneratedModule({
    slug: null,
    title: null,
    path: null,
    width: null,
    height: null,
    quality: null,
  });
}

async function main() {
  if (!fs.existsSync(SONGS_PATH)) {
    await writeEmptyModule();
    console.log('Current song artwork skipped: songs.json not found.');
    return;
  }

  const songs = JSON.parse(fs.readFileSync(SONGS_PATH, 'utf8'));
  const latestSong = getLatestSong(Array.isArray(songs) ? songs : []);
  const videoId = extractYouTubeId(latestSong?.youtube_music_url || latestSong?.youtube_url);

  if (!latestSong || !videoId) {
    await writeEmptyModule();
    console.log('Current song artwork skipped: no latest song or no YouTube video ID.');
    return;
  }

  const thumbnail = await fetchBestThumbnail(videoId);

  if (!thumbnail) {
    await writeEmptyModule();
    console.log(`Current song artwork skipped: no downloadable thumbnail for ${latestSong.slug}.`);
    return;
  }

  await fs.ensureDir(path.dirname(OUTPUT_IMAGE_PATH));
  const transformed = sharp(thumbnail.buffer).rotate();
  const metadata = await transformed.metadata();

  await transformed.webp({ quality: 76 }).toFile(OUTPUT_IMAGE_PATH);

  writeGeneratedModule({
    slug: latestSong.slug || null,
    title: latestSong.name || latestSong.title || null,
    path: PUBLIC_PATH,
    width: metadata.width || null,
    height: metadata.height || null,
    quality: thumbnail.quality,
  });

  console.log(
    `Current song artwork generated: ${latestSong.slug} (${thumbnail.quality}, ${metadata.width || '?'}x${metadata.height || '?'})`
  );
}

main().catch(async (error) => {
  await writeEmptyModule();
  console.warn('Current song artwork generation failed:', error.message);
});
