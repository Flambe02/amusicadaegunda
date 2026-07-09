import { useEffect, useState } from 'react';

/**
 * Charge la YouTube IFrame Player API (https://www.youtube.com/iframe_api) une seule
 * fois pour toute l'app, et expose l'objet global `window.YT` une fois prêt.
 *
 * ⚠️ CSP : `script-src` doit autoriser https://www.youtube.com (voir public/_headers).
 *
 * Robustesse :
 *  - singleton : plusieurs composants montés partagent la même promesse.
 *  - respecte un éventuel `window.onYouTubeIframeAPIReady` déjà défini (on le chaîne).
 *  - ne recharge pas le script s'il est déjà présent.
 */

let ytApiPromise = null;

export function loadYouTubeIframeApi() {
  if (typeof window === 'undefined') return Promise.reject(new Error('no-window'));

  // Déjà prêt
  if (window.YT && typeof window.YT.Player === 'function') {
    return Promise.resolve(window.YT);
  }

  if (ytApiPromise) return ytApiPromise;

  ytApiPromise = new Promise((resolve, reject) => {
    const finish = () => {
      if (window.YT && typeof window.YT.Player === 'function') resolve(window.YT);
      else reject(new Error('yt-api-unavailable'));
    };

    // Chaîner un callback existant pour ne pas l'écraser
    const previous = window.onYouTubeIframeAPIReady;
    window.onYouTubeIframeAPIReady = () => {
      try { previous?.(); } catch { /* ignore */ }
      finish();
    };

    // Script déjà injecté par ailleurs : on attend juste le callback / poll
    const existing = document.querySelector('script[src="https://www.youtube.com/iframe_api"]');
    if (!existing) {
      const tag = document.createElement('script');
      tag.src = 'https://www.youtube.com/iframe_api';
      tag.async = true;
      tag.onerror = () => reject(new Error('yt-api-load-error'));
      const first = document.getElementsByTagName('script')[0];
      if (first && first.parentNode) first.parentNode.insertBefore(tag, first);
      else document.head.appendChild(tag);
    }

    // Filet de sécurité : si le callback ne se déclenche pas, on poll puis timeout.
    let waited = 0;
    const poll = setInterval(() => {
      if (window.YT && typeof window.YT.Player === 'function') {
        clearInterval(poll);
        resolve(window.YT);
      } else if ((waited += 250) >= 15000) {
        clearInterval(poll);
        reject(new Error('yt-api-timeout'));
      }
    }, 250);
  });

  // En cas d'échec, permettre une nouvelle tentative au prochain appel
  ytApiPromise.catch(() => { ytApiPromise = null; });

  return ytApiPromise;
}

/**
 * Hook React : renvoie { YT, ready, error }.
 * `YT` est l'objet global une fois disponible, sinon null.
 */
export function useYouTubeIframeApi() {
  const [state, setState] = useState({ YT: null, ready: false, error: null });

  useEffect(() => {
    let mounted = true;
    loadYouTubeIframeApi()
      .then((YT) => { if (mounted) setState({ YT, ready: true, error: null }); })
      .catch((error) => { if (mounted) setState({ YT: null, ready: false, error }); });
    return () => { mounted = false; };
  }, []);

  return state;
}
