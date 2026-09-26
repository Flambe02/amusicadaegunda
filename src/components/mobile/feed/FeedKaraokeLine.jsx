import { useEffect, useMemo, useRef, useState } from 'react';
import { activeLineIndex } from '@/lib/lrc';
import { resolveSongTiming } from '@/lib/timingModel';
import { canShowFeedKaraoke, lineProgress } from './feedKaraoke';
import { ICON_SHADOW } from './feedStyles';

function prefersReducedMotion() {
  return typeof window !== 'undefined' && typeof window.matchMedia === 'function'
    ? window.matchMedia('(prefers-reduced-motion: reduce)').matches
    : false;
}

/**
 * Ligne de karaokê sur la vidéo du feed (étape 5) : seulement si le karaokê de la
 * chanson est publié et sa synchro vérifiable dans ce mode (`canShowFeedKaraoke`), et
 * seulement quand le son joue réellement. Synchro par lecture de `getCurrentTime()` du
 * lecteur et du timing existant, lu comme le lecteur karaokê (`resolveSongTiming`,
 * lecture seule, moteur de synchro intact). Le mot chanté se remplit de jaune de gauche à droite — c'est le seul
 * jaune de la vidéo, son actif. Entre deux lignes (ou avant la première), rien.
 * Mouvement réduit : pas de balayage, la ligne en cours est entièrement jaune.
 */
export default function FeedKaraokeLine({ song, player, mode }) {
  const parsed = useMemo(
    () => (canShowFeedKaraoke(song, mode) ? resolveSongTiming(song).lines.filter((line) => line.text) : []),
    [song, mode]
  );
  const soundOn = player.phase === 'playing' && !player.isMuted;
  const [index, setIndex] = useState(-1);
  const indexRef = useRef(-1);
  const wipeRef = useRef(null);
  const reduceMotion = prefersReducedMotion();
  const { getCurrentTime } = player;

  useEffect(() => {
    indexRef.current = -1;
    setIndex(-1);
  }, [song]);

  useEffect(() => {
    if (!soundOn || parsed.length === 0) return undefined;
    let frame;
    const tick = () => {
      const t = getCurrentTime();
      const next = activeLineIndex(parsed, t);
      if (next !== indexRef.current) {
        indexRef.current = next;
        setIndex(next);
      }
      if (next >= 0 && wipeRef.current && !reduceMotion) {
        const pct = lineProgress(parsed, next, t) * 100;
        wipeRef.current.style.backgroundImage = `linear-gradient(90deg, #FDE047 ${pct}%, #FFFFFF ${pct}%)`;
      }
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [soundOn, parsed, getCurrentTime, reduceMotion]);

  if (!soundOn || parsed.length === 0 || index < 0) return null;
  const text = parsed[index].text;

  return (
    <div
      data-feed-karaoke
      aria-hidden="true"
      className="pointer-events-none absolute bottom-10 left-4 right-24 z-20"
    >
      {/* Ombre en drop-shadow (comme les icônes) : un text-shadow se peindrait par-dessus
          le remplissage d'un texte en background-clip et le ternirait. */}
      <p className={`line-clamp-2 text-xl font-black leading-snug ${ICON_SHADOW}`}>
        <span
          ref={wipeRef}
          className={reduceMotion ? 'text-[#FDE047]' : 'bg-clip-text text-transparent [-webkit-background-clip:text]'}
          style={reduceMotion ? undefined : { backgroundImage: 'linear-gradient(90deg, #FDE047 0%, #FFFFFF 0%)' }}
        >
          {text}
        </span>
      </p>
    </div>
  );
}
