const fs = require('fs-extra');
const path = require('path');
const sharp = require('sharp');

const IMAGES_DIR = path.join(__dirname, '../public/images');

const BRAND_VARIANTS = [
  {
    source: '2026 logo.png',
    outputs: [
      { file: '2026-logo-192.webp', width: 192, height: 192, quality: 82 },
      { file: '2026-logo-384.webp', width: 384, height: 384, quality: 84 },
    ],
  },
  {
    source: 'Caipivara_square.png',
    outputs: [
      { file: 'caipivara-square-96.webp', width: 96, height: 96, quality: 80 },
      { file: 'caipivara-square-192.webp', width: 192, height: 192, quality: 82 },
      { file: 'caipivara-square-384.webp', width: 384, height: 384, quality: 84 },
    ],
  },
];

async function generateVariant(inputPath, outputPath, width, height, quality) {
  await sharp(inputPath)
    .resize(width, height, {
      fit: 'cover',
      position: 'centre',
      withoutEnlargement: true,
    })
    .webp({ quality })
    .toFile(outputPath);
}

async function main() {
  console.log('Generation des variantes de marque...');

  for (const variant of BRAND_VARIANTS) {
    const inputPath = path.join(IMAGES_DIR, variant.source);
    if (!(await fs.pathExists(inputPath))) {
      console.warn(`source absente: ${variant.source}`);
      continue;
    }

    for (const output of variant.outputs) {
      const outputPath = path.join(IMAGES_DIR, output.file);
      await generateVariant(inputPath, outputPath, output.width, output.height, output.quality);
      console.log(`variant: ${variant.source} -> ${output.file}`);
    }
  }
}

main().catch((error) => {
  console.error('Erreur:', error);
  process.exitCode = 1;
});
