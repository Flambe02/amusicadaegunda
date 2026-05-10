import { Link } from 'react-router-dom';
import { useState } from 'react';
import { Bell, ChevronLeft, ChevronRight, Play, Share2, SkipBack, SkipForward } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import AppButton from './AppButton';
import AppCard from './AppCard';
import AppChip from './AppChip';
import YouTubeEmbed from '@/components/YouTubeEmbed';
import { BRAND_SQUARE_SMALL } from '@/lib/imageAssets';
import { getYouTubeThumbnailUrl, titleToSlug } from '@/lib/utils';

const CATEGORY_LABELS = {
  politica: 'Política',
  futebol: 'Futebol',
  bbb: 'BBB',
  economia: 'Economia',
  cultura: 'Cultura',
  trabalho: 'Trabalho',
  brasil: 'Brasil',
  'caos-nacional': 'Caos nacional',
  celebridades: 'Celebridades',
  nostalgia: 'Nostalgia',
};

function formatSongDate(date) {
  if (!date) return 'Sem data';
  try {
    return format(parseISO(date), "dd 'de' MMMM 'de' yyyy", { locale: ptBR });
  } catch {
    return 'Sem data';
  }
}

function getContextPreview(song) {
  const source = song?.description || song?.subtitle || '';
  const normalized = source.replace(/\s+/g, ' ').trim();
  if (!normalized) return 'Uma parodia musical para transformar a noticia da semana em refrao.';
  return normalized.length > 104 ? `${normalized.slice(0, 101).trim()}...` : normalized;
}

function getCategoryLabel(category) {
  if (!category) return 'Atualidade';
  return CATEGORY_LABELS[category] || category.charAt(0).toUpperCase() + category.slice(1);
}

function getArtwork(song, fallback) {
  if (!song) return fallback;
  return (
    getYouTubeThumbnailUrl(song.youtube_url || song.youtube_music_url, 'hqdefault') ||
    song.cover_image ||
    song.thumbnail_url ||
    fallback
  );
}

function getVideoBackdrop(song, fallback) {
  if (!song) return fallback;
  return (
    getYouTubeThumbnailUrl(song.youtube_music_url || song.youtube_url, 'maxresdefault') ||
    getYouTubeThumbnailUrl(song.youtube_music_url || song.youtube_url, 'hqdefault') ||
    fallback
  );
}

function PlatformPill({ href, tone, children }) {
  if (!href) return null;
  const tones = {
    spotify: 'border-emerald-500/28 bg-emerald-500/14 text-emerald-400',
    youtube: 'border-red-500/28 bg-red-500/14 text-red-400',
    apple: 'border-pink-500/28 bg-pink-500/14 text-pink-400',
  };

  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className={`inline-flex min-h-8 items-center gap-1.5 rounded-full border px-3 text-[11px] font-black transition active:scale-[0.98] ${tones[tone]}`}
    >
      {children}
    </a>
  );
}

