import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ChevronLeft, ChevronRight, Tv } from 'lucide-react';
import { Song } from '@/api/entities';
import TileImage from '@/components/mobile/search/TileImage';
import { publishedNewestFirst } from '@/components/mobile/search/searchCatalog';
import { getPublicSlug, monthYearLabel } from '@/components/mobile/feed/feedMedia';
import { TEXT_SHADOW } from '@/components/mobile/feed/feedStyles';
import { MicFilled } from '@/components/mobile/icons/FilledIcons';
import {
  CARD_W,
  EDGE_GUARD_PX,
  NEUTRAL_TINT,
  SLIDE_MS,
  SWIPE_THRESHOLD_PX,
  cardLayout,
  firstVerse,
  sampleTint,
} from './palco';
import '@/styles/karaoke-palco.css';

function prefersReducedMotion() {
  return typeof window !== 'undefined' && typeof window.matchMedia === 'function'
    ? window.matchMedia('(prefers-reduced-motion: reduce)').matches
    : false;
}

const EASE = 'cubic-bezier(0.22, 1, 0.36, 1)';

/**
 * Karaokê mobile « O Palco » (< 768 px ; remplace l'étape 6 et la §4.2 de la spec).
 * Pas de liste : une scène. Un carrousel 3D des chansons au karaokê publié (de la plus
 * récente à la plus ancienne), un projecteur sur la carte centrale, un halo de la
 * couleur de sa miniature, son premier vers qui se remplit de jaune, et un gros bouton
 * micro (seul jaune plein de l'écran) qui ouvre la lecture karaokê.
 *
 * `songs` : chansons au karaokê publié (isKaraokePublished). `unavailable` : données
 * karaokê indisponibles (panne, repli songs.json sans LRC) → état dégradé : la chanson
 * de la semaine seule au centre, « O karaokê volta já » à la place du micro. Jamais
 * d'écran vide.
 */
