import { createContext, useContext } from 'react';

/**
 * Ce que la barre du haut reçoit de TvApp sans passer par chaque écran : la recherche
 * (« Buscar »), et sur ordinateur le plein écran (« Tela cheia »). Sur la box TV, `web`
 * est faux et le bouton « Tela cheia » n'existe pas.
 */
const ChromeContext = createContext({
  web: false, onBuscar: null, canFullscreen: false, fullscreen: false, toggleFullscreen: null,
});

export const TvChromeProvider = ChromeContext.Provider;
export function useTvChrome() {
  return useContext(ChromeContext);
}
