import { useCallback, useEffect, useRef, useState } from 'react';
import { Pause, Play, SkipForward, VolumeX } from 'lucide-react';
import { useShortPlayer } from '@/components/mobile/feed/useShortPlayer';
import FeedStorySheet from '@/components/mobile/feed/FeedStorySheet';
import WeekRibbon from '@/components/mobile/feed/WeekRibbon';
import { Rail, RailButton, RailLink } from '@/components/mobile/feed/FeedRail';
import { useShareSong } from '@/components/mobile/feed/useShareSong';
import { formatTime, getPublicSlug } from '@/components/mobile/feed/feedMedia';
import {
  ClipFilled,
  LyricsSheetFilled,
  MicFilled,
  NewspaperFilled,
  ShareArrowFilled,
} from '@/components/mobile/icons/FilledIcons';
import LyricsDialog from '@/components/LyricsDialog';
import { isKaraokePublished } from '@/lib/lrc';
import { ANIMATIONS, DANCE_CLIP, IDLE_CLIP, getSongAudioId, pickAnimation, pickSong } from './stageDraw';

// Filet : si une animation ne se termine jamais (lecture refusée, réseau), on rend la
// main à la boucle de repos ou de danse.
const ANIMATION_TIMEOUT_MS = 7000;
const PROGRESS_POLL_MS = 250;
const CROSSFADE = 'transition-opacity duration-150 ease-out';
// flip et samba ne finissent pas dans la pose de repos : fondu plus long pour adoucir le
// raccord (décision du 2026-09-25).
const CROSSFADE_LONG = 'transition-opacity duration-[400ms] ease-out';
// Les bords de la vidéo se fondent dans le fond de la page : aucun rectangle visible.
const EDGE_MASK = 'radial-gradient(ellipse closest-side at 50% 50%, #000 62%, transparent 100%)';

// « Ou toque em mim » : affiché jusqu'au premier changement de chanson par un tap sur
// la Caipivara, puis plus jamais sur cet appareil (comme l'indice « Deslize » du feed).
const RETAP_HINT_KEY = 'amds-catalogo-retap';

function readRetapUsed() {
  try {
    return localStorage.getItem(RETAP_HINT_KEY) === '1';
  } catch {
    return false;
  }
}

function rememberRetapUsed() {
  try {
    localStorage.setItem(RETAP_HINT_KEY, '1');
  } catch {
    /* stockage indisponible : l'indice reviendra, sans gêne */
  }
}

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

function ClipSources({ clip }) {
  return (
    <>
      <source src={clip.webm} type="video/webm" />
      <source src={clip.mp4} type="video/mp4" />
    </>
  );
}

/** Fine barre de progression (lecture seule), lue sur le lecteur. */
function SongProgress({ player }) {
  const [time, setTime] = useState({ current: 0, duration: 0 });
  const { getCurrentTime, getDuration } = player;

  useEffect(() => {
    const read = () => {
      const current = getCurrentTime();
      const duration = getDuration();
      setTime((previous) =>
        previous.current === current && previous.duration === duration ? previous : { current, duration }
      );
    };
    read();
    const id = setInterval(read, PROGRESS_POLL_MS);
    return () => clearInterval(id);
  }, [getCurrentTime, getDuration]);

  const ratio = time.duration > 0 ? Math.min(1, time.current / time.duration) : 0;
  return (
    <div
      role="progressbar"
      aria-label="Progresso da música"
      aria-valuemin={0}
      aria-valuemax={Math.round(time.duration)}
      aria-valuenow={Math.round(time.current)}
      aria-valuetext={`${formatTime(time.current)} de ${formatTime(time.duration)}`}
      className="h-[3px] w-full overflow-hidden rounded-full bg-white/20"
    >
      <div
        className="h-full w-full origin-left rounded-full bg-white"
        style={{ transform: `scaleX(${ratio})` }}
      />
    </div>
  );
}

