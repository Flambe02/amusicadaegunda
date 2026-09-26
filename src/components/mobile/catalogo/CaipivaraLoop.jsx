import { useEffect, useRef } from 'react';
import { DANCE_CLIP, EDGE_VIGNETTE, IDLE_CLIP } from './stageDraw';

function prefersReducedMotion() {
  return typeof window !== 'undefined' && typeof window.matchMedia === 'function'
    ? window.matchMedia('(prefers-reduced-motion: reduce)').matches
    : false;
}

function playSafely(video) {
  const attempt = video?.play?.();
  if (attempt && typeof attempt.catch === 'function') attempt.catch(() => {});
}

function Sources({ clip }) {
  return (
    <>
      <source src={clip.webm} type="video/webm" />
      <source src={clip.mp4} type="video/mp4" />
    </>
  );
}

/**
 * La Caipivara en boucle, sans son : repos (`caipivara-idle`) ou danse
 * (`caipivara-dance`), avec le projecteur et la lueur au sol déjà présents dans les
 * clips, bords fondus. Fondu de 150 ms entre les deux. Mouvement réduit : le poster
 * fixe du repos, sans vidéo.
 *
 * Utilisée par le feed pour une chanson sans Short (la musique complète joue dans le
 * lecteur caché, la Caipivara danse seulement quand elle joue réellement avec le son).
 */
export default function CaipivaraLoop({ dancing = false, className = '' }) {
  const reduceMotion = prefersReducedMotion();
  const danceRef = useRef(null);

  useEffect(() => {
    const video = danceRef.current;
    if (!video) return;
    if (dancing) playSafely(video);
    else video.pause?.();
  }, [dancing]);

  return (
    <div
      aria-hidden="true"
      data-caipivara-loop={reduceMotion ? 'still' : dancing ? 'dancing' : 'idle'}
      className={`relative aspect-[9/16] ${className}`}
    >
      {reduceMotion ? (
        <img src={IDLE_CLIP.poster} alt="" className="absolute inset-0 h-full w-full object-cover" />
      ) : (
        <>
          <video
            className="absolute inset-0 h-full w-full object-cover"
            poster={IDLE_CLIP.poster}
            autoPlay
            muted
            loop
            playsInline
            preload="auto"
            disablePictureInPicture
            data-clip="idle"
          >
            <Sources clip={IDLE_CLIP} />
          </video>
          <video
            ref={danceRef}
            className={`absolute inset-0 h-full w-full object-cover transition-opacity duration-150 ease-out ${
              dancing ? 'opacity-100' : 'opacity-0'
            }`}
            muted
            loop
            playsInline
            preload="metadata"
            disablePictureInPicture
            data-clip="dance"
          >
            <Sources clip={DANCE_CLIP} />
          </video>
        </>
      )}
      {/* Bords fondus dans le fond, par-dessus les vidéos (voir EDGE_VIGNETTE). */}
      <div data-edge-vignette className="pointer-events-none absolute inset-0" style={{ backgroundImage: EDGE_VIGNETTE }} />
    </div>
  );
}
