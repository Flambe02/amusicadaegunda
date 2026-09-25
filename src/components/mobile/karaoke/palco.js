/**
 * Karaokê mobile « O Palco » — fonctions pures (positions du carrousel, premier vers,
 * couleur dominante d'une miniature).
 */
import { parseLrc } from '@/lib/lrc';

/**
 * Carte centrale, toujours en 9:16 : 150 × 267 au plus, 120 × 213 au moins. Sa taille
 * suit la hauteur réellement disponible (l'écran Karaokê tient sur une seule page, sans
 * défilement, barres de Safari affichées comprises).
 */
export const CARD_MAX_H = 267; // 150 px de large
export const CARD_MIN_H = 213; // 120 px de large
// Place rendue à la zone du carrousel par chaque palier de resserrement.
export const VERSE_SPACE_PX = 30; // ligne du premier vers + sa marge
export const COMPACT_SPACE_PX = 48; // les deux sur-titres + marges resserrées

/**
 * Palier de mise en page selon la hauteur disponible (l'écran tient toujours sur une
 * page, le micro reste visible) :
 *   'full'    tout est affiché, carte jusqu'à 150 × 267 ;
 *   'noVerse' la ligne du premier vers est masquée d'abord, la carte garde sa taille ;
 *   'compact' écran très bas : la carte est au minimum (120 × 213) et les deux
 *             sur-titres (« O palco é seu », mois) sont masqués, marges resserrées.
 * `areaHeight` = hauteur actuelle de la zone du carrousel, mesurée dans le palier
 * `current` (on en déduit la hauteur qu'elle aurait dans les autres paliers).
 */
export function palcoLayout(areaHeight, current = 'full') {
  const extra = { full: 0, noVerse: VERSE_SPACE_PX, compact: VERSE_SPACE_PX + COMPACT_SPACE_PX }[current] || 0;
  const base = areaHeight - extra; // hauteur de la zone en palier 'full'
  if (base >= CARD_MAX_H) return 'full';
  if (base + VERSE_SPACE_PX >= CARD_MIN_H) return 'noVerse';
  return 'compact';
}
export const SLIDE_MS = 550;
// Seuil du glissement horizontal, et bande du bord gauche laissée au geste retour d'iOS.
export const SWIPE_THRESHOLD_PX = 30;
export const EDGE_GUARD_PX = 24;
// Couleur neutre sombre si la miniature n'est pas lisible (CORS, erreur, image vide).
export const NEUTRAL_TINT = [38, 38, 48];

/**
 * Position d'une carte selon son écart à la carte centrale.
 * Centre : pleine taille et nette. ±1 : décalée, pivotée en profondeur, 55 %.
 * ±2 : 25 %. Au-delà : invisible (et hors de la tabulation).
 * Mouvement réduit : cartes simplement décalées, sans rotation ni profondeur.
 */
export function cardLayout(offset, reduceMotion = false) {
  const distance = Math.abs(offset);
  if (distance > 2) return { visible: false, opacity: 0, transform: 'translate3d(0,0,0)', zIndex: 0 };
  const direction = Math.sign(offset);
  const opacity = distance === 0 ? 1 : distance === 1 ? 0.55 : 0.25;
  // % de la largeur de carte : les voisines débordent nettement sur les côtés.
  const shift = distance === 0 ? 0 : distance === 1 ? 78 : 140;
  const zIndex = 10 - distance;
  if (reduceMotion) {
    return { visible: true, opacity, zIndex, transform: `translate3d(${direction * shift}%, 0, 0)` };
  }
  const rotate = distance === 0 ? 0 : -direction * 38;
  const depth = distance === 0 ? 0 : -140 * distance;
  return {
    visible: true,
    opacity,
    zIndex,
    transform: `translate3d(${direction * shift}%, 0, ${depth}px) rotateY(${rotate}deg)`,
  };
}

/** Premier vers non vide des LRC existantes (lecture seule), ou null. */
export function firstVerse(song) {
  const line = parseLrc(song?.lrc_content).find((entry) => entry.text && entry.text.trim());
  return line ? line.text.trim() : null;
}

/**
 * Couleur moyenne d'une image (RGBA à plat), en ignorant les pixels presque noirs,
 * presque blancs ou transparents (bandes, textes incrustés). null si rien d'exploitable.
 */
export function averageColor(data) {
  let r = 0;
  let g = 0;
  let b = 0;
  let count = 0;
  for (let i = 0; i + 3 < data.length; i += 4) {
    const alpha = data[i + 3];
    const max = Math.max(data[i], data[i + 1], data[i + 2]);
    const min = Math.min(data[i], data[i + 1], data[i + 2]);
    if (alpha < 128 || max < 24 || min > 235) continue;
    r += data[i];
    g += data[i + 1];
    b += data[i + 2];
    count += 1;
  }
  if (!count) return null;
  return [Math.round(r / count), Math.round(g / count), Math.round(b / count)];
}

/**
 * Couleur dominante d'une miniature, calculée dans le navigateur (canvas 24 × 24).
 * YouTube sert ses miniatures avec CORS ; si la lecture des pixels est refusée ou
 * l'image illisible, repli sur NEUTRAL_TINT. Jamais d'exception.
 */
export function sampleTint(url) {
  return new Promise((resolve) => {
    if (!url || typeof Image === 'undefined') {
      resolve(NEUTRAL_TINT);
      return;
    }
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.decoding = 'async';
    img.onload = () => {
      try {
        const size = 24;
        const canvas = document.createElement('canvas');
        canvas.width = size;
        canvas.height = size;
        const context = canvas.getContext('2d', { willReadFrequently: true });
        context.drawImage(img, 0, 0, size, size);
        resolve(averageColor(context.getImageData(0, 0, size, size).data) || NEUTRAL_TINT);
      } catch {
        resolve(NEUTRAL_TINT);
      }
    };
    img.onerror = () => resolve(NEUTRAL_TINT);
    img.src = url;
  });
}