export default function KaraokePalco({ songs = [], isLoading = false, unavailable = false, onSing }) {
  const reduceMotion = prefersReducedMotion();
  const navigate = useNavigate();
  const ordered = useMemo(() => publishedNewestFirst(songs), [songs]);
  const [weekSong, setWeekSong] = useState(null);
  const degraded = !isLoading && (unavailable || ordered.length === 0);

  // État dégradé : la chanson de la semaine (Song.list retombe sur songs.json).
  useEffect(() => {
    if (!degraded || weekSong) return undefined;
    let alive = true;
    Song.list('-release_date', 1)
      .then((list) => { if (alive && Array.isArray(list) && list[0]) setWeekSong(list[0]); })
      .catch(() => {});
    return () => { alive = false; };
  }, [degraded, weekSong]);

  const items = degraded ? (weekSong ? [weekSong] : []) : ordered;
  const [index, setIndex] = useState(0);
  const safeIndex = Math.min(index, Math.max(items.length - 1, 0));
  const current = items[safeIndex] || null;
  const [announce, setAnnounce] = useState('');

  const go = (target) => {
    if (target < 0 || target >= items.length || target === safeIndex) return;
    setIndex(target);
    setAnnounce(`${items[target].title}${monthYearLabel(items[target]) ? `, ${monthYearLabel(items[target])}` : ''}`);
  };

  // ── Halo : couleur dominante de la miniature centrale, en fondu ────────────────
  // Image réellement affichée par chaque carte (une voisine déjà chargée ne recharge
  // rien en devenant centrale : on garde sa source).
  const [sources, setSources] = useState({});
  const keyOf = (song) => String(song?.id ?? song?.slug ?? song?.title);
  const rememberSource = (song) => (src) =>
    setSources((known) => (known[keyOf(song)] === src ? known : { ...known, [keyOf(song)]: src }));
  const centerSource = current ? sources[keyOf(current)] || null : null;
  const [tint, setTint] = useState(NEUTRAL_TINT);
  useEffect(() => {
    if (!centerSource) return undefined; // on garde la teinte précédente en attendant
    let alive = true;
    sampleTint(centerSource).then((rgb) => { if (alive) setTint(rgb); });
    return () => { alive = false; };
  }, [centerSource]);

  // ── Glissement horizontal (jamais depuis le bord gauche : geste retour d'iOS) ──
  const gestureRef = useRef(null);
  const suppressClickRef = useRef(false);
  const onPointerDown = (event) => {
    if (event.pointerType === 'mouse' && event.button !== 0) return;
    if (event.clientX < EDGE_GUARD_PX) return;
    gestureRef.current = { id: event.pointerId, x: event.clientX, y: event.clientY, done: false };
  };
  const onPointerMove = (event) => {
    const g = gestureRef.current;
    if (!g || g.id !== event.pointerId || g.done) return;
    const dx = event.clientX - g.x;
    const dy = event.clientY - g.y;
    if (Math.abs(dy) > Math.abs(dx) && Math.abs(dy) > 10) {
      gestureRef.current = null; // défilement vertical : on laisse faire
      return;
    }
    if (Math.abs(dx) >= SWIPE_THRESHOLD_PX) {
      g.done = true;
      suppressClickRef.current = true;
      setTimeout(() => { suppressClickRef.current = false; }, 400);
      go(safeIndex + (dx < 0 ? 1 : -1));
    }
  };
  const onPointerEnd = () => { gestureRef.current = null; };

  const onKeyDown = (event) => {
    if (event.key === 'ArrowRight') { event.preventDefault(); go(safeIndex + 1); }
    if (event.key === 'ArrowLeft') { event.preventDefault(); go(safeIndex - 1); }
  };

  const onCardClick = (i) => {
    if (suppressClickRef.current) return;
    if (i === safeIndex) {
      // État dégradé : la carte mène au Short de la chanson (le feed sur elle).
      if (degraded) navigate(`/?musica=${encodeURIComponent(getPublicSlug(current))}`);
      else onSing?.(current);
      return;
    }
    go(i);
  };

  const verse = degraded ? null : firstVerse(current);
  const period = current ? monthYearLabel(current) : null;
  const tintColor = `rgb(${tint[0]}, ${tint[1]}, ${tint[2]})`;
  // Largeur fixée par la seule largeur d'écran (Safari iOS : une largeur tirée de la
  // hauteur disponible tombait à ~90 px, barres du navigateur affichées) : 188 × 334 dès
  // 392 px de large, jamais moins de 160 px. Si la hauteur manque, la page défile.
  const cardSize = { width: `clamp(160px, 48vw, ${CARD_W}px)` };

  return (
    <div
      data-palco
      // Au moins la hauteur de la zone de contenu ; plus haute si l'écran est court (la
      // zone défile). Les voisines débordent sur les côtés : rognées horizontalement.
      className="relative isolate flex min-h-full w-full flex-col overflow-x-hidden bg-app-black text-white"
    >
      {/* Halo diffus de la couleur de la miniature centrale, en fondu entre les chansons. */}
      <div
        aria-hidden="true"
        data-palco-tint={tint.join(',')}
        className="pointer-events-none absolute left-1/2 top-[30%] -z-10 h-[70%] w-[130%] -translate-x-1/2 -translate-y-1/2 rounded-full opacity-50 blur-[80px] transition-[background-color] duration-700 ease-out motion-reduce:transition-none"
        style={{ backgroundColor: tintColor }}
      />

      {/* En-tête : « Karaokê », « O palco é seu », télé → Festa. */}
      <header className="flex items-start justify-between px-4 pt-4">
        <div>
          <h1 className="text-[30px] font-black leading-none tracking-tight">Karaokê</h1>
          <p className="mt-2 text-[11px] font-medium uppercase tracking-[0.28em] text-white/70">O palco é seu</p>
        </div>
        <Link
          to="/festa"
          aria-label="Festa na TV"
          className="-mr-1 flex h-11 w-11 touch-manipulation items-center justify-center rounded-full text-white active:opacity-70"
        >
          <Tv className="h-6 w-6" aria-hidden="true" />
        </Link>
      </header>

      {/* Carrousel 3D. */}
      <div className="relative mt-3 flex flex-1 flex-col items-center justify-center">
        {/* Projecteur : cône jaune sur la carte centrale. */}
        {current ? (
          // Centré par ses bords, pas par une translation : l'animation d'oscillation
          // (transform: rotate) remplacerait la translation et décalerait le cône.
          <div aria-hidden="true" className="palco-spotlight pointer-events-none absolute -top-16 left-[15%] right-[15%] z-0 h-[115%]" />
        ) : null}

        <div
          data-palco-carousel
          role="region"
          aria-roledescription="carrossel"
          aria-label="Músicas com karaokê"
          tabIndex={-1}
          onKeyDown={onKeyDown}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerEnd}
          onPointerCancel={onPointerEnd}
          className="relative z-10 w-full [touch-action:pan-y]"
          style={{ perspective: reduceMotion ? 'none' : '1000px' }}
        >
          <ul className="relative mx-auto aspect-[9/16] [transform-style:preserve-3d]" style={cardSize}>
            {items.length === 0 ? (
              <li aria-hidden="true" className="absolute inset-0 rounded-[22px] border border-white/10 bg-white/5" />
            ) : (
              items.map((song, i) => {
                const layout = cardLayout(i - safeIndex, reduceMotion);
                const center = i === safeIndex;
                return (
                  <li
                    key={song.id ?? song.slug ?? song.title}
                    className="absolute inset-0"
                    style={{
                      transform: layout.transform,
                      opacity: layout.opacity,
                      zIndex: layout.zIndex,
                      visibility: layout.visible ? 'visible' : 'hidden',
                      transition: reduceMotion ? 'none' : `transform ${SLIDE_MS}ms ${EASE}, opacity ${SLIDE_MS}ms ${EASE}`,
                    }}
                  >
                    <button
                      type="button"
                      onClick={() => onCardClick(i)}
                      tabIndex={layout.visible ? 0 : -1}
                      aria-current={center ? 'true' : undefined}
                      aria-label={center ? (degraded ? `Ver o clipe de ${song.title}` : `Cantar ${song.title}`) : song.title}
                      className="relative block h-full w-full touch-manipulation overflow-hidden rounded-[22px] border border-white/10 bg-[#1b1c22] shadow-app-float"
                    >
                      {layout.visible ? (
                        <TileImage song={song} eager={Math.abs(i - safeIndex) <= 1} onSource={rememberSource(song)} />
                      ) : null}
                      <span className={`absolute inset-x-0 bottom-0 line-clamp-3 px-3 pb-3 text-left text-[15px] font-black leading-tight text-white ${TEXT_SHADOW}`}>
                        {song.title}
                      </span>
                      {center && !degraded ? <Equalizer /> : null}
                    </button>
                  </li>
                );
              })
            )}
          </ul>
        </div>

        {/* Chanson centrale : mois et année, titre, premier vers. */}
        <div className="relative z-10 mt-5 w-full px-6 text-center">
          {period ? (
            <p className="text-[11px] font-medium uppercase tracking-[0.28em] text-white/70">{period}</p>
          ) : null}
          {current ? (
            <h2 className="mt-1.5 line-clamp-2 text-2xl font-black leading-tight tracking-tight">{current.title}</h2>
          ) : null}
          {verse ? (
            <p data-palco-verse className="palco-verse mx-auto mt-2 max-w-[20rem] truncate text-base font-bold">
              {verse}
            </p>
          ) : null}
        </div>
      </div>

      {/* Bas : précédent, micro (seul jaune plein de l'écran), suivant. */}
      <div className="relative z-10 flex items-center justify-center gap-8 px-6 pb-6 pt-5">
        {degraded ? (
          <p className="flex min-h-[76px] items-center text-lg font-extrabold">O karaokê volta já</p>
        ) : (
          <>
            <button
              type="button"
              onClick={() => go(safeIndex - 1)}
              disabled={safeIndex === 0}
              aria-label="Música anterior"
              className="flex h-11 w-11 touch-manipulation items-center justify-center rounded-full border border-white/20 text-white active:bg-white/10 disabled:opacity-30"
            >
              <ChevronLeft className="h-6 w-6" aria-hidden="true" />
            </button>
            <button
              type="button"
              onClick={() => current && onSing?.(current)}
              disabled={!current}
              aria-label={current ? `Cantar ${current.title}` : 'Cantar'}
              className="relative flex h-[76px] w-[76px] touch-manipulation items-center justify-center rounded-full bg-app-yellow text-[#171505] active:scale-95 disabled:opacity-40"
            >
              <span aria-hidden="true" className="palco-mic-wave absolute inset-0 rounded-full border-2 border-[#FDE047]" />
              <MicFilled className="relative h-9 w-9" />
            </button>
            <button
              type="button"
              onClick={() => go(safeIndex + 1)}
              disabled={safeIndex >= items.length - 1}
              aria-label="Próxima música"
              className="flex h-11 w-11 touch-manipulation items-center justify-center rounded-full border border-white/20 text-white active:bg-white/10 disabled:opacity-30"
            >
              <ChevronRight className="h-6 w-6" aria-hidden="true" />
            </button>
          </>
        )}
      </div>

      <p className="sr-only" aria-live="polite">{announce}</p>
    </div>
  );
}

/** Petit égaliseur animé de la carte centrale (masqué en mouvement réduit). */
function Equalizer() {
  return (
    <span aria-hidden="true" className="palco-eq absolute right-3 top-3 flex h-4 items-end gap-[3px]">
      {[0, 1, 2, 3].map((bar) => (
        <span key={bar} className="palco-eq-bar block h-full w-[3px] rounded-full bg-white" />
      ))}
    </span>
  );
}
