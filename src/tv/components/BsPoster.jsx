import { useMemo, useState } from 'react';
import { getPosterCandidates } from '../lib/bsSong';

// YouTube répond 200 avec une vignette grise de 120×90 quand une qualité n'existe pas :
// `onError` ne suffit pas, on écarte aussi toute image trop petite.
const PLACEHOLDER_MAX_WIDTH = 200;

/**
 * Affiche d'une chanson (verticale quand le Short en a une). Essaie les candidates dans
 * l'ordre et passe à la suivante en cas d'échec. Le cadre a une taille fixée par le CSS
 * de l'appelant : l'image qui arrive ne déplace rien (CLS nul).
 */
export default function BsPoster({ song, className = '', eager = false }) {
  const candidates = useMemo(() => getPosterCandidates(song), [song]);
  const [index, setIndex] = useState(0);
  const src = candidates[Math.min(index, candidates.length - 1)];
  const next = () => setIndex((current) => Math.min(current + 1, candidates.length - 1));

  return (
    <span className={`bs-poster ${className}`}>
      <img
        key={src}
        src={src}
        alt=""
        decoding="async"
        loading={eager ? 'eager' : 'lazy'}
        onError={next}
        onLoad={(event) => {
          if (/ytimg\.com/.test(src) && event.currentTarget.naturalWidth <= PLACEHOLDER_MAX_WIDTH) next();
        }}
      />
    </span>
  );
}
