import { useEffect, useMemo, useState } from 'react';
import { findCostumeClip, getLoadedMascotCatalog, loadMascotCatalog } from './mascotCatalog';

/**
 * Le costume de la mascotte pour une chanson (clip du catalogue `public/mascot/`), ou null.
 *
 * `fetchCatalog` : seule la diapositive courante lit le catalogue sur le site, et au repos
 * du navigateur — jamais sur le chemin du premier écran. Une diapositive voisine n'utilise
 * que ce qui est déjà lu : son poster est prêt quand on y arrive, sans requête de plus.
 *
 * @param {{ mascot_costume?: string|null }|null} song
 * @param {string|null} slug adresse publique de la chanson (celle du catalogue)
 */
export function useSongCostume(song, slug, fetchCatalog) {
  const [catalog, setCatalog] = useState(getLoadedMascotCatalog);

  useEffect(() => {
    if (!fetchCatalog || catalog.length > 0) return undefined;
    let active = true;
    const run = () => { loadMascotCatalog().then((list) => { if (active) setCatalog(list); }); };
    if (typeof window !== 'undefined' && typeof window.requestIdleCallback === 'function') {
      const id = window.requestIdleCallback(run, { timeout: 4000 });
      return () => { active = false; window.cancelIdleCallback?.(id); };
    }
    const id = setTimeout(run, 2500);
    return () => { active = false; clearTimeout(id); };
  }, [fetchCatalog, catalog.length]);

  const costumeColumn = song?.mascot_costume || null;
  return useMemo(() => findCostumeClip(catalog, { slug, mascot_costume: costumeColumn }), [catalog, slug, costumeColumn]);
}
