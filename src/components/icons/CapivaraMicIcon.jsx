import { BRAND_SQUARE_SMALL } from '@/lib/imageAssets';

/**
 * Icône de navigation « Karaokê » = le mascotte capivara qui chante.
 * Rendue comme <img> (le mascotte reste en couleur, il ressort volontairement dans
 * la barre parmi les icônes au trait). Reçoit `className` d'AppBottomNav (dimensions
 * h-5 w-5 ...) ; les classes de couleur texte n'affectent pas l'image, ce qui est voulu.
 */
export default function CapivaraMicIcon({ className = '' }) {
  return (
    <img
      src={BRAND_SQUARE_SMALL}
      alt=""
      aria-hidden="true"
      loading="lazy"
      decoding="async"
      className={`${className} rounded-full object-cover`}
    />
  );
}
