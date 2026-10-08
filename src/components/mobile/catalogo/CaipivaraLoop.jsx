import { useEffect, useRef, useState } from 'react';
import { DANCE_CLIP, EDGE_VIGNETTE, IDLE_CLIP } from './stageDraw';
import { getClipUrl, isDataSaver } from './mascotCatalog';

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
 *
 * `costume` : le clip de la chanson (catalogue `public/mascot/`). La Caipivara y paraît
 * dans son costume : son poster tout de suite, et sa vidéo (téléchargée à la demande,
 * gardée sur l'appareil) seulement quand elle danse. `costumeVideo={false}` : le poster
 * seulement (diapositive voisine). Économie de données ou mouvement réduit : le poster.
 */
export default function CaipivaraLoop({ dancing = false, className = '', costume = null, costumeVideo = true }) {
  const reduceMotion = prefersReducedMotion();
  const danceRef = useRef(null);
  const costumeRef = useRef(null);
  const [dataSaver] = useState(isDataSaver);
  const [costumeSrc, setCostumeSrc] = useState(null);
  const [costumeReady, setCostumeReady] = useState(false);
  const costumeKey = costume?.key || null;
  const wantsCostumeVideo = Boolean(costume) && costumeVideo && !dataSaver && !reduceMotion;

  useEffect(() => {
    setCostumeSrc(null);
    setCostumeReady(false);
    if (!wantsCostumeVideo) return undefined;
    let active = true;
    getClipUrl(costume).then((url) => { if (active && url) setCostumeSrc(url); });
    return () => { active = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [costumeKey, wantsCostumeVideo]);

  useEffect(() => {
    const video = costumeRef.current;
    if (!video) return;
    if (dancing) playSafely(video);
    else video.pause?.();
  }, [dancing, costumeSrc]);

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
      data-costume={costumeKey || undefined}
      className={`relative aspect-[9/16] ${className}`}
    >
      {costume ? (
        <>
          {/* Costume de la chanson : le poster tout de suite, la vidéo en fondu dès qu'elle joue. */}
          <img src={costume.poster} alt="" data-costume-poster={costumeKey} className="absolute inset-0 h-full w-full object-cover" />
          {wantsCostumeVideo && costumeSrc ? (
            <video
              ref={costumeRef}
              src={costumeSrc}
              className={`absolute inset-0 h-full w-full object-cover transition-opacity duration-150 ease-out ${
                dancing && costumeReady ? 'opacity-100' : 'opacity-0'
              }`}
              muted
              loop
              playsInline
              preload="auto"
              disablePictureInPicture
              data-costume-video={costumeKey}
              onPlaying={() => setCostumeReady(true)}
            />
          ) : null}
        </>
      ) : reduceMotion ? (
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
