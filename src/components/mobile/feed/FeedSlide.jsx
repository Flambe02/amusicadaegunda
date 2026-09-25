import { useEffect, useMemo, useRef, useState } from 'react';
import { VolumeX } from 'lucide-react';
import { useShortPlayer } from './useShortPlayer';
import { getPosterCandidates, getShortVideoId, YT_PLACEHOLDER_MAX_WIDTH } from './feedMedia';

// `fetchpriority` en minuscules passé par décomposition : React 18 ne connaît pas
// `fetchPriority` (avertissement console), et eslint --fix réécrit la forme minuscule
// écrite en attribut direct. La décomposition échappe aux deux.
const HIGH_PRIORITY = { fetchpriority: 'high' };

/**
 * Une diapositive du feed : le Short d'une chanson en plein écran (étape 3).
 *
 * Calques (de bas en haut) : miniature → vidéo (fondu à PLAYING) → dégradé de
 * lisibilité sous l'en-tête → un seul bouton plein cadre qui coupe/rétablit le son.
 * L'utilisateur ne touche jamais l'interface YouTube : l'iframe ne reçoit aucun
 * pointeur. Les calques de l'étape 4 (titre, colonne droite, Caipivara) viendront
 * par `children` et recevront l'état du lecteur via `renderOverlay`.
 */
export default function FeedSlide({ song, buildArtwork, renderOverlay }) {
  const videoId = getShortVideoId(song);
  const posters = useMemo(() => getPosterCandidates(song, buildArtwork), [song, buildArtwork]);
  const [posterIndex, setPosterIndex] = useState(0);
  const [posterSettled, setPosterSettled] = useState(false);
  const mountRef = useRef(null);

  useEffect(() => {
    setPosterIndex(0);
    setPosterSettled(false);
  }, [posters]);

  // Filet : si la miniature ne finit jamais de charger, on lance quand même le lecteur.
  useEffect(() => {
    if (posterSettled) return undefined;
    const id = setTimeout(() => setPosterSettled(true), 2500);
    return () => clearTimeout(id);
  }, [posterSettled, posters]);

  const player = useShortPlayer({ videoId, canLoad: posterSettled, mountRef });
  const { phase, isMuted, toggleSound } = player;
  const videoVisible = phase === 'playing';
  const soundOff = isMuted || !player.isPlaying;

  const nextPoster = () => {
    if (posterIndex + 1 < posters.length) setPosterIndex(posterIndex + 1);
    else setPosterSettled(true);
  };

  const onPosterLoad = (event) => {
    const width = event.currentTarget.naturalWidth || 0;
    if (width > 0 && width < YT_PLACEHOLDER_MAX_WIDTH && posterIndex + 1 < posters.length) {
      nextPoster();
      return;
    }
    setPosterSettled(true);
  };

  const title = song?.title || 'Música da semana';

  return (
    <section
      className="relative h-full w-full overflow-hidden bg-app-black [container-type:size]"
      aria-label={title}
      data-feed-phase={phase}
    >
      {/* 1. Miniature — élément LCP, recadrée « cover ». */}
      <img
        key={posters[posterIndex]}
        src={posters[posterIndex]}
        alt=""
        aria-hidden="true"
        decoding="async"
        loading="eager"
        {...HIGH_PRIORITY}
        onLoad={onPosterLoad}
        onError={nextPoster}
        className="absolute inset-0 h-full w-full object-cover"
      />

      {/* 2. Vidéo — iframe dimensionnée 9:16 en « cover » sur la zone, centrée. */}
      {videoId ? (
        <div
          aria-hidden="true"
          className={`pointer-events-none absolute inset-0 transition-opacity duration-500 ease-out motion-reduce:transition-none ${
            videoVisible ? 'opacity-100' : 'opacity-0'
          }`}
        >
          <div
            ref={mountRef}
            className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 [&>iframe]:h-full [&>iframe]:w-full"
            style={{
              width: 'max(100cqw, calc(100cqh * 9 / 16))',
              height: 'max(100cqh, calc(100cqw * 16 / 9))',
            }}
          />
        </div>
      ) : null}

      {/* 3. Dégradé de lisibilité sous l'en-tête transparent du shell. */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 top-0 h-36 bg-gradient-to-b from-black/70 via-black/30 to-transparent"
      />

      {/* 4. Calque de contrôle : tout le cadre est un seul bouton son. */}
      {videoId ? (
        <button
          type="button"
          onClick={toggleSound}
          aria-label={soundOff ? 'Ouvir com som' : 'Silenciar'}
          className="absolute inset-0 z-10 flex h-full w-full touch-manipulation select-none items-center justify-center focus-visible:outline-offset-[-6px]"
        >
          {soundOff ? (
            <span
              aria-hidden="true"
              className="inline-flex h-12 items-center gap-2 rounded-full bg-app-yellow px-6 text-base font-black text-[#171505] shadow-[0_8px_24px_rgba(0,0,0,0.45)]"
            >
              <VolumeX className="h-5 w-5" strokeWidth={2.5} />
              Toque para ouvir
            </span>
          ) : null}
        </button>
      ) : null}

      {renderOverlay ? renderOverlay(player) : null}
    </section>
  );
}
