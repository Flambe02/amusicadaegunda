import { useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { FileText, ListMusic, Share2 } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { isKaraokePublished } from '@/lib/lrc';
import { getWeekLabel } from '@/lib/homeSongMedia';
import { getPublicSlug, isReleasedThisWeek } from './feedMedia';

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
  const weekChip = isReleasedThisWeek(song) ? 'Esta semana' : getWeekLabel(song);
  const slug = getPublicSlug(song);
  const canSing = isKaraokePublished(song) && Boolean(slug);
  const TitleTag = isFirst ? 'h1' : 'h2';
  // Son actif (état réel du lecteur) : le titre se fait discret pour laisser lisibles
  // les paroles incrustées dans la vidéo.
  const compact = player.isSoundOn;

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
      {/* Haut : chip de semaine, sous le nom du site (en-tête transparent du shell). */}
      {weekChip ? (
        <div className="pointer-events-none absolute inset-x-0 top-[calc(max(env(safe-area-inset-top),0.35rem)+3.25rem)] z-20 flex justify-center">
          <span className="rounded-full border border-white/20 bg-black/40 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-white backdrop-blur-md">
            {weekChip}
          </span>
        </div>
      ) : null}

      {/* Bas : dégradé de lisibilité. Son actif → il se replie vers le bas, pour ne pas
          assombrir les paroles incrustées dans la vidéo. */}
      <div
        aria-hidden="true"
        className={`pointer-events-none absolute inset-x-0 bottom-0 z-20 h-[45%] origin-bottom bg-gradient-to-t from-black/80 via-black/40 to-transparent transition-transform duration-300 ${EASE_OUT} motion-reduce:transition-none ${
          compact ? 'scale-y-[0.35]' : 'scale-y-100'
        }`}
      />

      {/* Bas gauche : titre (h1 de la page sur la première chanson). Même élément dans
          les deux états, seul son style change. */}
      <div
        className={`pointer-events-none absolute left-4 right-24 z-20 transition-[bottom] duration-300 ${EASE_OUT} motion-reduce:transition-none ${
          compact ? 'bottom-3' : 'bottom-6'
        }`}
      >
        <TitleTag
          data-compact={compact ? 'true' : 'false'}
          className={`font-black tracking-tight text-white [text-shadow:0_2px_12px_rgba(0,0,0,0.45)] transition-[font-size,line-height,opacity] duration-300 ${EASE_OUT} motion-reduce:transition-none ${
            compact
              ? 'truncate text-[15px] leading-tight opacity-90'
              : 'line-clamp-2 text-[28px] leading-[1.1]'
          }`}
        >
          {song.title}
        </TitleTag>
      </div>

      {/* Colonne droite : Letra, Cantar, Compartilhar. */}
      <div className="absolute bottom-6 right-3 z-30 flex flex-col items-center gap-4">
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
