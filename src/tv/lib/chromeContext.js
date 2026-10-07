import { createContext, useContext } from 'react';

/**
 * Ce que la barre du haut reçoit de TvApp sans passer par chaque écran : la recherche
 * (« Buscar »), et sur ordinateur le plein écran (« Modo TV »). Sur la box TV, `web`
 * est faux et le bouton « Modo TV » n'existe pas.
 */
const ChromeContext = createContext({
  web: false, onBuscar: null, canFullscreen: false, fullscreen: false, toggleFullscreen: null,
});

export const TvChromeProvider = ChromeContext.Provider;
export function useTvChrome() {
  return useContext(ChromeContext);
}
