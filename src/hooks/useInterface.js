import { useEffect, useState } from 'react';
import { getInterface } from '@/lib/interface';

/**
 * L'interface de l'appareil (`mobile` ou `bigscreen`), suivie en direct : fenêtre
 * redimensionnée, téléphone tourné, écran partagé de tablette. La règle est celle de
 * `detectInterface` (src/lib/interfaceRule.js), la même qu'index.html.
 */
export function useInterfaceKind() {
  const [kind, setKind] = useState(() => getInterface().kind);

  useEffect(() => {
    const update = () => setKind(getInterface().kind);
    update();
    const query = typeof window.matchMedia === 'function' ? window.matchMedia('(max-width: 767px)') : null;
    query?.addEventListener?.('change', update);
    window.addEventListener('resize', update);
    return () => {
      query?.removeEventListener?.('change', update);
      window.removeEventListener('resize', update);
    };
  }, []);

  return kind;
}
