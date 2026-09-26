import { createPortal } from 'react-dom';
import { usePhoneLandscape } from './orientation';

// Plus haut niveau possible : rien ne doit recouvrir le message, pas même le lecteur
// karaokê plein écran (z-[9999], ouvert depuis une page chanson ou Aprender).
export const ROTATE_OVERLAY_Z = 2147483647;

/**
 * Écran plein par-dessus l'app : la Caipivara en image fixe et « Gire o celular » sur
 * fond noir. Le texte est lu par les lecteurs d'écran (dialogue modal, annonce).
 * Rendu dans un portail directement sur <body>, au z-index maximal : une couche de
 * premier niveau qu'aucun autre calque ne peut recouvrir.
 */
export default function RotateOverlay() {
  const blocked = usePhoneLandscape();
  if (!blocked || typeof document === 'undefined') return null;
  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="rotate-overlay-title"
      data-rotate-overlay=""
      className="fixed inset-0 flex flex-col items-center justify-center gap-4 bg-black px-6 text-center text-white"
      style={{ zIndex: ROTATE_OVERLAY_Z }}
    >
      <img
        src="/images/caipivara-3d-480.webp"
        alt=""
        width="160"
        height="160"
        className="h-[45svh] max-h-40 w-auto object-contain"
      />
      <p id="rotate-overlay-title" aria-live="assertive" className="text-2xl font-black tracking-tight">
        Gire o celular
      </p>
    </div>,
    document.body
  );
}
