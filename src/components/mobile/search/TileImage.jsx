import { useMemo, useState } from 'react';
import { YT_PLACEHOLDER_MAX_WIDTH } from '@/components/mobile/feed/feedMedia';
import { getTileCandidates } from './searchCatalog';

/**
 * Miniature 9:16 d'une chanson, avec la chaîne de replis de la grille de recherche
 * (décision H.8.1) : Short → miniature de `youtube_url` recadrée → pochette. Si rien ne
 * charge, rien n'est rendu : le parent garde son fond sombre et son titre (jamais de
 * case vide). `onSource` reçoit l'URL finalement affichée.
 */
export default function TileImage({ song, eager = false, onSource }) {
  const candidates = useMemo(() => getTileCandidates(song), [song]);
  const [index, setIndex] = useState(0);
  const src = candidates[index];

  if (!src) return null;

  const next = () => setIndex((i) => i + 1);
  const onLoad = (event) => {
    const width = event.currentTarget.naturalWidth || 0;
    if (width > 0 && width < YT_PLACEHOLDER_MAX_WIDTH) {
      next(); // vignette grise de YouTube
      return;
    }
    onSource?.(src);
  };

  return (
    <img
      key={src}
      src={src}
      alt=""
      loading={eager ? 'eager' : 'lazy'}
      decoding="async"
      onLoad={onLoad}
      onError={next}
      // Pas de glisser-déposer natif de l'image : il annulerait les gestes du carrousel.
      draggable={false}
      className="absolute inset-0 h-full w-full select-none object-cover"
    />
  );
}
