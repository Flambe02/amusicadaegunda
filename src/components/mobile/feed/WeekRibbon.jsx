import { useEffect, useRef, useState } from 'react';
import { ribbonLabel, ribbonSpokenDate } from './feedMedia';

// Durée d'affichage après l'apparition de la vidéo, puis fondu de sortie.
export const RIBBON_VISIBLE_MS = 2500;

/**
 * Ruban éphémère de la semaine, en haut de la vidéo sous l'en-tête (remplace le chip
 * permanent — décision du 2026-09-25).
 *
 * À l'arrivée de chaque chanson (premier chargement et chaque glissement), il glisse
 * depuis la gauche quand la vidéo apparaît (ou dès l'arrivée si la chanson n'a pas de
 * vidéo), reste RIBBON_VISIBLE_MS puis s'efface en fondu. Mouvement réduit : apparition
 * et disparition en fondu, sans glissement. Fond noir translucide, texte blanc en
 * « eyebrow » (DESIGN.md), jamais de jaune. La date reste toujours lisible par les
 * lecteurs d'écran (texte visuellement masqué).
 */
export default function WeekRibbon({ song, phase }) {
  const label = ribbonLabel(song);
  const spoken = ribbonSpokenDate(song);
  const songKey = song?.id ?? song?.slug ?? song?.title;
  // 'waiting' (hors champ à gauche) → 'shown' → 'gone' (fondu).
  const [state, setState] = useState('waiting');
  // Chanson pour laquelle le ruban a déjà été montré (une ref : la noter ne doit pas
  // relancer l'effet, dont le nettoyage annulerait le minuteur de sortie).
  const shownForRef = useRef(null);
  const hideTimerRef = useRef(null);

  // Nouvelle chanson : le ruban repart de sa position d'attente, sans transition.
  useEffect(() => {
    clearTimeout(hideTimerRef.current);
    shownForRef.current = null;
    setState('waiting');
  }, [songKey]);

  // Moment d'apparition : la vidéo (`playing`) ou, sans vidéo, la miniature (`none`,
  // `fallback`). Montré sur la miniature en repli, il peut revenir une fois quand la
  // vidéo finit par arriver — jamais plus d'une fois par moment et par chanson.
  const moment = phase === 'playing' ? 'video' : phase === 'none' || phase === 'fallback' ? 'poster' : null;

  useEffect(() => {
    if (!moment) return;
    const key = `${songKey}:${moment}`;
    if (shownForRef.current === key || shownForRef.current === `${songKey}:video`) return;
    shownForRef.current = key;
    clearTimeout(hideTimerRef.current);
    setState('shown');
    hideTimerRef.current = setTimeout(() => setState('gone'), RIBBON_VISIBLE_MS);
  }, [moment, songKey]);

  useEffect(() => () => clearTimeout(hideTimerRef.current), []);

  const position =
    state === 'waiting'
      ? '-translate-x-full opacity-0 transition-none motion-reduce:translate-x-0'
      : state === 'shown'
        ? 'translate-x-0 opacity-100 transition-[transform,opacity] duration-300 ease-[cubic-bezier(0.23,1,0.32,1)] motion-reduce:transition-opacity'
        : 'translate-x-0 opacity-0 transition-opacity duration-500 ease-out';

  return (
    <>
      {spoken ? <p className="sr-only">{spoken}</p> : null}
      {label ? (
        <div
          aria-hidden="true"
          data-ribbon={state}
          className="pointer-events-none absolute left-0 top-[calc(max(env(safe-area-inset-top),0.35rem)+3.5rem)] z-20"
        >
          <span
            className={`block rounded-r-full bg-black/55 py-1.5 pl-4 pr-4 text-[11px] font-medium uppercase tracking-[0.28em] text-white backdrop-blur-md ${position}`}
          >
            {label}
          </span>
        </div>
      ) : null}
    </>
  );
}
