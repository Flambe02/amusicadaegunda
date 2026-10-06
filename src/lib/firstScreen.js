/**
 * « Premier écran en place » : signal unique, émis une fois par chargement de page,
 * quand l'accueil mobile a fini son démarrage (la vidéo joue, ou a renoncé).
 *
 * Tout ce qui n'est pas visible au premier écran attend ce signal pour ne pas lui
 * disputer le réseau ni le processeur : descriptions du catalogue (« História »),
 * copie desktop de l'accueil gardée dans le DOM d'un téléphone.
 *
 * Filet : sans feed (desktop, erreur, YouTube bloqué), le signal part seul après
 * FIRST_SCREEN_TIMEOUT_MS — rien ne reste en attente indéfiniment.
 */
export const FIRST_SCREEN_TIMEOUT_MS = 8000;

let settled = false;
let timer = null;
const waiting = new Set();

export function markFirstScreenSettled() {
  if (settled) return;
  settled = true;
  if (timer) clearTimeout(timer);
  timer = null;
  const callbacks = [...waiting];
  waiting.clear();
  callbacks.forEach((callback) => {
    try {
      callback();
    } catch {
      /* un abonné en erreur ne bloque pas les autres */
    }
  });
}

/** Appelle `callback` une fois le premier écran en place. Renvoie la désinscription. */
export function onFirstScreenSettled(callback) {
  if (settled) {
    callback();
    return () => {};
  }
  waiting.add(callback);
  if (!timer) timer = setTimeout(markFirstScreenSettled, FIRST_SCREEN_TIMEOUT_MS);
  return () => waiting.delete(callback);
}

export function isFirstScreenSettled() {
  return settled;
}

/** Tests seulement. */
export function resetFirstScreenForTests() {
  settled = false;
  if (timer) clearTimeout(timer);
  timer = null;
  waiting.clear();
}