/**
 * Catálogo — la scène de la Caipivara (addendum catálogo §B, refonte audio du
 * 2026-09-25, sur le principe de la Roda : c'est la musique qui se lance, pas la vidéo).
 *
 * Musique : même source que la Roda (`youtube_url`, la chanson entière) sur le même
 * moteur que le feed (`useShortPlayer`, un seul lecteur YouTube, ici invisible et sans
 * boucle). Contrainte iOS : le son doit partir DANS le geste. Le lecteur est donc créé
 * dès l'arrivée sur la page avec une première chanson tirée d'avance, qui tourne en
 * muet et invisible ; le premier tap la reprend au début et rétablit le son (même
 * chemin que le premier tap du feed). Les taps suivants chargent la chanson suivante
 * sur le même lecteur, toujours dans le geste (`loadNow`).
 *
 * Tap sur la Caipivara : une animation (jamais deux fois la même à la suite) + une
 * chanson (jamais la précédente). Puis boucle de danse tant que la musique joue avec
 * le son ; boucle de repos en pause, à la fin, ou si le navigateur a refusé le son
 * (le bouton ▶ le relance). Pas de changement de page.
 *
 * Mouvement réduit : image fixe, la musique part directement.
 *
 * Calque « Ouvir » du feed (addendum H.9) : `player` est alors le lecteur du feed, qui
 * joue déjà `initialSong` (chargée dans le geste du tap sur Ouvir) — la scène ne crée
 * pas le sien et signale chaque changement de chanson par `onSongChange`, pour que le
 * feed garde son `videoId` aligné (pas de rechargement). Si le son n'a pas pu partir
 * (lecteur pas prêt, ouverture directe de l'adresse), « Toque para ouvir » le relance.
 * `ribbonTop` : position du ruban (sous l'en-tête transparent de l'Início).
 */
