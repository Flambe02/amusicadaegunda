import { useEffect, useRef, useState } from 'react';
import { formatTime } from './feedMedia';

// Courbe « strong ease-out » (changements d'état d'interface).
const EASE_OUT = 'ease-[cubic-bezier(0.23,1,0.32,1)]';
const SEEK_STEP_S = 5; // flèches gauche / droite

/**
 * Barre de progression manipulable — un seul composant pour le feed (bas de la vidéo)
 * et le Catálogo (sous le titre, page et calque Ouvir).
 * Zone tactile de 24 px sur toute la largeur ; le trait (3 px) s'épaissit à 6 px
 * pendant le geste et le temps s'affiche (« 0:42 / 2:10 »). Ce geste ne change jamais
 * de semaine : MobileFeed ignore tout pointeur parti de [data-scrubber].
 * Clavier : le curseur est un « slider » ; flèches gauche / droite = -5 s / +5 s quand
 * il a le focus (le feed les gère aussi ailleurs dans la page).
 * `className` place la zone (le feed : collée au bas de la vidéo).
 */
export default function Scrubber({ player, className = 'absolute inset-x-0 bottom-0 z-30' }) {
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
  // En pause, le trait suit aussi ce relevé (position après un saut au clavier).
  useEffect(() => {
    const update = () => {
      const current = getCurrentTime();
      const duration = getDuration();
      setTimes({ current, duration });
      if (!dragRef.current) paint(duration > 0 ? current / duration : 0);
    };
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

  const onKeyDown = (event) => {
    if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return;
    if (event.altKey || event.ctrlKey || event.metaKey) return;
    // Géré ici : le raccourci global du feed ne doit pas sauter une seconde fois.
    event.preventDefault();
    event.stopPropagation();
    const duration = getDuration();
    const step = event.key === 'ArrowRight' ? SEEK_STEP_S : -SEEK_STEP_S;
    const target = Math.max(0, Math.min(duration || Infinity, getCurrentTime() + step));
    player.seekTo(target);
    setTimes({ current: target, duration });
    paint(duration > 0 ? target / duration : 0);
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
      onKeyDown={onKeyDown}
      className={`${className} h-6 touch-none select-none focus-visible:outline-offset-[-3px]`}
    >
      {dragging ? (
        <span className="pointer-events-none absolute bottom-8 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full bg-black/70 px-3 py-1 text-sm font-semibold tabular-nums text-white backdrop-blur-md">
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
