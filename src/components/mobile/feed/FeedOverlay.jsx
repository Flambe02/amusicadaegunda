import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { FileText, ListMusic, Newspaper, Share2, Volume2 } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { isKaraokePublished } from '@/lib/lrc';
import { formatTime, getPublicSlug } from './feedMedia';
import WeekRibbon from './WeekRibbon';
import FeedStorySheet from './FeedStorySheet';
import { ICON_SHADOW, TEXT_SHADOW } from './feedStyles';

const SITE_URL = 'https://www.amusicadasegunda.com';
// Courbe « strong ease-out » (changements d'état d'interface).
const EASE_OUT = 'ease-[cubic-bezier(0.23,1,0.32,1)]';

/**
 * Calques du feed (étape 4), posés au-dessus du bouton son plein cadre du feed (MobileFeed).
 *
 * Seuls les contrôles réels captent les taps (colonne droite) ; tout le reste est en
 * `pointer-events-none`, pour qu'un tap sur la vidéo continue de couper/rétablir le son.
 * Un seul jaune par zone : ici, rien n'est jaune — le jaune de la vidéo est « Toque
 * para ouvir » (son coupé) puis, à l'étape 5, la ligne de karaokê (son actif).
 *
 * Aucun second mouvement ne concurrence la vidéo : pas d'avatar animé ni de bulle
 * (retirés après test sur iPhone, 2026-09-25).
 */
export default function FeedOverlay({ song, player, isFirst = true, onShowLyrics }) {
  const { toast } = useToast();
  const slug = getPublicSlug(song);
  const canSing = isKaraokePublished(song) && Boolean(slug);
  const TitleTag = isFirst ? 'h1' : 'h2';
  // Son actif (état réel du lecteur, pause comprise) : le titre se fait discret pour
  // laisser lisibles les paroles incrustées dans la vidéo.
  const compact = !player.isMuted && player.phase === 'playing';
  // Icône Som : seulement une fois le son activé (son coupé → « Toque para ouvir » suffit).
  const showSound = player.phase !== 'none' && !player.isMuted;
  // « História » : seulement si la chanson a une description — jamais de bouton vide.
  const hasStory = typeof song?.description === 'string' && song.description.trim().length > 0;
  const [storyOpen, setStoryOpen] = useState(false);
  const storyButtonRef = useRef(null);
  useEffect(() => { setStoryOpen(false); }, [song?.id, song?.title]);

  const copy = async (url) => {
    try {
      await navigator.clipboard.writeText(url);
      toast({ title: 'Link copiado', description: 'Cole onde quiser para compartilhar.', duration: 3000 });
    } catch {
      toast({ title: 'Não deu para copiar', description: url, duration: 5000 });
    }
  };

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

  return (
    <>
      {/* Haut : ruban éphémère de la semaine, sous l'en-tête (remplace le chip permanent). */}
      <WeekRibbon song={song} phase={player.phase} />

      {/* Bas gauche : titre (h1 de la page sur la première chanson). Même élément dans
          les deux états, seul son style change. */}
      <div
        className={`pointer-events-none absolute left-4 right-24 z-20 transition-[bottom] duration-300 ${EASE_OUT} motion-reduce:transition-none ${
          compact ? 'bottom-3' : 'bottom-6'
        }`}
      >
        <TitleTag
          data-compact={compact ? 'true' : 'false'}
          className={`font-black tracking-tight text-white ${TEXT_SHADOW} transition-[font-size,line-height,opacity] duration-300 ${EASE_OUT} motion-reduce:transition-none ${
            compact
              ? 'truncate text-[15px] leading-tight opacity-90'
              : 'line-clamp-2 text-[28px] leading-[1.1]'
          }`}
        >
          {song.title}
        </TitleTag>
      </div>

      {/* Colonne droite, de haut en bas : Som (si actif), Letra, História, Cantar,
          Compartilhar. */}
      <div className="absolute bottom-6 right-3 z-30 flex flex-col items-center gap-4">
        {showSound ? (
          <RailButton label="Som" onClick={player.mute} icon={Volume2} ariaLabel="Silenciar" />
        ) : null}
        <RailButton label="Letra" onClick={onShowLyrics} icon={FileText} ariaLabel={`Ver a letra de ${song.title}`} />
        {hasStory ? (
          <RailButton
            buttonRef={storyButtonRef}
            label="História"
            onClick={() => setStoryOpen(true)}
            icon={Newspaper}
            ariaLabel={`Ler a história de ${song.title}`}
          />
        ) : null}
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

      <Scrubber player={player} />

      {hasStory ? (
        <FeedStorySheet song={song} open={storyOpen} onOpenChange={setStoryOpen} returnFocusRef={storyButtonRef} />
      ) : null}
    </>
  );
}

const railClass =
  'flex min-h-[44px] w-14 touch-manipulation select-none flex-col items-center gap-1 text-white active:opacity-70';
const railIconClass =
  'flex h-11 w-11 items-center justify-center rounded-full border border-white/20 bg-black/40 backdrop-blur-md';
const railLabelClass = `text-[11px] font-semibold leading-none ${TEXT_SHADOW}`;

function RailButton({ label, icon: Icon, onClick, ariaLabel, buttonRef }) {
  return (
    <button ref={buttonRef} type="button" onClick={onClick} aria-label={ariaLabel} className={railClass}>
      <span className={railIconClass}><Icon className={`h-5 w-5 ${ICON_SHADOW}`} aria-hidden="true" /></span>
      <span aria-hidden="true" className={railLabelClass}>{label}</span>
    </button>
  );
}

