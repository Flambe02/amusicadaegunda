/**
 * LA règle qui décide de l'interface — une seule source.
 *
 * Le projet a deux interfaces : `mobile` (le feed vertical) et `bigscreen` (TV + ordinateur).
 * Cette fonction est lue à deux endroits qui doivent toujours être d'accord :
 *   - par l'app (src/lib/interface.js, src/tv/platform.js) ;
 *   - par `index.html`, AVANT React, pour savoir s'il faut peindre la miniature du feed.
 *     Son texte y est recopié au build par vite.config.js (plugin amds-boot) : il n'y a
 *     donc pas de seconde version à tenir à jour.
 *
 * ⚠️ Pour cette raison la fonction doit rester AUTONOME : aucun import, aucune variable
 * du module, rien que du JavaScript que comprend une vieille WebView (pas de `?.`, pas
 * de fonction fléchée). Tout ce dont elle a besoin est dans son corps.
 *
 * Résultat : { kind, input, tv, desktop, webBigScreen }
 *   - TV (télécommande)               → kind bigscreen / input dpad
 *   - écran de moins de 768 px        → kind mobile / input touch
 *   - le reste (ordinateur, tablette) → kind bigscreen / input pointer
 *
 * `desktop` : un ordinateur — un pointeur fin DISPONIBLE (souris, pavé tactile :
 * `any-pointer: fine`, même si l'écran tactile est le pointeur principal) ET fenêtre
 * d'au moins 900 px. Le seuil est à 900 et non 1024 pour les portables dont Windows
 * agrandit l'affichage (1366 px à 150 % = 911 px). Une tablette sans souris ni pavé
 * tactile, ou une fenêtre plus étroite, n'en est pas un.
 *
 * `webBigScreen` : sur le web, l'accueil et la fiche chanson montent-ils l'interface
 * grand écran (celle de la TV) ? Oui par défaut sur un ordinateur, et sur une tablette
 * tenue en paysage (900 px ou plus, plus large que haute : le grand écran se pilote
 * aussi au doigt). Choix manuel, mémorisé
 * dans `localStorage['force-ui']` : `?ui=legacy` garde l'ancien desktop (pour comparer,
 * jusqu'à son retrait), `?ui=bigscreen` force le grand écran (aussi sur tablette),
 * `?ui=auto` oublie le choix. Jamais sur un écran de moins de 768 px ; la TV, elle,
 * monte toujours le grand écran (App.jsx) et ne lit pas ce drapeau.
 *
 * Les tablettes en portrait et les fenêtres de 768 à 899 px gardent l'ancienne coquille desktop
 * tant que la coquille mobile dépend encore de la limite de 768 px.
 *
 * Détection TV, inchangée (voir src/tv/platform.js pour le pourquoi de chaque signal) :
 *   1. choix manuel : `?tv=1` force la TV, `?tv=0` l'interdit (même si l'agent
 *      utilisateur ressemble à une TV), `?tv=auto` oublie le choix. Mémorisé dans
 *      `localStorage['force-tv']` ('1' ou '0') ;
 *   2. agent utilisateur de téléviseur — dont « AndroidTV », ajouté par MainActivity ;
 *   3. app Android sans écran tactile, large et en paysage.
 *
 * @param {Window} win
 * @param {boolean} [nativeAndroid] app Android native ? Lu sur `win.Capacitor` si absent.
 */
export function detectInterface(win, nativeAndroid) {
  var TV_UA = /(SmartTV|Smart-TV|GoogleTV|Google TV|Android ?TV|AFT[A-Z]|BRAVIA|AQUOS|Web0S|WebOS|Tizen|HbbTV|NetCast|VIDAA|Roku|CrKey|\bTV\b)/i;
  var FORCE_KEY = 'force-tv';
  var result = function (tv, mobile, desktop, webBigScreen) {
    if (tv) return { kind: 'bigscreen', input: 'dpad', tv: true, desktop: false, webBigScreen: false };
    if (mobile) return { kind: 'mobile', input: 'touch', tv: false, desktop: false, webBigScreen: false };
    return { kind: 'bigscreen', input: 'pointer', tv: false, desktop: Boolean(desktop), webBigScreen: Boolean(webBigScreen) };
  };
  if (!win) return result(false, false);

  // 1. Choix manuel.
  var forced = null;
  try {
    var asked = /[?&]tv=([^&#]*)/.exec(win.location.search || '');
    if (asked && asked[1] === '1') win.localStorage.setItem(FORCE_KEY, '1');
    else if (asked && asked[1] === '0') win.localStorage.setItem(FORCE_KEY, '0');
    else if (asked && asked[1] === 'auto') win.localStorage.removeItem(FORCE_KEY);
    forced = win.localStorage.getItem(FORCE_KEY);
  } catch (_error) {
    forced = null;
  }

  var tv = false;
  if (forced === '1') {
    tv = true;
  } else if (forced !== '0') {
    var nav = win.navigator || {};
    // 2. Agent utilisateur.
    if (TV_UA.test(nav.userAgent || '')) {
      tv = true;
    } else {
      // 3. App Android sans tactile, large et en paysage (les deux signaux ensemble).
      var android = nativeAndroid;
      if (android === undefined) {
        try {
          android = Boolean(win.Capacitor && win.Capacitor.getPlatform && win.Capacitor.getPlatform() === 'android');
        } catch (_error) {
          android = false;
        }
      }
      var noTouch = (nav.maxTouchPoints || 0) === 0;
      var wideLandscape = win.innerWidth >= 960 && win.innerWidth > win.innerHeight;
      tv = Boolean(android && noTouch && wideLandscape);
    }
  }

  var mobile = false;
  try {
    mobile = Boolean(win.matchMedia && win.matchMedia('(max-width: 767px)').matches);
  } catch (_error) {
    mobile = false;
  }

  // Ordinateur : un pointeur fin disponible et fenêtre d'au moins 900 px.
  var desktop = false;
  try {
    desktop = Boolean(win.matchMedia && win.matchMedia('(any-pointer: fine)').matches && win.innerWidth >= 900);
  } catch (_error) {
    desktop = false;
  }

  // Grand écran sur le web : le défaut d'un ordinateur, sauf choix manuel mémorisé.
  var UI_KEY = 'force-ui';
  var choice = null;
  try {
    var askedUi = /[?&]ui=([^&#]*)/.exec(win.location.search || '');
    if (askedUi && (askedUi[1] === 'bigscreen' || askedUi[1] === 'legacy')) win.localStorage.setItem(UI_KEY, askedUi[1]);
    else if (askedUi && askedUi[1] === 'auto') win.localStorage.removeItem(UI_KEY);
    choice = win.localStorage.getItem(UI_KEY);
  } catch (_error) {
    choice = null;
  }
  // Tablette en paysage : pas de pointeur fin, mais assez large pour le grand écran.
  var wideTablet = !desktop && win.innerWidth >= 900 && win.innerWidth > win.innerHeight;
  var webBigScreen = choice === 'bigscreen' || (choice !== 'legacy' && (desktop || wideTablet));
  return result(tv, mobile, desktop, webBigScreen);
}
