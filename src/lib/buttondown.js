/**
 * Capture email — page /apprendre/ (Modo Aprender, bêta, §6.5 de la spec).
 *
 * Le site est 100% statique (GitHub Pages, pas de backend) — la capture email passe
 * donc obligatoirement par un service tiers. Décision produit : Buttondown.
 *
 * L'endpoint public de Buttondown (`embed-subscribe`) N'ACCEPTE PAS les requêtes
 * fetch/AJAX cross-origin — sa documentation officielle est explicite : les navigateurs
 * bloquent ces appels par CORS/CSP, l'inscription doit passer par une VRAIE soumission
 * de <form>. Pour éviter de recharger/rediriger /apprendre/ (§6.5), on utilise le
 * pattern communautaire standard : `target="popupwindow"` + `window.open(...)` sur
 * `onSubmit`, qui ouvre la confirmation Buttondown dans une popup sans jamais quitter
 * la page. Voir ButtondownSignupForm.jsx pour l'implémentation.
 */

// Identifiant du compte Buttondown (le slug dans buttondown.com/<USERNAME>).
export const BUTTONDOWN_USERNAME = 'amusicadasegunda';

export const BUTTONDOWN_CONFIGURED = BUTTONDOWN_USERNAME !== 'REMPLACER_PAR_IDENTIFIANT_BUTTONDOWN';

export const BUTTONDOWN_FORM_ACTION = `https://buttondown.com/api/emails/embed-subscribe/${BUTTONDOWN_USERNAME}`;
export const BUTTONDOWN_CONFIRMATION_URL = `https://buttondown.com/${BUTTONDOWN_USERNAME}`;
