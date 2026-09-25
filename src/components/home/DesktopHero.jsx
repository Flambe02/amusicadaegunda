import { Link } from 'react-router-dom';
import { FileText, Mic, Play, Share2 } from 'lucide-react';
import {
  getDurationLabel,
  getHeroImage,
  getHookLine,
  getNewsHeadline,
  getPlatformLinks,
  getWeekLabel,
  hasWatchableVideo,
} from '@/lib/homeSongMedia';

/** Aplat de repli quand aucune image n'est exploitable (addendum §2, étape 4). */
const HERO_SURFACE = '#14141a';

const FOCUS_RING =
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FDE047] focus-visible:ring-offset-2 focus-visible:ring-offset-black';

const BRAND_ICONS = {
  spotify: {
    color: '#1DB954',
    path: 'M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.419 1.56-.299.421-1.02.599-1.559.3z',
  },
  appleMusic: {
    color: '#FA5B6B',
    path: 'M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.8-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z',
  },
  youtubeMusic: {
    color: '#FF4444',
    path: 'M23.495 6.205a3.007 3.007 0 0 0-2.088-2.088c-1.87-.501-9.396-.501-9.396-.501s-7.507-.01-9.396.501A3.007 3.007 0 0 0 .527 6.205a31.247 31.247 0 0 0-.522 5.805 31.247 31.247 0 0 0 .522 5.783 3.007 3.007 0 0 0 2.088 2.088c1.868.502 9.396.502 9.396.502s7.506 0 9.396-.502a3.007 3.007 0 0 0 2.088-2.088 31.247 31.247 0 0 0 .5-5.783 31.247 31.247 0 0 0-.5-5.805zM9.609 15.601V8.408l6.264 3.602z',
  },
};

function BrandIcon({ platformKey }) {
  const icon = BRAND_ICONS[platformKey];
  if (!icon) return null;

  return (
    <svg className="h-[15px] w-[15px] shrink-0" viewBox="0 0 24 24" fill={icon.color} aria-hidden="true">
      <path d={icon.path} />
    </svg>
  );
}

/**
 * Le titre est la seule donnée dont la longueur varie beaucoup (spec §12 cas 1).
 * On réduit par paliers plutôt que de laisser déborder ou chevaucher l'image.
 */
function titleSizeClass(title) {
  const length = String(title || '').length;
  if (length <= 18) return 'text-6xl xl:text-7xl';
  if (length <= 30) return 'text-5xl xl:text-6xl';
  if (length <= 46) return 'text-4xl xl:text-5xl';
  return 'text-3xl xl:text-4xl';
}

/**
 * Hero de la homepage desktop (>= 1024 px), spec §6.
 *
 * Hauteur bornée et JAMAIS dépendante du viewport. La colonne droite porte
 * l'image de la semaine ; un dégradé posé par ce composant garantit que le titre
 * reste lisible même sur une image entièrement blanche — c'est la contrainte non
 * négociable du spec, la lisibilité ne doit pas dépendre du visuel hebdomadaire.
 */