function RailLink({ label, icon: Icon, to, ariaLabel }) {
  return (
    <Link to={to} aria-label={ariaLabel} className={railClass}>
      <span className={railIconClass}><Icon className={`h-5 w-5 ${ICON_SHADOW}`} aria-hidden="true" /></span>
      <span aria-hidden="true" className={railLabelClass}>{label}</span>
    </Link>
  );
}

/**
 * Barre de progression manipulable, en bas de la zone vidéo.
 * Zone tactile de 24 px sur toute la largeur ; le trait (3 px) s'épaissit à 6 px
 * pendant le geste et le temps s'affiche (« 0:42 / 2:10 »). Ce geste ne change jamais
 * de semaine : MobileFeed ignore tout pointeur parti de [data-scrubber].
 * Clavier : le curseur est un « slider » ; les flèches gauche / droite (-5 s / +5 s)
 * sont gérées par MobileFeed.
 */
function Scrubber({ player }) {
  const barRef = useRef(null);
  const zoneRef = useRef(null);
  const dragRef = useRef(null);
  const [dragRatio, setDragRatio] = useState(null);
  const [times, setTimes] = useState({ current: 0, duration: 0 });
  const { isPlaying, getCurrentTime, getDuration, phase } = player;
  const dragging = dragRatio !== null;

  const paint = (ratio) => {
    if (barRef.current) barRef.current.style.transform = `scaleX(${Math.max(0, Math.min(1, ratio))})`;
  };

  // Avance du trait pendant la lecture (pas pendant le geste).
  useEffect(() => {
    if (!isPlaying || dragging) return undefined;
    let frame;
    const tick = () => {
      const duration = getDuration();
      paint(duration > 0 ? getCurrentTime() / duration : 0);
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [isPlaying, dragging, getCurrentTime, getDuration]);

  // Valeurs lues par les lecteurs d'écran (et le libellé), rafraîchies chaque seconde.
  useEffect(() => {
    const update = () => setTimes({ current: getCurrentTime(), duration: getDuration() });
    update();
    const id = setInterval(update, 1000);
    return () => clearInterval(id);
  }, [getCurrentTime, getDuration, phase]); // relu dès que la vidéo joue

  const ratioAt = (clientX) => {
    const rect = zoneRef.current.getBoundingClientRect();
    return rect.width ? Math.max(0, Math.min(1, (clientX - rect.left) / rect.width)) : 0;
  };

  const onPointerDown = (event) => {
    if (event.pointerType === 'mouse' && event.button !== 0) return;
    event.stopPropagation();
    zoneRef.current.setPointerCapture?.(event.pointerId);
    const ratio = ratioAt(event.clientX);
    dragRef.current = { id: event.pointerId, ratio };
    setDragRatio(ratio);
    paint(ratio);
  };

  const onPointerMove = (event) => {
    const drag = dragRef.current;
    if (!drag || drag.id !== event.pointerId) return;
    event.stopPropagation();
    drag.ratio = ratioAt(event.clientX);
    setDragRatio(drag.ratio);
    paint(drag.ratio);
    player.seekTo(drag.ratio * getDuration(), false);
  };

  const onPointerEnd = (event) => {
    const drag = dragRef.current;
    if (!drag || drag.id !== event.pointerId) return;
    event.stopPropagation();
    dragRef.current = null;
    player.seekTo(drag.ratio * getDuration(), true);
    setTimes({ current: drag.ratio * getDuration(), duration: getDuration() });
    setDragRatio(null);
  };

  if (phase !== 'playing') return null;
  // Pendant le geste, la durée est lue en direct : le relevé périodique peut dater
  // d'avant que le lecteur ne la connaisse.
  const duration = dragging ? getDuration() : times.duration;
  const shownCurrent = dragging ? dragRatio * duration : times.current;

  return (
    <div
      ref={zoneRef}
      data-scrubber
      role="slider"
      tabIndex={0}
      aria-label="Posição na música"
      aria-valuemin={0}
      aria-valuemax={Math.round(duration)}
      aria-valuenow={Math.round(shownCurrent)}
      aria-valuetext={`${formatTime(shownCurrent)} de ${formatTime(duration)}`}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerEnd}
      onPointerCancel={onPointerEnd}
      className="absolute inset-x-0 bottom-0 z-30 h-6 touch-none select-none focus-visible:outline-offset-[-3px]"
    >
      {dragging ? (
        <span className="pointer-events-none absolute bottom-8 left-1/2 -translate-x-1/2 rounded-full bg-black/70 px-3 py-1 text-sm font-semibold tabular-nums text-white backdrop-blur-md">
          {formatTime(shownCurrent)} / {formatTime(duration)}
        </span>
      ) : null}
      <div
        aria-hidden="true"
        className={`pointer-events-none absolute inset-x-0 bottom-0 h-1.5 origin-bottom bg-white/20 transition-transform duration-150 ${EASE_OUT} motion-reduce:transition-none ${
          dragging ? 'scale-y-100' : 'scale-y-50'
        }`}
      >
        <div ref={barRef} className="h-full w-full origin-left scale-x-0 bg-white/90" />
      </div>
    </div>
  );
}
