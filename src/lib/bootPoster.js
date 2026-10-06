/**
 * Miniature peinte par `index.html` AVANT React (bloc « amds-boot », `#amds-boot-poster`) :
 * la même image, au même endroit et à la même taille que la miniature du feed, pour que
 * l'utilisateur la voie pendant que le JavaScript de l'app se télécharge.
 *
 * Le feed la retire une fois SA miniature chargée (même adresse : elle vient du cache,
 * sans second téléchargement). Rien ne bouge à l'écran : les deux images se superposent
 * exactement.
 */
export const BOOT_POSTER_ID = 'amds-boot-poster';

export function removeBootPoster() {
  if (typeof document === 'undefined') return;
  document.getElementById(BOOT_POSTER_ID)?.remove();
}

/**
 * Retrait après que la miniature du feed a été peinte (deux images d'animation), pour
 * qu'aucune image intermédiaire ne montre le fond noir.
 */
export function removeBootPosterAfterPaint() {
  if (typeof document === 'undefined' || !document.getElementById(BOOT_POSTER_ID)) return;
  if (typeof requestAnimationFrame !== 'function') {
    removeBootPoster();
    return;
  }
  requestAnimationFrame(() => requestAnimationFrame(removeBootPoster));
}
