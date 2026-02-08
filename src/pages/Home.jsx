import { useState, useEffect } from 'react';
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
import OptimizedImage from '../components/OptimizedImage';
import { format, startOfMonth, endOfMonth, isWithinInterval, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import '../styles/tiktok-optimized.css';
import { localStorageService } from '@/lib/localStorage';
import { useNavigate } from 'react-router-dom';
import { useSEO } from '../hooks/useSEO';
import { Helmet } from 'react-helmet-async';
import { useToast } from '@/components/ui/use-toast';
// ❌ VideoObject JSON-LD SUPPRIMÉ de TOUTES les pages (erreur GSC "Video isn't on a watch page")
// Aucune page du site n'est une "watch page" dédiée aux vidéos.

// Composant d'intégration YouTube générique (remplace l'embed TikTok)
// Props attendues: youtube_music_url, youtube_url, title
function YouTubeEmbed({ youtube_music_url, youtube_url, title }) {
  logger.debug('🎬 YouTubeEmbed appelé avec:', { youtube_music_url, youtube_url, title });
  
  // Nettoyer les URLs pour éviter les chaînes vides ou espaces
  const primaryUrl = youtube_music_url && youtube_music_url.trim() ? youtube_music_url.trim() : null;
  const fallbackUrl = youtube_url && youtube_url.trim() ? youtube_url.trim() : null;
  
  logger.debug('🎬 YouTubeEmbed URLs nettoyées:', { primaryUrl, fallbackUrl });

  // Analyse l'URL et retourne { id, type }
  const getYouTubeEmbedInfo = (url) => {
    if (!url || typeof url !== 'string') return null;

    try {
      const lower = url.toLowerCase();

      // Cas playlist explicite (youtube normal ou music)
      const listMatch = url.match(/[?&]list=([A-Za-z0-9_-]+)/);
      if (listMatch) {
        return { id: listMatch[1], type: 'playlist' };
      }

      // Formats vidéo (inclut Shorts, watch, youtu.be)
      const videoPatterns = [
        /(?:youtube\.com\/shorts\/)([A-Za-z0-9_-]{11})/,
        /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/|youtube\.com\/v\/)([A-Za-z0-9_-]{11})/,
        /^([A-Za-z0-9_-]{11})$/
      ];
      for (const re of videoPatterns) {
        const m = url.match(re);
        if (m) return { id: m[1], type: 'video' };
      }

      // music.youtube.com/watch?v=VIDEO_ID (sans list)
      if (lower.includes('music.youtube.com')) {
        const m = url.match(/[?&]v=([A-Za-z0-9_-]{11})/);
        if (m) return { id: m[1], type: 'video' };
      }

      return null;
    } catch {
      return null;
    }
  };

  // 1️⃣ Essayer d'abord youtube_music_url
  let info = primaryUrl ? getYouTubeEmbedInfo(primaryUrl) : null;
  let targetUrl = primaryUrl || '';

  // 2️⃣ Si échec ou URL invalide, retomber sur youtube_url
  if (!info && fallbackUrl) {
    logger.debug('🎬 YouTubeEmbed: youtube_music_url invalide, fallback vers youtube_url');
    info = getYouTubeEmbedInfo(fallbackUrl);
    targetUrl = fallbackUrl || '';
  }

  logger.debug('🎬 YouTubeEmbed info extraite:', info);
  
  if (!info) {
    logger.debug('🎬 YouTubeEmbed: Aucune info valide, affichage fallback');
    return (
      <div className="w-full aspect-video rounded-lg overflow-hidden shadow-lg flex items-center justify-center bg-gradient-to-br from-gray-800 to-gray-900">
        <p className="text-white text-sm">Vidéo non disponible</p>
      </div>
    );
  }

  // Détecter si c'est un Short (format vertical 9:16)
  const isShort = targetUrl.includes('/shorts/');
  
  const base = 'https://www.youtube-nocookie.com/embed';
  const embedSrc =
    info.type === 'video'
      ? `${base}/${info.id}?rel=0&modestbranding=1&playsinline=1&controls=1`
      : `${base}/videoseries?list=${info.id}&rel=0&modestbranding=1&playsinline=1&controls=1`;
  
  logger.debug('🎬 YouTubeEmbed embedSrc généré:', embedSrc);
  logger.debug('🎬 YouTubeEmbed isShort (9:16):', isShort);

  // Format vertical 9:16 pour Shorts, horizontal 16:9 pour vidéos normales
  if (isShort) {
    return (
      <div className="relative rounded-lg overflow-hidden shadow-2xl" style={{ width: '100%', aspectRatio: '9/16', minHeight: 'min(500px, 70vh)', maxHeight: '70vh' }}>
        <iframe
          className="absolute top-0 left-0 w-full h-full"
          src={embedSrc}
          title={title || 'YouTube Short'}
          frameBorder="0"
          referrerPolicy="strict-origin-when-cross-origin"
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
        allowFullScreen
        loading="eager"
        fetchPriority="high"
      />
    </div>
  );
}

return (
  <div className="w-full aspect-video rounded-lg overflow-hidden shadow-lg">
    <iframe
      className="w-full h-full"
      src={embedSrc}
      title={title || 'YouTube'}
      frameBorder="0"
      referrerPolicy="strict-origin-when-cross-origin"
      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
      allowFullScreen
      loading="eager"
      fetchPriority="high"
    />
    </div>
  );
}

