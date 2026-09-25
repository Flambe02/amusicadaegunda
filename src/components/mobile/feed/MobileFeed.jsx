import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { ChevronUp, VolumeX } from 'lucide-react';
import FeedPoster from './FeedPoster';
import FeedOverlay from './FeedOverlay';
import { useShortPlayer } from './useShortPlayer';
import { CAIPIVARA_STAGE_IMAGE, getShortVideoId } from './feedMedia';

// YouTube superpose parfois son interface Shorts pendant toute la lecture (avatar de
// chaîne, muet et « ⋮ » en haut, j'aime/partager sur le bord droit, titre et chaîne en
// bas), à ~50–60 px des bords de l'iframe. On agrandit l'iframe au-delà du cadre
// « cover » pour que ces éléments tombent hors champ : ~73 % de la largeur et ~82 %
// de la hauteur de la vidéo restent visibles (décision du 2026-09-25).
const SHORTS_UI_ZOOM = 1.22;

// Glissement entre semaines (étape 4b).
const SWIPE_DISTANCE = 0.2; // part de la hauteur à dépasser pour changer de chanson
const SWIPE_VELOCITY = 0.5; // px/ms : un geste vif suffit, même court
const AXIS_LOCK_PX = 8; // au-delà, on décide si le geste est vertical ou horizontal
const EDGE_RESISTANCE = 0.25; // aux extrémités, le cadre ne suit le doigt qu'à 25 %
const SLIDE_MS = 300;
const EASE_DRAWER = 'cubic-bezier(0.32, 0.72, 0, 1)'; // courbe de tiroir façon iOS
const HINT_KEY = 'amds-feed-swiped';

function readSwiped() {
  try {
    return localStorage.getItem(HINT_KEY) === '1';
  } catch {
    return false;
  }
}

function prefersReducedMotion() {
  return typeof window !== 'undefined' && typeof window.matchMedia === 'function'
    ? window.matchMedia('(prefers-reduced-motion: reduce)').matches
    : false;
}

function isTypingTarget(target) {
  const tag = target?.tagName;
  return tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || target?.isContentEditable;
}

/**
 * Feed plein écran de l'Início mobile (< 768 px), façon TikTok.
 *
 * `songs` : la plus récente en premier. Glisser vers le HAUT → semaine précédente
 * (plus ancienne) ; vers le BAS → retour vers la plus récente. Jamais de glissement
 * horizontal (il concurrence le geste retour d'iOS). Mêmes changements au clavier
 * (flèches) et par deux boutons accessibles.
 *
 * Un seul lecteur YouTube pour tout le feed (useShortPlayer) : son iframe vit dans la
 * diapositive courante, qui n'est jamais démontée. Les voisines n'affichent que leur
 * miniature — c'est tout le préchargement.
 *
 * Sans aucune chanson (Supabase ET repli statique indisponibles), la scène Caipivara
 * s'affiche : jamais d'écran vide ni de message « nenhuma música ».
 */
