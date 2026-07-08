import { useEffect, useRef } from 'react';

/**
 * Android App Links / deep linking.
 *
 * Quand Android résout une URL https://(www.)amusicadasegunda.com/... vers
 * l'app (grâce à l'intent-filter autoVerify + /.well-known/assetlinks.json),
 * Capacitor émet un évènement `appUrlOpen`. On convertit alors l'URL externe
 * en navigation interne React Router, sans recharger la WebView.
 *
 * Cas couverts :
 *  - App lancée depuis le widget (ACTION_VIEW sur .../musica/<slug>)
 *  - App déjà ouverte (singleTask → nouvel intent sur l'instance existante)
 *
 * Aucun impact sur la navigation web classique : le listener n'est actif que
 * sur plateforme native Capacitor.
 */

const ALLOWED_HOSTS = new Set([
  'www.amusicadasegunda.com',
  'amusicadasegunda.com',
]);

// ⚠️ PIÈGE (fixé 2026-07-08) : `App.getLaunchUrl()` retourne l'URL de lancement
// pour TOUTE la durée de vie de l'app. Si on la relit après une navigation, elle
// renvoie encore l'URL du widget → l'utilisateur est ramené de force sur la page
// d'origine à chaque changement d'onglet (bug "coincé sur Catálogo"). On la traite
// donc UNE SEULE FOIS par session, via ce garde module-level.
let launchUrlHandled = false;

/**
 * Extrait le chemin interne (pathname + search + hash) d'une URL de deep link,
 * ou `null` si l'URL n'est pas un lien géré par l'app.
 * Exporté pour être testable indépendamment de Capacitor.
 * @param {string} rawUrl
 * @returns {string | null}
 */
export function resolveDeepLinkPath(rawUrl) {
  if (!rawUrl) return null;
  let url;
  try {
    url = new URL(rawUrl);
  } catch {
    return null;
  }
  if (url.protocol !== 'https:') return null;
  if (!ALLOWED_HOSTS.has(url.hostname)) return null;

  const path = `${url.pathname}${url.search}${url.hash}`;
  // Ne pas router sur la racine nue : laisse l'app sur sa page courante.
  if (!url.pathname || url.pathname === '/') return null;
  return path;
}

/**
 * Hook : écoute `appUrlOpen` et route l'app en interne.
 * À monter une seule fois, à l'intérieur du Router (a besoin de `navigate`).
 * @param {(to: string, opts?: object) => void} navigate  react-router navigate
 */
export function useDeepLinks(navigate) {
  // `navigate` change d'identité à chaque navigation (React Router 7). On le
  // garde dans une ref pour que l'effet ci-dessous NE dépende PAS de lui et ne
  // se relance donc jamais (sinon getLaunchUrl est relu → boucle de renavigation).
  const navigateRef = useRef(navigate);
  navigateRef.current = navigate;

  useEffect(() => {
    let removeListener = null;
    let cancelled = false;

    (async () => {
      let Capacitor;
      let App;
      try {
        ({ Capacitor } = await import('@capacitor/core'));
        if (!Capacitor?.isNativePlatform?.()) return;
        ({ App } = await import('@capacitor/app'));
      } catch {
        // Plugins absents (web pur) : rien à faire.
        return;
      }
      if (cancelled) return;

      const handleUrl = (url) => {
        const path = resolveDeepLinkPath(url);
        if (path) navigateRef.current(path);
      };

      // 1) App déjà lancée puis re-ouverte via un lien (widget, App Link…).
      const handle = await App.addListener('appUrlOpen', (event) => {
        handleUrl(event?.url);
      });
      if (cancelled) {
        handle.remove();
        return;
      }
      removeListener = () => handle.remove();

      // 2) App démarrée à froid depuis un lien : une seule fois par session.
      if (!launchUrlHandled) {
        launchUrlHandled = true;
        try {
          const launch = await App.getLaunchUrl();
          if (!cancelled && launch?.url) handleUrl(launch.url);
        } catch {
          // getLaunchUrl indisponible : ignoré.
        }
      }
    })();

    return () => {
      cancelled = true;
      if (removeListener) removeListener();
    };
  }, []);  
}
