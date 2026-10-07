#!/usr/bin/env node
/**
 * Prépare un clip de mascotte « à la demande » (public/mascot/) à partir d'une source HD
 * (design/mascot/source/, hors git) : recadrage sur la mascotte de référence, 540×960,
 * sans son, plus son poster.
 *
 *   node scripts/encode-mascot-clip.cjs <source.mp4> <nom> --glasses <y> --feet <y> --center <x>
 *   ex. node scripts/encode-mascot-clip.cjs design/mascot/source/caipivara-bets-dance.mp4  *         caipivara-bets-dance --glasses 372 --feet 745 --center 265
 *
 * Recadrage : la mascotte doit avoir la même taille et être posée au même endroit que dans
 * la danse de base (caipivara-dance-poster.webp). Le halo doré du projecteur empêche une
 * mesure automatique fiable ; on relève donc trois repères sur la PREMIÈRE image de la
 * source ramenée à 540×960 (`--frame` l'écrit dans un fichier pour les lire) :
 *   --glasses  y du milieu des lunettes de soleil (le même accessoire sur tous les clips)
 *   --feet     y du bas des pattes
 *   --center   x du milieu des lunettes
 * Le zoom est le rapport lunettes→pattes avec la référence ; les pattes et l'axe sont
 * ensuite posés sur ceux de la référence. `--compare <fichier.png>` écrit les deux posters
 * côte à côte avec les lignes de repère, pour contrôler à l'œil.
 *
 * Nécessite ffmpeg dans le PATH. Sortie : public/mascot/<nom>.mp4 et <nom>-poster.webp.
 */
const { execFileSync } = require('node:child_process');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const sharp = require('sharp');

const OUT_W = 540;
const OUT_H = 960;
const REFERENCE = path.join(__dirname, '..', 'public', 'videos', 'caipivara', 'caipivara-dance-poster.webp');
const OUT_DIR = path.join(__dirname, '..', 'public', 'mascot');

// Repères de la référence (caipivara-dance-poster.webp ramené à 540×960).
const REF = { glasses: 320, feet: 775, center: 278 };

function option(args, name) {
  const index = args.indexOf(name);
  return index === -1 ? undefined : args[index + 1];
}

async function main() {
  const args = process.argv.slice(2);
  const [source, name] = args;
  if (!source || !name) {
    console.error('Usage : node scripts/encode-mascot-clip.cjs <source.mp4> <nom> [--zoom n] [--dx px] [--dy px] [--measure]');
    process.exit(1);
  }
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'mascot-'));
  const firstFrame = path.join(tmp, 'first.png');
  execFileSync('ffmpeg', ['-v', 'error', '-y', '-i', source, '-frames:v', '1', firstFrame]);

  const framePath = option(args, '--frame');
  if (framePath) {
    await sharp(firstFrame).resize(OUT_W, OUT_H, { fit: 'fill' }).toFile(framePath);
    console.log(`première image (540×960) : ${framePath}`);
    return;
  }
  const glasses = Number(option(args, '--glasses'));
  const feet = Number(option(args, '--feet'));
  const center = Number(option(args, '--center'));
  if (![glasses, feet, center].every(Number.isFinite)) throw new Error('Repères manquants : --glasses <y> --feet <y> --center <x> (voir --frame)');
  const zoom = (REF.feet - REF.glasses) / (feet - glasses);
  // Après zoom, les pattes et l'axe de la source tombent sur ceux de la référence.
  const offsetX = Math.round(center * zoom - REF.center);
  const offsetY = Math.round(feet * zoom - REF.feet);
  console.log(`recadrage : zoom ${zoom.toFixed(3)}, fenêtre ${OUT_W}x${OUT_H} en (${offsetX}, ${offsetY}) de l'image zoomée`);

  // Zoom, marge noire (la fenêtre peut dépasser de l'image), puis la fenêtre 540×960.
  const zoomW = Math.round((OUT_W * zoom) / 2) * 2;
  const zoomH = Math.round((OUT_H * zoom) / 2) * 2;
  const filter = `scale=${zoomW}:${zoomH}:flags=lanczos,pad=${zoomW + 2 * OUT_W}:${zoomH + 2 * OUT_H}:${OUT_W}:${OUT_H}:black,crop=${OUT_W}:${OUT_H}:${OUT_W + offsetX}:${OUT_H + offsetY}`;
  fs.mkdirSync(OUT_DIR, { recursive: true });
  const video = path.join(OUT_DIR, `${name}.mp4`);
  const poster = path.join(OUT_DIR, `${name}-poster.webp`);
  execFileSync('ffmpeg', ['-v', 'error', '-y', '-i', source, '-vf', filter, '-an', '-c:v', 'libx264', '-profile:v', 'main',
    '-pix_fmt', 'yuv420p', '-crf', '23', '-preset', 'slow', '-movflags', '+faststart', video], { stdio: 'inherit' });
  const posterFrame = path.join(tmp, 'poster.png');
  execFileSync('ffmpeg', ['-v', 'error', '-y', '-i', video, '-frames:v', '1', posterFrame]);
  await sharp(posterFrame).webp({ quality: 80 }).toFile(poster);

  const compare = option(args, '--compare');
  if (compare) {
    // Référence | résultat, avec les lignes des lunettes et des pattes de la référence.
    const line = (y) => `<rect x="0" y="${y}" width="${OUT_W * 2}" height="2" fill="#00e5ff"/>`;
    const guides = Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${OUT_W * 2}" height="${OUT_H}">${line(REF.glasses)}${line(REF.feet)}</svg>`);
    const left = await sharp(REFERENCE).resize(OUT_W, OUT_H, { fit: 'fill' }).png().toBuffer();
    await sharp({ create: { width: OUT_W * 2, height: OUT_H, channels: 3, background: '#000' } })
      .composite([{ input: left, left: 0, top: 0 }, { input: posterFrame, left: OUT_W, top: 0 }, { input: guides, left: 0, top: 0 }])
      .png().toFile(compare);
    console.log(`comparaison : ${compare}`);
  }
  console.log(`${path.basename(video)} ${fs.statSync(video).size} octets, ${path.basename(poster)} ${fs.statSync(poster).size} octets`);
  fs.rmSync(tmp, { recursive: true, force: true });
}

main().catch((error) => { console.error(error.message); process.exit(1); });
