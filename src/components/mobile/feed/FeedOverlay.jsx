import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { FileText, ListMusic, Share2 } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { isKaraokePublished } from '@/lib/lrc';
import { getWeekLabel } from '@/lib/homeSongMedia';
import { getPublicSlug, isReleasedThisWeek } from './feedMedia';
import { useReducedMotion } from './useReducedMotion';

const SITE_URL = 'https://www.amusicadasegunda.com';
// Courbe « strong ease-out » (entrées/sorties d'interface), 200 ms.
const EASE_OUT = 'ease-[cubic-bezier(0.23,1,0.32,1)]';

/**
 * Calques du feed (étape 4), posés au-dessus du bouton son plein cadre de FeedSlide.
 *
 * Seuls les contrôles réels captent les taps (colonne droite) ; tout le reste est en
 * `pointer-events-none`, pour qu'un tap sur la vidéo continue de couper/rétablir le son.
 * Un seul jaune par zone : ici, rien n'est jaune — le jaune de la vidéo est « Toque
 * para ouvir » (son coupé) puis, à l'étape 5, la ligne de karaokê (son actif).
 */
export default function FeedOverlay({ song, player, isFirst = true, onShowLyrics }) {
  const reduceMotion = useReducedMotion();
  const { toast } = useToast();
  const thisWeek = isReleasedThisWeek(song);
  const weekChip = thisWeek ? 'Esta semana' : getWeekLabel(song);
  const slug = getPublicSlug(song);
  const canSing = isKaraokePublished(song) && Boolean(slug);
  const TitleTag = isFirst ? 'h1' : 'h2';

  const share = async () => {
    const url = slug ? `${SITE_URL}/musica/${slug}/` : window.location.href;
    const payload = { title: `${song.title} — A Música da Segunda`, url };
    if (navigator.share) {
      try {
        await navigator.share(payload);
      } catch (error) {
        if (error?.name !== 'AbortError') copy(url);
      }
      return;
    }
    copy(url);
  };

  const copy = async (url) => {
    try {
      await navigator.clipboard.writeText(url);
      toast({ title: 'Link copiado', description: 'Cole onde quiser para compartilhar.', duration: 3000 });
    } catch {
      toast({ title: 'Não deu para copiar', description: url, duration: 5000 });
    }
  };

  return (
    <>
      {/* Haut : chip de semaine, sous le nom du site (en-tête transparent du shell). */}
      {weekChip ? (
        <div className="pointer-events-none absolute inset-x-0 top-[calc(max(env(safe-area-inset-top),0.35rem)+3.25rem)] z-20 flex justify-center">
          <span className="rounded-full border border-white/20 bg-black/40 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-white backdrop-blur-md">
            {weekChip}
          </span>
        </div>
      ) : null}

      {/* Bas : dégradé de lisibilité sous le titre et la colonne droite. */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 bottom-0 z-20 h-[45%] bg-gradient-to-t from-black/80 via-black/40 to-transparent"
      />

      {/* Bas gauche : titre (h1 de la page sur la première chanson). */}
      <div className="pointer-events-none absolute bottom-6 left-4 right-24 z-20">
        <TitleTag className="line-clamp-2 text-3xl font-black leading-[1.05] tracking-tight text-white [text-shadow:0_2px_12px_rgba(0,0,0,0.45)]">
          {song.title}
        </TitleTag>
      </div>

      {/* Colonne droite : Caipivara, Letra, Cantar, Compartilhar. */}
      <div className="absolute bottom-6 right-3 z-30 flex flex-col items-center gap-4">
        <CaipivaraAvatar
          dancing={player.isSoundOn && !reduceMotion}
          animate={!reduceMotion}
          showBubble={thisWeek && !player.isSoundOn}
        />
        <RailButton label="Letra" onClick={onShowLyrics} icon={FileText} ariaLabel={`Ver a letra de ${song.title}`} />
        {canSing ? (
          <RailLink
            label="Cantar"
            to={`/karaoke?musica=${encodeURIComponent(slug)}`}
            icon={ListMusic}
            ariaLabel={`Cantar ${song.title} no karaokê`}
          />
        ) : null}
        <RailButton label="Compartilhar" onClick={share} icon={Share2} ariaLabel={`Compartilhar ${song.title}`} />
      </div>

      <ProgressBar player={player} />
    </>
  );
}

const railClass =
  'flex min-h-[44px] w-14 touch-manipulation select-none flex-col items-center gap-1 text-white active:opacity-70';
const railIconClass =
  'flex h-11 w-11 items-center justify-center rounded-full border border-white/20 bg-black/40 backdrop-blur-md';
const railLabelClass = 'text-[11px] font-semibold leading-none [text-shadow:0_1px_6px_rgba(0,0,0,0.6)]';

function RailButton({ label, icon: Icon, onClick, ariaLabel }) {
  return (
    <button type="button" onClick={onClick} aria-label={ariaLabel} className={railClass}>
      <span className={railIconClass}><Icon className="h-5 w-5" aria-hidden="true" /></span>
      <span aria-hidden="true" className={railLabelClass}>{label}</span>
    </button>
  );
}

function RailLink({ label, icon: Icon, to, ariaLabel }) {
  return (
    <Link to={to} aria-label={ariaLabel} className={railClass}>
      <span className={railIconClass}><Icon className="h-5 w-5" aria-hidden="true" /></span>
      <span aria-hidden="true" className={railLabelClass}>{label}</span>
    </Link>
  );
}

const CLIP = {
  idle: { poster: '/videos/caipivara/caipivara-idle-poster.webp', webm: '/videos/caipivara/caipivara-idle.webm', mp4: '/videos/caipivara/caipivara-idle.mp4' },
  dance: { poster: '/videos/caipivara/caipivara-dance-poster.webp', webm: '/videos/caipivara/caipivara-dance.webm', mp4: '/videos/caipivara/caipivara-dance.mp4' },
};

/**
 * Avatar Caipivara, cercle de 56 px recadré sur la tête. Au repos : boucle calme ;
 * quand le lecteur joue réellement avec le son : boucle de danse (fondu 200 ms).
 * Mouvement réduit : affiches fixes seulement, pas de danse, pas de boucle.
 * La boucle de danse n'est chargée qu'à la première fois où le son joue.
 */
function CaipivaraAvatar({ dancing, animate, showBubble }) {
  const [danceMounted, setDanceMounted] = useState(false);
  const [idleReady, setIdleReady] = useState(false);

  useEffect(() => {
    if (dancing) setDanceMounted(true);
  }, [dancing]);

  // La boucle calme attend que la page ait fini son premier chargement (LCP, lecteur).
  useEffect(() => {
    if (!animate) return undefined;
    const id = setTimeout(() => setIdleReady(true), 1500);
    return () => clearTimeout(id);
  }, [animate]);

  return (
    <div className="relative" aria-hidden="true">
      <SpeechBubble visible={showBubble} />
      <div className="relative h-14 w-14 overflow-hidden rounded-full border-2 border-white/80 bg-app-charcoal shadow-[0_6px_18px_rgba(0,0,0,0.45)]">
        <AvatarLayer clip={CLIP.idle} play={animate && idleReady} visible={!dancing} />
        {danceMounted ? <AvatarLayer clip={CLIP.dance} play={animate && dancing} visible={dancing} /> : null}
      </div>
    </div>
  );
}

// Le cadre 432×768 est agrandi et décalé pour que le cercle montre la tête.
// Le visage est à ~39 % de la hauteur du cadre : image à 330 % du cercle, remontée de 78 %.
const HEAD_CROP = 'absolute left-1/2 top-[-78%] h-[330%] w-auto max-w-none -translate-x-1/2';

function AvatarLayer({ clip, play, visible }) {
  const ref = useRef(null);

  useEffect(() => {
    const video = ref.current;
    if (!video) return;
    if (play && visible) {
      // play() ne renvoie pas toujours une promesse (anciens navigateurs, jsdom).
      const attempt = video.play?.();
      if (attempt && typeof attempt.catch === 'function') attempt.catch(() => {});
    }
    else video.pause?.();
  }, [play, visible]);

  const layerClass = `transition-opacity duration-200 ${EASE_OUT} ${visible ? 'opacity-100' : 'opacity-0'}`;

  if (!play) {
    return <img src={clip.poster} alt="" className={`${HEAD_CROP} ${layerClass}`} />;
  }
  return (
    <video
      ref={ref}
      className={`${HEAD_CROP} ${layerClass}`}
      poster={clip.poster}
      muted
      loop
      playsInline
      preload="metadata"
      disablePictureInPicture
    >
      <source src={clip.webm} type="video/webm" />
      <source src={clip.mp4} type="video/mp4" />
    </video>
  );
}

function SpeechBubble({ visible }) {
  return (
    <div
      className={`pointer-events-none absolute right-[calc(100%+10px)] top-1/2 w-max max-w-[11rem] -translate-y-1/2 transition-[opacity,transform] duration-200 ${EASE_OUT} motion-reduce:transition-opacity ${
        visible ? 'opacity-100' : 'translate-x-1 opacity-0 motion-reduce:translate-x-0'
      }`}
    >
      <p className="relative rounded-2xl bg-white px-3 py-2 text-sm font-bold leading-snug text-[#050505] shadow-[0_6px_18px_rgba(0,0,0,0.35)]">
        Psiu! Saiu a música da semana.
        <span className="absolute -right-1.5 top-1/2 h-3 w-3 -translate-y-1/2 rotate-45 rounded-[2px] bg-white" />
      </p>
    </div>
  );
}

/** Fine barre de progression en bas de la zone vidéo, lue sur le lecteur. */
function ProgressBar({ player }) {
  const barRef = useRef(null);
  const { isPlaying, getCurrentTime, getDuration, phase } = player;

  useEffect(() => {
    if (!isPlaying) return undefined;
    let frame;
    const tick = () => {
      const duration = getDuration();
      const ratio = duration > 0 ? Math.min(1, getCurrentTime() / duration) : 0;
      if (barRef.current) barRef.current.style.transform = `scaleX(${ratio})`;
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [isPlaying, getCurrentTime, getDuration]);

  if (phase !== 'playing') return null;
  return (
    <div aria-hidden="true" className="pointer-events-none absolute inset-x-0 bottom-0 z-20 h-[3px] bg-white/20">
      <div ref={barRef} className="h-full w-full origin-left scale-x-0 bg-white/90" />
    </div>
  );
}
