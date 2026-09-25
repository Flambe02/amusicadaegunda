import { useCallback, useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { getPublicSlug } from '@/components/mobile/feed/feedMedia';
import { ANIMATIONS, IDLE_CLIP, pickAnimation, pickSong } from './stageDraw';

// Filet : si une animation ne se termine jamais (lecture refusée, réseau), on montre
// quand même le résultat.
const ANIMATION_TIMEOUT_MS = 7000;
const CROSSFADE = 'transition-opacity duration-150 ease-out';
// Les bords de la vidéo se fondent dans le fond de la page : aucun rectangle visible.
const EDGE_MASK = 'radial-gradient(ellipse closest-side at 50% 50%, #000 62%, transparent 100%)';

function prefersReducedMotion() {
  return typeof window !== 'undefined' && typeof window.matchMedia === 'function'
    ? window.matchMedia('(prefers-reduced-motion: reduce)').matches
    : false;
}

function playSafely(video) {
  // play() ne renvoie pas toujours une promesse (anciens navigateurs, jsdom).
  const attempt = video?.play?.();
  if (attempt && typeof attempt.catch === 'function') attempt.catch(() => {});
}

/**
 * Catálogo — la scène de la Caipivara (addendum catálogo §B, étape 9).
 *
 * Un écran plein comme une scène : la Caipivara, grande et centrée, joue sa boucle de
 * repos ; c'est la seule chose qui bouge. Toute sa surface est un bouton : au tap, une
 * des trois animations (jamais deux fois la même à la suite) joue une fois par-dessus la
 * boucle (fondu enchaîné court), puis la ligne propose une musique tirée au hasard parmi
 * les publiées (jamais celle qui vient d'être proposée) avec « Ouvir » (le seul jaune de
 * l'écran) et « Outra ». Taps répétés pendant une animation : ignorés.
 *
 * Halo : celui qui est déjà dans les vidéos (projecteur, lueur au sol), bords fondus
 * par un masque radial — pas de halo CSS ajouté (addendum §G.4).
 * Mouvement réduit : affiche fixe de la boucle de repos, aucune animation, le résultat
 * s'affiche directement.
 * Chargement : la boucle de repos au chargement ; les animations en preload="metadata",
 * chargées au premier tap ou quand le navigateur est inactif.
 */
export default function CaipivaraStage({ songs = [] }) {
  const reduceMotion = prefersReducedMotion();
  const [stage, setStage] = useState('idle'); // idle | animating | result
  const [animation, setAnimation] = useState(null);
  const [proposal, setProposal] = useState(null);
  const [warmAnimations, setWarmAnimations] = useState(false);

  const busyRef = useRef(false);
  const lastAnimationRef = useRef(null);
  const lastSongRef = useRef(null);
  const pendingSongRef = useRef(null);
  const videoRefs = useRef({});
  const timeoutRef = useRef(null);
  // Liste toujours à jour pour la fin d'animation (le catalogue peut arriver pendant).
  const songsRef = useRef(songs);
  songsRef.current = songs;

  // Préchargement des trois animations quand le navigateur est inactif.
  useEffect(() => {
    if (reduceMotion) return undefined;
    const warm = () => setWarmAnimations(true);
    if (typeof window.requestIdleCallback === 'function') {
      const id = window.requestIdleCallback(warm, { timeout: 4000 });
      return () => window.cancelIdleCallback?.(id);
    }
    const id = setTimeout(warm, 2500);
    return () => clearTimeout(id);
  }, [reduceMotion]);

  useEffect(() => () => clearTimeout(timeoutRef.current), []);

  const finish = useCallback(() => {
    clearTimeout(timeoutRef.current);
    if (!busyRef.current) return;
    busyRef.current = false;
    setAnimation(null); // retour à la boucle de repos (fondu)
    // Tap fait avant l'arrivée du catalogue : on tire la chanson maintenant.
    const song = pendingSongRef.current || pickSong(songsRef.current, lastSongRef.current);
    if (!song) {
      setStage('idle'); // catalogue toujours indisponible : retour à l'invitation
      return;
    }
    lastSongRef.current = song;
    setProposal(song);
    setStage('result');
  }, []);

  const draw = useCallback(() => {
    if (busyRef.current) return; // tap pendant une animation : ignoré
    // Le catalogue peut ne pas être encore là : l'animation part quand même, la chanson
    // sera tirée à la fin (finish).
    const song = pickSong(songs, lastSongRef.current);

    if (reduceMotion) {
      if (!song) return;
      lastSongRef.current = song;
      setProposal(song);
      setStage('result');
      return;
    }

    const next = pickAnimation(lastAnimationRef.current);
    lastAnimationRef.current = next.key;
    pendingSongRef.current = song;
    busyRef.current = true;
    setWarmAnimations(true);
    setAnimation(next);
    setStage('animating');

    const video = videoRefs.current[next.key];
    if (video) {
      try {
        video.currentTime = 0;
      } catch {
        /* métadonnées pas encore chargées */
      }
      playSafely(video);
    }
    timeoutRef.current = setTimeout(finish, ANIMATION_TIMEOUT_MS);
  }, [songs, reduceMotion, finish]);

  const slug = proposal ? getPublicSlug(proposal) : null;

  return (
    <div className="relative flex h-full w-full flex-col items-center overflow-hidden bg-app-black text-white [container-type:size]">
      <h1 className="sr-only">Catálogo de músicas</h1>

      <div className="flex min-h-0 w-full flex-1 items-center justify-center pt-4">
        <button
          type="button"
          onClick={draw}
          aria-label="Toque na Caipivara e ela escolhe uma música pra você"
          aria-busy={stage === 'animating'}
          data-stage={stage}
          className="relative aspect-[9/16] touch-manipulation select-none rounded-[40px] focus-visible:outline-offset-4"
          style={{ width: 'min(64cqw, 250px, calc((100cqh - 190px) * 0.5625))' }}
        >
          <div
            aria-hidden="true"
            className="absolute inset-0"
            style={{ WebkitMaskImage: EDGE_MASK, maskImage: EDGE_MASK }}
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
                  <source src={IDLE_CLIP.webm} type="video/webm" />
                  <source src={IDLE_CLIP.mp4} type="video/mp4" />
                </video>
                {ANIMATIONS.map((clip) => (
                  <video
                    key={clip.key}
                    ref={(element) => { videoRefs.current[clip.key] = element; }}
                    className={`absolute inset-0 h-full w-full object-cover ${CROSSFADE} ${
                      animation?.key === clip.key ? 'opacity-100' : 'opacity-0'
                    }`}
                    muted
                    playsInline
                    preload={warmAnimations ? 'auto' : 'metadata'}
                    disablePictureInPicture
                    data-clip={clip.key}
                    onEnded={animation?.key === clip.key ? finish : undefined}
                  >
                    <source src={clip.webm} type="video/webm" />
                    <source src={clip.mp4} type="video/mp4" />
                  </video>
                ))}
              </>
            )}
          </div>
        </button>
      </div>

      <div aria-live="polite" className="flex min-h-[8.5rem] w-full flex-col items-center px-6 pb-6 pt-2 text-center">
        {stage === 'idle' ? (
          <p className="max-w-[20rem] text-xl font-extrabold leading-snug">
            Toque em mim e eu escolho uma música pra você.
          </p>
        ) : null}
        {stage === 'animating' && animation ? (
          <p className="max-w-[20rem] text-xl font-extrabold leading-snug">{animation.line}</p>
        ) : null}
        {stage === 'result' && proposal ? (
          <>
            <p className="max-w-[20rem] text-xl font-extrabold leading-snug">
              Que tal “{proposal.title}”?
            </p>
            <div className="mt-4 flex items-center gap-3">
              {slug ? (
                <Link
                  to={`/?musica=${encodeURIComponent(slug)}`}
                  className="inline-flex h-12 touch-manipulation items-center rounded-full bg-app-yellow px-6 text-base font-black text-[#171505] active:scale-95"
                >
                  Ouvir
                </Link>
              ) : null}
              <button
                type="button"
                onClick={draw}
                className="inline-flex h-12 touch-manipulation items-center rounded-full border border-white/30 px-6 text-base font-bold text-white active:bg-white/10"
              >
                Outra
              </button>
            </div>
          </>
        ) : null}
      </div>
    </div>
  );
}
