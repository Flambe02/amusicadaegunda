/**
 * « Compartilhar como imagem » (panneau Letra) : 1 à 3 phrases consécutives de la
 * chanson, dessinées sur l'illustration verticale du Short, au format Story
 * (1080 × 1920), prêtes pour les Statuts WhatsApp et les Stories. Tout est fait dans
 * le téléphone (canvas) : aucun serveur.
 */

export const VERSE_IMAGE_WIDTH = 1080;
export const VERSE_IMAGE_HEIGHT = 1920;
export const MAX_VERSE_LINES = 3;
export const SITE_HOST = 'amusicadasegunda.com';
const YELLOW = '#FDE047';
const LOGO_URL = '/images/caipivara-3d-head-256.webp';
// YouTube renvoie une vignette grise de 120 × 90 quand une qualité n'existe pas.
const PLACEHOLDER_MAX_WIDTH = 200;

/**
 * Sélection après un tap sur la phrase `index` ; `selection` = { start, end } ou null.
 * - rien de sélectionné, ou phrase éloignée → cette phrase seule ;
 * - phrase voisine (juste avant ou après) et moins de 3 → la sélection s'étend ;
 * - phrase déjà sélectionnée à une extrémité → elle est retirée (null s'il n'en reste
 *   aucune) ; au milieu → cette phrase seule.
 */
export function nextVerseSelection(selection, index) {
  if (!selection) return { start: index, end: index };
  const { start, end } = selection;
  const size = end - start + 1;
  if (index >= start && index <= end) {
    if (size === 1) return null;
    if (index === start) return { start: start + 1, end };
    if (index === end) return { start, end: end - 1 };
    return { start: index, end: index };
  }
  if (index === start - 1 && size < MAX_VERSE_LINES) return { start: index, end };
  if (index === end + 1 && size < MAX_VERSE_LINES) return { start, end: index };
  return { start: index, end: index };
}

/** Coupe `text` en lignes de largeur ≤ `maxWidth` (mesure fournie par l'appelant). */
export function wrapText(text, maxWidth, measure) {
  const words = String(text || '').split(/\s+/).filter(Boolean);
  const lines = [];
  let line = '';
  for (const word of words) {
    const candidate = line ? `${line} ${word}` : word;
    if (!line || measure(candidate) <= maxWidth) {
      line = candidate;
    } else {
      lines.push(line);
      line = word;
    }
  }
  if (line) lines.push(line);
  return lines;
}

/** Lien de la page de la chanson, envoyé avec l'image. */
export function songPageUrl(slug) {
  return slug ? `https://www.${SITE_HOST}/musica/${slug}/` : `https://www.${SITE_HOST}/`;
}

function loadImage(src) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.decoding = 'async';
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error(`image-load-failed:${src}`));
    img.src = src;
  });
}

/** Première image utilisable de la liste (les vignettes grises de YouTube sont sautées). */
async function loadFirstImage(candidates) {
  for (const src of candidates) {
    try {
      const img = await loadImage(src);
      if (img.naturalWidth > PLACEHOLDER_MAX_WIDTH) return img;
    } catch {
      /* image suivante */
    }
  }
  return null;
}

function drawCover(ctx, img, width, height) {
  const scale = Math.max(width / img.naturalWidth, height / img.naturalHeight);
  const w = img.naturalWidth * scale;
  const h = img.naturalHeight * scale;
  ctx.drawImage(img, (width - w) / 2, (height - h) / 2, w, h);
}

function fontFamily() {
  try {
    return getComputedStyle(document.body).fontFamily || 'system-ui, sans-serif';
  } catch {
    return 'system-ui, sans-serif';
  }
}

/**
 * Dessine l'image et la rend en JPEG (plus léger que PNG pour une photo, accepté
 * partout). `backgrounds` : URLs à essayer dans l'ordre (getPosterCandidates).
 */
