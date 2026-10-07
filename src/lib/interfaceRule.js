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
 * Résultat : { kind: 'mobile' | 'bigscreen', input: 'touch' | 'dpad' | 'pointer', tv }
 *   - TV (télécommande)               → bigscreen / dpad
 *   - écran de moins de 768 px        → mobile / touch
 *   - le reste (ordinateur, tablette) → bigscreen / pointer
 * La troisième ligne est le comportement actuel du site (coquille desktop dès 768 px).
 * La décision « tablettes en interface mobile » se fera ICI, en phase 2, avec le
 * changement de coquille — pas avant, sinon index.html et l'app ne seraient plus d'accord.
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
  var result = function (tv, mobile) {
    if (tv) return { kind: 'bigscreen', input: 'dpad', tv: true };
    if (mobile) return { kind: 'mobile', input: 'touch', tv: false };
    return { kind: 'bigscreen', input: 'pointer', tv: false };
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
  return result(tv, mobile);
}
