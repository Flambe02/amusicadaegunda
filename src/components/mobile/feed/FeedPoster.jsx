import { useEffect, useMemo, useState } from 'react';
import { getPosterCandidates, YT_PLACEHOLDER_MAX_WIDTH } from './feedMedia';

// `fetchpriority` en minuscules passé par décomposition : React 18 ne connaît pas
// `fetchPriority` (avertissement console), et eslint --fix réécrit la forme minuscule
// écrite en attribut direct. La décomposition échappe aux deux.
const HIGH_PRIORITY = { fetchpriority: 'high' };

/**
 * Miniature plein cadre d'une chanson, recadrée « cover », avec sa chaîne de replis
 * (Short vertical → Short 4:3 → image de la chanson complète → Caipivara). Jamais vide.
 *
 * `priority` : la miniature de la chanson affichée au chargement est l'élément LCP.
 * `onSettled` : appelé une fois qu'une image valable a fini de charger (ou que la
 * chaîne est épuisée) — le lecteur YouTube n'est créé qu'après.
 */
export default function FeedPoster({ song, buildArtwork, priority = false, onSettled }) {
  const posters = useMemo(() => getPosterCandidates(song, buildArtwork), [song, buildArtwork]);
  const [index, setIndex] = useState(0);

  useEffect(() => {
    setIndex(0);
  }, [posters]);

  const next = () => {
    if (index + 1 < posters.length) setIndex(index + 1);
    else onSettled?.();
  };

  const onLoad = (event) => {
    const width = event.currentTarget.naturalWidth || 0;
    if (width > 0 && width < YT_PLACEHOLDER_MAX_WIDTH && index + 1 < posters.length) {
      next();
      return;
    }
    onSettled?.();
  };

  return (
    <img
      key={posters[index]}
      src={posters[index]}
      alt=""
      aria-hidden="true"
      decoding="async"
      loading="eager"
      {...(priority ? HIGH_PRIORITY : null)}
      onLoad={onLoad}
      onError={next}
      className="absolute inset-0 h-full w-full object-cover"
    />
  );
}
