import { createContext, useContext } from 'react';

/**
 * Dans quelle coquille une page est-elle rendue ?
 *
 * Layout rend `children` DEUX fois : une copie dans la coquille mobile (< 768 px) et
 * une dans la coquille desktop, l'une des deux étant seulement masquée en CSS. Tout ce
 * qui a un coût réel même caché (iframe YouTube, lecteur, requêtes) doit donc vérifier
 * qu'il vit dans la bonne copie, sinon il existe deux fois.
 *
 * Valeurs : 'mobile' | 'desktop' | null (page rendue hors Layout, ex. tests).
 */
export const ShellContext = createContext(null);

export function useShell() {
  return useContext(ShellContext);
}
