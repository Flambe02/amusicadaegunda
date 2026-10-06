import { ICON_SHADOW } from './feedStyles';

/**
 * Signaux d'attente du feed : entre la miniature et le démarrage de la vidéo, il reste
 * une à deux secondes où rien ne bouge. Deux repères discrets disent que la chanson
 * arrive — sans compteur ni roue au centre.
 *
 * `active` : le lecteur charge la vidéo (phase `loading`). Jamais pendant un repli
 * (`fallback` : le bouton de lecture suffit, y compris en économie de données et en
 * 2G), ni quand il n'y a pas de vidéo.
 *
 * Tout est en CSS, sur `opacity` et `transform` seulement (aucun JavaScript par image) :
 * - apparition retardée de 400 ms par un `transition-delay` — une vidéo qui démarre
 *   plus vite ne fait rien clignoter, la transition n'a pas commencé ;
 * - disparition en 500 ms, la durée du fondu de la vidéo ;
 * - les éléments restent montés (opacité 0) : rien ne se déplace, le CLS reste nul.
 * Mouvement réduit : pas d'animation, les mêmes repères immobiles et atténués.
 */
// Délai et durée en propriétés explicites : avec le plugin tailwindcss-animate, les
// classes `delay-[…]` / `duration-[…]` sont ambiguës (transition ou animation) et
// Tailwind ne les génère pas — le délai de 400 ms était alors ignoré.
const SHOWN = 'opacity-100 transition-opacity [transition-delay:400ms] [transition-duration:200ms] ease-out';
const HIDDEN = 'opacity-0 transition-opacity [transition-delay:0ms] [transition-duration:500ms] ease-out';

/** Délai avant d'apparaître, durée du fondu de sortie (ms) — lus par les tests. */
export const WAIT_CUE_DELAY_MS = 400;
export const WAIT_CUE_FADE_OUT_MS = 500;

/**
 * Ligne lumineuse au bas de la diapositive, à l'emplacement exact du trait de la barre
 * de progression (Scrubber : 3 px, blanc à 20 %). Quand la vidéo démarre, la barre
 * apparaît au même endroit, avec le même fond : la ligne s'efface par-dessus, sans saut.
 */
export function FeedWaitLine({ active }) {
  return (
    <div
      aria-hidden="true"
      data-feed-wait="line"
      data-active={active ? 'true' : 'false'}
      className={`pointer-events-none absolute inset-x-0 bottom-0 z-30 h-[3px] overflow-hidden bg-white/20 ${active ? SHOWN : HIDDEN}`}
    >
      <div
        // Segment plein, sans dégradé (règle du feed : aucun dégradé sur la vidéo).
        className={`h-full w-1/3 rounded-full bg-white/90 motion-reduce:w-full motion-reduce:bg-white/40 ${
          active ? 'animate-feed-wait-sweep motion-reduce:animate-none' : ''
        }`}
      />
    </div>
  );
}

const BAR = 'w-[3px] origin-bottom rounded-full bg-white';
const BAR_MOTION = 'animate-feed-wait-eq motion-reduce:animate-none';

/**
 * Mini égaliseur de trois barres, posé juste au-dessus du titre (en position absolue :
 * il n'occupe aucune place, le titre ne bouge pas). Blanc, comme le titre — le seul
 * jaune de la vidéo reste la ligne de karaokê.
 */
export function FeedWaitEqualizer({ active }) {
  return (
    <span
      aria-hidden="true"
      data-feed-wait="equalizer"
      data-active={active ? 'true' : 'false'}
      className={`pointer-events-none absolute bottom-full left-0 mb-2 flex h-3.5 items-end gap-[3px] motion-reduce:opacity-70 ${ICON_SHADOW} ${
        active ? SHOWN : HIDDEN
      }`}
    >
      <span className={`${BAR} h-full scale-y-[0.45] ${active ? BAR_MOTION : ''}`} />
      <span className={`${BAR} h-full scale-y-100 ${active ? `${BAR_MOTION} [animation-delay:-0.35s]` : ''}`} />
      <span className={`${BAR} h-full scale-y-[0.7] ${active ? `${BAR_MOTION} [animation-delay:-0.6s]` : ''}`} />
    </span>
  );
}
