import { SpatialNavigation } from '@noriginmedia/norigin-spatial-navigation';

export { isPointerMode, setPointerMode } from './pointerModeState';

/**
 * Le survol déplace le focus, comme les flèches : l'élément sous la souris devient
 * l'élément focalisé de la navigation spatiale (même style, même Entrée).
 *
 * Un seul écouteur sur la scène plutôt qu'un `onMouseEnter` dans chaque composant :
 * on demande à la navigation spatiale quel élément focalisable contient la cible. Sa
 * table des éléments (`focusableComponents`) n'est pas une API documentée — si elle
 * disparaît, le survol ne fait simplement plus rien (le clic et le clavier restent).
 *
 * @returns {() => void} désinscription
 */
export function followPointer(root) {
  if (!root) return () => {};
  let frame = 0;
  let lastKey = null;
  const onMove = (event) => {
    if (frame) return;
    const target = event.target;
    frame = requestAnimationFrame(() => {
      frame = 0;
      const table = SpatialNavigation.focusableComponents;
      if (!table || !(target instanceof Element)) return;
      let best = null;
      for (const key of Object.keys(table)) {
        const component = table[key];
        const node = component?.node;
        // Feuilles seulement : un conteneur (trackChildren) renverrait à son dernier enfant.
        if (!node || component.trackChildren || !component.focusable || !node.contains(target)) continue;
        if (!best || best.node.contains(node)) best = { key, node };
      }
      if (best && best.key !== lastKey) {
        lastKey = best.key;
        try { SpatialNavigation.setFocus(best.key); } catch { /* ignore */ }
      }
    });
  };
  const onLeave = () => { lastKey = null; };
  root.addEventListener('mouseover', onMove);
  root.addEventListener('mouseleave', onLeave);
  return () => {
    if (frame) cancelAnimationFrame(frame);
    root.removeEventListener('mouseover', onMove);
    root.removeEventListener('mouseleave', onLeave);
  };
}
