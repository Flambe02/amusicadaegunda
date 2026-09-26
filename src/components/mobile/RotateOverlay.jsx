import { usePhoneLandscape } from './orientation';

/**
 * Écran plein par-dessus l'app : la Caipivara en image fixe et « Gire o celular » sur
 * fond noir. Le texte est lu par les lecteurs d'écran (dialogue modal, annonce).
 */
export default function RotateOverlay() {
  const blocked = usePhoneLandscape();
  if (!blocked) return null;
  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="rotate-overlay-title"
      data-rotate-overlay=""
      className="fixed inset-0 z-[400] flex flex-col items-center justify-center gap-4 bg-black px-6 text-center text-white"
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
    </div>
  );
}