export async function renderVerseImage({ verses, title, backgrounds = [] }) {
  const W = VERSE_IMAGE_WIDTH;
  const H = VERSE_IMAGE_HEIGHT;
  const canvas = document.createElement('canvas');
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext('2d');
  const family = fontFamily();
  try {
    await document.fonts?.ready;
  } catch {
    /* polices système */
  }

  const [background, logo] = await Promise.all([loadFirstImage(backgrounds), loadFirstImage([LOGO_URL])]);

  ctx.fillStyle = '#0a0a0a';
  ctx.fillRect(0, 0, W, H);
  if (background) drawCover(ctx, background, W, H);

  // Dégradé du bas, presque opaque dans le dernier tiers : les illustrations des
  // Shorts portent leurs propres sous-titres incrustés, qui ne doivent pas se mêler
  // à la phrase choisie.
  const shade = ctx.createLinearGradient(0, H * 0.36, 0, H);
  shade.addColorStop(0, 'rgba(0,0,0,0)');
  shade.addColorStop(0.3, 'rgba(0,0,0,0.82)');
  shade.addColorStop(0.5, 'rgba(0,0,0,1)');
  shade.addColorStop(1, 'rgba(0,0,0,1)');
  ctx.fillStyle = shade;
  ctx.fillRect(0, 0, W, H);

  const marginX = 84;
  const maxWidth = W - marginX * 2;
  const clean = verses.map((v) => v.trim()).filter(Boolean);

  // Chaque phrase commence une nouvelle ligne ; guillemets autour de l'ensemble.
  // Taille : la plus grande qui tient en 7 lignes. `lines` = [{ text, verse }].
  let size = 88;
  let lines = [];
  for (; size >= 48; size -= 4) {
    ctx.font = `900 ${size}px ${family}`;
    const measure = (t) => ctx.measureText(t).width;
    lines = clean.flatMap((verse, v) => {
      const quoted = `${v === 0 ? '« ' : ''}${verse}${v === clean.length - 1 ? ' »' : ''}`;
      return wrapText(quoted, maxWidth, measure).map((text) => ({ text, verse: v }));
    });
    if (lines.length <= 7) break;
  }
  const lineHeight = Math.round(size * 1.18);
  const verseGap = Math.round(size * 0.35); // un peu d'air entre deux phrases

  // Pied : logo + adresse, puis titre au-dessus, puis la phrase au-dessus du titre.
  const footerY = H - 150;
  const titleY = footerY - 130;
  const verseBottom = titleY - 110;
  const gaps = lines.length ? lines[lines.length - 1].verse : 0;
  const verseTop = verseBottom - lineHeight * (lines.length - 1) - verseGap * gaps;

  // Barre jaune à gauche de la phrase (comme la ligne de karaokê du site).
  ctx.fillStyle = YELLOW;
  ctx.fillRect(marginX - 36, verseTop - size * 0.85, 10, verseBottom - verseTop + size * 1.05);

  ctx.textBaseline = 'alphabetic';
  ctx.shadowColor = 'rgba(0,0,0,0.6)';
  ctx.shadowBlur = 18;
  ctx.font = `900 ${size}px ${family}`;
  // Phrases en alternance blanc / jaune (une seule phrase : blanc).
  lines.forEach((line, i) => {
    ctx.fillStyle = line.verse % 2 === 1 ? YELLOW : '#FFFFFF';
    ctx.fillText(line.text, marginX, verseTop + i * lineHeight + verseGap * line.verse);
  });

  ctx.font = `800 52px ${family}`;
  ctx.fillStyle = YELLOW;
  const titleLine = wrapText(title || '', maxWidth, (t) => ctx.measureText(t).width)[0] || '';
  ctx.fillText(titleLine, marginX, titleY);

  ctx.shadowBlur = 0;
  const logoSize = 96;
  let textX = marginX;
  if (logo) {
    ctx.save();
    ctx.beginPath();
    ctx.arc(marginX + logoSize / 2, footerY - logoSize / 2 + 14, logoSize / 2, 0, Math.PI * 2);
    ctx.clip();
    ctx.drawImage(logo, marginX, footerY - logoSize + 14, logoSize, logoSize);
    ctx.restore();
    textX = marginX + logoSize + 28;
  }
  ctx.font = `700 42px ${family}`;
  ctx.fillStyle = 'rgba(255,255,255,0.92)';
  ctx.fillText(SITE_HOST, textX, footerY);

  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error('verse-image-empty'))), 'image/jpeg', 0.9);
  });
}

/**
 * Partage le fichier par le menu du téléphone ; sinon le télécharge.
 * Renvoie 'shared', 'downloaded' ou 'cancelled'.
 */
export async function shareVerseImage(blob, { fileName, text }) {
  const file = new File([blob], fileName, { type: blob.type || 'image/jpeg' });
  if (typeof navigator !== 'undefined' && navigator.canShare?.({ files: [file] })) {
    try {
      await navigator.share({ files: [file], text });
      return 'shared';
    } catch (error) {
      if (error?.name === 'AbortError') return 'cancelled';
      // Partage refusé par le navigateur : on retombe sur le téléchargement.
    }
  }
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 10_000);
  return 'downloaded';
}
