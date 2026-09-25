import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { ChevronUp, Play } from 'lucide-react';
import FeedPoster from './FeedPoster';
import FeedOverlay from './FeedOverlay';
import { useShortPlayer } from './useShortPlayer';
import { CAIPIVARA_STAGE_IMAGE, getPublicSlug, getShortVideoId } from './feedMedia';
import { deriveSongSlug } from '@/lib/learnContent';
import { TEXT_SHADOW } from './feedStyles';
import { getPlatform } from '@/native';
import { isTV } from '@/tv/platform';
import CaipivaraStage from '@/components/mobile/catalogo/CaipivaraStage';
import { getSongAudioId } from '@/components/mobile/catalogo/stageDraw';

// Sous l'en-tête transparent de l'Início (52 px + zone de sécurité).
const HEADER_OFFSET = 'pt-[calc(max(env(safe-area-inset-top),0.35rem)+3.75rem)]';

// Agrandissement de l'iframe au-delà du cadre « cover ». À 1,0 (décision du
// 2026-09-25), la vidéo a exactement le cadrage de la miniature qui la précède.
// Conservé comme réglage : YouTube superpose parfois son interface Shorts pendant
// toute la lecture (avatar, muet et « ⋮ » en haut, j'aime/partager à droite, titre et
// chaîne en bas, jusqu'à ~85 px des bords) ; 1,22 la sortait du champ, au prix de
// ~27 % de largeur et ~18 % de hauteur coupées. Accepté tel quel à 1,0.
const SHORTS_UI_ZOOM = 1.0;

// Glissement entre semaines (étape 4b).
const SWIPE_DISTANCE = 0.2; // part de la hauteur à dépasser pour changer de chanson
const SWIPE_VELOCITY = 0.5; // px/ms : un geste vif suffit, même court
const AXIS_LOCK_PX = 8; // au-delà, on décide si le geste est vertical ou horizontal
const EDGE_RESISTANCE = 0.25; // aux extrémités, le cadre ne suit le doigt qu'à 25 %
const SLIDE_MS = 300;
const EASE_DRAWER = 'cubic-bezier(0.32, 0.72, 0, 1)'; // courbe de tiroir façon iOS
const HINT_KEY = 'amds-feed-swiped';
const SEEK_STEP_S = 5; // flèches gauche / droite
const SOUND_REFUSAL_CHECK_MS = 900; // délai avant de conclure que le son a été refusé

function readSwiped() {
  try {
    return localStorage.getItem(HINT_KEY) === '1';
  } catch {
    return false;
  }
}

