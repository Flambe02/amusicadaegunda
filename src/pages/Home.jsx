import { useState, useEffect, useCallback, memo } from 'react';
import { Song } from '@/api/entities';
import { logger } from '@/lib/logger';
import CountdownTimer from '../components/CountdownTimer';
import { AlertCircle, RefreshCw, Music, Calendar, ChevronLeft, ChevronRight, Play, FileText, Share2, ExternalLink, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import LyricsDialog from '../components/LyricsDialog';
import LyricsDrawer from '../components/LyricsDrawer';
import PlatformsDrawer from '../components/PlatformsDrawer';
import HistoryDrawer from '../components/HistoryDrawer';
import YouTubePlayer from '../components/YouTubePlayer';
import YouTubePlaylist from '../components/YouTubePlaylist';
import YouTubeEmbed from '@/components/YouTubeEmbed';

import { format, startOfMonth, endOfMonth, isWithinInterval, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import '../styles/tiktok-optimized.css';
import { localStorageService } from '@/lib/localStorage';
import { useNavigate } from 'react-router-dom';
import { useSEO } from '../hooks/useSEO';
import { Helmet } from 'react-helmet-async';
import { useToast } from '@/components/ui/use-toast';
import { extractYouTubeId } from '@/lib/utils';
// VideoObject JSON-LD removed from all pages (GSC: "Video isn't on a watch page")
// No page in this app is a dedicated watch page for a single video.

// Composant memoïzé pour éviter les re-renders inutiles de la liste de chansons
const SongListItem = memo(function SongListItem({ song, onSelect }) {
  return (
    <div className="bg-white rounded-2xl p-4 shadow-md hover:shadow-lg transition-all duration-200 border border-gray-100">
      <div className="flex items-center gap-4">
        <div
          className="w-12 h-12 bg-blue-500 rounded-xl flex items-center justify-center flex-shrink-0 shadow-md hover:shadow-lg transition-all duration-200 cursor-pointer transform hover:scale-105"
          onClick={(e) => onSelect(song, e)}
          title="Clique para ver esta musica na coluna de video"
        >
          <Play className="w-6 h-6 text-white" />
        </div>
        <div className="flex-1 min-w-0">
          <h3
            className="text-xl font-bold text-gray-800 truncate cursor-pointer hover:underline"
            onClick={(e) => onSelect(song, e)}
            title="Clique para ver esta musica na coluna de video"
          >
            {song.title}
          </h3>
          <p className="text-gray-600 text-base font-medium mt-1">{song.artist}</p>
          <p className="text-gray-500 text-sm font-medium mt-1">
            {format(parseISO(song.release_date), 'dd/MM/yyyy', { locale: ptBR })}
          </p>
        </div>
      </div>
    </div>
  );
});

// LCP fix: YouTube facade displays thumbnail + play button instead of loading iframe eagerly.
// Iframe loads only on click to improve LCP.
// Props attendues: youtube_music_url, youtube_url, title
export default function Home() {
  const HOME_SONGS_LIMIT = 120;
  logger.debug('Home component loaded');
  const navigate = useNavigate();
  const { toast } = useToast();
  const [currentSong, setCurrentSong] = useState(null);
  const [recentSongs, setRecentSongs] = useState([]);
  const [allSongs, setAllSongs] = useState([]); // Toutes les chansons pour la navigation
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showVideoModal, setShowVideoModal] = useState(false);
  const [videoActivated, setVideoActivated] = useState(false);
  const [showPlatformsDialog, setShowPlatformsDialog] = useState(false);
  const [showLyricsDialog, setShowLyricsDialog] = useState(false);
  const [showLyricsDrawer, setShowLyricsDrawer] = useState(false);
  const [showPlatformsDrawer, setShowPlatformsDrawer] = useState(false);
  const [showHistoryDrawer, setShowHistoryDrawer] = useState(false);
  const [showDescriptionDialog, setShowDescriptionDialog] = useState(false);
  const [selectedSongForDialog, setSelectedSongForDialog] = useState(null);
  const [displayedSong, setDisplayedSong] = useState(null);
  const [backgroundImageLoaded, setBackgroundImageLoaded] = useState(false);

  useEffect(() => {
    logger.debug('Home useEffect triggered');
    localStorageService.initialize();

    // Single fetch: current song + list data
    loadSongsData();
  }, []);

  const getLatestPublishedByCreatedAt = (songs) => {
    if (!Array.isArray(songs) || songs.length === 0) return null;
    return songs.reduce((latest, song) => {
      if (!latest) return song;
      const latestDate = latest?.created_at ? new Date(latest.created_at).getTime() : 0;
      const songDate = song?.created_at ? new Date(song.created_at).getTime() : 0;
      return songDate > latestDate ? song : latest;
    }, null);
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

      const currentMonth = new Date();
      const monthStart = startOfMonth(currentMonth);
      const monthEnd = endOfMonth(currentMonth);

      const monthSongs = publishedSongs.filter((song) => {
        const songDate = parseISO(song.release_date);
        return isWithinInterval(songDate, { start: monthStart, end: monthEnd });
      });

      setRecentSongs(monthSongs);

      if (!current) {
        setError('Erro ao carregar a musica da semana. Tente novamente.');
      }
    } catch (err) {
      logger.error('Erro ao carregar musicas:', err);
      setError('Erro ao carregar a musica da semana. Tente novamente.');
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

  const getPreviousMonth = () => {
    const currentDate = new Date();
    currentDate.setMonth(currentDate.getMonth() - 1);
    return format(currentDate, 'yyyy-MM');
  };

  const handleNavigateToPreviousMonth = () => {
    const previousMonth = getPreviousMonth();
    navigate(`/calendar?month=${previousMonth}`);
  };

  // Obtenir l'URL de la miniature YouTube
  const getYouTubeThumbnail = (song) => {
    if (!song) return null;
    const videoId = extractYouTubeId(song.youtube_music_url || song.youtube_url);
    if (!videoId) return null;
    return `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`;
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
      <div className="p-5 max-w-md mx-auto md:max-w-2xl lg:max-w-4xl">
        <Helmet>
          <title>A Musica da Segunda: Parodias das Noticias do Brasil</title>
          <meta name="description" content="A Musica da Segunda: As Noticias do Brasil em Forma de Parodia. Site oficial de parodias musicais inteligentes e divertidas." />
        </Helmet>
        <div className="text-center mb-8">
          {/* SEO: Div stylisé au lieu de H1 pour éviter H1 multiples */}
          <div className="text-4xl md:text-5xl lg:text-6xl font-black text-white drop-shadow-lg mb-2">
            A Musica da Segunda
          </div>
          <p className="text-white/80 font-medium text-lg md:text-xl drop-shadow-md">
            Descubra musica nova toda segunda-feira
          </p>
        </div>
        <div className="flex items-center justify-center py-20">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4"></div>
            <p className="text-white/80">Carregando musica da semana...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-5 max-w-md mx-auto md:max-w-2xl lg:max-w-4xl">
        <Helmet>
          <title>A Musica da Segunda: Parodias das Noticias do Brasil</title>
          <meta name="description" content="A Musica da Segunda: As Noticias do Brasil em Forma de Parodia. Site oficial de parodias musicais inteligentes e divertidas." />
        </Helmet>
        <div className="text-center mb-8">
          <h2 className="text-4xl md:text-5xl lg:text-6xl font-black text-white drop-shadow-lg mb-2">
            Musica da Segunda
          </h2>
          <p className="text-white/80 font-medium text-lg md:text-xl drop-shadow-md">
            Descubra musica nova toda segunda-feira
          </p>
        </div>
        <div className="bg-red-50 border border-red-200 rounded-3xl p-6 text-center">
          <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-red-800 mb-2">Erro ao carregar</h3>
          <p className="text-red-600 mb-4">{error}</p>
          <button
            onClick={handleRetry}
            className="inline-flex items-center gap-2 bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-lg transition-colors"
          >
            <RefreshCw className="w-4 h-4" />
            Tentar novamente
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-5 max-w-md mx-auto md:max-w-2xl lg:max-w-4xl">
      {/* Header Mobile uniquement */}
      <div className="lg:hidden text-center mb-8">
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
    
      {/* ===== HEADER DESKTOP (H1 persistant pour SEO) ===== */}
      <div className="hidden lg:block text-center mb-8">
        <h1 className="text-4xl md:text-5xl font-black text-white drop-shadow-lg mb-2">
          A Musica da Segunda
        </h1>
        <p className="text-white/80 font-medium text-lg md:text-xl drop-shadow-md">
          Descubra musica nova toda segunda-feira
        </p>
      </div>
    
      {/* ===== LAYOUT DESKTOP: VIDEO YOUTUBE + MUSICAS DO MES ===== */}
      <div className="hidden lg:grid lg:grid-cols-2 lg:gap-8 lg:mt-8">
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
              onClick={handleNavigateToPreviousMonth}
              className="inline-flex items-center gap-2 text-gray-500 hover:text-gray-700 text-sm transition-colors group cursor-pointer"
            >
              <ChevronLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
              Ver musicas de {format(new Date(new Date().setMonth(new Date().getMonth() - 1)), 'MMMM yyyy', { locale: ptBR })}
            </button>
          </div>
        </div>
      </div>

      {/* ===== LAYOUT MOBILE IMMERSIF: STYLE TIKTOK ===== */}
      <div className="lg:hidden fixed inset-0 flex flex-col overflow-hidden">
        {displayedSong ? (
          <>
            {/* Conteneur Vídeo: Prend presque toute la hauteur (flex-1), garde place pour Navbar */}
            <div className="relative flex-1 overflow-hidden">
              {/* Background: Miniature vidéo avec blur et overlay */}
              {getYouTubeThumbnail(displayedSong) && (
                <div className="absolute inset-0 z-0">
                  {/* Placeholder pendant le chargement */}
                  {!backgroundImageLoaded && (
                    <div className="absolute inset-0 bg-gradient-to-br from-gray-900 via-gray-800 to-black"></div>
                  )}
                  <img
                    src={getYouTubeThumbnail(displayedSong)}
                    alt=""
                    aria-hidden="true"
                    loading="lazy"
                    decoding="async"
                    className={`absolute inset-0 w-full h-full object-cover blur-3xl scale-110 transition-opacity duration-500 ${
                      backgroundImageLoaded ? 'opacity-100' : 'opacity-0'
                    }`}
                    onLoad={() => setBackgroundImageLoaded(true)}
                    onError={() => setBackgroundImageLoaded(true)}
                  />
                  <div className="absolute inset-0 bg-black/50"></div>
                </div>
              )}

              {/* Bouton Navigation Gauche */}
              <button
                onClick={canNavigatePrevious() ? handlePreviousSong : undefined}
                disabled={!canNavigatePrevious()}
                className={`absolute left-2 top-1/2 -translate-y-1/2 z-20 p-2 rounded-full backdrop-blur-sm touch-manipulation transition-all duration-300 ${
                  canNavigatePrevious()
                    ? 'bg-black/20 text-white/80 hover:bg-black/40 hover:scale-110 active:scale-90'
                    : 'bg-black/10 text-white/20 cursor-not-allowed'
                }`}
                aria-label={canNavigatePrevious() ? 'Música anterior' : 'Já é a música mais antiga'}
                title={canNavigatePrevious() ? 'Música anterior' : 'Já é a música mais antiga'}
              >
                <ChevronLeft className="w-6 h-6" />
              </button>

              {/* Bouton Navigation Droite */}
              <button
                onClick={canNavigateNext() ? handleNextSong : undefined}
                disabled={!canNavigateNext()}
                className={`absolute right-2 top-1/2 -translate-y-1/2 z-20 p-2 rounded-full backdrop-blur-sm touch-manipulation transition-all duration-300 ${
                  canNavigateNext()
                    ? 'bg-black/20 text-white/80 hover:bg-black/40 hover:scale-110 active:scale-90'
                    : 'bg-black/10 text-white/20 cursor-not-allowed'
                }`}
                aria-label={canNavigateNext() ? 'Próxima música' : 'Já é a música mais recente'}
                title={canNavigateNext() ? 'Próxima música' : 'Já é a música mais recente'}
              >
                <ChevronRight className="w-6 h-6" />
              </button>

              {/* Vídeo: Prend toute la hauteur disponible */}
              <div className="relative z-10 h-full flex items-center justify-center px-4">
                <div className="w-full max-w-md">
                  <div className="bg-black/20 backdrop-blur-xl rounded-3xl shadow-2xl overflow-hidden border border-white/10">
              <YouTubeEmbed
                youtubeMusicUrl={displayedSong.youtube_music_url}
                youtubeUrl={displayedSong.youtube_url}
                title={displayedSong.title}
                useFacade
                autoplayOnActivate
                thumbnailQuality="hqdefault"
                forceActivated={videoActivated}
              />
                  </div>
                </div>
              </div>

              {/* Dark gradient for text readability */}
              <div className="absolute bottom-0 left-0 right-0 h-48 bg-gradient-to-t from-black/90 to-transparent z-10 pointer-events-none"></div>

              {/* Overlay text: date and title */}
              <div className="absolute bottom-4 left-4 z-20 text-white">
                {/* Date en petit (xs uppercase) */}
                <p className="text-xs font-medium uppercase tracking-widest text-white/80 mb-1 drop-shadow-lg">
                  {displayedSong.release_date && format(parseISO(displayedSong.release_date), 'dd MMMM yyyy', { locale: ptBR }).toUpperCase()}
                </p>
                {/* Titre en gros (xl bold) */}
                <h2 className="text-xl font-bold text-white drop-shadow-lg">
                  {displayedSong.title}
                </h2>
              </div>

              {/* Side actions: platforms, lyrics and share */}
              <div className="absolute right-2 bottom-20 flex flex-col gap-3 z-20">
                {/* Bouton Plateformes (vert avec note de musique) */}
                <button
                  onClick={() => setShowPlatformsDrawer(true)}
                  className="w-14 h-14 bg-green-500/90 hover:bg-green-600 backdrop-blur-xl rounded-full flex items-center justify-center shadow-xl border border-green-400/30 transition-all duration-300 hover:scale-110 active:scale-95 touch-manipulation"
                  aria-label="Ouvir em outras plataformas"
                  title="Ouvir em outras plataformas"
                >
                  <Music className="w-6 h-6 text-white drop-shadow-lg" />
                </button>

                {/* Bouton Paroles */}
                {displayedSong.lyrics && displayedSong.lyrics.trim() && (
                  <button
                    onClick={() => handleShowLyrics(displayedSong)}
                    className="w-14 h-14 bg-white/20 backdrop-blur-xl hover:bg-white/30 rounded-full flex items-center justify-center shadow-xl border border-white/20 transition-all duration-300 hover:scale-110 active:scale-95 touch-manipulation"
                    aria-label="Ver letras"
                    title="Ver letras"
                  >
                    <FileText className="w-6 h-6 text-white drop-shadow-lg" />
                  </button>
                )}

                {/* Bouton Partager */}
                <button
                  onClick={() => handleShareSong(displayedSong)}
                  className="w-14 h-14 bg-white/20 backdrop-blur-xl hover:bg-white/30 rounded-full flex items-center justify-center shadow-xl border border-white/20 transition-all duration-300 hover:scale-110 active:scale-95 touch-manipulation"
                  aria-label="Compartilhar"
                  title="Compartilhar"
                >
                  <Share2 className="w-6 h-6 text-white drop-shadow-lg" />
                </button>
              </div>
            </div>

            {/* Countdown compact + Bouton Reproduzir — en bas */}
            <div className="relative z-30 pb-4 px-4 flex flex-col items-center gap-2">
              <CountdownTimer compact />
              <Button
                size="lg"
                onClick={() => { if (navigator.vibrate) navigator.vibrate(50); setVideoActivated(true); }}
                className="w-full max-w-md bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-bold py-4 px-6 rounded-full shadow-xl transition-all duration-300 hover:scale-105 active:scale-95 flex items-center justify-center gap-3 touch-manipulation"
              >
                <svg viewBox="0 0 24 24" className="w-6 h-6 fill-current flex-shrink-0"><path d="M8 5v14l11-7z"/></svg>
                <span className="text-xl">Reproduzir</span>
              </Button>
            </div>

            {/* Lyrics Drawer pour mobile */}
            <LyricsDrawer
              open={showLyricsDrawer}
              onOpenChange={setShowLyricsDrawer}
              lyrics={displayedSong?.lyrics}
              songTitle={displayedSong?.title}
            />

            {/* Platforms Drawer pour mobile */}
            <PlatformsDrawer
              open={showPlatformsDrawer}
              onOpenChange={setShowPlatformsDrawer}
              song={displayedSong}
            />

            {/* History Drawer pour mobile */}
            <HistoryDrawer
              open={showHistoryDrawer}
              onOpenChange={setShowHistoryDrawer}
              songs={allSongs}
              onSelectSong={(song) => handleReplaceVideo(song, null)}
            />
          </>
        ) : (
          <div className="relative z-10 h-full flex items-center justify-center px-4">
            <div className="bg-black/40 backdrop-blur-xl rounded-3xl p-8 text-center border border-white/20 shadow-2xl">
              <Music className="w-16 h-16 text-white/80 mx-auto mb-4 drop-shadow-lg" />
              <h3 className="text-xl font-semibold text-white mb-2 drop-shadow-lg">Nenhuma musica disponivel</h3>
              <p className="text-white/90 drop-shadow-md">
                A musica da semana sera publicada em breve. Volte na segunda-feira!
              </p>
            </div>
          </div>
        )}
      </div>

      {/* ===== DIALOG PLATAFORMAS ===== */}
      <Dialog open={showPlatformsDialog} onOpenChange={setShowPlatformsDialog}>
        <DialogContent className="bg-[#f8f5f2] max-w-md">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-gray-800 flex items-center gap-2">
              Ouvir em outras plataformas
            </DialogTitle>
          </DialogHeader>
          
          {selectedSongForDialog && (
            <div className="space-y-4">
              {/* Informations de la musique */}
              <div className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-xl p-4 border border-blue-200">
                <h3 className="text-lg font-bold text-blue-900 mb-1">
                  {selectedSongForDialog.title}
                </h3>
                <p className="text-blue-700 font-medium">
                  {selectedSongForDialog.artist}
                </p>
              </div>

              {/* Liens des plateformes */}
              <div className="space-y-3">
                {selectedSongForDialog.spotify_url && (
                  <a 
                    href={selectedSongForDialog.spotify_url} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="block"
                  >
                    <Button className="w-full bg-[#1DB954] hover:bg-[#1ed760] text-white font-bold py-3 rounded-2xl text-sm transition-all duration-200 hover:scale-105">
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
                    <Button className="w-full bg-gradient-to-r from-[#FA233B] to-[#FB5C74] hover:opacity-90 text-white font-bold py-3 rounded-2xl text-sm transition-all duration-200 hover:scale-105">
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
                    <Button className="w-full bg-[#FF0000] hover:bg-[#cc0000] text-white font-bold py-3 rounded-2xl text-sm transition-all duration-200 hover:scale-105">
                      Ouvir no YouTube
                    </Button>
                  </a>
                )}

                {!selectedSongForDialog.spotify_url && !selectedSongForDialog.apple_music_url && !selectedSongForDialog.youtube_url && (
                  <div className="text-center py-6">
                    <Music className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                    <p className="text-gray-600 font-medium">Links de streaming em breve...</p>
                    <p className="text-gray-500 text-sm">Esta musica sera disponibilizada em breve nas principais plataformas.</p>
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
        <DialogContent className="bg-[#f8f5f2] max-w-2xl max-h-[80vh]">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-gray-800 flex items-center gap-2">
              Descricao da Musica
            </DialogTitle>
          </DialogHeader>
          
          {selectedSongForDialog && (
            <div className="space-y-4">
              {/* Informations de la musique */}
              <div className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-xl p-4 border border-blue-200">
                <h3 className="text-lg font-bold text-blue-900 mb-1">
                  {selectedSongForDialog.title}
                </h3>
                <p className="text-blue-700 font-medium">
                  {selectedSongForDialog.artist}
                </p>
                <p className="text-blue-600 text-sm">
                  {format(parseISO(selectedSongForDialog.release_date), 'dd/MM/yyyy', { locale: ptBR })}
                </p>
              </div>

              {/* Descricao */}
              <div className="bg-white rounded-xl p-4 border border-gray-200">
                {selectedSongForDialog.description ? (
                  <ScrollArea className="h-60">
                    <div className="pr-4">
                      <pre className="text-gray-700 whitespace-pre-wrap font-sans text-sm leading-relaxed">
                        {selectedSongForDialog.description}
                      </pre>
                    </div>
                  </ScrollArea>
                ) : (
                  <div className="text-center py-8">
                    <FileText className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                    <p className="text-gray-600 font-medium">Descricao nao disponivel</p>
                    <p className="text-gray-500 text-sm">A descricao desta musica sera adicionada em breve.</p>
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