export default function MobileFeed({ songs = [], buildArtwork = null, onShowLyrics }) {
  const [index, setIndex] = useState(0);
  const [firstPosterSettled, setFirstPosterSettled] = useState(false);
  const [swipedEver, setSwipedEver] = useState(readSwiped);
  const [announce, setAnnounce] = useState('');

  const stageRef = useRef(null);
  const trackRef = useRef(null);
  const mountRef = useRef(null);
  const gestureRef = useRef(null);
  const suppressClickRef = useRef(false);
  const animatingRef = useRef(false);

  const safeIndex = Math.min(index, Math.max(songs.length - 1, 0));
  const current = songs[safeIndex] || null;
  const newer = safeIndex > 0 ? songs[safeIndex - 1] : null;
  const older = safeIndex + 1 < songs.length ? songs[safeIndex + 1] : null;

  const videoId = getShortVideoId(current);
  const player = useShortPlayer({ videoId, canLoad: firstPosterSettled, mountRef });
  const { phase, isMuted, toggleSound } = player;
  const videoVisible = phase === 'playing';
  const soundOff = isMuted || !player.isPlaying;

  // Filet : si la première miniature ne finit jamais de charger, on lance le lecteur.
  useEffect(() => {
    if (firstPosterSettled) return undefined;
    const id = setTimeout(() => setFirstPosterSettled(true), 2500);
    return () => clearTimeout(id);
  }, [firstPosterSettled]);

  const setTrack = (offsetPx, animate) => {
    const track = trackRef.current;
    if (!track) return;
    track.style.transition = animate ? `transform ${SLIDE_MS}ms ${EASE_DRAWER}` : 'none';
    track.style.transform = offsetPx ? `translate3d(0, ${offsetPx}px, 0)` : '';
  };

  // Après un changement de chanson, la nouvelle courante est à 0 : on remet la piste
  // à plat AVANT la peinture, sans transition — la bascule est invisible.
  useLayoutEffect(() => {
    setTrack(0, false);
    animatingRef.current = false;
  }, [safeIndex]);

  const markSwiped = () => {
    if (swipedEver) return;
    setSwipedEver(true);
    try {
      localStorage.setItem(HINT_KEY, '1');
    } catch {
      /* stockage indisponible : l'indice réapparaîtra, sans gravité */
    }
  };

  /** direction +1 = semaine précédente (plus ancienne), -1 = plus récente. */
  const go = useCallback(
    (direction) => {
      const target = safeIndex + direction;
      if (target < 0 || target >= songs.length || animatingRef.current) return false;
      markSwiped();
      const song = songs[target];
      setAnnounce(`${song.title}`);
      const height = stageRef.current?.clientHeight || 0;
      if (prefersReducedMotion() || !height) {
        setIndex(target);
        return true;
      }
      animatingRef.current = true;
      setTrack(-direction * height, true);
      const track = trackRef.current;
      const done = () => {
        track?.removeEventListener('transitionend', done);
        clearTimeout(timer);
        setIndex(target);
      };
      const timer = setTimeout(done, SLIDE_MS + 80);
      track?.addEventListener('transitionend', done);
      return true;
    },
    [safeIndex, songs] // eslint-disable-line react-hooks/exhaustive-deps
  );

  // ── Geste vertical ────────────────────────────────────────────────────────────────
  const onPointerDown = (event) => {
    if (event.pointerType === 'mouse' && event.button !== 0) return;
    if (animatingRef.current) return;
    gestureRef.current = { id: event.pointerId, x: event.clientX, y: event.clientY, t: event.timeStamp, axis: null, dy: 0 };
  };

  const onPointerMove = (event) => {
    const g = gestureRef.current;
    if (!g || g.id !== event.pointerId) return;
    const dx = event.clientX - g.x;
    const dy = event.clientY - g.y;
    if (!g.axis) {
      if (Math.abs(dx) < AXIS_LOCK_PX && Math.abs(dy) < AXIS_LOCK_PX) return;
      g.axis = Math.abs(dy) > Math.abs(dx) ? 'y' : 'x';
      if (g.axis === 'y') stageRef.current?.setPointerCapture?.(event.pointerId);
    }
    if (g.axis !== 'y') return; // horizontal : on laisse faire le navigateur
    const blocked = (dy < 0 && !older) || (dy > 0 && !newer);
    g.dy = dy;
    if (!prefersReducedMotion()) setTrack(blocked ? dy * EDGE_RESISTANCE : dy, false);
  };

  const endGesture = (event, cancelled = false) => {
    const g = gestureRef.current;
    gestureRef.current = null;
    if (!g || g.id !== event.pointerId || g.axis !== 'y') return;
    suppressClickRef.current = true; // le geste ne doit pas aussi couper/rétablir le son
    const height = stageRef.current?.clientHeight || 1;
    const velocity = g.dy / Math.max(event.timeStamp - g.t, 1);
    let moved = false;
    if (!cancelled) {
      if ((g.dy < -height * SWIPE_DISTANCE || velocity < -SWIPE_VELOCITY) && older) moved = go(+1);
      else if ((g.dy > height * SWIPE_DISTANCE || velocity > SWIPE_VELOCITY) && newer) moved = go(-1);
    }
    if (!moved) setTrack(0, !prefersReducedMotion());
  };

  const onClickCapture = (event) => {
    if (!suppressClickRef.current) return;
    suppressClickRef.current = false;
    event.stopPropagation();
    event.preventDefault();
  };

  // ── Clavier : flèche bas = semaine précédente, flèche haut = plus récente ─────────
  useEffect(() => {
    const onKeyDown = (event) => {
      if (event.key !== 'ArrowDown' && event.key !== 'ArrowUp') return;
      if (event.altKey || event.ctrlKey || event.metaKey || isTypingTarget(event.target)) return;
      if (document.querySelector('[role="dialog"]')) return; // Letra ouverte, menu…
      const moved = go(event.key === 'ArrowDown' ? +1 : -1);
      if (moved) event.preventDefault();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [go]);

  if (!current) {
    return (
      <div className="relative h-full w-full overflow-hidden bg-app-black" data-feed-phase="stage">
        <img
          src={CAIPIVARA_STAGE_IMAGE}
          alt="A Caipivara, mascote da Música da Segunda"
          className="absolute inset-0 h-full w-full object-contain object-bottom p-8"
        />
      </div>
    );
  }

  return (
    <section
      ref={stageRef}
      className="relative h-full w-full select-none overflow-hidden bg-app-black [container-type:size] [touch-action:pan-x_pinch-zoom]"
      aria-label={current.title}
      data-feed-phase={phase}
      data-feed-index={safeIndex}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={(event) => endGesture(event)}
      onPointerCancel={(event) => endGesture(event, true)}
      onClickCapture={onClickCapture}
    >
      <div ref={trackRef} className="absolute inset-0 will-change-transform">
        {/* Voisines : miniature et titre seulement (préchargement), hors champ. */}
        {newer ? <NeighbourSlide song={newer} buildArtwork={buildArtwork} position="-100%" /> : null}
        {older ? <NeighbourSlide song={older} buildArtwork={buildArtwork} position="100%" /> : null}

        {/* Diapositive courante — jamais démontée : l'iframe unique y vit. */}
        <div className="absolute inset-0">
          <FeedPoster
            key={current.id ?? current.title}
            song={current}
            buildArtwork={buildArtwork}
            priority={safeIndex === 0}
            onSettled={() => setFirstPosterSettled(true)}
          />

          {/* Vidéo : iframe 9:16 en « cover », agrandie de SHORTS_UI_ZOOM pour sortir
              l'interface YouTube du champ. Masquée sans transition au changement de
              chanson, fondu seulement à l'apparition. */}
          <div
            aria-hidden="true"
            className={`pointer-events-none absolute inset-0 ${
              videoVisible
                ? 'opacity-100 transition-opacity duration-500 ease-out motion-reduce:transition-none'
                : 'opacity-0'
            }`}
          >
            <div
              ref={mountRef}
              className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 [&>iframe]:h-full [&>iframe]:w-full"
              style={{
                width: `calc(max(100cqw, 100cqh * 9 / 16) * ${SHORTS_UI_ZOOM})`,
                height: `calc(max(100cqh, 100cqw * 16 / 9) * ${SHORTS_UI_ZOOM})`,
              }}
            />
          </div>

          {/* Bouton son plein cadre (seulement s'il y a une vidéo). */}
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

          <FeedOverlay
            song={current}
            player={player}
            isFirst={safeIndex === 0}
            onShowLyrics={() => onShowLyrics?.(current)}
          />

          {older && !swipedEver ? <SwipeHint /> : null}
        </div>
      </div>

      {/* Dégradé de lisibilité sous l'en-tête transparent du shell (fixe). */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 top-0 h-36 bg-gradient-to-b from-black/70 via-black/30 to-transparent"
      />

      {/* Mêmes changements que le glissement, pour le clavier et les lecteurs d'écran :
          invisibles jusqu'à ce qu'ils reçoivent le focus. Absents aux extrémités. */}
      <div className="absolute left-3 top-[calc(max(env(safe-area-inset-top),0.35rem)+5.5rem)] z-40 flex flex-col gap-2">
        {newer ? (
          <button type="button" onClick={() => go(-1)} aria-label="Semana seguinte" className={SR_NAV_BUTTON}>
            Semana seguinte
          </button>
        ) : null}
        {older ? (
          <button type="button" onClick={() => go(+1)} aria-label="Semana anterior" className={SR_NAV_BUTTON}>
            Semana anterior
          </button>
        ) : null}
      </div>

      <p className="sr-only" aria-live="polite">{announce}</p>
    </section>
  );
}

const SR_NAV_BUTTON =
  'sr-only rounded-full bg-black/70 px-4 py-2 text-sm font-semibold text-white focus:not-sr-only focus-visible:not-sr-only';

function NeighbourSlide({ song, buildArtwork, position }) {
  return (
    <div aria-hidden="true" className="absolute inset-0" style={{ transform: `translate3d(0, ${position}, 0)` }}>
      <FeedPoster song={song} buildArtwork={buildArtwork} />
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-[45%] bg-gradient-to-t from-black/80 via-black/40 to-transparent" />
      <p className="pointer-events-none absolute bottom-6 left-4 right-24 line-clamp-2 text-[28px] font-black leading-[1.1] tracking-tight text-white">
        {song.title}
      </p>
    </div>
  );
}

/** Indice discret, affiché tant que l'utilisateur n'a jamais changé de semaine. */
function SwipeHint() {
  return (
    <div className="pointer-events-none absolute inset-x-0 bottom-28 z-20 flex justify-center">
      <span className="inline-flex items-center gap-1.5 rounded-full bg-black/50 px-3 py-1.5 text-[11px] font-semibold text-white/90 backdrop-blur-md">
        <ChevronUp className="h-4 w-4" aria-hidden="true" />
        Deslize para a semana anterior
      </span>
    </div>
  );
}
