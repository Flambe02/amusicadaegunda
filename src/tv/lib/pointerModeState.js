/**
 * « Mode pointeur » de l'interface grand écran : vrai quand elle tourne dans un
 * navigateur d'ordinateur (souris + clavier), faux dans l'app TV (télécommande).
 *
 * Module SANS dépendance : KaraokePlayer (chargé aussi sur mobile) le lit, et ne doit
 * pas tirer avec lui la bibliothèque de navigation spatiale (voir pointerMode.js).
 *
 * Posé par TvApp au montage. Tout ce qui n'existe que pour la souris le lit — sur la
 * box TV il reste faux, et rien de ce qui suit ne s'exécute.
 */
let pointerMode = false;

export function setPointerMode(on) {
  pointerMode = Boolean(on);
}

export function isPointerMode() {
  return pointerMode;
}