export default function DesktopHero({
  song,
  buildArtwork,
  onWatch,
  onLyrics,
  onSing,
  onShare,
}) {
  if (!song) return null;

  const weekLabel = getWeekLabel(song);
  const newsHeadline = getNewsHeadline(song);
  const hookLine = getHookLine(song);
  const durationLabel = getDurationLabel(song);
  const platforms = getPlatformLinks(song);
  const heroImage = getHeroImage(song, buildArtwork);
  const watchable = hasWatchableVideo(song);

  // `aria-label` plutôt qu'`aria-labelledby` : Layout.jsx monte {children} DEUX fois
  // (shell mobile + shell desktop), donc tout `id` posé ici serait dupliqué dans le
  // DOM — ce qui est invalide et trompe les lecteurs d'écran.
  return (
    <section
      className="relative isolate min-h-[480px] max-h-[560px] overflow-hidden border-b border-white/8"
      style={{ backgroundColor: HERO_SURFACE }}
      aria-label={song.title}
    >
      {/* Colonne droite : ~40% de la largeur. L'image déborde volontairement vers la
          gauche, le dégradé ci-dessous la ramène à une bande droite perçue. */}
      <div className="absolute inset-y-0 right-0 w-[55%]" style={{ backgroundColor: HERO_SURFACE }}>
        {heroImage ? (
          <img
            src={heroImage}
            alt=""
            aria-hidden="true"
            className="h-full w-full object-cover object-center"
            fetchPriority="high"
            loading="eager"
            decoding="async"
          />
        ) : null}
      </div>

      {/* Dégradé de lisibilité — opacité >= 0,92 sur le tiers gauche, bien au-delà du
          minimum de 0,75 exigé. Testé avec une image entièrement blanche. */}
      <div
        className="absolute inset-0"
        aria-hidden="true"
        style={{
          background:
            'linear-gradient(to right, rgba(20,20,26,0.97) 0%, rgba(20,20,26,0.94) 33%, rgba(20,20,26,0.72) 52%, rgba(20,20,26,0.15) 78%, rgba(20,20,26,0) 100%)',
        }}
      />

      <div className="relative flex h-full min-h-[480px] max-w-[60%] flex-col justify-center gap-5 px-10 py-12 xl:px-12">
        {/* Bandeau manchette — masqué en entier quand la manchette manque (spec §3).
            Lu comme un seul groupe : le séparateur est décoratif. */}
        {newsHeadline && weekLabel ? (
          <p className="flex items-center gap-2 border-l-2 border-[#FDE047] py-1 pl-3 text-[12px] leading-snug">
            <span className="text-[#FDE047]">{weekLabel}</span>
            <span className="text-white/35" aria-hidden="true">·</span>
            <span className="text-white/70">{newsHeadline}</span>
          </p>
        ) : null}

        <p className="text-[12px] uppercase tracking-[0.18em] text-white/55">
          A notícia desta semana virou música
        </p>

        <h1
          data-hero-title
          className={`max-w-[16ch] font-black leading-[0.98] tracking-tight text-white ${titleSizeClass(song.title)}`}
        >
          {song.title}
        </h1>

        {/* 120 caractères tiennent en deux lignes à cette largeur : `line-clamp-2` ne
            sert que de filet et n'ajoute donc pas d'ellipse en pratique — le spec §3
            interdit les points de suspension, le §6 impose deux lignes maximum. */}
        {hookLine ? (
          <p className="max-w-[62ch] text-[15px] leading-relaxed text-white/78 line-clamp-2">
            {hookLine}
          </p>
        ) : null}

        {/* Rangée d'actions. `Assistir agora` est le seul élément saturé du hero. */}
        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={onWatch}
            className={`inline-flex items-center gap-2 rounded-full bg-[#FDE047] px-6 py-3 text-[14px] font-bold text-black transition hover:bg-[#fde047]/90 ${FOCUS_RING}`}
          >
            <Play className="h-4 w-4" aria-hidden="true" />
            {watchable ? 'Assistir agora' : 'Ouvir agora'}
          </button>

          <Link
            to={`/musica/${song.slug}`}
            className={`inline-flex items-center rounded-full border border-white/25 px-5 py-3 text-[14px] text-white/88 transition hover:border-white/40 hover:text-white ${FOCUS_RING}`}
          >
            Entenda a notícia
          </Link>

          {/* Paire segmentée dans un même conteneur bordé. */}
          <div className="inline-flex overflow-hidden rounded-full border border-white/25">
            <button
              type="button"
              onClick={onLyrics}
              className={`inline-flex items-center gap-2 px-5 py-3 text-[14px] text-white/88 transition hover:bg-white/8 hover:text-white ${FOCUS_RING}`}
            >
              <FileText className="h-4 w-4" aria-hidden="true" />
              Letra
            </button>

            {onSing ? (
              <button
                type="button"
                onClick={onSing}
                className={`inline-flex items-center gap-2 border-l border-white/25 px-5 py-3 text-[14px] text-white/88 transition hover:bg-white/8 hover:text-white ${FOCUS_RING}`}
              >
                <Mic className="h-4 w-4" aria-hidden="true" />
                Cantar
              </button>
            ) : null}
          </div>

          {durationLabel ? (
            <span className="text-[13px] text-white/45">{durationLabel}</span>
          ) : null}
        </div>

        {/* Rangée plateformes — disparaît en entier, libellé compris, si aucune URL. */}
        {platforms.length > 0 ? (
          <div className="flex flex-wrap items-center gap-2.5">
            <span className="mr-1 text-[12px] text-white/45">Ouvir e seguir</span>

            {platforms.map((platform) => (
              <a
                key={platform.key}
                href={platform.url}
                target="_blank"
                rel="noopener noreferrer"
                className={`inline-flex items-center gap-2 rounded-full border border-white/18 px-4 py-2 text-[12px] text-white/80 transition hover:border-white/35 hover:text-white ${FOCUS_RING}`}
              >
                <BrandIcon platformKey={platform.key} />
                {platform.label}
              </a>
            ))}

            <button
              type="button"
              onClick={onShare}
              aria-label={`Compartilhar ${song.title}`}
              className={`inline-flex h-9 w-9 items-center justify-center rounded-full border border-white/18 text-white/80 transition hover:border-white/35 hover:text-white ${FOCUS_RING}`}
            >
              <Share2 className="h-4 w-4" aria-hidden="true" />
            </button>
          </div>
        ) : null}
      </div>
    </section>
  );
}