export default function Home() {
  logger.debug('🏠 Home component loaded');
  const navigate = useNavigate();
  const { toast } = useToast();
  const [currentSong, setCurrentSong] = useState(null);
  const [recentSongs, setRecentSongs] = useState([]);
  const [allSongs, setAllSongs] = useState([]); // Toutes les chansons pour la navigation
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedVideo, _setSelectedVideo] = useState(null);
  const [showVideoModal, setShowVideoModal] = useState(false);
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
    logger.debug('🏠 Home useEffect triggered');
    localStorageService.initialize();
    
    // Charger les chansons
    loadCurrentSong();
    loadRecentSongs();
  }, []);

  const loadCurrentSong = async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      logger.debug('🔄 Tentative de chargement depuis Supabase...');
      console.warn('🔄 loadCurrentSong appelé à:', new Date().toISOString());
      
      // Forcer un rechargement complet en production
      const song = await Song.getCurrent();
      logger.debug('📊 Chanson actuelle chargée:', song);
      
      // Log détaillé pour debug production
      if (song) {
        console.warn('🎵 Chanson chargée:', {
          title: song.title,
          created_at: song.created_at,
          updated_at: song.updated_at,
          release_date: song.release_date,
          id: song.id
        });
        
        // Vérifier si c'est bien la bonne chanson
        if (song.title === 'Rio continua lindo (só que não)') {
          console.error('⚠️ PROBLÈME: Ancienne chanson chargée (Rio) au lieu de William!');
          console.error('⚠️ Vérifier les dates dans Supabase et le tri');
        }
      } else {
        console.warn('⚠️ Aucune chanson chargée');
      }
      
      setCurrentSong(song);
      setDisplayedSong(song);
      setBackgroundImageLoaded(false); // Réinitialiser l'état de chargement de l'image
    } catch (err) {
      logger.error('❌ Erro ao carregar música atual:', err);
      setError('Erro ao carregar a música da semana. Tente novamente.');
    } finally {
      setIsLoading(false);
    }
  };

  const loadRecentSongs = async () => {
    try {
      logger.debug('🔄 Chargement des musiques depuis Supabase...');
      const allSongsData = await Song.list('-release_date', null);
      logger.debug('📊 Toutes les musiques chargées:', allSongsData);
      
      // Stocker toutes les chansons pour la navigation
      setAllSongs(allSongsData);
      
      // Filtrer pour le mois en cours (pour l'affichage de la liste)
      const currentMonth = new Date();
      const monthStart = startOfMonth(currentMonth);
      const monthEnd = endOfMonth(currentMonth);
      
      const monthSongs = allSongsData.filter(song => {
        const songDate = parseISO(song.release_date);
        return isWithinInterval(songDate, { start: monthStart, end: monthEnd });
      });
      
      logger.debug('📅 Musiques du mois en cours:', monthSongs);
      setRecentSongs(monthSongs);
    } catch (err) {
      logger.error('❌ Erro ao carregar músicas recentes:', err);
    }
  };

  const handleRetry = () => {
    loadCurrentSong();
  };

  const handleReplaceVideo = (song, event) => {
    if (event) {
      event.preventDefault();
      event.stopPropagation();
    }
    
    logger.debug('🎵 handleReplaceVideo appelé avec:', song.title);
    setDisplayedSong(song);
    setBackgroundImageLoaded(false); // Réinitialiser l'état de chargement de l'image
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

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
    const isMobile = window.innerWidth < 1024;
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
    if (navigator.share) {
      try {
        await navigator.share({
          title: `${song.title} - ${song.artist}`,
          text: `Confira esta música incrível da Música da Segunda!`,
          url: song.youtube_music_url || song.youtube_url || window.location.href,
        });
      } catch {}
    } else {
      // ✅ UX: Toast au lieu d'alert() bloquante
      const shareText = `${song.title} - ${song.artist}\nConfira esta música incrível da Música da Segunda!`;
      navigator.clipboard.writeText(shareText);
      toast({
        title: "✅ Copiado!",
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

  // Fonction pour extraire l'ID YouTube depuis une URL
  const extractYouTubeId = (url) => {
    if (!url || typeof url !== 'string') return null;
    
    const patterns = [
      /(?:youtube\.com\/shorts\/)([A-Za-z0-9_-]{11})/,
      /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/|youtube\.com\/v\/)([A-Za-z0-9_-]{11})/,
      /^([A-Za-z0-9_-]{11})$/,
      /music\.youtube\.com\/watch\?v=([A-Za-z0-9_-]{11})/
    ];
    
    for (const pattern of patterns) {
      const match = url.match(pattern);
      if (match && match[1]) {
        return match[1];
      }
    }
    
    return null;
  };

  // Obtenir l'URL de la miniature YouTube
  const getYouTubeThumbnail = (song) => {
    if (!song) return null;
    const videoId = extractYouTubeId(song.youtube_music_url || song.youtube_url);
    if (!videoId) return null;
    return `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`;
  };

  useSEO({
    title: 'A Música da Segunda | Paródias Musicais e Humor Inteligente',
    description: 'A Música da Segunda - Nova música toda segunda-feira! Paródias musicais inteligentes sobre as notícias do Brasil. Descubra humor e música para sua semana.',
    keywords: 'música da segunda, paródias musicais, notícias do brasil, música brasileira, descoberta musical, nova música toda segunda, paródias inteligentes',
    image: currentSong?.cover_image || 'https://www.amusicadasegunda.com/icons/icon-512x512.png',
    url: '/',
    type: 'website',
    // ✅ SEO FIX: Désactiver l'indexation vidéo sur la homepage
    // La homepage n'est pas une "watch page" dédiée à une seule vidéo
    // Google ne doit pas indexer la vidéo changeante de la homepage
    robots: 'index, follow, max-video-preview:0'
  });

  // ❌ VideoObject JSON-LD SUPPRIMÉ de la homepage
  // Raison: La homepage n'est pas une "watch page" dédiée à UNE vidéo.
  // Google attend une page dédiée à une vidéo spécifique pour indexer le VideoObject.
  // Les pages /musica/{slug} sont les vraies "watch pages" avec VideoObject.

  if (isLoading) {
    return (
      <div className="p-5 max-w-md mx-auto md:max-w-2xl lg:max-w-4xl">
        <Helmet>
          <title>A Música da Segunda: Paródias das Notícias do Brasil</title>
          <meta name="description" content="A Música da Segunda: As Notícias do Brasil em Forma de Paródia. Site oficial de paródias musicais inteligentes e divertidas." />
        </Helmet>
        <div className="text-center mb-8">
          {/* ✅ SEO: Div stylisé au lieu de H1 pour éviter H1 multiples (H1 principal dans le contenu) */}
          <div className="text-4xl md:text-5xl lg:text-6xl font-black text-white drop-shadow-lg mb-2">
            A Música da Segunda
          </div>
          <p className="text-white/80 font-medium text-lg md:text-xl drop-shadow-md">
            Descubra música nova toda segunda-feira
          </p>
        </div>
        <div className="flex items-center justify-center py-20">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4"></div>
            <p className="text-white/80">Carregando música da semana...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-5 max-w-md mx-auto md:max-w-2xl lg:max-w-4xl">
        <Helmet>
          <title>A Música da Segunda: Paródias das Notícias do Brasil</title>
          <meta name="description" content="A Música da Segunda: As Notícias do Brasil em Forma de Paródia. Site oficial de paródias musicais inteligentes e divertidas." />
        </Helmet>
        <div className="text-center mb-8">
          <h2 className="text-4xl md:text-5xl lg:text-6xl font-black text-white drop-shadow-lg mb-2">
            Música da Segunda
          </h2>
          <p className="text-white/80 font-medium text-lg md:text-xl drop-shadow-md">
            Descubra música nova toda segunda-feira
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
            <OptimizedImage 
              src="images/Musica da segunda.jpg" 
              alt="Logo A Música da Segunda - Paródias Musicais do Brasil"
              className="w-full h-full object-cover"
              loading="eager"
              fetchpriority="high"
            />
          </div>
          
          <div className="text-left flex-1">
            <h1 className="text-2xl md:text-3xl font-black text-white drop-shadow-lg mb-1">
              A Música da Segunda
            </h1>
            <p className="text-white/80 font-medium text-sm md:text-base drop-shadow-md">
              Descubra música nova toda segunda-feira
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
          A Música da Segunda
        </h1>
        <p className="text-white/80 font-medium text-lg md:text-xl drop-shadow-md">
          Descubra música nova toda segunda-feira
        </p>
      </div>
    
      {/* ===== LAYOUT DESKTOP: VIDÉO YOUTUBE + MÚSICAS DO MÊS ===== */}
      <div className="hidden lg:grid lg:grid-cols-2 lg:gap-8 lg:mt-8">
        {/* ===== COLONNE GAUCHE: VIDÉO YOUTUBE ===== */}
        <div className="space-y-6 relative">
          {displayedSong ? (
            <div className="bg-white rounded-3xl p-6 shadow-lg relative">
              {/* Bouton Navigation Gauche - Desktop */}
              {canNavigatePrevious() && (
                <button
                  onClick={handlePreviousSong}
                  className="absolute left-2 top-1/2 -translate-y-1/2 z-20 p-2 rounded-full bg-black/20 backdrop-blur-sm text-white/80 hover:bg-black/40 transition-all duration-300 hover:scale-110 active:scale-90"
                  aria-label="Música anterior"
                  title="Música anterior"
                >
                  <ChevronLeft className="w-6 h-6" />
                </button>
              )}

              {/* Bouton Navigation Droite - Desktop */}
              {canNavigateNext() && (
                <button
                  onClick={handleNextSong}
                  className="absolute right-2 top-1/2 -translate-y-1/2 z-20 p-2 rounded-full bg-black/20 backdrop-blur-sm text-white/80 hover:bg-black/40 transition-all duration-300 hover:scale-110 active:scale-90"
                  aria-label="Próxima música"
                  title="Próxima música"
                >
                  <ChevronRight className="w-6 h-6" />
                </button>
              )}

              {/* Date discrète - Desktop */}
              <p className="text-xs font-medium uppercase tracking-widest text-gray-500 mb-2 text-center">
                {displayedSong.release_date && format(parseISO(displayedSong.release_date), 'dd MMMM yyyy', { locale: ptBR }).toUpperCase()}
              </p>
              <h3 className="text-xl font-bold text-gray-800 mb-4 text-center">
                <button
                  onClick={() => handleShowDescription(displayedSong)}
                  className="inline-flex items-center gap-2 hover:text-blue-600 transition-colors cursor-pointer"
                  title="Ver descrição da música"
                >
                  <span className="text-2xl">ℹ️</span>
                  <span>{displayedSong.title}</span>
                </button>
              </h3>
              <YouTubeEmbed
                youtube_music_url={displayedSong.youtube_music_url}
                youtube_url={displayedSong.youtube_url}
                title={displayedSong.title}
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
                ℹ️ Nenhuma música disponível
              </h3>
              <div className="bg-gradient-to-br from-gray-100 to-gray-200 rounded-2xl flex items-center justify-center" style={{ height: 'min(70vh, 600px)', aspectRatio: '16/9' }}>
                <div className="text-center text-gray-500">
                  <Music className="w-16 h-16 mx-auto mb-4" />
                  <p className="text-lg font-medium">Nenhuma música disponível</p>
                  <p className="text-sm">Volte na segunda-feira!</p>
                </div>
              </div>
            </div>
          )}
          
          <CountdownTimer />
        </div>

        {/* ===== COLONNE DROITE: MÚSICAS DO MÊS ===== */}
        <div className="bg-white rounded-3xl p-6 shadow-lg">
          <div className="mb-6">
            <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-3">
              <Calendar className="w-6 h-6 text-blue-600" />
              Músicas do Mês
            </h2>
          </div>

          {recentSongs.length > 0 ? (
            <div className="space-y-4">
              {recentSongs.map((song) => (
                <div key={song.id} className="bg-white rounded-2xl p-4 shadow-md hover:shadow-lg transition-all duration-200 border border-gray-100">
                  <div className="flex items-center gap-4">
                    <div 
                      className="w-12 h-12 bg-blue-500 rounded-xl flex items-center justify-center flex-shrink-0 shadow-md hover:shadow-lg transition-all duration-200 cursor-pointer transform hover:scale-105"
                      onClick={(e) => handleReplaceVideo(song, e)}
                      title="Clique para ver esta música na coluna de vídeo"
                    >
                      <Play className="w-6 h-6 text-white" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 
                        className="text-xl font-bold text-gray-800 truncate cursor-pointer hover:underline"
                        onClick={(e) => handleReplaceVideo(song, e)}
                        title="Clique para ver esta música na coluna de vídeo"
                      >
                        {song.title}
                      </h3>
                      <p className="text-gray-600 text-base font-medium mt-1">
                        {song.artist}
                      </p>
                      <p className="text-gray-500 text-sm font-medium mt-1">
                        {format(parseISO(song.release_date), 'dd/MM/yyyy', { locale: ptBR })}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <Music className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-500">
                Nenhuma música publicada este mês ainda
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
              Ver músicas de {format(new Date(new Date().setMonth(new Date().getMonth() - 1)), 'MMMM yyyy', { locale: ptBR })}
            </button>
          </div>
        </div>
      </div>

      {/* ===== LAYOUT MOBILE IMMERSIF: STYLE TIKTOK ===== */}
      <div className="lg:hidden fixed inset-0 flex flex-col overflow-hidden">
        {displayedSong ? (
          <>
            {/* Conteneur Vidéo: Prend presque toute la hauteur (flex-1), garde place pour Navbar */}
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
                    alt={displayedSong.title}
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
              {canNavigatePrevious() && (
                <button
                  onClick={handlePreviousSong}
                  className="absolute left-2 top-1/2 -translate-y-1/2 z-20 p-2 rounded-full bg-black/20 backdrop-blur-sm text-white/80 hover:bg-black/40 transition-all duration-300 hover:scale-110 active:scale-90 touch-manipulation"
                  aria-label="Música anterior"
                  title="Música anterior"
                >
                  <ChevronLeft className="w-6 h-6" />
                </button>
              )}

              {/* Bouton Navigation Droite */}
              {canNavigateNext() && (
                <button
                  onClick={handleNextSong}
                  className="absolute right-2 top-1/2 -translate-y-1/2 z-20 p-2 rounded-full bg-black/20 backdrop-blur-sm text-white/80 hover:bg-black/40 transition-all duration-300 hover:scale-110 active:scale-90 touch-manipulation"
                  aria-label="Próxima música"
                  title="Próxima música"
                >
                  <ChevronRight className="w-6 h-6" />
                </button>
              )}

              {/* Vidéo: Prend toute la hauteur disponible */}
              <div className="relative z-10 h-full flex items-center justify-center px-4">
                <div className="w-full max-w-md">
                  <div className="bg-black/20 backdrop-blur-xl rounded-3xl shadow-2xl overflow-hidden border border-white/10">
                    <YouTubeEmbed
                      youtube_music_url={displayedSong.youtube_music_url}
                      youtube_url={displayedSong.youtube_url}
                      title={displayedSong.title}
                    />
                  </div>
                </div>
              </div>

              {/* Dégradé sombre en bas pour la lisibilité du texte */}
              <div className="absolute bottom-0 left-0 right-0 h-48 bg-gradient-to-t from-black/90 to-transparent z-10 pointer-events-none"></div>

              {/* Texte en Overlay: Date et Titre en bas à gauche */}
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

              {/* Actions Latérales: Plateformes, Paroles et Partage alignés verticalement à droite */}
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

            {/* Bouton Écouter: Sticky en bas au centre, par-dessus le dégradé */}
            <div className="relative z-30 pb-4 px-4 flex justify-center">
              <Button
                size="lg"
                onClick={() => setShowPlatformsDrawer(true)}
                className="w-full max-w-md bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-bold py-4 px-6 rounded-full shadow-xl transition-all duration-300 hover:scale-105 active:scale-95 flex items-center justify-center gap-2 touch-manipulation"
              >
                <span className="text-2xl">🎧</span>
                <span>Ouvir</span>
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
              <h3 className="text-xl font-semibold text-white mb-2 drop-shadow-lg">Nenhuma música disponível</h3>
              <p className="text-white/90 drop-shadow-md">
                A música da semana será publicada em breve. Volte na segunda-feira!
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
              🎵 Ouvir em outras plataformas
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
                      🎧 Ouvir no Spotify
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
                      🎵 Ouvir no Apple Music
                    </Button>
                  </a>
                )}
                
                {(selectedSongForDialog.youtube_music_url || selectedSongForDialog.youtube_url) && (
                  <a 
                    href={selectedSongForDialog.youtube_music_url || selectedSongForDialog.youtube_url} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="block"
                  >
                    <Button className="w-full bg-[#FF0000] hover:bg-[#cc0000] text-white font-bold py-3 rounded-2xl text-sm transition-all duration-200 hover:scale-105">
                      📺 Assistir no YouTube
                    </Button>
                  </a>
                )}

                {!selectedSongForDialog.spotify_url && !selectedSongForDialog.apple_music_url && !selectedSongForDialog.youtube_music_url && !selectedSongForDialog.youtube_url && (
                  <div className="text-center py-6">
                    <Music className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                    <p className="text-gray-600 font-medium">Links de streaming em breve...</p>
                    <p className="text-gray-500 text-sm">Esta música será disponibilizada em breve nas principais plataformas.</p>
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
        title="📝 Letras da Música"
        maxHeight="h-52"
        showIcon={false}
      />

      {/* ===== DIALOG DESCRIÇÃO ===== */}
      <Dialog open={showDescriptionDialog} onOpenChange={setShowDescriptionDialog}>
        <DialogContent className="bg-[#f8f5f2] max-w-2xl max-h-[80vh]">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-gray-800 flex items-center gap-2">
              ℹ️ Descrição da Música
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
                  📅 {format(parseISO(selectedSongForDialog.release_date), 'dd/MM/yyyy', { locale: ptBR })}
                </p>
              </div>

              {/* Descrição */}
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
                    <p className="text-gray-600 font-medium">Descrição não disponível</p>
                    <p className="text-gray-500 text-sm">A descrição desta música será adicionada em breve.</p>
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