export default function MobileHomeApp({
  currentSong,
  heroArtwork,
  videoActivated,
  onListen,
  onCloseVideo,
  onShare,
  onShowPlatforms,
  onPreviousSong,
  onNextSong,
  canNavigatePrevious = false,
  canNavigateNext = false,
}) {
  const [touchStart, setTouchStart] = useState(null);
  const hasSong = Boolean(currentSong);
  const category = getCategoryLabel(currentSong?.category);
  const releaseDate = formatSongDate(currentSong?.release_date);
  const heroImage = getVideoBackdrop(currentSong, getArtwork(currentSong, heroArtwork));
  const songSlug = currentSong?.slug || (currentSong?.title ? titleToSlug(currentSong.title) : null);

  const handleTouchStart = (event) => {
    const touch = event.touches?.[0];
    if (!touch) return;
    setTouchStart({ x: touch.clientX, y: touch.clientY });
  };

  const handleTouchEnd = (event) => {
    if (!touchStart) return;
    const touch = event.changedTouches?.[0];
    if (!touch) return;

    const deltaX = touch.clientX - touchStart.x;
    const deltaY = touch.clientY - touchStart.y;
    setTouchStart(null);

    if (Math.abs(deltaX) < 58 || Math.abs(deltaX) < Math.abs(deltaY) * 1.25) return;
    if (deltaX > 0 && canNavigatePrevious) onPreviousSong?.();
    if (deltaX < 0 && canNavigateNext) onNextSong?.();
  };

  return (
    <div className="flex h-full min-h-full flex-col overflow-x-hidden bg-[radial-gradient(circle_at_50%_0%,rgba(253,224,71,0.10),transparent_30%),linear-gradient(180deg,#050505_0%,#0b0b0b_48%,#050505_100%)] px-4 pb-4 pt-[max(env(safe-area-inset-top),0.6rem)] text-app-white">
      <header className="mb-2 grid min-h-[54px] grid-cols-[44px_1fr_44px] items-center">
        <span aria-hidden="true" />
        <Link to="/" className="mx-auto flex flex-col items-center">
          <span className="h-8 w-8 overflow-hidden rounded-lg border border-app-border bg-app-surface">
            <img
              src={BRAND_SQUARE_SMALL}
              alt="A Musica da Segunda"
              className="h-full w-full object-cover"
              width="32"
              height="32"
            />
          </span>
          <span className="mt-0.5 text-center text-[10px] font-black leading-tight text-app-yellow">
            A MUSICA<br />DA SEGUNDA
          </span>
        </Link>
        <button
          type="button"
          className="ml-auto flex h-10 w-10 items-center justify-center rounded-full border border-app-border bg-black/32 text-white/70"
          aria-label="Receber notificacoes"
        >
          <Bell className="h-5 w-5" />
        </button>
      </header>

      <main className="mx-auto flex w-full max-w-[390px] min-h-0 flex-1 flex-col gap-2.5">
        <section className="flex min-h-0 flex-1 flex-col">
          <div
            className="relative flex min-h-[452px] w-full max-w-full flex-1 flex-col overflow-hidden rounded-[14px] border border-app-yellow/18 bg-app-charcoal shadow-[0_28px_80px_rgba(0,0,0,0.62)]"
            onTouchStart={handleTouchStart}
            onTouchEnd={handleTouchEnd}
          >
            <img
              src={heroImage}
              alt=""
              className="absolute inset-0 h-full w-full object-cover"
              width="720"
              height="980"
              loading="eager"
            />

            <div
              className={`absolute inset-0 bg-[linear-gradient(180deg,rgba(0,0,0,0.05)_0%,rgba(0,0,0,0.16)_30%,rgba(0,0,0,0.54)_66%,rgba(0,0,0,0.96)_100%)] transition-opacity duration-200 ${
                hasSong && videoActivated ? 'opacity-0 pointer-events-none' : 'opacity-100'
              }`}
            />

            {hasSong && videoActivated ? (
              <div className="absolute inset-0 z-10 flex max-w-full items-center justify-center overflow-hidden bg-black">
                <YouTubeEmbed
                  youtubeMusicUrl={currentSong.youtube_music_url}
                  youtubeUrl={currentSong.youtube_url}
                  title={currentSong.title}
                  useFacade
                  autoplayOnActivate
                  forceActivated={videoActivated}
                  startMuted={false}
                  thumbnailQuality="hqdefault"
                  shortMaxWidth={390}
                  playButtonStyle="minimal"
                />
                <button
                  type="button"
                  onClick={onCloseVideo}
                  className="absolute left-3 top-3 z-30 flex h-11 w-11 items-center justify-center rounded-full border border-white/16 bg-black/54 text-white shadow-[0_10px_28px_rgba(0,0,0,0.45)] backdrop-blur-xl transition active:scale-95"
                  aria-label="Voltar para a capa"
                >
                  <ChevronLeft className="h-5 w-5" />
                </button>
              </div>
            ) : null}

            {hasSong && videoActivated && (canNavigatePrevious || canNavigateNext) ? (
              <div className="pointer-events-none absolute inset-x-3 top-1/2 z-20 flex -translate-y-1/2 justify-between">
                <button
                  type="button"
                  onClick={onPreviousSong}
                  disabled={!canNavigatePrevious}
                  className="pointer-events-auto flex h-10 w-10 items-center justify-center rounded-full border border-white/14 bg-black/42 text-white/80 backdrop-blur-xl transition active:scale-95 disabled:opacity-25"
                  aria-label="Video anterior"
                >
                  <ChevronLeft className="h-5 w-5" />
                </button>
                <button
                  type="button"
                  onClick={onNextSong}
                  disabled={!canNavigateNext}
                  className="pointer-events-auto flex h-10 w-10 items-center justify-center rounded-full border border-white/14 bg-black/42 text-white/80 backdrop-blur-xl transition active:scale-95 disabled:opacity-25"
                  aria-label="Proxima video"
                >
                  <ChevronRight className="h-5 w-5" />
                </button>
              </div>
            ) : null}

            <div
              className={`absolute inset-x-3 top-3 transition-opacity duration-200 ${
                hasSong && videoActivated ? 'opacity-0 pointer-events-none' : 'opacity-100'
              }`}
            >
              <AppChip variant="solid" className="min-h-6 px-2.5 text-[9px] tracking-[0.10em]">
                MUSICA DA SEMANA
              </AppChip>
            </div>

            <div
              className={`absolute inset-x-3 bottom-10 space-y-2.5 transition-opacity duration-200 ${
                hasSong && videoActivated ? 'opacity-0 pointer-events-none' : 'opacity-100'
              }`}
            >
              <h1 className="line-clamp-2 text-[3.05rem] font-black leading-[0.86] tracking-tight text-white drop-shadow-[0_4px_22px_rgba(0,0,0,0.72)]">
                {currentSong?.title || '6x1'}
              </h1>

              <div className="flex flex-col items-start gap-1.5">
                <AppChip variant="active" className="min-h-6 border-app-yellow/30 bg-black/42 px-2 text-[9px] normal-case tracking-normal">
                  {category}
                </AppChip>
                <span className="text-[11px] font-semibold text-white/78">{releaseDate}</span>
              </div>

              <p className="line-clamp-3 max-w-[66%] text-[11px] font-medium leading-4 text-white/82">
                {getContextPreview(currentSong)}
              </p>

              <div className="grid grid-cols-1 gap-2 pr-[48%]">
                <AppButton size="md" onClick={onListen} disabled={!hasSong} className="min-h-10 justify-start px-4 text-xs">
                  <Play className="h-4 w-4 fill-current" />
                  Ouvir agora
                </AppButton>
                <AppButton
                  variant="secondary"
                  onClick={onShare}
                  disabled={!hasSong}
                  className="min-h-10 justify-start border-white/18 bg-black/56 px-4 text-xs"
                >
                  <Share2 className="h-4 w-4" />
                  Compartilhar
                </AppButton>
              </div>
            </div>
          </div>
        </section>

        <AppCard className="grid grid-cols-[44px_minmax(0,1fr)_44px] items-center gap-3 rounded-[12px] p-3">
          <button
            type="button"
            onClick={onPreviousSong}
            disabled={!canNavigatePrevious}
            className="flex h-11 w-11 items-center justify-center rounded-full border border-white/10 bg-black/28 text-white transition active:scale-95 disabled:opacity-28"
            aria-label="Musica anterior"
          >
            <SkipBack className="h-4 w-4" />
          </button>

          <div className="min-w-0 text-center">
            <p className="text-[9px] font-bold uppercase tracking-[0.16em] text-app-subtle">
              TROCAR MUSICA
            </p>
            {songSlug ? (
              <Link
                to={`/musica/${songSlug}`}
                className="mt-1 block truncate text-base font-black leading-tight text-app-white transition hover:text-app-yellow active:scale-[0.99]"
              >
                {currentSong?.title || 'A Musica da Segunda'}
              </Link>
            ) : (
              <p className="mt-1 truncate text-base font-black leading-tight text-app-white">
                {currentSong?.title || 'A Musica da Segunda'}
              </p>
            )}
            <p className="mt-0.5 text-[11px] font-semibold text-app-muted">
              Deslize ou toque para navegar
            </p>
          </div>

          <button
            type="button"
            onClick={onNextSong}
            disabled={!canNavigateNext}
            className="flex h-11 w-11 items-center justify-center rounded-full bg-app-yellow text-black shadow-app-soft transition active:scale-95 disabled:bg-white/10 disabled:text-white/38 disabled:shadow-none"
            aria-label="Proxima musica"
          >
            <SkipForward className="h-4 w-4" />
          </button>
        </AppCard>

        <div className="flex flex-wrap items-center gap-1.5">
          <p className="mr-1 text-[10px] font-semibold text-white/56">Ouça também em</p>
          <PlatformPill tone="spotify" href={currentSong?.spotify_url}>
            Spotify
          </PlatformPill>
          <PlatformPill tone="youtube" href={currentSong?.youtube_url || currentSong?.youtube_music_url}>
            YouTube
          </PlatformPill>
          <PlatformPill tone="apple" href={currentSong?.apple_music_url}>
            Apple Music
          </PlatformPill>
        </div>
      </main>
    </div>
  );
}
