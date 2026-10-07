import { createContext, useContext } from 'react';

/**
 * Dans quelle coquille une page est-elle rendue ?
 *
 * Layout monte UNE coquille, celle de l'interface de l'appareil (`mobile` sous 768 px,
 * `desktop` au-delà — voir src/lib/interfaceRule.js), et la remonte si la fenêtre change
 * de côté. Une page qui a deux rendus distincts lit cette valeur pour choisir le sien.
 *
 * Valeurs : 'mobile' | 'desktop' | null (page rendue hors Layout, ex. tests).
 */
export const ShellContext = createContext(null);

export function useShell() {
  return useContext(ShellContext);
}