/** Son sans geste préalable : seulement dans l'app Android, jamais sur TV. */
function canStartWithSound() {
  try {
    return getPlatform() === 'android' && !isTV();
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

// Espace sur un bouton ou un lien focalisé doit garder son rôle natif (l'activer).
function isActivatableTarget(target) {
  return Boolean(target?.closest?.('button, a, [role="button"], [role="slider"]'));
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
export default function MobileFeed({
  songs = [],
  buildArtwork = null,
  onShowLyrics,
  startSlug = null,
  onStartApplied,
  ouvirSlug = null,
  onOpenOuvir,
}) {
  const [index, setIndex] = useState(0);

  // Ouverture sur une chanson précise (« Ouvir » depuis Catálogo, /?musica=<slug>) :
  // le feed se place sur elle — le glissement reste possible dans les deux sens —,
  // son coupé comme à toute arrivée, puis le paramètre est retiré de l'URL. La liste
  // complète arrive après la chanson de la semaine : on attend qu'elle contienne le slug.
  // Le paramètre peut aussi arriver alors que le feed est déjà monté (recherche ouverte
  // depuis l'Início) : chaque nouveau paramètre est appliqué, une fois.
  const startAppliedRef = useRef(false);
  useEffect(() => {
    if (!startSlug) startAppliedRef.current = false;
  }, [startSlug]);
  useEffect(() => {
    if (!startSlug || startAppliedRef.current || !songs.length) return;
    const target = songs.findIndex((song) => getPublicSlug(song) === startSlug || deriveSongSlug(song) === startSlug);
    if (target < 0 && songs.length < 2) return; // catalogue pas encore complet
    startAppliedRef.current = true;
    if (target >= 0) setIndex(target);
    onStartApplied?.();
  }, [startSlug, songs, onStartApplied]);
  const [firstPosterSettled, setFirstPosterSettled] = useState(false);
  const [swipedEver, setSwipedEver] = useState(readSwiped);
  const [announce, setAnnounce] = useState('');

  const stageRef = useRef(null);
  const trackRef = useRef(null);
  const mountRef = useRef(null);
  const gestureRef = useRef(null);
  const suppressClickRef = useRef(false);
  const suppressTimerRef = useRef(null);
  const animatingRef = useRef(false);
  // Modèle TikTok : le PREMIER geste de la visite (tap, glissement, flèche, bouton)
  // active le son. Ensuite le son suit l'utilisateur (icône haut-parleur).
  const interactedRef = useRef(false);

  const safeIndex = Math.min(index, Math.max(songs.length - 1, 0));
  const current = songs[safeIndex] || null;
  const newer = safeIndex > 0 ? songs[safeIndex - 1] : null;
  const older = safeIndex + 1 < songs.length ? songs[safeIndex + 1] : null;

  // Calque « Ouvir » (/?ouvir=<slug>, addendum H.9) : le Catálogo s'ouvre au-dessus du
  // feed et emprunte SON lecteur — même iframe, jamais rechargée —, qui joue alors la
  // chanson complète (`youtube_url`) sans boucle. À la fermeture (Retour, Início, Clipe),
  // le même lecteur recharge le Short de la diapositive, son conservé.
  const ouvirSong = useMemo(
    () => (ouvirSlug ? songs.find((song) => getPublicSlug(song) === ouvirSlug || deriveSongSlug(song) === ouvirSlug) || null : null),
    [ouvirSlug, songs]
  );
  const ouvirOpen = Boolean(ouvirSong);
  const [audioSong, setAudioSong] = useState(null); // chanson jouée dans le calque
  useEffect(() => { setAudioSong(null); }, [ouvirSlug]);

  const videoId = ouvirOpen ? getSongAudioId(audioSong || ouvirSong) : getShortVideoId(current);
  // App Android (hors TV) : la WebView autorise le son sans geste (MainActivity) → la
  // chanson démarre avec le son, sans repère de départ. Site web et iOS : inchangés.
  const [startWithSound] = useState(canStartWithSound);
  const player = useShortPlayer({ videoId, canLoad: firstPosterSettled, mountRef, loop: !ouvirOpen, startWithSound });
  const { phase, isMuted, isPaused, toggleSound, togglePause } = player;
  const videoVisible = phase === 'playing';
  // Son coupé (état RÉEL du lecteur) : à l'arrivée, après « Silenciar », ou si le
  // navigateur a refusé le son (iOS, économie d'énergie).
  const showUnmute = isMuted;

  // Repère de départ (test iPhone du 2026-09-25, remplace la pastille) : un grand
  // bouton lecture blanc translucide au centre de la vidéo, visible dès l'arrivée et
  // jusqu'au premier geste de la visite, puis plus jamais — sauf si le son est refusé
  // (iOS, économie d'énergie). Le haut-parleur barré reste en haut à droite.
  const [playCue, setPlayCue] = useState(!startWithSound);
  const refusalTimerRef = useRef(null);
  useEffect(() => () => clearTimeout(refusalTimerRef.current), []);
  /** Après un geste qui demande le son : s'il reste coupé, le repère revient. */
  const watchForRefusal = () => {
    clearTimeout(refusalTimerRef.current);
    refusalTimerRef.current = setTimeout(() => {
      if (playerRef.current.isMuted && playerRef.current.phase !== 'none') setPlayCue(true);
    }, SOUND_REFUSAL_CHECK_MS);
  };
  const requestSound = () => {
    interactedRef.current = true;
    setPlayCue(false);
    playerRef.current.unmute();
    watchForRefusal();
  };

  // go() est mémoïsé : on lit le lecteur par une ref toujours à jour.
  const playerRef = useRef(player);
  playerRef.current = player;

  const activateSoundOnce = () => {
    if (interactedRef.current) return;
    interactedRef.current = true;
    if (playerRef.current.isMuted) {
      setPlayCue(false);
      playerRef.current.unmute();
      watchForRefusal();
    }
  };

  /** Tap sur la vidéo : son coupé → son ; sinon pause / lecture. */
  const onStageTap = () => {
    interactedRef.current = true;
    if (player.isMuted) {
      setPlayCue(false);
      toggleSound();
      watchForRefusal();
    } else togglePause();
  };

  // App Android : le son est d'emblée actif, donc le premier geste ne sert plus à
  // l'activer. Si la WebView le refuse malgré tout, le repère de départ revient.
  useEffect(() => {
    if (!startWithSound) return;
    interactedRef.current = true;
  }, [startWithSound]);
  const soundCheckedRef = useRef(false);
  useEffect(() => {
    if (!startWithSound || soundCheckedRef.current || phase !== 'playing') return;
    soundCheckedRef.current = true;
    watchForRefusal();
  }, [startWithSound, phase]);

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
      // Toujours appelé depuis un geste de l'utilisateur : c'est ici que le son peut
      // être activé (une activation hors geste serait refusée par iOS).
      activateSoundOnce();
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
    // La barre de progression a son propre geste : il ne change jamais de semaine.
    if (event.target?.closest?.('[data-scrubber]')) return;
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
    // Le geste ne doit pas aussi agir comme un tap. Sur écran tactile, le navigateur
    // n'envoie en général AUCUN clic après un glissement : le verrou expire donc seul,
    // sinon il avalerait le prochain vrai tap de l'utilisateur.
    suppressClickRef.current = true;
    clearTimeout(suppressTimerRef.current);
    suppressTimerRef.current = setTimeout(() => { suppressClickRef.current = false; }, 400);
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

  /** Ouvir : la chanson complète est chargée ET le son lancé ici, dans le geste (iOS). */
  const openOuvir = () => {
    const id = getSongAudioId(current);
    const slug = getPublicSlug(current);
    if (!id || !slug) return;
    interactedRef.current = true;
    if (!player.loadNow(id)) player.unmute(); // lecteur pas prêt : « Toque para ouvir » dans le calque
    onOpenOuvir?.(slug);
  };
  const canOuvir = Boolean(onOpenOuvir && getSongAudioId(current) && getPublicSlug(current));

  // ── Clavier ──────────────────────────────────────────────────────────────────────
  // Flèche bas = semaine précédente, flèche haut = plus récente ; Espace = pause /
  // lecture ; flèches gauche / droite = -5 s / +5 s.
  useEffect(() => {
    const onKeyDown = (event) => {
      if (event.altKey || event.ctrlKey || event.metaKey || isTypingTarget(event.target)) return;
      if (ouvirOpen) return; // le calque Ouvir recouvre le feed
      if (document.querySelector('[role="dialog"]')) return; // Letra ouverte, menu…
      if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
        if (go(event.key === 'ArrowDown' ? +1 : -1)) event.preventDefault();
        return;
      }
      if (!videoId) return;
      if (event.key === ' ' || event.code === 'Space') {
        if (isActivatableTarget(event.target)) return;
        event.preventDefault();
        onStageTap();
        return;
      }
      if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
        event.preventDefault();
        const step = event.key === 'ArrowRight' ? SEEK_STEP_S : -SEEK_STEP_S;
        player.seekTo(player.getCurrentTime() + step);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }); // se réabonne à chaque rendu : lit toujours l'état courant du lecteur

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
    <>
    <section
      ref={stageRef}
      // Sous le calque Ouvir, le feed est inerte (ni focus, ni lecteur d'écran).
      {...(ouvirOpen ? { inert: '' } : null)}
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

          {/* Vidéo : iframe 9:16 en « cover » (× SHORTS_UI_ZOOM, 1,0 aujourd'hui), pour
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

          {/* Pause : YouTube affiche alors son propre bloc au centre de la vidéo (mesuré).
              On le couvre avec la miniature floutée. */}
          {videoId && isPaused ? (
            <div aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-hidden" data-feed-paused>
              <div className="absolute inset-0 scale-110 blur-xl">
                <FeedPoster song={current} buildArtwork={buildArtwork} />
              </div>
              <div className="absolute inset-0 bg-black/40" />
            </div>
          ) : null}

          {/* Contrôle plein cadre (seulement s'il y a une vidéo) : son coupé → son ;
              sinon pause / lecture. */}
          {videoId ? (
            <button
              type="button"
              onClick={onStageTap}
              aria-label={showUnmute ? 'Ouvir com som' : isPaused ? 'Reproduzir' : 'Pausar'}
              className="absolute inset-0 z-10 flex h-full w-full touch-manipulation select-none items-center justify-center focus-visible:outline-offset-[-6px]"
            >
              {playCue && showUnmute ? (
                <span
                  aria-hidden="true"
                  data-play-cue
                  className="flex h-[72px] w-[72px] items-center justify-center rounded-full border border-white/30 bg-white/20 text-white backdrop-blur-md"
                >
                  <Play className="ml-1 h-8 w-8 fill-current" />
                </span>
              ) : null}
              {!showUnmute && isPaused ? (
                <span
                  aria-hidden="true"
                  className="flex h-20 w-20 items-center justify-center rounded-full border border-white/30 bg-black/40 text-white backdrop-blur-md"
                >
                  <Play className="ml-1 h-9 w-9 fill-current" />
                </span>
              ) : null}
            </button>
          ) : null}

          <FeedOverlay
            song={current}
            player={player}
            isFirst={safeIndex === 0}
            onShowLyrics={() => onShowLyrics?.(current)}
            onRequestSound={requestSound}
            onOuvir={canOuvir ? openOuvir : undefined}
          />

          {older && !swipedEver ? <SwipeHint /> : null}
        </div>
      </div>

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

    {ouvirSong ? (
      <div data-ouvir className={`absolute inset-0 z-30 flex flex-col bg-app-black ${HEADER_OFFSET}`}>
        <CaipivaraStage
          key={ouvirSlug}
          songs={songs}
          player={player}
          initialSong={ouvirSong}
          onSongChange={setAudioSong}
          ribbonTop="top-[calc(max(env(safe-area-inset-top),0.35rem)+4rem)]"
        />
      </div>
    ) : null}
    </>
  );
}

const SR_NAV_BUTTON =
  'sr-only rounded-full bg-black/70 px-4 py-2 text-sm font-semibold text-white focus:not-sr-only focus-visible:not-sr-only';

function NeighbourSlide({ song, buildArtwork, position }) {
  return (
    <div aria-hidden="true" className="absolute inset-0" style={{ transform: `translate3d(0, ${position}, 0)` }}>
      <FeedPoster song={song} buildArtwork={buildArtwork} />
      <p className={`pointer-events-none absolute bottom-6 left-4 right-24 line-clamp-2 text-[28px] font-black leading-[1.1] tracking-tight text-white ${TEXT_SHADOW}`}>
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