export default function CaipivaraStage({ songs = [], player: externalPlayer = null, initialSong = null, onSongChange, ribbonTop = 'top-3' }) {
  const reduceMotion = prefersReducedMotion();
  const external = Boolean(externalPlayer);
  const [current, setCurrent] = useState(initialSong); // chanson jouée (après le premier tap)
  const [queued, setQueued] = useState(null); // tirée d'avance, en muet dans le lecteur
  const [animation, setAnimation] = useState(null);
  const [warmAnimations, setWarmAnimations] = useState(false);
  const [storyOpen, setStoryOpen] = useState(false);
  const [lyricsOpen, setLyricsOpen] = useState(false);
  const [retapUsed, setRetapUsed] = useState(readRetapUsed);

  const mountRef = useRef(null);
  const storyButtonRef = useRef(null);
  const busyRef = useRef(false);
  const lastAnimationRef = useRef(null);
  const currentRef = useRef(initialSong);
  const pendingStartRef = useRef(false);
  const videoRefs = useRef({});
  const danceRef = useRef(null);
  const timeoutRef = useRef(null);

  // Première chanson tirée d'avance, dès que le catalogue est là.
  useEffect(() => {
    if (!queued && !current) {
      const song = pickSong(songs, null);
      if (song) setQueued(song);
    }
  }, [songs, queued, current]);

  const playing = current || queued;
  // Toujours appelé (règle des hooks) ; inerte quand la scène emprunte le lecteur du feed.
  const ownPlayer = useShortPlayer({
    videoId: external ? null : getSongAudioId(playing),
    canLoad: !external && Boolean(playing),
    mountRef,
    loop: false,
  });
  const player = externalPlayer || ownPlayer;
  const playerRef = useRef(player);
  playerRef.current = player;

  // Calque Ouvir : le feed suit la chanson jouée (il a déjà chargé la vidéo dans le geste).
  useEffect(() => {
    if (external && current) onSongChange?.(current);
  }, [external, current, onSongChange]);

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

  const finishAnimation = useCallback(() => {
    clearTimeout(timeoutRef.current);
    busyRef.current = false;
    setAnimation(null); // retour à la boucle (danse ou repos), fondu
  }, []);

  const startAnimation = useCallback(() => {
    if (reduceMotion) return;
    const next = pickAnimation(lastAnimationRef.current);
    lastAnimationRef.current = next.key;
    busyRef.current = true;
    setWarmAnimations(true);
    setAnimation(next);
    const video = videoRefs.current[next.key];
    if (video) {
      try {
        video.currentTime = 0;
      } catch {
        /* métadonnées pas encore chargées */
      }
      playSafely(video);
    }
    timeoutRef.current = setTimeout(finishAnimation, ANIMATION_TIMEOUT_MS);
  }, [reduceMotion, finishAnimation]);

  /** Lance une chanson avec le son — appelé dans le geste. */
  const startSong = useCallback((song, preloaded) => {
    const p = playerRef.current;
    if (preloaded) {
      // Déjà chargée en muet : on la reprend au début et on rétablit le son.
      p.play();
      p.seekTo(0);
      p.unmute();
    } else if (!p.loadNow(getSongAudioId(song))) {
      p.unmute(); // lecteur pas prêt : le son sera appliqué à sa création
    }
    currentRef.current = song;
    setCurrent(song);
    setStoryOpen(false);
    setLyricsOpen(false);
  }, []);

  const draw = useCallback(() => {
    if (busyRef.current) return; // tap pendant une animation : ignoré
    startAnimation();
    if (currentRef.current && !retapUsed) {
      // Changement de chanson par la Caipivara : l'indice a servi.
      rememberRetapUsed();
      setRetapUsed(true);
    }
    if (!currentRef.current && queued) {
      startSong(queued, true);
      return;
    }
    const song = pickSong(songs, currentRef.current);
    if (song) startSong(song, false);
    else pendingStartRef.current = true; // catalogue pas encore là : dès qu'il arrive
  }, [queued, songs, startAnimation, startSong, retapUsed]);

  /** « Outra » : même tirage que le tap sur la Caipivara (animation + chanson suivante). */
  const next = useCallback(() => {
    if (busyRef.current) return;
    startAnimation();
    const song = pickSong(songs, currentRef.current);
    if (song) startSong(song, false);
  }, [songs, startAnimation, startSong]);

  // Tap fait avant l'arrivée du catalogue : la musique part dès qu'il est là (hors du
  // geste — si le navigateur refuse le son, le bouton ▶ le relance).
  useEffect(() => {
    if (!pendingStartRef.current || currentRef.current) return;
    const song = pickSong(songs, null);
    if (!song) return;
    pendingStartRef.current = false;
    startSong(song, false);
  }, [songs, startSong]);

  const soundOn = player.isSoundOn;
  const dancing = !reduceMotion && !animation && soundOn;

  useEffect(() => {
    const video = danceRef.current;
    if (!video) return;
    if (dancing) playSafely(video);
    else video.pause?.();
  }, [dancing]);

  const togglePlayback = () => {
    if (soundOn) {
      player.pause();
    } else {
      player.play();
      player.unmute();
    }
  };

  const slug = current ? getPublicSlug(current) : null;
  const hasStory = Boolean(String(current?.description || '').trim());
  const canSing = Boolean(current) && isKaraokePublished(current) && Boolean(slug);
  const { share, linkSheet } = useShareSong(current || {});

  return (
    <div className="relative flex h-full w-full flex-col items-center overflow-hidden bg-app-black text-white [container-type:size]">
      {/* Dans le calque Ouvir, le h1 de la page reste le titre du feed. */}
      {external
        ? <h2 className="sr-only">Catálogo de músicas</h2>
        : <h1 className="sr-only">Catálogo de músicas</h1>}

      {/* Lecteur YouTube invisible : on n'en garde que le son. Dans le calque Ouvir, c'est
          celui du feed, déjà monté sous le calque. */}
      {external ? null : (
        <div
          ref={mountRef}
          aria-hidden="true"
          data-audio-player
          className="pointer-events-none fixed left-0 top-0 -z-10 h-[200px] w-[200px] opacity-0"
        />
      )}

      {/* Ruban éphémère du feed, à chaque nouvelle chanson (rien avant le premier tap). */}
      <WeekRibbon song={current} phase={player.phase} topClass={ribbonTop} />

      <div className="relative flex min-h-0 w-full flex-1 flex-col items-center justify-center pt-4">
        <button
          type="button"
          onClick={draw}
          aria-label="Toque na Caipivara e ela escolhe uma música pra você"
          data-stage={animation ? 'animating' : dancing ? 'dancing' : 'idle'}
          className="relative aspect-[9/16] touch-manipulation select-none rounded-[40px] focus-visible:outline-offset-4"
          // 170 px : la colonne d'icônes (≈ 78 px avec sa marge) de chaque côté, plus un peu d'air — elle
          // ne doit jamais mordre sur la zone tactile de la Caipivara (vérifié à 360 px).
          style={{ width: 'min(64cqw, 250px, calc(100cqw - 170px), calc((100cqh - 230px) * 0.5625))' }}
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
                  <ClipSources clip={IDLE_CLIP} />
                </video>
                <video
                  ref={danceRef}
                  className={`absolute inset-0 h-full w-full object-cover ${CROSSFADE} ${
                    dancing ? 'opacity-100' : 'opacity-0'
                  }`}
                  muted
                  loop
                  playsInline
                  preload={warmAnimations ? 'auto' : 'metadata'}
                  disablePictureInPicture
                  data-clip="dance"
                >
                  <ClipSources clip={DANCE_CLIP} />
                </video>
                {ANIMATIONS.map((clip) => (
                  <video
                    key={clip.key}
                    ref={(element) => { videoRefs.current[clip.key] = element; }}
                    className={`absolute inset-0 h-full w-full object-cover ${clip.longFade ? CROSSFADE_LONG : CROSSFADE} ${
                      animation?.key === clip.key ? 'opacity-100' : 'opacity-0'
                    }`}
                    muted
                    playsInline
                    preload={warmAnimations ? 'auto' : 'metadata'}
                    disablePictureInPicture
                    data-clip={clip.key}
                    onEnded={animation?.key === clip.key ? finishAnimation : undefined}
                  >
                    <ClipSources clip={clip} />
                  </video>
                ))}
              </>
            )}
          </div>
        </button>

        {/* Calque Ouvir : si le son n'a pas pu partir dans le geste, « Toque para ouvir »
            (seul jaune de la zone) le relance. */}
        {external && current && player.isMuted ? (
          <button
            type="button"
            onClick={() => {
              player.play();
              player.unmute();
            }}
            className="mt-2 inline-flex h-12 touch-manipulation items-center gap-2 rounded-full bg-app-yellow px-6 text-base font-black text-[#171505] active:opacity-80"
          >
            <VolumeX className="h-5 w-5" strokeWidth={2.5} aria-hidden="true" />
            Toque para ouvir
          </button>
        ) : current && !retapUsed ? (
          <p className="mt-1 text-sm font-medium text-white/60">Ou toque em mim</p>
        ) : null}

        {/* Colonne d'icônes, identique au feed : Letra, História, Cantar, Compartilhar, Clipe. */}
        {current ? (
          <Rail className="absolute bottom-2 right-1.5">
            <RailButton
              label="Letra"
              onClick={() => setLyricsOpen(true)}
              icon={LyricsSheetFilled}
              ariaLabel={`Ver a letra de ${current.title}`}
            />
            {hasStory ? (
              <RailButton
                buttonRef={storyButtonRef}
                label="História"
                onClick={() => setStoryOpen(true)}
                icon={NewspaperFilled}
                ariaLabel={`Ler a história de ${current.title}`}
              />
            ) : null}
            {canSing ? (
              <RailLink
                label="Cantar"
                to={`/karaoke?musica=${encodeURIComponent(slug)}`}
                icon={MicFilled}
                ariaLabel={`Cantar ${current.title} no karaokê`}
              />
            ) : null}
            <RailButton label="Compartilhar" onClick={share} icon={ShareArrowFilled} ariaLabel={`Compartilhar ${current.title}`} />
            {slug ? (
              <RailLink
                label="Clipe"
                to={`/?musica=${encodeURIComponent(slug)}`}
                icon={ClipFilled}
                ariaLabel={`Ver o clipe de ${current.title}`}
              />
            ) : null}
          </Rail>
        ) : null}
      </div>

      {/* Bas de l'écran : titre, barre de progression, pause et « Outra » — rien d'autre. */}
      <div className="flex min-h-[7rem] w-full flex-col items-center px-6 pb-6 pt-2 text-center">
        {current ? (
          <div className="flex w-full max-w-[22rem] flex-col items-center">
            <div className="flex w-full items-center gap-2">
              <p aria-live="polite" className="min-w-0 flex-1 truncate text-left text-base font-bold leading-tight">
                {current.title}
              </p>
              <button
                type="button"
                onClick={togglePlayback}
                aria-label={soundOn ? 'Pausar' : 'Tocar'}
                className="flex h-11 w-11 flex-shrink-0 touch-manipulation items-center justify-center rounded-full border border-white/25 text-white active:bg-white/10"
              >
                {soundOn
                  ? <Pause className="h-5 w-5" fill="currentColor" aria-hidden="true" />
                  : <Play className="ml-0.5 h-5 w-5" fill="currentColor" aria-hidden="true" />}
              </button>
              <button
                type="button"
                onClick={next}
                aria-label="Outra música"
                className="flex h-11 flex-shrink-0 touch-manipulation items-center gap-1.5 rounded-full border border-white/25 pl-3 pr-4 text-sm font-semibold text-white active:bg-white/10"
              >
                <SkipForward className="h-4 w-4" fill="currentColor" aria-hidden="true" />
                Outra
              </button>
            </div>
            <div className="mt-3 w-full">
              <SongProgress player={player} />
            </div>
          </div>
        ) : (
          <p className="max-w-[20rem] text-xl font-extrabold leading-snug">
            Toque em mim e eu escolho uma música pra você.
          </p>
        )}
      </div>

      {current ? (
        <LyricsDialog
          open={lyricsOpen}
          onOpenChange={setLyricsOpen}
          song={current}
          title="Letras da Musica"
          maxHeight="h-96"
          showIcon={false}
        />
      ) : null}

      {linkSheet}

      {hasStory ? (
        <FeedStorySheet song={current} open={storyOpen} onOpenChange={setStoryOpen} returnFocusRef={storyButtonRef} />
      ) : null}
    </div>
  );
}
