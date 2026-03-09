import { useState, useEffect, useCallback, memo, useRef } from 'react';
import { Song } from '@/api/entities';
import { logger } from '@/lib/logger';
import CountdownTimer from '../components/CountdownTimer';
import {
  AlertCircle,
  RefreshCw,
  Music,
  Calendar,
  ChevronLeft,
  ChevronRight,
  Play,
  FileText,
  Share2,
  Clock,
  SkipBack,
  SkipForward,
  Volume2,
  Sparkles,
  Disc3,
  Pause,
  Square,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import LyricsDialog from '../components/LyricsDialog';
import LyricsDrawer from '../components/LyricsDrawer';
import PlatformsDrawer from '../components/PlatformsDrawer';
import HistoryDrawer from '../components/HistoryDrawer';
import HomeMobileImmersive from '../components/HomeMobileImmersive';
import YouTubeEmbed from '@/components/YouTubeEmbed';
import { AnimatePresence, motion } from 'framer-motion';

import { format, startOfMonth, endOfMonth, isWithinInterval, parseISO, addMonths, isSameMonth } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import '../styles/tiktok-optimized.css';
import { localStorageService } from '@/lib/localStorage';
import { saveLastSongSnapshot } from '@/lib/offlineSongStore';
import { useSEO } from '../hooks/useSEO';
import { Helmet } from 'react-helmet-async';
import { getDocumentTitle } from '@/lib/documentTitle';
import { useToast } from '@/components/ui/use-toast';
import { extractYouTubeId } from '@/lib/utils';
// VideoObject JSON-LD removed from all pages (GSC: "Video isn't on a watch page")
// No page in this app is a dedicated watch page for a single video.

// Composant memoïzé pour éviter les re-renders inutiles de la liste de chansons
function getNextMondayMidnight() {
  const now = new Date();
  const target = new Date(now);
  const day = now.getDay();
  const daysUntilNextMonday = ((8 - day) % 7) || 7;

  target.setDate(now.getDate() + daysUntilNextMonday);
  target.setHours(0, 0, 0, 0);

  return target;
}

function getDesktopCountdown() {
  const now = new Date();
  const target = getNextMondayMidnight();
  const diff = Math.max(target.getTime() - now.getTime(), 0);

  return {
    days: Math.floor(diff / (1000 * 60 * 60 * 24)),
    hours: Math.floor(diff / (1000 * 60 * 60)) % 24,
    minutes: Math.floor(diff / (1000 * 60)) % 60,
    seconds: Math.floor(diff / 1000) % 60,
  };
}

function DesktopCountdown() {
  const [timeLeft, setTimeLeft] = useState(() => getDesktopCountdown());

  useEffect(() => {
    const timer = window.setInterval(() => {
      setTimeLeft(getDesktopCountdown());
    }, 1000);

    return () => window.clearInterval(timer);
  }, []);

  const items = [
    { label: 'Dias', value: timeLeft.days },
    { label: 'Horas', value: timeLeft.hours },
    { label: 'Min', value: timeLeft.minutes },
    { label: 'Seg', value: timeLeft.seconds },
  ];

  return (
    <div className="space-y-3">
      <p className="text-[11px] font-medium uppercase tracking-[0.28em] text-white/45">
        Próxima estreia
      </p>
      <div className="flex flex-wrap gap-4 xl:gap-5">
        {items.map((item) => (
          <div key={item.label} className="min-w-[60px] xl:min-w-[70px]">
            <div className="text-2xl font-black tracking-tight text-white xl:text-4xl">
              {String(item.value).padStart(2, '0')}
            </div>
            <div className="mt-1 text-[10px] uppercase tracking-[0.24em] text-white/45 xl:text-[11px]">
              {item.label}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

const catalogSlideVariants = {
  enter: (direction) => ({
    x: direction < 0 ? 72 : -72,
    opacity: 0,
  }),
  center: {
    x: 0,
    opacity: 1,
  },
  exit: (direction) => ({
    x: direction < 0 ? -72 : 72,
    opacity: 0,
  }),
};

const SongListItem = memo(function SongListItem({ song, onSelect, thumbnailUrl }) {
  return (
    <button
      type="button"
      onClick={(e) => onSelect(song, e)}
      className="group glass-panel desktop-shell-gradient w-full overflow-hidden rounded-[30px] p-3 text-left transition-all duration-300 hover:-translate-y-1 hover:bg-white/[0.07]"
      title="Clique para ver esta música no player"
    >
      <div className="relative aspect-[4/5] overflow-hidden rounded-[26px] bg-black">
        {thumbnailUrl ? (
          <img
            src={thumbnailUrl}
            alt=""
            aria-hidden="true"
            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
            loading="lazy"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-zinc-900 to-zinc-800">
            <Music className="h-10 w-10 text-white/40" />
          </div>
        )}

        <div className="absolute inset-0 bg-gradient-to-t from-black via-black/25 to-transparent" />

        <div className="absolute inset-x-0 bottom-0 p-4">
          <div className="flex items-center justify-between gap-3">
            <div className="text-[11px] uppercase tracking-[0.22em] text-white/55">
              {song.release_date
                ? format(parseISO(song.release_date), 'dd MMM', { locale: ptBR })
                : 'Sem data'}
            </div>
            <span className="flex h-10 w-10 items-center justify-center rounded-full bg-[#FDE047] text-black shadow-lg transition-transform duration-300 group-hover:scale-110">
              <Play className="h-4 w-4 fill-current" />
            </span>
          </div>
        </div>
      </div>

      <div className="px-2 pb-2 pt-4">
        <h3 className="truncate text-lg font-bold text-white">{song.title}</h3>
        <p className="mt-1 truncate text-sm text-white/65">{song.artist}</p>
      </div>
    </button>
  );
});

// LCP fix: YouTube facade displays thumbnail + play button instead of loading iframe eagerly.
// Iframe loads only on click to improve LCP.
// Props attendues: youtube_music_url, youtube_url, title
export default function Home() {
  const HOME_SONGS_LIMIT = 120;
  logger.debug('Home component loaded');
  const { toast } = useToast();
  const [currentSong, setCurrentSong] = useState(null);
  const [recentSongs, setRecentSongs] = useState([]);
  const [allSongs, setAllSongs] = useState([]); // Toutes les chansons pour la navigation
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [videoActivated, setVideoActivated] = useState(false);
  const [showPlatformsDialog, setShowPlatformsDialog] = useState(false);
  const [showLyricsDialog, setShowLyricsDialog] = useState(false);
  const [showLyricsDrawer, setShowLyricsDrawer] = useState(false);
  const [showPlatformsDrawer, setShowPlatformsDrawer] = useState(false);
  const [showHistoryDrawer, setShowHistoryDrawer] = useState(false);
  const [showDescriptionDialog, setShowDescriptionDialog] = useState(false);
  const [showFullDescription, setShowFullDescription] = useState(false);
  const [selectedSongForDialog, setSelectedSongForDialog] = useState(null);
  const [displayedSong, setDisplayedSong] = useState(null);
  const [playerBarActive, setPlayerBarActive] = useState(false);
  const [playerBarPlaying, setPlayerBarPlaying] = useState(false);
  const playerIframeRef = useRef(null);
  const desktopHeroPlayerRef = useRef(null);
  const [desktopVideoResetKey, setDesktopVideoResetKey] = useState(0);
  const [backgroundImageLoaded, setBackgroundImageLoaded] = useState(false);
  const [desktopVolume, setDesktopVolume] = useState(72);
  const [catalogMonthDate, setCatalogMonthDate] = useState(() => startOfMonth(new Date()));
  const [catalogDirection, setCatalogDirection] = useState(-1);

  useEffect(() => {
    logger.debug('Home useEffect triggered');
    localStorageService.initialize();

    // Single fetch: current song + list data
    loadSongsData();
  }, []);

  useEffect(() => {
    setRecentSongs(getSongsForMonth(allSongs, catalogMonthDate));
  }, [allSongs, catalogMonthDate]);

  const getLatestPublishedByCreatedAt = (songs) => {
    if (!Array.isArray(songs) || songs.length === 0) return null;
    return songs.reduce((latest, song) => {
      if (!latest) return song;
      const latestDate = latest?.created_at ? new Date(latest.created_at).getTime() : 0;
      const songDate = song?.created_at ? new Date(song.created_at).getTime() : 0;
      return songDate > latestDate ? song : latest;
    }, null);
  };

  const getSongsForMonth = (songs, referenceDate) => {
    if (!Array.isArray(songs) || songs.length === 0) return [];

    const monthStart = startOfMonth(referenceDate);
    const monthEnd = endOfMonth(referenceDate);

    return songs.filter((song) => {
      const songDate = parseISO(song.release_date);
      return isWithinInterval(songDate, { start: monthStart, end: monthEnd });
    });
  };

  const loadSongsData = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const allSongsData = await Song.list('-release_date', HOME_SONGS_LIMIT);
      const publishedSongs = (Array.isArray(allSongsData) ? allSongsData : [])
        .filter((song) => !song?.status || song.status === 'published');

      setAllSongs(publishedSongs);

      // Keep previous behavior: current song chosen by newest created_at
      const current = getLatestPublishedByCreatedAt(publishedSongs);
      setCurrentSong(current);
      setDisplayedSong(current);
      setBackgroundImageLoaded(false);

      // Cache last song for offline page
      if (current) {
        try {
          localStorage.setItem('last-song-cache', JSON.stringify({
            title: current.title,
            artist: current.artist,
            slug: current.slug,
            thumbnail: current.thumbnail_url || null,
          }));
        } catch {}
      }

      if (!current) {
        setError('Erro ao carregar a música da semana. Tente novamente.');
      }
    } catch (err) {
      logger.error('Erro ao carregar musicas:', err);
      setError('Erro ao carregar a música da semana. Tente novamente.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleRetry = () => {
    loadSongsData();
  };

  const handleReplaceVideo = useCallback((song, event) => {
    if (event) {
      event.preventDefault();
      event.stopPropagation();
    }
    logger.debug('handleReplaceVideo appelé avec:', song.title);
    setDisplayedSong(song);
    setBackgroundImageLoaded(false);
    setVideoActivated(false);
    setShowFullDescription(false);
    setPlayerBarActive(false);
    setPlayerBarPlaying(false);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  // Navigation rapide entre les vidéos
  // Note: allSongs est trié du plus récent (index 0) au plus ancien
  const getCurrentSongIndex = () => {
    if (!displayedSong || allSongs.length === 0) return -1;
    return allSongs.findIndex(song => song.id === displayedSong.id);
  };

  // Flèche GAUCHE (<) : Chanson PRÉCÉDENTE (plus ancienne, index + 1)
  const handlePreviousSong = () => {
    const currentIndex = getCurrentSongIndex();
    if (currentIndex >= 0 && currentIndex < allSongs.length - 1) {
      const previousSong = allSongs[currentIndex + 1]; // Plus ancienne
      handleReplaceVideo(previousSong, null);
    }
  };

  // Flèche DROITE (>) : Chanson SUIVANTE (plus récente, index - 1)
  const handleNextSong = () => {
    const currentIndex = getCurrentSongIndex();
    if (currentIndex > 0) {
      const nextSong = allSongs[currentIndex - 1]; // Plus récente
      handleReplaceVideo(nextSong, null);
    }
  };

  // Cache la flèche GAUCHE si on est sur la plus vieille chanson (dernier index)
  const canNavigatePrevious = () => {
    const currentIndex = getCurrentSongIndex();
    return currentIndex >= 0 && currentIndex < allSongs.length - 1;
  };

  // Cache la flèche DROITE si on est sur la toute dernière chanson sortie (index 0, la plus récente)
  const canNavigateNext = () => {
    const currentIndex = getCurrentSongIndex();
    return currentIndex > 0;
  };

  const handleShowPlatforms = (song) => {
    setSelectedSongForDialog(song);
    setShowPlatformsDialog(true);
  };

  const handleShowLyrics = (song) => {
    setSelectedSongForDialog(song);
    // Sur mobile, utiliser le drawer ; sur desktop, utiliser le dialog
    // matchMedia est plus fiable que window.innerWidth (gère zoom, device-pixel-ratio, CSS breakpoints)
    const isMobile = window.matchMedia('(max-width: 1023px)').matches;
    if (isMobile) {
      setShowLyricsDrawer(true);
    } else {
      setShowLyricsDialog(true);
    }
  };

  const handleShowDescription = (song) => {
    setSelectedSongForDialog(song);
    setShowDescriptionDialog(true);
  };

  const handleShareSong = async (song) => {
    const appUrl = song.slug
      ? `https://www.amusicadasegunda.com/musica/${song.slug}`
      : window.location.href;
    if (navigator.share) {
      try {
        await navigator.share({
          title: `${song.title} - A Música da Segunda`,
          text: `Confira esta paródia incrível da Música da Segunda!`,
          url: appUrl,
        });
      } catch {}
    } else {
      navigator.clipboard.writeText(appUrl);
      toast({
        title: "Copiado!",
        description: "Link copiado para a área de transferência",
        duration: 3000,
      });
    }
  };

  const handleShiftCatalogMonth = (direction) => {
    setCatalogDirection(direction);
    setCatalogMonthDate((currentDate) => startOfMonth(addMonths(currentDate, direction)));
  };

  // Obtenir l'URL de la miniature YouTube
  const getYouTubeThumbnail = (song) => {
    if (!song) return null;
    const videoId = extractYouTubeId(song.youtube_music_url || song.youtube_url);
    if (!videoId) return null;
    return `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`;
  };

  useEffect(() => {
    if (!displayedSong) return;

    saveLastSongSnapshot({
      title: displayedSong.title,
      artist: displayedSong.artist,
      slug: displayedSong.slug,
      thumbnail:
        displayedSong.thumbnail_url ||
        displayedSong.cover_image ||
        getYouTubeThumbnail(displayedSong) ||
        null,
    });
  }, [displayedSong]);

  const heroArtwork =
    displayedSong?.cover_image ||
    getYouTubeThumbnail(displayedSong) ||
    '/images/Caipivara_square.png';

  const dialogArtwork =
    selectedSongForDialog?.cover_image ||
    getYouTubeThumbnail(selectedSongForDialog) ||
    '/images/Caipivara_square.png';
  const isCurrentCatalogMonth = isSameMonth(catalogMonthDate, startOfMonth(new Date()));
  const currentCatalogKey = format(catalogMonthDate, 'yyyy-MM');
  const currentCatalogLabel = format(catalogMonthDate, 'MMMM yyyy', { locale: ptBR });
  const isDesktopShort = Boolean(
    displayedSong &&
      (displayedSong.youtube_music_url?.includes('/shorts/') ||
        displayedSong.youtube_url?.includes('/shorts/'))
  );

  const handleActivateDesktopPlayer = () => {
    stopDesktopPlayerBar();
    setVideoActivated(true);
    const desktopVideo = document.getElementById('desktop-weekly-video');
    if (desktopVideo) {
      desktopVideo.scrollIntoView({ behavior: 'smooth', block: 'center' });
    } else {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const handleActivateMobileVideo = useCallback(() => {
    setVideoActivated(true);
  }, []);

  // ID YouTube extrait de youtube_url (ou youtube_music_url en fallback)
  const youtubeIdForPlayer = extractYouTubeId(
    displayedSong?.youtube_url || displayedSong?.youtube_music_url
  );

  // Commande postMessage vers l'iframe YouTube (même méthode que Roda)
  const sendPlayerCommand = useCallback((func) => {
    playerIframeRef.current?.contentWindow?.postMessage(
      JSON.stringify({ event: 'command', func, args: [] }),
      '*'
    );
  }, []);

  const stopDesktopPlayerBar = useCallback(() => {
    if (playerBarActive) {
      sendPlayerCommand('stopVideo');
    }
    setPlayerBarActive(false);
    setPlayerBarPlaying(false);
  }, [playerBarActive, sendPlayerCommand]);

  const stopDesktopHeroVideo = useCallback(() => {
    desktopHeroPlayerRef.current?.pause?.();
    desktopHeroPlayerRef.current?.stop?.();

    if (desktopHeroPlayerRef.current?.activated || videoActivated) {
      setVideoActivated(false);
      // Remount the facade to unload the iframe and guarantee a single audio source.
      setDesktopVideoResetKey((currentKey) => currentKey + 1);
    }
  }, [videoActivated]);

  // Play/Pause du mini player bar
  const handleDesktopPlayerPlay = () => {
    if (!youtubeIdForPlayer) return;
    if (!playerBarActive) {
      stopDesktopHeroVideo();
      // Premier clic : charge l'iframe avec autoplay
      setPlayerBarActive(true);
      setPlayerBarPlaying(true);
    } else if (playerBarPlaying) {
      sendPlayerCommand('pauseVideo');
      setPlayerBarPlaying(false);
    } else {
      stopDesktopHeroVideo();
      sendPlayerCommand('playVideo');
      setPlayerBarPlaying(true);
    }
  };

  const handleDesktopPlayerStop = () => {
    stopDesktopPlayerBar();
  };

  useSEO({
    title: 'A Musica da Segunda | Parodias Musicais e Humor Inteligente',
    description: 'A Musica da Segunda - Nova musica toda segunda-feira! Parodias musicais inteligentes sobre as noticias do Brasil. Descubra humor e musica para sua semana.',
    keywords: 'musica da segunda, parodias musicais, noticias do brasil, musica brasileira, descoberta musical, nova musica toda segunda, parodias inteligentes',
    image: currentSong?.cover_image || 'https://www.amusicadasegunda.com/icons/icon-512x512.png',
    url: '/',
    type: 'website',
    // SEO fix: disable video indexing on homepage.
    // Homepage is not a dedicated watch page for a single stable video.
    // Keep max-video-preview:0 here.
    robots: 'index, follow, max-video-preview:0'
  });

  // VideoObject JSON-LD intentionally removed from homepage.
  // Google expects a dedicated watch page with a single canonical video.
  // Song pages are the appropriate pages for video context.
  // Les pages /musica/{slug} sont les vraies "watch pages" avec VideoObject.

  if (isLoading) {
    return (
      <>
        <Helmet>
          <title>{getDocumentTitle('A Musica da Segunda: Parodias das Noticias do Brasil')}</title>
          <meta name="description" content="A Musica da Segunda: As Noticias do Brasil em Forma de Parodia. Site oficial de parodias musicais inteligentes e divertidas." />
        </Helmet>

        {/* Mobile skeleton */}
        <div className="lg:hidden flex items-center justify-center py-32">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-white/60" />
        </div>

        {/* Desktop skeleton — mirrors the real hero layout */}
        <div className="hidden lg:block space-y-8 animate-pulse">
          <div className="glass-panel desktop-shell-gradient relative overflow-hidden rounded-[36px] p-6 xl:p-8">
            <div className="grid items-end gap-6 lg:grid-cols-[1fr_minmax(0,260px)] xl:grid-cols-[1fr_minmax(0,330px)] 2xl:grid-cols-[1fr_minmax(0,410px)]">
              {/* Left column skeleton */}
              <div className="space-y-6">
                <div className="h-6 w-36 rounded-full bg-white/8" />
                <div className="space-y-3">
                  <div className="h-12 w-3/4 rounded-2xl bg-white/10" />
                  <div className="h-12 w-1/2 rounded-2xl bg-white/10" />
                  <div className="h-5 w-40 rounded-full bg-white/6" />
                  <div className="space-y-2 pt-2">
                    <div className="h-4 w-full rounded bg-white/6" />
                    <div className="h-4 w-5/6 rounded bg-white/6" />
                    <div className="h-4 w-2/3 rounded bg-white/6" />
                  </div>
                </div>
                <div className="flex gap-3 pt-2">
                  <div className="h-12 w-36 rounded-full bg-white/10" />
                  <div className="h-12 w-32 rounded-full bg-white/8" />
                  <div className="h-12 w-32 rounded-full bg-white/8" />
                </div>
              </div>
              {/* Right column skeleton — 9:16 video */}
              <div className="rounded-[34px] bg-white/6 aspect-[9/16]" />
            </div>
          </div>
        </div>
      </>
    );
  }

  if (error) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center p-6">
        <Helmet>
          <title>{getDocumentTitle('A Musica da Segunda: Parodias das Noticias do Brasil')}</title>
          <meta name="description" content="A Musica da Segunda: As Noticias do Brasil em Forma de Parodia. Site oficial de parodias musicais inteligentes e divertidas." />
        </Helmet>
        <div className="glass-panel rounded-[30px] p-8 text-center max-w-sm">
          <AlertCircle className="mx-auto mb-4 h-12 w-12 text-red-400" />
          <h3 className="text-lg font-bold text-white mb-2">Erro ao carregar</h3>
          <p className="text-sm text-white/58 mb-6">{error}</p>
          <button
            onClick={handleRetry}
            className="inline-flex items-center gap-2 rounded-full bg-white/10 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-white/20"
          >
            <RefreshCw className="h-4 w-4" />
            Tentar novamente
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto h-full max-w-md md:max-w-2xl lg:max-w-none lg:p-5">
      {/* Header Mobile legacy disabled: the shell header now owns the top bar */}
      <div className="hidden text-center mb-8">
        <div className="flex items-center justify-center gap-4 mb-4">
          <div className="w-16 h-16 rounded-full overflow-hidden border-4 border-white/20 shadow-xl flex-shrink-0">
            <img
              src="/images/Musica da segunda.webp"
              alt="Logo A Musica da Segunda - Parodias Musicais do Brasil"
              className="w-full h-full object-cover"
              loading="eager"
              fetchPriority="high"
              width="64"
              height="64"
            />
          </div>
          
          <div className="text-left flex-1">
            <h1 className="text-2xl md:text-3xl font-black text-white drop-shadow-lg mb-1">
              A Musica da Segunda
            </h1>
            <p className="text-white/80 font-medium text-sm md:text-base drop-shadow-md">
              Descubra musica nova toda segunda-feira
            </p>
          </div>

          {/* Bouton Historique dans le header */}
          <button
            onClick={() => setShowHistoryDrawer(true)}
            className="w-12 h-12 bg-white/20 backdrop-blur-xl hover:bg-white/30 rounded-full flex items-center justify-center shadow-xl border border-white/20 transition-all duration-300 hover:scale-110 active:scale-95 touch-manipulation flex-shrink-0"
            aria-label="Historique"
            title="Historique"
          >
            <Clock className="w-5 h-5 text-white drop-shadow-lg" />
          </button>
        </div>
      </div>
    
      {/* Desktop app shell: hero + grid + player */}
      <div className="hidden lg:block space-y-8">
        {/* Desktop hero section */}
        <section className="glass-panel desktop-shell-gradient relative overflow-hidden rounded-[36px] p-6 xl:p-8">
          <div className="absolute inset-0 overflow-hidden">
            <img
              src={heroArtwork}
              alt=""
              aria-hidden="true"
              className="h-full w-full object-cover opacity-20 blur-3xl scale-110"
            />
            <div className="absolute inset-0 bg-[linear-gradient(135deg,rgba(10,10,10,0.78),rgba(10,10,10,0.42)_45%,rgba(10,10,10,0.92))]" />
          </div>

          <div className="relative grid items-start gap-6 lg:grid-cols-[1fr_minmax(0,260px)] xl:grid-cols-[1fr_minmax(0,330px)] 2xl:grid-cols-[1fr_minmax(0,410px)]">
            {/* Desktop editorial column */}
            <div className="flex flex-col justify-between gap-5 xl:gap-8">
              <div className="space-y-6">
                <div className="flex flex-wrap items-center gap-3 text-[11px] uppercase tracking-[0.28em] text-white/50">
                  <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-white/70">
                    <Sparkles className="h-3.5 w-3.5 text-[#FDE047]" />
                    Vídeo da semana
                  </span>
                </div>

                <div className="space-y-4">
                  <div className="flex items-start gap-3">
                    <h1 className="max-w-[14ch] text-4xl xl:text-5xl font-black leading-[0.95] tracking-tight text-white 2xl:text-6xl">
                      {displayedSong?.title || 'A Musica da Segunda'}
                    </h1>
                    {displayedSong && (
                      <button
                        type="button"
                        onClick={() => handleShareSong(displayedSong)}
                        className="mt-1 flex-shrink-0 inline-flex items-center justify-center h-9 w-9 rounded-full border border-white/10 bg-white/5 text-white/50 transition hover:bg-white/10 hover:text-white"
                        aria-label="Compartilhar"
                        title="Compartilhar"
                      >
                        <Share2 className="h-4 w-4" />
                      </button>
                    )}
                  </div>

                  <div className="flex items-center gap-3 text-lg text-white/72">
                    <Disc3 className="h-5 w-5 text-[#FDE047]" />
                    <span>{displayedSong?.artist || 'Nova paródia toda segunda-feira'}</span>
                  </div>

                  {displayedSong?.description?.trim() ? (
                    <div className="max-w-xl">
                      <p className={`text-sm leading-6 text-white/62 xl:text-base xl:leading-7 2xl:text-lg transition-all ${showFullDescription ? '' : 'line-clamp-2 xl:line-clamp-3'}`}>
                        {displayedSong.description.trim()}
                      </p>
                      <div className="mt-3 flex items-center gap-5">
                        {showFullDescription ? (
                          <button
                            type="button"
                            onClick={() => setShowFullDescription(false)}
                            className="text-sm font-semibold text-white/45 transition hover:text-white/70"
                          >
                            Ver menos
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={() => setShowFullDescription(true)}
                            className="text-sm font-semibold text-[#FDE047] transition hover:text-[#fde047]/80"
                          >
                            Ver descrição completa
                          </button>
                        )}
                        {displayedSong && (
                          <button
                            type="button"
                            onClick={() => handleShowLyrics(displayedSong)}
                            className="flex items-center gap-1.5 text-sm font-semibold text-white/45 transition hover:text-white/70"
                          >
                            <FileText className="h-4 w-4" />
                            Letras
                          </button>
                        )}
                      </div>
                    </div>
                  ) : (
                    <p className="max-w-xl text-base leading-7 text-white/62 2xl:text-lg">
                      Toda semana, uma nova paródia musical ganha destaque com acesso rápido
                      ao vídeo, às letras e ao catálogo recente.
                    </p>
                  )}
                </div>

                {displayedSong?.release_date && (
                  <div className="space-y-1">
                    <p className="text-[11px] font-medium uppercase tracking-[0.28em] text-white/40">
                      Lançamento
                    </p>
                    <p className="text-lg font-bold text-white">
                      {format(parseISO(displayedSong.release_date), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
                    </p>
                  </div>
                )}
              </div>

              <div className="flex flex-wrap gap-3">
                {displayedSong?.spotify_url && (
                  <a href={displayedSong.spotify_url} target="_blank" rel="noopener noreferrer">
                    <Button className="rounded-full bg-[#1DB954] px-5 py-6 text-sm font-bold text-white hover:bg-[#1ed760]">
                      <svg className="mr-2 h-4 w-4 shrink-0" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                        <path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.419 1.56-.299.421-1.02.599-1.559.3z"/>
                      </svg>
                      Spotify
                    </Button>
                  </a>
                )}

                {displayedSong?.apple_music_url && (
                  <a href={displayedSong.apple_music_url} target="_blank" rel="noopener noreferrer">
                    <Button className="rounded-full bg-gradient-to-r from-[#FA233B] to-[#FB5C74] px-5 py-6 text-sm font-bold text-white hover:opacity-90">
                      <svg className="mr-2 h-4 w-4 shrink-0" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                        <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.8-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z"/>
                      </svg>
                      Apple Music
                    </Button>
                  </a>
                )}

                {displayedSong?.youtube_url && (
                  <a href={displayedSong.youtube_url} target="_blank" rel="noopener noreferrer">
                    <Button className="rounded-full bg-[#FF0000] px-5 py-6 text-sm font-bold text-white hover:bg-[#cc0000]">
                      <svg className="mr-2 h-4 w-4 shrink-0" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                        <path d="M23.495 6.205a3.007 3.007 0 0 0-2.088-2.088c-1.87-.501-9.396-.501-9.396-.501s-7.507-.01-9.396.501A3.007 3.007 0 0 0 .527 6.205a31.247 31.247 0 0 0-.522 5.805 31.247 31.247 0 0 0 .522 5.783 3.007 3.007 0 0 0 2.088 2.088c1.868.502 9.396.502 9.396.502s7.506 0 9.396-.502a3.007 3.007 0 0 0 2.088-2.088 31.247 31.247 0 0 0 .5-5.783 31.247 31.247 0 0 0-.5-5.805zM9.609 15.601V8.408l6.264 3.602z"/>
                      </svg>
                      YouTube Music
                    </Button>
                  </a>
                )}

              </div>

              <div className="flex items-center gap-3 text-sm text-white/50">
                <button
                  onClick={canNavigatePrevious() ? handlePreviousSong : undefined}
                  disabled={!canNavigatePrevious()}
                  className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-white/10 bg-white/5 transition hover:bg-white/10 disabled:opacity-35"
                  aria-label="Música anterior"
                >
                  <ChevronLeft className="h-5 w-5" />
                </button>

                <button
                  onClick={canNavigateNext() ? handleNextSong : undefined}
                  disabled={!canNavigateNext()}
                  className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-white/10 bg-white/5 transition hover:bg-white/10 disabled:opacity-35"
                  aria-label="Próxima música"
                >
                  <ChevronRight className="h-5 w-5" />
                </button>

                <span className="ml-2 text-[11px] uppercase tracking-[0.24em] text-white/38">
                  {displayedSong?.release_date
                    ? format(parseISO(displayedSong.release_date), 'dd MMMM yyyy', { locale: ptBR })
                    : 'Lançamento semanal'}
                </span>
              </div>
            </div>

            {/* Desktop hero player adapts to 9:16 shorts */}
            <div id="desktop-weekly-video" className="relative">
              <div className="absolute -inset-8 rounded-[40px] bg-[#FDE047]/10 blur-3xl" />
              <div className="glass-panel relative overflow-hidden rounded-[34px] shadow-[0_30px_80px_rgba(0,0,0,0.45)]">
                <div
                  className={`relative overflow-hidden rounded-t-[34px] bg-black ${
                    isDesktopShort ? 'aspect-[9/16]' : 'aspect-video'
                  }`}
                >
                  {isDesktopShort && (
                    <>
                      <img
                        src={heroArtwork}
                        alt=""
                        aria-hidden="true"
                        className="absolute inset-0 h-full w-full object-cover blur-3xl scale-110 opacity-25"
                      />
                      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(253,224,71,0.16),_transparent_45%),linear-gradient(180deg,rgba(0,0,0,0.15),rgba(0,0,0,0.55))]" />
                    </>
                  )}

                  <div className="relative h-full">
                  {displayedSong ? (
                    <YouTubeEmbed
                      key={`${displayedSong.id}-${desktopVideoResetKey}`}
                      youtubeMusicUrl={displayedSong.youtube_music_url}
                      youtubeUrl={displayedSong.youtube_url}
                      title={displayedSong.title}
                      useFacade
                      autoplayOnActivate
                      thumbnailQuality="hqdefault"
                      forceActivated={videoActivated}
                      shortMaxWidth={520}
                      playerStateRef={desktopHeroPlayerRef}
                      onActivatedChange={(activated) => {
                        if (activated) {
                          stopDesktopPlayerBar();
                        }
                      }}
                    />
                  ) : (
                    <div className="flex h-full items-center justify-center bg-gradient-to-br from-zinc-950 to-zinc-900">
                      <div className="text-center text-white/55">
                        <Music className="mx-auto mb-4 h-14 w-14" />
                        <p className="text-lg font-medium">Nenhuma música disponível</p>
                      </div>
                    </div>
                  )}
                  </div>
                </div>

                <div className="grid grid-cols-[auto,1fr] gap-4 px-4 py-3">
                  <div className="h-16 w-16 overflow-hidden rounded-2xl border border-white/10 bg-white/5">
                    <img
                      src={heroArtwork}
                      alt=""
                      aria-hidden="true"
                      className="h-full w-full object-cover"
                    />
                  </div>

                  <div className="min-w-0">
                    <p className="text-[11px] uppercase tracking-[0.24em] text-white/38">
                      Em destaque
                    </p>
                    <h2 className="truncate text-xl font-bold text-white">
                      {displayedSong?.title || 'A Música da Segunda'}
                    </h2>
                    <p className="truncate text-sm text-white/62">
                      {displayedSong?.artist || 'Humor, música e atualidades'}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Desktop catalog section */}
        <section className="grid gap-6 xl:grid-cols-[minmax(0,1.45fr)_340px]">
          <div className="space-y-5">
            <div className="flex items-end justify-between gap-4">
              <div>
                <p className="text-[11px] uppercase tracking-[0.28em] text-white/40">
                  Catálogo mensal
                </p>
                <h2 className="mt-2 text-3xl font-black text-white">Músicas do mês</h2>
                <p className="mt-2 text-sm uppercase tracking-[0.24em] text-white/42">
                  {currentCatalogLabel}
                </p>
              </div>

              <div className="flex items-center gap-3">
                <button
                  onClick={() => handleShiftCatalogMonth(-1)}
                  className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm text-white/65 transition hover:bg-white/10 hover:text-white"
                >
                  <ChevronLeft className="h-4 w-4" />
                  Ver mês anterior
                </button>

                <button
                  onClick={() => handleShiftCatalogMonth(1)}
                  disabled={isCurrentCatalogMonth}
                  className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm text-white/65 transition hover:bg-white/10 hover:text-white disabled:cursor-not-allowed disabled:opacity-35"
                >
                  Mês seguinte
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            </div>

            <div className="relative overflow-hidden">
              <AnimatePresence custom={catalogDirection} initial={false} mode="wait">
                <motion.div
                  key={currentCatalogKey}
                  custom={catalogDirection}
                  variants={catalogSlideVariants}
                  initial="enter"
                  animate="center"
                  exit="exit"
                  transition={{ duration: 0.34, ease: [0.22, 1, 0.36, 1] }}
                >
                  {recentSongs.length > 0 ? (
                    <div className="grid gap-5 md:grid-cols-2 2xl:grid-cols-3">
                      {recentSongs.map((song) => (
                        <SongListItem
                          key={song.id}
                          song={song}
                          onSelect={handleReplaceVideo}
                          thumbnailUrl={getYouTubeThumbnail(song)}
                        />
                      ))}
                    </div>
                  ) : (
                    <div className="glass-panel rounded-[30px] p-10 text-center">
                      <Music className="mx-auto mb-4 h-12 w-12 text-white/35" />
                      <p className="text-lg font-medium text-white/72">
                        Nenhuma música publicada em {currentCatalogLabel}
                      </p>
                    </div>
                  )}
                </motion.div>
              </AnimatePresence>
            </div>
          </div>

          {/* Desktop side rail */}
          <aside className="space-y-6">
            <div className="glass-panel rounded-[30px] p-6">
              <div className="flex items-center gap-3">
                <Calendar className="h-5 w-5 text-[#FDE047]" />
                <h3 className="text-lg font-bold text-white">Ritmo da semana</h3>
              </div>

              <p className="mt-4 text-sm leading-7 text-white/60">
                Site oficial de paródias musicais inteligentes e divertidas.
              </p>

              <div className="mt-6 grid grid-cols-2 gap-4">
                <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                  <div className="text-2xl font-black text-white">{recentSongs.length}</div>
                  <div className="mt-1 text-[11px] uppercase tracking-[0.22em] text-white/42">
                    Em {format(catalogMonthDate, 'MMM', { locale: ptBR })}
                  </div>
                </div>

                <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                  <div className="text-2xl font-black text-white">{allSongs.length}</div>
                  <div className="mt-1 text-[11px] uppercase tracking-[0.22em] text-white/42">
                    No acervo
                  </div>
                </div>
              </div>
            </div>

            <div className="glass-panel rounded-[30px] p-6">
              <div className="flex items-end gap-4">
                <img
                  src="/images/Caipivara_pied_transparent.png"
                  alt="Capivara A Música da Segunda"
                  className="h-28 w-auto object-contain drop-shadow-[0_4px_16px_rgba(253,224,71,0.25)] flex-shrink-0"
                  loading="lazy"
                />
                <div className="pb-1">
                  <h3 className="text-lg font-bold text-white">Plataformas</h3>
                  <p className="mt-1 text-sm leading-6 text-white/58">
                    As músicas de A Música da Segunda estão disponíveis em todas as plataformas de streaming: Spotify, YouTube Music, Apple Music, Tidal, Amazon Music e muito mais.
                  </p>
                </div>
              </div>
            </div>
          </aside>
        </section>

        {/* Desktop sticky bottom player bar */}
        <div className="sticky bottom-4 z-30">
          <div className="glass-panel rounded-[30px] px-6 py-4 shadow-[0_24px_80px_rgba(0,0,0,0.35)]">
            <div className="grid items-center gap-4 xl:grid-cols-[minmax(0,1fr)_auto_minmax(240px,0.8fr)]">
              {/* Cover + iframe caché + infos */}
              <div className="flex min-w-0 items-center gap-4">
                <div className="relative h-16 w-16 flex-shrink-0 overflow-hidden rounded-2xl border border-white/10 bg-white/5">
                  {/* Thumbnail visible quand player inactif */}
                  <img
                    src={heroArtwork}
                    alt=""
                    aria-hidden="true"
                    className={`h-full w-full object-cover transition-opacity duration-300 ${playerBarActive ? 'opacity-0' : 'opacity-100'}`}
                  />
                  {/* Iframe YouTube chargée au premier clic play (même méthode que Roda) */}
                  {playerBarActive && youtubeIdForPlayer && (
                    <iframe
                      ref={playerIframeRef}
                      src={`https://www.youtube-nocookie.com/embed/${youtubeIdForPlayer}?enablejsapi=1&autoplay=1&rel=0&modestbranding=1`}
                      className="absolute inset-0 h-full w-full"
                      allow="autoplay; encrypted-media"
                      title={displayedSong?.title}
                    />
                  )}
                  {/* Indicateur lecture */}
                  {playerBarPlaying && (
                    <div className="absolute inset-0 flex items-end justify-center pb-1 pointer-events-none">
                      <div className="flex items-end gap-[2px]">
                        {[1,2,3].map(i => (
                          <span key={i} className="w-[3px] rounded-sm bg-[#FDE047]" style={{ height: `${8 + i * 4}px`, animation: `bounce 0.${6+i}s ease-in-out infinite alternate` }} />
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-white">
                    {displayedSong?.title || 'A Música da Segunda'}
                  </p>
                  <p className="truncate text-sm text-white/55">
                    {displayedSong?.artist || 'Nova música toda segunda-feira'}
                  </p>
                  {playerBarActive && (
                    <p className="text-[10px] uppercase tracking-[0.2em] text-[#FDE047]/70 mt-0.5">
                      {playerBarPlaying ? 'Reproduzindo' : 'Pausado'}
                    </p>
                  )}
                </div>
              </div>

              {/* Controls */}
              <div className="flex items-center justify-center gap-3">
                <button
                  onClick={canNavigatePrevious() ? handlePreviousSong : undefined}
                  disabled={!canNavigatePrevious()}
                  className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-white/10 bg-white/5 text-white transition hover:bg-white/10 disabled:opacity-35"
                  aria-label="Música anterior"
                >
                  <SkipBack className="h-4 w-4" />
                </button>

                <button
                  onClick={handleDesktopPlayerPlay}
                  disabled={!displayedSong || !youtubeIdForPlayer}
                  className="inline-flex h-14 w-14 items-center justify-center rounded-full bg-[#FDE047] text-black shadow-lg transition hover:scale-105 disabled:opacity-50"
                  aria-label={playerBarPlaying ? 'Pausar' : 'Reproduzir'}
                >
                  {playerBarPlaying ? (
                    <Pause className="h-5 w-5 fill-current" />
                  ) : (
                    <Play className="h-5 w-5 fill-current" />
                  )}
                </button>

                {playerBarActive ? (
                  <button
                    onClick={handleDesktopPlayerStop}
                    className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-white/10 bg-white/5 text-white transition hover:bg-white/10"
                    aria-label="Parar"
                  >
                    <Square className="h-4 w-4 fill-current" />
                  </button>
                ) : (
                  <button
                    onClick={canNavigateNext() ? handleNextSong : undefined}
                    disabled={!canNavigateNext()}
                    className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-white/10 bg-white/5 text-white transition hover:bg-white/10 disabled:opacity-35"
                    aria-label="Próxima música"
                  >
                    <SkipForward className="h-4 w-4" />
                  </button>
                )}
              </div>

              {/* Volume side */}
              <div className="flex items-center justify-end gap-3">
                <Volume2 className="h-4 w-4 text-white/55" />
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={desktopVolume}
                  onChange={(e) => setDesktopVolume(Number(e.target.value))}
                  className="h-1 w-28 cursor-pointer accent-[#FDE047]"
                  aria-label="Volume"
                />
                <span className="w-9 text-right text-xs tabular-nums text-white/45">
                  {desktopVolume}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ===== HEADER DESKTOP (LEGACY, DISABLED) ===== */}
      <div className="hidden text-center mb-8">
        <h1 className="text-4xl md:text-5xl font-black text-white drop-shadow-lg mb-2">
          A Musica da Segunda
        </h1>
        <p className="text-white/80 font-medium text-lg md:text-xl drop-shadow-md">
          Descubra musica nova toda segunda-feira
        </p>
      </div>
    
      {/* ===== LAYOUT DESKTOP: VIDEO YOUTUBE + MUSICAS DO MES ===== */}
      <div className="hidden lg:grid-cols-2 lg:gap-8 lg:mt-8">
        {/* ===== COLONNE GAUCHE: VIDEO YOUTUBE ===== */}
        <div className="space-y-6 relative">
          {displayedSong ? (
            <div className="bg-white rounded-3xl p-6 shadow-lg relative">
              {/* Bouton Navigation Gauche - Desktop */}
              <button
                onClick={canNavigatePrevious() ? handlePreviousSong : undefined}
                disabled={!canNavigatePrevious()}
                className={`absolute left-2 top-1/2 -translate-y-1/2 z-20 p-2 rounded-full backdrop-blur-sm transition-all duration-300 ${
                  canNavigatePrevious()
                    ? 'bg-black/20 text-white/80 hover:bg-black/40 hover:scale-110 active:scale-90 cursor-pointer'
                    : 'bg-black/10 text-white/20 cursor-not-allowed'
                }`}
                aria-label={canNavigatePrevious() ? 'Música anterior' : 'Já é a música mais antiga'}
                title={canNavigatePrevious() ? 'Música anterior' : 'Já é a música mais antiga'}
              >
                <ChevronLeft className="w-6 h-6" />
              </button>

              {/* Bouton Navigation Droite - Desktop */}
              <button
                onClick={canNavigateNext() ? handleNextSong : undefined}
                disabled={!canNavigateNext()}
                className={`absolute right-2 top-1/2 -translate-y-1/2 z-20 p-2 rounded-full backdrop-blur-sm transition-all duration-300 ${
                  canNavigateNext()
                    ? 'bg-black/20 text-white/80 hover:bg-black/40 hover:scale-110 active:scale-90 cursor-pointer'
                    : 'bg-black/10 text-white/20 cursor-not-allowed'
                }`}
                aria-label={canNavigateNext() ? 'Próxima música' : 'Já é a música mais recente'}
                title={canNavigateNext() ? 'Próxima música' : 'Já é a música mais recente'}
              >
                <ChevronRight className="w-6 h-6" />
              </button>

              {/* Date discrète - Desktop */}
              <p className="text-xs font-medium uppercase tracking-widest text-gray-500 mb-2 text-center">
                {displayedSong.release_date && format(parseISO(displayedSong.release_date), 'dd MMMM yyyy', { locale: ptBR }).toUpperCase()}
              </p>
              <h3 className="text-xl font-bold text-gray-800 mb-4 text-center">
                <button
                  onClick={() => handleShowDescription(displayedSong)}
                  className="hover:text-blue-600 transition-colors cursor-pointer"
                  title="Ver descricao da musica"
                >
                  {displayedSong.title}
                </button>
              </h3>
              <YouTubeEmbed
                youtubeMusicUrl={displayedSong.youtube_music_url}
                youtubeUrl={displayedSong.youtube_url}
                title={displayedSong.title}
                useFacade
                autoplayOnActivate
                thumbnailQuality="hqdefault"
              />
              <div className="mt-4 text-center">
                <h4 className="font-bold text-gray-800 text-lg mb-2">{displayedSong.title}</h4>
                <p className="text-gray-600">{displayedSong.artist}</p>
                <p className="text-gray-500 text-sm mt-1">
                  {format(parseISO(displayedSong.release_date), 'dd/MM/yyyy', { locale: ptBR })}
                </p>
              </div>
              
              {/* 3 Ações Principais - Desktop */}
              <div className="mt-6">
                <div className="grid grid-cols-3 gap-3">
                  <Button
                    variant="outline"
                    className="bg-white/70 hover:bg-white/90 text-gray-700 font-semibold border-gray-300 py-3 rounded-2xl text-sm"
                    onClick={() => handleShowPlatforms(displayedSong)}
                  >
                    Plataformas
                  </Button>

                  <Button
                    variant="outline"
                    className="bg-white/70 hover:bg-white/90 text-gray-700 font-semibold border-gray-300 py-3 rounded-2xl text-sm"
                    onClick={() => handleShowLyrics(displayedSong)}
                  >
                    Letras
                  </Button>

                  <Button
                    variant="outline"
                    className="bg-white/70 hover:bg-white/90 text-gray-700 font-semibold border-gray-300 py-3 rounded-2xl text-sm"
                    onClick={() => handleShareSong(displayedSong)}
                  >
                    Compartilhar
                  </Button>
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-white rounded-3xl p-6 shadow-lg">
              <h3 className="text-xl font-bold text-gray-800 mb-4 text-center">
                Nenhuma musica disponivel
              </h3>
              <div className="bg-gradient-to-br from-gray-100 to-gray-200 rounded-2xl flex items-center justify-center" style={{ height: 'min(70vh, 600px)', aspectRatio: '16/9' }}>
                <div className="text-center text-gray-500">
                  <Music className="w-16 h-16 mx-auto mb-4" />
                  <p className="text-lg font-medium">Nenhuma musica disponivel</p>
                  <p className="text-sm">Volte na segunda-feira!</p>
                </div>
              </div>
            </div>
          )}
          
          <CountdownTimer />
        </div>

        {/* ===== COLONNE DROITE: MUSICAS DO MES ===== */}
        <div className="bg-white rounded-3xl p-6 shadow-lg">
          <div className="mb-6">
            <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-3">
              <Calendar className="w-6 h-6 text-blue-600" />
              Musicas do Mes
            </h2>
          </div>

          {recentSongs.length > 0 ? (
            <div className="space-y-4">
              {recentSongs.map((song) => (
                <SongListItem key={song.id} song={song} onSelect={handleReplaceVideo} />
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <Music className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-500">
                Nenhuma musica publicada este mes ainda
              </p>
            </div>
          )}

          {/* Lien discret vers le mois précédent */}
          <div className="mt-6 pt-4 border-t border-gray-200">
            <button
              onClick={() => handleShiftCatalogMonth(-1)}
              className="inline-flex items-center gap-2 text-gray-500 hover:text-gray-700 text-sm transition-colors group cursor-pointer"
            >
              <ChevronLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
              Ver musicas de {format(new Date(new Date().setMonth(new Date().getMonth() - 1)), 'MMMM yyyy', { locale: ptBR })}
            </button>
          </div>
        </div>
      </div>

      {/* ===== LAYOUT MOBILE IMMERSIF: STYLE TIKTOK ===== */}
      <div className="lg:hidden h-full">
        <HomeMobileImmersive
          displayedSong={displayedSong}
          videoActivated={videoActivated}
          onVideoActivated={handleActivateMobileVideo}
          onPreviousSong={handlePreviousSong}
          onNextSong={handleNextSong}
          canNavigatePrevious={canNavigatePrevious()}
          canNavigateNext={canNavigateNext()}
          onShowPlatforms={() => setShowPlatformsDrawer(true)}
          onShowLyrics={() => handleShowLyrics(displayedSong)}
          onShareSong={() => handleShareSong(displayedSong)}
          onShowHistory={() => setShowHistoryDrawer(true)}
          getYouTubeThumbnail={getYouTubeThumbnail}
          backgroundImageLoaded={backgroundImageLoaded}
          setBackgroundImageLoaded={setBackgroundImageLoaded}
        />
      </div>
      <LyricsDrawer
        open={showLyricsDrawer}
        onOpenChange={setShowLyricsDrawer}
        lyrics={displayedSong?.lyrics}
        songTitle={displayedSong?.title}
      />

      <PlatformsDrawer
        open={showPlatformsDrawer}
        onOpenChange={setShowPlatformsDrawer}
        song={displayedSong}
      />

      <HistoryDrawer
        open={showHistoryDrawer}
        onOpenChange={setShowHistoryDrawer}
        songs={allSongs}
        onSelectSong={(song) => handleReplaceVideo(song, null)}
      />

      {/* ===== DIALOG PLATAFORMAS ===== */}
      <Dialog open={showPlatformsDialog} onOpenChange={setShowPlatformsDialog}>
        <DialogContent className="glass-panel max-w-xl overflow-hidden border-white/10 bg-[#111111]/95 p-0 text-white [&>button]:right-5 [&>button]:top-5 [&>button]:rounded-full [&>button]:border [&>button]:border-white/10 [&>button]:bg-white/5 [&>button]:p-2 [&>button]:text-white/70">
          <DialogHeader className="border-b border-white/10 px-6 pb-5 pt-6">
            <DialogTitle className="text-xl font-bold text-white flex items-center gap-2">
              Ouvir em outras plataformas
            </DialogTitle>
          </DialogHeader>
          
          {selectedSongForDialog && (
            <div className="space-y-5 px-6 pb-6">
              <div className="mt-1 flex items-center gap-4 rounded-[28px] border border-white/10 bg-white/[0.04] p-4">
                <div className="h-20 w-20 overflow-hidden rounded-2xl border border-white/10 bg-white/5">
                  <img
                    src={dialogArtwork}
                    alt=""
                    aria-hidden="true"
                    className="h-full w-full object-cover"
                  />
                </div>
                <div className="min-w-0">
                  <p className="text-[11px] uppercase tracking-[0.24em] text-white/40">Faixa selecionada</p>
                  <h3 className="mt-2 truncate text-lg font-bold text-white">
                    {selectedSongForDialog.title}
                  </h3>
                  <p className="mt-1 text-sm text-white/58">
                    {selectedSongForDialog.artist}
                  </p>
                </div>
              </div>

              <div className="space-y-3">
                {selectedSongForDialog.spotify_url && (
                  <a 
                    href={selectedSongForDialog.spotify_url} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="block"
                  >
                    <Button className="w-full rounded-2xl bg-[#1DB954] py-3 text-sm font-bold text-white transition-all duration-200 hover:scale-[1.01] hover:bg-[#1ed760]">
                      Ouvir no Spotify
                    </Button>
                  </a>
                )}
                
                {selectedSongForDialog.apple_music_url && (
                  <a 
                    href={selectedSongForDialog.apple_music_url} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="block"
                  >
                    <Button className="w-full rounded-2xl bg-gradient-to-r from-[#FA233B] to-[#FB5C74] py-3 text-sm font-bold text-white transition-all duration-200 hover:scale-[1.01] hover:opacity-90">
                      Ouvir no Apple Music
                    </Button>
                  </a>
                )}
                
                {selectedSongForDialog.youtube_url && (
                  <a
                    href={selectedSongForDialog.youtube_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block"
                  >
                    <Button className="w-full rounded-2xl bg-[#FF0000] py-3 text-sm font-bold text-white transition-all duration-200 hover:scale-[1.01] hover:bg-[#cc0000]">
                      Ouvir no YouTube
                    </Button>
                  </a>
                )}

                {!selectedSongForDialog.spotify_url && !selectedSongForDialog.apple_music_url && !selectedSongForDialog.youtube_url && (
                  <div className="rounded-[24px] border border-white/10 bg-white/[0.04] py-8 text-center">
                    <Music className="mx-auto mb-3 h-12 w-12 text-white/30" />
                    <p className="font-medium text-white/70">Links de streaming em breve...</p>
                    <p className="mt-1 text-sm text-white/50">Esta música será disponibilizada em breve nas principais plataformas.</p>
                  </div>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* ===== DIALOG LETRAS ===== */}
      <LyricsDialog
        open={showLyricsDialog}
        onOpenChange={setShowLyricsDialog}
        song={selectedSongForDialog}
        title="Letras da Musica"
        maxHeight="h-96"
        showIcon={false}
      />

      {/* ===== DIALOG DESCRICAO ===== */}
      <Dialog open={showDescriptionDialog} onOpenChange={setShowDescriptionDialog}>
        <DialogContent className="glass-panel max-h-[85vh] max-w-3xl overflow-hidden border-white/10 bg-[#111111]/95 p-0 text-white [&>button]:right-5 [&>button]:top-5 [&>button]:rounded-full [&>button]:border [&>button]:border-white/10 [&>button]:bg-white/5 [&>button]:p-2 [&>button]:text-white/70">
          <DialogHeader className="border-b border-white/10 px-6 pb-5 pt-6">
            <DialogTitle className="text-xl font-bold text-white flex items-center gap-2">
              Descricao da Musica
            </DialogTitle>
          </DialogHeader>
          
          {selectedSongForDialog && (
            <div className="space-y-5 px-6 pb-6">
              <div className="mt-1 grid gap-4 rounded-[28px] border border-white/10 bg-white/[0.04] p-4 md:grid-cols-[112px_minmax(0,1fr)]">
                <div className="h-28 w-28 overflow-hidden rounded-2xl border border-white/10 bg-white/5">
                  <img
                    src={dialogArtwork}
                    alt=""
                    aria-hidden="true"
                    className="h-full w-full object-cover"
                  />
                </div>

                <div className="min-w-0">
                  <p className="text-[11px] uppercase tracking-[0.24em] text-white/40">Em destaque</p>
                  <h3 className="mt-2 text-2xl font-black text-white">
                    {selectedSongForDialog.title}
                  </h3>
                  <p className="mt-2 text-base text-white/62">
                    {selectedSongForDialog.artist}
                  </p>
                  <p className="mt-3 text-sm text-white/42">
                    {format(parseISO(selectedSongForDialog.release_date), 'dd/MM/yyyy', { locale: ptBR })}
                  </p>
                </div>
              </div>

              <div className="rounded-[28px] border border-white/10 bg-white/[0.03] p-4">
                {selectedSongForDialog.description ? (
                  <ScrollArea className="h-[42vh]">
                    <div className="pr-4">
                      <pre className="whitespace-pre-wrap font-sans text-[15px] leading-8 text-white/78">
                        {selectedSongForDialog.description}
                      </pre>
                    </div>
                  </ScrollArea>
                ) : (
                  <div className="py-10 text-center">
                    <FileText className="mx-auto mb-3 h-12 w-12 text-white/30" />
                    <p className="font-medium text-white/70">Descricao nao disponivel</p>
                    <p className="mt-1 text-sm text-white/50">A descrição desta música será adicionada em breve.</p>
                  </div>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

    </div>
  );
}
